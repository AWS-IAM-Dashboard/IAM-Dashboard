## Async Remediation Architecture  Sprint-#143

Remediation jobs running in the background, you fire a request, get a job ID back immediately, and poll for the result. 

---

## How the Job Runs

When a user triggers a remediation, the API returns a job_id right away — 202 Accepted. The actual work (Gemini call + guardrail pipeline) runs in a background Lambda worker fed by an SQS queue.

Why async? Because Gemini calls plus the full guardrail pipeline can take long enough to make synchronous requests feel broken. This way the UI never hangs, workers scale independently, and we're not racing against timeout limits.

Why SQS + Lambda? Clean backpressure, built-in retry semantics, and it fully decouples the API from model latency spikes. If Gemini gets slow, the queue absorbs it — the API stays snappy.

Why external Gemini API instead of hosting our own model? Fastest integration path. No ML hosting overhead, and it's easy to swap models later if we need to. Tradeoff is we have to handle key management, rate limits, cost controls, and provider outages ourselves — retries and circuit-breaker logic are non-negotiable here.

---

## API Shape

POST /remediation → 202 Accepted { remediation_job_id }

GET /remediation/{job_id} → { status: queued | running | completed | blocked | failed, result? }

Frontend polls on that GET endpoint. Simple, works in any browser or static frontend — no webhook complexity to deal with.

For polling cadence, use exponential backoff: 1s → 2s → 4s, cap around 10–15s. Don't hammer the endpoint on every tick.

---

## What Gets Stored in DynamoDB

Every job gets its own record. A separate table is the move, but it can share the same pattern as the rest of the project.

`Job Fields`

| Field | What it holds |
|---|---|
| `job_id` | Partition key |
| `user_id` / `account_id` | Who kicked this off |
| `finding_id` | What finding it's tied to |
| `created_at` | Timestamp |
| `status` | `queued`, `running`, `completed`, `blocked`, `failed` |
| `attempt_count` | How many regenerates so far |
| `max_attempts` | Capped at 4 |
| `last_error` | What went wrong if it failed |
| `result fields` | `type`, `risk_level`, `explanation`, `proposed_change`, `requires_review`, `blocked`, `violations` |

This is what makes refresh and account switching work — the result lives in Dynamo, not in memory.

---

## Regenerate Policy 

Users can hit Regenerate up to 4 times per finding, scoped to their user/account.

`A few things to lock in here:`

- Each regenerate creates a new job_id but links back to the same finding_id. This keeps the audit trail clean and avoids overwriting prior suggestions.

- `Enforce the limit server-side.` Don't trust the UI to gate this — the backend has to check attempt_count against max_attempts before spinning up a new job.

---

## Preventing Double Submissions

Even with regenerate allowed, a single click should never create duplicate jobs. Here's how:

- Client sends an idempotency key on every POST /remediation

- If the server already created a job for that key, it returns the existing job_id — no new job created
This covers refresh, double-clicks, and any other "user clicked twice" scenarios.

---

## Stay Aligned with the Guardrails Doc

Nothing new here, just making sure async doesn't create gaps:

- `Never return raw model output.` The schema validation + safety filter runs in the worker before anything gets written to Dynamo or returned to the frontend.

- `Log everything per job:` job_id, finding_id, blocked, violations, provider used, and latency.

- `Input size caps still apply.` The worker enforces the same prompt length limits called out in the guardrails doc — the async path doesn't get a free pass.

