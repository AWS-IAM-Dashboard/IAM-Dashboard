// GRC — deterministic mock data
import type {
  OrgPolicy, Guardrail, PolicyException,
  ArchitectureRisk, CostRisk,
} from "./types";

function ago(days: number) { return new Date(Date.now() - days * 86_400_000).toISOString(); }
function fromNow(days: number) { return new Date(Date.now() + days * 86_400_000).toISOString(); }

// ─── Org Policies ────────────────────────────────────────────────────────────

export const MOCK_POLICIES: OrgPolicy[] = [
  {
    id: "pol-001", name: "S3 Encryption at Rest",
    description: "All S3 buckets must have server-side encryption enabled using KMS CMK.",
    category: "encryption", enforcement: "enforced", enforcement_mechanism: "Config Rule + SCP",
    compliance_rate: 86, affected_resources: 14, non_compliant_resources: 2,
    last_reviewed: ago(12), owner: "security-team",
    severity: "CRITICAL", linked_frameworks: ["SOC2", "PCI-DSS", "HIPAA"],
    linked_service_tab: "s3-security",
  },
  {
    id: "pol-002", name: "MFA for Console Access",
    description: "All IAM users with console access must have MFA enabled.",
    category: "access", enforcement: "enforced", enforcement_mechanism: "SCP + IAM Policy",
    compliance_rate: 95, affected_resources: 22, non_compliant_resources: 1,
    last_reviewed: ago(7), owner: "identity-team",
    severity: "CRITICAL", linked_frameworks: ["CIS", "SOC2", "PCI-DSS"],
    linked_service_tab: "iam-security",
  },
  {
    id: "pol-003", name: "VPC Flow Logs Enabled",
    description: "All production VPCs must have flow logs enabled and shipped to CloudWatch.",
    category: "logging", enforcement: "enforced", enforcement_mechanism: "Config Rule",
    compliance_rate: 100, affected_resources: 4, non_compliant_resources: 0,
    last_reviewed: ago(30), owner: "platform-team",
    severity: "HIGH", linked_frameworks: ["SOC2", "PCI-DSS"],
    linked_service_tab: "vpc-security",
  },
  {
    id: "pol-004", name: "EBS Encryption by Default",
    description: "All EBS volumes must be encrypted. Account-level EBS encryption default must be enabled.",
    category: "encryption", enforcement: "enforced", enforcement_mechanism: "Account Setting + Config Rule",
    compliance_rate: 71, affected_resources: 7, non_compliant_resources: 2,
    last_reviewed: ago(45), owner: "security-team",
    severity: "HIGH", linked_frameworks: ["SOC2", "HIPAA"],
    linked_service_tab: "ec2-security",
  },
  {
    id: "pol-005", name: "Restrict Public S3 Buckets",
    description: "No S3 bucket may be publicly accessible unless granted an explicit exception.",
    category: "access", enforcement: "enforced", enforcement_mechanism: "S3 Block Public Access + SCP",
    compliance_rate: 93, affected_resources: 14, non_compliant_resources: 1,
    last_reviewed: ago(5), owner: "security-team",
    severity: "CRITICAL", linked_frameworks: ["PCI-DSS", "SOC2"],
    linked_service_tab: "s3-security",
  },
  {
    id: "pol-006", name: "Mandatory Resource Tagging",
    description: "All resources must have Environment, Owner, CostCenter, and DataClassification tags.",
    category: "tagging", enforcement: "advisory", enforcement_mechanism: "Tag Policy (advisory)",
    compliance_rate: 62, affected_resources: 48, non_compliant_resources: 18,
    last_reviewed: ago(90), owner: "platform-team",
    severity: "MEDIUM", linked_frameworks: ["Internal"],
    linked_service_tab: undefined,
  },
  {
    id: "pol-007", name: "No SSH from 0.0.0.0/0",
    description: "Security groups must not allow inbound SSH (port 22) from 0.0.0.0/0.",
    category: "network", enforcement: "enforced", enforcement_mechanism: "Config Rule + Auto-Remediation",
    compliance_rate: 100, affected_resources: 12, non_compliant_resources: 0,
    last_reviewed: ago(14), owner: "network-team",
    severity: "CRITICAL", linked_frameworks: ["CIS", "PCI-DSS"],
    linked_service_tab: "vpc-security",
  },
  {
    id: "pol-008", name: "IMDSv2 Required on EC2",
    description: "All EC2 instances must require IMDSv2 (HttpTokens=required).",
    category: "compute", enforcement: "exception_granted", enforcement_mechanism: "Config Rule",
    compliance_rate: 83, affected_resources: 6, non_compliant_resources: 1,
    last_reviewed: ago(21), owner: "platform-team",
    severity: "HIGH", linked_frameworks: ["CIS", "SOC2"],
    linked_service_tab: "ec2-security",
  },
];

