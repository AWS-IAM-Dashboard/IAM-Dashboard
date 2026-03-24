/**
 * Scan Results Context
 * Stores scan results per AWS account connection for dashboard, reports, and scanners.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import type { ScanResponse } from '../services/api';

/** Keep in sync with first mock account id in AwsAccountContext (v1 storage migration). */
const V1_MIGRATION_ACCOUNT_KEY = 'mock-prod';

const STORAGE_V1_KEY = 'iam-dashboard-scan-results';
const STORAGE_V2_KEY = 'iam-dashboard-scan-results-by-account';

export interface StoredScanResult {
  scan_id: string;
  scanner_type: string;
  region: string;
  status: string;
  timestamp: string;
  results: any;
  scan_summary?: {
    critical_findings?: number;
    high_findings?: number;
    medium_findings?: number;
    low_findings?: number;
    users?: number;
    roles?: number;
    policies?: number;
    groups?: number;
    [key: string]: any;
  };
  findings?: any[];
}

interface ScanResultsContextType {
  scanResultsVersion: number;
  addScanResult: (accountKey: string, result: ScanResponse) => void;
  getScanResult: (
    accountKey: string,
    scannerType: string,
  ) => StoredScanResult | null;
  getAllScanResultsForAccount: (accountKey: string) => StoredScanResult[];
  clearScanResultsForAccount: (accountKey: string) => void;
  /** Seed deterministic mock full-scan data when an account has no scans (demo / until backend is wired). */
  ensureMockFullScanIfEmpty: (
    accountKey: string,
    awsAccountId: string,
    label: string,
  ) => void;
}

const ScanResultsContext = createContext<ScanResultsContextType | undefined>(
  undefined,
);

function loadFromStorage(): Map<string, Map<string, StoredScanResult>> {
  try {
    const v2raw = sessionStorage.getItem(STORAGE_V2_KEY);
    if (v2raw) {
      const parsed = JSON.parse(v2raw) as Record<
        string,
        [string, StoredScanResult][]
      >;
      const out = new Map<string, Map<string, StoredScanResult>>();
      for (const [acc, entries] of Object.entries(parsed)) {
        out.set(acc, new Map(entries));
      }
      return out;
    }

    const v1 = sessionStorage.getItem(STORAGE_V1_KEY);
    if (v1) {
      const entries: [string, StoredScanResult][] = JSON.parse(v1);
      const legacy = new Map(entries);
      const out = new Map<string, Map<string, StoredScanResult>>();
      out.set(V1_MIGRATION_ACCOUNT_KEY, legacy);
      return out;
    }
  } catch {
    /* ignore */
  }
  return new Map();
}

