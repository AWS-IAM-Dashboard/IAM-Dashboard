// GRC shared primitives — re-exports DP shared + GRC-specific components
import { ExternalLink } from "lucide-react";

// Re-export all DP shared primitives (same design language)
export {
  mono, divider, COMPLIANCE_COLOR, COMPLIANCE_LABEL,
  ComplianceChip, MockBadge, AcceptanceCheck, BackendHandoff,
  ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard,
  PolicyDiff, DriftIndicator, ExpiryTimeline, KeyUsageGraph,
  EmptyState, useLocalStorage, TH,
} from "../soc/dataprotection/shared";

import { mono } from "../soc/dataprotection/shared";

// ─── Severity colors ─────────────────────────────────────────────────────────
export const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88",
};

// ─── Service tab → human label ──────────────────────────────────────────────
const SERVICE_LABEL: Record<string, string> = {
  "s3-security": "S3 Storage", "ec2-security": "EC2 Compute",
  "vpc-security": "VPC Network", "iam-security": "IAM Access",
  "dynamodb-security": "DynamoDB",
};

// ─── CrossLink — links GRC findings to service tabs ─────────────────────────
export function CrossLink({
  tab, onNavigate,
}: {
  tab: string;
  onNavigate?: (tab: string) => void;
}) {
  if (!onNavigate) return null;
  const label = SERVICE_LABEL[tab] ?? tab;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onNavigate(tab); }}
      className="grc-crosslink"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 8px", height: 20, borderRadius: 999,
        background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)",
        color: "#38bdf8", ...mono, fontSize: 10, fontWeight: 600,
        cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
      }}
    >
      <ExternalLink size={9} />
      {label}
    </button>
  );
}

// ─── ProgressBar — inline compliance-rate bar ───────────────────────────────
export function ProgressBar({
  value, color = "#00ff88", height = 4,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: "right" as const }}>{pct}%</span>
      <div style={{ flex: 1, position: "relative", height, background: "rgba(255,255,255,0.06)", borderRadius: height, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`, background: color, borderRadius: height,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ─── StatusDot ──────────────────────────────────────────────────────────────
export function StatusDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: color, flexShrink: 0,
      boxShadow: `0 0 4px ${color}40`,
    }} />
  );
}
