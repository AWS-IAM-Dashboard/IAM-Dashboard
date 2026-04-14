/**
 * EmptyState — unified empty-state component used across all scanner / dashboard tabs.
 *
 * Three variants cover every "no data" scenario:
 *  1. **pre-scan**   — No scan has been run yet; CTA = "Run your first scan"
 *  2. **no-results** — Filters / search returned nothing; CTA = "Clear filters"
 *  3. **general**    — Catch-all informational empty state (no CTA required)
 *
 * Usage:
 *   <ScanEmptyState variant="pre-scan" icon={Shield} onAction={handleScan} />
 *   <ScanEmptyState variant="no-results" icon={Search} onAction={handleClearFilters} />
 */

import type { LucideIcon } from "lucide-react";
import { Play, FilterX, Inbox } from "lucide-react";

export type EmptyStateVariant = "pre-scan" | "no-results" | "general";

export interface ScanEmptyStateProps {
  variant: EmptyStateVariant;
  /** Lucide icon component — rendered large as the visual anchor */
  icon?: LucideIcon;
  /** Override the default title */
  title?: string;
  /** Override the default subtitle / description */
  subtitle?: string;
  /** Override the default CTA button label */
  actionLabel?: string;
  /** Fired when the CTA button is clicked */
  onAction?: () => void;
  /** Accent colour for the CTA button (default: variant-dependent) */
  accent?: string;
  /** Second CTA — useful for showing both "Run scan" + "Clear filters" */
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  /** Service-specific context hint shown above the title */
  serviceName?: string;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  { title: string; subtitle: string; actionLabel: string; accent: string; FallbackIcon: LucideIcon }
> = {
  "pre-scan": {
    title: "No scan results yet",
    subtitle: "Run a security scan to analyse your environment and surface findings.",
    actionLabel: "Run your first scan",
    accent: "#00ff88",
    FallbackIcon: Play,
  },
  "no-results": {
    title: "No findings match your filters",
    subtitle: "Try broadening your search, adjusting filters, or clearing them to see all findings.",
    actionLabel: "Clear filters",
    accent: "#60a5fa",
    FallbackIcon: FilterX,
  },
  general: {
    title: "Nothing here yet",
    subtitle: "Data will appear here once available.",
    actionLabel: "",
    accent: "#64748b",
    FallbackIcon: Inbox,
  },
};

export function ScanEmptyState({
  variant,
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  accent,
  secondaryLabel,
  onSecondaryAction,
  serviceName,
}: ScanEmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const resolvedTitle = title ?? defaults.title;
  const resolvedSubtitle = subtitle ?? defaults.subtitle;
  const resolvedLabel = actionLabel ?? defaults.actionLabel;
  const resolvedAccent = accent ?? defaults.accent;
  const ResolvedIcon = Icon ?? defaults.FallbackIcon;

  const isPreScan = variant === "pre-scan";
  const ActionIcon = isPreScan ? Play : FilterX;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow behind the icon */}
      <div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${resolvedAccent}08 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -65%)",
          pointerEvents: "none",
        }}
      />

      {/* Icon container with ring */}
      <div
        style={{
          position: "relative",
          width: 72,
          height: 72,
          borderRadius: 18,
          background: `${resolvedAccent}08`,
          border: `1px solid ${resolvedAccent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <ResolvedIcon
          size={32}
          color={resolvedAccent}
          style={{ opacity: 0.45 }}
        />
        {/* Pulsing dot for pre-scan variant */}
        {isPreScan && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: resolvedAccent,
              opacity: 0.7,
              animation: "empty-state-pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Service name chip */}
      {serviceName && (
        <span
          style={{
            ...MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: `${resolvedAccent}90`,
            background: `${resolvedAccent}0c`,
            border: `1px solid ${resolvedAccent}20`,
            padding: "3px 10px",
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          {serviceName}
        </span>
      )}

      {/* Title */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#e2e8f0",
          margin: 0,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {resolvedTitle}
      </h3>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 13,
          color: "rgba(100,116,139,0.65)",
          margin: "8px 0 0",
          lineHeight: 1.5,
          maxWidth: 380,
        }}
      >
        {resolvedSubtitle}
      </p>

      {/* CTA buttons */}
      {(onAction || onSecondaryAction) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 22,
          }}
        >
          {onAction && resolvedLabel && (
            <button
              onClick={onAction}
              style={{
                ...MONO,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 22px",
                borderRadius: 8,
                background: `${resolvedAccent}12`,
                border: `1px solid ${resolvedAccent}35`,
                color: resolvedAccent,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.background = `${resolvedAccent}20`);
                (e.currentTarget.style.borderColor = `${resolvedAccent}50`);
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.background = `${resolvedAccent}12`);
                (e.currentTarget.style.borderColor = `${resolvedAccent}35`);
              }}
            >
              <ActionIcon size={14} />
              {resolvedLabel}
            </button>
          )}

          {onSecondaryAction && secondaryLabel && (
            <button
              onClick={onSecondaryAction}
              style={{
                ...MONO,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(148,163,184,0.7)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.background = "rgba(255,255,255,0.06)");
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.background = "rgba(255,255,255,0.03)");
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}

      {/* Keyframe injection */}
      <style>{`
        @keyframes empty-state-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
