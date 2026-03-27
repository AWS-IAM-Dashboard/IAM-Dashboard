/**
 * IRActionEngine — Two-lane IR action system
 *
 * Lane 1 — LLM Copilot (indigo):
 *   triage summary · root cause · runbook recommendation
 *
 * Lane 2 — AWS Automation (amber/red):
 *   containment (approval-gated) · automation · forensics · evidence
 *
 * Status machine per action:
 *   idle → queued → running → succeeded | failed
 *   idle → pending_approval → (approved → queued → running) | rejected
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Bot,
  Zap,
  Shield,
  AlertTriangle,
  Camera,
  Database,
  HardDrive,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import type {
  IRActionType,
  IRActionStatus,
  IRAction,
  IRActionResult,
  ApprovalRequest,
  IREngineState,
} from "../../types/ir";
import { ACTION_META, HIGH_IMPACT_ACTIONS } from "../../types/ir";
import {
  triggerIRAction,
  pollUntilDone,
  approveAction,
  rejectAction,
  logAuditEntry,
} from "../../services/irEngine";
import type { FindingData } from "../ui/FindingDetailPanel";

// ─── Props ────────────────────────────────────────────────────────────────────

interface IRActionEngineProps {
  finding: FindingData;
  /** Receives a new engine state snapshot whenever any action updates */
  onStateUpdate?: (state: IREngineState) => void;
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_META: Record<
  IRActionStatus,
  { label: string; color: string; animated?: boolean }
> = {
  idle:             { label: "Ready",            color: "rgba(100,116,139,0.5)" },
  queued:           { label: "Queued",           color: "#60a5fa" },
  running:          { label: "Running",          color: "#ffb000", animated: true },
  succeeded:        { label: "Succeeded",        color: "#00ff88" },
  failed:           { label: "Failed",           color: "#ff0040" },
  pending_approval: { label: "Approval Required", color: "#fb923c", animated: true },
  approved:         { label: "Approved",         color: "#a78bfa" },
  rejected:         { label: "Rejected",         color: "#64748b" },
};

