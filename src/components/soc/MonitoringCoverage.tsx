import { useState } from "react";
import { Eye, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { ServiceCoverage, CoverageStatus } from "./types";
import { MOCK_COVERAGE } from "./mockData";
import { mono, ls, divider, COV_COLOR, BackendHandoff, ModuleHeader, StatStrip, MockBadge, EmptyState } from "./shared";

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1"];

const COV_LABEL: Record<CoverageStatus, string> = { healthy: "Healthy", partial: "Partial", degraded: "Degraded", uncovered: "Not Covered" };
const COV_ICON: Record<CoverageStatus, React.ReactNode> = {
  healthy:   <CheckCircle2 size={11} />,
  partial:   <MinusCircle size={11} />,
  degraded:  <AlertTriangle size={11} />,
  uncovered: <XCircle size={11} />,
};

function CoverageCell({ status }: { status: CoverageStatus }) {
  const c = COV_COLOR[status];
  return (
    <div title={COV_LABEL[status]} style={{ width: 32, height: 28, borderRadius: 5, background: `${c}14`, border: `1px solid ${c}28`, display: "flex", alignItems: "center", justifyContent: "center", color: c }}>
      {COV_ICON[status]}
    </div>
  );
}

function CoverageBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#00ff88" : pct >= 50 ? "#ffb000" : "#ff6b35";
  return (
    <div style={{ width: "100%", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
    </div>
  );
}

function coveragePct(svc: ServiceCoverage) {
  const vals = Object.values(svc.region_coverage);
  const score = vals.reduce((s, v) => s + (v === "healthy" ? 1 : v === "partial" ? 0.5 : v === "degraded" ? 0.25 : 0), 0);
  return Math.round((score / vals.length) * 100);
}

export function MonitoringCoverage() {
  const [selected, setSelected] = useState<ServiceCoverage | null>(null);
  const services = MOCK_COVERAGE;

  const overallPct = Math.round(services.reduce((s, svc) => s + coveragePct(svc), 0) / services.length);
  const gaps = services.filter(s => s.coverage === "uncovered" || s.coverage === "degraded");
  const healthy = services.filter(s => s.coverage === "healthy");

  return (
    <div>
      <ModuleHeader
        icon={<Eye size={16} color="#38bdf8" />}
        title="Monitoring Coverage"
        subtitle="Detection coverage matrix — which services have active detectors, event sources, and regional gaps."
      />

      <StatStrip stats={[
        { label: "Overall", value: `${overallPct}%`, color: overallPct >= 80 ? "#00ff88" : "#ffb000", accent: true },
        { label: "Fully Covered", value: healthy.length, color: "#00ff88" },
        { label: "Coverage Gaps", value: gaps.length, color: gaps.length > 0 ? "#ff6b35" : "#00ff88", accent: gaps.length > 0 },
        { label: "Services", value: services.length, color: "#94a3b8" },
      ]} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* Coverage matrix */}
        <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr 80px 80px", gap: 0, padding: "8px 14px", borderBottom: divider, background: "rgba(255,255,255,0.02)" }}>
            <span style={ls}>Service</span>
            {REGIONS.map(r => <span key={r} style={{ ...ls, textAlign: "center" }}>{r.replace("us-", "").replace("eu-", "eu-")}</span>)}
            <span style={{ ...ls, textAlign: "center" }}>Detectors</span>
            <span style={{ ...ls, textAlign: "right" }}>7d Findings</span>
          </div>

          {services.map(svc => {
            const pct = coveragePct(svc);
            const c = COV_COLOR[svc.coverage];
            const isSelected = selected?.id === svc.id;
            return (
              <div
                key={svc.id}
                className="soc-row"
                onClick={() => setSelected(isSelected ? null : svc)}
                style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr 80px 80px", gap: 0, padding: "10px 14px", borderBottom: divider, cursor: "pointer", background: isSelected ? "rgba(56,189,248,0.04)" : "transparent", borderLeft: `2px solid ${isSelected ? "#38bdf8" : "transparent"}`, transition: "border-color 0.1s" }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{svc.name}</div>
                  <CoverageBar pct={pct} />
                  <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginTop: 2, display: "block" }}>{pct}% coverage</span>
                </div>
                {REGIONS.map(r => (
                  <div key={r} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <CoverageCell status={svc.region_coverage[r] ?? "uncovered"} />
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: svc.detector_count > 0 ? "#94a3b8" : "#ff6b35" }}>
                    {svc.detector_count}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 12, color: svc.findings_7d > 0 ? "#ffb000" : "rgba(100,116,139,0.4)" }}>
                    {svc.findings_7d}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selected ? (
            <div style={{ padding: "14px", borderRadius: 10, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{selected.name}</span>
                <span style={{ ...mono, fontSize: 9, padding: "0 8px", borderRadius: 999, background: `${COV_COLOR[selected.coverage]}14`, border: `1px solid ${COV_COLOR[selected.coverage]}28`, color: COV_COLOR[selected.coverage] }}>
                  {COV_LABEL[selected.coverage]}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  ["Category", selected.category],
                  ["Detectors", String(selected.detector_count)],
                  ["Event Sources", String(selected.event_sources)],
                  ["Findings (7d)", String(selected.findings_7d)],
                  ["Last Event", selected.last_event ? new Date(selected.last_event).toLocaleTimeString() : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 6 }}>
                    <span style={{ ...ls, fontSize: 9 }}>{k}</span>
                    <span style={{ ...mono, fontSize: 11, color: "#94a3b8" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Region breakdown */}
              <div style={{ marginTop: 12 }}>
                <div style={{ ...ls, marginBottom: 8, fontSize: 9 }}>Region Coverage</div>
                {REGIONS.map(r => {
                  const s = selected.region_coverage[r] ?? "uncovered";
                  return (
                    <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)", width: 80 }}>{r}</span>
                      <CoverageCell status={s} />
                      <span style={{ fontSize: 10, color: COV_COLOR[s] }}>{COV_LABEL[s]}</span>
                    </div>
                  );
                })}
              </div>

              {selected.gap_reason && (
                <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.2)" }}>
                  <div style={{ ...ls, color: "rgba(255,107,53,0.7)", marginBottom: 4, fontSize: 9 }}>Gap Reason</div>
                  <p style={{ fontSize: 11, color: "rgba(252,150,80,0.8)", margin: 0, lineHeight: 1.5 }}>{selected.gap_reason}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(15,23,42,0.5)", border: "1px dashed rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: 11, color: "rgba(100,116,139,0.4)", margin: 0 }}>Click a service row to see coverage details and remediation steps.</p>
            </div>
          )}

          {/* Gaps summary */}
          {gaps.length > 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,107,53,0.04)", border: "1px solid rgba(255,107,53,0.15)" }}>
              <div style={{ ...ls, color: "rgba(255,107,53,0.7)", marginBottom: 8, fontSize: 9 }}>Coverage Gaps ({gaps.length})</div>
              {gaps.map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <XCircle size={11} color={COV_COLOR[g.coverage]} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>{g.name}</div>
                    {g.gap_reason && <div style={{ fontSize: 10, color: "rgba(100,116,139,0.55)", marginTop: 2, lineHeight: 1.4 }}>{g.gap_reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BackendHandoff endpoints={[
        { method: "GET", path: "/api/soc/coverage", description: "Per-service coverage status from detector inventory" },
        { method: "GET", path: "/api/soc/coverage/gaps", description: "Auto-detected gaps from AWS Config + GuardDuty enablement check" },
        { method: "POST", path: "/api/soc/coverage/remediate", description: "Trigger detector enablement automation via SSM" },
      ]} />
    </div>
  );
}
