import { useState, useEffect, useMemo } from "react";
import {
  ScanLine,
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
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";
import { toast } from "sonner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useActiveScanResults } from "../hooks/useActiveScanResults";

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

// ── pre-populated workflows (blueprint / demo state) ────────────────────────
const INITIAL_AA_WORKFLOWS: Record<string, WorkflowData> = {
  "aa-001": {
    status: "IN_PROGRESS",
    assignee: "Dave Kim",
    ticket_id: "SEC-1052",
    first_seen: "2024-01-14T08:00:00Z",
    sla_hours_remaining: -6,
    sla_breached: true,
    timeline: [
      { id: "e1", timestamp: "2024-01-14T08:00:00Z", actor: "Access Analyzer", actor_type: "system", action: "Finding detected", note: "marketing-assets-prod bucket policy grants s3:GetObject to Principal:* — full public read confirmed" },
      { id: "e2", timestamp: "2024-01-14T08:12:00Z", actor: "PagerDuty", actor_type: "automation", action: "P1 alert triggered", note: "Public S3 bucket containing marketing assets — potential data exposure" },
      { id: "e3", timestamp: "2024-01-14T08:35:00Z", actor: "Dave Kim", actor_type: "analyst", action: "Triaged — true positive", note: "Verified bucket contains customer-facing assets only. No PII found in initial scan. Checking if intentional CDN origin." },
      { id: "e4", timestamp: "2024-01-14T09:00:00Z", actor: "Dave Kim", actor_type: "engineer", action: "S3 Block Public Access enabled", note: "Account-level Block Public Access enabled as immediate containment. Coordinating with marketing team to migrate to CloudFront + OAC." },
    ],
  },
  "aa-002": {
    status: "ASSIGNED",
    assignee: "Carol Singh",
    first_seen: "2024-01-13T12:00:00Z",
    sla_hours_remaining: 14,
    sla_breached: false,
    timeline: [
      { id: "e1", timestamp: "2024-01-13T12:00:00Z", actor: "Access Analyzer", actor_type: "system", action: "Finding detected", note: "data-backups-prod grants cross-account read to account 111122223333" },
      { id: "e2", timestamp: "2024-01-14T09:00:00Z", actor: "Carol Singh", actor_type: "analyst", action: "Assigned — pending vendor verification", note: "Account 111122223333 may be a 3rd party backup vendor. Checking contracts before removing access." },
    ],
  },
  "aa-003": {
    status: "TRIAGED",
    first_seen: "2024-01-12T16:00:00Z",
    sla_hours_remaining: 10,
    sla_breached: false,
    timeline: [
      { id: "e1", timestamp: "2024-01-12T16:00:00Z", actor: "Access Analyzer", actor_type: "system", action: "Finding detected", note: "AnalyticsPartnerRole assumable by external account 222233334444 with no conditions" },
      { id: "e2", timestamp: "2024-01-13T10:00:00Z", actor: "Bob Martinez", actor_type: "analyst", action: "Triaged — reviewing partner agreement", note: "Role created for analytics vendor onboarding. Trust policy missing ExternalId — known gap from 2022 setup. Scheduling fix." },
    ],
  },
  "aa-007": {
    status: "ASSIGNED",
    assignee: "Alice Chen",
    ticket_id: "SEC-1055",
    first_seen: "2024-01-11T08:00:00Z",
    sla_hours_remaining: 22,
    sla_breached: false,
    timeline: [
      { id: "e1", timestamp: "2024-01-11T08:00:00Z", actor: "Access Analyzer", actor_type: "system", action: "Finding detected", note: "prod/db-credentials secret shared with external account role DevOpsTeam" },
      { id: "e2", timestamp: "2024-01-11T09:30:00Z", actor: "Alice Chen", actor_type: "analyst", action: "URGENT — production credentials exposed cross-account", note: "Secret contains RDS master credentials. External account is contractor DevOps team. Initiating emergency rotation." },
    ],
  },
};

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
  const [workflows, setWorkflows] = useState<Record<string, WorkflowData>>({});
  const { addScanResult } = useActiveScanResults();

  useEffect(() => {
    const findings = scanResult?.findings ?? [];
    if (!findings.length) return;
    setWorkflows((prev) => {
      const next = { ...prev };
      findings.forEach((f) => {
        if (!next[f.id]) {
          next[f.id] = INITIAL_AA_WORKFLOWS[f.id] ?? {
            status: "NEW",
            first_seen: f.last_analyzed ?? new Date().toISOString(),
            sla_hours_remaining:
              f.severity === "CRITICAL" ? 4 :
              f.severity === "HIGH" ? 24 :
              f.severity === "MEDIUM" ? 168 : 720,
            sla_breached: false,
            timeline: [{
              id: `${f.id}-init`,
              timestamp: f.last_analyzed ?? new Date().toISOString(),
              actor: "Access Analyzer",
              actor_type: "system",
              action: "Finding detected",
              note: `${f.finding_type} on ${f.resource_name}`,
            }],
          };
        }
      });
      return next;
    });
  }, [scanResult?.findings]);

  const advanceStatus = (findingId: string) => {
    const NEXT: Record<string, WorkflowData["status"]> = {
      NEW: "TRIAGED", TRIAGED: "ASSIGNED", ASSIGNED: "IN_PROGRESS",
      IN_PROGRESS: "PENDING_VERIFY", PENDING_VERIFY: "REMEDIATED",
    };
    setWorkflows((prev) => {
      const w = prev[findingId];
      if (!w) return prev;
      const next = NEXT[w.status];
      if (!next) return prev;
      return { ...prev, [findingId]: { ...w, status: next, timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst", action: `Status advanced to ${next}` }] } };
    });
  };

  const assignFinding = (findingId: string, assignee: string) => {
    setWorkflows((prev) => {
      const w = prev[findingId] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] };
      return { ...prev, [findingId]: { ...w, assignee, status: (w.status === "NEW" || w.status === "TRIAGED") ? "ASSIGNED" : w.status, timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Assigned to ${assignee}` }] } };
    });
    toast.success(`Assigned to ${assignee}`);
  };

  const markFalsePositive = (findingId: string) => {
    setWorkflows((prev) => {
      const w = prev[findingId] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] };
      return { ...prev, [findingId]: { ...w, status: "FALSE_POSITIVE", timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: "Marked as false positive" }] } };
    });
    toast.info("Marked as false positive");
  };

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
    color: "rgba(100,116,139,0.55)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 10,
  };

  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "4px 8px",
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
    <div className="flex min-w-0 w-full flex-col gap-4 p-3 sm:gap-5 sm:p-5 md:px-7 md:py-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <ScanPageHeader
        icon={<ScanLine size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Access Analyzer"
        subtitle="External access findings — public resources, cross-account access, and unused permissions"
        isScanning={isScanning}
        onScan={handleStartScan}
        onStop={handleStopScan}
        onRefresh={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
      >
        {/* Analyzer type chips */}
        <div className="flex w-full min-w-0 sm:w-auto" style={{ gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 3 }}>
          {(["account", "organization"] as const).map((t) => (
            <span
              key={t}
              onClick={() => setAnalyzerType(t)}
              style={{ flex: 1, textAlign: "center", padding: "6px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace", background: analyzerType === t ? "rgba(0,255,136,0.1)" : "transparent", color: analyzerType === t ? "#00ff88" : "rgba(100,116,139,0.6)", border: analyzerType === t ? "1px solid rgba(0,255,136,0.2)" : "1px solid transparent", transition: "all 0.15s" }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </ScanPageHeader>

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Findings" value={findings.length} accent="#e2e8f0" />
        <StatCard label="Public Resources" value={publicCount} accent="#ff0040" />
        <StatCard label="Cross-Account" value={crossAccountCount} accent="#ff6b35" />
        <StatCard label="Unused Access" value={unusedCount} accent="#64748b" />
        <StatCard label="Secrets / Keys" value={sensitiveCount} accent="#ffb000" />
      </div>

      {/* ── External access risk banner ──────────────────────────────────── */}
      {scanResult && (publicCount + crossAccountCount) > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3" style={{ borderRadius: 8, padding: "12px 18px", background: "rgba(255,0,64,0.06)", border: "1px solid rgba(255,0,64,0.18)" }}>
          <Globe size={18} color="#ff0040" />
          <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
            {publicCount + crossAccountCount} resource{(publicCount + crossAccountCount) !== 1 ? "s" : ""} accessible from outside your account
          </span>
          <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)" }}>
            — {publicCount} public, {crossAccountCount} cross-account
          </span>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      {scanResult && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Severity</span>
              {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
                <span key={s} onClick={() => setSeverityFilter(s)} style={chip(severityFilter === s, s !== "all" ? sevColor(s) : undefined)}>
                  {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={sectionLabel}>Resource</span>
              {["all", "S3", "IAM", "Lambda", "KMS", "SQS", "Secrets Manager"].map((t) => (
                <span key={t} onClick={() => setTypeFilter(t)} style={chip(typeFilter === t)}>
                  {t === "all" ? "All" : t}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320, minWidth: 0 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search findings…"
                style={{ ...monoText, width: "100%", padding: "8px 12px 8px 32px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {(searchTerm || severityFilter !== "all" || typeFilter !== "all") && (
              <button onClick={() => { setSearchTerm(""); setSeverityFilter("all"); setTypeFilter("all"); }} style={{ ...chip(false), padding: "8px 12px" }}>Clear</button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              {filteredFindings.length} finding{filteredFindings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Findings table ───────────────────────────────────────────────── */}
      {scanResult && (
        <div className="min-w-0" style={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: 14 }}>
            <span style={sectionLabel}>Access Analyzer Findings</span>
            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
              {scanResult.account_id} · {scanResult.region}
            </span>
          </div>

          {filteredFindings.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <ScanLine size={36} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 13, margin: 0 }}>No findings match the current filters</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:hidden">
                {filteredFindings.map((finding, idx) => {
                  const isExpanded = expandedRow === finding.id;
                  const isLast = idx === filteredFindings.length - 1;
                  const sc = sevColor(finding.severity);
                  return (
                    <div key={finding.id} className={isLast ? "" : "border-b border-white/[0.06]"}>
                      <button
                        type="button"
                        className="w-full px-3 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
                        onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-semibold text-slate-200">{finding.resource_name}</div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{finding.finding_type}</div>
                          </div>
                          <SeverityBadge severity={finding.severity} size="sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>
                            <ResourceIcon type={finding.resource_type} />
                            {finding.resource_type}
                          </span>
                          <span style={{ fontSize: 11, color: finding.is_public ? "#ff0040" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                            {finding.is_public ? "Public" : "Private"}
                          </span>
                          <span className="ml-auto font-mono text-[12px] font-bold" style={{ color: sc }}>
                            {finding.risk_score}/10
                          </span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <div
                            className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Resource ARN</div>
                            <div className="break-all text-[11px] text-slate-300">{finding.resource_arn}</div>

                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Principal</div>
                            <div className="break-all text-[11px] text-slate-300">{finding.principal}</div>

                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Description</div>
                            <div className="text-[11px] leading-relaxed text-slate-300">{finding.description}</div>

                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommendation</div>
                            <div className="text-[11px] leading-relaxed text-slate-300">{finding.recommendation}</div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-500">Last analyzed: {relativeTime(finding.last_analyzed)}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRow(null);
                                }}
                                className="rounded border border-white/15 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/[0.06]"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block w-full overflow-x-auto">
                <div className="min-w-[760px]">
                  <div style={{ display: "grid", gridTemplateColumns: "4px 130px 1fr 120px 70px 60px 90px", gap: "0 12px", alignItems: "center", padding: "8px 12px 8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                    <div />
                    {["Type", "Resource", "Finding", "Public", "Risk", "Analyzed"].map((h) => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{h}</div>
                    ))}
                  </div>

                  {filteredFindings.map((finding) => {
                    const isExpanded = expandedRow === finding.id;
                    const sc = sevColor(finding.severity);
                    return (
                      <div key={finding.id}>
                        <div
                          onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                          style={{ display: "grid", gridTemplateColumns: "4px 130px 1fr 120px 70px 60px 90px", gap: "0 12px", alignItems: "center", padding: "8px 12px", borderRadius: 6, cursor: "pointer", position: "relative", background: isExpanded ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.12s" }}
                          onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                          onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                        >
                          <div style={{ position: "relative", height: "100%", minHeight: 36 }}>
                            <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4, borderRadius: "0 2px 2px 0", background: sc }} />
                          </div>
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>
                              <ResourceIcon type={finding.resource_type} />
                              {finding.resource_type}
                            </span>
                          </div>
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
                          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", lineHeight: 1.4 }}>{finding.finding_type}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {finding.is_public ? <Globe size={15} color="#ff0040" /> : <Lock size={15} color="#00ff88" />}
                            <span style={{ fontSize: 10, color: finding.is_public ? "#ff0040" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                              {finding.is_public ? "Public" : "Private"}
                            </span>
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: sc }}>
                            {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", fontWeight: 400 }}>/10</span>
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>
                            {relativeTime(finding.last_analyzed)}
                          </div>
                        </div>
                        {isExpanded && (
                          <FindingDetailPanel
                            finding={{
                              id: finding.id,
                              title: finding.finding_type,
                              resource_name: finding.resource_name,
                              resource_arn: finding.resource_arn,
                              severity: finding.severity,
                              description: finding.description,
                              recommendation: finding.recommendation,
                              risk_score: finding.risk_score,
                              compliance_frameworks: ["CIS 1.16", "SOC2 CC6.3", "AWS FBP"],
                              last_seen: finding.last_analyzed,
                              first_seen: finding.last_analyzed,
                              region: scanResult?.region,
                              metadata: {
                                "Resource Type": finding.resource_type,
                                "Principal": finding.principal.length > 50 ? finding.principal.slice(0, 48) + "…" : finding.principal,
                                "Public": finding.is_public ? "Yes — externally accessible" : "No — private",
                              },
                            }}
                            workflow={workflows[finding.id]}
                            onAdvanceStatus={advanceStatus}
                            onAssign={assignFinding}
                            onMarkFalsePositive={markFalsePositive}
                            onCreateTicket={(id) => toast.info("Create ticket", { description: `Wire to JIRA/ServiceNow for finding ${id}` })}
                            onClose={() => setExpandedRow(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Empty state (pre-scan) ────────────────────────────────────────── */}
      {!scanResult && !isScanning && (
        <div style={{ ...card, padding: "60px 24px", textAlign: "center" }}>
          <ScanLine size={44} color="rgba(100,116,139,0.25)" style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(100,116,139,0.5)", margin: 0 }}>No scan results yet</p>
          <p style={{ fontSize: 12, color: "rgba(100,116,139,0.3)", marginTop: 6 }}>Run a scan to find external access findings and public resources</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
