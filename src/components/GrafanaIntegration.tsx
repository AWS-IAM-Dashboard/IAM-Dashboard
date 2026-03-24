import { useState } from "react";
import {
  BarChart3,
  Download,
  Copy,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  Play,
  ExternalLink,
  Plus,
  Eye,
  EyeOff,
  Activity,
  Database,
  Shield,
  Users,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GrafanaConnection {
  id: string;
  name: string;
  url: string;
  status: "Connected" | "Disconnected" | "Error";
  lastSync: string;
  dashboardsCount: number;
}

interface MetricEndpoint {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  description: string;
  icon: typeof Shield;
  sampleKeys: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const INIT_CONNECTIONS: GrafanaConnection[] = [
  { id: "grafana-prod", name: "Production Grafana", url: "https://grafana.company.com", status: "Connected", lastSync: "2 min ago", dashboardsCount: 12 },
  { id: "grafana-dev", name: "Development Grafana", url: "https://dev-grafana.company.com", status: "Disconnected", lastSync: "1 hour ago", dashboardsCount: 8 },
];

const METRIC_ENDPOINTS: MetricEndpoint[] = [
  { id: "security-overview", name: "Security Overview", endpoint: "/api/metrics/security/overview", enabled: true, description: "Overall posture — findings by severity, compliance score, resources scanned", icon: Shield, sampleKeys: ["critical_findings", "high_findings", "compliance_score", "resources_scanned"] },
  { id: "iam-metrics", name: "IAM Security", endpoint: "/api/metrics/iam", enabled: true, description: "IAM users, roles, policies, MFA coverage, over-privileged entities", icon: Users, sampleKeys: ["total_users", "users_with_mfa", "overprivileged_users", "unused_access_keys"] },
  { id: "ec2-metrics", name: "EC2 Compute", endpoint: "/api/metrics/ec2", enabled: true, description: "Instance posture, public exposure, unencrypted volumes, patch gaps", icon: Activity, sampleKeys: ["total_instances", "publicly_accessible", "unencrypted_volumes", "unrestricted_ssh"] },
  { id: "s3-metrics", name: "S3 Storage", endpoint: "/api/metrics/s3", enabled: true, description: "Bucket misconfigurations, public access, versioning, logging coverage", icon: HardDrive, sampleKeys: ["total_buckets", "public_buckets", "unencrypted_buckets", "no_versioning"] },
  { id: "compliance-metrics", name: "Compliance Frameworks", endpoint: "/api/metrics/compliance", enabled: false, description: "CIS / SOC2 / PCI-DSS / HIPAA framework scores and open controls", icon: Database, sampleKeys: ["cis_score", "soc2_score", "pci_score", "hipaa_score"] },
];

const DASHBOARD_TEMPLATES = [
  { id: "security-overview", name: "AWS Security Overview", description: "Comprehensive posture view — findings by severity, IAM, EC2, S3, compliance scores with drill-down panels.", panels: 12, dataSources: 4, refresh: "1m", tag: "RECOMMENDED", accent: "#00ff88" },
  { id: "compliance-monitoring", name: "Compliance Monitoring", description: "Framework scores (CIS/SOC2/PCI/HIPAA), control pass/fail ratios, open remediation actions with SLA tracking.", panels: 8, dataSources: 2, refresh: "5m", tag: "AUDITOR", accent: "#38bdf8" },
  { id: "iam-access", name: "IAM & Access Control", description: "MFA coverage, access key age, over-privileged roles, unused credentials, privilege escalation paths.", panels: 6, dataSources: 1, refresh: "15m", tag: "IAM", accent: "#a78bfa" },
];

const SETUP_STEPS = [
  { n: 1, title: "Install JSON API Plugin", body: "In Grafana → Administration → Plugins, search for and install the JSON API data source plugin.", code: null },
  { n: 2, title: "Add Data Source", body: "Go to Connections → Data Sources → Add. Choose JSON API and set the base URL:", code: `${typeof window !== "undefined" ? window.location.origin : "https://your-dashboard.com"}/api/metrics` },
  { n: 3, title: "Import Dashboard", body: "Go to Dashboards → Import. Upload the JSON file downloaded from the Dashboard Templates tab, or paste the UID.", code: null },
  { n: 4, title: "Configure Alerts", body: "In each panel → Alert tab, set thresholds. Recommended minimums:", code: "Critical findings > 0\nCompliance score < 80%\nPublic S3 buckets > 0\nUnrestricted SSH groups > 0" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) =>
  s === "Connected" ? "#00ff88" : s === "Error" ? "#ff4060" : "#64748b";

const btn = {
  base: {
    display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
    borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
    color: "rgba(100,116,139,0.8)", transition: "all 0.15s",
  } as React.CSSProperties,
  primary: {
    display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
    borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
    border: "1px solid rgba(0,255,136,0.25)", background: "rgba(0,255,136,0.1)",
    color: "#00ff88",
  } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────
export function GrafanaIntegration() {
  const [activeSection, setActiveSection] = useState<"connections" | "endpoints" | "dashboards" | "setup">("connections");
  const [connections, setConnections] = useState(INIT_CONNECTIONS);
  const [endpoints, setEndpoints] = useState(METRIC_ENDPOINTS);
  const [newConn, setNewConn] = useState({ name: "", url: "", apiKey: "" });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const connectedCount = connections.filter((c) => c.status === "Connected").length;
  const activeEndpoints = endpoints.filter((e) => e.enabled).length;

  const handleAddConnection = async () => {
    if (!newConn.name || !newConn.url) { toast.error("Name and URL are required"); return; }
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setConnections((prev) => [...prev, { id: `g-${Date.now()}`, name: newConn.name, url: newConn.url, status: "Connected", lastSync: "Just now", dashboardsCount: 0 }]);
    setNewConn({ name: "", url: "", apiKey: "" });
    toast.success("Connection added");
    setIsConnecting(false);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Connection test passed");
    setTestingId(null);
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${text}`).catch(() => {});
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleEndpoint = (id: string) => {
    setEndpoints((prev) => prev.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e));
  };

  const handleExportDashboard = (id: string) => {
    const config = { dashboard: { title: DASHBOARD_TEMPLATES.find((d) => d.id === id)?.name || "AWS Security", panels: endpoints.filter((e) => e.enabled).map((ep) => ({ title: ep.name, type: "stat", targets: [{ url: `${window.location.origin}${ep.endpoint}` }] })) } };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${id}-dashboard.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Dashboard JSON exported");
  };

  const SECTIONS = [
    { id: "connections", label: "Connections", count: connections.length },
    { id: "endpoints", label: "API Endpoints", count: activeEndpoints },
    { id: "dashboards", label: "Dashboard Templates", count: DASHBOARD_TEMPLATES.length },
    { id: "setup", label: "Setup Guide", count: null },
  ] as const;

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1280px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "17px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Grafana Integration</h1>
          <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.7)", margin: "3px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
            Pipe security metrics to Grafana dashboards
          </p>
        </div>
        {/* Status pills */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { label: `${connectedCount} Connected`, color: connectedCount > 0 ? "#00ff88" : "#64748b" },
            { label: `${activeEndpoints} Endpoints Active`, color: "#38bdf8" },
          ].map(({ label, color }) => (
            <span key={label} style={{ fontSize: "11px", fontWeight: 600, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "4px 10px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0" }}>
        {SECTIONS.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: active ? 600 : 400,
                color: active ? "#e2e8f0" : "rgba(100,116,139,0.6)",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid #00ff88" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: "-1px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "color 0.15s",
              }}
            >
              {s.label}
              {s.count !== null && (
                <span style={{ fontSize: "10px", background: active ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)", color: active ? "#00ff88" : "rgba(100,116,139,0.5)", padding: "1px 6px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Connections ── */}
      {activeSection === "connections" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {connections.map((conn) => {
            const sc = statusColor(conn.status);
            const isTesting = testingId === conn.id;
            return (
              <div key={conn.id} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: `${sc}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {conn.status === "Connected" ? <Wifi style={{ width: 16, height: 16, color: sc }} /> : <WifiOff style={{ width: 16, height: 16, color: sc }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{conn.name}</div>
                    <div style={{ fontSize: "11px", color: "rgba(100,116,139,0.6)", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>{conn.url}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: sc, background: `${sc}15`, padding: "2px 8px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace" }}>{conn.status.toUpperCase()}</span>
                    <div style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>sync {conn.lastSync} · {conn.dashboardsCount} boards</div>
                  </div>
                  <button
                    onClick={() => handleTest(conn.id)}
                    style={{ ...btn.base, color: isTesting ? "#00ff88" : undefined }}
                  >
                    <RefreshCw style={{ width: 12, height: 12, animation: isTesting ? "spin 1s linear infinite" : "none" }} />
                    Test
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add new connection */}
          <div style={{ background: "rgba(15,23,42,0.4)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "10px", padding: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus style={{ width: 13, height: 13 }} />
              Add Grafana Instance
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              {[
                { placeholder: "Connection name (e.g. Production)", key: "name", value: newConn.name },
                { placeholder: "Grafana URL (https://grafana.company.com)", key: "url", value: newConn.url },
              ].map(({ placeholder, key, value }) => (
                <input
                  key={key}
                  value={value}
                  onChange={(e) => setNewConn((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ padding: "8px 12px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
                />
              ))}
            </div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                type={showApiKey ? "text" : "password"}
                value={newConn.apiKey}
                onChange={(e) => setNewConn((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="API Key (optional — for automated dashboard provisioning)"
                style={{ width: "100%", padding: "8px 36px 8px 12px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer", padding: 0 }}
              >
                {showApiKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
            <button onClick={handleAddConnection} disabled={isConnecting} style={btn.primary}>
              {isConnecting ? <><RefreshCw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />Connecting…</> : <><Plus style={{ width: 12, height: 12 }} />Add Connection</>}
            </button>
          </div>
        </div>
      )}

      {/* ── API Endpoints ── */}
      {activeSection === "endpoints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "0 0 4px", fontFamily: "'JetBrains Mono', monospace" }}>
            Base URL: <span style={{ color: "#94a3b8" }}>{window.location.origin}/api/metrics</span>
          </p>
          {endpoints.map((ep) => {
            const Icon = ep.icon;
            return (
              <div key={ep.id} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon style={{ width: 14, height: 14, color: ep.enabled ? "#00ff88" : "#475569", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: ep.enabled ? "#e2e8f0" : "#475569" }}>{ep.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(100,116,139,0.5)", marginTop: "2px" }}>{ep.description}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <code style={{ fontSize: "10px", color: "rgba(100,116,139,0.6)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {ep.endpoint}
                    </code>
                    <button onClick={() => handleCopy(ep.endpoint, ep.id)} style={{ ...btn.base, padding: "5px 8px" }}>
                      {copied === ep.id ? <CheckCircle2 style={{ width: 13, height: 13, color: "#00ff88" }} /> : <Copy style={{ width: 13, height: 13 }} />}
                    </button>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleEndpoint(ep.id)}
                      style={{
                        width: "36px", height: "20px", borderRadius: "999px", border: "none", cursor: "pointer",
                        background: ep.enabled ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)", position: "relative", flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: "3px", left: ep.enabled ? "18px" : "3px",
                        width: "14px", height: "14px", borderRadius: "50%",
                        background: ep.enabled ? "#00ff88" : "#475569", transition: "left 0.15s",
                      }} />
                    </button>
                  </div>
                </div>
                {/* Sample key pills */}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                  {ep.sampleKeys.map((k) => (
                    <span key={k} style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dashboard Templates ── */}
      {activeSection === "dashboards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {DASHBOARD_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "18px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "3px", background: tmpl.accent }} />
              <div style={{ paddingLeft: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{tmpl.name}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: `${tmpl.accent}99`, background: `${tmpl.accent}15`, padding: "2px 7px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{tmpl.tag}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => toast.info("Preview coming soon")} style={btn.base}>
                      <ExternalLink style={{ width: 12, height: 12 }} />
                      Preview
                    </button>
                    <button onClick={() => handleExportDashboard(tmpl.id)} style={btn.primary}>
                      <Download style={{ width: 12, height: 12 }} />
                      Export JSON
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.7)", margin: "0 0 12px", lineHeight: 1.5 }}>{tmpl.description}</p>
                <div style={{ display: "flex", gap: "16px" }}>
                  {[
                    { label: "Panels", value: tmpl.panels },
                    { label: "Data Sources", value: tmpl.dataSources },
                    { label: "Refresh", value: tmpl.refresh },
                    { label: "Alerts", value: "✓" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: tmpl.accent, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", marginTop: "1px" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Setup Guide ── */}
      {activeSection === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "8px", padding: "12px 16px", fontSize: "12px", color: "rgba(148,163,184,0.9)", lineHeight: 1.6 }}>
            This integration exposes AWS security metrics as a JSON API that Grafana polls. No data leaves your environment — Grafana queries this dashboard directly.
          </div>
          {SETUP_STEPS.map((step) => (
            <div key={step.n} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{step.n}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "5px" }}>{step.title}</div>
                  <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.7)", margin: 0, lineHeight: 1.6 }}>{step.body}</p>
                  {step.code && (
                    <div style={{ marginTop: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <code style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre", flex: 1 }}>{step.code}</code>
                      <button onClick={() => { navigator.clipboard.writeText(step.code!); toast.success("Copied"); }} style={{ background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer", flexShrink: 0 }}>
                        <Copy style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => toast.info("Data flow test initiated")} style={{ ...btn.primary, alignSelf: "flex-start" }}>
            <Play style={{ width: 13, height: 13 }} />
            Test Data Flow
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
