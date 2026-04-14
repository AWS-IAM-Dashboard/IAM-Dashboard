import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAwsAccount, type AwsConnectedAccount } from "../context/AwsAccountContext";
import { getMockConnectionState } from "../constants/awsAccountConnectionMock";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

function getStatusColor(accountId: string): string {
  const s = getMockConnectionState(accountId);
  if (s === "connected") return "#00ff88";
  if (s === "pending") return "#ffb000";
  if (s === "error") return "#ff0040";
  return "#475569";
}

function getStatusLabel(accountId: string): string {
  const s = getMockConnectionState(accountId);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function maskAccountId(accountId: string): string {
  if (/^\d{12}$/.test(accountId)) return `${accountId.slice(0, 4)}···${accountId.slice(-4)}`;
  return accountId || "—";
}

// ── Orbital radar visualization ────────────────────────────────────────────────

const CX = 100;
const CY = 100;
const RINGS = [34, 57, 78];
// Equilateral triangle positions: top, bottom-left, bottom-right
const ANGLES = [-Math.PI / 2, (5 * Math.PI) / 6, Math.PI / 6];

// 30° sweep arc end point
const SWEEP_RAD = 0.52;
const OUTER = RINGS[2];
const SWEEP_X = CX + Math.sin(SWEEP_RAD) * OUTER;
const SWEEP_Y = CY - Math.cos(SWEEP_RAD) * OUTER;

function OrbitalRadar({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: AwsConnectedAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const blips = accounts.slice(0, 3).map((account, i) => {
    const r = RINGS[i] ?? RINGS[RINGS.length - 1];
    const angle = ANGLES[i] ?? (-Math.PI / 2 + (i * Math.PI * 2) / accounts.length);
    const x = CX + Math.cos(angle) * r;
    const y = CY + Math.sin(angle) * r;
    const color = getStatusColor(account.accountId);
    const isSelected = account.id === selectedId;

    // Label positioning: keep inside the 200×200 canvas
    let labelX = x;
    let labelAnchor: "middle" | "start" | "end" = "middle";
    let labelY = y + 21;
    if (i === 1) {
      // bottom-left: label to the right of blip
      labelX = x + 16;
      labelAnchor = "start";
      labelY = y + 4;
    } else if (i === 2) {
      // bottom-right: label to the left of blip
      labelX = x - 16;
      labelAnchor = "end";
      labelY = y + 4;
    }

    return { account, x, y, color, isSelected, labelX, labelY, labelAnchor };
  });

  return (
    <>
      <style>{`
        @keyframes iam-radar-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .iam-radar-sweep {
          transform-origin: ${CX}px ${CY}px;
          animation: iam-radar-rotate 4s linear infinite;
        }
      `}</style>

      <div style={{ position: "relative", width: 200, height: 200 }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {/* Cross-hair */}
          <line x1={CX - OUTER - 6} y1={CY} x2={CX + OUTER + 6} y2={CY} stroke="rgba(0,255,136,0.07)" strokeWidth="1" />
          <line x1={CX} y1={CY - OUTER - 6} x2={CX} y2={CY + OUTER + 6} stroke="rgba(0,255,136,0.07)" strokeWidth="1" />

          {/* Orbital rings */}
          {RINGS.map((r, i) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="rgba(0,255,136,0.11)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "3 8"}
            />
          ))}

          {/* Rotating sweep arm + sector */}
          <g className="iam-radar-sweep">
            <path
              d={`M ${CX} ${CY} L ${CX} ${CY - OUTER} A ${OUTER} ${OUTER} 0 0 1 ${SWEEP_X} ${SWEEP_Y} Z`}
              fill="rgba(0,255,136,0.055)"
            />
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - OUTER - 2}
              stroke="rgba(0,255,136,0.6)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* Account labels */}
          {blips.map(({ account, labelX, labelY, labelAnchor, color, isSelected }) => (
            <text
              key={`lbl-${account.id}`}
              x={labelX}
              y={labelY}
              textAnchor={labelAnchor}
              fill={isSelected ? color : "rgba(100,116,139,0.65)"}
              fontSize="9"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={isSelected ? "700" : "400"}
              letterSpacing="0.05em"
              style={{ pointerEvents: "none", textTransform: "uppercase" }}
            >
              {account.label}
            </text>
          ))}

          {/* Center origin */}
          <circle cx={CX} cy={CY} r="7" fill="rgba(0,255,136,0.12)" stroke="rgba(0,255,136,0.45)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="3" fill="#00ff88" />
        </svg>

        {/* Blip buttons (layered over SVG) */}
        {blips.map(({ account, x, y, color, isSelected }) => (
          <button
            key={account.id}
            onClick={() => onSelect(account.id)}
            title={`Switch to ${account.label} · ${maskAccountId(account.accountId)}`}
            style={{
              position: "absolute",
              left: x - 13,
              top: y - 13,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: isSelected ? `${color}18` : "rgba(6,9,18,0.95)",
              border: `1.5px solid ${isSelected ? color : "rgba(255,255,255,0.14)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: isSelected ? `0 0 14px ${color}55, 0 0 0 3px ${color}18` : "none",
              transition: "all 0.18s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.background = `${color}12`;
                e.currentTarget.style.boxShadow = `0 0 8px ${color}30`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                e.currentTarget.style.background = "rgba(6,9,18,0.95)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
                boxShadow: isSelected ? `0 0 7px ${color}` : "none",
                flexShrink: 0,
              }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

// ── Main switcher component ────────────────────────────────────────────────────

interface AwsAccountSwitcherProps {
  /** Pass true when the sidebar is collapsed to icon-only mode */
  collapsed?: boolean;
}

export function AwsAccountSwitcher({ collapsed = false }: AwsAccountSwitcherProps) {
  const { accounts, selectedAccount, selectAccount } = useAwsAccount();
  const [open, setOpen] = useState(false);

  const color = selectedAccount ? getStatusColor(selectedAccount.accountId) : "#475569";
  const statusLabel = selectedAccount ? getStatusLabel(selectedAccount.accountId) : "None";

  const handleSelect = (id: string) => {
    selectAccount(id);
    setOpen(false);
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          padding: collapsed ? "6px 0" : "6px 8px",
          color: "rgba(71,85,105,0.65)",
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#475569",
            flexShrink: 0,
          }}
        />
        {!collapsed && "No accounts"}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {collapsed ? (
          // ── Collapsed: compact initials badge ────────────────────────────────
          <button
            title={`${selectedAccount?.label} — click to switch account`}
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: `${color}10`,
              border: `1px solid ${color}38`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              margin: "0 auto",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}20`;
              e.currentTarget.style.borderColor = `${color}65`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${color}10`;
              e.currentTarget.style.borderColor = `${color}38`;
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              {selectedAccount?.label.slice(0, 3).toUpperCase() ?? "---"}
            </span>
          </button>
        ) : (
          // ── Expanded: full account row ────────────────────────────────────────
          <button
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 8px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            {/* Status pulse dot */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 5px ${color}90`,
                flexShrink: 0,
              }}
            />

            {/* Account name + masked ID */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#cbd5e1",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedAccount?.label ?? "Select account"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(100,116,139,0.6)",
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.3,
                }}
              >
                {selectedAccount ? maskAccountId(selectedAccount.accountId) : "—"}
              </div>
            </div>

            {/* Status label + chevron */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                {statusLabel}
              </span>
              <ChevronDown
                style={{
                  width: 11,
                  height: 11,
                  color: "rgba(71,85,105,0.55)",
                  transform: open ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
            </div>
          </button>
        )}
      </PopoverTrigger>

      {/* ── Orbital radar popup ──────────────────────────────────────────────── */}
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        style={{
          width: 300,
          padding: 0,
          background: "rgba(6,9,18,0.99)",
          border: "1px solid rgba(0,255,136,0.18)",
          borderRadius: 12,
          boxShadow: "0 0 0 1px rgba(0,255,136,0.04), 0 24px 64px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(100,116,139,0.75)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            AWS Accounts
          </span>
          <span
            style={{
              fontSize: 10,
              color: "rgba(0,255,136,0.55)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {accounts.filter((a) => getMockConnectionState(a.accountId) === "connected").length}
            {" / "}
            {accounts.length} live
          </span>
        </div>

        {/* Radar canvas */}
        <div
          style={{
            padding: "14px 14px 10px",
            display: "flex",
            justifyContent: "center",
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,255,136,0.035) 0%, transparent 70%)",
          }}
        >
          <OrbitalRadar
            accounts={accounts}
            selectedId={selectedAccount?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        {/* Account list */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            maxHeight: "min(40vh, 260px)",
            overflowY: "auto",
          }}
        >
          {accounts.map((account, i) => {
            const acColor = getStatusColor(account.accountId);
            const acStatus = getStatusLabel(account.accountId);
            const isSelected = account.id === selectedAccount?.id;

            return (
              <button
                key={account.id}
                onClick={() => handleSelect(account.id)}
                aria-label={`Switch to AWS account ${account.label} (${maskAccountId(account.accountId)})`}
                aria-current={isSelected ? "true" : undefined}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  background: isSelected ? "rgba(0,255,136,0.04)" : "transparent",
                  border: "none",
                  borderBottom:
                    i < accounts.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "rgba(0,255,136,0.07)"
                    : "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected
                    ? "rgba(0,255,136,0.04)"
                    : "transparent";
                }}
              >
                {/* Blip dot */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: acColor,
                    boxShadow: isSelected ? `0 0 6px ${acColor}80` : "none",
                    flexShrink: 0,
                  }}
                />

                {/* Name + ID */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "#e2e8f0" : "#94a3b8",
                      lineHeight: 1.3,
                    }}
                  >
                    {account.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(71,85,105,0.65)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {maskAccountId(account.accountId)}
                  </div>
                </div>

                {/* Status pill */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: acColor,
                    background: `${acColor}12`,
                    border: `1px solid ${acColor}30`,
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {acStatus}
                </span>

                {/* Active checkmark */}
                {isSelected && (
                  <span
                    style={{
                      color: "#00ff88",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
