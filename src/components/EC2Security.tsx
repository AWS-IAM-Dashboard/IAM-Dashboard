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
  Cloud, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Server,
  Shield,
  Lock,
  Unlock,
  ExternalLink,
  Cpu,
  HardDrive,
  Network
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanEC2, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";
import { PageTour, type TourStep } from "./PageTour";

interface EC2SecurityFinding {
  id: string;
  instance_id: string;
  instance_name: string;
  instance_type: string;
  region: string;
  vpc_id: string;
  subnet_id: string;
  security_groups: string[];
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  public_ip?: string;
  state: string;
  launch_time: string;
  risk_score: number;
}

interface EC2ScanResult {
  scan_id: string;
  status: 'Running' | 'Completed' | 'Failed';
  progress: number;
  account_id: string;
  region: string;
  total_instances: number;
  findings: EC2SecurityFinding[];
  scan_summary: {
    running_instances: number;
    stopped_instances: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    publicly_accessible: number;
    unencrypted_volumes: number;
  };
  started_at?: string;
  completed_at?: string;
}

// Mock EC2 security findings
const mockEC2Findings: EC2SecurityFinding[] = [
  {
    id: 'ec2-finding-001',
    instance_id: 'i-0abcd1234efgh5678',
    instance_name: 'web-server-prod',
    instance_type: 't3.large',
    region: 'us-east-1',
    vpc_id: 'vpc-12345678',
    subnet_id: 'subnet-87654321',
    security_groups: ['sg-web-public', 'sg-ssh-access'],
    severity: 'Critical',
    finding_type: 'Unrestricted SSH Access',
    description: 'Security group allows SSH (port 22) access from 0.0.0.0/0',
    recommendation: 'Restrict SSH access to specific IP ranges or use AWS Session Manager',
    compliance_frameworks: ['CIS', 'SOC2'],
    public_ip: '203.0.113.45',
    state: 'running',
    launch_time: '2024-09-15T10:00:00Z',
    risk_score: 92
  },
  {
    id: 'ec2-finding-002',
    instance_id: 'i-0xyz9876mnop5432',
    instance_name: 'database-server',
    instance_type: 'm5.xlarge',
    region: 'us-east-1',
    vpc_id: 'vpc-12345678',
    subnet_id: 'subnet-11223344',
    security_groups: ['sg-database'],
    severity: 'High',
    finding_type: 'Unencrypted EBS Volume',
    description: 'EC2 instance has unencrypted EBS volumes containing sensitive data',
    recommendation: 'Enable EBS encryption for all volumes and use AWS KMS keys',
    compliance_frameworks: ['CIS', 'PCI-DSS'],
    state: 'running',
    launch_time: '2024-08-20T14:30:00Z',
    risk_score: 85
  },
  {
    id: 'ec2-finding-003',
    instance_id: 'i-0def5678uvwx1234',
    instance_name: 'legacy-app-server',
    instance_type: 't2.micro',
    region: 'us-west-2',
    vpc_id: 'vpc-87654321',
    subnet_id: 'subnet-99887766',
    security_groups: ['sg-legacy-app'],
    severity: 'High',
    finding_type: 'Outdated AMI',
    description: 'Instance running on AMI with known security vulnerabilities',
    recommendation: 'Update to latest patched AMI and implement automated patching',
    compliance_frameworks: ['CIS'],
    state: 'running',
    launch_time: '2024-06-10T09:15:00Z',
    risk_score: 78
  },
  {
    id: 'ec2-finding-004',
    instance_id: 'i-0ghi2345jklm6789',
    instance_name: 'test-environment',
    instance_type: 't3.small',
    region: 'us-east-1',
    vpc_id: 'vpc-12345678',
    subnet_id: 'subnet-55443322',
    security_groups: ['sg-test-env'],
    severity: 'Medium',
    finding_type: 'No Instance Monitoring',
    description: 'CloudWatch detailed monitoring is disabled for this instance',
    recommendation: 'Enable detailed monitoring and configure CloudWatch alarms',
    compliance_frameworks: ['SOC2'],
    state: 'running',
    launch_time: '2024-09-25T16:45:00Z',
    risk_score: 55
  },
  {
    id: 'ec2-finding-005',
    instance_id: 'i-0mno7890pqrs3456',
    instance_name: 'backup-server',
    instance_type: 't2.medium',
    region: 'us-west-2',
    vpc_id: 'vpc-87654321',
    subnet_id: 'subnet-77665544',
    security_groups: ['sg-backup'],
    severity: 'Low',
    finding_type: 'No Instance Tags',
    description: 'Instance lacks proper resource tagging for cost allocation and management',
    recommendation: 'Implement comprehensive tagging strategy for resource management',
    compliance_frameworks: [],
    state: 'stopped',
    launch_time: '2024-07-05T11:20:00Z',
    risk_score: 25
  }
];

