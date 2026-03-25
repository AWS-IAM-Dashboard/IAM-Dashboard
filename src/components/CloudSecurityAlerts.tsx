import { useState, useMemo, useEffect } from "react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import {
  AlertTriangle, Bell, CheckCircle, Clock, RefreshCw, Settings,
  Shield, Users, ChevronDown, ChevronRight, Copy, Download, Play,
  Search, X, GitBranch, Eye, Activity, Bot, Zap, Ticket, ExternalLink, UserCircle,
} from "lucide-react";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { useScanResults } from "../context/ScanResultsContext";
import { maskSensitiveData } from "../utils/security";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  service: string;
  resource_id: string;
  timestamp: string;
  status: "Active" | "Acknowledged" | "Resolved";
  assignee?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  service: string;
  condition: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  enabled: boolean;
  notifications: string[];
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const TEAM = ["Alice Chen", "Bob Patel", "Carlos Martinez", "Diana Lee", "Ethan Wright"];
const ALERT_ASSIGNEES = ["Sarah Chen", "Marcus Webb", "Dev Patel", "Priya Singh", "Infra Team", "Platform Eng", "SOC L2"];
type WorkflowStage = "NEW" | "TRIAGED" | "ASSIGNED" | "IN_PROGRESS" | "PENDING_VERIFY" | "REMEDIATED" | "FALSE_POSITIVE";
const WORKFLOW_PIPELINE: WorkflowStage[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REMEDIATED"];
const WORKFLOW_META: Record<WorkflowStage, { label: string; color: string; bg: string }> = {
  NEW: { label: "NEW", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  TRIAGED: { label: "TRIAGED", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  ASSIGNED: { label: "ASSIGNED", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "#ffb000", bg: "rgba(255,176,0,0.12)" },
  PENDING_VERIFY: { label: "PENDING VERIFY", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  REMEDIATED: { label: "REMEDIATED", color: "#00ff88", bg: "rgba(0,255,136,0.12)" },
  FALSE_POSITIVE: { label: "FALSE POSITIVE", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};
const NEXT_STATUS: Partial<Record<WorkflowStage, WorkflowStage>> = {
  NEW: "TRIAGED",
  TRIAGED: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "PENDING_VERIFY",
  PENDING_VERIFY: "REMEDIATED",
};

const SEV: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  Critical: { bar: "#ff0040", text: "#ff0040", bg: "rgba(255,0,64,0.1)",   border: "rgba(255,0,64,0.28)"   },
  High:     { bar: "#ff6b35", text: "#ff6b35", bg: "rgba(255,107,53,0.1)", border: "rgba(255,107,53,0.28)" },
  Medium:   { bar: "#ffb000", text: "#ffb000", bg: "rgba(255,176,0,0.1)",  border: "rgba(255,176,0,0.28)"  },
  Low:      { bar: "#00ff88", text: "#00ff88", bg: "rgba(0,255,136,0.07)", border: "rgba(0,255,136,0.22)"  },
};

const STA: Record<string, { text: string; bg: string; border: string }> = {
  Active:       { text: "#ff4060", bg: "rgba(255,64,96,0.1)",   border: "rgba(255,64,96,0.22)"   },
  Acknowledged: { text: "#ffb000", bg: "rgba(255,176,0,0.1)",   border: "rgba(255,176,0,0.22)"   },
  Resolved:     { text: "#00ff88", bg: "rgba(0,255,136,0.08)",  border: "rgba(0,255,136,0.22)"   },
};

const SCANNER_SERVICE: Record<string, string> = {
  iam: "IAM", ec2: "EC2", s3: "S3", vpc: "VPC", dynamodb: "DynamoDB",
  "security-hub": "SecurityHub", guardduty: "GuardDuty",
  config: "Config", inspector: "Inspector", macie: "Macie", full: "Full Scan",
};

const MOCK_RULES: AlertRule[] = [
  { id: "r1", name: "S3 Bucket Public Access", description: "Triggers when a bucket is made publicly accessible", service: "S3", condition: 'bucket.public_access = true', severity: "Critical", enabled: true, notifications: ["email", "slack"] },
  { id: "r2", name: "Unrestricted Security Group", description: "Triggers when ingress allows 0.0.0.0/0 on sensitive ports", service: "EC2", condition: 'sg.cidr = "0.0.0.0/0"', severity: "High", enabled: true, notifications: ["email"] },
  { id: "r3", name: "IAM User Without MFA", description: "Triggers when a privileged user has no MFA device enrolled", service: "IAM", condition: "user.privileged = true AND user.mfa = false", severity: "High", enabled: true, notifications: ["email", "sms"] },
  { id: "r4", name: "Unencrypted RDS Instance", description: "Triggers when an RDS instance lacks encryption at rest", service: "RDS", condition: "rds.storage_encrypted = false", severity: "Medium", enabled: false, notifications: ["email"] },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function remediation(service: string, title: string, desc: string): string[] {
  const t = `${title} ${desc}`.toLowerCase();

  if (t.includes("mfa")) return [
    "Navigate to IAM Console → Users → [affected user]",
    'Under "Security credentials", click "Manage MFA device"',
    "Enroll a Virtual MFA (Authenticator app) or hardware key",
    "Verify MFA authentication works before closing this alert",
  ];
  if ((t.includes("public") || t.includes("publicly")) && service === "S3") return [
    "Open S3 Console → select bucket → Permissions tab",
    'Enable "Block all public access" under Block Public Access settings',
    "Review bucket policy and ACLs for remaining public grants",
    "Enable S3 server-access logging for audit trail",
  ];
  if (t.includes("0.0.0.0/0") || t.includes("unrestricted") || t.includes("security group")) return [
    "Open EC2 Console → Security Groups → [affected group]",
    "Under Inbound rules, remove or restrict the 0.0.0.0/0 entry",
    "Replace with specific CIDR ranges or security group references",
    "Consider AWS Systems Manager Session Manager instead of direct SSH/RDP",
  ];
  if (t.includes("encrypt")) return [
    "Enable encryption using a KMS CMK or AWS-managed key",
    "For existing resources: snapshot → restore to encrypted volume/instance",
    "Update IaC templates to enforce encryption_at_rest = true",
    'Add AWS Config rule "encrypted-volumes" to prevent recurrence',
  ];
  if (t.includes("access key") || t.includes("key rotation")) return [
    "IAM Console → Users → [user] → Security credentials",
    "Create a new access key pair",
    "Update all services/applications that use the old key",
    "Deactivate then delete the old key after a 24h validation window",
  ];
  if (t.includes("password")) return [
    "IAM Console → Account settings → Password policy",
    "Set minimum length ≥ 14 characters with complexity requirements",
    "Enable expiration (≤ 90 days) and prevent reuse (last 24)",
    "Enforce policy via SCP to prevent organizational bypass",
  ];
  if (t.includes("cloudtrail") || t.includes("logging")) return [
    "Enable CloudTrail with a multi-region trail and log file validation",
    "Route logs to a dedicated S3 bucket with MFA delete enabled",
    "Enable CloudWatch Logs integration for real-time alerting",
    "Set retention policy and test log delivery",
  ];
  return [
    `Review the affected ${service} resource in AWS Console`,
    "Assess business impact and exploitability of the misconfiguration",
    "Apply least-privilege / least-exposure remediation",
    "Update IaC templates to prevent recurrence",
    'Add an AWS Config rule for ongoing enforcement',
  ];
}

function age(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── Pill button helper ──────────────────────────────────────────────────── */
function Chip({
  active, color, bg, border, onClick, children,
}: {
  active: boolean;
  color?: string;
  bg?: string;
  border?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
      style={{
        background:  active ? (bg     ?? "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.03)",
        border:     `1px solid ${active ? (border ?? "rgba(255,255,255,0.2)") : "rgba(255,255,255,0.07)"}`,
        color:       active ? (color  ?? "#e2e8f0")              : "rgba(100,116,139,0.8)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export function CloudSecurityAlerts() {
  const { getAllScanResults, scanResultsVersion } = useScanResults();

  /* ── Filter / sort state ── */
  const [search,        setSearch]        = useState("");
  const [sevFilter,     setSevFilter]     = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sortBy,        setSortBy]        = useState<"severity" | "time">("severity");
  const [view,          setView]          = useState<"queue" | "rules">("queue");

  /* ── Per-alert state ── */
  const [acked,      setAcked]      = useState<Set<string>>(new Set());
  const [resolved,   setResolved]   = useState<Set<string>>(new Set());
  const [assignees,  setAssignees]  = useState<Record<string, string>>({});
  const [notes,      setNotes]      = useState<Record<string, string>>({});
  const [noteInput,  setNoteInput]  = useState<Record<string, string>>({});
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [activeTab,  setActiveTab]  = useState<Record<string, string>>({});
  const [workflowByAlert, setWorkflowByAlert] = useState<Record<string, WorkflowStage>>({});
  const [ticketByAlert, setTicketByAlert] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [isScanning, setIsScanning] = useState(false);
  const [headerRefreshSpin, setHeaderRefreshSpin] = useState(false);
  const pageSize = 10;

  /* ── Alert rules ── */
  const [rules, setRules] = useState<AlertRule[]>(MOCK_RULES);

  /* ── Build alerts from scan results ── */
  const scanResults = useMemo(() => getAllScanResults(), [scanResultsVersion, getAllScanResults]);

  const alerts = useMemo<SecurityAlert[]>(() => {
    const list: SecurityAlert[] = [];

    scanResults.forEach((scan) => {
      const service = SCANNER_SERVICE[scan.scanner_type] ?? scan.scanner_type.toUpperCase();
      (scan.findings ?? []).forEach((f: any, i: number) => {
        const id  = f.id ?? `${scan.scanner_type}-${scan.scan_id}-${i}`;
        const rawSev = (f.severity ?? "Medium") as string;
        const sev = (rawSev.charAt(0).toUpperCase() + rawSev.slice(1).toLowerCase()) as SecurityAlert["severity"];
        const normalised = (["Critical","High","Medium","Low"] as const).includes(sev as any) ? sev : "Medium";
        const desc   = maskSensitiveData(f.description ?? f.recommendation ?? "Security issue detected");
        const title  = f.title ?? f.finding_type ?? desc.slice(0, 60) ?? "Security Finding";
        const resId  = maskSensitiveData(f.resource_name ?? f.resource_arn ?? f.resource_id ?? "Unknown");

        let status: SecurityAlert["status"] = "Active";
        if (resolved.has(id)) status = "Resolved";
        else if (acked.has(id)) status = "Acknowledged";

        list.push({
          id, title, description: desc, severity: normalised,
          service, resource_id: resId,
          timestamp: f.timestamp ?? scan.timestamp ?? new Date().toISOString(),
          status, assignee: assignees[id],
        });
      });
    });

    const sevOrd: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return list.sort((a, b) => {
      if (sortBy === "severity") {
        const d = (sevOrd[b.severity] ?? 0) - (sevOrd[a.severity] ?? 0);
        if (d !== 0) return d;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [scanResults, acked, resolved, assignees, sortBy]);

  const services = useMemo(() => [...new Set(alerts.map((a) => a.service))].sort(), [alerts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (sevFilter    !== "all" && a.severity !== sevFilter)    return false;
      const workflow = workflowByAlert[a.id] ?? (a.status === "Resolved" ? "REMEDIATED" : a.status === "Acknowledged" ? "IN_PROGRESS" : "NEW");
      if (statusFilter !== "all" && workflow !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service !== serviceFilter) return false;
      if (q && !`${a.title} ${a.description} ${a.resource_id} ${a.service}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [alerts, sevFilter, statusFilter, serviceFilter, search, workflowByAlert]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const stats = useMemo(() => ({
    total:    alerts.length,
    active:   alerts.filter((a) => a.status === "Active").length,
    critical: alerts.filter((a) => a.severity === "Critical").length,
    high:     alerts.filter((a) => a.severity === "High").length,
    inReview: alerts.filter((a) => a.status === "Acknowledged").length,
    resolved: alerts.filter((a) => a.status === "Resolved").length,
  }), [alerts]);

  const pipelineCounts = useMemo(() => {
    const counts = WORKFLOW_PIPELINE.reduce((acc, stage) => {
      acc[stage] = 0;
      return acc;
    }, {} as Record<WorkflowStage, number>);
    alerts.forEach((a) => {
      const stage = workflowByAlert[a.id] ?? (a.status === "Resolved" ? "REMEDIATED" : a.status === "Acknowledged" ? "IN_PROGRESS" : "NEW");
      if (WORKFLOW_PIPELINE.includes(stage)) counts[stage] += 1;
    });
    return counts;
  }, [alerts, workflowByAlert]);

  /* ── Actions ── */
  const ackAlert     = (id: string) => { setAcked(p => new Set([...p, id])); toast.success("Acknowledged — moved to In Review"); };
  const resolveAlert = (id: string) => { setResolved(p => new Set([...p, id])); toast.success("Alert resolved"); };
  const assignAlert  = (id: string, m: string) => { setAssignees(p => ({ ...p, [id]: m })); toast.success(`Assigned to ${m}`); };
  const saveNote     = (id: string) => {
    const text = noteInput[id]?.trim();
    if (!text) return;
    setNotes(p => ({ ...p, [id]: text }));
    setNoteInput(p => ({ ...p, [id]: "" }));
    toast.success("Note saved");
  };

  const toggleSelect    = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((a) => a.id)));
  const bulkAck     = () => { selected.forEach((id) => setAcked(p => new Set([...p, id]))); toast.success(`${selected.size} alerts acknowledged`); setSelected(new Set()); };
  const bulkResolve = () => { selected.forEach((id) => setResolved(p => new Set([...p, id]))); toast.success(`${selected.size} alerts resolved`); setSelected(new Set()); };
  const bulkAssign  = (m: string) => {
    const ids = [...selected];
    setAssignees(p => { const n = { ...p }; ids.forEach((id) => { n[id] = m; }); return n; });
    toast.success(`${ids.length} alerts assigned to ${m}`);
    setSelected(new Set());
  };
  const advanceWorkflow = (id: string, current: WorkflowStage) => {
    const next = NEXT_STATUS[current];
    if (!next) return;
    setWorkflowByAlert((p) => ({ ...p, [id]: next }));
    if (next === "REMEDIATED") setResolved((p) => new Set([...p, id]));
    if (next === "TRIAGED") setAcked((p) => new Set([...p, id]));
  };

  const handleRunScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    toast.info("Security alert sync started", { description: selectedRegion });
    window.setTimeout(() => {
      setIsScanning(false);
      toast.success("Security alert sync completed", { description: selectedRegion });
    }, 1600);
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sevFilter, statusFilter, serviceFilter]);

  /* ── Shared button style ── */
  const ghostBtn = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.8)",
  } as const;
  const ms = { fontFamily: "'JetBrains Mono', monospace" } as const;

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-4">
      <DemoModeBanner />

      {/* ── Page header ── */}
      <ScanPageHeader
        icon={<AlertTriangle size={20} color="#ff6b35" />}
        iconColor="#ff6b35"
        title="Security Alerts"
        subtitle="Alert queue · Workflow triage · Runbook remediation · Agent automation"
        isScanning={isScanning}
        onScan={handleRunScan}
        onStop={() => setIsScanning(false)}
        onRefresh={() => {
          setHeaderRefreshSpin(true);
          window.setTimeout(() => setHeaderRefreshSpin(false), 800);
        }}
        onExport={() => toast.info("Exporting CSV…")}
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
      >
        <button
          type="button"
          onClick={() => setView((v) => v === "queue" ? "rules" : "queue")}
          style={view === "rules"
            ? { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 7, background: "rgba(255,64,96,0.12)", border: "1px solid rgba(255,64,96,0.35)", color: "#ff4060", fontSize: 12, fontWeight: 600, cursor: "pointer" }
            : { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }
          }
        >
          <Settings size={13} />
          {view === "queue" ? "Detection Rules" : "Alert Queue"}
        </button>
      </ScanPageHeader>

      {/* ── KPI Metrics Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        <StatCard label="Total Alerts"  value={stats.total}    accent="#94a3b8" />
        <StatCard label="Critical"      value={stats.critical} accent="#ff0040" />
        <StatCard label="High"          value={stats.high}     accent="#ff6b35" />
        <StatCard label="Active"        value={stats.active}   accent="#ff4060" />
        <StatCard label="In Review"     value={stats.inReview} accent="#ffb000" />
        <StatCard label="Resolved"      value={stats.resolved} accent="#00ff88" />
      </div>

      {/* ── Workflow Pipeline ── */}
      <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
          Workflow Pipeline
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {WORKFLOW_PIPELINE.map((stage, idx) => {
            const meta = WORKFLOW_META[stage];
            const count = pipelineCounts[stage] ?? 0;
            const isLast = idx === WORKFLOW_PIPELINE.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  onClick={() => setStatusFilter(statusFilter === stage ? "all" : stage)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: statusFilter === stage ? meta.bg : "rgba(255,255,255,0.02)", border: `1px solid ${statusFilter === stage ? `${meta.color}50` : "rgba(255,255,255,0.06)"}`, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", letterSpacing: "0.1em", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{meta.label}</div>
                </div>
                {!isLast && (
                  <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}>
                    <div style={{ position: "absolute", right: -3, top: -4, color: "rgba(100,116,139,0.3)", fontSize: 8 }}>▶</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          QUEUE VIEW
      ════════════════════════════════════════════════════════════════════ */}
      {view === "queue" ? (
        <>
          {/* ── Control bar ── */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-[280px] flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "rgba(71,85,105,0.8)" }}
              />
              <Input
                placeholder="Search alerts, resources…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
                className="h-8 pl-9 pr-8 text-sm rounded-lg border-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(71,85,105,0.8)" }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Severity chips */}
            <div className="flex gap-1">
              {(["all", "Critical", "High", "Medium", "Low"] as const).map((s) => {
                const c = s !== "all" ? SEV[s] : null;
                return (
                  <Chip
                    key={s}
                    active={sevFilter === s}
                    color={c?.text}
                    bg={c?.bg}
                    border={c?.border}
                    onClick={() => setSevFilter(s)}
                  >
                    {s === "all" ? "All" : s}
                  </Chip>
                );
              })}
            </div>

            <div className="h-5 w-px hidden sm:block" style={{ background: "rgba(255,255,255,0.08)" }} />

            {/* Workflow status chips */}
            <div className="flex gap-1">
              {(["all", ...WORKFLOW_PIPELINE] as const).map((s) => {
                const c = s !== "all" ? WORKFLOW_META[s] : null;
                return (
                  <Chip
                    key={s}
                    active={statusFilter === s}
                    color={c?.color}
                    bg={c?.bg}
                    border={c ? `${c.color}55` : undefined}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All Status" : WORKFLOW_META[s].label}
                  </Chip>
                );
              })}
            </div>

            {/* Service filter */}
            {services.length > 0 && (
              <>
                <div className="h-5 w-px hidden sm:block" style={{ background: "rgba(255,255,255,0.08)" }} />
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="h-8 text-[11px] rounded-lg px-2.5 appearance-none cursor-pointer outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: serviceFilter !== "all" ? "#00ff88" : "rgba(100,116,139,0.8)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <option value="all">All Services</option>
                  {services.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}

            {/* Sort */}
            <button
              onClick={() => setSortBy((s) => s === "severity" ? "time" : "severity")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] ml-auto transition-all"
              style={ghostBtn}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.8)")}
            >
              Sort: {sortBy === "severity" ? "Severity ↓" : "Newest ↓"}
            </button>
          </div>

          {/* ── Bulk action bar ── */}
          {selected.size > 0 && (
            <div
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.18)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                {selected.size} selected
              </span>
              <div className="h-4 w-px" style={{ background: "rgba(0,255,136,0.3)" }} />
              <button
                onClick={bulkAck}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.25)", color: "#ffb000" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,176,0,0.18)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,176,0,0.1)")}
              >
                Acknowledge ({selected.size})
              </button>
              <button
                onClick={bulkResolve}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,255,136,0.18)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,255,136,0.1)")}
              >
                Resolve ({selected.size})
              </button>
              {/* Assign dropdown */}
              <div className="relative group/assign">
                <button
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={ghostBtn}
                >
                  Assign to ▾
                </button>
                <div
                  className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden invisible group-hover/assign:visible"
                  style={{
                    background: "rgba(7,11,22,0.99)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    minWidth: "160px",
                  }}
                >
                  {TEAM.map((m) => (
                    <button
                      key={m}
                      onClick={() => bulkAssign(m)}
                      className="w-full text-left px-3.5 py-2 text-xs"
                      style={{ color: "rgba(148,163,184,0.9)", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs transition-colors"
                style={{ color: "rgba(71,85,105,0.8)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(71,85,105,0.8)")}
              >
                Clear selection
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Shield className="h-10 w-10 mb-4" style={{ color: "rgba(0,255,136,0.25)" }} />
              <p className="text-sm font-medium text-slate-400">
                {alerts.length === 0 ? "No alerts yet" : "No alerts match your filters"}
              </p>
              <p className="text-xs mt-1.5" style={{ color: "rgba(71,85,105,0.9)" }}>
                {alerts.length === 0
                  ? "Run a security scan from the dashboard to populate the queue."
                  : "Try broadening your filters."}
              </p>
              {(sevFilter !== "all" || statusFilter !== "all" || serviceFilter !== "all" || search) && (
                <button
                  onClick={() => { setSevFilter("all"); setStatusFilter("all"); setServiceFilter("all"); setSearch(""); }}
                  className="mt-4 text-xs px-3.5 py-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.8)" }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (

            /* ── Alert table ── */
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 140px 130px 110px 120px 90px", gap: 0, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
                <div />
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", paddingLeft: 12 }}>Alert / Resource</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Severity</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Status</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>SLA</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Assignee</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Risk /10</span>
              </div>

              {/* Rows */}
              {paginatedAlerts.map((alert, idx) => {
                const isExpanded = expanded === alert.id;
                const isSelected = selected.has(alert.id);
                const sv = SEV[alert.severity] ?? SEV.Medium;
                const steps = remediation(alert.service, alert.title, alert.description);
                const workflow = workflowByAlert[alert.id] ?? (alert.status === "Resolved" ? "REMEDIATED" : alert.status === "Acknowledged" ? "IN_PROGRESS" : "NEW");
                const workflowMeta = WORKFLOW_META[workflow];
                const tab = activeTab[alert.id] ?? "runbook";

                return (
                  <div
                    key={alert.id}
                    style={{
                      borderBottom: idx < paginatedAlerts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      background: isSelected
                        ? "rgba(0,255,136,0.04)"
                        : isExpanded
                        ? "rgba(255,255,255,0.018)"
                        : "transparent",
                    }}
                  >
                    {/* ─ Main row ─ */}
                    <div
                      onClick={() => setExpanded(isExpanded ? null : alert.id)}
                      style={{ display: "grid", gridTemplateColumns: "4px 1fr 140px 130px 110px 120px 90px", gap: 0, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: (!isExpanded && idx < filtered.length - 1) ? "1px solid rgba(255,255,255,0.04)" : "none", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.15s" }}
                    >
                      <div style={{ position: "relative", height: "100%" }}>
                        <div style={{ position: "absolute", left: 0, width: 4, top: -12, bottom: -12, background: sv.bar, borderRadius: "0 2px 2px 0", opacity: 0.85 }} />
                      </div>
                      <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{ flexShrink: 0 }}>{isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.title}</div>
                          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{alert.service}</div>
                          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.resource_id}</div>
                        </div>
                      </div>
                      <div>
                        <SeverityBadge severity={alert.severity} size="sm" />
                      </div>
                      <div>
                        <SeverityBadge severity={workflow} size="sm" />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>{age(alert.timestamp)} old</span>
                      </div>
                      <div>
                        {alert.assignee ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>{initials(alert.assignee)}</div>
                            <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.assignee}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(100,116,139,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>Unassigned</span>
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: alert.severity === "Critical" ? "#ff0040" : alert.severity === "High" ? "#ff6b35" : alert.severity === "Medium" ? "#ffb000" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                          {alert.severity === "Critical" ? "10" : alert.severity === "High" ? "8" : alert.severity === "Medium" ? "6" : "3"}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>/10</span>
                        </span>
                      </div>
                    </div>

                    {/* ─ Expanded panel ─ */}
                    {isExpanded && (
                      <div
                        className="pt-4"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
                      >
                        <div style={{ padding: "8px 20px 8px 36px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(100,116,139,0.9)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginRight: 8 }}>Workflow</span>
                          {NEXT_STATUS[workflow] && (
                            <button
                              onClick={() => advanceWorkflow(alert.id, workflow)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", color: "#818cf8", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              <Activity size={11} />
                              Advance → {WORKFLOW_META[NEXT_STATUS[workflow]!].label}
                            </button>
                          )}
                          <select
                            value={alert.assignee ?? ""}
                            onChange={(e) => { if (e.target.value) assignAlert(alert.id, e.target.value); }}
                            style={{ padding: "4px 8px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(100,116,139,0.8)", fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <option value="" disabled>Assign to…</option>
                            {ALERT_ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                          {ticketByAlert[alert.id] ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00ff88", background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 5, padding: "4px 12px", fontFamily: "'JetBrains Mono', monospace" }}><Ticket size={11} />{ticketByAlert[alert.id]}</span>
                          ) : (
                            <button
                              onClick={() => setTicketByAlert((p) => ({ ...p, [alert.id]: `SEC-${5400 + idx}` }))}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 5, fontSize: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              <Ticket size={11} /> Create Ticket
                            </button>
                          )}
                          <button
                            onClick={() => { setWorkflowByAlert((p) => ({ ...p, [alert.id]: "FALSE_POSITIVE" })); toast.success("Marked as false positive"); }}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 5, fontSize: 11, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)", color: "#64748b", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <AlertTriangle size={11} />
                            False Positive
                          </button>
                          <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                            {ticketByAlert[alert.id] ? `Ticket: ${ticketByAlert[alert.id]} · ` : ""}First seen: {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ padding: "0 20px 0 36px" }}>
                          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 0 }}>
                            {[
                              { id: "runbook", label: "Runbook", icon: GitBranch },
                              { id: "overview", label: "Overview", icon: Eye },
                              { id: "timeline", label: "Timeline", icon: Activity },
                              { id: "agents", label: "Agent Actions", icon: Bot },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setActiveTab((p) => ({ ...p, [alert.id]: t.id }))}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "8px 16px",
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: `2px solid ${tab === t.id ? "#818cf8" : "transparent"}`,
                                  color: tab === t.id ? "#818cf8" : "rgba(100,116,139,0.65)",
                                  fontSize: 12,
                                  fontWeight: tab === t.id ? 600 : 400,
                                  cursor: "pointer",
                                  marginBottom: -1,
                                }}
                              >
                                <t.icon size={12} />
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ padding: "12px 20px 20px 36px" }}>
                        {tab === "runbook" && (
                          <div>
                            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                              {["IDENTIFY", "CONTAIN", "REMEDIATE", "VERIFY"].map((ph, i) => (
                                <span key={ph} style={{ padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: i === 0 ? "rgba(129,140,248,0.18)" : i === 1 ? "rgba(255,107,53,0.18)" : i === 2 ? "rgba(255,176,0,0.18)" : "rgba(0,255,136,0.18)", border: i === 0 ? "1px solid rgba(129,140,248,0.3)" : i === 1 ? "1px solid rgba(255,107,53,0.3)" : i === 2 ? "1px solid rgba(255,176,0,0.3)" : "1px solid rgba(0,255,136,0.3)", color: i === 0 ? "#818cf8" : i === 1 ? "#ff6b35" : i === 2 ? "#ffb000" : "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
                                  {ph}
                                </span>
                              ))}
                              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(100,116,139,0.5)" }}>
                                Est. total: {Math.max(steps.length * 4, 8)} min
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {steps.map((step, i) => {
                                const phase = i < 2 ? "IDENTIFY" : i < steps.length - 1 ? "REMEDIATE" : "VERIFY";
                                const phaseColor = phase === "IDENTIFY" ? "#818cf8" : phase === "CONTAIN" ? "#ff6b35" : phase === "REMEDIATE" ? "#ffb000" : "#00ff88";
                                const command = alert.service === "EC2"
                                  ? "aws ec2 describe-security-groups --group-ids <sg-id> --region us-east-1"
                                  : alert.service === "S3"
                                  ? "aws s3api get-bucket-policy --bucket <bucket-name>"
                                  : alert.service === "IAM"
                                  ? "aws iam get-role --role-name <role-name>"
                                  : "aws securityhub get-findings --filters <alert-filter>";
                                return (
                                  <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, alignItems: "start" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${phaseColor}18`, border: `1px solid ${phaseColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: phaseColor, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                                        {i + 1}
                                      </div>
                                      {i < steps.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
                                    </div>
                                    <div style={{ paddingBottom: 8 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ padding: "4px 8px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: `${phaseColor}18`, color: phaseColor, fontFamily: "'JetBrains Mono', monospace" }}>{phase}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Remediation Step {i + 1}</span>
                                        <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>~4 min</span>
                                      </div>
                                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.5 }}>{step}</p>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono', monospace" }}>
                                          <span style={{ flex: 1, fontSize: 11, color: "#a5b4fc", wordBreak: "break-all", lineHeight: 1.5 }}>{command}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {tab === "overview" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                              <p className="section-label">Description</p>
                              <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>{alert.description}</p>
                              <div style={{ marginTop: 12, padding: 12, borderRadius: 7, background: "rgba(255,176,0,0.07)", border: "1px solid rgba(255,176,0,0.2)" }}>
                                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,176,0,0.8)", margin: "0 0 6px", fontFamily: "'JetBrains Mono', monospace" }}>Recommendation</p>
                                <p style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.7, margin: 0 }}>{steps[0] ?? "Follow runbook actions to remediate and verify closure."}</p>
                              </div>
                            </div>
                            <div>
                              <p className="section-label">Alert Details</p>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                                {[
                                  ["Service", alert.service],
                                  ["Severity", alert.severity],
                                  ["Workflow", workflowMeta.label],
                                  ["Age", age(alert.timestamp)],
                                  ["Owner", alert.assignee ?? "Unassigned"],
                                  ["Resource", alert.resource_id],
                                ].map(([k, v]) => (
                                  <div key={String(k)}>
                                    <span style={{ color: "rgba(100,116,139,0.6)" }}>{k}: </span>
                                    <span style={{ color: "#94a3b8" }}>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <p className="section-label">Investigation Notes</p>
                                {notes[alert.id] && (
                                  <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#cbd5e1", marginBottom: 8 }}>
                                    {notes[alert.id]}
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 8 }}>
                                  <Textarea
                                    placeholder="Add investigation note…"
                                    value={noteInput[alert.id] ?? ""}
                                    onChange={(e) => setNoteInput((p) => ({ ...p, [alert.id]: e.target.value }))}
                                    rows={2}
                                    className="flex-1 text-sm rounded-lg border-0 resize-none"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1" }}
                                  />
                                  <button onClick={() => saveNote(alert.id)} style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88", fontSize: 11, cursor: "pointer" }}>
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {tab === "timeline" && (
                          <div style={{ maxHeight: 320, overflowY: "auto" }}>
                            {[
                              { actor: "System", actorType: "system", action: `Detected ${alert.title}`, note: "Auto-ingested from scan findings", ts: new Date(alert.timestamp).toLocaleString() },
                              { actor: alert.assignee ?? "Analyst", actorType: "analyst", action: alert.assignee ? `Assigned to ${alert.assignee}` : "Awaiting owner assignment", note: alert.assignee ? "Owner selected in workflow actions" : "No assignee selected yet", ts: "Just now" },
                              { actor: "Workflow Engine", actorType: "engineer", action: `Current status: ${workflowMeta.label}`, note: `Service: ${alert.service}`, ts: "Just now" },
                            ].map((ev, i, arr) => {
                              const actorColors: Record<string, string> = { system: "#64748b", analyst: "#06b6d4", engineer: "#00ff88", automation: "#818cf8" };
                              return (
                                <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12, marginBottom: 12 }}>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: actorColors[ev.actorType], border: `1px solid ${actorColors[ev.actorType]}40`, flexShrink: 0, marginTop: 3 }} />
                                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 8, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />}
                                  </div>
                                  <div style={{ paddingBottom: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{ev.action}</span>
                                      <span style={{ padding: "4px 4px", borderRadius: 3, fontSize: 9, fontWeight: 600, background: `${actorColors[ev.actorType]}20`, color: actorColors[ev.actorType], fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>{ev.actorType}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)" }}>{ev.actor}</span>
                                      <span style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>{ev.ts}</span>
                                    </div>
                                    <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>{ev.note}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {tab === "agents" && (
                          <div>
                            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                              <Bot size={14} color="#a78bfa" />
                              <span style={{ fontSize: 11, color: "#a78bfa" }}>
                                AI Agent integration ready — wire endpoints below to <code style={{ fontFamily: "'JetBrains Mono', monospace", background: "rgba(167,139,250,0.15)", padding: "4px 8px", borderRadius: 3 }}>/api/agents</code>
                              </span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {[
                                { icon: <Zap size={16} color="#818cf8" />, title: "AI Triage Analysis", desc: "Send finding context to LLM agent for automated severity validation, false-positive scoring, and enrichment from threat intel feeds.", endpoint: "POST /api/agents/triage", color: "#818cf8" },
                                { icon: <Bot size={16} color="#a78bfa" />, title: "Auto-Remediate", desc: "Trigger Lambda-backed remediation agent to execute the runbook steps automatically. Requires approval workflow.", endpoint: "POST /api/agents/remediate", color: "#a78bfa" },
                                { icon: <Ticket size={16} color="#06b6d4" />, title: "Create Ticket", desc: "Auto-generate a Jira/ServiceNow incident with pre-filled description, severity, assignee, and runbook link.", endpoint: "POST /api/integrations/ticket", color: "#06b6d4" },
                                { icon: <ExternalLink size={16} color="#fb923c" />, title: "Enrich with Threat Intel", desc: "Query Shodan, VirusTotal, and internal threat feeds for the public IP / resource to assess active exploitation.", endpoint: "POST /api/agents/enrich", color: "#fb923c" },
                                { icon: <UserCircle size={16} color="#34d399" />, title: "Blast Radius Analysis", desc: "Identify all resources reachable from this alert context using identity, network, and policy relationships.", endpoint: "POST /api/agents/blast-radius", color: "#34d399" },
                                { icon: <CheckCircle size={16} color="#00ff88" />, title: "Verify Remediation", desc: "Re-scan this specific finding post-remediation to confirm the issue is resolved and advance workflow to REMEDIATED.", endpoint: "POST /api/agents/verify", color: "#00ff88" },
                              ].map((a) => (
                                <div key={a.title} style={{ padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    {a.icon}
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{a.title}</span>
                                  </div>
                                  <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px", lineHeight: 1.5 }}>{a.desc}</p>
                                  <div style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(0,0,0,0.3)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                                    <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{a.endpoint}</span>
                                  </div>
                                  <button onClick={() => toast.info(`${a.title} stub`, { description: `${a.endpoint} for ${alert.id}` })} style={{ width: "100%", padding: "6px 0", borderRadius: 6, background: `${a.color}15`, border: `1px solid ${a.color}35`, color: a.color, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Run Agent</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Row count */}
          {filtered.length > 0 && (
            <p
              className="text-xs text-right"
              style={{ color: "rgba(71,85,105,0.7)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} alerts
            </p>
          )}

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
        </>

      ) : (
        /* ══════════════════════════════════════════════════════════════════
            RULES VIEW
        ════════════════════════════════════════════════════════════════════ */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Detection rules that generate alerts when scan findings match defined conditions.
            </p>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium"
              style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88" }}
              onClick={() => toast.info("Rule editor coming soon")}
            >
              + New Rule
            </button>
          </div>

          {rules.map((rule) => {
            const sv = SEV[rule.severity] ?? SEV.Medium;
            return (
              <div
                key={rule.id}
                className="relative rounded-2xl p-4 flex items-start gap-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  opacity: rule.enabled ? 1 : 0.5,
                  transition: "opacity 0.2s",
                }}
              >
                <div
                  className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                  style={{ background: sv.bar }}
                />
                <div className="flex-1 min-w-0 pl-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-slate-200">{rule.name}</span>
                    <SeverityBadge severity={rule.severity} size="sm" />
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.75)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {rule.service}
                    </span>
                    {!rule.enabled && (
                      <span className="text-[10px]" style={{ color: "rgba(71,85,105,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                        DISABLED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">{rule.description}</p>
                  <div
                    className="flex flex-wrap items-center gap-4 text-[11px]"
                    style={{ color: "rgba(71,85,105,0.85)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <span className="truncate max-w-xs">{rule.condition}</span>
                    <span>notify: {rule.notifications.join(", ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => {
                      setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
                      toast.info(`Rule ${rule.enabled ? "disabled" : "enabled"}`);
                    }}
                  />
                  <button
                    style={{ color: "rgba(71,85,105,0.7)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(71,85,105,0.7)")}
                    onClick={() => toast.info("Rule editor coming soon")}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared label style injected once */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .section-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: rgba(71,85,105,0.8);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
