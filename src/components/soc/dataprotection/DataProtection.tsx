// Data Protection — top-level container with 4 sub-tabs
import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { InTransit } from "./InTransit";
import { AtRest } from "./AtRest";
import { Lifecycle } from "./Lifecycle";
import { SecretsKeys } from "./SecretsKeys";
import {
  mono, MockBadge,
  COMPLIANCE_COLOR,
} from "./shared";
import {
  MOCK_TLS_ENDPOINTS, MOCK_CERTIFICATES,
  MOCK_STORAGE_ENCRYPTION, MOCK_PUBLIC_SNAPSHOTS,
  MOCK_RETENTION, MOCK_S3_LIFECYCLE,
  MOCK_SECRETS, MOCK_KMS_KEYS,
} from "./mockData";

// ─── Keyframe injection ───────────────────────────────────────────────────────
function DPGlobalStyles() {
  useEffect(() => {
    const id = "dp-global-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      .soc-row:hover { background: rgba(255,255,255,0.015) !important; }
      .soc-btn:focus-visible { outline: 1px solid rgba(255,255,255,0.2); outline-offset: 2px; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);
  return null;
}

// ─── Derive badge counts from mock data ──────────────────────────────────────
function getTabCounts() {
  const transitNonCompliant = [
    ...MOCK_TLS_ENDPOINTS.filter(e => e.compliance === "non_compliant"),
    ...MOCK_CERTIFICATES.filter(c => c.compliance === "non_compliant"),
  ].length;

  const atRestNonCompliant = [
    ...MOCK_STORAGE_ENCRYPTION.filter(e => e.compliance === "non_compliant"),
    ...MOCK_PUBLIC_SNAPSHOTS,
  ].length;

  const lifecycleNonCompliant = [
    ...MOCK_RETENTION.filter(r => r.compliance === "non_compliant"),
    ...MOCK_S3_LIFECYCLE.filter(r => r.compliance === "non_compliant"),
  ].length;

  const secretsNonCompliant = [
    ...MOCK_SECRETS.filter(s => s.compliance === "non_compliant"),
    ...MOCK_KMS_KEYS.filter(k => k.policy_issues.length > 0),
  ].length;

  return { transitNonCompliant, atRestNonCompliant, lifecycleNonCompliant, secretsNonCompliant };
}

type DPTab = "transit" | "at-rest" | "lifecycle" | "secrets";

const DP_TABS: Array<{ id: DPTab; label: string; accent: string; countKey: keyof ReturnType<typeof getTabCounts> }> = [
  { id: "transit", label: "In Transit", accent: "#38bdf8", countKey: "transitNonCompliant" },
  { id: "at-rest", label: "At Rest", accent: "#8b5cf6", countKey: "atRestNonCompliant" },
  { id: "lifecycle", label: "Lifecycle", accent: "#38bdf8", countKey: "lifecycleNonCompliant" },
  { id: "secrets", label: "Secrets & Keys", accent: "#a78bfa", countKey: "secretsNonCompliant" },
];

export function DataProtection() {
  const [tab, setTab] = useState<DPTab>("transit");
  const counts = getTabCounts();

  return (
    <>
      <DPGlobalStyles />
      <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
        {/* Sub-module header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.15)", flexShrink: 0,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={14} color="#00ff88" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>Data Protection</div>
            <div style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", marginTop: 1 }}>Encryption, transit security, lifecycle governance, and secrets management</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <MockBadge label="FRONTEND MODULE" />
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 2,
          padding: "8px 20px 0",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.08)", flexShrink: 0,
        }}>
          {DP_TABS.map(t => {
            const active = tab === t.id;
            const count = counts[t.countKey];
            return (
              <button
                key={t.id}
                className="soc-btn"
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px",
                  borderRadius: "6px 6px 0 0",
                  background: active ? "rgba(15,23,42,0.9)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "transparent"}`,
                  borderBottom: active ? "1px solid rgba(15,23,42,0.9)" : "1px solid transparent",
                  marginBottom: active ? -1 : 0,
                  color: active ? t.accent : "rgba(100,116,139,0.45)",
                  cursor: "pointer", ...mono, fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  transition: "all 0.12s",
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{
                    ...mono, fontSize: 9, fontWeight: 800,
                    padding: "0 4px", height: 14,
                    display: "inline-flex", alignItems: "center",
                    borderRadius: 999,
                    background: active ? `${t.accent}18` : "rgba(255,0,64,0.1)",
                    border: `1px solid ${active ? t.accent + "30" : "rgba(255,0,64,0.25)"}`,
                    color: active ? t.accent : "#ff0040",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px" }}>
          {tab === "transit" && <InTransit />}
          {tab === "at-rest" && <AtRest />}
          {tab === "lifecycle" && <Lifecycle />}
          {tab === "secrets" && <SecretsKeys />}
        </div>
      </div>
    </>
  );
}
