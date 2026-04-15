// Network Security — Security Groups, NACLs, VPC Flow Logs
import { useState, useMemo, useEffect } from "react";
import { Network, ChevronDown, ChevronRight } from "lucide-react";
import type { SecurityGroupFinding, NACLIssue, VPCFlowLogEntry } from "./types";
import {
  mono, divider,
  SeverityChip, LifecyclePill, PostureChip,
  SLATimer, StatStrip, ModuleHeader, BackendHandoff,
  RemediationSteps, ScenarioSimulator, useLocalStorage,
} from "./shared";
import {
  MOCK_SG_FINDINGS, MOCK_NACL_ISSUES, MOCK_VPC_FLOW_LOGS, INFRA_SCENARIOS,
} from "./mockData";

const NET_ENDPOINTS = [
  { method: "GET", path: "GET /security-groups", description: "Describe all security groups and their rules" },
  { method: "GET", path: "GET /network-acls", description: "Describe all NACLs across all VPCs" },
  { method: "GET", path: "GET /flow-logs", description: "Describe VPC flow log configurations" },
  { method: "POST", path: "POST /security-groups/{id}/revoke-ingress", description: "Revoke over-permissive inbound rules (simulation)" },
  { method: "POST", path: "POST /flow-logs", description: "Enable flow logging on a VPC (simulation)" },
];

const DIRECTIONS = ["ALL", "INBOUND", "OUTBOUND"] as const;
const LIFECYCLES = ["ALL", "open", "triaged", "in_progress", "remediated", "risk_accepted"] as const;

