import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { 
  Search, 
  AlertTriangle,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";

interface InspectorFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  vulnerability_id: string;
  cve_id?: string;
  package_name?: string;
  resource_type: string;
  resource_id: string;
  region: string;
  first_observed_at: string;
  last_observed_at: string;
}

const mockInspectorFindings: InspectorFinding[] = [
  {
    id: 'inspector-001',
    title: 'Critical severity vulnerability found in EC2 instance',
    description: 'EC2 instance contains a package with a critical vulnerability (CVE-2024-0001)',
    severity: 'CRITICAL',
    vulnerability_id: 'CVE-2024-0001',
    cve_id: 'CVE-2024-0001',
    package_name: 'openssl-1.1.1',
    resource_type: 'AWS_EC2_INSTANCE',
    resource_id: 'i-1234567890abcdef0',
    region: 'us-east-1',
    first_observed_at: '2024-01-15T08:00:00Z',
    last_observed_at: '2024-01-15T14:30:00Z'
  },
  {
    id: 'inspector-002',
    title: 'High severity vulnerability in Lambda function',
    description: 'Lambda function contains a dependency with known high severity vulnerability',
    severity: 'HIGH',
    vulnerability_id: 'GHSA-xxxx-xxxx-xxxx',
    package_name: 'lodash-4.17.20',
    resource_type: 'AWS_LAMBDA_FUNCTION',
    resource_id: 'security-scanner-function',
    region: 'us-east-1',
    first_observed_at: '2024-01-14T10:15:00Z',
    last_observed_at: '2024-01-14T10:15:00Z'
  },
  {
    id: 'inspector-003',
    title: 'Medium severity vulnerability in ECR image',
    description: 'Container image contains outdated base image with medium severity issues',
    severity: 'MEDIUM',
    vulnerability_id: 'CVE-2023-9999',
    package_name: 'alpine-base-3.15',
    resource_type: 'AWS_ECR_CONTAINER_IMAGE',
    resource_id: '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:latest',
    region: 'us-east-1',
    first_observed_at: '2024-01-13T16:20:00Z',
    last_observed_at: '2024-01-13T16:20:00Z'
  }
];

export function Inspector() {
  const [findings, setFindings] = useState<InspectorFinding[]>(mockInspectorFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Inspector findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Inspector findings updated');
    }, 1500);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#ff0040] text-white';
      case 'HIGH': return 'bg-[#ff6b35] text-white';
      case 'MEDIUM': return 'bg-[#ffb000] text-black';
      case 'LOW': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredFindings = findings.filter(f => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedResourceType !== 'all' && f.resource_type !== selectedResourceType) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Inspector
          </h1>
          <p className="text-muted-foreground mt-1">
            Vulnerability management service that scans EC2, Lambda, and ECR for vulnerabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold mt-1 text-[#ff0040]">
                  {findings.filter(f => f.severity === 'CRITICAL').length}
                </p>
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
                <p className="text-2xl font-bold mt-1 text-[#ff6b35]">
                  {findings.filter(f => f.severity === 'HIGH').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff6b35] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ffb000]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium</p>
                <p className="text-2xl font-bold mt-1 text-[#ffb000]">
                  {findings.filter(f => f.severity === 'MEDIUM').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-bold mt-1">{findings.length}</p>
              </div>
              <Search className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resource Type</Label>
              <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource Types</SelectItem>
                  <SelectItem value="AWS_EC2_INSTANCE">EC2 Instance</SelectItem>
                  <SelectItem value="AWS_LAMBDA_FUNCTION">Lambda Function</SelectItem>
                  <SelectItem value="AWS_ECR_CONTAINER_IMAGE">ECR Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Findings Table */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Vulnerability Findings ({filteredFindings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vulnerability</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>CVE/Package</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource Type</TableHead>
                <TableHead>First Observed</TableHead>
                <TableHead>Last Observed</TableHead>
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
                    <div>
                      {finding.cve_id && (
                        <p className="font-mono text-sm">{finding.cve_id}</p>
                      )}
                      {finding.package_name && (
                        <p className="text-xs text-muted-foreground">{finding.package_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm">{finding.resource_id}</p>
                  </TableCell>
                  <TableCell className="text-sm">{finding.resource_type}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(finding.first_observed_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(finding.last_observed_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

