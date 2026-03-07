import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { HardDrive, RefreshCw, Shield, Lock, Unlock, Globe } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function S3Security() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    toast.info('Starting S3 security scan...');
    setTimeout(() => {
      setIsScanning(false);
      toast.success('S3 scan completed');
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <HardDrive className="h-8 w-8 text-primary" />
            S3 & Storage Security
          </h1>
          <p className="text-muted-foreground mt-1">
            S3 bucket security configuration and compliance analysis
          </p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={isScanning}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Shield className="h-4 w-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Start S3 Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Public Buckets</p>
                <p className="text-2xl mt-1 text-[#ff0040]">2</p>
              </div>
              <Globe className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ffb000]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unencrypted</p>
                <p className="text-2xl mt-1 text-[#ffb000]">3</p>
              </div>
              <Unlock className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Buckets</p>
                <p className="text-2xl mt-1">23</p>
              </div>
              <HardDrive className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl mt-1">1.6 TB</p>
              </div>
              <HardDrive className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>S3 Security Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { bucket: 'company-backups-public', issue: 'Public read access enabled', severity: 'Critical', encryption: false },
              { bucket: 'application-logs-dev', issue: 'No server-side encryption', severity: 'High', encryption: false },
              { bucket: 'user-uploads-prod', issue: 'Access logging disabled', severity: 'High', encryption: true },
              { bucket: 'static-website-assets', issue: 'Versioning not enabled', severity: 'Medium', encryption: true },
              { bucket: 'development-temp-files', issue: 'No MFA Delete protection', severity: 'Low', encryption: true },
            ].map((finding, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium font-mono">{finding.bucket}</p>
                  <p className="text-sm text-muted-foreground">{finding.issue}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {finding.encryption ? (
                      <span className="text-xs text-[#00ff88] flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Encrypted
                      </span>
                    ) : (
                      <span className="text-xs text-[#ff0040] flex items-center gap-1">
                        <Unlock className="h-3 w-3" /> Not Encrypted
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={
                  finding.severity === 'Critical' ? 'bg-[#ff0040] text-white' :
                  finding.severity === 'High' ? 'bg-[#ff6b35] text-white' :
                  finding.severity === 'Medium' ? 'bg-[#ffb000] text-black' :
                  'bg-[#00ff88] text-black'
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
