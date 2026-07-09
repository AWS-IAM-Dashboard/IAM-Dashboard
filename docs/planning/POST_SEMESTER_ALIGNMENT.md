# Post-Semester Alignment — July 2026

**Status:** The Spring 2026 semester (Feb 17 – Apr 17) is over. This doc records where the
project actually stands, what happened to the end-of-semester PR pile, and the order of
work for the post-semester phase. It supersedes the sprint cadence in
[GITHUB_ISSUES_BACKLOG.md](./GITHUB_ISSUES_BACKLOG.md); that doc remains the reference for
the original scope, team split, and the `(POST)` parking lot.

---

## 1. PR cleanup (done 2026-07-09)

All 32 stale open PRs were triaged. Every closed PR's branch head was tagged
**`archive/pr-<number>`** before closing, so no work is lost even if the source branch is
deleted. Restore any of them with:

```bash
git fetch origin tag archive/pr-<n>
git checkout -b restore/pr-<n> archive/pr-<n>
```

### Kept open — merge queue (7)

These are close to landable. Fix the noted item, re-verify against current main, merge.

| PR | Issue | What | Pre-merge fix |
|---|---|---|---|
| #375 Empty-state UX | W10 / #117 | Reusable `EmptyState` across 13 findings views | CodeRabbit nits only; cleanest PR of the batch |
| #387 REPORTS.md | A15 / #136 | Docs for report exports + Grafana usage | Sanity-check descriptions against current UI |
| #381 /health deploy verification | D13 / #139 | Deploy workflow verifies release via `/health` | One-liner: deploy step's `exit 0` → `break` so the check actually runs |
| #392 SES email pipeline | B19 / #191 | SES Lambda + Terraform module + S3 event wiring | Scope `s3:GetObject` to `scan-results/` prefix; add CloudWatch log group |
| #354 Onboarding wizard + tour | W4 / #122 | Multi-step wizard + spotlight product tour | Pick ONE tour implementation (ProductTour vs OnboardingSpotlightTour); fix tab-target + key-handler findings |
| #327 Claude GitHub Actions | — | @claude mentions + auto PR review | Confirm `CLAUDE_CODE_OAUTH_TOKEN` secret; apply fork/permission hardening nits |
| #319 Signup/reset spacing | B20 / #284 | Diff collapsed to a one-line mobile spacing fix | Verify not already fixed on main, then merge or close |

### Closed with salvage value (11)

All conflicted with main and/or carried known bugs — cherry-picking beats rebasing.
Listed in rough reland priority:

