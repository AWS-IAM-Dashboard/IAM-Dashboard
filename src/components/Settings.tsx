import { useEffect, useState } from "react";
import {
  Cloud,
  Shield,
  Bell,
  Users,
  Settings as SettingsIcon,
  Settings2,
  Save,
  CheckCircle2,
  RefreshCw,
  Slack,
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "./ui/switch";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { AwsAccountConnectionStatus } from "./AwsAccountConnectionStatus";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamMember { id: number; name: string; email: string; role: "Admin" | "Analyst" | "Viewer"; status: "Active" | "Inactive"; lastLogin: string; }

// ─── Static data ─────────────────────────────────────────────────────────────
const TEAM: TeamMember[] = [
  { id: 1, name: "Alice Johnson", email: "alice@company.com", role: "Admin", status: "Active", lastLogin: "2 hours ago" },
  { id: 2, name: "Bob Smith", email: "bob@company.com", role: "Analyst", status: "Active", lastLogin: "4 hours ago" },
  { id: 3, name: "Carol Davis", email: "carol@company.com", role: "Viewer", status: "Inactive", lastLogin: "3 days ago" },
];

const ROLE_PERMS = [
  { role: "Admin", color: "#00ff88", perms: ["Full system access", "User management", "Scan configuration", "All report types", "API key management"] },
  { role: "Analyst", color: "#ffb000", perms: ["Run & view scans", "Create/edit alerts", "View all findings", "Generate reports", "No user management"] },
  { role: "Viewer", color: "#64748b", perms: ["View dashboard only", "Read findings", "Download reports", "No scan execution", "No configuration"] },
];

const memberFieldLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "rgba(100,116,139,0.55)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "6px",
};

const AWS_REGIONS = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"];
const SERVICES = ["IAM & Access", "EC2 & Compute", "S3 & Storage", "VPC & Network", "DynamoDB", "Security Hub", "GuardDuty", "Config", "Inspector", "Macie"];

