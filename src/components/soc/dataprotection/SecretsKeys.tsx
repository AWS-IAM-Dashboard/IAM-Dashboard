// Secrets & Keys — rotation posture, KMS policy analysis
import { useState } from "react";
import { KeyRound, ChevronDown, ChevronRight, RotateCcw, AlertTriangle } from "lucide-react";
import type { SecretEntry, KMSKeyEntry } from "./types";
import {
  mono, divider,
  ComplianceChip, MockBadge, BackendHandoff, ExpiryTimeline,
  ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard,
  KeyUsageGraph, PolicyDiff, TH,
} from "./shared";
import { MOCK_SECRETS, MOCK_KMS_KEYS, MOCK_AUDIT_TRAIL, DP_SCENARIOS } from "./mockData";

const SECRETS_ENDPOINTS = [
  { method: "GET", path: "GET /secretsmanager/secrets", description: "List all Secrets Manager secrets with rotation status" },
  { method: "GET", path: "GET /secretsmanager/secrets/{arn}/rotation", description: "Secret rotation config and last rotation timestamp" },
  { method: "GET", path: "GET /kms/keys", description: "List CMK keys with state, spec, and rotation status" },
  { method: "GET", path: "GET /kms/keys/{id}/policy", description: "KMS key policy document (for policy analysis)" },
  { method: "POST", path: "POST /secretsmanager/secrets/{arn}/rotate", description: "Trigger immediate secret rotation (simulation)" },
  { method: "PUT", path: "PUT /kms/keys/{id}/policy", description: "Update KMS key policy (simulation)" },
];

const ROTATION_STATUS_COLOR: Record<string, string> = {
  active: "#00ff88", stale: "#ffb000", disabled: "#ff6b35",
  pending: "#60a5fa", never_rotated: "#ff0040",
};

const ROTATION_STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE", stale: "STALE", disabled: "DISABLED",
  pending: "PENDING", never_rotated: "NEVER ROTATED",
};

const SECRET_TYPE_COLOR: Record<string, string> = {
  Database: "#38bdf8", API_Key: "#ff6b35", OAuth: "#a78bfa",
  TLS_Cert: "#00ff88", Generic: "#64748b",
};

const KMS_STATE_COLOR: Record<string, string> = {
  Enabled: "#00ff88", Disabled: "#ff0040", PendingDeletion: "#ffb000", Unavailable: "#64748b",
};

// Proposed policy diff for kms-002 (over-permissive)
const EBS_KEY_POLICY_DIFF = {
  title: "alias/ebs-default — Restrict Decrypt to Prod Roles",
  description: "Remove wildcard kms:* principal grant. Restrict Decrypt and GenerateDataKey to prod-app-role and prod-rds-role only.",
  lines: [
    { type: "unchanged" as const, content: '{' },
    { type: "unchanged" as const, content: '  "Version": "2012-10-17",' },
    { type: "unchanged" as const, content: '  "Statement": [' },
    { type: "unchanged" as const, content: '    {' },
    { type: "removed" as const, content: '      "Effect": "Allow",' },
    { type: "removed" as const, content: '      "Principal": "*",' },
    { type: "removed" as const, content: '      "Action": "kms:*",' },
    { type: "removed" as const, content: '      "Resource": "*"' },
    { type: "added" as const, content: '      "Effect": "Allow",' },
    { type: "added" as const, content: '      "Principal": {' },
    { type: "added" as const, content: '        "AWS": [' },
    { type: "added" as const, content: '          "arn:aws:iam::123456789012:role/prod-app-role",' },
    { type: "added" as const, content: '          "arn:aws:iam::123456789012:role/prod-rds-role"' },
    { type: "added" as const, content: '        ]' },
    { type: "added" as const, content: '      },' },
    { type: "added" as const, content: '      "Action": [' },
    { type: "added" as const, content: '        "kms:Decrypt",' },
    { type: "added" as const, content: '        "kms:GenerateDataKey",' },
    { type: "added" as const, content: '        "kms:DescribeKey"' },
    { type: "added" as const, content: '      ],' },
    { type: "added" as const, content: '      "Resource": "*"' },
    { type: "unchanged" as const, content: '    }' },
    { type: "unchanged" as const, content: '  ]' },
    { type: "unchanged" as const, content: '}' },
  ],
};

