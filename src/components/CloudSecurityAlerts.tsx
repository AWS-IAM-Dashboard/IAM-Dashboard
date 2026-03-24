import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import {
  AlertTriangle, Bell, CheckCircle, Clock, RefreshCw, Settings,
  Shield, Users, ChevronDown, ChevronRight, Copy, Download,
  Search, X,
} from "lucide-react";
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
      if (statusFilter !== "all" && a.status   !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service !== serviceFilter) return false;
      if (q && !`${a.title} ${a.description} ${a.resource_id} ${a.service}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [alerts, sevFilter, statusFilter, serviceFilter, search]);

  const stats = useMemo(() => ({
    total:    alerts.length,
    active:   alerts.filter((a) => a.status === "Active").length,
    critical: alerts.filter((a) => a.severity === "Critical").length,
    high:     alerts.filter((a) => a.severity === "High").length,
    inReview: alerts.filter((a) => a.status === "Acknowledged").length,
    resolved: alerts.filter((a) => a.status === "Resolved").length,
  }), [alerts]);

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

  /* ── Shared button style ── */
  const ghostBtn = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.8)",
  } as const;

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-4">
      <DemoModeBanner />

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Security Alerts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Alert queue · triage · remediation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView((v) => v === "queue" ? "rules" : "queue")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
            style={
              view === "rules"
                ? { background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.28)", color: "#00ff88" }
                : ghostBtn
            }
          >
            <Settings className="h-3.5 w-3.5" />
            {view === "queue" ? "Detection Rules" : "← Alert Queue"}
          </button>
          <button
            onClick={() => toast.info("Exporting CSV…")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
            style={ghostBtn}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
            style={ghostBtn}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: "Critical",   val: stats.critical, color: "#ff0040" },
          { label: "High",       val: stats.high,     color: "#ff6b35" },
          { label: "Active",     val: stats.active,   color: "#ff4060" },
          { label: "In Review",  val: stats.inReview, color: "#ffb000" },
          { label: "Resolved",   val: stats.resolved, color: "#00ff88" },
          { label: "Total",      val: stats.total,    color: "rgba(148,163,184,0.7)" },
        ] as const).map((s) => (
          <div
            key={s.label}
            className="flex items-baseline gap-2 rounded-lg px-3.5 py-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span
              className="text-xl font-bold tabular-nums leading-none"
              style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {s.val}
            </span>
            <span className="text-xs" style={{ color: "rgba(100,116,139,0.85)" }}>{s.label}</span>
          </div>
        ))}
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

            {/* Status chips */}
            <div className="flex gap-1">
              {(["all", "Active", "Acknowledged", "Resolved"] as const).map((s) => {
                const c = s !== "all" ? STA[s] : null;
                return (
                  <Chip
                    key={s}
                    active={statusFilter === s}
                    color={c?.text}
                    bg={c?.bg}
                    border={c?.border}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All Status" : s === "Acknowledged" ? "In Review" : s}
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
                    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
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
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* Table header */}
              <div
                className="flex items-center gap-3 px-5 py-2.5 select-none"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(71,85,105,0.8)",
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {/* Select all */}
                <button onClick={toggleSelectAll} className="shrink-0 flex items-center justify-center w-4 h-4">
                  <div
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{
                      border: `1.5px solid ${selected.size > 0 ? "#00ff88" : "rgba(71,85,105,0.4)"}`,
                      background: selected.size === filtered.length && filtered.length > 0 ? "#00ff88" : "transparent",
                    }}
                  />
                </button>
                <span className="w-[88px] shrink-0">Sev.</span>
                <span className="flex-1">Alert / Resource</span>
                <span className="w-24 shrink-0 hidden md:block">Service</span>
                <span className="w-24 shrink-0 hidden lg:block">Status</span>
                <span className="w-10 text-right shrink-0 hidden sm:block">Age</span>
                <span className="w-[88px] text-right shrink-0 hidden xl:block">Owner</span>
                <span className="w-24 text-right shrink-0">Actions</span>
              </div>

              {/* Rows */}
              {filtered.map((alert, idx) => {
                const isExpanded = expanded === alert.id;
                const isSelected = selected.has(alert.id);
                const sv = SEV[alert.severity] ?? SEV.Medium;
                const st = STA[alert.status]   ?? STA.Active;
                const steps = remediation(alert.service, alert.title, alert.description);

                return (
                  <div
                    key={alert.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      background: isSelected
                        ? "rgba(0,255,136,0.04)"
                        : isExpanded
                        ? "rgba(255,255,255,0.018)"
                        : "transparent",
                    }}
                  >
                    {/* ─ Main row ─ */}
                    <div className="flex items-center gap-3 px-5 py-3.5 group relative">
                      {/* Severity accent bar */}
                      <div
                        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
                        style={{ background: sv.bar }}
                      />

                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(alert.id); }}
                        className="shrink-0 w-4 h-4 flex items-center justify-center transition-opacity"
                        style={{ opacity: isSelected ? 1 : 0 }}
                        onMouseEnter={(e) => (e.currentTarget.parentElement!.classList.contains("group") && (e.currentTarget.style.opacity = "1"))}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-sm"
                          style={{
                            border: `1.5px solid ${isSelected ? "#00ff88" : "rgba(71,85,105,0.4)"}`,
                            background: isSelected ? "#00ff88" : "transparent",
                          }}
                        />
                      </button>

                      {/* Severity badge */}
                      <span
                        className="shrink-0 w-[88px] text-center text-[10px] font-bold py-0.5 rounded"
                        style={{
                          background: sv.bg,
                          border: `1px solid ${sv.border}`,
                          color: sv.text,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {alert.severity.toUpperCase()}
                      </span>

                      {/* Title + resource — clicking expands */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : alert.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-slate-200 truncate leading-snug">{alert.title}</p>
                        <p
                          className="text-[11px] truncate mt-0.5 leading-snug"
                          style={{ color: "rgba(100,116,139,0.75)", fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {alert.resource_id}
                        </p>
                      </button>

                      {/* Service */}
                      <span
                        className="shrink-0 w-24 text-center text-[10px] py-0.5 rounded hidden md:block"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(148,163,184,0.75)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {alert.service}
                      </span>

                      {/* Status */}
                      <span
                        className="shrink-0 w-24 text-center text-[10px] font-semibold py-0.5 rounded hidden lg:block"
                        style={{
                          background: st.bg,
                          border: `1px solid ${st.border}`,
                          color: st.text,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {alert.status === "Acknowledged" ? "IN REVIEW" : alert.status.toUpperCase()}
                      </span>

                      {/* Age */}
                      <span
                        className="shrink-0 w-10 text-right text-xs hidden sm:block"
                        style={{ color: "rgba(71,85,105,0.85)", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {age(alert.timestamp)}
                      </span>

                      {/* Owner */}
                      <div className="shrink-0 w-[88px] hidden xl:flex justify-end">
                        {alert.assignee ? (
                          <div
                            className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.8)" }}
                          >
                            <div
                              className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ background: "rgba(0,255,136,0.15)", color: "#00ff88" }}
                            >
                              {initials(alert.assignee)}
                            </div>
                            <span className="truncate max-w-[48px]">{alert.assignee.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(51,65,85,0.7)" }}>—</span>
                        )}
                      </div>

                      {/* Quick actions (visible on hover) */}
                      <div
                        className="shrink-0 w-24 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {alert.status === "Active" && (
                          <button
                            onClick={() => ackAlert(alert.id)}
                            title="Acknowledge — move to In Review"
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.28)", color: "#ffb000", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            ACK
                          </button>
                        )}
                        {alert.status !== "Resolved" && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            title="Mark resolved"
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.28)", color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            DONE
                          </button>
                        )}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : alert.id)}
                          title="Expand details"
                          className="p-0.5 rounded transition-colors"
                          style={{ color: "rgba(71,85,105,0.7)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(71,85,105,0.7)")}
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* ─ Expanded panel ─ */}
                    {isExpanded && (
                      <div
                        className="px-6 pb-6 pt-4"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                          {/* ─ Left column: context + assignment + notes ─ */}
                          <div className="space-y-5">

                            {/* Description */}
                            <div>
                              <p className="section-label">Description</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{alert.description}</p>
                            </div>

                            {/* Resource with copy */}
                            <div>
                              <p className="section-label">Resource</p>
                              <div
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                              >
                                <span
                                  className="flex-1 text-xs truncate"
                                  style={{ color: "#cbd5e1", fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  {alert.resource_id}
                                </span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(alert.resource_id); toast.success("Copied"); }}
                                  title="Copy resource ID"
                                  style={{ color: "rgba(71,85,105,0.7)" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00ff88")}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(71,85,105,0.7)")}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Assign */}
                            <div>
                              <p className="section-label">Assign Owner</p>
                              <div className="flex flex-wrap gap-1.5">
                                {TEAM.map((m) => {
                                  const isOwner = alert.assignee === m;
                                  return (
                                    <button
                                      key={m}
                                      onClick={() => assignAlert(alert.id, m)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                                      style={{
                                        background: isOwner ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${isOwner ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                                        color: isOwner ? "#00ff88" : "rgba(148,163,184,0.8)",
                                      }}
                                      onMouseEnter={(e) => { if (!isOwner) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                                      onMouseLeave={(e) => { if (!isOwner) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                                    >
                                      <div
                                        className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                        style={{
                                          background: isOwner ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.1)",
                                          color: isOwner ? "#00ff88" : "#94a3b8",
                                        }}
                                      >
                                        {initials(m)}
                                      </div>
                                      {m.split(" ")[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Investigation notes */}
                            <div>
                              <p className="section-label">Investigation Notes</p>
                              {notes[alert.id] && (
                                <div
                                  className="rounded-lg px-3 py-2.5 mb-2 text-sm text-slate-300 leading-relaxed"
                                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                                >
                                  {notes[alert.id]}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Textarea
                                  placeholder="Add investigation note… (Enter to save)"
                                  value={noteInput[alert.id] ?? ""}
                                  onChange={(e) => setNoteInput((p) => ({ ...p, [alert.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(alert.id); } }}
                                  rows={2}
                                  className="flex-1 text-sm rounded-lg border-0 resize-none"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#cbd5e1",
                                  }}
                                />
                                <button
                                  onClick={() => saveNote(alert.id)}
                                  className="px-3 self-end mb-0.5 h-8 text-xs rounded-lg font-medium"
                                  style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.28)", color: "#00ff88" }}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ─ Right column: remediation playbook + resolve actions ─ */}
                          <div className="flex flex-col gap-4">
                            <div>
                              <p className="section-label">Remediation Playbook</p>
                              <div className="space-y-2">
                                {steps.map((step, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-3 rounded-xl px-3.5 py-2.5"
                                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                                  >
                                    <span
                                      className="h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}
                                    >
                                      {i + 1}
                                    </span>
                                    <p className="text-xs text-slate-300 leading-relaxed">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Resolve actions */}
                            <div className="flex gap-2 mt-auto pt-2">
                              {alert.status === "Active" && (
                                <button
                                  onClick={() => ackAlert(alert.id)}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
                                  style={{ background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.28)", color: "#ffb000" }}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Acknowledge — In Review
                                </button>
                              )}
                              {alert.status !== "Resolved" && (
                                <button
                                  onClick={() => resolveAlert(alert.id)}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
                                  style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.28)", color: "#00ff88" }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Mark Resolved
                                </button>
                              )}
                            </div>
                          </div>
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
              Showing {filtered.length} of {alerts.length} alerts
            </p>
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
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: sv.bg, border: `1px solid ${sv.border}`, color: sv.text, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {rule.severity.toUpperCase()}
                    </span>
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