// ─── SG Finding row ───────────────────────────────────────────────────────────
function SGFindingRow({
  f,
  isMobile,
  onLifecycleChange,
}: {
  f: SecurityGroupFinding;
  isMobile: boolean;
  onLifecycleChange: (id: string, lc: typeof f.lifecycle) => void;
}) {
  const [open, setOpen] = useState(false);
  const sc = f.severity === "CRITICAL" ? "#ff0040" : f.severity === "HIGH" ? "#ff6b35" : f.severity === "MEDIUM" ? "#ffb000" : "#00ff88";
  return (
    <>
      {isMobile ? (
        <>
          <button
            type="button"
            className="infra-row"
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: "10px 12px",
              borderBottom: divider,
              cursor: "pointer",
              borderLeft: `2px solid ${open ? sc : "transparent"}`,
              transition: "border-color 0.15s",
            }}
            onClick={() => setOpen(o => !o)}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <SeverityChip severity={f.severity} />
                  <span style={{ ...mono, fontSize: 10, color: f.direction === "INBOUND" ? "#ff6b35" : "rgba(100,116,139,0.5)" }}>{f.direction}</span>
                </div>
                <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{f.sg_id}</div>
                <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 2, overflowWrap: "anywhere" }}>{f.sg_name}</div>
              </div>
              <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
            </div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)" }}>
                {f.protocol} {f.port_range}
              </span>
              <span style={{ ...mono, fontSize: 10, color: f.source_cidr === "0.0.0.0/0" ? "#ff0040" : "rgba(148,163,184,0.65)", overflowWrap: "anywhere" }}>{f.source_cidr}</span>
              <LifecyclePill lifecycle={f.lifecycle} />
              {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
              <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)" }}>{f.attached_resources} rsrc</span>
            </div>
          </button>
          {open && (
            <div style={{ padding: "12px 16px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5, marginBottom: 10 }}>{f.description}</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation Checklist</div>
                <RemediationSteps steps={f.remediation_steps} onComplete={() => onLifecycleChange(f.id, "remediated")} />
              </div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", letterSpacing: "0.06em", overflowWrap: "anywhere" }}>VPC: {f.vpc_id} · Rule created: {new Date(f.created_at).toLocaleDateString()}</div>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="infra-row"
            style={{ display: "grid", gridTemplateColumns: "24px 120px 90px 80px 90px 1fr 90px 80px", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}
            onClick={() => setOpen(o => !o)}
          >
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
            <SeverityChip severity={f.severity} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.sg_id}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.sg_name}</div>
            </div>
            <span style={{ ...mono, fontSize: 10, color: f.direction === "INBOUND" ? "#ff6b35" : "rgba(100,116,139,0.5)" }}>{f.direction}</span>
            <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)" }}>{f.protocol} {f.port_range}</span>
            <span style={{ ...mono, fontSize: 10, color: f.source_cidr === "0.0.0.0/0" ? "#ff0040" : "rgba(148,163,184,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.source_cidr}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 }}>
              <LifecyclePill lifecycle={f.lifecycle} />
              {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
            </div>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", textAlign: "right" as const }}>{f.attached_resources} rsrc</span>
          </div>
          {open && (
            <div style={{ padding: "12px 16px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5, marginBottom: 10 }}>{f.description}</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation Checklist</div>
                <RemediationSteps steps={f.remediation_steps} onComplete={() => onLifecycleChange(f.id, "remediated")} />
              </div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", letterSpacing: "0.06em" }}>VPC: {f.vpc_id} · Rule created: {new Date(f.created_at).toLocaleDateString()}</div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── NACL row ──────────────────────────────────────────────────────────────────
function NACLRow({ issue, isMobile }: { issue: NACLIssue; isMobile: boolean }) {
  const sc = issue.severity === "CRITICAL" ? "#ff0040" : issue.severity === "HIGH" ? "#ff6b35" : "#ffb000";
  if (isMobile) {
    return (
      <div className="infra-row" style={{ padding: "10px 12px", borderBottom: divider }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <SeverityChip severity={issue.severity} />
          <span style={{ ...mono, fontSize: 10, color: issue.direction === "INBOUND" ? "#ff6b35" : "rgba(100,116,139,0.5)" }}>{issue.direction}</span>
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: issue.action === "ALLOW" ? sc : "#64748b" }}>{issue.action}</span>
          <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)" }}>Rule {issue.rule_number}</span>
        </div>
        <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginBottom: 4, overflowWrap: "anywhere" }}>{issue.nacl_id}</div>
        <div style={{ ...mono, fontSize: 10, color: issue.cidr === "0.0.0.0/0" ? "#ff0040" : "rgba(148,163,184,0.65)", marginBottom: 6, overflowWrap: "anywhere" }}>{issue.cidr}</div>
        <div style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", lineHeight: 1.45, overflowWrap: "anywhere" }}>{issue.description}</div>
      </div>
    );
  }
  return (
    <div className="infra-row" style={{ display: "grid", gridTemplateColumns: "100px 120px 80px 80px 80px 100px 1fr", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider }}>
      <SeverityChip severity={issue.severity} />
      <span style={{ ...mono, fontSize: 10, color: "#e2e8f0" }}>{issue.nacl_id}</span>
      <span style={{ ...mono, fontSize: 10, color: issue.direction === "INBOUND" ? "#ff6b35" : "rgba(100,116,139,0.5)" }}>{issue.direction}</span>
      <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: issue.action === "ALLOW" ? sc : "#64748b" }}>{issue.action}</span>
      <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)" }}>Rule {issue.rule_number}</span>
      <span style={{ ...mono, fontSize: 10, color: issue.cidr === "0.0.0.0/0" ? "#ff0040" : "rgba(148,163,184,0.65)" }}>{issue.cidr}</span>
      <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{issue.description}</span>
    </div>
  );
}

// ─── VPC flow log row ──────────────────────────────────────────────────────────
function FlowLogRow({ entry, isMobile }: { entry: VPCFlowLogEntry; isMobile: boolean }) {
  const c = entry.coverage === "healthy" ? "#00ff88" : entry.coverage === "degraded" ? "#ffb000" : "#ff0040";
  if (isMobile) {
    return (
      <div className="infra-row" style={{ padding: "10px 12px", borderBottom: divider }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere" }}>{entry.vpc_id}</div>
            <div style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", marginTop: 2 }}>{entry.vpc_name}</div>
          </div>
          <PostureChip status={entry.coverage} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, color: entry.flow_logs_enabled ? "#00ff88" : "#ff0040", fontWeight: 700 }}>
            {entry.flow_logs_enabled ? "ENABLED" : "DISABLED"}
          </span>
          <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>{entry.destination_type ?? "—"}</span>
          <span style={{ ...mono, fontSize: 10, color: entry.retention_days ? (entry.retention_days >= 90 ? "#00ff88" : "#ffb000") : "rgba(100,116,139,0.4)" }}>
            {entry.retention_days ? `${entry.retention_days}d` : "—"}
          </span>
        </div>
        <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)", marginTop: 8, overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{entry.destination ?? "No destination configured"}</div>
      </div>
    );
  }
  return (
    <div className="infra-row" style={{ display: "grid", gridTemplateColumns: "120px 140px 80px 1fr 80px 90px", alignItems: "center", gap: 12, padding: "9px 14px", borderBottom: divider }}>
      <div>
        <div style={{ ...mono, fontSize: 10, fontWeight: 600, color: "#e2e8f0" }}>{entry.vpc_id}</div>
        <div style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", marginTop: 1 }}>{entry.vpc_name}</div>
      </div>
      <span style={{ ...mono, fontSize: 10, color: entry.flow_logs_enabled ? "#00ff88" : "#ff0040", fontWeight: 700 }}>
        {entry.flow_logs_enabled ? "ENABLED" : "DISABLED"}
      </span>
      <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>{entry.destination_type ?? "—"}</span>
      <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.destination ?? "No destination configured"}</span>
      <span style={{ ...mono, fontSize: 10, color: entry.retention_days ? (entry.retention_days >= 90 ? "#00ff88" : "#ffb000") : "rgba(100,116,139,0.4)" }}>
        {entry.retention_days ? `${entry.retention_days}d` : "—"}
      </span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><PostureChip status={entry.coverage} /></div>
    </div>
  );
}