// ─── Guardrails ──────────────────────────────────────────────────────────────

export const MOCK_GUARDRAILS: Guardrail[] = [
  {
    id: "gr-001", name: "deny-unencrypted-s3-uploads",
    type: "SCP", status: "active",
    description: "Denies s3:PutObject if x-amz-server-side-encryption is absent.",
    scope: "Organization", policies_enforced: ["pol-001"],
    last_evaluated: ago(0.5), drift_detected: false,
  },
  {
    id: "gr-002", name: "s3-bucket-server-side-encryption-enabled",
    type: "Config_Rule", status: "active",
    description: "Evaluates whether S3 buckets have SSE enabled.",
    scope: "All Accounts", policies_enforced: ["pol-001"],
    last_evaluated: ago(0.1), drift_detected: false,
  },
  {
    id: "gr-003", name: "iam-user-mfa-enabled",
    type: "Config_Rule", status: "active",
    description: "Checks whether MFA is enabled for IAM console users.",
    scope: "All Accounts", policies_enforced: ["pol-002"],
    last_evaluated: ago(0.2), drift_detected: false,
  },
  {
    id: "gr-004", name: "deny-public-s3-access",
    type: "S3_Block", status: "active",
    description: "Account-level S3 Block Public Access enabled.",
    scope: "Account 123456789012", policies_enforced: ["pol-005"],
    last_evaluated: ago(1), drift_detected: false,
  },
  {
    id: "gr-005", name: "required-tags",
    type: "Tag_Policy", status: "drifted",
    description: "Enforces Environment, Owner, CostCenter, DataClassification tags.",
    scope: "OU: Production", policies_enforced: ["pol-006"],
    last_evaluated: ago(2), drift_detected: true,
  },
  {
    id: "gr-006", name: "restrict-ssh-ingress",
    type: "Config_Rule", status: "active",
    description: "Auto-remediates security groups allowing 0.0.0.0/0 on port 22.",
    scope: "All Accounts", policies_enforced: ["pol-007"],
    last_evaluated: ago(0.3), drift_detected: false,
  },
  {
    id: "gr-007", name: "prod-iam-permission-boundary",
    type: "IAM_Boundary", status: "active",
    description: "Permission boundary preventing IAM users from creating unscoped roles.",
    scope: "OU: Production", policies_enforced: ["pol-002"],
    last_evaluated: ago(7), drift_detected: false,
  },
];

// ─── Policy Exceptions ───────────────────────────────────────────────────────

export const MOCK_EXCEPTIONS: PolicyException[] = [
  {
    id: "exc-001", policy_id: "pol-005", policy_name: "Restrict Public S3 Buckets",
    resource_id: "dev-scratch-bucket", resource_name: "dev-scratch-bucket",
    reason: "Developer sandbox bucket for external partner data exchange. Scoped to read-only.",
    approved_by: "alice.chen", approved_at: ago(30), expires_at: fromNow(60),
    days_remaining: 60, status: "active", risk_level: "HIGH",
  },
  {
    id: "exc-002", policy_id: "pol-008", policy_name: "IMDSv2 Required on EC2",
    resource_id: "i-0legacy123", resource_name: "legacy-app-01",
    reason: "Legacy application SDK does not support IMDSv2. Migration planned Q3 2026.",
    approved_by: "bob.martinez", approved_at: ago(90), expires_at: fromNow(90),
    days_remaining: 90, status: "active", risk_level: "MEDIUM",
  },
  {
    id: "exc-003", policy_id: "pol-006", policy_name: "Mandatory Resource Tagging",
    resource_id: "ci-runner-asg", resource_name: "CI Runner ASG",
    reason: "Auto-scaling group instances are ephemeral. Tag propagation configured at ASG level.",
    approved_by: "alice.chen", approved_at: ago(180), expires_at: fromNow(-15),
    days_remaining: -15, status: "expired", risk_level: "LOW",
  },
  {
    id: "exc-004", policy_id: "pol-001", policy_name: "S3 Encryption at Rest",
    resource_id: "public-assets-cdn", resource_name: "public-assets-cdn",
    reason: "Public CDN assets bucket — contains only non-sensitive static files (images, CSS, JS).",
    approved_by: "carol.wright", approved_at: ago(60), expires_at: fromNow(120),
    days_remaining: 120, status: "active", risk_level: "LOW",
  },
];

