import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { 
  Shield, 
  AlertTriangle,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";

interface GuardDutyFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: number;
  count: number;
  first_seen: string;
  last_seen: string;
  resource_type: string;
  resource_id: string;
  region: string;
  account_id: string;
}

const mockGuardDutyFindings: GuardDutyFinding[] = [
  {
    id: 'gd-finding-001',
    type: 'Recon:EC2/PortProbeUnprotectedPort',
    title: 'EC2 instance is being probed by a known malicious host',
    description: 'EC2 instance i-1234567890abcdef0 is being probed on port 22 from IP 203.0.113.42',
    severity: 7,
    count: 45,
    first_seen: '2024-01-15T08:00:00Z',
    last_seen: '2024-01-15T14:30:00Z',
    resource_type: 'Instance',
    resource_id: 'i-1234567890abcdef0',
    region: 'us-east-1',
    account_id: '123456789012'
  },
  {
    id: 'gd-finding-002',
    type: 'UnauthorizedAPICall:IAMUser/InstanceCredentialExfiltration',
    title: 'Unusual API calls made by an IAM user',
    description: 'IAM user admin-user-dev made unusual API calls that may indicate credential theft',
    severity: 8,
    count: 12,
    first_seen: '2024-01-14T16:20:00Z',
    last_seen: '2024-01-14T18:45:00Z',
    resource_type: 'IAMUser',
    resource_id: 'admin-user-dev',
    region: 'us-east-1',
    account_id: '123456789012'
  },
  {
    id: 'gd-finding-003',
    type: 'Stealth:IAMUser/CloudTrailLoggingDisabled',
    title: 'CloudTrail logging has been disabled',
    description: 'CloudTrail trail security-audit-trail was stopped or deleted',
    severity: 9,
    count: 1,
    first_seen: '2024-01-13T10:15:00Z',
    last_seen: '2024-01-13T10:15:00Z',
    resource_type: 'Trail',
    resource_id: 'security-audit-trail',
    region: 'us-east-1',
    account_id: '123456789012'
  }
];

export function GuardDuty() {
  const [findings, setFindings] = useState<GuardDutyFinding[]>(mockGuardDutyFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing GuardDuty findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('GuardDuty findings updated');
    }, 1500);
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'bg-[#ff0040] text-white';
    if (severity >= 6) return 'bg-[#ff6b35] text-white';
    if (severity >= 4) return 'bg-[#ffb000] text-black';
    return 'bg-[#00ff88] text-black';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 8) return 'High';
    if (severity >= 6) return 'Medium';
    if (severity >= 4) return 'Low';
    return 'Info';
  };

  const filteredFindings = findings.filter(f => {
    if (selectedSeverity === 'high' && f.severity < 8) return false;
    if (selectedSeverity === 'medium' && (f.severity < 6 || f.severity >= 8)) return false;
    if (selectedSeverity === 'low' && f.severity >= 6) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            GuardDuty
          </h1>
          <p className="text-muted-foreground mt-1">
            Threat detection service that monitors for malicious activity and unauthorized behavior
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

      <Card className="cyber-card border-[#ff0040]/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#ff0040]" />
            Active Threats ({findings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Filter by Severity</Label>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High (8-10)</SelectItem>
                <SelectItem value="medium">Medium (6-7)</SelectItem>
                <SelectItem value="low">Low (4-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Threat Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>First Seen</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => (
                <TableRow key={finding.id} className="cursor-pointer hover:bg-accent/10">
                  <TableCell>
                    <div>
                      <p className="font-medium">{finding.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{finding.type}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">{finding.description}</TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(finding.severity)}>
                      {getSeverityLabel(finding.severity)} ({finding.severity})
                    </Badge>
                  </TableCell>
                  <TableCell>{finding.count}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-mono">{finding.resource_id}</p>
                      <p className="text-xs text-muted-foreground">{finding.resource_type}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(finding.first_seen).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(finding.last_seen).toLocaleDateString()}
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