function SecretRow({ entry }: { entry: SecretEntry }) {
  const [open, setOpen] = useState(false);
  const rc = ROTATION_STATUS_COLOR[entry.rotation_status] ?? "#64748b";
  const tc = SECRET_TYPE_COLOR[entry.secret_type] ?? "#64748b";
  const cc = entry.compliance === "compliant" ? "#00ff88" : entry.compliance === "non_compliant" ? "#ff0040" : "#ffb000";

  // Build expiry timeline from last_rotated → next_rotation if available
  const hasRotationTimeline = entry.last_rotated !== null && entry.next_rotation !== null;

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 72px 1fr 96px 80px 80px 100px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? cc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 9, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${tc}10`, border: `1px solid ${tc}28`, color: tc }}>
          {entry.secret_type}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.secret_name}</div>
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.description}</div>
        </div>
        <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, padding: "0 8px", height: 18, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${rc}10`, border: `1px solid ${rc}25`, color: rc }}>
          {ROTATION_STATUS_LABEL[entry.rotation_status]}
        </span>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: entry.days_since_rotation > 365 ? "#ff0040" : entry.days_since_rotation > 90 ? "#ffb000" : "#00ff88", textAlign: "right" as const }}>
          {entry.rotation_status === "never_rotated" ? "∞" : `${entry.days_since_rotation}d`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <RotateCcw size={9} color={entry.rotation_enabled ? "#00ff88" : "#ff0040"} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: entry.rotation_enabled ? "#00ff88" : "#ff0040" }}>{entry.rotation_enabled ? `${entry.rotation_days}d` : "OFF"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ComplianceChip status={entry.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          {hasRotationTimeline && entry.last_rotated && entry.next_rotation && (
            <div style={{ marginBottom: 12 }}>
              <ExpiryTimeline
                issuedAt={entry.last_rotated}
                expiresAt={entry.next_rotation}
                daysRemaining={entry.rotation_days ? entry.rotation_days - entry.days_since_rotation : 0}
                label="Rotation window"
              />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Secret Type", v: entry.secret_type },
              { l: "Rotation Enabled", v: entry.rotation_enabled ? `Yes (${entry.rotation_days}d)` : "No" },
              { l: "Last Rotated", v: entry.last_rotated ? new Date(entry.last_rotated).toLocaleDateString() : "Never" },
              { l: "Next Rotation", v: entry.next_rotation ? new Date(entry.next_rotation).toLocaleDateString() : "Not scheduled" },
              { l: "KMS Encrypted", v: entry.kms_key_id ? "Yes (CMK)" : "No CMK" },
              { l: "Used By", v: entry.used_by.join(", ") },
              { l: "Last Accessed", v: entry.last_accessed ? new Date(entry.last_accessed).toLocaleString() : "Unknown" },
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

function KMSKeyRow({ entry }: { entry: KMSKeyEntry }) {
  const [open, setOpen] = useState(false);
  const sc = KMS_STATE_COLOR[entry.state] ?? "#64748b";
  const cc = entry.compliance === "compliant" ? "#00ff88" : entry.compliance === "non_compliant" ? "#ff0040" : "#ffb000";
  const isOverPermissive = entry.policy_issues.length > 0;

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 80px 72px 80px 100px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? cc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.key_alias}</div>
            {entry.key_manager === "AWS" && <span style={{ ...mono, fontSize: 8, padding: "0 5px", height: 13, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)", color: "rgba(100,116,139,0.5)", flexShrink: 0 }}>AWS MGD</span>}
          </div>
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc, boxShadow: `0 0 4px ${sc}40` }} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: sc }}>{entry.state}</span>
        </div>
        <div>
          <KeyUsageGraph data={entry.usage_7d} color={isOverPermissive ? "#ffb000" : "#00ff88"} height={24} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <RotateCcw size={9} color={entry.rotation_enabled ? "#00ff88" : "#ff0040"} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: entry.rotation_enabled ? "#00ff88" : "#ff0040" }}>{entry.rotation_enabled ? "ON" : "OFF"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isOverPermissive && <AlertTriangle size={9} color="#ff6b35" />}
          <span style={{ ...mono, fontSize: 9.5, color: isOverPermissive ? "#ff6b35" : "rgba(100,116,139,0.35)" }}>
            {entry.policy_issues.length > 0 ? `${entry.policy_issues.length} issue${entry.policy_issues.length > 1 ? "s" : ""}` : "Clean"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ComplianceChip status={entry.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Key ID", v: entry.key_id },
              { l: "Key Spec", v: entry.key_spec },
              { l: "Key Usage", v: entry.key_usage },
              { l: "Key Manager", v: entry.key_manager },
              { l: "State", v: entry.state },
              { l: "Rotation", v: entry.rotation_enabled ? "Enabled" : "Disabled" },
              { l: "Last Rotation", v: entry.last_rotation ? new Date(entry.last_rotation).toLocaleDateString() : "Never" },
              { l: "Deletion Date", v: entry.deletion_date ? new Date(entry.deletion_date).toLocaleDateString() : "N/A" },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          {entry.policy_issues.length > 0 && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 7, background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)" }}>
              <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: "rgba(255,107,53,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>Policy Issues</div>
              {entry.policy_issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                  <AlertTriangle size={10} color="#ff6b35" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: "rgba(255,107,53,0.75)" }}>{issue}</span>
                </div>
              ))}
            </div>
          )}

          {entry.key_id === "mrk-ebs456" && (
            <div style={{ marginBottom: 12 }}>
              <PolicyDiff lines={EBS_KEY_POLICY_DIFF.lines} title={EBS_KEY_POLICY_DIFF.title} description={EBS_KEY_POLICY_DIFF.description} />
            </div>
          )}

        </div>
      )}
    </>
  );
}

