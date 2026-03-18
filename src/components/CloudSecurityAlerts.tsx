import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Filter,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Users
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";
import { useScanResults } from "../context/ScanResultsContext";
import { maskSensitiveData } from "../utils/security";
import { getDedupKey } from "../utils/findingsDedup";

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  service: string;
  resource_id: string;
  timestamp: string;
  status: 'Active' | 'Acknowledged' | 'Resolved';
  assignee?: string;
  rule_id: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  service: string;
  condition: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  enabled: boolean;
  notifications: string[];
}

const mockAlerts: SecurityAlert[] = [
  {
    id: 'alert-001',
    title: 'S3 Bucket Made Public',
    description: 'Bucket "company-backups" was configured to allow public read access',
    severity: 'Critical',
    service: 'S3',
    resource_id: 'company-backups',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    status: 'Active',
    rule_id: 'rule-s3-public'
  },
  {
    id: 'alert-002',
    title: 'Security Group Allows All Traffic',
    description: 'Security group "sg-web-public" allows inbound traffic from 0.0.0.0/0 on port 22',
    severity: 'High',
    service: 'EC2',
    resource_id: 'sg-web-public',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: 'Acknowledged',
    assignee: 'Security Team',
    rule_id: 'rule-sg-unrestricted'
  },
  {
    id: 'alert-003',
    title: 'IAM User Without MFA',
    description: 'User "admin-user-dev" has administrator privileges but no MFA enabled',
    severity: 'High',
    service: 'IAM',
    resource_id: 'admin-user-dev',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    status: 'Active',
    rule_id: 'rule-iam-no-mfa'
  },
  {
    id: 'alert-004',
    title: 'Unencrypted RDS Instance',
    description: 'RDS instance "prod-database" does not have encryption at rest enabled',
    severity: 'Medium',
    service: 'RDS',
    resource_id: 'prod-database',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: 'Resolved',
    assignee: 'DevOps Team',
    rule_id: 'rule-rds-encryption'
  }
];

const mockAlertRules: AlertRule[] = [
  {
    id: 'rule-s3-public',
    name: 'S3 Bucket Public Access',
    description: 'Triggers when an S3 bucket is configured for public access',
    service: 'S3',
    condition: 'bucket.public_access = true',
    severity: 'Critical',
    enabled: true,
    notifications: ['email', 'slack']
  },
  {
    id: 'rule-sg-unrestricted',
    name: 'Unrestricted Security Group',
    description: 'Triggers when security group allows traffic from 0.0.0.0/0',
    service: 'EC2',
    condition: 'security_group.cidr = "0.0.0.0/0"',
    severity: 'High',
    enabled: true,
    notifications: ['email']
  },
  {
    id: 'rule-iam-no-mfa',
    name: 'IAM User Without MFA',
    description: 'Triggers when privileged IAM user has no MFA enabled',
    service: 'IAM',
    condition: 'user.privileged = true AND user.mfa = false',
    severity: 'High',
    enabled: true,
    notifications: ['email', 'sms']
  },
  {
    id: 'rule-rds-encryption',
    name: 'Unencrypted RDS Instance',
    description: 'Triggers when RDS instance lacks encryption at rest',
    service: 'RDS',
    condition: 'rds.encryption = false',
    severity: 'Medium',
    enabled: false,
    notifications: ['email']
  }
];