function saveToStorage(byAccount: Map<string, Map<string, StoredScanResult>>) {
  try {
    const obj: Record<string, [string, StoredScanResult][]> = {};
    for (const [acc, inner] of byAccount) {
      obj[acc] = Array.from(inner.entries());
    }
    sessionStorage.setItem(STORAGE_V2_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function ScanResultsProvider({ children }: { children: ReactNode }) {
  const [byAccount, setByAccount] = useState<
    Map<string, Map<string, StoredScanResult>>
  >(() => loadFromStorage());
  const [scanResultsVersion, setScanResultsVersion] = useState(0);
  const byAccountRef = useRef(byAccount);
  byAccountRef.current = byAccount;

  useEffect(() => {
    saveToStorage(byAccount);
    try {
      sessionStorage.removeItem(STORAGE_V1_KEY);
    } catch {
      /* ignore */
    }
  }, [byAccount]);

  const addScanResult = useCallback(
    (accountKey: string, result: ScanResponse) => {
      if (!accountKey || accountKey === '__none__') return;

      let scanSummary = result.results?.scan_summary;
      if (!scanSummary) {
        scanSummary = extractScanSummary(result.results);
      }
      let findings = extractFindings(result.results);

      const storedResult: StoredScanResult = {
        scan_id: result.scan_id,
        scanner_type: result.scanner_type,
        region: result.region,
        status: result.status,
        timestamp: result.timestamp,
        results: result.results,
        scan_summary: scanSummary,
        findings,
      };

      setByAccount((prev) => {
        const next = new Map(prev);
        const inner = new Map(next.get(accountKey) ?? []);
        inner.set(result.scanner_type, storedResult);
        next.set(accountKey, inner);
        return next;
      });
      setScanResultsVersion((v) => v + 1);
    },
    [],
  );

  const getScanResult = useCallback(
    (accountKey: string, scannerType: string): StoredScanResult | null => {
      return byAccount.get(accountKey)?.get(scannerType) ?? null;
    },
    [byAccount],
  );

  const getAllScanResultsForAccount = useCallback(
    (accountKey: string): StoredScanResult[] => {
      const inner = byAccount.get(accountKey);
      if (!inner) return [];
      return Array.from(inner.values());
    },
    [byAccount],
  );

  const clearScanResultsForAccount = useCallback((accountKey: string) => {
    setByAccount((prev) => {
      const next = new Map(prev);
      next.delete(accountKey);
      return next;
    });
    setScanResultsVersion((v) => v + 1);
  }, []);

  const ensureMockFullScanIfEmpty = useCallback(
    (accountKey: string, awsAccountId: string, label: string) => {
      if (!accountKey || accountKey === '__none__') return;

      const existing = byAccountRef.current.get(accountKey);
      if (existing && existing.size > 0) return;

      setByAccount((prev) => {
        const inner = prev.get(accountKey);
        if (inner && inner.size > 0) return prev;

        const mock = buildMockFullScanStored(accountKey, awsAccountId, label);
        const nextInner = new Map<string, StoredScanResult>();
        nextInner.set('full', mock);
        const next = new Map(prev);
        next.set(accountKey, nextInner);
        return next;
      });
      setScanResultsVersion((v) => v + 1);
    },
    [],
  );

  return (
    <ScanResultsContext.Provider
      value={{
        scanResultsVersion,
        addScanResult,
        getScanResult,
        getAllScanResultsForAccount,
        clearScanResultsForAccount,
        ensureMockFullScanIfEmpty,
      }}
    >
      {children}
    </ScanResultsContext.Provider>
  );
}

export function useScanResults() {
  const context = useContext(ScanResultsContext);
  if (context === undefined) {
    throw new Error('useScanResults must be used within a ScanResultsProvider');
  }
  return context;
}

function extractScanSummary(results: any): StoredScanResult['scan_summary'] {
  if (!results) return undefined;

  if (results.scan_type === 'full' || results.iam) {
    return {
      critical_findings: results.iam?.scan_summary?.critical_findings || 0,
      high_findings: results.iam?.scan_summary?.high_findings || 0,
      medium_findings: results.iam?.scan_summary?.medium_findings || 0,
      low_findings: results.iam?.scan_summary?.low_findings || 0,
      users: results.iam?.users?.total || 0,
      roles: results.iam?.roles?.total || 0,
      policies: results.iam?.policies?.total || 0,
      groups: results.iam?.groups?.total || 0,
    };
  }

  if (results.scan_summary) {
    return results.scan_summary;
  }

  if (results.users || results.roles) {
    return {
      users: results.users?.total || 0,
      roles: results.roles?.total || 0,
      policies: results.policies?.total || 0,
      groups: results.groups?.total || 0,
    };
  }

  if (results.buckets) {
    return {
      critical_findings: results.buckets.public || 0,
      high_findings: results.buckets.unencrypted || 0,
    };
  }

  if (results.instances) {
    return {
      critical_findings: results.instances.public || 0,
      high_findings: results.instances.without_imdsv2 || 0,
    };
  }

  if (results.access_analyzer?.scan_summary) {
    return results.access_analyzer.scan_summary;
  }

  if (results.vpc?.scan_summary) {
    return results.vpc.scan_summary;
  }

  if (results.dynamodb?.scan_summary) {
    return results.dynamodb.scan_summary;
  }

  if (Array.isArray(results.findings)) {
    const findings = results.findings;
    return {
      critical_findings: findings.filter((f: any) => f.severity === 'Critical')
        .length,
      high_findings: findings.filter((f: any) => f.severity === 'High').length,
      medium_findings: findings.filter((f: any) => f.severity === 'Medium')
        .length,
      low_findings: findings.filter((f: any) => f.severity === 'Low').length,
    };
  }

  return undefined;
}

function extractFindings(results: any): any[] {
  if (!results) return [];

  if (results.scan_type === 'full' || results.iam) {
    const allFindings: any[] = [];
    if (results.iam?.findings) allFindings.push(...results.iam.findings);
    if (allFindings.length > 0) {
      return allFindings;
    }
  }

  if (Array.isArray(results.findings) && results.findings.length > 0) {
    return results.findings;
  }

  if (Array.isArray(results.iam_findings) && results.iam_findings.length > 0) {
    return results.iam_findings;
  }

  if (
    Array.isArray(results.security_hub_findings) &&
    results.security_hub_findings.length > 0
  ) {
    return results.security_hub_findings;
  }

  if (
    Array.isArray(results.guardduty_findings) &&
    results.guardduty_findings.length > 0
  ) {
    return results.guardduty_findings;
  }

  if (
    Array.isArray(results.inspector_findings) &&
    results.inspector_findings.length > 0
  ) {
    return results.inspector_findings;
  }

  if (
    Array.isArray(results.config_findings) &&
    results.config_findings.length > 0
  ) {
    return results.config_findings;
  }

  if (
    Array.isArray(results.macie_findings) &&
    results.macie_findings.length > 0
  ) {
    return results.macie_findings;
  }

  if (results.users || results.roles) {
    const iamFindings: any[] = [];
    if (results.users?.findings && Array.isArray(results.users.findings)) {
      iamFindings.push(...results.users.findings);
    }
    if (results.roles?.findings && Array.isArray(results.roles.findings)) {
      iamFindings.push(...results.roles.findings);
    }
    if (results.policies?.findings && Array.isArray(results.policies.findings)) {
      iamFindings.push(...results.policies.findings);
    }
    if (iamFindings.length > 0) {
      return iamFindings;
    }
  }

  if (results.buckets) {
    const s3Findings: any[] = [];
    if (results.buckets.findings && Array.isArray(results.buckets.findings)) {
      s3Findings.push(...results.buckets.findings);
    }
    if (s3Findings.length > 0) {
      return s3Findings;
    }
  }

  if (results.instances) {
    const ec2Findings: any[] = [];
    if (
      results.instances.findings &&
      Array.isArray(results.instances.findings)
    ) {
      ec2Findings.push(...results.instances.findings);
    }
    if (ec2Findings.length > 0) {
      return ec2Findings;
    }
  }

  if (
    results.access_analyzer?.findings &&
    Array.isArray(results.access_analyzer.findings)
  ) {
    return results.access_analyzer.findings;
  }

  if (results.vpc?.findings && Array.isArray(results.vpc.findings)) {
    return results.vpc.findings;
  }

  if (
    results.dynamodb?.findings &&
    Array.isArray(results.dynamodb.findings)
  ) {
    return results.dynamodb.findings;
  }

  return [];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const mockFindingTemplates = [
  {
    finding_type: 'Public S3 bucket',
    description: 'Bucket policy allows public read',
    baseResource: 'logs-archive',
  },
  {
    finding_type: 'Unrestricted security group',
    description: 'Security group allows SSH from 0.0.0.0/0',
    baseResource: 'web-tier-sg',
  },
  {
    finding_type: 'IAM user without MFA',
    description: 'Console user has no MFA device',
    baseResource: 'breakglass-admin',
  },
  {
    finding_type: 'Overly permissive role',
    description: 'Role trust policy may allow unintended principals',
    baseResource: 'data-pipeline-role',
  },
  {
    finding_type: 'KMS key rotation disabled',
    description: 'Customer managed key has automatic rotation off',
    baseResource: 'app-secrets-key',
  },
];

function severityForIndex(
  i: number,
  critical: number,
  high: number,
  medium: number,
): string {
  if (i < critical) return 'Critical';
  if (i < critical + high) return 'High';
  if (i < critical + high + medium) return 'Medium';
  return 'Low';
}

function buildMockFullScanStored(
  accountKey: string,
  awsAccountId: string,
  accountLabel: string,
): StoredScanResult {
  const h = hashString(accountKey);
  const digits = awsAccountId?.replace(/\D/g, '') ?? '';
  const account =
    digits.length === 12
      ? digits
      : String(100000000000 + (h % 899999999999)).padStart(12, '0');
  const critical = 1 + (h % 3);
  const high = 2 + ((h >> 3) % 5);
  const medium = 2 + ((h >> 6) % 6);
  const low = 1 + ((h >> 9) % 4);
  const total = critical + high + medium + low;

  const findings = Array.from({ length: total }, (_, i) => {
    const tmpl = mockFindingTemplates[i % mockFindingTemplates.length];
    const severity = severityForIndex(i, critical, high, medium);
    return {
      id: `${accountKey}-mock-${i}`,
      severity,
      finding_type: tmpl.finding_type,
      resource_name: `${tmpl.baseResource}-${accountKey.slice(0, 4)}`,
      resource_arn: `arn:aws:iam::${account}:role/${tmpl.baseResource}`,
      description: `${tmpl.description} (${accountLabel})`,
      recommendation: 'Review and remediate per AWS security best practices',
      created_date: new Date(Date.now() - i * 3600000).toISOString(),
    };
  });

  const scan_summary = {
    critical_findings: critical,
    high_findings: high,
    medium_findings: medium,
    low_findings: low,
    users: 8 + (h % 12),
    roles: 15 + (h % 20),
    policies: 20 + (h % 15),
    groups: 3 + (h % 5),
  };

  const results = {
    scan_type: 'full',
    status: 'completed',
    iam: {
      findings,
      scan_summary,
      users: { total: scan_summary.users },
      roles: { total: scan_summary.roles },
      policies: { total: scan_summary.policies },
      groups: { total: scan_summary.groups },
    },
  };

  return {
    scan_id: `mock-full-${accountKey}-${h}`,
    scanner_type: 'full',
    region: 'us-east-1',
    status: 'completed',
    timestamp: new Date().toISOString(),
    results,
    scan_summary,
    findings,
  };
}
