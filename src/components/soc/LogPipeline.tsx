import { useState, useEffect, useRef } from "react";
import { Activity, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Wifi, TrendingUp } from "lucide-react";
import type { PipelineSource, PipelineStatus } from "./types";
import { MOCK_PIPELINE, MOCK_PIPELINE_ERRORS } from "./mockData";
import { mono, ls, divider, PIPE_COLOR, BackendHandoff, ModuleHeader } from "./shared";

const TYPE_LABEL: Record<string, string> = {
  cloudtrail: "CloudTrail", vpc_flow: "VPC Flow", guardduty: "GuardDuty",
  cloudwatch: "CloudWatch", s3_access: "S3 Access", waf: "WAF",
};

function PipelineStatusPill({ status }: { status: PipelineStatus }) {
  const c = PIPE_COLOR[status];
  const animated = status === "degraded" || status === "error";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: `${c}14`, border: `1px solid ${c}28`, color: c, ...mono, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0, animation: animated ? "ir-pulse 1.4s infinite" : "none" }} />
      {status.toUpperCase()}
    </span>
  );
}

function IngestCounter({ base, active, size = 13 }: { base: number; active: boolean; size?: number }) {
  const [val, setVal] = useState(base);
  const ref = useRef(base);

  useEffect(() => {
    if (!active || base === 0) return;
    const tick = () => {
      const jitter = base * 0.12;
      ref.current = Math.max(0, base + (Math.random() - 0.5) * 2 * jitter);
      setVal(Math.round(ref.current));
      setTimeout(tick, 600 + Math.random() * 800);
    };
    const t = setTimeout(tick, 300 + Math.random() * 200);
    return () => clearTimeout(t);
  }, [base, active]);

  return (
    <span style={{ ...mono, fontSize: size, fontWeight: 700, color: active && base > 0 ? "#00ff88" : "rgba(100,116,139,0.3)", fontVariantNumeric: "tabular-nums" }}>
      {active && base > 0 ? val.toLocaleString() : "—"}
    </span>
  );
}

function LagBar({ lag, max = 7200 }: { lag: number; max?: number }) {
  const pct = Math.min((lag / max) * 100, 100);
  const color = lag < 60 ? "#00ff88" : lag < 300 ? "#ffb000" : "#ff6b35";
  const label = lag >= 3600 ? `${(lag / 3600).toFixed(1)}h` : lag >= 60 ? `${Math.round(lag / 60)}m` : `${lag}s`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ ...mono, fontSize: 10, color, minWidth: 36, textAlign: "right" }}>{label}</span>
    </div>
  );
}

