import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Server, RefreshCw, Shield, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function EC2Security() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    toast.info('Starting EC2 security scan...');
    setTimeout(() => {
      setIsScanning(false);
      toast.success('EC2 scan completed');
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Server className="h-8 w-8 text-primary" />
            EC2 & Compute Security
          </h1>
          <p className="text-muted-foreground mt-1">
            EC2 instance and compute resource security analysis
          </p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={isScanning}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Shield className="h-4 w-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Start EC2 Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Public Instances</p>
                <p className="text-2xl mt-1 text-[#ff0040]">5</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ffb000]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unencrypted Volumes</p>
                <p className="text-2xl mt-1 text-[#ffb000]">12</p>
              </div>
              <Lock className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Instances</p>
                <p className="text-2xl mt-1">78</p>
              </div>
              <Server className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security Score</p>
                <p className="text-2xl mt-1 text-[#00ff88]">84%</p>
              </div>
              <Shield className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>EC2 Security Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { instance: 'i-0abc123def456', issue: 'Security group allows 0.0.0.0/0 on port 22', severity: 'Critical', region: 'us-east-1' },
              { instance: 'i-0def789ghi012', issue: 'EBS volume not encrypted', severity: 'High', region: 'us-west-2' },
              { instance: 'i-0jkl345mno678', issue: 'Instance profile has excessive permissions', severity: 'High', region: 'us-east-1' },
              { instance: 'i-0pqr901stu234', issue: 'Missing required tags', severity: 'Medium', region: 'eu-west-1' },
              { instance: 'i-0vwx567yz890', issue: 'Outdated AMI image', severity: 'Medium', region: 'us-east-1' },
            ].map((finding, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium font-mono">{finding.instance}</p>
                  <p className="text-sm text-muted-foreground">{finding.issue}</p>
                  <p className="text-xs text-muted-foreground mt-1">Region: {finding.region}</p>
                </div>
                <Badge className={
                  finding.severity === 'Critical' ? 'bg-[#ff0040] text-white' :
                  finding.severity === 'High' ? 'bg-[#ff6b35] text-white' :
                  'bg-[#ffb000] text-black'
                }>
                  {finding.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
