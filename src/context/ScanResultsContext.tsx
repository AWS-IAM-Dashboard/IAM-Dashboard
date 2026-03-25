/**
 * Scan Results Context
 * Stores scan results from all scanner components for use in Reports
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ScanResponse } from '../services/api';

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

export function ScanResultsProvider({ children }: { children: ReactNode }) {
  const [scanResults, setScanResults] = useState<Map<string, StoredScanResult>>(new Map());
  const [scanResultsVersion, setScanResultsVersion] = useState(0); // Version counter

  const addScanResult = (result: ScanResponse) => {
    // Extract scan summary - try multiple locations
    let scanSummary = result.results?.scan_summary;
    if (!scanSummary) {
      scanSummary = extractScanSummary(result.results);
    }
    
    // Extract findings - try multiple locations
    let findings = extractFindings(result.results);
    
    const storedResult: StoredScanResult = {
      scan_id: result.scan_id,
      scanner_type: result.scanner_type,
      region: result.region,
      status: result.status,
      timestamp: result.timestamp,
      results: result.results,
      scan_summary: scanSummary,
      findings: findings
    };
    
    setScanResults(prev => {
      const newMap = new Map(prev);
      newMap.set(result.scanner_type, storedResult);
      return newMap;
    });
    
    // Increment version to trigger re-renders in components using this context
    // This ensures Dashboard updates even when replacing an existing scan result
    setScanResultsVersion(v => v + 1);
  };

  const getScanResult = (scannerType: string): StoredScanResult | null => {
    return scanResults.get(scannerType) || null;
  };

  const getAllScanResults = (): StoredScanResult[] => {
    return Array.from(scanResults.values());
  };

  const clearScanResults = () => {
    setScanResults(new Map());
  };

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
    return {
      critical_findings: findings.filter((f: any) => f.severity === 'Critical').length,
      high_findings: findings.filter((f: any) => f.severity === 'High').length,
      medium_findings: findings.filter((f: any) => f.severity === 'Medium').length,
      low_findings: findings.filter((f: any) => f.severity === 'Low').length
    };
  }

  return undefined;
}

/**
 * Extract findings from various possible locations in scan results
 */
function extractFindings(results: any): any[] {
  if (!results) return [];
  
  // For full scan, extract findings from IAM only
  if (results.scan_type === 'full' || results.iam) {
    const allFindings: any[] = [];
    
    // Extract findings from IAM only
    if (results.iam?.findings) allFindings.push(...results.iam.findings);
    
    if (allFindings.length > 0) {
      return allFindings;
    }
  }
  
  // Direct findings array
  if (Array.isArray(results.findings) && results.findings.length > 0) {
    return results.findings;
  }
  
  // IAM-specific findings
  if (Array.isArray(results.iam_findings) && results.iam_findings.length > 0) {
    return results.iam_findings;
  }
  
  // Security Hub findings
  if (Array.isArray(results.security_hub_findings) && results.security_hub_findings.length > 0) {
    return results.security_hub_findings;
  }
  
  // GuardDuty findings
  if (Array.isArray(results.guardduty_findings) && results.guardduty_findings.length > 0) {
    return results.guardduty_findings;
  }
  
  // Inspector findings
  if (Array.isArray(results.inspector_findings) && results.inspector_findings.length > 0) {
    return results.inspector_findings;
  }
  
  // Config findings
  if (Array.isArray(results.config_findings) && results.config_findings.length > 0) {
    return results.config_findings;
  }
  
  // Macie findings
  if (Array.isArray(results.macie_findings) && results.macie_findings.length > 0) {
    return results.macie_findings;
  }
  
  // For IAM scans, check if findings are nested in users/roles
  if (results.users || results.roles) {
    const iamFindings: any[] = [];
    
    // Check users for findings
    if (results.users?.findings && Array.isArray(results.users.findings)) {
      iamFindings.push(...results.users.findings);
    }
    
    // Check roles for findings
    if (results.roles?.findings && Array.isArray(results.roles.findings)) {
      iamFindings.push(...results.roles.findings);
    }
    
    // Check policies for findings
    if (results.policies?.findings && Array.isArray(results.policies.findings)) {
      iamFindings.push(...results.policies.findings);
    }
    
    if (iamFindings.length > 0) {
      return iamFindings;
    }
  }
  
  // For S3 scans, check buckets for findings
  if (results.buckets) {
    const s3Findings: any[] = [];
    
    if (results.buckets.findings && Array.isArray(results.buckets.findings)) {
      s3Findings.push(...results.buckets.findings);
    }
    
    if (s3Findings.length > 0) {
      return s3Findings;
    }
  }
  
  // For EC2 scans, check instances for findings
  if (results.instances) {
    const ec2Findings: any[] = [];
    
    if (results.instances.findings && Array.isArray(results.instances.findings)) {
      ec2Findings.push(...results.instances.findings);
    }
    
    if (ec2Findings.length > 0) {
      return ec2Findings;
    }
  }
  
  return [];
}