// Hero EPS meter for the three high-volume sources
function EpsMeter({ src }: { src: PipelineSource }) {
  const c = PIPE_COLOR[src.status];
  const isActive = src.status === "healthy" || src.status === "degraded";
  const maxEps = 5000; // scale reference
  const pct = Math.min((src.ingest_eps / maxEps) * 100, 100);

  return (
    <div style={{
      flex: 1, padding: "16px 18px", borderRadius: 10,
      background: "rgba(15,23,42,0.85)",
      border: `1px solid ${isActive ? c + "18" : "rgba(255,255,255,0.06)"}`,
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow stripe */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: isActive ? `linear-gradient(90deg, transparent, ${c}50, transparent)` : "transparent",
        animation: isActive && src.ingest_eps > 0 ? "rail-sweep 3s ease-out infinite" : "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>{src.name}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>{TYPE_LABEL[src.type]}</div>
        </div>
        <PipelineStatusPill status={src.status} />
      </div>

      {/* The headline metric */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <IngestCounter base={src.ingest_eps} active={isActive} size={32} />
        <span style={{ ...mono, fontSize: 11, color: "rgba(100,116,139,0.4)", marginBottom: 2 }}>eps</span>
      </div>

      {/* Fill bar */}
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: isActive ? `linear-gradient(90deg, ${c}80, ${c})` : "rgba(100,116,139,0.2)",
          borderRadius: 2, transition: "width 0.8s ease",
        }} />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <div style={{ ...ls, fontSize: 8, marginBottom: 2 }}>Lag</div>
          <span style={{ ...mono, fontSize: 11, color: src.lag_seconds < 60 ? "#00ff88" : src.lag_seconds < 300 ? "#ffb000" : "#ff6b35" }}>
            {src.lag_seconds < 60 ? `${src.lag_seconds}s` : src.lag_seconds < 3600 ? `${Math.round(src.lag_seconds / 60)}m` : `${(src.lag_seconds / 3600).toFixed(1)}h`}
          </span>
        </div>
        <div>
          <div style={{ ...ls, fontSize: 8, marginBottom: 2 }}>Err%</div>
          <span style={{ ...mono, fontSize: 11, color: src.error_rate_pct < 1 ? "#00ff88" : src.error_rate_pct < 5 ? "#ffb000" : "#ff6b35" }}>
            {src.error_rate_pct}%
          </span>
        </div>
        <div>
          <div style={{ ...ls, fontSize: 8, marginBottom: 2 }}>Vol/d</div>
          <span style={{ ...mono, fontSize: 11, color: "#94a3b8" }}>
            {src.daily_volume_gb > 0 ? `${src.daily_volume_gb}GB` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LogPipeline() {
  const [selected, setSelected] = useState<PipelineSource | null>(null);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [retried, setRetried] = useState<Set<string>>(new Set());

  const sources = MOCK_PIPELINE;
  const errors = MOCK_PIPELINE_ERRORS;

  // Total live EPS across healthy/degraded sources
  const [totalEps, setTotalEps] = useState(() =>
    sources.filter(s => s.status === "healthy" || s.status === "degraded").reduce((a, s) => a + s.ingest_eps, 0)
  );
  useEffect(() => {
    const tick = () => {
      const base = sources.filter(s => s.status === "healthy" || s.status === "degraded").reduce((a, s) => a + s.ingest_eps, 0);
      setTotalEps(Math.round(base * (0.95 + Math.random() * 0.1)));
      setTimeout(tick, 1000 + Math.random() * 500);
    };
    const t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [sources]);

  const errored = sources.filter(s => s.status === "error" || s.status === "offline").length;
  const degraded = sources.filter(s => s.status === "degraded").length;

  // Top 3 by volume for the hero section
  const heroSources = [...sources].sort((a, b) => b.ingest_eps - a.ingest_eps).slice(0, 3);

  function handleRetry(errorId: string) {
    setRetrying(prev => new Set([...prev, errorId]));
    setTimeout(() => {
      setRetrying(prev => { const n = new Set(prev); n.delete(errorId); return n; });
      setRetried(prev => new Set([...prev, errorId]));
    }, 2200);
  }

  return (
    <div>
      <ModuleHeader
        icon={<Activity size={16} color="#a78bfa" />}
        title="Log Pipeline Status"
        subtitle="Ingestion health, throughput, lag, and error rates across all log sources."
      />

      {/* Hero — total EPS + status summary */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 12, flexWrap: "wrap",
        padding: "16px 20px", marginBottom: 14,
        borderRadius: 10, background: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(167,139,250,0.14)",
      }}>
        {/* Total EPS hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={11} color="rgba(167,139,250,0.6)" />
            <span style={{ ...ls, fontSize: 9, color: "rgba(167,139,250,0.6)" }}>Total Ingest</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...mono, fontSize: 40, fontWeight: 800, lineHeight: 1, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
              {totalEps.toLocaleString()}
            </span>
            <span style={{ ...mono, fontSize: 13, color: "rgba(167,139,250,0.5)" }}>eps</span>
          </div>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
            {sources.reduce((a, s) => a + s.daily_volume_gb, 0).toFixed(1)} GB today
          </span>
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, paddingLeft: 8 }}>
          {[
            { label: "Healthy", count: sources.filter(s => s.status === "healthy").length, color: "#00ff88" },
            { label: "Degraded", count: degraded, color: "#ffb000" },
            { label: "Error / Offline", count: errored, color: "#ff6b35" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, opacity: count > 0 ? 1 : 0.25 }} />
              <span style={{ ...mono, fontSize: 10, color: count > 0 ? color : "rgba(100,116,139,0.3)", fontWeight: count > 0 ? 700 : 400 }}>
                {count} {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* EPS meters for top-volume sources */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3" style={{ marginBottom: 14 }}>
        {heroSources.map(src => <EpsMeter key={src.id} src={src} />)}
      </div>

      {/* Full source table + errors */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflowX: "auto", overflowY: "hidden", background: "rgba(15,23,42,0.8)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 96px 80px 96px 80px", padding: "8px 12px", borderBottom: divider, background: "rgba(255,255,255,0.02)", gap: 0, minWidth: 560 }}>
            {["Source", "Status", "EPS", "Lag", "Vol/d"].map(h => (
              <span key={h} style={{ ...ls, fontSize: 9 }}>{h}</span>
            ))}
          </div>

          {sources.map(src => {
            const isSelected = selected?.id === src.id;
            const isActive = src.status === "healthy" || src.status === "degraded";
            return (
              <div key={src.id}>
                <div
                  className="soc-row"
                  onClick={() => setSelected(isSelected ? null : src)}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 96px 80px 96px 80px",
                    padding: "8px 12px", borderBottom: divider, cursor: "pointer",
                    background: isSelected ? "rgba(167,139,250,0.04)" : "transparent",
                    borderLeft: `2px solid ${isSelected ? "#a78bfa" : "transparent"}`,
                    transition: "border-color 0.1s", gap: 0, alignItems: "center", minWidth: 560,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 1 }}>{src.name}</div>
                    <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.38)" }}>{src.destination}</span>
                  </div>
                  <div><PipelineStatusPill status={src.status} /></div>
                  <div><IngestCounter base={src.ingest_eps} active={isActive} /></div>
                  <div>
                    <span style={{ ...mono, fontSize: 12, color: src.lag_seconds < 60 ? "#00ff88" : src.lag_seconds < 300 ? "#ffb000" : "#ff6b35" }}>
                      {src.lag_seconds >= 3600 ? `${(src.lag_seconds / 3600).toFixed(1)}h` : src.lag_seconds >= 60 ? `${Math.round(src.lag_seconds / 60)}m` : `${src.lag_seconds}s`}
                    </span>
                  </div>
                  <div>
                    <span style={{ ...mono, fontSize: 12, color: src.daily_volume_gb > 0 ? "#94a3b8" : "rgba(100,116,139,0.3)" }}>
                      {src.daily_volume_gb > 0 ? `${src.daily_volume_gb}GB` : "—"}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div style={{ padding: "8px 12px", borderBottom: divider, background: "rgba(167,139,250,0.025)", minWidth: 560 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ ...ls, fontSize: 8, marginBottom: 4 }}>Lag</div>
                        <LagBar lag={src.lag_seconds} />
                      </div>
                      <div>
                        <div style={{ ...ls, fontSize: 8, marginBottom: 4 }}>Error Rate</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                            <div style={{ width: `${Math.min(src.error_rate_pct, 100)}%`, height: "100%", background: src.error_rate_pct < 1 ? "#00ff88" : src.error_rate_pct < 5 ? "#ffb000" : "#ff6b35", borderRadius: 2 }} />
                          </div>
                          <span style={{ ...mono, fontSize: 10, color: src.error_rate_pct < 1 ? "#00ff88" : "#ff6b35", minWidth: 28, textAlign: "right" }}>{src.error_rate_pct}%</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ ...ls, fontSize: 8, marginBottom: 4 }}>Retention</div>
                        <span style={{ ...mono, fontSize: 11, color: "#94a3b8" }}>{src.retention_days}d</span>
                      </div>
                      <div>
                        <div style={{ ...ls, fontSize: 8, marginBottom: 4 }}>Last Event</div>
                        <span style={{ ...mono, fontSize: 11, color: "rgba(100,116,139,0.5)" }}>
                          {src.last_event ? new Date(src.last_event).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Errors panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 10, border: "1px solid rgba(255,107,53,0.2)", background: "rgba(255,107,53,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,107,53,0.12)", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={11} color="rgba(255,107,53,0.7)" />
              <span style={{ ...ls, fontSize: 9, color: "rgba(255,107,53,0.7)" }}>
                Active Errors ({errors.filter(e => !e.resolved && !retried.has(e.id)).length})
              </span>
            </div>
            {errors.length === 0 ? (
              <div style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: "rgba(100,116,139,0.4)" }}>No active pipeline errors.</span>
              </div>
            ) : errors.map(err => {
              const isRetrying = retrying.has(err.id);
              if (retried.has(err.id)) return null;
              return (
                <div key={err.id} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,107,53,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ ...mono, fontSize: 9, color: "rgba(255,107,53,0.5)", marginBottom: 2, display: "block" }}>{err.code}</span>
                      <span style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.4, display: "block" }}>{err.message}</span>
                    </div>
                    <button
                      onClick={() => handleRetry(err.id)}
                      disabled={isRetrying}
                      className="soc-btn"
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa", fontSize: 10, cursor: isRetrying ? "default" : "pointer", opacity: isRetrying ? 0.5 : 1, ...mono }}
                    >
                      <RotateCcw size={9} style={{ animation: isRetrying ? "spin 1s linear infinite" : "none" }} />
                      {isRetrying ? "…" : "Retry"}
                    </button>
                  </div>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.32)" }}>
                    {new Date(err.timestamp).toLocaleTimeString()} · {MOCK_PIPELINE.find(p => p.id === err.source_id)?.name ?? err.source_id}
                  </span>
                </div>
              );
            })}
          </div>

          {selected ? (
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Wifi size={11} color={PIPE_COLOR[selected.status]} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{selected.name}</span>
              </div>
              {([
                ["Type", TYPE_LABEL[selected.type] ?? selected.type],
                ["Destination", selected.destination],
                ["Daily Volume", `${selected.daily_volume_gb} GB`],
                ["Retention", `${selected.retention_days} days`],
                ["Last Event", selected.last_event ? new Date(selected.last_event).toLocaleTimeString() : "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 6, marginBottom: 5 }}>
                  <span style={{ ...ls, fontSize: 9 }}>{k}</span>
                  <span style={{ ...mono, fontSize: 11, color: "#94a3b8", wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(15,23,42,0.5)", border: "1px dashed rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, color: "rgba(100,116,139,0.35)", margin: 0 }}>Click a row to see source details.</p>
            </div>
          )}
        </div>
      </div>

      <BackendHandoff endpoints={[
        { method: "GET", path: "/api/soc/pipeline", description: "Pipeline source list with live EPS, lag, and error rate from Kinesis + CloudWatch metrics" },
        { method: "GET", path: "/api/soc/pipeline/errors", description: "Active delivery errors from CloudWatch Logs delivery error log groups" },
        { method: "POST", path: "/api/soc/pipeline/:id/retry", description: "Trigger redelivery attempt via Kinesis retry or Lambda invoke" },
      ]} />
    </div>
  );
}
