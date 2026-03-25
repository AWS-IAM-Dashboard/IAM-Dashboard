import { useState } from "react";
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

const AWS_REGIONS = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"];
const SERVICES = ["IAM & Access", "EC2 & Compute", "S3 & Storage", "VPC & Network", "DynamoDB", "Security Hub", "GuardDuty", "Config", "Inspector", "Macie"];

// ─── Shared sub-components ───────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "8px" }}>
      {children}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
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
    { id: "aws", label: "AWS Account", icon: Cloud },
    { id: "scans", label: "Scan Settings", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "team", label: "Team & Access", icon: Users },
    { id: "display", label: "Display", icon: Settings2 },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Page header ── */}
      <div style={{ padding: "24px 24px 0" }}>
        <ScanPageHeader
          icon={<SettingsIcon size={20} color="#00ff88" />}
          iconColor="#00ff88"
          title="Settings"
          subtitle="Configure your AWS environment, scan preferences, and team access"
        />
      </div>

      {/* ── Body (nav + content) ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

      {/* ── Left nav ── */}
      <div style={{ width: "200px", flexShrink: 0, padding: "24px 0 24px 24px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: "12px", paddingLeft: "12px" }}>Sections</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "7px",
                  background: active ? "rgba(0,255,136,0.07)" : "transparent",
                  border: active ? "1px solid rgba(0,255,136,0.12)" : "1px solid transparent",
                  color: active ? "#00ff88" : "rgba(71,85,105,0.95)",
                  fontSize: "12px", fontWeight: active ? 600 : 400, cursor: "pointer", textAlign: "left",
                  transition: "all 0.12s",
                }}
              >
                <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, padding: "24px", overflow: "auto" }}>

        {/* ── AWS Account ── */}
        {activeSection === "aws" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>AWS Account</h2>
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Configure how the dashboard connects to your AWS environment</p>
            </div>

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Account Configuration</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Credential Method</SectionLabel>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {[["profile", "AWS Profile"], ["keys", "Access Keys"], ["role", "IAM Role"]] .map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setCredentialMethod(val as any)}
                    style={{
                      padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                      background: credentialMethod === val ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.03)",
                      border: credentialMethod === val ? "1px solid rgba(0,255,136,0.25)" : "1px solid rgba(255,255,255,0.07)",
                      color: credentialMethod === val ? "#00ff88" : "rgba(100,116,139,0.7)",
                    }}
                  >{lbl}</button>
                ))}
              </div>

              {credentialMethod === "keys" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Access Key ID">
                    <input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" style={inputStyle} />
                  </Field>
                  <Field label="Secret Access Key">
                    <div style={{ position: "relative" }}>
                      <input type={showSecret ? "text" : "password"} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="wJalrXUtnFEMI/K7MDENG..." style={{ ...inputStyle, paddingRight: "32px" }} />
                      <button onClick={() => setShowSecret((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(100,116,139,0.5)", cursor: "pointer" }}>
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
                <div style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  Uses credentials from <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>~/.aws/credentials</code> — profile: <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>{awsProfile || "default"}</code>
                </div>
              )}

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: connectionStatus === "ok" ? "#00ff88" : "#94a3b8" }}
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Schedule</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                {[["off", "Manual only"], ["daily", "Daily — 02:00 UTC"], ["weekly", "Weekly — Mon 02:00"]] .map(([val, lbl]) => (
                  <button key={val} onClick={() => setScanSchedule(val)} style={{ padding: "12px", borderRadius: "7px", fontSize: "12px", cursor: "pointer", background: scanSchedule === val ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.02)", border: scanSchedule === val ? "1px solid rgba(0,255,136,0.2)" : "1px solid rgba(255,255,255,0.06)", color: scanSchedule === val ? "#00ff88" : "rgba(100,116,139,0.7)", fontWeight: scanSchedule === val ? 600 : 400 }}>
                    <div style={{ marginBottom: "4px" }}>{val === "off" ? "Off" : val === "daily" ? "Daily" : "Weekly"}</div>
                    <div style={{ fontSize: "10px", opacity: 0.7 }}>{lbl}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Services in Scope</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px" }}>
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
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
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail style={{ width: 14, height: 14, color: emailEnabled ? "#00ff88" : "#475569" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Email</span>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              {emailEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
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
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
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
              <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)", margin: "4px 0 0" }}>Manage team members and role-based access</p>
            </div>

            {/* Members table */}
            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Members</span>
                <span style={{ fontSize: "11px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>{team.filter((m) => m.status === "Active").length} active</span>
              </div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px max-content 90px 110px 40px", columnGap: "12px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["Name / Email", "Last Login", "Role", "Status", "", ""].map((h, i) => (
                  <span key={i} style={{ fontSize: "10px", fontWeight: 600, color: "rgba(100,116,139,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{h}</span>
                ))}
              </div>
              {team.map((m) => {
                const roleColor: Record<string, string> = { Admin: "#00ff88", Analyst: "#ffb000", Viewer: "#64748b" };
                return (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px max-content 90px 110px 40px", columnGap: "12px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "#cbd5e1" }}>{m.name}</div>
                      <div style={{ fontSize: "10px", color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>{m.email}</div>
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
                    <button onClick={() => setTeam((p) => p.filter((u) => u.id !== m.id))} style={{ background: "none", border: "none", color: "rgba(100,116,139,0.3)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                );
              })}
              {/* Invite row */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px" }}>
                <input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Invite by email address" style={{ ...inputStyle, flex: 1 }} />
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as any)} style={{ ...selectStyle, width: "110px" }}>
                  <option value="Analyst">Analyst</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button
                  onClick={() => { if (!newMemberEmail) return; setTeam((p) => [...p, { id: Date.now(), name: newMemberEmail.split("@")[0], email: newMemberEmail, role: newMemberRole, status: "Active", lastLogin: "Never" }]); setNewMemberEmail(""); toast.success("Invitation sent"); }}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "6px", color: "#00ff88", fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                >
                  <Plus style={{ width: 12, height: 12 }} />Invite
                </button>
              </div>
            </div>

            {/* Role permissions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {ROLE_PERMS.map(({ role, color, perms }) => (
                <div key={role} style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color }} />
                  <div style={{ fontSize: "12px", fontWeight: 700, color, marginBottom: "8px", fontFamily: "'JetBrains Mono', monospace" }}>{role.toUpperCase()}</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {perms.map((p) => (
                      <li key={p} style={{ fontSize: "11px", color: "rgba(100,116,139,0.7)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, opacity: 0.5, flexShrink: 0 }} />{p}
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>Interface</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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

            <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
              <SectionLabel>About</SectionLabel>
              {[["Version", "v2.5.0"], ["Build", "20260324.0900"], ["Environment", "Production"], ["Last scan", "Today, 02:00 UTC"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: "12px", color: "rgba(100,116,139,0.6)" }}>{k}</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Save bar ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
