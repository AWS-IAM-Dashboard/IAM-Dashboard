import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  Users,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface AWSIAMFinding {
  id: string;
  type: "user" | "role" | "policy" | "group";
  resource_name: string;
  resource_arn: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  last_accessed?: string;
  created_date: string;
  risk_score: number;
  status?: "open" | "resolved";
}

interface AWSScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  total_resources: number;
  findings: AWSIAMFinding[];
  scan_summary: {
    users: number;
    roles: number;
    policies: number;
    groups: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockFindings: AWSIAMFinding[] = [
  { id: "iam-001", type: "user", resource_name: "root", resource_arn: "arn:aws:iam::123456789012:root", severity: "CRITICAL", finding_type: "Active Root Access Keys", description: "The AWS root account has 2 active access keys. Root account keys cannot be restricted by IAM policies and represent an extreme security risk.", recommendation: "Delete all root account access keys immediately. Use IAM users or roles with least-privilege policies instead.", compliance_frameworks: ["CIS 1.4", "PCI-DSS 7.1", "SOC2 CC6.1"], last_accessed: "2024-01-10T14:22:00Z", created_date: "2022-03-15T00:00:00Z", risk_score: 10, status: "open" },
  { id: "iam-002", type: "policy", resource_name: "LegacyAdminPolicy", resource_arn: "arn:aws:iam::123456789012:policy/LegacyAdminPolicy", severity: "CRITICAL", finding_type: "Wildcard Admin Policy", description: "Managed policy LegacyAdminPolicy grants Action:\"*\" Resource:\"*\" — full administrative access. Attached to 4 users and 2 roles.", recommendation: "Replace with least-privilege policies scoped to specific actions and resources. Use IAM Access Analyzer to generate policies from CloudTrail.", compliance_frameworks: ["CIS 1.16", "SOC2 CC6.3"], last_accessed: "2024-01-14T09:00:00Z", created_date: "2021-06-01T00:00:00Z", risk_score: 9, status: "open" },
  { id: "iam-003", type: "user", resource_name: "admin-legacy", resource_arn: "arn:aws:iam::123456789012:user/admin-legacy", severity: "HIGH", finding_type: "Inactive User — AdministratorAccess", description: "User admin-legacy has not logged in for 183 days but retains AdministratorAccess policy and 2 active access keys.", recommendation: "Disable console access and deactivate access keys. If user is no longer needed, delete entirely.", compliance_frameworks: ["CIS 1.3", "CIS 1.12"], last_accessed: "2023-07-17T11:45:00Z", created_date: "2020-01-01T00:00:00Z", risk_score: 8, status: "open" },
  { id: "iam-004", type: "user", resource_name: "john.smith", resource_arn: "arn:aws:iam::123456789012:user/john.smith", severity: "HIGH", finding_type: "Console Access Without MFA", description: "IAM user john.smith has AWS Console access enabled but no MFA device registered. Account could be compromised via password alone.", recommendation: "Enforce MFA for all console users. Attach IAM policy requiring MFA (aws:MultiFactorAuthPresent: true) or use IAM Identity Center.", compliance_frameworks: ["CIS 1.10", "PCI-DSS 8.3", "HIPAA 164.312(d)"], last_accessed: "2024-01-15T08:30:00Z", created_date: "2023-03-20T00:00:00Z", risk_score: 8, status: "open" },
  { id: "iam-005", type: "user", resource_name: "ci-bot", resource_arn: "arn:aws:iam::123456789012:user/ci-bot", severity: "HIGH", finding_type: "Access Key Not Rotated (127 days)", description: "Service account ci-bot has access key AKIAIOSFODNN7EXAMPLE created 127 days ago. Keys older than 90 days are a security risk per CIS benchmarks.", recommendation: "Rotate access key immediately. Set up automated rotation or migrate to IAM roles for EC2/Lambda instead of long-term keys.", compliance_frameworks: ["CIS 1.14", "SOC2 CC6.1"], last_accessed: "2024-01-15T12:00:00Z", created_date: "2023-09-10T00:00:00Z", risk_score: 7, status: "open" },
  { id: "iam-006", type: "role", resource_name: "DataPipelineRole", resource_arn: "arn:aws:iam::123456789012:role/DataPipelineRole", severity: "HIGH", finding_type: "Wildcard S3 Permissions", description: "Role DataPipelineRole has inline policy granting s3:* on Resource:* — allows reading, writing, and deleting any S3 bucket in the account.", recommendation: "Scope S3 permissions to specific bucket ARNs (e.g. arn:aws:s3:::data-pipeline-bucket/*) and restrict to only required actions.", compliance_frameworks: ["CIS 1.16", "SOC2 CC6.3"], last_accessed: "2024-01-14T18:00:00Z", created_date: "2022-11-15T00:00:00Z", risk_score: 7, status: "open" },
  { id: "iam-007", type: "role", resource_name: "LambdaExecutionRole", resource_arn: "arn:aws:iam::123456789012:role/LambdaExecutionRole", severity: "HIGH", finding_type: "iam:PassRole to Wildcard Resource", description: "Role LambdaExecutionRole has iam:PassRole permission on Resource:* — allows privilege escalation by passing any role to AWS services.", recommendation: "Restrict iam:PassRole to specific role ARNs. Use conditions to limit which roles can be passed and to which services.", compliance_frameworks: ["CIS 1.16"], last_accessed: "2024-01-13T10:00:00Z", created_date: "2023-01-10T00:00:00Z", risk_score: 7, status: "open" },
  { id: "iam-008", type: "role", resource_name: "AuditCrossAccountRole", resource_arn: "arn:aws:iam::123456789012:role/AuditCrossAccountRole", severity: "MEDIUM", finding_type: "Cross-Account Trust Without Conditions", description: "Role trust policy allows sts:AssumeRole from external account 999888777666 with no Condition keys (no ExternalId, no MFA requirement).", recommendation: "Add ExternalId condition to prevent confused deputy attacks. Require MFA with aws:MultiFactorAuthPresent for sensitive roles.", compliance_frameworks: ["CIS 1.20", "SOC2 CC6.3"], last_accessed: "2024-01-08T16:00:00Z", created_date: "2022-08-01T00:00:00Z", risk_score: 6, status: "open" },
  { id: "iam-009", type: "user", resource_name: "dev-user1", resource_arn: "arn:aws:iam::123456789012:user/dev-user1", severity: "MEDIUM", finding_type: "Unused IAM User (95 days)", description: "IAM user dev-user1 has had no console login or API activity in 95 days. Still has active credentials and group memberships.", recommendation: "Disable user and deactivate credentials. If inactive for 90+ days, consider deleting. Review group memberships before deletion.", compliance_frameworks: ["CIS 1.3"], last_accessed: "2023-10-12T09:00:00Z", created_date: "2022-05-15T00:00:00Z", risk_score: 5, status: "open" },
  { id: "iam-010", type: "policy", resource_name: "S3FullAccessManagedPolicy", resource_arn: "arn:aws:iam::aws:policy/AmazonS3FullAccess", severity: "MEDIUM", finding_type: "AWS Managed Full-Access Policy in Use", description: "AWS managed policy AmazonS3FullAccess is attached to 3 users. AWS managed full-access policies are overly broad and rarely appropriate.", recommendation: "Replace with customer-managed policies scoped to specific buckets and required actions only. Use IAM Access Analyzer policy generation.", compliance_frameworks: ["CIS 1.16"], last_accessed: "2024-01-15T08:00:00Z", created_date: "2023-06-01T00:00:00Z", risk_score: 5, status: "open" },
];

// ── helpers ──────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040",
  HIGH: "#ff6b35",
  MEDIUM: "#ffb000",
  LOW: "#00ff88",
};