| Archive tag | Was | Issue | What to salvage | Must fix on reland |
|---|---|---|---|---|
| `archive/pr-390` | Data retention (stronger of the two) | A17 / #196 | `backend/api/retention.py`, `backend/services/dynamodb_service.py`, `backend/services/database_service.py`, `infra/dynamodb/*` | Scheduler fans out under multi-worker WSGI (prefer EventBridge/cron); validate `days` param; per-store failure isolation |
| `archive/pr-388` | Data retention (duplicate) | A17 / #196 | Only what #390 lacks: `infra/s3/main.tf` lifecycle rule, `expires_at` write in scanner Lambda, `PROMETHEUS_RETENTION_TIME` in docker-compose | Fold into the #390 reland |
| `archive/pr-361` | Multi-account scanning | B11 / #109 | `backend/services/organizations_service.py`, `backend/api/accounts.py` (both self-contained) | Redo per-endpoint `account_id` plumbing fresh against main |
| `archive/pr-298` | Findings dedup/suppression | S5 / #126 | `src/utils/findingsDedup.ts`, `src/config/findings-rules.json` | 32-bit hash collisions; mutation of caller objects; re-wire components against current `ScanResultsContext` |
| `archive/pr-386` | Frontend telemetry | A16 / #291 | `backend/api/telemetry.py`, `src/services/telemetry.ts`, telemetry spec doc, Grafana dashboard JSON | Endpoint needs auth + rate limiting; Prometheus metrics are process-local (breaks under Lambda/multi-container); trigger-vs-success counting bugs |
| `archive/pr-384` | Lint/format/migrations | D8 / #137 | `.prettierrc`, `eslint.config.js`, `pyproject.toml`, `alembic.ini`, `alembic/env.py` | CI workflow only triggered on its own branch — rewrite for main; codebase needs a one-time format pass first |
| `archive/pr-374` | PDF executive summary | A12 / #133 | `src/services/pdfExport.ts` changes (summary, top-5 risks, metadata) | Reports-page crash from review; complete HTML escaping of scan-derived fields |
| `archive/pr-391` | Bedrock runbook/triage | AI team | `infra/lambda/lambda_function.py` Bedrock routes, `infra/api-gateway/main.tf`, `infra/lambda/{main,variables}.tf`, `docs/AI-Team_Documentation/*` | `_bedrock_key_cache` never initialized → NameError → every LLM call silently mocks; needs `BEDROCK_API_KEY` secret; NEVER merge the committed `.vite/` artifacts |
| `archive/pr-285` | IAM false-positive tuning | S1 / #123 | `docs/security/FALSE_POSITIVES_CATALOG.md` + SCANNERS.md tuning section (verbatim); suppression logic as design reference only | Helper functions duplicated (silent shadowing); demo-identity suppression can hide critical AdministratorAccess findings |
| `archive/pr-286` | Lambda code signing | D19 | Signer/bucket blocks in `infra/lambda/main.tf`, signer IAM policy in `infra/github-actions/main.tf`, deploy.yml signing steps | Hardcoded `IAMDash-lambda-artifacts` bucket vs Terraform's `${project_name}-lambda-artifacts`; `PROFILE` lookup can return literal "None" |
| `archive/pr-376` | Mobile responsiveness | M11 / #119 | `DashboardMobileQuickBar.tsx`, `MobileQuickBar.tsx`; responsive patterns (collapsible rows, sidebar drawer) as design reference | 59-file rewrite regressed desktop layouts — redo incrementally, page by page |

### Closed, no salvage (2)

- `archive/pr-389` (A13 auditor PDF) — 203-file whole-repo dump, unreviewable. If A13 is revived, `src/components/Reports.tsx` on the tag is the one file to inspect.
- `archive/pr-358` (A8 Grafana findings-over-time) — committed merge-conflict artifacts, hardcoded datasource UID and time range. Start A8 fresh.

### Dependabot (12 closed)

Stale May–June version bumps. Dependabot will re-file current versions on its next run;
merge the security ones as they arrive.

---

## 2. Verified state of main (full repo review, 2026-07-09)

Five-area code review of main @ `7781dda` — status below is what the **code** shows, not
what issues claim. Issue-closure stats and verified reality diverge: several "closed"
items are partial in code.

### Demo criteria — the honest scorecard

| # | Criterion | Verdict | Reality |
|---|---|---|---|
| 1 | Landing page | ✅ | Real; footer Privacy/Terms/Contact links are `#` stubs |
| 2 | Cognito login | ⚠️ | Works via deployed auth Lambda — **whose source is not in this repo** (Terraform looks it up by name). MFA off. Signup page never creates an account; password reset verifies the token but resets nothing |
| 3 | Run a scan | ⚠️ | IAM/EC2/S3 scanners are real and substantive. But `scan_full` silently runs IAM only, and scanner errors return HTTP 200 "completed" with empty findings |
| 4 | Findings persist on refresh | ⚠️ | sessionStorage only (survives refresh, dies with the tab). Lambda writes results to DynamoDB+S3 but **there is no GET-latest endpoint** — B14b shipped only its write half |
| 5 | IAM risks with severity | ⚠️ | ~20 finding types with hardcoded severities; no dedup/suppression on main (stranded in archive/pr-298); FP-prone rules (any public IP = Critical) |
| 6 | Remediation + why + confidence | ⚠️ | Bedrock triage/root-cause/runbook calls are real (with mock fallback). The IR **action** engine is demo theater: in-memory job store, fake approval gate, fabricated evidence and ARNs |
| 7 | Grafana severity trends | ❌ | The only dashboard on main queries a `scan_history` Postgres table no code creates — 4 of 5 panels dead. A8/A9 never landed |
| 8 | PDF export | ⚠️ | Print-window shim over generated HTML; no PDF library. CSV export is real (streaming, JWT-guarded) |

