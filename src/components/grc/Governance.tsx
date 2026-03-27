// Governance — org policies, guardrails, exceptions
import { useState } from "react";
import { ScrollText, ChevronDown, ChevronRight, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import type { OrgPolicy, Guardrail, PolicyException } from "./types";
import {
  mono, divider, MockBadge, AcceptanceCheck, BackendHandoff,
  GRCSectionHeader, StatStrip, ProgressBar, StatusDot, CrossLink,
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

function PolicyRow({ policy, onNavigate }: { policy: OrgPolicy; onNavigate?: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const sc = SEV_COLOR[policy.severity] ?? "#64748b";
  const cc = CATEGORY_COLOR[policy.category] ?? "#64748b";
  const ec = ENFORCEMENT_COLOR[policy.enforcement] ?? "#64748b";
  const barColor = policy.compliance_rate >= 90 ? "#00ff88" : policy.compliance_rate >= 70 ? "#ffb000" : "#ff0040";

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
          <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{policy.description}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${ec}10`, border: `1px solid ${ec}28`, color: ec }}>
          {policy.enforcement === "exception_granted" ? "EXCEPT" : policy.enforcement.toUpperCase()}
        </span>
        <ProgressBar value={policy.compliance_rate} color={barColor} height={4} label={`${policy.compliance_rate}%`} />
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc, display: "inline-flex", alignItems: "center", gap: 4, padding: "0 8px", height: 18, borderRadius: 999, background: `${sc}10`, border: `1px solid ${sc}28` }}>
          {policy.severity}
        </span>
      </div>
      {open && (
        <div style={{ padding: "12px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Enforcement", v: policy.enforcement_mechanism },
              { l: "Owner", v: policy.owner },
              { l: "Affected Resources", v: `${policy.affected_resources}` },
              { l: "Non-Compliant", v: `${policy.non_compliant_resources}` },
              { l: "Last Reviewed", v: new Date(policy.last_reviewed).toLocaleDateString() },
              { l: "Frameworks", v: policy.linked_frameworks.join(", ") },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                <div style={{ ...mono, fontSize: 11, color: "#e2e8f0", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {policy.linked_service_tab && <CrossLink tab={policy.linked_service_tab} label={`Open ${policy.linked_service_tab.replace("-security", "").replace("-", " ").toUpperCase()} scanner`} onNavigate={onNavigate} />}
            {policy.linked_frameworks.map(fw => (
              <span key={fw} style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.5)" }}>{fw}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function GuardrailRow({ gr }: { gr: Guardrail }) {
  const tc = GUARDRAIL_TYPE_COLOR[gr.type] ?? "#64748b";
  const sc = gr.status === "active" ? "#00ff88" : gr.status === "drifted" ? "#ff0040" : gr.status === "pending" ? "#ffb000" : "#64748b";

  return (
    <div className="soc-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider }}>
      <span style={{ ...mono, fontSize: 10, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${tc}10`, border: `1px solid ${tc}28`, color: tc }}>{gr.type.replace("_", " ")}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{gr.name}</div>
        <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>{gr.scope}</div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
        {new Date(gr.last_evaluated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <StatusDot color={sc} />
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{gr.status.toUpperCase()}</span>
        {gr.drift_detected && <AlertTriangle size={10} color="#ff0040" />}
      </div>
    </div>
  );
}

function ExceptionRow({ exc }: { exc: PolicyException }) {
  const sc = EXC_STATUS_COLOR[exc.status] ?? "#64748b";
  const rc = SEV_COLOR[exc.risk_level] ?? "#64748b";

  return (
    <div className="soc-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 80px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{exc.resource_name}</div>
        <div style={{ fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>{exc.policy_name}</div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
        {exc.approved_by}
      </div>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: exc.days_remaining < 0 ? "#ff0040" : exc.days_remaining <= 30 ? "#ffb000" : "#00ff88" }}>
        {exc.days_remaining < 0 ? `Expired ${Math.abs(exc.days_remaining)}d` : `${exc.days_remaining}d left`}
      </div>
      <span style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "0 8px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${rc}10`, border: `1px solid ${rc}28`, color: rc }}>{exc.risk_level}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <StatusDot color={sc} />
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: sc }}>{exc.status.toUpperCase().replace("_", " ")}</span>
      </div>
    </div>
  );
}

