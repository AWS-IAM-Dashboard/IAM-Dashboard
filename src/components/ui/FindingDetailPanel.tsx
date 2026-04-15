/**
 * FindingDetailPanel — Unified finding drill-down used across all scanner tabs.
 *
 * Renders below the expanded table row. Accepts normalised FindingData so it
 * works with IAM, EC2, S3, VPC, DynamoDB, SecurityHub, GuardDuty, Inspector,
 * Macie, Config, and AccessAnalyzer findings without modification.
 *
 * Wire-up per-tab:
 *   1. Map your local finding type → FindingData (see field docs below)
 *   2. Map your workflow state    → WorkflowData
 *   3. Pass onAdvanceStatus / onAssign / onMarkFalsePositive / onCreateTicket
 *
 * Architecture hooks (replace mocks with real APIs):
 *   onAdvanceStatus → PATCH /api/workflows/{id}/advance
 *   onAssign        → PATCH /api/workflows/{id}/assign
 *   onCreateTicket  → POST  /api/integrations/ticket
 *   Agent Actions   → POST  /api/agents/{action}
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight,
  Copy,
  Check,
  Shield,
  GitBranch,
  Clock,
  Bot,
  Activity,
  Ticket,
  Circle,
  AlertTriangle,
  ExternalLink,
  Zap,
  X,
  UserCircle,
  FlaskConical,
  Archive,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { IRActionRequest, PlaybookPhase, PlaybookStep } from "../../types/ir";
import { fetchLLMActionResult } from "../../services/irEngine";
import { SeverityBadge } from "./SeverityBadge";
import { IRActionEngine } from "../ir/IRActionEngine";
import { EvidenceForensicsPanel } from "../ir/EvidenceForensicsPanel";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES  (import from here in each scanner tab)
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | "NEW"
  | "TRIAGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_VERIFY"
  | "REMEDIATED"
  | "RISK_ACCEPTED"
  | "FALSE_POSITIVE";

export type ActorType = "system" | "analyst" | "engineer" | "automation";
export type { PlaybookPhase, PlaybookStep } from "../../types/ir";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: ActorType;
  action: string;
  note?: string;
}

export interface WorkflowData {
  status: WorkflowStatus;
  assignee?: string;
  ticket_id?: string;
  /** Hours until SLA deadline — negative = breached */
  sla_hours_remaining?: number;
  sla_breached?: boolean;
  first_seen: string;
  timeline: TimelineEvent[];
  risk_acceptance_note?: string;
  risk_acceptance_expiry?: string;
}

/**
 * Normalised shape accepted by FindingDetailPanel.
 * Map your scanner-specific type → this before rendering.
 */
export interface FindingData {
  id: string;
  /** Primary human-readable title (finding_type, title, type, etc.) */
  title: string;
  resource_name: string;
  resource_arn?: string;
  /**
   * Severity: CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
   * GuardDuty: pass numeric 1–10 — panel normalises automatically.
   */
  severity: string | number;
  description: string;
  recommendation?: string;
  /** 1–10 risk score; if absent falls back to severity-derived default */
  risk_score?: number;
  compliance_frameworks?: string[];
  last_seen?: string;
  first_seen?: string;
  region?: string;
  /** Key/value pairs rendered in the right-hand metadata sidebar */
  metadata?: Record<string, string>;
}

export interface FindingDetailPanelProps {
  finding: FindingData;
  workflow?: WorkflowData;
  playbook?: PlaybookStep[];
  /** Available assignees rendered in the Assign select */
  assignees?: string[];
  onAdvanceStatus?: (findingId: string) => void;
  onAssign?: (findingId: string, assignee: string) => void;
  onMarkFalsePositive?: (findingId: string) => void;
  onCreateTicket?: (findingId: string) => void;
  onClose?: () => void;
  /** Suppress the bottom border (last row in table) */
  isLast?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040",
  HIGH: "#ff6b35",
  MEDIUM: "#ffb000",
  LOW: "#00ff88",
  INFORMATIONAL: "#94a3b8",
};

const WORKFLOW_META: Record<WorkflowStatus, { label: string; color: string }> = {
  NEW:            { label: "New",           color: "#60a5fa" },
  TRIAGED:        { label: "Triaged",       color: "#a78bfa" },
  ASSIGNED:       { label: "Assigned",      color: "#38bdf8" },
  IN_PROGRESS:    { label: "In Progress",   color: "#ffb000" },
  PENDING_VERIFY: { label: "Pending Verify",color: "#38bdf8" },
  REMEDIATED:     { label: "Remediated",    color: "#00ff88" },
  RISK_ACCEPTED:  { label: "Risk Accepted", color: "#ff6b35" },
  FALSE_POSITIVE: { label: "False Positive",color: "#64748b" },
};

const NEXT_STATUS: Partial<Record<WorkflowStatus, WorkflowStatus>> = {
  NEW:            "TRIAGED",
  TRIAGED:        "ASSIGNED",
  ASSIGNED:       "IN_PROGRESS",
  IN_PROGRESS:    "PENDING_VERIFY",
  PENDING_VERIFY: "REMEDIATED",
};

const ACTOR_COLORS: Record<ActorType, string> = {
  system:     "#60a5fa",
  analyst:    "#a78bfa",
  engineer:   "#00ff88",
  automation: "#ffb000",
};

const PHASE_META: Record<PlaybookPhase, { label: string; color: string }> = {
  IDENTIFY:  { label: "Identify",  color: "#60a5fa" },
  CONTAIN:   { label: "Contain",   color: "#ffb000" },
  REMEDIATE: { label: "Remediate", color: "#ff6b35" },
  VERIFY:    { label: "Verify",    color: "#00ff88" },
};

const DEFAULT_ASSIGNEES = [
  "Alice Chen",
  "Bob Martinez",
  "Carol Singh",
  "Dave Kim",
  "Eve Nakamura",
];

