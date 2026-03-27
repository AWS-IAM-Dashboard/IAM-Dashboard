// In Transit — TLS enforcement, certificate health, plaintext detection
import { useState } from "react";
import { Globe, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { TLSEndpoint, CertificateEntry, PlaintextChannel } from "./types";
import {
  mono, divider,
  ComplianceChip, MockBadge, ExpiryTimeline, AcceptanceCheck,
  BackendHandoff, ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard, TH,
} from "./shared";
import { MOCK_TLS_ENDPOINTS, MOCK_CERTIFICATES, MOCK_PLAINTEXT, MOCK_AUDIT_TRAIL, DP_SCENARIOS } from "./mockData";

const IN_TRANSIT_ENDPOINTS = [
  { method: "GET", path: "GET /load-balancers/{id}/listeners", description: "ALB listener config with TLS policy" },
  { method: "GET", path: "GET /2019-03-26/distribution/{id}/config", description: "CloudFront TLS min/max version" },
  { method: "GET", path: "GET /certificates", description: "ACM certificate inventory with expiry" },
  { method: "GET", path: "GET /elasticache/replication-groups", description: "ElastiCache TLS encryption-in-transit flag" },
  { method: "PUT", path: "PUT /load-balancers/{id}/listeners/{id}/attributes", description: "Update ALB TLS policy (simulation)" },
  { method: "POST", path: "POST /certificates/request", description: "Request new ACM certificate (simulation)" },
];

const TLS_VERSION_COLOR: Record<string, string> = {
  "1.3": "#00ff88", "1.2": "#00ff88", "1.1": "#ffb000", "1.0": "#ff0040", none: "#ff0040",
};

function BoolCell({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...mono, fontSize: 9.5 }}>
      {yes ? <CheckCircle2 size={10} color="#00ff88" /> : <XCircle size={10} color="rgba(100,116,139,0.4)" />}
      <span style={{ color: yes ? "rgba(0,255,136,0.7)" : "rgba(100,116,139,0.4)" }}>{label}</span>
    </span>
  );
}

// ─── TLS endpoint row ─────────────────────────────────────────────────────────
function TLSRow({ endpoint }: { endpoint: TLSEndpoint }) {
  const [open, setOpen] = useState(false);
  const minColor = TLS_VERSION_COLOR[endpoint.min_tls_version] ?? "#64748b";
  const cert = endpoint.certificate_id ? MOCK_CERTIFICATES.find(c => c.id === endpoint.certificate_id) : null;

  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 70px 80px 80px 80px 100px", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? (minColor) : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{endpoint.name}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{endpoint.resource_type} · {endpoint.region}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: minColor }}>TLS {endpoint.min_tls_version}</span>
        <BoolCell yes={endpoint.pfs_enabled} label="PFS" />
        <BoolCell yes={endpoint.hsts_enabled} label="HSTS" />
        <BoolCell yes={endpoint.http_redirect_to_https} label="Redirect" />
        {cert ? (
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: cert.days_remaining < 0 ? "#ff0040" : cert.days_remaining <= 30 ? "#ff6b35" : "#00ff88" }}>
            {cert.days_remaining < 0 ? `EXP ${Math.abs(cert.days_remaining)}d` : `${cert.days_remaining}d`}
          </span>
        ) : <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)" }}>—</span>}
        <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)" }}>{endpoint.resource_id.split("/").pop()?.slice(-12)}</span>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ComplianceChip status={endpoint.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          {cert && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Certificate</div>
              <ExpiryTimeline issuedAt={cert.issued_at} expiresAt={cert.expires_at} daysRemaining={cert.days_remaining} />
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" as const }}>
                {[{ l: "Domain", v: cert.domain }, { l: "Issuer", v: cert.issuer }, { l: "Algorithm", v: cert.algorithm }, { l: "ACM Managed", v: cert.acm_managed ? "Yes" : "No" }, { l: "Auto Renew", v: cert.auto_renew ? "Yes" : "No" }].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                    <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {endpoint.compliance !== "compliant" && (
            <AcceptanceCheck checks={[
              { label: "Min TLS version ≥ 1.2", status: endpoint.min_tls_version === "1.2" || endpoint.min_tls_version === "1.3" ? "pass" : "fail" },
              { label: "Perfect Forward Secrecy enabled", status: endpoint.pfs_enabled ? "pass" : "fail" },
              { label: "HSTS header configured", status: endpoint.hsts_enabled ? "pass" : "fail" },
              { label: "HTTP redirects to HTTPS", status: endpoint.http_redirect_to_https ? "pass" : "fail" },
              { label: "Certificate valid and not expiring", status: cert ? (cert.days_remaining > 30 ? "pass" : cert.days_remaining > 0 ? "fail" : "fail") : "pending" },
            ]} />
          )}
        </div>
      )}
    </>
  );
}

