## Scanner false positives and acceptable risks

This document catalogs recurring scanner findings from OPA, Checkov, and Gitleaks that are **not actual security issues in our environment**. For each type, we document why it is acceptable, what the real impact would be, and how the scanners are tuned or suppressed.

- **OPA results**: console output from `make opa`
- **Checkov results**: JSON output (e.g. `scanner-results/checkov-results.json`)
- **Gitleaks results**: JSON/console output (e.g. `scanner-results/gitleaks-results.json`)

Engineers should reference this file when triaging scan results. If a finding clearly matches one of the types below and the documented preconditions hold, treat it as an accepted risk or false positive as described here. Otherwise, triage it as a potential real issue.

---

## OPA policy findings

Use this section for OPA `deny` results that are acceptable in specific, well-understood contexts.

### OPA-FP-1: Broad IAM permissions for constrained GitHub Actions deployer role

- **Scanner**: OPA
- **Rule/policy ID**: e.g. `iam_wildcard_actions`, `iam_wildcard_resources` in `DevSecOps/opa-policies/iam-policies.rego`
- **Typical location**: `infra/github-actions/main.tf` IAM role and inline policy for the GitHub Actions deployer
- **Pattern**: OPA flags IAM policies that include broad IAM actions such as `iam:*`, `iam:Get*`, and `iam:List*` over a limited set of IAM roles and policies used only by the IAM Dashboard deployment pipeline.
- **Root cause of false positive**: The policy must manage IAM roles and policies as part of the deployment workflow, so it legitimately requires powerful IAM actions. However, its **resource scope is restricted** to:
  - The dashboard’s deployer role (e.g. `arn:aws:iam::*:role/IAMDash-Deployer-Prod` and `iam-dashboard-*` roles)
  - IAM policies in the deployment account
- **Actual impact**: If this policy were abused, the blast radius is limited to IAM roles and policies for this application’s account. Access is further constrained by:
  - GitHub Actions OIDC trust only for specific repositories and branches
  - AWS-side conditions (such as audience and subject claims) on the trust policy
- **Decision**: `accepted_risk` (required privileged deployer path with compensating controls)
- **Handling**:
  - Keep OPA rules that generally forbid wildcard IAM actions and resources.
  - Introduce explicit exceptions for this deployer role via policy annotations, allowlists, or a dedicated exception rule, with a short justification referencing this entry (`OPA-FP-1`).
  - Revisit this exception if the deployer role’s trust policy or resource scope is ever broadened.

---

## Checkov IaC findings

Use this section for Checkov `FAILED` results in Terraform/Kubernetes/Dockerfiles that you have consciously accepted or that are artifacts of the environment.

### CKV-FP-1: API Gateway stage without access logging in non-production environments

- **Scanner**: Checkov
- **Check ID**: `CKV_AWS_76` (`BC_AWS_LOGGING_17`)
- **Title**: Ensure API Gateway has Access Logging enabled
- **Typical resources**: `aws_apigatewayv2_stage` resources such as the default stage in `infra` (e.g. `infra/api-gateway/*.tf` or `infra/github-actions/main.tf` where the stage is defined)
- **Pattern**: Checkov flags API Gateway v2 stages that do not configure `access_log_settings.destination_arn`.
- **Root cause of false positive**: In non-production environments, API Gateway traffic carries only synthetic test or demo data, and end-to-end request/response behavior is already captured by:
  - Application-level logging with structured request IDs
  - Centralized log collection (e.g. CloudWatch Logs groups for Lambda functions)
- **Actual impact**: The lack of dedicated API Gateway access logs in **non-production** stages does not materially impact the ability to investigate security events or debug issues, because:
  - No sensitive customer data flows through these stages.
  - Equivalent telemetry exists in downstream services.
- **Decision**: `accepted_risk` for non-production stages only (keep the check enforced for production).
- **Handling**:
  - Add a clear tagging convention (e.g. `Env = "dev"` or `Env = "staging"`) and use that to scope any Checkov suppressions.
  - When a `CKV_AWS_76` failure is observed on a non-production stage, suppress it with an inline skip or Checkov config, referencing this entry (`CKV-FP-1`) and the environment tag in the justification.
  - Do **not** suppress this check for production stages; ensure access logging is enabled there.

### CKV-FP-2: IAM wildcard checks handled by OPA guardrails

