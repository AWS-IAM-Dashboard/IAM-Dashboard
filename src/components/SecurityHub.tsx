import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Play, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Filter,
  Download
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";
import { scanSecurityHub, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";
import { PageTour, type TourStep } from "./PageTour";

interface SecurityHubFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  status: 'NEW' | 'NOTIFIED' | 'SUPPRESSED' | 'RESOLVED';
  product_name: string;
  resource_type: string;
  resource_id: string;
  region: string;
  created_at: string;
  updated_at: string;
  compliance_status: string;
  workflow_status: string;
}

interface SecurityHubSummary {
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  informational_findings: number;
  new_findings: number;
  resolved_findings: number;
  compliance_score: number;
}

const mockFindings: SecurityHubFinding[] = [
  {
    id: 'sh-finding-001',
    title: 'S3 bucket has public read access',
    description: 'The S3 bucket "company-backups-public" allows public read access, potentially exposing sensitive data',
    severity: 'CRITICAL',
    status: 'NEW',
    product_name: 'Security Hub',
    resource_type: 'AwsS3Bucket',
    resource_id: 'company-backups-public',
    region: 'us-east-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    compliance_status: 'FAILED',
    workflow_status: 'NEW'
  },
  {
    id: 'sh-finding-002',
    title: 'EC2 instance security group allows unrestricted access',
    description: 'Security group sg-web-public allows inbound traffic from 0.0.0.0/0 on port 22',
    severity: 'HIGH',
    status: 'NEW',
    product_name: 'GuardDuty',
    resource_type: 'AwsEc2SecurityGroup',
    resource_id: 'sg-12345678',
    region: 'us-east-1',
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-14T14:30:00Z',
    compliance_status: 'FAILED',
    workflow_status: 'NEW'
  },
  {
    id: 'sh-finding-003',
    title: 'IAM user has access keys that have not been rotated in 90 days',
    description: 'User admin-user-dev has access keys older than 90 days',
    severity: 'MEDIUM',
    status: 'NOTIFIED',
    product_name: 'Config',
    resource_type: 'AwsIamAccessKey',
    resource_id: 'AKIAIOSFODNN7EXAMPLE',
    region: 'us-east-1',
    created_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-13T16:45:00Z',
    compliance_status: 'WARNING',
    workflow_status: 'NOTIFIED'
  }
];

const mockSummary: SecurityHubSummary = {
  total_findings: 127,
  critical_findings: 3,
  high_findings: 15,
  medium_findings: 42,
  low_findings: 52,
  informational_findings: 15,
  new_findings: 23,
  resolved_findings: 104,
  compliance_score: 82
};