// ─── Architecture Risks ──────────────────────────────────────────────────────

export const MOCK_ARCH_RISKS: ArchitectureRisk[] = [
  {
    id: "arch-001", name: "Single-AZ RDS Production Database",
    category: "availability", severity: "CRITICAL",
    affected_resources: ["prod-mysql-01"],
    description: "Production MySQL RDS instance runs in a single AZ (us-east-1a). An AZ outage will cause complete database unavailability.",
    recommendation: "Enable Multi-AZ deployment for prod-mysql-01. Estimated downtime for conversion: ~15 minutes.",
    linked_service_tab: "ec2-security", estimated_impact: "RTO ∞ for AZ failure — 3 services, ~2,400 RPM affected",
    status: "open",
  },
  {
    id: "arch-002", name: "No Cross-Region Backup Strategy",
    category: "resilience", severity: "HIGH",
    affected_resources: ["company-prod-data", "acme-cloudtrail", "prod-mysql-01-backup"],
    description: "All backups reside in us-east-1 only. A regional event would destroy both primary and backup data.",
    recommendation: "Configure S3 cross-region replication for critical buckets. Enable RDS cross-region read replica or automated backups to us-west-2.",
    linked_service_tab: "s3-security", estimated_impact: "RPO = total loss if us-east-1 fails — 14 buckets, 1 RDS",
    status: "in_progress",
  },
  {
    id: "arch-003", name: "Overly Broad Security Group Blast Radius",
    category: "blast_radius", severity: "HIGH",
    affected_resources: ["sg-0abc1234 (prod-web-sg)", "sg-0def5678 (prod-app-sg)"],
    description: "Production web and app security groups allow lateral traffic to all ports within the VPC CIDR. A compromised instance can reach any other instance.",
    recommendation: "Restrict SG rules to specific ports and destination SGs (micro-segmentation). Use VPC endpoint policies for AWS service access.",
    linked_service_tab: "vpc-security", estimated_impact: "6 instances reachable from any compromised host in VPC",
    status: "open",
  },
  {
    id: "arch-004", name: "NAT Gateway Single Point of Failure",
    category: "availability", severity: "MEDIUM",
    affected_resources: ["nat-0prod123 (us-east-1a)"],
    description: "Production private subnets route through a single NAT Gateway in us-east-1a. AZ failure disrupts all outbound connectivity.",
    recommendation: "Deploy a NAT Gateway per AZ in the production VPC routing table.",
    linked_service_tab: "vpc-security", estimated_impact: "4 private subnets lose outbound — API calls, log shipping halt",
    status: "open",
  },
  {
    id: "arch-005", name: "Secrets Manager — No Disaster Recovery",
    category: "resilience", severity: "MEDIUM",
    affected_resources: ["prod/db/mysql-master-password", "prod/stripe/api-key"],
    description: "Secrets Manager secrets are region-scoped. No replication to a DR region is configured.",
    recommendation: "Enable multi-region secret replication to us-west-2 for critical secrets.",
    linked_service_tab: undefined, estimated_impact: "5 secrets unavailable in DR — app cold-start blocked",
    status: "open",
  },
];

// ─── Cost Risks ──────────────────────────────────────────────────────────────

