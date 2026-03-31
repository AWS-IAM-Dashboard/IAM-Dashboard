// Infrastructure Security — shared primitives
// Extends soc/shared patterns with new design primitives
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Clock, Lock, ChevronDown, ChevronRight, Link, FileText, Zap, Eye, Terminal, GitBranch, Play, Loader2, WifiOff } from "lucide-react";
import type { PostureStatus, FindingLifecycle, Severity, Confidence, EvidenceItem, TimelineItem, Scenario } from "./types";

// ─── Style atoms (mirrors soc/shared) ─────────────────────────────────────────
export const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
export const divider = "1px solid rgba(255,255,255,0.06)";

// ─── Color maps ───────────────────────────────────────────────────────────────
export const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88",
};
export const LIFECYCLE_COLOR: Record<FindingLifecycle, string> = {
  open: "#60a5fa",
  triaged: "#a78bfa",
  in_progress: "#ffb000",
  remediated: "#00ff88",
  risk_accepted: "#ff6b35",
};
export const LIFECYCLE_LABEL: Record<FindingLifecycle, string> = {
  open: "OPEN",
  triaged: "TRIAGED",
  in_progress: "IN PROGRESS",
  remediated: "REMEDIATED",
  risk_accepted: "RISK ACCEPTED",
};
export const POSTURE_COLOR: Record<PostureStatus, string> = {
  healthy: "#00ff88", degraded: "#ffb000", critical: "#ff0040", unknown: "#64748b", mock: "#a78bfa",
};
export const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH: "#00ff88", MEDIUM: "#ffb000", LOW: "#64748b",
};

// ─── MockBadge ────────────────────────────────────────────────────────────────
export function MockBadge({ label = "SIM ONLY" }: { label?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "0 6px", borderRadius: 4, height: 16,
      background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)",
      color: "rgba(167,139,250,0.6)", fontSize: 8.5, fontWeight: 700, ...mono,
      letterSpacing: "0.08em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
    }}>
      ⚠ {label}
    </span>
  );
}

// ─── SeverityChip ─────────────────────────────────────────────────────────────
export function SeverityChip({ severity }: { severity: Severity }) {
  const c = SEV_COLOR[severity];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "0 8px", height: 18, borderRadius: 999,
      background: `${c}12`, border: `1px solid ${c}2e`,
      color: c, fontSize: 10, fontWeight: 700, ...mono, letterSpacing: "0.04em",
      whiteSpace: "nowrap" as const, flexShrink: 0,
    }}>
      {severity}
    </span>
  );
}

// ─── LifecyclePill ────────────────────────────────────────────────────────────
export function LifecyclePill({ lifecycle, onClick }: { lifecycle: FindingLifecycle; onClick?: () => void }) {
  const c = LIFECYCLE_COLOR[lifecycle];
  const animated = lifecycle === "in_progress";
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 8px", height: 18, borderRadius: 999,
        background: `${c}10`, border: `1px solid ${c}28`,
        color: c, fontSize: 9.5, fontWeight: 700, ...mono, letterSpacing: "0.04em",
        whiteSpace: "nowrap" as const, cursor: onClick ? "pointer" : "default", flexShrink: 0,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0, animation: animated ? "ir-pulse 1.4s infinite" : "none" }} />
      {LIFECYCLE_LABEL[lifecycle]}
    </span>
  );
}

// ─── PostureDot ───────────────────────────────────────────────────────────────
export function PostureDot({ status, size = 7 }: { status: PostureStatus; size?: number }) {
  const c = POSTURE_COLOR[status];
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: c, flexShrink: 0, boxShadow: `0 0 ${size}px ${c}60`,
    }} />
  );
}

// ─── PostureChip ──────────────────────────────────────────────────────────────
export function PostureChip({ status }: { status: PostureStatus }) {
  const c = POSTURE_COLOR[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "0 8px", height: 18, borderRadius: 999,
      background: `${c}0c`, border: `1px solid ${c}28`,
      color: c, fontSize: 9.5, fontWeight: 700, ...mono, letterSpacing: "0.05em",
      textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
    }}>
      <PostureDot status={status} size={5} />
      {status}
    </span>
  );
}

