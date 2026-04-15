// Governance — org policies, guardrails, exceptions
import { useState, useEffect } from "react";
import { ScrollText, ChevronDown, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import type { OrgPolicy, Guardrail, PolicyException } from "./types";
import {
  mono, divider, MockBadge, BackendHandoff, ModuleHeader,
  StatStrip, ProgressBar, StatusDot, CrossLink,
  SEV_COLOR, TH, useLocalStorage,
} from "./shared";
import { MOCK_POLICIES, MOCK_GUARDRAILS, MOCK_EXCEPTIONS, GOVERNANCE_ENDPOINTS } from "./mockData";

const CATEGORY_COLOR: Record<string, string> = {
  encryption: "#a78bfa", access: "#ff6b35", network: "#38bdf8",
  logging: "#ffb000", tagging: "#64748b", compute: "#60a5fa",
};

const ENFORCEMENT_COLOR: Record<string, string> = {
  enforced: "#00ff88", advisory: "#ffb000", exception_granted: "#ff6b35",
};

const GUARDRAIL_TYPE_COLOR: Record<string, string> = {
  SCP: "#ff6b35", Config_Rule: "#38bdf8", IAM_Boundary: "#a78bfa",
  Tag_Policy: "#64748b", S3_Block: "#00ff88",
};

const EXC_STATUS_COLOR: Record<string, string> = {
  active: "#00ff88", expired: "#ff0040", pending_review: "#ffb000", revoked: "#64748b",
};

function PolicyRow({ policy, onNavigate, isMobile }: { policy: OrgPolicy; onNavigate?: (tab: string) => void; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const sc = SEV_COLOR[policy.severity] ?? "#64748b";
  const cc = CATEGORY_COLOR[policy.category] ?? "#64748b";
  const ec = ENFORCEMENT_COLOR[policy.enforcement] ?? "#64748b";
  const barColor = policy.compliance_rate >= 90 ? "#00ff88" : policy.compliance_rate >= 70 ? "#ffb000" : "#ff0040";

  const expandedPolicy = open && (
    <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{policy.description}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
        {[
          { l: "Enforcement", v: policy.enforcement_mechanism },
          { l: "Owner", v: policy.owner },
          { l: "Resources", v: `${policy.non_compliant_resources} non-compliant / ${policy.affected_resources} total` },
          { l: "Last Reviewed", v: new Date(policy.last_reviewed).toLocaleDateString() },
        ].map(({ l, v }) => (
          <div key={l}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
            <div style={{ ...mono, fontSize: 11, color: "#e2e8f0", marginTop: 4, overflowWrap: "anywhere" as const }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
        {policy.linked_service_tab && <CrossLink tab={policy.linked_service_tab} onNavigate={onNavigate} />}
        {policy.linked_frameworks.map(fw => (
          <span key={fw} style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.5)" }}>{fw}</span>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="soc-row"
          style={{
            width: "100%", textAlign: "left", background: "transparent", border: "none",
            padding: "10px 12px", borderBottom: divider, cursor: "pointer",
            borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${cc}10`, border: `1px solid ${cc}28`, color: cc }}>{policy.category}</span>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginTop: 6, overflowWrap: "anywhere" as const }}>{policy.name}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${ec}10`, border: `1px solid ${ec}28`, color: ec }}>
              {policy.enforcement === "exception_granted" ? "EXCEPT" : policy.enforcement.toUpperCase()}
            </span>
            <div style={{ minWidth: 80, flex: "1 1 120px", maxWidth: "100%" }}><ProgressBar value={policy.compliance_rate} color={barColor} height={4} /></div>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc, display: "inline-flex", alignItems: "center", gap: 4, padding: "0 8px", height: 16, borderRadius: 999, background: `${sc}10`, border: `1px solid ${sc}28` }}>
              {policy.severity}
            </span>
          </div>
        </button>
        {expandedPolicy}
      </>
    );
  }

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 80px 1fr 80px 120px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${cc}10`, border: `1px solid ${cc}28`, color: cc }}>{policy.category}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{policy.name}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${ec}10`, border: `1px solid ${ec}28`, color: ec }}>
          {policy.enforcement === "exception_granted" ? "EXCEPT" : policy.enforcement.toUpperCase()}
        </span>
        <ProgressBar value={policy.compliance_rate} color={barColor} height={4} />
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc, display: "inline-flex", alignItems: "center", gap: 4, padding: "0 8px", height: 16, borderRadius: 999, background: `${sc}10`, border: `1px solid ${sc}28` }}>
          {policy.severity}
        </span>
      </div>
      {expandedPolicy}
    </>
  );
}

