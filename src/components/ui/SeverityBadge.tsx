/**
 * SeverityBadge — unified severity / status pill used across all tabs.
 *
 * Handles both finding severities (CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL)
 * and workflow statuses (NEW / TRIAGED / ASSIGNED / IN_PROGRESS / PENDING_VERIFY /
 * REMEDIATED / FALSE_POSITIVE / RISK_ACCEPTED).
 *
 * Usage:
 *   <SeverityBadge severity="CRITICAL" />
 *   <SeverityBadge severity="HIGH" size="sm" />
 *   <SeverityBadge severity="NEW" />          // workflow status
 *   <SeverityBadge severity="REMEDIATED" />   // workflow status
 */

type BadgeSize = "sm" | "default";

interface Token {
  bg: string;
  border: string;
  color: string;
  label: string;
}

const TOKENS: Record<string, Token> = {
  // ── Severity levels ────────────────────────────────────────────────────────
  CRITICAL: {
    bg: "rgba(255,0,64,0.1)",
    border: "rgba(255,0,64,0.3)",
    color: "#ff0040",
    label: "CRITICAL",
  },
  HIGH: {
    bg: "rgba(255,107,53,0.1)",
    border: "rgba(255,107,53,0.3)",
    color: "#ff6b35",
    label: "HIGH",
  },
  MEDIUM: {
    bg: "rgba(255,176,0,0.1)",
    border: "rgba(255,176,0,0.3)",
    color: "#ffb000",
    label: "MEDIUM",
  },
  LOW: {
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.25)",
    color: "#00ff88",
    label: "LOW",
  },
  INFORMATIONAL: {
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.2)",
    color: "#94a3b8",
    label: "INFO",
  },
  INFO: {
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.2)",
    color: "#94a3b8",
    label: "INFO",
  },

  // ── Workflow statuses ──────────────────────────────────────────────────────
  NEW: {
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    color: "#60a5fa",
    label: "NEW",
  },
  NOTIFIED: {
    bg: "rgba(255,176,0,0.08)",
    border: "rgba(255,176,0,0.2)",
    color: "#ffb000",
    label: "NOTIFIED",
  },
  TRIAGED: {
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.25)",
    color: "#a78bfa",
    label: "TRIAGED",
  },
  ASSIGNED: {
    bg: "rgba(14,165,233,0.1)",
    border: "rgba(14,165,233,0.25)",
    color: "#38bdf8",
    label: "ASSIGNED",
  },
  IN_PROGRESS: {
    bg: "rgba(255,176,0,0.08)",
    border: "rgba(255,176,0,0.2)",
    color: "#ffb000",
    label: "IN PROGRESS",
  },
  PENDING_VERIFY: {
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.2)",
    color: "#38bdf8",
    label: "PENDING VERIFY",
  },
  REMEDIATED: {
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.22)",
    color: "#00ff88",
    label: "REMEDIATED",
  },
  RESOLVED: {
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.22)",
    color: "#00ff88",
    label: "RESOLVED",
  },
  SUPPRESSED: {
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.2)",
    color: "#64748b",
    label: "SUPPRESSED",
  },
  FALSE_POSITIVE: {
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.2)",
    color: "#64748b",
    label: "FALSE POS.",
  },
  RISK_ACCEPTED: {
    bg: "rgba(255,107,53,0.08)",
    border: "rgba(255,107,53,0.2)",
    color: "#ff6b35",
    label: "RISK ACCEPTED",
  },
  // ── Compliance ─────────────────────────────────────────────────────────────
  COMPLIANT: {
    bg: "rgba(0,255,136,0.08)",
    border: "rgba(0,255,136,0.22)",
    color: "#00ff88",
    label: "COMPLIANT",
  },
  NON_COMPLIANT: {
    bg: "rgba(255,0,64,0.1)",
    border: "rgba(255,0,64,0.28)",
    color: "#ff0040",
    label: "NON-COMPLIANT",
  },
  NOT_APPLICABLE: {
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.18)",
    color: "#64748b",
    label: "N/A",
  },
};

const FALLBACK: Token = {
  bg: "rgba(100,116,139,0.08)",
  border: "rgba(100,116,139,0.18)",
  color: "#94a3b8",
  label: "—",
};

interface SeverityBadgeProps {
  severity: string;
  size?: BadgeSize;
  /** Override the display label */
  label?: string;
}

export function SeverityBadge({ severity, size = "default", label }: SeverityBadgeProps) {
  const tok = TOKENS[severity?.toUpperCase()] ?? FALLBACK;
  const paddingV = size === "sm" ? "2px" : "4px";
  const paddingH = size === "sm" ? "8px" : "10px";
  const fontSize = size === "sm" ? 10 : 11;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${paddingV} ${paddingH}`,
        borderRadius: 999,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
        fontFamily: "'JetBrains Mono', monospace",
        background: tok.bg,
        border: `1px solid ${tok.border}`,
        color: tok.color,
        whiteSpace: "nowrap" as const,
        lineHeight: 1.4,
      }}
    >
      {label ?? tok.label}
    </span>
  );
}
