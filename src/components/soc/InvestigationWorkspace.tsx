import { useState } from "react";
import {
  Search, Clock, FileText, Link2, Database, MessageSquare,
  ChevronRight, ChevronDown, Archive, Shield, AlertTriangle,
} from "lucide-react";
import type { Investigation, InvestigationStatus, InvestigationEvent, Evidence } from "./types";
import { MOCK_INVESTIGATIONS, MOCK_ALERTS } from "./mockData";
import { mono, ls, divider, SEV_COLOR, BackendHandoff, ModuleHeader, StatStrip, SeverityPill, EmptyState } from "./shared";

const INV_STATUS_COLOR: Record<InvestigationStatus, string> = {
  OPEN: "#60a5fa", IN_PROGRESS: "#ffb000", PENDING_REVIEW: "#a78bfa", CLOSED: "#64748b",
};

const EVENT_ICON: Record<InvestigationEvent["type"], React.ReactNode> = {
  alert_linked:    <Link2 size={11} />,
  note:            <MessageSquare size={11} />,
  evidence_added:  <Archive size={11} />,
  status_change:   <Shield size={11} />,
  query_run:       <Database size={11} />,
  containment:     <AlertTriangle size={11} />,
};

const EVIDENCE_TYPE_LABEL: Record<Evidence["type"], string> = {
  snapshot: "EBS Snapshot", log_export: "Log Export", memory_dump: "Memory Dump",
  screenshot: "Screenshot", query_result: "Query Result", network_capture: "Network Capture",
};

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function InvStatusPill({ status }: { status: InvestigationStatus }) {
  const c = INV_STATUS_COLOR[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: `${c}14`, border: `1px solid ${c}28`, color: c, ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0 }} />
      {status.replace("_", " ")}
    </span>
  );
}

function TimelineEvent({ event }: { event: InvestigationEvent }) {
  const [expanded, setExpanded] = useState(false);
  const colors: Record<InvestigationEvent["type"], string> = {
    alert_linked: "#60a5fa", note: "#94a3b8", evidence_added: "#00ff88",
    status_change: "#a78bfa", query_run: "#ffb000", containment: "#ff6b35",
  };
  const c = colors[event.type];
  return (
    <div style={{ display: "flex", gap: 8, paddingBottom: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${c}14`, border: `1px solid ${c}28`, display: "flex", alignItems: "center", justifyContent: "center", color: c, flexShrink: 0 }}>
          {EVENT_ICON[event.type]}
        </div>
        <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.05)", minHeight: 8 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{event.summary}</span>
          {event.detail && (
            <button
              onClick={() => setExpanded(x => !x)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(100,116,139,0.5)", display: "flex", alignItems: "center", padding: 0 }}
            >
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>{new Date(event.timestamp).toLocaleString()}</span>
          <span style={{ ...mono, fontSize: 9, color: c, opacity: 0.6 }}>{event.actor}</span>
        </div>
        {expanded && event.detail && (
          <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 5, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ ...mono, fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{event.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceRow({ ev }: { ev: Evidence }) {
  const c = "#60a5fa";
  return (
    <div style={{ padding: "10px 12px", borderRadius: 7, background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.12)", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Archive size={11} color={c} />
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{ev.label}</span>
        </div>
        <span style={{ ...mono, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${c}14`, border: `1px solid ${c}20`, color: c }}>{EVIDENCE_TYPE_LABEL[ev.type]}</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {ev.s3_uri && <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>{ev.s3_uri}</span>}
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>{formatBytes(ev.size_bytes)}</span>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>{ev.collected_by}</span>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.35)" }}>{new Date(ev.collected_at).toLocaleString()}</span>
      </div>
      {ev.hash_sha256 && (
        <div style={{ marginTop: 4 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)" }}>SHA-256: {ev.hash_sha256}</span>
        </div>
      )}
    </div>
  );
}