function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: right ? "right" as const : "left" as const }}>
      {children}
    </span>
  );
}

// ─── NetworkSecurity ───────────────────────────────────────────────────────────
export function NetworkSecurity() {
  const [section, setSection] = useState<"sg" | "nacl" | "flowlogs" | "scenarios">("sg");
  const [lifecycles, setLifecycles] = useLocalStorage<Record<string, typeof MOCK_SG_FINDINGS[0]["lifecycle"]>>("infra-net-lifecycles", {});
  const [dirFilter, setDirFilter] = useState<typeof DIRECTIONS[number]>("ALL");
  const [lcFilter, setLcFilter] = useState<typeof LIFECYCLES[number]>("ALL");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const findings = useMemo(() =>
    MOCK_SG_FINDINGS.map(f => ({ ...f, lifecycle: lifecycles[f.id] ?? f.lifecycle })),
    [lifecycles]
  );

  const displayed = useMemo(() =>
    findings.filter(f =>
      (dirFilter === "ALL" || f.direction === dirFilter) &&
      (lcFilter === "ALL" || f.lifecycle === lcFilter)
    ),
    [findings, dirFilter, lcFilter]
  );

  const openCount = findings.filter(f => f.lifecycle === "open" || f.lifecycle === "triaged").length;
  const criticalCount = findings.filter(f => f.severity === "CRITICAL").length;
  const slaBreached = findings.filter(f => f.sla_breached).length;
  const flowDisabled = MOCK_VPC_FLOW_LOGS.filter(v => !v.flow_logs_enabled).length;

  const SECTIONS = [
    { id: "sg" as const, label: "Security Groups", shortLabel: "SG", accent: "#ff6b35", count: openCount },
    { id: "nacl" as const, label: "NACLs", shortLabel: "NACLs", accent: "#a78bfa", count: MOCK_NACL_ISSUES.length },
    { id: "flowlogs" as const, label: "Flow Logs", shortLabel: "Flows", accent: "#38bdf8", count: flowDisabled },
    { id: "scenarios" as const, label: "Scenarios", shortLabel: "Scenarios", accent: "#ffb000" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader
        icon={<Network size={16} color="#38bdf8" />}
        title="Network Security"
        subtitle="Security groups, NACLs, VPC flow log coverage across all VPCs"
        accent="#38bdf8"
      />

      <StatStrip stats={[
        { label: "Open Findings", value: openCount, color: openCount > 0 ? "#ff6b35" : "#00ff88", accent: openCount > 0 },
        { label: "Critical", value: criticalCount, color: criticalCount > 0 ? "#ff0040" : "#00ff88", accent: criticalCount > 0 },
        { label: "SLA Breached", value: slaBreached, color: slaBreached > 0 ? "#ff0040" : "#00ff88", accent: slaBreached > 0 },
        { label: "Flow Logs Off", value: flowDisabled, color: flowDisabled > 0 ? "#ffb000" : "#00ff88", accent: flowDisabled > 0 },
        { label: "VPCs Monitored", value: MOCK_VPC_FLOW_LOGS.filter(v => v.flow_logs_enabled).length },
        { label: "NACL Issues", value: MOCK_NACL_ISSUES.length },
      ]} />

      {/* Sub-nav */}
      <div
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch"
        style={{ marginBottom: 12, flexShrink: 0 }}
      >
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="infra-btn" onClick={() => setSection(s.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: 11, fontWeight: active ? 700 : 500, transition: "all 0.12s", minWidth: 0 }}
            >
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 9, fontWeight: 800, padding: "0 4px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* SG findings */}
      {section === "sg" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2" style={{ marginBottom: 10 }}>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", alignSelf: "center", marginRight: 2 }}>DIR</span>
              {DIRECTIONS.map(d => (
                <button key={d} className="infra-btn" onClick={() => setDirFilter(d)}
                  style={{ ...mono, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: dirFilter === d ? "rgba(255,255,255,0.07)" : "transparent", border: `1px solid ${dirFilter === d ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`, color: dirFilter === d ? "#e2e8f0" : "rgba(100,116,139,0.4)" }}
                >{d}</button>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", alignSelf: "center", marginRight: 2 }}>STATUS</span>
              {LIFECYCLES.map(l => (
                <button key={l} className="infra-btn" onClick={() => setLcFilter(l)}
                  style={{ ...mono, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: lcFilter === l ? "rgba(255,255,255,0.07)" : "transparent", border: `1px solid ${lcFilter === l ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`, color: lcFilter === l ? "#e2e8f0" : "rgba(100,116,139,0.4)" }}
                >{l === "ALL" ? "ALL" : l.replace("_", " ").toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: "24px 120px 90px 80px 90px 1fr 90px 80px", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
            >
              <span /><TH>Severity</TH><TH>SG ID</TH><TH>Dir</TH><TH>Port</TH><TH>Source CIDR</TH><TH>Status</TH><TH right>Attached</TH>
            </div>
            {displayed.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center" as const, color: "rgba(100,116,139,0.4)", fontSize: 12 }}>No findings match current filters</div>
            ) : (
              displayed.map(f => (
                <SGFindingRow key={f.id} f={f} isMobile={isMobile} onLifecycleChange={(id, lc) => setLifecycles({ ...lifecycles, [id]: lc })} />
              ))
            )}
          </div>
        </>
      )}

      {/* NACL */}
      {section === "nacl" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "100px 120px 80px 80px 80px 100px 1fr", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <TH>Severity</TH><TH>NACL ID</TH><TH>Dir</TH><TH>Action</TH><TH>Rule #</TH><TH>CIDR</TH><TH>Description</TH>
          </div>
          {MOCK_NACL_ISSUES.map(i => <NACLRow key={i.id} issue={i} isMobile={isMobile} />)}
        </div>
      )}

      {/* Flow logs */}
      {section === "flowlogs" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "120px 140px 80px 1fr 80px 90px", gap: 12, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <TH>VPC</TH><TH>Status</TH><TH>Dest Type</TH><TH>Destination</TH><TH>Retention</TH><TH right>Coverage</TH>
          </div>
          {MOCK_VPC_FLOW_LOGS.map(v => <FlowLogRow key={v.vpc_id} entry={v} isMobile={isMobile} />)}
        </div>
      )}

      {/* Scenarios */}
      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {INFRA_SCENARIOS.filter(s => s.id === "misconfigured_sg" || s.id === "missing_logs").map(s => (
            <ScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={NET_ENDPOINTS} />
    </div>
  );
}
