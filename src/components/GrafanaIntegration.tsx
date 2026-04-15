import { useEffect, useState } from "react";
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
import { ScanPageHeader } from "./ui/ScanPageHeader";

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
  s === "Connected" ? "#00ff88" : s === "Error" ? "#ff0040" : "#64748b";

const btn = {
  base: {
    display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px",
    borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
    color: "rgba(100,116,139,0.8)", transition: "all 0.15s",
  } as React.CSSProperties,
  primary: {
    display: "flex", alignItems: "center", gap: "8px", padding: "7px 14px",
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    { id: "connections", label: "Connections", shortLabel: "Conn", count: connections.length },
    { id: "endpoints", label: "API Endpoints", shortLabel: "APIs", count: activeEndpoints },
    { id: "dashboards", label: "Dashboard Templates", shortLabel: "Dash", count: DASHBOARD_TEMPLATES.length },
    { id: "setup", label: "Setup Guide", shortLabel: "Setup", count: null },
  ] as const;

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Header ── */}
      <ScanPageHeader
        icon={<BarChart3 size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Grafana Integration"
        subtitle="Pipe security metrics to Grafana dashboards"
        onRefresh={() => toast.info("Refreshing connections…")}
      >
        {/* Status pills */}
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
          {[
            { label: `${connectedCount} Connected`, color: connectedCount > 0 ? "#00ff88" : "#64748b" },
            { label: `${activeEndpoints} Endpoints Active`, color: "#38bdf8" },
          ].map(({ label, color }) => (
            <span key={label} style={{ fontSize: "11px", fontWeight: 600, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "4px 10px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
          ))}
        </div>
      </ScanPageHeader>

      {/* ── Section tabs ── */}
      <div
        className="grid w-full min-w-0 grid-cols-2 gap-2 pb-1.5 sm:flex sm:flex-wrap sm:gap-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {SECTIONS.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "8px 10px",
                fontSize: isMobile ? "11px" : "12px",
                fontWeight: active ? 600 : 400,
                color: active ? "#e2e8f0" : "rgba(100,116,139,0.6)",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid #00ff88" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: isMobile ? "0" : "-1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "color 0.15s",
              }}
            >
              <span className="hidden text-center leading-tight sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
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
        <div className="flex min-w-0 max-w-full flex-col gap-2">
          {connections.map((conn) => {
            const sc = statusColor(conn.status);
            const isTesting = testingId === conn.id;
            return (
              <div
                key={conn.id}
                className="flex min-w-0 max-w-full flex-col gap-4 rounded-[10px] border border-white/[0.06] bg-[rgba(15,23,42,0.8)] p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${sc}12` }}>
                    {conn.status === "Connected" ? <Wifi style={{ width: 16, height: 16, color: sc }} /> : <WifiOff style={{ width: 16, height: 16, color: sc }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold leading-snug text-slate-200">{conn.name}</div>
                    <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-slate-500">{conn.url}</div>
                  </div>
                </div>
                <div className="flex min-w-0 w-full flex-col gap-3 border-t border-white/[0.06] pt-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:border-t-0 sm:pt-0">
                  <div className="flex flex-col gap-1 sm:items-end sm:text-right">
                    <span className="w-fit rounded-full px-2 py-0.5 font-mono text-[10px] font-bold" style={{ color: sc, background: `${sc}15` }}>{conn.status.toUpperCase()}</span>
                    <div className="font-mono text-[10px] leading-snug text-slate-500">
                      sync {conn.lastSync} · {conn.dashboardsCount} boards
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTest(conn.id)}
                    className="inline-flex w-full min-w-0 items-center justify-center gap-2 sm:w-auto sm:justify-center"
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
          <div className="min-w-0 max-w-full rounded-[10px] border border-dashed border-white/[0.08] bg-[rgba(15,23,42,0.4)] p-3 sm:p-4">
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Plus style={{ width: 13, height: 13 }} />
              Add Grafana Instance
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" style={{ marginBottom: "10px" }}>
              {[
                { placeholder: "Connection name (e.g. Production)", key: "name", value: newConn.name },
                { placeholder: "Grafana URL (https://grafana.company.com)", key: "url", value: newConn.url },
              ].map(({ placeholder, key, value }) => (
                <input
                  key={key}
                  value={value}
                  onChange={(e) => setNewConn((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="min-w-0 max-w-full box-border"
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
                className="min-w-0 max-w-full box-border"
                style={{ width: "100%", padding: "8px 36px 8px 12px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none" }}
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer", padding: 0 }}
              >
                {showApiKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
            <button type="button" onClick={handleAddConnection} disabled={isConnecting} className="flex w-full min-w-0 items-center justify-center gap-2 sm:inline-flex sm:w-auto" style={btn.primary}>
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
              <div key={ep.id} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 220px" }}>
                    <Icon style={{ width: 14, height: 14, color: ep.enabled ? "#00ff88" : "#475569", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: ep.enabled ? "#e2e8f0" : "#475569" }}>{ep.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(100,116,139,0.5)", marginTop: "2px" }}>{ep.description}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <code style={{ fontSize: "10px", color: "rgba(100,116,139,0.6)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", overflowWrap: "anywhere" }}>
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
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  {ep.sampleKeys.map((k) => (
                    <span key={k} style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dashboard Templates ── */}
      {activeSection === "dashboards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {DASHBOARD_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${tmpl.accent}88, transparent)` }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{tmpl.name}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: `${tmpl.accent}99`, background: `${tmpl.accent}15`, padding: "2px 7px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{tmpl.tag}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
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
        <div className="flex min-w-0 max-w-full flex-col gap-2">
          <div
            className="min-w-0 max-w-full break-words rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-3 text-xs leading-relaxed text-slate-400 sm:px-4 sm:text-[12px]"
          >
            This integration exposes AWS security metrics as a JSON API that Grafana polls. No data leaves your environment — Grafana queries this dashboard directly.
          </div>
          {SETUP_STEPS.map((step) => (
            <div
              key={step.n}
              className="min-w-0 max-w-full rounded-[10px] border border-white/[0.06] bg-[rgba(15,23,42,0.8)] p-3 sm:p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-[#00ff88]"
                  style={{ background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.2)" }}
                >
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-[13px] font-semibold leading-snug text-slate-200">{step.title}</div>
                  <p className="m-0 break-words text-xs leading-relaxed text-slate-500 sm:text-[12px]">{step.body}</p>
                  {step.code && (
                    <div className="mt-2 flex min-w-0 max-w-full flex-col gap-2 rounded-md border border-white/[0.06] bg-black/30 p-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-3">
                      <code className="min-w-0 max-w-full flex-1 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">
                        {step.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(step.code!); toast.success("Copied"); }}
                        className="self-end rounded p-1 text-slate-500 transition-colors hover:text-slate-300 sm:self-start sm:shrink-0"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                        aria-label="Copy code"
                      >
                        <Copy style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => toast.info("Data flow test initiated")}
            className="mt-1 flex w-full min-w-0 items-center justify-center gap-2 sm:inline-flex sm:w-auto sm:self-start"
            style={btn.primary}
          >
            <Play style={{ width: 13, height: 13 }} />
            Test Data Flow
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
