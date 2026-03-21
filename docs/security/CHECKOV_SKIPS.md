# Checkov Skipped Checks Register

This register documents every intentionally skipped Checkov control from `DevSecOps/.checkov.yml` to keep skip decisions transparent and auditable.

## Scope

- Source of truth: `DevSecOps/.checkov.yml`
- Scanner: Checkov (Terraform, Kubernetes, CloudFormation, Dockerfile frameworks enabled)

## Skipped Checks


| Check ID      | What it verifies                                                                              | Why it is skipped                                                                                                                                      | Follow-up / Owner                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `CKV_AWS_1`   | IAM policy statements should avoid unrestricted wildcard/full-access patterns.                | Overlaps with project OPA IAM guardrails, so this Checkov control is treated as duplicate coverage.                                                    | Keep OPA IAM policies up to date and re-evaluate skip when OPA policy set changes. **Owner:** Security + DevOps |
| `CKV_AWS_2`   | ALB listeners should enforce HTTPS/TLS.                                                       | Current infrastructure does not rely on ALB for this service path; check is currently out of scope.                                                    | Remove skip if ALB resources are introduced. **Owner:** DevOps                                                  |
| `CKV_AWS_3`   | EBS volumes should be encrypted at rest.                                                      | No EBS-backed resources are managed in the current IaC scope.                                                                                          | Remove skip if EBS resources are added. **Owner:** DevOps                                                       |
| `CKV_AWS_309` | API Gateway should define explicit authorization (for example IAM/Cognito/custom authorizer). | Temporary exception while Cognito/strong API authorization is not yet implemented.                                                                     | Implement API authorization and remove skip. **Owner:** Backend + Security                                      |
| `CKV_AWS_117` | Lambda functions should run in a VPC.                                                         | This is an architectural trade-off for current workload, not a mandatory control for this deployment model.                                            | Revisit on networking hardening review. **Owner:** DevOps                                                       |
| `CKV_AWS_272` | Lambda deployments should enforce code signing.                                               | Deliberate temporary exception; enabling code signing requires broader CI/CD and signing-key workflow changes.                                         | Plan and implement Lambda code signing, then remove skip. **Owner:** DevOps + Security                          |
| `CKV_AWS_116` | Lambda should configure a Dead Letter Queue (DLQ).                                            | Current Lambda invocation pattern is API Gateway-driven; team accepted no-DLQ for this path.                                                           | Reassess if async/event-driven triggers are added. **Owner:** Backend + DevOps                                  |
| `CKV_AWS_144` | S3 buckets should use cross-region replication for DR resilience.                             | DR replication is a roadmap item and not required for current project risk profile.                                                                    | Revisit when disaster recovery milestones are implemented. **Owner:** DevOps                                    |
| `CKV_AWS_70`  | S3 buckets should not allow public read access.                                               | Deliberate exception: static website hosting currently depends on public-read objects (no CloudFront in front).                                        | Prefer migration to CloudFront/private origin and remove skip. **Owner:** DevOps                                |
| `CKV2_AWS_62` | S3 buckets should configure event notifications.                                              | Static website bucket does not need event-driven notification workflows.                                                                               | Keep unless bucket role changes to event producer. **Owner:** Backend + DevOps                                  |
| `CKV_AWS_355` | IAM policies should not use `Resource = "*"` for restrictable actions.                        | Temporary exception for GitHub Actions deployment role that currently requires broad admin-like permissions.                                           | Refactor role to least privilege and remove skip. **Owner:** DevOps (Security review)                           |
| `CKV_AWS_290` | IAM write permissions should include constraints/conditions where appropriate.                | Temporary exception tied to same broad GitHub Actions deployment role.                                                                                 | Add resource/condition scoping and remove skip. **Owner:** DevOps (Security review)                             |
| `CKV2_AWS_40` | IAM entities should not have full administrative IAM privileges.                              | Temporary exception for deployment automation role pending least-privilege redesign.                                                                   | Split role and narrow IAM actions/resources; remove skip. **Owner:** DevOps (Security review)                   |
| `CKV_AWS_145` | S3 buckets should use KMS-backed encryption.                                                  | Deliberate exception for public static-hosting bucket; KMS requirement is not necessary for current public content and can complicate access patterns. | Reassess if bucket stores sensitive data or architecture changes. **Owner:** DevOps + Security                  |


## Review Cadence

- Review this register every quarter and whenever:
  - `DevSecOps/.checkov.yml` skip list changes
  - major IAM/API/S3 architecture changes occur
  - Checkov version is upgraded

## Approval Notes

- Any new skip must include:
  - security rationale,
  - explicit owner,
  - target date or trigger for revalidation.

