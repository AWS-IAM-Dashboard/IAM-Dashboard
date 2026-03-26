/**
 * apiMock.ts — Mock API fixtures for VITE_DATA_MODE=mock
 *
 * Strategy per scanner:
 *  - IAM / EC2 / S3          : Return metadata + scan_summary but NO findings key.
 *                              Components use `response.results?.findings || mockFindings`
 *                              — omitting the key means undefined, so internal mock wins.
 *  - SecurityHub              : Return full findings array (component has no internal mock).
 *  - VPC / DynamoDB / AA      : Components use `??` on a nested key (results.vpc.findings, etc.)
 *                              so the current stub already triggers their internal fallback.
 *  - GuardDuty / Inspector /  : These scanners do not call the API in their current
 *    Macie / Config             implementation — stubs kept for future wiring.
 *  - Dashboard / full scan    : Rich aggregate responses for the overview tab.
 *
 * All data represents a single fictional account: acme-corp-production (123456789012).
 */

import type { DashboardData, ScanResponse } from "../services/api";

// ─── Shared constants ────────────────────────────────────────────────────────

const ACCOUNT_ID = "123456789012";

function nowIso() {
  return new Date().toISOString();
}
function ago(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

// ─── SecurityHub findings (full array — component has no internal mock) ───────

const SECURITY_HUB_FINDINGS = [
  // ── CRITICAL ──────────────────────────────────────────────────────────────
  {
    id: "sh-iam-9-root-no-mfa",
    title: "Root account has no MFA enabled",
    description:
      "The root account does not have multi-factor authentication (MFA) enabled. The root account has unrestricted access to all AWS services and resources, so enabling MFA adds an extra layer of protection.",
    severity: "CRITICAL",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsIamUser",
    resource_id: "arn:aws:iam::123456789012:root",
    region: "us-east-1",
    created_at: ago(72),
    updated_at: ago(1),
  },
  {
    id: "sh-s3-2-public-access-company-prod",
    title: "S3 bucket company-prod-data is publicly accessible via ACL",
    description:
      "Bucket company-prod-data has an ACL that grants AllUsers READ access. Any unauthenticated internet user can list and download objects in this bucket.",
    severity: "CRITICAL",
    workflow_status: "IN_PROGRESS",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsS3Bucket",
    resource_id: "arn:aws:s3:::company-prod-data",
    region: "us-east-1",
    created_at: ago(48),
    updated_at: ago(2),
  },
  // ── HIGH ──────────────────────────────────────────────────────────────────
  {
    id: "sh-ec2-13-ssh-unrestricted",
    title: "EC2 security group allows unrestricted SSH access from 0.0.0.0/0",
    description:
      "Security group sg-web-public allows inbound SSH (port 22) from 0.0.0.0/0. Removing unfettered connectivity to remote console services reduces a server's exposure to risk.",
    severity: "HIGH",
    workflow_status: "TRIAGED",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsEc2SecurityGroup",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-web-public",
    region: "us-east-1",
    created_at: ago(36),
    updated_at: ago(4),
  },
  {
    id: "sh-cloudtrail-1-no-multiregion",
    title: "CloudTrail multi-region trail is not enabled",
    description:
      "AWS CloudTrail is a service that provides a record of actions taken by a user, role, or AWS service. Without a multi-region trail enabled, activity in non-primary regions is not logged.",
    severity: "HIGH",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsCloudTrailTrail",
    resource_id: "arn:aws:cloudtrail:us-east-1:123456789012:trail/prod-audit-trail",
    region: "us-east-1",
    created_at: ago(120),
    updated_at: ago(24),
  },
  {
    id: "sh-ec2-6-vpc-flow-logs",
    title: "VPC flow logging is not enabled for all VPCs",
    description:
      "VPC Flow Logs is a feature that enables you to capture information about the IP traffic going to and from network interfaces in your VPC. VPC flow logs help you to detect anomalous traffic, investigate security incidents, and monitor your network.",
    severity: "HIGH",
    workflow_status: "ASSIGNED",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsEc2Vpc",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0a1b2c3d4e5f6789",
    region: "us-east-1",
    created_at: ago(96),
    updated_at: ago(8),
  },
  {
    id: "sh-iam-8-password-policy-uppercase",
    title: "IAM password policy does not require uppercase letters",
    description:
      "Password policies are used to enforce password complexity requirements. IAM password policies can be configured to require password complexity, rotation, and history. Policies should require at least one uppercase letter.",
    severity: "HIGH",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsIamPasswordPolicy",
    resource_id: "arn:aws:iam::123456789012:root",
    region: "us-east-1",
    created_at: ago(200),
    updated_at: ago(48),
  },
  {
    id: "sh-config-1-not-enabled",
    title: "AWS Config is not enabled in eu-west-2",
    description:
      "AWS Config provides a detailed view of the configuration of AWS resources. Config is not enabled in eu-west-2, meaning configuration changes in that region will not be recorded or evaluated against compliance rules.",
    severity: "HIGH",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsAccount",
    resource_id: "arn:aws:config:eu-west-2:123456789012:config-recorder",
    region: "eu-west-2",
    created_at: ago(160),
    updated_at: ago(48),
  },
  // ── MEDIUM ────────────────────────────────────────────────────────────────
  {
    id: "sh-ec2-8-imdsv2",
    title: "EC2 instances should use IMDSv2",
    description:
      "9 EC2 instances have IMDSv1 still enabled (HttpTokens=optional). IMDSv1 is vulnerable to SSRF attacks — a web application vulnerability can expose instance role credentials.",
    severity: "MEDIUM",
    workflow_status: "IN_PROGRESS",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsEc2Instance",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:instance/i-0d4e5f6789abcdef0",
    region: "us-east-1",
    created_at: ago(16),
    updated_at: ago(3),
  },
  {
    id: "sh-ec2-7-ebs-encryption",
    title: "EBS default encryption should be enabled",
    description:
      "Account-level EBS default encryption is not enabled. New EBS volumes and snapshot copies will not be encrypted unless explicitly specified at creation time.",
    severity: "MEDIUM",
    workflow_status: "TRIAGED",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsAccount",
    resource_id: "arn:aws:ec2:us-east-1:123456789012",
    region: "us-east-1",
    created_at: ago(80),
    updated_at: ago(12),
  },
  {
    id: "sh-rds-1-public-snapshot",
    title: "RDS DB snapshot is public",
    description:
      "RDS snapshot rds:postgres-main-2024-01-10 is publicly restorable. Any AWS account can restore this snapshot, which may contain customer data and credentials.",
    severity: "MEDIUM",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsRdsDbSnapshot",
    resource_id: "arn:aws:rds:us-east-1:123456789012:snapshot:rds:postgres-main-2024-01-10",
    region: "us-east-1",
    created_at: ago(24),
    updated_at: ago(6),
  },
  {
    id: "sh-s3-9-logging-disabled",
    title: "S3 server access logging is not enabled for analytics-pipeline-raw",
    description:
      "S3 server access logging provides detailed records for requests made to the bucket. Without logging, it is not possible to audit who accessed the bucket or when.",
    severity: "MEDIUM",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsS3Bucket",
    resource_id: "arn:aws:s3:::analytics-pipeline-raw",
    region: "us-east-1",
    created_at: ago(90),
    updated_at: ago(20),
  },
  {
    id: "sh-kms-4-rotation-disabled",
    title: "KMS key automatic rotation is not enabled",
    description:
      "CMK alias/app-data-key does not have automatic key rotation enabled. AWS recommends rotating CMKs annually at minimum. Long-lived keys increase the blast radius of a key compromise.",
    severity: "MEDIUM",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsKmsKey",
    resource_id: "arn:aws:kms:us-east-1:123456789012:key/mrk-0a1b2c3d4e5f67890",
    region: "us-east-1",
    created_at: ago(150),
    updated_at: ago(30),
  },
  {
    id: "sh-iam-3-access-key-rotation",
    title: "IAM access keys should be rotated within 90 days",
    description:
      "Access key AKIA_REDACTED_MOCK on user svc-legacy-deploy was created 127 days ago and has not been rotated. Stale credentials increase the risk of undetected compromise.",
    severity: "MEDIUM",
    workflow_status: "PENDING_VERIFY",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsIamAccessKey",
    resource_id: "arn:aws:iam::123456789012:user/svc-legacy-deploy",
    region: "us-east-1",
    created_at: ago(127 * 24),
    updated_at: ago(2),
  },
  {
    id: "sh-guardduty-1-not-enabled",
    title: "GuardDuty should be enabled in ap-southeast-1",
    description:
      "GuardDuty is not enabled in ap-southeast-1. Threat detection is blind in that region — any account compromise, data exfiltration, or crypto-mining activity in that region will not be detected.",
    severity: "MEDIUM",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsAccount",
    resource_id: "arn:aws:guardduty:ap-southeast-1:123456789012",
    region: "ap-southeast-1",
    created_at: ago(200),
    updated_at: ago(48),
  },
  {
    id: "sh-lambda-2-env-not-encrypted",
    title: "Lambda environment variables are not encrypted at rest with KMS",
    description:
      "Lambda function data-ingestion-processor stores environment variables without customer-managed KMS encryption. Environment variables may contain API keys, database connection strings, or other sensitive configuration.",
    severity: "MEDIUM",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsLambdaFunction",
    resource_id: "arn:aws:lambda:us-east-1:123456789012:function:data-ingestion-processor",
    region: "us-east-1",
    created_at: ago(60),
    updated_at: ago(14),
  },
  // ── LOW ───────────────────────────────────────────────────────────────────
  {
    id: "sh-s3-13-lifecycle-missing",
    title: "S3 bucket lifecycle configuration is not set for app-media-uploads",
    description:
      "Bucket app-media-uploads has no lifecycle policy configured. Without lifecycle rules, objects accumulate indefinitely, increasing cost and potentially retaining data beyond your compliance requirements.",
    severity: "LOW",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsS3Bucket",
    resource_id: "arn:aws:s3:::app-media-uploads",
    region: "us-east-1",
    created_at: ago(240),
    updated_at: ago(72),
  },
  {
    id: "sh-iam-22-multiple-access-keys",
    title: "IAM user ci-bot has multiple active access keys",
    description:
      "IAM user ci-bot has 2 active access keys. Multiple active keys increase the attack surface and make it harder to audit which key was used for a given API call.",
    severity: "LOW",
    workflow_status: "RESOLVED",
    compliance_status: "PASSED",
    product_name: "Security Hub",
    resource_type: "AwsIamUser",
    resource_id: "arn:aws:iam::123456789012:user/ci-bot",
    region: "us-east-1",
    created_at: ago(300),
    updated_at: ago(4),
  },
  {
    id: "sh-ec2-15-default-vpc-in-use",
    title: "EC2 instances should not use the default VPC",
    description:
      "3 EC2 instances are running in the default VPC. The default VPC allows all inbound and outbound traffic between instances by default, does not follow least-privilege networking principles, and is not recommended for production workloads.",
    severity: "LOW",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsEc2Instance",
    resource_id: "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-default",
    region: "us-east-1",
    created_at: ago(400),
    updated_at: ago(100),
  },
  // ── INFORMATIONAL ─────────────────────────────────────────────────────────
  {
    id: "sh-iam-6-root-hardware-mfa",
    title: "Hardware MFA should be enabled for the root account",
    description:
      "The root account has virtual MFA enabled, but CIS recommends a hardware MFA device for root. Virtual MFA is less resistant to phishing and SIM-swap attacks.",
    severity: "INFORMATIONAL",
    workflow_status: "SUPPRESSED",
    compliance_status: "PASSED",
    product_name: "Security Hub",
    resource_type: "AwsIamUser",
    resource_id: "arn:aws:iam::123456789012:root",
    region: "us-east-1",
    created_at: ago(180),
    updated_at: ago(180),
  },
  {
    id: "sh-cloudtrail-7-s3-access-logging",
    title: "CloudTrail S3 bucket access logging is not enabled",
    description:
      "The S3 bucket storing CloudTrail logs (prod-cloudtrail-logs) does not have server access logging enabled. Without this, access to the audit trail itself is not audited.",
    severity: "INFORMATIONAL",
    workflow_status: "NEW",
    compliance_status: "FAILED",
    product_name: "Security Hub",
    resource_type: "AwsS3Bucket",
    resource_id: "arn:aws:s3:::prod-cloudtrail-logs",
    region: "us-east-1",
    created_at: ago(500),
    updated_at: ago(120),
  },
];

// ─── /scan/iam ────────────────────────────────────────────────────────────────
// findings key intentionally omitted — AWSIAMScan falls back to its internal
// mockFindings via `response.results?.findings || mockFindings`

function iamScanResponse(region: string): ScanResponse {
  return {
    scan_id: `iam-mock-${Date.now()}`,
    scanner_type: "iam",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      users: { total: 24, with_console_access: 8, with_mfa: 6, active_keys: 19 },
      roles: { total: 31, high_risk: 3, cross_account: 4 },
      policies: { total: 47, customer_managed: 23, aws_managed_in_use: 24 },
      groups: { total: 8 },
      // NOTE: no `findings` key — component's own mockFindings takes over
      scan_summary: {
        users: 24,
        roles: 31,
        policies: 47,
        groups: 8,
        critical_findings: 2,
        high_findings: 5,
        medium_findings: 3,
        low_findings: 0,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/ec2 ────────────────────────────────────────────────────────────────
// EC2Security: `response.results?.findings || mockFindings` → no findings key = uses internal mock
// VPCSecurity: `response.results?.vpc?.findings ?? mockVPCFindings` → no vpc key = uses internal mock

function ec2ScanResponse(region: string): ScanResponse {
  return {
    scan_id: `ec2-mock-${Date.now()}`,
    scanner_type: "ec2",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      instances: {
        total: 28,
        running: 22,
        stopped: 6,
        public: 4,
        unencrypted_volumes: 7,
      },
      // NOTE: no `findings` key — component's own mockFindings takes over
      // NOTE: no `vpc` key — VPCSecurity falls back to its own mockVPCFindings
      scan_summary: {
        running_instances: 22,
        stopped_instances: 6,
        critical_findings: 4,
        high_findings: 4,
        medium_findings: 2,
        low_findings: 0,
        publicly_accessible: 4,
        unencrypted_volumes: 7,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/s3 ────────────────────────────────────────────────────────────────
// S3Security: `response.results?.findings || mockS3Findings` → no findings key = uses internal mock

function s3ScanResponse(region: string): ScanResponse {
  return {
    scan_id: `s3-mock-${Date.now()}`,
    scanner_type: "s3",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      // NOTE: no `findings` key — component's own mockS3Findings takes over
      scan_summary: {
        total_buckets: 14,
        public_buckets: 3,
        unencrypted_buckets: 2,
        logging_disabled: 7,
        versioning_disabled: 8,
        mfa_delete_disabled: 12,
        critical_findings: 2,
        high_findings: 4,
        medium_findings: 3,
        low_findings: 1,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/security-hub ──────────────────────────────────────────────────────
// SecurityHub starts with empty state — must supply full findings array.
// summary keys: `critical`, `high`, `medium`, `low` (not *_findings)

function securityHubScanResponse(region: string): ScanResponse {
  const counts = SECURITY_HUB_FINDINGS.reduce(
    (acc, f) => {
      const s = f.severity.toUpperCase();
      if (s === "CRITICAL") acc.critical++;
      else if (s === "HIGH") acc.high++;
      else if (s === "MEDIUM") acc.medium++;
      else if (s === "LOW") acc.low++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  return {
    scan_id: `sh-mock-${Date.now()}`,
    scanner_type: "security-hub",
    region,
    status: "completed",
    results: {
      findings: SECURITY_HUB_FINDINGS,
      summary: {
        total_findings: SECURITY_HUB_FINDINGS.length,
        ...counts,
        compliance_score: 68,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/guardduty ─────────────────────────────────────────────────────────
// GuardDuty component uses internal mock; this stub is future-ready.

function guardDutyScanResponse(region: string): ScanResponse {
  return {
    scan_id: `gd-mock-${Date.now()}`,
    scanner_type: "guardduty",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      detector_id: "det-0a1b2c3d4e5f6789a",
      findings: [],
      summary: {
        total_findings: 0,
        critical_findings: 0,
        high_findings: 0,
        medium_findings: 0,
        low_findings: 0,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/config ─────────────────────────────────────────────────────────────
// AWSConfig component uses internal mock; this stub is future-ready.

function configScanResponse(region: string): ScanResponse {
  return {
    scan_id: `cfg-mock-${Date.now()}`,
    scanner_type: "config",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      findings: [],
      summary: {
        total_rules: 47,
        compliant: 34,
        non_compliant: 13,
        compliance_percentage: 72,
        critical_findings: 0,
        high_findings: 0,
        medium_findings: 0,
        low_findings: 0,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/inspector ─────────────────────────────────────────────────────────
// Inspector component uses internal mock; this stub is future-ready.

function inspectorScanResponse(region: string): ScanResponse {
  return {
    scan_id: `insp-mock-${Date.now()}`,
    scanner_type: "inspector",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      findings: [],
      summary: {
        total_cves: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        affected_resources: 0,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /scan/macie ─────────────────────────────────────────────────────────────
// Macie component uses internal mock; this stub is future-ready.

function macieScanResponse(region: string): ScanResponse {
  return {
    scan_id: `macie-mock-${Date.now()}`,
    scanner_type: "macie",
    region,
    status: "completed",
    results: {
      account_id: ACCOUNT_ID,
      findings: [],
      summary: {
        total_findings: 0,
        critical_findings: 0,
        high_findings: 0,
        pii_buckets_affected: 3,
        sensitive_object_count: 0,
      },
    },
    timestamp: nowIso(),
  };
}

// ─── Full-scan findings — Title Case severity, stable IDs, old timestamps ─────
// These populate Dashboard IR mode: triage queue, pipeline, attack surface, responder board.
// Severity uses Title Case ("Critical" / "High" / "Medium" / "Low") to match Dashboard filters.
// Timestamps are backdated so SLA breach logic fires on Critical (>4h) and High (>24h).

const FULL_SCAN_IAM_FINDINGS = [
  {
    id: "fs-iam-001",
    resource_arn: "arn:aws:iam::123456789012:root",
    title: "Root account has active access keys",
    description: "The root account has 2 active access keys. Root credentials bypass all IAM policies and cannot be restricted — any key compromise grants unrestricted control of the account.",
    severity: "Critical",
    finding_type: "IAM",
    resource_type: "IAM User",
    created_at: ago(52),
    timestamp: ago(52),
    region: "us-east-1",
  },
  {
    id: "fs-iam-002",
    resource_arn: "arn:aws:iam::123456789012:user/john.smith",
    title: "Console user john.smith has no MFA",
    description: "IAM user john.smith has AWS Console access enabled but no MFA device registered. A credential-only compromise would grant full console access with no second factor.",
    severity: "Critical",
    finding_type: "IAM",
    resource_type: "IAM User",
    created_at: ago(38),
    timestamp: ago(38),
    region: "us-east-1",
  },
  {
    id: "fs-iam-003",
    resource_arn: "arn:aws:iam::123456789012:policy/AdminFullAccess-Custom",
    title: "Customer-managed policy grants iam:* on all resources",
    description: "Policy AdminFullAccess-Custom allows iam:* on Resource:* and is attached to 3 roles. This grants privilege escalation capability — any bearer can create new admin users or attach policies.",
    severity: "High",
    finding_type: "IAM",
    resource_type: "IAM Policy",
    created_at: ago(120),
    timestamp: ago(120),
    region: "us-east-1",
  },
  {
    id: "fs-iam-004",
    resource_arn: "arn:aws:iam::123456789012:user/svc-legacy-deploy",
    title: "Access key for svc-legacy-deploy is 127 days old",
    description: "IAM access key AKIA_REDACTED on svc-legacy-deploy was last rotated 127 days ago, exceeding the 90-day SLA. The key has been used within the past 14 days.",
    severity: "High",
    finding_type: "IAM",
    resource_type: "IAM Access Key",
    created_at: ago(127 * 24),
    timestamp: ago(127 * 24),
    region: "us-east-1",
  },
  {
    id: "fs-iam-005",
    resource_arn: "arn:aws:iam::123456789012:role/EC2-DataExport-Role",
    title: "Cross-account role trust is overly permissive",
    description: "Role EC2-DataExport-Role trusts account * instead of a specific partner account ID. Any AWS account can assume this role if they know its ARN.",
    severity: "High",
    finding_type: "IAM",
    resource_type: "IAM Role",
    created_at: ago(200),
    timestamp: ago(200),
    region: "us-east-1",
  },
  {
    id: "fs-iam-006",
    resource_arn: "arn:aws:iam::123456789012:account",
    title: "IAM password policy does not require symbol characters",
    description: "The account password policy does not require a symbol character. Passwords without symbols are significantly weaker against brute-force and credential-spray attacks.",
    severity: "Medium",
    finding_type: "IAM",
    resource_type: "IAM Password Policy",
    created_at: ago(300),
    timestamp: ago(300),
    region: "us-east-1",
  },
  {
    id: "fs-iam-007",
    resource_arn: "arn:aws:iam::123456789012:user/ci-bot",
    title: "IAM user ci-bot has 2 active access keys",
    description: "ci-bot has multiple active access keys. Using more than one active key for service accounts increases the attack surface and complicates rotation audits.",
    severity: "Medium",
    finding_type: "IAM",
    resource_type: "IAM User",
    created_at: ago(180),
    timestamp: ago(180),
    region: "us-east-1",
  },
];

const FULL_SCAN_EC2_FINDINGS = [
  {
    id: "fs-ec2-001",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:snapshot/snap-0a1b2c3d4e5f6789",
    title: "EBS snapshot snap-0a1b2c3d4e5f6789 is publicly restorable",
    description: "Production DB volume snapshot is publicly restorable by any AWS account. Snapshot was taken 14 days ago and contains unencrypted PII from the postgres-main instance.",
    severity: "Critical",
    finding_type: "EC2",
    resource_type: "EBS Snapshot",
    created_at: ago(72),
    timestamp: ago(72),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-002",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0web1b2c3d4e5f678",
    title: "EC2 web-server-prod is publicly exposed with RDP open",
    description: "Instance i-0web1b2c3d4e5f678 (web-server-prod, 52.23.45.67) has port 3389 (RDP) open to 0.0.0.0/0 via security group sg-rdp-open. Windows instances should never expose RDP to the internet.",
    severity: "Critical",
    finding_type: "EC2",
    resource_type: "EC2 Instance",
    created_at: ago(96),
    timestamp: ago(96),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-003",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0api1b2c3d4e5f999",
    title: "EC2 instance running unpatched Log4Shell-vulnerable runtime",
    description: "Instance i-0api1b2c3d4e5f999 (api-gateway-prod) runs a JVM version with Log4j 2.14.1 (CVE-2021-44228). Inspector detected exploitation indicators in CloudWatch logs within the past 48 hours.",
    severity: "Critical",
    finding_type: "EC2",
    resource_type: "EC2 Instance",
    created_at: ago(48),
    timestamp: ago(48),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-004",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-web-public",
    title: "Security group allows unrestricted SSH from 0.0.0.0/0",
    description: "Security group sg-web-public (attached to 4 instances) allows inbound TCP/22 from 0.0.0.0/0. All internet-facing SSH access should be restricted to known CIDR ranges or replaced with SSM Session Manager.",
    severity: "Critical",
    finding_type: "EC2",
    resource_type: "EC2 Security Group",
    created_at: ago(56),
    timestamp: ago(56),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-005",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-0a1b2c3d4e5f6789",
    title: "VPC flow logs are not enabled",
    description: "VPC vpc-0a1b2c3d4e5f6789 (prod-vpc) has no flow log configuration. Without flow logs, lateral movement, data exfiltration, and reconnaissance traffic cannot be detected or investigated after the fact.",
    severity: "High",
    finding_type: "EC2",
    resource_type: "VPC",
    created_at: ago(160),
    timestamp: ago(160),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-006",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0d4e5f6789abcdef0",
    title: "9 EC2 instances have IMDSv1 enabled",
    description: "IMDSv1 (HttpTokens=optional) is vulnerable to SSRF-based credential theft. Any SSRF or open-redirect vulnerability in applications on these instances can expose the instance role's credentials.",
    severity: "High",
    finding_type: "EC2",
    resource_type: "EC2 Instance",
    created_at: ago(90),
    timestamp: ago(90),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-007",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012",
    title: "EBS default encryption is not enabled at account level",
    description: "Account-level EBS default encryption is disabled. New volumes created without explicit encryption settings will be unencrypted — this affects all EC2 instances, including those created by auto-scaling.",
    severity: "High",
    finding_type: "EC2",
    resource_type: "EBS Volume",
    created_at: ago(240),
    timestamp: ago(240),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-008",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0legacy1234567890",
    title: "EC2 instances running in default VPC",
    description: "3 EC2 instances (i-0legacy*) are running in the default VPC which allows all inbound traffic between instances. Default VPCs should not be used for production workloads.",
    severity: "Medium",
    finding_type: "EC2",
    resource_type: "EC2 Instance",
    created_at: ago(400),
    timestamp: ago(400),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-009",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0stopped123456789",
    title: "Stopped EC2 instances have unencrypted root volumes",
    description: "6 stopped instances have unencrypted root volumes attached. Stopped instances are not charged for compute but their volumes persist and may contain sensitive data without encryption at rest.",
    severity: "Medium",
    finding_type: "EC2",
    resource_type: "EBS Volume",
    created_at: ago(320),
    timestamp: ago(320),
    region: "us-east-1",
  },
  {
    id: "fs-ec2-010",
    resource_arn: "arn:aws:ec2:us-east-1:123456789012:image/ami-0oldimage12345678",
    title: "EC2 instances using AMI older than 180 days",
    description: "5 instances use base AMIs that have not been rebuilt in over 180 days. Stale AMIs accumulate unpatched kernel vulnerabilities and OS packages not present in security scans.",
    severity: "Low",
    finding_type: "EC2",
    resource_type: "EC2 Instance",
    created_at: ago(500),
    timestamp: ago(500),
    region: "us-east-1",
  },
];

const FULL_SCAN_S3_FINDINGS = [
  {
    id: "fs-s3-001",
    resource_arn: "arn:aws:s3:::company-prod-data",
    title: "S3 bucket company-prod-data is publicly accessible via ACL",
    description: "Bucket company-prod-data has an ACL that grants AllUsers READ access. Any unauthenticated internet user can list and download objects including customer PII exports.",
    severity: "Critical",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(28),
    timestamp: ago(28),
    region: "us-east-1",
  },
  {
    id: "fs-s3-002",
    resource_arn: "arn:aws:s3:::finance-reports-prod",
    title: "S3 bucket finance-reports-prod has public bucket policy",
    description: "Bucket policy on finance-reports-prod allows s3:GetObject for Principal:*. Q3 and Q4 financial reports are exposed to unauthenticated public access.",
    severity: "Critical",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(14),
    timestamp: ago(14),
    region: "us-east-1",
  },
  {
    id: "fs-s3-003",
    resource_arn: "arn:aws:s3:::analytics-pipeline-raw",
    title: "S3 bucket analytics-pipeline-raw has no server-side encryption",
    description: "Objects in analytics-pipeline-raw are stored without SSE-S3 or SSE-KMS encryption. Bucket contains raw event data including identifiers that qualify as PII under GDPR Article 4.",
    severity: "High",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(180),
    timestamp: ago(180),
    region: "us-east-1",
  },
  {
    id: "fs-s3-004",
    resource_arn: "arn:aws:s3:::app-media-uploads",
    title: "S3 bucket app-media-uploads has no versioning",
    description: "Versioning is disabled on app-media-uploads. Without versioning, accidental deletions or ransomware overwrites cannot be recovered. Bucket stores user-uploaded files referenced by the production application.",
    severity: "High",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(240),
    timestamp: ago(240),
    region: "us-east-1",
  },
  {
    id: "fs-s3-005",
    resource_arn: "arn:aws:s3:::prod-cloudtrail-logs",
    title: "S3 server access logging disabled on audit log bucket",
    description: "The S3 bucket storing CloudTrail audit logs (prod-cloudtrail-logs) has no server access logging. Access to the audit trail itself is not audited, defeating detective controls.",
    severity: "High",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(310),
    timestamp: ago(310),
    region: "us-east-1",
  },
  {
    id: "fs-s3-006",
    resource_arn: "arn:aws:s3:::ml-training-datasets",
    title: "S3 bucket CORS policy allows all origins",
    description: "Bucket ml-training-datasets has a CORS rule with AllowedOrigins:* and AllowedMethods:GET,PUT. This allows cross-origin reads and writes from any website, enabling potential data theft via malicious pages.",
    severity: "Medium",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(150),
    timestamp: ago(150),
    region: "us-east-1",
  },
  {
    id: "fs-s3-007",
    resource_arn: "arn:aws:s3:::backup-snapshots-weekly",
    title: "S3 lifecycle policy missing on backup bucket",
    description: "Bucket backup-snapshots-weekly has no lifecycle policy. Backups older than 365 days are retained indefinitely, increasing storage cost and the data footprint subject to breach notification obligations.",
    severity: "Medium",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(400),
    timestamp: ago(400),
    region: "us-east-1",
  },
  {
    id: "fs-s3-008",
    resource_arn: "arn:aws:s3:::static-assets-cdn",
    title: "S3 object-level logging not enabled",
    description: "Bucket static-assets-cdn does not have CloudTrail object-level logging (GetObject, PutObject) enabled. Unauthorized data access cannot be detected or traced to a specific IAM principal.",
    severity: "Low",
    finding_type: "S3",
    resource_type: "S3 Bucket",
    created_at: ago(500),
    timestamp: ago(500),
    region: "us-east-1",
  },
];

// ─── /scan/full ───────────────────────────────────────────────────────────────
// Aggregated cross-scanner response used by the Dashboard full-scan button.
// findings arrays are populated so extractFindings() in ScanResultsContext builds
// a rich allFindings set for Dashboard IR mode (triage, pipeline, responder board).

function fullScanResponse(region: string): ScanResponse {
  return {
    scan_id: `full-mock-${Date.now()}`,
    scanner_type: "full",
    region,
    status: "completed",
    results: {
      scan_type: "full",
      status: "completed",
      account_id: ACCOUNT_ID,
      iam: {
        findings: FULL_SCAN_IAM_FINDINGS,
        scan_summary: {
          critical_findings: 2,
          high_findings: 3,
          medium_findings: 2,
          low_findings: 0,
        },
        users: { total: 24, with_console_access: 8 },
        roles: { total: 31, high_risk: 3 },
        policies: { total: 47 },
        groups: { total: 8 },
      },
      ec2: {
        findings: FULL_SCAN_EC2_FINDINGS,
        scan_summary: {
          critical_findings: 4,
          high_findings: 3,
          medium_findings: 2,
          low_findings: 1,
          running_instances: 22,
          stopped_instances: 6,
          publicly_accessible: 4,
          unencrypted_volumes: 7,
        },
      },
      s3: {
        findings: FULL_SCAN_S3_FINDINGS,
        scan_summary: {
          critical_findings: 2,
          high_findings: 3,
          medium_findings: 2,
          low_findings: 1,
          total_buckets: 14,
          public_buckets: 3,
        },
      },
      security_hub: {
        findings: SECURITY_HUB_FINDINGS.slice(0, 5), // top 5 for dashboard preview
        summary: {
          total_findings: SECURITY_HUB_FINDINGS.length,
          critical: 2,
          high: 5,
          medium: 8,
          low: 3,
          compliance_score: 68,
        },
      },
      aggregate_summary: {
        total_findings: 89,
        critical_findings: 11,
        high_findings: 22,
        medium_findings: 38,
        low_findings: 18,
        compliant_resources: 201,
        non_compliant_resources: 63,
        compliance_score: 71,
        scan_duration_seconds: 47,
        services_scanned: ["IAM", "EC2", "S3", "Security Hub", "Config", "CloudTrail"],
      },
    },
    timestamp: nowIso(),
  };
}

// ─── /dashboard ───────────────────────────────────────────────────────────────

function dashboardResponse(): DashboardData {
  return {
    summary: {
      total_findings: 89,
      critical_findings: 11,
      high_findings: 22,
      medium_findings: 38,
      low_findings: 18,
      compliant_resources: 201,
      non_compliant_resources: 63,
    },
    alerts: [
      {
        id: "alert-001",
        title: "Root Account Active Access Keys Detected",
        description:
          "The AWS root account has 2 active access keys. Root keys cannot be restricted by IAM policies and represent the highest-severity credential exposure possible.",
        severity: "CRITICAL",
        service: "IAM",
        resource_id: "arn:aws:iam::123456789012:root",
        timestamp: ago(0.5),
        status: "open",
      },
      {
        id: "alert-002",
        title: "S3 Bucket Publicly Accessible via ACL",
        description:
          "Bucket company-prod-data grants AllUsers READ access via ACL. Any unauthenticated internet user can list and download objects.",
        severity: "CRITICAL",
        service: "S3",
        resource_id: "arn:aws:s3:::company-prod-data",
        timestamp: ago(2),
        status: "in_progress",
      },
      {
        id: "alert-003",
        title: "EC2 Instance Exposes SSH to 0.0.0.0/0",
        description:
          "Security group sg-web-public allows port 22 from any IP. Instance web-server-prod (52.23.45.67) is reachable worldwide.",
        severity: "HIGH",
        service: "EC2",
        resource_id: "i-0a1b2c3d4e5f67890",
        timestamp: ago(4),
        status: "triaged",
      },
      {
        id: "alert-004",
        title: "Public EBS Snapshot — Production Database",
        description:
          "EBS snapshot snap-0a1b2c3d4e5f6789 is publicly restorable. Snapshot contains production DB volume taken 14 days ago with unencrypted PII.",
        severity: "CRITICAL",
        service: "EC2",
        resource_id: "snap-0a1b2c3d4e5f6789",
        timestamp: ago(6),
        status: "open",
      },
      {
        id: "alert-005",
        title: "IAM User Without MFA Has Console Access",
        description:
          "john.smith has AWS Console access but no MFA registered. Credential-only access could lead to account takeover.",
        severity: "HIGH",
        service: "IAM",
        resource_id: "arn:aws:iam::123456789012:user/john.smith",
        timestamp: ago(8),
        status: "pending_verify",
      },
      {
        id: "alert-006",
        title: "CloudTrail Multi-Region Logging Disabled",
        description:
          "No multi-region CloudTrail trail exists. API activity in ap-southeast-1 and eu-west-2 is unlogged.",
        severity: "HIGH",
        service: "CloudTrail",
        resource_id: "arn:aws:cloudtrail:us-east-1:123456789012:trail/prod-audit-trail",
        timestamp: ago(24),
        status: "open",
      },
    ],
    compliance: {
      overall_score: 71,
      frameworks: {
        CIS: { score: 68, status: "needs_attention" },
        SOC2: { score: 74, status: "needs_attention" },
        PCI_DSS: { score: 62, status: "at_risk" },
        HIPAA: { score: 79, status: "ok" },
        NIST: { score: 73, status: "needs_attention" },
      },
    },
    performance_metrics: {
      response_time: 142,
      throughput: 89,
      error_rate: 0.4,
      availability: 99.94,
    },
  };
}

// ─── /aws/security-hub ────────────────────────────────────────────────────────
// Used by Dashboard for the Security Hub summary panel.

function securityHubSummaryResponse() {
  return {
    findings: SECURITY_HUB_FINDINGS.slice(0, 5), // preview for dashboard
    summary: {
      total_findings: SECURITY_HUB_FINDINGS.length,
      critical_findings: 2,
      high_findings: 5,
      medium_findings: 8,
      low_findings: 3,
      informational_findings: 2,
    },
  };
}

// ─── /aws/iam ─────────────────────────────────────────────────────────────────

function iamSummaryResponse() {
  return {
    users: {
      total: 24,
      with_console_access: 8,
      with_mfa: 6,
      without_mfa: 2,
      active_keys: 19,
      inactive_90d: 3,
    },
    roles: {
      total: 31,
      high_risk: 3,
      cross_account: 4,
      service_linked: 14,
    },
    policies: {
      total: 47,
      customer_managed: 23,
      aws_managed_in_use: 24,
      with_wildcard_actions: 6,
    },
    groups: { total: 8 },
    security_findings: [],
  };
}

// ─── Main dispatch ────────────────────────────────────────────────────────────

export function getMockResponse(endpoint: string): unknown | undefined {
  if (endpoint.startsWith("/dashboard")) {
    return dashboardResponse();
  }

  if (endpoint.startsWith("/aws/security-hub")) {
    return securityHubSummaryResponse();
  }

  if (endpoint.startsWith("/aws/iam")) {
    return iamSummaryResponse();
  }

  if (endpoint.startsWith("/scan/")) {
    const match = endpoint.match(/^\/scan\/([^?/]+)/);
    const scanner = match?.[1] ?? "unknown";
    const region = "us-east-1";

    switch (scanner) {
      case "iam":           return iamScanResponse(region);
      case "ec2":           return ec2ScanResponse(region);
      case "s3":            return s3ScanResponse(region);
      case "security-hub":  return securityHubScanResponse(region);
      case "guardduty":     return guardDutyScanResponse(region);
      case "config":        return configScanResponse(region);
      case "inspector":     return inspectorScanResponse(region);
      case "macie":         return macieScanResponse(region);
      case "full":          return fullScanResponse(region);
      default:
        return {
          scan_id: `${scanner}-mock-${Date.now()}`,
          scanner_type: scanner,
          region,
          status: "completed" as const,
          results: { account_id: ACCOUNT_ID, findings: [], summary: { total_findings: 0 } },
          timestamp: nowIso(),
        } satisfies ScanResponse;
    }
  }

  return undefined;
}
