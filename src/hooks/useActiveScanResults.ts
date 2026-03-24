import { useMemo, useCallback } from 'react';
import { useAwsAccount } from '../context/AwsAccountContext';
import { useScanResults } from '../context/ScanResultsContext';
import type { ScanResponse } from '../services/api';
import type { StoredScanResult } from '../context/ScanResultsContext';

/**
 * Scan results and mutators scoped to the currently selected AWS account.
 */
export function useActiveScanResults() {
  const { selectedAccount } = useAwsAccount();
  const scan = useScanResults();

  const accountKey = selectedAccount?.id ?? '__none__';

  const scanResults = useMemo(
    () => scan.getAllScanResultsForAccount(accountKey),
    [accountKey, scan.scanResultsVersion, scan.getAllScanResultsForAccount],
  );

  const scanResultsMap = useMemo(() => {
    const m = new Map<string, StoredScanResult>();
    for (const r of scanResults) {
      m.set(r.scanner_type, r);
    }
    return m;
  }, [scanResults]);

  const addScanResult = useCallback(
    (result: ScanResponse) => scan.addScanResult(accountKey, result),
    [scan, accountKey],
  );

  const getScanResult = useCallback(
    (scannerType: string) => scan.getScanResult(accountKey, scannerType),
    [scan, accountKey],
  );

  const getAllScanResults = useCallback(
    () => scan.getAllScanResultsForAccount(accountKey),
    [scan, accountKey, scan.getAllScanResultsForAccount],
  );

  const clearScanResults = useCallback(
    () => scan.clearScanResultsForAccount(accountKey),
    [scan, accountKey],
  );

  return {
    scanResults,
    scanResultsMap,
    scanResultsVersion: scan.scanResultsVersion,
    selectedAccountKey: accountKey,
    addScanResult,
    getScanResult,
    getAllScanResults,
    clearScanResults,
  };
}
