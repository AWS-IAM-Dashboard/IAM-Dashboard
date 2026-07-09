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

## 2. Where the semester goals landed

Per the [demo criteria](./GITHUB_ISSUES_BACKLOG.md#end-of-semester-demo-criteria-definition-of-success),
the core flow shipped on main (landing → Cognito login → scan → persisted findings →
severity → remediation with AI agents → export). The open issues (37, labeled by team)
are the tail: retention, telemetry, multi-account, exports polish, and the security
review items (S17–S26).

## 3. Post-semester order of work

1. **Land the merge queue** — the 7 open PRs above, one at a time, CI-verified.
2. **Reland salvage in priority order** — retention (#196) → multi-account (#109) →
   dedup (#126) → telemetry (#291) → lint gates (#137) → PDF summary (#133) →
   Bedrock runbooks → false-positive tuning (#123) → code signing → mobile (#119).
3. **Then the untouched backlog** — security review items (S17–S26), CloudFront (#233),
   signup APIs (#284), remaining data/export issues.

Issues without surviving work or clear post-semester value should be closed as they're
reviewed, referencing this doc.
