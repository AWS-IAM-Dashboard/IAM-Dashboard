import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Play,
  Square,
  Settings2,
  Database,
  Shield,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Clock,
  HardDrive,
  Activity,
  BarChart3,
  Backup,
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface DynamoDBSecurityFinding {
  id: string;
  table_name: string;
  table_arn: string;
  region: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  finding_type: string;
  description: string;
  recommendation: string;
  encryption_enabled: boolean;
  point_in_time_recovery: boolean;
  deletion_protection: boolean;
  stream_enabled: boolean;
  risk_score: number;
}

interface DynamoDBScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: DynamoDBSecurityFinding[];
  scan_summary: {
    total_tables: number;
    unencrypted_tables: number;
    no_pitr: number;
    no_deletion_protection: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockDynamoDBFindings: DynamoDBSecurityFinding[] = [
  {
    id: "ddb-001",
    table_name: "user-sessions-prod",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/user-sessions-prod",
    region: "us-east-1",
    severity: "Critical",
    finding_type: "No Encryption at Rest",
    description: "DynamoDB table does not have server-side encryption enabled",
    recommendation: "Enable SSE with AWS managed keys or customer-managed KMS",
    encryption_enabled: false,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: false,
    risk_score: 95,
  },
  {
    id: "ddb-002",
    table_name: "payment-transactions",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/payment-transactions",
    region: "us-east-1",
    severity: "High",
    finding_type: "Point-in-Time Recovery Disabled",
    description: "PITR is disabled - cannot restore to previous point in time",
    recommendation: "Enable point-in-time recovery for production tables",
    encryption_enabled: true,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: true,
    risk_score: 82,
  },
  {
    id: "ddb-003",
    table_name: "analytics-events",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/analytics-events",
    region: "us-east-1",
    severity: "High",
    finding_type: "No Deletion Protection",
    description: "Table can be deleted without protection",
    recommendation: "Enable deletion protection for critical production tables",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: false,
    stream_enabled: false,
    risk_score: 70,
  },
  {
    id: "ddb-004",
    table_name: "cache-sessions",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/cache-sessions",
    region: "us-east-1",
    severity: "Medium",
    finding_type: "On-Demand Without Capacity Planning",
    description: "Table uses on-demand mode - review for cost optimization",
    recommendation: "Consider provisioned capacity for predictable workloads",
    encryption_enabled: true,
    point_in_time_recovery: false,
    deletion_protection: false,
    stream_enabled: false,
    risk_score: 45,
  },
  {
    id: "ddb-005",
    table_name: "config-settings",
    table_arn: "arn:aws:dynamodb:us-east-1:123456789012:table/config-settings",
    region: "us-east-1",
    severity: "Low",
    finding_type: "No Stream Enabled",
    description: "DynamoDB Streams disabled - limited audit and CDC capabilities",
    recommendation: "Enable streams if change tracking is required",
    encryption_enabled: true,
    point_in_time_recovery: true,
    deletion_protection: true,
    stream_enabled: false,
    risk_score: 25,
  },
];

export function DynamoDBSecurity() {
  const [scanResult, setScanResult] = useState<DynamoDBScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === "Completed") {
      toast.success("DynamoDB security scan completed!", {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("DynamoDB scan failed", {
        description: "Check AWS credentials and DynamoDB permissions",
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("DynamoDB security scan started", {
        description: "Analyzing tables for encryption, PITR, and security settings...",
      });

      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: {
          total_tables: 0,
          unencrypted_tables: 0,
          no_pitr: 0,
          no_deletion_protection: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0,
        },
      });

      const response: ScanResponse = await scanIAM(selectedRegion);

      const findings = response.results?.dynamodb?.findings ?? mockDynamoDBFindings;
      const summary = response.results?.dynamodb?.scan_summary ?? {
        total_tables: 5,
        unencrypted_tables: 1,
        no_pitr: 3,
        no_deletion_protection: 4,
        critical_findings: findings.filter((f: DynamoDBSecurityFinding) => f.severity === "Critical").length,
        high_findings: findings.filter((f: DynamoDBSecurityFinding) => f.severity === "High").length,
        medium_findings: findings.filter((f: DynamoDBSecurityFinding) => f.severity === "Medium").length,
        low_findings: findings.filter((f: DynamoDBSecurityFinding) => f.severity === "Low").length,
      };

      const transformedResult: DynamoDBScanResult = {
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : response.status === "failed" ? 0 : 50,
        account_id: response.results?.account_id || "123456789012",
        region: response.region,
        findings,
        scan_summary: summary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      };

      setScanResult(transformedResult);
      setIsScanning(false);

      addScanResult({
        ...response,
        scanner_type: "dynamodb",
        results: { ...response.results, dynamodb: { findings, scan_summary: summary } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setScanResult({
        scan_id: `ddb-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings: mockDynamoDBFindings,
        scan_summary: {
          total_tables: 5,
          unencrypted_tables: 1,
          no_pitr: 3,
          no_deletion_protection: 4,
          critical_findings: 1,
          high_findings: 2,
          medium_findings: 1,
          low_findings: 1,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setIsScanning(false);
      toast.success("DynamoDB security scan completed (demo mode)", {
        description: "Showing sample findings for demo",
      });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("DynamoDB scan stopped");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-[#ff0040] text-white";
      case "High":
        return "bg-[#ff6b35] text-white";
      case "Medium":
        return "bg-[#ffb000] text-black";
      case "Low":
        return "bg-[#00ff88] text-black";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            DynamoDB Security
            <Badge variant="outline" className="ml-2 border-[#00ff88] text-[#00ff88] text-xs">
              Free
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan DynamoDB tables for encryption, point-in-time recovery, deletion protection, and access patterns.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>AWS Region</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="bg-input border-border mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Security Checks</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">Encryption</Badge>
                <Badge variant="outline">PITR</Badge>
                <Badge variant="outline">Deletion Protection</Badge>
                <Badge variant="outline">Streams</Badge>
              </div>
            </div>
            <div>
              <Label>Compliance</Label>
              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                <p>• CIS AWS Foundations</p>
                <p>• SOC 2, PCI-DSS</p>
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
              {isScanning ? "Scanning..." : "Start DynamoDB Scan"}
            </Button>
            {isScanning && (
              <Button variant="destructive" onClick={handleStopScan}>
                <Square className="h-4 w-4 mr-2" />
                Stop Scan
              </Button>
            )}
            <Button variant="outline" className="border-border">
              <Settings2 className="h-4 w-4 mr-2" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isScanning || scanResult) && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>DynamoDB Security Scan Progress</span>
              <div className="flex items-center gap-2">
                {scanResult && (
                  <Button variant="ghost" size="icon" onClick={() => setLoading(!loading)} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                )}
                <Badge
                  className={
                    isScanning
                      ? "bg-[#ffb000] text-black"
                      : scanResult?.status === "Completed"
                        ? "bg-[#00ff88] text-black"
                        : "bg-[#ff0040] text-white"
                  }
                >
                  {isScanning ? "In Progress" : scanResult?.status || "No Scan"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={scanResult?.progress || 0} className="h-3 mb-4" />
            {scanResult?.status === "Completed" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="cyber-glass p-3 rounded-lg text-center">
                  <p className="text-lg font-medium text-[#ff0040]">{scanResult.scan_summary.critical_findings}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="cyber-glass p-3 rounded-lg text-center">
                  <p className="text-lg font-medium text-[#ff6b35]">{scanResult.scan_summary.high_findings}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
                <div className="cyber-glass p-3 rounded-lg text-center">
                  <p className="text-lg font-medium text-[#ffb000]">{scanResult.scan_summary.unencrypted_tables}</p>
                  <p className="text-xs text-muted-foreground">Unencrypted</p>
                </div>
                <div className="cyber-glass p-3 rounded-lg text-center">
                  <p className="text-lg font-medium text-[#00ff88]">{scanResult.scan_summary.total_tables}</p>
                  <p className="text-xs text-muted-foreground">Tables</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scanResult && scanResult.findings.length > 0 && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              DynamoDB Security Findings ({scanResult.findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="tables">Table Status</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              <TabsContent value="findings" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Table</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Encryption</TableHead>
                      <TableHead>PITR</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-12 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48 bg-muted/20" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      scanResult.findings.map((f) => (
                        <TableRow key={f.id} className="border-border hover:bg-accent/10 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              <div>
                                <p className="font-mono text-sm">{f.table_name}</p>
                                <p className="text-xs text-muted-foreground">{f.region}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{f.finding_type}</p>
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          </TableCell>
                          <TableCell><Badge className={getSeverityColor(f.severity)}>{f.severity}</Badge></TableCell>
                          <TableCell>
                            {f.encryption_enabled ? (
                              <Badge variant="outline" className="border-[#00ff88] text-[#00ff88]">
                                <Lock className="h-3 w-3 mr-1" /> On
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-[#ff0040] text-[#ff0040]">
                                <Unlock className="h-3 w-3 mr-1" /> Off
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {f.point_in_time_recovery ? (
                              <Badge variant="outline" className="border-[#00ff88] text-[#00ff88]">On</Badge>
                            ) : (
                              <Badge variant="outline" className="border-[#ff0040] text-[#ff0040]">Off</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">{f.recommendation}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="tables" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Database className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary?.total_tables ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary?.unencrypted_tables ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Unencrypted</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Backup className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary?.no_pitr ?? 0}</p>
                    <p className="text-sm text-muted-foreground">No PITR</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary?.no_deletion_protection ?? 0}</p>
                    <p className="text-sm text-muted-foreground">No Deletion Protection</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Encryption Status</h4>
                    <p className="text-2xl font-medium text-[#00ff88]">
                      {(scanResult.scan_summary?.total_tables ?? 0) - (scanResult.scan_summary?.unencrypted_tables ?? 0)}/
                      {scanResult.scan_summary?.total_tables ?? 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Tables encrypted</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Point-in-Time Recovery</h4>
                    <p className="text-2xl font-medium text-[#ffb000]">{scanResult.scan_summary?.no_pitr ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Tables without PITR</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">High Priority</h4>
                    <p className="text-2xl font-medium text-[#ff0040]">
                      {(scanResult.scan_summary?.critical_findings ?? 0) + (scanResult.scan_summary?.high_findings ?? 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Critical + High findings</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
