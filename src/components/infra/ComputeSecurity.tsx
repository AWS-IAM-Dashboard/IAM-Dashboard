// Compute Security — EC2 instances and Lambda functions
import { useState, useMemo, useEffect } from "react";
import { Server, ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { ComputeInstanceFinding, LambdaFinding, PatchStatus } from "./types";
import {
  mono, divider,
  SeverityChip, LifecyclePill,
  SLATimer, StatStrip, ModuleHeader, BackendHandoff,
  RemediationSteps, ScenarioSimulator, useLocalStorage,
} from "./shared";
import {
  MOCK_COMPUTE_FINDINGS, MOCK_LAMBDA_FINDINGS, INFRA_SCENARIOS,
} from "./mockData";

const COMPUTE_ENDPOINTS = [
  { method: "GET", path: "GET /instances", description: "Describe all EC2 instances with security metadata" },
  { method: "GET", path: "GET /ssm/managed-instances", description: "List SSM-managed instances and patch compliance" },
  { method: "GET", path: "GET /functions", description: "List Lambda functions with role and config data" },
  { method: "POST", path: "POST /instances/{id}/modify-metadata-options", description: "Enforce IMDSv2 on instance (simulation)" },
  { method: "POST", path: "POST /ssm/patch-baseline/associate", description: "Attach patch baseline and run patching (simulation)" },
];

const PATCH_COLOR: Record<PatchStatus, string> = {
  current: "#00ff88",
  behind_1_month: "#ffb000",
  behind_3_months: "#ff6b35",
  critical: "#ff0040",
  unknown: "#64748b",
};

const PATCH_LABEL: Record<PatchStatus, string> = {
  current: "Current",
  behind_1_month: "1mo behind",
  behind_3_months: "3mo behind",
  critical: "Critical",
  unknown: "Unknown",
};

function BoolDot({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...mono, fontSize: 9.5 }}>
      {yes ? <CheckCircle2 size={10} color="#00ff88" /> : <XCircle size={10} color="#ff6b35" />}
      <span style={{ color: yes ? "rgba(0,255,136,0.7)" : "rgba(255,107,53,0.7)" }}>{label}</span>
    </span>
  );
}

// ─── Instance row ─────────────────────────────────────────────────────────────
function InstanceRow({ f, isMobile, onLifecycleChange }: { f: ComputeInstanceFinding; isMobile: boolean; onLifecycleChange: (id: string, lc: typeof f.lifecycle) => void }) {
  const [open, setOpen] = useState(false);
  const sc = f.severity === "CRITICAL" ? "#ff0040" : f.severity === "HIGH" ? "#ff6b35" : f.severity === "MEDIUM" ? "#ffb000" : "#00ff88";
  const patchC = PATCH_COLOR[f.patch_status];

  const expandedPanel = open && (
    <div style={{ padding: "12px 16px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" as const }}>
        {[
          { label: "Region", value: f.region },
          { label: "AZ", value: f.az },
          { label: "Type", value: f.instance_type },
          { label: "Public IP", value: f.public_ip ?? "Private" },
          { label: "EBS Encrypted", value: f.ebs_encrypted ? "Yes" : "No" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</div>
            <div style={{ ...mono, fontSize: 10, color: "#e2e8f0", marginTop: 2, overflowWrap: "anywhere" as const }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5, marginBottom: 10 }}>{f.top_finding}</div>
      <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation Checklist</div>
      <RemediationSteps steps={f.remediation_steps} onComplete={() => onLifecycleChange(f.id, "remediated")} />
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="infra-row"
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: "10px 12px",
            borderBottom: divider,
            cursor: "pointer",
            borderLeft: `2px solid ${open ? sc : "transparent"}`,
            transition: "border-color 0.15s",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <SeverityChip severity={f.severity} />
                {f.public_ip && (
                  <span style={{ ...mono, fontSize: 9, padding: "0 5px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.2)", color: "#ff0040" }}>PUBLIC</span>
                )}
              </div>
              <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{f.instance_name}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 2, overflowWrap: "anywhere" }}>{f.instance_id}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{f.instance_type}</span>
            <span style={{ ...mono, fontSize: 10, color: patchC, fontWeight: 600 }}>{PATCH_LABEL[f.patch_status]}</span>
            <BoolDot yes={f.ssm_managed} label="SSM" />
            <BoolDot yes={f.imdsv2_required} label="IMDSv2" />
            <LifecyclePill lifecycle={f.lifecycle} />
            {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
          </div>
        </button>
        {expandedPanel}
      </>
    );
  }

  return (
    <>
      <div
        className="infra-row"
        style={{ display: "grid", gridTemplateColumns: "24px 100px 140px 80px 80px 80px 1fr 80px", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <SeverityChip severity={f.severity} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 10, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.instance_name}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{f.instance_id}</div>
        </div>
        <span style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{f.instance_type}</span>
        <span style={{ ...mono, fontSize: 10, color: patchC, fontWeight: 600 }}>{PATCH_LABEL[f.patch_status]}</span>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 2 }}>
          <BoolDot yes={f.ssm_managed} label="SSM" />
          <BoolDot yes={f.imdsv2_required} label="IMDSv2" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const, minWidth: 0 }}>
          <LifecyclePill lifecycle={f.lifecycle} />
          {f.sla_breached && <SLATimer deadline={f.sla_deadline} breached />}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center", flexWrap: "wrap" as const }}>
          {f.public_ip && <span style={{ ...mono, fontSize: 9, padding: "0 5px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.2)", color: "#ff0040" }}>PUBLIC</span>}
        </div>
      </div>
      {expandedPanel}
    </>
  );
}

