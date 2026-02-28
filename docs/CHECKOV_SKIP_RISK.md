# Checkov Skip List — Risk and Remediation

This document summarizes each check currently skipped in the Checkov configuration (`DevSecOps/.checkov.yml`), assigns severity and rationale, classifies skips as long-term acceptable or temporary, and recommends remediation with owners.

---

## 1. Severity and Rationale for Each Skip


| Check ID        | What the check enforces                                                      | Severity | Risk of skipping                             | Rationale for skip                                                                                       |
| --------------- | ---------------------------------------------------------------------------- | -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **CKV_AWS_1**   | IAM policies must not grant full-access / unrestricted wildcards             | Low      | Overly broad IAM if violated                 | Wildcard IAM is covered by OPA policies; Checkov skip avoids duplication.                                |
| **CKV_AWS_2**   | ALB listeners must use HTTPS                                                 | Low      | HTTP traffic if ALB is used without TLS      | Project may not use ALB; where applicable, OPA or other controls apply.                                  |
| **CKV_AWS_3**   | EBS volumes must be encrypted at rest                                        | Low      | Unencrypted block storage                    | No EBS in current IaC scope; OPA or standard applies if EBS is introduced.                               |
| **CKV_AWS_309** | API Gateway must have an explicit authorization type (e.g. IAM, Cognito)     | Medium   | Unauthorized or weakly authorized API access | Cognito (or other auth) not yet integrated; skip is temporary until auth is added.                       |
| **CKV_AWS_117** | Lambda must run inside a VPC                                                 | Low      | Lambda not in VPC (e.g. public ENI)          | Architectural preference; not mandated for current use case.                                             |
| **CKV_AWS_272** | Lambda must use code signing                                                 | Medium   | Unverified code execution                    | Large architecture and process change; may be adopted later.                                             |
| **CKV_AWS_116** | Lambda must be connected to an SQS Dead Letter Queue                         | Low      | Failed invocations not queued for retry      | Lambda is API Gateway–triggered; DLQ not required for this pattern.                                      |
| **CKV_AWS_144** | S3 bucket must have cross-region replication                                 | Low      | No DR replication                            | Cross-region replication is a DR roadmap item, not required for current scope.                           |
| **CKV_AWS_70**  | S3 bucket must not allow public read                                         | High     | Public read on bucket objects                | Static website hosting without CloudFront requires public read; accepted as temporary.                   |
| **CKV2_AWS_62** | S3 bucket should have event notifications configured                         | Low      | No event-driven notifications on bucket      | Not required for static hosting bucket.                                                                  |
| **CKV_AWS_18**  | S3 bucket must have access logging enabled                                   | Medium   | No access audit trail for bucket             | Desired improvement; deferred due to architecture/logging changes.                                       |
| **CKV_AWS_355** | IAM policy must not use `*` as statement resource for restrictable actions   | High     | Overly broad resource scope                  | GitHub Actions OIDC role needs broad permissions for deploy; skip is temporary until policy is narrowed. |
| **CKV_AWS_290** | IAM policy must not allow write access without constraints (e.g. conditions) | High     | Unconstrained write access                   | Same OIDC role; admin-style permissions accepted temporarily.                                            |
| **CKV2_AWS_40** | IAM role must not have full IAM privileges                                   | High     | Excessive IAM permissions                    | Deploy role requires broad capabilities; skip temporary until least-privilege refactor.                  |


---

## 2. Long-Term Acceptable vs Temporary Skips

### Long-term acceptable

These skips are considered acceptable indefinitely given current design and controls:

- **CKV_AWS_1**, **CKV_AWS_2**, **CKV_AWS_3** — Covered by OPA or out of scope (no ALB/EBS in IaC).
- **CKV_AWS_117** — Lambda in VPC is an architectural choice, not a requirement for this service.
- **CKV_AWS_116** — Lambda DLQ not required for API Gateway–triggered functions.
- **CKV_AWS_144** — S3 cross-region replication is a future DR capability.
- **CKV2_AWS_62** — Event notifications not required for the static hosting bucket.

### Temporary (remediate then remove skip)

These skips should be removed once the corresponding remediation is in place:

- **CKV_AWS_309** — Add Cognito or other auth to API Gateway.
- **CKV_AWS_272** — Introduce Lambda code signing for production workloads.
- **CKV_AWS_70** — Move static site behind CloudFront and/or remove public read; or document and formally accept.
- **CKV_AWS_18** — Enable S3 access logging on relevant buckets.
- **CKV_AWS_355**, **CKV_AWS_290**, **CKV2_AWS_40** — Narrow GitHub Actions OIDC IAM policy (resources and actions) to least privilege.

---

## 3. Recommended Remediation and Owners

### High severity


| Check(s)                                          | Remediation                                                                                                                                                                                                                                                | Owner                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **CKV_AWS_70**                                    | Put static site behind CloudFront and remove S3 bucket public read, or document the public-read design and get formal acceptance.                                                                                                                          | **DevOps** or **Backend**             |
| **CKV_AWS_355**, **CKV_AWS_290**, **CKV2_AWS_40** | In `infra/github-actions/main.tf`: replace wildcard actions (e.g. `s3:`*, `lambda:*`, `iam:*`) with minimal action lists per service; replace `Resource = "*"` with explicit or scoped ARNs. Re-run Checkov and remove the three skips once policies pass. | **DevOps** (with **Security** review) |


### Medium severity


| Check(s)        | Remediation                                                                                                | Owner                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| **CKV_AWS_309** | Add Cognito (or other auth) to API Gateway and configure authorization type. Remove skip after deployment. | **Backend** or **Security** |
| **CKV_AWS_272** | Plan and implement Lambda code signing for production; remove skip when enforced.                          | **DevOps** or **Security**  |
| **CKV_AWS_18**  | Enable S3 access logging on buckets that store sensitive or audit-relevant data; remove skip once enabled. | **DevOps**                  |


---

## Summary

- **14 checks** are currently skipped in `DevSecOps/.checkov.yml`.
- **9** are long-term acceptable; **5** are temporary and should be remediated so the skips can be removed.
- **4** high-severity skips (CKV_AWS_70, CKV_AWS_355, CKV_AWS_290, CKV2_AWS_40) have clear remediation steps and owners above.
- Revisit this document when changing infra or auth so skip justifications and remediation remain accurate.

