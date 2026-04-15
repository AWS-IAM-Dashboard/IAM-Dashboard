import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  Users,
  BarChart3,
  Package,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCcw,
} from "lucide-react";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { exportScanResultToPDF, exportScanResultToCSV, exportScanResultToJSON, type ScanResultData } from "../services/pdfExport";
import { toast } from "sonner";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import type { ReportRecord } from "../types/report";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportsProps {
  reports: ReportRecord[];
}

// ─── Quick report card definitions ───────────────────────────────────────────
const QUICK_REPORTS = [
  {
    id: "security-summary",
    label: "Security Summary",
    desc: "Full posture — all findings, severity breakdown, risk score",
    icon: Shield,
    accent: "#00ff88",
    tag: "OVERVIEW",
  },
  {
    id: "threat-intelligence",
    label: "Threat Intelligence",
    desc: "Critical & high findings, threat type clusters, attack vectors",
    icon: AlertTriangle,
    accent: "#ff0040",
    tag: "THREAT",
  },
  {
    id: "executive-brief",
    label: "Executive Brief",
    desc: "Board-ready — compliance score, top risks, remediation status",
    icon: BarChart3,
    accent: "#7c3aed",
    tag: "EXEC",
  },
  {
    id: "audit-package",
    label: "Audit Package",
    desc: "All reports bundled — PDF + CSV + JSON for auditor hand-off",
    icon: Package,
    accent: "#ffb000",
    tag: "AUDITOR",
    isBundle: true,
  },
  {
    id: "iam-access",
    label: "IAM & Access",
    desc: "User permissions, role changes, policy violations, MFA gaps",
    icon: Users,
    accent: "#38bdf8",
    tag: "IAM",
  },
  {
    id: "compliance-status",
    label: "Compliance Status",
    desc: "CIS / SOC2 / PCI-DSS / HIPAA control pass/fail evidence",
    icon: FileText,
    accent: "#00ff88",
    tag: "COMPLIANCE",
  },
] as const;

