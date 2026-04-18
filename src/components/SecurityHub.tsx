import { useState, useEffect } from "react";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";
import {
  Play,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard as SharedStatCard } from "./ui/StatCard";
import { ScanEmptyState } from "./ui/EmptyState";
import { toast } from "sonner";
import { scanSecurityHub, type ScanResponse } from "../services/api";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { useAwsAccount } from "../context/AwsAccountContext";

interface SecurityHubFinding {
  id: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  status: "NEW" | "NOTIFIED" | "SUPPRESSED" | "RESOLVED";
  product_name: string;
  resource_type: string;
  resource_id: string;
  region: string;
  created_at: string;
  updated_at: string;
  compliance_status: string;
  workflow_status: string;
}

interface SecurityHubSummary {
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  informational_findings: number;
  new_findings: number;
  resolved_findings: number;
  compliance_score: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "rgba(15,23,42,0.6)",
  border: "rgba(255,255,255,0.06)",
  borderRadius: 10,
  critical: "#ff0040",
  high: "#ff6b35",
  medium: "#ffb000",
  low: "#00ff88",
  info: "#64748b",
  text: "#e2e8f0",
  muted: "rgba(100,116,139,0.7)",
  mono: "'JetBrains Mono', monospace",
  cardBg: "rgba(15,23,42,0.8)",
  green: "#00ff88",
};

const severityColor = (s: string) => {
  switch (s) {
    case "CRITICAL":     return C.critical;
    case "HIGH":         return C.high;
    case "MEDIUM":       return C.medium;
    case "LOW":          return C.low;
    case "INFORMATIONAL":return C.info;
    default:             return C.info;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "NEW":       return "#3b82f6";
    case "NOTIFIED":  return C.medium;
    case "SUPPRESSED":return C.info;
    case "RESOLVED":  return C.low;
    default:          return C.info;
  }
};

const relativeAge = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

// ─── Chip component ───────────────────────────────────────────────────────────
function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        cursor: "pointer",
        border: `1px solid ${active ? (color ?? C.green) : C.border}`,
        background: active
          ? color
            ? `${color}22`
            : "rgba(0,255,136,0.12)"
          : "transparent",
        color: active ? (color ?? C.green) : C.muted,
        transition: "all 0.15s",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

