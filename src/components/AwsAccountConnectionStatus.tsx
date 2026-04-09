import { AlertTriangle, CheckCircle2, Clock3, Link2Off, LoaderCircle } from "lucide-react";
import { MOCK_AWS_ACCOUNTS } from "../context/AwsAccountContext";
import {
  MOCK_CONNECTIONS,
  type AccountConnectionState,
  type HealthLevel,
} from "../constants/awsAccountConnectionMock";

function formatAccountId(accountId: string): string {
  if (!/^\d{12}$/.test(accountId)) return accountId;
  return `${accountId.slice(0, 4)}-${accountId.slice(4, 8)}-${accountId.slice(8)}`;
}

function formatLastScan(lastScan: string): string {
  if (lastScan === "Never") return "Never";
  const date = new Date(lastScan);
  if (Number.isNaN(date.getTime())) return lastScan;
  return date.toLocaleString();
}

function statusPresentation(status: AccountConnectionState) {
  if (status === "connected") {
    return {
      label: "CONNECTED",
      color: "#00ff88",
      bg: "rgba(0,255,136,0.12)",
      border: "rgba(0,255,136,0.28)",
      icon: <CheckCircle2 size={13} />,
    };
  }
  if (status === "pending") {
    return {
      label: "PENDING",
      color: "#ffb000",
      bg: "rgba(255,176,0,0.12)",
      border: "rgba(255,176,0,0.28)",
      icon: <LoaderCircle size={13} />,
    };
  }
  if (status === "error") {
    return {
      label: "ERROR",
      color: "#ff0040",
      bg: "rgba(255,0,64,0.12)",
      border: "rgba(255,0,64,0.28)",
      icon: <AlertTriangle size={13} />,
    };
  }
  return {
    label: "DISCONNECTED",
    color: "#64748b",
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.28)",
    icon: <Link2Off size={13} />,
  };
}

function healthPresentation(health: HealthLevel) {
  if (health === "healthy") return { label: "Healthy", color: "#00ff88" };
  if (health === "degraded") return { label: "Degraded", color: "#ffb000" };
  if (health === "unhealthy") return { label: "Unhealthy", color: "#ff0040" };
  return { label: "Unknown", color: "#64748b" };
}

export function AwsAccountConnectionStatus() {
  const connectedAliases = new Set(MOCK_AWS_ACCOUNTS.map((a) => a.label));
  const records = MOCK_CONNECTIONS.map((record) => ({
    ...record,
    isActive: connectedAliases.has(record.alias),
  }));

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.8)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
          AWS Account Connection Status
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "rgba(100,116,139,0.65)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {records.filter((r) => r.status === "connected").length} / {records.length} connected
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 130px 120px 180px minmax(320px, 1fr)",
            gap: "12px",
            padding: "8px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            minWidth: "940px",
          }}
        >
          {["Account", "Status", "Health", "Last Scan", "Error / Troubleshooting"].map((header) => (
            <span
              key={header}
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "rgba(100,116,139,0.55)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {header}
            </span>
          ))}
        </div>

        {records.map((record, idx) => {
          const status = statusPresentation(record.status);
          const health = healthPresentation(record.health);
          return (
            <div
              key={`${record.alias}-${record.accountId}`}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 130px 120px 180px minmax(320px, 1fr)",
                gap: "12px",
                padding: "10px 16px",
                borderBottom:
                  idx < records.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                alignItems: "center",
                background: record.isActive ? "rgba(0,255,136,0.03)" : "transparent",
                minWidth: "940px",
              }}
            >
            <div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 600 }}>{record.alias}</div>
              <div
                style={{
                  fontSize: "10px",
                  color: "rgba(100,116,139,0.55)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {formatAccountId(record.accountId)}
                {record.isActive ? " · active" : " · inactive"}
              </div>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                width: "fit-content",
                padding: "3px 9px",
                borderRadius: "999px",
                background: status.bg,
                border: `1px solid ${status.border}`,
                color: status.color,
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.03em",
              }}
            >
              {status.icon}
              {status.label}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: health.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: health.color,
                  boxShadow: `0 0 0 1px ${health.color}40`,
                }}
              />
              {health.label}
            </span>

            <span
              style={{
                fontSize: "11px",
                color: "rgba(148,163,184,0.85)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <Clock3 size={11} style={{ display: "inline", marginRight: "6px" }} />
              {formatLastScan(record.lastScan)}
            </span>

              <span
                style={{
                  fontSize: "11px",
                  color:
                    record.status === "error" || record.status === "disconnected"
                      ? "#fda4af"
                      : "rgba(100,116,139,0.65)",
                  lineHeight: 1.45,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {record.errorMessage ?? "No connection issues detected."}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
