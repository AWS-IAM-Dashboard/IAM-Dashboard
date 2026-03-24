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
import { useScanResults } from "../context/ScanResultsContext";

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
const cs: React.CSSProperties = { background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 };
const ls: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" };
const ms: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function S3Security() {
  const [scanResult, setScanResult] = useState<S3ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all-regions");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [workflows, setWorkflows] = useState<Record<string, FindingWorkflow>>(S3_WORKFLOWS);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { addScanResult } = useScanResults();

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
      const region = selectedRegion === "all-regions" ? "us-east-1" : selectedRegion;
      const response: ScanResponse = await scanS3(region);
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
    } catch {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24, minHeight: "100%", background: "linear-gradient(160deg, #000814 0%, #001025 100%)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Archive size={22} style={{ color: "#00ff88" }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>S3 & Storage Security</h2>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(100,116,139,0.8)", ...ms }}>Enterprise workflow · {findings.length} findings · {summary.total_buckets} buckets monitored</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} style={{ padding: "6px 10px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#94a3b8", fontSize: 12, cursor: "pointer", ...ms }}>
            <option value="all-regions">All Regions</option>
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
          </select>
          <button onClick={handleStartScan} disabled={isScanning} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: isScanning ? "rgba(0,255,136,0.05)" : "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 8, color: "#00ff88", fontSize: 12, fontWeight: 600, cursor: isScanning ? "not-allowed" : "pointer" }}>
            {isScanning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            {isScanning ? "Scanning…" : "Run Scan"}
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            <Download size={13} />Export
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {[
          { label: "Total Buckets", value: summary.total_buckets, color: "#94a3b8" },
          { label: "SLA Breaches", value: slaBreaches, color: slaBreaches > 0 ? "#ff0040" : "#00ff88" },
          { label: "Open Critical", value: openCritical, color: openCritical > 0 ? "#ff0040" : "#00ff88" },
          { label: "Open High", value: openHigh, color: openHigh > 0 ? "#ff6b35" : "#00ff88" },
          { label: "Remediated", value: remediated, color: "#00ff88" },
          { label: "Public Buckets", value: summary.public_buckets, color: summary.public_buckets > 0 ? "#ff6b35" : "#00ff88" },
        ].map(k => (
          <div key={k.label} style={{ ...cs, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, ...ms }}>{k.value}</div>
            <div style={{ ...ls, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Workflow Pipeline */}
      <div style={{ ...cs, padding: "14px 16px" }}>
        <div style={{ ...ls, marginBottom: 10 }}>Workflow Pipeline</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PIPELINE_STAGES.map((stage, i) => {
            const count = Object.values(workflows).filter(w => w.status === stage).length;
            const meta = WORKFLOW_META[stage];
            const active = statusFilter === stage;
            return (
              <button key={stage} onClick={() => setStatusFilter(active ? "ALL" : stage)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? meta.color : "rgba(255,255,255,0.08)"}`, background: active ? meta.bg : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? meta.color : "rgba(100,116,139,0.7)", ...ms }}>{meta.label}</span>
                <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: count > 0 ? meta.bg : "rgba(255,255,255,0.05)", border: `1px solid ${count > 0 ? meta.color + "60" : "rgba(255,255,255,0.08)"}`, color: count > 0 ? meta.color : "rgba(100,116,139,0.5)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...ms }}>{count}</span>
                {i < PIPELINE_STAGES.length - 1 && <ChevronRight size={12} style={{ color: "rgba(100,116,139,0.3)" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const).map(sev => {
          const active = severityFilter === sev;
          const col = sev === "ALL" ? "#00ff88" : SEVERITY_COLORS[sev];
          return <button key={sev} onClick={() => setSeverityFilter(sev)} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", ...ms, background: active ? `${col}25` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? col : "rgba(255,255,255,0.08)"}`, color: active ? col : "rgba(100,116,139,0.7)" }}>{sev}</button>;
        })}
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
          <input value={findingSearch} onChange={e => setFindingSearch(e.target.value)} placeholder="Search findings, buckets…" style={{ width: "100%", padding: "7px 10px 7px 30px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", ...ms }} />
        </div>
      </div>

      {/* Findings Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filteredFindings.map(f => {
          const wf = workflows[f.id] ?? S3_WORKFLOWS[f.id];
          const isExpanded = expandedRows.has(f.id);
          const tab = activeTab[f.id] ?? "runbook";
          const sevBg = SEVERITY_BG[f.severity];
          const wfMeta = WORKFLOW_META[wf.status];
          const playbook = S3_PLAYBOOKS[f.id] ?? [];

          return (
            <div key={f.id} style={{ ...cs, overflow: "hidden" }}>
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }} onClick={() => toggleRow(f.id)}>
                {isExpanded ? <ChevronDown size={15} style={{ color: "#00ff88", flexShrink: 0 }} /> : <ChevronRight size={15} style={{ color: "rgba(100,116,139,0.5)", flexShrink: 0 }} />}
                <span style={{ ...sevBg, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, flexShrink: 0, ...ms }}>{f.severity}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.finding_type}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", ...ms }}>{f.bucket_name}</span>
                    <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", ...ms }}>· {f.region}</span>
                    <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", ...ms }}>· {f.object_count.toLocaleString()} objects · {f.size_gb.toLocaleString()} GB</span>
                  </div>
                </div>
                {/* Workflow action bar */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {wf.sla_breached && <span style={{ fontSize: 9, ...ms, color: "#ff0040", background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.3)", borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>SLA BREACH</span>}
                  <span style={{ ...wfMeta, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, ...ms }}>{wfMeta.label}</span>
                  {NEXT_STATUS[wf.status] && (
                    <button onClick={() => { advanceStatus(f.id); toast.success(`${f.bucket_name}: ${WORKFLOW_META[wf.status].label} → ${WORKFLOW_META[NEXT_STATUS[wf.status]!].label}`); }} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", cursor: "pointer", ...ms }}>
                      Advance ›
                    </button>
                  )}
                  <select defaultValue="" onChange={e => { if (e.target.value) assignFinding(f.id, e.target.value); }} style={{ padding: "3px 6px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(100,116,139,0.8)", fontSize: 10, cursor: "pointer", ...ms }}>
                    <option value="" disabled>{wf.assignee ?? "Assign…"}</option>
                    {["sarah.chen","marcus.webb","taylor.brooks","alex.rodriguez","priya.nair"].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {wf.ticket_id ? (
                    <span style={{ fontSize: 10, ...ms, color: "#818cf8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 4, padding: "2px 6px" }}>{wf.ticket_id}</span>
                  ) : (
                    <button onClick={() => toast.info("Ticket creation: wire to /api/tickets/create")} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8", cursor: "pointer", ...ms }}>+ Ticket</button>
                  )}
                  <button onClick={() => markFalsePositive(f.id)} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "transparent", border: "1px solid rgba(100,116,139,0.15)", color: "rgba(100,116,139,0.5)", cursor: "pointer", ...ms }}>FP</button>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Tab bar */}
                  <div style={{ display: "flex", gap: 0, padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {[
                      { id: "runbook", icon: GitBranch, label: "Runbook" },
                      { id: "overview", icon: Eye, label: "Overview" },
                      { id: "timeline", icon: Activity, label: "Timeline" },
                      { id: "agents", icon: Bot, label: "Agent Actions" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setActiveTab(p => ({ ...p, [f.id]: t.id }))} style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "#00ff88" : "rgba(100,116,139,0.7)", borderBottom: `2px solid ${tab === t.id ? "#00ff88" : "transparent"}`, background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? "#00ff88" : "transparent"}`, cursor: "pointer", marginBottom: -1 }}>
                        <t.icon size={12} /> {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: 16 }}>
                    {/* RUNBOOK TAB */}
                    {tab === "runbook" && (
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                          {(["IDENTIFY","CONTAIN","REMEDIATE","VERIFY"] as PlaybookPhase[]).map(ph => (
                            <span key={ph} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, ...ms, background: PHASE_META[ph].bg, color: PHASE_META[ph].color }}>{ph}</span>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {playbook.map(step => (
                            <div key={step.step} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <span style={{ width: 22, height: 22, borderRadius: 11, background: PHASE_META[step.phase].bg, border: `1px solid ${PHASE_META[step.phase].color}50`, color: PHASE_META[step.phase].color, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...ms }}>{step.step}</span>
                                <span style={{ padding: "1px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: PHASE_META[step.phase].bg, color: PHASE_META[step.phase].color, ...ms }}>{step.phase}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{step.title}</span>
                                <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(100,116,139,0.6)", ...ms }}>~{step.estimated_time}</span>
                              </div>
                              <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "rgba(148,163,184,0.8)", lineHeight: 1.5 }}>{step.description}</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {step.commands.map((cmd, ci) => (
                                  <div key={ci} style={{ position: "relative", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "8px 40px 8px 12px" }}>
                                    <code style={{ fontSize: 11, color: "#a3e635", ...ms, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{cmd}</code>
                                    <button onClick={() => copyCommand(cmd)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: copiedCmd === cmd ? "#00ff88" : "rgba(100,116,139,0.5)", padding: 4 }}>
                                      {copiedCmd === cmd ? <Check size={12} /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OVERVIEW TAB */}
                    {tab === "overview" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ ...ls, marginBottom: 8 }}>Description</div>
                          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.9)", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
                          <div style={{ ...ls, marginTop: 16, marginBottom: 8 }}>Recommendation</div>
                          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.9)", lineHeight: 1.6, margin: 0 }}>{f.recommendation}</p>
                        </div>
                        <div>
                          <div style={{ ...ls, marginBottom: 8 }}>Bucket Details</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {[
                              ["Bucket", f.bucket_name],
                              ["Region", f.region],
                              ["Objects", f.object_count.toLocaleString()],
                              ["Size", `${f.size_gb.toLocaleString()} GB`],
                              ["Encryption", f.encryption_type],
                              ["Versioning", f.versioning_enabled ? "Enabled" : "Disabled"],
                              ["Logging", f.logging_enabled ? "Enabled" : "Disabled"],
                              ["MFA Delete", f.mfa_delete ? "Enabled" : "Disabled"],
                              ["Public Read", f.public_read ? "YES" : "No"],
                              ["Risk Score", `${f.risk_score}/10`],
                            ].map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 5 }}>
                                <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", ...ms }}>{k}</span>
                                <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, ...ms }}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ ...ls, marginTop: 16, marginBottom: 8 }}>Compliance Frameworks</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {f.compliance_frameworks.map(fw => (
                              <span key={fw} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8", ...ms }}>{fw}</span>
                            ))}
                          </div>
                          {wf.risk_acceptance_note && (
                            <div style={{ marginTop: 16, padding: 12, background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8 }}>
                              <div style={{ ...ls, color: "#fb923c", marginBottom: 6 }}>Risk Acceptance Note</div>
                              <p style={{ fontSize: 11, color: "rgba(251,146,60,0.9)", margin: 0, lineHeight: 1.5 }}>{wf.risk_acceptance_note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TIMELINE TAB */}
                    {tab === "timeline" && (
                      <div>
                        <div style={{ ...ls, marginBottom: 12 }}>Activity Log — {wf.timeline.length} events</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {[...wf.timeline].reverse().map((ev, i) => {
                            const actorColors = { system: "#64748b", analyst: "#06b6d4", engineer: "#00ff88", automation: "#818cf8" };
                            return (
                              <div key={ev.id} style={{ display: "flex", gap: 12, paddingBottom: 14, position: "relative" }}>
                                {i < wf.timeline.length - 1 && <div style={{ position: "absolute", left: 7, top: 18, bottom: 0, width: 1, background: "rgba(255,255,255,0.05)" }} />}
                                <div style={{ width: 15, height: 15, borderRadius: 8, background: actorColors[ev.actor_type] + "25", border: `1px solid ${actorColors[ev.actor_type]}50`, flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: actorColors[ev.actor_type], ...ms }}>{ev.actor}</span>
                                    <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", ...ms }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: "#e2e8f0" }}>{ev.action}</div>
                                  {ev.note && <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", marginTop: 3 }}>{ev.note}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AGENT ACTIONS TAB */}
                    {tab === "agents" && (
                      <div>
                        <div style={{ ...ls, marginBottom: 12 }}>AI Agent Actions — Wire to /api/agents/* endpoints</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                          {[
                            { id: "triage", icon: Zap, label: "AI Triage", desc: "Classify severity, blast radius, and recommend priority", endpoint: "/api/agents/triage", color: "#818cf8" },
                            { id: "remediate", icon: Shield, label: "Auto-Remediate", desc: "Execute runbook steps 1-2 automatically via Lambda", endpoint: "/api/agents/s3-remediate", color: "#00ff88" },
                            { id: "ticket", icon: Ticket, label: "Create Ticket", desc: "Create JIRA/ServiceNow ticket with full context", endpoint: "/api/agents/ticket", color: "#06b6d4" },
                            { id: "threat", icon: AlertTriangle, label: "Threat Intel", desc: "Enrich with CVE database and threat actor TTPs", endpoint: "/api/agents/threat-intel", color: "#ffb000" },
                            { id: "blast", icon: Activity, label: "Blast Radius", desc: "Enumerate downstream resources and data impact", endpoint: "/api/agents/blast-radius", color: "#f472b6" },
                            { id: "verify", icon: CheckCircle, label: "Verify Remediation", desc: "Re-scan bucket and confirm control effectiveness", endpoint: "/api/agents/verify", color: "#34d399" },
                          ].map(agent => (
                            <div key={agent.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${agent.color}15`, border: `1px solid ${agent.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <agent.icon size={14} style={{ color: agent.color }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{agent.label}</span>
                              </div>
                              <p style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", margin: "0 0 10px 0", lineHeight: 1.4 }}>{agent.desc}</p>
                              <code style={{ display: "block", fontSize: 10, color: "rgba(100,116,139,0.5)", marginBottom: 10, ...ms }}>{agent.endpoint}</code>
                              <button onClick={() => toast.info(`Agent stub: ${agent.endpoint}`, { description: `Finding: ${f.id} · Bucket: ${f.bucket_name}` })} style={{ width: "100%", padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${agent.color}10`, border: `1px solid ${agent.color}30`, color: agent.color, cursor: "pointer" }}>
                                Run Agent
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFindings.length === 0 && (
          <div style={{ ...cs, padding: 40, textAlign: "center" }}>
            <Archive size={32} style={{ color: "rgba(100,116,139,0.3)", margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(100,116,139,0.6)", fontSize: 14, margin: 0 }}>No findings match current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
