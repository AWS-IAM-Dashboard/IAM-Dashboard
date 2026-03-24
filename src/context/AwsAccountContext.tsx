import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useScanResults } from './ScanResultsContext';

export interface AwsConnectedAccount {
  id: string;
  label: string;
  accountId: string;
}

const STORAGE_SELECTED = 'iam-dashboard-selected-aws-account';

/** Mock connections until the backend provides a real list. IDs align with scan storage keys. */
export const MOCK_AWS_ACCOUNTS: AwsConnectedAccount[] = [
  { id: 'mock-prod', label: 'Production', accountId: '111122223333' },
  { id: 'mock-staging', label: 'Staging', accountId: '222233334444' },
  { id: 'mock-dev', label: 'Development', accountId: '333344445555' },
];

function parseAccountsFromEnv(): AwsConnectedAccount[] {
  const raw = import.meta.env.VITE_AWS_ACCOUNTS as string | undefined;
  if (raw === undefined || raw.trim() === '') {
    return MOCK_AWS_ACCOUNTS;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return MOCK_AWS_ACCOUNTS;
    }
    if (parsed.length === 0) {
      return [];
    }
    const mapped: AwsConnectedAccount[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i] as Record<string, unknown>;
      const id =
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim()
          : `account-${i}`;
      const label =
        typeof row.label === 'string' && row.label.trim()
          ? row.label.trim()
          : id;
      const accountId =
        typeof row.accountId === 'string' ? row.accountId.trim() : '';
      mapped.push({ id, label, accountId });
    }
    return mapped.length > 0 ? mapped : [];
  } catch {
    return MOCK_AWS_ACCOUNTS;
  }
}

function readStoredSelectedId(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_SELECTED);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

function writeStoredSelectedId(id: string): void {
  try {
    localStorage.setItem(STORAGE_SELECTED, id);
  } catch {
    /* ignore */
  }
}

interface AwsAccountContextValue {
  accounts: AwsConnectedAccount[];
  /** Null when no accounts are connected */
  selectedAccount: AwsConnectedAccount | null;
  selectAccount: (id: string) => void;
}

const AwsAccountContext = createContext<AwsAccountContextValue | undefined>(
  undefined,
);

export function AwsAccountProvider({ children }: { children: ReactNode }) {
  const { ensureMockFullScanIfEmpty } = useScanResults();
  const accounts = useMemo(() => parseAccountsFromEnv(), []);

  const initialId = useMemo(() => {
    if (accounts.length === 0) return null;
    const stored = readStoredSelectedId();
    if (stored && accounts.some((a: AwsConnectedAccount) => a.id === stored))
      return stored;
    return accounts[0].id;
  }, [accounts]);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedId(null);
      return;
    }
    if (
      selectedId === null ||
      !accounts.some((a: AwsConnectedAccount) => a.id === selectedId)
    ) {
      const next = accounts[0].id;
      setSelectedId(next);
      writeStoredSelectedId(next);
    }
  }, [accounts, selectedId]);

  const selectedAccount = useMemo(() => {
    if (selectedId === null) return null;
    return accounts.find((a: AwsConnectedAccount) => a.id === selectedId) ?? null;
  }, [accounts, selectedId]);

  useEffect(() => {
    if (!selectedAccount) return;
    ensureMockFullScanIfEmpty(
      selectedAccount.id,
      selectedAccount.accountId,
      selectedAccount.label,
    );
  }, [selectedAccount, ensureMockFullScanIfEmpty]);

  const selectAccount = useCallback(
    (id: string) => {
      if (!accounts.some((a: AwsConnectedAccount) => a.id === id)) return;
      setSelectedId(id);
      writeStoredSelectedId(id);
    },
    [accounts],
  );

  const value = useMemo(
    () => ({
      accounts,
      selectedAccount,
      selectAccount,
    }),
    [accounts, selectedAccount, selectAccount],
  );

  return (
    <AwsAccountContext.Provider value={value}>
      {children}
    </AwsAccountContext.Provider>
  );
}

export function useAwsAccount(): AwsAccountContextValue {
  const ctx = useContext(AwsAccountContext);
  if (!ctx) {
    throw new Error('useAwsAccount must be used within AwsAccountProvider');
  }
  return ctx;
}
