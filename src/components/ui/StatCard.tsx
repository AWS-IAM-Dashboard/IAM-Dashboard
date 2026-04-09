/**
 * StatCard — KPI metric card used across all scanner / dashboard tabs.
 *
 * Features:
 *  - 2px top accent gradient bar in the card's accent colour
 *  - Uppercase mono label
 *  - Large mono value in accent colour
 *  - Optional ghost icon (10% opacity) anchored to the right
 *
 * Usage:
 *   <StatCard label="Critical" value={3} accent="#ff0040" icon={AlertTriangle} />
 *   <StatCard label="Compliance" value="94%" accent="#00ff88" />
 */

interface StatCardProps {
  label: string;
  value: number | string;
  /** Hex colour used for the value text, top accent bar, and icon tint */
  accent: string;
  /** Lucide icon component (not an element) — rendered as a faint bg watermark */
  icon?: React.ElementType;
  /** Extra content rendered below the value */
  children?: React.ReactNode;
}

export function StatCard({ label, value, accent, icon: Icon, children }: StatCardProps) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.8)",
        border: `1px solid ${accent}26`,
        borderRadius: 10,
        padding: "16px 20px",
        flex: 1,
        minWidth: 140,
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      {/* Accent top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accent}88, transparent)`,
        }}
      />

      {/* Label */}
      <span
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(100,116,139,0.75)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 6,
        }}
      >
        {label}
      </span>

      {/* Value */}
      <span
        style={{
          display: "block",
          fontSize: 28,
          fontWeight: 700,
          color: accent,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>

      {/* Optional children (sub-label, trend, etc.) */}
      {children}

      {/* Ghost icon watermark */}
      {Icon && (
        <div
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            opacity: 0.1,
          }}
        >
          <Icon size={36} color={accent} />
        </div>
      )}
    </div>
  );
}