export function Governance({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [section, setSection] = useState<"policies" | "guardrails" | "exceptions">("policies");
  const [catFilter, setCatFilter] = useLocalStorage<string>("grc-gov-cat-filter", "all");

  const enforced = MOCK_POLICIES.filter(p => p.enforcement === "enforced").length;
  const advisory = MOCK_POLICIES.filter(p => p.enforcement === "advisory").length;
  const withExceptions = MOCK_POLICIES.filter(p => p.enforcement === "exception_granted").length;
  const avgCompliance = Math.round(MOCK_POLICIES.reduce((a, p) => a + p.compliance_rate, 0) / MOCK_POLICIES.length);
  const drifted = MOCK_GUARDRAILS.filter(g => g.drift_detected).length;
  const activeExceptions = MOCK_EXCEPTIONS.filter(e => e.status === "active").length;
  const expiredExceptions = MOCK_EXCEPTIONS.filter(e => e.status === "expired").length;

  const categories = ["all", ...Array.from(new Set(MOCK_POLICIES.map(p => p.category)))];
  const filteredPolicies = catFilter === "all" ? MOCK_POLICIES : MOCK_POLICIES.filter(p => p.category === catFilter);

  const SECTIONS = [
    { id: "policies", label: "Policy Catalog", accent: "#a78bfa", count: MOCK_POLICIES.filter(p => p.non_compliant_resources > 0).length },
    { id: "guardrails", label: "Guardrails", accent: "#38bdf8", count: drifted },
    { id: "exceptions", label: "Exceptions", accent: "#ff6b35", count: expiredExceptions },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <GRCSectionHeader icon={<ScrollText size={16} color="#a78bfa" />} title="Governance" subtitle="Organizational security policies, enforcement guardrails, and approved exceptions" accent="#a78bfa" />

      <StatStrip stats={[
        { label: "Avg Compliance", value: `${avgCompliance}%`, color: avgCompliance >= 85 ? "#00ff88" : "#ffb000", accent: true },
        { label: "Enforced", value: enforced, color: "#00ff88" },
        { label: "Advisory", value: advisory, color: "#ffb000" },
        { label: "Exceptions", value: withExceptions, color: "#ff6b35" },
        { label: "Guardrail Drift", value: drifted, color: drifted > 0 ? "#ff0040" : "#00ff88", accent: drifted > 0 },
        { label: "Active Exceptions", value: activeExceptions, color: activeExceptions > 0 ? "#ff6b35" : "#00ff88" },
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

      {section === "policies" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Category</span>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding: "4px 8px", borderRadius: 6, ...mono, fontSize: 10, fontWeight: catFilter === c ? 700 : 400, cursor: "pointer", background: catFilter === c ? `${CATEGORY_COLOR[c] ?? "#64748b"}12` : "transparent", border: `1px solid ${catFilter === c ? (CATEGORY_COLOR[c] ?? "#64748b") + "30" : "rgba(255,255,255,0.06)"}`, color: catFilter === c ? (CATEGORY_COLOR[c] ?? "#64748b") : "rgba(100,116,139,0.45)", transition: "all 0.12s" }}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
          <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "24px 80px 1fr 80px 120px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              <span /><TH>Category</TH><TH>Policy</TH><TH>Enforcement</TH><TH>Compliance</TH><TH>Severity</TH>
            </div>
            {filteredPolicies.map(p => <PolicyRow key={p.id} policy={p} onNavigate={onNavigate} />)}
          </div>
        </>
      )}

      {section === "guardrails" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {drifted > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,0,64,0.12)", background: "rgba(255,0,64,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={11} color="#ff0040" />
              <span style={{ fontSize: 11, color: "rgba(255,0,64,0.75)" }}>{drifted} guardrail{drifted > 1 ? "s" : ""} drifted from expected state. Investigate and re-apply.</span>
              <MockBadge />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <TH>Type</TH><TH>Guardrail</TH><TH>Last Evaluated</TH><TH>Status</TH>
          </div>
          {MOCK_GUARDRAILS.map(g => <GuardrailRow key={g.id} gr={g} />)}
        </div>
      )}

      {section === "exceptions" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {expiredExceptions > 0 && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,176,0,0.12)", background: "rgba(255,176,0,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={11} color="#ffb000" />
              <span style={{ fontSize: 11, color: "rgba(255,176,0,0.75)" }}>{expiredExceptions} exception{expiredExceptions > 1 ? "s" : ""} expired. Review and either renew or remediate.</span>
              <MockBadge />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 80px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <TH>Resource / Policy</TH><TH>Approved By</TH><TH>Expires</TH><TH>Risk</TH><TH>Status</TH>
          </div>
          {MOCK_EXCEPTIONS.map(e => <ExceptionRow key={e.id} exc={e} />)}
        </div>
      )}

      <BackendHandoff endpoints={GOVERNANCE_ENDPOINTS} />
    </div>
  );
}