function StatusChip({ status }: { status: IRActionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}35`,
        fontSize: 10,
        fontWeight: 700,
        color: meta.color,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {meta.animated ? (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: meta.color,
            animation: "ir-pulse 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: meta.color,
            flexShrink: 0,
          }}
        />
      )}
      {meta.label}
    </span>
  );
}

// ─── Approval gate dialog ─────────────────────────────────────────────────────

function ApprovalGate({
  approval,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const expiresIn = Math.max(
    0,
    Math.round((new Date(approval.expires_at).getTime() - Date.now()) / 1000 / 60)
  );

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 8,
        background: "rgba(251,146,60,0.07)",
        border: "1px solid rgba(251,146,60,0.28)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={13} color="#fb923c" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fb923c", ...mono }}>
          APPROVAL REQUIRED
        </span>
        <span style={{ marginLeft: "auto", ...mono, fontSize: 10, color: "rgba(251,146,60,0.5)" }}>
          expires in {expiresIn}m
        </span>
      </div>

      {/* Impact */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(251,146,60,0.6)", marginBottom: 3 }}
        >
          Impact
        </div>
        <p style={{ fontSize: 11, color: "rgba(252,211,77,0.85)", margin: 0, lineHeight: 1.5 }}>
          {approval.impact_summary}
        </p>
      </div>

      {/* Rollback */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.55)", marginBottom: 3 }}
        >
          Rollback
        </div>
        <code
          style={{
            ...mono,
            fontSize: 10,
            color: "rgba(100,116,139,0.7)",
            background: "rgba(0,0,0,0.2)",
            padding: "4px 8px",
            borderRadius: 4,
            display: "block",
            lineHeight: 1.6,
            overflowX: "auto",
          }}
        >
          {approval.rollback_procedure}
        </code>
      </div>

      {/* SFN ARN */}
      {approval.state_machine_arn && (
        <div
          style={{
            ...mono,
            fontSize: 9,
            color: "rgba(100,116,139,0.35)",
            marginBottom: 10,
            wordBreak: "break-all",
          }}
        >
          Step Functions: {approval.state_machine_arn}
        </div>
      )}

      {/* Reject reason input */}
      {rejecting && (
        <input
          autoFocus
          placeholder="Rejection reason…"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 5,
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            fontSize: 11,
            ...mono,
            outline: "none",
            marginBottom: 8,
            boxSizing: "border-box",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && rejectReason.trim()) onReject();
            if (e.key === "Escape") setRejecting(false);
          }}
        />
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {!rejecting && (
          <button
            onClick={() => setRejecting(true)}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              background: "rgba(100,116,139,0.08)",
              border: "1px solid rgba(100,116,139,0.2)",
              color: "#64748b",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              ...mono,
              flex: 1,
            }}
          >
            Reject
          </button>
        )}
        {rejecting && (
          <>
            <button
              onClick={() => setRejecting(false)}
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                background: "rgba(100,116,139,0.06)",
                border: "1px solid rgba(100,116,139,0.16)",
                color: "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                ...mono,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              disabled={!rejectReason.trim()}
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                background: "rgba(255,0,64,0.1)",
                border: "1px solid rgba(255,0,64,0.25)",
                color: "#ff0040",
                fontSize: 11,
                fontWeight: 600,
                cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                ...mono,
                flex: 1,
              }}
            >
              Confirm Reject
            </button>
          </>
        )}
        {!rejecting && (
          <button
            onClick={onApprove}
            style={{
              padding: "5px 16px",
              borderRadius: 5,
              background: "rgba(251,146,60,0.14)",
              border: "1px solid rgba(251,146,60,0.35)",
              color: "#fb923c",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              ...mono,
              flex: 2,
            }}
          >
            Approve & Execute
          </button>
        )}
      </div>
    </div>
  );
}

// ─── LLM result viewer ────────────────────────────────────────────────────────

function LLMResult({ result, type }: { result: IRActionResult; type: IRActionType }) {
  const [copied, setCopied] = useState(false);
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (type === "llm_triage" && result.triage_summary) {
    return (
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.7, margin: 0 }}>
          {result.triage_summary}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {result.mitre_techniques?.map((t) => (
            <span
              key={t}
              style={{
                ...mono,
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.22)",
                fontSize: 10,
                color: "#818cf8",
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
          {result.false_positive_probability !== undefined && (
            <span
              style={{
                ...mono,
                marginLeft: "auto",
                fontSize: 10,
                color:
                  result.false_positive_probability < 0.1
                    ? "#00ff88"
                    : result.false_positive_probability < 0.4
                    ? "#ffb000"
                    : "#ff6b35",
              }}
            >
              FP: {(result.false_positive_probability * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  if (type === "llm_root_cause" && result.root_cause_narrative) {
    const lines = result.root_cause_narrative.split("\n\n");
    return (
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontSize: 11,
              color: line.startsWith("**") ? "#e2e8f0" : "rgba(148,163,184,0.85)",
              lineHeight: 1.7,
              margin: 0,
            }}
            dangerouslySetInnerHTML={{
              __html: line.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#e2e8f0'>$1</strong>"),
            }}
          />
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          {result.mitre_techniques?.map((t) => (
            <span
              key={t}
              style={{
                ...mono,
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(129,140,248,0.1)",
                border: "1px solid rgba(129,140,248,0.22)",
                fontSize: 10,
                color: "#818cf8",
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (type === "llm_runbook" && result.runbook_markdown) {
    return (
      <div style={{ marginTop: 10, position: "relative" }}>
        <button
          onClick={() => copyText(result.runbook_markdown!)}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            padding: "3px 8px",
            color: copied ? "#00ff88" : "rgba(100,116,139,0.55)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            ...mono,
          }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <pre
          style={{
            ...mono,
            fontSize: 10,
            color: "rgba(148,163,184,0.85)",
            background: "rgba(0,0,0,0.2)",
            padding: "10px 12px",
            borderRadius: 6,
            overflow: "auto",
            maxHeight: 220,
            margin: 0,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {result.runbook_markdown}
        </pre>
      </div>
    );
  }

  return null;
}

// ─── Automation result viewer ─────────────────────────────────────────────────

function AutomationResult({ result, type }: { result: IRActionResult; type: IRActionType }) {
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const rows: [string, string][] = [];

  if (result.isolation_sg_id) rows.push(["Isolation SG", result.isolation_sg_id]);
  if (result.original_sg_ids?.length) rows.push(["Original SGs", result.original_sg_ids.join(", ")]);
  if (result.revoked_key_id) rows.push(["Revoked Key", result.revoked_key_id]);
  if (result.disabled_key_id) rows.push(["Disabled Key", result.disabled_key_id]);
  if (result.ssm_command_id) rows.push(["SSM Command", result.ssm_command_id]);
  if (result.snapshot_id) rows.push(["Snapshot ID", result.snapshot_id]);
  if (result.memory_dump_job_id) rows.push(["Dump Job", result.memory_dump_job_id]);
  if (result.memory_dump_s3_uri) rows.push(["Dump S3", result.memory_dump_s3_uri]);
  if (result.athena_query_id) rows.push(["Query ID", result.athena_query_id]);
  if (result.athena_scanned_bytes) {
    rows.push(["Scanned", `${(result.athena_scanned_bytes / 1e9).toFixed(2)} GB`]);
  }
  if (result.evidence_s3_uri) rows.push(["Evidence S3", result.evidence_s3_uri]);
  if (result.hash_sha256) rows.push(["SHA-256", result.hash_sha256.slice(0, 20) + "…"]);
  if (result.ssm_output) rows.push(["Output", result.ssm_output]);

  if (rows.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        borderRadius: 6,
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8 }}>
          <span style={{ ...mono, fontSize: 9, fontWeight: 600, color: "rgba(100,116,139,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
            {k}
          </span>
          <span style={{ ...mono, fontSize: 10, color: "#94a3b8", wordBreak: "break-all", lineHeight: 1.5 }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  type: IRActionType;
  action?: IRAction;
  icon: React.ReactNode;
  onRun: (type: IRActionType) => void;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string, reason: string) => void;
}

function ActionCard({ type, action, icon, onRun, onApprove, onReject }: ActionCardProps) {
  const meta = ACTION_META[type];
  const status = action?.status ?? "idle";
  const isRunning = status === "running" || status === "queued";
  const isDone = status === "succeeded" || status === "failed";
  const isPendingApproval = status === "pending_approval";
  const [expanded, setExpanded] = useState(false);
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const hasResult = isDone && action?.result && Object.keys(action.result).length > 0;

  useEffect(() => {
    if (status === "succeeded" || status === "failed") setExpanded(true);
  }, [status]);

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: isPendingApproval
          ? "rgba(251,146,60,0.06)"
          : status === "succeeded"
          ? "rgba(0,255,136,0.04)"
          : status === "failed"
          ? "rgba(255,0,64,0.04)"
          : `${meta.color}08`,
        border: `1px solid ${
          isPendingApproval
            ? "rgba(251,146,60,0.28)"
            : status === "succeeded"
            ? "rgba(0,255,136,0.2)"
            : status === "failed"
            ? "rgba(255,0,64,0.2)"
            : `${meta.color}22`
        }`,
        transition: "background 0.1s, border-color 0.15s",
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}28`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
              {meta.label}
            </span>
            {meta.requiresApproval && (
              <span
                style={{
                  ...mono,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "rgba(255,107,53,0.12)",
                  border: "1px solid rgba(255,107,53,0.25)",
                  color: "#ff6b35",
                  letterSpacing: "0.04em",
                }}
              >
                APPROVAL
              </span>
            )}
          </div>
          <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>
            {meta.endpoint}
          </div>
        </div>

        {/* Status + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {status !== "idle" && <StatusChip status={status} />}

          {hasResult && (
            <button
              onClick={() => setExpanded((x) => !x)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(100,116,139,0.5)",
                display: "flex",
                alignItems: "center",
                padding: 2,
              }}
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}

          {!isRunning && !isPendingApproval && (
            <button
              onClick={() => onRun(type)}
              disabled={isRunning}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                background: status === "succeeded"
                  ? "rgba(0,255,136,0.08)"
                  : status === "failed"
                  ? "rgba(255,0,64,0.08)"
                  : `${meta.color}14`,
                border: `1px solid ${
                  status === "succeeded"
                    ? "rgba(0,255,136,0.25)"
                    : status === "failed"
                    ? "rgba(255,0,64,0.25)"
                    : `${meta.color}30`
                }`,
                color: status === "succeeded"
                  ? "#00ff88"
                  : status === "failed"
                  ? "#ff4060"
                  : meta.color,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                ...mono,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {status === "succeeded" ? (
                <><CheckCircle2 size={10} /> Rerun</>
              ) : status === "failed" ? (
                <><XCircle size={10} /> Retry</>
              ) : (
                "Run"
              )}
            </button>
          )}

          {isRunning && (
            <Loader2 size={14} color={meta.color} style={{ animation: "spin 1s linear infinite" }} />
          )}
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 11,
          color: "rgba(100,116,139,0.65)",
          margin: "6px 0 0",
          lineHeight: 1.5,
        }}
      >
        {meta.description}
      </p>

      {/* Approval gate */}
      {isPendingApproval && action?.approval && (
        <ApprovalGate
          approval={action.approval}
          onApprove={() => action.job_id && onApprove(action.job_id)}
          onReject={() => action.job_id && onReject(action.job_id, "Rejected by analyst")}
        />
      )}

      {/* Result viewer */}
      {expanded && hasResult && action?.result && (
        meta.lane === "llm" ? (
          <LLMResult result={action.result} type={type} />
        ) : (
          <AutomationResult result={action.result} type={type} />
        )
      )}

      {/* Error */}
      {status === "failed" && action?.error && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            borderRadius: 5,
            background: "rgba(255,0,64,0.06)",
            border: "1px solid rgba(255,0,64,0.18)",
            fontSize: 11,
            color: "#ff4060",
            ...mono,
          }}
        >
          {action.error}
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        color: "rgba(100,116,139,0.5)",
        marginBottom: 6,
        marginTop: 2,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const LANE_ICON: Record<IRActionType, React.ReactNode> = {
  llm_triage:         <Zap size={13} color="#818cf8" />,
  llm_root_cause:     <Search size={13} color="#818cf8" />,
  llm_runbook:        <Bot size={13} color="#818cf8" />,
  aws_ec2_isolate:    <Shield size={13} color="#ff6b35" />,
  aws_iam_revoke_key: <AlertTriangle size={13} color="#ff6b35" />,
  aws_iam_disable_key:<Lock size={13} color="#ffb000" />,
  aws_ssm_runbook:    <Zap size={13} color="#ffb000" />,
  aws_ebs_snapshot:   <HardDrive size={13} color="#38bdf8" />,
  aws_memory_dump:    <Camera size={13} color="#38bdf8" />,
  aws_athena_query:   <Database size={13} color="#38bdf8" />,
  aws_evidence_vault: <Lock size={13} color="#a78bfa" />,
};

