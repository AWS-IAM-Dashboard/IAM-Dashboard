/**
 * ScanPageHeader — standardised header used across all scanner tabs.
 *
 * Left:  Icon box + Title + Subtitle
 * Right: optional region select, profile select, Refresh, Export, Scan/Stop
 *
 * Usage:
 *   <ScanPageHeader
 *     icon={<Users size={20} color="#00ff88" />}
 *     iconColor="#00ff88"
 *     title="IAM & Access Control"
 *     subtitle="Identity posture — users, roles, policies..."
 *     region={selectedRegion}
 *     onRegionChange={setSelectedRegion}
 *     isScanning={isScanning}
 *     onScan={handleStartScan}
 *     onStop={handleStopScan}
 *     onRefresh={handleRefresh}
 *     onExport={handleExport}
 *   />
 */

import { RefreshCw, Download, Play, Square } from "lucide-react";

const REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "ca-central-1",
  "sa-east-1",
];

const PROFILES = ["default", "production", "development", "staging"];

export interface ScanPageHeaderProps {
  /** Icon element rendered inside the 40×40 accent box */
  icon: React.ReactNode;
  /** Hex colour driving the icon box bg/border and Scan button — default #00ff88 */
  iconColor?: string;
  title: string;
  subtitle: string;
  /** Shows a spinning RefreshCw inside the Scan button and disables it */
  isScanning?: boolean;
  onScan?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  /** Label for the primary action button — default "Scan" */
  scanLabel?: string;
  /** Current AWS region value */
  region?: string;
  onRegionChange?: (r: string) => void;
  /** Show the AWS profile selector */
  showProfile?: boolean;
  profile?: string;
  onProfileChange?: (p: string) => void;
  /** Arbitrary right-side controls inserted before Refresh/Export/Scan */
  children?: React.ReactNode;
}

export function ScanPageHeader({
  icon,
  iconColor = "#00ff88",
  title,
  subtitle,
  isScanning = false,
  onScan,
  onStop,
  onRefresh,
  onExport,
  scanLabel = "Scan",
  region,
  onRegionChange,
  showProfile = false,
  profile,
  onProfileChange,
  children,
}: ScanPageHeaderProps) {
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  const selectStyle: React.CSSProperties = {
    ...mono,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.85)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    cursor: "pointer",
    outline: "none",
    appearance: "none" as const,
  };

  const ghostBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.7)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap" as const,
        marginBottom: 24,
      }}
    >
      {/* ── Left: icon + title + subtitle ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${iconColor}14`,
            border: `1px solid ${iconColor}2e`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#e2e8f0",
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "rgba(100,116,139,0.75)",
              margin: "4px 0 0",
              lineHeight: 1.4,
              maxWidth: 520,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap" as const,
        }}
      >
        {/* Region selector */}
        {region !== undefined && onRegionChange && (
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            style={selectStyle}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        {/* Profile selector */}
        {showProfile && profile !== undefined && onProfileChange && (
          <select
            value={profile}
            onChange={(e) => onProfileChange(e.target.value)}
            style={selectStyle}
          >
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Slot for extra custom controls */}
        {children}

        {/* Refresh */}
        {onRefresh && (
          <button onClick={onRefresh} className="ghost-btn" style={ghostBtn}>
            <RefreshCw size={13} />
            Refresh
          </button>
        )}

        {/* Export */}
        {onExport && (
          <button onClick={onExport} className="ghost-btn" style={ghostBtn}>
            <Download size={13} />
            Export
          </button>
        )}

        {/* Scan */}
        {onScan && (
          <button
            onClick={onScan}
            disabled={isScanning}
            className="scan-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 6,
              background: isScanning
                ? "rgba(0,255,136,0.04)"
                : "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.28)",
              color: "#00ff88",
              fontSize: 13,
              fontWeight: 600,
              cursor: isScanning ? "not-allowed" : "pointer",
              opacity: isScanning ? 0.65 : 1,
            }}
          >
            {isScanning ? (
              <RefreshCw
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Play size={14} />
            )}
            {isScanning ? "Scanning…" : scanLabel}
          </button>
        )}

        {/* Stop — only visible while scanning */}
        {onStop && isScanning && (
          <button
            onClick={onStop}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 6,
              background: "rgba(255,0,64,0.08)",
              border: "1px solid rgba(255,0,64,0.28)",
              color: "#ff0040",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.12s",
            }}
          >
            <Square size={14} />
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
