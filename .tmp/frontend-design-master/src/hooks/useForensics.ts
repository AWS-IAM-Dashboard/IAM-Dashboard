// React hooks for forensics data management - Demo Mode with simulated data

import { useState, useEffect, useCallback } from 'react';
import type { MemoryScanResult, Process, SystemStats } from '../lib/api';
import { 
  mockSystemStats, 
  mockProcesses, 
  mockMemoryScanResult, 
  mockRunningMemoryScan, 
  mockNotifications,
  simulateApiDelay
} from '../lib/mockData';

// Custom hook for memory scan management
export function useMemoryScan() {
  const [scanResult, setScanResult] = useState<MemoryScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Demo mode: simulate scan
      const mockScan = { ...mockRunningMemoryScan };
      setScanResult(mockScan);
      
      // Simulate scan progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        mockScan.progress = progress;
        setScanResult({ ...mockScan });
        
        if (progress >= 100) {
          clearInterval(interval);
          const completedScan = {
            ...mockMemoryScanResult,
            scan_id: mockScan.scan_id,
            status: 'Completed' as const,
            progress: 100
          };
          setScanResult(completedScan);
          setIsScanning(false);
        }
      }, 500);
    } catch (err) {
      setError('Demo scan simulation failed');
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(async () => {
    setIsScanning(false);
  }, []);

  // Load demo scan result on mount
  useEffect(() => {
    const loadDemoScan = async () => {
      await simulateApiDelay(300);
      setScanResult(mockMemoryScanResult);
    };
    loadDemoScan();
  }, []);

  return {
    scanResult,
    isScanning,
    error,
    startScan,
    stopScan,
  };
}

// Custom hook for system statistics
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await simulateApiDelay(300);
      setStats(mockSystemStats);
    } catch (err) {
      setError('Demo stats loading failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
}

// Custom hook for process management
export function useProcesses() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProcesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await simulateApiDelay(500);
      setProcesses(mockProcesses);
    } catch (err) {
      setError('Demo process loading failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const killProcess = useCallback(async (pid: number) => {
    try {
      // Simulate process termination in demo mode
      setProcesses(prev => prev.filter(p => p.pid !== pid));
      return true;
    } catch (err) {
      setError('Demo process termination failed');
      return false;
    }
  }, []);

  const detectHiddenProcesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await simulateApiDelay(2000);
      // Return suspicious processes as "hidden" in demo mode
      return mockProcesses.filter(p => p.status === 'Suspicious' || p.status === 'Dangerous');
    } catch (err) {
      setError('Demo hidden process detection failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  return {
    processes,
    loading,
    error,
    loadProcesses,
    killProcess,
    detectHiddenProcesses,
  };
}

// Custom hook for threat intelligence
export function useThreatIntel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeHash = useCallback(async (hash: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await simulateApiDelay(1000);
      // Return mock threat data for demo
      return {
        hash,
        detection_ratio: '12/67',
        threat_names: ['Trojan.Generic', 'PUP.Optional.Demo'],
        last_analysis_date: new Date().toISOString(),
        mitre_techniques: ['T1055', 'T1112'],
        reputation: hash.includes('malware') ? -85 : 0
      };
    } catch (err) {
      setError('Demo threat analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMitreMapping = useCallback(async (processName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await simulateApiDelay(500);
      // Return demo MITRE techniques based on process name
      if (processName.includes('malware') || processName.includes('suspicious')) {
        return ['T1055', 'T1112', 'T1082'];
      }
      return ['T1082']; // Basic system info for normal processes
    } catch (err) {
      setError('Demo MITRE mapping failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    analyzeHash,
    getMitreMapping,
  };
}

// Custom hook for real-time notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      await simulateApiDelay(200);
      setNotifications(mockNotifications);
    };

    loadNotifications();
    // Simulate new notifications periodically
    const interval = setInterval(() => {
      const newNotification = {
        id: Date.now(),
        type: 'info',
        title: 'Demo Update',
        message: 'This is a simulated notification in demo mode',
        timestamp: new Date().toISOString(),
        severity: 'low'
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 most recent
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  return { notifications };
}