export function SecretsKeys() {
  const [section, setSection] = useState<"secrets" | "kms" | "audit" | "scenarios">("secrets");

  const secretsCompliant = MOCK_SECRETS.filter(s => s.compliance === "compliant").length;
  const secretsNonCompliant = MOCK_SECRETS.filter(s => s.compliance === "non_compliant").length;
  const neverRotated = MOCK_SECRETS.filter(s => s.rotation_status === "never_rotated").length;
  const staleSecrets = MOCK_SECRETS.filter(s => s.rotation_status === "stale").length;
  const kmsIssues = MOCK_KMS_KEYS.filter(k => k.policy_issues.length > 0).length;

  const SECTIONS = [
    { id: "secrets", label: "Secret Rotation", accent: "#a78bfa", count: secretsNonCompliant },
    { id: "kms", label: "KMS Keys", accent: "#ff6b35", count: kmsIssues },
    { id: "audit", label: "Audit Trail", accent: "#64748b" },
    { id: "scenarios", label: "Scenarios", accent: "#ffb000" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<KeyRound size={16} color="#a78bfa" />} title="Secrets & Keys" subtitle="Secret rotation posture, stale credential detection, and KMS key policy analysis" accent="#a78bfa" />

      <StatStrip stats={[
        { label: "Secrets OK", value: secretsCompliant, color: "#00ff88", accent: true },
        { label: "Non-Compliant", value: secretsNonCompliant, color: secretsNonCompliant > 0 ? "#ff0040" : "#00ff88", accent: secretsNonCompliant > 0 },
        { label: "Never Rotated", value: neverRotated, color: neverRotated > 0 ? "#ff0040" : "#00ff88", accent: neverRotated > 0 },
        { label: "Stale Secrets", value: staleSecrets, color: staleSecrets > 0 ? "#ffb000" : "#00ff88", accent: staleSecrets > 0 },
        { label: "KMS Policy Issues", value: kmsIssues, color: kmsIssues > 0 ? "#ff6b35" : "#00ff88", accent: kmsIssues > 0 },
        { label: "Total KMS Keys", value: MOCK_KMS_KEYS.length },
      ]} />

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="soc-btn" onClick={() => setSection(s.id as typeof section)}
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

      {section === "secrets" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px 72px 1fr 96px 80px 80px 100px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Type</TH><TH>Secret</TH><TH>Rotation Status</TH><TH right>Days Ago</TH><TH>Auto-Rotate</TH><TH right>Compliance</TH>
          </div>
          {MOCK_SECRETS.map(s => <SecretRow key={s.id} entry={s} />)}
        </div>
      )}

      {section === "kms" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={11} color="rgba(255,107,53,0.5)" />
            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)" }}>Over-permissive KMS key policies allow any IAM principal to decrypt data — a high-impact privilege escalation vector.</span>
            <MockBadge />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 80px 72px 80px 100px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Key / Alias</TH><TH>State</TH><TH>Usage (7d)</TH><TH>Rotation</TH><TH>Policy</TH><TH right>Compliance</TH>
          </div>
          {MOCK_KMS_KEYS.map(k => <KMSKeyRow key={k.id} entry={k} />)}
        </div>
      )}

      {section === "audit" && (
        <div style={{ padding: "4px 0" }}>
          {MOCK_AUDIT_TRAIL.filter(e =>
            ["prod/db/mysql-master-password", "mrk-ebs456", "prod/stripe/api-key"].includes(e.resource_id)
          ).map(e => (
            <EvidenceAuditCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {DP_SCENARIOS.filter(s => s.id === "stale_rotation" || s.id === "overpermissive_key").map(s => (
            <DPScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={SECRETS_ENDPOINTS} />
    </div>
  );
}
