import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Download,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";

interface GuardDutyFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: number;
  count: number;
  first_seen: string;
  last_seen: string;
  resource_type: string;
  resource_id: string;
  region: string;
  account_id: string;
}

// ─── Mock data (unchanged) ────────────────────────────────────────────────────
const mockGuardDutyFindings: GuardDutyFinding[] = [
  {
    id: "gd-finding-001",
    type: "Recon:EC2/PortProbeUnprotectedPort",
    title: "EC2 instance is being probed by a known malicious host",
    description:
      "EC2 instance i-1234567890abcdef0 is being probed on port 22 from IP 203.0.113.42",
    severity: 7,
    count: 45,
    first_seen: "2024-01-15T08:00:00Z",
    last_seen: "2024-01-15T14:30:00Z",
    resource_type: "Instance",
    resource_id: "i-1234567890abcdef0",
    region: "us-east-1",
    account_id: "123456789012",
  },
  {
    id: "gd-finding-002",
    type: "UnauthorizedAPICall:IAMUser/InstanceCredentialExfiltration",
    title: "Unusual API calls made by an IAM user",
    description:
      "IAM user admin-user-dev made unusual API calls that may indicate credential theft",
    severity: 8,
    count: 12,
    first_seen: "2024-01-14T16:20:00Z",
    last_seen: "2024-01-14T18:45:00Z",
    resource_type: "IAMUser",
    resource_id: "admin-user-dev",
    region: "us-east-1",
    account_id: "123456789012",
  },
  {
    id: "gd-finding-003",
    type: "Stealth:IAMUser/CloudTrailLoggingDisabled",
    title: "CloudTrail logging has been disabled",
    description: "CloudTrail trail security-audit-trail was stopped or deleted",
    severity: 9,
    count: 1,
    first_seen: "2024-01-13T10:15:00Z",
    last_seen: "2024-01-13T10:15:00Z",
    resource_type: "Trail",
    resource_id: "security-audit-trail",
    region: "us-east-1",
    account_id: "123456789012",
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "rgba(15,23,42,0.6)",
  border: "rgba(255,255,255,0.06)",
  borderRadius: 10,
  critical: "#ff0040",
  high: "#ff6b35",
  medium: "#ffb000",
  low: "#00ff88",
  info: "#64748b",
  text: "#e2e8f0",
  muted: "rgba(100,116,139,0.7)",
  mono: "'JetBrains Mono', monospace",
  cardBg: "rgba(15,23,42,0.8)",
  green: "#00ff88",
};

// ─── Finding categories with label + color ────────────────────────────────────
const CATEGORIES: Record<string, { color: string; label: string }> = {
  Recon:               { color: "#a78bfa", label: "Recon" },
  Backdoor:            { color: C.critical, label: "Backdoor" },
  Behavior:            { color: C.high, label: "Behavior" },
  CryptoCurrency:      { color: C.medium, label: "CryptoCurrency" },
  PenTest:             { color: "#f472b6", label: "PenTest" },
  Policy:              { color: "#38bdf8", label: "Policy" },
  Stealth:             { color: "#818cf8", label: "Stealth" },
  Trojan:              { color: C.critical, label: "Trojan" },
  UnauthorizedAccess:  { color: C.high, label: "UnauthorizedAccess" },
  UnauthorizedAPICall: { color: "#fb923c", label: "UnauthorizedAPICall" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getSeverityColor = (severity: number): string => {
  if (severity >= 8) return C.critical;
  if (severity >= 6) return C.high;
  if (severity >= 4) return C.medium;
  return C.low;
};

const getSeverityLabel = (severity: number): string => {
  if (severity >= 8) return "High";
  if (severity >= 6) return "Medium";
  if (severity >= 4) return "Low";
  return "Info";
};

const getFindingCategory = (type: string) => {
  const prefix = type.split(":")[0];
  return CATEGORIES[prefix] ?? { color: C.info, label: prefix };
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const durationDays = (first: string, last: string) => {
  const diff = new Date(last).getTime() - new Date(first).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "< 1d";
  return `${days}d`;
};

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        cursor: "pointer",
        border: `1px solid ${active ? (color ?? C.green) : C.border}`,
        background: active
          ? color
            ? `${color}22`
            : "rgba(0,255,136,0.12)"
          : "transparent",
        color: active ? (color ?? C.green) : C.muted,
        transition: "all 0.15s",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

// ─── Mini count bar ───────────────────────────────────────────────────────────
function CountBar({
  count,
  max,
  color,
}: {
  count: number;
  max: number;
  color: string;
}) {
  const pct = max === 0 ? 0 : Math.min((count / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text, minWidth: 24, textAlign: "right" as const }}>
        {count}
      </span>
      <div
        style={{
          width: 48,
          height: 4,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GuardDuty() {
  const [findings] = useState<GuardDutyFinding[]>(mockGuardDutyFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing GuardDuty findings…");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("GuardDuty findings updated");
    }, 1500);
  };

  // Derived stats
  const activeThreats = findings.length;
  const criticalCount = findings.filter((f) => f.severity >= 8).length;
  const highCount = findings.filter((f) => f.severity >= 6 && f.severity < 8).length;
  const suppressedCount = 0; // no suppressed field in mock; placeholder

  // Filter logic
  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity === "high" && f.severity < 8) return false;
    if (selectedSeverity === "medium" && (f.severity < 6 || f.severity >= 8)) return false;
    if (selectedSeverity === "low" && f.severity >= 6) return false;
    if (selectedCategory !== "all") {
      const prefix = f.type.split(":")[0];
      if (prefix !== selectedCategory) return false;
    }
    return true;
  });

  // Categories present in findings
  const presentCategories = Array.from(
    new Set(findings.map((f) => f.type.split(":")[0]))
  );

  const maxCount = Math.max(...findings.map((f) => f.count), 1);

  return (
    <div
      style={{
        padding: "24px 32px",
        color: C.text,
        fontFamily: "DM Sans, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <ScanPageHeader
        icon={<Zap size={20} color="#ff6b35" />}
        iconColor="#ff6b35"
        title="GuardDuty"
        subtitle="ML-powered threat detection — anomalous behavior, known malicious IPs, credential compromise"
        onRefresh={handleRefresh}
        onExport={() => {}}
      />

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap" as const,
        }}
      >
        <StatCard
          label="Active Threats"
          value={activeThreats}
          accent={C.high}
          icon={AlertTriangle}
        />
        <StatCard
          label="Critical (≥8.0)"
          value={criticalCount}
          accent={C.critical}
          icon={Zap}
        />
        <StatCard
          label="High (6.0–7.9)"
          value={highCount}
          accent={C.high}
          icon={Shield}
        />
        <StatCard
          label="Suppressed"
          value={suppressedCount}
          accent={C.info}
          icon={Eye}
        />
      </div>

      {/* ── Category legend ───────────────────────────────────────────────── */}
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: C.borderRadius,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap" as const,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: C.muted,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          Categories
        </span>
        {Object.entries(CATEGORIES).map(([key, { color, label }]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: presentCategories.includes(key) ? 1 : 0.3,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: presentCategories.includes(key) ? color : C.muted,
                fontFamily: C.mono,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: C.borderRadius,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column" as const,
          gap: 8,
        }}
      >
        {/* Severity filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap" as const,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              width: 66,
              flexShrink: 0,
            }}
          >
            Severity
          </span>
          {[
            { key: "all", label: "All" },
            { key: "high", label: "High ≥8", color: C.critical },
            { key: "medium", label: "Medium 6–7", color: C.high },
            { key: "low", label: "Low <6", color: C.medium },
          ].map(({ key, label, color }) => (
            <Chip
              key={key}
              label={label}
              active={selectedSeverity === key}
              color={color}
              onClick={() => setSelectedSeverity(key)}
            />
          ))}
        </div>

        {/* Category filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap" as const,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              width: 66,
              flexShrink: 0,
            }}
          >
            Category
          </span>
          <Chip
            label="All"
            active={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          />
          {presentCategories.map((cat) => {
            const meta = CATEGORIES[cat] ?? { color: C.info, label: cat };
            return (
              <Chip
                key={cat}
                label={meta.label}
                active={selectedCategory === cat}
                color={meta.color}
                onClick={() => setSelectedCategory(cat)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Findings table ───────────────────────────────────────────────── */}
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: C.borderRadius,
          overflow: "hidden",
        }}
      >
        {/* Table header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} color={C.critical} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              Active Threats
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: C.mono,
                color: C.muted,
                background: "rgba(255,255,255,0.06)",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {filteredFindings.length}
            </span>
          </div>
        </div>

        {/* Column headers */}
        {filteredFindings.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 220px 1fr 100px 160px 180px",
              padding: "8px 16px",
              borderBottom: `1px solid ${C.border}`,
              gap: 0,
            }}
          >
            {["Score", "Finding Type", "Title", "Count", "Resource ID", "First → Last Seen"].map(
              (h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {h}
                </div>
              )
            )}
          </div>
        )}

        {/* Empty state */}
        {filteredFindings.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 24px",
              gap: 12,
            }}
          >
            <Shield size={48} color={C.muted} style={{ opacity: 0.35 }} />
            <p style={{ fontSize: 14, color: C.muted, margin: 0, textAlign: "center" as const }}>
              No threats match the current filters
            </p>
          </div>
        )}

        {/* Rows */}
        {filteredFindings.map((finding, idx) => {
          const sevColor = getSeverityColor(finding.severity);
          const isExpanded = expandedRow === finding.id;
          const category = getFindingCategory(finding.type);

          // Split finding type: "Recon:EC2/PortProbeUnprotectedPort"
          const colonIdx = finding.type.indexOf(":");
          const typePrefix =
            colonIdx !== -1 ? finding.type.slice(0, colonIdx) : finding.type;
          const typeSuffix =
            colonIdx !== -1 ? finding.type.slice(colonIdx) : "";

          const dur = durationDays(finding.first_seen, finding.last_seen);

          return (
            <div key={finding.id}>
              {/* Main row */}
              <div
                onClick={() =>
                  setExpandedRow(isExpanded ? null : finding.id)
                }
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 220px 1fr 100px 160px 180px",
                  alignItems: "center",
                  cursor: "pointer",
                  background:
                    idx % 2 === 0
                      ? "transparent"
                      : "rgba(255,255,255,0.015)",
                  borderBottom: `1px solid ${C.border}`,
                  padding: "8px 16px",
                  transition: "background 0.12s",
                  gap: 0,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    idx % 2 === 0
                      ? "transparent"
                      : "rgba(255,255,255,0.015)")
                }
              >
                {/* Severity score pill */}
                <div>
                  <SeverityBadge severity={getSeverityLabel(finding.severity).toUpperCase()} size="sm" />
                </div>

                {/* Finding type — split display */}
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  <span style={{ color: category.color }}>{typePrefix}</span>
                  <span style={{ color: "#94a3b8" }}>{typeSuffix}</span>
                </div>

                {/* Title */}
                <div style={{ paddingRight: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {finding.title}
                  </p>
                  {isExpanded ? (
                    <ChevronUp size={12} color={C.muted} style={{ flexShrink: 0 }} />
                  ) : (
                    <ChevronDown size={12} color={C.muted} style={{ flexShrink: 0 }} />
                  )}
                </div>

                {/* Count + bar */}
                <CountBar
                  count={finding.count}
                  max={maxCount}
                  color={sevColor}
                />

                {/* Resource ID */}
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: "#94a3b8",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}
                  title={finding.resource_id}
                >
                  {finding.resource_id}
                </div>

                {/* First → Last Seen */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: C.mono,
                    }}
                  >
                    <Clock size={9} />
                    {formatDate(finding.first_seen)} → {formatDate(finding.last_seen)}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: sevColor,
                      fontFamily: C.mono,
                      opacity: 0.8,
                    }}
                  >
                    {dur} duration
                  </span>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div
                  style={{
                    background: "rgba(15,23,42,0.95)",
                    borderBottom: `1px solid ${sevColor}44`,
                    padding: "16px 20px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px 24px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 10,
                        color: C.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Full Description
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: C.text,
                        lineHeight: 1.6,
                      }}
                    >
                      {finding.description}
                    </p>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 10,
                        color: C.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Resource Details
                    </p>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        Type: {finding.resource_type}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        ID: {finding.resource_id}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        Region: {finding.region}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 10,
                        color: C.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Account & Timing
                    </p>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        Account: {finding.account_id}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        First: {new Date(finding.first_seen).toLocaleString()}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        Last: {new Date(finding.last_seen).toLocaleString()}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: "#94a3b8" }}>
                        Occurrences: {finding.count}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