export function InvestigationWorkspace() {
  const [selected, setSelected] = useState<Investigation>(MOCK_INVESTIGATIONS[0]);
  const [search, setSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"timeline" | "evidence" | "alerts">("timeline");

  const investigations = MOCK_INVESTIGATIONS.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.tags.some(t => t.includes(search.toLowerCase()))
  );

  const open = MOCK_INVESTIGATIONS.filter(i => i.status !== "CLOSED").length;
  const breached = MOCK_INVESTIGATIONS.filter(i => new Date(i.sla_deadline) < new Date()).length;

  const linkedAlerts = MOCK_ALERTS.filter(a => selected.linked_alert_ids.includes(a.id));

  return (
    <div>
      <ModuleHeader
        icon={<FileText size={16} color="#60a5fa" />}
        title="Investigation Workspace"
        subtitle="Case management, timeline annotation, evidence tracking, and linked alert triage."
      />

      <StatStrip stats={[
        { label: "Open Cases", value: open, color: "#60a5fa", accent: true },
        { label: "SLA Breach", value: breached, color: breached > 0 ? "#ff6b35" : "#00ff88", accent: breached > 0 },
        { label: "Total Cases", value: MOCK_INVESTIGATIONS.length, color: "#94a3b8" },
        { label: "Evidence Items", value: MOCK_INVESTIGATIONS.reduce((s, i) => s + i.evidence.length, 0), color: "#94a3b8" },
      ]} />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
        {/* Case list */}
        <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)", alignSelf: "start" }}>
          <div style={{ padding: "8px 12px", borderBottom: divider, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Search size={11} color="rgba(100,116,139,0.45)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter cases…"
                style={{ background: "none", border: "none", outline: "none", fontSize: 11, color: "#e2e8f0", flex: 1, ...mono }}
              />
            </div>
          </div>
          {investigations.length === 0 ? (
            <div style={{ padding: 14 }}>
              <span style={{ fontSize: 11, color: "rgba(100,116,139,0.4)" }}>No cases match.</span>
            </div>
          ) : (
            investigations.map(inv => {
              const isSelected = selected?.id === inv.id;
              const c = SEV_COLOR[inv.severity];
              const slaBreached = new Date(inv.sla_deadline) < new Date();
              return (
                <div
                  key={inv.id}
                  className="soc-row"
                  onClick={() => setSelected(inv)}
                  style={{ padding: "8px 12px", borderBottom: divider, cursor: "pointer", background: isSelected ? "rgba(96,165,250,0.05)" : "transparent", borderLeft: `2px solid ${isSelected ? "#60a5fa" : "transparent"}` }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <InvStatusPill status={inv.status} />
                    <span style={{ ...mono, fontSize: 9, padding: "1px 6px", borderRadius: 999, background: `${c}14`, border: `1px solid ${c}20`, color: c }}>{inv.severity}</span>
                    {slaBreached && <span style={{ ...mono, fontSize: 9, color: "#ff6b35" }}>SLA!</span>}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.35)" }}>{new Date(inv.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Case detail */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{selected.title}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <InvStatusPill status={selected.status} />
                    <SeverityPill severity={selected.severity} />
                    {selected.tags.map(t => (
                      <span key={t} style={{ ...mono, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.6)" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {selected.assignee && (
                    <div style={{ ...mono, fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{selected.assignee}</div>
                  )}
                  <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
                    SLA: <span style={{ color: new Date(selected.sla_deadline) < new Date() ? "#ff6b35" : "#94a3b8" }}>
                      {new Date(selected.sla_deadline).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {selected.summary && (
                <p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", margin: 0, lineHeight: 1.6, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {selected.summary}
                </p>
              )}
              {selected.affected_resources.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...ls, fontSize: 9, marginBottom: 5 }}>Affected Resources</div>
                  {selected.affected_resources.map(r => (
                    <div key={r} style={{ ...mono, fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{r}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-nav */}
            <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 8, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
              {([
                ["timeline", "Timeline", selected.timeline.length],
                ["evidence", "Evidence", selected.evidence.length],
                ["alerts", "Linked Alerts", linkedAlerts.length],
              ] as [typeof activePanel, string, number][]).map(([id, label, count]) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  className="soc-btn"
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: activePanel === id ? "rgba(96,165,250,0.12)" : "transparent", color: activePanel === id ? "#60a5fa" : "rgba(100,116,139,0.5)", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", ...mono }}
                >
                  {label}
                  <span style={{ fontSize: 9, opacity: 0.7 }}>({count})</span>
                </button>
              ))}
            </div>

            {/* Timeline */}
            {activePanel === "timeline" && (
              <div style={{ padding: "16px 16px 4px", borderRadius: 10, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {selected.timeline.length === 0 ? (
                  <EmptyState icon={<Clock size={28} />} title="No events yet" subtitle="Timeline events appear as analysts interact with this case." />
                ) : (
                  [...selected.timeline].reverse().map(ev => <TimelineEvent key={ev.id} event={ev} />)
                )}
              </div>
            )}

            {/* Evidence */}
            {activePanel === "evidence" && (
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {selected.evidence.length === 0 ? (
                  <EmptyState icon={<Archive size={28} />} title="No evidence collected" subtitle="Evidence items appear when forensics captures are completed for this investigation." />
                ) : (
                  selected.evidence.map(ev => <EvidenceRow key={ev.id} ev={ev} />)
                )}
              </div>
            )}

            {/* Linked alerts */}
            {activePanel === "alerts" && (
              <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)" }}>
                {linkedAlerts.length === 0 ? (
                  <div style={{ padding: 14 }}>
                    <EmptyState icon={<Link2 size={28} />} title="No linked alerts" subtitle="Alerts can be linked to an investigation from the Alert Queue." />
                  </div>
                ) : (
                  linkedAlerts.map(alert => {
                    const c = SEV_COLOR[alert.severity];
                    return (
                      <div key={alert.id} style={{ padding: "10px 14px", borderBottom: divider, display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <span style={{ ...mono, fontSize: 9, padding: "0 8px", borderRadius: 999, background: `${c}14`, border: `1px solid ${c}28`, color: c, whiteSpace: "nowrap", marginTop: 2 }}>{alert.severity}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{alert.title}</div>
                          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>{alert.source} · {alert.region} · {new Date(alert.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={<FileText size={32} />} title="No case selected" subtitle="Select an investigation from the list to view its timeline, evidence, and linked alerts." />
        )}
      </div>

      <BackendHandoff endpoints={[
        { method: "GET", path: "/api/soc/investigations", description: "List investigations with timeline summary from DynamoDB case store" },
        { method: "GET", path: "/api/soc/investigations/:id", description: "Full case detail with timeline events and evidence records" },
        { method: "POST", path: "/api/soc/investigations/:id/events", description: "Append timeline event (note, containment action, status change)" },
        { method: "POST", path: "/api/soc/investigations/:id/evidence", description: "Attach evidence record (s3_uri, hash, custody metadata)" },
        { method: "PATCH", path: "/api/soc/investigations/:id", description: "Update case status, assignee, or linked alert IDs" },
      ]} />
    </div>
  );
}
