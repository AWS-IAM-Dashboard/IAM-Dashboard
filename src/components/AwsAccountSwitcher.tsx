import { Cloud } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { useAwsAccount } from "../context/AwsAccountContext";

function maskAccountId(accountId: string): string {
  if (!accountId) return "—";
  if (/^\d{12}$/.test(accountId)) {
    return `${accountId.slice(0, 4)}···${accountId.slice(-4)}`;
  }
  return accountId;
}

interface AwsAccountSwitcherProps {
  compact?: boolean;
}

export function AwsAccountSwitcher({ compact = false }: AwsAccountSwitcherProps) {
  const { accounts, selectedAccount, selectAccount } = useAwsAccount();

  if (accounts.length === 0) {
    return (
      <div className={`flex min-w-0 max-w-[260px] ${compact ? "items-center" : "flex-col gap-0.5"}`}>
        {!compact && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            AWS account
          </span>
        )}
        <div
          className="flex h-9 items-center rounded-md border border-dashed border-border/80 bg-muted/30 px-3 text-sm text-muted-foreground"
          title="Connect AWS accounts in your organization to see them here."
        >
          <Cloud className="mr-2 size-4 shrink-0 opacity-60" />
          No accounts connected
        </div>
      </div>
    );
  }

  const titleParts = selectedAccount
    ? [selectedAccount.label, selectedAccount.accountId].filter(Boolean)
    : [];

  return (
    <div className={`flex min-w-0 max-w-[280px] ${compact ? "items-center" : "flex-col gap-0.5"}`}>
      {!compact && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          AWS account
        </span>
      )}
      <Select
        value={selectedAccount?.id ?? undefined}
        onValueChange={selectAccount}
        disabled={accounts.length === 0}
      >
        <SelectTrigger
          title={titleParts.join(" — ")}
          aria-label="Switch AWS account"
          className="h-9 w-[260px] border-border bg-input/80 hover:bg-input"
        >
          <Cloud className="size-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0 text-left">
            <span className="w-full truncate text-sm font-medium leading-tight">
              {selectedAccount?.label ?? "Select account"}
            </span>
            <span className="w-full truncate text-[11px] font-normal leading-tight text-muted-foreground">
              {selectedAccount
                ? maskAccountId(selectedAccount.accountId)
                : "Choose an account"}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="cyber-card border-border">
          {accounts.map((a) => (
            <SelectItem
              key={a.id}
              value={a.id}
              textValue={`${a.label} ${a.accountId}`.trim()}
              className="cursor-pointer"
            >
              <div className="flex flex-col gap-0.5 py-0.5">
                <span className="font-medium">{a.label}</span>
                <span className="text-xs text-muted-foreground">
                  {maskAccountId(a.accountId)}
                  <span className="text-[10px] uppercase text-primary/80">
                    {" "}
                    · mock
                  </span>
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
