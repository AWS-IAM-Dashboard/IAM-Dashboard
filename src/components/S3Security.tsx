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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Play, 
  Square, 
  Settings2, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Shield,
  FileText,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanS3, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface S3SecurityFinding {
  id: string;
  bucket_name: string;
  region: string;
  creation_date: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  public_read: boolean;
  public_write: boolean;
  encryption_enabled: boolean;
  versioning_enabled: boolean;
  logging_enabled: boolean;
  mfa_delete: boolean;
  object_count: number;
  size_bytes: number;
  risk_score: number;
}

interface S3ScanResult {
  scan_id: string;
  status: 'Running' | 'Completed' | 'Failed';
  progress: number;
  account_id: string;
  total_buckets: number;
  findings: S3SecurityFinding[];
  scan_summary: {
    public_buckets: number;
    unencrypted_buckets: number;
    no_versioning: number;
    no_logging: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    total_objects: number;
    total_size_gb: number;
  };
  started_at?: string;
  completed_at?: string;
}

// Mock S3 security findings
const mockS3Findings: S3SecurityFinding[] = [
  {
    id: 's3-finding-001',
    bucket_name: 'company-backups-public',
    region: 'us-east-1',
    creation_date: '2024-01-15T10:00:00Z',
    severity: 'Critical',
    finding_type: 'Public Read Access',
    description: 'S3 bucket allows public read access with potential sensitive data exposure',
    recommendation: 'Block public access at account and bucket levels, then allow only explicit principals through least-privilege bucket policies',
    compliance_frameworks: ['CIS', 'SOC2', 'PCI-DSS'],
    public_read: true,
    public_write: false,
    encryption_enabled: false,
    versioning_enabled: false,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 15847,
    size_bytes: 524288000000, // 500GB
    risk_score: 95
  },
  {
    id: 's3-finding-002',
    bucket_name: 'application-logs-dev',
    region: 'us-west-2',
    creation_date: '2024-03-10T14:30:00Z',
    severity: 'High',
    finding_type: 'No Encryption at Rest',
    description: 'S3 bucket does not have server-side encryption enabled',
    recommendation: 'Enforce default encryption and deny unencrypted object uploads via bucket policy (prefer SSE-KMS for sensitive data)',
    compliance_frameworks: ['CIS', 'HIPAA'],
    public_read: false,
    public_write: false,
    encryption_enabled: false,
    versioning_enabled: true,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 8965,
    size_bytes: 107374182400, // 100GB
    risk_score: 82
  },
  {
    id: 's3-finding-003',
    bucket_name: 'user-uploads-prod',
    region: 'eu-west-1',
    creation_date: '2024-02-20T09:15:00Z',
    severity: 'High',
    finding_type: 'No Access Logging',
    description: 'S3 bucket access logging is disabled, limiting audit capabilities',
    recommendation: 'Enable CloudTrail data events (and server access logs where needed) to preserve auditable object-level access history',
    compliance_frameworks: ['SOC2', 'PCI-DSS'],
    public_read: false,
    public_write: false,
    encryption_enabled: true,
    versioning_enabled: true,
    logging_enabled: false,
    mfa_delete: false,
    object_count: 45623,
    size_bytes: 1073741824000, // 1TB
    risk_score: 75
  },
  {
    id: 's3-finding-004',
    bucket_name: 'static-website-assets',
    region: 'us-east-1',
    creation_date: '2024-04-05T16:45:00Z',
    severity: 'Medium',
    finding_type: 'No Versioning',
    description: 'S3 bucket versioning is disabled, risk of accidental data loss',
    recommendation: 'Enable versioning and validate lifecycle/MFA-delete strategy for recovery objectives before production rollout',
    compliance_frameworks: ['CIS'],
    public_read: true,
    public_write: false,
    encryption_enabled: true,
    versioning_enabled: false,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 2134,
    size_bytes: 5368709120, // 5GB
    risk_score: 55
  },
  {
    id: 's3-finding-005',
    bucket_name: 'development-temp-files',
    region: 'us-west-2',
    creation_date: '2024-05-12T11:20:00Z',
    severity: 'Low',
    finding_type: 'No MFA Delete',
    description: 'MFA Delete is not enabled for additional protection against deletions',
    recommendation: 'For high-impact buckets, enforce deletion controls with versioning, Object Lock where required, and tightly scoped delete permissions',
    compliance_frameworks: [],
    public_read: false,
    public_write: false,
    encryption_enabled: true,
    versioning_enabled: true,
    logging_enabled: true,
    mfa_delete: false,
    object_count: 567,
    size_bytes: 2147483648, // 2GB
    risk_score: 30
  }
];

