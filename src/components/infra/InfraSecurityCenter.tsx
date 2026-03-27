// Infrastructure Security Center — top-level container with 4 sub-tabs
import { useState } from "react";
import { Globe, Network, Server, Wifi } from "lucide-react";
import { EdgeSecurity } from "./EdgeSecurity";
import { NetworkSecurity } from "./NetworkSecurity";
import { ComputeSecurity } from "./ComputeSecurity";
import { NetworkTroubleshooting } from "./NetworkTroubleshooting";
import { InfraGlobalStyles, mono, MockBadge } from "./shared";
import {
  MOCK_SG_FINDINGS, MOCK_COMPUTE_FINDINGS, MOCK_CF_DISTRIBUTIONS,
  MOCK_API_GW, MOCK_WAF_ACLS, MOCK_VPC_FLOW_LOGS,
} from "./mockData";

type InfraTab = "edge" | "network" | "compute" | "troubleshoot";

// Live counts from mock data
const openSGFindings = MOCK_SG_FINDINGS.filter(f => f.lifecycle === "open" || f.lifecycle === "triaged").length;
const unprotectedEdge = MOCK_CF_DISTRIBUTIONS.filter(d => !d.waf_acl_id).length + MOCK_API_GW.filter(a => a.auth_type === "NONE").length;
const criticalCompute = MOCK_COMPUTE_FINDINGS.filter(f => f.severity === "CRITICAL").length;
const flowLogGaps = MOCK_VPC_FLOW_LOGS.filter(v => !v.flow_logs_enabled).length;

const TABS: {
  id: InfraTab;
  label: string;
  icon: React.ReactNode;
  accent: string;
  count?: number;
  countColor?: string;
}[] = [
  {
    id: "edge",
    label: "Edge Security",
    icon: <Globe size={13} />,
    accent: "#ff6b35",
    count: unprotectedEdge > 0 ? unprotectedEdge : undefined,
    countColor: "#ff0040",
  },
  {
    id: "network",
    label: "Network Security",
    icon: <Network size={13} />,
    accent: "#38bdf8",
    count: openSGFindings > 0 ? openSGFindings : undefined,
    countColor: "#ff6b35",
  },
  {
    id: "compute",
    label: "Compute Security",
    icon: <Server size={13} />,
    accent: "#ff6b35",
    count: criticalCompute > 0 ? criticalCompute : undefined,
    countColor: "#ff0040",
  },
  {
    id: "troubleshoot",
    label: "Network Troubleshooting",
    icon: <Wifi size={13} />,
    accent: "#38bdf8",
    count: flowLogGaps > 0 ? flowLogGaps : undefined,
    countColor: "#ffb000",
  },
];

export function InfraSecurityCenter() {
  const [activeTab, setActiveTab] = useState<InfraTab>("edge");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <InfraGlobalStyles />

      {/* Sub-nav */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        paddingBottom: 16, overflowX: "auto", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 20,
      }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="infra-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 13px", borderRadius: 7,
                background: isActive ? `${tab.accent}14` : "transparent",
                border: `1px solid ${isActive ? tab.accent + "35" : "rgba(255,255,255,0.06)"}`,
                color: isActive ? tab.accent : "rgba(100,116,139,0.5)",
                cursor: "pointer", whiteSpace: "nowrap",
                ...mono, fontSize: 11, fontWeight: isActive ? 700 : 500,
                transition: "all 0.12s",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.55, display: "flex" }}>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 16, height: 16, borderRadius: 999, padding: "0 4px",
                  background: `${tab.countColor ?? tab.accent}1a`,
                  border: `1px solid ${tab.countColor ?? tab.accent}35`,
                  color: tab.countColor ?? tab.accent,
                  fontSize: 9, fontWeight: 800, lineHeight: 1,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Global context badge */}
        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.35)" }}>Acct 123456789012</span>
          <MockBadge label="FRONTEND MODULE" />
        </div>
      </div>

      {/* Panel */}
      <div
        key={activeTab}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", animation: "fade-in 0.16s ease" }}
      >
        {activeTab === "edge"         && <EdgeSecurity />}
        {activeTab === "network"      && <NetworkSecurity />}
        {activeTab === "compute"      && <ComputeSecurity />}
        {activeTab === "troubleshoot" && <NetworkTroubleshooting />}
      </div>
    </div>
  );
}
