import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  ScanLine,
  RefreshCw,
  Globe,
  Lock,
  HardDrive,
  Users,
  Zap,
  Key,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface AccessAnalyzerFinding {
  id: string;
  resource_type: "S3" | "IAM" | "Lambda" | "KMS" | "SQS" | "Secrets Manager";
  resource_arn: string;
  resource_name: string;
  principal: string;
  finding_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  is_public: boolean;
  last_analyzed: string;
  risk_score: number;
}

interface AccessAnalyzerResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: AccessAnalyzerFinding[];
  scan_summary: {
    total_findings: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    public_resources: number;
    external_access_findings: number;
    unused_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockFindings: AccessAnalyzerFinding[] = [
  { id: "aa-001", resource_type: "S3", resource_arn: "arn:aws:s3:::marketing-assets-prod", resource_name: "marketing-assets-prod", principal: "*", finding_type: "Public Access via Bucket Policy", severity: "CRITICAL", description: "S3 bucket marketing-assets-prod has a bucket policy granting s3:GetObject to Principal:* — any unauthenticated user can download all objects.", recommendation: "Remove public s3:GetObject grant. Enable S3 Block Public Access at bucket and account level. Use CloudFront with OAC for public content delivery.", is_public: true, last_analyzed: "2024-01-15T10:00:00Z", risk_score: 10 },
  { id: "aa-002", resource_type: "S3", resource_arn: "arn:aws:s3:::data-backups-prod", resource_name: "data-backups-prod", principal: "arn:aws:iam::111122223333:root", finding_type: "Cross-Account Read Access", severity: "HIGH", description: "Bucket data-backups-prod grants s3:GetObject and s3:ListBucket to external AWS account 111122223333. This account is not in your organization.", recommendation: "Verify whether cross-account access is intentional. If not, remove the bucket policy statement. If intentional, add SCP restrictions.", is_public: false, last_analyzed: "2024-01-15T09:30:00Z", risk_score: 8 },
  { id: "aa-003", resource_type: "IAM", resource_arn: "arn:aws:iam::123456789012:role/AnalyticsPartnerRole", resource_name: "AnalyticsPartnerRole", principal: "arn:aws:iam::222233334444:root", finding_type: "Role Assumable by External Account", severity: "HIGH", description: "IAM role AnalyticsPartnerRole has a trust policy allowing sts:AssumeRole from external account 222233334444 with no conditions. The role has ReadOnlyAccess + s3:GetObject on sensitive buckets.", recommendation: "Add ExternalId condition key to prevent confused deputy. Limit trust to specific principal ARN (not account root). Enable CloudTrail to audit all assume-role events.", is_public: false, last_analyzed: "2024-01-14T16:00:00Z", risk_score: 8 },
  { id: "aa-004", resource_type: "KMS", resource_arn: "arn:aws:kms:us-east-1:123456789012:key/mrk-1234abcd", resource_name: "payment-encryption-key", principal: "arn:aws:iam::333344445555:root", finding_type: "KMS Key Shared with External Account", severity: "HIGH", description: "Customer-managed KMS key payment-encryption-key grants kms:Decrypt and kms:GenerateDataKey to external account 333344445555. This key encrypts payment processing data.", recommendation: "Review whether external access is required. Consider creating a separate KMS key for cross-account use. Enable KMS CloudTrail logging for all key usage.", is_public: false, last_analyzed: "2024-01-14T12:00:00Z", risk_score: 8 },
  { id: "aa-005", resource_type: "Lambda", resource_arn: "arn:aws:lambda:us-east-1:123456789012:function:data-processor", resource_name: "data-processor", principal: "*", finding_type: "Public Lambda Invocation", severity: "HIGH", description: "Lambda function data-processor has a resource-based policy allowing lambda:InvokeFunction from Principal:* — any AWS account or unauthenticated user can invoke this function.", recommendation: "Remove the public invocation grant. Use API Gateway with authentication, or restrict Lambda invocation to specific principals using resource-based policies.", is_public: true, last_analyzed: "2024-01-13T14:00:00Z", risk_score: 7 },
  { id: "aa-006", resource_type: "SQS", resource_arn: "arn:aws:sqs:us-east-1:123456789012:notification-queue", resource_name: "notification-queue", principal: "*", finding_type: "SQS Queue Publicly Accessible", severity: "MEDIUM", description: "SQS queue notification-queue allows sqs:SendMessage from Principal:* — any AWS principal can inject messages into this queue, potentially causing unauthorized processing.", recommendation: "Restrict SQS policy to specific IAM principals. Add aws:PrincipalOrgID condition to limit to your organization. Enable SQS dead-letter queue for poison message monitoring.", is_public: true, last_analyzed: "2024-01-12T10:00:00Z", risk_score: 6 },
  { id: "aa-007", resource_type: "Secrets Manager", resource_arn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db-credentials", resource_name: "prod/db-credentials", principal: "arn:aws:iam::444455556666:role/DevOpsTeam", finding_type: "Secret Shared Cross-Account", severity: "HIGH", description: "Secrets Manager secret prod/db-credentials grants secretsmanager:GetSecretValue to an external account role. This secret contains production database credentials.", recommendation: "Remove cross-account access. Share secrets via AWS Secrets Manager replication or use separate secrets per account. Rotate the secret immediately.", is_public: false, last_analyzed: "2024-01-11T08:00:00Z", risk_score: 8 },
  { id: "aa-008", resource_type: "IAM", resource_arn: "arn:aws:iam::123456789012:user/report-generator", resource_name: "report-generator", principal: "internal", finding_type: "Unused Access — 94 Days", severity: "LOW", description: "IAM user report-generator has been granted s3:GetObject on 12 buckets but has not accessed any S3 resource in 94 days. Unused permissions expand blast radius.", recommendation: "Use IAM Access Analyzer policy generation to create a minimal policy based on actual CloudTrail usage. Remove unused bucket permissions.", is_public: false, last_analyzed: "2024-01-10T06:00:00Z", risk_score: 3 },
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

function ResourceIcon({ type }: { type: string }) {
  const props = { size: 14, color: "rgba(100,116,139,0.7)" };
  switch (type) {
    case "S3": return <HardDrive {...props} />;
    case "IAM": return <Users {...props} />;
    case "Lambda": return <Zap {...props} />;
    case "KMS": return <Key {...props} />;
    case "SQS": return <MessageSquare {...props} />;
    case "Secrets Manager": return <Lock {...props} />;
    default: return <HardDrive {...props} />;
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export function AccessAnalyzer() {
  const [scanResult, setScanResult] = useState<AccessAnalyzerResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [analyzerType, setAnalyzerType] = useState<"account" | "organization">("account");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === "Completed") {
      toast.success("Access Analyzer scan completed!", {
        description: `Found ${scanResult.scan_summary.total_findings} policy findings`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("Access Analyzer scan failed", {
        description: "Check AWS credentials and IAM Access Analyzer permissions",
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("Access Analyzer scan started", {
        description: "Analyzing resource-based policies for external access...",
      });

      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: { total_findings: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0, public_resources: 0, external_access_findings: 0, unused_findings: 0 },
      });

      const response: ScanResponse = await scanIAM(selectedRegion);

      const findings = response.results?.access_analyzer?.findings ?? mockFindings;
      const summary = response.results?.access_analyzer?.scan_summary ?? {
        total_findings: findings.length,
        critical_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "CRITICAL").length,
        high_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "HIGH").length,
        medium_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "MEDIUM").length,
        low_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "LOW").length,
        public_resources: findings.filter((f: AccessAnalyzerFinding) => f.is_public).length,
        external_access_findings: findings.length,
        unused_findings: 0,
      };

      const transformedResult: AccessAnalyzerResult = {
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : response.status === "failed" ? 0 : 50,
        account_id: response.results?.account_id || "123456789012",
        region: response.region,
        findings,
        scan_summary: summary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      };

      setScanResult(transformedResult);
      setIsScanning(false);

      addScanResult({
        ...response,
        scanner_type: "access-analyzer",
        results: { ...response.results, access_analyzer: { findings, scan_summary: summary } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsScanning(false);
      const findings = mockFindings;
      setScanResult({
        scan_id: `aa-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings,
        scan_summary: {
          total_findings: findings.length,
          critical_findings: findings.filter((f) => f.severity === "CRITICAL").length,
          high_findings: findings.filter((f) => f.severity === "HIGH").length,
          medium_findings: findings.filter((f) => f.severity === "MEDIUM").length,
          low_findings: findings.filter((f) => f.severity === "LOW").length,
          public_resources: findings.filter((f) => f.is_public).length,
          external_access_findings: findings.filter((f) => f.principal !== "internal").length,
          unused_findings: findings.filter((f) => f.principal === "internal").length,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      toast.success("Access Analyzer scan completed (demo mode)", { description: "Showing sample findings for demo" });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("Access Analyzer scan stopped");
  };

  const filteredFindings = useMemo(() => {
    if (!scanResult?.findings?.length) return [];
    const q = searchTerm.trim().toLowerCase();
    return scanResult.findings.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (typeFilter !== "all" && f.resource_type !== typeFilter) return false;
      if (q) {
        const blob = [f.id, f.resource_name, f.resource_arn, f.finding_type, f.description, f.principal].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [scanResult, severityFilter, typeFilter, searchTerm]);

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
    userSelect: "none" as const,
  });

  const monoText: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const findings = scanResult?.findings ?? [];
  const publicCount = findings.filter((f) => f.is_public).length;
  const crossAccountCount = findings.filter((f) => !f.is_public && f.principal !== "internal").length;
  const unusedCount = findings.filter((f) => f.principal === "internal").length;
  const sensitiveCount = findings.filter((f) => f.resource_type === "KMS" || f.resource_type === "Secrets Manager").length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ScanLine size={20} color="#00ff88" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "-0.02em" }}>Access Analyzer</h1>
            <p style={{ fontSize: 12, color: "rgba(100,116,139,0.7)", margin: 0, marginTop: 2 }}>
              External access findings — public resources, cross-account access, and unused permissions
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Analyzer type chips */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 3 }}>
            {(["account", "organization"] as const).map((t) => (
              <span
                key={t}
                onClick={() => setAnalyzerType(t)}
                style={{ padding: "4px 12px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", background: analyzerType === t ? "rgba(0,255,136,0.1)" : "transparent", color: analyzerType === t ? "#00ff88" : "rgba(100,116,139,0.6)", border: analyzerType === t ? "1px solid rgba(0,255,136,0.2)" : "1px solid transparent", transition: "all 0.15s" }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            ))}
          </div>
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
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, background: isScanning ? "rgba(0,255,136,0.04)" : "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88", fontSize: 13, fontWeight: 600, cursor: isScanning ? "not-allowed" : "pointer", opacity: isScanning ? 0.7 : 1 }}
          >
            {isScanning ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
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
        </div>
      </div>

      {/* ── Progress bar while scanning ──────────────────────────────────── */}
      {isScanning && (
        <div style={{ ...card, padding: "12px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...monoText, fontSize: 11, color: "#00ff88" }}>Analyzing resource-based policies…</span>
            <span style={{ ...monoText, fontSize: 11, color: "rgba(100,116,139,0.7)" }}>{scanResult?.progress ?? 0}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${scanResult?.progress ?? 30}%`, background: "linear-gradient(90deg, #00ff88, #00cc6a)", borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && !scanResult && (
        <div style={{ ...card, border: "1px solid rgba(255,0,64,0.2)", background: "rgba(255,0,64,0.05)", padding: "12px 16px" }}>
          <span style={{ color: "#ff0040", fontSize: 13 }}>⚠ {error}</span>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Total Findings", value: findings.length, color: "#e2e8f0" },
          { label: "Public Resources", value: publicCount, color: "#ff0040" },
          { label: "Cross-Account", value: crossAccountCount, color: "#ff6b35" },
          { label: "Unused Access", value: unusedCount, color: "#64748b" },
          { label: "Secrets / Keys", value: sensitiveCount, color: "#ffb000" },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── External access risk banner ──────────────────────────────────── */}
      {scanResult && (publicCount + crossAccountCount) > 0 && (
        <div style={{ borderRadius: 8, padding: "12px 18px", background: "rgba(255,0,64,0.06)", border: "1px solid rgba(255,0,64,0.18)", display: "flex", alignItems: "center", gap: 12 }}>
          <Globe size={18} color="#ff0040" />
          <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
            {publicCount + crossAccountCount} resource{(publicCount + crossAccountCount) !== 1 ? "s" : ""} accessible from outside your account
          </span>
          <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginLeft: 4 }}>
            — {publicCount} public, {crossAccountCount} cross-account
          </span>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      {scanResult && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Severity</span>
              {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
                <span key={s} onClick={() => setSeverityFilter(s)} style={chip(severityFilter === s, s !== "all" ? sevColor(s) : undefined)}>
                  {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Resource</span>
              {["all", "S3", "IAM", "Lambda", "KMS", "SQS", "Secrets Manager"].map((t) => (
                <span key={t} onClick={() => setTypeFilter(t)} style={chip(typeFilter === t)}>
                  {t === "all" ? "All" : t}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search findings…"
                style={{ ...monoText, width: "100%", padding: "7px 10px 7px 30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {(searchTerm || severityFilter !== "all" || typeFilter !== "all") && (
              <button onClick={() => { setSearchTerm(""); setSeverityFilter("all"); setTypeFilter("all"); }} style={{ ...chip(false), padding: "6px 12px" }}>Clear</button>
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
            <span style={sectionLabel}>Access Analyzer Findings</span>
            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              {scanResult.account_id} · {scanResult.region}
            </span>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "4px 130px 1fr 120px 70px 60px 90px", gap: "0 12px", alignItems: "center", padding: "6px 12px 10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
            <div />
            {["Type", "Resource", "Finding", "Public", "Risk", "Analyzed"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(51,65,85,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filteredFindings.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <ScanLine size={36} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 13, margin: 0 }}>No findings match the current filters</p>
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isExpanded = expandedRow === finding.id;
              const sc = sevColor(finding.severity);

              return (
                <div key={finding.id}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                    style={{ display: "grid", gridTemplateColumns: "4px 130px 1fr 120px 70px 60px 90px", gap: "0 12px", alignItems: "center", padding: "10px 12px", borderRadius: 6, cursor: "pointer", position: "relative", background: isExpanded ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Severity bar */}
                    <div style={{ position: "relative", height: "100%", minHeight: 36 }}>
                      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4, borderRadius: "0 2px 2px 0", background: sc }} />
                    </div>

                    {/* Resource type badge */}
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>
                        <ResourceIcon type={finding.resource_type} />
                        {finding.resource_type}
                      </span>
                    </div>

                    {/* Resource name + ARN + principal */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{finding.resource_name}</span>
                        {isExpanded ? <ChevronUp size={12} color="rgba(100,116,139,0.5)" /> : <ChevronDown size={12} color="rgba(100,116,139,0.5)" />}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{finding.resource_arn}</div>
                      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.35)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                        {finding.principal.length > 40 ? finding.principal.slice(0, 38) + "…" : finding.principal}
                      </div>
                    </div>

                    {/* Finding type */}
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", lineHeight: 1.4 }}>{finding.finding_type}</div>

                    {/* Public indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {finding.is_public ? (
                        <Globe size={15} color="#ff0040" />
                      ) : (
                        <Lock size={15} color="#00ff88" />
                      )}
                      <span style={{ fontSize: 10, color: finding.is_public ? "#ff0040" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                        {finding.is_public ? "Public" : "Private"}
                      </span>
                    </div>

                    {/* Risk score */}
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: sc }}>
                      {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", fontWeight: 400 }}>/10</span>
                    </div>

                    {/* Last analyzed */}
                    <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {relativeTime(finding.last_analyzed)}
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ ...sectionLabel, marginBottom: 0 }}>Principal Details</div>
                        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(100,116,139,0.7)", fontFamily: "'JetBrains Mono', monospace", display: "inline-block", wordBreak: "break-all" }}>
                          {finding.principal}
                        </span>
                      </div>
                      <div style={{ padding: "8px 12px", background: "rgba(100,116,139,0.05)", border: "1px solid rgba(100,116,139,0.1)", borderRadius: 4 }}>
                        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)" }}>
                          Compliance note: This finding may violate CIS AWS Foundations Benchmark controls for resource-based policy security and least-privilege access.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Empty state (pre-scan) ────────────────────────────────────────── */}
      {!scanResult && !isScanning && (
        <div style={{ ...card, padding: "60px 24px", textAlign: "center" }}>
          <ScanLine size={44} color="rgba(100,116,139,0.25)" style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(100,116,139,0.5)", margin: 0 }}>No scan results yet</p>
          <p style={{ fontSize: 12, color: "rgba(100,116,139,0.3)", marginTop: 6 }}>Run a scan to find external access findings and public resources</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