// ─── Lambda row ────────────────────────────────────────────────────────────────
function LambdaRow({ f, isMobile, onLifecycleChange }: { f: LambdaFinding; isMobile: boolean; onLifecycleChange: (id: string, lc: typeof f.lifecycle) => void }) {
  const [open, setOpen] = useState(false);
  const sc = f.severity === "CRITICAL" ? "#ff0040" : f.severity === "HIGH" ? "#ff6b35" : f.severity === "MEDIUM" ? "#ffb000" : "#00ff88";
  const roleShort = f.execution_role_arn.split("/").pop() ?? f.execution_role_arn;

  const expandedLambda = open && (
    <div style={{ padding: "12px 16px 16px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
      <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginBottom: 4 }}>EXEC ROLE</div>
      <div style={{ ...mono, fontSize: 10, color: "rgba(148,163,184,0.65)", marginBottom: 10, wordBreak: "break-all" as const }}>{f.execution_role_arn}</div>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", lineHeight: 1.5, marginBottom: 10 }}>{f.finding}</div>
      <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Remediation Checklist</div>
      <RemediationSteps steps={f.remediation_steps} onComplete={() => onLifecycleChange(f.id, "remediated")} />
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="infra-row"
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: "10px 12px",
            borderBottom: divider,
            cursor: "pointer",
            borderLeft: `2px solid ${open ? sc : "transparent"}`,
            transition: "border-color 0.15s",
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ marginBottom: 6 }}>
                <SeverityChip severity={f.severity} />
              </div>
              <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflowWrap: "anywhere", wordBreak: "break-word" as const }}>{f.function_name}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 2 }}>{f.runtime}</div>
              <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.55)", marginTop: 4, overflowWrap: "anywhere" as const }}>{roleShort}</div>
            </div>
            <span style={{ color: "rgba(100,116,139,0.4)", display: "flex", flexShrink: 0 }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <BoolDot yes={!f.public_url} label="Private" />
            <BoolDot yes={f.vpc_attached} label="VPC" />
            <BoolDot yes={f.env_vars_encrypted} label="Env Enc" />
            <LifecyclePill lifecycle={f.lifecycle} />
          </div>
        </button>
        {expandedLambda}
      </>
    );
  }

  return (
    <>
      <div
        className="infra-row"
        style={{ display: "grid", gridTemplateColumns: "24px 100px 160px 100px 80px 80px 80px 80px", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? sc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <SeverityChip severity={f.severity} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 10, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.function_name}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", marginTop: 1 }}>{f.runtime}</div>
        </div>
        <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{roleShort}</span>
        <BoolDot yes={!f.public_url} label="Private" />
        <BoolDot yes={f.vpc_attached} label="VPC" />
        <BoolDot yes={f.env_vars_encrypted} label="Env Enc" />
        <LifecyclePill lifecycle={f.lifecycle} />
      </div>
      {expandedLambda}
    </>
  );
}

function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: right ? "right" as const : "left" as const }}>
      {children}
    </span>
  );
}

