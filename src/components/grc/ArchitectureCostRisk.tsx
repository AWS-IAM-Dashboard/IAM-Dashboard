// Architecture & Cost Risk — resilience gaps, cost waste
import { useState } from "react";
import { Building2, ChevronDown, ChevronRight, AlertTriangle, DollarSign } from "lucide-react";
import type { ArchitectureRisk, CostRisk } from "./types";
import {
  mono, divider, MockBadge, BackendHandoff, ModuleHeader,
  StatStrip, CrossLink, SEV_COLOR, StatusDot, TH,
} from "./shared";
import { MOCK_ARCH_RISKS, MOCK_COST_RISKS, ARCH_COST_ENDPOINTS } from "./mockData";

const ARCH_CAT_COLOR: Record<string, string> = {
  availability: "#ff0040", resilience: "#ff6b35", blast_radius: "#ffb000",
  dependency: "#38bdf8", compliance_gap: "#a78bfa",
};

const RISK_STATUS_COLOR: Record<string, string> = {
  open: "#ff0040", mitigated: "#00ff88", accepted: "#ff6b35", in_progress: "#ffb000",
};

const COST_TYPE_LABEL: Record<string, string> = {
  unused: "UNUSED", oversized: "OVERSIZED", unattached: "UNATTACHED",
  orphaned: "ORPHANED", reservation_waste: "RESERVATION",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: "#00ff88", MEDIUM: "#ffb000", LOW: "#64748b",
};

function ArchRiskRow({ risk, onNavigate }: { risk: ArchitectureRisk; onNavigate?: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const sc = SEV_COLOR[risk.severity] ?? "#64748b";
  const cc = ARCH_CAT_COLOR[risk.category] ?? "#64748b";
  const stc = RISK_STATUS_COLOR[risk.status] ?? "#64748b";

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 100px 1fr 80px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${cc}10`, border: `1px solid ${cc}28`, color: cc }}>{risk.category.replace("_", " ")}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{risk.name}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${sc}10`, border: `1px solid ${sc}28`, color: sc }}>{risk.severity}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StatusDot color={stc} />
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: stc }}>{risk.status.toUpperCase().replace("_", " ")}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{risk.description}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Impact</span>
            <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: sc }}>{risk.estimated_impact}</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Affected Resources</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
              {risk.affected_resources.map(r => (
                <span key={r} style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.6)" }}>{r}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", marginBottom: 12 }}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(0,255,136,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Recommendation</div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>{risk.recommendation}</div>
          </div>
          {risk.linked_service_tab && <CrossLink tab={risk.linked_service_tab} onNavigate={onNavigate} />}
        </div>
      )}
    </>
  );
}

function CostRiskRow({ risk, onNavigate }: { risk: CostRisk; onNavigate?: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const conf = CONFIDENCE_COLOR[risk.confidence] ?? "#64748b";

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 100px 1fr 80px 80px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? "#ffb000" : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.28)", color: "#ffb000" }}>{COST_TYPE_LABEL[risk.risk_type]}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{risk.resource_name}</div>
          <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 2 }}>{risk.resource_type}</div>
        </div>
        <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "#ff6b35" }}>${Math.round(risk.monthly_waste_usd)}</span>
        <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)" }}>/mo</span>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: conf }}>{risk.confidence}</span>
      </div>
      {open && (
        <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{risk.description}</div>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)", marginBottom: 12 }}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(0,255,136,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Recommendation</div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>{risk.recommendation}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)" }}>Detected {new Date(risk.detected_at).toLocaleDateString()}</span>
            {risk.linked_service_tab && <CrossLink tab={risk.linked_service_tab} onNavigate={onNavigate} />}
          </div>
        </div>
      )}
    </>
  );
}

export function ArchitectureCostRisk({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [section, setSection] = useState<"architecture" | "cost">("architecture");

  const archOpen = MOCK_ARCH_RISKS.filter(r => r.status === "open").length;
  const archCritical = MOCK_ARCH_RISKS.filter(r => r.severity === "CRITICAL").length;
  const totalWaste = Math.round(MOCK_COST_RISKS.reduce((a, r) => a + r.monthly_waste_usd, 0));
  const highConfWaste = Math.round(MOCK_COST_RISKS.filter(r => r.confidence === "HIGH").reduce((a, r) => a + r.monthly_waste_usd, 0));

  const SECTIONS = [
    { id: "architecture", label: "Architecture Risks", accent: "#ff6b35", count: archOpen },
    { id: "cost", label: "Cost Risks", accent: "#ffb000", count: MOCK_COST_RISKS.length },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<Building2 size={16} color="#ff6b35" />} title="Architecture & Cost Risk" subtitle="Availability gaps, resilience issues, and recoverable infrastructure cost" accent="#ff6b35" />

      <StatStrip stats={[
        { label: "Open Risks", value: archOpen, color: archOpen > 0 ? "#ff0040" : "#00ff88", accent: archOpen > 0 },
        { label: "Critical", value: archCritical, color: archCritical > 0 ? "#ff0040" : "#00ff88", accent: archCritical > 0 },
        { label: "Monthly Waste", value: `$${totalWaste}`, color: "#ff6b35", accent: true },
        { label: "High Confidence", value: `$${highConfWaste}`, color: "#ffb000" },
      ]} />

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="soc-btn" onClick={() => setSection(s.id as typeof section)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: 11, fontWeight: active ? 700 : 500, transition: "all 0.12s" }}
            >
              {s.label}
              {s.count > 0 && (
                <span style={{ ...mono, fontSize: 10, fontWeight: 800, padding: "0 4px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {section === "architecture" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px 100px 1fr 80px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Category</TH><TH>Risk</TH><TH>Severity</TH><TH>Status</TH>
          </div>
          {MOCK_ARCH_RISKS.map(r => <ArchRiskRow key={r.id} risk={r} onNavigate={onNavigate} />)}
        </div>
      )}

      {section === "cost" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,176,0,0.12)", background: "rgba(255,176,0,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={11} color="#ffb000" />
            <span style={{ fontSize: 11, color: "rgba(255,176,0,0.75)" }}>${totalWaste}/mo recoverable. ${highConfWaste}/mo high-confidence.</span>
            <MockBadge />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "24px 100px 1fr 80px 80px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Type</TH><TH>Resource</TH><TH>Waste</TH><TH>Period</TH><TH>Confidence</TH>
          </div>
          {MOCK_COST_RISKS.map(r => <CostRiskRow key={r.id} risk={r} onNavigate={onNavigate} />)}
        </div>
      )}

      <BackendHandoff endpoints={ARCH_COST_ENDPOINTS} />
    </div>
  );
}