// ─── Shared sub-components ───────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "8px" }}>
      {children}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 8, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: "11px", color: "rgba(100,116,139,0.6)", marginTop: "4px" }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: "16px" }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(100,116,139,0.7)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'JetBrains Mono', monospace", marginBottom: "4px" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#e2e8f0", fontSize: "12px", outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer", appearance: "none",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function Settings() {
  const [activeSection, setActiveSection] = useState<"aws" | "scans" | "notifications" | "team" | "display">("aws");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // AWS settings
  const [awsProfile, setAwsProfile] = useState("default");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [credentialMethod, setCredentialMethod] = useState<"profile" | "keys" | "role">("profile");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "ok" | "fail">("idle");

  // Scan settings
  const [scanSchedule, setScanSchedule] = useState("off");
  const [minSeverity, setMinSeverity] = useState("low");
  const [enabledServices, setEnabledServices] = useState(new Set(SERVICES));
  const [scanDepth, setScanDepth] = useState("standard");

  // Notification settings
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifHigh, setNotifHigh] = useState(true);
  const [notifMedium, setNotifMedium] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddr, setEmailAddr] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [pagerEnabled, setPagerEnabled] = useState(false);
  const [pagerKey, setPagerKey] = useState("");
  const [showPager, setShowPager] = useState(false);

  // Team
  const [team, setTeam] = useState(TEAM);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"Analyst" | "Viewer">("Analyst");

  // Display
  const [density, setDensity] = useState("comfortable");
  const [timezone, setTimezone] = useState("browser");
  const [dateFormat, setDateFormat] = useState("relative");

  const handleTestConnection = async () => {
    setIsTesting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsTesting(false);
    setConnectionStatus("ok");
    toast.success("AWS connection verified", { description: `Region: ${awsRegion}` });
  };

  const handleSave = () => toast.success("Settings saved");

  const SECTIONS = [
    { id: "aws", label: "AWS Account", shortLabel: "AWS", icon: Cloud },
    { id: "scans", label: "Scan Settings", shortLabel: "Scans", icon: Shield },
    { id: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
    { id: "team", label: "Team & Access", shortLabel: "Team", icon: Users },
    { id: "display", label: "Display", shortLabel: "UI", icon: Settings2 },
  ] as const;

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden pb-6">
      {/* No fixed height — lets <main> (overflow-y-auto) scroll the page; nested height:100% + overflow:auto was trapping scroll */}

      {/* ── Page header ── */}
      <div className="p-3 sm:px-6 sm:pt-6">
        <ScanPageHeader
          icon={<SettingsIcon size={20} color="#00ff88" />}
          iconColor="#00ff88"
          title="Settings"
          subtitle="Configure your AWS environment, scan preferences, and team access"
        />
      </div>

      {/* ── Body (nav + content) ── */}
      <div className="flex min-h-0 min-w-0 flex-col md:flex-row">

      {/* ── Left nav ── */}
      <div style={{ width: isMobile ? "100%" : "200px", flexShrink: 0, padding: isMobile ? "0 12px 12px" : "24px 0 24px 24px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "12px", paddingLeft: "12px" }}>Sections</div>
        <nav
          className={isMobile ? "grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap" : "flex flex-col"}
          style={{ gap: isMobile ? undefined : "2px" }}
        >
          {SECTIONS.map(({ id, label, shortLabel, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", justifyContent: isMobile ? "center" : undefined, width: isMobile ? "100%" : undefined, minWidth: 0, padding: "8px 12px", borderRadius: "6px",
                  background: active ? "rgba(0,255,136,0.07)" : "transparent",
                  border: active ? "1px solid rgba(0,255,136,0.12)" : "1px solid transparent",
                  borderLeft: active ? "3px solid #00ff88" : "3px solid transparent",
                  color: active ? "#00ff88" : "rgba(100,116,139,0.8)",
                  fontSize: "12px", fontWeight: active ? 600 : 400, cursor: "pointer", textAlign: isMobile ? "center" : "left",
                  transition: "all 0.12s",
                }}
              >
                <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Content area ── */}
      <div className="min-w-0 flex-1" style={{ padding: isMobile ? "12px" : "24px" }}>

        {/* ── AWS Account ── */}
        {activeSection === "aws" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>AWS Account</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Configure how the dashboard connects to your AWS environment</p>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Account Configuration</SectionLabel>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Default Region">
                  <select value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} style={selectStyle}>
                    {AWS_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="AWS Profile Name">
                  <input value={awsProfile} onChange={(e) => setAwsProfile(e.target.value)} placeholder="default" style={inputStyle} />
                </Field>
              </div>
            </div>

            <div className="min-w-0 max-w-full rounded-[10px] border border-white/[0.06] bg-[rgba(15,23,42,0.8)] p-3 sm:p-4">
              <SectionLabel>Credential Method</SectionLabel>
              <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-2">
                {[["profile", "AWS Profile"], ["keys", "Access Keys"], ["role", "IAM Role"]].map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCredentialMethod(val as any)}
                    className="w-full min-w-0 shrink-0 rounded-md px-3 py-2.5 text-center text-[12px] font-medium sm:flex-1 sm:px-4 sm:py-2"
                    style={{
                      background: credentialMethod === val ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.03)",
                      border: credentialMethod === val ? "1px solid rgba(0,255,136,0.25)" : "1px solid rgba(255,255,255,0.07)",
                      color: credentialMethod === val ? "#00ff88" : "rgba(100,116,139,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {credentialMethod === "keys" && (
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Access Key ID">
                    <input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="AKIA_REDACTED_FOR_DEMO" style={inputStyle} />
                  </Field>
                  <Field label="Secret Access Key">
                    <div style={{ position: "relative" }}>
                      <input type={showSecret ? "text" : "password"} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="wJalrXUtnFEMI/K7MDENG..." style={{ ...inputStyle, paddingRight: "32px" }} />
                      <button type="button" onClick={() => setShowSecret((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer" }}>
                        {showSecret ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                  </Field>
                </div>
              )}

              {credentialMethod === "role" && (
                <Field label="IAM Role ARN">
                  <input value={roleArn} onChange={(e) => setRoleArn(e.target.value)} placeholder="arn:aws:iam::123456789012:role/SecurityDashboardRole" style={inputStyle} />
                </Field>
              )}

              {credentialMethod === "profile" && (
                <div className="break-words rounded-md bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-slate-500 sm:text-[12px]">
                  Uses credentials from <code className="break-all font-mono text-slate-400">~/.aws/credentials</code> — profile: <code className="break-all font-mono text-slate-400">{awsProfile || "default"}</code>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="mt-4 flex w-full min-w-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[12px] font-semibold sm:inline-flex sm:w-auto"
                style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: connectionStatus === "ok" ? "#00ff88" : "#94a3b8" }}
              >
                {isTesting ? <><RefreshCw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />Testing…</> : connectionStatus === "ok" ? <><CheckCircle2 style={{ width: 12, height: 12 }} />Connected</> : <><Key style={{ width: 12, height: 12 }} />Test Connection</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Scan Settings ── */}
        {activeSection === "scans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Scan Settings</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Control scan scheduling, scope, and detection sensitivity</p>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Schedule</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" style={{ marginBottom: "16px" }}>
                {[["off", "Manual only"], ["daily", "Daily — 02:00 UTC"], ["weekly", "Weekly — Mon 02:00"]] .map(([val, lbl]) => (
                  <button key={val} onClick={() => setScanSchedule(val)} style={{ padding: "12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", background: scanSchedule === val ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.04)", border: scanSchedule === val ? "1px solid rgba(0,255,136,0.2)" : "1px solid rgba(255,255,255,0.06)", color: scanSchedule === val ? "#00ff88" : "rgba(100,116,139,0.7)", fontWeight: scanSchedule === val ? 600 : 400 }}>
                    <div style={{ marginBottom: "4px" }}>{val === "off" ? "Off" : val === "daily" ? "Daily" : "Weekly"}</div>
                    <div style={{ fontSize: "10px", opacity: 0.7 }}>{lbl}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Minimum Severity to Report">
                  <select value={minSeverity} onChange={(e) => setMinSeverity(e.target.value)} style={selectStyle}>
                    <option value="critical">Critical only</option>
                    <option value="high">High and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="low">All (Low and above)</option>
                  </select>
                </Field>
                <Field label="Scan Depth">
                  <select value={scanDepth} onChange={(e) => setScanDepth(e.target.value)} style={selectStyle}>
                    <option value="quick">Quick (key services only)</option>
                    <option value="standard">Standard</option>
                    <option value="deep">Deep (all resources)</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Services in Scope</SectionLabel>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {SERVICES.map((svc) => {
                  const on = enabledServices.has(svc);
                  return (
                    <button
                      key={svc}
                      onClick={() => setEnabledServices((prev) => { const next = new Set(prev); on ? next.delete(svc) : next.add(svc); return next; })}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", background: on ? "rgba(0,255,136,0.05)" : "transparent", border: on ? "1px solid rgba(0,255,136,0.12)" : "1px solid rgba(255,255,255,0.04)", color: on ? "#94a3b8" : "rgba(71,85,105,0.7)", textAlign: "left" }}
                    >
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: on ? "#00ff88" : "rgba(71,85,105,0.4)", flexShrink: 0 }} />
                      {svc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {activeSection === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Notifications</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Configure alert channels and severity thresholds</p>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Alert Thresholds</SectionLabel>
              <Row label="Critical findings" desc="Immediate alert on any critical severity finding">
                <Switch checked={notifCritical} onCheckedChange={setNotifCritical} />
              </Row>
              <Row label="High findings" desc="Alert when high severity findings are detected">
                <Switch checked={notifHigh} onCheckedChange={setNotifHigh} />
              </Row>
              <Row label="Medium findings" desc="Can be noisy — recommended for compliance reviews">
                <Switch checked={notifMedium} onCheckedChange={setNotifMedium} />
              </Row>
            </div>

            {/* Email */}
            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail style={{ width: 14, height: 14, color: emailEnabled ? "#00ff88" : "#475569" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Email</span>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              {emailEnabled && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Alert email address">
                    <input value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} placeholder="security-team@company.com" type="email" style={inputStyle} />
                  </Field>
                  <Field label="Frequency">
                    <select style={selectStyle} defaultValue="immediate">
                      <option value="immediate">Immediate</option>
                      <option value="hourly">Hourly digest</option>
                      <option value="daily">Daily summary</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>

            {/* Slack */}
            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Slack style={{ width: 14, height: 14, color: slackEnabled ? "#00ff88" : "#475569" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Slack</span>
                </div>
                <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
              </div>
              {slackEnabled && (
                <Field label="Webhook URL">
                  <input value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/…" style={inputStyle} />
                </Field>
              )}
            </div>

            {/* PagerDuty */}
            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: pagerEnabled ? "#ff6b35" : "#475569" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>PagerDuty</span>
                  <span style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" }}>Critical only</span>
                </div>
                <Switch checked={pagerEnabled} onCheckedChange={setPagerEnabled} />
              </div>
              {pagerEnabled && (
                <Field label="Integration Key">
                  <div style={{ position: "relative" }}>
                    <input type={showPager ? "text" : "password"} value={pagerKey} onChange={(e) => setPagerKey(e.target.value)} placeholder="32-character integration key" style={{ ...inputStyle, paddingRight: "32px" }} />
                    <button onClick={() => setShowPager((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer" }}>
                      {showPager ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ── Team & Access ── */}
        {activeSection === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Team & Access</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "10px 0 0", lineHeight: 1.5 }}>Manage team members and role-based access</p>
            </div>

            <AwsAccountConnectionStatus />

            {/* Members table */}
            <div className="min-w-0 overflow-x-hidden" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Members</span>
                <span style={{ fontSize: "11px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>{team.filter((m) => m.status === "Active").length} active</span>
              </div>
              {/* Header — desktop only */}
              {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px max-content 90px 110px 40px", columnGap: "16px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["Name / Email", "Last Login", "Role", "Status", "", ""].map((h, i) => (
                  <span key={i} style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.4 }}>{h}</span>
                ))}
              </div>
              )}
              {team.map((m) => {
                const roleColor: Record<string, string> = { Admin: "#00ff88", Analyst: "#ffb000", Viewer: "#64748b" };
                return isMobile ? (
                  <div key={m.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={memberFieldLabelStyle}>Member</div>
                        <div style={{ fontSize: "12px", fontWeight: 500, color: "#cbd5e1", overflowWrap: "anywhere", lineHeight: 1.45 }}>{m.name}</div>
                        <div style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace", marginTop: 8, lineHeight: 1.45 }}>{m.email}</div>
                      </div>
                      <button type="button" onClick={() => setTeam((p) => p.filter((u) => u.id !== m.id))} style={{ background: "none", border: "none", color: "rgba(100,116,139,0.3)", cursor: "pointer", padding: "4px", borderRadius: "4px", flexShrink: 0 }} aria-label={`Remove ${m.name}`}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    <div>
                      <div style={memberFieldLabelStyle}>Last login</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "rgba(100,116,139,0.65)", fontFamily: "'JetBrains Mono', monospace" }}>
                        <Clock style={{ width: 11, height: 11, flexShrink: 0 }} />{m.lastLogin}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={memberFieldLabelStyle}>Role</div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: roleColor[m.role], background: `${roleColor[m.role]}15`, padding: "4px 10px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace" }}>{m.role}</span>
                          <select
                            value={m.role}
                            onChange={(e) => setTeam((prev) => prev.map((u) => u.id === m.id ? { ...u, role: e.target.value as any } : u))}
                            style={{ ...selectStyle, width: "100%", maxWidth: 200, fontSize: "11px", padding: "6px 10px" }}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Analyst">Analyst</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div style={memberFieldLabelStyle}>Status</div>
                        <div style={{ fontSize: "11px", color: m.status === "Active" ? "#00ff88" : "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{m.status}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px max-content 90px 110px 40px", columnGap: "16px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "#cbd5e1", lineHeight: 1.45 }}>{m.name}</div>
                      <div style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace", marginTop: 6, lineHeight: 1.45 }}>{m.email}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <Clock style={{ width: 11, height: 11 }} />{m.lastLogin}
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: roleColor[m.role], background: `${roleColor[m.role]}15`, padding: "2px 8px", borderRadius: "999px", fontFamily: "'JetBrains Mono', monospace", display: "inline-block", whiteSpace: "nowrap", width: "fit-content" }}>{m.role}</span>
                    <span style={{ fontSize: "10px", color: m.status === "Active" ? "#00ff88" : "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{m.status}</span>
                    <select
                      value={m.role}
                      onChange={(e) => setTeam((prev) => prev.map((u) => u.id === m.id ? { ...u, role: e.target.value as any } : u))}
                      style={{ ...selectStyle, width: "100px", fontSize: "11px", padding: "4px 8px" }}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <button type="button" onClick={() => setTeam((p) => p.filter((u) => u.id !== m.id))} style={{ background: "none", border: "none", color: "rgba(100,116,139,0.3)", cursor: "pointer", padding: "4px", borderRadius: "4px" }} aria-label={`Remove ${m.name}`}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                );
              })}
              {/* Invite row */}
              <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: isMobile ? 12 : 10 }}>
                <div style={memberFieldLabelStyle}>Invite member</div>
                <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", gap: "12px", flexWrap: "wrap" }}>
                  <input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Invite by email address" style={{ ...inputStyle, flex: "1 1 200px", minWidth: 0 }} />
                  <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as any)} style={{ ...selectStyle, width: isMobile ? "100%" : "110px", maxWidth: "100%" }}>
                    <option value="Analyst">Analyst</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => { if (!newMemberEmail) return; setTeam((p) => [...p, { id: Date.now(), name: newMemberEmail.split("@")[0], email: newMemberEmail, role: newMemberRole, status: "Active", lastLogin: "Never" }]); setNewMemberEmail(""); toast.success("Invitation sent"); }}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "6px", color: "#00ff88", fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0, width: isMobile ? "100%" : undefined, justifyContent: "center" }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />Invite
                  </button>
                </div>
              </div>
            </div>

            {/* Role permissions */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {ROLE_PERMS.map(({ role, color, perms }) => (
                <div key={role} style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color }} />
                  <div style={{ fontSize: "12px", fontWeight: 700, color, marginBottom: "12px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>{role.toUpperCase()}</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {perms.map((p) => (
                      <li key={p} style={{ fontSize: "11px", color: "rgba(100,116,139,0.75)", display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.5 }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, opacity: 0.5, flexShrink: 0, marginTop: "5px" }} />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Display ── */}
        {activeSection === "display" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Display</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Adjust how the dashboard presents information to you</p>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Interface</SectionLabel>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Table density">
                  <select value={density} onChange={(e) => setDensity(e.target.value)} style={selectStyle}>
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </Field>
                <Field label="Theme">
                  <select style={selectStyle} defaultValue="dark">
                    <option value="dark">Dark (default)</option>
                    <option value="darker">Darker</option>
                  </select>
                </Field>
                <Field label="Timestamp format">
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} style={selectStyle}>
                    <option value="relative">Relative (2 hours ago)</option>
                    <option value="absolute">Absolute (2026-03-24 14:00)</option>
                    <option value="iso">ISO 8601</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectStyle}>
                    <option value="browser">Browser local time</option>
                    <option value="utc">UTC</option>
                    <option value="us-east">America/New_York</option>
                    <option value="us-west">America/Los_Angeles</option>
                    <option value="eu-london">Europe/London</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>About</SectionLabel>
              {[["Version", "v2.5.0"], ["Build", "20260324.0900"], ["Environment", "Production"], ["Last scan", "Today, 02:00 UTC"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)" }}>{k}</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Save bar ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => toast.info("Reset to defaults")} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "rgba(100,116,139,0.7)", fontSize: "12px", cursor: "pointer" }}>
            Reset
          </button>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: "6px", color: "#00ff88", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            <Save style={{ width: 13, height: 13 }} />
            Save Settings
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>{/* end body flex */}
    </div>
  );
}