### Cross-cutting findings (these matter more than any single item)

1. **The product lies on failure.** Both the Lambda (HTTP 200 "completed" on scanner
   exceptions) and the frontend (`src/services/api.ts` + Dashboard coerce failures to
   completed/0 findings) render a broken scan as *100% compliant*. Worst possible
   failure mode for a security tool.
2. **Mock is indistinguishable from live.** VPC/DynamoDB/Access-Analyzer pages
   auto-load hardcoded findings even in live mode (and their scan buttons call the
   wrong scanners — VPC→EC2, DynamoDB→IAM, AccessAnalyzer→IAM); account connection
   status is hardcoded "connected"; SOC/Infra/GRC centers are pure fixtures.
   `VITE_DATA_MODE` gating is inconsistent across ~8 files.
3. **The Flask API is effectively unauthenticated.** Only CSV export has auth; IR
   contain/remediate/approve, TTS, voice-intent, dashboard, scan-history are open.
   The one guard is homegrown HS256 with a dev-mode bypass. API Gateway routes default
   `authorization_type = NONE` — the Cognito authorizer exists but is unused.
4. **Two backends, one real.** The Lambda scanner is the substantive backend. Flask
   `/aws/*` endpoints are stubs returning hardcoded zeros; Postgres is write-orphaned
   (nothing ever writes findings to it); `backend/sql/init.sql` uses MySQL syntax and
   likely fails a fresh `docker compose up` on a clean volume.
5. **CI security gates are mostly theater.** Checkov forced `--soft-fail`, OPA tests
   nothing against nothing, Gitleaks runs 4 custom rules with an invalid (ignored)
   exclude config and never scans history. Only npm/pip audit actually block. There is
   no typecheck, no lint, and ~1 test file per stack.
