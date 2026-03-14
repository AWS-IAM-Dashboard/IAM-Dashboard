# False Positives Catalog (S1)

**Purpose:** Catalog findings that the IAM/security scanner reports as risks but are not real security issues in this project’s context. For each type, cause and impact are noted so detection rules (e.g. S2), deduplication/suppression (S5), and remediation guidance can be updated for a more trustworthy dashboard.

**Source:** Security Summary Report (comprehensive IAM scan), 93 findings (5 critical, 78 high, 9 medium, 1 low). This document lists **types** of findings that should be treated as false positives or accepted-by-design.

---

## 1. AWS service-linked roles (write on `*` / service-wide permissions)

| Item | Details |
|------|--------|
| **Finding type** | Role has “write permissions on all resources (`*`)” or “full &lt;service&gt; service permissions (&lt;service&gt;:*)” |
| **Example resources** | `AWSServiceRoleForAmazonGuardDuty`, `AWSServiceRoleForAmazonInspector2`, `AWSServiceRoleForAPIGateway`, `AWSServiceRoleForCloudTrail`, `AWSServiceRoleForConfig`, `AWSServiceRoleForOrganizations`, `AWSServiceRoleForResourceExplorer`, `AWSServiceRoleForSupport` |
| **Cause** | Scanner flags any role with `Resource: "*"` or broad service actions (e.g. `cloudtrail:*`) as high risk. |
| **Impact** | These roles are created and managed by AWS. Customers cannot change or restrict their policies; they are required for the service to operate. Flagging them is noise and reduces trust in the dashboard. |

**Recommendation:** Suppress or exclude roles whose name (or ARN) matches AWS service-linked role patterns (e.g. `arn:aws:iam::*:role/aws-service-role/*`). Do not show them as actionable findings.

---

## 2. Intentional test/demo roles (admin, wildcard, S3 wildcard)

| Item | Details |
|------|--------|
| **Finding type** | Role has AdministratorAccess, full wildcard policy (`*`), or service-wide policy (e.g. `s3:*`) and name indicates test/demo use. |
| **Example resources** | `test-admin-role-1764893836`, `test-wildcard-role-1764893836`, `test-s3-wildcard-role-1764893836` |
| **Cause** | Scanner flags admin and wildcard permissions as critical/high regardless of intent. |
| **Impact** | These roles exist to test the scanner and dashboard (intentional misconfigurations). They are not used by production workloads. Showing them as critical/high findings obscures real issues. |

**Recommendation:** Suppress or tag as “Known test resource” by role name pattern (e.g. `test-*-*`) or by a resource tag. Optionally allow users to mark roles as “test/demo” so they are deduplicated or shown with lower severity.

---

## 3. Project CI/CD and application roles (broad permissions by design)

| Item | Details |
|------|--------|
| **Finding type** | Role has “write permissions on all resources (`*`)”, “full &lt;service&gt; service permissions”, or “can create/modify IAM resources” (e.g. `iam:CreateRole`, `iam:PutRolePolicy`, `iam:AttachRolePolicy`). |
| **Example resources** | `IAM-Dash-GitHub-CD`, `iam-dashboard-deployer-prod`, `iam-dashboard-lambda-role`, `iam-dashboard-role-backend`, `iam-dashboard-role-data`, `iam-dashboard-role-devops` |
| **Cause** | Scanner treats any `Resource: "*"` or `Action: "service:*"` as high risk and flags IAM write actions as dangerous. |
| **Impact** | Deployment and application roles need broad access to deploy and operate the dashboard (Lambda, S3, DynamoDB, API Gateway, CloudFront, IAM for role creation, etc.). Restricting to a minimal set would require very long action/resource lists; risk is mitigated by OIDC (GitHub Actions), assume-role scope, and controlled use. These are accepted by design for this project. |

**Recommendation:** Allow suppression or “accepted-by-design” for specific role names or tags (e.g. `project=iam-dashboard`). Update remediation guidance to say: “If this role is a deploy or app role with documented justification, you can mark it as accepted; otherwise apply least privilege.”

---

## 4. Demo/lab users (MFA, access key age, inactive login)

| Item | Details |
|------|--------|
| **Finding type** | User “does not have MFA enabled”; access key “is X days old” (e.g. &gt; 90); user “has not logged in for X days”; access key “has not been used in X days”. |
| **Example resources** | `cyber-alvin`, `cyber-Akif`, `cyber-Alexa`, `cyber-Dev`, `cyber-test`, and their access keys |
| **Cause** | Scanner applies standard best practices (MFA, 90-day key rotation, inactive user review) without account context. |
| **Impact** | In a shared demo/lab account, these may be placeholder or training identities with no real usage. Treating them as critical/high/medium creates noise and can be misleading when the account is not production. |

**Recommendation:** When the account (or user list) is marked as “demo” or “lab”, suppress or downgrade these findings. In remediation guidance, add: “If this is a demo/lab account, consider tagging it so MFA/key-age/inactivity findings are filtered or de-prioritized.”

---

## 5. Unrelated application roles (same account, different scope)

| Item | Details |
|------|--------|
| **Finding type** | Same as for project roles: write on `*`, full service permissions (e.g. `dynamodb:*`, `dax:*`). |
| **Example resources** | `KeenKloud`, `MarketUpdater-role-gyl79baw`, `NextWave-role-e212w7zp`, `keen-vibe-api-role`, `keen-vibe-worker-role`, `riterhythm-lambda-role` |
| **Cause** | Scanner runs account-wide and flags all IAM entities with broad permissions. |
| **Impact** | These roles belong to other applications in the same AWS account, not to the IAM Dashboard. For a project-focused dashboard, they are out of scope; showing them mixes project findings with unrelated ones and can confuse owners. |

**Recommendation:** Support scope filtering (e.g. by tag, role name prefix, or “project” attribute) so the dashboard can show only project-relevant resources. Optionally suppress or separate “out-of-scope” roles so they are not counted in project metrics.

---

## 6. Single admin user in lab/demo (AdministratorAccess)

| Item | Details |
|------|--------|
| **Finding type** | User has AdministratorAccess (or equivalent) attached. |
| **Example resources** | `iamadmin` |
| **Cause** | Scanner flags any user with admin policy as critical. |
| **Impact** | In a lab or demo account, a single admin user is often intentional for setup and testing. In production, this would be a real finding. Context-dependent. |

**Recommendation:** In remediation guidance, state: “Acceptable in lab/demo accounts for setup; in production, remove AdministratorAccess and use least-privilege roles.” Allow marking the finding as “Accepted – lab account” so it can be suppressed or deduplicated (S5).

---

## Summary: How to use this catalog

- **Detection rules (S2):** Add exceptions or lower severity for AWS service-linked roles, test role name patterns, and (optionally) tagged “demo” accounts or “accepted-by-design” roles.
- **Deduplication/suppression (S5):** Use role/user name patterns, ARN patterns, or tags to suppress the types above so they do not inflate critical/high counts.
- **Remediation guidance:** For each type, link to this doc and clarify when a finding is a false positive or accepted-by-design so analysts can triage without treating them as real security issues.
