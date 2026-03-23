# IAM Finding Scoring Model

This document defines how each IAM finding type is scored (**Critical**, **High**, **Medium**, **Low**) using **impact** and **likelihood**. It is intended for auditors, security teams, and future maintainers.

## Overview

- **Severity** is derived from a risk matrix: **Impact × Likelihood**.
- **Impact**: potential harm if the finding is exploited (e.g., account takeover, data exposure).
- **Likelihood**: how likely the finding is to be exploited or to cause an incident.
- **Risk score**: a 0–100 numeric value computed from the same impact and likelihood, used for ordering and filtering.

All IAM findings produced by the scanner use this single mapping so that scores are consistent across the dashboard, filters, and exports (PDF, CSV, JSON).

---

## Impact and Likelihood Levels

| Level     | Numeric | Meaning |
|----------|---------|---------|
| Critical | 4       | Catastrophic impact / very likely to be exploited |
| High     | 3       | Severe impact / likely to be exploited |
| Medium   | 2       | Moderate impact / possible exploitation |
| Low      | 1       | Limited impact / low likelihood |

---

## Severity from Impact × Likelihood

Severity is determined by the product of impact and likelihood (each 1–4):

| Product (Impact × Likelihood) | Severity  |
|-------------------------------|-----------|
| 12 – 16                      | **Critical** |
| 8 – 11                       | **High**    |
| 4 – 7                        | **Medium**  |
| 1 – 3                        | **Low**     |

**Risk score (0–100):**  
`risk_score = round((impact_numeric × likelihood_numeric / 16) × 100)`

Example: Impact High (3), Likelihood High (3) → 3×3/16×100 ≈ 56 → **High** severity.

---

## IAM Finding Types and Their Scores

The following mapping is implemented in the backend scanner (`infra/lambda/lambda_function.py`). Each finding type has a fixed **(Impact, Likelihood)** pair.

### Critical

| Finding Type           | Impact   | Likelihood | Rationale |
|------------------------|----------|------------|-----------|
| `admin_access`         | Critical | High       | Full admin; immediate compromise if credentials are breached. |
| `public_trust_policy`  | Critical | High       | Role assumable by anyone (e.g. `*`); high abuse potential. |
| `wildcard_permissions` | Critical | High       | Policy allows `*` or `*:*`; full privilege scope. |

### High

| Finding Type                   | Impact | Likelihood | Rationale |
|--------------------------------|--------|------------|-----------|
| `missing_mfa`                  | High   | High       | Console access without MFA; common target for takeover. |
| `external_account_access`      | High   | High       | Cross-account trust without tight restriction. |
| `service_wildcard_permissions` | High   | Medium     | Full service scope (e.g. `s3:*`); broad blast radius. |
| `wildcard_resource`            | High   | Medium     | Resource `*` with write/delete/create actions. |
| `iam_privilege_escalation`    | High   | Medium     | Can create users/roles/policies; enables escalation. |
| `s3_public_write`             | High   | Medium     | PutObject/PutObjectAcl on all buckets. |
| `lambda_public_invoke`        | High   | Medium     | Can invoke any Lambda; data/code exposure risk. |

### Medium

| Finding Type                    | Impact | Likelihood | Rationale |
|---------------------------------|--------|------------|-----------|
| `old_access_key`                | Medium | Medium     | Key age >90 days; rotation best practice. |
| `inactive_user`                 | Medium | Low        | No login 90+ days; lower immediate risk. |
| `dynamodb_broad_permissions`   | Medium | Medium     | PutItem/UpdateItem/DeleteItem on `*` tables. |

### Low

| Finding Type        | Impact | Likelihood | Rationale |
|---------------------|--------|------------|-----------|
| `unused_access_key` | Low    | Low        | Key unused 90+ days; hygiene/cleanup. |

---

## Where Scores Are Used

1. **Backend / Scanner**  
   - `get_iam_finding_score(finding_type)` returns `severity`, `impact`, `likelihood`, `risk_score`.  
   - `apply_iam_score(finding)` merges these into each finding dict before it is appended to the results.  
   - Location: `infra/lambda/lambda_function.py` (IAM scoring constants and helpers).

2. **API response**  
   - Each finding in the IAM scan response includes: `severity`, `impact`, `likelihood`, `risk_score` (and existing fields such as `finding_type`, `description`, `recommendation`).  
   - `scan_summary` includes `critical_findings`, `high_findings`, `medium_findings`, `low_findings` derived from these severities.

3. **Dashboard**  
   - IAM findings table shows Severity, Impact/Likelihood, and Risk Score.  
   - Severity filter: All / Critical / High / Medium / Low.  
   - Summary counts and charts use the same severity bands.

4. **Exports**  
   - **CSV**: Columns include Severity, Impact, Likelihood, Risk Score, plus resource and recommendation fields.  
   - **PDF**: Findings tables include Impact/Likelihood and Risk Score when present.  
   - **JSON**: Full finding objects include `severity`, `impact`, `likelihood`, `risk_score`.

---

## Adding or Changing a Finding Type

1. **Define (Impact, Likelihood)**  
   - Add or update the entry in `IAM_FINDING_SCORES` in `lambda_function.py` so that the product matches the desired severity band (see table above).

2. **Use the scorer**  
   - When appending a finding, build the dict with `finding_type` (and other fields), then call `apply_iam_score(finding)` so severity and score fields are set from the central mapping.

3. **Document**  
   - Update this file with the new or changed finding type and rationale.

4. **Frontend / exports**  
   - No code change needed for severity/filters/exports if the backend always populates `severity`, `impact`, `likelihood`, `risk_score`; the UI and export logic already consume these fields when present.

---

## References

- Scanner implementation: `infra/lambda/lambda_function.py` (search for `IAM_FINDING_SCORES`, `get_iam_finding_score`, `apply_iam_score`).
- Frontend IAM findings table and severity filter: `src/components/AWSIAMScan.tsx`.
- Export logic (CSV/PDF): `src/services/pdfExport.ts`.
- Scan results context (summary counts): `src/context/ScanResultsContext.tsx`.