// ─── ConfidenceScore ─────────────────────────────────────────────────────────
export function ConfidenceScore({ confidence }: { confidence: Confidence }) {
  const c = CONFIDENCE_COLOR[confidence];
  const bars = confidence === "HIGH" ? 3 : confidence === "MEDIUM" ? 2 : 1;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
        {[1, 2, 3].map(b => (
          <span key={b} style={{
            display: "block", width: 3, borderRadius: 1,
            height: b === 1 ? 6 : b === 2 ? 9 : 12,
            background: b <= bars ? c : "rgba(255,255,255,0.08)",
          }} />
        ))}
      </span>
      <span style={{ ...mono, fontSize: 9, color: c, fontWeight: 600, letterSpacing: "0.05em" }}>
        {confidence}
      </span>
    </span>
  );
}

// ─── SLATimer ─────────────────────────────────────────────────────────────────
export function SLATimer({ deadline, breached }: { deadline: string; breached: boolean }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      const abs = Math.abs(diff);
      const h = Math.floor(abs / 3_600_000);
      const m = Math.floor((abs % 3_600_000) / 60_000);
      setDisplay(diff < 0 ? `-${h}h ${m}m` : `${h}h ${m}m`);
    };
    calc();
    const t = setInterval(calc, 30_000);
    return () => clearInterval(t);
  }, [deadline]);
  const color = breached ? "#ff0040" : display.startsWith("0h") ? "#ffb000" : "rgba(100,116,139,0.7)";
  return (
    <span style={{ ...mono, fontSize: 10, fontWeight: 600, color, whiteSpace: "nowrap" as const, display: "inline-flex", alignItems: "center", gap: 3 }}>
      {breached && <AlertTriangle size={9} />}
      {display}
    </span>
  );
}

