import { useState, useEffect } from "react";
import {
  Database,
  Play,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface DynamoDBSecurityFinding {
  id: string;
  table_name: string;
  table_arn: string;
  region: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  encryption_type: string;
  encryption_enabled: boolean;
  point_in_time_recovery: boolean;
  deletion_protection: boolean;
  stream_enabled: boolean;
  global_table: boolean;
  risk_score: number;
}

interface DynamoDBScanSummary {
  total_tables: number;
  unencrypted_tables: number;
  no_pitr: number;
  no_deletion_protection: number;
  no_streams: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
}

interface DynamoDBScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: DynamoDBSecurityFinding[];
  scan_summary: DynamoDBScanSummary;
  started_at?: string;
  completed_at?: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const mockDynamoDBFindings: DynamoDBSecurityFinding[] = [
  {
    id: "ddb-001",
    table_name: "payment-ledger",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/payment-ledger",
    region: "us-east-1",
    severity: "CRITICAL",
    finding_type: "AWS-Owned KMS Key — No CMK, No Audit Trail on Decrypt",
    description:
      "payment-ledger stores PCI-regulated payment transaction data but uses an AWS-owned KMS key (not a Customer-Managed Key). With AWS-owned keys, there is no CloudTrail record of Decrypt API calls — you cannot detect which IAM principal accessed which payment records. Mandatory PCI-DSS 3.4 requires demonstrable control over encryption keys for cardholder data.",
    recommendation:
      "Create a dedicated CMK in AWS KMS with a key policy restricting GenerateDataKey and Decrypt to the specific Lambda execution role and DynamoDB service. Enable CloudTrail KMS data events to log all Decrypt operations. Migrate the table to use the new CMK via a re-encryption job. Set key rotation to automatic (annual). Add a key policy condition requiring MFA for administrative actions.",
    compliance_frameworks: ["PCI-DSS 3.4", "CIS 2.6", "HIPAA 164.312(a)(2)(iv)", "SOC2 CC6.1"],
    encryption_type: "AWS_OWNED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: false,
    global_table: false,
    risk_score: 10,
  },
  {
    id: "ddb-002",
    table_name: "user-auth-tokens",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/user-auth-tokens",
    region: "us-east-1",
    severity: "CRITICAL",
    finding_type: "IAM Policy Grants dynamodb:* — Wildcard Action on Auth Token Table",
    description:
      "The Lambda execution role for the auth service has an IAM policy granting dynamodb:* on arn:aws:dynamodb:*:*:table/user-auth-tokens. This permits BatchWriteItem, DeleteTable, ExportTableToPointInTime, and CreateBackup — actions unnecessary for normal auth flows. A compromised Lambda function could exfiltrate all session tokens or destroy the table entirely.",
    recommendation:
      "Apply least-privilege IAM: replace dynamodb:* with only the required actions (GetItem, PutItem, UpdateItem, DeleteItem, Query). Scope the resource ARN to the specific table (no wildcards). Use IAM Access Analyzer to generate a minimal policy from CloudTrail. Add a Service Control Policy denying dynamodb:DeleteTable for all non-break-glass principals.",
    compliance_frameworks: ["CIS 1.16", "NIST AC-6", "SOC2 CC6.3", "PCI-DSS 7.1"],
    encryption_type: "AWS_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: true,
    global_table: false,
    risk_score: 10,
  },
  {
    id: "ddb-003",
    table_name: "orders-prod",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/orders-prod",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "Point-in-Time Recovery Disabled — 0 Recovery Options Post-Ransomware",
    description:
      "orders-prod has PITR disabled. Without PITR, the recovery options for ransomware, accidental overwrites, or malicious bulk-writes are limited to manual backups only. The last on-demand backup is 14 days old. A ransomware event targeting this table could result in permanent loss of all order history. Table receives 18,000 writes/hour.",
    recommendation:
      "Enable PITR immediately: aws dynamodb update-continuous-backups --table-name orders-prod --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true. PITR enables restore to any second in the past 35 days at no query cost (only storage). Supplement with on-demand backups to a separate AWS account's S3 bucket for cross-account immutability. Test restore procedure quarterly.",
    compliance_frameworks: ["SOC2 A1.2", "PCI-DSS 9.5", "NIST CP-9", "CIS 2.6.1"],
    encryption_type: "CUSTOMER_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: false,
    global_table: false,
    risk_score: 8,
  },
  {
    id: "ddb-004",
    table_name: "session-store",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/session-store",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "Deletion Protection Disabled — Table Deletable With Single API Call",
    description:
      "session-store stores active user sessions for 140,000 DAU. DeletionProtection is not enabled. A single aws dynamodb delete-table command from any principal with dynamodb:DeleteTable permission would immediately and irreversibly delete all active sessions, causing a full user logout event. Recovery requires either PITR (not enabled) or a manual backup restore (last backup: 6 days ago).",
    recommendation:
      "Enable deletion protection: aws dynamodb update-table --table-name session-store --deletion-protection-enabled. Add an SCP: Deny dynamodb:DeleteTable for all principals except a break-glass role. Combine with PITR and TTL configuration to ensure 24h recovery capability. Add a CloudWatch alarm on DeleteTable API calls.",
    compliance_frameworks: ["SOC2 CC9.1", "NIST CP-10", "CIS 2.6.2"],
    encryption_type: "AWS_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: false,
    stream_enabled: false,
    global_table: false,
    risk_score: 8,
  },
  {
    id: "ddb-005",
    table_name: "audit-log-events",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/audit-log-events",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "DynamoDB Streams Disabled — No Change Data Capture for SIEM/Compliance",
    description:
      "audit-log-events stores security audit events from 22 microservices but has DynamoDB Streams disabled. Without Streams, there is no real-time CDC pipeline to the SIEM (Splunk). Modifications to audit log entries (e.g., an attacker deleting incriminating events) would be undetectable. Regulatory frameworks require tamper-evident audit trails.",
    recommendation:
      "Enable DynamoDB Streams with NEW_AND_OLD_IMAGES view type to capture all changes including deletes. Create a Lambda trigger that forwards stream records to Kinesis Data Firehose → S3 in a separate security account (tamper-resistant). Add Object Lock on the S3 destination. Alert on DeleteItem operations via CloudWatch. Enable DynamoDB Object Lock via S3-backed export for compliance archival.",
    compliance_frameworks: ["PCI-DSS 10.2", "SOC2 CC7.2", "HIPAA 164.312(b)", "NIST AU-9"],
    encryption_type: "CUSTOMER_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: false,
    global_table: false,
    risk_score: 8,
  },
  {
    id: "ddb-006",
    table_name: "inventory-mgmt",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/inventory-mgmt",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "No CloudWatch Alarms — Data Exfiltration via Scan Would Go Undetected",
    description:
      "inventory-mgmt has no CloudWatch alarms on ConsumedReadCapacityUnits or SuccessfulRequestLatency. A table Scan operation that exfiltrates all 2.1M inventory items would show as a sudden spike in ConsumedReadCapacityUnits but no alert would fire. GuardDuty DynamoDB threat detection is also not enabled for this account.",
    recommendation:
      "Create CloudWatch alarms: (1) ConsumedReadCapacityUnits > 90% of provisioned for 2 consecutive minutes, (2) NumberOfItemsReturnedByScan > 10,000 in 5 minutes. Enable GuardDuty Enhanced threat detection for DynamoDB (detects anomalous table scans using ML baseline). Route DynamoDB CloudTrail API calls to Security Hub for correlation with other signals.",
    compliance_frameworks: ["PCI-DSS 10.6", "SOC2 CC7.2", "NIST SI-4"],
    encryption_type: "AWS_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: true,
    global_table: false,
    risk_score: 7,
  },
  {
    id: "ddb-007",
    table_name: "cache-layer-prod",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/cache-layer-prod",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "TTL Not Configured — Stale PII Accumulation (GDPR Art.5 Violation Risk)",
    description:
      "cache-layer-prod caches user profile data including email addresses, names, and device identifiers. TTL is not configured. Items representing deleted users (based on account deletion logs) have accumulated for over 14 months — well beyond the 30-day GDPR erasure SLA. 47,000 items belong to deleted users that should have been purged.",
    recommendation:
      "Add a TTL attribute (e.g., expires_at as a Unix timestamp) to all items. Set TTL based on data classification: session data 24h, profile cache 7 days. For existing stale items, run a batch delete job with pagination to avoid throttling. Integrate with your account deletion workflow to set TTL on associated cached items immediately upon user deletion. Verify GDPR erasure with Macie scan.",
    compliance_frameworks: ["GDPR Art.5(1)(e)", "GDPR Art.17", "SOC2 C1.2"],
    encryption_type: "AWS_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: false,
    global_table: false,
    risk_score: 6,
  },
  {
    id: "ddb-008",
    table_name: "feature-flags",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/feature-flags",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "Global Table Replica (ap-southeast-1) Uses Default AWS Key — Inconsistent Encryption",
    description:
      "feature-flags is a Global Table with a primary replica in us-east-1 using a CMK (CUSTOMER_MANAGED_KEY) but the ap-southeast-1 replica uses the AWS-managed default key. This creates an inconsistent encryption posture. An attacker targeting the Asian-Pacific region DynamoDB endpoint gets decryption without the CMK restrictions applied in the primary region.",
    recommendation:
      "Update the ap-southeast-1 replica's encryption to use a regional CMK: aws dynamodb update-table --table-name feature-flags --region ap-southeast-1 --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=<ap-southeast-1-key-arn>. Create a matching CMK in each replica region with the same key policy. Verify via aws dynamodb describe-table in each region.",
    compliance_frameworks: ["CIS 2.6", "NIST SC-28", "SOC2 CC6.1"],
    encryption_type: "CUSTOMER_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: true,
    global_table: true,
    risk_score: 5,
  },
  {
    id: "ddb-009",
    table_name: "analytics-warehouse",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/analytics-warehouse",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "On-Demand Mode Without Cost Alerting — Unbounded Scan/Query Abuse Risk",
    description:
      "analytics-warehouse uses DynamoDB on-demand billing mode with no CloudWatch billing alarm. A misconfigured analytics job or a Scan-based data exfiltration attempt could consume millions of RCUs in minutes, generating unexpected charges in the tens of thousands of dollars. Historical peak: 84,000 RCUs/second during a full table scan.",
    recommendation:
      "Create an AWS Budget alert at 150% of the 3-month rolling average cost for DynamoDB. Set a CloudWatch alarm on ConsumedReadCapacityUnits. Add a partition key-based filter to all query patterns to prevent full Scan operations. Consider switching to provisioned capacity with auto-scaling to put a hard ceiling on throughput and cost.",
    compliance_frameworks: ["CIS 5.1", "SOC2 CC9.2"],
    encryption_type: "CUSTOMER_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: true,
    global_table: false,
    risk_score: 4,
  },
  {
    id: "ddb-010",
    table_name: "config-settings",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/config-settings",
    region: "us-east-1",
    severity: "LOW",
    finding_type: "Missing Data Classification Tags — ABAC Policy and Retention Cannot Be Enforced",
    description:
      "config-settings is missing required resource tags: DataClassification, Owner, DataRetentionPolicy, CostCenter. Without DataClassification tags, ABAC policies that restrict access to 'Confidential' or 'Restricted' tables cannot be enforced. The table is not included in the organization's compliance inventory or cost allocation reports.",
    recommendation:
      "Apply tags: DataClassification=Internal, Owner=platform-eng, DataRetentionPolicy=3years, CostCenter=eng-001. Enforce tags via AWS Config rule required-tags and an SCP denying CreateTable without required tags. Use AWS Resource Explorer to audit untagged DynamoDB tables across all regions. Enable tag-based access policies in IAM once classification tags are applied.",
    compliance_frameworks: ["CIS 1.1", "SOC2 CC1.4", "NIST SA-8"],
    encryption_type: "AWS_MANAGED_KEY",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: false,
    global_table: false,
    risk_score: 2,
  },
];

const mockDynamoDBSummary: DynamoDBScanSummary = {
  total_tables: 18,
  unencrypted_tables: 0,
  no_pitr: 5,
  no_deletion_protection: 4,
  no_streams: 7,
  critical_findings: 2,
  high_findings: 4,
  medium_findings: 3,
  low_findings: 1,
};

// ── Style helpers ────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff0040",
  HIGH: "#ff6b35",
  MEDIUM: "#ffb000",
  LOW: "#00ff88",
};
const SEVERITY_BG: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: "rgba(255,0,64,0.15)", color: "#ff0040" },
  HIGH: { bg: "rgba(255,107,53,0.15)", color: "#ff6b35" },
  MEDIUM: { bg: "rgba(255,176,0,0.15)", color: "#ffb000" },
  LOW: { bg: "rgba(0,255,136,0.15)", color: "#00ff88" },
};
const ENCRYPTION_LABEL: Record<string, { label: string; color: string }> = {
  AWS_OWNED_KEY: { label: "AWS-Owned", color: "#ff6b35" },
  AWS_MANAGED_KEY: { label: "AWS-Managed", color: "#ffb000" },
  CUSTOMER_MANAGED_KEY: { label: "CMK", color: "#00ff88" },
};
const cardStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(100,116,139,0.9)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
};
const monoStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ── Component ─────────────────────────────────────────────────────────────────
export function DynamoDBSecurity() {
  const [scanResult, setScanResult] = useState<DynamoDBScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { addScanResult } = useScanResults();

  // Auto-load mock data on mount
  useEffect(() => {
    setScanResult({
      scan_id: "ddb-scan-demo-001",
      status: "Completed",
      progress: 100,
      account_id: "123456789012",
      region: "us-east-1",
      findings: mockDynamoDBFindings,
      scan_summary: mockDynamoDBSummary,
      started_at: new Date(Date.now() - 150000).toISOString(),
      completed_at: new Date(Date.now() - 90000).toISOString(),
    });
  }, []);

  useEffect(() => {
    if (scanResult?.status === "Completed" && scanResult.scan_id !== "ddb-scan-demo-001") {
      toast.success("DynamoDB security scan completed!", {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("DynamoDB scan failed", { description: "Check AWS credentials and DynamoDB permissions" });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      toast.info("DynamoDB security scan started", { description: "Analyzing tables for encryption, PITR, streams, and access policies…" });
      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: { total_tables: 0, unencrypted_tables: 0, no_pitr: 0, no_deletion_protection: 0, no_streams: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0 },
      });
      const response: ScanResponse = await scanIAM(selectedRegion);
      const findings = response.results?.dynamodb?.findings ?? mockDynamoDBFindings;
      const summary = response.results?.dynamodb?.scan_summary ?? mockDynamoDBSummary;
      setScanResult({
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : 50,
        account_id: response.results?.account_id || "123456789012",
        region: response.region,
        findings,
        scan_summary: summary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      });
      setIsScanning(false);
      addScanResult({ ...response, scanner_type: "dynamodb", results: { ...response.results, dynamodb: { findings, scan_summary: summary } } });
    } catch {
      setScanResult({
        scan_id: `ddb-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings: mockDynamoDBFindings,
        scan_summary: mockDynamoDBSummary,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setIsScanning(false);
      toast.success("DynamoDB scan completed (demo mode)", { description: "Showing sample findings" });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("DynamoDB scan stopped");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const findings = scanResult?.findings ?? mockDynamoDBFindings;
  const filteredFindings = findings.filter(f => {
    const matchSev = severityFilter === "ALL" || f.severity === severityFilter;
    const matchSearch =
      findingSearch === "" ||
      f.table_name.toLowerCase().includes(findingSearch.toLowerCase()) ||
      f.finding_type.toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchSearch;
  });
  const summary = scanResult?.scan_summary ?? mockDynamoDBSummary;

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Database size={22} color="#a78bfa" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>DynamoDB</h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(100,116,139,0.7)", marginTop: 2 }}>
              Table encryption (CMK), PITR, deletion protection, streams, IAM policies, and retention
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{ ...monoStyle, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
          >
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
            <option value="ap-southeast-1">ap-southeast-1</option>
          </select>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: isScanning ? "rgba(167,139,250,0.1)" : "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", fontSize: 12, fontWeight: 600, cursor: isScanning ? "not-allowed" : "pointer" }}
          >
            <Play size={13} />
            {isScanning ? "Scanning…" : "Run Scan"}
          </button>
          {isScanning && (
            <button
              onClick={handleStopScan}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: "rgba(255,0,64,0.2)", border: "1px solid rgba(255,0,64,0.4)", color: "#ff0040", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Stop
            </button>
          )}
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.3)", color: "#ff0040", fontSize: 13 }}>
          <AlertTriangle size={13} style={{ display: "inline", marginRight: 6 }} />
          Scan Error: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Total Tables", value: summary.total_tables, color: "#a78bfa", sub: "Across all regions" },
          { label: "Critical Findings", value: summary.critical_findings, color: "#ff0040", sub: "Immediate action required" },
          { label: "High Findings", value: summary.high_findings, color: "#ff6b35", sub: "Remediate within 7 days" },
          { label: "PITR Disabled", value: summary.no_pitr, color: "#ffb000", sub: "No point-in-time restore" },
          { label: "No Streams", value: summary.no_streams, color: "#ff6b35", sub: "CDC and audit gaps" },
        ].map(card => (
          <div key={card.label} style={{ ...cardStyle, padding: "16px 18px" }}>
            <p style={{ ...labelStyle, margin: "0 0 8px" }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: card.color, ...monoStyle, lineHeight: 1 }}>{card.value}</p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(100,116,139,0.6)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Risk Indicators Strip */}
      <div style={{ ...cardStyle, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...labelStyle, marginRight: 4 }}>Risk Indicators</span>
        {[
          { label: `No Deletion Protection: ${summary.no_deletion_protection} tables`, color: "#ff0040" },
          { label: `No PITR: ${summary.no_pitr} tables`, color: "#ffb000" },
          { label: `No Streams: ${summary.no_streams} tables`, color: "#ff6b35" },
          { label: `Total Findings: ${summary.critical_findings + summary.high_findings + summary.medium_findings + summary.low_findings}`, color: "#818cf8" },
        ].map(chip => (
          <span key={chip.label} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${chip.color}18`, border: `1px solid ${chip.color}40`, color: chip.color, ...monoStyle }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => {
            const active = severityFilter === sev;
            const col = sev === "ALL" ? "#a78bfa" : SEVERITY_COLORS[sev];
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", background: active ? `${col}25` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? col : "rgba(255,255,255,0.08)"}`, color: active ? col : "rgba(100,116,139,0.7)", transition: "all 0.15s" }}
              >
                {sev}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
          <input
            value={findingSearch}
            onChange={e => setFindingSearch(e.target.value)}
            placeholder="Search tables, finding types…"
            style={{ width: "100%", padding: "7px 10px 7px 30px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", ...monoStyle }}
          />
        </div>
        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", ...monoStyle }}>{filteredFindings.length} findings</span>
      </div>

      {/* Findings Table */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 130px 110px 80px 80px 70px", gap: 0, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
          <div />
          <span style={{ ...labelStyle, paddingLeft: 12 }}>Table / Finding</span>
          <span style={labelStyle}>Encryption</span>
          <span style={labelStyle}>Severity</span>
          <span style={labelStyle}>PITR</span>
          <span style={labelStyle}>Streams</span>
          <span style={labelStyle}>Risk /10</span>
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Database size={40} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 14, margin: 0 }}>No findings match your filters</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const expanded = expandedRows.has(finding.id);
            const sevColor = SEVERITY_COLORS[finding.severity] ?? "#64748b";
            const isLast = idx === filteredFindings.length - 1;
            const encInfo = ENCRYPTION_LABEL[finding.encryption_type] ?? { label: finding.encryption_type, color: "#64748b" };
            return (
              <div key={finding.id}>
                <div
                  onClick={() => toggleRow(finding.id)}
                  style={{ display: "grid", gridTemplateColumns: "4px 1fr 130px 110px 80px 80px 70px", gap: 0, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: (!isLast || expanded) ? "1px solid rgba(255,255,255,0.04)" : "none", background: expanded ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)"; }}
                  onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", height: "100%" }}>
                    <div style={{ position: "absolute", left: 0, width: 4, top: -12, bottom: -12, background: sevColor, borderRadius: "0 2px 2px 0", opacity: 0.85 }} />
                  </div>

                  <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                      {expanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 6 }}>
                        {finding.table_name}
                        {finding.global_table && (
                          <span style={{ padding: "1px 5px", borderRadius: 3, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa", fontSize: 10, ...monoStyle }}>Global</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", ...monoStyle, marginTop: 1 }}>{finding.region}</div>
                      <div style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {finding.finding_type}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${encInfo.color}18`, border: `1px solid ${encInfo.color}30`, color: encInfo.color, ...monoStyle }}>
                      {encInfo.label}
                    </span>
                  </div>

                  <div>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: SEVERITY_BG[finding.severity]?.bg ?? "rgba(100,116,139,0.15)", color: sevColor, ...monoStyle }}>
                      {finding.severity}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {finding.point_in_time_recovery ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00ff88" }}>
                        <Lock size={11} color="#00ff88" />
                        On
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ff0040" }}>
                        <Unlock size={11} color="#ff0040" />
                        Off
                      </span>
                    )}
                  </div>

                  <div>
                    {finding.stream_enabled ? (
                      <span style={{ fontSize: 11, color: "#00ff88", ...monoStyle }}>✓ On</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#ff6b35", ...monoStyle }}>✗ Off</span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: finding.risk_score >= 9 ? "#ff0040" : finding.risk_score >= 7 ? "#ff6b35" : finding.risk_score >= 5 ? "#ffb000" : "#00ff88", ...monoStyle }}>
                      {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>/10</span>
                    </span>
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 16px 16px 36px", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                      <div>
                        <p style={{ ...labelStyle, margin: "0 0 6px" }}>Description</p>
                        <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>{finding.description}</p>
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 7, background: "rgba(255,176,0,0.07)", border: "1px solid rgba(255,176,0,0.2)" }}>
                          <p style={{ ...labelStyle, color: "rgba(255,176,0,0.8)", margin: "0 0 6px" }}>Recommendation</p>
                          <p style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.6, margin: 0 }}>{finding.recommendation}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{ ...labelStyle, margin: "0 0 8px" }}>Table Configuration</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, ...monoStyle }}>
                          {[
                            ["Region", finding.region],
                            ["Encryption", encInfo.label],
                            ["PITR", finding.point_in_time_recovery ? "✓ Enabled" : "✗ Disabled"],
                            ["Deletion Protection", finding.deletion_protection ? "✓ Enabled" : "✗ Disabled"],
                            ["Streams", finding.stream_enabled ? "✓ Enabled" : "✗ Disabled"],
                            ["Global Table", finding.global_table ? "✓ Yes" : "No"],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <span style={{ color: "rgba(100,116,139,0.6)" }}>{k}: </span>
                              <span style={{ color: v?.toString().startsWith("✗") ? "#ff6b35" : v?.toString().startsWith("✓") ? "#00ff88" : "#94a3b8" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 5, background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.1)" }}>
                          <p style={{ ...labelStyle, margin: "0 0 4px", fontSize: 9 }}>Table ARN</p>
                          <p style={{ fontSize: 10, color: "#64748b", margin: 0, wordBreak: "break-all", ...monoStyle }}>{finding.table_arn}</p>
                        </div>
                        {finding.compliance_frameworks.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ ...labelStyle, margin: "0 0 6px" }}>Compliance Frameworks</p>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {finding.compliance_frameworks.map(fw => (
                                <span key={fw} style={{ padding: "2px 7px", borderRadius: 4, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa", fontSize: 11, ...monoStyle }}>{fw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {!finding.deletion_protection && (
                          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "rgba(255,0,64,0.07)", border: "1px solid rgba(255,0,64,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                            <Clock size={14} color="#ff6b35" />
                            <span style={{ fontSize: 11, color: "#ff6b35" }}>No deletion protection — table can be dropped with a single API call</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