function GuardrailRow({ gr, isMobile }: { gr: Guardrail; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const tc = GUARDRAIL_TYPE_COLOR[gr.type] ?? "#64748b";
  const sc = gr.status === "active" ? "#00ff88" : gr.status === "drifted" ? "#ff0040" : gr.status === "pending" ? "#ffb000" : "#64748b";

  const expandedGr = open && (
    <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{gr.description}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { l: "Scope", v: gr.scope },
          { l: "Last Evaluated", v: new Date(gr.last_evaluated).toLocaleString() },
          { l: "Enforces", v: gr.policies_enforced.join(", ") },
          { l: "Drift", v: gr.drift_detected ? "DETECTED — requires investigation" : "None" },
        ].map(({ l, v }) => (
          <div key={l}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
            <div style={{ ...mono, fontSize: 11, color: l === "Drift" && gr.drift_detected ? "#ff0040" : "#e2e8f0", marginTop: 4, overflowWrap: "anywhere" as const }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="soc-row"
          style={{
            width: "100%", textAlign: "left", background: "transparent", border: "none",
            padding: "10px 12px", borderBottom: divider, cursor: "pointer",
            borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${tc}10`, border: `1px solid ${tc}28`, color: tc }}>{gr.type.replace("_", " ")}</span>
              <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginTop: 6, overflowWrap: "anywhere" as const }}>{gr.name}</div>
              <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", marginTop: 4 }}>
                {new Date(gr.last_evaluated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StatusDot color={sc} />
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{gr.status.toUpperCase()}</span>
              {gr.drift_detected && <AlertTriangle size={10} color="#ff0040" />}
            </div>
          </div>
        </button>
        {expandedGr}
      </>
    );
  }

  return (
    <>
      <div className="soc-row" onClick={() => setOpen(o => !o)} style={{ display: "grid", gridTemplateColumns: "24px 80px 1fr 100px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}>
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${tc}10`, border: `1px solid ${tc}28`, color: tc }}>{gr.type.replace("_", " ")}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{gr.name}</div>
        </div>
        <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          {new Date(gr.last_evaluated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
          <StatusDot color={sc} />
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{gr.status.toUpperCase()}</span>
          {gr.drift_detected && <AlertTriangle size={10} color="#ff0040" />}
        </div>
      </div>
      {expandedGr}
    </>
  );
}

function ExceptionRow({ exc, isMobile }: { exc: PolicyException; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const sc = EXC_STATUS_COLOR[exc.status] ?? "#64748b";
  const rc = SEV_COLOR[exc.risk_level] ?? "#64748b";
  const expiryColor = exc.days_remaining < 0 ? "#ff0040" : exc.days_remaining <= 30 ? "#ffb000" : "#00ff88";

  const expandedExc = open && (
    <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
        <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4 }}>Justification</div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>{exc.reason}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { l: "Approved By", v: exc.approved_by },
          { l: "Approved", v: new Date(exc.approved_at).toLocaleDateString() },
          { l: "Expires", v: new Date(exc.expires_at).toLocaleDateString() },
          { l: "Resource", v: exc.resource_id },
        ].map(({ l, v }) => (
          <div key={l}>
            <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
            <div style={{ ...mono, fontSize: 11, color: "#e2e8f0", marginTop: 4, overflowWrap: "anywhere" as const }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="soc-row"
          style={{
            width: "100%", textAlign: "left", background: "transparent", border: "none",
            padding: "10px 12px", borderBottom: divider, cursor: "pointer",
            borderLeft: `2px solid ${open ? expiryColor : "transparent"}`, transition: "border-color 0.15s",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere" as const }}>{exc.resource_name}</div>
              <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 2 }}>{exc.policy_name}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>{exc.approved_by}</span>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: expiryColor }}>
              {exc.days_remaining < 0 ? `${Math.abs(exc.days_remaining)}d over` : `${exc.days_remaining}d left`}
            </span>
            <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${rc}10`, border: `1px solid ${rc}28`, color: rc }}>{exc.risk_level}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StatusDot color={sc} />
              <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{exc.status.toUpperCase().replace("_", " ")}</span>
            </div>
          </div>
        </button>
        {expandedExc}
      </>
    );
  }

  return (
    <>
      <div className="soc-row" onClick={() => setOpen(o => !o)} style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 80px 80px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? expiryColor : "transparent"}`, transition: "border-color 0.15s" }}>
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{exc.resource_name}</div>
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 2 }}>{exc.policy_name}</div>
        </div>
        <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          {exc.approved_by}
        </div>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: expiryColor }}>
          {exc.days_remaining < 0 ? `${Math.abs(exc.days_remaining)}d over` : `${exc.days_remaining}d left`}
        </div>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${rc}10`, border: `1px solid ${rc}28`, color: rc }}>{exc.risk_level}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
          <StatusDot color={sc} />
          <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{exc.status.toUpperCase().replace("_", " ")}</span>
        </div>
      </div>
      {expandedExc}
    </>
  );
}

export function Governance({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [section, setSection] = useState<"policies" | "guardrails" | "exceptions">("policies");
  const [catFilter, setCatFilter] = useLocalStorage<string>("grc-gov-cat-filter", "all");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const avgCompliance = Math.round(MOCK_POLICIES.reduce((a, p) => a + p.compliance_rate, 0) / MOCK_POLICIES.length);
  const belowThreshold = MOCK_POLICIES.filter(p => p.compliance_rate < 80).length;
  const drifted = MOCK_GUARDRAILS.filter(g => g.drift_detected).length;
  const expiredExceptions = MOCK_EXCEPTIONS.filter(e => e.status === "expired").length;
  const staleReviews = MOCK_POLICIES.filter(p => (Date.now() - new Date(p.last_reviewed).getTime()) > 60 * 86_400_000).length;

  const categories = ["all", ...Array.from(new Set(MOCK_POLICIES.map(p => p.category)))];
  const filteredPolicies = catFilter === "all" ? MOCK_POLICIES : MOCK_POLICIES.filter(p => p.category === catFilter);

  const SECTIONS = [
    { id: "policies" as const, label: "Policy Catalog", shortLabel: "Policies", accent: "#a78bfa", count: belowThreshold },
    { id: "guardrails" as const, label: "Guardrails", shortLabel: "Guards", accent: "#38bdf8", count: drifted },
    { id: "exceptions" as const, label: "Exceptions", shortLabel: "Exc", accent: "#ff6b35", count: expiredExceptions },
  ];

  return (
    <div className="min-w-0 max-w-full" style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<ScrollText size={16} color="#a78bfa" />} title="Governance" subtitle="Organizational security policies, enforcement guardrails, and approved exceptions" accent="#a78bfa" />

      <StatStrip stats={[
        { label: "Avg Compliance", value: `${avgCompliance}%`, color: avgCompliance >= 85 ? "#00ff88" : "#ffb000", accent: true },
        { label: "Below 80%", value: belowThreshold, color: belowThreshold > 0 ? "#ff0040" : "#00ff88", accent: belowThreshold > 0 },
        { label: "Guardrail Drift", value: drifted, color: drifted > 0 ? "#ff0040" : "#00ff88", accent: drifted > 0 },
        { label: "Stale Reviews", value: staleReviews, color: staleReviews > 0 ? "#ffb000" : "#00ff88", accent: staleReviews > 0 },
      ]} />

      {/* Mobile: 3 equal columns (stays in viewport); sm+: wrap row */}
      <div className="mb-3 grid min-w-0 w-full grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className="soc-btn flex min-w-0 w-full flex-col items-center justify-center gap-1 px-1 py-2 sm:w-auto sm:flex-row sm:gap-2 sm:px-2.5 sm:py-[5px]"
              onClick={() => setSection(s.id)}
              style={{
                borderRadius: 6,
                background: active ? `${s.accent}12` : "transparent",
                border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`,
                color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono,
                fontSize: isMobile ? 10 : 11, fontWeight: active ? 700 : 500, transition: "all 0.12s",
              }}
            >
              <span className="hidden whitespace-nowrap sm:inline">{s.label}</span>
              <span className="max-w-full truncate text-center text-[9px] leading-tight sm:hidden">{s.shortLabel}</span>
              {s.count > 0 && (
                <span
                  style={{
                    ...mono, fontSize: isMobile ? 9 : 10, fontWeight: 800, padding: "0 5px", minHeight: isMobile ? 16 : 16,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999,
                    background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent,
                  }}
                >
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {section === "policies" && (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-2" style={{ marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.1em", flexShrink: 0 }}>Category</span>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding: "4px 8px", borderRadius: 6, ...mono, fontSize: 10, fontWeight: catFilter === c ? 700 : 400, cursor: "pointer", background: catFilter === c ? `${CATEGORY_COLOR[c] ?? "#64748b"}12` : "transparent", border: `1px solid ${catFilter === c ? (CATEGORY_COLOR[c] ?? "#64748b") + "30" : "rgba(255,255,255,0.06)"}`, color: catFilter === c ? (CATEGORY_COLOR[c] ?? "#64748b") : "rgba(100,116,139,0.45)", transition: "all 0.12s" }}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
          <div className="min-w-0 overflow-x-hidden" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: "24px 80px 1fr 80px 120px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
            >
              <span /><TH>Category</TH><TH>Policy</TH><TH>Enforcement</TH><TH>Compliance</TH><TH>Severity</TH>
            </div>
            {filteredPolicies.map(p => <PolicyRow key={p.id} policy={p} onNavigate={onNavigate} isMobile={isMobile} />)}
          </div>
        </>
      )}

      {section === "guardrails" && (
        <div className="min-w-0 overflow-x-hidden" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {drifted > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,0,64,0.12)", background: "rgba(255,0,64,0.04)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <AlertTriangle size={11} color="#ff0040" />
              <span style={{ fontSize: 11, color: "rgba(255,0,64,0.75)", overflowWrap: "anywhere" as const }}>{drifted} guardrail{drifted > 1 ? "s" : ""} drifted from expected state. Investigate and re-apply.</span>
              <MockBadge />
            </div>
          )}
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "24px 80px 1fr 100px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <span /><TH>Type</TH><TH>Guardrail</TH><TH>Last Evaluated</TH><TH>Status</TH>
          </div>
          {MOCK_GUARDRAILS.map(g => <GuardrailRow key={g.id} gr={g} isMobile={isMobile} />)}
        </div>
      )}

      {section === "exceptions" && (
        <div className="min-w-0 overflow-x-hidden" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {expiredExceptions > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,176,0,0.12)", background: "rgba(255,176,0,0.04)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <Clock size={11} color="#ffb000" />
              <span style={{ fontSize: 11, color: "rgba(255,176,0,0.75)", overflowWrap: "anywhere" as const }}>{expiredExceptions} exception{expiredExceptions > 1 ? "s" : ""} expired. Review and either renew or remediate.</span>
              <MockBadge />
            </div>
          )}
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "24px 1fr 100px 80px 80px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <span /><TH>Resource / Policy</TH><TH>Approved By</TH><TH>Expires</TH><TH>Risk</TH><TH>Status</TH>
          </div>
          {MOCK_EXCEPTIONS.map(e => <ExceptionRow key={e.id} exc={e} isMobile={isMobile} />)}
        </div>
      )}

      <BackendHandoff endpoints={GOVERNANCE_ENDPOINTS} />
    </div>
  );
}
