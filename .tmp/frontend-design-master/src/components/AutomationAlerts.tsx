import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Zap, Calendar, Bell, Mail, MessageSquare, Clock, Play, Pause, Plus, Settings2 } from "lucide-react";

const mockScheduledScans = [
  {
    id: 1,
    name: "Daily Security Scan",
    type: "Memory Scan",
    schedule: "Daily at 02:00",
    enabled: true,
    lastRun: "2024-01-10 02:00",
    nextRun: "2024-01-11 02:00",
    status: "Active"
  },
  {
    id: 2,
    name: "Weekly Deep Analysis",
    type: "Full System Analysis", 
    schedule: "Weekly on Sunday at 01:00",
    enabled: true,
    lastRun: "2024-01-07 01:00",
    nextRun: "2024-01-14 01:00",
    status: "Active"
  },
  {
    id: 3,
    name: "Process Monitor",
    type: "Hidden Process Detection",
    schedule: "Every 6 hours",
    enabled: false,
    lastRun: "2024-01-09 18:00",
    nextRun: "N/A",
    status: "Disabled"
  }
];

const mockAlerts = [
  {
    id: 1,
    timestamp: "2024-01-10 14:30:22",
    type: "Critical",
    title: "Malicious Process Detected",
    description: "High-risk process 'malware.exe' detected with risk score 95",
    source: "Memory Scan",
    acknowledged: false
  },
  {
    id: 2,
    timestamp: "2024-01-10 12:15:30",
    type: "Warning",
    title: "Suspicious DLL Injection",
    description: "DLL injection detected in svchost.exe process",
    source: "DLL Analysis",
    acknowledged: true
  },
  {
    id: 3,
    timestamp: "2024-01-10 09:45:12",
    type: "Info",
    title: "Scheduled Scan Completed",
    description: "Daily security scan completed successfully",
    source: "Automation",
    acknowledged: true
  },
  {
    id: 4,
    timestamp: "2024-01-10 08:30:45",
    type: "Critical",
    title: "Hidden Process Found",
    description: "DKOM technique detected hiding process PID 1337",
    source: "Hidden Process Detection",
    acknowledged: false
  }
];

const mockNotificationRules = [
  {
    id: 1,
    name: "Critical Threats",
    condition: "Risk Score >= 80",
    actions: ["Email", "Desktop", "Slack"],
    enabled: true
  },
  {
    id: 2,
    name: "Process Injection",
    condition: "Event Type = DLL Injection",
    actions: ["Email", "Desktop"],
    enabled: true
  },
  {
    id: 3,
    name: "Scan Failures",
    condition: "Scan Status = Failed",
    actions: ["Email"],
    enabled: false
  }
];

export function AutomationAlerts() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [slackIntegration, setSlackIntegration] = useState(false);
  const [emailAddress, setEmailAddress] = useState("admin@company.com");
  const [slackWebhook, setSlackWebhook] = useState("");

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case "Critical": return "bg-[#ff0040] text-white";
      case "Warning": return "bg-[#ffb000] text-black";
      case "Info": return "bg-[#0ea5e9] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "text-[#00ff88]";
      case "Disabled": return "text-[#ff6b40]";
      case "Error": return "text-[#ff0040]";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Automation Overview */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automation & Alerts Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Scheduled Scans</span>
              </div>
              <p className="text-2xl font-medium">{mockScheduledScans.length}</p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-[#ff0040]" />
                <span className="text-sm text-muted-foreground">Active Alerts</span>
              </div>
              <p className="text-2xl font-medium text-[#ff0040]">
                {mockAlerts.filter(a => !a.acknowledged).length}
              </p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#00ff88]" />
                <span className="text-sm text-muted-foreground">Running Jobs</span>
              </div>
              <p className="text-2xl font-medium text-[#00ff88]">
                {mockScheduledScans.filter(s => s.enabled).length}
              </p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Alert Rules</span>
              </div>
              <p className="text-2xl font-medium">{mockNotificationRules.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scheduler" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="scheduler" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Alert Center
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scheduled Scans</CardTitle>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  New Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockScheduledScans.map((scan) => (
                    <TableRow key={scan.id} className="border-border">
                      <TableCell className="font-medium">{scan.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary text-primary">
                          {scan.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{scan.schedule}</TableCell>
                      <TableCell>
                        <span className={getStatusColor(scan.status)}>
                          {scan.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{scan.lastRun}</TableCell>
                      <TableCell className="font-mono text-xs">{scan.nextRun}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-accent/20"
                          >
                            {scan.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/20">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Schedule Options */}
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Quick Schedule Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Daily Security Scan</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Full memory analysis every day at 2 AM
                  </p>
                  <Button variant="outline" size="sm" className="border-border w-full">
                    Create Schedule
                  </Button>
                </div>
                
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Hourly Process Monitor</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Monitor for hidden processes every hour
                  </p>
                  <Button variant="outline" size="sm" className="border-border w-full">
                    Create Schedule
                  </Button>
                </div>
                
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Weekly Deep Analysis</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Comprehensive analysis every Sunday
                  </p>
                  <Button variant="outline" size="sm" className="border-border w-full">
                    Create Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Alerts</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-border">
                    Mark All Read
                  </Button>
                  <Button variant="outline" className="border-border">
                    Clear History
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`cyber-glass p-4 rounded-lg ${!alert.acknowledged ? 'border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getAlertTypeColor(alert.type)}>
                            {alert.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">{alert.timestamp}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.source}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <div className="flex gap-2">
                        {!alert.acknowledged && (
                          <Button variant="outline" size="sm" className="border-border">
                            Acknowledge
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="border-border">
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alert Rules */}
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alert Rules</CardTitle>
                <Button variant="outline" className="border-border">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockNotificationRules.map((rule) => (
                    <TableRow key={rule.id} className="border-border">
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.condition}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.actions.map((action, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.enabled} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/20">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send alerts via email for critical events
                      </p>
                    </div>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                
                {emailNotifications && (
                  <div className="ml-7 space-y-4">
                    <div>
                      <Label htmlFor="email-address">Email Address</Label>
                      <Input
                        id="email-address"
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <Label>Alert Frequency</Label>
                      <Select defaultValue="immediate">
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              {/* Desktop Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show system notifications for threats
                    </p>
                  </div>
                </div>
                <Switch checked={desktopNotifications} onCheckedChange={setDesktopNotifications} />
              </div>

              <Separator className="bg-border" />

              {/* Slack Integration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <Label>Slack Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        Send alerts to Slack channels
                      </p>
                    </div>
                  </div>
                  <Switch checked={slackIntegration} onCheckedChange={setSlackIntegration} />
                </div>
                
                {slackIntegration && (
                  <div className="ml-7 space-y-4">
                    <div>
                      <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                      <Input
                        id="slack-webhook"
                        type="url"
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <Label>Default Channel</Label>
                      <Input
                        placeholder="#security-alerts"
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              {/* Notification Thresholds */}
              <div className="space-y-4">
                <Label>Alert Thresholds</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="critical-threshold">Critical Alert Threshold</Label>
                    <Select defaultValue="80">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">Risk Score ≥ 70</SelectItem>
                        <SelectItem value="80">Risk Score ≥ 80</SelectItem>
                        <SelectItem value="90">Risk Score ≥ 90</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="warning-threshold">Warning Alert Threshold</Label>
                    <Select defaultValue="50">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Risk Score ≥ 30</SelectItem>
                        <SelectItem value="50">Risk Score ≥ 50</SelectItem>
                        <SelectItem value="60">Risk Score ≥ 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/80">
                  Save Settings
                </Button>
                <Button variant="outline" className="border-border">
                  Test Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}