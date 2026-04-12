/**
 * VoiceIRAgent — Argus v2
 *
 * Interaction model: push-to-talk (mic button) or type. No wake phrase required.
 * The engineer holds the mic button, speaks a command, releases — Argus responds.
 * Natural conversation flow: speak → response → speak again.
 *
 * New in v2:
 *   - AWS Polly Neural TTS via ttsService (Web Speech fallback)
 *   - LLM-powered briefings: briefing/critical/threat intents call llm_triage
 *     for the top critical finding and stream the result as a second card
 *   - Voice-triggered IR actions: isolate/revoke/disable intents enter a
 *     voice confirmation state machine (YES → execute, NO → cancel)
 *   - Context Preservation: finding cards rendered inline in chat
 *   - "Hey Argus" wake phrase fully removed
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Mic, MicOff, Volume2, Zap, X, Download, Trash2, ShieldAlert } from "lucide-react";
import { useActiveScanResults } from "../../hooks/useActiveScanResults";
import { pollySpeak } from "../../services/ttsService";
import { fetchLLMActionResult, triggerIRAction } from "../../services/irEngine";
import { useVoiceIntent } from "../../hooks/useVoiceIntent";
import type { ConversationTurn, FindingContext } from "../../hooks/useVoiceIntent";
import type { IRActionType, IRActionResult } from "../../types/ir";
import { ACTION_META } from "../../types/ir";

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentStatus   = "standby" | "listening" | "processing" | "speaking" | "error";
type ResponsePriority = "critical" | "high" | "warning" | "normal" | "success";
type PanelTab      = "live" | "audit";

interface ResponseField { label: string; value: string; color?: string }
interface ResponseItem  { text: string; sub?: string; action?: string; color?: string }
interface AgentResponse {
  classification: string;
  priority: ResponsePriority;
  fields?: ResponseField[];
  items?: ResponseItem[];
  spokenText: string;
}

interface TriageResult {
  summary: string;
  confidence?: number;
  mitre?: string[];
  falsePositive?: number;
}

interface IRConfirmData {
  actionType: IRActionType;
  findingId: string;
  findingTitle: string;
  resourceName: string;
  label: string;
  impactSummary: string;
}

// Message is a discriminated union via `type`
interface Message {
  id: string;
  role: "user" | "agent" | "system";
  ts: number;
  text?: string;
  response?: AgentResponse;
  type?: "normal" | "ir_confirm" | "llm_triage" | "finding_list" | "ir_result";
  confirmData?: IRConfirmData;
  triageData?: TriageResult;
  findingList?: FindingSnippet[];
}

interface FindingSnippet {
  id: string;
  title: string;
  severity: string;
  resource: string;
  region: string;
  service: string;
  color: string;
}

// Audit log entry
interface AuditEntry {
  id: string;
  ts: number;
  type: "stt" | "tts" | "intent" | "sys";
  content: string;
  confidence?: number;
  sessionId: string;
}

export interface VoiceIRAgentProps { onNavigate?: (tab: string) => void }

interface DerivedStats {
  total: number; critical: number; high: number; medium: number;
  slaBreached: number; threatLabel: string; threatColor: string;
}

// ── Priority palette ──────────────────────────────────────────────────────────
const PRIO: Record<ResponsePriority, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#ff0040", bg: "rgba(255,0,64,0.08)",   border: "rgba(255,0,64,0.22)",   label: "CRITICAL" },
  high:     { color: "#ff6b35", bg: "rgba(255,107,53,0.07)", border: "rgba(255,107,53,0.2)",  label: "HIGH"     },
  warning:  { color: "#ffb000", bg: "rgba(255,176,0,0.06)",  border: "rgba(255,176,0,0.18)",  label: "WARNING"  },
  normal:   { color: "#00d4ff", bg: "rgba(0,212,255,0.06)",  border: "rgba(0,212,255,0.15)",  label: "INFO"     },
  success:  { color: "#00ff88", bg: "rgba(0,255,136,0.06)",  border: "rgba(0,255,136,0.18)",  label: "CLEAR"    },
};

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88", INFORMATIONAL: "#64748b",
};

function sevColor(s: string) { return SEV_COLOR[(s ?? "").toUpperCase()] ?? "#64748b"; }

function newSessionId(): string {
  return `argus-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(2, 5)}`;
}

// ── Response builder ──────────────────────────────────────────────────────────
function buildResponse(intent: string, stats: DerivedStats, findings: any[], _raw: string): AgentResponse {
  const tz = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  switch (intent) {
    case "briefing": {
      const p: ResponsePriority = stats.critical > 0 ? "critical" : stats.high > 2 ? "high" : stats.total > 0 ? "warning" : "success";
      return {
        classification: "SITREP", priority: p,
        fields: [
          { label: "THREAT",   value: stats.threatLabel,                                              color: stats.threatColor },
          { label: "OPEN",     value: String(stats.total),                                            color: stats.total > 0 ? "#ff6b35" : "#00ff88" },
          { label: "CRITICAL", value: String(stats.critical),                                         color: stats.critical > 0 ? "#ff0040" : "#00ff88" },
          { label: "HIGH",     value: String(stats.high),                                             color: stats.high > 0 ? "#ff6b35" : "#00ff88" },
          { label: "SLA",      value: stats.slaBreached > 0 ? `${stats.slaBreached} BREACH` : "OK",  color: stats.slaBreached > 0 ? "#ff0040" : "#00ff88" },
          { label: "TIME",     value: `${tz}Z`,                                                       color: "rgba(100,116,139,0.5)" },
        ],
        items: stats.critical > 0
          ? findings.filter(f => (f.severity ?? "").toUpperCase() === "CRITICAL").slice(0, 3).map(f => ({
              text: f.finding_type ?? f.title ?? "Unnamed finding",
              sub:  f.resource_arn?.split(":").slice(-1)[0] ?? f.resource_name ?? "Unknown resource",
              action: "TRIAGE IMMEDIATELY", color: "#ff0040",
            }))
          : undefined,
        spokenText: stats.critical > 0
          ? `Situation report at ${tz}. Threat level ${stats.threatLabel}. ${stats.total} open findings. ${stats.critical} critical require immediate action. ${stats.slaBreached > 0 ? `${stats.slaBreached} SLA breach active.` : ""} Initiating LLM analysis.`
          : `Situation report at ${tz}. Threat level ${stats.threatLabel}. ${stats.total} open findings. ${stats.high > 0 ? `${stats.high} high severity in triage.` : "No critical threats."} Standard monitoring cadence.`,
      };
    }
    case "critical": {
      const crits = findings.filter(f => (f.severity ?? "").toUpperCase() === "CRITICAL");
      if (stats.critical === 0) return {
        classification: "CRITICAL FINDINGS", priority: "success",
        fields: [{ label: "STATUS", value: "NONE ACTIVE", color: "#00ff88" }, { label: "TIME", value: `${tz}Z`, color: "rgba(100,116,139,0.5)" }],
        spokenText: `No critical findings in queue at ${tz}. Critical tier is clean.`,
      };
      return {
        classification: "CRITICAL FINDINGS", priority: "critical",
        fields: [
          { label: "COUNT",  value: String(stats.critical), color: "#ff0040" },
          { label: "SLA",    value: "4H WINDOW",            color: "#ffb000" },
          { label: "ACTION", value: "IMMEDIATE",            color: "#ff0040" },
        ],
        items: crits.slice(0, 4).map((f, i) => ({
          text: f.finding_type ?? f.title ?? `Critical Finding ${i + 1}`,
          sub:  f.resource_arn?.split(":").slice(-1)[0] ?? f.resource_name ?? f.region ?? "us-east-1",
          action: f.service === "iam" ? "REVOKE + AUDIT" : f.service === "ec2" ? "ISOLATE INSTANCE" : f.service === "s3" ? "BLOCK PUBLIC ACCESS" : "TRIAGE NOW",
          color: "#ff0040",
        })),
        spokenText: `${stats.critical} critical findings active. ${crits.slice(0, 2).map((f, i) => `Finding ${i + 1}: ${f.finding_type ?? "Unnamed"}`).join(". ")}. Fetching LLM triage now.`,
      };
    }
    case "threat": {
      const p: ResponsePriority = stats.threatLabel === "CRITICAL" ? "critical" : stats.threatLabel === "HIGH" ? "high" : stats.threatLabel === "GUARDED" ? "warning" : "success";
      return {
        classification: "THREAT ASSESSMENT", priority: p,
        fields: [
          { label: "LEVEL",    value: stats.threatLabel,      color: stats.threatColor },
          { label: "CRITICAL", value: String(stats.critical), color: stats.critical > 0 ? "#ff0040" : "#00ff88" },
          { label: "HIGH",     value: String(stats.high),     color: stats.high > 0 ? "#ff6b35" : "#00ff88" },
          { label: "TOTAL",    value: String(stats.total),    color: "rgba(148,163,184,0.8)" },
          { label: "TIME",     value: `${tz}Z`,               color: "rgba(100,116,139,0.5)" },
        ],
        items: stats.critical > 0 ? [{ text: "Elevated response cadence required", action: "DECLARE INCIDENT", color: "#ff0040" }] : undefined,
        spokenText: `Threat level ${stats.threatLabel}. ${stats.total} open findings — ${stats.critical} critical, ${stats.high} high. ${stats.critical > 0 ? "Elevated response and incident declaration recommended." : "Standard protocols sufficient."}`,
      };
    }
    case "sla":
      if (stats.slaBreached === 0) return {
        classification: "SLA STATUS", priority: "success",
        fields: [
          { label: "STATUS", value: "COMPLIANT",  color: "#00ff88" },
          { label: "CRIT",   value: "4H WINDOW",  color: "rgba(148,163,184,0.6)" },
          { label: "HIGH",   value: "24H WINDOW", color: "rgba(148,163,184,0.6)" },
          { label: "MEDIUM", value: "7D WINDOW",  color: "rgba(148,163,184,0.6)" },
        ],
        spokenText: `All incidents within SLA at ${tz}. Critical window 4 hours. High 24 hours. Fully compliant.`,
      };
      return {
        classification: "SLA BREACH", priority: "critical",
        fields: [
          { label: "BREACHED", value: String(stats.slaBreached), color: "#ff0040" },
          { label: "ACTION",   value: "ESCALATE NOW",            color: "#ff0040" },
          { label: "TIME",     value: `${tz}Z`,                  color: "rgba(100,116,139,0.6)" },
        ],
        items: [
          { text: "Escalate to SOC leadership immediately",        action: "PAGE INCIDENT COMMANDER", color: "#ff0040" },
          { text: "Document all response actions with timestamps",  action: "UPDATE TICKET",           color: "#ffb000" },
        ],
        spokenText: `SLA breach. ${stats.slaBreached} incident${stats.slaBreached > 1 ? "s" : ""} exceeded response window. Escalate to SOC leadership immediately.`,
      };
    case "latest": {
      const recent = findings.slice(0, 4);
      if (!recent.length) return {
        classification: "RECENT FINDINGS", priority: "success",
        fields: [{ label: "STATUS", value: "QUEUE EMPTY", color: "#00ff88" }],
        spokenText: `No findings in queue. Run a full scan to refresh.`,
      };
      return {
        classification: "RECENT FINDINGS",
        priority: recent[0] && (recent[0].severity ?? "").toUpperCase() === "CRITICAL" ? "critical" : "normal",
        fields: [{ label: "COUNT", value: String(recent.length), color: "#00d4ff" }, { label: "TIME", value: `${tz}Z`, color: "rgba(100,116,139,0.6)" }],
        items: recent.map(f => {
          const sev = (f.severity ?? "MEDIUM").toUpperCase();
          return { text: f.finding_type ?? f.title ?? "Unnamed", sub: `${sev} · ${f.region ?? "us-east-1"}`, color: sevColor(sev) };
        }),
        spokenText: `${recent.length} recent findings. ${recent.slice(0, 2).map(f => `${(f.severity ?? "medium").toLowerCase()}: ${f.finding_type ?? "unnamed"}`).join(". ")}. Triage in priority order.`,
      };
    }
    case "show_findings": {
      if (!findings.length) return {
        classification: "FINDINGS", priority: "success",
        fields: [{ label: "STATUS", value: "QUEUE EMPTY", color: "#00ff88" }],
        spokenText: "No open findings. Environment looks clean.",
      };
      return {
        classification: "OPEN FINDINGS", priority: stats.critical > 0 ? "critical" : stats.high > 0 ? "high" : "warning",
        fields: [
          { label: "TOTAL",    value: String(stats.total),    color: "#00d4ff" },
          { label: "CRITICAL", value: String(stats.critical), color: stats.critical > 0 ? "#ff0040" : "#00ff88" },
          { label: "HIGH",     value: String(stats.high),     color: stats.high > 0 ? "#ff6b35" : "#00ff88" },
        ],
        spokenText: `${stats.total} open findings. ${stats.critical} critical, ${stats.high} high. Rendering cards below.`,
      };
    }
    case "compliance":
      return {
        classification: "COMPLIANCE STATUS", priority: stats.critical > 0 ? "warning" : "success",
        fields: [
          { label: "SOC 2",   value: "TYPE II", color: "#00ff88" },
          { label: "CIS",     value: "v8",      color: "#00ff88" },
          { label: "NIST",    value: "CSF 2.0", color: "#00ff88" },
          { label: "PCI DSS", value: "4.0",     color: "#00ff88" },
        ],
        items: stats.critical > 0 ? [{ text: "Critical findings degrading compliance posture", action: "REMEDIATE BEFORE AUDIT", color: "#ffb000" }] : undefined,
        spokenText: `Compliance under active assessment across SOC 2, CIS, NIST, and PCI DSS. ${stats.critical > 0 ? "Critical findings are degrading posture." : "Posture tracking within target bands."}`,
      };
    case "high": {
      const highs = findings.filter(f => (f.severity ?? "").toUpperCase() === "HIGH");
      if (stats.high === 0) return {
        classification: "HIGH FINDINGS", priority: "success",
        fields: [{ label: "STATUS", value: "NONE ACTIVE", color: "#00ff88" }],
        spokenText: `No high-severity findings. High-risk tier clean.`,
      };
      return {
        classification: "HIGH FINDINGS", priority: "high",
        fields: [{ label: "COUNT", value: String(stats.high), color: "#ff6b35" }, { label: "SLA", value: "24H WINDOW", color: "#ffb000" }],
        items: highs.slice(0, 3).map(f => ({
          text: f.finding_type ?? f.title ?? "Unnamed",
          sub:  f.resource_arn?.split(":").slice(-1)[0] ?? f.region ?? "us-east-1",
          color: "#ff6b35",
        })),
        spokenText: `${stats.high} high-severity findings. 24-hour SLA. ${stats.high > 3 ? "Volume elevated — assign dedicated responders." : "Load manageable."}`,
      };
    }
    case "isolate":
      return {
        classification: "CONTAINMENT REQUEST", priority: "warning",
        fields: [{ label: "STATUS", value: "AWAITING CONFIRMATION", color: "#ffb000" }],
        spokenText: `EC2 isolation requested. Reviewing top critical finding.`,
      };
    case "revoke":
      return {
        classification: "KEY REVOCATION REQUEST", priority: "warning",
        fields: [{ label: "STATUS", value: "AWAITING CONFIRMATION", color: "#ffb000" }],
        spokenText: `IAM key revocation requested. Reviewing top critical finding.`,
      };
    case "disable_key":
      return {
        classification: "KEY DISABLE REQUEST", priority: "warning",
        fields: [{ label: "STATUS", value: "AWAITING CONFIRMATION", color: "#ffb000" }],
        spokenText: `IAM key disable requested. Reviewing top critical finding.`,
      };
    case "scan":
      return {
        classification: "SCAN INITIATED", priority: "normal",
        fields: [
          { label: "SCOPE",  value: "FULL",        color: "#00d4ff" },
          { label: "TARGET", value: "ALL REGIONS", color: "#00d4ff" },
          { label: "ETA",    value: "45–90 SEC",   color: "#00d4ff" },
        ],
        items: [
          { text: "IAM · EC2 · S3 · VPC",             color: "rgba(148,163,184,0.6)" },
          { text: "GuardDuty · Security Hub · Config", color: "rgba(148,163,184,0.6)" },
        ],
        spokenText: `Full security scan initiated. Scanning all services across active regions.`,
      };
    case "navigate":
      return {
        classification: "NAVIGATION", priority: "normal",
        fields: [],
        items: [
          { text: "IAM · Access Analyzer",    sub: "iam, access analyzer"    },
          { text: "GuardDuty · Security Hub", sub: "guardduty, security hub" },
          { text: "Alerts · Compliance",      sub: "alerts, compliance"      },
          { text: "SOC · Infra · Reports",    sub: "soc, infra, reports"     },
        ],
        spokenText: `Navigation available. Say the page name: IAM, GuardDuty, alerts, or compliance.`,
      };
    case "help":
      return {
        classification: "COMMAND REFERENCE", priority: "normal",
        fields: [],
        items: [
          { text: "Brief me",            sub: "full situational report",    color: "rgba(148,163,184,0.8)" },
          { text: "Critical findings",   sub: "active critical alerts",     color: "#ff0040" },
          { text: "Threat level",        sub: "current threat assessment",  color: "#ff6b35" },
          { text: "SLA status",          sub: "breach and compliance info", color: "#ffb000" },
          { text: "List findings",       sub: "show inline finding cards",  color: "#00d4ff" },
          { text: "Isolate instance",    sub: "EC2 isolation — voice confirm required", color: "#ff6b35" },
          { text: "Revoke key",          sub: "IAM key revoke — voice confirm required", color: "#ff0040" },
          { text: "Disable key",         sub: "IAM key disable",            color: "#ffb000" },
          { text: "Run scan",            sub: "full environment scan",      color: "#00ff88" },
          { text: "Navigate to [page]",  sub: "jump to any section",        color: "#00d4ff" },
        ],
        spokenText: `Available commands: brief me, critical findings, threat level, SLA status, list findings, isolate instance, revoke key, disable key, run scan, navigate. Standing by.`,
      };
    default:
      return {
        classification: "UNRECOGNIZED", priority: "normal",
        fields: [],
        items: [{ text: "Command not recognized", sub: `Say "help" for command list`, color: "rgba(100,116,139,0.5)" }],
        spokenText: `Command not recognized. Say "help" for available commands.`,
      };
  }
}

// ── Waveform ──────────────────────────────────────────────────────────────────
function Waveform({ active, color, count = 28 }: { active: boolean; color: string; count?: number }) {
  const [h, setH] = useState<number[]>(() => Array(count).fill(2));
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      t.current = setInterval(() => setH(Array(count).fill(0).map((_, i) => {
        const center = Math.abs(i - count / 2) / (count / 2);
        const max = Math.round(22 - center * 6);
        return Math.floor(Math.random() * max) + 3;
      })), 75);
    } else {
      if (t.current) clearInterval(t.current);
      setH(Array(count).fill(2));
    }
    return () => { if (t.current) clearInterval(t.current); };
  }, [active, count]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 28 }}>
      {h.map((v, i) => (
        <div key={i} style={{
          width: 2.5, height: v, borderRadius: 1.5,
          background: active ? color : "rgba(100,116,139,0.12)",
          opacity: active ? 0.35 + (v / 24) * 0.65 : 1,
          transition: active ? "height 0.075s ease" : "height 0.5s ease",
        }} />
      ))}
    </div>
  );
}

function MiniWave({ active, color }: { active: boolean; color: string }) {
  const [h, setH] = useState([2, 4, 5, 4, 2]);
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      t.current = setInterval(() => setH([
        Math.floor(Math.random() * 8) + 2, Math.floor(Math.random() * 12) + 4,
        Math.floor(Math.random() * 14) + 5, Math.floor(Math.random() * 12) + 4,
        Math.floor(Math.random() * 8) + 2,
      ]), 80);
    } else {
      if (t.current) clearInterval(t.current);
      setH([2, 4, 5, 4, 2]);
    }
    return () => { if (t.current) clearInterval(t.current); };
  }, [active]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1, height: 14 }}>
      {h.map((v, i) => (
        <div key={i} style={{ width: 2, height: v, borderRadius: 1, background: active ? color : "rgba(100,116,139,0.25)", transition: "height 0.075s ease" }} />
      ))}
    </div>
  );
}

const STATUS_CFG: Record<AgentStatus, { label: string; color: string }> = {
  standby:    { label: "STANDBY",    color: "#475569" },
  listening:  { label: "LISTENING",  color: "#00d4ff" },
  processing: { label: "PROCESSING", color: "#a78bfa" },
  speaking:   { label: "SPEAKING",   color: "#00ff88" },
  error:      { label: "ERROR",      color: "#ff0040" },
};

// ── Finding mini-card ─────────────────────────────────────────────────────────
function FindingMiniCard({ findings }: { findings: FindingSnippet[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {findings.map((f, i) => (
        <div key={f.id} style={{
          display: "grid", gridTemplateColumns: "16px 1fr auto",
          alignItems: "center", gap: 8,
          padding: "6px 10px",
          background: "rgba(8,14,30,0.6)",
          border: `1px solid ${f.color}22`,
          borderLeft: `2px solid ${f.color}`,
          borderRadius: 5,
        }}>
          <span style={{ fontSize: 7.5, fontWeight: 800, color: f.color, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}.</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
            <div style={{ fontSize: 8.5, color: "rgba(100,116,139,0.55)", fontFamily: "'JetBrains Mono', monospace", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.resource} · {f.region}</div>
          </div>
          <span style={{
            fontSize: 7, fontWeight: 800, letterSpacing: "0.1em",
            color: f.color, background: `${f.color}12`, border: `1px solid ${f.color}28`,
            borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
          }}>{f.severity}</span>
        </div>
      ))}
    </div>
  );
}

// ── IR Confirm card ───────────────────────────────────────────────────────────
function IRConfirmCard({
  data,
  onYes,
  onNo,
}: {
  data: IRConfirmData;
  onYes: () => void;
  onNo: () => void;
}) {
  const p = PRIO["warning"];
  return (
    <div style={{
      background: "rgba(8,14,30,0.8)",
      border: `1px solid ${p.border}`,
      borderTop: `2px solid ${p.color}`,
      borderRadius: 6, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: p.bg, borderBottom: `1px solid ${p.border}` }}>
        <ShieldAlert size={10} style={{ color: p.color, flexShrink: 0 }} />
        <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>VOICE CONFIRMATION REQUIRED</span>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: p.color, background: `${p.color}18`, border: `1px solid ${p.color}30`, borderRadius: 3, padding: "0 5px", lineHeight: "13px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>WARNING</span>
      </div>
      {/* Action details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ padding: "6px 10px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>ACTION</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ffb000", fontFamily: "'JetBrains Mono', monospace" }}>{data.label}</div>
        </div>
        <div style={{ padding: "6px 10px" }}>
          <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>TARGET</div>
          <div style={{ fontSize: 10, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.findingTitle}</div>
        </div>
      </div>
      {/* Impact */}
      <div style={{ padding: "6px 10px", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 3 }}>IMPACT</div>
        <div style={{ fontSize: 10.5, color: "#fbbf24", lineHeight: 1.4 }}>{data.impactSummary}</div>
      </div>
      {/* Confirm / cancel buttons */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
        <button
          onClick={onYes}
          style={{
            flex: 1, padding: "5px 0", borderRadius: 4, cursor: "pointer",
            background: "rgba(255,0,64,0.12)", border: "1px solid rgba(255,0,64,0.35)",
            color: "#ff0040", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
            fontFamily: "'JetBrains Mono', monospace", transition: "all 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,0,64,0.22)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,0,64,0.12)"; }}
        >
          CONFIRM (say YES)
        </button>
        <button
          onClick={onNo}
          style={{
            flex: 1, padding: "5px 0", borderRadius: 4, cursor: "pointer",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(148,163,184,0.6)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
            fontFamily: "'JetBrains Mono', monospace", transition: "all 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(148,163,184,0.6)"; }}
        >
          CANCEL (say NO)
        </button>
      </div>
    </div>
  );
}

