# OPA Rego Policies

These OPA Rego policies enforce IAM security guardrails for the IAM Dashboard. They are evaluated during scanning to detect overly permissive or risky IAM configurations.

---

## Deny Wildcard IAM Actions

**What it checks**  
Flags IAM policies that allow `Action: "*"`.

**Why it matters**  
Wildcard actions violate least privilege and can grant far broader permissions than intended.

**Severity**  
Critical

**Violation message**  
`IAM policy contains wildcard action (*) - use specific actions`

**How to fix it**  
Replace `*` with only the exact AWS actions required for the use case.

**Example (bad)**
```json
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

**Example (fix)**
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

---

## Deny Wildcard IAM Resources

**What it checks**  
Flags IAM policies that allow access to `Resource: "*"`.

**Why it matters**  
This grants permissions across all resources instead of limiting access to only the required ones.

**Severity**  
Critical

**Violation message**  
`IAM policy contains wildcard resource (*) - use specific resources`

**How to fix it**  
Scope the policy to specific ARNs instead of using `*`.

**Example (bad)**
```json
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "*"
}
```

**Example (fix)**
```json
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

---

## Deny Inline Policies on IAM Users

**What it checks**  
Flags IAM users that have inline policies attached.

**Why it matters**  
Inline policies are harder to audit, reuse, and manage consistently than customer-managed policies.

**Severity**  
Medium

**Violation message**  
`IAM user has inline policies - use managed policies instead`

**How to fix it**  
Move inline permissions into managed IAM policies and attach those policies to the user or, preferably, to a group or role.

---

## Deny Inline Policies on IAM Roles

**What it checks**  
Flags IAM roles that have inline policies attached.

**Why it matters**  
Inline role policies reduce visibility and make permission governance harder at scale.

**Severity**  
Medium

**Violation message**  
`IAM role has inline policies - use managed policies instead`

**How to fix it**  
Replace inline role policies with customer-managed policies attached to the role.

---

## Enforce Approved IAM Policy Version

**What it checks**  
Flags IAM policies whose version is not `2012-10-17`.

**Why it matters**  
`2012-10-17` is the current AWS policy language version and should be used for compatibility and expected behavior.

**Severity**  
Low

**Violation message**  
`IAM policy version must be 2012-10-17`

---

## Require MFA for AssumeRole

**What it checks**  
Flags IAM policies that allow `sts:AssumeRole` without requiring MFA.

**Why it matters**  
AssumeRole permissions can enable privilege escalation or cross-account access.

**Severity**  
High

**Violation message**  
`AssumeRole action must require MFA`

---

## Deny Root Account Access in IAM Policies

**What it checks**  
Flags IAM policies that allow access to root principals.

**Why it matters**  
Granting access to root principals is highly risky.

**Severity**  
Critical

---

## Require Access Key Rotation Policy for IAM Users

**What it checks**  
Flags IAM users with access keys when no rotation policy is present.

**Why it matters**  
Long-lived access keys increase the risk of credential theft.

**Severity**  
High

---

## Severity Summary

| Policy | Severity |
|--------|---------|
| Deny Wildcard IAM Actions | Critical |
| Deny Wildcard IAM Resources | Critical |
| Deny Inline Policies on IAM Users | Medium |
| Deny Inline Policies on IAM Roles | Medium |
| Enforce Approved IAM Policy Version | Low |
| Require MFA for AssumeRole | High |
| Deny Root Account Access in IAM Policies | Critical |
| Require Access Key Rotation Policy for IAM Users | High |
