OPA Rego Policies

These OPA Rego policies enforce IAM security guardrails for the IAM Dashboard. They are evaluated during scanning to detect overly permissive or risky IAM configurations.

Policy: Deny Wildcard IAM Actions

What it checks
Flags IAM policies that allow Action: "*".

Why it matters
Wildcard actions violate least privilege and can grant far broader permissions than intended.

Severity
Critical

Violation message
IAM policy contains wildcard action (*) - use specific actions

How to fix it
Replace * with only the exact AWS actions required for the use case.

Example bad

{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "arn:aws:s3:::my-bucket/*"
}

Example fix

{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
Policy: Deny Wildcard IAM Resources

What it checks
Flags IAM policies that allow access to Resource: "*".

Why it matters
This grants permissions across all resources instead of limiting access to only the required ones.

Severity
Critical

Violation message
IAM policy contains wildcard resource (*) - use specific resources

How to fix it
Scope the policy to specific ARNs instead of using *.

Example bad

{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "*"
}

Example fix

{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*"
}
Policy: Deny Inline Policies on IAM Users

What it checks
Flags IAM users that have inline policies attached.

Why it matters
Inline policies are harder to audit, reuse, and manage consistently than customer-managed policies.

Severity
Medium

Violation message
IAM user has inline policies - use managed policies instead

How to fix it
Move inline permissions into managed IAM policies and attach those policies to the user or, preferably, to a group or role.

Recommended remediation

Create a managed policy

Attach the managed policy instead of embedding permissions directly in the user

Policy: Deny Inline Policies on IAM Roles

What it checks
Flags IAM roles that have inline policies attached.

Why it matters
Inline role policies reduce visibility and make permission governance harder at scale.

Severity
Medium

Violation message
IAM role has inline policies - use managed policies instead

How to fix it
Replace inline role policies with customer-managed policies attached to the role.

Recommended remediation

Extract the inline policy

Create a reusable managed policy

Attach the managed policy to the role

Policy: Enforce Approved IAM Policy Version

What it checks
Flags IAM policies whose version is not 2012-10-17.

Why it matters
2012-10-17 is the current AWS policy language version and should be used for compatibility and expected behavior.

Severity
Low

Violation message
IAM policy version must be 2012-10-17

How to fix it
Set the policy version to 2012-10-17.

Example bad

{
  "Version": "2008-10-17"
}

Example fix

{
  "Version": "2012-10-17"
}
Policy: Require MFA for AssumeRole

What it checks
Flags IAM policies that allow sts:AssumeRole without requiring MFA through the condition aws:MultiFactorAuthPresent.

Why it matters
AssumeRole permissions can enable privilege escalation or cross-account access. Requiring MFA adds an important control.

Severity
High

Violation message
AssumeRole action must require MFA

How to fix it
Add a condition requiring MFA to statements that allow sts:AssumeRole.

Example bad

{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": "arn:aws:iam::123456789012:role/AdminRole"
}

Example fix

{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": "arn:aws:iam::123456789012:role/AdminRole",
  "Condition": {
    "StringEquals": {
      "aws:MultiFactorAuthPresent": "true"
    }
  }
}
Policy: Deny Root Account Access in IAM Policies

What it checks
Flags IAM policies that allow access to a root principal such as arn:aws:iam::*:root.

Why it matters
Granting access to root principals is highly risky and can expose the most privileged identity in an AWS account.

Severity
Critical

Violation message
IAM policy should not allow root account access

How to fix it
Replace root principals with specific roles, users, or trusted principals that follow least privilege.

Example bad

{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::*:root"
  },
  "Action": "sts:AssumeRole"
}

Example fix

{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/TrustedRole"
  },
  "Action": "sts:AssumeRole"
}
Policy: Require Access Key Rotation Policy for IAM Users

What it checks
Flags IAM users with access keys when no access key rotation policy is present.

Why it matters
Long-lived access keys increase the risk of credential theft and unauthorized persistence.

Severity
High

Violation message
IAM user with access keys must have rotation policy

How to fix it
Enforce regular access key rotation, monitor key age, and prefer temporary credentials through IAM roles where possible.

Recommended remediation

Enable and document key rotation requirements

Rotate keys on a defined schedule

Replace long-lived keys with role-based temporary credentials whenever possible

Severity Summary
Policy	Severity
Deny Wildcard IAM Actions	Critical
Deny Wildcard IAM Resources	Critical
Deny Inline Policies on IAM Users	Medium
Deny Inline Policies on IAM Roles	Medium
Enforce Approved IAM Policy Version	Low
Require MFA for AssumeRole	High
Deny Root Account Access in IAM Policies	Critical
Require Access Key Rotation Policy for IAM Users	High
Notes for Teams

These policies are designed to enforce least privilege, strong authentication, and better IAM governance.

If a rule is too strict for a legitimate use case, tune the Rego policy carefully and document the exception.

Remediation should favor:

specific actions over wildcards

specific resources over global access

managed policies over inline policies

MFA for sensitive role assumption

temporary credentials over long-lived keys
