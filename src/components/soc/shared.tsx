// SOC shared micro-components
import { useState, useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Wifi, WifiOff, ChevronDown, ChevronRight, Link } from "lucide-react";
import type { AlertSeverity, AlertStatus, PipelineStatus, CoverageStatus } from "./types";

// ─── Style atoms ──────────────────────────────────────────────────────────────

export const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
export const ls: React.CSSProperties = { ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.55)" };
export const divider = "1px solid rgba(255,255,255,0.06)";

// ─── Color maps ───────────────────────────────────────────────────────────────

export const SEV_COLOR: Record<AlertSeverity, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88",
};
export const STATUS_COLOR: Record<AlertStatus, string> = {
  NEW: "#60a5fa", ACKNOWLEDGED: "#a78bfa", INVESTIGATING: "#ffb000",
  ESCALATED: "#ff6b35", RESOLVED: "#00ff88", SUPPRESSED: "#64748b", FALSE_POSITIVE: "#64748b",
};
export const PIPE_COLOR: Record<PipelineStatus, string> = {
  healthy: "#00ff88", degraded: "#ffb000", error: "#ff0040", offline: "#64748b",
};
export const COV_COLOR: Record<CoverageStatus, string> = {
  healthy: "#00ff88", partial: "#ffb000", degraded: "#ff6b35", uncovered: "#64748b",
};

// ─── MockBadge — marks non-wired surfaces ────────────────────────────────────

export function MockBadge({ label = "MOCK ONLY" }: { label?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "0 8px", borderRadius: 4,
      background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.18)",
      color: "rgba(100,116,139,0.55)", fontSize: 9, fontWeight: 700, ...mono,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
    }}>
      {label}
    </span>
  );
}

// ─── SignalRail — live data freshness pulse ───────────────────────────────────

export function SignalRail({ active = true }: { active?: boolean }) {
  const [pulses, setPulses] = useState<number[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const id = nextId.current++;
      setPulses(prev => [...prev.slice(-6), id]);
      // next pulse at irregular interval (200–1400ms)
      setTimeout(tick, 200 + Math.random() * 1200);
    };
    const t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ height: 2, width: "100%", position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.03)", borderRadius: 1 }}>
      {pulses.map((id) => (
        <span
          key={id}
          style={{
            position: "absolute", top: 0, height: "100%",
            width: 40, borderRadius: 1,
            background: active ? "linear-gradient(90deg, transparent, #00ff88, transparent)" : "transparent",
            animation: "rail-sweep 1.8s ease-out forwards",
          }}
        />
      ))}
    </div>
  );
}

// ─── SeverityPill ─────────────────────────────────────────────────────────────

export function SeverityPill({ severity }: { severity: AlertSeverity }) {
  const c = SEV_COLOR[severity];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      background: `${c}14`, border: `1px solid ${c}30`,
      color: c, fontSize: 10, fontWeight: 700, ...mono, letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      {severity}
    </span>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

export function StatusPill({ status }: { status: AlertStatus }) {
  const c = STATUS_COLOR[status];
  const animated = status === "INVESTIGATING" || status === "ESCALATED";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 999,
      background: `${c}12`, border: `1px solid ${c}28`,
      color: c, fontSize: 10, fontWeight: 700, ...mono, letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0, animation: animated ? "ir-pulse 1.4s infinite" : "none" }} />
      {status.replace("_", " ")}
    </span>
  );
}

// ─── SLA timer ────────────────────────────────────────────────────────────────

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
    <span style={{ ...mono, fontSize: 10, fontWeight: 600, color, whiteSpace: "nowrap" }}>
      {breached && <AlertTriangle size={9} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />}
      {display}
    </span>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "rgba(100,116,139,0.4)" }}>
      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "56px 0", textAlign: "center" }}>
      <div style={{ color: "rgba(100,116,139,0.25)", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(100,116,139,0.55)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(100,116,139,0.35)", maxWidth: 320 }}>{subtitle}</div>
    </div>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={16} color="#ff0040" />
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,0,64,0.8)" }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ ...mono, padding: "5px 14px", borderRadius: 5, background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.2)", color: "#ff4060", fontSize: 11, cursor: "pointer" }}>
          Retry
        </button>
      )}
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
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(100,116,139,0.04)", border: "none", cursor: "pointer" }}
      >
        <Link size={11} color="rgba(100,116,139,0.4)" />
        <span style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.45)", flex: 1, textAlign: "left" }}>
          Backend Integration Requirements ({endpoints.length})
        </span>
        {open ? <ChevronDown size={11} color="rgba(100,116,139,0.3)" /> : <ChevronRight size={11} color="rgba(100,116,139,0.3)" />}
      </button>
      {open && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: ep.method === "GET" ? "#60a5fa" : ep.method === "POST" ? "#00ff88" : "#a78bfa", flexShrink: 0 }}>{ep.method}</span>
              <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.7)", flexShrink: 0 }}>{ep.path}</span>
              <span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{ep.description}</span>
              <MockBadge label="NOT WIRED" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section header card ──────────────────────────────────────────────────────

export function ModuleHeader({
  icon, title, subtitle, live = true, extra,
}: {
  icon: React.ReactNode; title: string; subtitle: string; live?: boolean; extra?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginTop: 2 }}>{subtitle}</div>
        </div>
        {extra}
        {live && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Wifi size={11} color="rgba(0,255,136,0.5)" />
            <span style={{ ...mono, fontSize: 9, color: "rgba(0,255,136,0.5)", letterSpacing: "0.08em" }}>LIVE</span>
            <MockBadge label="SIMULATED" />
          </div>
        )}
      </div>
      <SignalRail active={live} />
    </div>
  );
}

// ─── Stat strip (horizontal KPI row) ─────────────────────────────────────────

export function StatStrip({ stats }: { stats: Array<{ label: string; value: string | number; color?: string; accent?: boolean }> }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: "8px 14px", borderRadius: 8,
          background: s.accent ? `${s.color ?? "#00ff88"}0a` : "rgba(15,23,42,0.8)",
          border: `1px solid ${s.accent ? (s.color ?? "#00ff88") + "28" : "rgba(255,255,255,0.07)"}`,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{s.label}</span>
          <span style={{ ...mono, fontSize: 18, fontWeight: 700, lineHeight: 1, color: s.color ?? "#e2e8f0" }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Global keyframes (injected once) ────────────────────────────────────────

export function SOCGlobalStyles() {
  return (
    <style>{`
      @keyframes ir-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes rail-sweep { 0%{left:-60px;opacity:0} 10%{opacity:1} 90%{opacity:.6} 100%{left:calc(100% + 10px);opacity:0} }
      @keyframes fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      .soc-row:hover { background: rgba(255,255,255,0.025) !important; }
      .soc-btn:hover { opacity:.85; }
    `}</style>
  );
}
