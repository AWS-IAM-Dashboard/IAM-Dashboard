// Network Troubleshooting — connectivity tests, route analysis, DNS
import { useState, useCallback } from "react";
import { Wifi, ChevronDown, ChevronRight, Play, Loader2, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import type { ConnectivityTest, RouteEntry, DNSResolution, ConnectivityResult } from "./types";
import {
  mono, divider, POSTURE_COLOR,
  StatStrip, ModuleHeader, BackendHandoff, MockBadge,
  ScenarioSimulator, EmptyState,
} from "./shared";
import {
  MOCK_CONNECTIVITY_TESTS, MOCK_ROUTES, MOCK_DNS, INFRA_SCENARIOS,
} from "./mockData";

const TROUBLESHOOT_ENDPOINTS = [
  { method: "POST", path: "POST /reachability-analyzer/start", description: "Start a Network Reachability Analyzer path analysis" },
  { method: "GET", path: "GET /reachability-analyzer/{id}/result", description: "Get reachability analysis results and hop detail" },
  { method: "GET", path: "GET /route-tables", description: "Describe all route tables and effective routes" },
  { method: "POST", path: "POST /route53resolver/query-log-configs", description: "Query DNS resolver logs for a given hostname" },
  { method: "GET", path: "GET /flow-logs/query", description: "Query VPC flow log records by source/dest/port" },
];

const RESULT_COLOR: Record<ConnectivityResult, string> = {
  reachable: "#00ff88",
  blocked: "#ff0040",
  filtered: "#ff6b35",
  unknown: "#64748b",
  timeout: "#ffb000",
};

const RESULT_ICON: Record<ConnectivityResult, React.ReactNode> = {
  reachable: <CheckCircle2 size={13} color="#00ff88" />,
  blocked: <XCircle size={13} color="#ff0040" />,
  filtered: <XCircle size={13} color="#ff6b35" />,
  unknown: <Clock size={13} color="#64748b" />,
  timeout: <Loader2 size={13} color="#ffb000" />,
};

const HOP_COLOR: Record<string, string> = {
  SecurityGroup: "#38bdf8",
  NACL: "#a78bfa",
  RouteTable: "#ffb000",
  InternetGateway: "#00ff88",
  NATGateway: "#00ff88",
  ENI: "#64748b",
  VPCPeering: "#60a5fa",
  TransitGateway: "#8b5cf6",
};

// ─── Connectivity Test row ────────────────────────────────────────────────────
function TestRow({ test }: { test: ConnectivityTest }) {
  const [open, setOpen] = useState(false);
  const rc = RESULT_COLOR[test.result];
  return (
    <>
      <div
        className="infra-row"
        style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 80px 70px 100px 80px", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? rc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{test.source}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{test.source_type}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{test.destination}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{test.destination_type}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{test.protocol}:{test.port}</span>
        <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)" }}>{test.duration_ms >= 10_000 ? `${(test.duration_ms / 1000).toFixed(0)}s` : `${test.duration_ms}ms`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {RESULT_ICON[test.result]}
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: rc }}>{test.result.toUpperCase()}</span>
        </div>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
          {new Date(test.ran_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 16px", borderBottom: divider, background: "rgba(0,0,0,0.15)", animation: "fade-in 0.15s ease" }}>
          {/* Path hops */}
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
            Network Path ({test.hops.length} hops)
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 0, marginBottom: 12 }}>
            {test.hops.map((hop, i) => {
              const hc = HOP_COLOR[hop.type] ?? "#94a3b8";
              const actionColor = hop.action === "DENY" ? "#ff0040" : hop.action === "ALLOW" ? "#00ff88" : "#ffb000";
              const isBlocking = hop.action === "DENY";
              return (
                <div key={i} style={{ display: "flex", gap: 10, position: "relative" }}>
                  {i < test.hops.length - 1 && (
                    <span style={{ position: "absolute", left: 7, top: 16, bottom: 0, width: 1, background: "rgba(255,255,255,0.05)" }} />
                  )}
                  <span style={{ width: 15, height: 15, borderRadius: "50%", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", background: isBlocking ? "rgba(255,0,64,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${isBlocking ? "rgba(255,0,64,0.3)" : "rgba(255,255,255,0.07)"}`, ...mono, fontSize: 8, fontWeight: 700, color: hc }}>
                    {hop.index}
                  </span>
                  <div style={{ paddingBottom: 8, minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...mono, fontSize: 9, padding: "0 5px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${hc}10`, border: `1px solid ${hc}20`, color: hc, flexShrink: 0 }}>{hop.type}</span>
                      <span style={{ fontSize: 11, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{hop.component}</span>
                      <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: actionColor, marginLeft: "auto", flexShrink: 0 }}>{hop.action}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,0.55)", marginTop: 2 }}>{hop.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {test.blocking_reason && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: test.result === "reachable" ? "rgba(0,255,136,0.05)" : "rgba(255,0,64,0.05)", border: `1px solid ${test.result === "reachable" ? "rgba(0,255,136,0.15)" : "rgba(255,0,64,0.15)"}`, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: test.result === "reachable" ? "rgba(0,255,136,0.7)" : "rgba(255,0,64,0.8)", lineHeight: 1.5 }}>
                {test.result === "reachable" ? "Note: " : "Blocked: "}{test.blocking_reason}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Route row ────────────────────────────────────────────────────────────────
const TARGET_COLOR: Record<string, string> = {
  igw: "#00ff88", nat: "#38bdf8", pcx: "#a78bfa", vgw: "#60a5fa", local: "#64748b", tgw: "#8b5cf6", blackhole: "#ff0040", eni: "#ffb000",
};

function RouteRow({ route }: { route: RouteEntry }) {
  const tc = TARGET_COLOR[route.target_type] ?? "#94a3b8";
  const isBlackhole = route.state === "blackhole";
  return (
    <div className="infra-row" style={{ display: "grid", gridTemplateColumns: "130px 1fr 80px 60px 130px 1fr", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider, opacity: isBlackhole ? 0.65 : 1 }}>
      <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: isBlackhole ? "#ff0040" : "#e2e8f0" }}>{route.destination}</span>
      <span style={{ ...mono, fontSize: 10, color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{route.target}</span>
      <span style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${tc}0c`, border: `1px solid ${tc}20`, color: tc }}>{route.target_type}</span>
      <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: isBlackhole ? "#ff0040" : "#00ff88" }}>{route.state}</span>
      <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{route.route_table_id}</span>
      <span style={{ fontSize: 10, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{route.subnet_ids.join(", ")}</span>
    </div>
  );
}

// ─── DNS row ──────────────────────────────────────────────────────────────────
function DNSRow({ r }: { r: DNSResolution }) {
  const sc = r.status === "resolved" ? "#00ff88" : r.status === "nxdomain" ? "#ff6b35" : "#ff0040";
  return (
    <div className="infra-row" style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 1fr 80px", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider }}>
      <span style={{ ...mono, fontSize: 10, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.hostname}</span>
      <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{r.resolver.replace("_", " ")}</span>
      <span style={{ ...mono, fontSize: 10, color: `${r.latency_ms}ms` > "100ms" ? "#ffb000" : "rgba(100,116,139,0.6)" }}>{r.latency_ms}ms</span>
      <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{r.status.toUpperCase()}</span>
      <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>{r.resolved_ips.join(", ") || "—"}</span>
      <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
        {new Date(r.ran_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

// ─── Quick test form ───────────────────────────────────────────────────────────
function QuickTest({ onRun }: { onRun: (src: string, dst: string, port: string) => void }) {
  const [src, setSrc] = useState("i-0a1b2c3d4e5f6789");
  const [dst, setDst] = useState("database.prod.internal");
  const [port, setPort] = useState("5432");
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => { setRunning(false); onRun(src, dst, port); }, 2200);
  }, [src, dst, port, onRun]);

  const inputStyle: React.CSSProperties = { ...mono, fontSize: 11, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "6px 10px", color: "#e2e8f0", outline: "none", width: "100%" };

  return (
    <div style={{ padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,23,42,0.4)", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ ...mono, fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.7)" }}>Run Connectivity Test</span>
        <MockBadge label="SIM ONLY" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: 8, alignItems: "end" }}>
        <div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Source</div>
          <input style={inputStyle} value={src} onChange={e => setSrc(e.target.value)} placeholder="Instance ID or IP" />
        </div>
        <div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Destination</div>
          <input style={inputStyle} value={dst} onChange={e => setDst(e.target.value)} placeholder="Hostname or IP" />
        </div>
        <div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Port</div>
          <input style={inputStyle} value={port} onChange={e => setPort(e.target.value)} placeholder="443" />
        </div>
        <button
          onClick={run}
          disabled={running}
          style={{ ...mono, padding: "6px 16px", borderRadius: 5, background: running ? "rgba(255,255,255,0.03)" : "rgba(0,255,136,0.08)", border: `1px solid ${running ? "rgba(255,255,255,0.07)" : "rgba(0,255,136,0.25)"}`, color: running ? "rgba(100,116,139,0.4)" : "#00ff88", fontSize: 11, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}
        >
          {running ? <><Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> Testing…</> : <><Play size={10} /> Run</>}
        </button>
      </div>
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

// ─── NetworkTroubleshooting ────────────────────────────────────────────────────
export function NetworkTroubleshooting() {
  const [section, setSection] = useState<"tests" | "routes" | "dns" | "scenarios">("tests");
  const [tests, setTests] = useState(MOCK_CONNECTIVITY_TESTS);
  const [lastTest, setLastTest] = useState<{ src: string; dst: string; port: string } | null>(null);

  const handleRunTest = useCallback((src: string, dst: string, port: string) => {
    setLastTest({ src, dst, port });
    // Add a simulated result to the list
    const results: ConnectivityResult[] = ["blocked", "reachable", "timeout", "filtered"];
    const result = results[Math.floor(Math.random() * results.length)];
    const hops = [
      { index: 1, component: `sg-sim-${Date.now().toString(36).slice(-4)}`, type: "SecurityGroup" as const, action: result === "reachable" ? "ALLOW" as const : "DENY" as const, detail: result === "reachable" ? "Outbound rule matches" : "No matching inbound rule" },
    ];
    const newTest = {
      id: `ct-sim-${Date.now()}`,
      source: src, source_type: "EC2" as const,
      destination: dst, destination_type: "EC2" as const,
      port: parseInt(port) || 443,
      protocol: "TCP" as const,
      result,
      hops,
      ran_at: new Date().toISOString(),
      duration_ms: result === "timeout" ? 30_004 : Math.floor(Math.random() * 300) + 50,
      blocking_reason: result !== "reachable" ? `Simulated ${result} — wire backend for real analysis` : undefined,
    };
    setTests(prev => [newTest, ...prev]);
  }, []);

  const blocked = tests.filter(t => t.result === "blocked" || t.result === "timeout").length;
  const blackholes = MOCK_ROUTES.filter(r => r.state === "blackhole").length;
  const dnsFailed = MOCK_DNS.filter(d => d.status !== "resolved").length;

  const SECTIONS = [
    { id: "tests", label: "Connectivity Tests", accent: "#38bdf8", count: blocked },
    { id: "routes", label: "Route Analysis", accent: "#a78bfa", count: blackholes },
    { id: "dns", label: "DNS Resolution", accent: "#00ff88", count: dnsFailed },
    { id: "scenarios", label: "Scenarios", accent: "#ffb000" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader
        icon={<Wifi size={16} color="#38bdf8" />}
        title="Network Troubleshooting"
        subtitle="Connectivity path analysis, route inspection, and DNS resolution testing"
        accent="#38bdf8"
      />

      <StatStrip stats={[
        { label: "Blocked Paths", value: blocked, color: blocked > 0 ? "#ff0040" : "#00ff88", accent: blocked > 0 },
        { label: "Blackhole Routes", value: blackholes, color: blackholes > 0 ? "#ff0040" : "#00ff88", accent: blackholes > 0 },
        { label: "DNS Failures", value: dnsFailed, color: dnsFailed > 0 ? "#ff6b35" : "#00ff88", accent: dnsFailed > 0 },
        { label: "Tests Run", value: tests.length },
        { label: "Routes Analyzed", value: MOCK_ROUTES.length },
        { label: "DNS Lookups", value: MOCK_DNS.length },
      ]} />

      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexShrink: 0 }}>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="infra-btn" onClick={() => setSection(s.id as typeof section)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: 11, fontWeight: active ? 700 : 500, transition: "all 0.12s" }}
            >
              {s.label}
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 9, fontWeight: 800, padding: "0 4px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Connectivity tests */}
      {section === "tests" && (
        <>
          <QuickTest onRun={handleRunTest} />
          {lastTest && (
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <RotateCcw size={9} />
              Last run: {lastTest.src} → {lastTest.dst}:{lastTest.port} (simulated)
              <MockBadge />
            </div>
          )}
          <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 80px 70px 100px 80px", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              <span /><TH>Source</TH><TH>Destination</TH><TH>Proto:Port</TH><TH>Duration</TH><TH>Result</TH><TH>Time</TH>
            </div>
            {tests.map(t => <TestRow key={t.id} test={t} />)}
          </div>
        </>
      )}

      {/* Routes */}
      {section === "routes" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 80px 60px 130px 1fr", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <TH>Destination</TH><TH>Target</TH><TH>Type</TH><TH>State</TH><TH>Route Table</TH><TH>Subnets</TH>
          </div>
          {MOCK_ROUTES.map((r, i) => <RouteRow key={i} route={r} />)}
        </div>
      )}

      {/* DNS */}
      {section === "dns" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 1fr 80px", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <TH>Hostname</TH><TH>Resolver</TH><TH>Latency</TH><TH>Status</TH><TH>IPs</TH><TH>Time</TH>
          </div>
          {MOCK_DNS.map(d => <DNSRow key={d.id} r={d} />)}
        </div>
      )}

      {/* Scenarios */}
      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {INFRA_SCENARIOS.filter(s => s.id === "misconfigured_sg" || s.id === "delayed_telemetry").map(s => (
            <ScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={TROUBLESHOOT_ENDPOINTS} />
    </div>
  );
}