export const MOCK_COST_RISKS: CostRisk[] = [
  {
    id: "cost-001", resource_type: "EBS Volume", resource_id: "vol-0orphan999",
    resource_name: "Unattached gp3 volume (500 GB)",
    risk_type: "unattached", monthly_waste_usd: 40,
    description: "500 GB gp3 EBS volume detached from terminated instance 45 days ago. No snapshots reference it.",
    recommendation: "Snapshot (if needed) and delete the volume.",
    confidence: "HIGH", linked_service_tab: "ec2-security", detected_at: ago(45),
  },
  {
    id: "cost-002", resource_type: "Elastic IP", resource_id: "eipalloc-0old456",
    resource_name: "Unassociated Elastic IP",
    risk_type: "unused", monthly_waste_usd: 3.6,
    description: "Elastic IP allocated 120 days ago but never associated. AWS charges $3.60/mo for idle EIPs.",
    recommendation: "Release the Elastic IP if no longer needed.",
    confidence: "HIGH", linked_service_tab: "ec2-security", detected_at: ago(120),
  },
  {
    id: "cost-003", resource_type: "EC2 Instance", resource_id: "i-0idle789",
    resource_name: "dev-build-server (m5.2xlarge)",
    risk_type: "oversized", monthly_waste_usd: 180,
    description: "Average CPU utilization is 3.2% over 30 days. Instance is m5.2xlarge but could be t3.medium based on usage.",
    recommendation: "Right-size to t3.medium or consider Spot for build workloads.",
    confidence: "MEDIUM", linked_service_tab: "ec2-security", detected_at: ago(30),
  },
  {
    id: "cost-004", resource_type: "EBS Snapshot", resource_id: "snap-0old567",
    resource_name: "Legacy snapshots (12 snaps, 2.4 TB total)",
    risk_type: "orphaned", monthly_waste_usd: 48,
    description: "12 EBS snapshots from terminated instances, oldest 340 days. Source volumes no longer exist.",
    recommendation: "Review and delete orphaned snapshots. Archive to S3 Glacier if retention required.",
    confidence: "HIGH", linked_service_tab: "ec2-security", detected_at: ago(60),
  },
  {
    id: "cost-005", resource_type: "NAT Gateway", resource_id: "nat-0dev456",
    resource_name: "Dev VPC NAT Gateway",
    risk_type: "unused", monthly_waste_usd: 32,
    description: "NAT Gateway in dev VPC processes <100 MB/mo. Dev workloads could use a NAT instance or VPC endpoints.",
    recommendation: "Replace with a t3.micro NAT instance or remove if dev resources can use VPC endpoints.",
    confidence: "MEDIUM", linked_service_tab: "vpc-security", detected_at: ago(14),
  },
];

// ─── GRC Endpoints (for BackendHandoff) ──────────────────────────────────────

export const GOVERNANCE_ENDPOINTS = [
  { method: "GET", path: "GET /organizations/policies", description: "List organizational security policies with compliance rates" },
  { method: "GET", path: "GET /organizations/scps", description: "List active Service Control Policies" },
  { method: "GET", path: "GET /config/rules", description: "AWS Config rule evaluation status" },
  { method: "GET", path: "GET /organizations/tag-policies", description: "Tag policy compliance by OU" },
  { method: "POST", path: "POST /grc/exceptions", description: "Create or update policy exception (simulation)" },
  { method: "PUT", path: "PUT /grc/exceptions/{id}/revoke", description: "Revoke policy exception (simulation)" },
];

export const ARCH_COST_ENDPOINTS = [
  { method: "GET", path: "GET /ec2/describe-instances?filters=utilization", description: "Instance utilization metrics for right-sizing" },
  { method: "GET", path: "GET /ec2/describe-volumes?status=available", description: "Unattached EBS volumes" },
  { method: "GET", path: "GET /ec2/describe-addresses?filters=unassociated", description: "Unused Elastic IPs" },
  { method: "GET", path: "GET /rds/describe-db-instances?filters=multi-az", description: "RDS Multi-AZ deployment status" },
  { method: "GET", path: "GET /ec2/describe-nat-gateways", description: "NAT Gateway utilization" },
  { method: "POST", path: "POST /grc/risk-accept/{id}", description: "Accept architecture risk with justification (simulation)" },
];