// ─── Plaintext channel row ────────────────────────────────────────────────────
function PlaintextRow({ channel }: { channel: PlaintextChannel }) {
  const sc = channel.severity === "CRITICAL" ? "#ff0040" : channel.severity === "HIGH" ? "#ff6b35" : "#ffb000";
  return (
    <div className="soc-row" style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 1fr", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider }}>
      <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", height: 18, borderRadius: 999, background: `${sc}12`, border: `1px solid ${sc}2e`, color: sc, fontSize: 10, fontWeight: 700, ...mono }}>{channel.severity}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{channel.resource_name}</div>
        <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{channel.resource_type}</div>
      </div>
      <span style={{ ...mono, fontSize: 10, color: "#ff0040" }}>{channel.protocol}</span>
      <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{channel.port}</span>
      <span style={{ fontSize: 10, color: "rgba(100,116,139,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{channel.description}</span>
    </div>
  );
}

// ─── InTransit ────────────────────────────────────────────────────────────────
export function InTransit() {
  const [section, setSection] = useState<"endpoints" | "certificates" | "plaintext" | "audit" | "scenarios">("endpoints");

  const compliant = MOCK_TLS_ENDPOINTS.filter(e => e.compliance === "compliant").length;
  const nonCompliant = MOCK_TLS_ENDPOINTS.filter(e => e.compliance === "non_compliant").length;
  const expiringCerts = MOCK_CERTIFICATES.filter(c => c.days_remaining <= 30).length;
  const expiredCerts = MOCK_CERTIFICATES.filter(c => c.days_remaining < 0).length;

  const SECTIONS = [
    { id: "endpoints", label: "TLS Endpoints", accent: "#38bdf8", count: nonCompliant },
    { id: "certificates", label: "Certificates", accent: "#ff6b35", count: expiredCerts + expiringCerts },
    { id: "plaintext", label: "Plaintext Channels", accent: "#ff0040", count: MOCK_PLAINTEXT.length },
    { id: "audit", label: "Audit Trail", accent: "#a78bfa" },
    { id: "scenarios", label: "Scenarios", accent: "#ffb000" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<Globe size={16} color="#38bdf8" />} title="In Transit" subtitle="TLS version enforcement, certificate lifecycle, and plaintext transport detection" accent="#38bdf8" />

      <StatStrip stats={[
        { label: "Compliant Endpoints", value: compliant, color: "#00ff88", accent: true },
        { label: "Non-Compliant", value: nonCompliant, color: nonCompliant > 0 ? "#ff0040" : "#00ff88", accent: nonCompliant > 0 },
        { label: "Expired Certs", value: expiredCerts, color: expiredCerts > 0 ? "#ff0040" : "#00ff88", accent: expiredCerts > 0 },
        { label: "Expiring ≤30d", value: expiringCerts, color: expiringCerts > 0 ? "#ff6b35" : "#00ff88", accent: expiringCerts > 0 },
        { label: "Plaintext Channels", value: MOCK_PLAINTEXT.length, color: MOCK_PLAINTEXT.length > 0 ? "#ff6b35" : "#00ff88", accent: MOCK_PLAINTEXT.length > 0 },
        { label: "Total Endpoints", value: MOCK_TLS_ENDPOINTS.length },
      ]} />

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} className="soc-btn" onClick={() => setSection(s.id as typeof section)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: 11, fontWeight: active ? 700 : 500, transition: "all 0.12s" }}
            >
              {s.label}
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 9, fontWeight: 800, padding: "0 4px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {section === "endpoints" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 70px 80px 80px 80px 100px", gap: 8, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span /><TH>Endpoint</TH><TH>Min TLS</TH><TH>PFS</TH><TH>HSTS</TH><TH>Redirect</TH><TH right>Cert Exp</TH><TH>ID</TH><TH right>Status</TH>
          </div>
          {MOCK_TLS_ENDPOINTS.map(e => <TLSRow key={e.id} endpoint={e} />)}
        </div>
      )}

      {section === "certificates" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {MOCK_CERTIFICATES.map(cert => {
            const expColor = cert.days_remaining < 0 ? "#ff0040" : cert.days_remaining <= 30 ? "#ff6b35" : cert.days_remaining <= 90 ? "#ffb000" : "#00ff88";
            return (
              <div key={cert.id} style={{ borderRadius: 8, border: `1px solid ${cert.compliance === "non_compliant" ? "rgba(255,0,64,0.2)" : "rgba(255,255,255,0.07)"}`, background: cert.compliance === "non_compliant" ? "rgba(255,0,64,0.03)" : "rgba(15,23,42,0.4)", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{cert.domain}</span>
                      <ComplianceChip status={cert.compliance} small />
                      {!cert.acm_managed && <MockBadge label="NOT ACM" />}
                    </div>
                    <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>
                      {cert.issuer} · {cert.algorithm} · SANs: {cert.san_domains.length > 0 ? cert.san_domains.slice(0, 3).join(", ") : "—"}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                    <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: expColor }}>
                      {cert.days_remaining < 0 ? `EXPIRED ${Math.abs(cert.days_remaining)}d ago` : `${cert.days_remaining}d`}
                    </div>
                    <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>
                      {cert.auto_renew ? "Auto-renew ON" : "⚠ No auto-renew"}
                    </div>
                  </div>
                </div>
                <ExpiryTimeline issuedAt={cert.issued_at} expiresAt={cert.expires_at} daysRemaining={cert.days_remaining} />
                {cert.attached_to.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                    <span style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)" }}>Attached to:</span>
                    {cert.attached_to.map(r => (
                      <span key={r} style={{ ...mono, fontSize: 8.5, padding: "0 5px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.5)" }}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {section === "plaintext" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 60px 1fr", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <TH>Severity</TH><TH>Resource</TH><TH>Protocol</TH><TH>Port</TH><TH>Description</TH>
          </div>
          {MOCK_PLAINTEXT.map(p => <PlaintextRow key={p.id} channel={p} />)}
        </div>
      )}

      {section === "audit" && (
        <div style={{ padding: "4px 0" }}>
          {MOCK_AUDIT_TRAIL.filter(e => ["cert-004", "prod/stripe/api-key", "redis-001"].includes(e.resource_id) || e.resource_id.startsWith("cert")).map(e => (
            <EvidenceAuditCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {DP_SCENARIOS.filter(s => s.id === "expired_certificate" || s.id === "plaintext_transport").map(s => (
            <DPScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={IN_TRANSIT_ENDPOINTS} />
    </div>
  );
}
