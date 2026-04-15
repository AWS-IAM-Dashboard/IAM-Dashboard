// Lifecycle — retention schedules, drift warnings, S3 lifecycle rules
import { useState, useEffect } from "react";
import { Archive, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { RetentionPolicy, S3LifecycleRule } from "./types";
import {
  mono, divider,
  ComplianceChip, MockBadge, BackendHandoff,
  ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard, DriftIndicator, TH,
} from "./shared";
import { MOCK_RETENTION, MOCK_S3_LIFECYCLE, MOCK_AUDIT_TRAIL, DP_SCENARIOS } from "./mockData";

const LIFECYCLE_ENDPOINTS = [
  { method: "GET", path: "GET /cloudwatch/log-groups", description: "CloudWatch log group retention policies" },
  { method: "GET", path: "GET /s3/buckets/{bucket}/lifecycle", description: "S3 bucket lifecycle configuration" },
  { method: "GET", path: "GET /cloudtrail/trails", description: "CloudTrail log retention and storage settings" },
  { method: "GET", path: "GET /rds/db-instances/{id}/backup", description: "RDS automated backup retention period" },
  { method: "PUT", path: "PUT /cloudwatch/log-groups/{name}/retention", description: "Update log group retention policy (simulation)" },
  { method: "PUT", path: "PUT /s3/buckets/{bucket}/lifecycle", description: "Apply lifecycle configuration to S3 bucket (simulation)" },
];

const FRAMEWORK_COLOR: Record<string, string> = {
  HIPAA: "#a78bfa", "PCI-DSS": "#ff6b35", SOC2: "#38bdf8", Internal: "#64748b",
};

const TYPE_LABEL: Record<string, string> = {
  S3_Bucket: "S3", CloudWatch_Logs: "CWL", CloudTrail: "Trail",
  RDS_Backup: "RDS BKP", Glacier: "Glacier", DynamoDB_Backup: "DDB BKP",
};

const SC_CLASS: Record<string, string> = {
  STANDARD_IA: "#38bdf8", GLACIER: "#a78bfa", DEEP_ARCHIVE: "#60a5fa",
};

function RetentionRow({ policy }: { policy: RetentionPolicy }) {
  const [open, setOpen] = useState(false);
  const cc = policy.compliance === "compliant" ? "#00ff88" : policy.compliance === "non_compliant" ? "#ff0040" : "#ffb000";
  const fwColor = FRAMEWORK_COLOR[policy.framework] ?? "#64748b";

  return (
    <>
      <div
        className="soc-row"
        style={{
          display: "grid",
          gridTemplateColumns: "24px minmax(52px, 0.55fr) minmax(0, 1.6fr) minmax(92px, 0.75fr) minmax(72px, 0.45fr) minmax(72px, 0.45fr) minmax(76px, 0.45fr) minmax(132px, 0.95fr)",
          alignItems: "center",
          columnGap: 14,
          rowGap: 6,
          padding: "10px 14px",
          borderBottom: divider,
          cursor: "pointer",
          borderLeft: `2px solid ${open ? cc : "transparent"}`,
          transition: "border-color 0.15s",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex shrink-0" style={{ color: "rgba(100,116,139,0.4)" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span className="min-w-0 justify-self-start truncate" title={TYPE_LABEL[policy.resource_type] ?? policy.resource_type} style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", maxWidth: "100%", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.65)" }}>
          {TYPE_LABEL[policy.resource_type] ?? policy.resource_type}
        </span>
        <div className="min-w-0 pr-1">
          <div className="truncate text-[11px] font-semibold text-slate-200" title={policy.resource_name}>{policy.resource_name}</div>
          <div className="mt-0.5 break-all text-[9px] leading-snug text-slate-500" style={{ ...mono }}>{policy.resource_id}</div>
        </div>
        <span className="min-w-0 max-w-full justify-self-start truncate" title={policy.framework} style={{ ...mono, fontSize: 9.5, fontWeight: 700, padding: "0 8px", height: 18, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${fwColor}10`, border: `1px solid ${fwColor}25`, color: fwColor }}>
          {policy.framework}
        </span>
        <span className="min-w-0 whitespace-nowrap text-right tabular-nums" style={{ ...mono, fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>{policy.required_days}d</span>
        <span className="min-w-0 whitespace-nowrap text-right tabular-nums" style={{ ...mono, fontSize: 10, fontWeight: 700, color: policy.actual_days === null ? "#64748b" : policy.actual_days >= policy.required_days ? "#00ff88" : "#ff0040" }}>
          {policy.actual_days !== null ? `${policy.actual_days}d` : "None"}
        </span>
        <span className="min-w-0 whitespace-nowrap text-right tabular-nums" style={{ ...mono, fontSize: 10, fontWeight: 700, color: policy.drift_days === 0 ? "#00ff88" : policy.drift_days < 0 ? "#ff0040" : "#ffb000" }}>
          {policy.drift_days === 0 ? "0" : policy.drift_days > 0 ? `+${policy.drift_days}` : `${policy.drift_days}`}d
        </span>
        <div className="flex min-w-0 justify-end"><ComplianceChip status={policy.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ marginBottom: 12 }}>
            <DriftIndicator required={policy.required_days} actual={policy.actual_days} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Framework", v: policy.framework },
              { l: "Classification", v: policy.data_classification },
              { l: "Last Reviewed", v: new Date(policy.last_reviewed).toLocaleDateString() },
              { l: "Required Days", v: `${policy.required_days}d` },
              { l: "Actual Days", v: policy.actual_days !== null ? `${policy.actual_days}d` : "No policy set" },
              { l: "Drift", v: policy.drift_days === 0 ? "None" : `${policy.drift_days > 0 ? "+" : ""}${policy.drift_days}d` },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function LifecycleRuleRow({ rule }: { rule: S3LifecycleRule }) {
  const [open, setOpen] = useState(false);
  const cc = rule.compliance === "compliant" ? "#00ff88" : rule.compliance === "non_compliant" ? "#ff0040" : "#ffb000";

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 1fr 120px 60px 1fr 100px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? cc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{rule.bucket}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>rule: {rule.rule_id}{rule.prefix ? ` · prefix: ${rule.prefix}` : ""}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
          {rule.transitions.map((t, i) => (
            <span key={i} style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${SC_CLASS[t.storage_class] ?? "#64748b"}12`, border: `1px solid ${SC_CLASS[t.storage_class] ?? "#64748b"}28`, color: SC_CLASS[t.storage_class] ?? "#64748b" }}>
              {t.days}d→{t.storage_class.replace("STANDARD_", "IA").replace("DEEP_ARCHIVE", "DEEP")}
            </span>
          ))}
          {rule.transitions.length === 0 && <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)" }}>none</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: rule.enabled ? "#00ff88" : "#ff0040" }} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: rule.enabled ? "#00ff88" : "#ff0040" }}>{rule.enabled ? "ON" : "OFF"}</span>
        </div>
        <div style={{ ...mono, fontSize: 9.5, color: "rgba(100,116,139,0.55)" }}>
          {[
            rule.expiration_days != null && `Expire ${rule.expiration_days}d`,
            rule.noncurrent_expiration_days != null && `NCur ${rule.noncurrent_expiration_days}d`,
            rule.abort_incomplete_multipart_days != null && `Abort MPU ${rule.abort_incomplete_multipart_days}d`,
          ].filter(Boolean).join(" · ") || "No expiration"}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ComplianceChip status={rule.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Bucket", v: rule.bucket },
              { l: "Rule ID", v: rule.rule_id },
              { l: "Prefix Filter", v: rule.prefix || "(all objects)" },
              { l: "Status", v: rule.enabled ? "Enabled" : "Disabled" },
              { l: "Expiration", v: rule.expiration_days != null ? `${rule.expiration_days}d` : "Not set" },
              { l: "Noncurrent Expiry", v: rule.noncurrent_expiration_days != null ? `${rule.noncurrent_expiration_days}d` : "Not set" },
              { l: "Abort Incomplete MPU", v: rule.abort_incomplete_multipart_days != null ? `${rule.abort_incomplete_multipart_days}d` : "Not set" },
              { l: "Transitions", v: rule.transitions.length > 0 ? rule.transitions.map(t => `→${t.storage_class} (${t.days}d)`).join(", ") : "None" },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function Lifecycle() {
  const [section, setSection] = useState<"retention" | "lifecycle" | "audit" | "scenarios">("retention");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");

  const compliantRet = MOCK_RETENTION.filter(r => r.compliance === "compliant").length;
  const nonCompliantRet = MOCK_RETENTION.filter(r => r.compliance === "non_compliant").length;
  const driftCount = MOCK_RETENTION.filter(r => r.drift_days < 0).length;
  const noPolicy = MOCK_RETENTION.filter(r => r.actual_days === null).length;

  const frameworks = ["all", ...Array.from(new Set(MOCK_RETENTION.map(r => r.framework)))];
  const filteredRetention = frameworkFilter === "all" ? MOCK_RETENTION : MOCK_RETENTION.filter(r => r.framework === frameworkFilter);

  const SECTIONS = [
    { id: "retention", label: "Retention Policies", shortLabel: "Retain", accent: "#38bdf8", count: nonCompliantRet },
    { id: "lifecycle", label: "S3 Lifecycle Rules", shortLabel: "S3", accent: "#a78bfa", count: MOCK_S3_LIFECYCLE.filter(r => r.compliance !== "compliant").length },
    { id: "audit", label: "Audit Trail", shortLabel: "Audit", accent: "#64748b" },
    { id: "scenarios", label: "Scenarios", shortLabel: "SIM", accent: "#ffb000" },
  ] as const;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-w-0 max-w-full" style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<Archive size={16} color="#38bdf8" />} title="Lifecycle" subtitle="Retention schedule compliance, drift detection, and S3 lifecycle rule audit" accent="#38bdf8" />

      <StatStrip stats={[
        { label: "Compliant", value: compliantRet, color: "#00ff88", accent: true },
        { label: "Non-Compliant", value: nonCompliantRet, color: nonCompliantRet > 0 ? "#ff0040" : "#00ff88", accent: nonCompliantRet > 0 },
        { label: "Drift Found", value: driftCount, color: driftCount > 0 ? "#ff6b35" : "#00ff88", accent: driftCount > 0 },
        { label: "No Policy Set", value: noPolicy, color: noPolicy > 0 ? "#ffb000" : "#00ff88" },
        { label: "S3 Rules", value: MOCK_S3_LIFECYCLE.length },
        { label: "Total Resources", value: MOCK_RETENTION.length },
      ]} />

      <div className="mb-3 grid min-w-0 w-full grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-2">
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className="soc-btn flex min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-2 text-center sm:w-auto sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5"
              onClick={() => setSection(s.id as typeof section)}
              style={{
                background: active ? `${s.accent}12` : "transparent",
                border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`,
                color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono,
                fontSize: isMobile ? 9 : 11, fontWeight: active ? 700 : 500, transition: "all 0.12s",
              }}
            >
              <span className="hidden whitespace-nowrap sm:inline">{s.label}</span>
              <span className="max-w-full truncate text-[8px] leading-tight sm:hidden">{s.shortLabel}</span>
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 8, fontWeight: 800, padding: "0 3px", minHeight: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {section === "retention" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Framework</span>
            {frameworks.map(fw => (
              <button key={fw} onClick={() => setFrameworkFilter(fw)}
                style={{ padding: "3px 10px", borderRadius: 5, ...mono, fontSize: 9.5, fontWeight: frameworkFilter === fw ? 700 : 400, cursor: "pointer", background: frameworkFilter === fw ? `${FRAMEWORK_COLOR[fw] ?? "#64748b"}12` : "transparent", border: `1px solid ${frameworkFilter === fw ? (FRAMEWORK_COLOR[fw] ?? "#64748b") + "30" : "rgba(255,255,255,0.06)"}`, color: frameworkFilter === fw ? (FRAMEWORK_COLOR[fw] ?? "#64748b") : "rgba(100,116,139,0.45)", transition: "all 0.12s" }}
              >
                {fw === "all" ? "All" : fw}
              </button>
            ))}
          </div>
          <div className="min-w-0 overflow-x-auto" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ minWidth: 900 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px minmax(52px, 0.55fr) minmax(0, 1.6fr) minmax(92px, 0.75fr) minmax(72px, 0.45fr) minmax(72px, 0.45fr) minmax(76px, 0.45fr) minmax(132px, 0.95fr)",
                  columnGap: 14,
                  rowGap: 4,
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span /><TH>Type</TH><TH>Resource</TH><TH>Framework</TH><TH right>Required</TH><TH right>Actual</TH><TH right>Drift</TH><TH right>Status</TH>
              </div>
              {filteredRetention.map(r => <RetentionRow key={r.id} policy={r} />)}
            </div>
          </div>
        </>
      )}

      {section === "lifecycle" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AlertTriangle size={11} color="rgba(255,176,0,0.5)" />
            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)" }}>S3 lifecycle rules control tiering, expiration, and data cost. Disabled or missing rules violate retention requirements.</span>
            <MockBadge />
          </div>
          <div className="min-w-0 overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 120px 60px 1fr 100px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                <span /><TH>Bucket</TH><TH>Transitions</TH><TH>Status</TH><TH>Expiration Config</TH><TH right>Compliance</TH>
              </div>
              {MOCK_S3_LIFECYCLE.map(r => <LifecycleRuleRow key={r.id} rule={r} />)}
            </div>
          </div>
        </div>
      )}

      {section === "audit" && (
        <div className="min-w-0 max-w-full px-1 py-1 sm:px-0">
          {MOCK_AUDIT_TRAIL.filter(e => ["/aws/vpc/prod-flow-logs", "/app/prod/audit-logs", "acme-staging-logs"].includes(e.resource_id)).map(e => (
            <EvidenceAuditCard key={e.id} event={e} />
          ))}
          {MOCK_AUDIT_TRAIL.filter(e => ["/aws/vpc/prod-flow-logs", "/app/prod/audit-logs", "acme-staging-logs"].includes(e.resource_id)).length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
              <CheckCircle2 size={13} color="rgba(0,255,136,0.3)" />
              <span style={{ fontSize: 12, color: "rgba(100,116,139,0.4)" }}>No lifecycle-related audit events in this window.</span>
            </div>
          )}
          {/* Show general config rule events */}
          {MOCK_AUDIT_TRAIL.filter(e => e.action.toLowerCase().includes("detect") || e.resource_id.includes("bucket")).map(e => (
            <EvidenceAuditCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {section === "scenarios" && (
        <div className="flex min-w-0 max-w-full flex-col gap-3 px-1 py-1 sm:gap-3 sm:px-0">
          {DP_SCENARIOS.filter(s => s.id === "retention_drift").map(s => (
            <DPScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={LIFECYCLE_ENDPOINTS} />
    </div>
  );
}