const mockS3ScanResult: S3ScanResult = {
  scan_id: 's3-scan-demo-789',
  status: 'Completed',
  progress: 100,
  account_id: '123456789012',
  total_buckets: 23,
  findings: mockS3Findings,
  scan_summary: {
    public_buckets: 2,
    unencrypted_buckets: 3,
    no_versioning: 8,
    no_logging: 12,
    critical_findings: 1,
    high_findings: 2,
    medium_findings: 1,
    low_findings: 1,
    total_objects: 73136,
    total_size_gb: 1632.5
  },
  started_at: new Date(Date.now() - 180000).toISOString(),
  completed_at: new Date(Date.now() - 120000).toISOString()
};

export function S3Security() {
  const [scanResult, setScanResult] = useState<S3ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('all-regions');
  const [loading, setLoading] = useState(false);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === 'Completed') {
      toast.success('S3 security scan completed!', {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`
      });
    } else if (scanResult?.status === 'Failed') {
      toast.error('S3 scan failed', {
        description: 'Check AWS credentials and permissions'
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      toast.info('S3 security scan started', {
        description: 'Analyzing S3 buckets and security configurations...'
      });

      // Show loading state
      setScanResult({
        scan_id: 'loading',
        status: 'Running',
        progress: 0,
        account_id: '',
        total_buckets: 0,
        findings: [],
        scan_summary: {
          public_buckets: 0,
          unencrypted_buckets: 0,
          no_versioning: 0,
          no_logging: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0,
          total_objects: 0,
          total_size_gb: 0
        }
      });

      // Call the real API
      const region = selectedRegion === 'all-regions' ? 'us-east-1' : selectedRegion;
      const response: ScanResponse = await scanS3(region);

      // Transform API response to component format
      const transformedResult: S3ScanResult = {
        scan_id: response.scan_id,
        status: response.status === 'completed' ? 'Completed' : response.status === 'failed' ? 'Failed' : 'Running',
        progress: response.status === 'completed' ? 100 : response.status === 'failed' ? 0 : 50,
        account_id: response.results?.account_id || 'N/A',
        total_buckets: response.results?.buckets?.total || 0,
        findings: response.results?.findings || [],
        scan_summary: {
          public_buckets: response.results?.buckets?.public || 0,
          unencrypted_buckets: response.results?.buckets?.unencrypted || 0,
          no_versioning: 0,
          no_logging: 0,
          critical_findings: response.results?.buckets?.public || 0,
          high_findings: response.results?.buckets?.unencrypted || 0,
          medium_findings: 0,
          low_findings: 0,
          total_objects: 0,
          total_size_gb: 0
        },
        started_at: response.timestamp,
        completed_at: response.timestamp
      };

      setScanResult(transformedResult);
      setIsScanning(false);

      // Store in context for Reports component
      addScanResult(response);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsScanning(false);
      toast.error('Failed to start S3 scan', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const handleStopScan = async () => {
    try {
      setIsScanning(false);
      if (scanResult) {
        setScanResult({ ...scanResult, status: 'Failed' });
      }
      toast.warning('S3 scan stopped', {
        description: 'Security scan was interrupted'
      });
    } catch (err) {
      toast.error('Failed to stop scan');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-[#ff0040] text-white';
      case 'High': return 'bg-[#ff6b35] text-white';
      case 'Medium': return 'bg-[#ffb000] text-black';
      case 'Low': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      {/* S3 Scan Configuration */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            S3 Bucket Security Configuration Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="region">AWS Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-regions">All Regions</SelectItem>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bucket-filter">Bucket Filter</Label>
                <Input 
                  id="bucket-filter"
                  placeholder="Filter by bucket name or tag"
                  className="bg-input border-border"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Security Checks</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Public Access Configuration</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Encryption at Rest</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Versioning & Logging</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Lifecycle Policies</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Compliance Standards</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">CIS AWS Foundations</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">SOC 2 Type II</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">PCI-DSS</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">HIPAA</span>
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
              {isScanning ? "Scanning..." : "Start S3 Scan"}
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
              <span>S3 Security Scan Progress</span>
              <div className="flex items-center gap-2">
                {scanResult && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setLoading(!loading)}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                  {isScanning ? 'Analyzing S3 buckets...' : 
                   scanResult ? `Scanned ${scanResult.total_buckets} buckets across all regions` :
                   'Ready to scan'}
                </span>
                <span>{scanResult?.progress || 0}%</span>
              </div>
              
              {scanResult && scanResult.status === 'Completed' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                    <p className="text-lg font-medium text-[#00ff88]">{scanResult.scan_summary.low_findings}</p>
                    <p className="text-xs text-muted-foreground">Low</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && scanResult.findings.length > 0 && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              S3 Security Findings ({scanResult.findings.length} issues)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Security Findings</TabsTrigger>
                <TabsTrigger value="buckets">Bucket Overview</TabsTrigger>
                <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="findings" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Bucket Name</TableHead>
                      <TableHead>Finding Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Public Access</TableHead>
                      <TableHead>Encryption</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index} className="border-border">
                          <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 bg-muted/20" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      scanResult.findings.map((finding) => (
                        <TableRow 
                          key={finding.id} 
                          className="border-border cursor-pointer hover:bg-accent/10 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              <div>
                                <p className="font-mono text-sm">{finding.bucket_name}</p>
                                <p className="text-xs text-muted-foreground">{finding.region}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{finding.finding_type}</p>
                              <p className="text-xs text-muted-foreground">{finding.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(finding.severity)}>
                              {finding.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {finding.public_read && (
                                <Badge variant="outline" className="text-xs border-[#ff0040] text-[#ff0040]">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Read
                                </Badge>
                              )}
                              {finding.public_write && (
                                <Badge variant="outline" className="text-xs border-[#ff0040] text-[#ff0040]">
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Write
                                </Badge>
                              )}
                              {!finding.public_read && !finding.public_write && (
                                <Badge variant="outline" className="text-xs border-[#00ff88] text-[#00ff88]">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Private
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={finding.encryption_enabled ? 
                                "text-xs border-[#00ff88] text-[#00ff88]" : 
                                "text-xs border-[#ff0040] text-[#ff0040]"
                              }
                            >
                              {finding.encryption_enabled ? (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Encrypted
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Plain
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={
                              finding.risk_score > 80 ? "text-[#ff0040]" :
                              finding.risk_score > 60 ? "text-[#ff6b35]" :
                              finding.risk_score > 40 ? "text-[#ffb000]" :
                              "text-[#00ff88]"
                            }>
                              {finding.risk_score}/100
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatSize(finding.size_bytes)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="buckets" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.public_buckets}</p>
                    <p className="text-sm text-muted-foreground">Public Buckets</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Unlock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.unencrypted_buckets}</p>
                    <p className="text-sm text-muted-foreground">Unencrypted</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{(scanResult.scan_summary.total_objects ?? 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Objects</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <HardDrive className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.total_size_gb ?? 0} GB</p>
                    <p className="text-sm text-muted-foreground">Total Size</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <div className="grid gap-4">
                  {['CIS AWS Foundations', 'SOC 2 Type II', 'PCI-DSS', 'HIPAA'].map((framework) => {
                    const criticalCount = scanResult.findings.filter(f => 
                      f.compliance_frameworks.includes(framework.split(' ')[0]) && f.severity === 'Critical'
                    ).length;
                    const highCount = scanResult.findings.filter(f => 
                      f.compliance_frameworks.includes(framework.split(' ')[0]) && f.severity === 'High'
                    ).length;
                    const score = Math.max(0, 100 - (criticalCount * 30 + highCount * 20));
                    
                    return (
                      <div key={framework} className="cyber-glass p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{framework}</h4>
                          <Badge className={score > 80 ? getSeverityColor('Low') : score > 60 ? getSeverityColor('Medium') : getSeverityColor('High')}>
                            {score}% Compliant
                          </Badge>
                        </div>
                        <Progress value={score} className="h-2" />
                        <p className="text-sm text-muted-foreground mt-2">
                          {criticalCount + highCount} high-priority issues found
                        </p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}