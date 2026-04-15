import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Search, UserPlus, CheckCircle2, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import type { SOCAlert, AlertSeverity, AlertStatus } from "./types";
import { MOCK_ALERTS, ANALYSTS } from "./mockData";
import { mono, ls, divider, SEV_COLOR, STATUS_COLOR, SeverityPill, StatusPill, SLATimer, EmptyState, BackendHandoff, ModuleHeader, MockBadge } from "./shared";

const ALL_STATUSES: AlertStatus[] = ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED", "RESOLVED", "SUPPRESSED", "FALSE_POSITIVE"];
const ALL_SEVERITIES: AlertSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface AlertRowProps {
  alert: SOCAlert;
  isExpanded: boolean;
  isMobile: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: AlertStatus) => void;
  onAssign: (id: string, analyst: string) => void;
  onEscalate: (id: string) => void;
}

function AlertRow({ alert, isExpanded, isMobile, onToggle, onStatusChange, onAssign, onEscalate }: AlertRowProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const sc = SEV_COLOR[alert.severity];

  if (isMobile) {
    return (
      <div style={{ borderBottom: divider }}>
        <button
          type="button"
          onClick={onToggle}
          style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "12px 12px 10px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.35 }}>{alert.title}</div>
              <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.6)", marginTop: 3, wordBreak: "break-word" }}>{alert.resource}</div>
            </div>
            <SeverityPill severity={alert.severity} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <StatusPill status={alert.status} />
            <SLATimer deadline={alert.sla_deadline} breached={alert.sla_breached} />
            <span style={{ marginLeft: "auto", color: "rgba(100,116,139,0.5)", display: "flex" }}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          </div>
        </button>
        {isExpanded && (
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>
                Status
                <select
                  value={alert.status}
                  onChange={(e) => onStatusChange(alert.id, e.target.value as AlertStatus)}
                  style={{ marginTop: 4, width: "100%", ...mono, fontSize: 10, padding: "5px 22px 5px 8px", borderRadius: 6, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.28)", color: "#c8fce8", outline: "none", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </label>
              <label style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>
                Assignee
                <select
                  value={alert.assignee ?? ""}
                  onChange={(e) => onAssign(alert.id, e.target.value)}
                  style={{ marginTop: 4, width: "100%", ...mono, fontSize: 10, padding: "5px 22px 5px 8px", borderRadius: 6, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.28)", color: "#c8fce8", outline: "none", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                >
                  <option value="">Unassigned</option>
                  {ANALYSTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            {alert.status !== "ESCALATED" && alert.status !== "RESOLVED" && (
              <button
                onClick={() => onEscalate(alert.id)}
                style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "6px 10px", borderRadius: 6, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", color: "#ff6b35", cursor: "pointer", alignSelf: "flex-start" }}
              >
                Escalate
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="soc-row" style={{ borderBottom: divider, borderLeft: `2px solid ${isExpanded ? sc : "transparent"}`, transition: "border-color 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
          {/* Expand */}
          <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(100,116,139,0.4)", padding: 0, display: "flex", flexShrink: 0 }}>
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {/* Severity */}
          <SeverityPill severity={alert.severity} />

          {/* Title + resource */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {alert.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                {alert.resource}
              </span>
              <span style={{ fontSize: 9, color: "rgba(100,116,139,0.3)" }}>·</span>
              <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)" }}>{alert.source}</span>
              {alert.count > 1 && (
                <span style={{ ...mono, fontSize: 9, padding: "0 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.5)" }}>
                  ×{alert.count}
                </span>
              )}
            </div>
          </div>

          {/* SLA */}
          <div style={{ flexShrink: 0 }}>
            <SLATimer deadline={alert.sla_deadline} breached={alert.sla_breached} />
          </div>

          {/* Status */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <button onClick={() => setShowStatusMenu(x => !x)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <StatusPill status={alert.status} />
            </button>
            {showStatusMenu && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 50, background: "rgba(8,12,24,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => { onStatusChange(alert.id, s); setShowStatusMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px", background: "none", border: "none", borderRadius: 5, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[s], flexShrink: 0 }} />
                    <span style={{ ...mono, fontSize: 10, color: STATUS_COLOR[s] }}>{s.replace("_", " ")}</span>
                    {s === alert.status && <CheckCircle2 size={10} color="#00ff88" style={{ marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <button onClick={() => setShowAssign(x => !x)} style={{ ...mono, fontSize: 10, color: alert.assignee ? "#94a3b8" : "rgba(100,116,139,0.35)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4 } as React.CSSProperties}>
              <UserPlus size={10} />
              {alert.assignee ?? "Unassigned"}
            </button>
            {showAssign && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 50, background: "rgba(8,12,24,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, minWidth: 150, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {ANALYSTS.map(a => (
                  <button key={a} onClick={() => { onAssign(alert.id, a); setShowAssign(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px", background: "none", border: "none", borderRadius: 5, cursor: "pointer", color: alert.assignee === a ? "#00ff88" : "#94a3b8", fontSize: 11 }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {alert.status !== "ESCALATED" && alert.status !== "RESOLVED" && (
              <button onClick={() => onEscalate(alert.id)} title="Escalate"
                style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", color: "#ff6b35", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <ArrowUpCircle size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: "12px 16px 12px 40px", borderBottom: divider, background: "rgba(255,255,255,0.012)", borderLeft: `2px solid ${sc}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Rule ID", alert.rule_id],
                ["Region", alert.region],
                ["First Seen", relativeTime(alert.created_at)],
                ...(alert.mitre_technique ? [["MITRE", alert.mitre_technique]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
                  <span style={{ ...ls, fontSize: 9 }}>{k}</span>
                  <span style={{ ...mono, fontSize: 10, color: "#94a3b8" }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ ...ls, marginBottom: 8, fontSize: 9 }}>Resource ARN</div>
              <code style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.6)", wordBreak: "break-all", lineHeight: 1.5 }}>
                {alert.resource_arn}
              </code>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {alert.tags.map(t => (
              <span key={t} style={{ ...mono, fontSize: 9, padding: "0 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.55)" }}>{t}</span>
            ))}
          </div>
          {alert.investigation_id && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...ls, fontSize: 9 }}>Investigation</span>
              <span style={{ ...mono, fontSize: 10, color: "#60a5fa", padding: "0 8px", borderRadius: 4, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>{alert.investigation_id}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function AlertQueue() {
  const [alerts, setAlerts] = useState<SOCAlert[]>(MOCK_ALERTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [filterSev, setFilterSev] = useState<AlertSeverity | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtered = useMemo(() => alerts.filter(a => {
    if (filterSev !== "ALL" && a.severity !== filterSev) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.resource.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [alerts, filterSev, filterStatus, search]);

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === "CRITICAL" && a.status !== "RESOLVED").length,
    high: alerts.filter(a => a.severity === "HIGH" && a.status !== "RESOLVED").length,
    newCount: alerts.filter(a => a.status === "NEW").length,
    sla_breach: alerts.filter(a => a.sla_breached).length,
  }), [alerts]);

  const handleStatusChange = useCallback((id: string, status: AlertStatus) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast.success(`Alert → ${status}`, { description: id });
  }, []);

  const handleAssign = useCallback((id: string, analyst: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, assignee: analyst, status: a.status === "NEW" ? "ACKNOWLEDGED" : a.status } : a));
    toast.success(`Assigned to ${analyst}`);
  }, []);

  const handleEscalate = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "ESCALATED" } : a));
    toast.warning("Alert escalated", { description: "On-call team notified via PagerDuty (mock)." });
  }, []);

  return (
    <div>
      <ModuleHeader
        icon={<AlertTriangle size={16} color="#ff6b35" />}
        title="Alert Queue"
        subtitle="Real-time security alert triage — SLA-tracked, assignable, and escalation-ready."
        live={false}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Critical", value: stats.critical, color: "#ff0040", accent: stats.critical > 0 },
          { label: "High", value: stats.high, color: "#ff6b35", accent: stats.high > 0 },
          { label: "New", value: stats.newCount, color: "#60a5fa", accent: true },
          { label: "SLA Breach", value: stats.sla_breach, color: "#ff0040", accent: stats.sla_breach > 0 },
          { label: "Total Active", value: alerts.filter(a => !["RESOLVED","SUPPRESSED","FALSE_POSITIVE"].includes(a.status)).length, color: "#94a3b8", accent: false },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: s.accent ? `${s.color}0a` : "rgba(15,23,42,0.8)",
              border: `1px solid ${s.accent ? `${s.color}28` : "rgba(255,255,255,0.07)"}`,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 0,
            }}
          >
            <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ ...mono, fontSize: 17, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.4)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, height: 30, borderRadius: 6, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 11, outline: "none", ...mono, boxSizing: "border-box" }} />
        </div>

        {/* Severity filter */}
        {(["ALL", ...ALL_SEVERITIES] as const).map(s => (
          <button key={s} onClick={() => setFilterSev(s as AlertSeverity | "ALL")}
            style={{ ...mono, fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 999, cursor: "pointer", background: filterSev === s ? (s === "ALL" ? "rgba(0,255,136,0.1)" : `${SEV_COLOR[s as AlertSeverity]}14`) : "rgba(255,255,255,0.03)", border: `1px solid ${filterSev === s ? (s === "ALL" ? "rgba(0,255,136,0.3)" : `${SEV_COLOR[s as AlertSeverity]}30`) : "rgba(255,255,255,0.07)"}`, color: filterSev === s ? (s === "ALL" ? "#00ff88" : SEV_COLOR[s as AlertSeverity]) : "rgba(100,116,139,0.6)" }}>
            {s}
          </button>
        ))}

        {/* Status filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AlertStatus | "ALL")}
          style={{ ...mono, fontSize: 10, padding: "4px 22px 4px 10px", borderRadius: 6, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.28)", color: "#c8fce8", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}>
          <option value="ALL">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)" }}>
        {/* Table header */}
        <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, background: "rgba(255,255,255,0.02)" }}>
          <span style={{ ...ls, width: 16 }} />
          <span style={{ ...ls, width: 90 }}>Severity</span>
          <span style={{ ...ls, flex: 1 }}>Finding</span>
          <span style={{ ...ls, width: 80 }}>SLA</span>
          <span style={{ ...ls, width: 120 }}>Status</span>
          <span style={{ ...ls, width: 120 }}>Assignee</span>
          <span style={{ ...ls, width: 60 }}>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={32} />} title="Queue is clear" subtitle="No alerts match the current filters." />
        ) : (
          filtered.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              isExpanded={expandedId === alert.id}
              isMobile={isMobile}
              onToggle={() => setExpandedId(x => x === alert.id ? null : alert.id)}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
              onEscalate={handleEscalate}
            />
          ))
        )}
      </div>

      <BackendHandoff endpoints={[
        { method: "GET", path: "/api/soc/alerts", description: "Paginated alert list with filtering + sorting" },
        { method: "PATCH", path: "/api/soc/alerts/{id}/status", description: "Update alert status" },
        { method: "PATCH", path: "/api/soc/alerts/{id}/assign", description: "Assign alert to analyst" },
        { method: "POST", path: "/api/soc/alerts/{id}/escalate", description: "Escalate to PagerDuty/Slack" },
        { method: "GET", path: "WebSocket /api/soc/live", description: "Live alert stream (EventBridge → API GW WebSocket)" },
      ]} />
    </div>
  );
}
