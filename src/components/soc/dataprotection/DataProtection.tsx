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

const DP_TABS: Array<{ id: DPTab; label: string; shortLabel: string; accent: string; countKey: keyof ReturnType<typeof getTabCounts> }> = [
  { id: "transit", label: "In Transit", shortLabel: "Transit", accent: "#38bdf8", countKey: "transitNonCompliant" },
  { id: "at-rest", label: "At Rest", shortLabel: "Rest", accent: "#8b5cf6", countKey: "atRestNonCompliant" },
  { id: "lifecycle", label: "Lifecycle", shortLabel: "Life", accent: "#38bdf8", countKey: "lifecycleNonCompliant" },
  { id: "secrets", label: "Secrets & Keys", shortLabel: "Keys", accent: "#a78bfa", countKey: "secretsNonCompliant" },
];

export function DataProtection() {
  const [tab, setTab] = useState<DPTab>("transit");
  const [isMobile, setIsMobile] = useState(false);
  const counts = getTabCounts();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <DPGlobalStyles />
      {/* Sub-nav — 4 equal columns on narrow viewports; full labels from sm */}
      <div
        className="grid min-w-0 w-full grid-cols-4 gap-1 pb-3 sm:flex sm:flex-wrap sm:items-stretch sm:gap-2 sm:pb-4"
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 16,
          boxSizing: "border-box",
        }}
      >
        {DP_TABS.map(t => {
          const active = tab === t.id;
          const count = counts[t.countKey];
          return (
            <button
              key={t.id}
              type="button"
              className="soc-btn flex min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-2 text-center sm:w-auto sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-2"
              onClick={() => setTab(t.id)}
              style={{
                background: active ? `${t.accent}14` : "transparent",
                border: `1px solid ${active ? t.accent + "35" : "rgba(255,255,255,0.06)"}`,
                color: active ? t.accent : "rgba(100,116,139,0.5)",
                cursor: "pointer",
                ...mono, fontSize: isMobile ? 9 : 11, fontWeight: active ? 700 : 500,
                transition: "all 0.12s",
              }}
            >
              <span className="hidden whitespace-nowrap sm:inline">{t.label}</span>
              <span className="max-w-full truncate text-[8px] leading-tight sm:hidden">{t.shortLabel}</span>
              {count > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 14, minHeight: 14, borderRadius: 999, padding: "0 3px",
                  background: `${t.accent}1a`,
                  border: `1px solid ${t.accent}35`,
                  color: t.accent,
                  fontSize: 8, fontWeight: 800, lineHeight: 1,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="col-span-4 mt-1 flex justify-end sm:col-span-1 sm:mt-0 sm:ml-auto sm:justify-end">
          <MockBadge label="FRONTEND MODULE" />
        </div>
      </div>

      {/* Panel */}
      <div key={tab} className="min-w-0" style={{ animation: "fade-in 0.16s ease" }}>
        {tab === "transit" && <InTransit />}
        {tab === "at-rest" && <AtRest />}
        {tab === "lifecycle" && <Lifecycle />}
        {tab === "secrets" && <SecretsKeys />}
      </div>
    </>
  );
}
