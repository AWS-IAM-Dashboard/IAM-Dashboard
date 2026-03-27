import { useState, useEffect } from "react";
import { Settings, Save, RotateCcw, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from "lucide-react";
import type { SOCConfig, SOCThreshold, RoutingRule, EscalationPath, AlertSeverity } from "./types";
import { DEFAULT_SOC_CONFIG } from "./mockData";
import { mono, ls, divider, SEV_COLOR, BackendHandoff, ModuleHeader } from "./shared";

const STORAGE_KEY = "soc_config_v1";

function loadConfig(): SOCConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SOCConfig;
  } catch {}
  return DEFAULT_SOC_CONFIG;
}

function saveConfig(cfg: SOCConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cfg, updated_at: new Date().toISOString() }));
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const c = SEV_COLOR[severity];
  return (
    <span style={{ ...mono, fontSize: 9, padding: "0 8px", borderRadius: 999, background: `${c}14`, border: `1px solid ${c}28`, color: c, fontWeight: 700 }}>{severity}</span>
  );
}

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)", marginBottom: 10 }}>
      <button
        onClick={() => setOpen(x => !x)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "none", cursor: "pointer" }}
      >
        {open ? <ChevronDown size={13} color="rgba(100,116,139,0.5)" /> : <ChevronRight size={13} color="rgba(100,116,139,0.5)" />}
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#e2e8f0", flex: 1, textAlign: "left" }}>{title}</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

function NumField({ label, value, onChange, unit, min = 0 }: { label: string; value: number; onChange: (v: number) => void; unit?: string; min?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ ...ls, fontSize: 9 }}>{label}{unit ? ` (${unit})` : ""}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ ...mono, fontSize: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "5px 8px", color: "#e2e8f0", outline: "none", width: "100%" }}
      />
    </div>
  );
}

