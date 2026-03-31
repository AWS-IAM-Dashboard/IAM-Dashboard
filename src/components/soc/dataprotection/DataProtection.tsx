// Data Protection — top-level container with 4 sub-tabs
import { useState, useEffect } from "react";
import { InTransit } from "./InTransit";
import { AtRest } from "./AtRest";
import { Lifecycle } from "./Lifecycle";
import { SecretsKeys } from "./SecretsKeys";
import { mono, MockBadge } from "./shared";
import {
  MOCK_TLS_ENDPOINTS, MOCK_CERTIFICATES,
  MOCK_STORAGE_ENCRYPTION, MOCK_PUBLIC_SNAPSHOTS,
  MOCK_RETENTION, MOCK_S3_LIFECYCLE,
  MOCK_SECRETS, MOCK_KMS_KEYS,
} from "./mockData";

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
      {/* Sub-nav — pill buttons matching SOC/Infra/GRC pattern */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        paddingBottom: 12, overflowX: "auto", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 16,
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
                padding: "4px 12px", borderRadius: 6,
                background: active ? `${t.accent}14` : "transparent",
                border: `1px solid ${active ? t.accent + "35" : "rgba(255,255,255,0.06)"}`,
                color: active ? t.accent : "rgba(100,116,139,0.5)",
                cursor: "pointer", whiteSpace: "nowrap",
                ...mono, fontSize: 11, fontWeight: active ? 700 : 500,
                transition: "all 0.12s",
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 16, height: 16, borderRadius: 999, padding: "0 4px",
                  background: `${t.accent}1a`,
                  border: `1px solid ${t.accent}35`,
                  color: t.accent,
                  fontSize: 9, fontWeight: 800, lineHeight: 1,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <MockBadge label="FRONTEND MODULE" />
        </div>
      </div>

      {/* Panel */}
      <div key={tab} style={{ animation: "fade-in 0.16s ease" }}>
        {tab === "transit" && <InTransit />}
        {tab === "at-rest" && <AtRest />}
        {tab === "lifecycle" && <Lifecycle />}
        {tab === "secrets" && <SecretsKeys />}
      </div>
    </>
  );
}
