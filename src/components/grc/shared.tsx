// GRC shared primitives — re-exports DP shared + GRC-specific components
import { useState, useCallback } from "react";
import {
  ExternalLink, ChevronDown, ChevronRight, Link,
  Lock, Play, Loader2, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";

// Re-export all DP shared primitives (same design language)
export {
  mono, divider, COMPLIANCE_COLOR, COMPLIANCE_LABEL,
  ComplianceChip, MockBadge, AcceptanceCheck, BackendHandoff,
  ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard,
  PolicyDiff, DriftIndicator, ExpiryTimeline, KeyUsageGraph,
  EmptyState, useLocalStorage, TH,
} from "../soc/dataprotection/shared";

import { mono, divider } from "../soc/dataprotection/shared";

// ─── Severity colors ─────────────────────────────────────────────────────────
export const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040", HIGH: "#ff6b35", MEDIUM: "#ffb000", LOW: "#00ff88",
};

// ─── CrossLink — links GRC findings to service tabs ─────────────────────────
export function CrossLink({
  tab, label, onNavigate,
}: {
  tab: string;
  label: string;
  onNavigate?: (tab: string) => void;
}) {
  if (!onNavigate) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onNavigate(tab); }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 8px", height: 20, borderRadius: 999,
        background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)",
        color: "#38bdf8", ...mono, fontSize: 9.5, fontWeight: 600,
        cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,0.12)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)"; }}
    >
      <ExternalLink size={8} />
      {label}
    </button>
  );
}

// ─── GRC Section Header ─────────────────────────────────────────────────────
export function GRCSectionHeader({
  icon, title, subtitle, accent = "#00ff88", extra,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${accent}0d`, border: `1px solid ${accent}28`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", marginTop: 2 }}>{subtitle}</div>
      </div>
      {extra}
    </div>
  );
}

// ─── ProgressBar — compact compliance-rate bar ──────────────────────────────
export function ProgressBar({
  value, color = "#00ff88", height = 4, label,
}: {
  value: number;
  color?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div style={{ minWidth: 60 }}>
      {label && <div style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.5)", marginBottom: 2 }}>{label}</div>}
      <div style={{ position: "relative", height, background: "rgba(255,255,255,0.06)", borderRadius: height, overflow: "hidden" }}>
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
