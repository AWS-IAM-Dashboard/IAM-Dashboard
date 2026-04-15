/**
 * ScanPageHeader — standardised header used across all scanner tabs.
 *
 * Desktop (md+): Original left/right row — title left, controls right.
 * Mobile (<md):  Stacked column — title top, full-width action toolbar below.
 */

import { RefreshCw, Download, Play, Square } from "lucide-react";
import { cn } from "./utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

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
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  subtitle: string;
  isScanning?: boolean;
  onScan?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  scanLabel?: string;
  region?: string;
  onRegionChange?: (r: string) => void;
  showProfile?: boolean;
  profile?: string;
  onProfileChange?: (p: string) => void;
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

  /* ── Shared title block (identical in both layouts) ── */
  const titleBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: `${iconColor}14`,
          border: `1px solid ${iconColor}2e`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <h1
          style={{
            fontSize: 20, fontWeight: 700, color: "#e2e8f0",
            margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 12, color: "rgba(100,116,139,0.75)",
            margin: "4px 0 0", lineHeight: 1.4, maxWidth: 520,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );

  /* ── Desktop inline styles (match main exactly) ── */
  const selectStyle: React.CSSProperties = {
    ...mono,
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.85)",
    borderRadius: 6, padding: "8px 12px", fontSize: 12,
    cursor: "pointer", outline: "none", appearance: "none" as const,
  };

  const ghostBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", borderRadius: 6,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(148,163,184,0.7)", fontSize: 12, fontWeight: 500, cursor: "pointer",
  };

  /* ── Mobile select helper ── */
  const selectTriggerClass = (segment: "first" | "last" | "only") =>
    cn(
      "h-12 min-h-12 w-full min-w-0 justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-sm text-slate-100 shadow-none",
      "font-mono focus:ring-1 focus:ring-[#00ff88]/40 focus:ring-offset-0 data-[placeholder]:text-slate-500",
      "!h-12 data-[size=default]:!h-12",
      segment === "only" && "sm:rounded-lg",
      segment === "first" && "sm:rounded-l-lg sm:rounded-r-none sm:border-y-0 sm:border-l-0 sm:border-r sm:border-white/10 sm:bg-transparent",
      segment === "last" && "sm:rounded-r-lg sm:rounded-l-none sm:border-0 sm:bg-transparent",
    );

  return (
    <>
      {/* ═══════ Desktop (md+) — original main layout ═══════ */}
      <div
        className="hidden md:flex"
        style={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap" as const,
          marginBottom: 24,
        }}
      >
        {titleBlock}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          {region !== undefined && onRegionChange && (
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              style={selectStyle}
            >
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}

          {showProfile && profile !== undefined && onProfileChange && (
            <select
              value={profile}
              onChange={(e) => onProfileChange(e.target.value)}
              style={selectStyle}
            >
              {PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {children}

          {onRefresh && (
            <button type="button" onClick={onRefresh} className="ghost-btn" style={ghostBtn}>
              <RefreshCw size={13} />
              Refresh
            </button>
          )}

          {onExport && (
            <button type="button" onClick={onExport} className="ghost-btn" style={ghostBtn}>
              <Download size={13} />
              Export
            </button>
          )}

          {onScan && (
            <button
              type="button"
              onClick={onScan}
              disabled={isScanning}
              className="scan-btn"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 20px", borderRadius: 6,
                background: isScanning ? "rgba(0,255,136,0.04)" : "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.28)",
                color: "#00ff88", fontSize: 13, fontWeight: 600,
                cursor: isScanning ? "not-allowed" : "pointer",
                opacity: isScanning ? 0.65 : 1,
              }}
            >
              {isScanning ? (
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Play size={14} />
              )}
              {isScanning ? "Scanning…" : scanLabel}
            </button>
          )}

          {onStop && isScanning && (
            <button
              type="button"
              onClick={onStop}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 6,
                background: "rgba(255,0,64,0.08)",
                border: "1px solid rgba(255,0,64,0.28)",
                color: "#ff0040", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "background 0.12s",
              }}
            >
              <Square size={14} />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Mobile (<md) — stacked touch-friendly toolbar ═══════ */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex justify-start">
          <div className="flex min-w-0 items-center gap-3 text-left">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}2e` }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h1
                className="m-0 text-xl font-bold tracking-tight text-slate-100"
                style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {title}
              </h1>
              <p
                className="mt-1 max-w-[520px] text-xs leading-snug text-slate-500"
                style={{ color: "rgba(100,116,139,0.75)" }}
              >
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
          role="toolbar"
          aria-label="Scanner actions"
        >
          {(region !== undefined && onRegionChange) || (showProfile && profile !== undefined && onProfileChange) ? (
            <div
              className={cn(
                "flex min-h-12 w-full min-w-0 flex-1 flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04]",
                "sm:flex-row sm:gap-0 sm:divide-x sm:divide-white/10 sm:rounded-lg",
              )}
            >
              {region !== undefined && onRegionChange && (
                <div className="min-w-0 flex-1">
                  <Select value={region} onValueChange={onRegionChange}>
                    <SelectTrigger
                      className={selectTriggerClass(
                        showProfile && profile !== undefined && onProfileChange ? "first" : "only",
                      )}
                      style={mono}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} collisionPadding={16} className="z-[200]">
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r} className="font-mono text-xs">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showProfile && profile !== undefined && onProfileChange && (
                <div className="min-w-0 flex-1">
                  <Select value={profile} onValueChange={onProfileChange}>
                    <SelectTrigger
                      className={selectTriggerClass(region !== undefined && onRegionChange ? "last" : "only")}
                      style={mono}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6} collisionPadding={16} className="z-[200]">
                      {PROFILES.map((p) => (
                        <SelectItem key={p} value={p} className="font-mono text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : null}

          {children}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="ghost-btn flex min-h-12 w-full shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.05] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] sm:w-14"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="ghost-btn flex min-h-12 w-full flex-1 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-slate-100 shadow-sm transition-colors hover:border-[#00ff88]/40 hover:bg-white/[0.09] sm:min-w-0 sm:flex-initial sm:px-4"
            >
              <Download size={13} />
              Export
            </button>
          )}

          {onScan && (
            <button
              type="button"
              onClick={onScan}
              disabled={isScanning}
              className="scan-btn flex min-h-12 w-full flex-[1.3] items-center justify-center gap-2 rounded-lg border border-[rgba(0,255,136,0.38)] bg-[rgba(0,255,136,0.12)] px-4 text-sm font-bold text-[#00ff88] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-[rgba(0,255,136,0.18)] disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-0"
            >
              {isScanning ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Play size={18} />
              )}
              {isScanning ? "Scanning…" : scanLabel}
            </button>
          )}

          {onStop && isScanning && (
            <button
              type="button"
              onClick={onStop}
              className="flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[rgba(255,0,64,0.35)] bg-[rgba(255,0,64,0.1)] px-4 text-sm font-semibold text-[#fda4af] transition-colors hover:bg-[rgba(255,0,64,0.16)] sm:w-auto"
            >
              <Square size={14} />
              Stop
            </button>
          )}
        </div>
      </div>
    </>
  );
}