export function IRActionEngine({ finding, onStateUpdate }: IRActionEngineProps) {
  const [actions, setActions] = useState<Partial<Record<IRActionType, IRAction>>>({});
  const [auditExpanded, setAuditExpanded] = useState(false);
  const auditLog = useRef<Array<{ ts: string; msg: string; type: IRActionType }>>([]);
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const getAction = (type: IRActionType) => actions[type];

  const upsertAction = useCallback(
    (type: IRActionType, update: Partial<IRAction>) => {
      setActions((prev) => {
        const existing = prev[type];
        const next: IRAction = {
          id: existing?.id ?? `${finding.id}:${type}:${Date.now()}`,
          type,
          lane: ACTION_META[type].lane,
          status: "idle",
          finding_id: finding.id,
          audit_log: existing?.audit_log ?? [],
          ...existing,
          ...update,
        };
        return { ...prev, [type]: next };
      });
    },
    [finding.id]
  );

  const addAuditEntry = useCallback(
    (type: IRActionType, msg: string) => {
      auditLog.current.push({ ts: new Date().toISOString(), msg, type });
      logAuditEntry({
        timestamp: new Date().toISOString(),
        actor: "analyst",
        actor_type: "analyst",
        action: msg,
        details: { finding_id: finding.id, action_type: type },
        idempotency_key: `${finding.id}:${type}:${Date.now()}`,
      });
    },
    [finding.id]
  );

  const handleRun = useCallback(
    async (type: IRActionType) => {
      const meta = ACTION_META[type];
      upsertAction(type, { status: "queued" });
      addAuditEntry(type, `Triggered ${meta.label}`);

      try {
        const response = await triggerIRAction(type, {
          finding_id: finding.id,
          resource_arn: finding.resource_arn,
          region: finding.region ?? "us-east-1",
        });

        if (response.approval_required && response.approval) {
          upsertAction(type, {
            status: "pending_approval",
            job_id: response.job_id,
            execution_arn: response.execution_arn,
            approval: response.approval,
          });
          addAuditEntry(type, `Approval requested for ${meta.label}`);
          toast.info(`Approval Required — ${meta.label}`, {
            description: "Analyst must approve before execution.",
          });
          return;
        }

        upsertAction(type, {
          status: response.status,
          job_id: response.job_id,
          initiated_at: new Date().toISOString(),
        });

        // Poll for completion
        await pollUntilDone(
          response.job_id,
          (statusUpdate) => {
            upsertAction(type, { status: statusUpdate.status });
          }
        ).then((final) => {
          if (!final) return;
          upsertAction(type, {
            status: final.status,
            result: final.result,
            error: final.error,
            completed_at: final.completed_at,
          });

          if (final.status === "succeeded") {
            addAuditEntry(type, `${meta.label} completed successfully`);
            toast.success(meta.label, { description: "Completed successfully." });
          } else if (final.status === "failed") {
            addAuditEntry(type, `${meta.label} failed: ${final.error ?? "unknown error"}`);
            toast.error(meta.label, { description: final.error ?? "Action failed." });
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        upsertAction(type, { status: "failed", error: msg });
        addAuditEntry(type, `${meta.label} failed: ${msg}`);
        toast.error(meta.label, { description: msg });
      }
    },
    [finding, upsertAction, addAuditEntry]
  );

  const handleApprove = useCallback(
    async (jobId: string) => {
      const type = Object.values(HIGH_IMPACT_ACTIONS).find(
        (t) => actions[t]?.job_id === jobId
      ) as IRActionType | undefined;
      if (!type) return;

      const meta = ACTION_META[type];
      const { success } = await approveAction(jobId, "analyst");
      if (!success) {
        toast.error("Approval failed");
        return;
      }

      upsertAction(type, { status: "queued" });
      addAuditEntry(type, `Approved ${meta.label} — executing`);
      toast.success(`Approved: ${meta.label}`, { description: "Action queued for execution." });

      await pollUntilDone(jobId, (update) => {
        upsertAction(type, { status: update.status });
      }).then((final) => {
        if (!final) return;
        upsertAction(type, {
          status: final.status,
          result: final.result,
          error: final.error,
          completed_at: final.completed_at,
        });
        if (final.status === "succeeded") {
          addAuditEntry(type, `${meta.label} completed after approval`);
          toast.success(meta.label, { description: "Completed successfully." });
        } else if (final.status === "failed") {
          toast.error(meta.label, { description: final.error ?? "Action failed." });
        }
      });
    },
    [actions, upsertAction, addAuditEntry]
  );

  const handleReject = useCallback(
    async (jobId: string, reason: string) => {
      const type = HIGH_IMPACT_ACTIONS.find(
        (t) => actions[t]?.job_id === jobId
      ) as IRActionType | undefined;
      if (!type) return;

      await rejectAction(jobId, "analyst", reason);
      upsertAction(type, { status: "rejected" });
      addAuditEntry(type, `Rejected ${ACTION_META[type].label}: ${reason}`);
      toast.info(`Rejected: ${ACTION_META[type].label}`);
    },
    [actions, upsertAction, addAuditEntry]
  );

  const renderCard = (type: IRActionType) => (
    <ActionCard
      key={type}
      type={type}
      action={getAction(type)}
      icon={LANE_ICON[type]}
      onRun={handleRun}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* CSS for animations */}
      <style>{`
        @keyframes ir-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── LLM COPILOT LANE ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: "rgba(129,140,248,0.04)",
          border: "1px solid rgba(129,140,248,0.14)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "rgba(129,140,248,0.14)",
              border: "1px solid rgba(129,140,248,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bot size={12} color="#818cf8" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", ...mono }}>
            LLM Copilot
          </span>
          <span style={{ fontSize: 10, color: "rgba(129,140,248,0.5)", ...mono }}>
            read-only · no approval required
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderCard("llm_triage")}
          {renderCard("llm_root_cause")}
          {renderCard("llm_runbook")}
        </div>
      </div>

      {/* ── AWS AUTOMATION LANE ──────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: "rgba(255,176,0,0.03)",
          border: "1px solid rgba(255,176,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "rgba(255,176,0,0.14)",
              border: "1px solid rgba(255,176,0,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={12} color="#ffb000" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ffb000", ...mono }}>
            AWS Automation
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,176,0,0.5)", ...mono }}>
            real AWS calls in live mode
          </span>
        </div>

        {/* Containment — approval required */}
        <SectionLabel>Containment — high impact</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {renderCard("aws_ec2_isolate")}
          {renderCard("aws_iam_revoke_key")}
        </div>

        {/* Automation */}
        <SectionLabel>Automation</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {renderCard("aws_iam_disable_key")}
          {renderCard("aws_ssm_runbook")}
        </div>

        {/* Forensics */}
        <SectionLabel>Forensics Capture</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {renderCard("aws_ebs_snapshot")}
          {renderCard("aws_memory_dump")}
          {renderCard("aws_athena_query")}
        </div>

        {/* Evidence */}
        <SectionLabel>Evidence Preservation</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderCard("aws_evidence_vault")}
        </div>
      </div>

      {/* ── AUDIT LOG ────────────────────────────────────────────────────── */}
      {auditLog.current.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => setAuditExpanded((x) => !x)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: "100%",
            }}
          >
            <span style={{ ...mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.45)" }}>
              Engine Audit Log
            </span>
            <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)", marginLeft: 4 }}>
              ({auditLog.current.length} entries)
            </span>
            {auditExpanded ? (
              <ChevronDown size={11} color="rgba(100,116,139,0.4)" style={{ marginLeft: "auto" }} />
            ) : (
              <ChevronRight size={11} color="rgba(100,116,139,0.4)" style={{ marginLeft: "auto" }} />
            )}
          </button>

          {auditExpanded && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {auditLog.current.map((entry, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)", flexShrink: 0 }}>
                    {new Date(entry.ts).toLocaleTimeString()}
                  </span>
                  <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.6)" }}>
                    [{entry.type}]
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>
                    {entry.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
