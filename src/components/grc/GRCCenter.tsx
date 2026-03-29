// GRC Center — top-level container with 4 sub-tabs
import { useEffect } from "react";
import { Governance } from "./Governance";
import { DataProtection } from "../soc/dataprotection/DataProtection";
import { ComplianceEvidence } from "./ComplianceEvidence";
import { ArchitectureCostRisk } from "./ArchitectureCostRisk";
import { mono, MockBadge, useLocalStorage } from "./shared";
import { MOCK_POLICIES, MOCK_GUARDRAILS, MOCK_EXCEPTIONS, MOCK_ARCH_RISKS } from "./mockData";

function GRCGlobalStyles() {
  useEffect(() => {
    const id = "grc-global-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      .soc-row:hover { background: rgba(255,255,255,0.015) !important; }
      .soc-btn:focus-visible { outline: 1px solid rgba(255,255,255,0.2); outline-offset: 2px; }
      .grc-crosslink:hover { background: rgba(56,189,248,0.12) !important; border-color: rgba(56,189,248,0.35) !important; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);
  return null;
}

type GRCTab = "governance" | "data-protection" | "compliance" | "architecture";

const GRC_TABS: Array<{ id: GRCTab; label: string; accent: string }> = [
  { id: "governance", label: "Governance", accent: "#a78bfa" },
  { id: "data-protection", label: "Data Protection", accent: "#00ff88" },
  { id: "compliance", label: "Compliance & Evidence", accent: "#38bdf8" },
  { id: "architecture", label: "Architecture & Cost", accent: "#ff6b35" },
];

function getTabCounts() {
  const govIssues = MOCK_POLICIES.filter(p => p.non_compliant_resources > 0).length
    + MOCK_GUARDRAILS.filter(g => g.drift_detected).length
    + MOCK_EXCEPTIONS.filter(e => e.status === "expired").length;
  const archIssues = MOCK_ARCH_RISKS.filter(r => r.status === "open").length;
  return { govIssues, archIssues };
}

export function GRCCenter({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [tab, setTab] = useLocalStorage<GRCTab>("grc-active-tab", "governance");
  const counts = getTabCounts();

  const badgeCount = (tabId: GRCTab) => {
    if (tabId === "governance") return counts.govIssues;
    if (tabId === "architecture") return counts.archIssues;
    return 0;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%", minHeight: 0 }}>
      <GRCGlobalStyles />

      {/* Sub-nav — pill buttons matching SOC/Infra pattern */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        paddingBottom: 16, overflowX: "auto", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 20,
      }}>
        {GRC_TABS.map(t => {
          const active = tab === t.id;
          const count = badgeCount(t.id);
          return (
            <button
              key={t.id}
              className="soc-btn"
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
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

        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <MockBadge label="FRONTEND MODULE" />
        </div>
      </div>

      {/* Panel */}
      <div
        key={tab}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", animation: "fade-in 0.16s ease" }}
      >
        {tab === "governance" && <Governance onNavigate={onNavigate} />}
        {tab === "data-protection" && <DataProtection />}
        {tab === "compliance" && <ComplianceEvidence onNavigate={onNavigate} />}
        {tab === "architecture" && <ArchitectureCostRisk onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