const mockEC2ScanResult: EC2ScanResult = {
  scan_id: 'ec2-scan-demo-456',
  status: 'Completed',
  progress: 100,
  account_id: '123456789012',
  region: 'us-east-1',
  total_instances: 28,
  findings: mockEC2Findings,
  scan_summary: {
    running_instances: 22,
    stopped_instances: 6,
    critical_findings: 1,
    high_findings: 2,
    medium_findings: 1,
    low_findings: 1,
    publicly_accessible: 8,
    unencrypted_volumes: 5
  },
  started_at: new Date(Date.now() - 240000).toISOString(),
  completed_at: new Date(Date.now() - 180000).toISOString()
};

export function EC2Security() {
  const [scanResult, setScanResult] = useState<EC2ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const { addScanResult } = useScanResults();

  useEffect(() => {
    if (scanResult?.status === 'Completed') {
      toast.success('EC2 security scan completed!', {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`
      });
    } else if (scanResult?.status === 'Failed') {
      toast.error('EC2 scan failed', {
        description: 'Check AWS credentials and permissions'
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      toast.info('EC2 security scan started', {
        description: 'Analyzing EC2 instances and security configurations...'
      });

      // Show loading state
      setScanResult({
        scan_id: 'loading',
        status: 'Running',
        progress: 0,
        account_id: '',
        region: selectedRegion,
        total_instances: 0,
        findings: [],
        scan_summary: {
          public_instances: 0,
          without_imdsv2: 0,
          unencrypted_volumes: 0,
          open_security_groups: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0
        }
      });

      // Call the real API
      const response: ScanResponse = await scanEC2(selectedRegion);

      // Transform API response to component format
      const transformedResult: EC2ScanResult = {
        scan_id: response.scan_id,
        status: response.status === 'completed' ? 'Completed' : response.status === 'failed' ? 'Failed' : 'Running',
        progress: response.status === 'completed' ? 100 : response.status === 'failed' ? 0 : 50,
        account_id: response.results?.account_id || 'N/A',
        region: response.region,
        total_instances: response.results?.instances?.total || 0,
        findings: response.results?.findings || [],
        scan_summary: {
          public_instances: response.results?.instances?.public || 0,
          without_imdsv2: response.results?.instances?.without_imdsv2 || 0,
          unencrypted_volumes: response.results?.instances?.unencrypted_volumes || 0,
          open_security_groups: response.results?.instances?.open_security_groups || 0,
          critical_findings: response.results?.instances?.public || 0,
          high_findings: response.results?.instances?.without_imdsv2 || 0,
          medium_findings: 0,
          low_findings: 0
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
      toast.error('Failed to start EC2 scan', {
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
      toast.warning('EC2 scan stopped', {
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

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running': return 'bg-[#00ff88] text-black';
      case 'stopped': return 'bg-[#94a3b8] text-white';
      case 'pending': return 'bg-[#ffb000] text-black';
      case 'terminated': return 'bg-[#ff0040] text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="max-w-full overflow-x-hidden p-4 md:p-6 space-y-6">
      <DemoModeBanner />

      {/* Interactive Tour: no scan yet */}
      {!isScanning && !scanResult && (
        <PageTour
          welcomeTitle="EC2 Security Scanner"
          welcomeDescription="No EC2 scan has been run yet. This page audits your EC2 instances for security-group misconfigurations, unencrypted volumes, public IP exposure, and compliance violations. Let’s walk through how it works."
          welcomeIcon={<Server className="h-7 w-7" />}
          steps={[
            {
              target: "ec2-region",
              title: "1. Select Region & Filter",
              description: "Choose the AWS region to scan and optionally filter by instance name, tag, or ID to narrow the scope.",
              hint: "Tip: Start with your primary production region.",
              icon: <Cloud className="h-5 w-5" />,
              placement: "bottom",
            },
            {
              target: "ec2-checks",
              title: "2. Pick Security Checks",
              description: "Select which checks to run — security group rules, EBS encryption, public IP exposure, and instance metadata. All checked items will be audited.",
              icon: <Settings2 className="h-5 w-5" />,
              placement: "bottom",
            },
            {
              target: "ec2-compliance",
              title: "3. Select Compliance Standards",
              description: "Choose which compliance frameworks to validate against — CIS AWS Foundations and SOC 2 are enabled by default. Enable PCI-DSS or HIPAA if your instances handle regulated workloads.",
              hint: "Tip: Enable all standards for a thorough first scan.",
              icon: <Shield className="h-5 w-5" />,
              placement: "bottom",
            },
            {
              target: "ec2-actions",
              title: "4. Launch the Scan",
              description: "Hit Start EC2 Scan to begin. The scanner inspects each instance against your selected checks and compliance standards. Results typically appear within a minute.",
              icon: <Play className="h-5 w-5" />,
              placement: "top",
              action: {
                label: "Start EC2 Scan",
                onClick: handleStartScan,
                icon: <Play className="h-4 w-4" />,
              },
            },
            {
              target: "ec2-config",
              title: "5. Review Findings",
              description: "After the scan, a progress card and findings table appear below. Findings are sorted by severity with tabs for instance overview and compliance status.",
              hint: "Critical findings indicate exposed instances or unencrypted volumes that need immediate attention.",
              icon: <AlertTriangle className="h-5 w-5" />,
              placement: "bottom",
            },
          ] satisfies TourStep[]}
        />
      )}

      
      {/* EC2 Scan Configuration */}
      <Card data-tour="ec2-config" className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            EC2 Security Configuration Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div data-tour="ec2-region" className="space-y-4">
              <div>
                <Label htmlFor="region">AWS Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select Region" />
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
                <Label htmlFor="instance-filter">Instance Filter</Label>
                <Input 
                  id="instance-filter"
                  placeholder="Filter by tag, name, or ID"
                  className="bg-input border-border"
                />
              </div>
            </div>
            
            <div data-tour="ec2-checks" className="space-y-4">
              <div>
                <Label>Security Checks</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Security Group Rules</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">EBS Encryption</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Public IP Exposure</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Instance Metadata</span>
                  </label>
                </div>
              </div>
            </div>

            <div data-tour="ec2-compliance" className="space-y-4">
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
          
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button 
              onClick={handleStartScan}
              disabled={isScanning}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow"
            >
              <Play className="h-4 w-4 mr-2" />
              {isScanning ? "Scanning..." : "Start EC2 Scan"}
            </Button>
            
            {isScanning && (
              <Button 
                onClick={handleStopScan}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Scan
              </Button>
            )}
            
            <Button variant="outline" className="w-full sm:w-auto border-border">
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
              <span>EC2 Security Scan Progress</span>
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
                  {isScanning ? 'Analyzing EC2 instances...' : 
                   scanResult ? `Scanned ${scanResult.total_instances} instances in ${scanResult.region}` :
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
              <Cloud className="h-5 w-5 text-primary" />
              EC2 Security Findings ({scanResult.findings.length} issues)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Security Findings</TabsTrigger>
                <TabsTrigger value="instances">Instance Overview</TabsTrigger>
                <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="findings" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Instance</TableHead>
                      <TableHead>Finding Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Recommendation</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-12 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48 bg-muted/20" /></TableCell>
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
                              <Server className="h-4 w-4" />
                              <div>
                                <p className="font-mono text-sm">{finding.instance_name}</p>
                                <p className="text-xs text-muted-foreground">{finding.instance_id}</p>
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
                            <Badge className={getStateColor(finding.state)}>
                              {finding.state}
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
                          <TableCell className="text-sm max-w-xs">
                            {finding.recommendation}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="instances" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Server className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.running_instances}</p>
                    <p className="text-sm text-muted-foreground">Running</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Cpu className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.stopped_instances}</p>
                    <p className="text-sm text-muted-foreground">Stopped</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Network className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.publicly_accessible}</p>
                    <p className="text-sm text-muted-foreground">Public</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.unencrypted_volumes}</p>
                    <p className="text-sm text-muted-foreground">Unencrypted</p>
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