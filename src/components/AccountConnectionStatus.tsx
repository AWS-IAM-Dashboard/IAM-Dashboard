import { Fragment } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Link2, RefreshCw, PlugZap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "../utils/ui";
import type { AwsAccountConnection, AwsAccountConnectionStatus } from "../types/awsAccountConnection";
import { MOCK_AWS_ACCOUNT_CONNECTIONS } from "../types/awsAccountConnection";

function connectionStatusBadgeClass(status: AwsAccountConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-[#00ff88] text-black";
    case "pending":
      return "bg-[#ffb000] text-black";
    case "error":
      return "bg-[#ff0040] text-white";
    case "disconnected":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-gray-500 text-white";
  }
}

function formatConnectionLabel(status: AwsAccountConnectionStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function healthBadgeClass(healthLabel?: string): string {
  if (!healthLabel) return "bg-muted text-muted-foreground";
  const h = healthLabel.toLowerCase();
  if (h.includes("healthy")) return "bg-[#00ff88]/30 text-[#00ff88] border border-[#00ff88]/50";
  if (h.includes("overdue") || h.includes("await")) return "bg-[#ffb000]/20 text-[#ffb000] border border-[#ffb000]/40";
  if (h.includes("denied") || h.includes("error") || h.includes("expired")) {
    return "bg-[#ff0040]/20 text-[#ff0040] border border-[#ff0040]/40";
  }
  return "bg-muted/80 text-foreground border border-border";
}

export interface AccountConnectionStatusProps {
  accounts?: AwsAccountConnection[];
}

export function AccountConnectionStatus({
  accounts = MOCK_AWS_ACCOUNT_CONNECTIONS,
}: AccountConnectionStatusProps) {
  const handleTest = (account: AwsAccountConnection) => {
    toast.info("Connection test (mock)", {
      description: `Would validate ${account.aliasOrName} (${account.accountId}). Backend API pending.`,
    });
  };

  const handleReconnect = (account: AwsAccountConnection) => {
    toast.success("Reconnect requested (mock)", {
      description: `Would open re-link flow for ${account.aliasOrName}.`,
    });
  };

  if (accounts.length === 0) {
    return (
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-primary" />
            AWS account connections
          </CardTitle>
          <CardDescription>
            No accounts are linked yet. When B12 account APIs are available, connected organizations will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="cyber-glass rounded-lg border border-border/60 p-8 text-center text-sm text-muted-foreground">
            No accounts linked. Use your cloud admin workflow to register AWS accounts.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cyber-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          AWS account connections
        </CardTitle>
        <CardDescription>
          Connection status, health, and last scan per account. Mock data until backend account APIs (B12) are wired.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="whitespace-nowrap">Account ID</TableHead>
                <TableHead className="whitespace-nowrap">Alias / name</TableHead>
                <TableHead className="whitespace-nowrap">Connection</TableHead>
                <TableHead className="whitespace-nowrap">Health</TableHead>
                <TableHead className="whitespace-nowrap">Last scan</TableHead>
                <TableHead className="whitespace-nowrap">Region</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <Fragment key={account.id}>
                  <TableRow className="border-border align-middle">
                    <TableCell className="font-mono text-sm">{account.accountId}</TableCell>
                    <TableCell className="font-medium">{account.aliasOrName}</TableCell>
                    <TableCell>
                      <Badge className={connectionStatusBadgeClass(account.connectionStatus)}>
                        {formatConnectionLabel(account.connectionStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.healthLabel ? (
                        <Badge variant="outline" className={healthBadgeClass(account.healthLabel)}>
                          {account.healthLabel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.lastScanAt ? formatRelativeTime(account.lastScanAt) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {account.regionDefault ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border"
                          onClick={() => handleTest(account)}
                        >
                          <PlugZap className="h-3.5 w-3.5 mr-1" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border"
                          onClick={() => handleReconnect(account)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Reconnect
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {(account.connectionStatus === "error" || account.errorMessage) &&
                    account.errorMessage && (
                      <TableRow className="border-border bg-destructive/5 hover:bg-destructive/5">
                        <TableCell colSpan={7} className="py-3">
                          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Connection issue</AlertTitle>
                            <AlertDescription className="text-sm">
                              {account.errorMessage}
                            </AlertDescription>
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
