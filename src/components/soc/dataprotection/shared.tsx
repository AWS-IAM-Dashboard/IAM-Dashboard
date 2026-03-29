// Data Protection — shared primitives (extends infra/shared patterns)
import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight,
  Lock, Play, Loader2, Shield, Key, FileText, Link,
} from "lucide-react";
import type {
  ComplianceStatus, AuditTrailEvent, PolicyLine, DPScenario,
} from "./types";

// ─── Style atoms ──────────────────────────────────────────────────────────────
export const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
export const divider = "1px solid rgba(255,255,255,0.06)";

// ─── Compliance colors ────────────────────────────────────────────────────────
export const COMPLIANCE_COLOR: Record<ComplianceStatus, string> = {
  compliant: "#00ff88",
  non_compliant: "#ff0040",
  partial: "#ffb000",
  not_applicable: "#64748b",
  unknown: "#60a5fa",
};

export const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  compliant: "COMPLIANT",
  non_compliant: "NON-COMPLIANT",
  partial: "PARTIAL",
  not_applicable: "N/A",
  unknown: "UNKNOWN",
};

// ─── ComplianceChip ──────────────────────────────────────────────────────────
export function ComplianceChip({ status, small = false }: { status: ComplianceStatus; small?: boolean }) {
  const c = COMPLIANCE_COLOR[status];
  const dot = status === "compliant" ? <CheckCircle2 size={small ? 8 : 9} /> : status === "non_compliant" ? <AlertTriangle size={small ? 8 : 9} /> : <Clock size={small ? 8 : 9} />;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "0 6px" : "0 8px",
      height: small ? 16 : 18, borderRadius: 999,
      background: `${c}0e`, border: `1px solid ${c}28`,
      color: c, fontSize: small ? 8.5 : 9.5, fontWeight: 700, ...mono, letterSpacing: "0.04em",
      whiteSpace: "nowrap" as const, flexShrink: 0,
    }}>
      {dot}
      {COMPLIANCE_LABEL[status]}
    </span>
  );
}

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

// ─── ExpiryTimeline ───────────────────────────────────────────────────────────
export function ExpiryTimeline({
  issuedAt, expiresAt, daysRemaining, label,
}: {
  issuedAt: string;
  expiresAt: string;
  daysRemaining: number;
  label?: string;
}) {
  const issued = new Date(issuedAt).getTime();
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const total = expires - issued;
  const elapsed = Math.min(Math.max(now - issued, 0), total);
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 100;

  const color = daysRemaining < 0 ? "#ff0040" : daysRemaining <= 30 ? "#ff6b35" : daysRemaining <= 90 ? "#ffb000" : "#00ff88";
  const statusLabel = daysRemaining < 0 ? `EXPIRED ${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d remaining`;

  return (
    <div style={{ minWidth: 160 }}>
      {label && <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>{label}</div>}
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, rgba(0,255,136,0.6), ${color})`,
          borderRadius: 3, transition: "width 0.4s ease",
        }} />
        {/* "now" marker */}
        <div style={{ position: "absolute", left: `${pct}%`, top: -1, bottom: -1, width: 2, background: color, borderRadius: 1, transform: "translateX(-50%)", boxShadow: `0 0 4px ${color}` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)" }}>
          {new Date(issuedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
        </span>
        <span style={{ ...mono, fontSize: 8.5, fontWeight: 700, color }}>
          {statusLabel}
        </span>
        <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)" }}>
          {new Date(expiresAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── DriftIndicator ───────────────────────────────────────────────────────────
export function DriftIndicator({ required, actual, label = "days" }: { required: number; actual: number | null; label?: string }) {
  const drift = actual !== null ? actual - required : null;
  const color = drift === null ? "#64748b" : drift < 0 ? "#ff0040" : drift > required * 0.5 ? "#ffb000" : "#00ff88";
  const arrow = drift === null ? "—" : drift < 0 ? "↓" : drift > 0 ? "↑" : "=";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div>
        <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Required</span>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginLeft: 6 }}>{required}d</span>
      </div>
      <span style={{ ...mono, fontSize: 13, fontWeight: 700, color }}>→</span>
      <div>
        <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Actual</span>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: actual === null ? "#64748b" : "#e2e8f0", marginLeft: 6 }}>{actual !== null ? `${actual}d` : "None"}</span>
      </div>
      {drift !== null && (
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${color}0c`, border: `1px solid ${color}28` }}>
          {arrow} {Math.abs(drift)}d {drift < 0 ? "short" : "over"}
        </span>
      )}
    </div>
  );
}

