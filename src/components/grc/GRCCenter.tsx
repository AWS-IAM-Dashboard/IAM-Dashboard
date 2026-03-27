// GRC Center — top-level container with 4 sub-tabs
import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Governance } from "./Governance";
import { DataProtection } from "../soc/dataprotection/DataProtection";
import { ComplianceEvidence } from "./ComplianceEvidence";
import { ArchitectureCostRisk } from "./ArchitectureCostRisk";
import { mono, MockBadge, useLocalStorage } from "./shared";
import { MOCK_POLICIES, MOCK_GUARDRAILS, MOCK_EXCEPTIONS, MOCK_ARCH_RISKS, MOCK_COST_RISKS } from "./mockData";

// Keyframe injection
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
  { id: "architecture", label: "Architecture & Cost Risk", accent: "#ff6b35" },
];

function getTabCounts() {
  const govIssues = MOCK_POLICIES.filter(p => p.non_compliant_resources > 0).length
    + MOCK_GUARDRAILS.filter(g => g.drift_detected).length
    + MOCK_EXCEPTIONS.filter(e => e.status === "expired").length;
  const archIssues = MOCK_ARCH_RISKS.filter(r => r.status === "open").length + MOCK_COST_RISKS.length;
  return { govIssues, archIssues };
}

export function GRCCenter({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [tab, setTab] = useLocalStorage<GRCTab>("grc-active-tab", "governance");
  const counts = getTabCounts();

  const badgeCount = (tabId: GRCTab) => {
    if (tabId === "governance") return counts.govIssues > 0 ? counts.govIssues : 0;
    if (tabId === "architecture") return counts.archIssues > 0 ? counts.archIssues : 0;
    return 0;
  };

  return (
    <>
      <GRCGlobalStyles />
      <div style={{ display: "flex", flexDirection: "column" as const, height: "100%" }}>
        {/* Module header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.15)", flexShrink: 0,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={14} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.01em" }}>Governance, Risk & Compliance</div>
            <div style={{ fontSize: 10, color: "rgba(100,116,139,0.5)", marginTop: 1 }}>Policy governance, data protection, compliance evidence, and risk management</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
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
          {GRC_TABS.map(t => {
            const active = tab === t.id;
            const count = badgeCount(t.id);
            return (
              <button
                key={t.id}
                className="soc-btn"
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px",
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
                    ...mono, fontSize: 10, fontWeight: 800,
                    padding: "0 4px", height: 16,
                    display: "inline-flex", alignItems: "center",
                    borderRadius: 999,
                    background: active ? `${t.accent}18` : "rgba(255,107,53,0.1)",
                    border: `1px solid ${active ? t.accent + "30" : "rgba(255,107,53,0.25)"}`,
                    color: active ? t.accent : "#ff6b35",
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
          {tab === "governance" && <Governance onNavigate={onNavigate} />}
          {tab === "data-protection" && <DataProtection />}
          {tab === "compliance" && <ComplianceEvidence onNavigate={onNavigate} />}
          {tab === "architecture" && <ArchitectureCostRisk onNavigate={onNavigate} />}
        </div>
      </div>
    </>
  );
}
