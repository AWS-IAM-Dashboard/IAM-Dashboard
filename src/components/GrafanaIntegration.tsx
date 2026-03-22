import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  BarChart3, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Monitor,
  Database,
  Activity,
  Wifi,
  Key,
  ExternalLink,
  RefreshCw,
  Play
} from "lucide-react";
import { toast } from "sonner";
import { DemoModeBanner } from "./DemoModeBanner";

interface GrafanaConnection {
  id: string;
  name: string;
  url: string;
  status: 'Connected' | 'Disconnected' | 'Error';
  last_sync: string;
  dashboards_count: number;
}

interface MetricEndpoint {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  enabled: boolean;
  description: string;
  sample_response: any;
}

const mockGrafanaConnections: GrafanaConnection[] = [
  {
    id: 'grafana-prod',
    name: 'Production Grafana',
    url: 'https://grafana.company.com',
    status: 'Connected',
    last_sync: '2 min ago',
    dashboards_count: 12
  },
  {
    id: 'grafana-dev',
    name: 'Development Grafana',
    url: 'https://dev-grafana.company.com',
    status: 'Disconnected',
    last_sync: '1 hour ago',
    dashboards_count: 8
  }
];

const mockMetricEndpoints: MetricEndpoint[] = [
  {
    id: 'security-overview',
    name: 'Security Overview Metrics',
    endpoint: '/api/metrics/security/overview',
    method: 'GET',
    enabled: true,
    description: 'Overall security posture metrics across all AWS services',
    sample_response: {
      timestamp: new Date().toISOString(),
      account_id: '123456789012',
      critical_findings: 5,
      high_findings: 12,
      medium_findings: 28,
      low_findings: 15,
      compliance_score: 78,
      resources_scanned: 1247
    }
  },
  {
    id: 'iam-metrics',
    name: 'IAM Security Metrics',
    endpoint: '/api/metrics/iam',
    method: 'GET',
    enabled: true,
    description: 'IAM users, roles, policies and security findings',
    sample_response: {
      timestamp: new Date().toISOString(),
      total_users: 12,
      total_roles: 8,
      total_policies: 15,
      users_with_mfa: 8,
      root_access_keys: 1,
      unused_access_keys: 3,
      overprivileged_users: 2
    }
  },
  {
    id: 'ec2-metrics',
    name: 'EC2 Security Metrics',
    endpoint: '/api/metrics/ec2',
    method: 'GET',
    enabled: true,
    description: 'EC2 instances security configuration and findings',
    sample_response: {
      timestamp: new Date().toISOString(),
      total_instances: 28,
      running_instances: 22,
      publicly_accessible: 8,
      unencrypted_volumes: 5,
      unrestricted_ssh: 3,
      outdated_amis: 7
    }
  },
  {
    id: 's3-metrics',
    name: 'S3 Security Metrics',
    endpoint: '/api/metrics/s3',
    method: 'GET',
    enabled: true,
    description: 'S3 bucket security configuration and findings',
    sample_response: {
      timestamp: new Date().toISOString(),
      total_buckets: 23,
      public_buckets: 2,
      unencrypted_buckets: 3,
      no_versioning: 8,
      no_logging: 12,
      total_objects: 73136,
      total_size_gb: 1632.5
    }
  },
  {
    id: 'compliance-metrics',
    name: 'Compliance Metrics',
    endpoint: '/api/metrics/compliance',
    method: 'GET',
    enabled: false,
    description: 'Compliance framework scores and findings',
    sample_response: {
      timestamp: new Date().toISOString(),
      frameworks: {
        'CIS': { score: 78, findings: 15 },
        'SOC2': { score: 85, findings: 8 },
        'PCI-DSS': { score: 92, findings: 3 },
        'HIPAA': { score: 88, findings: 5 }
      }
    }
  }
];

