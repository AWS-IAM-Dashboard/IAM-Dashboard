import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Shield, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

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
    resource_id: '*******EXAMPLE',
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
  const [findings, setFindings] = useState<SecurityHubFinding[]>(mockFindings);
  const [summary, setSummary] = useState<SecurityHubSummary>(mockSummary);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Security Hub findings...');
    
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Security Hub findings updated');
    }, 1500);
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
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Security Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Centralized view of security findings from all AWS security services
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Findings</p>
                <p className="text-2xl mt-1">{summary.total_findings}</p>
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
                <p className="text-2xl mt-1 text-[#ff0040]">{summary.critical_findings}</p>
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
                <p className="text-2xl mt-1 text-[#ff6b35]">{summary.high_findings}</p>
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
                <p className="text-2xl mt-1 text-[#00ff88]">{summary.compliance_score}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
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

      <Card className="cyber-card">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-sm md:text-base">Security Findings ({filteredFindings.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="min-w-[90px]">Severity</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Product</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[150px]">Resource</TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[100px]">Region</TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[100px]">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFindings.map((finding) => (
                  <TableRow key={finding.id} className="cursor-pointer hover:bg-accent/10">
                    <TableCell className="min-w-[200px]">
                      <div>
                        <p className="font-medium text-sm">{finding.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{finding.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[90px]">
                      <Badge className={`${getSeverityColor(finding.severity)} text-xs`}>
                        {finding.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[90px]">
                      <Badge className={`${getStatusColor(finding.status)} text-xs`}>
                        {finding.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{finding.product_name}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div>
                        <p className="text-xs font-mono">{finding.resource_id}</p>
                        <p className="text-xs text-muted-foreground">{finding.resource_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{finding.region}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Badge className="text-xs" variant={finding.compliance_status === 'FAILED' ? 'destructive' : 'outline'}>
                        {finding.compliance_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