const REPORT_TYPE_LABELS: Record<string, string> = {
  "security-hub": "Security Hub",
  "guardduty": "GuardDuty",
  "config": "Config",
  "inspector": "Inspector",
  "macie": "Macie",
  "iam-security": "IAM & Access",
  "ec2-security": "EC2 Compute",
  "s3-security": "S3 Storage",
  "alerts": "Security Alerts",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function Reports({ reports }: ReportsProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState("security-hub");
  const [builderName, setBuilderName] = useState("");
  const [formats, setFormats] = useState({ pdf: true, csv: false, json: false });
  const [historySearch, setHistorySearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const { getScanResult, getAllScanResults } = useActiveScanResults();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Shared data helpers ──────────────────────────────────────────────────
  const extractFindingsFromResult = (scanResult: any): any[] => {
    if (scanResult.findings?.length) return scanResult.findings;
    if (scanResult.results?.findings?.length) return scanResult.results.findings;
    const nested: any[] = [];
    const keys = ["iam_findings", "security_hub_findings", "guardduty_findings", "config_findings", "inspector_findings", "macie_findings"];
    keys.forEach((k) => {
      if (Array.isArray(scanResult.results?.[k])) nested.push(...scanResult.results[k]);
    });
    return nested.length > 0 ? nested : scanResult.findings || [];
  };

  const buildCombinedScanData = (title: string): ScanResultData | null => {
    const allScans = getAllScanResults();
    if (allScans.length === 0) return null;
    const allFindings = allScans.flatMap((s) => s.findings || []);
    return {
      scan_id: `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      scanner_type: "comprehensive",
      region: allScans[0]?.region || "us-east-1",
      status: "completed",
      timestamp: new Date().toISOString(),
      results: { scans: allScans },
      scan_summary: {
        critical_findings: allScans.reduce((s, r) => s + (r.scan_summary?.critical_findings || 0), 0),
        high_findings: allScans.reduce((s, r) => s + (r.scan_summary?.high_findings || 0), 0),
        medium_findings: allScans.reduce((s, r) => s + (r.scan_summary?.medium_findings || 0), 0),
        low_findings: allScans.reduce((s, r) => s + (r.scan_summary?.low_findings || 0), 0),
        users: allScans.find((s) => s.scanner_type === "iam")?.scan_summary?.users || 0,
        roles: allScans.find((s) => s.scanner_type === "iam")?.scan_summary?.roles || 0,
        policies: allScans.find((s) => s.scanner_type === "iam")?.scan_summary?.policies || 0,
        groups: allScans.find((s) => s.scanner_type === "iam")?.scan_summary?.groups || 0,
      },
      findings: allFindings,
    };
  };

  // ── Quick report generators ──────────────────────────────────────────────
  const runGenerate = async (id: string) => {
    setGenerating(id);
    try {
      const allScans = getAllScanResults();

      if (id === "security-summary") {
        const data = buildCombinedScanData("Security Summary Report");
        if (!data) { toast.warning("No scan data", { description: "Run scans first" }); return; }
        exportScanResultToPDF(data, "Security Summary Report");
        toast.success("Security Summary generated", { description: `${data.findings?.length || 0} findings` });

      } else if (id === "threat-intelligence") {
        if (allScans.length === 0) { toast.warning("No scan data"); return; }
        const allFindings = allScans.flatMap((s) => s.findings || []);
        const threats = allFindings.filter((f) => {
          const s = (f.severity || "").toLowerCase();
          return s === "critical" || s === "high";
        });
        const data: ScanResultData = {
          scan_id: `threat-intel-${Date.now()}`,
          scanner_type: "threat-intelligence",
          region: allScans[0]?.region || "us-east-1",
          status: "completed",
          timestamp: new Date().toISOString(),
          results: {},
          scan_summary: {
            critical_findings: threats.filter((f) => (f.severity || "").toLowerCase() === "critical").length,
            high_findings: threats.filter((f) => (f.severity || "").toLowerCase() === "high").length,
            medium_findings: 0,
            low_findings: 0,
          },
          findings: threats,
        };
        exportScanResultToPDF(data, "Threat Intelligence Report");
        toast.success("Threat Intelligence generated", { description: `${threats.length} critical/high threats` });

      } else if (id === "executive-brief") {
        if (allScans.length === 0) { toast.warning("No scan data"); return; }
        const allFindings = allScans.flatMap((s) => s.findings || []);
        const crit = allScans.reduce((s, r) => s + (r.scan_summary?.critical_findings || 0), 0);
        const high = allScans.reduce((s, r) => s + (r.scan_summary?.high_findings || 0), 0);
        const med = allScans.reduce((s, r) => s + (r.scan_summary?.medium_findings || 0), 0);
        const low = allScans.reduce((s, r) => s + (r.scan_summary?.low_findings || 0), 0);
        const total = crit + high + med + low;
        const compliance = total === 0 ? 100 : Math.max(0, Math.round(100 - ((crit * 10 + high * 5 + med * 2 + low) / total * 100)));
        const data: ScanResultData = {
          scan_id: `exec-brief-${Date.now()}`,
          scanner_type: "executive-summary",
          region: allScans[0]?.region || "us-east-1",
          status: "completed",
          timestamp: new Date().toISOString(),
          results: { compliance_score: compliance },
          scan_summary: { critical_findings: crit, high_findings: high, medium_findings: med, low_findings: low },
          findings: allFindings.filter((f) => (f.severity || "").toLowerCase() === "critical").slice(0, 5),
        };
        exportScanResultToPDF(data, "Executive Brief");
        toast.success("Executive Brief generated", { description: `Compliance: ${compliance}%` });

      } else if (id === "audit-package") {
        const data = buildCombinedScanData("Audit Package");
        if (!data) { toast.warning("No scan data", { description: "Run scans first" }); return; }
        exportScanResultToPDF(data, "Audit Package — Full Security Report");
        exportScanResultToCSV(data, `audit-package-${Date.now()}.csv`);
        exportScanResultToJSON(data, `audit-package-${Date.now()}.json`);
        toast.success("Audit Package generated", { description: "PDF + CSV + JSON delivered" });

      } else if (id === "iam-access") {
        const iamScan = getScanResult("iam") || getScanResult("iam-security");
        if (!iamScan) {
          const data = buildCombinedScanData("IAM Access Report");
          if (!data) { toast.warning("No scan data"); return; }
          data.findings = data.findings?.filter((f) => {
            const t = (f.type || f.resource_type || "").toLowerCase();
            return t.includes("iam") || t.includes("user") || t.includes("role") || t.includes("policy");
          }) || [];
          exportScanResultToPDF(data, "IAM & Access Report");
        } else {
          const findings = extractFindingsFromResult(iamScan);
          const d: ScanResultData = { ...iamScan, findings };
          exportScanResultToPDF(d, "IAM & Access Report");
        }
        toast.success("IAM & Access report generated");

      } else if (id === "compliance-status") {
        const data = buildCombinedScanData("Compliance Status Report");
        if (!data) { toast.warning("No scan data"); return; }
        exportScanResultToPDF(data, "Compliance Status Report");
        toast.success("Compliance Status generated");
      }
    } catch (err) {
      toast.error("Report failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setGenerating(null);
    }
  };

  // ── Advanced builder generate ────────────────────────────────────────────
  const runBuilderGenerate = () => {
    const scannerTypeMap: Record<string, string> = {
      "iam-security": "iam", "ec2-security": "ec2", "s3-security": "s3",
      "security-hub": "security-hub", "guardduty": "guardduty", "config": "config",
      "inspector": "inspector", "macie": "macie", "alerts": "full",
    };
    const scannerType = scannerTypeMap[builderType] || builderType;
    const realScan = getScanResult(scannerType);
    const title = builderName || REPORT_TYPE_LABELS[builderType] || builderType;

    let data: ScanResultData;
    if (realScan) {
      data = { ...realScan, findings: extractFindingsFromResult(realScan) };
      toast.info("Using real scan data");
    } else {
      const combined = buildCombinedScanData(title);
      if (combined) {
        data = combined;
      } else {
        data = {
          scan_id: `report-${Date.now()}`,
          scanner_type: builderType,
          region: "us-east-1",
          status: "completed",
          timestamp: new Date().toISOString(),
          scan_summary: { critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0 },
          findings: [],
        };
        toast.warning("Using sample data — run a scan first");
      }
    }

    try {
      if (formats.pdf) { exportScanResultToPDF(data, title); toast.success("PDF generated"); }
      if (formats.csv) { exportScanResultToCSV(data, `${title}.csv`); toast.success("CSV downloaded"); }
      if (formats.json) { exportScanResultToJSON(data, `${title}.json`); toast.success("JSON downloaded"); }
      if (!formats.pdf && !formats.csv && !formats.json) { toast.warning("Select at least one format"); }
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : "Unknown" });
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    if (status === "Completed") return { bg: "rgba(0,255,136,0.12)", color: "#00ff88" };
    if (status === "In Progress") return { bg: "rgba(255,176,0,0.12)", color: "#ffb000" };
    return { bg: "rgba(255,64,96,0.12)", color: "#ff0040" };
  };

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(historySearch.toLowerCase()) ||
    r.type.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Page header ── */}
      <ScanPageHeader
        icon={<FileText size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Reports"
        subtitle="Generate, export, and deliver security evidence"
        onRefresh={() => {}}
        onExport={() => {}}
      />

      {/* ── Quick generate hero grid ── */}
      <div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "rgba(100,116,139,0.55)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: "12px",
          }}
        >
          Quick Generate
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_REPORTS.map((qr) => {
            const Icon = qr.icon;
            const isRunning = generating === qr.id;
            const isBundle = "isBundle" in qr && qr.isBundle;

            return (
              <div
                key={qr.id}
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: `1px solid ${isBundle ? `${qr.accent}30` : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "10px",
                  padding: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Subtle glow strip */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: isBundle
                      ? `linear-gradient(90deg, ${qr.accent}00, ${qr.accent}, ${qr.accent}00)`
                      : `linear-gradient(90deg, ${qr.accent}30, ${qr.accent}10, transparent)`,
                    transition: "background 0.2s",
                  }}
                />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: `${qr.accent}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 15, height: 15, color: qr.accent }} />
                  </div>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: `${qr.accent}99`,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.1em",
                      background: `${qr.accent}12`,
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {qr.tag}
                  </span>
                </div>

                <div style={{ marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                    {qr.label}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(100,116,139,0.7)",
                    margin: "0 0 16px",
                    lineHeight: 1.5,
                  }}
                >
                  {qr.desc}
                </p>

                <button
                  onClick={() => runGenerate(qr.id)}
                  disabled={!!generating}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    background: isRunning
                      ? `${qr.accent}20`
                      : isBundle
                      ? `${qr.accent}15`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isRunning ? `${qr.accent}50` : isBundle ? `${qr.accent}30` : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "6px",
                    color: isRunning ? qr.accent : isBundle ? qr.accent : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: generating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s",
                    opacity: generating && !isRunning ? 0.5 : 1,
                  }}
                >
                  {isRunning ? (
                    <>
                      <RefreshCcw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Download style={{ width: 12, height: 12 }} />
                      {isBundle ? "Generate All" : "Generate"}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Advanced report builder ── */}
      <div
        className="min-w-0 max-w-full"
        style={{
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setShowBuilder((v) => !v)}
          className="flex w-full min-w-0 cursor-pointer items-start justify-between gap-3 border-none bg-transparent p-3 text-left sm:items-center sm:p-4"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(100,116,139,0.6)" }} />
              <span className="min-w-0 text-[13px] font-medium leading-snug text-slate-300">
                Advanced Report Builder
              </span>
            </div>
            <span
              className="w-fit shrink-0 rounded px-2 py-1 font-mono text-[10px]"
              style={{
                color: "rgba(100,116,139,0.5)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <span className="sm:hidden">Custom</span>
              <span className="hidden sm:inline">Custom formats & scope</span>
            </span>
          </div>
          <span className="shrink-0 pt-0.5 sm:pt-0" aria-hidden>
            {showBuilder ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            )}
          </span>
        </button>

        {showBuilder && (
          <div className="min-w-0 max-w-full border-t border-white/[0.04] px-3 pb-4 pt-0 sm:px-4">
            <div className="grid min-w-0 grid-cols-1 gap-4 pt-4 sm:grid-cols-2 sm:gap-3">
              <div className="min-w-0">
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "rgba(100,116,139,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "8px",
                  }}
                >
                  Report Type
                </label>
                <div className="relative min-w-0">
                  <select
                    value={builderType}
                    onChange={(e) => setBuilderType(e.target.value)}
                    className="min-w-0 max-w-full w-full cursor-pointer rounded-md border border-[rgba(0,255,136,0.3)] py-2 pl-3 pr-10 font-mono text-[12px] font-medium text-[#00ff88] shadow-none outline-none focus-visible:ring-1 focus-visible:ring-[#00ff88]/35 sm:py-1.5"
                    style={{
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      appearance: "none",
                      backgroundColor: "rgba(0,255,136,0.12)",
                      boxShadow: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00ff88]/80"
                    aria-hidden
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "rgba(100,116,139,0.7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "8px",
                  }}
                >
                  Custom Name (optional)
                </label>
                <input
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="Auto-named if blank"
                  className="min-w-0 max-w-full"
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    padding: "8px 12px",
                    background: "rgba(30,41,59,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div className="mt-4 min-w-0 max-w-full">
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "rgba(100,116,139,0.7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: "8px",
                }}
              >
                Export Formats
              </label>
              <div className="grid min-w-0 grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                {(["pdf", "csv", "json"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormats((f) => ({ ...f, [fmt]: !f[fmt] }))}
                    className="min-h-10 w-full min-w-0 rounded-md py-2 text-center sm:min-h-0 sm:w-auto sm:px-4 sm:py-1.5"
                    style={{
                      background: formats[fmt] ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.04)",
                      border: formats[fmt] ? "1px solid rgba(0,255,136,0.3)" : "1px solid rgba(255,255,255,0.07)",
                      color: formats[fmt] ? "#00ff88" : "rgba(100,116,139,0.7)",
                      fontSize: "12px",
                      fontWeight: 500,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={runBuilderGenerate}
              className="mt-4 flex w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 sm:w-auto sm:justify-start"
              style={{
                background: "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.25)",
                color: "#00ff88",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download style={{ width: 13, height: 13, flexShrink: 0 }} />
              Generate Report
            </button>
          </div>
        )}
      </div>

      {/* ── Report history ── */}
      {reports.length > 0 && (
        <div
          style={{
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
              Report History
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "6px",
              }}
            >
              <Search style={{ width: 12, height: 12, color: "rgba(100,116,139,0.5)" }} />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Filter reports…"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  width: isMobile ? "120px" : "160px",
                }}
              />
            </div>
          </div>

          {/* Table header */}
          {!isMobile && <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 130px 80px 70px 80px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["Report Name", "Type", "Date", "Status", "Threats", "Actions"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "rgba(100,116,139,0.55)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {h}
              </span>
            ))}
          </div>}

          {filteredReports.map((report) => {
            const sc = getStatusColor(report.status);
            const threatColor =
              report.threats > 10 ? "#ff0040" : report.threats > 0 ? "#ffb000" : "#00ff88";

            return (
              <div key={report.id} style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "1fr 100px 130px 80px 70px 80px", gap: isMobile ? 8 : undefined, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 500 }}>
                  {report.name}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(100,116,139,0.7)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {report.type}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(100,116,139,0.6)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {report.date}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: sc.color,
                    background: sc.bg,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontFamily: "'JetBrains Mono', monospace",
                    display: "inline-block",
                  }}
                >
                  {report.status}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: threatColor,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {report.threats}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => {
                      const scanResult = getScanResult("full");
                      if (scanResult) {
                        exportScanResultToPDF(
                          { ...scanResult, findings: extractFindingsFromResult(scanResult) },
                          report.name
                        );
                      } else {
                        toast.warning("Scan data not available");
                      }
                    }}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(100,116,139,0.6)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="View"
                  >
                    <Eye style={{ width: 12, height: 12 }} />
                  </button>
                  <button
                    onClick={() => {
                      const scanResult = getScanResult("full");
                      if (scanResult) {
                        exportScanResultToPDF(
                          { ...scanResult, findings: extractFindingsFromResult(scanResult) },
                          report.name
                        );
                      }
                    }}
                    disabled={report.status === "In Progress"}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(100,116,139,0.6)",
                      cursor: report.status === "In Progress" ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: report.status === "In Progress" ? 0.4 : 1,
                    }}
                    title="Download"
                  >
                    <Download style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Scheduled reports placeholder ── */}
      <div style={{ background: "rgba(15,23,42,0.4)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(100,116,139,0.7)" }}>
            Scheduled Reports
          </span>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(100,116,139,0.5)",
              margin: "4px 0 0",
            }}
          >
            Auto-generate and email reports on a cadence — weekly security digest, monthly compliance
          </p>
        </div>
        <span
          style={{
            fontSize: "10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(100,116,139,0.5)",
            padding: "4px 12px",
            borderRadius: "999px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Coming soon
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
