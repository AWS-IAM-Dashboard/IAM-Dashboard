import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Play, AlertTriangle, Shield, Clock, Cloud, Zap } from "lucide-react";
import { DemoModeBanner } from "./DemoModeBanner";
import { toast } from "sonner@2.0.3";

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

// Mock data for compliance pie chart
const complianceData = [
  { name: 'Compliant', value: 82, color: '#00ff88' },
  { name: 'Non-Compliant', value: 18, color: '#ff0040' }
];

// Mock data for weekly trends bar chart
const weeklyTrends = [
  { name: 'Mon', critical: 5, high: 12, medium: 28 },
  { name: 'Tue', critical: 3, high: 15, medium: 32 },
  { name: 'Wed', critical: 4, high: 10, medium: 25 },
  { name: 'Thu', critical: 2, high: 8, medium: 30 },
  { name: 'Fri', critical: 3, high: 14, medium: 27 },
  { name: 'Sat', critical: 1, high: 9, medium: 22 },
  { name: 'Sun', critical: 3, high: 11, medium: 26 }
];

// Mock data for recent security alerts
const recentAlerts = [
  { id: 1, title: 'S3 bucket made public', severity: 'Critical', service: 'Security Hub', time: '5 min ago', status: 'New' },
  { id: 2, title: 'Unusual API activity detected', severity: 'High', service: 'GuardDuty', time: '12 min ago', status: 'New' },
  { id: 3, title: 'IAM access key not rotated', severity: 'Medium', service: 'Config', time: '1 hour ago', status: 'Notified' },
  { id: 4, title: 'EC2 instance without encryption', severity: 'High', service: 'Inspector', time: '2 hours ago', status: 'New' },
  { id: 5, title: 'PII data found in S3', severity: 'Critical', service: 'Macie', time: '3 hours ago', status: 'Resolved' }
];

export function Dashboard({ onNavigate }: DashboardProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleFullScan = () => {
    setIsScanning(true);
    toast.info('Starting full security scan across all AWS services...');
    
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Full security scan completed!', {
        description: 'Found 18 new security findings'
      });
    }, 3000);
  };

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
      case 'New': return 'bg-blue-500 text-white';
      case 'Notified': return 'bg-yellow-500 text-black';
      case 'Resolved': return 'bg-[#00ff88] text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <DemoModeBanner />
      
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="cyber-card cursor-pointer hover:cyber-glow transition-all duration-300">
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Last Scan</p>
                <p className="text-xl md:text-2xl mt-1">5m</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card cursor-pointer hover:cyber-glow transition-all duration-300">
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Resources</p>
                <p className="text-xl md:text-2xl mt-1">256</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Cloud className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card cursor-pointer hover:cyber-glow transition-all duration-300">
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Findings</p>
                <p className="text-xl md:text-2xl mt-1 text-[#ff6b35]">23</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#ff6b35]/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-[#ff6b35]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card cursor-pointer hover:cyber-glow transition-all duration-300">
          <CardContent className="p-4 md:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Score</p>
                <p className="text-xl md:text-2xl mt-1 text-[#00ff88]">82%</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-[#00ff88]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AWS IAM Security Status Card */}
      <Card className="cyber-card">
        <CardHeader className="pb-3 px-4 md:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm md:text-base">IAM Security Status</CardTitle>
            </div>
            <Badge className="bg-[#00ff88] text-black text-xs">Compliant</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-background/50 rounded-lg p-3 md:p-4 border border-border/50 hover:border-[#ff0040]/50 transition-colors cursor-pointer">
              <div className="flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl mb-1 text-[#ff0040]">3</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-3 md:p-4 border border-border/50 hover:border-[#ff6b35]/50 transition-colors cursor-pointer">
              <div className="flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl mb-1 text-[#ff6b35]">8</div>
                <div className="text-xs text-muted-foreground">High</div>
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-3 md:p-4 border border-border/50 hover:border-[#ffb000]/50 transition-colors cursor-pointer">
              <div className="flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl mb-1 text-[#ffb000]">12</div>
                <div className="text-xs text-muted-foreground">Medium</div>
              </div>
            </div>
            <div className="bg-background/50 rounded-lg p-3 md:p-4 border border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl mb-1 text-primary">45</div>
                <div className="text-xs text-muted-foreground">Resources</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="cyber-card">
        <CardHeader className="pb-3 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <CardTitle className="text-sm md:text-base">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 cyber-glow text-sm w-full sm:w-auto"
              onClick={handleFullScan}
              disabled={isScanning}
            >
              <Play className="h-4 w-4 mr-2" />
              {isScanning ? 'Scanning...' : 'Full Scan'}
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-accent/10 text-sm flex-1 sm:flex-none"
              onClick={() => onNavigate?.('iam-security')}
            >
              IAM
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-accent/10 text-sm flex-1 sm:flex-none"
              onClick={() => onNavigate?.('ec2-security')}
            >
              EC2
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-accent/10 text-sm flex-1 sm:flex-none"
              onClick={() => onNavigate?.('s3-security')}
            >
              S3
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-accent/10 text-sm hidden sm:inline-flex"
              onClick={() => onNavigate?.('reports')}
            >
              Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Compliance Overview Pie Chart */}
        <Card className="cyber-card">
          <CardHeader className="pb-3 px-4 md:px-6">
            <CardTitle className="text-sm md:text-base">Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {complianceData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trends Bar Chart */}
        <Card className="cyber-card">
          <CardHeader className="pb-3 px-4 md:px-6">
            <CardTitle className="text-sm md:text-base">Weekly Trends</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  cursor={{ fill: 'rgba(0, 255, 136, 0.05)' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Bar dataKey="critical" stackId="a" fill="#ff0040" name="Critical" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high" stackId="a" fill="#ff6b35" name="High" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" stackId="a" fill="#ffb000" name="Medium" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Alerts Table */}
      <Card className="cyber-card">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-sm md:text-base">Recent Security Alerts</CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Alert</TableHead>
                  <TableHead className="min-w-[100px]">Severity</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]">Service</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px]">Time</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAlerts.map((alert) => (
                  <TableRow 
                    key={alert.id} 
                    className="cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => onNavigate?.('security-alerts')}
                  >
                    <TableCell className="font-medium text-sm">{alert.title}</TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(alert.severity)} text-xs`}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{alert.service}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{alert.time}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(alert.status)} text-xs`}>
                        {alert.status}
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
