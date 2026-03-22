import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { 
  Shield, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";

interface ConfigRule {
  id: string;
  name: string;
  description: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
  resource_type: string;
  resource_count: number;
  last_evaluated: string;
}

interface ComplianceSummary {
  total_rules: number;
  compliant_rules: number;
  non_compliant_rules: number;
  not_applicable_rules: number;
  compliance_percentage: number;
}

const mockRules: ConfigRule[] = [
  {
    id: 'config-rule-001',
    name: 's3-bucket-public-read-prohibited',
    description: 'Checks that S3 buckets do not allow public read access',
    compliance_status: 'NON_COMPLIANT',
    resource_type: 'AWS::S3::Bucket',
    resource_count: 3,
    last_evaluated: '2024-01-15T10:00:00Z'
  },
  {
    id: 'config-rule-002',
    name: 'iam-password-policy',
    description: 'Checks that IAM password policy meets the specified requirements',
    compliance_status: 'COMPLIANT',
    resource_type: 'AWS::IAM::AccountPasswordPolicy',
    resource_count: 1,
    last_evaluated: '2024-01-15T09:30:00Z'
  },
  {
    id: 'config-rule-003',
    name: 'encrypted-volumes',
    description: 'Checks that EBS volumes are encrypted',
    compliance_status: 'NON_COMPLIANT',
    resource_type: 'AWS::EC2::Volume',
    resource_count: 5,
    last_evaluated: '2024-01-15T09:00:00Z'
  }
];

const mockSummary: ComplianceSummary = {
  total_rules: 24,
  compliant_rules: 16,
  non_compliant_rules: 7,
  not_applicable_rules: 1,
  compliance_percentage: 67
};

export function AWSConfig() {
  const [rules, setRules] = useState<ConfigRule[]>(mockRules);
  const [summary, setSummary] = useState<ComplianceSummary>(mockSummary);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Config compliance status...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Config compliance updated');
    }, 1500);
  };

  const filteredRules = rules.filter(r => {
    if (selectedStatus === 'all') return true;
    return r.compliance_status === selectedStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            AWS Config
          </h1>
          <p className="text-muted-foreground mt-1">
            Compliance and configuration management service
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

      {/* Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold mt-1">{summary.compliance_percentage}%</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
            <Progress value={summary.compliance_percentage} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#00ff88]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold mt-1 text-[#00ff88]">{summary.compliant_rules}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl font-bold mt-1 text-[#ff0040]">{summary.non_compliant_rules}</p>
              </div>
              <XCircle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold mt-1">{summary.total_rules}</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Filter by Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="COMPLIANT">Compliant</SelectItem>
                <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Compliance Status</TableHead>
                <TableHead>Resource Type</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Last Evaluated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer hover:bg-accent/10">
                  <TableCell>
                    <p className="font-medium font-mono text-sm">{rule.name}</p>
                  </TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        rule.compliance_status === 'COMPLIANT' 
                          ? 'bg-[#00ff88] text-black' 
                          : rule.compliance_status === 'NON_COMPLIANT'
                          ? 'bg-[#ff0040] text-white'
                          : 'bg-gray-500 text-white'
                      }
                    >
                      {rule.compliance_status.replace('_', '-')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{rule.resource_type}</TableCell>
                  <TableCell>{rule.resource_count}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(rule.last_evaluated).toLocaleString()}
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

