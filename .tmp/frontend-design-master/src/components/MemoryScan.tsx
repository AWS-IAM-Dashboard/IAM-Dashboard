import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { Play, Square, Settings2, FileUp, Scan, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useMemoryScan, useProcesses } from "../hooks/useForensics";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function MemoryScan() {
  const { scanResult, isScanning, error, startScan, stopScan } = useMemoryScan();
  const { processes, loading: processesLoading, loadProcesses } = useProcesses();
  const [scanConfig, setScanConfig] = useState({
    deepScan: false,
    memoryDumpPath: '',
    scanHiddenProcesses: true,
    analyzeInjecturedCode: true
  });

  // Toast notifications for scan events
  useEffect(() => {
    if (scanResult?.status === 'Completed') {
      toast.success('Memory scan completed successfully!', {
        description: `Found ${scanResult.suspicious_processes + scanResult.dangerous_processes} suspicious items`
      });
    } else if (scanResult?.status === 'Failed') {
      toast.error('Memory scan failed', {
        description: 'Check system permissions and try again'
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    try {
      await startScan();
      toast.info('Memory scan started', {
        description: 'Analyzing system memory and processes...'
      });
    } catch (err) {
      toast.error('Failed to start scan', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const handleStopScan = async () => {
    try {
      await stopScan();
      toast.warning('Scan stopped', {
        description: 'Memory scan was interrupted'
      });
    } catch (err) {
      toast.error('Failed to stop scan');
    }
  };

  const getScanResults = () => {
    if (scanResult?.processes) {
      return scanResult.processes.map(process => ({
        id: process.pid,
        processName: process.name,
        pid: process.pid,
        memoryUsage: `${(process.memory_usage / 1024 / 1024).toFixed(1)} MB`,
        status: process.status,
        priority: process.threads > 10 ? 'High' : process.threads > 5 ? 'Normal' : 'Low',
        path: process.path,
        hash: process.hash,
        threatScore: process.threat_score
      }));
    }
    return [];
  };

  const scanResults = getScanResults();

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      {/* Scan Configuration */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Memory Scan Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="scan-target">Scan Target</Label>
                <Input 
                  id="scan-target"
                  placeholder="Full System Memory"
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="memory-dump">Upload Memory Dump (Optional)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="memory-dump"
                    type="file"
                    accept=".dmp,.mem,.raw"
                    className="bg-input border-border"
                  />
                  <Button variant="outline" className="border-border">
                    <FileUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Scan Options</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Deep Memory Analysis</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Process Injection Detection</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Rootkit Detection</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleStartScan}
              disabled={isScanning}
              className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow"
            >
              <Play className="h-4 w-4 mr-2" />
              {isScanning ? "Scanning..." : "Start Scan"}
            </Button>
            
            {isScanning && (
              <Button 
                onClick={handleStopScan}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Scan
              </Button>
            )}
            
            <Button variant="outline" className="border-border">
              <Settings2 className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Scan Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Scan Progress */}
      {(isScanning || scanResult) && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scan Progress</span>
              <div className="flex items-center gap-2">
                {scanResult && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={loadProcesses}
                    disabled={processesLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${processesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Badge 
                  variant={isScanning ? "secondary" : scanResult?.status === "Completed" ? "default" : "destructive"}
                  className={
                    isScanning ? "bg-[#ffb000] text-black" : 
                    scanResult?.status === "Completed" ? "bg-[#00ff88] text-black" : 
                    "bg-[#ff0040] text-white"
                  }
                >
                  {isScanning ? "In Progress" : scanResult?.status || "No Scan"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress 
                value={scanResult?.progress || 0} 
                className="h-3" 
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {isScanning ? 'Scanning memory segments...' : 
                   scanResult ? `Scanned ${scanResult.total_processes} processes` :
                   'Ready to scan'}
                </span>
                <span>{scanResult?.progress || 0}%</span>
              </div>
              
              {scanResult && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="cyber-glass p-3 rounded-lg text-center">
                    <p className="text-lg font-medium text-[#00ff88]">
                      {scanResult.total_processes - scanResult.suspicious_processes - scanResult.dangerous_processes}
                    </p>
                    <p className="text-xs text-muted-foreground">Safe</p>
                  </div>
                  <div className="cyber-glass p-3 rounded-lg text-center">
                    <p className="text-lg font-medium text-[#ffb000]">
                      {scanResult.suspicious_processes}
                    </p>
                    <p className="text-xs text-muted-foreground">Suspicious</p>
                  </div>
                  <div className="cyber-glass p-3 rounded-lg text-center">
                    <p className="text-lg font-medium text-[#ff0040]">
                      {scanResult.dangerous_processes}
                    </p>
                    <p className="text-xs text-muted-foreground">Dangerous</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Detailed Scan Results ({scanResults.length} processes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Process Name</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Memory Usage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Threat Score</TableHead>
                  <TableHead>Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processesLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index} className="border-border">
                      <TableCell><Skeleton className="h-4 w-24 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 bg-muted/20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  scanResults.map((result) => (
                    <TableRow 
                      key={result.id} 
                      className="border-border cursor-pointer hover:bg-accent/10 transition-colors"
                    >
                      <TableCell className="font-mono">{result.processName}</TableCell>
                      <TableCell>{result.pid}</TableCell>
                      <TableCell>{result.memoryUsage}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            result.priority === "High" ? "border-[#ffb000] text-[#ffb000]" :
                            result.priority === "Normal" ? "border-[#0ea5e9] text-[#0ea5e9]" :
                            "border-border"
                          }
                        >
                          {result.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={result.status === "Safe" ? "default" : result.status === "Suspicious" ? "secondary" : "destructive"}
                          className={
                            result.status === "Safe" ? "bg-[#00ff88] text-black" :
                            result.status === "Suspicious" ? "bg-[#ffb000] text-black" :
                            "bg-[#ff0040] text-white"
                          }
                        >
                          {result.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={
                          (result.threatScore || 0) > 70 ? "text-[#ff0040]" :
                          (result.threatScore || 0) > 30 ? "text-[#ffb000]" :
                          "text-[#00ff88]"
                        }>
                          {result.threatScore || 0}/100
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {result.path || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}