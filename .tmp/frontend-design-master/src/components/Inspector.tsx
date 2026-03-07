import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function Inspector() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    toast.info('Starting Amazon Inspector scan...');
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Inspector scan completed');
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Amazon Inspector
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated vulnerability management service for EC2 and container workloads
          </p>
        </div>
        <Button 
          onClick={handleScan}
          disabled={isScanning}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Search className="h-4 w-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical CVEs</p>
                <p className="text-2xl mt-1 text-[#ff0040]">5</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ff6b35]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High CVEs</p>
                <p className="text-2xl mt-1 text-[#ff6b35]">12</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff6b35] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card border-[#ffb000]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium CVEs</p>
                <p className="text-2xl mt-1 text-[#ffb000]">28</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ffb000] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scanned Assets</p>
                <p className="text-2xl mt-1">143</p>
              </div>
              <Search className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Recent Vulnerabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: 'CVE-2024-1234', severity: 'Critical', package: 'openssl-3.0.1', instance: 'i-abc123' },
              { id: 'CVE-2024-5678', severity: 'High', package: 'nginx-1.18.0', instance: 'i-def456' },
              { id: 'CVE-2024-9101', severity: 'High', package: 'python-3.9.5', instance: 'i-ghi789' },
              { id: 'CVE-2024-1121', severity: 'Medium', package: 'kernel-5.4.0', instance: 'i-jkl012' },
            ].map((vuln, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium font-mono">{vuln.id}</p>
                  <p className="text-sm text-muted-foreground">{vuln.package} on {vuln.instance}</p>
                </div>
                <Badge className={
                  vuln.severity === 'Critical' ? 'bg-[#ff0040] text-white' :
                  vuln.severity === 'High' ? 'bg-[#ff6b35] text-white' :
                  'bg-[#ffb000] text-black'
                }>
                  {vuln.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
