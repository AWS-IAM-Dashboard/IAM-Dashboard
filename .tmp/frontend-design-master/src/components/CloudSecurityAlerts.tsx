import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Bell, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { DemoModeBanner } from "./DemoModeBanner";

export function CloudSecurityAlerts() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');

  const alerts = [
    { id: 1, title: 'Unauthorized API Call Detected', severity: 'Critical', time: '2 min ago', resolved: false },
    { id: 2, title: 'S3 Bucket Made Public', severity: 'Critical', time: '15 min ago', resolved: false },
    { id: 3, title: 'Unusual IAM Activity', severity: 'High', time: '1 hour ago', resolved: false },
    { id: 4, title: 'Security Group Modified', severity: 'High', time: '2 hours ago', resolved: true },
    { id: 5, title: 'CloudTrail Logging Paused', severity: 'Critical', time: '3 hours ago', resolved: true },
  ];

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'critical') return alert.severity === 'Critical';
    if (filter === 'high') return alert.severity === 'High';
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Security Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time security alerts and notifications
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl mt-1 text-[#ff0040]">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ff6b35]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Alerts</p>
                <p className="text-2xl mt-1 text-[#ff6b35]">2</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff6b35] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
                <p className="text-2xl mt-1 text-[#00ff88]">12</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl mt-1">5</p>
              </div>
              <Bell className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'critical' ? 'default' : 'outline'}
                onClick={() => setFilter('critical')}
              >
                Critical
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'high' ? 'default' : 'outline'}
                onClick={() => setFilter('high')}
              >
                High
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    {alert.resolved && (
                      <Badge variant="outline" className="text-xs border-[#00ff88] text-[#00ff88]">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.time}</p>
                </div>
                <Badge className={alert.severity === 'Critical' ? 'bg-[#ff0040] text-white' : 'bg-[#ff6b35] text-white'}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
