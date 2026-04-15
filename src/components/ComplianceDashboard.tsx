import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Skeleton } from "./ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area } from "recharts";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Info,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { maskSensitiveData } from "../utils/security";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";

// ─── Framework metadata ───────────────────────────────────────────────────────
const FRAMEWORKS = [
  {
    id: "cis",
    name: "CIS AWS Foundations",
    version: "v1.5",
    totalControls: 84,
    baseScore: 82,
    openControls: 7,
    criticalFindings: 2,
    lastAudited: "2 days ago",
    trend: [74, 78, 80, 81, 82],
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    version: "2017",
    totalControls: 96,
    baseScore: 76,
    openControls: 11,
    criticalFindings: 3,
    lastAudited: "5 days ago",
    trend: [68, 70, 72, 75, 76],
  },
  {
    id: "pci",
    name: "PCI-DSS",
    version: "v4.0",
    totalControls: 112,
    baseScore: 88,
    openControls: 5,
    criticalFindings: 1,
    lastAudited: "1 day ago",
    trend: [80, 82, 85, 86, 88],
  },
  {
    id: "hipaa",
    name: "HIPAA Security Rule",
    version: "2013",
    totalControls: 64,
    baseScore: 73,
    openControls: 14,
    criticalFindings: 4,
    lastAudited: "9 days ago",
    trend: [62, 65, 70, 72, 73],
  },
];

// ─── Control catalog per framework ───────────────────────────────────────────
const CONTROL_CATALOG: Record<string, { id: string; title: string; keywords: string[]; severity: "Critical" | "High" | "Medium" | "Low" }[]> = {
  cis: [
    { id: "1.1", title: "Avoid the use of the root account", keywords: ["root", "mfa"], severity: "Critical" },
    { id: "1.2", title: "Ensure MFA is enabled for IAM users with console access", keywords: ["mfa", "iam", "console"], severity: "Critical" },
    { id: "1.4", title: "Ensure no access keys exist for root account", keywords: ["root", "access key"], severity: "High" },
    { id: "1.5", title: "Ensure IAM password policy requires uppercase letters", keywords: ["password", "policy", "uppercase"], severity: "Medium" },
    { id: "1.9", title: "Ensure IAM password policy prevents password reuse", keywords: ["password", "reuse"], severity: "Medium" },
    { id: "2.1", title: "Ensure CloudTrail is enabled in all regions", keywords: ["cloudtrail", "logging"], severity: "High" },
    { id: "2.6", title: "Ensure S3 bucket access logging is enabled on CloudTrail bucket", keywords: ["s3", "logging", "cloudtrail"], severity: "Medium" },
    { id: "3.1", title: "Ensure VPC default security group restricts all traffic", keywords: ["vpc", "security group", "default"], severity: "High" },
    { id: "4.1", title: "Ensure no security groups allow ingress from 0.0.0.0/0 to port 22", keywords: ["ssh", "0.0.0.0", "ingress"], severity: "Critical" },
  ],
  soc2: [
    { id: "CC6.1", title: "Logical and physical access controls implemented", keywords: ["access control", "iam", "mfa"], severity: "Critical" },
    { id: "CC6.2", title: "Prior to issuing system credentials, entity registers and authorizes", keywords: ["credential", "access key", "registration"], severity: "High" },
    { id: "CC6.3", title: "Role-based access control enforced", keywords: ["role", "policy", "least privilege"], severity: "High" },
    { id: "CC7.1", title: "Detection and monitoring procedures implemented", keywords: ["guardduty", "cloudtrail", "monitoring"], severity: "High" },
    { id: "CC8.1", title: "Change management process in place", keywords: ["config", "change", "drift"], severity: "Medium" },
    { id: "A1.1", title: "Capacity planning and availability measures in place", keywords: ["ec2", "autoscaling", "availability"], severity: "Medium" },
    { id: "PI1.1", title: "Processing integrity controls implemented", keywords: ["encryption", "integrity", "kms"], severity: "High" },
  ],
  pci: [
    { id: "2.2", title: "Develop configuration standards for all system components", keywords: ["config", "hardening", "baseline"], severity: "High" },
    { id: "3.4", title: "Render PAN unreadable anywhere it is stored", keywords: ["encryption", "kms", "s3", "rds"], severity: "Critical" },
    { id: "6.2", title: "Protect all system components from known vulnerabilities", keywords: ["inspector", "patch", "cve"], severity: "High" },
    { id: "7.1", title: "Limit access to system components to those with a business need", keywords: ["iam", "policy", "least privilege"], severity: "High" },
    { id: "8.2", title: "Proper identification and authentication for non-consumer users", keywords: ["mfa", "password", "iam"], severity: "Critical" },
    { id: "10.1", title: "Implement audit trails to link access to individual cardholder data", keywords: ["cloudtrail", "logging", "audit"], severity: "High" },
    { id: "10.5", title: "Secure audit trails so they cannot be altered", keywords: ["cloudtrail", "s3", "integrity"], severity: "Medium" },
  ],
  hipaa: [
    { id: "164.308(a)(1)", title: "Security Management Process – risk analysis", keywords: ["risk", "finding", "assessment"], severity: "Critical" },
    { id: "164.308(a)(3)", title: "Workforce Security – access authorization", keywords: ["iam", "access", "authorization"], severity: "High" },
    { id: "164.308(a)(5)", title: "Security Awareness and Training", keywords: ["mfa", "password", "training"], severity: "Medium" },
    { id: "164.312(a)(1)", title: "Access Control – unique user identification", keywords: ["iam", "user", "identity"], severity: "High" },
    { id: "164.312(a)(2)", title: "Access Control – automatic logoff", keywords: ["session", "timeout", "console"], severity: "Medium" },
    { id: "164.312(b)", title: "Audit Controls – hardware, software, procedural", keywords: ["cloudtrail", "logging", "audit"], severity: "High" },
    { id: "164.312(e)(2)", title: "Transmission Security – encryption in transit", keywords: ["ssl", "tls", "encryption", "transit"], severity: "High" },
  ],
};

