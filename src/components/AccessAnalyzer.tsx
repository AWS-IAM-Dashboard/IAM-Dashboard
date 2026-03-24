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
  Search,
  Shield,
  AlertTriangle,
  RefreshCw,
  Globe,
  User,
  Key,
  Lock,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useActiveScanResults } from "../hooks/useActiveScanResults";

interface AccessAnalyzerFinding {
  id: string;
  resource_type: "S3" | "IAM" | "Lambda" | "KMS" | "SQS";
  resource_arn: string;
  resource_name: string;
  principal: string;
  finding_type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  recommendation: string;
  is_public: boolean;
  last_analyzed: string;
  risk_score: number;
}

interface AccessAnalyzerResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: AccessAnalyzerFinding[];
  scan_summary: {
    total_findings: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    public_resources: number;
    external_access_findings: number;
    unused_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockAccessAnalyzerFindings: AccessAnalyzerFinding[] = [
  {
    id: "aa-001",
    resource_type: "S3",
    resource_arn: "arn:aws:s3:::company-backups-public",
    resource_name: "company-backups-public",
    principal: "arn:aws:iam::111111111111:root",
    finding_type: "External Access",
    severity: "Critical",
    description: "S3 bucket allows access from external AWS accounts",
    recommendation: "Restrict bucket policy to specific principals",
    is_public: true,
    last_analyzed: new Date().toISOString(),
    risk_score: 95,
  },
  {
    id: "aa-002",
    resource_type: "IAM",
    resource_arn: "arn:aws:iam::123456789012:role/cross-account-role",
    resource_name: "cross-account-role",
    principal: "*",
    finding_type: "Cross-Account Trust",
    severity: "High",
    description: "IAM role can be assumed by any AWS account without external ID",
    recommendation: "Add external ID requirement and restrict to known accounts",
    is_public: false,
    last_analyzed: new Date().toISOString(),
    risk_score: 88,
  },
  {
    id: "aa-003",
    resource_type: "Lambda",
    resource_arn: "arn:aws:lambda:us-east-1:123456789012:function:public-api",
    resource_name: "public-api",
    principal: "arn:aws:iam::999999999999:root",
    finding_type: "Cross-Account Invoke",
    severity: "High",
    description: "Lambda function can be invoked from another AWS account",
    recommendation: "Use resource-based policy conditions to restrict invocation",
    is_public: false,
    last_analyzed: new Date().toISOString(),
    risk_score: 75,
  },
  {
    id: "aa-004",
    resource_type: "KMS",
    resource_arn: "arn:aws:kms:us-east-1:123456789012:key/abcd-1234",
    resource_name: "shared-encryption-key",
    principal: "arn:aws:iam::222222222222:root",
    finding_type: "External Key Usage",
    severity: "Medium",
    description: "KMS key is shared with external account for decryption",
    recommendation: "Document cross-account key usage and implement rotation",
    is_public: false,
    last_analyzed: new Date().toISOString(),
    risk_score: 60,
  },
  {
    id: "aa-005",
    resource_type: "SQS",
    resource_arn: "arn:aws:sqs:us-east-1:123456789012:dev-queue",
    resource_name: "dev-queue",
    principal: "*",
    finding_type: "Public Queue Policy",
    severity: "Low",
    description: "SQS queue policy allows unauthenticated access",
    recommendation: "Restrict queue policy to IAM roles only",
    is_public: true,
    last_analyzed: new Date().toISOString(),
    risk_score: 35,
  },
];

export function AccessAnalyzer() {
  const [scanResult, setScanResult] = useState<AccessAnalyzerResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [analyzerType, setAnalyzerType] = useState<"account" | "organization">("account");
  const { addScanResult } = useActiveScanResults();

  useEffect(() => {
    if (scanResult?.status === "Completed") {
      toast.success("Access Analyzer scan completed!", {
        description: `Found ${scanResult.scan_summary.total_findings} policy findings`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("Access Analyzer scan failed", {
        description: "Check AWS credentials and IAM Access Analyzer permissions",
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      toast.info("Access Analyzer scan started", {
        description: "Analyzing resource-based policies for external access...",
      });

      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: {
          total_findings: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0,
          public_resources: 0,
          external_access_findings: 0,
          unused_findings: 0,
        },
      });

      const response: ScanResponse = await scanIAM(selectedRegion);

      // Use response if it has access analyzer data, else use mock for demo
      const findings = response.results?.access_analyzer?.findings ?? mockAccessAnalyzerFindings;
      const summary = response.results?.access_analyzer?.scan_summary ?? {
        total_findings: findings.length,
        critical_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "Critical").length,
        high_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "High").length,
        medium_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "Medium").length,
        low_findings: findings.filter((f: AccessAnalyzerFinding) => f.severity === "Low").length,
        public_resources: findings.filter((f: AccessAnalyzerFinding) => f.is_public).length,
        external_access_findings: findings.length,
        unused_findings: 0,
      };

      const transformedResult: AccessAnalyzerResult = {
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
        scanner_type: "access-analyzer",
        results: { ...response.results, access_analyzer: { findings, scan_summary: summary } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsScanning(false);
      // Demo fallback - show mock results
      setScanResult({
        scan_id: `aa-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings: mockAccessAnalyzerFindings,
        scan_summary: {
          total_findings: mockAccessAnalyzerFindings.length,
          critical_findings: 1,
          high_findings: 2,
          medium_findings: 1,
          low_findings: 1,
          public_resources: 2,
          external_access_findings: 5,
          unused_findings: 0,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      toast.success("Access Analyzer scan completed (demo mode)", {
        description: "Showing sample findings for demo",
      });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("Access Analyzer scan stopped");
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
      case "S3":
        return <Globe className="h-4 w-4" />;
      case "IAM":
        return <User className="h-4 w-4" />;
      case "Lambda":
        return <Key className="h-4 w-4" />;
      case "KMS":
        return <Lock className="h-4 w-4" />;
      case "SQS":
        return <Search className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            IAM Access Analyzer
            <Badge variant="outline" className="ml-2 border-[#00ff88] text-[#00ff88] text-xs">
              Free
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Find unintended resource sharing using AWS IAM Access Analyzer. Analyzes resource-based policies for external access.
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
              <Label>Analyzer Type</Label>
              <Select value={analyzerType} onValueChange={(v: "account" | "organization") => setAnalyzerType(v)}>
                <SelectTrigger className="bg-input border-border mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resource Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">S3</Badge>
                <Badge variant="outline">IAM</Badge>
                <Badge variant="outline">Lambda</Badge>
                <Badge variant="outline">KMS</Badge>
                <Badge variant="outline">SQS</Badge>
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
              {isScanning ? "Analyzing..." : "Start Access Analyzer Scan"}
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
              <span>Access Analyzer Results</span>
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
                  <p className="text-lg font-medium text-[#00ff88]">{scanResult.scan_summary.public_resources}</p>
                  <p className="text-xs text-muted-foreground">Public</p>
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
              <Search className="h-5 w-5 text-primary" />
              Policy Findings ({scanResult.findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="findings">Findings</TabsTrigger>
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
                      <TableHead>Public</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 bg-muted/20" /></TableCell>
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
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{f.resource_arn}</p>
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
                            {f.is_public ? (
                              <Badge variant="outline" className="border-[#ff0040] text-[#ff0040]">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="border-[#00ff88] text-[#00ff88]">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">{f.recommendation}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.total_findings}</p>
                    <p className="text-sm text-muted-foreground">Total Findings</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <ExternalLink className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.external_access_findings}</p>
                    <p className="text-sm text-muted-foreground">External Access</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.public_resources}</p>
                    <p className="text-sm text-muted-foreground">Public Resources</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <AlertTriangle className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">
                      {scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings}
                    </p>
                    <p className="text-sm text-muted-foreground">High Priority</p>
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
