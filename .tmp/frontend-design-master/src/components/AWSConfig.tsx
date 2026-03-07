import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Settings2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function AWSConfig() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info('Refreshing AWS Config rules...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Config rules updated');
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Settings2 className="h-8 w-8 text-primary" />
            AWS Config
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuration compliance and resource inventory management
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliant Rules</p>
                <p className="text-2xl mt-1 text-[#00ff88]">42</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#00ff88] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl mt-1 text-[#ff0040]">8</p>
              </div>
              <XCircle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-2xl mt-1">256</p>
              </div>
              <Settings2 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Configuration Rules Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'encrypted-volumes', status: 'COMPLIANT', desc: 'EBS volumes are encrypted' },
              { name: 's3-bucket-public-read-prohibited', status: 'NON_COMPLIANT', desc: 'S3 buckets should not allow public read' },
              { name: 'iam-password-policy', status: 'COMPLIANT', desc: 'IAM password policy meets requirements' },
              { name: 'root-account-mfa-enabled', status: 'COMPLIANT', desc: 'Root account has MFA enabled' },
              { name: 'ec2-security-group-attached', status: 'COMPLIANT', desc: 'EC2 instances have security groups' },
            ].map((rule, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">{rule.desc}</p>
                </div>
                <Badge className={rule.status === 'COMPLIANT' ? 'bg-[#00ff88] text-black' : 'bg-[#ff0040] text-white'}>
                  {rule.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
