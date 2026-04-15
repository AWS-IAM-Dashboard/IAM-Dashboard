// GRC Center — top-level container with 4 sub-tabs
import { useEffect, useState } from "react";
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

const GRC_TABS: Array<{ id: GRCTab; label: string; shortLabel: string; accent: string }> = [
  { id: "governance", label: "Governance", shortLabel: "Gov", accent: "#a78bfa" },
  { id: "data-protection", label: "Data Protection", shortLabel: "Data", accent: "#00ff88" },
  { id: "compliance", label: "Compliance & Evidence", shortLabel: "Compliance", accent: "#38bdf8" },
  { id: "architecture", label: "Architecture & Cost", shortLabel: "Arch", accent: "#ff6b35" },
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
  const [isMobile, setIsMobile] = useState(false);
  const counts = getTabCounts();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const badgeCount = (tabId: GRCTab) => {
    if (tabId === "governance") return counts.govIssues;
    if (tabId === "architecture") return counts.archIssues;
    return 0;
  };

  return (
    <div className="min-w-0 max-w-full" style={{ display: "flex", flexDirection: "column" as const, height: "100%", minHeight: 0 }}>
      <GRCGlobalStyles />

      {/* Sub-nav — 2×2 grid on narrow viewports; full labels from sm */}
      <div
        className="grid w-full min-w-0 grid-cols-2 gap-2 pb-4 sm:flex sm:flex-wrap sm:items-stretch"
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 20,
          boxSizing: "border-box",
        }}
      >
        {GRC_TABS.map(t => {
          const active = tab === t.id;
          const count = badgeCount(t.id);
          return (
            <button
              key={t.id}
              className="soc-btn w-full min-w-0 shrink-0 sm:w-auto"
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 10px", borderRadius: 6,
                background: active ? `${t.accent}14` : "transparent",
                border: `1px solid ${active ? t.accent + "35" : "rgba(255,255,255,0.06)"}`,
                color: active ? t.accent : "rgba(100,116,139,0.5)",
                cursor: "pointer",
                ...mono, fontSize: isMobile ? 10 : 11, fontWeight: active ? 700 : 500,
                transition: "all 0.12s",
              }}
            >
              <span className="hidden text-center leading-tight break-normal sm:inline sm:whitespace-nowrap">{t.label}</span>
              <span className="whitespace-nowrap sm:hidden" style={{ textAlign: "center", lineHeight: 1.2 }}>{t.shortLabel}</span>
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

        <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1 sm:ml-auto sm:justify-end">
          <MockBadge label="FRONTEND MODULE" />
        </div>
      </div>

      {/* Panel */}
      <div
        key={tab}
        className="min-w-0"
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
