/**
 * EC2Security.tsx
 * Enterprise Security Workflow — EC2 & Compute
 *
 * Architecture:
 *  - mockFindings        → Replace with SecurityHub/GuardDuty API response
 *  - PLAYBOOKS           → Replace with runbook service API / S3-backed playbook store
 *  - INITIAL_WORKFLOWS   → Replace with workflow DB (DynamoDB / Jira / ServiceNow)
 *  - updateWorkflow()    → Replace with PATCH /api/workflows/{finding_id}
 *  - Agent Actions panel → Wire to /api/agents/{action} endpoints
 */

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  RefreshCw,
  Download,
  Play,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Globe,
  Search,
  Clock,
  AlertTriangle,
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
} from "lucide-react";
import { toast } from "sonner";
import { scanEC2, type ScanResponse } from "../services/api";
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
  risk_acceptance_expiry?: string;
}

interface EC2SecurityFinding {
  id: string;
  instance_id: string;
  instance_name: string;
  instance_type: string;
  region: string;
  vpc_id: string;
  subnet_id: string;
  security_groups: string[];
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  public_ip: string | null;
  state: string;
  launch_time: string;
  risk_score: number;
}

interface EC2ScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  total_instances: number;
  findings: EC2SecurityFinding[];
  scan_summary: {
    running_instances: number;
    stopped_instances: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    publicly_accessible: number;
    unencrypted_volumes: number;
  };
  started_at?: string;
  completed_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FINDINGS — Replace with SecurityHub/GuardDuty API call
// GET /api/ec2/findings?region={region}&severity={sev}
// ─────────────────────────────────────────────────────────────────────────────

