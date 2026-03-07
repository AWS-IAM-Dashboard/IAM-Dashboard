import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { BarChart3, RefreshCw, Activity, TrendingUp } from "lucide-react";
import { DemoModeBanner } from "./DemoModeBanner";

export function GrafanaIntegration() {
  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Grafana Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and analytics dashboards
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Dashboards
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Dashboards</p>
                <p className="text-2xl mt-1">12</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Sources</p>
                <p className="text-2xl mt-1">5</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alerts</p>
                <p className="text-2xl mt-1 text-[#ffb000]">3</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Available Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'AWS Security Overview', status: 'Active', metrics: 45 },
              { name: 'EC2 Performance Monitoring', status: 'Active', metrics: 32 },
              { name: 'S3 Usage Analytics', status: 'Active', metrics: 18 },
              { name: 'IAM Activity Dashboard', status: 'Inactive', metrics: 25 },
              { name: 'GuardDuty Threat Detection', status: 'Active', metrics: 12 },
            ].map((dashboard, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{dashboard.name}</p>
                  <p className="text-sm text-muted-foreground">{dashboard.metrics} metrics tracked</p>
                </div>
                <Badge className={dashboard.status === 'Active' ? 'bg-[#00ff88] text-black' : 'bg-gray-500 text-white'}>
                  {dashboard.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