export function SecurityHub() {
  const [findings, setFindings] = useState<SecurityHubFinding[]>([]);
  const [summary, setSummary] = useState<SecurityHubSummary>({
    total_findings: 0,
    critical_findings: 0,
    high_findings: 0,
    medium_findings: 0,
    low_findings: 0,
    informational_findings: 0,
    new_findings: 0,
    resolved_findings: 0,
    compliance_score: 100
  });
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [error, setError] = useState<string | null>(null);
  const { addScanResult, getScanResult } = useScanResults();

  // Load existing scan results if available
  useEffect(() => {
    const existingResult = getScanResult('security-hub');
    if (existingResult && existingResult.findings && existingResult.findings.length > 0) {
      transformAndSetFindings(existingResult);
    }
  }, []);

  // Transform Lambda response to component format
  const transformAndSetFindings = (scanResponse: any) => {
    const results = scanResponse.results || scanResponse;
    
    // Transform findings from AWS Security Hub format
    const transformedFindings: SecurityHubFinding[] = (results.findings || []).map((finding: any) => {
      const severity = finding.Severity?.Label || finding.severity || 'INFORMATIONAL';
      const workflow = finding.Workflow?.Status || finding.workflow_status || 'NEW';
      const compliance = finding.Compliance?.Status || finding.compliance_status || 'UNKNOWN';
      
      return {
        id: finding.Id || finding.id || `sh-${Date.now()}-${Math.random()}`,
        title: finding.Title || finding.title || 'Security Finding',
        description: finding.Description || finding.description || '',
        severity: severity.toUpperCase() as SecurityHubFinding['severity'],
        status: workflow.toUpperCase() as SecurityHubFinding['status'],
        product_name: finding.ProductFields?.['aws/securityhub/ProductName'] || 
                     finding.ProductName || 
                     finding.product_name || 
                     'Security Hub',
        resource_type: finding.Resources?.[0]?.Type || finding.resource_type || 'Unknown',
        resource_id: finding.Resources?.[0]?.Id || finding.resource_id || 'N/A',
        region: finding.Resources?.[0]?.Region || finding.region || selectedRegion,
        created_at: finding.CreatedAt || finding.created_at || new Date().toISOString(),
        updated_at: finding.UpdatedAt || finding.updated_at || new Date().toISOString(),
        compliance_status: compliance,
        workflow_status: workflow
      };
    });

    setFindings(transformedFindings);

    // Transform summary
    const summaryData = results.summary || {};
    setSummary({
      total_findings: summaryData.total_findings || transformedFindings.length,
      critical_findings: summaryData.critical || 0,
      high_findings: summaryData.high || 0,
      medium_findings: summaryData.medium || 0,
      low_findings: summaryData.low || 0,
      informational_findings: transformedFindings.filter(f => f.severity === 'INFORMATIONAL').length,
      new_findings: transformedFindings.filter(f => f.status === 'NEW').length,
      resolved_findings: transformedFindings.filter(f => f.status === 'RESOLVED').length,
      compliance_score: summaryData.compliance_score || 
        (transformedFindings.length === 0 ? 100 : 
         Math.max(0, Math.round(100 - ((summaryData.critical || 0) * 10 + (summaryData.high || 0) * 5 + (summaryData.medium || 0) * 2))))
    });
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      toast.info('Security Hub scan started', {
        description: 'Fetching security findings from AWS Security Hub...'
      });

      // Call the real API
      const response: ScanResponse = await scanSecurityHub(selectedRegion);
      
      // API Response received

      // Check for errors in response (Lambda returns 200 even with errors)
      const errorMsg = response.error || response.results?.error || response.message;
      if (errorMsg) {
        // Error detected in Security Hub response
        if (errorMsg.toLowerCase().includes('not enabled') || 
            errorMsg.toLowerCase().includes('invalidaccess')) {
          toast.error('Security Hub not enabled', {
            description: 'Please enable AWS Security Hub in this region first'
          });
          setError('Security Hub is not enabled in this region. Please enable it in the AWS Console.');
        } else if (errorMsg.toLowerCase().includes('permission') || 
                   errorMsg.toLowerCase().includes('accessdenied')) {
          toast.error('Permission denied', {
            description: 'Lambda does not have permission to access Security Hub'
          });
          setError('Lambda does not have permission to access Security Hub. Please check IAM permissions.');
        } else {
          toast.error('Security Hub scan failed', {
            description: errorMsg
          });
          setError(errorMsg);
        }
        setIsScanning(false);
        return;
      }

      // Check if we have valid response structure
      if (!response.results) {
        // No results in Security Hub response
        setError('Invalid response format from Security Hub scan.');
        setIsScanning(false);
        return;
      }

      // Empty findings is valid (Security Hub enabled but no findings)
      const findings = response.results.findings || [];
      const summary = response.results.summary || {};
      
      // Security Hub findings and summary processed

      // Store in context for Reports component
      addScanResult(response);

      // Transform and set findings
      transformAndSetFindings(response);

      setIsScanning(false);
      const findingsCount = summary.total_findings || findings.length || 0;
      if (findingsCount > 0) {
        toast.success('Security Hub scan completed', {
          description: `Found ${findingsCount} security findings`
        });
      } else {
        toast.success('Security Hub scan completed', {
          description: 'No security findings found (this is good!)'
        });
      }
      
    } catch (err) {
      // Security Hub scan error
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsScanning(false);
      toast.error('Failed to scan Security Hub', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await handleStartScan();
    setIsRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#ff0040] text-white';
      case 'HIGH': return 'bg-[#ff6b35] text-white';
      case 'MEDIUM': return 'bg-[#ffb000] text-black';
      case 'LOW': return 'bg-[#00ff88] text-black';
      case 'INFORMATIONAL': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500 text-white';
      case 'NOTIFIED': return 'bg-yellow-500 text-black';
      case 'SUPPRESSED': return 'bg-gray-500 text-white';
      case 'RESOLVED': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredFindings = findings.filter(f => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'all' && f.status !== selectedStatus) return false;
    if (selectedProduct !== 'all' && f.product_name !== selectedProduct) return false;
    return true;
  });

  return (
    <div className="max-w-full overflow-x-hidden p-4 md:p-6 space-y-6">
      <DemoModeBanner />
      
      {/* Header */}
      <div data-tour="hub-header" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Security Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Centralized view of security findings from all AWS security services
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us-east-1">us-east-1</SelectItem>
              <SelectItem value="us-west-2">us-west-2</SelectItem>
              <SelectItem value="eu-west-1">eu-west-1</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleStartScan}
            disabled={isScanning || isRefreshing}
            className="w-full sm:w-auto bg-primary text-primary-foreground"
          >
            <Play className={`h-4 w-4 mr-2 ${isScanning ? 'animate-pulse' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan Security Hub'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing || isScanning}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="cyber-card border-[#ff0040]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[#ff0040]">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isScanning && (
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Scanning Security Hub...</span>
                <span className="text-sm text-muted-foreground">This may take a moment</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}


      {/* Interactive Tour */}
      {!isScanning && findings.length === 0 && (
        <PageTour
          welcomeTitle="AWS Security Hub"
          welcomeDescription="Security Hub aggregates findings from all your AWS security services — GuardDuty, Config, Inspector, Macie, and IAM Access Analyzer — into a single view. No findings have been fetched yet. Let’s walk through the page."
          welcomeIcon={<Shield className="h-7 w-7" />}
          steps={[
            {
              target: "hub-header",
              title: "1. Region & Scan Controls",
              description: "Select your AWS region and click Scan Security Hub to pull findings from all connected services. You can also Refresh existing data or Export results.",
              icon: <Play className="h-5 w-5" />,
              placement: "bottom",
              action: {
                label: "Scan Security Hub",
                onClick: handleStartScan,
                icon: <Play className="h-4 w-4" />,
              },
            },
            {
              target: "hub-summary",
              title: "2. Summary Metrics",
              description: "These four cards show your total findings count, critical and high counts, and overall compliance score. They update automatically after each scan.",
              hint: "A compliance score below 80% usually indicates unaddressed critical or high findings.",
              icon: <CheckCircle className="h-5 w-5" />,
              placement: "bottom",
            },
            {
              target: "hub-filters",
              title: "3. Filter Findings",
              description: "Narrow the findings table by severity, status (New, Notified, Resolved), or source service (GuardDuty, Config, etc.). Filters update the table in real time.",
              icon: <Filter className="h-5 w-5" />,
              placement: "bottom",
            },
            {
              target: "hub-findings",
              title: "4. Findings Table",
              description: "All security findings appear here once a scan completes. Each row shows the finding title, severity, status, source service, affected resource, and compliance info. Click any row to investigate.",
              hint: "The table is empty right now — run a scan to populate it.",
              icon: <AlertTriangle className="h-5 w-5" />,
              placement: "top",
            },
          ] satisfies TourStep[]}
        />
      )}

      {/* Summary Cards */}
      <div data-tour="hub-summary" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-bold mt-1">{summary.total_findings}</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold mt-1 text-[#ff0040]">{summary.critical_findings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ff6b35]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High</p>
                <p className="text-2xl font-bold mt-1 text-[#ff6b35]">{summary.high_findings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff6b35] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#00ff88]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold mt-1 text-[#00ff88]">{summary.compliance_score}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card data-tour="hub-filters" className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="INFORMATIONAL">Informational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="NOTIFIED">Notified</SelectItem>
                  <SelectItem value="SUPPRESSED">Suppressed</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product/Source</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="Security Hub">Security Hub</SelectItem>
                  <SelectItem value="GuardDuty">GuardDuty</SelectItem>
                  <SelectItem value="Config">Config</SelectItem>
                  <SelectItem value="Inspector">Inspector</SelectItem>
                  <SelectItem value="Macie">Macie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Findings Table */}
      <Card data-tour="hub-findings" className="cyber-card">
        <CardHeader>
          <CardTitle>Security Findings ({filteredFindings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFindings.length === 0 && !isScanning ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No findings available. Click "Scan Security Hub" to fetch security findings.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFindings.map((finding) => (
                <TableRow key={finding.id} className="cursor-pointer hover:bg-accent/10">
                  <TableCell>
                    <div>
                      <p className="font-medium">{finding.title}</p>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(finding.severity)}>
                      {finding.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(finding.status)}>
                      {finding.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{finding.product_name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-mono">{finding.resource_id}</p>
                      <p className="text-xs text-muted-foreground">{finding.resource_type}</p>
                    </div>
                  </TableCell>
                  <TableCell>{finding.region}</TableCell>
                  <TableCell>
                    <Badge variant={finding.compliance_status === 'FAILED' ? 'destructive' : 'outline'}>
                      {finding.compliance_status}
                    </Badge>
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