export function GrafanaIntegration() {
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState<GrafanaConnection[]>(mockGrafanaConnections);
  const [endpoints] = useState<MetricEndpoint[]>(mockMetricEndpoints);
  const [newConnection, setNewConnection] = useState({ name: '', url: '', apiKey: '' });
  const [selectedEndpoint, setSelectedEndpoint] = useState<MetricEndpoint | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.url) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const connection: GrafanaConnection = {
        id: `grafana-${Date.now()}`,
        name: newConnection.name,
        url: newConnection.url,
        status: 'Connected',
        last_sync: 'Just now',
        dashboards_count: 0
      };

      setConnections([...connections, connection]);
      setNewConnection({ name: '', url: '', apiKey: '' });
      toast.success('Grafana connection added successfully!');
    } catch (error) {
      toast.error('Failed to connect to Grafana');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    toast.info('Testing connection...', {
      description: 'Checking Grafana connectivity'
    });
    
    // Simulate connection test
    setTimeout(() => {
      toast.success('Connection test successful!');
    }, 1500);
  };

  const handleCopyEndpoint = async (endpoint: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${endpoint}`);
      setCopiedEndpoint(endpoint);
      toast.success('Endpoint URL copied to clipboard');
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch (error) {
      toast.error('Failed to copy endpoint');
    }
  };

  const handleExportDashboard = () => {
    const dashboardConfig = {
      dashboard: {
        title: "AWS Cloud Security Overview",
        panels: endpoints.filter(e => e.enabled).map(endpoint => ({
          title: endpoint.name,
          type: "stat",
          targets: [{
            url: `${window.location.origin}${endpoint.endpoint}`,
            refId: "A"
          }]
        }))
      }
    };

    const blob = new Blob([JSON.stringify(dashboardConfig, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aws-security-dashboard.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Dashboard configuration exported!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'bg-[#00ff88] text-black';
      case 'Disconnected': return 'bg-[#94a3b8] text-white';
      case 'Error': return 'bg-[#ff0040] text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Grafana Integration Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-6">
              {/* Existing Connections */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Grafana Connections</h3>
                
                {connections.map((connection) => (
                  <div key={connection.id} className="cyber-glass p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{connection.name}</h4>
                          <p className="text-sm text-muted-foreground">{connection.url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(connection.status)}>
                          {connection.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestConnection(connection.id)}
                          className="border-border"
                        >
                          <Wifi className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Last sync: {connection.last_sync}</span>
                      <span>{connection.dashboards_count} dashboards</span>
                    </div>
                  </div>
                ))}
                
                {/* Add New Connection */}
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-4">Add New Grafana Connection</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="connection-name">Connection Name</Label>
                      <Input
                        id="connection-name"
                        placeholder="e.g., Production Grafana"
                        value={newConnection.name}
                        onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                        className="bg-input border-border"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="grafana-url">Grafana URL</Label>
                      <Input
                        id="grafana-url"
                        placeholder="https://your-grafana.com"
                        value={newConnection.url}
                        onChange={(e) => setNewConnection({...newConnection, url: e.target.value})}
                        className="bg-input border-border"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="api-key">API Key (Optional)</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="Grafana API Key for automated setup"
                        value={newConnection.apiKey}
                        onChange={(e) => setNewConnection({...newConnection, apiKey: e.target.value})}
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAddConnection}
                    disabled={isConnecting}
                    className="mt-4 bg-primary text-primary-foreground hover:bg-primary/80"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Monitor className="h-4 w-4 mr-2" />
                        Add Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endpoints" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Available API Endpoints</h3>
                <Button variant="outline" className="border-border">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Endpoints
                </Button>
              </div>
              
              <div className="grid gap-4">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="cyber-glass p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">{endpoint.name}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {endpoint.method}
                        </Badge>
                        {endpoint.enabled && (
                          <Badge className="bg-[#00ff88] text-black text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyEndpoint(endpoint.endpoint)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedEndpoint === endpoint.endpoint ? (
                            <CheckCircle className="h-4 w-4 text-[#00ff88]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEndpoint(endpoint)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {endpoint.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <code className="text-xs bg-muted/20 px-2 py-1 rounded">
                        {endpoint.endpoint}
                      </code>
                      <Switch 
                        checked={endpoint.enabled}
                        onCheckedChange={() => {
                          toast.info(`Endpoint ${endpoint.enabled ? 'disabled' : 'enabled'}`);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Endpoint Details Modal */}
              {selectedEndpoint && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <div className="cyber-card p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">{selectedEndpoint.name}</h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedEndpoint(null)}
                      >
                        ✕
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Endpoint URL</Label>
                        <Input 
                          value={`${window.location.origin}${selectedEndpoint.endpoint}`}
                          readOnly
                          className="bg-input border-border font-mono"
                        />
                      </div>
                      
                      <div>
                        <Label>Sample Response</Label>
                        <Textarea
                          value={JSON.stringify(selectedEndpoint.sample_response, null, 2)}
                          readOnly
                          className="bg-input border-border font-mono h-64"
                        />
                      </div>
                      
                      <Button 
                        onClick={() => handleCopyEndpoint(selectedEndpoint.endpoint)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Endpoint URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="dashboards" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Pre-built Dashboards</h3>
                <Button 
                  onClick={handleExportDashboard}
                  className="bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Dashboard
                </Button>
              </div>
              
              <div className="grid gap-4">
                <div className="cyber-glass p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">AWS Security Overview</h4>
                    <Badge className="bg-[#00ff88] text-black text-xs">Recommended</Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Comprehensive dashboard showing security metrics across all AWS services including IAM, EC2, S3, and compliance scores.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">12</p>
                      <p className="text-xs text-muted-foreground">Panels</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">4</p>
                      <p className="text-xs text-muted-foreground">Data Sources</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">Auto</p>
                      <p className="text-xs text-muted-foreground">Refresh</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">✓</p>
                      <p className="text-xs text-muted-foreground">Alerts</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border">
                      <Monitor className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="border-border">
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                  </div>
                </div>
                
                <div className="cyber-glass p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Compliance Monitoring</h4>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Focused dashboard for tracking compliance with various frameworks like CIS, SOC2, PCI-DSS, and HIPAA.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">8</p>
                      <p className="text-xs text-muted-foreground">Panels</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">2</p>
                      <p className="text-xs text-muted-foreground">Data Sources</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">Daily</p>
                      <p className="text-xs text-muted-foreground">Refresh</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-primary">✓</p>
                      <p className="text-xs text-muted-foreground">Reports</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border">
                      <Monitor className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="border-border">
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="setup" className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Grafana Integration Setup Guide</h3>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This integration allows you to visualize AWS security metrics in Grafana dashboards with real-time updates.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Configure Data Source
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      In Grafana, add a new JSON API data source pointing to this dashboard.
                    </p>
                    <div className="bg-muted/20 p-3 rounded text-sm font-mono">
                      URL: {window.location.origin}/api/metrics/*
                    </div>
                  </div>
                  
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Import Dashboard
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use the pre-built dashboard configuration or create custom panels.
                    </p>
                    <Button variant="outline" size="sm" className="border-border">
                      <Download className="h-4 w-4 mr-2" />
                      Download Dashboard JSON
                    </Button>
                  </div>
                  
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                      Configure Alerts
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Set up alert rules based on security thresholds and compliance scores.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Critical findings &gt; 0</li>
                      <li>• Compliance score &lt; 80%</li>
                      <li>• Public S3 buckets detected</li>
                      <li>• Unrestricted security groups</li>
                    </ul>
                  </div>
                  
                  <div className="cyber-glass p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                      Test Integration
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Verify that data is flowing correctly and dashboards are updating.
                    </p>
                    <Button variant="outline" size="sm" className="border-border">
                      <Play className="h-4 w-4 mr-2" />
                      Test Data Flow
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}