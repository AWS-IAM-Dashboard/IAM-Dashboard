/**
 * S3Security.tsx
 * Enterprise Security Workflow — S3 & Storage
 *
 * Architecture:
 *  - mockS3Findings      → Replace with SecurityHub/Macie API response
 *  - S3_PLAYBOOKS        → Replace with runbook service API / S3-backed playbook store
 *  - S3_WORKFLOWS        → Replace with workflow DB (DynamoDB / Jira / ServiceNow)
 *  - updateWorkflow()    → Replace with PATCH /api/workflows/{finding_id}
 *  - Agent Actions panel → Wire to /api/agents/{action} endpoints
 */

import { useState, useEffect, useCallback } from "react";
import {
  Archive,
  Play,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  CheckCircle,
  Shield,
  Zap,
  Copy,
  Check,
  UserCircle,
  Ticket,
  GitBranch,
  Activity,
  Bot,
  ExternalLink,
  Circle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { scanS3, type ScanResponse } from "../services/api";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";
import { FindingDetailPanel } from "./ui/FindingDetailPanel";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WorkflowStatus =
  | "NEW"
  | "TRIAGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_VERIFY"
  | "REMEDIATED"
  | "RISK_ACCEPTED"
  | "FALSE_POSITIVE";

type PlaybookPhase = "IDENTIFY" | "CONTAIN" | "REMEDIATE" | "VERIFY";

interface PlaybookStep {
  step: number;
  phase: PlaybookPhase;
  title: string;
  description: string;
  commands: string[];
  estimated_time: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: "system" | "analyst" | "engineer" | "automation";
  action: string;
  note?: string;
}

interface FindingWorkflow {
  finding_id: string;
  status: WorkflowStatus;
  assignee: string | null;
  assignee_team: string | null;
  ticket_id: string | null;
  sla_deadline: string;
  sla_hours_remaining: number;
  sla_breached: boolean;
  first_seen: string;
  last_updated: string;
  timeline: TimelineEvent[];
  risk_acceptance_note?: string;
}

interface S3SecurityFinding {
  id: string;
  bucket_name: string;
  region: string;
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  public_read: boolean;
  public_write: boolean;
  encryption_type: string;
  versioning_enabled: boolean;
  logging_enabled: boolean;
  mfa_delete: boolean;
  object_count: number;
  size_gb: number;
  risk_score: number;
}

interface S3ScanSummary {
  total_buckets: number;
  public_buckets: number;
  unencrypted_buckets: number;
  no_logging: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
}

interface S3ScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  findings: S3SecurityFinding[];
  scan_summary: S3ScanSummary;
  started_at?: string;
  completed_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FINDINGS — Replace with Macie/SecurityHub API call
// GET /api/s3/findings?account={acct}&severity={sev}
// ─────────────────────────────────────────────────────────────────────────────

const mockS3Findings: S3SecurityFinding[] = [
  {
    id: "s3-001",
    bucket_name: "company-prod-data",
    region: "us-east-1",
    finding_type: "Public Bucket — ACL Override (AllUsers: s3:GetObject)",
    description:
      "S3 Block Public Access is disabled and the bucket ACL grants s3:GetObject to AllUsers (unauthenticated). The bucket contains 8,243 objects including files matching PII patterns (SSN, credit card). Any internet client can enumerate and download all objects without credentials.",
    recommendation:
      "Immediately enable S3 Block Public Access at account and bucket level. Remove AllUsers and AuthenticatedUsers ACL grants. Migrate to bucket policy with explicit principal conditions. Enable Amazon Macie to classify sensitive objects. Rotate any credentials that may have been stored in exposed objects.",
    compliance_frameworks: ["CIS 2.1.5", "PCI-DSS 1.3", "HIPAA 164.312(e)", "SOC2 CC6.1"],
    severity: "CRITICAL",
    public_read: true,
    public_write: false,
    encryption_type: "None",
    versioning_enabled: false,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 8243,
    size_gb: 312.4,
    risk_score: 10,
  },
  {
    id: "s3-002",
    bucket_name: "corp-backups-offsite",
    region: "us-west-2",
    finding_type: 'Bucket Policy: Principal "*" Without aws:PrincipalOrgID Condition',
    description:
      'Bucket policy grants s3:GetObject and s3:PutObject to Principal: "*". Without an aws:PrincipalOrgID condition, this allows any authenticated AWS account to read and write to this backup bucket. Backup data includes database dumps and config files.',
    recommendation:
      "Add aws:PrincipalOrgID condition to restrict access to your AWS Organization ID. Replace wildcard principal with explicit account IDs where possible. Enforce aws:SecureTransport to prevent HTTP access. Enable S3 Object Lock in governance mode for immutable backups.",
    compliance_frameworks: ["CIS 2.1.2", "SOC2 CC6.3", "NIST AC-3"],
    severity: "CRITICAL",
    public_read: false,
    public_write: false,
    encryption_type: "AES-256",
    versioning_enabled: true,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 2841,
    size_gb: 1840.0,
    risk_score: 10,
  },
  {
    id: "s3-003",
    bucket_name: "analytics-pipeline-raw",
    region: "us-east-1",
    finding_type: "CloudTrail Data Events Not Enabled — Object-Level Audit Gap",
    description:
      "Neither CloudTrail S3 data events nor S3 server access logs are configured for this bucket. There is no record of which IAM principal accessed, downloaded, or deleted which objects. Bucket processes raw event data from 14 production services with 580K daily writes.",
    recommendation:
      "Enable CloudTrail data events (s3:GetObject, s3:PutObject, s3:DeleteObject) for this bucket. Enable S3 server access logs as a secondary record. Configure a CloudWatch alarm on DeleteObject events. Route logs to a separate security account for tamper-resistance.",
    compliance_frameworks: ["CIS 3.7", "PCI-DSS 10.2", "SOC2 CC7.2", "HIPAA 164.312(b)"],
    severity: "HIGH",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-S3",
    versioning_enabled: true,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 4200000,
    size_gb: 7240.0,
    risk_score: 8,
  },
  {
    id: "s3-004",
    bucket_name: "user-pii-archive",
    region: "eu-west-1",
    finding_type: "SSE-S3 (AES-256) Instead of SSE-KMS — No Key Audit Trail",
    description:
      "Bucket uses AWS-managed SSE-S3 (AES-256) rather than a Customer-Managed KMS Key. With SSE-S3, there is no CloudTrail record of decrypt operations — you cannot detect unauthorized access at the key level. Bucket stores GDPR-regulated PII data for EU users.",
    recommendation:
      "Create a dedicated CMK in AWS KMS with a key policy that restricts usage to specific IAM roles. Re-encrypt objects using a copy operation with the new key. Enable CloudTrail KMS data events to log all Decrypt calls. Configure KMS key rotation every 365 days.",
    compliance_frameworks: ["CIS 2.1.1", "GDPR Art.32", "HIPAA 164.312(a)(2)(iv)", "PCI-DSS 3.4"],
    severity: "HIGH",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-S3",
    versioning_enabled: true,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 182000,
    size_gb: 94.2,
    risk_score: 8,
  },
  {
    id: "s3-005",
    bucket_name: "dev-terraform-state",
    region: "us-east-1",
    finding_type: "Versioning Disabled + No Object Lock on Terraform State Bucket",
    description:
      "Terraform remote state bucket has versioning disabled. A malicious insider or compromised credential can overwrite the state file with no recovery option, leading to infrastructure drift or destructive applies. No S3 Object Lock or MFA Delete configured. Bucket controls 47 Terraform workspaces.",
    recommendation:
      "Enable versioning immediately. Enable MFA Delete on versioning configuration. Configure S3 Object Lock in compliance mode with a 30-day retention period. Restrict s3:DeleteObject and s3:PutObject to the Terraform execution role via SCPs.",
    compliance_frameworks: ["CIS 2.1.3", "SOC2 CC9.2", "NIST CP-9"],
    severity: "HIGH",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-KMS",
    versioning_enabled: false,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 94,
    size_gb: 0.3,
    risk_score: 7,
  },
  {
    id: "s3-006",
    bucket_name: "app-media-uploads",
    region: "ap-southeast-1",
    finding_type: "No Lifecycle Policy — Indefinite PII Retention (GDPR Risk)",
    description:
      "Bucket has no lifecycle rules. User-uploaded media objects (some containing PII) accumulate indefinitely with no expiration, transition, or deletion policy. GDPR Article 5 requires data minimisation and storage limitation. Current object age distribution: 23% older than 2 years.",
    recommendation:
      "Define lifecycle policy: transition objects to S3 Intelligent-Tiering after 30 days, move to Glacier after 90 days, expire after 730 days. Implement object tagging to allow granular per-object lifecycle overrides. Enable Macie scan to identify PII before bulk deletion.",
    compliance_frameworks: ["GDPR Art.5", "CIS 2.1.4", "SOC2 C1.2"],
    severity: "HIGH",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-KMS",
    versioning_enabled: true,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 1240000,
    size_gb: 4820.0,
    risk_score: 7,
  },
  {
    id: "s3-007",
    bucket_name: "internal-api-cache",
    region: "us-east-1",
    finding_type: "Cross-Account Bucket Policy Without aws:PrincipalOrgID Guard",
    description:
      "Bucket policy grants s3:GetObject to AWS account 987654321098, which is an external partner account not in your AWS Organization. If the partner account is compromised, all cached API responses including internal endpoint structures are accessible.",
    recommendation:
      "Add aws:PrincipalOrgID condition if partner should join your org. If external, implement assume-role cross-account pattern with time-limited sessions rather than direct bucket access. Enable GuardDuty S3 protection to detect anomalous cross-account access.",
    compliance_frameworks: ["CIS 2.1.2", "NIST AC-17", "SOC2 CC6.6"],
    severity: "MEDIUM",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-S3",
    versioning_enabled: false,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 47200,
    size_gb: 18.7,
    risk_score: 6,
  },
  {
    id: "s3-008",
    bucket_name: "frontend-static-assets",
    region: "us-east-1",
    finding_type: "Pre-Signed URL TTL: 604800s (7 Days) — OWASP Max 3600s",
    description:
      "Application generates pre-signed URLs with a 604800-second (7-day) expiration. OWASP S3 guidelines recommend maximum 3600 seconds for sensitive operations. Long-lived pre-signed URLs in web requests, error logs, or browser history expose download access for an extended window if intercepted.",
    recommendation:
      "Reduce pre-signed URL TTL to ≤3600 seconds for user-facing downloads. For authenticated users, generate URLs server-side on demand via a Lambda function. Enable CloudFront signed URLs as an alternative for static asset delivery with shorter expiry and IP restriction capability.",
    compliance_frameworks: ["OWASP Cloud-Top10 C6", "CIS 2.1.6"],
    severity: "MEDIUM",
    public_read: true,
    public_write: false,
    encryption_type: "SSE-S3",
    versioning_enabled: false,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 3421,
    size_gb: 12.1,
    risk_score: 5,
  },
  {
    id: "s3-009",
    bucket_name: "ml-training-data",
    region: "us-east-1",
    finding_type: "No Cross-Region Replication — RPO Unprotected for Regional Failure",
    description:
      "ML training dataset bucket has no cross-region or cross-account replication configured. A regional S3 outage or accidental bulk deletion would result in loss of the training corpus. Dataset took 18 months to curate. No backup strategy meets the stated RPO of 4 hours.",
    recommendation:
      "Enable S3 Cross-Region Replication (CRR) to a secondary region bucket with Object Lock enabled on the destination. Enable S3 Replication Time Control (RTC) for 15-minute RPO. Configure replication to a separate AWS account to protect against account-level compromise.",
    compliance_frameworks: ["SOC2 A1.2", "NIST CP-10", "CIS 2.1.3"],
    severity: "MEDIUM",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-KMS",
    versioning_enabled: true,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 890000,
    size_gb: 28400.0,
    risk_score: 5,
  },
  {
    id: "s3-010",
    bucket_name: "temp-lambda-artifacts",
    region: "us-west-2",
    finding_type: "Missing Data Classification Tags — ABAC Policy Cannot Be Enforced",
    description:
      "Bucket and all objects are missing required tags: DataClassification, Owner, CostCenter. Without DataClassification tags, tag-based access control (ABAC) policies that restrict access to 'Confidential' data cannot be applied. The bucket is not included in cost allocation reports.",
    recommendation:
      "Apply required tags: DataClassification=Internal, Owner=platform-team, CostCenter=eng-001. Enforce mandatory tags via AWS Config rule 'required-tags' and an SCP that denies CreateBucket without required tags.",
    compliance_frameworks: ["CIS 1.1", "SOC2 CC1.4", "NIST SA-8"],
    severity: "LOW",
    public_read: false,
    public_write: false,
    encryption_type: "SSE-S3",
    versioning_enabled: false,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 421,
    size_gb: 3.2,
    risk_score: 3,
  },
];

const mockS3Summary: S3ScanSummary = {
  total_buckets: 34,
  public_buckets: 2,
  unencrypted_buckets: 1,
  no_logging: 6,
  critical_findings: 2,
  high_findings: 4,
  medium_findings: 3,
  low_findings: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBOOKS — Replace with GET /api/playbooks/s3/{finding_id}
// ─────────────────────────────────────────────────────────────────────────────

const S3_PLAYBOOKS: Record<string, PlaybookStep[]> = {
  "s3-001": [
    { step: 1, phase: "IDENTIFY", title: "Confirm public exposure and enumerate objects", description: "Verify block public access settings and list exposed objects. Check for credentials or secrets in exposed objects.", commands: ["aws s3api get-bucket-acl --bucket company-prod-data", "aws s3api get-public-access-block --bucket company-prod-data", "aws s3api list-objects-v2 --bucket company-prod-data --query 'Contents[?Size>`0`].[Key,Size]' --output table | head -50"], estimated_time: "10 min" },
    { step: 2, phase: "CONTAIN", title: "Block all public access immediately", description: "Enable S3 Block Public Access at bucket and account level. This is zero-downtime for private workloads.", commands: ["aws s3api put-public-access-block --bucket company-prod-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true", "aws s3control put-public-access-block --account-id 123456789012 --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"], estimated_time: "5 min" },
    { step: 3, phase: "REMEDIATE", title: "Remove AllUsers ACL grants and enable logging", description: "Remove unauthenticated access grants from ACL and enable server access logging for forensics.", commands: ["aws s3api put-bucket-acl --bucket company-prod-data --acl private", "aws s3api put-bucket-logging --bucket company-prod-data --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"security-access-logs\",\"TargetPrefix\":\"company-prod-data/\"}}'", "aws macie2 create-classification-job --job-type ONE_TIME --s3-job-definition '{\"bucketDefinitions\":[{\"accountId\":\"123456789012\",\"buckets\":[\"company-prod-data\"]}]}'"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Confirm no public access and scan for exposed credentials", description: "Validate block public access settings, verify Macie classification job, and check for any credentials in exposed objects.", commands: ["aws s3api get-public-access-block --bucket company-prod-data", "aws s3api get-bucket-acl --bucket company-prod-data --query 'Grants[?Grantee.URI]'", "aws macie2 list-classification-jobs --filter-criteria '{\"includes\":{\"simpleCriterion\":[{\"comparator\":\"EQ\",\"key\":\"name\",\"values\":[\"company-prod-data-scan\"]}]}}'"], estimated_time: "15 min" },
  ],
  "s3-002": [
    { step: 1, phase: "IDENTIFY", title: "Audit current bucket policy and access patterns", description: "Review the existing bucket policy and identify all principals with access. Check CloudTrail for recent cross-account access.", commands: ["aws s3api get-bucket-policy --bucket corp-backups-offsite | python3 -m json.tool", "aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=corp-backups-offsite --max-results 50 --query 'Events[*].{User:Username,Event:EventName,Time:EventTime}'"], estimated_time: "15 min" },
    { step: 2, phase: "CONTAIN", title: "Add PrincipalOrgID condition to restrict to org", description: "Update the bucket policy to add aws:PrincipalOrgID condition. This immediately blocks any non-org account.", commands: ["aws organizations describe-organization --query 'Organization.Id'", "aws s3api put-bucket-policy --bucket corp-backups-offsite --policy '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"OrgOnlyAccess\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"*\"},\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::corp-backups-offsite/*\",\"Condition\":{\"StringEquals\":{\"aws:PrincipalOrgID\":\"o-XXXXXXXXXX\"},\"Bool\":{\"aws:SecureTransport\":\"true\"}}}'"], estimated_time: "10 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable Object Lock and remove logging gaps", description: "Enable versioning and Object Lock for immutable backups. Enable server access logging.", commands: ["aws s3api put-bucket-versioning --bucket corp-backups-offsite --versioning-configuration Status=Enabled", "aws s3api put-object-lock-configuration --bucket corp-backups-offsite --object-lock-configuration '{\"ObjectLockEnabled\":\"Enabled\",\"Rule\":{\"DefaultRetention\":{\"Mode\":\"GOVERNANCE\",\"Days\":30}}}'", "aws s3api put-bucket-logging --bucket corp-backups-offsite --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"security-access-logs\",\"TargetPrefix\":\"corp-backups-offsite/\"}}'"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Validate policy and test access from external account", description: "Confirm PrincipalOrgID restriction is in place and test that an external account gets AccessDenied.", commands: ["aws s3api get-bucket-policy --bucket corp-backups-offsite | python3 -m json.tool", "aws s3api get-object-lock-configuration --bucket corp-backups-offsite", "aws s3api get-bucket-versioning --bucket corp-backups-offsite"], estimated_time: "10 min" },
  ],
  "s3-003": [
    { step: 1, phase: "IDENTIFY", title: "Confirm logging gaps and check existing trails", description: "Determine if any CloudTrail trail is already capturing S3 data events for this bucket.", commands: ["aws cloudtrail describe-trails --include-shadow-trails false --query 'trailList[*].{Name:Name,S3:S3BucketName,DataEvents:HasInsightSelectors}'", "aws cloudtrail get-event-selectors --trail-name $(aws cloudtrail describe-trails --query 'trailList[0].TrailARN' --output text) --query 'EventSelectors[*].DataResources'"], estimated_time: "10 min" },
    { step: 2, phase: "CONTAIN", title: "Enable S3 server access logs as immediate stop-gap", description: "Server access logs are lighter weight than CloudTrail data events — enable now as immediate visibility.", commands: ["aws s3api put-bucket-logging --bucket analytics-pipeline-raw --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"security-access-logs\",\"TargetPrefix\":\"s3-access/analytics-pipeline-raw/\"}}'"], estimated_time: "5 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable CloudTrail data events for this bucket", description: "Add S3 data event selectors for GetObject, PutObject, DeleteObject on this specific bucket.", commands: ["aws cloudtrail put-event-selectors --trail-name prod-security-trail --event-selectors '[{\"ReadWriteType\":\"All\",\"IncludeManagementEvents\":true,\"DataResources\":[{\"Type\":\"AWS::S3::Object\",\"Values\":[\"arn:aws:s3:::analytics-pipeline-raw/\"]}]}]'", "aws cloudwatch put-metric-alarm --alarm-name s3-delete-alert-analytics --metric-name DeleteRequests --namespace AWS/S3 --dimensions Name=BucketName,Value=analytics-pipeline-raw --statistic Sum --period 300 --threshold 10 --comparison-operator GreaterThanThreshold --evaluation-periods 1 --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts"], estimated_time: "15 min" },
    { step: 4, phase: "VERIFY", title: "Confirm events are flowing to CloudTrail", description: "Run a test GetObject and confirm the event appears in CloudTrail within 15 minutes.", commands: ["aws s3 cp s3://analytics-pipeline-raw/ /tmp/test-verify.txt --recursive --dryrun", "aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=analytics-pipeline-raw --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) --query 'Events[*].{Event:EventName,User:Username,Time:EventTime}'"], estimated_time: "20 min" },
  ],
  "s3-004": [
    { step: 1, phase: "IDENTIFY", title: "Identify current encryption and key usage", description: "Confirm current encryption type and enumerate objects. Check for existing KMS keys in eu-west-1.", commands: ["aws s3api get-bucket-encryption --bucket user-pii-archive", "aws kms list-keys --region eu-west-1 --query 'Keys[*].KeyId'", "aws s3api list-objects-v2 --bucket user-pii-archive --query 'Contents[0:5].[Key,Size]'"], estimated_time: "10 min" },
    { step: 2, phase: "CONTAIN", title: "Create dedicated CMK for PII bucket in eu-west-1", description: "Create a new customer-managed KMS key with restrictive key policy. Enable CloudTrail KMS data events.", commands: ["aws kms create-key --region eu-west-1 --description 'CMK for user-pii-archive bucket' --key-policy '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"Allow GDPR-authorized roles\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::123456789012:role/data-platform-role\"},\"Action\":[\"kms:GenerateDataKey\",\"kms:Decrypt\"],\"Resource\":\"*\"}]}'", "aws kms create-alias --alias-name alias/s3-user-pii-archive --target-key-id <new-key-id> --region eu-west-1", "aws kms enable-key-rotation --key-id <new-key-id> --region eu-west-1"], estimated_time: "20 min" },
    { step: 3, phase: "REMEDIATE", title: "Re-encrypt bucket default and re-copy existing objects", description: "Set new SSE-KMS as the bucket default encryption. Re-copy existing objects to apply CMK encryption.", commands: ["aws s3api put-bucket-encryption --bucket user-pii-archive --server-side-encryption-configuration '{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"aws:kms\",\"KMSMasterKeyID\":\"alias/s3-user-pii-archive\"},\"BucketKeyEnabled\":true}]}'", "aws s3 cp s3://user-pii-archive/ s3://user-pii-archive/ --recursive --sse aws:kms --sse-kms-key-id alias/s3-user-pii-archive --region eu-west-1"], estimated_time: "60 min" },
    { step: 4, phase: "VERIFY", title: "Confirm CMK encryption and CloudTrail Decrypt events", description: "Upload a test object and verify it is encrypted with the CMK. Check CloudTrail for Decrypt events.", commands: ["aws s3api get-bucket-encryption --bucket user-pii-archive", "aws s3api head-object --bucket user-pii-archive --key $(aws s3api list-objects-v2 --bucket user-pii-archive --max-items 1 --query 'Contents[0].Key' --output text) --query 'ServerSideEncryption,SSEKMSKeyId'"], estimated_time: "10 min" },
  ],
  "s3-005": [
    { step: 1, phase: "IDENTIFY", title: "Check current versioning state and backup recoverability", description: "Assess current state of Terraform state bucket. Check when the last usable backup exists.", commands: ["aws s3api get-bucket-versioning --bucket dev-terraform-state", "aws s3api list-object-versions --bucket dev-terraform-state --query 'Versions[*].{Key:Key,VersionId:VersionId,LastModified:LastModified}' | head -20", "aws s3api list-objects-v2 --bucket dev-terraform-state --query 'Contents[*].[Key,LastModified,Size]'"], estimated_time: "10 min" },
    { step: 2, phase: "CONTAIN", title: "Create immediate manual backup before enabling versioning", description: "Take a point-in-time backup of all state files before making changes to versioning.", commands: ["aws s3 sync s3://dev-terraform-state/ s3://dev-terraform-state-emergency-backup-$(date +%Y%m%d)/ --sse aws:kms", "aws s3api list-objects-v2 --bucket dev-terraform-state-emergency-backup-$(date +%Y%m%d) --query 'KeyCount'"], estimated_time: "15 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable versioning, MFA delete, and Object Lock", description: "Enable versioning and configure Object Lock in compliance mode. Restrict delete permissions via SCP.", commands: ["aws s3api put-bucket-versioning --bucket dev-terraform-state --versioning-configuration Status=Enabled,MFADelete=Enabled --mfa 'arn:aws:iam::123456789012:mfa/admin-mfa-device 123456'", "aws s3api put-bucket-lifecycle-configuration --bucket dev-terraform-state --lifecycle-configuration '{\"Rules\":[{\"ID\":\"expire-old-versions\",\"Status\":\"Enabled\",\"NoncurrentVersionExpiration\":{\"NoncurrentDays\":90}}]}'"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Test versioning with a state file write and restore", description: "Write a test key, overwrite it, and verify the previous version is recoverable.", commands: ["aws s3api get-bucket-versioning --bucket dev-terraform-state", "echo 'test' | aws s3 cp - s3://dev-terraform-state/test-version.txt", "aws s3api list-object-versions --bucket dev-terraform-state --prefix test-version.txt --query 'Versions[*].VersionId'"], estimated_time: "10 min" },
  ],
  "s3-006": [
    { step: 1, phase: "IDENTIFY", title: "Inventory object age distribution and PII presence", description: "Audit how many objects are older than 1 year and scan for PII with Macie before applying lifecycle rules.", commands: ["aws s3api list-objects-v2 --bucket app-media-uploads --query 'Contents[?to_number(to_string(LastModified)) < to_number(to_string(`2024-01-01T00:00:00`))].[Key,LastModified,Size]' --output text | wc -l", "aws macie2 create-classification-job --job-type ONE_TIME --s3-job-definition '{\"bucketDefinitions\":[{\"accountId\":\"123456789012\",\"buckets\":[\"app-media-uploads\"]}]}' --name app-media-pii-scan"], estimated_time: "15 min" },
    { step: 2, phase: "CONTAIN", title: "Tag objects with DataRetention attribute for lifecycle targeting", description: "Add DataRetention tags to all objects to enable per-object lifecycle control.", commands: ["aws s3api list-objects-v2 --bucket app-media-uploads --output text --query 'Contents[*].Key' | xargs -P 8 -I{} aws s3api put-object-tagging --bucket app-media-uploads --key {} --tagging '{\"TagSet\":[{\"Key\":\"DataRetention\",\"Value\":\"730\"}]}'"], estimated_time: "30 min" },
    { step: 3, phase: "REMEDIATE", title: "Apply GDPR-compliant lifecycle policy", description: "Create lifecycle rules: Intelligent-Tiering at 30d, Glacier at 90d, expire at 730d.", commands: ["aws s3api put-bucket-lifecycle-configuration --bucket app-media-uploads --lifecycle-configuration '{\"Rules\":[{\"ID\":\"gdpr-retention\",\"Status\":\"Enabled\",\"Filter\":{\"Prefix\":\"\"},\"Transitions\":[{\"Days\":30,\"StorageClass\":\"INTELLIGENT_TIERING\"},{\"Days\":90,\"StorageClass\":\"GLACIER\"}],\"Expiration\":{\"Days\":730}},{\"ID\":\"gdpr-incomplete-uploads\",\"Status\":\"Enabled\",\"AbortIncompleteMultipartUpload\":{\"DaysAfterInitiation\":7}}]}'"], estimated_time: "10 min" },
    { step: 4, phase: "VERIFY", title: "Confirm lifecycle policy and Macie PII results", description: "Verify the lifecycle configuration and review Macie findings before bulk deletions.", commands: ["aws s3api get-bucket-lifecycle-configuration --bucket app-media-uploads", "aws macie2 list-findings --finding-criteria '{\"criterion\":{\"resourcesAffected.s3Bucket.name\":{\"eq\":[\"app-media-uploads\"]}}}'"], estimated_time: "15 min" },
  ],
  "s3-007": [
    { step: 1, phase: "IDENTIFY", title: "Identify cross-account access patterns from external account", description: "Review CloudTrail for recent access from external account 987654321098 and assess what data they accessed.", commands: ["aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=internal-api-cache --query 'Events[?contains(Username,`987654321098`)].{User:Username,Event:EventName,Time:EventTime}'", "aws s3api get-bucket-policy --bucket internal-api-cache | python3 -m json.tool"], estimated_time: "15 min" },
    { step: 2, phase: "CONTAIN", title: "Add PrincipalOrgID guard to existing policy", description: "Insert the aws:PrincipalOrgID condition into the existing policy to immediately block non-org access.", commands: ["aws organizations describe-organization --query 'Organization.Id' --output text", "aws s3api put-bucket-policy --bucket internal-api-cache --policy '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"*\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::internal-api-cache/*\",\"Condition\":{\"StringEquals\":{\"aws:PrincipalOrgID\":\"o-XXXXXXXXXX\"}}}]}'"], estimated_time: "10 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable GuardDuty S3 protection and enable logging", description: "Enable GuardDuty S3 data event protection and server access logging.", commands: ["aws guardduty list-detectors --query 'DetectorIds[0]' --output text", "aws guardduty update-detector --detector-id <detector-id> --data-sources '{\"S3Logs\":{\"Enable\":true}}'", "aws s3api put-bucket-logging --bucket internal-api-cache --bucket-logging-status '{\"LoggingEnabled\":{\"TargetBucket\":\"security-access-logs\",\"TargetPrefix\":\"internal-api-cache/\"}}'"], estimated_time: "15 min" },
    { step: 4, phase: "VERIFY", title: "Confirm GuardDuty S3 protection is active", description: "Verify GuardDuty S3 data events are enabled and test that the external account is now blocked.", commands: ["aws guardduty get-detector --detector-id <detector-id> --query 'DataSources.S3Logs'", "aws s3api get-bucket-policy --bucket internal-api-cache | python3 -m json.tool"], estimated_time: "10 min" },
  ],
  "s3-008": [
    { step: 1, phase: "IDENTIFY", title: "Find all pre-signed URL generation code", description: "Identify Lambda functions and application code generating long-lived pre-signed URLs.", commands: ["aws lambda list-functions --query 'Functions[*].{Name:FunctionName,Runtime:Runtime}' --output table", "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GeneratePresignedUrl --query 'Events[*].{User:Username,Time:EventTime}'"], estimated_time: "20 min" },
    { step: 2, phase: "CONTAIN", title: "Identify currently-active long-lived URLs", description: "Check S3 access logs for recently served presigned URLs and assess active exposure window.", commands: ["aws s3api get-bucket-logging --bucket frontend-static-assets", "aws logs filter-log-events --log-group-name /aws/s3/frontend-static-assets --filter-pattern '?presigned ?x-amz-signature' --start-time $(date -d '7 days ago' +%s)000"], estimated_time: "10 min" },
    { step: 3, phase: "REMEDIATE", title: "Update code to use 3600s TTL and add CloudFront", description: "Patch the application code to reduce pre-signed URL TTL to ≤3600s. Create CloudFront signed URL policy.", commands: ["# In your application code, change expires_in parameter:", "# boto3.client('s3').generate_presigned_url('get_object', Params={'Bucket': 'frontend-static-assets', 'Key': key}, ExpiresIn=3600)", "aws cloudfront create-invalidation --distribution-id <dist-id> --paths '/*'"], estimated_time: "30 min" },
    { step: 4, phase: "VERIFY", title: "Verify new URLs expire within 3600 seconds", description: "Test the updated application generates URLs with correct TTL.", commands: ["aws s3 presign s3://frontend-static-assets/test.html --expires-in 3600", "# Check X-Amz-Expires parameter in the URL output should be <=3600"], estimated_time: "10 min" },
  ],
  "s3-009": [
    { step: 1, phase: "IDENTIFY", title: "Check current replication configuration", description: "Verify there is no existing replication and assess the source bucket's versioning state (required for CRR).", commands: ["aws s3api get-bucket-replication --bucket ml-training-data 2>&1 || echo 'No replication configured'", "aws s3api get-bucket-versioning --bucket ml-training-data", "aws s3api get-bucket-location --bucket ml-training-data"], estimated_time: "5 min" },
    { step: 2, phase: "CONTAIN", title: "Create destination bucket in secondary region", description: "Create the destination bucket with versioning, Object Lock, and appropriate encryption in the secondary region.", commands: ["aws s3api create-bucket --bucket ml-training-data-replica-us-west-2 --region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2", "aws s3api put-bucket-versioning --bucket ml-training-data-replica-us-west-2 --versioning-configuration Status=Enabled", "aws s3api put-object-lock-configuration --bucket ml-training-data-replica-us-west-2 --object-lock-configuration '{\"ObjectLockEnabled\":\"Enabled\"}'"], estimated_time: "15 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable CRR with Replication Time Control", description: "Create IAM role for replication and enable CRR with RTC for 15-minute RPO SLA.", commands: ["aws s3api put-bucket-replication --bucket ml-training-data --replication-configuration '{\"Role\":\"arn:aws:iam::123456789012:role/s3-replication-role\",\"Rules\":[{\"ID\":\"ml-training-crr\",\"Status\":\"Enabled\",\"Destination\":{\"Bucket\":\"arn:aws:s3:::ml-training-data-replica-us-west-2\",\"ReplicationTime\":{\"Status\":\"Enabled\",\"Time\":{\"Minutes\":15}},\"Metrics\":{\"Status\":\"Enabled\",\"EventThreshold\":{\"Minutes\":15}}}}]}'"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Verify replication metrics in CloudWatch", description: "Check S3 Replication metrics and upload a test object to confirm it replicates within 15 minutes.", commands: ["aws s3api get-bucket-replication --bucket ml-training-data", "echo 'crr-test' | aws s3 cp - s3://ml-training-data/replication-test.txt", "aws cloudwatch get-metric-statistics --namespace AWS/S3 --metric-name ReplicationLatency --dimensions Name=SourceBucket,Value=ml-training-data --start-time $(date -u -d '30 min ago' +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --period 300 --statistics Average"], estimated_time: "20 min" },
  ],
  "s3-010": [
    { step: 1, phase: "IDENTIFY", title: "Inventory untagged resources across all buckets", description: "Use Resource Explorer to find all untagged S3 buckets and objects.", commands: ["aws resourcegroupstaggingapi get-resources --resource-type-filters s3 --tag-filters Key=DataClassification --query 'ResourceTagMappingList[*].ResourceARN'", "aws s3api get-bucket-tagging --bucket temp-lambda-artifacts 2>&1 || echo 'No tags found'"], estimated_time: "10 min" },
    { step: 2, phase: "CONTAIN", title: "Apply emergency classification tags", description: "Tag the bucket with required classification so ABAC policies can take effect.", commands: ["aws s3api put-bucket-tagging --bucket temp-lambda-artifacts --tagging '{\"TagSet\":[{\"Key\":\"DataClassification\",\"Value\":\"Internal\"},{\"Key\":\"Owner\",\"Value\":\"platform-team\"},{\"Key\":\"CostCenter\",\"Value\":\"eng-001\"},{\"Key\":\"Environment\",\"Value\":\"prod\"}]}'"], estimated_time: "5 min" },
    { step: 3, phase: "REMEDIATE", title: "Enable AWS Config required-tags rule and SCP enforcement", description: "Create AWS Config rule to detect untagged S3 buckets and add SCP to prevent untagged CreateBucket.", commands: ["aws configservice put-config-rule --config-rule '{\"ConfigRuleName\":\"required-s3-tags\",\"Source\":{\"Owner\":\"AWS\",\"SourceIdentifier\":\"REQUIRED_TAGS\"},\"InputParameters\":\"{\\\"tag1Key\\\":\\\"DataClassification\\\",\\\"tag2Key\\\":\\\"Owner\\\",\\\"tag3Key\\\":\\\"CostCenter\\\"}',\"Scope\":{\"ComplianceResourceTypes\":[\"AWS::S3::Bucket\"]}}'"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Confirm tags are applied and Config rule is compliant", description: "Verify bucket tagging and Config rule compliance status.", commands: ["aws s3api get-bucket-tagging --bucket temp-lambda-artifacts", "aws configservice get-compliance-details-by-resource --resource-type AWS::S3::Bucket --resource-id temp-lambda-artifacts"], estimated_time: "10 min" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL WORKFLOWS — Replace with GET /api/workflows?service=s3
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const S3_WORKFLOWS: Record<string, FindingWorkflow> = {
  "s3-001": {
    finding_id: "s3-001",
    status: "IN_PROGRESS",
    assignee: "sarah.chen",
    assignee_team: "Cloud Security",
    ticket_id: "SEC-4821",
    sla_deadline: new Date(now + 2 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 2,
    sla_breached: false,
    first_seen: new Date(now - 5 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 1 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 5 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Finding detected by Macie data scan", note: "8243 objects with PII patterns exposed publicly" },
      { id: "e2", timestamp: new Date(now - 4.5 * 3600 * 1000).toISOString(), actor: "pagerduty-bot", actor_type: "automation", action: "P1 incident created — SEC-4821", note: "Escalated to Cloud Security on-call" },
      { id: "e3", timestamp: new Date(now - 4 * 3600 * 1000).toISOString(), actor: "sarah.chen", actor_type: "analyst", action: "Triaged — CRITICAL data exposure confirmed", note: "PII data confirmed via S3 object sampling. ACL shows AllUsers: GetObject" },
      { id: "e4", timestamp: new Date(now - 1 * 3600 * 1000).toISOString(), actor: "sarah.chen", actor_type: "engineer", action: "Block Public Access applied at bucket level", note: "Step 2 (CONTAIN) complete. Monitoring for access errors in app logs" },
    ],
  },
  "s3-002": {
    finding_id: "s3-002",
    status: "TRIAGED",
    assignee: "marcus.webb",
    assignee_team: "Cloud Security",
    ticket_id: "SEC-4798",
    sla_deadline: new Date(now - 2 * 3600 * 1000).toISOString(),
    sla_hours_remaining: -2,
    sla_breached: true,
    first_seen: new Date(now - 30 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 6 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 30 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Finding detected by SecurityHub FSBP S3.2", note: "Principal * policy without PrincipalOrgID detected" },
      { id: "e2", timestamp: new Date(now - 28 * 3600 * 1000).toISOString(), actor: "triage-bot", actor_type: "automation", action: "Auto-triaged as CRITICAL — backup bucket with wildcard policy", note: "Pattern matches known exfiltration TTP" },
      { id: "e3", timestamp: new Date(now - 6 * 3600 * 1000).toISOString(), actor: "marcus.webb", actor_type: "analyst", action: "Assigned for remediation — SLA BREACHED", note: "Delay due to change freeze window. Expedited approval requested" },
    ],
  },
  "s3-003": {
    finding_id: "s3-003",
    status: "ASSIGNED",
    assignee: "taylor.brooks",
    assignee_team: "DevSecOps",
    ticket_id: "SEC-4756",
    sla_deadline: new Date(now + 18 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 18,
    sla_breached: false,
    first_seen: new Date(now - 6 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 3 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 6 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Audit gap detected — no CloudTrail data events for S3 bucket" },
      { id: "e2", timestamp: new Date(now - 3 * 3600 * 1000).toISOString(), actor: "taylor.brooks", actor_type: "analyst", action: "Assigned — scheduled for next change window" },
    ],
  },
  "s3-004": {
    finding_id: "s3-004",
    status: "NEW",
    assignee: null,
    assignee_team: null,
    ticket_id: null,
    sla_deadline: new Date(now + 22 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 22,
    sla_breached: false,
    first_seen: new Date(now - 2 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 2 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 2 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "GDPR-sensitive bucket using SSE-S3 instead of SSE-KMS detected" },
    ],
  },
  "s3-005": {
    finding_id: "s3-005",
    status: "PENDING_VERIFY",
    assignee: "alex.rodriguez",
    assignee_team: "Platform Engineering",
    ticket_id: "SEC-4701",
    sla_deadline: new Date(now + 12 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 12,
    sla_breached: false,
    first_seen: new Date(now - 48 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 2 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 48 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Terraform state bucket without versioning detected" },
      { id: "e2", timestamp: new Date(now - 24 * 3600 * 1000).toISOString(), actor: "alex.rodriguez", actor_type: "engineer", action: "Versioning enabled — applying MFA Delete" },
      { id: "e3", timestamp: new Date(now - 2 * 3600 * 1000).toISOString(), actor: "alex.rodriguez", actor_type: "engineer", action: "Remediation steps complete — pending verification" },
    ],
  },
  "s3-006": {
    finding_id: "s3-006",
    status: "IN_PROGRESS",
    assignee: "priya.nair",
    assignee_team: "Data Platform",
    ticket_id: "SEC-4688",
    sla_deadline: new Date(now + 10 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 10,
    sla_breached: false,
    first_seen: new Date(now - 14 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 4 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 14 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "GDPR lifecycle gap detected — no expiration policy on PII bucket" },
      { id: "e2", timestamp: new Date(now - 12 * 3600 * 1000).toISOString(), actor: "priya.nair", actor_type: "analyst", action: "Macie PII scan initiated before lifecycle application" },
      { id: "e3", timestamp: new Date(now - 4 * 3600 * 1000).toISOString(), actor: "priya.nair", actor_type: "engineer", action: "Lifecycle policy drafted — GDPR DPO review in progress" },
    ],
  },
  "s3-007": {
    finding_id: "s3-007",
    status: "NEW",
    assignee: null,
    assignee_team: null,
    ticket_id: null,
    sla_deadline: new Date(now + 160 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 160,
    sla_breached: false,
    first_seen: new Date(now - 4 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 4 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 4 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Cross-account access without OrgID guard detected" },
    ],
  },
  "s3-008": {
    finding_id: "s3-008",
    status: "RISK_ACCEPTED",
    assignee: "chris.park",
    assignee_team: "Frontend Engineering",
    ticket_id: "SEC-4612",
    sla_deadline: new Date(now + 720 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 720,
    sla_breached: false,
    first_seen: new Date(now - 72 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 48 * 3600 * 1000).toISOString(),
    risk_acceptance_note: "Assets are public static content (CSS, JS, images) with no sensitive data. 7-day pre-signed URLs are required for CDN caching architecture. Reviewed and accepted by CISO 2026-03-10. Revisit in Q3 2026 when CDN migration is complete.",
    timeline: [
      { id: "e1", timestamp: new Date(now - 72 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Long TTL pre-signed URL detected" },
      { id: "e2", timestamp: new Date(now - 48 * 3600 * 1000).toISOString(), actor: "chris.park", actor_type: "analyst", action: "Risk accepted — non-sensitive public static assets" },
    ],
  },
  "s3-009": {
    finding_id: "s3-009",
    status: "NEW",
    assignee: null,
    assignee_team: null,
    ticket_id: null,
    sla_deadline: new Date(now + 160 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 160,
    sla_breached: false,
    first_seen: new Date(now - 1 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 1 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 1 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "No CRR detected on ML training dataset — RPO gap" },
    ],
  },
  "s3-010": {
    finding_id: "s3-010",
    status: "REMEDIATED",
    assignee: "devops-automation",
    assignee_team: "Platform Engineering",
    ticket_id: "SEC-4588",
    sla_deadline: new Date(now + 700 * 3600 * 1000).toISOString(),
    sla_hours_remaining: 700,
    sla_breached: false,
    first_seen: new Date(now - 96 * 3600 * 1000).toISOString(),
    last_updated: new Date(now - 24 * 3600 * 1000).toISOString(),
    timeline: [
      { id: "e1", timestamp: new Date(now - 96 * 3600 * 1000).toISOString(), actor: "system", actor_type: "system", action: "Missing required tags detected by AWS Config rule" },
      { id: "e2", timestamp: new Date(now - 24 * 3600 * 1000).toISOString(), actor: "devops-automation", actor_type: "automation", action: "Tags applied automatically via tagging Lambda", note: "DataClassification=Internal, Owner=platform-team, CostCenter=eng-001" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_META: Record<WorkflowStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  TRIAGED: { label: "Triaged", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  ASSIGNED: { label: "Assigned", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  IN_PROGRESS: { label: "In Progress", color: "#ffb000", bg: "rgba(255,176,0,0.12)" },
  PENDING_VERIFY: { label: "Pending Verify", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  REMEDIATED: { label: "Remediated", color: "#00ff88", bg: "rgba(0,255,136,0.12)" },
  RISK_ACCEPTED: { label: "Risk Accepted", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  FALSE_POSITIVE: { label: "False Positive", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const PHASE_META: Record<PlaybookPhase, { color: string; bg: string }> = {
  IDENTIFY: { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  CONTAIN: { color: "#ff6b35", bg: "rgba(255,107,53,0.12)" },
  REMEDIATE: { color: "#ffb000", bg: "rgba(255,176,0,0.12)" },
  VERIFY: { color: "#00ff88", bg: "rgba(0,255,136,0.12)" },
};

const NEXT_STATUS: Partial<Record<WorkflowStatus, WorkflowStatus>> = {
  NEW: "TRIAGED",
  TRIAGED: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "PENDING_VERIFY",
  PENDING_VERIFY: "REMEDIATED",
};

const PIPELINE_STAGES: WorkflowStatus[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REMEDIATED"];

const ASSIGNEES = ["Sarah Chen", "Marcus Webb", "Taylor Brooks", "Priya Nair", "Alex Rodriguez", "Jordan Kim"];

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88",
};
const SEVERITY_BG: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: "rgba(255,0,64,0.15)", color: "#ff0040" },
  HIGH: { bg: "rgba(255,107,53,0.15)", color: "#ff6b35" },
  MEDIUM: { bg: "rgba(255,176,0,0.15)", color: "#ffb000" },
  LOW: { bg: "rgba(0,255,136,0.15)", color: "#00ff88" },
};
const cs: React.CSSProperties = { background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" };
const ls: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" };
const ms: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function S3Security() {
  const [scanResult, setScanResult] = useState<S3ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [workflows, setWorkflows] = useState<Record<string, FindingWorkflow>>(S3_WORKFLOWS);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { addScanResult } = useActiveScanResults();

  useEffect(() => {
    setScanResult({
      scan_id: "s3-scan-demo-001",
      status: "Completed",
      progress: 100,
      account_id: "123456789012",
      findings: mockS3Findings,
      scan_summary: mockS3Summary,
      started_at: new Date(Date.now() - 300000).toISOString(),
      completed_at: new Date(Date.now() - 240000).toISOString(),
    });
  }, []);

  const advanceStatus = useCallback((findingId: string, actor = "analyst") => {
    setWorkflows(prev => {
      const wf = prev[findingId];
      if (!wf) return prev;
      const next = NEXT_STATUS[wf.status];
      if (!next) return prev;
      const event: TimelineEvent = {
        id: `e${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor,
        actor_type: "analyst",
        action: `Status advanced: ${WORKFLOW_META[wf.status].label} → ${WORKFLOW_META[next].label}`,
      };
      return { ...prev, [findingId]: { ...wf, status: next, last_updated: new Date().toISOString(), timeline: [...wf.timeline, event] } };
    });
  }, []);

  const assignFinding = useCallback((findingId: string, assignee: string) => {
    setWorkflows(prev => {
      const wf = prev[findingId];
      if (!wf) return prev;
      const event: TimelineEvent = {
        id: `e${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "system",
        actor_type: "system",
        action: `Assigned to ${assignee}`,
      };
      const newStatus = (wf.status === "NEW" || wf.status === "TRIAGED") ? "ASSIGNED" : wf.status;
      return { ...prev, [findingId]: { ...wf, assignee, status: newStatus, last_updated: new Date().toISOString(), timeline: [...wf.timeline, event] } };
    });
  }, []);

  const markFalsePositive = useCallback((findingId: string) => {
    setWorkflows(prev => {
      const wf = prev[findingId];
      if (!wf) return prev;
      const event: TimelineEvent = {
        id: `e${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "analyst",
        actor_type: "analyst",
        action: "Marked as False Positive",
      };
      return { ...prev, [findingId]: { ...wf, status: "FALSE_POSITIVE", last_updated: new Date().toISOString(), timeline: [...wf.timeline, event] } };
    });
  }, []);

  const copyCommand = useCallback((cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  }, []);

  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      toast.info("S3 security scan started", { description: "Analyzing buckets, ACLs, policies, encryption…" });
      const response: ScanResponse = await scanS3(selectedRegion);
      setScanResult({
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : "Failed",
        progress: 100,
        account_id: response.results?.account_id || "123456789012",
        findings: response.results?.findings || mockS3Findings,
        scan_summary: mockS3Summary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      });
      setIsScanning(false);
      addScanResult(response);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const normalized = msg.toLowerCase();
      if (normalized.includes("forbidden") ||
+        normalized.includes("permission") ||
+        normalized.includes("authentication required") ||
+        normalized.includes("unauthorized") ||
         normalized.includes("accessdenied") ) {
        setIsScanning(false);
        toast.error('Permission denied', {
          description: msg,
          duration: 8000,
          style: { color: '#ff0040', borderColor: 'rgba(255,0,64,0.4)' },
        });
        return;
      }
      setScanResult({ scan_id: `s3-${Date.now()}`, status: "Completed", progress: 100, account_id: "123456789012", findings: mockS3Findings, scan_summary: mockS3Summary, started_at: new Date().toISOString(), completed_at: new Date().toISOString() });
      setIsScanning(false);
      toast.success("S3 scan completed (demo mode)");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const findings = scanResult?.findings ?? mockS3Findings;
  const filteredFindings = findings.filter(f => {
    const wf = workflows[f.id];
    const matchSev = severityFilter === "ALL" || f.severity === severityFilter;
    const matchStatus = statusFilter === "ALL" || (wf?.status === statusFilter);
    const matchSearch = !findingSearch || f.finding_type.toLowerCase().includes(findingSearch.toLowerCase()) || f.bucket_name.toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchStatus && matchSearch;
  });

  const summary = scanResult?.scan_summary ?? mockS3Summary;
  const slaBreaches = Object.values(workflows).filter(w => w.sla_breached).length;
  const openCritical = findings.filter(f => f.severity === "CRITICAL" && !["REMEDIATED","FALSE_POSITIVE"].includes(workflows[f.id]?.status ?? "NEW")).length;
  const openHigh = findings.filter(f => f.severity === "HIGH" && !["REMEDIATED","FALSE_POSITIVE"].includes(workflows[f.id]?.status ?? "NEW")).length;
  const remediated = Object.values(workflows).filter(w => w.status === "REMEDIATED").length;
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = Object.values(workflows).filter(w => w.status === stage).length;
    return acc;
  }, {} as Record<WorkflowStatus, number>);

  return (
    <div className="flex min-w-0 w-full flex-col gap-4 p-3 sm:gap-5 sm:p-5 md:px-7 md:py-6">

      {/* Header */}
      <ScanPageHeader
        icon={<Archive size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="S3 & Storage Security"
        subtitle={`Enterprise workflow · ${findings.length} findings · ${summary.total_buckets} buckets monitored`}
        isScanning={isScanning}
        onScan={handleStartScan}
        onStop={() => { setIsScanning(false); toast.warning("S3 scan stopped"); }}
        onRefresh={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
        onExport={() => {}}
        scanLabel="Run Scan"
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Buckets" value={summary.total_buckets} accent="#94a3b8" icon={Archive} />
        <StatCard label="SLA Breaches" value={slaBreaches} accent={slaBreaches > 0 ? "#ff0040" : "#00ff88"} icon={AlertTriangle} />
        <StatCard label="Open Critical" value={openCritical} accent={openCritical > 0 ? "#ff0040" : "#00ff88"} icon={Shield} />
        <StatCard label="Open High" value={openHigh} accent={openHigh > 0 ? "#ff6b35" : "#00ff88"} icon={AlertTriangle} />
        <StatCard label="Remediated" value={remediated} accent="#00ff88" icon={CheckCircle} />
        <StatCard label="Public Buckets" value={summary.public_buckets} accent={summary.public_buckets > 0 ? "#ff6b35" : "#00ff88"} icon={Globe} />
      </div>

      {/* Workflow Pipeline */}
      <div className="min-w-0" style={{ ...cs, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <GitBranch size={13} color="rgba(100,116,139,0.7)" />
          <span style={ls}>Workflow Pipeline</span>
        </div>
        <div className="overflow-x-auto">
        <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 680 }}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const meta = WORKFLOW_META[stage];
            const count = pipelineCounts[stage] ?? 0;
            const isLast = idx === PIPELINE_STAGES.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  onClick={() => setStatusFilter(statusFilter === stage ? "ALL" : stage)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: statusFilter === stage ? meta.bg : "rgba(255,255,255,0.02)",
                    border: `1px solid ${statusFilter === stage ? `${meta.color}50` : "rgba(255,255,255,0.06)"}`,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", ...ms }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", letterSpacing: "0.1em", marginTop: 2, ...ms }}>
                    {meta.label.toUpperCase()}
                  </div>
                </div>
                {!isLast && (
                  <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}>
                    <div style={{ position: "absolute", right: -3, top: -4, color: "rgba(100,116,139,0.3)", fontSize: 8 }}>▶</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Risk Indicators Strip */}
      <div style={{ ...cs, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...ls, marginRight: 4 }}>Risk Indicators</span>
        {[
          { label: `Public Buckets: ${summary.public_buckets}`, color: "#ff0040" },
          { label: `Unencrypted: ${summary.unencrypted_buckets} buckets`, color: "#ff6b35" },
          { label: `No Logging: ${summary.no_logging} buckets`, color: "#ffb000" },
          { label: `SLA Breaches: ${slaBreaches}`, color: slaBreaches > 0 ? "#ff0040" : "#00ff88" },
          { label: `Open Critical: ${openCritical}`, color: openCritical > 0 ? "#ff0040" : "#00ff88" },
          { label: `Open High: ${openHigh}`, color: openHigh > 0 ? "#ff6b35" : "#00ff88" },
        ].map(chip => (
          <span key={chip.label} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${chip.color}18`, border: `1px solid ${chip.color}40`, color: chip.color, ...ms }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const).map(sev => {
          const active = severityFilter === sev;
          const col = sev === "ALL" ? "#00ff88" : SEVERITY_COLORS[sev];
          return <button key={sev} onClick={() => setSeverityFilter(sev)} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", ...ms, background: active ? `${col}25` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? col : "rgba(255,255,255,0.08)"}`, color: active ? col : "rgba(100,116,139,0.7)" }}>{sev}</button>;
        })}
        <div className="hidden sm:block" style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
        {statusFilter !== "ALL" && (
          <button
            onClick={() => setStatusFilter("ALL")}
            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "#94a3b8", fontSize: 10, cursor: "pointer", ...ms }}
          >
            {WORKFLOW_META[statusFilter as WorkflowStatus]?.label} ✕
          </button>
        )}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
          <input value={findingSearch} onChange={e => setFindingSearch(e.target.value)} placeholder="Search findings, buckets…" style={{ width: "100%", padding: "7px 10px 7px 30px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", ...ms }} />
        </div>
        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", ...ms }}>{filteredFindings.length} findings</span>
      </div>

      {/* Findings Table */}
      <div className="min-w-0" style={cs}>
        <div className="hidden md:grid" style={{ gridTemplateColumns: "4px 1fr 110px 130px 130px 120px 90px", gap: 0, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
          <div />
          <span style={{ ...ls, paddingLeft: 12 }}>Resource / Finding</span>
          <span style={ls}>Severity</span>
          <span style={ls}>Status</span>
          <span style={ls}>Exposure</span>
          <span style={ls}>Encryption</span>
          <span style={ls}>Risk /10</span>
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ ...cs, padding: 40, textAlign: "center", border: "none", background: "transparent" }}>
            <Archive size={32} style={{ color: "rgba(100,116,139,0.3)", margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(100,116,139,0.6)", fontSize: 14, margin: 0 }}>No findings match current filters</p>
          </div>
        ) : filteredFindings.map((f, idx) => {
          const wf = workflows[f.id] ?? S3_WORKFLOWS[f.id];
          const isExpanded = expandedRows.has(f.id);
          const tab = activeTab[f.id] ?? "runbook";
          const sevBg = SEVERITY_BG[f.severity];
          const wfMeta = WORKFLOW_META[wf.status];
          const playbook = S3_PLAYBOOKS[f.id] ?? [];
          const isLast = idx === filteredFindings.length - 1;
          const exposureLabel = f.public_read || f.public_write ? "Public" : "Private";
          const exposureColor = f.public_read || f.public_write ? "#ff0040" : "#00ff88";

          return (
            <div key={f.id}>
              <button
                type="button"
                className="block w-full border-b border-white/[0.04] px-3 py-3 text-left md:hidden"
                onClick={() => toggleRow(f.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-200">{f.bucket_name}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{f.finding_type}</div>
                  </div>
                  <SeverityBadge severity={f.severity} size="sm" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">{exposureLabel}</span>
                  <span className="text-[10px] text-slate-500">{f.encryption_type}</span>
                  <span className="ml-auto font-mono text-[11px] font-bold" style={{ color: f.risk_score >= 9 ? "#ff0040" : f.risk_score >= 7 ? "#ff6b35" : f.risk_score >= 5 ? "#ffb000" : "#00ff88" }}>{f.risk_score}/10</span>
                </div>
              </button>
              <div
                onClick={() => toggleRow(f.id)}
                className="hidden md:grid"
                style={{ gridTemplateColumns: "4px 1fr 110px 130px 130px 120px 90px", gap: 0, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: (!isLast || isExpanded) ? "1px solid rgba(255,255,255,0.04)" : "none", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)"; }}
                onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ position: "relative", height: "100%" }}>
                  <div style={{ position: "absolute", left: 0, width: 4, top: -12, bottom: -12, background: SEVERITY_COLORS[f.severity], borderRadius: "0 2px 2px 0", opacity: 0.85 }} />
                </div>
                <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ flexShrink: 0 }}>{isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.bucket_name}</div>
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", ...ms, marginTop: 1 }}>{f.region}</div>
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.finding_type}</div>
                  </div>
                </div>
                <div>
                  <SeverityBadge severity={f.severity} size="sm" />
                </div>
                <div>
                  <SeverityBadge severity={wf.status} size="sm" />
                  {wf.sla_breached && <div style={{ fontSize: 9, ...ms, color: "#ff0040", marginTop: 3 }}>SLA BREACH</div>}
                </div>
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: exposureColor }}>
                    {f.public_read || f.public_write ? <Globe size={11} color={exposureColor} /> : <Lock size={11} color={exposureColor} />}
                    {exposureLabel}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#94a3b8", ...ms }}>{f.encryption_type}</span>
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: f.risk_score >= 9 ? "#ff0040" : f.risk_score >= 7 ? "#ff6b35" : f.risk_score >= 5 ? "#ffb000" : "#00ff88", ...ms }}>
                    {f.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>/10</span>
                  </span>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <>
                  <div className="md:hidden px-3 pb-3">
                    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3" style={{ ...ms }}>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Bucket ARN</div>
                      <div className="break-all text-[11px] text-slate-300">{`arn:aws:s3:::${f.bucket_name}`}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Description</div>
                      <div className="text-[11px] leading-relaxed text-slate-300">{f.description}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommendation</div>
                      <div className="text-[11px] leading-relaxed text-slate-300">{f.recommendation}</div>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <FindingDetailPanel
                      finding={{
                        id: f.id,
                        title: f.finding_type,
                        resource_name: f.bucket_name,
                        resource_arn: `arn:aws:s3:::${f.bucket_name}`,
                        severity: f.severity,
                        description: f.description,
                        recommendation: f.recommendation,
                        risk_score: f.risk_score,
                        compliance_frameworks: f.compliance_frameworks,
                        last_seen: f.last_seen,
                        first_seen: f.created_date,
                        region: f.region,
                        metadata: {
                          "Bucket": f.bucket_name,
                          ...(f.bucket_size_gb !== undefined ? { "Size": `${f.bucket_size_gb} GB` } : {}),
                          ...(f.is_public !== undefined ? { "Public": f.is_public ? "Yes" : "No" } : {}),
                          ...(f.encryption_status ? { "Encryption": f.encryption_status } : {}),
                        },
                      }}
                      playbook={S3_PLAYBOOKS[f.id]}
                      workflow={wf}
                      assignees={ASSIGNEES}
                      onAdvanceStatus={(id) => { advanceStatus(id); toast.success(`Status advanced`); }}
                      onAssign={(id, assignee) => { assignFinding(id, assignee); }}
                      onMarkFalsePositive={(id) => { markFalsePositive(id); }}
                      onCreateTicket={(id) => toast.info("Create ticket", { description: `Wire to JIRA for ${id}` })}
                      onClose={() => toggleRow(f.id)}
                      isLast={isLast}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