// ─── Open actions ─────────────────────────────────────────────────────────────
const OPEN_ACTIONS = [
  { id: "IAM-001", framework: "cis", control: "1.2 – MFA for IAM console users", owner: "Cloud Security", dueDate: "2025-11-18", status: "In Progress", severity: "Critical" },
  { id: "S3-014", framework: "soc2", control: "PI1.1 – Encryption at rest enforced", owner: "Storage Team", dueDate: "2025-11-22", status: "Planned", severity: "High" },
  { id: "EC2-027", framework: "pci", control: "7.1 – Restrict cardholder data access", owner: "Platform", dueDate: "2025-12-02", status: "Blocked", severity: "Critical" },
  { id: "LOG-039", framework: "hipaa", control: "164.312(b) – Audit controls", owner: "Compliance", dueDate: "2025-11-29", status: "In Progress", severity: "High" },
  { id: "VPC-055", framework: "cis", control: "3.1 – Default SG restricts traffic", owner: "Network Ops", dueDate: "2025-12-10", status: "Planned", severity: "Medium" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 85) return "#00ff88";
  if (score >= 70) return "#ffb000";
  return "#ff0040";
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function slaColor(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d < 0) return "#ff0040";
  if (d <= 7) return "#ff6b35";
  if (d <= 14) return "#ffb000";
  return "#64748b";
}

const SEV_COLOR: Record<string, string> = {
  Critical: "#ff0040",
  High: "#ff6b35",
  Medium: "#ffb000",
  Low: "#00ff88",
};

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "#00ff88",
  Planned: "#64748b",
  Blocked: "#ff0040",
};

// Trend delta badge: shows +N pts over the trend window
function TrendDelta({ values, color }: { values: number[]; color: string }) {
  const delta = values[values.length - 1] - values[0];
  const sign = delta >= 0 ? "+" : "";
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        background: `${color}15`,
        padding: "4px 8px",
        borderRadius: "999px",
        letterSpacing: "0.02em",
      }}
    >
      {sign}{delta} pts
    </span>
  );
}

interface ComplianceDashboardProps {
  onNavigate?: (tab: string) => void;
  embedded?: boolean;
}