6. **Deploy path is 3 months cold** with zero post-deploy verification (D13 = still-open
   PR #381), a public S3 website bucket that CloudFront only half-fronts (no OAC —
   D17's goal is architecturally unreachable as designed), auto-apply of unreviewed
   Terraform plans, and one clickops WAF dependency.

### Per-team verified checklist

**Backend** — B17 /health ✅ · B18 metrics ✅ · B6 Cognito infra ✅ · B2/B4/B11/B12
multi-account code ✅-untested (AssumeRole wildcards the target account) · B7 OAuth ⚠️
auth-Lambda source missing from repo · B10 JWT ⚠️ one route guarded · B13 schema ⚠️
de-facto dict, never formalized · B14b ⚠️ write-only · B19 email ⚠️ MailHog yes / SES
no / reset-password is a no-op · B9 RBAC ⚠️ admin-only, no viewer, Lambda-side only.

**Frontend** — W1 landing ✅ · W8/W9 filters/pagination ✅ Dashboard-only · A14 CSV ✅ ·
IR/voice UI ✅ (fed partly by theater) · W2/W3 ⚠️ session works, signup dead-end ·
W10b ⚠️ sessionStorage · W11 mobile ⚠️ public pages only, app shell desktop-only ·
W5/W7 ⚠️ switcher real, status hardcoded · W10 ❌ on main (PR #375 open) · W4 ❌ on
main (PR #354 open) · W13 feature gate ❌ · W14 free-scanner UIs ⚠️ mock-fed,
mis-wired scan buttons.

**Security** — S23 rate limiting ✅ · S25 CORS ✅ · S27 dep scanning ✅ · S24 audit
log ✅ Lambda-side · S1/S2 rules ⚠️ hardcoded, no FP handling · S3 severity ⚠️
strings, no scoring · S15 ⚠️ MFA off · S16 ⚠️ split-brain authz · S17 ❌ authorizer
unused · S22 headers ❌ · S5 dedup ❌ on main · S18/S19 Checkov/OPA ⚠️ present but not
enforcing · S20 Gitleaks ⚠️ thin.

**Data** — A6 Prometheus scrape ✅ · A14 CSV ✅ · A7 datasources ⚠️ (Redis plugin
missing, creds hardcoded) · A12/A13 PDF ⚠️ print shim · A17 retention ⚠️ ~8-day
Prometheus flag only, no DynamoDB TTL · A8/A9 dashboards ❌ · A10 alerting ❌ ·
A16 telemetry ❌.

**DevOps** — F1 CI ✅ (stale-green since Apr 17) · F2/F3 ✅ · D14 TF-apply-on-merge ✅ ·
D15 Vite-in-Docker ✅ · D16 MailHog ✅ · D12 images ✅ · D18 S3 logging ✅ · D17
CloudFront ⚠️ public-bucket origin, no OAC, CI never invalidates · D13 ❌ (PR #381).
Strongest team by verified completion.

**AI** — Bedrock triage/runbook/voice-intent/TTS real ✅ · IR action engine ❌ demo
theater (in-memory store, fake ARNs) · runbook salvage waiting in archive/pr-391.

### Issue-closure stats vs. reality

| Team | Open | Closed | Verified caveat |
|---|---|---|---|
| security | 11 | 8 | Worst both ways: most open AND several closed items partial in code |
| data | 8 | 7 | Second-worst; observability largely non-functional on main |
| backend | 5 | 11 | Several closures overstated (B14b, B19, B7) |
| frontend | 5 | 13 | Solid UI shell; mock-vs-live integrity is the gap |
| devops | 3 | 16 | Matches reality best |
| AI | 0 | 9 | Closed, but action engine was demo-scoped |

## 3. Where to concentrate

**Security first, Data second** — but organized as product promises, not semester teams:

1. **Stop lying (trust integrity)** — fix error masking end-to-end (Lambda
   200-on-error, `api.ts`/Dashboard coercion), make mock mode visually unmistakable
   and consistently gated, fix or hide the mock-fed scanner pages. Cheap, highest
   credibility-per-hour.
2. **Lock the doors (security hardening)** — flip API Gateway routes to the existing
   Cognito authorizer (S17), wrap or amputate the unauthenticated Flask surface,
   security headers (S22), make Checkov/Gitleaks actually block, and recover or
   rewrite the auth Lambda **into the repo**.
3. **Make persistence real (data spine)** — GET-latest-results API (finish B14b),
   retire or fix the orphaned Postgres path + broken init.sql, reland retention
   (archive/pr-390 + 388), then dashboards (A8/A9) against a store that has data.
4. **Then polish** — merge-queue UX PRs land anytime (they're independent); real PDF,
   telemetry, mobile.

## 4. Post-semester order of work (revised)

1. **Land the merge queue** (7 open PRs) — merge #381 (/health verification) **first**
   and validate the 3-months-cold deploy chain before trusting it with the rest.
2. **Trust integrity pass** (§3.1) — small diffs, big honesty gains.
3. **Security hardening pass** (§3.2) — S17, Flask auth, S22, CI gates; reland dedup
   (archive/pr-298) and FP-tuning docs (archive/pr-285) here.
4. **Data spine** (§3.3) — B14b read-half, retention reland, real dashboards.
5. **Remaining salvage + backlog** per §1 tables — multi-account E2E test, telemetry,
   lint gates, PDF, Bedrock runbooks, mobile.

Issues without surviving work or clear post-semester value should be closed as they're
reviewed, referencing this doc.
