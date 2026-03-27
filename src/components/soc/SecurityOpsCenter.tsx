import { useState } from "react";
import { AlertOctagon, Eye, Activity, FileText, Database, Settings } from "lucide-react";
import { AlertQueue } from "./AlertQueue";
import { MonitoringCoverage } from "./MonitoringCoverage";
import { LogPipeline } from "./LogPipeline";
import { InvestigationWorkspace } from "./InvestigationWorkspace";
import { QueryWorkbench } from "./QueryWorkbench";
import { SOCConfig } from "./SOCConfig";
import { SOCGlobalStyles, mono } from "./shared";
import { MOCK_ALERTS, MOCK_PIPELINE_ERRORS, MOCK_INVESTIGATIONS, MOCK_PIPELINE } from "./mockData";

type SOCTab = "alerts" | "coverage" | "pipeline" | "investigations" | "query" | "config";

// Live counts derive from mock data — in production these come from a summary endpoint
const newCriticalHigh = MOCK_ALERTS.filter(a =>
  (a.severity === "CRITICAL" || a.severity === "HIGH") && a.status === "NEW"
).length;
const pipelineErrors = MOCK_PIPELINE_ERRORS.filter(e => !e.resolved).length;
const openCases = MOCK_INVESTIGATIONS.filter(i => i.status !== "CLOSED").length;
const degradedSources = MOCK_PIPELINE.filter(p => p.status === "degraded" || p.status === "error").length;

const TABS: {
  id: SOCTab;
  label: string;
  icon: React.ReactNode;
  accent: string;
  count?: number;
  countColor?: string;
}[] = [
  {
    id: "alerts",
    label: "Alert Queue",
    icon: <AlertOctagon size={13} />,
    accent: "#ff6b35",
    count: newCriticalHigh > 0 ? newCriticalHigh : undefined,
    countColor: "#ff0040",
  },
  {
    id: "coverage",
    label: "Coverage",
    icon: <Eye size={13} />,
    accent: "#38bdf8",
  },
  {
    id: "pipeline",
    label: "Log Pipeline",
    icon: <Activity size={13} />,
    accent: "#a78bfa",
    count: degradedSources > 0 ? degradedSources : undefined,
    countColor: pipelineErrors > 0 ? "#ff6b35" : "#ffb000",
  },
  {
    id: "investigations",
    label: "Investigations",
    icon: <FileText size={13} />,
    accent: "#60a5fa",
    count: openCases > 0 ? openCases : undefined,
    countColor: "#60a5fa",
  },
  {
    id: "query",
    label: "Query Workbench",
    icon: <Database size={13} />,
    accent: "#ffb000",
  },
  {
    id: "config",
    label: "SOC Config",
    icon: <Settings size={13} />,
    accent: "#64748b",
  },
];

export function SecurityOpsCenter() {
  const [activeTab, setActiveTab] = useState<SOCTab>("alerts");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <SOCGlobalStyles />

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
              className="soc-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 13px", borderRadius: 7,
                background: isActive ? `${tab.accent}14` : "transparent",
                border: `1px solid ${isActive ? tab.accent + "35" : "rgba(255,255,255,0.06)"}`,
                color: isActive ? tab.accent : "rgba(100,116,139,0.5)",
                cursor: "pointer", whiteSpace: "nowrap",
                ...mono, fontSize: 11, fontWeight: isActive ? 700 : 500,
                transition: "all 0.12s",
                boxShadow: isActive ? `0 0 0 1px ${tab.accent}08 inset` : "none",
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
                  animation: tab.id === "alerts" ? "ir-pulse 2.5s infinite" : "none",
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        key={activeTab}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", animation: "fade-in 0.16s ease" }}
      >
        {activeTab === "alerts"         && <AlertQueue />}
        {activeTab === "coverage"       && <MonitoringCoverage />}
        {activeTab === "pipeline"       && <LogPipeline />}
        {activeTab === "investigations" && <InvestigationWorkspace />}
        {activeTab === "query"          && <QueryWorkbench />}
        {activeTab === "config"         && <SOCConfig />}
      </div>
    </div>
  );
}
