// Edge Security — WAF, CloudFront, API Gateway posture
import { useEffect, useMemo, useState } from "react";
import { Globe, ShieldAlert, Zap, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { CloudFrontDistribution, WAFWebACL, APIGatewayEndpoint } from "./types";
import {
  mono, divider, SEV_COLOR, POSTURE_COLOR,
  SeverityChip, LifecyclePill, PostureChip, PostureDot, ConfidenceScore,
  SLATimer, StatStrip, ModuleHeader, BackendHandoff, EvidenceCard,
  TimelinePanel, RemediationSteps, ScenarioSimulator, MockBadge,
} from "./shared";
import {
  MOCK_WAF_ACLS, MOCK_CF_DISTRIBUTIONS, MOCK_API_GW, INFRA_SCENARIOS,
} from "./mockData";

const EDGE_ENDPOINTS = [
  { method: "GET", path: "GET /wafv2/webacls", description: "List WAF Web ACLs and associated resources" },
  { method: "GET", path: "GET /2019-03-26/distribution", description: "List CloudFront distributions with WAF config" },
  { method: "GET", path: "GET /restapis/{id}/stages", description: "List API Gateway stages and auth config" },
  { method: "PUT", path: "PUT /wafv2/webacl/{id}/associate-webacl", description: "Associate WAF ACL with resource (simulation)" },
  { method: "POST", path: "POST /2019-03-26/distribution/{id}/config", description: "Update CF distribution WAF association" },
];

// ─── WAF ACL row ──────────────────────────────────────────────────────────────
function WAFRow({ acl, isMobile }: { acl: WAFWebACL; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const c = POSTURE_COLOR[acl.status];
  const hasFindings = acl.findings.length > 0;
  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className="infra-row"
          style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}` }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere" }}>{acl.name}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", marginTop: 2, overflowWrap: "anywhere", wordBreak: "break-word" as const }}>
                {acl.associated_resource || "— unassociated —"}
              </div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span style={{ ...mono, fontSize: 10, padding: "0 7px", height: 18, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.65)" }}>
              {acl.resource_type}
            </span>
            <span style={{ ...mono, fontSize: 10, color: "#ff0040", fontWeight: 700 }}>{acl.blocked_24h.toLocaleString()} blocked</span>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.55)" }}>{acl.rule_count} rules</span>
            <span style={{ ...mono, fontSize: 10, color: hasFindings ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: hasFindings ? 700 : 400 }}>{acl.findings.length} findings</span>
            <PostureChip status={acl.status} />
          </div>
        </button>
      ) : (
        <div
          className="infra-row"
          style={{ display: "grid", gridTemplateColumns: "24px 1fr 120px 80px 80px 80px 90px", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}`, transition: "border-color 0.15s" }}
          onClick={() => setOpen(o => !o)}
        >
          <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{acl.name}</div>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.5)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{acl.associated_resource || "— unassociated —"}</div>
          </div>
          <span style={{ ...mono, fontSize: 10, padding: "0 7px", height: 18, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.65)" }}>{acl.resource_type}</span>
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#ff0040", textAlign: "right" as const }}>{acl.blocked_24h.toLocaleString()}</span>
          <span style={{ ...mono, fontSize: 11, color: "rgba(100,116,139,0.55)", textAlign: "right" as const }}>{acl.rule_count}</span>
          <span style={{ ...mono, fontSize: 11, color: hasFindings ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: hasFindings ? 700 : 400, textAlign: "right" as const }}>{acl.findings.length}</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><PostureChip status={acl.status} /></div>
        </div>
      )}
      {open && (
        <div style={{ padding: "12px 20px 16px", borderBottom: divider, background: "rgba(0,0,0,0.15)", animation: "fade-in 0.15s ease" }}>
          {acl.findings.length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(100,116,139,0.45)", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={13} color="#00ff88" /> No findings on this Web ACL
            </div>
          ) : (
            acl.findings.map(f => (
              <div key={f.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <SeverityChip severity={f.severity} />
                  <ConfidenceScore confidence={f.confidence} />
                  <LifecyclePill lifecycle={f.lifecycle} />
                  {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{f.description}</div>
                {f.evidence.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Evidence</div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>{f.evidence.map(e => <EvidenceCard key={e.id} item={e} />)}</div>
                  </div>
                )}
                {f.timeline.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>Timeline</div>
                    <TimelinePanel events={f.timeline} />
                  </div>
                )}
                <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation</div>
                <RemediationSteps steps={f.remediation_steps} />
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

// ─── CloudFront row ────────────────────────────────────────────────────────────
function CFRow({ dist, isMobile }: { dist: CloudFrontDistribution; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const c = POSTURE_COLOR[dist.status];
  const hasFindings = dist.findings.length > 0;
  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className="infra-row"
          onClick={() => setOpen(o => !o)}
          style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}` }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere" }}>{dist.domain_name}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 2, overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{dist.id} · {dist.origin}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 10, color: dist.waf_acl_id ? "#00ff88" : "#ff0040", fontWeight: 700 }}>{dist.waf_acl_id ? "WAF ✓" : "NO WAF"}</span>
            <span style={{ ...mono, fontSize: 10, color: dist.https_enforced ? "#00ff88" : "#ffb000" }}>{dist.https_enforced ? "HTTPS ✓" : "HTTP ⚠"}</span>
            <span style={{ ...mono, fontSize: 10, color: dist.access_logging ? "#00ff88" : "#ffb000" }}>{dist.access_logging ? "LOG ✓" : "LOG ✗"}</span>
            <span style={{ ...mono, fontSize: 10, color: hasFindings ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: hasFindings ? 700 : 400 }}>{dist.findings.length} findings</span>
            <PostureChip status={dist.status} />
          </div>
        </button>
      ) : (
        <div
          className="infra-row"
          style={{ display: "grid", gridTemplateColumns: "24px 1fr 90px 80px 80px 80px 80px", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}`, transition: "border-color 0.15s" }}
          onClick={() => setOpen(o => !o)}
        >
          <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{dist.domain_name}</div>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{dist.id} · {dist.origin}</div>
          </div>
          <span style={{ ...mono, fontSize: 10, color: dist.waf_acl_id ? "#00ff88" : "#ff0040", fontWeight: 700 }}>{dist.waf_acl_id ? "WAF ✓" : "NO WAF"}</span>
          <span style={{ ...mono, fontSize: 10, color: dist.https_enforced ? "#00ff88" : "#ffb000" }}>{dist.https_enforced ? "HTTPS ✓" : "HTTP ⚠"}</span>
          <span style={{ ...mono, fontSize: 10, color: dist.access_logging ? "#00ff88" : "#ffb000" }}>{dist.access_logging ? "LOG ✓" : "LOG ✗"}</span>
          <span style={{ ...mono, fontSize: 11, color: hasFindings ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: hasFindings ? 700 : 400, textAlign: "right" as const }}>{dist.findings.length}F</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><PostureChip status={dist.status} /></div>
        </div>
      )}
      {open && dist.findings.map(f => (
        <div key={f.id} style={{ padding: "12px 20px 16px", borderBottom: divider, background: "rgba(0,0,0,0.15)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <SeverityChip severity={f.severity} /><ConfidenceScore confidence={f.confidence} /><LifecyclePill lifecycle={f.lifecycle} />
            {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{f.title}</div>
          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", lineHeight: 1.5, marginBottom: 10 }}>{f.description}</div>
          {f.evidence.map(e => <EvidenceCard key={e.id} item={e} />)}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation</div>
            <RemediationSteps steps={f.remediation_steps} />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── API GW row ────────────────────────────────────────────────────────────────
function APIRow({ api, isMobile }: { api: APIGatewayEndpoint; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const c = POSTURE_COLOR[api.status];
  const authColor = api.auth_type === "NONE" ? "#ff0040" : api.auth_type === "API_KEY" ? "#ffb000" : "#00ff88";
  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className="infra-row"
          onClick={() => setOpen(o => !o)}
          style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}` }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere" }}>{api.name}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 2, overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{api.id} · {api.type} · {api.endpoint_type}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)" }}>Stage {api.stage}</span>
            <span style={{ ...mono, fontSize: 10, color: authColor, fontWeight: 700 }}>{api.auth_type.replace("_", " ")}</span>
            <span style={{ ...mono, fontSize: 10, color: api.waf_attached ? "#00ff88" : "#ff6b35" }}>{api.waf_attached ? "WAF ✓" : "NO WAF"}</span>
            <span style={{ ...mono, fontSize: 10, color: api.findings.length ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: api.findings.length ? 700 : 400 }}>{api.findings.length} findings</span>
            <PostureChip status={api.status} />
          </div>
        </button>
      ) : (
        <div
          className="infra-row"
          style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px 100px 80px 80px 80px", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? c : "transparent"}`, transition: "border-color 0.15s" }}
          onClick={() => setOpen(o => !o)}
        >
          <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{api.name}</div>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{api.id} · {api.type} · {api.endpoint_type}</div>
          </div>
          <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)" }}>{api.stage}</span>
          <span style={{ ...mono, fontSize: 10, color: authColor, fontWeight: 700 }}>{api.auth_type.replace("_", " ")}</span>
          <span style={{ ...mono, fontSize: 10, color: api.waf_attached ? "#00ff88" : "#ff6b35" }}>{api.waf_attached ? "WAF ✓" : "NO WAF"}</span>
          <span style={{ ...mono, fontSize: 11, color: api.findings.length ? "#ff6b35" : "rgba(100,116,139,0.4)", fontWeight: api.findings.length ? 700 : 400, textAlign: "right" as const }}>{api.findings.length}F</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><PostureChip status={api.status} /></div>
        </div>
      )}
      {open && api.findings.map(f => (
        <div key={f.id} style={{ padding: "12px 20px 16px", borderBottom: divider, background: "rgba(0,0,0,0.15)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <SeverityChip severity={f.severity} /><ConfidenceScore confidence={f.confidence} /><LifecyclePill lifecycle={f.lifecycle} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{f.title}</div>
          <div style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", lineHeight: 1.5, marginBottom: 10 }}>{f.description}</div>
          {f.evidence.map(e => <EvidenceCard key={e.id} item={e} />)}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation</div>
            <RemediationSteps steps={f.remediation_steps} />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Table header ──────────────────────────────────────────────────────────────
function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: right ? "right" as const : "left" as const }}>
      {children}
    </span>
  );
}

// ─── EdgeSecurity ──────────────────────────────────────────────────────────────
export function EdgeSecurity() {
  const [section, setSection] = useState<"waf" | "cloudfront" | "apigw" | "scenarios">("waf");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const totalFindings = useMemo(() =>
    [...MOCK_WAF_ACLS, ...MOCK_CF_DISTRIBUTIONS, ...MOCK_API_GW].flatMap(r => r.findings).length,
    []
  );
  const criticalFindings = useMemo(() =>
    [...MOCK_WAF_ACLS, ...MOCK_CF_DISTRIBUTIONS, ...MOCK_API_GW].flatMap(r => r.findings).filter(f => f.severity === "CRITICAL").length,
    []
  );
  const unprotectedDists = MOCK_CF_DISTRIBUTIONS.filter(d => !d.waf_acl_id).length;
  const unauthAPIs = MOCK_API_GW.filter(a => a.auth_type === "NONE").length;
  const totalBlocked24h = MOCK_WAF_ACLS.reduce((s, a) => s + a.blocked_24h, 0);

  const SECTIONS = [
    { id: "waf", label: "WAF Web ACLs", accent: "#ff6b35", count: MOCK_WAF_ACLS.filter(a => a.status !== "healthy").length },
    { id: "cloudfront", label: "CloudFront", accent: "#38bdf8", count: unprotectedDists },
    { id: "apigw", label: "API Gateway", accent: "#a78bfa", count: unauthAPIs },
    { id: "scenarios", label: "Scenarios", accent: "#ffb000" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader
        icon={<Globe size={16} color="#ff6b35" />}
        title="Edge Security"
        subtitle="WAF Web ACLs, CloudFront distributions, and API Gateway endpoints"
        accent="#ff6b35"
      />

      <StatStrip stats={[
        { label: "WAF Blocked 24h", value: totalBlocked24h.toLocaleString(), color: "#ff0040", accent: true },
        { label: "Critical Findings", value: criticalFindings, color: criticalFindings > 0 ? "#ff0040" : "#00ff88", accent: criticalFindings > 0 },
        { label: "Total Findings", value: totalFindings },
        { label: "Unprotected Dists", value: unprotectedDists, color: unprotectedDists > 0 ? "#ff6b35" : "#00ff88", accent: unprotectedDists > 0 },
        { label: "Unauth APIs", value: unauthAPIs, color: unauthAPIs > 0 ? "#ff0040" : "#00ff88", accent: unauthAPIs > 0 },
        { label: "WAF ACLs", value: MOCK_WAF_ACLS.length },
      ]} />

      {/* Sub-nav */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:flex sm:gap-1" style={{ flexShrink: 0 }}>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="infra-btn" onClick={() => setSection(s.id as typeof section)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", minWidth: 0, padding: "6px 10px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: isMobile ? 10 : 11, fontWeight: active ? 700 : 500, transition: "all 0.12s" }}
            >
              <span style={{ whiteSpace: "normal", textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 9, fontWeight: 800, padding: "0 4px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* WAF table */}
      {section === "waf" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 120px 80px 80px 80px 90px", gap: 12, padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>ACL Name / Resource</TH><TH>Type</TH><TH right>Blocked 24h</TH><TH right>Rules</TH><TH right>Findings</TH><TH right>Status</TH>
          </div>
          )}
          {MOCK_WAF_ACLS.map(a => <WAFRow key={a.id} acl={a} isMobile={isMobile} />)}
        </div>
      )}

      {/* CloudFront table */}
      {section === "cloudfront" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {!isMobile && <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 90px 80px 80px 80px 80px", gap: 12, padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Domain / ID</TH><TH>WAF</TH><TH>HTTPS</TH><TH>Logs</TH><TH right>Findings</TH><TH right>Status</TH>
          </div>}
          {MOCK_CF_DISTRIBUTIONS.map(d => <CFRow key={d.id} dist={d} isMobile={isMobile} />)}
        </div>
      )}

      {/* API GW table */}
      {section === "apigw" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {!isMobile && <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px 100px 80px 80px 80px", gap: 12, padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Name / ID</TH><TH>Stage</TH><TH>Auth</TH><TH>WAF</TH><TH right>Findings</TH><TH right>Status</TH>
          </div>}
          {MOCK_API_GW.map(a => <APIRow key={a.id} api={a} isMobile={isMobile} />)}
        </div>
      )}

      {/* Scenarios */}
      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {INFRA_SCENARIOS.filter(s => s.id === "public_edge_exposure" || s.id === "missing_logs").map(s => (
            <ScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={EDGE_ENDPOINTS} />
    </div>
  );
}