const SLA_BY_SEVERITY: Record<string, string> = {
  CRITICAL: "4h SLA",
  HIGH:     "24h SLA",
  MEDIUM:   "7d SLA",
  LOW:      "30d SLA",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normaliseSeverity(raw: string | number): string {
  if (typeof raw === "number") {
    if (raw >= 9) return "CRITICAL";
    if (raw >= 7) return "HIGH";
    if (raw >= 4) return "MEDIUM";
    return "LOW";
  }
  const up = raw.toUpperCase();
  if (up === "INFORMATIONAL" || up === "INFO") return "INFORMATIONAL";
  return up;
}

function llmRequestFromFinding(finding: FindingData): IRActionRequest {
  return {
    finding_id: finding.id,
    severity: normaliseSeverity(finding.severity),
    finding_type: finding.title,
    resource_name: finding.resource_name,
    description: finding.description,
    resource_arn: finding.resource_arn,
    region: finding.region ?? "us-east-1",
  };
}

/** Backend may set `model: "mock"` when Bedrock is not used — show neutral copy in the UI. */
function formatLlmModelDisplay(model?: string): string {
  if (!model) return "—";
  return model.trim().toLowerCase() === "mock" ? "Preview" : model;
}

function sevColor(s: string): string {
  return SEV_COLOR[normaliseSeverity(s)] ?? "#64748b";
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function defaultRiskScore(severity: string): number {
  switch (normaliseSeverity(severity)) {
    case "CRITICAL":      return 9;
    case "HIGH":          return 7;
    case "MEDIUM":        return 5;
    case "LOW":           return 3;
    default:              return 2;
  }
}

function riskColor(score: number): string {
  if (score >= 9) return "#ff0040";
  if (score >= 7) return "#ff6b35";
  if (score >= 5) return "#ffb000";
  return "#00ff88";
}

/**
 * Replace generic LLM placeholders in AI-generated steps with real finding values.
 * Uses a JSON-level string replace so every field (title, description, commands) is covered.
 */
function hydratePlaceholders(steps: PlaybookStep[], finding: FindingData): PlaybookStep[] {
  const resourceName = finding.resource_name ?? "RESOURCE_NAME";
  const resourceArn  = finding.resource_arn  ?? "RESOURCE_ARN";
  const findingId    = finding.id;
  const region       = finding.region        ?? "us-east-1";
  // Derive a plausible IAM username from the ARN if resource_name looks generic
  const iamUser = resourceArn.includes(":user/")
    ? resourceArn.split(":user/").pop() ?? resourceName
    : resourceArn.includes(":role/")
    ? resourceArn.split(":role/").pop() ?? resourceName
    : resourceName;

  const pairs: [RegExp, string][] = [
    [/\bUSERNAME\b/g,                  iamUser],
    [/\bRESOURCE_ARN\b/g,              resourceArn],
    [/\bAKIA_REPLACE\b/g,              resourceName],
    [/\bFINDING_ID\b/g,                findingId],
    [/\bPRODUCT_ARN\b/g,               resourceArn],
    [/\b(?:IR-REPLACE|IR-001)\b/g,     `IR-${findingId.slice(0, 8).toUpperCase()}`],
    [/\bREGION\b/g,                    region],
  ];

  let raw = JSON.stringify(steps);
  for (const [re, val] of pairs) {
    raw = raw.replace(re, val.replace(/\\/g, "\\\\").replace(/"/g, '\\"'));
  }
  return JSON.parse(raw) as PlaybookStep[];
}

function defaultPlaybook(finding: FindingData): PlaybookStep[] {
  const sev = normaliseSeverity(finding.severity);
  return [
    {
      step: 1,
      phase: "IDENTIFY",
      title: "Validate Finding",
      description: `Confirm this is a true positive for ${finding.title} on ${finding.resource_name}. Check recent CloudTrail events and cross-reference with threat intel.`,
      commands: [
        `# Review CloudTrail events for resource`,
        `aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue="${finding.resource_name}" --max-results 20`,
        ...(finding.resource_arn
          ? [`# Describe the affected resource`, `aws iam get-resource-policy --resource-arn "${finding.resource_arn}" 2>/dev/null || echo "No resource policy"`]
          : []),
      ],
      estimated_time: sev === "CRITICAL" ? "15" : "30",
    },
    {
      step: 2,
      phase: "CONTAIN",
      title: "Contain Blast Radius",
      description: "Apply immediate containment to prevent further exposure while remediation is prepared.",
      commands: [
        `# Tag resource for tracking`,
        `aws resourcegroupstaggingapi tag-resources --resource-arn-list "${finding.resource_arn ?? "RESOURCE_ARN"}" --tags FindingId=${finding.id},ContainedAt=$(date -u +%FT%TZ)`,
      ],
      estimated_time: sev === "CRITICAL" ? "30" : "60",
    },
    {
      step: 3,
      phase: "REMEDIATE",
      title: "Apply Fix",
      description: finding.recommendation ?? `Remediate the identified misconfiguration following AWS security best practices and your organisation's security runbook.`,
      commands: [
        `# Verify current configuration`,
        `aws iam generate-service-last-accessed-details --arn "${finding.resource_arn ?? "RESOURCE_ARN"}"`,
        `# Apply least-privilege principle — scope to minimum required permissions`,
      ],
      estimated_time: sev === "CRITICAL" ? "60" : "120",
    },
    {
      step: 4,
      phase: "VERIFY",
      title: "Verify Remediation",
      description: "Confirm the finding is resolved, re-run the scanner, and close the workflow ticket.",
      commands: [
        `# Re-scan to confirm closure`,
        `# Run the relevant scanner tab and verify finding no longer appears`,
        `# Update ticket status and close finding in workflow`,
      ],
      estimated_time: "20",
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type TabId = "overview" | "runbook" | "timeline" | "agent" | "ir_engine" | "evidence";

export function FindingDetailPanel({
  finding,
  workflow,
  playbook,
  assignees = DEFAULT_ASSIGNEES,
  onAdvanceStatus,
  onAssign,
  onMarkFalsePositive,
  onCreateTicket,
  onClose,
  isLast = false,
}: FindingDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [recExpanded,  setRecExpanded]  = useState(false);

  type OverviewAiPayload = {
    triage: string;
    rootCause: string;
    triageModel?: string;
    rootModel?: string;
    confidence?: number;
    falsePositive?: number;
    mitre?: string[];
  };

  const overviewAiCacheRef = useRef<Map<string, OverviewAiPayload>>(new Map());
  const runbookAiCacheRef = useRef<Map<string, { steps: PlaybookStep[]; model?: string }>>(new Map());
  const findingRef = useRef(finding);
  findingRef.current = finding;

  const [overviewAi, setOverviewAi] = useState<
    { status: "idle" | "loading" | "ready" | "error"; error?: string } & Partial<OverviewAiPayload>
  >({ status: "idle" });

  const [runbookAi, setRunbookAi] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    error?: string;
    steps?: PlaybookStep[];
    model?: string;
  }>({ status: "idle" });

  useEffect(() => {
    setDescExpanded(false);
    setRecExpanded(false);
  }, [finding.id]);

  useEffect(() => {
    if (activeTab !== "overview") return;
    const hit = overviewAiCacheRef.current.get(finding.id);
    if (hit) setOverviewAi({ status: "ready", ...hit });
    else setOverviewAi({ status: "idle" });
  }, [activeTab, finding.id]);

  useEffect(() => {
    if (activeTab !== "runbook") return;
    const hit = runbookAiCacheRef.current.get(finding.id);
    if (hit) setRunbookAi({ status: "ready", steps: hit.steps, model: hit.model });
    else setRunbookAi({ status: "idle" });
  }, [activeTab, finding.id]);

  const loadOverviewAi = useCallback(async (force: boolean) => {
    const f = findingRef.current;
    if (force) overviewAiCacheRef.current.delete(f.id);
    setOverviewAi({ status: "loading" });
    try {
      const req = llmRequestFromFinding(f);
      const triageRes = await fetchLLMActionResult("llm_triage", req);
      const rootRes = await fetchLLMActionResult("llm_root_cause", req);
      // Discard if the user switched findings while the requests were in-flight.
      if (findingRef.current.id !== f.id) return;
      const payload: OverviewAiPayload = {
        triage: (triageRes?.triage_summary as string) ?? "",
        rootCause: (rootRes?.root_cause_narrative as string) ?? "",
        triageModel: triageRes?.model as string | undefined,
        rootModel: rootRes?.model as string | undefined,
        confidence: triageRes?.confidence_score as number | undefined,
        falsePositive: triageRes?.false_positive_probability as number | undefined,
        mitre: triageRes?.mitre_techniques as string[] | undefined,
      };
      overviewAiCacheRef.current.set(f.id, payload);
      setOverviewAi({ status: "ready", ...payload });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setOverviewAi({ status: "error", error: msg });
      toast.error("AI overview failed", { description: msg });
    }
  }, []);

  const loadRunbookAi = useCallback(async (force: boolean) => {
    const f = findingRef.current;
    if (force) runbookAiCacheRef.current.delete(f.id);
    setRunbookAi({ status: "loading" });
    try {
      const req = llmRequestFromFinding(f);
      const res = await fetchLLMActionResult("llm_runbook", req);
      // Discard if the user switched findings while the request was in-flight.
      if (findingRef.current.id !== f.id) return;
      const rawSteps = res?.runbook_steps as PlaybookStep[] | undefined;
      const model = res?.model as string | undefined;
      const VALID_PHASES: PlaybookStep["phase"][] = ["IDENTIFY", "CONTAIN", "REMEDIATE", "VERIFY"];
      // Validate every step — not just the first — so a bad later item can't reach
      // PHASE_META[step.phase] and blow up the runbook tab.
      const steps: PlaybookStep[] =
        Array.isArray(rawSteps) &&
        rawSteps.length > 0 &&
        rawSteps.every(s => s && typeof s === "object" && VALID_PHASES.includes((s as PlaybookStep).phase) && Array.isArray((s as PlaybookStep).commands))
          ? rawSteps
          : [];
      if (steps.length === 0) {
        // Backend returned a response but no structured steps (e.g. old deployment
        // still returning runbook_markdown). Surface as error so the user knows.
        throw new Error(
          res?.runbook_markdown
            ? "Backend needs restart — still returning old runbook format"
            : "Backend returned no structured steps"
        );
      }
      const hydratedSteps = hydratePlaceholders(steps, f);
      runbookAiCacheRef.current.set(f.id, { steps: hydratedSteps, model });
      setRunbookAi({ status: "ready", steps: hydratedSteps, model });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setRunbookAi({ status: "error", error: msg });
      toast.error("AI runbook failed", { description: msg });
    }
  }, []);

  const severity    = normaliseSeverity(finding.severity);
  const riskScore   = finding.risk_score ?? defaultRiskScore(severity);
  const aiSteps     = runbookAi.status === "ready" && runbookAi.steps?.length ? runbookAi.steps : undefined;
  const steps       = aiSteps ?? playbook ?? defaultPlaybook(finding);
  const w           = workflow;
  const wMeta       = w ? WORKFLOW_META[w.status] : WORKFLOW_META["NEW"];
  const nextStatus  = w ? NEXT_STATUS[w.status] : undefined;

  // Esc key closes panel
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }, []);

  // ── shared style atoms ────────────────────────────────────────────────────
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
  const ls: React.CSSProperties   = { ...mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(100,116,139,0.55)" };
  const divider                   = "1px solid rgba(255,255,255,0.06)";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.01)",
        borderBottom: isLast ? "none" : divider,
        borderTop: divider,
        position: "relative",
      }}
      onClick={(e) => e.stopPropagation()}
    >

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 20px 12px 20px",
          borderBottom: divider,
        }}
      >
        {/* Left: severity + title + resource + ARN */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
          <SeverityBadge severity={severity} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#e2e8f0",
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {finding.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...mono, fontSize: 12, color: "#94a3b8" }}>
                {finding.resource_name}
              </span>
              {finding.resource_arn && (
                <>
                  <span style={{ color: "rgba(100,116,139,0.3)", fontSize: 11 }}>·</span>
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "rgba(100,116,139,0.55)",
                      maxWidth: 420,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={finding.resource_arn}
                  >
                    {finding.resource_arn}
                  </span>
                  <button
                    onClick={() => copy(finding.resource_arn!, "arn")}
                    title="Copy ARN"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                      borderRadius: 4,
                      color: copiedId === "arn" ? "#00ff88" : "rgba(100,116,139,0.4)",
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.1s",
                    }}
                  >
                    {copiedId === "arn" ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: risk score + SLA + close */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {/* Risk score */}
          <div style={{ textAlign: "right" }}>
            <div style={{ ...ls, marginBottom: 4 }}>Risk</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ ...mono, fontSize: 22, fontWeight: 700, lineHeight: 1, color: riskColor(riskScore) }}>
                {riskScore}
              </span>
              <span style={{ ...mono, fontSize: 11, color: "rgba(100,116,139,0.4)" }}>/10</span>
            </div>
            {/* Score bar */}
            <div
              style={{
                width: 48,
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                marginTop: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${riskScore * 10}%`,
                  background: riskColor(riskScore),
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* SLA indicator */}
          {w && w.status !== "REMEDIATED" && w.status !== "FALSE_POSITIVE" && w.status !== "RISK_ACCEPTED" && (
            <div style={{ textAlign: "right" }}>
              <div style={{ ...ls, marginBottom: 4 }}>SLA</div>
              {w.sla_hours_remaining !== undefined ? (
                <span
                  style={{
                    ...mono,
                    fontSize: 12,
                    fontWeight: 600,
                    color: w.sla_breached
                      ? "#ff0040"
                      : w.sla_hours_remaining < 4
                        ? "#ffb000"
                        : "#00ff88",
                  }}
                >
                  {w.sla_breached
                    ? `${Math.abs(Math.round(w.sla_hours_remaining))}h over`
                    : w.sla_hours_remaining < 24
                      ? `${Math.round(w.sla_hours_remaining)}h left`
                      : `${Math.round(w.sla_hours_remaining / 24)}d left`}
                </span>
              ) : (
                <span style={{ ...mono, fontSize: 12, color: "rgba(100,116,139,0.4)" }}>
                  {SLA_BY_SEVERITY[severity] ?? "—"}
                </span>
              )}
              {w.sla_breached && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", marginTop: 2 }}>
                  <AlertTriangle size={9} color="#ff0040" />
                  <span style={{ ...mono, fontSize: 9, color: "#ff0040" }}>BREACH</span>
                </div>
              )}
            </div>
          )}

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                color: "rgba(100,116,139,0.5)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                flexShrink: 0,
                transition: "border-color 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,0,64,0.35)";
                e.currentTarget.style.color = "#ff0040";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(100,116,139,0.5)";
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── WORKFLOW ACTION BAR ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "8px 20px 8px 28px",
          borderBottom: divider,
          background: "rgba(255,255,255,0.012)",
        }}
      >
        <span style={ls}>Workflow</span>

        {/* Current status badge */}
        <SeverityBadge severity={w?.status ?? "NEW"} size="sm" />

        {/* Advance button */}
        {nextStatus && onAdvanceStatus && (
          <button
            onClick={() => {
              onAdvanceStatus(finding.id);
              toast.success(`Status → ${WORKFLOW_META[nextStatus].label}`);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 6,
              background: `${wMeta.color}14`,
              border: `1px solid ${wMeta.color}35`,
              color: wMeta.color,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.1s, border-color 0.1s",
              ...mono,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${wMeta.color}24`;
              e.currentTarget.style.borderColor = `${wMeta.color}55`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${wMeta.color}14`;
              e.currentTarget.style.borderColor = `${wMeta.color}35`;
            }}
          >
            <Activity size={11} />
            Advance → {WORKFLOW_META[nextStatus].label}
          </button>
        )}

        {/* Assign select */}
        {onAssign && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              onAssign(finding.id, e.target.value);
              e.target.value = "";
            }}
            style={{
              ...mono,
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.22)",
              color: "#06b6d4",
              fontSize: 11,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="" disabled>
              {w?.assignee ? `Reassign (${w.assignee})` : "Assign to…"}
            </option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}

        {/* Ticket */}
        {w?.ticket_id ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(0,255,136,0.07)",
              border: "1px solid rgba(0,255,136,0.2)",
              color: "#00ff88",
              fontSize: 11,
              ...mono,
            }}
          >
            <Ticket size={11} />
            {w.ticket_id}
          </span>
        ) : onCreateTicket ? (
          <button
            onClick={() => onCreateTicket(finding.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(148,163,184,0.7)",
              fontSize: 11,
              cursor: "pointer",
              transition: "background 0.1s, border-color 0.1s, color 0.1s",
              ...mono,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,255,136,0.07)";
              e.currentTarget.style.borderColor = "rgba(0,255,136,0.22)";
              e.currentTarget.style.color = "#00ff88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "rgba(148,163,184,0.7)";
            }}
          >
            <Ticket size={11} />
            Create Ticket
          </button>
        ) : null}

        {/* False Positive */}
        {onMarkFalsePositive &&
          w?.status !== "FALSE_POSITIVE" &&
          w?.status !== "REMEDIATED" && (
            <button
              onClick={() => onMarkFalsePositive(finding.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                borderRadius: 6,
                background: "rgba(100,116,139,0.07)",
                border: "1px solid rgba(100,116,139,0.18)",
                color: "#64748b",
                fontSize: 11,
                cursor: "pointer",
                transition: "background 0.1s, border-color 0.1s, color 0.1s",
                ...mono,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(100,116,139,0.14)";
                e.currentTarget.style.borderColor = "rgba(100,116,139,0.32)";
                e.currentTarget.style.color = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(100,116,139,0.07)";
                e.currentTarget.style.borderColor = "rgba(100,116,139,0.18)";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              <Circle size={11} />
              False Positive
            </button>
          )}

        {/* First seen + ticket meta */}
        <span style={{ marginLeft: "auto", ...mono, fontSize: 10, color: "rgba(100,116,139,0.35)" }}>
          {w?.ticket_id && `${w.ticket_id} · `}
          First seen: {w ? relativeTime(w.first_seen) : "—"}
        </span>
      </div>

      {/* ── BODY: TABS (65%) + SIDEBAR (35%) ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "65% 35%", minHeight: 200 }}>

        {/* Left: tab content */}
        <div style={{ borderRight: divider }}>
          {/* Tab nav */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: divider,
              padding: "0 20px 0 28px",
            }}
          >
            {(
              [
                { id: "overview",   label: "Overview",      icon: <Shield size={12} /> },
                { id: "runbook",    label: "Runbook",       icon: <GitBranch size={12} /> },
                { id: "timeline",   label: "Timeline",      icon: <Clock size={12} /> },
                { id: "ir_engine",  label: "IR Engine",     icon: <FlaskConical size={12} /> },
                { id: "evidence",   label: "Evidence",      icon: <Archive size={12} /> },
                { id: "agent",      label: "Agent Actions", icon: <Bot size={12} /> },
              ] as { id: TabId; label: string; icon: React.ReactNode }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 16px",
                  background: activeTab === t.id ? "rgba(129,140,248,0.06)" : "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === t.id ? "#818cf8" : "transparent"}`,
                  color: activeTab === t.id ? "#818cf8" : "rgba(100,116,139,0.55)",
                  fontSize: 12,
                  fontWeight: activeTab === t.id ? 600 : 400,
                  cursor: "pointer",
                  marginBottom: -1,
                  transition: "color 0.1s, background 0.1s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== t.id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "#94a3b8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== t.id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(100,116,139,0.55)";
                  }
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ padding: "16px 20px 20px 28px" }}>

            {/* ── OVERVIEW ────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Risk acceptance note — always shown when present */}
                {w?.risk_acceptance_note && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 6,
                      background: "rgba(251,146,60,0.07)",
                      border: "1px solid rgba(251,146,60,0.2)",
                    }}
                  >
                    <div style={{ ...ls, color: "rgba(251,146,60,0.8)", marginBottom: 4 }}>Risk Acceptance Note</div>
                    <p style={{ fontSize: 12, color: "#fb923c", margin: 0, lineHeight: 1.5 }}>
                      {w.risk_acceptance_note}
                    </p>
                    {w.risk_acceptance_expiry && (
                      <p style={{ ...mono, fontSize: 10, color: "rgba(251,146,60,0.5)", margin: "8px 0 0" }}>
                        Expires: {new Date(w.risk_acceptance_expiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {overviewAi.status === "ready" ? (
                  // ── AI LOADED ─────────────────────────────────────────────────────────
                  <>
                    {/* Confidence / MITRE / FP strip */}
                    {(() => {
                      const confPct = overviewAi.confidence !== undefined ? Math.round(overviewAi.confidence * 100) : null;
                      const fpPct   = overviewAi.falsePositive !== undefined ? Math.round(overviewAi.falsePositive * 100) : null;
                      const confColor = confPct === null ? "#64748b" : confPct >= 80 ? "#00ff88" : confPct >= 50 ? "#ffb000" : "#ff0040";
                      const fpColor   = fpPct   === null ? "#64748b" : fpPct   <= 10 ? "#00ff88" : fpPct   <= 30 ? "#ffb000" : "#ff0040";
                      const model = overviewAi.triageModel ?? overviewAi.rootModel;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {confPct !== null && (
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 20,
                                background: `${confColor}14`,
                                border: `1px solid ${confColor}35`,
                                fontSize: 11, fontWeight: 700, color: confColor,
                                ...mono,
                              }}
                            >
                              ✓ {confPct}%
                            </span>
                          )}
                          {fpPct !== null && (
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center",
                                padding: "3px 9px", borderRadius: 20,
                                background: `${fpColor}10`,
                                border: `1px solid ${fpColor}30`,
                                fontSize: 10, fontWeight: 600, color: fpColor,
                                ...mono,
                              }}
                            >
                              FP {fpPct}%
                            </span>
                          )}
                          {overviewAi.mitre?.map((t) => (
                            <span
                              key={t}
                              style={{
                                padding: "3px 8px", borderRadius: 4,
                                background: "rgba(129,140,248,0.1)",
                                border: "1px solid rgba(129,140,248,0.25)",
                                fontSize: 10, fontWeight: 700, color: "#818cf8",
                                ...mono,
                              }}
                            >
                              {t}
                            </span>
                          ))}
                          <span style={{ flex: 1 }} />
                          {model && (
                            <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
                              {formatLlmModelDisplay(model)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void loadOverviewAi(true)}
                            title="Regenerate AI overview"
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 24, height: 24, borderRadius: 5,
                              background: "rgba(129,140,248,0.08)",
                              border: "1px solid rgba(129,140,248,0.22)",
                              color: "rgba(129,140,248,0.6)",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      );
                    })()}

                    {/* Triage Assessment */}
                    {overviewAi.triage ? (
                      <div>
                        <div style={{ ...ls, marginBottom: 6 }}>Triage Assessment</div>
                        <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                          {overviewAi.triage}
                        </p>
                      </div>
                    ) : null}

                    {/* Root Cause */}
                    {overviewAi.rootCause ? (
                      <div>
                        <div style={{ ...ls, marginBottom: 6 }}>Root Cause</div>
                        <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                          {overviewAi.rootCause}
                        </p>
                      </div>
                    ) : null}

                    {/* Empty AI response */}
                    {!overviewAi.triage && !overviewAi.rootCause && (
                      <p style={{ fontSize: 12, color: "rgba(100,116,139,0.55)", margin: 0 }}>
                        Empty response — check <code style={mono}>BEDROCK_API_KEY</code> and{" "}
                        <code style={mono}>VITE_IR_API_BASE</code>.
                      </p>
                    )}

                    {/* Disclosure toggles */}
                    <div
                      style={{
                        borderTop: divider,
                        paddingTop: 10,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {(
                        [
                          { label: "Raw description", expanded: descExpanded, toggle: () => setDescExpanded((x) => !x) },
                          ...(finding.recommendation
                            ? [{ label: "Recommendation", expanded: recExpanded, toggle: () => setRecExpanded((x) => !x) }]
                            : []),
                        ] as { label: string; expanded: boolean; toggle: () => void }[]
                      ).map(({ label, expanded, toggle }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={toggle}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 10px", borderRadius: 4,
                            background: expanded ? "rgba(100,116,139,0.12)" : "transparent",
                            border: "1px solid rgba(100,116,139,0.2)",
                            color: "rgba(100,116,139,0.65)",
                            fontSize: 10, fontWeight: 600,
                            cursor: "pointer",
                            ...mono,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                          }}
                        >
                          <ChevronRight
                            size={9}
                            style={{
                              transform: expanded ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s",
                              flexShrink: 0,
                            }}
                          />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Expanded description */}
                    {descExpanded && (
                      <p
                        style={{
                          fontSize: 12, color: "rgba(148,163,184,0.75)",
                          lineHeight: 1.65, margin: 0,
                          paddingLeft: 12,
                          borderLeft: "2px solid rgba(100,116,139,0.18)",
                        }}
                      >
                        {finding.description}
                      </p>
                    )}

                    {/* Expanded recommendation */}
                    {recExpanded && finding.recommendation && (
                      <p
                        style={{
                          fontSize: 12, color: "rgba(252,211,77,0.8)",
                          lineHeight: 1.65, margin: 0,
                          paddingLeft: 12,
                          borderLeft: "2px solid rgba(255,176,0,0.25)",
                        }}
                      >
                        {finding.recommendation}
                      </p>
                    )}
                  </>
                ) : (
                  // ── PRE-AI (idle / loading / error) ───────────────────────────────────
                  <>
                    {/* Description */}
                    <div>
                      <div style={{ ...ls, marginBottom: 8 }}>Description</div>
                      <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, margin: 0 }}>
                        {finding.description}
                      </p>
                    </div>

                    {/* Recommendation */}
                    {finding.recommendation && (
                      <div
                        style={{
                          padding: "12px 16px", borderRadius: 8,
                          background: "rgba(255,176,0,0.07)",
                          border: "1px solid rgba(255,176,0,0.2)",
                        }}
                      >
                        <div style={{ ...ls, color: "rgba(255,176,0,0.8)", marginBottom: 6 }}>Recommendation</div>
                        <p style={{ fontSize: 12, color: "rgba(252,211,77,0.85)", lineHeight: 1.7, margin: 0 }}>
                          {finding.recommendation}
                        </p>
                      </div>
                    )}

                    {/* Loading */}
                    {overviewAi.status === "loading" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(148,163,184,0.9)", fontSize: 12 }}>
                        <Loader2 size={16} color="#818cf8" className="animate-spin" />
                        Running triage + root-cause analysis…
                      </div>
                    )}

                    {/* Error */}
                    {overviewAi.status === "error" && (
                      <div style={{ fontSize: 12, color: "#fb7185", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{overviewAi.error}</span>
                        <button
                          type="button"
                          onClick={() => void loadOverviewAi(false)}
                          style={{
                            padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                            background: "rgba(251,113,133,0.12)",
                            border: "1px solid rgba(251,113,133,0.3)",
                            color: "#fb7185", fontSize: 10, cursor: "pointer",
                            ...mono,
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Analyze CTA */}
                    {(overviewAi.status === "idle" || overviewAi.status === "error") && (
                      <button
                        type="button"
                        onClick={() => void loadOverviewAi(false)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 8,
                          padding: "10px 16px", borderRadius: 8,
                          background: "rgba(129,140,248,0.1)",
                          border: "1px solid rgba(129,140,248,0.28)",
                          color: "#a5b4fc", fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                          ...mono,
                        }}
                      >
                        <Zap size={14} />
                        Analyze with AI
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── RUNBOOK ─────────────────────────────────────────────── */}
            {activeTab === "runbook" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(99,102,241,0.06)",
                    border: "1px solid rgba(129,140,248,0.22)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ ...ls, color: "rgba(129,140,248,0.85)", marginBottom: 4 }}>AI runbook</div>
                      <p style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", margin: 0, lineHeight: 1.5 }}>
                        On-demand; cached per finding until you regenerate.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {runbookAi.status === "ready" && (
                        <button
                          type="button"
                          onClick={() => void loadRunbookAi(true)}
                          disabled={runbookAi.status === "loading"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "rgba(129,140,248,0.12)",
                            border: "1px solid rgba(129,140,248,0.28)",
                            color: "#818cf8",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            ...mono,
                          }}
                        >
                          <RefreshCw size={12} />
                          Regenerate
                        </button>
                      )}
                      {(runbookAi.status === "idle" || runbookAi.status === "error") && (
                        <button
                          type="button"
                          onClick={() => void loadRunbookAi(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 14px",
                            borderRadius: 6,
                            background: "rgba(129,140,248,0.18)",
                            border: "1px solid rgba(129,140,248,0.35)",
                            color: "#a5b4fc",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            ...mono,
                          }}
                        >
                          <GitBranch size={14} />
                          Generate AI runbook
                        </button>
                      )}
                    </div>
                  </div>
                  {runbookAi.status === "loading" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, color: "rgba(148,163,184,0.9)", fontSize: 12 }}>
                      <Loader2 size={16} color="#818cf8" className="animate-spin" />
                      Generating runbook…
                    </div>
                  )}
                  {runbookAi.status === "error" && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#fb7185" }}>
                      {runbookAi.error}
                      <button
                        type="button"
                        onClick={() => void loadRunbookAi(false)}
                        style={{
                          marginLeft: 8,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(251,113,133,0.12)",
                          border: "1px solid rgba(251,113,133,0.3)",
                          color: "#fb7185",
                          fontSize: 10,
                          cursor: "pointer",
                          ...mono,
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ ...ls, color: aiSteps ? "rgba(129,140,248,0.75)" : "rgba(100,116,139,0.45)" }}>
                    {aiSteps ? "AI-generated playbook" : "Built-in playbook"}
                  </div>
                  {aiSteps && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "rgba(129,140,248,0.12)",
                        border: "1px solid rgba(129,140,248,0.28)",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#818cf8",
                        ...mono,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      <Bot size={9} />
                      AI
                    </span>
                  )}
                  {aiSteps && runbookAi.model && (
                    <span style={{ marginLeft: "auto", ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
                      {formatLlmModelDisplay(runbookAi.model)}
                    </span>
                  )}
                </div>

                {/* Phase legend + time estimate */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {(Object.keys(PHASE_META) as PlaybookPhase[]).map((ph) => (
                    <span
                      key={ph}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: `${PHASE_META[ph].color}18`,
                        border: `1px solid ${PHASE_META[ph].color}30`,
                        color: PHASE_META[ph].color,
                        ...mono,
                      }}
                    >
                      {ph}
                    </span>
                  ))}
                  <span style={{ marginLeft: "auto", ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)" }}>
                    Est. {steps.reduce((sum, s) => sum + parseInt(s.estimated_time, 10), 0)} min total
                  </span>
                </div>

                {steps.map((step, si) => {
                  const ph = PHASE_META[step.phase];
                  return (
                    <div
                      key={step.step}
                      style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, alignItems: "start" }}
                    >
                      {/* Step connector */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: `${ph.color}18`,
                            border: `1px solid ${ph.color}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: ph.color,
                            ...mono,
                            flexShrink: 0,
                          }}
                        >
                          {step.step}
                        </div>
                        {si < steps.length - 1 && (
                          <div
                            style={{
                              width: 1,
                              flex: 1,
                              minHeight: 12,
                              background: "rgba(255,255,255,0.06)",
                              marginTop: 4,
                            }}
                          />
                        )}
                      </div>

                      {/* Step content */}
                      <div style={{ paddingBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              background: `${ph.color}18`,
                              color: ph.color,
                              ...mono,
                              textTransform: "uppercase",
                            }}
                          >
                            {ph.label}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                            {step.title}
                          </span>
                          <span style={{ marginLeft: "auto", ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)" }}>
                            ~{step.estimated_time}m
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.55 }}>
                          {step.description}
                        </p>
                        {step.commands.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {step.commands.map((cmd, ci) => {
                              const isComment = cmd.startsWith("#");
                              const copyKey = `cmd-${step.step}-${ci}`;
                              return (
                                <div
                                  key={ci}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    background: isComment
                                      ? "transparent"
                                      : "rgba(0,0,0,0.32)",
                                    border: isComment
                                      ? "none"
                                      : "1px solid rgba(255,255,255,0.06)",
                                  }}
                                >
                                  <span
                                    style={{
                                      flex: 1,
                                      fontSize: 11,
                                      color: isComment
                                        ? "rgba(100,116,139,0.45)"
                                        : "#a5b4fc",
                                      wordBreak: "break-all",
                                      lineHeight: 1.55,
                                      ...mono,
                                    }}
                                  >
                                    {cmd}
                                  </span>
                                  {!isComment && (
                                    <button
                                      onClick={() => copy(cmd, copyKey)}
                                      title="Copy command"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "0 2px",
                                        flexShrink: 0,
                                        color: copiedId === copyKey
                                          ? "#00ff88"
                                          : "rgba(100,116,139,0.4)",
                                        display: "flex",
                                        alignItems: "center",
                                        transition: "color 0.1s",
                                      }}
                                    >
                                      {copiedId === copyKey ? (
                                        <Check size={12} />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TIMELINE ────────────────────────────────────────────── */}
            {activeTab === "timeline" && (
              <div>
                {(!w?.timeline || w.timeline.length === 0) ? (
                  <div style={{ padding: "32px 0", textAlign: "center" }}>
                    <Clock size={32} color="rgba(100,116,139,0.2)" style={{ margin: "0 auto 12px" }} />
                    <p style={{ color: "rgba(100,116,139,0.4)", fontSize: 13, margin: 0 }}>
                      No timeline events recorded
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
                    {w.timeline.map((event, ei) => (
                      <div
                        key={event.id}
                        style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12, marginBottom: 12 }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: ACTOR_COLORS[event.actor_type] ?? "#64748b",
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          {ei < w.timeline.length - 1 && (
                            <div
                              style={{
                                width: 1,
                                flex: 1,
                                minHeight: 8,
                                background: "rgba(255,255,255,0.06)",
                                marginTop: 4,
                              }}
                            />
                          )}
                        </div>
                        <div style={{ paddingBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                              {event.action}
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                background: `${ACTOR_COLORS[event.actor_type] ?? "#64748b"}20`,
                                color: ACTOR_COLORS[event.actor_type] ?? "#64748b",
                                ...mono,
                                textTransform: "uppercase",
                              }}
                            >
                              {event.actor_type}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "rgba(100,116,139,0.7)" }}>
                              {event.actor}
                            </span>
                            <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.4)" }}>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {event.note && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "rgba(100,116,139,0.65)",
                                margin: "4px 0 0",
                                lineHeight: 1.5,
                              }}
                            >
                              {event.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── IR ENGINE ───────────────────────────────────────────── */}
            {activeTab === "ir_engine" && (
              <IRActionEngine finding={finding} />
            )}

            {/* ── EVIDENCE & FORENSICS ─────────────────────────────────── */}
            {activeTab === "evidence" && (
              <EvidenceForensicsPanel finding={finding} />
            )}

            {/* ── AGENT ACTIONS (legacy stubs) ─────────────────────────── */}
            {activeTab === "agent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(167,139,250,0.07)",
                    border: "1px solid rgba(167,139,250,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Bot size={14} color="#a78bfa" />
                  <span style={{ fontSize: 11, color: "#a78bfa" }}>
                    AI Agent integration ready — wire{" "}
                    <code style={{ ...mono, background: "rgba(167,139,250,0.14)", padding: "2px 8px", borderRadius: 4 }}>
                      /api/agents
                    </code>{" "}
                    endpoints per action below
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    {
                      icon: <Zap size={15} color="#818cf8" />,
                      title: "AI Triage",
                      desc: "LLM-backed severity validation, false-positive scoring, threat-intel enrichment.",
                      endpoint: "POST /api/agents/triage",
                      color: "#818cf8",
                      action: () => toast.info("AI Triage Agent", { description: `POST /api/agents/triage → ${finding.id}` }),
                    },
                    {
                      icon: <Bot size={15} color="#a78bfa" />,
                      title: "Auto-Remediate",
                      desc: "Lambda-backed agent executes runbook steps. Requires approval gate.",
                      endpoint: "POST /api/agents/remediate",
                      color: "#a78bfa",
                      action: () => toast.info("Remediation Agent", { description: "POST /api/agents/remediate → dry_run=true" }),
                    },
                    {
                      icon: <Ticket size={15} color="#06b6d4" />,
                      title: "Create Ticket",
                      desc: "Auto-generate Jira/ServiceNow incident with pre-filled context and runbook link.",
                      endpoint: "POST /api/integrations/ticket",
                      color: "#06b6d4",
                      action: () => toast.info("Ticket Agent", { description: "POST /api/integrations/ticket → Jira" }),
                    },
                    {
                      icon: <ExternalLink size={15} color="#fb923c" />,
                      title: "Threat Intel",
                      desc: "Enrich finding with VirusTotal, Shodan, and AWS Threat Intel feed data.",
                      endpoint: "POST /api/agents/enrich",
                      color: "#fb923c",
                      action: () => toast.info("Threat Intel Agent", { description: "POST /api/agents/enrich → enrichment" }),
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: `${card.color}08`,
                        border: `1px solid ${card.color}22`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {card.icon}
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                          {card.title}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(100,116,139,0.7)", margin: 0, lineHeight: 1.5 }}>
                        {card.desc}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.35)" }}>
                          {card.endpoint}
                        </span>
                        <button
                          onClick={card.action}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 4,
                            background: `${card.color}14`,
                            border: `1px solid ${card.color}30`,
                            color: card.color,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            ...mono,
                            flexShrink: 0,
                          }}
                        >
                          Run
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Assignee context */}
                {w?.assignee && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <UserCircle size={14} color="rgba(100,116,139,0.5)" />
                    <span style={{ fontSize: 11, color: "rgba(100,116,139,0.6)" }}>
                      Assigned to{" "}
                      <span style={{ color: "#94a3b8", fontWeight: 500 }}>{w.assignee}</span>
                      {" — "}agent notifications will route to their queue
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Metadata table */}
          <div>
            <div style={{ ...ls, marginBottom: 8 }}>Resource Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Resource", finding.resource_name],
                ...(finding.region ? [["Region", finding.region]] : []),
                ...(finding.first_seen ? [["First Seen", relativeTime(finding.first_seen)]] : []),
                ...(finding.last_seen ? [["Last Seen", relativeTime(finding.last_seen)]] : []),
                ...(w?.assignee ? [["Assignee", w.assignee]] : []),
                ...Object.entries(finding.metadata ?? {}),
              ].map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr",
                    gap: 8,
                    alignItems: "start",
                  }}
                >
                  <span style={{ ...ls, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
                    {key}
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: "#94a3b8", wordBreak: "break-all", lineHeight: 1.4 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ARN — copyable, full width */}
          {finding.resource_arn && (
            <div>
              <div style={{ ...ls, marginBottom: 6 }}>Resource ARN</div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: "rgba(100,116,139,0.55)",
                    wordBreak: "break-all",
                    lineHeight: 1.5,
                    flex: 1,
                  }}
                >
                  {finding.resource_arn}
                </span>
                <button
                  onClick={() => copy(finding.resource_arn!, "arn-sidebar")}
                  title="Copy ARN"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "1px 2px",
                    flexShrink: 0,
                    color: copiedId === "arn-sidebar" ? "#00ff88" : "rgba(100,116,139,0.35)",
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.1s",
                  }}
                >
                  {copiedId === "arn-sidebar" ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          )}

          {/* Compliance frameworks */}
          {finding.compliance_frameworks && finding.compliance_frameworks.length > 0 && (
            <div>
              <div style={{ ...ls, marginBottom: 8 }}>Compliance</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {finding.compliance_frameworks.map((fw) => (
                  <span
                    key={fw}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "#94a3b8",
                      fontSize: 10,
                      fontWeight: 600,
                      ...mono,
                    }}
                  >
                    {fw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick access — AWS Console links */}
          <div>
            <div style={{ ...ls, marginBottom: 8 }}>Quick Access</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <a
                href={`https://console.aws.amazon.com/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(255,153,0,0.06)",
                  border: "1px solid rgba(255,153,0,0.18)",
                  color: "#fb923c",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "background 0.1s, border-color 0.1s",
                  ...mono,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,153,0,0.12)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,153,0,0.32)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,153,0,0.06)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,153,0,0.18)";
                }}
              >
                <ExternalLink size={11} />
                AWS Console
              </a>
              <a
                href={`https://console.aws.amazon.com/cloudtrailv2/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(99,102,241,0.05)",
                  border: "1px solid rgba(99,102,241,0.16)",
                  color: "#818cf8",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "background 0.1s, border-color 0.1s",
                  ...mono,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(99,102,241,0.11)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.28)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(99,102,241,0.05)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,102,241,0.16)";
                }}
              >
                <Activity size={11} />
                CloudTrail Events
              </a>
              <button
                onClick={() => copy(finding.resource_arn ?? finding.resource_name, "console-copy")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: copiedId === "console-copy" ? "#00ff88" : "rgba(100,116,139,0.55)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.1s, border-color 0.1s, color 0.1s",
                  width: "100%",
                  textAlign: "left",
                  ...mono,
                }}
                onMouseEnter={(e) => {
                  if (copiedId !== "console-copy") {
                    e.currentTarget.style.background = "rgba(255,255,255,0.055)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.color = "#94a3b8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (copiedId !== "console-copy") {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "rgba(100,116,139,0.55)";
                  }
                }}
              >
                {copiedId === "console-copy" ? <Check size={11} /> : <Copy size={11} />}
                {copiedId === "console-copy" ? "Copied" : "Copy ARN / Resource ID"}
              </button>
            </div>
          </div>

          {/* Workflow advance shortcut (repeated in sidebar for 1-handed ops) */}
          {nextStatus && onAdvanceStatus && (
            <button
              onClick={() => {
                onAdvanceStatus(finding.id);
                toast.success(`Status → ${WORKFLOW_META[nextStatus].label}`);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 6,
                background: `${wMeta.color}12`,
                border: `1px solid ${wMeta.color}30`,
                color: wMeta.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                ...mono,
                transition: "background 0.12s, border-color 0.12s",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${wMeta.color}20`;
                e.currentTarget.style.borderColor = `${wMeta.color}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${wMeta.color}12`;
                e.currentTarget.style.borderColor = `${wMeta.color}30`;
              }}
            >
              <Activity size={13} />
              Advance → {WORKFLOW_META[nextStatus].label}
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
