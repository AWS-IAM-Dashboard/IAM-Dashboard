# AI Remediation Sprint — Implementation Summary Sprint-#144

> **What this sprint did:** Took the async remediation architecture we designed and actually built it. End-to-end — input normalization, guardrails, routing, API endpoints, async runtime, infra, and tests. The foundation for AI-8 frontend integration is ready.

---

## What Got Built

### Input & Output Contracts
Normalized the AI-2 input layer so the engine always sees a consistent payload regardless of what the scanner spits out. Output always follows the AI-3 fixed schema:

| Field | Description |
|-------|-------------|
| `type` | Finding type identifier |
| `risk_level` | Severity classification |
| `explanation` | Human-readable description |
| `proposed_change` | Recommended remediation action |
| `requires_review` | Whether human review is needed |
| `blocked` | Whether guardrails fired |
| `violations` | List of triggered violation rules |

No surprises, no fragile one-off logic.

---

### Top-10 Finding Type Router
Deterministic routing for all 10 IAM finding types:

- `admin_access`
- `wildcard_permissions`
- `service_wildcard_permissions`
- `wildcard_resource`
- `public_trust_policy`
- `external_account_access`
- `iam_privilege_escalation`
- `missing_mfa`
- `old_access_key`
- `unused_access_key`

Each one returns concise, actionable guidance in AI-3 format.

---

### Guardrail Pipeline
All 4 stages implemented in code:

1. **Input checks** — size caps + prompt injection detection
2. **Schema validation** — enforced on engine output
3. **Safety filter** — blocks wildcards, `AdministratorAccess`, broad principals, etc.
4. **Blocked fallback** — explicit `violations` list returned if anything fires

Violation reporting includes backward-compatible coarse IDs and field-context IDs so a `Principal: "*"` finding is labeled as principal-specific instead of being conflated with action/resource wildcard rules.

> Policy is enforced in code, not just in the prompt.

---

### Backend API Endpoints

#### `POST /api/v1/remediation`
Takes an AI-2 payload + idempotency key. Returns `202` with a job ID.

```json
{ "remediation_job_id": "<job_id>" }
```

#### `GET /api/v1/remediation/<job_id>`
Returns job status and result when ready.

```json
{ "status": "completed", "result": { ... } }
```

---

### Async Runtime
SQS feeds the Lambda worker. Job lifecycle:

```
queued → running → completed | blocked | failed
```

Results and idempotency keys both persist in DynamoDB — refresh and double-submit are handled correctly.

---

### Infrastructure
- Two new DynamoDB tables: `remediation_jobs`, `remediation_idempotency`
- SQS queue + DLQ
- Lambda event source mapping
- Updated IAM permissions
- Lambda build now packages `backend/services/ai`

---

### Tests
- Golden tests for all 10 routing paths
- Guardrail blocking tests for unsafe outputs
- Safety filter checks for banned IAM constructs

---

## Bugs Found & Fixed During Validation

### Bug 1 — POST failing with `timestamp_ns` error
The in-memory job ID generation was calling an unsupported method on `datetime`. Switched to a nanosecond-safe ID approach. POST now creates jobs correctly.

### Bug 2 — POST succeeded but GET returned "Not found"
The in-memory job store was being recreated on every request, so the job disappeared immediately. Fixed by making it a persistent singleton when DynamoDB mode is off. Local POST → GET roundtrip works reliably now.

### Bug 3 — POST returning 405 while `/health` worked fine
The backend instance handling requests didn't have the remediation routes registered — old process still running. Fixed by restarting the backend with the updated route registration and correct environment. Endpoints are reachable now.

---

## How to Test It

The backend is fully functional. No dashboard UI yet (that's AI-8) — hit the endpoints directly with curl or Postman.

### Step 1 — Health Check

```
GET http://localhost:<port>/health
```

Should return `200`. If this fails, the backend isn't running or the port is wrong.

---

### Step 2 — Create a Remediation Job

```
POST http://localhost:<port>/api/v1/remediation
```

**Headers:**
```
Content-Type: application/json
Idempotency-Key: <any-uuid>
```

**Body:**
```json
{
  "finding_details": {
    "finding_type": "admin_access",
    "severity": "high",
    "resource": {
      "resource_type": "iam_role",
      "resource_name": "my-role",
      "policy_snippet": {}
    }
  },
  "environment_context": {
    "account_id": "123456789012"
  }
}
```

**Response:**
```json
{ "remediation_job_id": "<job_id>" }
```

---

### Step 3 — Poll for the Result

```
GET http://localhost:<port>/api/v1/remediation/<job_id>
```

**Success response:**
```json
{ "status": "completed", "result": { ... } }
```

**Blocked response (if guardrails fired):**
```json
{ "status": "blocked", "result": { "violations": ["..."] } }
```

> **Testing the safety filter:** Send a finding payload containing `Action: "*"` or `AdministratorAccess` in the policy snippet. The response should come back `blocked: true` with the matching violation rule ID.
> The response may include both coarse IDs (for compatibility) and field-context IDs (for precision), for example `BANNED_WILDCARD_ACTION` plus `BANNED_WILDCARD_ACTION_FIELD`.


# Script used to test (copy paste version)

Run using in a .ps1 file using ".\test-remediation.ps1"
you might need to run this before to be able to run the script "Set-ExecutionPolicy -Scope Process Bypass"

The Script (you can make it using notpad++):
"
$base = "http://localhost:5000/api/v1"  # change port number
$idempotencyKey = [guid]::NewGuid().ToString()


try {
  $h = Invoke-RestMethod -Method Get -Uri "$base/health"
  Write-Host "Backend OK:" ($h.status | Out-String)
} catch {
  Write-Host "Backend health check failed at $base/health"
  throw
}


$body = @{
  finding_details = @{
    finding_id = "finding-local-001"
    finding_type = "admin_access"
    severity = "High"
    scanner_source = "OPA"
    resource = @{
      resource_type = "AWS::IAM::User"
      resource_name = "dev-user"
      policy_snippet = @{
        Version = "2012-10-17"
        Statement = @(@{ Effect="Allow"; Action="*"; Resource="*" })
      }
    }
  }
  environment_context = @{
    account_id = "123456789012"
    iam_relationships = @{
      user_role = "Developer"
      attached_groups = @("DevGroup")
      attached_policies = @("AdministratorAccess")
    }
    related_findings = @("finding-local-002")
  }
} | ConvertTo-Json -Depth 10

$postResp = Invoke-RestMethod -Method Post -Uri "$base/remediation" -Headers @{
  "Idempotency-Key" = $idempotencyKey
  "Content-Type" = "application/json"
} -Body $body

if (-not $postResp -or -not $postResp.remediation_job_id) {
  throw "POST /remediation failed; no job id returned."
}

Write-Host "Job:" $postResp.remediation_job_id

$getResp = Invoke-RestMethod -Method Get -Uri "$base/remediation/$($postResp.remediation_job_id)"
$getResp | ConvertTo-Json -Depth 10
"