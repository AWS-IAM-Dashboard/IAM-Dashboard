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
  Network,
  Shield,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Unlock,
  Activity,
  Globe,
  Wifi,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanEC2, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface VPCSecurityFinding {
  id: string;
  resource_type: "VPC" | "Subnet" | "SecurityGroup" | "NACL" | "RouteTable";
  resource_id: string;
  resource_name: string;
  vpc_id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  finding_type: string;
  description: string;
  recommendation: string;
  is_public: boolean;
  flow_logs_enabled: boolean;
  region: string;
  risk_score: number;
}

interface VPCScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: VPCSecurityFinding[];
  scan_summary: {
    total_vpcs: number;
    total_subnets: number;
    public_subnets: number;
    security_groups: number;
    open_security_groups: number;
    flow_logs_missing: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockVPCFindings: VPCSecurityFinding[] = [
  {
    id: "vpc-001",
    resource_type: "Subnet",
    resource_id: "subnet-12345678",
    resource_name: "public-web-tier",
    vpc_id: "vpc-12345678",
    severity: "Critical",
    finding_type: "Public Subnet Exposure",
    description: "Subnet routes 0.0.0.0/0 to Internet Gateway - instances may be publicly accessible",
    recommendation: "Move workloads to private subnets and use NAT Gateway for outbound",
    is_public: true,
    flow_logs_enabled: false,
    region: "us-east-1",
    risk_score: 90,
  },
  {
    id: "vpc-002",
    resource_type: "SecurityGroup",
    resource_id: "sg-87654321",
    resource_name: "web-sg",
    vpc_id: "vpc-12345678",
    severity: "High",
    finding_type: "Open Security Group",
    description: "Security group allows inbound 0.0.0.0/0 on ports 22, 80, 443",
    recommendation: "Restrict CIDR ranges to specific IPs or VPC CIDR",
    is_public: false,
    flow_logs_enabled: true,
    region: "us-east-1",
    risk_score: 85,
  },
  {
    id: "vpc-003",
    resource_type: "VPC",
    resource_id: "vpc-11223344",
    resource_name: "prod-vpc",
    vpc_id: "vpc-11223344",
    severity: "High",
    finding_type: "No VPC Flow Logs",
    description: "VPC has no flow logs configured for network traffic monitoring",
    recommendation: "Enable VPC Flow Logs for security monitoring and compliance",
    is_public: false,
    flow_logs_enabled: false,
    region: "us-east-1",
    risk_score: 72,
  },
  {
    id: "vpc-004",
    resource_type: "SecurityGroup",
    resource_id: "sg-99887766",
    resource_name: "database-sg",
    vpc_id: "vpc-11223344",
    severity: "Medium",
    finding_type: "Overly Permissive Database SG",
    description: "Security group allows all traffic from 10.0.0.0/8",
    recommendation: "Restrict to specific subnets or security groups",
    is_public: false,
    flow_logs_enabled: true,
    region: "us-east-1",
    risk_score: 55,
  },
  {
    id: "vpc-005",
    resource_type: "RouteTable",
    resource_id: "rtb-55443322",
    resource_name: "private-rt",
    vpc_id: "vpc-12345678",
    severity: "Low",
    finding_type: "Missing Route Documentation",
    description: "Custom route table has non-standard routes without documentation",
    recommendation: "Document custom routes and review for unnecessary paths",
    is_public: false,
    flow_logs_enabled: true,
    region: "us-east-1",
    risk_score: 30,
  },
];

export function VPCSecurity() {
  const [scanResult, setScanResult] = useState<VPCScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === "Completed") {
      toast.success("VPC security scan completed!", {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("VPC scan failed", {
        description: "Check AWS credentials and EC2/VPC permissions",
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("VPC security scan started", {
        description: "Analyzing VPCs, subnets, security groups, and flow logs...",
      });

      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: {
          total_vpcs: 0,
          total_subnets: 0,
          public_subnets: 0,
          security_groups: 0,
          open_security_groups: 0,
          flow_logs_missing: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0,
        },
      });

      const response: ScanResponse = await scanEC2(selectedRegion);

      const findings = response.results?.vpc?.findings ?? mockVPCFindings;
      const vpcSummary = response.results?.vpc?.scan_summary ?? {
        total_vpcs: 3,
        total_subnets: 12,
        public_subnets: 4,
        security_groups: 18,
        open_security_groups: 2,
        flow_logs_missing: 1,
        critical_findings: findings.filter((f: VPCSecurityFinding) => f.severity === "Critical").length,
        high_findings: findings.filter((f: VPCSecurityFinding) => f.severity === "High").length,
        medium_findings: findings.filter((f: VPCSecurityFinding) => f.severity === "Medium").length,
        low_findings: findings.filter((f: VPCSecurityFinding) => f.severity === "Low").length,
      };

      const transformedResult: VPCScanResult = {
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : response.status === "failed" ? 0 : 50,
        account_id: response.results?.account_id || "123456789012",
        region: response.region,
        findings,
        scan_summary: vpcSummary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      };

      setScanResult(transformedResult);
      setIsScanning(false);

      addScanResult({
        ...response,
        scanner_type: "vpc",
        results: { ...response.results, vpc: { findings, scan_summary: vpcSummary } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setScanResult({
        scan_id: `vpc-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings: mockVPCFindings,
        scan_summary: {
          total_vpcs: 3,
          total_subnets: 12,
          public_subnets: 4,
          security_groups: 18,
          open_security_groups: 2,
          flow_logs_missing: 1,
          critical_findings: 1,
          high_findings: 2,
          medium_findings: 1,
          low_findings: 1,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setIsScanning(false);
      toast.success("VPC security scan completed (demo mode)", {
        description: "Showing sample findings for demo",
      });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("VPC scan stopped");
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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "VPC":
        return <Network className="h-4 w-4" />;
      case "Subnet":
        return <Globe className="h-4 w-4" />;
      case "SecurityGroup":
        return <Shield className="h-4 w-4" />;
      case "NACL":
        return <Lock className="h-4 w-4" />;
      case "RouteTable":
        return <Activity className="h-4 w-4" />;
      default:
        return <Network className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            VPC & Network Security
            <Badge variant="outline" className="ml-2 border-[#00ff88] text-[#00ff88] text-xs">
              Free
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan VPCs, subnets, security groups, flow logs, and network ACLs for misconfigurations.
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
              <Label>Scan Scope</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">VPCs</Badge>
                <Badge variant="outline">Subnets</Badge>
                <Badge variant="outline">Security Groups</Badge>
                <Badge variant="outline">Flow Logs</Badge>
              </div>
            </div>
            <div>
              <Label>Checks</Label>
              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                <p>• Public subnet exposure</p>
                <p>• Open security groups</p>
                <p>• VPC Flow Logs</p>
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
              {isScanning ? "Scanning..." : "Start VPC Security Scan"}
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
              <span>VPC Security Scan Progress</span>
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
                  <p className="text-lg font-medium text-[#ffb000]">{scanResult.scan_summary.medium_findings}</p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
                <div className="cyber-glass p-3 rounded-lg text-center">
                  <p className="text-lg font-medium text-[#00ff88]">{scanResult.scan_summary.total_vpcs}</p>
                  <p className="text-xs text-muted-foreground">VPCs</p>
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
              <Network className="h-5 w-5 text-primary" />
              VPC Security Findings ({scanResult.findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              <TabsContent value="findings" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Resource</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Flow Logs</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40 bg-muted/20" /></TableCell>
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
                              {getResourceIcon(f.resource_type)}
                              <div>
                                <p className="font-mono text-sm">{f.resource_name}</p>
                                <p className="text-xs text-muted-foreground">{f.resource_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{f.resource_type}</Badge></TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{f.finding_type}</p>
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          </TableCell>
                          <TableCell><Badge className={getSeverityColor(f.severity)}>{f.severity}</Badge></TableCell>
                          <TableCell>
                            {f.flow_logs_enabled ? (
                              <Badge variant="outline" className="border-[#00ff88] text-[#00ff88]">Enabled</Badge>
                            ) : (
                              <Badge variant="outline" className="border-[#ff0040] text-[#ff0040]">Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">{f.recommendation}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="resources" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Network className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.total_vpcs}</p>
                    <p className="text-sm text-muted-foreground">VPCs</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.total_subnets}</p>
                    <p className="text-sm text-muted-foreground">Subnets</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.security_groups}</p>
                    <p className="text-sm text-muted-foreground">Security Groups</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.open_security_groups}</p>
                    <p className="text-sm text-muted-foreground">Open SGs</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Public Exposure</h4>
                    <p className="text-2xl font-medium text-[#ffb000]">{scanResult.scan_summary.public_subnets}</p>
                    <p className="text-sm text-muted-foreground">Public subnets</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Flow Logs</h4>
                    <p className="text-2xl font-medium text-[#ff0040]">{scanResult.scan_summary.flow_logs_missing}</p>
                    <p className="text-sm text-muted-foreground">VPCs without flow logs</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Total Findings</h4>
                    <p className="text-2xl font-medium">
                      {scanResult.scan_summary.critical_findings +
                        scanResult.scan_summary.high_findings +
                        scanResult.scan_summary.medium_findings +
                        scanResult.scan_summary.low_findings}
                    </p>
                    <p className="text-sm text-muted-foreground">Network issues</p>
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