export function CloudSecurityAlerts() {
  const { getAllScanResults, scanResultsVersion } = useScanResults();
  const [alertRules, setAlertRules] = useState<AlertRule[]>(mockAlertRules);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<string>>(new Set());

  // Get all scan results
  const scanResults = useMemo(() => {
    return getAllScanResults();
  }, [scanResultsVersion, getAllScanResults]);

  // Transform scan findings into SecurityAlert format
  const alerts = useMemo(() => {
    const allAlerts: SecurityAlert[] = [];
    const severityOrder: Record<SecurityAlert['severity'], number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    
    scanResults.forEach(scan => {
      const findings = scan.findings || [];
      const scannerType = scan.scanner_type || 'unknown';
      
      findings.forEach((finding: any, index: number) => {
        const severity = (finding.severity || 'Medium').charAt(0).toUpperCase() + 
                        (finding.severity || 'Medium').slice(1).toLowerCase();
        const dedupKey = getDedupKey(finding);
        const alertId = dedupKey || finding.id || `${scannerType}-${scan.scan_id}-${index}`;
        
        // Determine service name from scanner type or finding
        let service = scannerType.toUpperCase();
        if (scannerType === 'iam') service = 'IAM';
        else if (scannerType === 'ec2') service = 'EC2';
        else if (scannerType === 's3') service = 'S3';
        else if (scannerType === 'security-hub') service = 'Security Hub';
        else if (scannerType === 'guardduty') service = 'GuardDuty';
        else if (scannerType === 'config') service = 'Config';
        else if (scannerType === 'inspector') service = 'Inspector';
        else if (scannerType === 'macie') service = 'Macie';
        
        // Determine status based on user actions
        let status: 'Active' | 'Acknowledged' | 'Resolved' = 'Active';
        if (resolvedAlerts.has(alertId)) {
          status = 'Resolved';
        } else if (acknowledgedAlerts.has(alertId)) {
          status = 'Acknowledged';
        }
        
        // Generate rule ID based on finding type
        const findingType = (finding.type || finding.finding_type || '').toLowerCase();
        let ruleId = 'rule-generic';
        if (findingType.includes('public') || findingType.includes('s3')) ruleId = 'rule-s3-public';
        else if (findingType.includes('security') || findingType.includes('group')) ruleId = 'rule-sg-unrestricted';
        else if (findingType.includes('mfa') || findingType.includes('iam')) ruleId = 'rule-iam-no-mfa';
        else if (findingType.includes('encryption') || findingType.includes('rds')) ruleId = 'rule-rds-encryption';
        
        const resourceId = finding.resource_name || finding.resource_arn || finding.resource_id || 'Unknown';
        const description = finding.description || finding.recommendation || 'Security issue detected';
        
        allAlerts.push({
          id: alertId,
          title: finding.title || finding.finding_type || maskSensitiveData(description)?.substring(0, 50) || 'Security Finding',
          description: maskSensitiveData(description),
          severity: (severity as 'Critical' | 'High' | 'Medium' | 'Low') || 'Medium',
          service,
          resource_id: maskSensitiveData(resourceId),
          timestamp: finding.timestamp || scan.timestamp || new Date().toISOString(),
          status,
          rule_id: ruleId
        });
      });
    });
    
    // Deduplicate across scanner sources by alert id (which uses the dedup key when available),
    // keeping the highest severity (and newest timestamp) representative.
    const dedupedById = new Map<string, SecurityAlert>();
    for (const a of allAlerts) {
      const id = String(a.id);
      const existing = dedupedById.get(id);
      if (!existing) {
        dedupedById.set(id, a);
        continue;
      }

      const aRank = severityOrder[a.severity] ?? 0;
      const existingRank = severityOrder[existing.severity] ?? 0;
      if (aRank > existingRank) {
        dedupedById.set(id, a);
        continue;
      }
      if (aRank === existingRank) {
        const aTs = new Date(a.timestamp).getTime();
        const eTs = new Date(existing.timestamp).getTime();
        if (aTs > eTs) dedupedById.set(id, a);
      }
    }

    // Sort by severity (Critical first) and timestamp (newest first)
    return Array.from(dedupedById.values()).sort((a, b) => {
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [scanResults, acknowledgedAlerts, resolvedAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-[#ff0040] text-white';
      case 'High': return 'bg-[#ff6b35] text-white';
      case 'Medium': return 'bg-[#ffb000] text-black';
      case 'Low': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-[#ff0040] text-white';
      case 'Acknowledged': return 'bg-[#ffb000] text-black';
      case 'Resolved': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
    toast.success('Alert acknowledged');
  };

  const handleResolveAlert = (alertId: string) => {
    setResolvedAlerts(prev => new Set([...prev, alertId]));
    toast.success('Alert resolved');
  };

  const filteredAlerts = alerts.filter(alert => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedService !== 'all' && alert.service !== selectedService) return false;
    if (selectedStatus !== 'all' && alert.status !== selectedStatus) return false;
    return true;
  });

  // Group alerts by severity
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, SecurityAlert[]> = {
      'Critical': [],
      'High': [],
      'Medium': [],
      'Low': []
    };
    
    filteredAlerts.forEach(alert => {
      if (groups[alert.severity]) {
        groups[alert.severity].push(alert);
      }
    });
    
    return groups;
  }, [filteredAlerts]);

  const alertsStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'Active').length,
    critical: alerts.filter(a => a.severity === 'Critical').length,
    high: alerts.filter(a => a.severity === 'High').length
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      {/* Alert Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-medium">{alertsStats.total}</p>
            <p className="text-sm text-muted-foreground">Total Alerts</p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 text-[#ff0040] mx-auto mb-2" />
            <p className="text-2xl font-medium text-[#ff0040]">{alertsStats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 text-[#ff0040] mx-auto mb-2" />
            <p className="text-2xl font-medium text-[#ff0040]">{alertsStats.critical}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-[#ff6b35] mx-auto mb-2" />
            <p className="text-2xl font-medium text-[#ff6b35]">{alertsStats.high}</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Security Alerts Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
              <TabsTrigger value="rules">Alert Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="severity-filter">Severity</Label>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="service-filter">Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="IAM">IAM</SelectItem>
                      <SelectItem value="EC2">EC2</SelectItem>
                      <SelectItem value="S3">S3</SelectItem>
                      <SelectItem value="RDS">RDS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" className="border-border">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Alerts List - Grouped by Severity */}
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No security alerts found.</p>
                  <p className="text-sm mt-2">Run a security scan to generate alerts from findings.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                  {(['Critical', 'High', 'Medium', 'Low'] as const).map((severity) => {
                    const severityAlerts = groupedAlerts[severity] || [];
                    if (severityAlerts.length === 0) return null;
                    
                    return (
                      <AccordionItem 
                        key={severity} 
                        value={severity} 
                        className="border border-border/60 rounded-lg mb-4 px-4 py-2 bg-muted/5 hover:bg-muted/10 transition-colors"
                      >
                        <AccordionTrigger className="hover:no-underline py-4 px-2">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <Badge className={getSeverityColor(severity)}>
                                {severity}
                              </Badge>
                              <span className="text-sm font-medium">
                                {severityAlerts.length} alert{severityAlerts.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <div className="space-y-3">
                            {severityAlerts.map((alert) => (
                              <div key={alert.id} className="cyber-glass p-4 rounded-lg border border-border/50 bg-card/50">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <h4 className="font-medium text-sm">{alert.title}</h4>
                                      <Badge className={getStatusColor(alert.status)}>
                                        {alert.status}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {alert.service}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {alert.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(alert.timestamp).toLocaleString()}
                                      </span>
                                      <span className="font-mono text-xs break-all">Resource: {maskSensitiveData(alert.resource_id)}</span>
                                      {alert.assignee && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {alert.assignee}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 flex-shrink-0">
                                    {alert.status === 'Active' && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleAcknowledgeAlert(alert.id)}
                                        className="border-border"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Acknowledge
                                      </Button>
                                    )}
                                    {alert.status !== 'Resolved' && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleResolveAlert(alert.id)}
                                        className="border-border"
                                      >
                                        <Shield className="h-4 w-4 mr-1" />
                                        Resolve
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Alert Rules Configuration</h3>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/80">
                  <Settings className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
              
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="cyber-glass p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline">
                            {rule.service}
                          </Badge>
                          {rule.enabled && (
                            <Badge className="bg-[#00ff88] text-black text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Condition: {rule.condition}</span>
                          <span className="flex items-center gap-1">
                            Notifications: {rule.notifications.join(', ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={rule.enabled}
                          onCheckedChange={() => {
                            toast.info(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
                          }}
                        />
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}