// ── LLM Triage card ───────────────────────────────────────────────────────────
function LLMTriageCard({ data, ts }: { data: TriageResult; ts: number }) {
  const conf = data.confidence ?? 0;
  const confColor = conf > 0.85 ? "#ff0040" : conf > 0.65 ? "#ffb000" : "#00ff88";
  const timeStr = new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <div style={{
      background: "rgba(8,14,30,0.7)",
      border: "1px solid rgba(129,140,248,0.2)",
      borderTop: "2px solid #818cf8",
      borderRadius: 6, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 10px", background: "rgba(129,140,248,0.06)", borderBottom: "1px solid rgba(129,140,248,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", color: "#818cf8", fontFamily: "'JetBrains Mono', monospace" }}>LLM TRIAGE</span>
          <span style={{ fontSize: 6.5, fontWeight: 700, color: "#818cf8", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 3, padding: "0 5px", lineHeight: "13px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>AI</span>
        </div>
        <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>ARGUS · {timeStr}Z</span>
      </div>
      {/* Confidence + MITRE strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ padding: "6px 10px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>CONFIDENCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: confColor, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(conf * 100)}%</span>
            <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${conf * 100}%`, background: confColor, borderRadius: 2 }} />
            </div>
          </div>
        </div>
        <div style={{ padding: "6px 10px" }}>
          <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>MITRE ATT&CK</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {(data.mitre ?? []).slice(0, 4).map(t => (
              <span key={t} style={{ fontSize: 8, fontWeight: 700, color: "#818cf8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 3, padding: "0 4px", lineHeight: "14px", fontFamily: "'JetBrains Mono', monospace" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      {/* Summary */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>ANALYSIS</div>
        <div style={{ fontSize: 10.5, color: "#cbd5e1", lineHeight: 1.55 }}>{data.summary}</div>
        {data.falsePositive !== undefined && (
          <div style={{ marginTop: 6, fontSize: 9, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
            False positive probability: <span style={{ color: "#a78bfa" }}>{Math.round(data.falsePositive * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Response card ─────────────────────────────────────────────────────────────
function ResponseCard({ response, ts, onSpeak }: { response: AgentResponse; ts: number; onSpeak?: () => void }) {
  const p = PRIO[response.priority];
  const [speaking, setSpeaking] = useState(false);
  const timeStr = new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  function handleSpeak() {
    if (!onSpeak) return;
    setSpeaking(true);
    onSpeak();
    setTimeout(() => setSpeaking(false), 3000);
  }

  return (
    <div style={{
      background: "rgba(8,14,30,0.7)",
      border: `1px solid ${p.border}`,
      borderTop: `2px solid ${p.color}`,
      borderRadius: 6, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "5px 10px", background: p.bg, borderBottom: `1px solid ${p.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>{response.classification}</span>
          <span style={{ fontSize: 6.5, fontWeight: 700, color: p.color, background: `${p.color}18`, border: `1px solid ${p.color}30`, borderRadius: 3, padding: "0 5px", lineHeight: "13px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{p.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>ARGUS · {timeStr}Z</span>
          {onSpeak && (
            <button
              onClick={handleSpeak}
              title="Replay audio"
              style={{
                width: 18, height: 18, borderRadius: 3, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: speaking ? `${p.color}18` : "transparent",
                color: speaking ? p.color : "rgba(100,116,139,0.3)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!speaking) { e.currentTarget.style.color = p.color; e.currentTarget.style.background = `${p.color}12`; } }}
              onMouseLeave={e => { if (!speaking) { e.currentTarget.style.color = "rgba(100,116,139,0.3)"; e.currentTarget.style.background = "transparent"; } }}
            >
              <Volume2 size={9} style={{ animation: speaking ? "argus-pulse 0.85s ease-in-out infinite" : "none" }} />
            </button>
          )}
        </div>
      </div>
      {response.fields && response.fields.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(response.fields.length, 3)}, 1fr)`,
          borderBottom: response.items?.length ? `1px solid rgba(255,255,255,0.05)` : "none",
        }}>
          {response.fields.map((f, i) => (
            <div key={i} style={{
              padding: "6px 10px",
              borderRight: (i + 1) % Math.min(response.fields!.length, 3) !== 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <div style={{ fontSize: 7.5, color: "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: f.color ?? "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
      {response.items && response.items.length > 0 && (
        <div style={{ padding: "2px 0" }}>
          {response.items.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px",
              borderBottom: i < response.items!.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: item.color ?? "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", width: 10, flexShrink: 0, marginTop: 1.5 }}>{i + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.3, marginBottom: (item.sub || item.action) ? 3 : 0 }}>{item.text}</div>
                {item.sub && <div style={{ fontSize: 9.5, color: "rgba(100,116,139,0.5)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>}
                {item.action && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: item.color ?? "#00d4ff", background: `${item.color ?? "#00d4ff"}10`, border: `1px solid ${item.color ?? "#00d4ff"}22`, borderRadius: 3, padding: "1px 6px", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                    → {item.action}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit entry row ───────────────────────────────────────────────────────────
const AUDIT_CFG = {
  stt:    { label: "STT ↓", color: "#00d4ff",  bg: "rgba(0,212,255,0.05)",   border: "rgba(0,212,255,0.12)"  },
  tts:    { label: "TTS ↑", color: "#00ff88",  bg: "rgba(0,255,136,0.04)",   border: "rgba(0,255,136,0.1)"   },
  intent: { label: "INT",   color: "#a78bfa",  bg: "rgba(167,139,250,0.05)", border: "rgba(167,139,250,0.12)" },
  sys:    { label: "SYS",   color: "#475569",  bg: "rgba(71,85,105,0.04)",   border: "rgba(71,85,105,0.1)"   },
};

function AuditRow({ entry, showSession }: { entry: AuditEntry; showSession: boolean }) {
  const cfg = AUDIT_CFG[entry.type];
  const timeStr = new Date(entry.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <div>
      {showSession && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 4px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.3)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>SESSION {entry.sessionId}</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "52px 36px 1fr", gap: 8, padding: "5px 0", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <span style={{ fontSize: 8.5, color: "rgba(100,116,139,0.38)", fontFamily: "'JetBrains Mono', monospace", paddingTop: 1 }}>{timeStr}</span>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 3, padding: "1px 0", textAlign: "center" as const, fontFamily: "'JetBrains Mono', monospace", alignSelf: "flex-start" }}>{cfg.label}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: entry.type === "stt" ? "#e2e8f0" : entry.type === "tts" ? "rgba(148,163,184,0.85)" : entry.type === "intent" ? "#a78bfa" : "rgba(100,116,139,0.5)", lineHeight: 1.4, wordBreak: "break-word" as const, fontFamily: entry.type === "intent" ? "'JetBrains Mono', monospace" : "inherit", letterSpacing: entry.type === "intent" ? "0.06em" : "normal" }}>
            {entry.type === "stt" ? `"${entry.content}"` : entry.content}
          </div>
          {entry.confidence !== undefined && entry.type === "stt" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>CONF</span>
              <div style={{ width: 36, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${entry.confidence * 100}%`, background: entry.confidence > 0.9 ? "#00ff88" : entry.confidence > 0.7 ? "#ffb000" : "#ff6b35", borderRadius: 1 }} />
              </div>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: entry.confidence > 0.9 ? "#00ff88" : "#ffb000", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(entry.confidence * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function VoiceIRAgent({ onNavigate }: VoiceIRAgentProps) {
  const [isOpen,       setIsOpen]       = useState(false);
  const [tab,          setTab]          = useState<PanelTab>("live");
  const [status,       setStatus]       = useState<AgentStatus>("standby");
  const [messages,     setMessages]     = useState<Message[]>([
    { id: "boot", role: "system", text: "ARGUS v2 online — press mic or type to begin.", ts: Date.now() },
  ]);
  const [auditLog,     setAuditLog]     = useState<AuditEntry[]>([]);
  const [partial,      setPartial]      = useState("");
  const [textInput,    setTextInput]    = useState("");
  const [inputMode,    setInputMode]    = useState<"voice" | "text">("voice");
  const [hasMic,       setHasMic]       = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState<IRConfirmData | null>(null);
  const [sessionId,    setSessionId]    = useState(() => newSessionId());

  const { resolveIntent, isThinking } = useVoiceIntent();

  const recognitionRef     = useRef<any>(null);
  const synthRef           = useRef<SpeechSynthesis | null>(null);
  const processing         = useRef(false);
  const pendingConfirmRef  = useRef<IRConfirmData | null>(null);
  const isOpenRef          = useRef(isOpen);
  const liveScrollRef      = useRef<HTMLDivElement>(null);
  const auditScrollRef     = useRef<HTMLDivElement>(null);
  const lastSessionRef     = useRef<string>(sessionId);

  // ── Live data ───────────────────────────────────────────────────────────────
  const { getAllScanResults, scanResultsVersion } = useActiveScanResults();
  const { findings, stats } = useMemo<{ findings: any[]; stats: DerivedStats }>(() => {
    const results = getAllScanResults();
    const all: any[] = results.flatMap((s: any) => s.findings ?? []);
    const critical = all.filter(f => (f.severity ?? "").toUpperCase() === "CRITICAL").length;
    const high     = all.filter(f => (f.severity ?? "").toUpperCase() === "HIGH").length;
    const medium   = all.filter(f => (f.severity ?? "").toUpperCase() === "MEDIUM").length;
    const slaBreached = all.filter((f: any) => {
      const SLA: Record<string, number> = { CRITICAL: 4, HIGH: 24, MEDIUM: 168, LOW: 720 };
      const sev = (f.severity ?? "MEDIUM").toUpperCase();
      const ageH = f.created_at ? (Date.now() - new Date(f.created_at).getTime()) / 36e5 : 0;
      return ageH > (SLA[sev] ?? 24);
    }).length;
    const threatLabel = critical > 0 ? "CRITICAL" : high > 2 ? "HIGH" : all.length > 0 ? "GUARDED" : "LOW";
    const threatColor = critical > 0 ? "#ff0040" : high > 2 ? "#ff6b35" : all.length > 0 ? "#ffb000" : "#00ff88";
    return { findings: all, stats: { total: all.length, critical, high, medium, slaBreached, threatLabel, threatColor } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResultsVersion]);

  const hasThreat = stats.critical > 0 || stats.slaBreached > 0;
  const sc        = STATUS_CFG[status];
  const isActive  = status === "listening" || status === "speaking";

  // Keep refs in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
    pendingConfirmRef.current = pendingConfirm;
  }, [isOpen, pendingConfirm]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setHasMic(false); setInputMode("text"); }
    synthRef.current = window.speechSynthesis ?? null;
    return () => { recognitionRef.current?.abort(); synthRef.current?.cancel(); };
  }, []);

  // New session on open
  useEffect(() => {
    if (isOpen) {
      const sid = newSessionId();
      setSessionId(sid);
      lastSessionRef.current = sid;
      pushAudit({ type: "sys", content: `Session started · threat ${stats.threatLabel} · ${stats.total} open findings`, sessionId: sid });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard shortcut: backtick
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setIsOpen(o => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => { liveScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { auditScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [auditLog]);

  // ── Audit helpers ───────────────────────────────────────────────────────────
  const pushAudit = useCallback((entry: Omit<AuditEntry, "id" | "ts">) => {
    setAuditLog(prev => [...prev, { ...entry, id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ts: Date.now() }]);
  }, []);

  // ── TTS — Polly first, Web Speech fallback ──────────────────────────────────
  const speak = useCallback(async (text: string) => {
    setStatus("speaking");

    // Try AWS Polly Neural TTS
    const pollyOk = await pollySpeak(text);
    if (pollyOk) {
      setStatus("standby");
      return;
    }

    // Fallback: Web Speech API
    if (synthRef.current) {
      synthRef.current.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.0; utt.pitch = 0.82; utt.volume = 0.9;
      const voices = synthRef.current.getVoices();
      const voice = voices.find(v => /google uk english male/i.test(v.name))
        ?? voices.find(v => /daniel/i.test(v.name))
        ?? voices.find(v => v.lang === "en-GB")
        ?? voices[0];
      if (voice) utt.voice = voice;
      utt.onend   = () => setStatus("standby");
      utt.onerror = () => setStatus("standby");
      synthRef.current.speak(utt);
    } else {
      setStatus("standby");
    }
  }, []);

  // ── LLM briefing side-effect ────────────────────────────────────────────────
  const fetchLLMBriefing = useCallback(async (finding: any) => {
    const loadId = `llm-${Date.now()}`;

    // Loading placeholder
    setMessages(p => [...p, {
      id: loadId, role: "system", ts: Date.now(),
      text: "Fetching LLM triage analysis…",
    }]);

    try {
      const result = await fetchLLMActionResult("llm_triage", {
        finding_id: String(finding.id ?? finding.finding_id ?? "unknown"),
        severity:   finding.severity,
        finding_type: finding.finding_type ?? finding.title,
        resource_name: finding.resource_name,
        description: finding.description,
      });

      if (result?.triage_summary) {
        const triageData: TriageResult = {
          summary:      result.triage_summary,
          confidence:   result.confidence_score,
          mitre:        result.mitre_techniques,
          falsePositive: result.false_positive_probability,
        };
        setMessages(p => p.map(m =>
          m.id === loadId
            ? { ...m, role: "agent" as const, type: "llm_triage" as const, text: undefined, triageData }
            : m
        ));
      } else {
        setMessages(p => p.filter(m => m.id !== loadId));
      }
    } catch {
      setMessages(p => p.filter(m => m.id !== loadId));
    }
  }, []);

  // ── Execute IR action after voice confirmation ──────────────────────────────
  const executeIRAction = useCallback(async (confirm: IRConfirmData) => {
    const runId = `ir-run-${Date.now()}`;
    setMessages(p => [...p, { id: runId, role: "system", ts: Date.now(), text: `Executing ${confirm.label}…` }]);

    try {
      const result = await triggerIRAction(confirm.actionType, {
        finding_id: confirm.findingId,
        resource_id: confirm.resourceName,
      });

      const statusLabel = result.approval_required ? "PENDING APPROVAL" : "EXECUTING";
      const spoken = `${confirm.label} initiated. Job ${result.job_id.slice(-6).toUpperCase()}. Status: ${statusLabel}.`;

      setMessages(p => [
        ...p.filter(m => m.id !== runId),
        {
          id: `ir-ok-${Date.now()}`, role: "agent" as const, type: "ir_result" as const, ts: Date.now(),
          response: {
            classification: "IR ACTION INITIATED", priority: "warning" as ResponsePriority,
            fields: [
              { label: "ACTION", value: confirm.label,                                     color: "#ff6b35" },
              { label: "JOB",    value: result.job_id.slice(-8).toUpperCase(),              color: "#00d4ff" },
              { label: "STATUS", value: statusLabel, color: result.approval_required ? "#ffb000" : "#00ff88" },
            ],
            spokenText: spoken,
          },
        },
      ]);
      void speak(spoken);
    } catch (e) {
      setMessages(p => p.filter(m => m.id !== runId));
      const errMsg = `${confirm.label} failed. ${(e as Error).message?.slice(0, 80) ?? "Unknown error."}`;
      setMessages(p => [...p, {
        id: `ir-err-${Date.now()}`, role: "agent" as const, ts: Date.now(),
        response: { classification: "ACTION FAILED", priority: "critical" as ResponsePriority, fields: [], spokenText: errMsg },
      }]);
      void speak(errMsg);
    }
  }, [speak]);

  // ── Voice confirmation response handler ─────────────────────────────────────
  const handleConfirmResponse = useCallback((input: string, confidence?: number) => {
    const confirm = pendingConfirmRef.current;
    if (!confirm) return false;

    const lower = input.toLowerCase().trim();
    const isYes = /\b(yes|confirm|do it|proceed|execute|affirmative|approved?)\b/.test(lower);
    const isNo  = /\b(no|cancel|abort|stop|negative|never mind)\b/.test(lower);

    if (!isYes && !isNo) return false; // let processCommand handle as normal

    processing.current = true;
    setStatus("processing");
    setPartial("");

    pushAudit({ type: "stt", content: input.trim(), confidence, sessionId: lastSessionRef.current });
    setMessages(p => [...p, { id: `u-${Date.now()}`, role: "user" as const, text: input.trim(), ts: Date.now() }]);

    setPendingConfirm(null);
    pendingConfirmRef.current = null;

    setTimeout(() => {
      processing.current = false;
      setStatus("standby");

      if (isNo) {
        const msg = `${confirm.label} cancelled.`;
        setMessages(p => [...p, {
          id: `r-${Date.now()}`, role: "agent" as const, ts: Date.now(),
          response: {
            classification: "ACTION CANCELLED", priority: "normal" as ResponsePriority,
            fields: [{ label: "STATUS", value: "CANCELLED", color: "rgba(100,116,139,0.5)" }],
            spokenText: msg,
          },
        }]);
        void speak(msg);
        return;
      }

      // YES → execute
      pushAudit({ type: "intent", content: `CONFIRMED ${confirm.actionType.toUpperCase()}`, sessionId: lastSessionRef.current });
      void executeIRAction(confirm);
    }, 150);

    return true;
  }, [speak, pushAudit, executeIRAction]);

  // ── Show IR confirmation prompt ─────────────────────────────────────────────
  const showIRConfirm = useCallback((intent: string, finding: any) => {
    const typeMap: Record<string, IRActionType> = {
      isolate:     "aws_ec2_isolate",
      revoke:      "aws_iam_revoke_key",
      disable_key: "aws_iam_disable_key",
    };
    const actionType = typeMap[intent];
    if (!actionType) return;

    const meta = ACTION_META[actionType];
    const confirmData: IRConfirmData = {
      actionType,
      findingId:   String(finding.id ?? finding.finding_id ?? "unknown"),
      findingTitle: finding.finding_type ?? finding.title ?? "Unknown Finding",
      resourceName: finding.resource_name ?? finding.resource_arn ?? "",
      label:        meta.label,
      impactSummary: meta.impactSummary,
    };

    setPendingConfirm(confirmData);
    pendingConfirmRef.current = confirmData;

    setMessages(p => [...p, {
      id: `confirm-${Date.now()}`, role: "agent" as const, type: "ir_confirm" as const, ts: Date.now(),
      confirmData,
    }]);
  }, []);

  // ── Process command ─────────────────────────────────────────────────────────
  const processCommand = useCallback(async (input: string, confidence?: number) => {
    if (processing.current || !input.trim()) return;

    // Intercept confirmation responses first
    if (pendingConfirmRef.current) {
      const handled = handleConfirmResponse(input, confidence);
      if (handled) return;
      // Not a yes/no — treat as a new command and clear confirm state
      setPendingConfirm(null);
      pendingConfirmRef.current = null;
    }

    processing.current = true;
    setStatus("processing");
    setPartial("");

    // Immediate feedback: user bubble and STT audit appear before async work
    pushAudit({ type: "stt", content: input.trim(), confidence, sessionId: lastSessionRef.current });
    setMessages(p => [...p, { id: `u-${Date.now()}`, role: "user" as const, text: input.trim(), ts: Date.now() }]);

    // Build context window for Bedrock (last 3 turns with readable text)
    const contextTurns: ConversationTurn[] = messages
      .filter(m => (m.role === "user" || m.role === "agent") && (m.text || m.response?.spokenText))
      .slice(-3)
      .map(m => ({
        role: m.role as "user" | "agent",
        text: m.text ?? m.response?.spokenText ?? "",
      }));

    const topFinding =
      findings.find(f => (f.severity ?? "").toUpperCase() === "CRITICAL") ??
      findings.find(f => (f.severity ?? "").toUpperCase() === "HIGH") ??
      findings[0] ?? null;

    const findingCtx: FindingContext | null = topFinding ? {
      id:           String(topFinding.id ?? topFinding.finding_id ?? "unknown"),
      severity:     topFinding.severity,
      finding_type: topFinding.finding_type ?? topFinding.title,
      resource_name: topFinding.resource_name ?? topFinding.resource_arn,
      service:      topFinding.service,
    } : null;

    try {
      // Two-tier intent resolution: regex fast-path → Bedrock fallback
      const resolved = await resolveIntent(input, contextTurns, findingCtx);
      const intent = resolved.intent;

      // Navigation side-effect (unchanged)
      if (intent === "navigate") {
        const navMap: Record<string, string> = {
          iam: "iam-security", guardduty: "guardduty", alerts: "alerts",
          "security hub": "security-hub", compliance: "grc", reports: "reports",
          ec2: "ec2-security", s3: "s3-security", vpc: "vpc-security",
          soc: "soc", infra: "infra-security", macie: "macie",
        };
        const lower = input.toLowerCase();
        for (const [k, v] of Object.entries(navMap)) {
          if (lower.includes(k)) { onNavigate?.(v); break; }
        }
      }

      // Audit the resolved intent (note Bedrock source for traceability)
      const intentLabel = resolved.source === "bedrock"
        ? `${intent.toUpperCase().replace(/_/g, " ")} [BEDROCK ${Math.round((resolved.confidence ?? 0) * 100)}%]`
        : intent.toUpperCase().replace(/_/g, " ");
      pushAudit({ type: "intent", content: intentLabel, sessionId: lastSessionRef.current });

      // Build response card; Bedrock spoken_reply overrides spokenText for TTS
      const response = buildResponse(intent, stats, findings, input);
      const spokenText = resolved.spokenReply ?? response.spokenText;

      setMessages(p => [...p, {
        id: `r-${Date.now()}`, role: "agent" as const,
        response: { ...response, spokenText },
        ts: Date.now(),
      }]);
      pushAudit({ type: "tts", content: spokenText, sessionId: lastSessionRef.current });
      processing.current = false;
      void speak(spokenText);

      // ── LLM enrichment for intelligence-gathering intents (unchanged) ────
      if (["briefing", "critical", "threat"].includes(intent) && findings.length > 0) {
        const enrichFinding =
          findings.find(f => (f.severity ?? "").toUpperCase() === "CRITICAL") ??
          findings.find(f => (f.severity ?? "").toUpperCase() === "HIGH") ??
          findings[0];
        if (enrichFinding) void fetchLLMBriefing(enrichFinding);
      }

      // ── Inline finding cards for list intent (unchanged) ─────────────────
      if (intent === "show_findings" && findings.length > 0) {
        const snippets: FindingSnippet[] = findings.slice(0, 6).map((f, i) => ({
          id:       String(f.id ?? f.finding_id ?? i),
          title:    f.finding_type ?? f.title ?? "Unnamed Finding",
          severity: (f.severity ?? "MEDIUM").toUpperCase(),
          resource: f.resource_name ?? f.resource_arn?.split(":").slice(-1)[0] ?? "unknown",
          region:   f.region ?? "us-east-1",
          service:  f.service ?? "aws",
          color:    sevColor(f.severity ?? "MEDIUM"),
        }));
        setMessages(p => [...p, {
          id: `flist-${Date.now()}`, role: "agent" as const, type: "finding_list" as const, ts: Date.now(),
          findingList: snippets,
        }]);
      }

      // ── IR confirmation — target resolution ──────────────────────────────
      if (["isolate", "revoke", "disable_key"].includes(intent) && findings.length > 0) {
        const targetResource = resolved.args?.resource as string | undefined;
        let irFinding: any;

        if (targetResource) {
          // Bedrock extracted a specific resource from the utterance — match it.
          const t = targetResource.toLowerCase();
          irFinding = findings.find(f =>
            (f.resource_name ?? "").toLowerCase().includes(t) ||
            (f.resource_arn  ?? "").toLowerCase().includes(t)
          );
          if (!irFinding) {
            // Fail closed: named resource not found. Do not auto-pick an unrelated finding.
            const msg = `No active finding matched resource "${targetResource}". Verify the resource ID or say "list findings" first.`;
            setMessages(p => [...p, {
              id: `err-${Date.now()}`, role: "agent" as const, ts: Date.now(),
              response: {
                classification: "NO MATCH",
                priority: "warning" as const,
                fields: [{ label: "RESOURCE", value: targetResource.toUpperCase(), color: "#ffb000" }],
                items: [{ text: `No finding matched "${targetResource}"`, sub: `Verify the resource ID or say "list findings"`, color: "#ffb000" }],
                spokenText: msg,
              },
            }]);
            pushAudit({ type: "tts", content: msg, sessionId: lastSessionRef.current });
            processing.current = false;
            void speak(msg);
            return;
          }
        } else {
          // No specific resource in utterance — fall back to top critical/high finding.
          irFinding =
            findings.find(f => (f.severity ?? "").toUpperCase() === "CRITICAL") ??
            findings.find(f => (f.severity ?? "").toUpperCase() === "HIGH") ??
            findings[0];
        }

        if (irFinding) {
          setTimeout(() => showIRConfirm(intent, irFinding), 400);
        }
      }
    } catch {
      processing.current = false;
      setStatus("standby");
    }
  }, [stats, findings, messages, speak, onNavigate, pushAudit, handleConfirmResponse, fetchLLMBriefing, showIRConfirm, resolveIntent]);

  // ── Push-to-talk ────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current?.abort();
    setPartial("");

    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onstart  = () => setStatus("listening");
    r.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      setPartial(last[0].transcript);
      if (last.isFinal) {
        r.stop();
        void processCommand(last[0].transcript, last[0].confidence ?? undefined);
      }
    };
    r.onerror = (e: any) => {
      if (e.error === "aborted") return;
      if (e.error === "no-speech") { setStatus("standby"); }
      else { setStatus("error"); setTimeout(() => setStatus("standby"), 1000); }
    };
    // Only reset to standby if we're not mid-processing (isFinal already called processCommand).
    r.onend = () => { if (!processing.current) setStatus("standby"); };
    recognitionRef.current = r;
    r.start();
  }, [processCommand]);

  const handleMicToggle = useCallback(() => {
    if (status === "speaking") {
      synthRef.current?.cancel();
      setStatus("standby");
      return;
    }
    if (status === "listening") {
      recognitionRef.current?.stop();
      setStatus("standby");
      return;
    }
    setInputMode("voice");
    startListening();
  }, [status, startListening]);

  // ── Audit export ────────────────────────────────────────────────────────────
  const exportAudit = useCallback(() => {
    const lines = auditLog.map(e => {
      const t = new Date(e.ts).toISOString();
      const conf = e.confidence !== undefined ? ` [conf:${Math.round(e.confidence * 100)}%]` : "";
      return `${t} [${e.type.toUpperCase()}] [${e.sessionId}]${conf} ${e.content}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `argus-audit-${new Date().toISOString().slice(0, 10)}.log`;
    a.click(); URL.revokeObjectURL(url);
  }, [auditLog]);

  // ── Quick commands ──────────────────────────────────────────────────────────
  const quickCmds = [
    { label: "SITREP",    cmd: "brief me",                 color: "#00d4ff" },
    { label: "CRITICAL",  cmd: "show critical findings",   color: "#ff0040" },
    { label: "THREAT",    cmd: "what is the threat level", color: stats.critical > 0 ? "#ff0040" : "#ffb000" },
    { label: "SLA",       cmd: "sla status",               color: stats.slaBreached > 0 ? "#ff0040" : "#00ff88" },
    { label: "FINDINGS",  cmd: "list findings",            color: "#00d4ff" },
    { label: "HIGH RISK", cmd: "high risk findings",       color: "#ff6b35" },
  ] as const;

  const auditWithDividers = useMemo(() => {
    let lastSid = "";
    return auditLog.map(e => {
      const showSession = e.sessionId !== lastSid;
      lastSid = e.sessionId;
      return { entry: e, showSession };
    });
  }, [auditLog]);

  const voiceBusy = status === "processing" || status === "listening";

  return (
    <>
      <style>{`
        @keyframes argus-pulse  { 0%,100%{opacity:1;} 50%{opacity:0.22;} }
        @keyframes argus-threat { 0%,85%,100%{opacity:1;} 87%{opacity:0.08;} }
        @keyframes argus-border { 0%,100%{box-shadow:0 0 0 1px rgba(0,212,255,0.12);} 50%{box-shadow:0 0 0 2px rgba(0,212,255,0.4);} }
        @keyframes spin         { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .argus-threat  { animation: argus-threat 2s ease-in-out infinite; }
        .argus-border  { animation: argus-border 2s ease-in-out infinite; }
      `}</style>

      {/* ── Header pill ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="ARGUS Voice IR Agent (` to toggle)"
        style={{
          position: "relative", display: "flex", alignItems: "center", gap: 6,
          height: 32, padding: "0 10px 0 8px", borderRadius: 6, cursor: "pointer",
          overflow: "hidden", transition: "background 0.15s, border-color 0.15s",
          background: isOpen ? "rgba(0,212,255,0.09)" : hasThreat ? "rgba(255,0,64,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${isOpen ? "rgba(0,212,255,0.3)" : hasThreat ? "rgba(255,0,64,0.22)" : "rgba(255,255,255,0.08)"}`,
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.background = "rgba(0,212,255,0.07)";
            e.currentTarget.style.borderColor = "rgba(0,212,255,0.22)";
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background = hasThreat ? "rgba(255,0,64,0.06)" : "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = hasThreat ? "rgba(255,0,64,0.22)" : "rgba(255,255,255,0.08)";
          }
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, borderRadius: "6px 0 0 6px", background: isActive ? sc.color : hasThreat ? "#ff0040" : "rgba(0,212,255,0.35)", transition: "background 0.3s" }} />
        <span style={{ marginLeft: 4, display: "flex", alignItems: "center", color: isActive ? sc.color : hasThreat ? "#ff6b35" : "rgba(0,212,255,0.5)", transition: "color 0.2s" }}>
          {isActive ? <MiniWave active color={sc.color} /> : status === "processing" ? <Zap size={11} style={{ animation: "spin 0.65s linear infinite" }} /> : <Mic size={11} />}
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em", fontFamily: "'JetBrains Mono', monospace", color: isActive ? sc.color : "rgba(148,163,184,0.7)", transition: "color 0.2s" }}>ARGUS</span>
        <span style={{ width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: sc.color, boxShadow: isActive ? `0 0 0 1px ${sc.color}40` : "none", animation: isActive ? "argus-pulse 0.85s ease-in-out infinite" : "none", transition: "background 0.2s" }} />
        {hasThreat && (
          <span className="argus-threat" style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.06em", color: "#ff0040", background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.25)", borderRadius: 999, padding: "0 4px", lineHeight: "14px", fontFamily: "'JetBrains Mono', monospace" }}>
            {stats.critical}C
          </span>
        )}
        {pendingConfirm && (
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.06em", color: "#ffb000", background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.3)", borderRadius: 999, padding: "0 4px", lineHeight: "14px", fontFamily: "'JetBrains Mono', monospace" }}>
            CONFIRM
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div
          className={isActive ? "argus-border" : ""}
          style={{
            position: "fixed", top: 64, right: 56, width: 440, zIndex: 9999,
            display: "flex", flexDirection: "column",
            background: "rgba(4,9,20,0.98)",
            backdropFilter: "blur(28px) saturate(180%)",
            border: `1px solid ${isActive ? "rgba(0,212,255,0.3)" : "rgba(0,212,255,0.12)"}`,
            borderTop: `2px solid ${isActive ? sc.color : "rgba(0,212,255,0.4)"}`,
            borderRadius: "0 0 10px 10px",
            boxShadow: `0 0 0 1px rgba(0,212,255,0.04)`,
            overflow: "hidden",
            transition: "border-color 0.3s",
          }}
        >
          {/* ── Top bar ── */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.055)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: sc.color, boxShadow: isActive ? `0 0 0 1px ${sc.color}40` : "none", animation: isActive ? "argus-pulse 0.85s ease-in-out infinite" : "none", transition: "all 0.3s" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em" }}>ARGUS</span>
            <span style={{ fontSize: 8, color: "rgba(100,116,139,0.38)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>VOICE IR AGENT v2</span>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: sc.color, background: `${sc.color}10`, border: `1px solid ${sc.color}22`, borderRadius: 3, padding: "1px 6px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", transition: "all 0.25s" }}>{sc.label}</span>
            {pendingConfirm && (
              <span style={{ fontSize: 7.5, fontWeight: 700, color: "#ffb000", background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.28)", borderRadius: 3, padding: "1px 6px", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                CONFIRM?
              </span>
            )}
            <div style={{ flex: 1 }} />
            {stats.critical > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: "#ff0040", background: "rgba(255,0,64,0.08)", border: "1px solid rgba(255,0,64,0.2)", borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace" }}>{stats.critical}C</span>}
            {stats.high > 0    && <span style={{ fontSize: 8, fontWeight: 700, color: "#ff6b35", background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.18)", borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace" }}>{stats.high}H</span>}
            <span style={{ fontSize: 8, color: "rgba(100,116,139,0.28)", fontFamily: "'JetBrains Mono', monospace" }}>{stats.total} open</span>
            <button onClick={() => setIsOpen(false)} style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}><X size={10} /></button>
          </div>

          {/* ── Tab bar ── */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,3,10,0.4)" }}>
            {([
              { id: "live",  label: "LIVE",      badge: null },
              { id: "audit", label: "AUDIT LOG", badge: auditLog.length > 0 ? String(auditLog.length) : null },
            ] as const).map(({ id, label, badge }) => {
              const active = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "transparent", border: "none", borderBottom: active ? `2px solid #00d4ff` : "2px solid transparent", marginBottom: -1, transition: "all 0.15s" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: active ? "#00d4ff" : "rgba(100,116,139,0.4)", fontFamily: "'JetBrains Mono', monospace", transition: "color 0.15s" }}>{label}</span>
                  {badge && (
                    <span style={{ fontSize: 7, fontWeight: 700, color: active ? "#00d4ff" : "rgba(100,116,139,0.35)", background: active ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(0,212,255,0.22)" : "rgba(255,255,255,0.07)"}`, borderRadius: 999, padding: "0 5px", lineHeight: "14px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══ LIVE TAB ════════════════════════════════════════════════════════ */}
          {tab === "live" && (
            <>
              {/* Waveform strip */}
              <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12, background: "rgba(0,5,14,0.4)", minHeight: 44, opacity: inputMode === "text" && !isActive ? 0.28 : 1, transition: "opacity 0.3s" }}>
                <Waveform active={isActive} color={sc.color} />
                {partial && status === "listening" && (
                  <span style={{ flex: 1, fontSize: 10, color: "rgba(0,212,255,0.5)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{partial}"</span>
                )}
                {!isActive && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.28)", fontFamily: "'JetBrains Mono', monospace" }}>` to toggle</span>
                    <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 7.5, fontWeight: 700, color: stats.threatColor, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>{stats.threatLabel}</span>
                  </div>
                )}
              </div>

              {/* Quick commands */}
              <div style={{ padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", gap: 4 }}>
                {quickCmds.map(({ label, cmd, color }) => (
                  <button
                    key={cmd}
                    onClick={() => { void processCommand(cmd); }}
                    disabled={voiceBusy}
                    style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color, background: `${color}09`, border: `1px solid ${color}20`, borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", opacity: voiceBusy ? 0.3 : 1, transition: "all 0.1s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}38`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${color}09`; e.currentTarget.style.borderColor = `${color}20`; }}
                  >{label}</button>
                ))}
              </div>

              {/* Transcript */}
              <div style={{ overflowY: "auto", maxHeight: 340, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map(msg => {
                  // System message
                  if (msg.role === "system") return (
                    <div key={msg.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.07)" }} />
                      <span style={{ fontSize: 7.5, color: "rgba(0,212,255,0.25)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{msg.text}</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.07)" }} />
                    </div>
                  );

                  // User bubble
                  if (msg.role === "user") return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "72%", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: "6px 6px 2px 6px", padding: "5px 10px" }}>
                        <div style={{ fontSize: 7.5, color: "rgba(0,212,255,0.3)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{new Date(msg.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                        <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{msg.text}</div>
                      </div>
                    </div>
                  );

                  // IR confirmation card
                  if (msg.role === "agent" && msg.type === "ir_confirm" && msg.confirmData) return (
                    <div key={msg.id}>
                      <IRConfirmCard
                        data={msg.confirmData}
                        onYes={() => {
                          const c = msg.confirmData!;
                          setPendingConfirm(null);
                          pendingConfirmRef.current = null;
                          // Remove the confirm card from messages
                          setMessages(p => p.filter(m => m.id !== msg.id));
                          void executeIRAction(c);
                        }}
                        onNo={() => {
                          setPendingConfirm(null);
                          pendingConfirmRef.current = null;
                          setMessages(p => p.filter(m => m.id !== msg.id));
                          const cancelMsg = `${msg.confirmData!.label} cancelled.`;
                          setMessages(p => [...p, { id: `r-${Date.now()}`, role: "agent" as const, ts: Date.now(), response: { classification: "ACTION CANCELLED", priority: "normal" as ResponsePriority, fields: [], spokenText: cancelMsg } }]);
                          void speak(cancelMsg);
                        }}
                      />
                    </div>
                  );

                  // LLM triage card
                  if (msg.role === "agent" && msg.type === "llm_triage" && msg.triageData) return (
                    <div key={msg.id}><LLMTriageCard data={msg.triageData} ts={msg.ts} /></div>
                  );

                  // Inline finding list
                  if (msg.role === "agent" && msg.type === "finding_list" && msg.findingList) return (
                    <div key={msg.id}><FindingMiniCard findings={msg.findingList} /></div>
                  );

                  // Standard agent response card
                  if (msg.role === "agent" && msg.response) return (
                    <div key={msg.id}><ResponseCard response={msg.response} ts={msg.ts} onSpeak={() => void speak(msg.response!.spokenText)} /></div>
                  );

                  return null;
                })}

                {/* Processing indicator */}
                {status === "processing" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.12)", borderTop: "2px solid rgba(167,139,250,0.5)", borderRadius: 6 }}>
                    <span style={{ fontSize: 7.5, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em" }}>
                      {pendingConfirm ? "AWAITING RESPONSE" : isThinking ? "ARGUS THINKING…" : "ANALYZING"}
                    </span>
                    {[0, 0.14, 0.28].map((d, i) => (
                      <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#a78bfa", animation: `argus-pulse 0.8s ease-in-out ${d}s infinite` }} />
                    ))}
                  </div>
                )}
                <div ref={liveScrollRef} />
              </div>

              {/* ── Input footer ── */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,3,10,0.5)" }}>
                <div style={{ padding: "8px 14px", display: "flex", gap: 5, alignItems: "center" }}>
                  <div style={{ flex: 1, position: "relative" as const }}>
                    <input
                      value={textInput}
                      onChange={e => { setTextInput(e.target.value); if (e.target.value) setInputMode("text"); }}
                      onFocus={() => setInputMode("text")}
                      onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) { void processCommand(textInput); setTextInput(""); } }}
                      placeholder={
                        pendingConfirm
                          ? `Confirm or cancel ${pendingConfirm.label}…`
                          : inputMode === "voice"
                            ? "Or type a command…"
                            : "Type a command or question…"
                      }
                      disabled={status === "processing"}
                      style={{
                        width: "100%", boxSizing: "border-box" as const,
                        background: pendingConfirm ? "rgba(255,176,0,0.04)" : inputMode === "text" ? "rgba(0,212,255,0.04)" : "rgba(0,5,14,0.6)",
                        border: `1px solid ${pendingConfirm ? "rgba(255,176,0,0.3)" : inputMode === "text" ? "rgba(0,212,255,0.22)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 6, padding: "6px 10px", fontSize: 11,
                        color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", outline: "none",
                        transition: "border-color 0.2s, background 0.2s",
                      }}
                    />
                  </div>
                  {/* Send button */}
                  <button
                    onClick={() => { if (textInput.trim()) { void processCommand(textInput); setTextInput(""); } }}
                    disabled={!textInput.trim() || status === "processing"}
                    style={{
                      height: 30, paddingInline: 12, borderRadius: 6, cursor: textInput.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: textInput.trim() ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${textInput.trim() ? "rgba(0,212,255,0.28)" : "rgba(255,255,255,0.06)"}`,
                      color: textInput.trim() ? "#00d4ff" : "rgba(100,116,139,0.25)",
                      fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      transition: "all 0.15s", opacity: status === "processing" ? 0.35 : 1, flexShrink: 0,
                    }}
                  >→</button>
                  {/* Mic button */}
                  {hasMic && (
                    <button
                      onClick={() => { setInputMode("voice"); handleMicToggle(); }}
                      style={{
                        height: 30, paddingInline: 12, borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                        fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
                        background: status === "listening"
                          ? "rgba(0,212,255,0.12)"
                          : status === "speaking"
                            ? "rgba(0,255,136,0.08)"
                            : inputMode === "text"
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(255,255,255,0.05)",
                        border: `1px solid ${status === "listening" ? "rgba(0,212,255,0.4)" : status === "speaking" ? "rgba(0,255,136,0.25)" : inputMode === "text" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)"}`,
                        color: status === "listening" ? "#00d4ff" : status === "speaking" ? "#00ff88" : inputMode === "text" ? "rgba(100,116,139,0.3)" : "rgba(148,163,184,0.5)",
                        flexShrink: 0,
                      }}
                    >
                      {status === "listening" ? <MicOff size={10} /> : <Mic size={10} />}
                      {status === "listening" ? "STOP" : status === "speaking" ? "MUTE" : "MIC"}
                    </button>
                  )}
                </div>

                {/* Status line */}
                <div style={{ padding: "0 14px 7px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 7.5, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", color: isActive ? sc.color : pendingConfirm ? "#ffb000" : inputMode === "text" ? "rgba(0,212,255,0.35)" : "rgba(100,116,139,0.25)", transition: "color 0.25s" }}>
                    {status === "listening"
                      ? "● SPEAK NOW — RELEASE TO PROCESS"
                      : status === "processing"
                        ? "● PROCESSING"
                        : status === "speaking"
                          ? "● ARGUS SPEAKING"
                          : pendingConfirm
                            ? `● CONFIRM ${pendingConfirm.label.toUpperCase()} — SAY YES OR NO`
                            : inputMode === "text"
                              ? "TEXT MODE — ENTER TO SEND"
                              : hasMic
                                ? "VOICE READY — PRESS MIC OR TYPE"
                                : "TEXT MODE ACTIVE"}
                  </span>
                  {inputMode === "text" && hasMic && (
                    <button
                      onClick={() => setInputMode("voice")}
                      style={{ fontSize: 7, fontWeight: 700, color: "rgba(100,116,139,0.35)", background: "none", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", padding: 0 }}
                    >switch to voice</button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ AUDIT TAB ═══════════════════════════════════════════════════════ */}
          {tab === "audit" && (
            <>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, background: "rgba(0,5,14,0.4)" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 8, color: "rgba(100,116,139,0.35)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
                    {auditLog.length} ENTRIES · SESSION {sessionId}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["STT", "TTS", "INT"] as const).map(label => {
                    const c = label === "STT" ? "#00d4ff" : label === "TTS" ? "#00ff88" : "#a78bfa";
                    return <span key={label} style={{ fontSize: 7, fontWeight: 700, color: c, background: `${c}0a`, border: `1px solid ${c}20`, borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>;
                  })}
                </div>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.06)" }} />
                <button onClick={() => setAuditLog([])} disabled={auditLog.length === 0} title="Clear log" style={{ width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.4)", cursor: auditLog.length === 0 ? "not-allowed" : "pointer", opacity: auditLog.length === 0 ? 0.3 : 1 }}>
                  <Trash2 size={10} />
                </button>
                <button onClick={exportAudit} disabled={auditLog.length === 0} title="Export log as .log file" style={{ width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: auditLog.length > 0 ? "rgba(0,212,255,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${auditLog.length > 0 ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.07)"}`, color: auditLog.length > 0 ? "#00d4ff" : "rgba(100,116,139,0.35)", cursor: auditLog.length === 0 ? "not-allowed" : "pointer", opacity: auditLog.length === 0 ? 0.3 : 1 }}>
                  <Download size={10} />
                </button>
              </div>

              <div style={{ overflowY: "auto", maxHeight: 440, padding: "6px 14px 10px" }}>
                {auditLog.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center" as const }}>
                    <div style={{ fontSize: 8.5, color: "rgba(100,116,139,0.3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>NO ENTRIES YET</div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,0.2)", marginTop: 6 }}>Switch to LIVE and issue a command to begin logging.</div>
                  </div>
                ) : (
                  auditWithDividers.map(({ entry, showSession }) => (
                    <AuditRow key={entry.id} entry={entry} showSession={showSession} />
                  ))
                )}
                <div ref={auditScrollRef} />
              </div>

              <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, background: "rgba(0,3,10,0.5)" }}>
                <span style={{ flex: 1, fontSize: 8, color: "rgba(100,116,139,0.28)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
                  VOICE AUDIT LOG · ARGUS v2 · FOR QA AND COMPLIANCE USE
                </span>
                <span style={{ fontSize: 7.5, color: "rgba(100,116,139,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>↓ .log export</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
