
## Dashboard Finding Suppression (for actionable triage)
The dashboard reduces noise by suppressing low-value findings and collapsing duplicate findings across scanner sources.

Rules are configured in `src/config/findings-rules.json` and documented in `docs/data/Findings-Visualization.md`.
If a finding is known-acceptable for your environment, add a regex entry under `suppression.fieldMatches` rather than editing UI logic.

Type: Public S3 bucket for static site (CKV_AWS_70 – S3 bucket allows any Principal)

Resource: module.s3.aws_s3_bucket_policy.frontend (bucket iam-dashboard-project)
Cause: Scanner flags Principal = "*", Action = "s3:GetObject" on the frontend bucket.
Impact: This bucket is intentionally public for static website hosting; read‑only access to public assets is expected and does not expose sensitive data.
Type: No S3 cross‑region replication on static content bucket (CKV_AWS_144)

Resource: module.s3.aws_s3_bucket.frontend
Cause: Bucket lacks a replication_configuration block.
Impact: This affects durability/availability in a regional outage, not confidentiality or access control; for a static, easily re‑deployable frontend, the security impact is negligible.
Type: No S3 access logging on static content bucket (CKV_AWS_18)

Resource: module.s3.aws_s3_bucket.frontend
Cause: No logging block is configured on the bucket.
Impact: Reduces forensic visibility for this public, read‑only bucket but does not by itself create a vulnerability; access is already intentionally public.
Type: No S3 event notifications on static content bucket (CKV2_AWS_62)

Resource: module.s3.aws_s3_bucket.frontend
Cause: No event notification configuration present.
Impact: Missing notifications only affects downstream automation/monitoring; it does not weaken access control or data protection.
Type: Lambda without DLQ (CKV_AWS_116 – Lambda DLQ not configured)

Resource: module.lambda.aws_lambda_function.scanner
Cause: No dead_letter_config is set on the function.
Impact: This is a reliability/operability concern (failed events may be lost), not a direct security risk.
Type: Lambda without code‑signing enforcement (CKV_AWS_272)

Resource: module.lambda.aws_lambda_function.scanner
Cause: No code_signing_config_arn defined.
Impact: Code signing would harden the supply chain, but in this environment the function is deployed via controlled CI, so absence is a missing best practice rather than an exploitable misconfiguration today.
Type: Lambda not in a VPC (CKV_AWS_117)

Resource: module.lambda.aws_lambda_function.scanner
Cause: No vpc_config block; function runs in the default Lambda networking model.
Impact: For a function that calls public AWS APIs and does not access private VPC resources, running outside a VPC is acceptable and does not increase exposure beyond the existing AWS‑managed perimeter.
Type: CloudFront invalidation policy uses Resource = "*", limited actions (CKV_AWS_290, CKV_AWS_355)

Resource: module.github_actions.aws_iam_role_policy.github_actions_cloudfront_policy
Cause: IAM policy allows cloudfront:CreateInvalidation, GetInvalidation, ListInvalidations on "*" because CloudFront invalidation APIs often require wildcard resources.
Impact: Actions are strictly limited to cache invalidation metadata and do not permit modifying distributions or accessing data; practical impact is very low and aligns with common CI/CD patterns, so this is an acceptable design rather than a meaningful security issue.
