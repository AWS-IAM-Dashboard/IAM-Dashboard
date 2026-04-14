export type AccountConnectionState = "connected" | "pending" | "error" | "disconnected";
export type HealthLevel = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface MockConnectionRecord {
  accountId: string;
  alias: string;
  status: AccountConnectionState;
  health: HealthLevel;
  lastScan: string;
  errorMessage?: string;
}

export const MOCK_CONNECTIONS: MockConnectionRecord[] = [
  {
    accountId: "111122223333",
    alias: "Production",
    status: "connected",
    health: "healthy",
    lastScan: "2026-03-31T11:24:00Z",
  },
  {
    accountId: "222233334444",
    alias: "Staging",
    status: "pending",
    health: "degraded",
    lastScan: "2026-03-31T10:02:00Z",
  },
  {
    accountId: "333344445555",
    alias: "Development",
    status: "error",
    health: "unhealthy",
    lastScan: "2026-03-30T22:40:00Z",
    errorMessage: "AssumeRole denied for arn:aws:iam::333344445555:role/SecurityDashboardRole.",
  },
  {
    accountId: "444455556666",
    alias: "Sandbox",
    status: "disconnected",
    health: "unknown",
    lastScan: "Never",
    errorMessage: "Account is not currently connected. Reconnect credentials to resume scans.",
  },
];

export function getMockConnectionByAccountId(accountId: string): MockConnectionRecord | undefined {
  return MOCK_CONNECTIONS.find((record) => record.accountId === accountId);
}

export function getMockConnectionState(accountId: string): AccountConnectionState {
  return getMockConnectionByAccountId(accountId)?.status ?? "disconnected";
}

