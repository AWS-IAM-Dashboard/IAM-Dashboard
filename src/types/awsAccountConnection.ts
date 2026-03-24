// TODO(B12): replace MOCK_AWS_ACCOUNT_CONNECTIONS with data from account APIs (e.g. GET /accounts).

export type AwsAccountConnectionStatus =
  | "connected"
  | "pending"
  | "error"
  | "disconnected";

export interface AwsAccountConnection {
  id: string;
  accountId: string;
  aliasOrName: string;
  connectionStatus: AwsAccountConnectionStatus;
  healthLabel?: string;
  lastScanAt: string | null;
  errorMessage?: string;
  regionDefault?: string;
}

export const MOCK_AWS_ACCOUNT_CONNECTIONS: AwsAccountConnection[] = [
  {
    id: "acc-1",
    accountId: "123456789012",
    aliasOrName: "prod-primary",
    connectionStatus: "connected",
    healthLabel: "Healthy",
    lastScanAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    regionDefault: "us-east-1",
  },
  {
    id: "acc-2",
    accountId: "987654321098",
    aliasOrName: "staging-west",
    connectionStatus: "connected",
    healthLabel: "Scan overdue",
    lastScanAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    regionDefault: "us-west-2",
  },
  {
    id: "acc-3",
    accountId: "555511112222",
    aliasOrName: "audit-readonly",
    connectionStatus: "pending",
    healthLabel: "Awaiting trust",
    lastScanAt: null,
    regionDefault: "us-east-1",
  },
  {
    id: "acc-4",
    accountId: "444433334444",
    aliasOrName: "dev-sandbox",
    connectionStatus: "error",
    healthLabel: "Credential error",
    lastScanAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    errorMessage:
      "AssumeRole failed: The security token included in the request is expired. Rotate the external ID and IAM role trust policy, then retry.",
    regionDefault: "eu-west-1",
  },
  {
    id: "acc-5",
    accountId: "111122223333",
    aliasOrName: "legacy-corp",
    connectionStatus: "disconnected",
    healthLabel: "Not linked",
    lastScanAt: null,
    regionDefault: "us-east-1",
  },
  {
    id: "acc-6",
    accountId: "666677778888",
    aliasOrName: "workload-island",
    connectionStatus: "error",
    healthLabel: "Access denied",
    lastScanAt: null,
    errorMessage:
      "sts:AssumeRole returned AccessDenied. Confirm the dashboard role ARN and that organization SCPs allow cross-account access.",
    regionDefault: "ap-southeast-1",
  },
  {
    id: "acc-7",
    accountId: "999900001111",
    aliasOrName: "compliance-central",
    connectionStatus: "connected",
    healthLabel: "Healthy",
    lastScanAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    regionDefault: "us-east-1",
  },
];
