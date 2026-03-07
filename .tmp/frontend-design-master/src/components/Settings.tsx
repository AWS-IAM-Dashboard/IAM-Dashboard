import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Settings2, Shield, Bell, Database, Monitor, Save, Users, Lock, Cloud, Key, Upload } from "lucide-react";

const mockUsers = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@company.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-01-10 14:30"
  },
  {
    id: 2,
    name: "Bob Smith", 
    email: "bob@company.com",
    role: "Analyst",
    status: "Active",
    lastLogin: "2024-01-10 12:15"
  },
  {
    id: 3,
    name: "Carol Davis",
    email: "carol@company.com", 
    role: "Viewer",
    status: "Inactive",
    lastLogin: "2024-01-08 16:45"
  }
];

export function Settings() {
  const [encryptReports, setEncryptReports] = useState(true);
  const [reportPassword, setReportPassword] = useState("");
  const [cloudStorage, setCloudStorage] = useState(false);
  const [dockerMode, setDockerMode] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-card border border-border">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Security
          </TabsTrigger>
          <TabsTrigger value="access-control" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Access Control
          </TabsTrigger>
          <TabsTrigger value="encryption" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Encryption
          </TabsTrigger>
          <TabsTrigger value="cloud" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Cloud & Deploy
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="app-theme">Application Theme</Label>
                    <Select defaultValue="dark">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark (Cyber)</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="refresh-interval">Auto Refresh Interval</Label>
                    <Select defaultValue="30">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="0">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="max-logs">Maximum Log Entries</Label>
                    <Input 
                      id="max-logs"
                      type="number"
                      defaultValue="10000"
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">

          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Real-time Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Continuously monitor system for threats
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator className="bg-border" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deep Memory Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Enhanced scanning with higher resource usage
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator className="bg-border" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatic Threat Response</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically quarantine detected threats
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <Separator className="bg-border" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cloud Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload samples for cloud-based analysis
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scan-priority">Scan Priority</Label>
                  <Select defaultValue="normal">
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="realtime">Real-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="threat-threshold">Threat Detection Threshold</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (More alerts)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High (Fewer alerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-control" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Role-Based Access Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === "Admin" ? "default" : "outline"}
                          className={
                            user.role === "Admin" ? "bg-primary text-primary-foreground" :
                            user.role === "Analyst" ? "border-[#ffb000] text-[#ffb000]" :
                            "border-border"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === "Active" ? "default" : "secondary"}
                          className={user.status === "Active" ? "bg-[#00ff88] text-black" : "bg-muted text-muted-foreground"}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.lastLogin}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="hover:bg-accent/20">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-primary">Admin</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Full system access</li>
                    <li>• User management</li>
                    <li>• System configuration</li>
                    <li>• All scan types</li>
                    <li>• Report generation</li>
                  </ul>
                </div>
                
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-[#ffb000]">Analyst</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Memory analysis</li>
                    <li>• Process investigation</li>
                    <li>• Case management</li>
                    <li>• Report viewing</li>
                    <li>• Basic configuration</li>
                  </ul>
                </div>
                
                <div className="cyber-glass p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-muted-foreground">Viewer</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Dashboard viewing</li>
                    <li>• Report access</li>
                    <li>• Read-only analysis</li>
                    <li>• Limited case viewing</li>
                    <li>• No configuration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Encryption & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Encrypted Report Export</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt all exported reports with AES-256
                    </p>
                  </div>
                  <Switch checked={encryptReports} onCheckedChange={setEncryptReports} />
                </div>
                
                {encryptReports && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <Label htmlFor="report-password">Default Encryption Password</Label>
                      <Input
                        id="report-password"
                        type="password"
                        value={reportPassword}
                        onChange={(e) => setReportPassword(e.target.value)}
                        placeholder="Enter encryption password..."
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <Label>Encryption Method</Label>
                      <Select defaultValue="aes256">
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aes256">AES-256-GCM</SelectItem>
                          <SelectItem value="aes128">AES-128-GCM</SelectItem>
                          <SelectItem value="chacha20">ChaCha20-Poly1305</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <Label>Integrity Verification</Label>
                <div className="cyber-glass p-4 rounded-lg space-y-4">
                  <div>
                    <Label htmlFor="verify-file">Verify File Integrity (SHA256)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="verify-file"
                        type="file"
                        className="bg-input border-border flex-1"
                      />
                      <Button variant="outline" className="border-border">
                        <Upload className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="expected-hash">Expected Hash</Label>
                    <Input
                      id="expected-hash"
                      placeholder="Enter expected SHA256 hash..."
                      className="bg-input border-border font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <Label>Certificate Management</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="border-border">
                    <Key className="h-4 w-4 mr-2" />
                    Generate New Certificate
                  </Button>
                  <Button variant="outline" className="border-border">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Certificate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Cloud Storage Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Cloud Storage</Label>
                    <p className="text-sm text-muted-foreground">
                      Store reports and evidence in cloud storage
                    </p>
                  </div>
                  <Switch checked={cloudStorage} onCheckedChange={setCloudStorage} />
                </div>
                
                {cloudStorage && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <Label>Storage Provider</Label>
                      <Select defaultValue="s3">
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="s3">Amazon S3</SelectItem>
                          <SelectItem value="azure">Azure Blob Storage</SelectItem>
                          <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="access-key">Access Key ID</Label>
                        <Input
                          id="access-key"
                          type="password"
                          placeholder="Enter access key..."
                          className="bg-input border-border"
                        />
                      </div>
                      <div>
                        <Label htmlFor="secret-key">Secret Access Key</Label>
                        <Input
                          id="secret-key"
                          type="password"
                          placeholder="Enter secret key..."
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="bucket-name">Bucket/Container Name</Label>
                      <Input
                        id="bucket-name"
                        placeholder="forensics-evidence-bucket"
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Docker Deployment Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Configure for containerized deployment
                    </p>
                  </div>
                  <Switch checked={dockerMode} onCheckedChange={setDockerMode} />
                </div>
                
                {dockerMode && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <Label>Container Registry</Label>
                      <Input
                        placeholder="registry.company.com/forensics-toolkit"
                        className="bg-input border-border"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Memory Limit</Label>
                        <Select defaultValue="8g">
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4g">4 GB</SelectItem>
                            <SelectItem value="8g">8 GB</SelectItem>
                            <SelectItem value="16g">16 GB</SelectItem>
                            <SelectItem value="32g">32 GB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>CPU Limit</Label>
                        <Select defaultValue="4">
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 CPUs</SelectItem>
                            <SelectItem value="4">4 CPUs</SelectItem>
                            <SelectItem value="8">8 CPUs</SelectItem>
                            <SelectItem value="16">16 CPUs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">

      {/* Notifications */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show system notifications for threats
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <Separator className="bg-border" />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Send critical alerts to email
              </p>
            </div>
            <Switch />
          </div>
          
          <Separator className="bg-border" />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Sound Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Play sound for high-priority threats
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="email-address">Alert Email Address</Label>
              <Input 
                id="email-address"
                type="email"
                placeholder="admin@company.com"
                className="bg-input border-border"
              />
            </div>
            
            <div>
              <Label htmlFor="alert-frequency">Alert Frequency</Label>
              <Select defaultValue="immediate">
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Summary</SelectItem>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Advanced Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="memory-limit">Memory Usage Limit (GB)</Label>
                <Input 
                  id="memory-limit"
                  type="number"
                  defaultValue="4"
                  min="1"
                  max="64"
                  className="bg-input border-border"
                />
              </div>
              
              <div>
                <Label htmlFor="cpu-cores">CPU Cores for Scanning</Label>
                <Select defaultValue="auto">
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Core</SelectItem>
                    <SelectItem value="2">2 Cores</SelectItem>
                    <SelectItem value="4">4 Cores</SelectItem>
                    <SelectItem value="auto">Auto Detect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="temp-directory">Temporary Files Directory</Label>
                <Input 
                  id="temp-directory"
                  defaultValue="C:\Temp\Forensics"
                  className="bg-input border-border"
                />
              </div>
              
              <div>
                <Label htmlFor="log-level">Logging Level</Label>
                <Select defaultValue="info">
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error Only</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="trace">Trace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Debug Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable detailed logging and diagnostics
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Version:</span>
                <span className="text-sm font-mono">v2.4.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Build:</span>
                <span className="text-sm font-mono">20240110.1432</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Database Version:</span>
                <span className="text-sm font-mono">2024.01.10</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">License:</span>
                <span className="text-sm">Professional</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expires:</span>
                <span className="text-sm">2025-01-10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Update:</span>
                <span className="text-sm">2024-01-10 14:32</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Advanced Settings */}
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Advanced Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="memory-limit">Memory Usage Limit (GB)</Label>
                    <Input 
                      id="memory-limit"
                      type="number"
                      defaultValue="4"
                      min="1"
                      max="64"
                      className="bg-input border-border"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cpu-cores">CPU Cores for Scanning</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Core</SelectItem>
                        <SelectItem value="2">2 Cores</SelectItem>
                        <SelectItem value="4">4 Cores</SelectItem>
                        <SelectItem value="auto">Auto Detect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="temp-directory">Temporary Files Directory</Label>
                    <Input 
                      id="temp-directory"
                      defaultValue="C:\Temp\Forensics"
                      className="bg-input border-border"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="log-level">Logging Level</Label>
                    <Select defaultValue="info">
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error Only</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="trace">Trace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable detailed logging and diagnostics
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <span className="text-sm font-mono">v2.4.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Build:</span>
                    <span className="text-sm font-mono">20240110.1432</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Database Version:</span>
                    <span className="text-sm font-mono">2024.01.10</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">License:</span>
                    <span className="text-sm">Professional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expires:</span>
                    <span className="text-sm">2025-01-10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Update:</span>
                    <span className="text-sm">2024-01-10 14:32</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Settings */}
      <div className="flex gap-4">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
        <Button variant="outline" className="border-border">
          Reset to Defaults
        </Button>
        <Button variant="outline" className="border-border">
          Export Configuration
        </Button>
      </div>
    </div>
  );
}