export function ComplianceDashboard({ onNavigate: _onNavigate, embedded = false }: ComplianceDashboardProps) {
  const [activeFramework, setActiveFramework] = useState(FRAMEWORKS[0].id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const { getAllScanResults, scanResultsVersion } = useActiveScanResults();

  const scanResults = useMemo(() => getAllScanResults(), [scanResultsVersion, getAllScanResults]);

  // Compute per-control status from real findings
  const computeControlStatus = (
    controlKeywords: string[],
    severity: string,
    findings: any[]
  ): "PASS" | "FAIL" | "PARTIAL" | "NOT_EVALUATED" => {
    if (findings.length === 0) return "NOT_EVALUATED";

    const matched = findings.filter((f) => {
      const text = [
        f.type || "",
        f.finding_type || "",
        f.resource_type || "",
        f.description || "",
        f.title || "",
        f.recommendation || "",
      ]
        .join(" ")
        .toLowerCase();
      return controlKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });

    if (matched.length === 0) return "PASS";
    const hasCritHigh = matched.some((f) => {
      const s = (f.severity || "").toLowerCase();
      return s === "critical" || s === "high";
    });
    if (hasCritHigh && severity === "Critical") return "FAIL";
    if (matched.length > 0) return "PARTIAL";
    return "PASS";
  };

  const allFindings = useMemo(
    () => scanResults.flatMap((s) => s.findings || []),
    [scanResults]
  );

  const framework = FRAMEWORKS.find((f) => f.id === activeFramework)!;
  const controls = CONTROL_CATALOG[activeFramework] || [];

  const controlsWithStatus = useMemo(
    () =>
      controls.map((ctrl) => ({
        ...ctrl,
        status: computeControlStatus(ctrl.keywords, ctrl.severity, allFindings),
        evidenceCount: allFindings.filter((f) => {
          const text = [f.type || "", f.description || "", f.title || ""]
            .join(" ")
            .toLowerCase();
          return ctrl.keywords.some((kw) => text.includes(kw.toLowerCase()));
        }).length,
      })),
    [controls, allFindings, scanResultsVersion]
  );

  const passCount = controlsWithStatus.filter((c) => c.status === "PASS").length;
  const failCount = controlsWithStatus.filter((c) => c.status === "FAIL").length;
  const partialCount = controlsWithStatus.filter((c) => c.status === "PARTIAL").length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleExportAuditPackage = () => {
    const lines = [
      `Audit Package – ${framework.name} ${framework.version}`,
      `Generated: ${new Date().toISOString()}`,
      `Score: ${framework.baseScore}%`,
      "",
      "Control Evidence",
      "─".repeat(60),
      ...controlsWithStatus.map(
        (c) => `[${c.status}] ${c.id} – ${c.title} (${c.severity}) | Evidence items: ${c.evidenceCount}`
      ),
      "",
      "Open Actions",
      "─".repeat(60),
      ...OPEN_ACTIONS.filter((a) => a.framework === activeFramework).map(
        (a) => `[${a.status}] ${a.id} – ${a.control} | Owner: ${a.owner} | Due: ${a.dueDate}`
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-package-${activeFramework}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const frameActions = OPEN_ACTIONS.filter((a) => a.framework === activeFramework);

  const avgScore = Math.round(FRAMEWORKS.reduce((s, f) => s + f.baseScore, 0) / FRAMEWORKS.length);
  const totalOpenActions = OPEN_ACTIONS.length;
  const totalCritical = FRAMEWORKS.reduce((s, f) => s + f.criticalFindings, 0);

  return (
    <div
      className="min-w-0 max-w-full overflow-x-hidden"
      style={{
        padding: embedded ? "0" : "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* ── Page header ── */}
      {!embedded && (
        <ScanPageHeader
          icon={<BadgeCheck size={20} color="#00ff88" />}
          iconColor="#00ff88"
          title="Compliance Dashboard"
          subtitle={
            scanResults.length > 0
              ? `${allFindings.length} findings mapped across 4 frameworks`
              : "No scan data — scores are baseline estimates"
          }
          isScanning={isRefreshing}
          onRefresh={handleRefresh}
          onExport={handleExportAuditPackage}
          scanLabel="Audit Package"
        />
      )}

      {/* ── Aggregate KPI stats ── */}
      <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "AVG SCORE", value: `${avgScore}%`, color: avgScore >= 80 ? "#00ff88" : avgScore >= 60 ? "#ffb000" : "#ff0040" },
          { label: "OPEN ACTIONS", value: String(totalOpenActions), color: totalOpenActions > 0 ? "#ffb000" : "#00ff88" },
          { label: "CRITICAL CONTROLS", value: String(totalCritical), color: totalCritical > 0 ? "#ff0040" : "#00ff88" },
          { label: "FRAMEWORKS", value: String(FRAMEWORKS.length), color: "#0ea5e9" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${color}26`, borderRadius: "10px", padding: "12px 20px", position: "relative", overflow: "hidden", minWidth: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${color}88, transparent)` }} />
            <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: "'JetBrains Mono', monospace", marginBottom: "8px", whiteSpace: "normal", wordBreak: "normal", lineHeight: 1.25 }}>{label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Framework score overview row ── */}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {FRAMEWORKS.map((fw) => {
          const isActive = fw.id === activeFramework;
          const color = scoreColor(fw.baseScore);
          return (
            <button
              key={fw.id}
              onClick={() => setActiveFramework(fw.id)}
              style={{
                textAlign: "left",
                padding: "12px 16px",
                borderRadius: "8px",
                border: isActive
                  ? `1px solid ${color}40`
                  : "1px solid rgba(255,255,255,0.06)",
                background: isActive
                  ? `rgba(${color === "#00ff88" ? "0,255,136" : color === "#ffb000" ? "255,176,0" : "255,64,96"},0.06)`
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: color,
                    borderRadius: "8px 8px 0 0",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: isActive ? "#e2e8f0" : "rgba(100,116,139,0.7)",
                    fontWeight: 500,
                    lineHeight: 1.3,
                    wordBreak: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {fw.name}
                </span>
                <TrendDelta values={fw.trend} color={color} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color,
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1,
                  }}
                >
                  {fw.baseScore}
                </span>
                <span style={{ fontSize: "11px", color: "rgba(100,116,139,0.6)" }}>%</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                  fontSize: "10px",
                  color: "rgba(100,116,139,0.6)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: fw.openControls > 0 ? "#ffb000" : "#00ff88" }}>
                  {fw.openControls} open
                </span>
                {fw.criticalFindings > 0 && (
                  <span style={{ color: "#ff0040" }}>{fw.criticalFindings} critical</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main content area ── */}
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        {/* Control evidence table */}
        <div
          className="min-w-0 max-w-full"
          style={{
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            className="flex min-w-0 flex-col gap-3 border-b border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3"
          >
            <div className="min-w-0">
              <span
                className="break-words text-[13px] font-semibold leading-snug text-slate-200"
              >
                Control Evidence — {framework.name}
              </span>
              <span
                className="mt-1 block font-mono text-[10px] text-slate-500 sm:ml-2 sm:mt-0 sm:inline"
              >
                {framework.version}
              </span>
            </div>
            <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px]">
              <span style={{ color: "#00ff88" }}>{passCount} PASS</span>
              <span style={{ color: "rgba(100,116,139,0.5)" }}>/</span>
              <span style={{ color: "#ff0040" }}>{failCount} FAIL</span>
              <span style={{ color: "rgba(100,116,139,0.5)" }}>/</span>
              <span style={{ color: "#ffb000" }}>{partialCount} PARTIAL</span>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <div style={{ minWidth: 520 }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px minmax(0,1fr) 88px 64px 76px",
              padding: "8px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
            className="sm:px-5"
          >
            {["Control ID", "Title", "Status", "Severity", "Evidence"].map((h) => (
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
          </div>

          {/* Control rows */}
          {controlsWithStatus.map((ctrl) => {
            const isExpanded = expandedControl === ctrl.id;
            const statusColors: Record<string, string> = {
              PASS: "#00ff88",
              FAIL: "#ff0040",
              PARTIAL: "#ffb000",
              NOT_EVALUATED: "#475569",
            };
            const statusIcons: Record<string, React.ReactNode> = {
              PASS: <CheckCircle2 style={{ width: 13, height: 13, color: "#00ff88" }} />,
              FAIL: <XCircle style={{ width: 13, height: 13, color: "#ff0040" }} />,
              PARTIAL: <AlertTriangle style={{ width: 13, height: 13, color: "#ffb000" }} />,
              NOT_EVALUATED: <Clock style={{ width: 13, height: 13, color: "#475569" }} />,
            };

            // Find matching evidence from findings
            const evidenceFindings = allFindings
              .filter((f) => {
                const text = [f.type || "", f.description || "", f.title || ""]
                  .join(" ")
                  .toLowerCase();
                return ctrl.keywords.some((kw) => text.includes(kw.toLowerCase()));
              })
              .slice(0, 3);

            return (
              <div key={ctrl.id}>
                <button
                  onClick={() => setExpandedControl(isExpanded ? null : ctrl.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0,1fr) 88px 64px 76px",
                    width: "100%",
                    padding: "8px 16px",
                    textAlign: "left",
                    background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "transparent";
                  }}
                  className="sm:px-5"
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(100,116,139,0.8)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {ctrl.id}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#cbd5e1",
                      paddingRight: "8px",
                      lineHeight: 1.4,
                      minWidth: 0,
                      overflowWrap: "anywhere" as const,
                    }}
                  >
                    {ctrl.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {statusIcons[ctrl.status]}
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: statusColors[ctrl.status],
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ctrl.status}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: SEV_COLOR[ctrl.severity],
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {ctrl.severity}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color:
                        ctrl.evidenceCount > 0 ? "#ffb000" : "rgba(100,116,139,0.4)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {ctrl.evidenceCount > 0 ? `${ctrl.evidenceCount} finding${ctrl.evidenceCount !== 1 ? "s" : ""}` : "—"}
                  </span>
                </button>

                {/* Expanded evidence detail */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "12px 20px 14px 32px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: "rgba(0,0,0,0.15)",
                    }}
                  >
                    {evidenceFindings.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "rgba(100,116,139,0.6)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontFamily: "'JetBrains Mono', monospace",
                            marginBottom: "4px",
                          }}
                        >
                          Supporting Evidence
                        </span>
                        {evidenceFindings.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "8px 12px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: "6px",
                              fontSize: "11px",
                              color: "#94a3b8",
                              lineHeight: 1.5,
                            }}
                          >
                            <span
                              style={{
                                color: SEV_COLOR[(f.severity || "Low")] || "#64748b",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "10px",
                                fontWeight: 600,
                                marginRight: "8px",
                              }}
                            >
                              [{f.severity || "LOW"}]
                            </span>
                            {maskSensitiveData(
                              f.title || f.description || f.type || "Finding"
                            ).slice(0, 120)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "rgba(100,116,139,0.5)",
                          fontStyle: "italic",
                        }}
                      >
                        No findings mapped to this control. Run a scan to collect evidence.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          </div>
        </div>

        {/* Right rail — open actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Framework summary card */}
          <div
            style={{
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "rgba(100,116,139,0.6)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: "12px",
              }}
            >
              Posture Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Passing Controls", value: `${passCount} / ${controls.length}`, color: "#00ff88" },
                { label: "Failing Controls", value: `${failCount}`, color: failCount > 0 ? "#ff0040" : "#00ff88" },
                { label: "Partial / Review", value: `${partialCount}`, color: partialCount > 0 ? "#ffb000" : "#64748b" },
                { label: "Last Audited", value: framework.lastAudited, color: "#64748b" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ fontSize: "11px", color: "rgba(100,116,139,0.7)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Score bar */}
            <div style={{ marginTop: "14px" }}>
              <div
                style={{
                  height: "4px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${framework.baseScore}%`,
                    background: `linear-gradient(90deg, ${scoreColor(framework.baseScore)}, ${scoreColor(framework.baseScore)}88)`,
                    borderRadius: "999px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                  fontSize: "10px",
                  color: "rgba(100,116,139,0.5)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span>0%</span>
                <span style={{ color: scoreColor(framework.baseScore), fontWeight: 600 }}>
                  {framework.baseScore}%
                </span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Open actions for this framework */}
          <div
            style={{
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>
                Open Actions
              </span>
              {frameActions.length > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    background: "rgba(255,64,96,0.15)",
                    color: "#ff0040",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  {frameActions.length}
                </span>
              )}
            </div>

            {frameActions.length === 0 ? (
              <div
                style={{
                  padding: "24px 14px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "rgba(100,116,139,0.5)",
                }}
              >
                <ShieldCheck
                  style={{ width: 20, height: 20, color: "#00ff88", margin: "0 auto 8px", display: "block" }}
                />
                No open actions
              </div>
            ) : (
              frameActions.map((action) => {
                const days = daysUntil(action.dueDate);
                const slc = slaColor(action.dueDate);
                return (
                  <div
                    key={action.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "8px",
                        bottom: "8px",
                        width: "3px",
                        background: SEV_COLOR[action.severity] || "#64748b",
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: "rgba(100,116,139,0.6)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {action.id}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: STATUS_COLOR[action.status] || "#64748b",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {action.status}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        margin: "0 0 6px",
                        lineHeight: 1.4,
                      }}
                    >
                      {action.control}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "10px",
                        color: "rgba(100,116,139,0.5)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <span>{action.owner}</span>
                      <span style={{ color: slc, fontWeight: 600 }}>
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? "due today"
                          : `${days}d left`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* All open actions (cross-framework) */}
          <div
            style={{
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>
                All Frameworks Risk Register
              </span>
            </div>
            {OPEN_ACTIONS.map((action) => {
              const fw = FRAMEWORKS.find((f) => f.id === action.framework);
              const days = daysUntil(action.dueDate);
              const slc = slaColor(action.dueDate);
              return (
                <div
                  key={action.id}
                  style={{
                    padding: "8px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveFramework(action.framework)}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: SEV_COLOR[action.severity],
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {action.control}
                    </p>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "rgba(100,116,139,0.5)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {fw?.name.split(" ")[0]}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: slc,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {days < 0 ? `${Math.abs(days)}d over` : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
