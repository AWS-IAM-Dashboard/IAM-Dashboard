/**
 * ScanPageHeader — standardised header used across all scanner tabs.
 *
 * Layout matches Security Overview: title block, then full-width action toolbar
 * (stacked on narrow viewports, shared row on sm+).
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
  const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

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
    <div className="flex flex-col gap-4">
      {/* Title — same rhythm as Security Overview */}
      <div className="flex justify-start">
        <div className="flex min-w-0 items-center gap-3 text-left">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${iconColor}14`,
              border: `1px solid ${iconColor}2e`,
            }}
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

      {/* Actions: full-width toolbar — same pattern as Dashboard */}
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
                      <SelectItem key={r} value={r} className="font-mono text-xs">
                        {r}
                      </SelectItem>
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
                      <SelectItem key={p} value={p} className="font-mono text-xs">
                        {p}
                      </SelectItem>
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
            className="ghost-btn flex min-h-12 w-full shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.05] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] sm:w-14 md:w-16"
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
  );
}