export function SecurityHub() {
  const [findings, setFindings] = useState<SecurityHubFinding[]>([]);
  const [summary, setSummary] = useState<SecurityHubSummary>({
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
    medium_findings: 0,
    low_findings: 0,
    informational_findings: 0,
    new_findings: 0,
    resolved_findings: 0,
    compliance_score: 100,
  });
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [workflows, setWorkflows] = useState<Record<string, WorkflowData>>({});
  const { addScanResult, getScanResult, scanResultsVersion } = useActiveScanResults();
  const { selectedAccount } = useAwsAccount();
  const selectedAccountKey = selectedAccount?.id ?? "__none__";

  // Animate scan progress bar
  useEffect(() => {
    if (!isScanning) { setScanProgress(0); return; }
    setScanProgress(10);
    const interval = setInterval(() => {
      setScanProgress((p) => Math.min(p + Math.random() * 8, 85));
    }, 600);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Load existing scan results if available; clear on account switch
  useEffect(() => {
    const existingResult = getScanResult("security-hub");
    if (existingResult && existingResult.findings && existingResult.findings.length > 0) {
      transformAndSetFindings(existingResult);
    } else {
      setFindings([]);
      setSummary({ total_findings: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0, informational_findings: 0, new_findings: 0, resolved_findings: 0, compliance_score: 100 });
      setWorkflows({});
      setExpandedRow(null);
      setError(null);
      setSelectedSeverity("all");
      setSelectedStatus("all");
      setSelectedProduct("all");
      setSearchQuery("");
    }
  }, [selectedAccountKey, scanResultsVersion]);

  // Initialize workflow stubs when findings load
  useEffect(() => {
    if (!findings.length) return;
    setWorkflows(prev => {
      const next = { ...prev };
      findings.forEach(f => {
        if (!next[f.id]) {
          next[f.id] = {
            status: "NEW",
            first_seen: f.created_at ?? new Date().toISOString(),
            sla_hours_remaining: f.severity === "CRITICAL" || (typeof f.severity === "number" && f.severity >= 9) ? 4 : f.severity === "HIGH" || (typeof f.severity === "number" && f.severity >= 7) ? 24 : 168,
            sla_breached: false,
            timeline: [{ id: `${f.id}-init`, timestamp: new Date().toISOString(), actor: "Scanner", actor_type: "system" as const, action: "Finding detected", note: `${f.title ?? f.id}` }],
          };
        }
      });
      return next;
    });
  }, [findings]);

  const advanceStatus = (id: string) => {
    setWorkflows(prev => {
      if (!prev[id]) return prev;
      const order: WorkflowData["status"][] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REMEDIATED"];
      const idx = order.indexOf(prev[id].status as WorkflowData["status"]);
      const next = idx < order.length - 1 ? order[idx + 1] : prev[id].status as WorkflowData["status"];
      return { ...prev, [id]: { ...prev[id], status: next, timeline: [...prev[id].timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Analyst", actor_type: "analyst" as const, action: `Status advanced to ${next}`, note: "" }] } };
    });
  };

  const assignFinding = (id: string, assignee: string) => {
    setWorkflows(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], assignee, status: "ASSIGNED", timeline: [...prev[id].timeline, { id: `${id}-assign-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Analyst", actor_type: "analyst" as const, action: `Assigned to ${assignee}`, note: "" }] } };
    });
  };

  const markFalsePositive = (id: string) => {
    setWorkflows(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], status: "FALSE_POSITIVE", timeline: [...prev[id].timeline, { id: `${id}-fp-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Analyst", actor_type: "analyst" as const, action: "Marked as false positive", note: "" }] } };
    });
  };

  // Transform Lambda response to component format
  const transformAndSetFindings = (scanResponse: any) => {
    const results = scanResponse.results || scanResponse;

    const transformedFindings: SecurityHubFinding[] = (results.findings || []).map(
      (finding: any) => {
        const severity =
          finding.Severity?.Label || finding.severity || "INFORMATIONAL";
        const workflow =
          finding.Workflow?.Status || finding.workflow_status || "NEW";
        const compliance =
          finding.Compliance?.Status || finding.compliance_status || "UNKNOWN";

        return {
          id: finding.Id || finding.id || `sh-${Date.now()}-${Math.random()}`,
          title: finding.Title || finding.title || "Security Finding",
          description: finding.Description || finding.description || "",
          severity: severity.toUpperCase() as SecurityHubFinding["severity"],
          status: workflow.toUpperCase() as SecurityHubFinding["status"],
          product_name:
            finding.ProductFields?.["aws/securityhub/ProductName"] ||
            finding.ProductName ||
            finding.product_name ||
            "Security Hub",
          resource_type:
            finding.Resources?.[0]?.Type || finding.resource_type || "Unknown",
          resource_id:
            finding.Resources?.[0]?.Id || finding.resource_id || "N/A",
          region:
            finding.Resources?.[0]?.Region || finding.region || selectedRegion,
          created_at:
            finding.CreatedAt || finding.created_at || new Date().toISOString(),
          updated_at:
            finding.UpdatedAt || finding.updated_at || new Date().toISOString(),
          compliance_status: compliance,
          workflow_status: workflow,
        };
      }
    );

    setFindings(transformedFindings);

    const summaryData = results.summary || {};
    setSummary({
      total_findings:
        summaryData.total_findings || transformedFindings.length,
      critical_findings: summaryData.critical || 0,
      high_findings: summaryData.high || 0,
      medium_findings: summaryData.medium || 0,
      low_findings: summaryData.low || 0,
      informational_findings: transformedFindings.filter(
        (f) => f.severity === "INFORMATIONAL"
      ).length,
      new_findings: transformedFindings.filter((f) => f.status === "NEW")
        .length,
      resolved_findings: transformedFindings.filter(
        (f) => f.status === "RESOLVED"
      ).length,
      compliance_score:
        summaryData.compliance_score ||
        (transformedFindings.length === 0
          ? 100
          : Math.max(
              0,
              Math.round(
                100 -
                  ((summaryData.critical || 0) * 10 +
                    (summaryData.high || 0) * 5 +
                    (summaryData.medium || 0) * 2)
              )
            )),
    });
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("Security Hub scan started", {
        description: "Fetching security findings from AWS Security Hub...",
      });

      const response: ScanResponse = await scanSecurityHub(selectedRegion, selectedAccount?.accountId || undefined);

      const errorMsg =
        response.error || response.results?.error || response.message;
      if (errorMsg) {
        if (
          errorMsg.toLowerCase().includes("not enabled") ||
          errorMsg.toLowerCase().includes("invalidaccess")
        ) {
          toast.error("Security Hub not enabled", {
            description:
              "Please enable AWS Security Hub in this region first",
          });
          setError(
            "Security Hub is not enabled in this region. Please enable it in the AWS Console."
          );
        } else if (
          errorMsg.toLowerCase().includes("permission") ||
          errorMsg.toLowerCase().includes("accessdenied")
        ) {
          toast.error("Permission denied", {
            description:
              "Lambda does not have permission to access Security Hub",
          });
          setError(
            "Lambda does not have permission to access Security Hub. Please check IAM permissions."
          );
        } else {
          toast.error("Security Hub scan failed", { description: errorMsg });
          setError(errorMsg);
        }
        setIsScanning(false);
        return;
      }

      if (!response.results) {
        setError("Invalid response format from Security Hub scan.");
        setIsScanning(false);
        return;
      }

      const foundFindings = response.results.findings || [];
      const foundSummary = response.results.summary || {};

      addScanResult(response);
      transformAndSetFindings(response);
      setScanProgress(100);
      setIsScanning(false);

      const findingsCount =
        foundSummary.total_findings || foundFindings.length || 0;
      if (findingsCount > 0) {
        toast.success("Security Hub scan completed", {
          description: `Found ${findingsCount} security findings`,
        });
      } else {
        toast.success("Security Hub scan completed", {
          description: "No security findings found (this is good!)",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setIsScanning(false);
      const normalized = msg.toLowerCase();
      if (normalized.includes('forbidden') ||
+        normalized.includes('unauthorized') ||
+        normalized.includes('permission') ||
+        normalized.includes('accessdenied') ||
         normalized.includes('authentication required') ) {
        toast.error('Permission denied', {
          description: msg,
          duration: 8000,
          style: { color: '#ff0040', borderColor: 'rgba(255,0,64,0.4)' },
        });
      } else {
        toast.error("Failed to scan Security Hub", { description: msg });
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await handleStartScan();
    setIsRefreshing(false);
  };

  const handleResetFilters = () => {
    setSelectedSeverity("all");
    setSelectedStatus("all");
    setSelectedProduct("all");
    setSearchQuery("");
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== "all" && f.severity !== selectedSeverity)
      return false;
    if (selectedStatus !== "all" && f.status !== selectedStatus) return false;
    if (selectedProduct !== "all" && f.product_name !== selectedProduct)
      return false;
    if (
      searchQuery &&
      !f.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !f.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !f.resource_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div style={{ padding: "24px 28px", color: C.text, fontFamily: "DM Sans, sans-serif", minHeight: "100vh" }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <ScanPageHeader
        icon={<Shield size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Security Hub"
        subtitle="Centralized aggregation of findings from GuardDuty, Config, Inspector, Macie, and IAM Access Analyzer"
        isScanning={isScanning}
        onScan={handleStartScan}
        onRefresh={handleRefresh}
        onExport={() => {}}
        scanLabel="Scan Security Hub"
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
      />

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "rgba(255,0,64,0.07)",
            border: `1px solid ${C.critical}55`,
            borderRadius: C.borderRadius,
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={18} color={C.critical} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#ffb3b3" }}>{error}</p>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Scan progress ─────────────────────────────────────────────────── */}
      {isScanning && (
        <div
          style={{
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: C.borderRadius,
            padding: "16px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.text }}>Scanning Security Hub…</span>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: C.mono }}>{Math.round(scanProgress)}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${scanProgress}%`,
                background: `linear-gradient(90deg, ${C.green}, #00ccff)`,
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
        <SharedStatCard label="Total Findings" value={summary.total_findings} accent={C.text} icon={Shield} />
        <SharedStatCard label="Critical" value={summary.critical_findings} accent={C.critical} icon={AlertTriangle} />
        <SharedStatCard label="High" value={summary.high_findings} accent={C.high} icon={AlertTriangle} />
        <SharedStatCard label="Medium" value={summary.medium_findings} accent={C.medium} />
        <SharedStatCard label="Low" value={summary.low_findings} accent={C.low} />
        <SharedStatCard label="Resolved" value={summary.resolved_findings} accent={C.info} icon={CheckCircle2} />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: C.borderRadius,
          padding: "12px 16px",
          marginBottom: 16,
        }}
      >
        {/* Search row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 12,
          }}
        >
          <Search size={13} color={C.muted} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings, resource IDs…"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 13,
              width: "100%",
              fontFamily: "DM Sans, sans-serif",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Chip rows */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {/* Severity chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 60, flexShrink: 0 }}>
              Severity
            </span>
            {(["all", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] as const).map((s) => (
              <Chip
                key={s}
                label={s === "all" ? "All" : s === "INFORMATIONAL" ? "Info" : s.charAt(0) + s.slice(1).toLowerCase()}
                active={selectedSeverity === s}
                color={s === "all" ? undefined : severityColor(s)}
                onClick={() => setSelectedSeverity(s)}
              />
            ))}
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 60, flexShrink: 0 }}>
              Status
            </span>
            {(["all", "NEW", "NOTIFIED", "SUPPRESSED", "RESOLVED"] as const).map((s) => (
              <Chip
                key={s}
                label={s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                active={selectedStatus === s}
                color={s === "all" ? undefined : statusColor(s)}
                onClick={() => setSelectedStatus(s)}
              />
            ))}
          </div>

          {/* Product chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 60, flexShrink: 0 }}>
              Product
            </span>
            {(["all", "Security Hub", "GuardDuty", "Config", "Inspector", "Macie"] as const).map((p) => (
              <Chip
                key={p}
                label={p === "all" ? "All" : p}
                active={selectedProduct === p}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Findings table ───────────────────────────────────────────────── */}
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: C.borderRadius,
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              Security Findings
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: C.mono,
                color: C.muted,
                background: "rgba(255,255,255,0.06)",
                padding: "1px 7px",
                borderRadius: 4,
              }}
            >
              {filteredFindings.length}
            </span>
          </div>
        </div>

        {/* Column headers */}
        {filteredFindings.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "4px 1fr 120px 180px 90px 90px 80px",
              padding: "8px 16px 8px 0",
              borderBottom: `1px solid ${C.border}`,
              gap: 0,
            }}
          >
            <div />
            <div style={{ padding: "0 12px", fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Title</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Product</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Resource ID</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Region</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Status</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Age</div>
          </div>
        )}

        {/* Empty state */}
        {filteredFindings.length === 0 && !isScanning && (
          <ScanEmptyState
            variant={findings.length === 0 ? "pre-scan" : "no-results"}
            icon={Shield}
            serviceName="Security Hub"
            title={findings.length === 0 ? "No Security Hub findings yet" : undefined}
            subtitle={findings.length === 0
              ? "Run a scan to fetch live Security Hub findings and compliance status from your AWS account."
              : undefined}
            onAction={findings.length === 0 ? handleStartScan : handleResetFilters}
            actionLabel={findings.length === 0 ? "Start Scan" : "Clear filters"}
            secondaryLabel={findings.length > 0 ? "Try a different search" : undefined}
          />
        )}

        {/* Rows */}
        {filteredFindings.map((finding, idx) => {
          const accent = severityColor(finding.severity);
          const isExpanded = expandedRow === finding.id;

          return (
            <div key={finding.id}>
              {/* Main row */}
              <div
                onClick={() =>
                  setExpandedRow(isExpanded ? null : finding.id)
                }
                style={{
                  display: "grid",
                  gridTemplateColumns: "4px 1fr 120px 180px 90px 90px 80px",
                  alignItems: "center",
                  cursor: "pointer",
                  background:
                    idx % 2 === 0
                      ? "transparent"
                      : "rgba(255,255,255,0.015)",
                  borderBottom: `1px solid ${C.border}`,
                  transition: "background 0.12s",
                  position: "relative" as const,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")
                }
              >
                {/* Severity bar */}
                <div
                  style={{
                    width: 4,
                    alignSelf: "stretch",
                    background: accent,
                    flexShrink: 0,
                  }}
                />

                {/* Title + description */}
                <div style={{ padding: "8px 12px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {finding.title}
                    </p>
                    {isExpanded ? (
                      <ChevronUp size={12} color={C.muted} style={{ flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={12} color={C.muted} style={{ flexShrink: 0 }} />
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: C.muted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                      marginTop: 2,
                    }}
                  >
                    {finding.description}
                  </p>
                </div>

                {/* Product */}
                <div style={{ fontSize: 12, color: C.muted }}>{finding.product_name}</div>

                {/* Resource ID */}
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: "#94a3b8",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                    paddingRight: 8,
                  }}
                  title={finding.resource_id}
                >
                  {finding.resource_id}
                </div>

                {/* Region */}
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}>{finding.region}</div>

                {/* Status badge */}
                <div>
                  <SeverityBadge severity={finding.status} size="sm" />
                </div>

                {/* Age */}
                <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
                  {relativeAge(finding.created_at)}
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <FindingDetailPanel
                  finding={{
                    id: finding.id,
                    title: finding.title,
                    resource_name: finding.resource_id,
                    resource_arn: finding.resource_id,
                    severity: finding.severity,
                    description: finding.description,
                    recommendation: undefined,
                    risk_score: undefined,
                    compliance_frameworks: undefined,
                    last_seen: finding.updated_at,
                    first_seen: finding.created_at,
                    region: finding.region,
                    metadata: {
                      product_name: finding.product_name,
                      resource_type: finding.resource_type,
                      compliance_status: finding.compliance_status,
                    },
                  }}
                  workflow={workflows[finding.id]}
                  onAdvanceStatus={advanceStatus}
                  onAssign={assignFinding}
                  onMarkFalsePositive={markFalsePositive}
                  onCreateTicket={(id) => toast.info("Create ticket", { description: `${id}` })}
                  onClose={() => setExpandedRow(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