// ─── ApprovalGate ─────────────────────────────────────────────────────────────
export function ApprovalGate({
  action, approvers, onApprove, onReject,
}: {
  action: string;
  approvers: string[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  if (status === "approved") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)" }}>
        <CheckCircle2 size={13} color="#00ff88" />
        <span style={{ ...mono, fontSize: 11, color: "#00ff88" }}>Approved — action queued (simulation only)</span>
        <MockBadge />
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(255,0,64,0.06)", border: "1px solid rgba(255,0,64,0.2)" }}>
        <AlertTriangle size={13} color="#ff0040" />
        <span style={{ ...mono, fontSize: 11, color: "#ff0040" }}>Action rejected</span>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 8, border: "1px solid rgba(255,176,0,0.2)", background: "rgba(255,176,0,0.04)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,176,0,0.12)" }}>
        <Lock size={11} color="#ffb000" />
        <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: "rgba(255,176,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          Approval Required — Simulation Only
        </span>
        <MockBadge label="NOT WIRED" />
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.8)", marginBottom: 8 }}>{action}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Requires:</span>
          {approvers.map(a => (
            <span key={a} style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.6)" }}>{a}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setStatus("approved"); onApprove(); }}
            style={{ ...mono, padding: "4px 12px", borderRadius: 4, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Approve
          </button>
          <button
            onClick={() => { setStatus("rejected"); onReject(); }}
            style={{ ...mono, padding: "4px 12px", borderRadius: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.6)", fontSize: 11, cursor: "pointer" }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TimelinePanel ────────────────────────────────────────────────────────────
export function TimelinePanel({ events }: { events: TimelineItem[] }) {
  const actorColor = (type: TimelineItem["actor_type"]) =>
    type === "system" ? "#64748b" : type === "automation" ? "#38bdf8" : "#00ff88";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {events.map((ev, i) => (
        <div key={ev.id} style={{ display: "flex", gap: 10, position: "relative" }}>
          {/* Vertical line */}
          {i < events.length - 1 && (
            <span style={{ position: "absolute", left: 5, top: 16, bottom: 0, width: 1, background: "rgba(255,255,255,0.06)" }} />
          )}
          {/* Dot */}
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: actorColor(ev.actor_type), flexShrink: 0, marginTop: 3, border: "2px solid rgba(0,0,0,0.5)" }} />
          <div style={{ paddingBottom: 12, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: actorColor(ev.actor_type) }}>{ev.actor}</span>
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>{ev.action}</span>
              <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginLeft: "auto" }}>
                {new Date(ev.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {ev.note && (
              <div style={{ marginTop: 3, fontSize: 11, color: "rgba(100,116,139,0.6)", fontStyle: "italic" as const }}>{ev.note}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── EvidenceCard ─────────────────────────────────────────────────────────────
const EVIDENCE_ICON: Record<EvidenceItem["type"], React.ReactNode> = {
  log_snippet: <Terminal size={11} />,
  api_response: <Zap size={11} />,
  config_diff: <GitBranch size={11} />,
  network_capture: <Eye size={11} />,
  screenshot: <FileText size={11} />,
};

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <button
        onClick={() => setExpanded(x => !x)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "none", cursor: "pointer", textAlign: "left" as const }}
      >
        <span style={{ color: "rgba(100,116,139,0.5)", display: "flex" }}>{EVIDENCE_ICON[item.type]}</span>
        <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)", flex: 1 }}>{item.label}</span>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
          {new Date(item.collected_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        {expanded ? <ChevronDown size={11} color="rgba(100,116,139,0.4)" /> : <ChevronRight size={11} color="rgba(100,116,139,0.4)" />}
      </button>
      {expanded && (
        <pre style={{ margin: 0, padding: "8px 10px", fontSize: 10, ...mono, color: "rgba(148,163,184,0.65)", background: "rgba(0,0,0,0.3)", overflowX: "auto" as const, whiteSpace: "pre-wrap" as const, wordBreak: "break-all" as const }}>
          {item.content}
        </pre>
      )}
    </div>
  );
}

// ─── DependencyMap ────────────────────────────────────────────────────────────
export function DependencyMap({ deps }: { deps: string[] }) {
  if (!deps.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
        Integration Dependencies to Wire
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
        {deps.map((d, i) => (
          <span key={i} style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 4, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)", color: "rgba(56,189,248,0.6)" }}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── BackendHandoff ───────────────────────────────────────────────────────────
export function BackendHandoff({ endpoints }: { endpoints: Array<{ method: string; path: string; description: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, borderRadius: 8, border: "1px dashed rgba(100,116,139,0.2)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(x => !x)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(100,116,139,0.04)", border: "none", cursor: "pointer", textAlign: "left" as const }}
      >
        <Link size={11} color="rgba(100,116,139,0.4)" />
        <span style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.45)", flex: 1 }}>
          Backend Integration Requirements ({endpoints.length})
        </span>
        <MockBadge label="NOT WIRED" />
        {open ? <ChevronDown size={11} color="rgba(100,116,139,0.3)" /> : <ChevronRight size={11} color="rgba(100,116,139,0.3)" />}
      </button>
      {open && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" as const }}>
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: ep.method === "GET" ? "#60a5fa" : ep.method === "POST" ? "#00ff88" : "#a78bfa", flexShrink: 0 }}>{ep.method}</span>
              <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)", flexShrink: 0 }}>{ep.path}</span>
              <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{ep.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ModuleHeader ──────────────────────────────────────────────────────────────
export function ModuleHeader({
  icon, title, subtitle, accent = "#00ff88", extra,
}: {
  icon: React.ReactNode; title: string; subtitle: string; accent?: string; extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accent}0d`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginTop: 2 }}>{subtitle}</div>
      </div>
      {extra}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <WifiOff size={10} color="rgba(167,139,250,0.4)" />
        <span style={{ ...mono, fontSize: 9, color: "rgba(167,139,250,0.5)", letterSpacing: "0.06em" }}>FRONTEND ONLY</span>
        <MockBadge label="SIMULATED" />
      </div>
    </div>
  );
}

// ─── StatStrip ────────────────────────────────────────────────────────────────
export function StatStrip({ stats }: { stats: Array<{ label: string; value: string | number; color?: string; accent?: boolean }> }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: "8px 14px", borderRadius: 8,
          background: s.accent ? `${s.color ?? "#00ff88"}08` : "rgba(15,23,42,0.8)",
          border: `1px solid ${s.accent ? (s.color ?? "#00ff88") + "22" : "rgba(255,255,255,0.07)"}`,
          display: "flex", flexDirection: "column" as const, gap: 2, flexShrink: 0,
        }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{s.label}</span>
          <span style={{ ...mono, fontSize: 18, fontWeight: 700, lineHeight: 1, color: s.color ?? "#e2e8f0" }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10, padding: "56px 0", textAlign: "center" as const }}>
      <div style={{ color: "rgba(100,116,139,0.2)", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(100,116,139,0.5)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(100,116,139,0.35)", maxWidth: 320 }}>{subtitle}</div>
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "48px 0", justifyContent: "center", color: "rgba(100,116,139,0.4)" }}>
      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

// ─── ScenarioSimulator ────────────────────────────────────────────────────────
export function ScenarioSimulator({ scenario }: { scenario: Scenario }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);

  const run = useCallback(() => {
    setRunning(true);
    setStep(0);
    let s = 0;
    const next = () => {
      s++;
      if (s < scenario.simulation_steps.length) {
        setStep(s);
        setTimeout(next, 900);
      } else {
        setRunning(false);
        setStep(scenario.simulation_steps.length);
      }
    };
    setTimeout(next, 900);
  }, [scenario]);

  const done = step >= scenario.simulation_steps.length && !running;

  const sc = SEV_COLOR[scenario.severity];

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${sc}20`, background: `${sc}04`, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${sc}14`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${sc}10`, border: `1px solid ${sc}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Play size={11} color={sc} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{scenario.name}</div>
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.55)", marginTop: 1 }}>{scenario.description}</div>
        </div>
        <MockBadge label="SCENARIO" />
        <SeverityChip severity={scenario.severity} />
      </div>

      {/* Sim steps */}
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 4, marginBottom: 10 }}>
          {scenario.simulation_steps.map((s, i) => {
            const active = step === i && running;
            const done_ = step > i || (done && step >= i);
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  background: done_ ? "rgba(0,255,136,0.1)" : active ? `${sc}14` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${done_ ? "rgba(0,255,136,0.25)" : active ? sc + "35" : "rgba(255,255,255,0.08)"}`,
                }}>
                  {done_ ? <CheckCircle2 size={9} color="#00ff88" /> : active ? <Loader2 size={9} color={sc} style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />}
                </span>
                <span style={{ fontSize: 11, color: done_ ? "rgba(148,163,184,0.7)" : active ? "#e2e8f0" : "rgba(100,116,139,0.45)", lineHeight: 1.4 }}>{s}</span>
              </div>
            );
          })}
        </div>

        {done && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Expected Findings Generated</div>
            {scenario.expected_findings.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: f.startsWith("CRITICAL") ? "#ff0040" : f.startsWith("HIGH") ? "#ff6b35" : "#ffb000", flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 11, color: "rgba(148,163,184,0.65)" }}>{f}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={run}
          disabled={running}
          style={{ ...mono, padding: "6px 14px", borderRadius: 5, background: running ? "rgba(255,255,255,0.03)" : `${sc}10`, border: `1px solid ${running ? "rgba(255,255,255,0.08)" : sc + "28"}`, color: running ? "rgba(100,116,139,0.4)" : sc, fontSize: 11, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          {running ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Running…</> : <><Play size={10} /> {done ? "Re-run Scenario" : "Run Scenario"}</>}
        </button>
      </div>
    </div>
  );
}

// ─── RemediationSteps ─────────────────────────────────────────────────────────
export function RemediationSteps({ steps, onComplete }: { steps: string[]; onComplete?: () => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setChecked(prev => {
    const s = new Set(prev);
    s.has(i) ? s.delete(i) : s.add(i);
    return s;
  });
  const allDone = checked.size === steps.length;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 10 }}>
        {steps.map((step, i) => (
          <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={() => toggle(i)}
              style={{ accentColor: "#00ff88", marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, color: checked.has(i) ? "rgba(100,116,139,0.45)" : "rgba(148,163,184,0.75)", textDecoration: checked.has(i) ? "line-through" : "none", lineHeight: 1.5 }}>{step}</span>
          </label>
        ))}
      </div>
      {allDone && onComplete && (
        <ApprovalGate
          action="Mark finding as REMEDIATED and close the remediation workflow"
          approvers={["security-lead", "infra-owner"]}
          onApprove={onComplete}
          onReject={() => {}}
        />
      )}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
export function FilterBar({ value, onChange, placeholder = "Filter…", extra }: { value: string; onChange: (v: string) => void; placeholder?: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 12 }}>
      <Clock size={12} color="rgba(100,116,139,0.4)" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, background: "none", border: "none", outline: "none", ...mono, fontSize: 11, color: "#e2e8f0" }}
      />
      {extra}
    </div>
  );
}

// ─── useLocalStorage ──────────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((val: T) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
    setStored(val);
  }, [key]);
  return [stored, set];
}

// ─── Global keyframes ──────────────────────────────────────────────────────────
export function InfraGlobalStyles() {
  return (
    <style>{`
      @keyframes ir-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.7)} }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      .infra-row { transition: background 0.1s; }
      .infra-row:hover { background: rgba(255,255,255,0.022) !important; }
      .infra-btn:hover { opacity: .82; }
    `}</style>
  );
}