export function SOCConfig() {
  const [config, setConfig] = useState<SOCConfig>(loadConfig);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function update(fn: (c: SOCConfig) => SOCConfig) {
    setConfig(prev => fn(prev));
    setDirty(true);
    setSaved(false);
  }

  function handleSave() {
    saveConfig(config);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setConfig(DEFAULT_SOC_CONFIG);
    setDirty(true);
  }

  function updateThreshold(severity: AlertSeverity, field: keyof SOCThreshold, value: number | boolean) {
    update(c => ({
      ...c,
      thresholds: c.thresholds.map(t => t.severity === severity ? { ...t, [field]: value } : t),
    }));
  }

  function updateRoutingRule(id: string, field: keyof RoutingRule, value: string | number | boolean) {
    update(c => ({
      ...c,
      routing_rules: c.routing_rules.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  }

  function deleteRoutingRule(id: string) {
    update(c => ({ ...c, routing_rules: c.routing_rules.filter(r => r.id !== id) }));
  }

  function addRoutingRule() {
    const id = `rr-${Date.now()}`;
    update(c => ({
      ...c,
      routing_rules: [...c.routing_rules, { id, name: "New Rule", condition: "", destination_team: "", channel: "", priority: c.routing_rules.length + 1, enabled: true }],
    }));
  }

  function updateRetention(key: string, value: number) {
    update(c => ({ ...c, retention: { ...c.retention, [key]: value } }));
  }

  // Persist on every config change (auto-save to localStorage)
  useEffect(() => {
    if (dirty) saveConfig(config);
  }, [config, dirty]);

  return (
    <div>
      <ModuleHeader
        icon={<Settings size={16} color="#94a3b8" />}
        title="SOC Configuration"
        subtitle="SLA thresholds, alert routing, escalation paths, and log retention policies. Auto-saved to localStorage."
        live={false}
      />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", borderRadius: 8, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", flex: 1 }}>
          Last saved: {config.updated_at ? new Date(config.updated_at).toLocaleString() : "—"}
        </span>
        {dirty && <span style={{ ...mono, fontSize: 9, color: "#ffb000" }}>Unsaved changes</span>}
        <button
          onClick={handleReset}
          className="soc-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.6)", ...mono, fontSize: 10, cursor: "pointer" }}
        >
          <RotateCcw size={10} /> Reset to defaults
        </button>
        <button
          onClick={handleSave}
          className="soc-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 5, background: saved ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.08)", border: `1px solid ${saved ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.2)"}`, color: "#00ff88", ...mono, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
        >
          <Save size={10} /> {saved ? "Saved!" : "Save Config"}
        </button>
      </div>

      {/* SLA Thresholds */}
      <Section title="SLA & Auto-Escalation Thresholds" defaultOpen>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          {config.thresholds.map(t => (
            <div key={t.severity} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${SEV_COLOR[t.severity]}18` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <SeverityBadge severity={t.severity} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  <span style={{ ...ls, fontSize: 9 }}>Page On-Call</span>
                  <button
                    onClick={() => updateThreshold(t.severity, "page_oncall", !t.page_oncall)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: t.page_oncall ? "#00ff88" : "rgba(100,116,139,0.35)", display: "flex", alignItems: "center" }}
                  >
                    {t.page_oncall ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <NumField label="SLA" value={t.sla_hours} unit="hours" onChange={v => updateThreshold(t.severity, "sla_hours", v)} min={1} />
                <NumField label="Auto-Escalate After" value={t.auto_escalate_hours} unit="hours" onChange={v => updateThreshold(t.severity, "auto_escalate_hours", v)} min={1} />
                <NumField label="Suppress Duplicate" value={t.auto_suppress_duplicate_hours} unit="hours" onChange={v => updateThreshold(t.severity, "auto_suppress_duplicate_hours", v)} min={0} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Routing Rules */}
      <Section title="Alert Routing Rules">
        <div style={{ marginTop: 8 }}>
          {config.routing_rules.map((rule, idx) => (
            <div key={rule.id} style={{ padding: "10px 12px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,${rule.enabled ? "0.07" : "0.03"})`, marginBottom: 8, opacity: rule.enabled ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", minWidth: 18 }}>#{idx + 1}</span>
                <input
                  value={rule.name}
                  onChange={e => updateRoutingRule(rule.id, "name", e.target.value)}
                  style={{ ...mono, fontSize: 11, fontWeight: 700, background: "none", border: "none", outline: "none", color: "#e2e8f0", flex: 1 }}
                />
                <button
                  onClick={() => updateRoutingRule(rule.id, "enabled", !rule.enabled)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: rule.enabled ? "#00ff88" : "rgba(100,116,139,0.3)", display: "flex", alignItems: "center" }}
                  title={rule.enabled ? "Disable" : "Enable"}
                >
                  {rule.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => deleteRoutingRule(rule.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(100,116,139,0.35)", display: "flex", alignItems: "center" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ ...ls, fontSize: 8, marginBottom: 3 }}>Condition</div>
                  <input
                    value={rule.condition}
                    onChange={e => updateRoutingRule(rule.id, "condition", e.target.value)}
                    style={{ ...mono, fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "4px 7px", color: "#94a3b8", outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <div style={{ ...ls, fontSize: 8, marginBottom: 3 }}>Team</div>
                  <input
                    value={rule.destination_team}
                    onChange={e => updateRoutingRule(rule.id, "destination_team", e.target.value)}
                    style={{ ...mono, fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "4px 7px", color: "#94a3b8", outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <div style={{ ...ls, fontSize: 8, marginBottom: 3 }}>Channel</div>
                  <input
                    value={rule.channel}
                    onChange={e => updateRoutingRule(rule.id, "channel", e.target.value)}
                    style={{ ...mono, fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "4px 7px", color: "#94a3b8", outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addRoutingRule}
            className="soc-btn"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 5, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(100,116,139,0.5)", ...mono, fontSize: 10, cursor: "pointer", marginTop: 2 }}
          >
            <Plus size={11} /> Add Rule
          </button>
        </div>
      </Section>

      {/* Escalation Paths */}
      <Section title="Escalation Paths">
        <div style={{ marginTop: 8 }}>
          {config.escalation_paths.map((ep: EscalationPath) => (
            <div key={ep.id} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{ep.name}</span>
                <SeverityBadge severity={ep.severity} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {ep.steps.map((step, si) => (
                  <div key={si} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", minWidth: 60 }}>+{step.delay_minutes}m</span>
                    <span style={{ ...mono, fontSize: 10, color: "#94a3b8" }}>{step.notify}</span>
                    <span style={{ ...mono, fontSize: 9, padding: "1px 7px", borderRadius: 3, background: "rgba(148,163,184,0.07)", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)" }}>{step.method}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 10, color: "rgba(100,116,139,0.35)", margin: 0, ...mono }}>Escalation path editing requires backend API — use UI to view, backend to mutate.</p>
        </div>
      </Section>

      {/* Retention Policy */}
      <Section title="Log Retention Policy">
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {Object.entries(config.retention).map(([key, days]) => (
              <NumField
                key={key}
                label={key.replace(/_/g, " ")}
                value={days}
                unit="days"
                onChange={v => updateRetention(key, v)}
                min={1}
              />
            ))}
          </div>
          <p style={{ fontSize: 10, color: "rgba(100,116,139,0.35)", margin: "12px 0 0", ...mono }}>These values are used to configure CloudWatch log group retention and S3 lifecycle rules.</p>
        </div>
      </Section>

      <BackendHandoff endpoints={[
        { method: "GET", path: "/api/soc/config", description: "Load active SOC configuration from DynamoDB config store" },
        { method: "PUT", path: "/api/soc/config", description: "Persist full config document with audit trail" },
        { method: "POST", path: "/api/soc/config/validate", description: "Validate config before apply — checks escalation path targets and routing rule syntax" },
        { method: "GET", path: "/api/soc/config/history", description: "Retrieve config change history with actor and diff" },
      ]} />
    </div>
  );
}