// ─── ComputeSecurity ───────────────────────────────────────────────────────────
export function ComputeSecurity() {
  const [section, setSection] = useState<"ec2" | "lambda" | "scenarios">("ec2");
  const [isMobile, setIsMobile] = useState(false);
  const [instLifecycles, setInstLifecycles] = useLocalStorage<Record<string, typeof MOCK_COMPUTE_FINDINGS[0]["lifecycle"]>>("infra-compute-lifecycles", {});
  const [lambdaLifecycles, setLambdaLifecycles] = useLocalStorage<Record<string, typeof MOCK_LAMBDA_FINDINGS[0]["lifecycle"]>>("infra-lambda-lifecycles", {});

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const instances = useMemo(() =>
    MOCK_COMPUTE_FINDINGS.map(f => ({ ...f, lifecycle: instLifecycles[f.id] ?? f.lifecycle })),
    [instLifecycles]
  );
  const lambdas = useMemo(() =>
    MOCK_LAMBDA_FINDINGS.map(f => ({ ...f, lifecycle: lambdaLifecycles[f.id] ?? f.lifecycle })),
    [lambdaLifecycles]
  );

  const criticalInstances = instances.filter(f => f.severity === "CRITICAL").length;
  const noSSM = instances.filter(f => !f.ssm_managed).length;
  const noIMDSv2 = instances.filter(f => !f.imdsv2_required).length;
  const publicInstances = instances.filter(f => f.public_ip !== null).length;
  const lambdaOpen = lambdas.filter(f => f.lifecycle === "open" || f.lifecycle === "triaged").length;

  const SECTIONS = [
    { id: "ec2" as const, label: "EC2 & Compute", shortLabel: "EC2", accent: "#ff6b35", count: criticalInstances },
    { id: "lambda" as const, label: "Lambda", shortLabel: "Lambda", accent: "#a78bfa", count: lambdaOpen },
    { id: "scenarios" as const, label: "Scenarios", shortLabel: "Scenarios", accent: "#ffb000" },
  ];

  return (
    <div className="min-w-0 max-w-full" style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader
        icon={<Server size={16} color="#ff6b35" />}
        title="Compute Security"
        subtitle="EC2 instance posture, patch compliance, IMDSv2 enforcement, and Lambda function security"
        accent="#ff6b35"
      />

      <StatStrip stats={[
        { label: "Critical Instances", value: criticalInstances, color: criticalInstances > 0 ? "#ff0040" : "#00ff88", accent: criticalInstances > 0 },
        { label: "No SSM", value: noSSM, color: noSSM > 0 ? "#ff6b35" : "#00ff88", accent: noSSM > 0 },
        { label: "IMDSv1 Exposed", value: noIMDSv2, color: noIMDSv2 > 0 ? "#ff6b35" : "#00ff88", accent: noIMDSv2 > 0 },
        { label: "Public IPs", value: publicInstances, color: publicInstances > 0 ? "#ffb000" : "#00ff88" },
        { label: "Lambda Findings", value: lambdaOpen, color: lambdaOpen > 0 ? "#a78bfa" : "#00ff88", accent: lambdaOpen > 0 },
        { label: "Total EC2 Findings", value: instances.length },
      ]} />

      {/* Sub-nav — grid on narrow viewports so tabs stay in frame */}
      <div
        className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch"
        style={{ marginBottom: 12, flexShrink: 0, boxSizing: "border-box" as const }}
      >
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              className={`infra-btn min-w-0 ${s.id === "scenarios" ? "col-span-2 sm:col-span-1" : ""}`}
              onClick={() => setSection(s.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "5px 10px", borderRadius: 6, background: active ? `${s.accent}12` : "transparent", border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`, color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono, fontSize: 11, fontWeight: active ? 700 : 500, transition: "all 0.12s" }}
            >
              <span className="hidden min-w-0 truncate sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 9, fontWeight: 800, padding: "0 4px", height: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* EC2 table */}
      {section === "ec2" && (
        <div className="min-w-0 overflow-x-hidden" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "24px 100px 140px 80px 80px 80px 1fr 80px", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <span /><TH>Severity</TH><TH>Instance</TH><TH>Type</TH><TH>Patches</TH><TH>Agents</TH><TH>Status</TH><TH right>Flags</TH>
          </div>
          {instances.map(f => (
            <InstanceRow key={f.id} f={f} isMobile={isMobile} onLifecycleChange={(id, lc) => setInstLifecycles({ ...instLifecycles, [id]: lc })} />
          ))}
        </div>
      )}

      {/* Lambda table */}
      {section === "lambda" && (
        <div className="min-w-0 overflow-x-hidden" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div
            className="hidden md:grid"
            style={{ gridTemplateColumns: "24px 100px 160px 100px 80px 80px 80px 80px", gap: 10, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <span /><TH>Severity</TH><TH>Function</TH><TH>Role</TH><TH>Public</TH><TH>VPC</TH><TH>Env Enc</TH><TH>Status</TH>
          </div>
          {lambdas.map(f => (
            <LambdaRow key={f.id} f={f} isMobile={isMobile} onLifecycleChange={(id, lc) => setLambdaLifecycles({ ...lambdaLifecycles, [id]: lc })} />
          ))}
        </div>
      )}

      {/* Scenarios */}
      {section === "scenarios" && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {INFRA_SCENARIOS.filter(s => s.id === "failed_isolation" || s.id === "delayed_telemetry").map(s => (
            <ScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={COMPUTE_ENDPOINTS} />
    </div>
  );
}