- **Scanner**: Checkov
- **Check IDs**: `CKV_AWS_1`, `CKV_AWS_2`, `CKV_AWS_3`
- **Title**: Wildcard actions/resources/principals in IAM policies
- **Typical resources**: IAM policies and inline policies across Terraform modules.
- **Pattern**: Checkov flags IAM policies that use `Action = "*"`, wildcard resources, or wildcard principals.
- **Root cause of false positive**: In this project, wildcard IAM patterns are centrally governed and constrained by OPA policies in `DevSecOps/opa-policies/iam-policies.rego`. OPA enforces:
  - Restriction of wildcard usage to tightly scoped, audited policies.
  - Additional contextual constraints (e.g. account, resource prefixes, or conditions).
- **Actual impact**: Relying on OPA for these controls means that letting Checkov also flag them is redundant noise, not additional security coverage.
- **Decision**: `false_positive` for Checkov (risk is managed by OPA instead).
- **Handling**:
  - These checks are already disabled in `DevSecOps/.checkov.yml` via `skip_checks` with comments referencing OPA.
  - When reviewing Checkov configuration, treat these as intentionally skipped checks and verify that the corresponding OPA policies remain in place and tested.

---

## Gitleaks secrets findings

Use this section for Gitleaks findings that match non-sensitive, example, or test values.

> Note: The latest run (`scanner-results/gitleaks-results.json`) reports **`no leaks found`**. Entries below describe types that have historically produced noise and how to treat them if they reappear.

### GL-FP-1: Example AWS credentials in SDK/library fixtures

- **Scanner**: Gitleaks
- **Rule ID**: `aws-access-key`, `aws-secret-key`
- **Typical locations**: Library or SDK fixtures and example code under:
  - `infra/lambda/botocore/**`
  - `infra/lambda/boto3/**`
- **Pattern**: Strings that match the format of AWS access keys or secret keys but are part of vendor examples or test data, not live credentials for this project.
- **Root cause of false positive**: These fixtures are included to support AWS SDK behavior in Lambda layers or tests. They are non-functional and not tied to any real AWS account.
- **Actual impact**: Leaking these values has **no impact** on IAM Dashboard security, because they cannot be used to authenticate against AWS.
- **Decision**: `false_positive`.
- **Handling**:
  - These paths are explicitly allowlisted in `DevSecOps/.gitleaks.toml` under `[allowlist].paths`.
  - If Gitleaks is ever run without this config and flags these fixtures, suppress them based on path and reference this entry (`GL-FP-1`) in the justification.

### GL-FP-2: JWT-like tokens used in UI examples

- **Scanner**: Gitleaks
- **Rule ID**: `jwt-token`
- **Typical locations**: Frontend components or documentation where JWT structures are shown as examples, such as:
  - `src/components/SecurityHub.tsx`
  - Docs under `docs/**` (when scanned without current exclude patterns)
- **Pattern**: Strings matching the `header.payload.signature` JWT pattern used in static examples or screenshots, not issued by a real identity provider.
- **Root cause of false positive**: Example JWTs are hard-coded in docs or UI components purely for illustrative purposes. They encode dummy data and are not signed with any private key used in production.
- **Actual impact**: Exposing these example tokens does not grant access to any system or data.
- **Decision**: `false_positive`.
- **Handling**:
  - Keep example tokens clearly marked as fake (e.g. payloads like `"sub": "example-user"` and obviously invalid signatures).
  - Rely on the existing path-based allows in `.gitleaks.toml` for `SecurityHub.tsx` and docs.
  - If Gitleaks flags these despite the config, update the allowlist paths and reference this entry (`GL-FP-2`) in the commit message or suppression rationale.

---

## How to use this catalog when triaging scans

1. **Run the scanners** using `make scan` (or individual `make opa`, `make checkov`, `make gitleaks`).
2. **Review the raw results**:
   - OPA: console output (`deny` messages).
   - Checkov: `scanner-results/checkov-results.json` and CLI summary.
   - Gitleaks: `scanner-results/gitleaks-results.json` and CLI summary.
3. **For each finding**, decide:
   - Does it clearly match one of the types above (including preconditions like environment or path)?  
     - **Yes** → Treat as a known false positive or accepted risk, and reference the corresponding ID (e.g. `CKV-FP-1`) in any suppression.
     - **No** → Treat as a potential real issue: investigate, fix, or create a **new** entry in this file if it turns out to be an acceptable, recurring pattern.
4. **Keep this file updated** as new recurring false positives are discovered, so future scans become faster to triage and more focused on real risk.

