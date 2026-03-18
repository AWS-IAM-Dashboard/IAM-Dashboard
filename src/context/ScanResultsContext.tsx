/**
 * Scan Results Context
 * Stores scan results from all scanner components for use in Reports
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ScanResponse } from '../services/api';
import { applySuppression, computeSeverityCounts, deduplicateFindings } from '../utils/findingsDedup';

const STORAGE_KEY = 'iam-dashboard-scan-results';

const STORAGE_KEY = 'iam-dashboard-scan-results';

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
  scanResults: Map<string, StoredScanResult>;
  scanResultsVersion: number; // Version counter that increments on every update
  addScanResult: (result: ScanResponse) => void;
  getScanResult: (scannerType: string) => StoredScanResult | null;
  getAllScanResults: () => StoredScanResult[];
  clearScanResults: () => void;
}

const ScanResultsContext = createContext<ScanResultsContextType | undefined>(undefined);

function loadFromStorage(): Map<string, StoredScanResult> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string, StoredScanResult][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveToStorage(map: Map<string, StoredScanResult>) {
  try {
    const entries = Array.from(map.entries());
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable -- silently degrade
  }
}

export function ScanResultsProvider({ children }: { children: ReactNode }) {
  const [scanResults, setScanResults] = useState<Map<string, StoredScanResult>>(() => loadFromStorage());
  const [scanResultsVersion, setScanResultsVersion] = useState(0); // Version counter

  useEffect(() => {
    saveToStorage(scanResults);
  }, [scanResults]);

  const addScanResult = useCallback((result: ScanResponse) => {
    // Extract scan summary - try multiple locations
    let scanSummary = result.results?.scan_summary;
    if (!scanSummary) {
      scanSummary = extractScanSummary(result.results);
    }
    
    // Extract findings - try multiple locations
    const rawFindings = extractFindings(result.results);
    const suppressedFindings = applySuppression(rawFindings);
    const findings = deduplicateFindings(suppressedFindings);
    const computedSeverityCounts = computeSeverityCounts(findings);
    const scanSummaryWithCounts: StoredScanResult['scan_summary'] = {
      ...(scanSummary ?? {}),
      ...computedSeverityCounts,
    };
    
    const storedResult: StoredScanResult = {
      scan_id: result.scan_id,
      scanner_type: result.scanner_type,
      region: result.region,
      status: result.status,
      timestamp: result.timestamp,
      results: result.results,
      scan_summary: scanSummaryWithCounts,
      findings: findings
    };
    
    setScanResults((prev: Map<string, StoredScanResult>) => {
      const newMap = new Map(prev);
      newMap.set(result.scanner_type, storedResult);
      return newMap;
    });
    
    // Increment version to trigger re-renders in components using this context
    // This ensures Dashboard updates even when replacing an existing scan result
    setScanResultsVersion((v: number) => v + 1);
  }, []);

  const getScanResult = useCallback((scannerType: string): StoredScanResult | null => {
    return scanResults.get(scannerType) || null;
  }, [scanResults]);

  const getAllScanResults = useCallback((): StoredScanResult[] => {
    return Array.from(scanResults.values());
  }, [scanResults]);

  const clearScanResults = useCallback(() => {
    setScanResults(new Map());
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ScanResultsContext.Provider
      value={{
        scanResults,
        scanResultsVersion,
        addScanResult,
        getScanResult,
        getAllScanResults,
        clearScanResults
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

/**
 * Extract scan summary from various result formats
 */
function extractScanSummary(results: any): StoredScanResult['scan_summary'] {
  if (!results) return undefined;

  // For full scan, extract summary from IAM only
  if (results.scan_type === 'full' || results.iam) {
    return {
      critical_findings: results.iam?.scan_summary?.critical_findings || 0,
      high_findings: results.iam?.scan_summary?.high_findings || 0,
      medium_findings: results.iam?.scan_summary?.medium_findings || 0,
      low_findings: results.iam?.scan_summary?.low_findings || 0,
      users: results.iam?.users?.total || 0,
      roles: results.iam?.roles?.total || 0,
      policies: results.iam?.policies?.total || 0,
      groups: results.iam?.groups?.total || 0
    };
  }

  // Try to find summary in different possible locations
  if (results.scan_summary) {
    return results.scan_summary;
  }

  // For IAM scans
  if (results.users || results.roles) {
    return {
      users: results.users?.total || 0,
      roles: results.roles?.total || 0,
      policies: results.policies?.total || 0,
      groups: results.groups?.total || 0
    };
  }

  // For S3 scans
  if (results.buckets) {
    return {
      critical_findings: results.buckets.public || 0,
      high_findings: results.buckets.unencrypted || 0
    };
  }

  // For EC2 scans
  if (results.instances) {
    return {
      critical_findings: results.instances.public || 0,
      high_findings: results.instances.without_imdsv2 || 0
    };
  }

  // For findings-based scans
  if (Array.isArray(results.findings)) {
    const findings = results.findings;
    const norm = (f: any) => String(f?.severity ?? '').toLowerCase();
    return {
      critical_findings: findings.filter((f: any) => norm(f) === 'critical').length,
      high_findings: findings.filter((f: any) => norm(f) === 'high').length,
      medium_findings: findings.filter((f: any) => norm(f) === 'medium').length,
      low_findings: findings.filter((f: any) => norm(f) === 'low').length
    };
  }

  return undefined;
}

/**
 * Extract findings from various possible locations in scan results
 */
function extractFindings(results: any): any[] {
  if (!results) return [];

  // Collect findings from every known location; deduplication later collapses duplicates.
  const allFindings: any[] = [];
  const addArray = (maybeArr: unknown) => {
    if (Array.isArray(maybeArr) && maybeArr.length > 0) allFindings.push(...maybeArr);
  };

  // Top-level conventions
  addArray(results.findings);
  addArray(results.iam_findings);
  addArray(results.security_hub_findings);
  addArray(results.guardduty_findings);
  addArray(results.inspector_findings);
  addArray(results.config_findings);
  addArray(results.macie_findings);

  // IAM nested
  addArray(results.iam?.findings);
  if (results.users?.findings) addArray(results.users.findings);
  if (results.roles?.findings) addArray(results.roles.findings);
  if (results.policies?.findings) addArray(results.policies.findings);

  // S3 nested
  if (results.buckets?.findings) addArray(results.buckets.findings);

  // EC2 nested
  if (results.instances?.findings) addArray(results.instances.findings);

  return allFindings;
}