const mockFindings: EC2SecurityFinding[] = [
  { id: "ec2-001", instance_id: "i-0a1b2c3d4e5f67890", instance_name: "web-server-prod", instance_type: "t3.medium", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-public-1a", security_groups: ["sg-web-public"], severity: "CRITICAL", finding_type: "SSH Open to Internet (0.0.0.0/0)", description: "Security group sg-web-public allows inbound SSH (port 22) from 0.0.0.0/0 and ::/0. This instance is publicly accessible on port 22 from any IP address worldwide. Automated exploit kits scan and attempt exploitation within minutes of exposure.", recommendation: "Remove 0.0.0.0/0 SSH rule. Use AWS Systems Manager Session Manager for bastion-free access. If SSH required, restrict to known CIDR ranges or VPN IP only.", compliance_frameworks: ["CIS 5.2", "PCI-DSS 1.3"], public_ip: "52.23.45.67", state: "running", launch_time: "2024-01-01T00:00:00Z", risk_score: 10 },
  { id: "ec2-002", instance_id: "i-0b2c3d4e5f678901a", instance_name: "bastion-host", instance_type: "t3.small", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-public-1b", security_groups: ["sg-bastion"], severity: "CRITICAL", finding_type: "RDP Open to Internet (0.0.0.0/0)", description: "Security group sg-bastion allows inbound RDP (port 3389) from 0.0.0.0/0. Windows RDP exposed to the internet is a primary ransomware and brute-force attack vector. This instance has been running for 14 months without patching.", recommendation: "Block all public RDP access. Use AWS Systems Manager Fleet Manager or a VPN with MFA. If RDP required, restrict to specific IP ranges.", compliance_frameworks: ["CIS 5.3", "PCI-DSS 1.3"], public_ip: "54.34.56.78", state: "running", launch_time: "2023-11-01T00:00:00Z", risk_score: 10 },
  { id: "ec2-003", instance_id: "i-0c3d4e5f67890abc1", instance_name: "prod-ec2-instance-profile", instance_type: "c5.large", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1a", security_groups: ["sg-app-layer"], severity: "CRITICAL", finding_type: "Instance Profile with AdministratorAccess", description: "EC2 instance role attached to 3 instances has AdministratorAccess policy. Any process on these instances — including web shells, malware, or compromised dependencies — has full AWS account access. SSRF via IMDSv1 can retrieve these credentials.", recommendation: "Replace AdministratorAccess with least-privilege IAM role scoped to specific services. Use IAM Access Analyzer to generate minimal policy from CloudTrail access history.", compliance_frameworks: ["CIS 1.16", "SOC2 CC6.3"], public_ip: null, state: "running", launch_time: "2023-08-15T00:00:00Z", risk_score: 10 },
  { id: "ec2-007", instance_id: "snap-0a1b2c3d4e5f6789a", instance_name: "prod-db-snapshot", instance_type: "N/A", region: "us-east-1", vpc_id: "N/A", subnet_id: "N/A", security_groups: [], severity: "CRITICAL", finding_type: "Public EBS Snapshot — Production DB", description: "EBS snapshot snap-0a1b2c3d4e5f6789 is publicly shared — any AWS account can create a volume from this snapshot. Snapshot contains a production database volume taken 14 days ago with unencrypted PII.", recommendation: "Immediately change snapshot permissions to private. Audit all public snapshots. Enable AWS Config rule ec2-ebs-snapshot-public-restorable-check.", compliance_frameworks: ["CIS 2.2.3", "PCI-DSS 3.4"], public_ip: null, state: "available", launch_time: "2024-01-01T00:00:00Z", risk_score: 10 },
  { id: "ec2-004", instance_id: "i-0d4e5f6789abcdef0", instance_name: "db-migration-01", instance_type: "m5.xlarge", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1b", security_groups: ["sg-db"], severity: "HIGH", finding_type: "IMDSv1 Enabled (SSRF Credential Theft)", description: "EC2 instance metadata service v1 (IMDSv1) is enabled. IMDSv1 is vulnerable to SSRF attacks — a web application vulnerability can expose instance role credentials via http://169.254.169.254. These credentials provide the same access as the attached IAM role.", recommendation: "Enforce IMDSv2 by setting HttpTokens=required. Test application compatibility first. Enforce at EC2 launch template and SCP level org-wide.", compliance_frameworks: ["CIS 5.6", "SOC2 CC6.1"], public_ip: null, state: "running", launch_time: "2023-12-01T00:00:00Z", risk_score: 8 },
  { id: "ec2-005", instance_id: "i-0e5f6789abcdef012", instance_name: "api-server-01", instance_type: "t3.large", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1a", security_groups: ["sg-api"], severity: "HIGH", finding_type: "EBS Root Volume Not Encrypted", description: "Root EBS volume vol-0a1b2c3d4e5f6789 on api-server-01 is not encrypted. If the volume or snapshot is accessed directly (via public snapshot, console access, or datacenter theft), data is readable in plaintext.", recommendation: "Enable EBS encryption by default in account settings. For existing unencrypted volumes: create encrypted snapshot, create encrypted volume, swap root volume during maintenance window.", compliance_frameworks: ["CIS 2.2.1", "PCI-DSS 3.4", "HIPAA 164.312(a)(2)"], public_ip: null, state: "running", launch_time: "2023-10-01T00:00:00Z", risk_score: 7 },
  { id: "ec2-006", instance_id: "i-0f6789abcdef01234", instance_name: "reporting-svc", instance_type: "t3.small", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1b", security_groups: ["sg-reporting"], severity: "HIGH", finding_type: "AMI Age: 547 Days — Unpatched OS", description: "Instance reporting-svc is running from AMI ami-0a1b2c3d4e5f6789 launched 547 days ago. This AMI likely contains multiple critical CVEs in the OS packages and kernel. Automated vulnerability scanners continuously probe for these known vectors.", recommendation: "Create new AMI from latest Amazon Linux 2023 or Ubuntu 22.04 base. Use EC2 Image Builder for automated patching pipelines. Redeploy instance from updated AMI.", compliance_frameworks: ["CIS 5.1", "PCI-DSS 6.3"], public_ip: null, state: "running", launch_time: "2022-07-01T00:00:00Z", risk_score: 7 },
  { id: "ec2-010", instance_id: "i-0i9abcdef01234567", instance_name: "temp-instance-07", instance_type: "t3.medium", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-public-1c", security_groups: ["sg-all-open"], severity: "HIGH", finding_type: "Security Group: All Ports Open Internally (0–65535)", description: "Security group sg-all-open allows all TCP (0–65535) from VPC CIDR 10.0.0.0/8. Overly permissive internal rules enable unrestricted lateral movement if any internal host is compromised. This instance also has a public IP.", recommendation: "Replace all-ports rule with specific port allowances. Apply micro-segmentation — each service only receives traffic on its specific ports from specific source SGs.", compliance_frameworks: ["CIS 5.4", "PCI-DSS 1.2"], public_ip: "54.90.12.34", state: "running", launch_time: "2024-01-14T00:00:00Z", risk_score: 7 },
  { id: "ec2-008", instance_id: "i-0g789abcdef012345", instance_name: "worker-node-03", instance_type: "c5.2xlarge", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1c", security_groups: ["sg-worker"], severity: "MEDIUM", finding_type: "SSM Agent Not Running — No Patch Enforcement", description: "Instance worker-node-03 does not have SSM Agent running or reachable. Cannot be managed via AWS Systems Manager — no patch baseline enforcement, no Session Manager access, no Inventory collection. This instance is invisible to centralized security controls.", recommendation: "Install and start SSM Agent. Attach AmazonSSMManagedInstanceCore policy to instance role. Verify VPC endpoints for SSM, SSMMessages, and EC2Messages.", compliance_frameworks: ["CIS 5.1"], public_ip: null, state: "running", launch_time: "2024-01-10T00:00:00Z", risk_score: 5 },
  { id: "ec2-009", instance_id: "i-0h89abcdef0123456", instance_name: "legacy-app-01", instance_type: "t2.micro", region: "us-east-1", vpc_id: "vpc-0a1b2c3d", subnet_id: "subnet-private-1a", security_groups: ["sg-legacy"], severity: "MEDIUM", finding_type: "Missing Required Tags (Owner, Environment, DataClassification)", description: "Instance legacy-app-01 is missing required tags: Environment, Owner, CostCenter, DataClassification. Untagged instances cannot be included in automated backup policies, security controls, or cost allocation. Owner is unknown — no one can be paged for incidents.", recommendation: "Apply required tags immediately. Enforce via AWS Config required-tags rule and SCP. Use Tag Editor for bulk tagging.", compliance_frameworks: ["SOC2 CC1.4"], public_ip: null, state: "running", launch_time: "2021-05-01T00:00:00Z", risk_score: 4 },
];

const mockScanSummary = {
  total_instances: 28, running_instances: 22, stopped_instances: 6,
  publicly_accessible: 4, unencrypted_volumes: 7,
  unrestricted_ssh: 2, unrestricted_rdp: 1, imdsv1_enabled: 9, missing_ssm: 5,
  critical_findings: 4, high_findings: 4, medium_findings: 2, low_findings: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBOOKS — Replace with GET /api/playbooks/{finding_type}
// ─────────────────────────────────────────────────────────────────────────────

const PLAYBOOKS: Record<string, PlaybookStep[]> = {
  "ec2-001": [
    { step: 1, phase: "IDENTIFY", title: "Enumerate Affected Instances", description: "List all instances using the offending security group to determine full blast radius.", commands: ["aws ec2 describe-instances --filters \"Name=network-interface.group-id,Values=sg-web-public\" --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]' --output table"], estimated_time: "2 min" },
    { step: 2, phase: "IDENTIFY", title: "Confirm Active SSH Connections", description: "Check VPC Flow Logs for recent accepted traffic on port 22 to assess if exploitation is in progress.", commands: ["aws logs filter-log-events --log-group-name /aws/vpc/flowlogs --filter-pattern '[version, account_id, interface_id, srcaddr, dstaddr, srcport, dstport=22, protocol=6, packets, bytes, start, end, action=ACCEPT, log_status]' --start-time $(date -d '1 hour ago' +%s)000"], estimated_time: "3 min" },
    { step: 3, phase: "CONTAIN", title: "Revoke Public SSH Rule", description: "Remove the 0.0.0.0/0 ingress rule on port 22. This takes effect immediately — no instance restart required.", commands: ["aws ec2 revoke-security-group-ingress --group-id sg-web-public --protocol tcp --port 22 --cidr 0.0.0.0/0", "aws ec2 revoke-security-group-ingress --group-id sg-web-public --protocol tcp --port 22 --cidr ::/0", "# Verify rule removed:", "aws ec2 describe-security-groups --group-ids sg-web-public --query 'SecurityGroups[0].IpPermissions'"], estimated_time: "5 min" },
    { step: 4, phase: "REMEDIATE", title: "Enable SSM Session Manager", description: "Configure Systems Manager as the access mechanism — eliminates need for any open inbound ports.", commands: ["# Attach SSM managed policy to instance role:", "aws iam attach-role-policy --role-name EC2InstanceRole --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore", "# Start a session (no port 22 needed):", "aws ssm start-session --target i-0a1b2c3d4e5f67890"], estimated_time: "15 min" },
    { step: 5, phase: "VERIFY", title: "Confirm Port 22 Unreachable", description: "Verify the security group change is effective and no other SG or rule re-exposes port 22.", commands: ["# Check no 0.0.0.0/0 on port 22 remains:", "aws ec2 describe-security-groups --filters \"Name=ip-permission.from-port,Values=22\" \"Name=ip-permission.cidr,Values=0.0.0.0/0\" --query 'SecurityGroups[*].[GroupId,GroupName]'", "# Test connectivity (should time out):", "nc -zv 52.23.45.67 22 -w 5"], estimated_time: "3 min" },
  ],
  "ec2-002": [
    { step: 1, phase: "IDENTIFY", title: "Identify All RDP-Exposed Instances", description: "Find every instance with port 3389 open to 0.0.0.0/0 across all security groups.", commands: ["aws ec2 describe-security-groups --filters \"Name=ip-permission.from-port,Values=3389\" \"Name=ip-permission.cidr,Values=0.0.0.0/0\" --query 'SecurityGroups[*].[GroupId,GroupName]' --output table"], estimated_time: "2 min" },
    { step: 2, phase: "CONTAIN", title: "Revoke Public RDP Rule", description: "Remove the internet-facing RDP rule immediately. Fleet Manager will replace this access path.", commands: ["aws ec2 revoke-security-group-ingress --group-id sg-bastion --protocol tcp --port 3389 --cidr 0.0.0.0/0", "# Verify:", "aws ec2 describe-security-groups --group-ids sg-bastion --query 'SecurityGroups[0].IpPermissions[?FromPort==`3389`]'"], estimated_time: "5 min" },
    { step: 3, phase: "REMEDIATE", title: "Configure Fleet Manager for RDP", description: "Set up SSM Fleet Manager for browser-based RDP with MFA — no inbound ports required.", commands: ["# Enable SSM on the instance:", "aws ssm send-command --instance-ids i-0b2c3d4e5f678901a --document-name AWS-ConfigureSSHKeys --parameters 'action=Add'", "# Open Fleet Manager session via console:", "# Systems Manager > Fleet Manager > Connect > Remote Desktop"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Confirm No Public RDP Exposure", description: "Run Config rule check to confirm no security group allows public RDP.", commands: ["aws configservice get-compliance-details-by-config-rule --config-rule-name restricted-rdp --compliance-types NON_COMPLIANT"], estimated_time: "2 min" },
  ],
  "ec2-003": [
    { step: 1, phase: "IDENTIFY", title: "Enumerate All Instances with Admin Role", description: "Find all EC2 instances using the over-privileged instance profile to determine blast radius.", commands: ["aws ec2 describe-instances --filters \"Name=iam-instance-profile.arn,Values=arn:aws:iam::123456789012:instance-profile/AdminProfile\" --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]' --output table", "# Check the actual policies attached:", "aws iam list-attached-role-policies --role-name EC2AdminRole"], estimated_time: "5 min" },
    { step: 2, phase: "IDENTIFY", title: "Generate Least-Privilege Policy from Access History", description: "Use IAM Access Analyzer to generate a policy scoped to only what this role has actually used.", commands: ["# Generate policy from CloudTrail (last 90 days):", "aws accessanalyzer create-access-preview --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/default --configuration '{\"iamRole\":{\"trustPolicy\":{...}}}'", "# Or use the console: IAM > Roles > EC2AdminRole > Generate policy"], estimated_time: "15 min" },
    { step: 3, phase: "REMEDIATE", title: "Create Least-Privilege Replacement Role", description: "Create a new IAM role with only the required permissions and swap the instance profile.", commands: ["# Create new scoped policy:", "aws iam create-policy --policy-name EC2AppPolicy-LeastPriv --policy-document file://least-priv-policy.json", "# Create new role:", "aws iam create-role --role-name EC2AppRole-Prod --assume-role-policy-document file://trust-policy.json", "# Attach scoped policy:", "aws iam attach-role-policy --role-name EC2AppRole-Prod --policy-arn arn:aws:iam::123456789012:policy/EC2AppPolicy-LeastPriv", "# Swap instance profile (no restart needed):", "aws ec2 replace-iam-instance-profile-association --iam-instance-profile Name=EC2AppRole-Prod-Profile --association-id iip-assoc-0a1b2c3d4e5f6789"], estimated_time: "30 min" },
    { step: 4, phase: "VERIFY", title: "Validate New Role and Remove Old Profile", description: "Confirm new role is active and the admin role is no longer attached to any instance.", commands: ["# Confirm new profile attached:", "aws ec2 describe-iam-instance-profile-associations --filters Name=instance-id,Values=i-0c3d4e5f67890abc1", "# Confirm no instances use admin role:", "aws ec2 describe-instances --filters \"Name=iam-instance-profile.arn,Values=arn:aws:iam::123456789012:instance-profile/AdminProfile\"", "# Test application still works after role swap (smoke test)"], estimated_time: "15 min" },
  ],
  "ec2-007": [
    { step: 1, phase: "IDENTIFY", title: "Audit All Public Snapshots in Account", description: "Find every publicly shared EBS snapshot in the account — not just the known one.", commands: ["aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[?State==`completed`]' | jq '.[] | select(.Encrypted==false or .SnapshotId!=null)' ", "# Find public ones specifically:", "aws ec2 describe-snapshots --owner-ids self --filters Name=attribute,Values=createVolumePermission Name=attribute-value,Values=all"], estimated_time: "5 min" },
    { step: 2, phase: "CONTAIN", title: "Make Snapshot Private Immediately", description: "Remove public createVolumePermission from the snapshot. This takes effect immediately.", commands: ["aws ec2 modify-snapshot-attribute --snapshot-id snap-0a1b2c3d4e5f6789 --attribute createVolumePermission --operation-type remove --group-names all", "# Verify it's now private:", "aws ec2 describe-snapshot-attribute --snapshot-id snap-0a1b2c3d4e5f6789 --attribute createVolumePermission"], estimated_time: "3 min" },
    { step: 3, phase: "CONTAIN", title: "Assess Data Exposure Window", description: "Check how long the snapshot was public and if any unknown AWS accounts created a volume from it.", commands: ["# Check CloudTrail for createVolumePermission modifications:", "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ModifySnapshotAttribute --start-time 2024-01-01", "# Check for CreateVolume from this snapshot by any account:", "aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=snap-0a1b2c3d4e5f6789"], estimated_time: "10 min" },
    { step: 4, phase: "REMEDIATE", title: "Enable Config Rule for Future Prevention", description: "Enable AWS Config rule to continuously detect any snapshot made public in the future.", commands: ["aws configservice put-config-rule --config-rule '{\"ConfigRuleName\":\"ec2-ebs-snapshot-public-restorable-check\",\"Source\":{\"Owner\":\"AWS\",\"SourceIdentifier\":\"EC2_EBS_SNAPSHOT_PUBLIC_RESTORABLE_CHECK\"}}'", "# Enable default encryption for all new snapshots:", "aws ec2 enable-ebs-encryption-by-default"], estimated_time: "10 min" },
    { step: 5, phase: "VERIFY", title: "Confirm Private and Report Exposure", description: "Verify snapshot is private, encrypt any unencrypted copies, and document the incident.", commands: ["aws ec2 describe-snapshot-attribute --snapshot-id snap-0a1b2c3d4e5f6789 --attribute createVolumePermission", "# Copy to encrypted snapshot:", "aws ec2 copy-snapshot --source-region us-east-1 --source-snapshot-id snap-0a1b2c3d4e5f6789 --encrypted --kms-key-id alias/aws/ebs"], estimated_time: "15 min" },
  ],
  "ec2-004": [
    { step: 1, phase: "IDENTIFY", title: "Find All IMDSv1 Instances", description: "Enumerate all instances with HttpTokens=optional (IMDSv1 enabled) across the region.", commands: ["aws ec2 describe-instances --query 'Reservations[*].Instances[?MetadataOptions.HttpTokens==`optional`].[InstanceId,InstanceType,MetadataOptions.HttpTokens]' --output table"], estimated_time: "3 min" },
    { step: 2, phase: "IDENTIFY", title: "Test Application Compatibility", description: "Check if application code uses IMDSv1 (path-style metadata URL without session token).", commands: ["# Search codebase for IMDSv1 patterns:", "grep -r '169.254.169.254' /opt/app --include='*.py' --include='*.js' --include='*.go'", "# Check if app uses AWS SDK (SDKs support IMDSv2 automatically in modern versions):", "pip show boto3 | grep Version  # Should be >= 1.15.0"], estimated_time: "10 min" },
    { step: 3, phase: "REMEDIATE", title: "Enforce IMDSv2 on Instance", description: "Set HttpTokens=required. No restart needed. Monitor CloudWatch for metadata call errors.", commands: ["aws ec2 modify-instance-metadata-options --instance-id i-0d4e5f6789abcdef0 --http-tokens required --http-put-response-hop-limit 1 --http-endpoint enabled", "# Enforce org-wide via SCP:", "# Deny ec2:RunInstances where ec2:MetadataHttpTokens = optional"], estimated_time: "5 min" },
    { step: 4, phase: "VERIFY", title: "Confirm IMDSv2 Enforced", description: "Verify the change and confirm the application is functioning without IMDSv1.", commands: ["aws ec2 describe-instances --instance-ids i-0d4e5f6789abcdef0 --query 'Reservations[0].Instances[0].MetadataOptions'", "# Test IMDSv1 is now blocked (should return 401):", "curl http://169.254.169.254/latest/meta-data/ -w '%{http_code}'"], estimated_time: "5 min" },
  ],
  "ec2-005": [
    { step: 1, phase: "IDENTIFY", title: "List All Unencrypted Volumes", description: "Find all unencrypted EBS volumes attached to running instances.", commands: ["aws ec2 describe-volumes --filters Name=encrypted,Values=false --query 'Volumes[*].[VolumeId,Attachments[0].InstanceId,Size,VolumeType]' --output table"], estimated_time: "3 min" },
    { step: 2, phase: "REMEDIATE", title: "Enable EBS Encryption by Default", description: "Enable account-level EBS encryption so all NEW volumes are automatically encrypted.", commands: ["aws ec2 enable-ebs-encryption-by-default", "# Verify:", "aws ec2 get-ebs-encryption-by-default"], estimated_time: "2 min" },
    { step: 3, phase: "REMEDIATE", title: "Re-encrypt Existing Volume", description: "Create an encrypted copy of the existing unencrypted root volume. Schedule maintenance window.", commands: ["# 1. Stop instance (or create snapshot while running):", "aws ec2 stop-instances --instance-ids i-0e5f6789abcdef012", "# 2. Create snapshot:", "aws ec2 create-snapshot --volume-id vol-0a1b2c3d4e5f6789 --description 'Pre-encryption backup'", "# 3. Copy snapshot with encryption:", "aws ec2 copy-snapshot --source-region us-east-1 --source-snapshot-id snap-xxxx --encrypted --kms-key-id alias/aws/ebs", "# 4. Create encrypted volume from snapshot:", "aws ec2 create-volume --snapshot-id snap-encrypted --encrypted --availability-zone us-east-1a", "# 5. Swap root volume (requires instance stop)"], estimated_time: "45 min" },
    { step: 4, phase: "VERIFY", title: "Confirm Volume Encrypted", description: "Verify the new root volume is encrypted and the instance boots correctly.", commands: ["aws ec2 describe-volumes --volume-ids vol-newencryptedid --query 'Volumes[0].Encrypted'", "aws ec2 start-instances --instance-ids i-0e5f6789abcdef012"], estimated_time: "10 min" },
  ],
  "ec2-006": [
    { step: 1, phase: "IDENTIFY", title: "Assess AMI Age and Vulnerability Exposure", description: "Check the AMI creation date and run Inspector scan to identify specific CVEs.", commands: ["aws ec2 describe-images --image-ids ami-0a1b2c3d4e5f6789 --query 'Images[0].[CreationDate,Description,Platform]'", "# Check Inspector findings for this instance:", "aws inspector2 list-findings --filter-criteria '{\"ec2InstanceImageId\":[{\"comparison\":\"EQUALS\",\"value\":\"ami-0a1b2c3d4e5f6789\"}]}'"], estimated_time: "5 min" },
    { step: 2, phase: "REMEDIATE", title: "Build Updated AMI with EC2 Image Builder", description: "Create a new AMI from the latest OS baseline with all current patches applied.", commands: ["# Create Image Builder pipeline (or use console):", "aws imagebuilder create-image-pipeline --name reporting-svc-pipeline --image-recipe-arn arn:aws:imagebuilder:us-east-1:123456789012:image-recipe/amazon-linux-2023-base/1.0.0 --infrastructure-configuration-arn arn:aws:imagebuilder:...", "# Start build:", "aws imagebuilder start-image-pipeline-execution --image-pipeline-arn arn:aws:imagebuilder:..."], estimated_time: "60 min" },
    { step: 3, phase: "REMEDIATE", title: "Blue-Green Redeploy", description: "Launch new instance from updated AMI, validate, then terminate old instance.", commands: ["# Launch from new AMI:", "aws ec2 run-instances --image-id ami-newpatched --instance-type t3.small --iam-instance-profile Name=ReportingSvcProfile --security-group-ids sg-reporting --subnet-id subnet-private-1b", "# After validation, terminate old instance:", "aws ec2 terminate-instances --instance-ids i-0f6789abcdef01234"], estimated_time: "30 min" },
    { step: 4, phase: "VERIFY", title: "Confirm Updated AMI and Re-run Inspector", description: "Verify the new instance uses the patched AMI and passes Inspector scan.", commands: ["aws ec2 describe-instances --instance-ids i-newinstance --query 'Reservations[0].Instances[0].ImageId'", "aws inspector2 list-findings --filter-criteria '{\"ec2InstanceId\":[{\"comparison\":\"EQUALS\",\"value\":\"i-newinstance\"}]}'"], estimated_time: "15 min" },
  ],
  "ec2-008": [
    { step: 1, phase: "IDENTIFY", title: "Identify Instances Not Managed by SSM", description: "Find all instances not reporting to Systems Manager.", commands: ["aws ssm describe-instance-information --query 'InstanceInformationList[*].[InstanceId,PingStatus,AgentVersion]' --output table", "# Find EC2 instances NOT in SSM:", "comm -23 <(aws ec2 describe-instances --query 'Reservations[*].Instances[*].InstanceId' --output text | tr ' ' '\\n' | sort) <(aws ssm describe-instance-information --query 'InstanceInformationList[*].InstanceId' --output text | tr ' ' '\\n' | sort)"], estimated_time: "5 min" },
    { step: 2, phase: "REMEDIATE", title: "Attach SSM Managed Instance Core Policy", description: "The instance role must have AmazonSSMManagedInstanceCore to register with SSM.", commands: ["aws iam attach-role-policy --role-name WorkerNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"], estimated_time: "2 min" },
    { step: 3, phase: "REMEDIATE", title: "Install and Start SSM Agent", description: "Install SSM Agent on the instance via EC2 userdata or run command if another agent is reachable.", commands: ["# If accessible via SSH:", "sudo yum install -y amazon-ssm-agent && sudo systemctl start amazon-ssm-agent && sudo systemctl enable amazon-ssm-agent", "# Verify agent version:", "sudo systemctl status amazon-ssm-agent"], estimated_time: "10 min" },
    { step: 4, phase: "VERIFY", title: "Confirm SSM Registration", description: "Verify the instance appears in SSM Fleet Manager with Online status.", commands: ["aws ssm describe-instance-information --filters Key=InstanceIds,Values=i-0g789abcdef012345 --query 'InstanceInformationList[0].[PingStatus,AgentVersion,LastPingDateTime]'"], estimated_time: "5 min" },
  ],
  "ec2-009": [
    { step: 1, phase: "IDENTIFY", title: "Audit Missing Tags Across All Instances", description: "Find all instances missing the required tag keys.", commands: ["aws ec2 describe-instances --query 'Reservations[*].Instances[*].{ID:InstanceId,Name:Tags[?Key==`Name`]|[0].Value,Owner:Tags[?Key==`Owner`]|[0].Value,Env:Tags[?Key==`Environment`]|[0].Value}' --output table | grep -v Owner"], estimated_time: "5 min" },
    { step: 2, phase: "REMEDIATE", title: "Apply Required Tags", description: "Apply all required tags to the instance. Contact cost center and team lead to confirm values.", commands: ["aws ec2 create-tags --resources i-0h89abcdef0123456 --tags Key=Environment,Value=Production Key=Owner,Value=platform-team Key=CostCenter,Value=eng-001 Key=DataClassification,Value=Internal"], estimated_time: "5 min" },
    { step: 3, phase: "REMEDIATE", title: "Enforce Tags via AWS Config", description: "Enable the required-tags Config rule to continuously detect untagged instances.", commands: ["aws configservice put-config-rule --config-rule '{\"ConfigRuleName\":\"required-tags\",\"Source\":{\"Owner\":\"AWS\",\"SourceIdentifier\":\"REQUIRED_TAGS\"},\"InputParameters\":\"{\\\"tag1Key\\\":\\\"Owner\\\",\\\"tag2Key\\\":\\\"Environment\\\"}'"], estimated_time: "10 min" },
    { step: 4, phase: "VERIFY", title: "Confirm Tags and Config Compliance", description: "Verify all required tags are present and the instance passes the Config rule.", commands: ["aws ec2 describe-tags --filters Name=resource-id,Values=i-0h89abcdef0123456 --query 'Tags[*].[Key,Value]' --output table", "aws configservice get-compliance-details-by-config-rule --config-rule-name required-tags --compliance-types COMPLIANT"], estimated_time: "3 min" },
  ],
  "ec2-010": [
    { step: 1, phase: "IDENTIFY", title: "Identify All Services Using This Security Group", description: "Enumerate all instances and resources using sg-all-open to understand the full impact.", commands: ["aws ec2 describe-network-interfaces --filters Name=group-id,Values=sg-all-open --query 'NetworkInterfaces[*].[NetworkInterfaceId,Attachment.InstanceId,Description]' --output table"], estimated_time: "3 min" },
    { step: 2, phase: "IDENTIFY", title: "Analyze Actual Traffic Patterns", description: "Use VPC Flow Logs to determine which ports are actually being used — base new rules on real traffic.", commands: ["aws logs filter-log-events --log-group-name /aws/vpc/flowlogs --filter-pattern '[version, account_id, interface_id, srcaddr, dstaddr, srcport, dstport, protocol=6, packets, bytes, start, end, action=ACCEPT, log_status]' | jq '.events[].message' | awk '{print $7}' | sort | uniq -c | sort -rn | head -20"], estimated_time: "10 min" },
    { step: 3, phase: "REMEDIATE", title: "Create Replacement Scoped Security Group", description: "Create a new SG with specific port rules based on Flow Log analysis. Replace broad rule.", commands: ["# Create new SG:", "aws ec2 create-security-group --group-name sg-app-scoped --description 'Scoped replacement for sg-all-open' --vpc-id vpc-0a1b2c3d", "# Add specific rules (example — adjust based on Flow Log analysis):", "aws ec2 authorize-security-group-ingress --group-id sg-newscoped --protocol tcp --port 8080 --source-group sg-load-balancer", "aws ec2 authorize-security-group-ingress --group-id sg-newscoped --protocol tcp --port 5432 --source-group sg-database"], estimated_time: "20 min" },
    { step: 4, phase: "VERIFY", title: "Swap SG and Validate Application", description: "Attach new SG to instance, remove old SG, confirm application remains functional.", commands: ["aws ec2 modify-instance-attribute --instance-id i-0i9abcdef01234567 --groups sg-newscoped", "# Verify old all-open SG is detached:", "aws ec2 describe-instance-attribute --instance-id i-0i9abcdef01234567 --attribute groupSet"], estimated_time: "10 min" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW STATE — Replace with GET /api/workflows?account=123456789012
// SLA: CRITICAL=4h, HIGH=24h, MEDIUM=7d, LOW=30d
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const h = (hours: number) => new Date(now - hours * 3600000).toISOString();
const sla = (hours: number) => new Date(now + hours * 3600000).toISOString();

const INITIAL_WORKFLOWS: Record<string, FindingWorkflow> = {
  "ec2-001": {
    finding_id: "ec2-001", status: "IN_PROGRESS", assignee: "Sarah Chen", assignee_team: "Cloud Security",
    ticket_id: "SEC-1847", sla_deadline: sla(-2), sla_hours_remaining: -2, sla_breached: true,
    first_seen: h(8), last_updated: h(1),
    timeline: [
      { id: "t1", timestamp: h(1), actor: "Sarah Chen", actor_type: "engineer", action: "Status changed to IN_PROGRESS", note: "Revoked 0.0.0.0/0 rule. Testing SSM connectivity." },
      { id: "t2", timestamp: h(4), actor: "Marcus Webb", actor_type: "analyst", action: "Assigned to Sarah Chen", note: "Confirmed true positive. SLA breach imminent." },
      { id: "t3", timestamp: h(6), actor: "System", actor_type: "system", action: "SLA BREACH — 4h SLA exceeded for CRITICAL finding", note: "Auto-escalated to Cloud Security lead" },
      { id: "t4", timestamp: h(8), actor: "GuardDuty", actor_type: "system", action: "Finding detected — SSH 0.0.0.0/0 on sg-web-public", note: "Auto-ingested from SecurityHub" },
    ],
  },
  "ec2-002": {
    finding_id: "ec2-002", status: "TRIAGED", assignee: "Marcus Webb", assignee_team: "SOC L2",
    ticket_id: null, sla_deadline: sla(0.75), sla_hours_remaining: 0.75, sla_breached: false,
    first_seen: h(3.25), last_updated: h(0.5),
    timeline: [
      { id: "t1", timestamp: h(0.5), actor: "Marcus Webb", actor_type: "analyst", action: "Triaged — Confirmed true positive", note: "RDP exposed. Escalating for immediate containment. 45min SLA remaining." },
      { id: "t2", timestamp: h(3.25), actor: "SecurityHub", actor_type: "system", action: "Finding detected — RDP 0.0.0.0/0 on sg-bastion", note: "CRITICAL — CIS 5.3 violation" },
    ],
  },
  "ec2-003": {
    finding_id: "ec2-003", status: "ASSIGNED", assignee: "Infra Team", assignee_team: "Infrastructure",
    ticket_id: "SEC-1851", sla_deadline: sla(-6), sla_hours_remaining: -6, sla_breached: true,
    first_seen: h(14), last_updated: h(2),
    timeline: [
      { id: "t1", timestamp: h(2), actor: "Infra Team", actor_type: "engineer", action: "Investigating IAM Access Analyzer output", note: "Running policy generation from CloudTrail. ETA 2h." },
      { id: "t2", timestamp: h(6), actor: "System", actor_type: "system", action: "SLA BREACH — CRITICAL finding overdue by 2h", note: "Escalated to CISO dashboard" },
      { id: "t3", timestamp: h(10), actor: "Marcus Webb", actor_type: "analyst", action: "Assigned to Infra Team — ticket SEC-1851 created", note: "AdministratorAccess on 3 prod instances. Priority P0." },
      { id: "t4", timestamp: h(14), actor: "AWS Config", actor_type: "system", action: "Config rule violation: iam-no-inline-policy", note: "Detected AdministratorAccess instance profile" },
    ],
  },
  "ec2-007": {
    finding_id: "ec2-007", status: "NEW", assignee: null, assignee_team: null,
    ticket_id: null, sla_deadline: sla(3.5), sla_hours_remaining: 3.5, sla_breached: false,
    first_seen: h(0.5), last_updated: h(0.5),
    timeline: [
      { id: "t1", timestamp: h(0.5), actor: "AWS Config", actor_type: "system", action: "Finding detected — Public EBS snapshot", note: "Rule: ec2-ebs-snapshot-public-restorable-check — CRITICAL" },
    ],
  },
  "ec2-004": {
    finding_id: "ec2-004", status: "IN_PROGRESS", assignee: "Dev Patel", assignee_team: "Platform Eng",
    ticket_id: "SEC-1843", sla_deadline: sla(8), sla_hours_remaining: 8, sla_breached: false,
    first_seen: h(16), last_updated: h(3),
    timeline: [
      { id: "t1", timestamp: h(3), actor: "Dev Patel", actor_type: "engineer", action: "Testing application compatibility with IMDSv2", note: "SDK version confirmed compatible. Scheduling enforcement." },
      { id: "t2", timestamp: h(8), actor: "Priya Singh", actor_type: "analyst", action: "Assigned to Dev Patel", note: "9 instances with IMDSv1. SEC-1843 created." },
      { id: "t3", timestamp: h(16), actor: "Inspector2", actor_type: "system", action: "Finding detected — IMDSv1 enabled on db-migration-01", note: "SSRF risk identified" },
    ],
  },
  "ec2-005": {
    finding_id: "ec2-005", status: "TRIAGED", assignee: "Dev Patel", assignee_team: "Platform Eng",
    ticket_id: "SEC-1849", sla_deadline: sla(16), sla_hours_remaining: 16, sla_breached: false,
    first_seen: h(8), last_updated: h(2),
    timeline: [
      { id: "t1", timestamp: h(2), actor: "Dev Patel", actor_type: "engineer", action: "Scheduled maintenance window for volume re-encryption", note: "Window: Saturday 02:00-04:00 UTC" },
      { id: "t2", timestamp: h(8), actor: "SecurityHub", actor_type: "system", action: "Finding detected — Unencrypted root EBS vol on api-server-01" },
    ],
  },
  "ec2-006": {
    finding_id: "ec2-006", status: "REMEDIATED", assignee: "Sarah Chen", assignee_team: "Cloud Security",
    ticket_id: "SEC-1801", sla_deadline: sla(999), sla_hours_remaining: 999, sla_breached: false,
    first_seen: h(72), last_updated: h(4),
    timeline: [
      { id: "t1", timestamp: h(4), actor: "Sarah Chen", actor_type: "engineer", action: "Remediation verified — New AMI ami-0newpatched confirmed", note: "Inspector scan clean. Old instance terminated." },
      { id: "t2", timestamp: h(6), actor: "Sarah Chen", actor_type: "engineer", action: "New instance launched from updated AMI ami-0newpatched" },
      { id: "t3", timestamp: h(24), actor: "Sarah Chen", actor_type: "engineer", action: "EC2 Image Builder pipeline created and run", note: "Amazon Linux 2023 base + patches applied" },
      { id: "t4", timestamp: h(72), actor: "Inspector2", actor_type: "system", action: "Finding detected — AMI age 547 days on reporting-svc" },
    ],
  },
  "ec2-010": {
    finding_id: "ec2-010", status: "ASSIGNED", assignee: "Infra Team", assignee_team: "Infrastructure",
    ticket_id: "SEC-1853", sla_deadline: sla(-4), sla_hours_remaining: -4, sla_breached: true,
    first_seen: h(12), last_updated: h(1),
    timeline: [
      { id: "t1", timestamp: h(1), actor: "Infra Team", actor_type: "engineer", action: "Analyzing VPC Flow Logs for actual port usage", note: "Building replacement SG based on real traffic." },
      { id: "t2", timestamp: h(4), actor: "System", actor_type: "system", action: "SLA BREACH — HIGH finding overdue", note: "Escalated to team lead" },
      { id: "t3", timestamp: h(12), actor: "AWS Config", actor_type: "system", action: "Finding detected — Security group allows all traffic 0-65535" },
    ],
  },
  "ec2-008": {
    finding_id: "ec2-008", status: "IN_PROGRESS", assignee: "Dev Patel", assignee_team: "Platform Eng",
    ticket_id: "SEC-1840", sla_deadline: sla(48), sla_hours_remaining: 48, sla_breached: false,
    first_seen: h(120), last_updated: h(6),
    timeline: [
      { id: "t1", timestamp: h(6), actor: "Dev Patel", actor_type: "engineer", action: "SSM VPC endpoint configured. Deploying agent via Ansible.", note: "5 instances queued. worker-node-03 in progress." },
      { id: "t2", timestamp: h(120), actor: "SecurityHub", actor_type: "system", action: "Finding detected — SSM agent not reachable on worker-node-03" },
    ],
  },
  "ec2-009": {
    finding_id: "ec2-009", status: "RISK_ACCEPTED", assignee: "Marcus Webb", assignee_team: "SOC L2",
    ticket_id: null, sla_deadline: sla(999), sla_hours_remaining: 999, sla_breached: false,
    first_seen: h(240), last_updated: h(48),
    risk_acceptance_note: "Legacy instance pending decommission by end of Q2. Tagging backlog approved by CISO. No sensitive data on instance.",
    risk_acceptance_expiry: new Date(now + 90 * 24 * 3600000).toISOString(),
    timeline: [
      { id: "t1", timestamp: h(48), actor: "Marcus Webb", actor_type: "analyst", action: "Risk accepted — approved by CISO", note: "Instance decommission planned Q2. Risk expiry 90 days." },
      { id: "t2", timestamp: h(240), actor: "AWS Config", actor_type: "system", action: "Finding detected — required-tags non-compliant" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = { CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88" };
const SEVERITY_BG: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: "rgba(255,0,64,0.15)", color: "#ff0040" },
  HIGH: { bg: "rgba(255,107,53,0.15)", color: "#ff6b35" },
  MEDIUM: { bg: "rgba(255,176,0,0.15)", color: "#ffb000" },
  LOW: { bg: "rgba(0,255,136,0.15)", color: "#00ff88" },
};

const WORKFLOW_META: Record<WorkflowStatus, { label: string; color: string; bg: string }> = {
  NEW:              { label: "NEW",              color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  TRIAGED:          { label: "TRIAGED",          color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  ASSIGNED:         { label: "ASSIGNED",         color: "#06b6d4", bg: "rgba(6,182,212,0.12)"   },
  IN_PROGRESS:      { label: "IN PROGRESS",      color: "#ffb000", bg: "rgba(255,176,0,0.12)"   },
  PENDING_VERIFY:   { label: "PENDING VERIFY",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  REMEDIATED:       { label: "REMEDIATED",       color: "#00ff88", bg: "rgba(0,255,136,0.12)"   },
  RISK_ACCEPTED:    { label: "RISK ACCEPTED",    color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  FALSE_POSITIVE:   { label: "FALSE POSITIVE",   color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const PHASE_META: Record<PlaybookPhase, { color: string; label: string }> = {
  IDENTIFY:  { color: "#818cf8", label: "IDENTIFY"  },
  CONTAIN:   { color: "#ff6b35", label: "CONTAIN"   },
  REMEDIATE: { color: "#ffb000", label: "REMEDIATE" },
  VERIFY:    { color: "#00ff88", label: "VERIFY"    },
};

const ACTOR_COLORS: Record<string, string> = {
  system: "#64748b", analyst: "#818cf8", engineer: "#06b6d4", automation: "#a78bfa",
};

const WORKFLOW_PIPELINE: WorkflowStatus[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REMEDIATED"];

const NEXT_STATUS: Partial<Record<WorkflowStatus, WorkflowStatus>> = {
  NEW: "TRIAGED", TRIAGED: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "PENDING_VERIFY", PENDING_VERIFY: "REMEDIATED",
};

const ASSIGNEES = ["Sarah Chen", "Marcus Webb", "Dev Patel", "Priya Singh", "Infra Team", "Platform Eng", "SOC L2"];

const cs: React.CSSProperties = { background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 };
const ls: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" };
const ms: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function EC2Security() {
  const [scanResult, setScanResult] = useState<EC2ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [workflows, setWorkflows] = useState<Record<string, FindingWorkflow>>(INITIAL_WORKFLOWS);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    setScanResult({
      scan_id: "ec2-scan-demo-456", status: "Completed", progress: 100, account_id: "123456789012",
      region: "us-east-1", total_instances: mockScanSummary.total_instances, findings: mockFindings,
      scan_summary: { running_instances: mockScanSummary.running_instances, stopped_instances: mockScanSummary.stopped_instances, critical_findings: mockScanSummary.critical_findings, high_findings: mockScanSummary.high_findings, medium_findings: mockScanSummary.medium_findings, low_findings: mockScanSummary.low_findings, publicly_accessible: mockScanSummary.publicly_accessible, unencrypted_volumes: mockScanSummary.unencrypted_volumes },
      started_at: new Date(Date.now() - 240000).toISOString(), completed_at: new Date(Date.now() - 180000).toISOString(),
    });
  }, []);

  useEffect(() => {
    if (scanResult?.status === "Completed" && scanResult.scan_id !== "ec2-scan-demo-456") {
      toast.success("EC2 security scan completed!");
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true); setError(null);
    try {
      toast.info("EC2 security scan started");
      setScanResult({ scan_id: "loading", status: "Running", progress: 0, account_id: "", region: selectedRegion, total_instances: 0, findings: [], scan_summary: { running_instances: 0, stopped_instances: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0, publicly_accessible: 0, unencrypted_volumes: 0 } });
      const response: ScanResponse = await scanEC2(selectedRegion);
      setScanResult({ scan_id: response.scan_id, status: response.status === "completed" ? "Completed" : "Failed", progress: 100, account_id: response.results?.account_id || "N/A", region: response.region, total_instances: response.results?.instances?.total || 0, findings: response.results?.findings || mockFindings, scan_summary: { running_instances: response.results?.instances?.running || 0, stopped_instances: response.results?.instances?.stopped || 0, publicly_accessible: response.results?.instances?.public || 0, unencrypted_volumes: response.results?.instances?.unencrypted_volumes || 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0 } });
      setIsScanning(false); addScanResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error"); setIsScanning(false);
      toast.error("Scan failed — showing demo data");
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("EC2 scan stopped");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setActiveTab(prev => ({ ...prev, [id]: prev[id] ?? "playbook" }));
  };

  // PATCH /api/workflows/{finding_id} — Replace with real API call
  const advanceStatus = useCallback((findingId: string, actor = "Current User") => {
    setWorkflows(prev => {
      const w = prev[findingId]; if (!w) return prev;
      const next = NEXT_STATUS[w.status]; if (!next) return prev;
      const event: TimelineEvent = { id: `t-${Date.now()}`, timestamp: new Date().toISOString(), actor, actor_type: "analyst", action: `Status changed to ${next}`, note: "Updated via dashboard" };
      return { ...prev, [findingId]: { ...w, status: next, last_updated: new Date().toISOString(), timeline: [event, ...w.timeline] } };
    });
  }, []);

  const assignFinding = useCallback((findingId: string, assignee: string) => {
    setWorkflows(prev => {
      const w = prev[findingId]; if (!w) return prev;
      const event: TimelineEvent = { id: `t-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Current User", actor_type: "analyst", action: `Assigned to ${assignee}`, note: "Assigned via dashboard" };
      return { ...prev, [findingId]: { ...w, assignee, status: w.status === "NEW" || w.status === "TRIAGED" ? "ASSIGNED" : w.status, last_updated: new Date().toISOString(), timeline: [event, ...w.timeline] } };
    });
  }, []);

  const markFalsePositive = useCallback((findingId: string) => {
    setWorkflows(prev => {
      const w = prev[findingId]; if (!w) return prev;
      const event: TimelineEvent = { id: `t-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Current User", actor_type: "analyst", action: "Marked as FALSE POSITIVE", note: "Suppressed — requires review in 90 days" };
      return { ...prev, [findingId]: { ...w, status: "FALSE_POSITIVE", last_updated: new Date().toISOString(), timeline: [event, ...w.timeline] } };
    });
    toast.success("Marked as false positive", { description: "Finding suppressed. Will resurface in 90 days for review." });
  }, []);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => { setCopiedCmd(cmd); setTimeout(() => setCopiedCmd(null), 2000); });
  };

  const findings = scanResult?.findings ?? mockFindings;
  const filteredFindings = findings.filter(f => {
    const w = workflows[f.id];
    const matchSev = severityFilter === "ALL" || f.severity === severityFilter;
    const matchStatus = statusFilter === "ALL" || w?.status === statusFilter;
    const matchSearch = findingSearch === "" || f.instance_name.toLowerCase().includes(findingSearch.toLowerCase()) || f.finding_type.toLowerCase().includes(findingSearch.toLowerCase()) || f.instance_id.toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchStatus && matchSearch;
  });

  const summary = scanResult?.scan_summary ?? { running_instances: mockScanSummary.running_instances, stopped_instances: mockScanSummary.stopped_instances, critical_findings: mockScanSummary.critical_findings, high_findings: mockScanSummary.high_findings, medium_findings: mockScanSummary.medium_findings, low_findings: mockScanSummary.low_findings, publicly_accessible: mockScanSummary.publicly_accessible, unencrypted_volumes: mockScanSummary.unencrypted_volumes };
  const totalInstances = scanResult?.total_instances ?? mockScanSummary.total_instances;

  const slaBreaches = Object.values(workflows).filter(w => w.sla_breached && w.status !== "REMEDIATED" && w.status !== "FALSE_POSITIVE" && w.status !== "RISK_ACCEPTED").length;
  const openFindings = Object.values(workflows).filter(w => !["REMEDIATED", "FALSE_POSITIVE", "RISK_ACCEPTED"].includes(w.status)).length;
  const remediatedFindings = Object.values(workflows).filter(w => w.status === "REMEDIATED").length;

  // Pipeline counts
  const pipelineCounts = WORKFLOW_PIPELINE.reduce((acc, s) => {
    acc[s] = Object.values(workflows).filter(w => w.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Server size={22} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>EC2 &amp; Compute</h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(100,116,139,0.7)", marginTop: 2 }}>Security posture · Workflow triage · Runbook remediation</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} style={{ ...ms, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
            <option value="ap-southeast-1">ap-southeast-1</option>
          </select>
          <button onClick={handleStartScan} disabled={isScanning} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: isScanning ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: isScanning ? "not-allowed" : "pointer" }}>
            <Play size={13} />{isScanning ? "Scanning…" : "Run Scan"}
          </button>
          {isScanning && <button onClick={handleStopScan} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: "rgba(255,0,64,0.2)", border: "1px solid rgba(255,0,64,0.4)", color: "#ff0040", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Stop</button>}
          <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.3)", color: "#ff0040", fontSize: 13 }}><AlertTriangle size={13} style={{ display: "inline", marginRight: 6 }} />Scan Error: {error}</div>}

      {/* KPI Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {[
          { label: "Total Instances", value: totalInstances, color: "#818cf8", sub: `${summary.running_instances}↑ ${summary.stopped_instances}↓` },
          { label: "SLA Breaches", value: slaBreaches, color: "#ff0040", sub: "Active overdue" },
          { label: "Open Critical", value: summary.critical_findings, color: "#ff0040", sub: "Immediate action" },
          { label: "Open High", value: summary.high_findings, color: "#ff6b35", sub: "Within 24h SLA" },
          { label: "Remediated", value: remediatedFindings, color: "#00ff88", sub: "Confirmed closed" },
          { label: "Open Findings", value: openFindings, color: "#ffb000", sub: "Across all severities" },
        ].map(card => (
          <div key={card.label} style={{ ...cs, padding: "14px 16px" }}>
            <p style={{ ...ls, margin: "0 0 6px" }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: card.color, ...ms, lineHeight: 1 }}>{card.value}</p>
            <p style={{ margin: "5px 0 0", fontSize: 10, color: "rgba(100,116,139,0.6)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Workflow Pipeline */}
      <div style={{ ...cs, padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <GitBranch size={13} color="rgba(100,116,139,0.7)" />
          <span style={{ ...ls }}>Workflow Pipeline</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {WORKFLOW_PIPELINE.map((stage, idx) => {
            const meta = WORKFLOW_META[stage];
            const count = pipelineCounts[stage] ?? 0;
            const isLast = idx === WORKFLOW_PIPELINE.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  onClick={() => setStatusFilter(statusFilter === stage ? "ALL" : stage)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: statusFilter === stage ? meta.bg : "rgba(255,255,255,0.02)", border: `1px solid ${statusFilter === stage ? meta.color + "50" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", ...ms }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", letterSpacing: "0.1em", marginTop: 2, ...ms }}>{meta.label}</div>
                </div>
                {!isLast && <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}><div style={{ position: "absolute", right: -3, top: -4, color: "rgba(100,116,139,0.3)", fontSize: 8 }}>▶</div></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Indicators Strip */}
      <div style={{ ...cs, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...ls, marginRight: 4 }}>Risk Indicators</span>
        {[
          { label: `SSH: ${mockScanSummary.unrestricted_ssh} exposed`, color: "#ff0040" },
          { label: `RDP: ${mockScanSummary.unrestricted_rdp} exposed`, color: "#ff0040" },
          { label: `IMDSv1: ${mockScanSummary.imdsv1_enabled} instances`, color: "#ffb000" },
          { label: `No SSM: ${mockScanSummary.missing_ssm} instances`, color: "#ff6b35" },
          { label: `Public IPs: ${summary.publicly_accessible}`, color: "#ffb000" },
          { label: `Unenc. Vols: ${summary.unencrypted_volumes}`, color: "#ff6b35" },
        ].map(chip => (
          <span key={chip.label} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${chip.color}18`, border: `1px solid ${chip.color}40`, color: chip.color, ...ms }}>{chip.label}</span>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => {
            const active = severityFilter === sev;
            const col = sev === "ALL" ? "#818cf8" : SEVERITY_COLORS[sev];
            return (
              <button key={sev} onClick={() => setSeverityFilter(sev)} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", ...ms, background: active ? `${col}25` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? col : "rgba(255,255,255,0.08)"}`, color: active ? col : "rgba(100,116,139,0.7)", transition: "all 0.15s" }}>{sev}</button>
            );
          })}
        </div>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
        {statusFilter !== "ALL" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, ...ms, color: "rgba(100,116,139,0.6)" }}>STATUS:</span>
            <button onClick={() => setStatusFilter("ALL")} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${WORKFLOW_META[statusFilter as WorkflowStatus]?.color}20`, border: `1px solid ${WORKFLOW_META[statusFilter as WorkflowStatus]?.color}50`, color: WORKFLOW_META[statusFilter as WorkflowStatus]?.color, cursor: "pointer", ...ms }}>
              {WORKFLOW_META[statusFilter as WorkflowStatus]?.label} ✕
            </button>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
          <input value={findingSearch} onChange={e => setFindingSearch(e.target.value)} placeholder="Search findings, instances, IDs…" style={{ width: "100%", padding: "7px 10px 7px 30px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", ...ms }} />
        </div>
        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", ...ms }}>{filteredFindings.length} findings</span>
      </div>

      {/* Findings Table */}
      <div style={cs}>
        <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 140px 130px 110px 120px 90px", gap: 0, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
          <div />
          <span style={{ ...ls, paddingLeft: 12 }}>Instance / Finding</span>
          <span style={ls}>Severity</span>
          <span style={ls}>Status</span>
          <span style={ls}>SLA</span>
          <span style={ls}>Assignee</span>
          <span style={ls}>Risk /10</span>
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Server size={40} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 14, margin: 0 }}>No findings match your filters</p>
          </div>
        ) : filteredFindings.map((finding, idx) => {
          const expanded = expandedRows.has(finding.id);
          const tab = activeTab[finding.id] ?? "playbook";
          const w = workflows[finding.id];
          const wMeta = w ? WORKFLOW_META[w.status] : WORKFLOW_META["NEW"];
          const sevColor = SEVERITY_COLORS[finding.severity] ?? "#64748b";
          const isLast = idx === filteredFindings.length - 1;
          const playbook = PLAYBOOKS[finding.id] ?? [];

          return (
            <div key={finding.id}>
              {/* Row */}
              <div
                onClick={() => toggleRow(finding.id)}
                style={{ display: "grid", gridTemplateColumns: "4px 1fr 140px 130px 110px 120px 90px", gap: 0, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: (!isLast || expanded) ? "1px solid rgba(255,255,255,0.04)" : "none", background: expanded ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)"; }}
                onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{ position: "relative", height: "100%" }}>
                  <div style={{ position: "absolute", left: 0, width: 4, top: -12, bottom: -12, background: sevColor, borderRadius: "0 2px 2px 0", opacity: 0.85 }} />
                </div>
                <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ flexShrink: 0 }}>{expanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{finding.instance_name}</div>
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", ...ms, marginTop: 1 }}>{finding.instance_id}</div>
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{finding.finding_type}</div>
                  </div>
                </div>
                <div>
                  <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: SEVERITY_BG[finding.severity]?.bg, color: sevColor, ...ms }}>{finding.severity}</span>
                </div>
                <div>
                  <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: wMeta.bg, color: wMeta.color, ...ms }}>{wMeta.label}</span>
                  {w?.sla_breached && w.status !== "REMEDIATED" && w.status !== "RISK_ACCEPTED" && w.status !== "FALSE_POSITIVE" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                      <AlertTriangle size={9} color="#ff0040" />
                      <span style={{ fontSize: 9, color: "#ff0040", ...ms }}>SLA BREACH</span>
                    </div>
                  )}
                </div>
                <div>
                  {w && w.status !== "REMEDIATED" && w.status !== "RISK_ACCEPTED" && w.status !== "FALSE_POSITIVE" ? (
                    <div>
                      <span style={{ fontSize: 11, color: w.sla_breached ? "#ff0040" : w.sla_hours_remaining < 4 ? "#ffb000" : "#00ff88", ...ms, fontWeight: 600 }}>
                        {w.sla_breached ? `${Math.abs(Math.round(w.sla_hours_remaining))}h overdue` : w.sla_hours_remaining < 24 ? `${Math.round(w.sla_hours_remaining)}h left` : `${Math.round(w.sla_hours_remaining / 24)}d left`}
                      </span>
                      <div style={{ fontSize: 9, color: "rgba(100,116,139,0.5)", marginTop: 1 }}>{finding.severity === "CRITICAL" ? "4h SLA" : finding.severity === "HIGH" ? "24h SLA" : finding.severity === "MEDIUM" ? "7d SLA" : "30d SLA"}</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "rgba(100,116,139,0.4)", ...ms }}>—</span>
                  )}
                </div>
                <div>
                  {w?.assignee ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>
                        {w.assignee.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.assignee}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "rgba(100,116,139,0.3)", ...ms }}>Unassigned</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: finding.risk_score >= 9 ? "#ff0040" : finding.risk_score >= 7 ? "#ff6b35" : finding.risk_score >= 5 ? "#ffb000" : "#00ff88", ...ms }}>
                    {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>/10</span>
                  </span>
                </div>
              </div>

              {/* Expanded Workflow Panel */}
              {expanded && (
                <div style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(5,10,20,0.4)" }}>

                  {/* Workflow Action Bar */}
                  <div style={{ padding: "10px 20px 10px 36px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ ...ls, marginRight: 6 }}>Workflow</span>
                    {w && NEXT_STATUS[w.status] && (
                      <button onClick={() => { advanceStatus(finding.id); toast.success(`Status → ${NEXT_STATUS[w.status]}`); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 5, background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        <Activity size={11} /> Advance → {WORKFLOW_META[NEXT_STATUS[w.status]!]?.label}
                      </button>
                    )}
                    <select onChange={e => { if (e.target.value) assignFinding(finding.id, e.target.value); e.target.value = ""; }} defaultValue="" style={{ ...ms, padding: "4px 10px", borderRadius: 5, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4", fontSize: 11, cursor: "pointer" }}>
                      <option value="" disabled>Assign to…</option>
                      {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {w?.ticket_id ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 5, background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", fontSize: 11 }}>
                        <Ticket size={11} /> {w.ticket_id}
                      </span>
                    ) : (
                      <button onClick={() => { toast.info("Ticket creation — wire to JIRA/ServiceNow API"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
                        <Ticket size={11} /> Create Ticket
                      </button>
                    )}
                    {w?.status !== "FALSE_POSITIVE" && w?.status !== "REMEDIATED" && (
                      <button onClick={() => markFalsePositive(finding.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 5, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                        <Circle size={11} /> False Positive
                      </button>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(100,116,139,0.4)", ...ms }}>
                      {w?.ticket_id && `Ticket: ${w.ticket_id} · `}First seen: {w ? new Date(w.first_seen).toLocaleString() : "—"}
                    </span>
                  </div>

                  {/* Tabs */}
                  <div style={{ padding: "0 20px 0 36px" }}>
                    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 0 }}>
                      {[
                        { id: "playbook", label: "Runbook", icon: <GitBranch size={12} /> },
                        { id: "overview", label: "Overview", icon: <Shield size={12} /> },
                        { id: "timeline", label: "Timeline", icon: <Clock size={12} /> },
                        { id: "agent", label: "Agent Actions", icon: <Bot size={12} /> },
                      ].map(t => (
                        <button key={t.id} onClick={e => { e.stopPropagation(); setActiveTab(prev => ({ ...prev, [finding.id]: t.id })); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? "#818cf8" : "transparent"}`, color: tab === t.id ? "#818cf8" : "rgba(100,116,139,0.6)", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", marginBottom: -1 }}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: "16px 0 20px" }} onClick={e => e.stopPropagation()}>

                      {/* ── RUNBOOK TAB ── */}
                      {tab === "playbook" && (
                        <div>
                          {playbook.length === 0 ? (
                            <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 13 }}>No playbook available for this finding type.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {/* Phase legend */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                {(Object.keys(PHASE_META) as PlaybookPhase[]).map(ph => (
                                  <span key={ph} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${PHASE_META[ph].color}18`, border: `1px solid ${PHASE_META[ph].color}30`, color: PHASE_META[ph].color, ...ms }}>{ph}</span>
                                ))}
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(100,116,139,0.5)" }}>
                                  Est. total: {playbook.reduce((sum, s) => sum + parseInt(s.estimated_time), 0)} min
                                </span>
                              </div>

                              {playbook.map(step => {
                                const ph = PHASE_META[step.phase];
                                return (
                                  <div key={step.step} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, alignItems: "start" }}>
                                    {/* Step number */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${ph.color}18`, border: `1px solid ${ph.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: ph.color, ...ms, flexShrink: 0 }}>{step.step}</div>
                                      {step.step < playbook.length && <div style={{ width: 1, flex: 1, minHeight: 12, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
                                    </div>
                                    {/* Step content */}
                                    <div style={{ paddingBottom: 8 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: `${ph.color}18`, color: ph.color, ...ms }}>{ph.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{step.title}</span>
                                        <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(100,116,139,0.4)", ...ms }}>~{step.estimated_time}</span>
                                      </div>
                                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.5 }}>{step.description}</p>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {step.commands.map((cmd, ci) => (
                                          <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono', monospace" }}>
                                            <span style={{ flex: 1, fontSize: 11, color: cmd.startsWith("#") ? "rgba(100,116,139,0.5)" : "#a5b4fc", wordBreak: "break-all", lineHeight: 1.5 }}>{cmd}</span>
                                            {!cmd.startsWith("#") && (
                                              <button onClick={() => copyCommand(cmd)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedCmd === cmd ? "#00ff88" : "rgba(100,116,139,0.4)", padding: "0 2px", flexShrink: 0 }}>
                                                {copiedCmd === cmd ? <Check size={12} /> : <Copy size={12} />}
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── OVERVIEW TAB ── */}
                      {tab === "overview" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                          <div>
                            <p style={{ ...ls, margin: "0 0 6px" }}>Description</p>
                            <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>{finding.description}</p>
                            <div style={{ marginTop: 12, padding: 12, borderRadius: 7, background: "rgba(255,176,0,0.07)", border: "1px solid rgba(255,176,0,0.2)" }}>
                              <p style={{ ...ls, color: "rgba(255,176,0,0.8)", margin: "0 0 6px" }}>Recommendation</p>
                              <p style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.7, margin: 0 }}>{finding.recommendation}</p>
                            </div>
                          </div>
                          <div>
                            <p style={{ ...ls, margin: "0 0 8px" }}>Instance Details</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, ...ms }}>
                              {[["VPC", finding.vpc_id], ["Subnet", finding.subnet_id], ["Region", finding.region], ["State", finding.state], ["Instance Type", finding.instance_type], ["Launch Time", new Date(finding.launch_time).toLocaleDateString()]].map(([k, v]) => (
                                <div key={k}><span style={{ color: "rgba(100,116,139,0.6)" }}>{k}: </span><span style={{ color: "#94a3b8" }}>{v}</span></div>
                              ))}
                            </div>
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                              {finding.public_ip ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ff0040" }}><Globe size={11} color="#ff0040" />Public: {finding.public_ip}</span> : <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00ff88" }}><Lock size={11} color="#00ff88" />Private</span>}
                            </div>
                            {finding.security_groups.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <p style={{ ...ls, margin: "0 0 5px" }}>Security Groups</p>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {finding.security_groups.map(sg => <span key={sg} style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8", fontSize: 11, ...ms }}>{sg}</span>)}
                                </div>
                              </div>
                            )}
                            {finding.compliance_frameworks.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <p style={{ ...ls, margin: "0 0 5px" }}>Compliance Frameworks</p>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {finding.compliance_frameworks.map(fw => <span key={fw} style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 11, ...ms }}>{fw}</span>)}
                                </div>
                              </div>
                            )}
                            {w?.risk_acceptance_note && (
                              <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)" }}>
                                <p style={{ ...ls, color: "rgba(251,146,60,0.8)", margin: "0 0 4px" }}>Risk Acceptance Note</p>
                                <p style={{ fontSize: 11, color: "#fb923c", margin: 0, lineHeight: 1.5 }}>{w.risk_acceptance_note}</p>
                                {w.risk_acceptance_expiry && <p style={{ fontSize: 10, color: "rgba(251,146,60,0.5)", margin: "4px 0 0", ...ms }}>Expires: {new Date(w.risk_acceptance_expiry).toLocaleDateString()}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── TIMELINE TAB ── */}
                      {tab === "timeline" && (
                        <div style={{ maxHeight: 320, overflowY: "auto" }}>
                          {(w?.timeline ?? []).map((event, ei) => (
                            <div key={event.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12, marginBottom: 12 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTOR_COLORS[event.actor_type] ?? "#64748b", border: `1px solid ${ACTOR_COLORS[event.actor_type] ?? "#64748b"}40`, flexShrink: 0, marginTop: 3 }} />
                                {ei < (w?.timeline.length ?? 0) - 1 && <div style={{ width: 1, flex: 1, minHeight: 8, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
                              </div>
                              <div style={{ paddingBottom: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{event.action}</span>
                                  <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 600, background: `${ACTOR_COLORS[event.actor_type]}20`, color: ACTOR_COLORS[event.actor_type], ...ms, textTransform: "uppercase" }}>{event.actor_type}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)" }}>{event.actor}</span>
                                  <span style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", ...ms }}>{new Date(event.timestamp).toLocaleString()}</span>
                                </div>
                                {event.note && <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{event.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── AGENT ACTIONS TAB ── */}
                      {tab === "agent" && (
                        <div>
                          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                            <Bot size={14} color="#a78bfa" />
                            <span style={{ fontSize: 11, color: "#a78bfa" }}>AI Agent integration ready — wire endpoints below to <code style={{ ...ms, background: "rgba(167,139,250,0.15)", padding: "1px 5px", borderRadius: 3 }}>/api/agents</code></span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {[
                              {
                                icon: <Zap size={16} color="#818cf8" />,
                                title: "AI Triage Analysis",
                                desc: "Send finding context to LLM agent for automated severity validation, false-positive scoring, and enrichment from threat intel feeds.",
                                endpoint: "POST /api/agents/triage",
                                payload: `{ "finding_id": "${finding.id}", "finding_type": "${finding.finding_type}", "instance_id": "${finding.instance_id}" }`,
                                btnColor: "#818cf8",
                                action: () => toast.info("AI Triage Agent", { description: `POST /api/agents/triage → finding ${finding.id}` }),
                              },
                              {
                                icon: <Bot size={16} color="#a78bfa" />,
                                title: "Auto-Remediate",
                                desc: "Trigger Lambda-backed remediation agent to execute the runbook steps automatically. Requires approval workflow.",
                                endpoint: "POST /api/agents/remediate",
                                payload: `{ "finding_id": "${finding.id}", "playbook": "${finding.id}", "dry_run": true }`,
                                btnColor: "#a78bfa",
                                action: () => toast.info("Remediation Agent", { description: `POST /api/agents/remediate → dry_run=true` }),
                              },
                              {
                                icon: <Ticket size={16} color="#06b6d4" />,
                                title: "Create Ticket",
                                desc: "Auto-generate a Jira/ServiceNow incident with pre-filled description, severity, assignee, and runbook link.",
                                endpoint: "POST /api/integrations/ticket",
                                payload: `{ "finding_id": "${finding.id}", "platform": "jira", "priority": "${finding.severity}" }`,
                                btnColor: "#06b6d4",
                                action: () => toast.info("Ticket Agent", { description: `POST /api/integrations/ticket → Jira` }),
                              },
                              {
                                icon: <ExternalLink size={16} color="#fb923c" />,
                                title: "Enrich with Threat Intel",
                                desc: "Query Shodan, VirusTotal, and internal threat feeds for the public IP / resource to assess active exploitation.",
                                endpoint: "POST /api/agents/enrich",
                                payload: `{ "finding_id": "${finding.id}", "ip": "${finding.public_ip ?? 'N/A'}", "feeds": ["shodan","virustotal","misp"] }`,
                                btnColor: "#fb923c",
                                action: () => toast.info("Threat Intel Agent", { description: `POST /api/agents/enrich → Shodan, VT, MISP` }),
                              },
                              {
                                icon: <UserCircle size={16} color="#34d399" />,
                                title: "Blast Radius Analysis",
                                desc: "Identify all resources reachable from this instance using IAM role graph, VPC routing, and SG rules.",
                                endpoint: "POST /api/agents/blast-radius",
                                payload: `{ "finding_id": "${finding.id}", "instance_id": "${finding.instance_id}", "vpc_id": "${finding.vpc_id}" }`,
                                btnColor: "#34d399",
                                action: () => toast.info("Blast Radius Agent", { description: `POST /api/agents/blast-radius → ${finding.instance_id}` }),
                              },
                              {
                                icon: <CheckCircle size={16} color="#00ff88" />,
                                title: "Verify Remediation",
                                desc: "Re-scan this specific finding post-remediation to confirm the issue is resolved and advance workflow to REMEDIATED.",
                                endpoint: "POST /api/agents/verify",
                                payload: `{ "finding_id": "${finding.id}", "advance_on_pass": true }`,
                                btnColor: "#00ff88",
                                action: () => { advanceStatus(finding.id, "Verify Agent"); toast.success("Verify Agent", { description: "Finding advanced to PENDING_VERIFY" }); },
                              },
                            ].map(action => (
                              <div key={action.title} style={{ padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  {action.icon}
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{action.title}</span>
                                </div>
                                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px", lineHeight: 1.5 }}>{action.desc}</p>
                                <div style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(0,0,0,0.3)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                                  <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{action.endpoint}</span>
                                </div>
                                <button onClick={action.action} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 5, background: `${action.btnColor}15`, border: `1px solid ${action.btnColor}35`, color: action.btnColor, fontSize: 11, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                                  <Zap size={11} /> Run Agent
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
