import { useState, useEffect, useMemo } from "react";
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
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Cloud,
  Users,
  Key,
  Lock,
  Unlock,
  ExternalLink,
  User,
  UserX,
  Database,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanIAM, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface AWSIAMFinding {
  id: string;
  type: 'user' | 'role' | 'policy' | 'group';
  resource_name: string;
  resource_arn: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  last_accessed?: string;
  created_date: string;
  risk_score: number;
  status?: 'Open' | 'In Progress' | 'Resolved';
}

interface AWSScanResult {
  scan_id: string;
  status: 'Running' | 'Completed' | 'Failed';
  progress: number;
  account_id: string;
  region: string;
  total_resources: number;
  findings: AWSIAMFinding[];
  scan_summary: {
    users: number;
    roles: number;
    policies: number;
    groups: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  started_at?: string;
  completed_at?: string;
}

// Mock AWS IAM findings data
const mockAWSIAMFindings: AWSIAMFinding[] = [
  {
    id: 'finding-001',
    type: 'user',
    resource_name: 'admin-user-dev',
    resource_arn: 'arn:aws:iam::123456789012:user/admin-user-dev',
    severity: 'Critical',
    finding_type: 'Root Access Keys',
    description: 'User has active access keys with administrator privileges and no MFA enabled',
    recommendation: 'Enable MFA for this user and rotate access keys regularly',
    compliance_frameworks: ['CIS', 'SOC2', 'PCI-DSS'],
    last_accessed: '2024-10-02T14:30:00Z',
    created_date: '2024-09-15T10:00:00Z',
    risk_score: 95
  },
  {
    id: 'finding-002',
    type: 'policy',
    resource_name: 'overly-permissive-policy',
    resource_arn: 'arn:aws:iam::123456789012:policy/overly-permissive-policy',
    severity: 'High',
    finding_type: 'Wildcard Permissions',
    description: 'Policy grants (*) permissions on all resources and actions',
    recommendation: 'Apply principle of least privilege and restrict permissions to specific resources',
    compliance_frameworks: ['CIS', 'NIST'],
    created_date: '2024-08-20T16:45:00Z',
    risk_score: 88
  },
  {
    id: 'finding-003',
    type: 'role',
    resource_name: 'cross-account-role',
    resource_arn: 'arn:aws:iam::123456789012:role/cross-account-role',
    severity: 'High',
    finding_type: 'Unrestricted Cross-Account Access',
    description: 'Role allows assumption from any AWS account without external ID requirement',
    recommendation: 'Add condition requiring external ID and restrict to specific AWS accounts',
    compliance_frameworks: ['CIS', 'SOC2'],
    created_date: '2024-09-01T09:15:00Z',
    risk_score: 82
  },
  {
    id: 'finding-004',
    type: 'user',
    resource_name: 'service-user-old',
    resource_arn: 'arn:aws:iam::123456789012:user/service-user-old',
    severity: 'Medium',
    finding_type: 'Inactive User with Access Keys',
    description: 'User has not been accessed for 90+ days but still has active access keys',
    recommendation: 'Disable or delete unused user account and revoke access keys',
    compliance_frameworks: ['CIS'],
    last_accessed: '2024-07-01T12:00:00Z',
    created_date: '2024-03-10T14:20:00Z',
    risk_score: 65
  },
  {
    id: 'finding-005',
    type: 'group',
    resource_name: 'developers-group',
    resource_arn: 'arn:aws:iam::123456789012:group/developers-group',
    severity: 'Medium',
    finding_type: 'Excessive Group Permissions',
    description: 'Group has permissions to production S3 buckets but contains development users',
    recommendation: 'Separate development and production access into different groups',
    compliance_frameworks: ['SOC2'],
    created_date: '2024-08-05T11:30:00Z',
    risk_score: 58
  },
  {
    id: 'finding-006',
    type: 'policy',
    resource_name: 'backup-policy',
    resource_arn: 'arn:aws:iam::123456789012:policy/backup-policy',
    severity: 'Low',
    finding_type: 'Unused Policy',
    description: 'Policy is not attached to any users, groups, or roles',
    recommendation: 'Remove unused policy to reduce attack surface',
    compliance_frameworks: ['CIS'],
    created_date: '2024-06-15T08:45:00Z',
    risk_score: 25
  }
];

const mockScanResult: AWSScanResult = {
  scan_id: 'aws-scan-demo-123',
  status: 'Completed',
  progress: 100,
  account_id: '123456789012',
  region: 'us-east-1',
  total_resources: 47,
  findings: mockAWSIAMFindings,
  scan_summary: {
    users: 12,
    roles: 8,
    policies: 15,
    groups: 4,
    critical_findings: 1,
    high_findings: 2,
    medium_findings: 2,
    low_findings: 1
  },
  started_at: new Date(Date.now() - 300000).toISOString(),
  completed_at: new Date(Date.now() - 120000).toISOString()
};

export function AWSIAMScan() {
  type FindingStatus = 'Open' | 'In Progress' | 'Resolved';
  const [scanResult, setScanResult] = useState<AWSScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [awsProfile, setAwsProfile] = useState('default');
  const [loading, setLoading] = useState(false);
  const [findingSearchTerm, setFindingSearchTerm] = useState("");
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("all");
  const [findingTypeFilter, setFindingTypeFilter] = useState<string>("all");
  const [findingStatusFilter, setFindingStatusFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [findingStatuses, setFindingStatuses] = useState<Record<string, FindingStatus>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { addScanResult } = useScanResults();

  // Toast notifications for scan events
  useEffect(() => {
    if (scanResult?.status === 'Completed') {
      toast.success('AWS IAM scan completed successfully!', {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`
      });
    } else if (scanResult?.status === 'Failed') {
      toast.error('AWS IAM scan failed', {
        description: 'Check AWS credentials and permissions'
      });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      toast.info('IAM scan started', {
        description: 'Running AWS IAM security scan...'
      });

      // Show loading state
      setScanResult({
        scan_id: 'loading',
        status: 'Running',
        progress: 0,
        account_id: '',
        region: selectedRegion,
        total_resources: 0,
        findings: [],
        scan_summary: {
          users: 0,
          roles: 0,
          policies: 0,
          groups: 0,
          critical_findings: 0,
          high_findings: 0,
          medium_findings: 0,
          low_findings: 0
        }
      });

      // Call the real API
      const response: ScanResponse = await scanIAM(selectedRegion);

      // Transform API response to component format
      const transformedResult: AWSScanResult = {
        scan_id: response.scan_id,
        status: response.status === 'completed' ? 'Completed' : response.status === 'failed' ? 'Failed' : 'Running',
        progress: response.status === 'completed' ? 100 : response.status === 'failed' ? 0 : 50,
        account_id: response.results?.account_id || 'N/A',
        region: response.region,
        total_resources: (response.results?.users?.total || 0) + (response.results?.roles?.total || 0),
        findings: response.results?.findings || mockAWSIAMFindings, // Use mock findings if API doesn't return them
        scan_summary: {
          users: response.results?.users?.total || 0,
          roles: response.results?.roles?.total || 0,
          policies: response.results?.policies?.total || 0,
          groups: response.results?.groups?.total || 0,
          critical_findings: response.results?.scan_summary?.critical_findings || 0,
          high_findings: response.results?.scan_summary?.high_findings || 0,
          medium_findings: response.results?.scan_summary?.medium_findings || 0,
          low_findings: response.results?.scan_summary?.low_findings || 0
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
      toast.error('Failed to start IAM scan', {
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
      toast.warning('AWS scan stopped', {
        description: 'IAM scan was interrupted'
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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'role': return <UserX className="h-4 w-4" />;
      case 'policy': return <Lock className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getFindingStatus = (finding: AWSIAMFinding): FindingStatus => {
    return findingStatuses[finding.id] ?? finding.status ?? "Open";
  };

  const updateFindingStatus = (findingId: string, status: FindingStatus) => {
    setFindingStatuses((prev) => ({
      ...prev,
      [findingId]: status
    }));
  };

  const statusColorMap: Record<FindingStatus, string> = {
    Open: "bg-[#ff0040] text-white",
    "In Progress": "bg-[#ffb000] text-black",
    Resolved: "bg-[#00ff88] text-black",
  };

  const filteredFindings = useMemo(() => {
    if (!scanResult?.findings?.length) {
      return [];
    }

    const normalizedSearch = findingSearchTerm.trim().toLowerCase();
    const hasDateFilter = startDateFilter || endDateFilter;
    const start = startDateFilter ? new Date(`${startDateFilter}T00:00:00`) : null;
    const end = endDateFilter ? new Date(`${endDateFilter}T23:59:59`) : null;

    return scanResult.findings.filter((finding) => {
      if (findingSeverityFilter !== "all" && finding.severity !== findingSeverityFilter) {
        return false;
      }

      if (findingTypeFilter !== "all" && finding.type !== findingTypeFilter) {
        return false;
      }

      const status = getFindingStatus(finding);
      if (findingStatusFilter !== "all" && status !== findingStatusFilter) {
        return false;
      }

      if (hasDateFilter) {
        const createdAt = new Date(finding.created_date);
        if (start && createdAt < start) {
          return false;
        }
        if (end && createdAt > end) {
          return false;
        }
      }

      if (normalizedSearch) {
        const searchable = [
          finding.id,
          finding.resource_name,
          finding.resource_arn,
          finding.finding_type,
          finding.description,
          finding.recommendation,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [
    scanResult,
    findingSearchTerm,
    findingSeverityFilter,
    findingTypeFilter,
    findingStatusFilter,
    startDateFilter,
    endDateFilter,
    findingStatuses,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    findingSearchTerm,
    findingSeverityFilter,
    findingTypeFilter,
    findingStatusFilter,
    startDateFilter,
    endDateFilter,
    pageSize,
    scanResult?.scan_id
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const paginatedFindings = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredFindings.slice(startIdx, startIdx + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const clearFindingFilters = () => {
    setFindingSearchTerm("");
    setFindingSeverityFilter("all");
    setFindingTypeFilter("all");
    setFindingStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      {/* AWS Configuration */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            AWS IAM Security Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="aws-profile">AWS Profile</Label>
                <Select value={awsProfile} onValueChange={setAwsProfile}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select AWS Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">default</SelectItem>
                    <SelectItem value="production">production</SelectItem>
                    <SelectItem value="development">development</SelectItem>
                    <SelectItem value="staging">staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Scan Scope</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">IAM Users & Access Keys</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">IAM Roles & Trust Policies</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">IAM Policies & Permissions</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Cross-Account Access</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Compliance Frameworks</Label>
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
                    <span className="text-sm">NIST Cybersecurity Framework</span>
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
              {isScanning ? "Scanning..." : "Start IAM Scan"}
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
              <span>AWS IAM Scan Progress</span>
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
                  {isScanning ? 'Analyzing IAM configuration...' : 
                   scanResult ? `Account: ${scanResult.account_id} | Region: ${scanResult.region}` :
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
              <Shield className="h-5 w-5 text-primary" />
              AWS IAM Security Findings ({scanResult.findings.length} issues)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Security Findings</TabsTrigger>
                <TabsTrigger value="resources">Resource Summary</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="findings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                  <div className="xl:col-span-2">
                    <Label htmlFor="finding-search">Search Findings</Label>
                    <Input
                      id="finding-search"
                      value={findingSearchTerm}
                      onChange={(event) => setFindingSearchTerm(event.target.value)}
                      placeholder="Search by resource, finding ID, ARN, or keyword..."
                      className="bg-input border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="finding-severity">Severity</Label>
                    <Select value={findingSeverityFilter} onValueChange={setFindingSeverityFilter}>
                      <SelectTrigger id="finding-severity" className="bg-input border-border">
                        <SelectValue placeholder="All severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All severities</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="finding-type">Type</Label>
                    <Select value={findingTypeFilter} onValueChange={setFindingTypeFilter}>
                      <SelectTrigger id="finding-type" className="bg-input border-border">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="finding-status">Status</Label>
                    <Select value={findingStatusFilter} onValueChange={setFindingStatusFilter}>
                      <SelectTrigger id="finding-status" className="bg-input border-border">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="finding-page-size">Results per page</Label>
                    <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger id="finding-page-size" className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="finding-start-date">Start date</Label>
                    <Input
                      id="finding-start-date"
                      type="date"
                      value={startDateFilter}
                      onChange={(event) => setStartDateFilter(event.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="finding-end-date">End date</Label>
                    <Input
                      id="finding-end-date"
                      type="date"
                      value={endDateFilter}
                      onChange={(event) => setEndDateFilter(event.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="md:self-end">
                    <Button variant="outline" className="border-border w-full md:w-auto" onClick={clearFindingFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {filteredFindings.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                    {" "}to{" "}
                    {Math.min(currentPage * pageSize, filteredFindings.length)} of {filteredFindings.length} findings
                  </span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>ID</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Risk Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <TableRow key={index} className="border-border">
                          <TableCell><Skeleton className="h-4 w-24 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-muted/20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12 bg-muted/20" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedFindings.length === 0 ? (
                      <TableRow className="border-border">
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No findings match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFindings.map((finding) => (
                        <TableRow 
                          key={finding.id} 
                          className="border-border cursor-pointer hover:bg-accent/10 transition-colors"
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {finding.id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getResourceIcon(finding.type)}
                              <div>
                                <p className="font-mono text-sm">{finding.resource_name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {finding.resource_arn}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {finding.type}
                            </Badge>
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
                            <Select
                              value={getFindingStatus(finding)}
                              onValueChange={(value) => updateFindingStatus(finding.id, value as FindingStatus)}
                            >
                              <SelectTrigger className="h-8 w-[130px] bg-input border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge className={`mt-2 ${statusColorMap[getFindingStatus(finding)]}`}>
                              {getFindingStatus(finding)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(finding.created_date).toLocaleDateString()}
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="border-border"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.users}</p>
                    <p className="text-sm text-muted-foreground">IAM Users</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <UserX className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.roles}</p>
                    <p className="text-sm text-muted-foreground">IAM Roles</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.policies}</p>
                    <p className="text-sm text-muted-foreground">IAM Policies</p>
                  </div>
                  <div className="cyber-glass p-4 rounded-lg text-center">
                    <Database className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-medium">{scanResult.scan_summary.groups}</p>
                    <p className="text-sm text-muted-foreground">IAM Groups</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <div className="grid gap-4">
                  {['CIS AWS Foundations', 'SOC 2 Type II', 'PCI-DSS', 'NIST'].map((framework) => {
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