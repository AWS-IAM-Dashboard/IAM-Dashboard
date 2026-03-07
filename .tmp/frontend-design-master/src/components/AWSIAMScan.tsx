import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Users, RefreshCw, Key, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function AWSIAMScan() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    toast.info('Starting IAM security scan...');
    setTimeout(() => {
      setIsScanning(false);
      toast.success('IAM scan completed');
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            IAM & Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Identity and Access Management security analysis
          </p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={isScanning}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Shield className="h-4 w-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Start IAM Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users with Admin</p>
                <p className="text-2xl mt-1 text-[#ff0040]">3</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ffb000]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unused Keys</p>
                <p className="text-2xl mt-1 text-[#ffb000]">8</p>
              </div>
              <Key className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl mt-1">45</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MFA Enabled</p>
                <p className="text-2xl mt-1 text-[#00ff88]">87%</p>
              </div>
              <Shield className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>IAM Security Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { issue: 'Root account without MFA', user: 'root', severity: 'Critical', risk: 95 },
              { issue: 'Access keys not rotated (>90 days)', user: 'admin-user-dev', severity: 'High', risk: 78 },
              { issue: 'Overly permissive policy attached', user: 'developer-1', severity: 'High', risk: 72 },
              { issue: 'Inactive user with access keys', user: 'former-employee', severity: 'Medium', risk: 65 },
              { issue: 'Password policy too weak', user: 'Account-wide', severity: 'Medium', risk: 58 },
            ].map((finding, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{finding.issue}</p>
                  <p className="text-sm text-muted-foreground">User: {finding.user}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={
                    finding.risk > 80 ? "text-[#ff0040]" :
                    finding.risk > 60 ? "text-[#ff6b35]" :
                    "text-[#ffb000]"
                  }>
                    Risk: {finding.risk}/100
                  </span>
                  <Badge className={
                    finding.severity === 'Critical' ? 'bg-[#ff0040] text-white' :
                    finding.severity === 'High' ? 'bg-[#ff6b35] text-white' :
                    'bg-[#ffb000] text-black'
                  }>
                    {finding.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