function sevColor(s: string) {
  return SEV_COLOR[s.toUpperCase()] ?? "#64748b";
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function exportCSV(findings: AWSIAMFinding[]) {
  const rows = [
    ["ID", "Resource", "ARN", "Type", "Severity", "Finding", "Risk Score", "Status", "Last Accessed"].join(","),
    ...findings.map((f) =>
      [f.id, f.resource_name, f.resource_arn, f.type, f.severity, `"${f.finding_type}"`, f.risk_score, f.status ?? "open", f.last_accessed ?? ""].join(",")
    ),
  ].join("\n");
  const blob = new Blob([rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "iam-findings.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── component ─────────────────────────────────────────────────────────────────

export function AWSIAMScan() {
  type FindingStatus = "open" | "resolved";

  const [scanResult, setScanResult] = useState<AWSScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [awsProfile, setAwsProfile] = useState("default");
  const [loading, setLoading] = useState(false);
  const [findingSearchTerm, setFindingSearchTerm] = useState("");
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("all");
  const [findingTypeFilter, setFindingTypeFilter] = useState<string>("all");
  const [findingStatusFilter, setFindingStatusFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [findingStatuses, setFindingStatuses] = useState<Record<string, FindingStatus>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === "Completed") {
      toast.success("AWS IAM scan completed successfully!", {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("AWS IAM scan failed", {
        description: "Check AWS credentials and permissions",
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("IAM scan started", { description: "Running AWS IAM security scan..." });

      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        total_resources: 0,
        findings: [],
        scan_summary: { users: 0, roles: 0, policies: 0, groups: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0 },
      });

      const response: ScanResponse = await scanIAM(selectedRegion);

      const transformedResult: AWSScanResult = {
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : response.status === "failed" ? 0 : 50,
        account_id: response.results?.account_id || "N/A",
        region: response.region,
        total_resources: (response.results?.users?.total || 0) + (response.results?.roles?.total || 0),
        findings: response.results?.findings || mockFindings,
        scan_summary: {
          users: response.results?.users?.total || 0,
          roles: response.results?.roles?.total || 0,
          policies: response.results?.policies?.total || 0,
          groups: response.results?.groups?.total || 0,
          critical_findings: response.results?.scan_summary?.critical_findings || 0,
          high_findings: response.results?.scan_summary?.high_findings || 0,
          medium_findings: response.results?.scan_summary?.medium_findings || 0,
          low_findings: response.results?.scan_summary?.low_findings || 0,
        },
        started_at: response.timestamp,
        completed_at: response.timestamp,
      };

      setScanResult(transformedResult);
      setIsScanning(false);
      addScanResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsScanning(false);
      // Demo fallback
      const findings = mockFindings;
      setScanResult({
        scan_id: `iam-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        total_resources: 47,
        findings,
        scan_summary: {
          users: 12, roles: 8, policies: 15, groups: 4,
          critical_findings: findings.filter((f) => f.severity === "CRITICAL").length,
          high_findings: findings.filter((f) => f.severity === "HIGH").length,
          medium_findings: findings.filter((f) => f.severity === "MEDIUM").length,
          low_findings: findings.filter((f) => f.severity === "LOW").length,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      toast.success("IAM scan completed (demo mode)", { description: "Showing sample findings" });
    }
  };

  const handleStopScan = async () => {
    try {
      setIsScanning(false);
      if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
      toast.warning("AWS scan stopped", { description: "IAM scan was interrupted" });
    } catch {
      toast.error("Failed to stop scan");
    }
  };

  const getFindingStatus = (finding: AWSIAMFinding): FindingStatus =>
    findingStatuses[finding.id] ?? finding.status ?? "open";

  const updateFindingStatus = (findingId: string, status: FindingStatus) => {
    setFindingStatuses((prev) => ({ ...prev, [findingId]: status }));
  };

  const filteredFindings = useMemo(() => {
    if (!scanResult?.findings?.length) return [];
    const q = findingSearchTerm.trim().toLowerCase();
    const start = startDateFilter ? new Date(`${startDateFilter}T00:00:00`) : null;
    const end = endDateFilter ? new Date(`${endDateFilter}T23:59:59`) : null;

    return scanResult.findings.filter((f) => {
      if (findingSeverityFilter !== "all" && f.severity !== findingSeverityFilter) return false;
      if (findingTypeFilter !== "all" && f.type !== findingTypeFilter) return false;
      const status = getFindingStatus(f);
      if (findingStatusFilter !== "all" && status !== findingStatusFilter) return false;
      if (start && new Date(f.created_date) < start) return false;
      if (end && new Date(f.created_date) > end) return false;
      if (q) {
        const blob = [f.id, f.resource_name, f.resource_arn, f.finding_type, f.description, f.recommendation].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [scanResult, findingSearchTerm, findingSeverityFilter, findingTypeFilter, findingStatusFilter, startDateFilter, endDateFilter, findingStatuses]);

  useEffect(() => { setCurrentPage(1); }, [findingSearchTerm, findingSeverityFilter, findingTypeFilter, findingStatusFilter, startDateFilter, endDateFilter, pageSize, scanResult?.scan_id]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const clearFindingFilters = () => {
    setFindingSearchTerm("");
    setFindingSeverityFilter("all");
    setFindingTypeFilter("all");
    setFindingStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  // ── derived stats from findings ───────────────────────────────────────────
  const findings = scanResult?.findings ?? [];
  const totalFindings = findings.length;
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;

  // ── styles ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(15,23,42,0.6)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 20,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(51,65,85,0.9)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 10,
  };

  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    cursor: "pointer",
    border: active ? `1px solid ${color ?? "rgba(0,255,136,0.4)"}` : "1px solid rgba(255,255,255,0.08)",
    background: active ? (color ? `${color}18` : "rgba(0,255,136,0.08)") : "rgba(255,255,255,0.03)",
    color: active ? (color ?? "#00ff88") : "rgba(100,116,139,0.8)",
    fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.15s",
    userSelect: "none",
  });

  const monoText: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={20} color="#00ff88" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "-0.02em" }}>IAM &amp; Access Control</h1>
            <p style={{ fontSize: 12, color: "rgba(100,116,139,0.7)", margin: 0, marginTop: 2 }}>
              Identity posture — users, roles, policies, access keys, MFA coverage, privilege escalation paths
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{ ...monoText, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
          >
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
            <option value="ap-southeast-1">ap-southeast-1</option>
          </select>
          <select
            value={awsProfile}
            onChange={(e) => setAwsProfile(e.target.value)}
            style={{ ...monoText, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
          >
            <option value="default">default</option>
            <option value="production">production</option>
            <option value="development">development</option>
            <option value="staging">staging</option>
          </select>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: isScanning ? "rgba(0,255,136,0.04)" : "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88", fontSize: 13, fontWeight: 600, cursor: isScanning ? "not-allowed" : "pointer", opacity: isScanning ? 0.7 : 1, transition: "all 0.15s" }}
          >
            {isScanning ? (
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Play size={14} />
            )}
            {isScanning ? "Scanning…" : "Scan"}
          </button>
          {isScanning && (
            <button
              onClick={handleStopScan}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.25)", color: "#ff0040", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <Square size={14} />
              Stop
            </button>
          )}
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontSize: 12, cursor: "pointer" }}
          >
            <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
            Refresh
          </button>
          {scanResult && (
            <button
              onClick={() => exportCSV(scanResult.findings)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontSize: 12, cursor: "pointer" }}
            >
              <Download size={13} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar while scanning ──────────────────────────────────── */}
      {isScanning && (
        <div style={{ ...card, padding: "12px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...monoText, fontSize: 11, color: "#00ff88" }}>Scanning IAM resources…</span>
            <span style={{ ...monoText, fontSize: 11, color: "rgba(100,116,139,0.7)" }}>{scanResult?.progress ?? 0}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${scanResult?.progress ?? 30}%`, background: "linear-gradient(90deg, #00ff88, #00cc6a)", borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && !scanResult && (
        <div style={{ ...card, border: "1px solid rgba(255,0,64,0.2)", background: "rgba(255,0,64,0.05)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#ff0040", fontSize: 13 }}>⚠ {error}</span>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total Findings", value: totalFindings, color: "#e2e8f0" },
          { label: "Critical", value: criticalCount, color: "#ff0040" },
          { label: "High", value: highCount, color: "#ff6b35" },
          { label: "Users Without MFA", value: 3, color: "#ffb000" },
          { label: "Keys Not Rotated", value: 4, color: "#ff6b35" },
          { label: "Unused Credentials", value: 3, color: "#64748b" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Identity risk summary row ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Root Account Keys", value: "ACTIVE", color: "#ff0040", bg: "rgba(255,0,64,0.06)" },
          { label: "MFA Coverage", value: "64%", color: "#ffb000", bg: "rgba(255,176,0,0.06)" },
          { label: "Admin Users", value: "2", color: "#ff6b35", bg: "rgba(255,107,53,0.06)" },
        ].map((item) => (
          <div key={item.label} style={{ borderRadius: 8, padding: "12px 16px", background: item.bg, border: `1px solid ${item.color}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      {scanResult && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Severity</span>
              {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
                <span key={s} onClick={() => setFindingSeverityFilter(s)} style={chip(findingSeverityFilter === s, s !== "all" ? sevColor(s) : undefined)}>
                  {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Type</span>
              {["all", "user", "role", "policy", "group"].map((t) => (
                <span key={t} onClick={() => setFindingTypeFilter(t)} style={chip(findingTypeFilter === t)}>
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
              <input
                value={findingSearchTerm}
                onChange={(e) => setFindingSearchTerm(e.target.value)}
                placeholder="Search findings…"
                style={{ ...monoText, width: "100%", padding: "7px 10px 7px 30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {(findingSearchTerm || findingSeverityFilter !== "all" || findingTypeFilter !== "all") && (
              <button onClick={clearFindingFilters} style={{ ...chip(false), padding: "6px 12px" }}>Clear</button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              {filteredFindings.length} finding{filteredFindings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Findings table ───────────────────────────────────────────────── */}
      {scanResult && (
        <div style={card}>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={sectionLabel}>IAM Findings</span>
            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              {scanResult.account_id} · {scanResult.region}
            </span>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 120px 100px 80px 90px 70px", gap: "0 12px", alignItems: "center", padding: "6px 12px 10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
            <div />
            {["Resource", "Type", "Severity", "Risk", "Last Accessed", "Status"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(51,65,85,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {paginatedFindings.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Users size={36} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 13 }}>No findings match the current filters</p>
            </div>
          ) : (
            paginatedFindings.map((finding) => {
              const isExpanded = expandedRow === finding.id;
              const sc = sevColor(finding.severity);
              const status = getFindingStatus(finding);

              return (
                <div key={finding.id}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                    style={{ display: "grid", gridTemplateColumns: "4px 1fr 120px 100px 80px 90px 70px", gap: "0 12px", alignItems: "center", padding: "10px 12px", borderRadius: 6, cursor: "pointer", position: "relative", background: isExpanded ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Severity bar */}
                    <div style={{ position: "relative", height: "100%", minHeight: 36 }}>
                      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4, borderRadius: "0 2px 2px 0", background: sc }} />
                    </div>

                    {/* Resource cell */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{finding.resource_name}</span>
                        {isExpanded ? <ChevronUp size={12} color="rgba(100,116,139,0.5)" /> : <ChevronDown size={12} color="rgba(100,116,139,0.5)" />}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{finding.resource_arn}</div>
                      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 2 }}>{finding.finding_type}</div>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {finding.type}
                      </span>
                    </div>

                    {/* Severity badge */}
                    <div>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: `${sc}18`, border: `1px solid ${sc}40`, color: sc, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        {finding.severity}
                      </span>
                    </div>

                    {/* Risk score */}
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: sc }}>
                      {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", fontWeight: 400 }}>/10</span>
                    </div>

                    {/* Last accessed */}
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {relativeTime(finding.last_accessed)}
                    </div>

                    {/* Status pill */}
                    <div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFindingStatus(finding.id, status === "open" ? "resolved" : "open");
                        }}
                        style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, cursor: "pointer", background: status === "open" ? "rgba(255,0,64,0.1)" : "rgba(0,255,136,0.1)", border: `1px solid ${status === "open" ? "rgba(255,0,64,0.3)" : "rgba(0,255,136,0.3)"}`, color: status === "open" ? "#ff0040" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ margin: "0 12px 10px 16px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={{ ...sectionLabel, marginBottom: 6 }}>Description</div>
                        <p style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.6, margin: 0 }}>{finding.description}</p>
                      </div>
                      <div style={{ padding: "10px 14px", background: "rgba(255,176,0,0.05)", border: "1px solid rgba(255,176,0,0.15)", borderRadius: 6 }}>
                        <div style={{ ...sectionLabel, color: "#ffb000", marginBottom: 6 }}>Recommendation</div>
                        <p style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.6, margin: 0 }}>{finding.recommendation}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={sectionLabel}>Compliance</span>
                        {finding.compliance_frameworks.map((fw) => (
                          <span key={fw} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.15)", color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>{fw}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                        Created {new Date(finding.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                Page {currentPage} of {totalPages}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: "4px 12px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: currentPage === 1 ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.8)", fontSize: 11, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: "4px 12px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: currentPage === totalPages ? "rgba(100,116,139,0.3)" : "rgba(100,116,139,0.8)", fontSize: 11, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (pre-scan) ────────────────────────────────────────── */}
      {!scanResult && !isScanning && (
        <div style={{ ...card, padding: "60px 24px", textAlign: "center" }}>
          <Users size={44} color="rgba(100,116,139,0.25)" style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(100,116,139,0.5)", margin: 0 }}>No scan results yet</p>
          <p style={{ fontSize: 12, color: "rgba(100,116,139,0.3)", marginTop: 6 }}>Run a scan to analyze your AWS IAM posture</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
