import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { 
  Eye, 
  AlertTriangle,
  RefreshCw,
  Download,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";

interface MacieFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  bucket_name: string;
  object_key: string;
  sensitive_data_type: string;
  data_classification: string;
  occurrences: number;
  first_observed_at: string;
  last_observed_at: string;
}

const mockMacieFindings: MacieFinding[] = [
  {
    id: 'macie-001',
    type: 'Policy:IAMUser/S3BucketExposedPublicly',
    title: 'S3 bucket contains PII and is publicly accessible',
    description: 'S3 bucket "customer-data-backups" contains personally identifiable information (PII) and has public read access enabled',
    severity: 'CRITICAL',
    category: 'Data Privacy',
    bucket_name: 'customer-data-backups',
    object_key: 'customers/pii-data.csv',
    sensitive_data_type: 'SSN, Email Address, Credit Card',
    data_classification: 'PII',
    occurrences: 1,
    first_observed_at: '2024-01-15T08:00:00Z',
    last_observed_at: '2024-01-15T08:00:00Z'
  },
  {
    id: 'macie-002',
    type: 'Policy:IAMUser/S3BucketSharedExternally',
    title: 'S3 bucket shared with external AWS account',
    description: 'S3 bucket "shared-documents" is shared with external AWS account 999999999999',
    severity: 'HIGH',
    category: 'Data Exposure',
    bucket_name: 'shared-documents',
    object_key: 'contracts/partner-agreement.pdf',
    sensitive_data_type: 'Business Documents',
    data_classification: 'Confidential',
    occurrences: 5,
    first_observed_at: '2024-01-14T10:30:00Z',
    last_observed_at: '2024-01-14T16:45:00Z'
  },
  {
    id: 'macie-003',
    type: 'SensitiveData:S3Object/Credentials',
    title: 'Credentials detected in S3 object',
    description: 'S3 object contains potential AWS access keys or API tokens',
    severity: 'CRITICAL',
    category: 'Credential Exposure',
    bucket_name: 'application-logs',
    object_key: 'debug/config.log',
    sensitive_data_type: 'AWS Access Key, API Token',
    data_classification: 'Credentials',
    occurrences: 1,
    first_observed_at: '2024-01-13T14:20:00Z',
    last_observed_at: '2024-01-13T14:20:00Z'
  }
];

export function Macie() {
  const [findings, setFindings] = useState<MacieFinding[]>(mockMacieFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Macie findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Macie findings updated');
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
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="h-8 w-8 text-primary" />
            Macie
          </h1>
          <p className="text-muted-foreground mt-1">
            Data security service that discovers and protects sensitive data in S3
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

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-bold mt-1">{findings.length}</p>
              </div>
              <Eye className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buckets Scanned</p>
                <p className="text-2xl font-bold mt-1">
                  {new Set(findings.map(f => f.bucket_name)).size}
                </p>
              </div>
              <Database className="h-8 w-8 text-primary opacity-50" />
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
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Data Privacy">Data Privacy</SelectItem>
                  <SelectItem value="Data Exposure">Data Exposure</SelectItem>
                  <SelectItem value="Credential Exposure">Credential Exposure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Findings Table */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Data Sensitivity Findings ({filteredFindings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>S3 Location</TableHead>
                <TableHead>Sensitive Data</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Occurrences</TableHead>
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
                  <TableCell>{finding.category}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm">{finding.bucket_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {finding.object_key}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{finding.sensitive_data_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{finding.data_classification}</Badge>
                  </TableCell>
                  <TableCell>{finding.occurrences}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

