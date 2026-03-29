// SOC mock data — deterministic, realistic
import type {
  SOCAlert, ServiceCoverage, PipelineSource, PipelineError,
  Investigation, SavedQuery, SOCConfig,
} from "./types";

function ago(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}
function fromNow(h: number) {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

export const MOCK_ALERTS: SOCAlert[] = [
  {
    id: "alert-001", title: "Root account API call from unrecognized IP", severity: "CRITICAL",
    source: "CloudTrail", resource: "root-account", resource_arn: "arn:aws:iam::123456789012:root",
    status: "NEW", created_at: ago(1.2), sla_deadline: fromNow(2.8), sla_breached: false,
    tags: ["iam", "root", "unusual-location"], region: "us-east-1", count: 1,
    mitre_technique: "T1078", rule_id: "CT-IAM-001",
  },
  {
    id: "alert-002", title: "GuardDuty: CryptoCurrency:EC2/BitcoinTool.B!DNS", severity: "HIGH",
    source: "GuardDuty", resource: "i-0a1b2c3d4e5f6789", resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6789",
    status: "INVESTIGATING", assignee: "alice.chen", created_at: ago(3.5), sla_deadline: fromNow(20.5), sla_breached: false,
    tags: ["ec2", "crypto", "malware"], region: "us-east-1", count: 47,
    mitre_technique: "T1496", rule_id: "GD-EC2-CRYPT-001", investigation_id: "inv-001",
  },
  {
    id: "alert-003", title: "S3 bucket public access enabled via ACL change", severity: "CRITICAL",
    source: "Config", resource: "company-prod-data", resource_arn: "arn:aws:s3:::company-prod-data",
    status: "ACKNOWLEDGED", assignee: "bob.martinez", created_at: ago(5.1), sla_deadline: fromNow(-1.1), sla_breached: true,
    tags: ["s3", "public", "data-exposure"], region: "us-east-1", count: 1,
    mitre_technique: "T1530", rule_id: "CFG-S3-PUBLIC-001",
  },
  {
    id: "alert-004", title: "Unusual IAM role assumption: cross-account", severity: "HIGH",
    source: "CloudTrail", resource: "arn:aws:iam::987654321098:role/DataProcessor",
    resource_arn: "arn:aws:iam::123456789012:role/DataProcessor",
    status: "NEW", created_at: ago(0.7), sla_deadline: fromNow(23.3), sla_breached: false,
    tags: ["iam", "cross-account", "lateral-movement"], region: "us-east-1", count: 3,
    mitre_technique: "T1098", rule_id: "CT-IAM-ASSUME-001",
  },
  {
    id: "alert-005", title: "Security group allows 0.0.0.0/0 inbound on port 3389", severity: "HIGH",
    source: "Security Hub", resource: "sg-0abc1234def56789", resource_arn: "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0abc1234def56789",
    status: "NEW", created_at: ago(2.3), sla_deadline: fromNow(21.7), sla_breached: false,
    tags: ["network", "rdp", "unrestricted"], region: "us-east-1", count: 1,
    mitre_technique: "T1133", rule_id: "SH-EC2-SG-001",
  },
  {
    id: "alert-006", title: "MFA not enabled for 6 IAM console users", severity: "MEDIUM",
    source: "Security Hub", resource: "iam-users-group", resource_arn: "arn:aws:iam::123456789012:root",
    status: "ACKNOWLEDGED", assignee: "carol.singh", created_at: ago(28), sla_deadline: fromNow(140), sla_breached: false,
    tags: ["iam", "mfa", "compliance"], region: "us-east-1", count: 6,
    rule_id: "SH-IAM-MFA-001",
  },
  {
    id: "alert-007", title: "CloudTrail logging disabled in eu-west-1", severity: "HIGH",
    source: "Config", resource: "acme-trail-eu", resource_arn: "arn:aws:cloudtrail:eu-west-1:123456789012:trail/acme-trail-eu",
    status: "ESCALATED", assignee: "dave.kim", created_at: ago(8), sla_deadline: fromNow(-4), sla_breached: true,
    tags: ["cloudtrail", "logging", "compliance"], region: "eu-west-1", count: 1,
    rule_id: "CT-TRAIL-DISABLED-001",
  },
  {
    id: "alert-008", title: "Reconnaissance: EC2 port scan from 45.142.212.100", severity: "MEDIUM",
    source: "GuardDuty", resource: "i-0f9e8d7c6b5a4321", resource_arn: "arn:aws:ec2:us-east-1:123456789012:instance/i-0f9e8d7c6b5a4321",
    status: "ACKNOWLEDGED", created_at: ago(6), sla_deadline: fromNow(162), sla_breached: false,
    tags: ["recon", "portscan", "external"], region: "us-east-1", count: 1,
    mitre_technique: "T1595", rule_id: "GD-EC2-RECON-001",
  },
  {
    id: "alert-009", title: "RDS instance publicly accessible — no encryption", severity: "HIGH",
    source: "Inspector", resource: "prod-postgres-primary", resource_arn: "arn:aws:rds:us-east-1:123456789012:db:prod-postgres-primary",
    status: "NEW", created_at: ago(14), sla_deadline: fromNow(10), sla_breached: false,
    tags: ["rds", "encryption", "public"], region: "us-east-1", count: 1,
    rule_id: "INS-RDS-ENC-001",
  },
  {
    id: "alert-010", title: "Access key AKIA…4F2K inactive 90+ days", severity: "LOW",
    source: "IAM Scan", resource: "svc-data-pipeline", resource_arn: "arn:aws:iam::123456789012:user/svc-data-pipeline",
    status: "ACKNOWLEDGED", assignee: "alice.chen", created_at: ago(72), sla_deadline: fromNow(648), sla_breached: false,
    tags: ["iam", "stale-key", "hygiene"], region: "us-east-1", count: 1,
    rule_id: "IAM-KEY-STALE-001",
  },
  {
    id: "alert-011", title: "Lambda execution role has iam:* wildcard permission", severity: "HIGH",
    source: "Access Analyzer", resource: "fn-data-transformer", resource_arn: "arn:aws:lambda:us-east-1:123456789012:function:fn-data-transformer",
    status: "NEW", created_at: ago(4), sla_deadline: fromNow(20), sla_breached: false,
    tags: ["lambda", "iam", "least-privilege"], region: "us-east-1", count: 1,
    rule_id: "AA-LAMBDA-WILDCARD-001",
  },
  {
    id: "alert-012", title: "EBS volume snapshot publicly shared", severity: "CRITICAL",
    source: "Config", resource: "snap-0a1b2c3d4e5f6789", resource_arn: "arn:aws:ec2:us-east-1:123456789012:snapshot/snap-0a1b2c3d4e5f6789",
    status: "NEW", created_at: ago(0.3), sla_deadline: fromNow(3.7), sla_breached: false,
    tags: ["ebs", "snapshot", "data-exposure"], region: "us-east-1", count: 1,
    mitre_technique: "T1530", rule_id: "CFG-EBS-SNAP-PUBLIC-001",
  },
];

export const MOCK_COVERAGE: ServiceCoverage[] = [
  { id: "ec2", name: "EC2 & Compute", category: "Infrastructure", coverage: "healthy", detector_count: 4, event_sources: 3, last_event: ago(0.01), findings_7d: 12, region_coverage: { "us-east-1": "healthy", "us-west-2": "healthy", "eu-west-1": "partial" } },
  { id: "s3", name: "S3 & Storage", category: "Infrastructure", coverage: "partial", detector_count: 2, event_sources: 1, last_event: ago(0.15), findings_7d: 5, region_coverage: { "us-east-1": "healthy", "us-west-2": "partial", "eu-west-1": "uncovered" }, gap_reason: "Macie not enabled in eu-west-1" },
  { id: "iam", name: "IAM & Access", category: "Infrastructure", coverage: "healthy", detector_count: 3, event_sources: 4, last_event: ago(0.05), findings_7d: 28, region_coverage: { "us-east-1": "healthy", "us-west-2": "healthy", "eu-west-1": "healthy" } },
  { id: "rds", name: "RDS & Databases", category: "Infrastructure", coverage: "partial", detector_count: 1, event_sources: 2, last_event: ago(0.8), findings_7d: 3, region_coverage: { "us-east-1": "healthy", "us-west-2": "uncovered", "eu-west-1": "uncovered" }, gap_reason: "Database Activity Streams not enabled" },
  { id: "lambda", name: "Lambda", category: "Compute", coverage: "degraded", detector_count: 1, event_sources: 1, last_event: ago(2.1), findings_7d: 7, region_coverage: { "us-east-1": "partial", "us-west-2": "uncovered", "eu-west-1": "uncovered" }, gap_reason: "No runtime threat detection deployed" },
  { id: "vpc", name: "VPC & Network", category: "Network", coverage: "healthy", detector_count: 2, event_sources: 2, last_event: ago(0.02), findings_7d: 4, region_coverage: { "us-east-1": "healthy", "us-west-2": "healthy", "eu-west-1": "healthy" } },
  { id: "cloudtrail", name: "CloudTrail", category: "Audit", coverage: "partial", detector_count: 2, event_sources: 1, last_event: ago(0.3), findings_7d: 9, region_coverage: { "us-east-1": "healthy", "us-west-2": "healthy", "eu-west-1": "degraded" }, gap_reason: "Trail disabled in eu-west-1 (alert-007)" },
  { id: "eks", name: "EKS / Containers", category: "Compute", coverage: "uncovered", detector_count: 0, event_sources: 0, last_event: "", findings_7d: 0, region_coverage: { "us-east-1": "uncovered", "us-west-2": "uncovered", "eu-west-1": "uncovered" }, gap_reason: "Falco / EKS audit log shipping not configured" },
  { id: "route53", name: "Route 53 / DNS", category: "Network", coverage: "partial", detector_count: 1, event_sources: 1, last_event: ago(1.5), findings_7d: 1, region_coverage: { "us-east-1": "healthy", "us-west-2": "uncovered", "eu-west-1": "uncovered" } },
  { id: "secretsmanager", name: "Secrets Manager", category: "Security", coverage: "healthy", detector_count: 2, event_sources: 2, last_event: ago(0.4), findings_7d: 0, region_coverage: { "us-east-1": "healthy", "us-west-2": "healthy", "eu-west-1": "partial" } },
];

export const MOCK_PIPELINE: PipelineSource[] = [
  { id: "pipe-ct", name: "CloudTrail (All Regions)", type: "cloudtrail", status: "healthy", ingest_eps: 142, lag_seconds: 18, error_rate_pct: 0.01, last_event: ago(0.005), destination: "s3://acme-logs/cloudtrail/", daily_volume_gb: 4.2, retention_days: 365 },
  { id: "pipe-vpc", name: "VPC Flow Logs", type: "vpc_flow", status: "healthy", ingest_eps: 3840, lag_seconds: 12, error_rate_pct: 0.0, last_event: ago(0.001), destination: "s3://acme-logs/vpc-flow/", daily_volume_gb: 28.7, retention_days: 90 },
  { id: "pipe-gd", name: "GuardDuty Findings", type: "guardduty", status: "healthy", ingest_eps: 0.4, lag_seconds: 5, error_rate_pct: 0.0, last_event: ago(0.1), destination: "s3://acme-logs/guardduty/", daily_volume_gb: 0.02, retention_days: 365 },
  { id: "pipe-cwl", name: "CloudWatch Logs → Kinesis", type: "cloudwatch", status: "degraded", ingest_eps: 724, lag_seconds: 380, error_rate_pct: 2.4, last_event: ago(0.1), destination: "kinesis://acme-logs-stream", daily_volume_gb: 12.1, retention_days: 30 },
  { id: "pipe-s3acc", name: "S3 Access Logs", type: "s3_access", status: "healthy", ingest_eps: 89, lag_seconds: 45, error_rate_pct: 0.08, last_event: ago(0.05), destination: "s3://acme-logs/s3-access/", daily_volume_gb: 1.8, retention_days: 90 },
  { id: "pipe-waf", name: "WAF Logs", type: "waf", status: "error", ingest_eps: 0, lag_seconds: 7200, error_rate_pct: 100, last_event: ago(2.0), destination: "s3://acme-logs/waf/", daily_volume_gb: 0, retention_days: 90 },
];

export const MOCK_PIPELINE_ERRORS: PipelineError[] = [
  { id: "pe-001", timestamp: ago(0.5), source_id: "pipe-cwl", message: "Kinesis shard throughput exceeded. PutRecord throttled.", code: "KINESIS_THROTTLE", resolved: false },
  { id: "pe-002", timestamp: ago(1.1), source_id: "pipe-waf", message: "S3 destination bucket policy denies PutObject from log delivery.", code: "S3_ACCESS_DENIED", resolved: false },
  { id: "pe-003", timestamp: ago(3.2), source_id: "pipe-cwl", message: "Subscription filter limit reached for /aws/lambda/fn-data-transformer.", code: "CWL_FILTER_LIMIT", resolved: false },
  { id: "pe-004", timestamp: ago(6), source_id: "pipe-waf", message: "WAF web ACL not associated with any distribution.", code: "WAF_NO_ASSOC", resolved: false },
];

export const MOCK_INVESTIGATIONS: Investigation[] = [
  {
    id: "inv-001",
    title: "Crypto miner on i-0a1b2c3d4e5f6789",
    severity: "HIGH",
    status: "IN_PROGRESS",
    assignee: "alice.chen",
    created_at: ago(3.5),
    updated_at: ago(0.5),
    sla_deadline: fromNow(20.5),
    linked_alert_ids: ["alert-002"],
    tags: ["ec2", "malware", "crypto"],
    affected_resources: ["i-0a1b2c3d4e5f6789", "arn:aws:ec2:us-east-1:123456789012:instance/i-0a1b2c3d4e5f6789"],
    summary: "GuardDuty detected outbound DNS resolution to known crypto pool domain. Instance i-0a1b2c3d4e5f6789 is making 47 requests/min to pool.supportxmr.com.",
    evidence: [
      { id: "ev-001", type: "memory_dump", label: "Memory dump — i-0a1b2c3d4e5f6789", s3_uri: "s3://acme-ir-evidence/memory-dumps/i-0a1b2c3d4e5f6789/2026-03-27T02.lime.gz", collected_at: ago(2), size_bytes: 8589934592, hash_sha256: "a3f4b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a", collected_by: "alice.chen" },
      { id: "ev-002", type: "log_export", label: "CloudTrail events — last 24h", s3_uri: "s3://acme-ir-evidence/cases/inv-001/cloudtrail-24h.json.gz", collected_at: ago(1.5), size_bytes: 204800, collected_by: "alice.chen" },
    ],
    timeline: [
      { id: "te-001", timestamp: ago(3.5), type: "alert_linked", actor: "system", summary: "Alert alert-002 linked automatically" },
      { id: "te-002", timestamp: ago(3.4), type: "status_change", actor: "alice.chen", summary: "Investigation opened", detail: "Status: OPEN → IN_PROGRESS" },
      { id: "te-003", timestamp: ago(2), type: "evidence_added", actor: "alice.chen", summary: "Memory dump collected", detail: "8 GB LiME dump via SSM" },
      { id: "te-004", timestamp: ago(0.5), type: "note", actor: "alice.chen", summary: "Process xmrig found in memory analysis", detail: "PID 4821 — xmrig 6.20.0. Mining pool: pool.supportxmr.com:443. CPU utilization 94%." },
    ],
  },
  {
    id: "inv-002",
    title: "S3 public ACL breach — company-prod-data",
    severity: "CRITICAL",
    status: "OPEN",
    assignee: "bob.martinez",
    created_at: ago(5.1),
    updated_at: ago(4.8),
    sla_deadline: fromNow(-1.1),
    linked_alert_ids: ["alert-003"],
    tags: ["s3", "data-exposure"],
    affected_resources: ["arn:aws:s3:::company-prod-data"],
    summary: "S3 bucket company-prod-data was made public via ACL change at 20:47 UTC. The bucket contains customer PII exports.",
    evidence: [],
    timeline: [
      { id: "te-010", timestamp: ago(5.1), type: "alert_linked", actor: "system", summary: "Alert alert-003 linked" },
      { id: "te-011", timestamp: ago(4.8), type: "status_change", actor: "bob.martinez", summary: "Investigation opened" },
    ],
  },
];

export const MOCK_SAVED_QUERIES: SavedQuery[] = [
  {
    id: "sq-001", name: "Root account API calls (24h)", source: "CloudTrail",
    query: `fields @timestamp, eventName, sourceIPAddress, userAgent
| filter userIdentity.type = "Root"
| sort @timestamp desc
| limit 50`,
    description: "All API calls made by the root account in the last 24 hours.",
    last_run: ago(1),
  },
  {
    id: "sq-002", name: "Failed console logins", source: "CloudTrail",
    query: `fields @timestamp, sourceIPAddress, errorCode, userIdentity.userName
| filter eventName = "ConsoleLogin" and errorMessage = "Failed authentication"
| stats count() by sourceIPAddress, userIdentity.userName
| sort count() desc`,
    description: "Aggregate failed console logins grouped by IP and username.",
    last_run: ago(3),
  },
  {
    id: "sq-003", name: "S3 data exfiltration (GetObject volume)", source: "CloudTrail",
    query: `fields @timestamp, userIdentity.arn, requestParameters.bucketName, requestParameters.key
| filter eventName = "GetObject"
| stats count() as downloads, sum(responseElements.contentLength) as bytes_out by userIdentity.arn
| sort bytes_out desc`,
    description: "Top identities by S3 GetObject volume — identify bulk exfiltration.",
  },
  {
    id: "sq-004", name: "VPC Flow — rejected traffic by destination port", source: "VPC Flow Logs",
    query: `fields @timestamp, srcAddr, dstPort, protocol, action
| filter action = "REJECT"
| stats count() by dstPort
| sort count() desc
| limit 20`,
    description: "Top rejected destination ports — identifies scanning and blocked connection attempts.",
  },
  {
    id: "sq-005", name: "IAM policy changes (7d)", source: "CloudTrail",
    query: `fields @timestamp, eventName, userIdentity.arn, requestParameters.policyName
| filter eventSource = "iam.amazonaws.com"
  and (eventName like "PutUserPolicy"
    or eventName like "AttachRolePolicy"
    or eventName like "CreatePolicy"
    or eventName like "UpdateAssumeRolePolicy")
| sort @timestamp desc`,
    description: "All IAM policy mutations over the past 7 days.",
  },
];

export const DEFAULT_SOC_CONFIG: SOCConfig = {
  thresholds: [
    { severity: "CRITICAL", sla_hours: 4, auto_escalate_hours: 2, auto_suppress_duplicate_hours: 1, page_oncall: true },
    { severity: "HIGH", sla_hours: 24, auto_escalate_hours: 12, auto_suppress_duplicate_hours: 4, page_oncall: true },
    { severity: "MEDIUM", sla_hours: 168, auto_escalate_hours: 72, auto_suppress_duplicate_hours: 24, page_oncall: false },
    { severity: "LOW", sla_hours: 720, auto_escalate_hours: 336, auto_suppress_duplicate_hours: 72, page_oncall: false },
  ],
  routing_rules: [
    { id: "rr-001", name: "Critical IAM to Security Team", condition: "severity=CRITICAL AND source=IAM", destination_team: "security-team", channel: "#security-critical", priority: 1, enabled: true },
    { id: "rr-002", name: "GuardDuty findings to IR team", condition: "source=GuardDuty", destination_team: "ir-team", channel: "#ir-alerts", priority: 2, enabled: true },
    { id: "rr-003", name: "Network alerts to NetOps", condition: "tags contains network", destination_team: "netops", channel: "#netops-alerts", priority: 3, enabled: true },
    { id: "rr-004", name: "Compliance to GRC", condition: "source=Config OR source=SecurityHub", destination_team: "grc-team", channel: "#compliance", priority: 4, enabled: false },
  ],
  escalation_paths: [
    {
      id: "ep-001", name: "Critical Security Incident", severity: "CRITICAL",
      steps: [
        { delay_minutes: 0, notify: "assigned-analyst", method: "slack" },
        { delay_minutes: 30, notify: "security-lead", method: "slack+pagerduty" },
        { delay_minutes: 60, notify: "ciso", method: "pagerduty+phone" },
      ],
    },
    {
      id: "ep-002", name: "High Severity Alert", severity: "HIGH",
      steps: [
        { delay_minutes: 0, notify: "assigned-analyst", method: "slack" },
        { delay_minutes: 120, notify: "security-lead", method: "slack" },
        { delay_minutes: 240, notify: "ir-team", method: "pagerduty" },
      ],
    },
  ],
  retention: {
    cloudtrail: 365, vpc_flow: 90, guardduty: 365,
    cloudwatch_logs: 30, s3_access: 90, waf: 90,
  },
  updated_at: ago(24),
};

export const ANALYSTS = ["alice.chen", "bob.martinez", "carol.singh", "dave.kim", "eve.nakamura"];