// ─── KeyUsageGraph ────────────────────────────────────────────────────────────
export function KeyUsageGraph({ data, color = "#00ff88", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height }}>
      {data.map((v, i) => {
        const barH = Math.max(Math.round((v / max) * height), 2);
        const isToday = i === data.length - 1;
        return (
          <div key={i} title={`${days[i] ?? i}: ${v.toLocaleString()} calls`} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
            <div style={{
              width: 8, height: barH, borderRadius: "2px 2px 0 0",
              background: isToday ? color : `${color}50`,
              transition: "height 0.3s ease",
            }} />
            <span style={{ ...mono, fontSize: 7, color: "rgba(100,116,139,0.3)" }}>{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── PolicyDiff ───────────────────────────────────────────────────────────────
export function PolicyDiff({ lines, title, description }: { lines: PolicyLine[]; title: string; description: string }) {
  const [open, setOpen] = useState(false);
  const addedCount = lines.filter(l => l.type === "added").length;
  const removedCount = lines.filter(l => l.type === "removed").length;
  return (
    <div style={{ borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(x => !x)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "none", cursor: "pointer", textAlign: "left" as const }}
      >
        <FileText size={11} color="rgba(100,116,139,0.5)" />
        <span style={{ ...mono, fontSize: 10, color: "#e2e8f0", flex: 1 }}>{title}</span>
        <span style={{ ...mono, fontSize: 9, color: "#00ff88" }}>+{addedCount}</span>
        <span style={{ ...mono, fontSize: 9, color: "#ff0040", marginLeft: 4 }}>-{removedCount}</span>
        <MockBadge label="DRAFT" />
        {open ? <ChevronDown size={11} color="rgba(100,116,139,0.4)" /> : <ChevronRight size={11} color="rgba(100,116,139,0.4)" />}
      </button>
      {open && (
        <>
          <div style={{ padding: "6px 12px 8px", borderBottom: divider, fontSize: 10, color: "rgba(100,116,139,0.6)" }}>{description}</div>
          <div style={{ background: "rgba(0,0,0,0.4)", maxHeight: 280, overflowY: "auto" as const }}>
            {lines.map((line, i) => {
              const bg = line.type === "added" ? "rgba(0,255,136,0.06)" : line.type === "removed" ? "rgba(255,0,64,0.07)" : "transparent";
              const color = line.type === "added" ? "#00ff88" : line.type === "removed" ? "#ff0040" : "rgba(148,163,184,0.55)";
              const prefix = line.type === "added" ? "+" : line.type === "removed" ? "−" : " ";
              return (
                <div key={i} style={{ display: "flex", gap: 8, padding: "1px 12px", background: bg }}>
                  <span style={{ ...mono, fontSize: 9.5, color, flexShrink: 0, userSelect: "none" as const }}>{prefix}</span>
                  <pre style={{ margin: 0, ...mono, fontSize: 9.5, color: color === "rgba(148,163,184,0.55)" ? "rgba(148,163,184,0.55)" : color, whiteSpace: "pre-wrap" as const, wordBreak: "break-all" as const }}>{line.content}</pre>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "8px 12px", borderTop: divider, display: "flex", gap: 8 }}>
            <button style={{ ...mono, padding: "4px 12px", borderRadius: 5, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
              Apply (Simulation)
            </button>
            <button style={{ ...mono, padding: "4px 12px", borderRadius: 5, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.6)", fontSize: 10, cursor: "pointer" }}>
              Discard Draft
            </button>
            <MockBadge label="NOT WIRED" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── EvidenceAuditCard ────────────────────────────────────────────────────────
export function EvidenceAuditCard({ event }: { event: AuditTrailEvent }) {
  const outcomeColor = event.outcome === "success" ? "#00ff88" : event.outcome === "failure" ? "#ff0040" : "#ffb000";
  const actorColor = event.actor_type === "system" ? "#64748b" : event.actor_type === "automation" ? "#38bdf8" : event.actor_type === "external" ? "#ff6b35" : "#00ff88";
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: divider }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${outcomeColor}0a`, border: `1px solid ${outcomeColor}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {event.outcome === "success" ? <CheckCircle2 size={12} color={outcomeColor} /> : event.outcome === "failure" ? <AlertTriangle size={12} color={outcomeColor} /> : <Clock size={12} color={outcomeColor} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: actorColor }}>{event.actor}</span>
          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{event.action}</span>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginLeft: "auto" }}>
            {new Date(event.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(100,116,139,0.6)", lineHeight: 1.4, marginBottom: 3 }}>{event.detail}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)" }}>SHA: {event.evidence_hash}</span>
          <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.3)" }}>{event.resource_id}</span>
        </div>
      </div>
    </div>
  );
}

// ─── AcceptanceCheck ─────────────────────────────────────────────────────────
export function AcceptanceCheck({
  checks,
}: {
  checks: Array<{ label: string; status: "pass" | "fail" | "pending" }>;
}) {
  const allPass = checks.every(c => c.status === "pass");
  return (
    <div style={{ borderRadius: 7, border: `1px solid ${allPass ? "rgba(0,255,136,0.2)" : "rgba(255,176,0,0.2)"}`, background: allPass ? "rgba(0,255,136,0.03)" : "rgba(255,176,0,0.03)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${allPass ? "rgba(0,255,136,0.12)" : "rgba(255,176,0,0.12)"}` }}>
        <Shield size={11} color={allPass ? "#00ff88" : "#ffb000"} />
        <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: allPass ? "rgba(0,255,136,0.7)" : "rgba(255,176,0,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          Acceptance Checks — {allPass ? "All Passed" : "Pending"}
        </span>
        <MockBadge label="SIMULATED" />
      </div>
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column" as const, gap: 4 }}>
        {checks.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {c.status === "pass" ? <CheckCircle2 size={11} color="#00ff88" /> : c.status === "fail" ? <AlertTriangle size={11} color="#ff0040" /> : <Clock size={11} color="#64748b" />}
            <span style={{ fontSize: 11, color: c.status === "pass" ? "rgba(148,163,184,0.7)" : c.status === "fail" ? "rgba(255,0,64,0.8)" : "rgba(100,116,139,0.5)" }}>{c.label}</span>
          </div>
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
      <button onClick={() => setOpen(x => !x)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(100,116,139,0.04)", border: "none", cursor: "pointer", textAlign: "left" as const }}>
        <Link size={11} color="rgba(100,116,139,0.4)" />
        <span style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.45)", flex: 1 }}>Backend Integration Requirements ({endpoints.length})</span>
        <MockBadge label="NOT WIRED" />
        {open ? <ChevronDown size={11} color="rgba(100,116,139,0.3)" /> : <ChevronRight size={11} color="rgba(100,116,139,0.3)" />}
      </button>
      {open && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
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

// ─── ModuleHeader ─────────────────────────────────────────────────────────────
export function ModuleHeader({ icon, title, subtitle, accent = "#00ff88", extra }: { icon: React.ReactNode; title: string; subtitle: string; accent?: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accent}0d`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginTop: 2 }}>{subtitle}</div>
      </div>
      {extra}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Lock size={10} color="rgba(167,139,250,0.4)" />
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
        <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: s.accent ? `${s.color ?? "#00ff88"}08` : "rgba(15,23,42,0.8)", border: `1px solid ${s.accent ? (s.color ?? "#00ff88") + "22" : "rgba(255,255,255,0.07)"}`, display: "flex", flexDirection: "column" as const, gap: 2, flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{s.label}</span>
          <span style={{ ...mono, fontSize: 18, fontWeight: 700, lineHeight: 1, color: s.color ?? "#e2e8f0" }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ScenarioSimulator ────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = { CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000" };

export function DPScenarioSimulator({ scenario }: { scenario: DPScenario }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);

  const run = useCallback(() => {
    setRunning(true); setStep(0);
    let s = 0;
    const next = () => {
      s++;
      if (s < scenario.simulation_steps.length) { setStep(s); setTimeout(next, 950); }
      else { setRunning(false); setStep(scenario.simulation_steps.length); }
    };
    setTimeout(next, 950);
  }, [scenario]);

  const done = step >= scenario.simulation_steps.length && !running;
  const sc = SEV_COLOR[scenario.severity] ?? "#ffb000";

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${sc}20`, background: `${sc}04`, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${sc}12`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${sc}10`, border: `1px solid ${sc}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Play size={11} color={sc} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{scenario.name}</div>
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.55)", marginTop: 1 }}>{scenario.description}</div>
        </div>
        <MockBadge label="SCENARIO" />
        <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", height: 18, borderRadius: 999, background: `${sc}12`, border: `1px solid ${sc}2e`, color: sc, fontSize: 10, fontWeight: 700, ...mono }}>{scenario.severity}</span>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 4, marginBottom: 10 }}>
          {scenario.simulation_steps.map((s, i) => {
            const active = step === i && running;
            const done_ = step > i || (done && step >= i);
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: done_ ? "rgba(0,255,136,0.1)" : active ? `${sc}14` : "rgba(255,255,255,0.04)", border: `1px solid ${done_ ? "rgba(0,255,136,0.25)" : active ? sc + "35" : "rgba(255,255,255,0.08)"}` }}>
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
            <div style={{ marginTop: 10 }}>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation Preview</div>
              {scenario.remediation_preview.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ ...mono, fontSize: 10, color: "#00ff88", flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={run} disabled={running} style={{ ...mono, padding: "6px 14px", borderRadius: 5, background: running ? "rgba(255,255,255,0.03)" : `${sc}10`, border: `1px solid ${running ? "rgba(255,255,255,0.08)" : sc + "28"}`, color: running ? "rgba(100,116,139,0.4)" : sc, fontSize: 11, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {running ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Running…</> : <><Play size={10} /> {done ? "Re-run Scenario" : "Run Scenario"}</>}
        </button>
      </div>
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

// ─── useLocalStorage ──────────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try { const item = localStorage.getItem(key); return item ? (JSON.parse(item) as T) : initial; }
    catch { return initial; }
  });
  const set = useCallback((val: T) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
    setStored(val);
  }, [key]);
  return [stored, set];
}

// ─── TH helper ────────────────────────────────────────────────────────────────
export function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: right ? "right" as const : "left" as const }}>
      {children}
    </span>
  );
}
