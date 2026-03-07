import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Shield, RefreshCw, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { DemoModeBanner } from "./DemoModeBanner";

export function Macie() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info('Refreshing Macie findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Macie findings updated');
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6">
      <DemoModeBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Amazon Macie
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover and protect sensitive data with machine learning
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card border-[#ff0040]/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sensitive Data Findings</p>
                <p className="text-2xl mt-1 text-[#ff0040]">7</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ff0040] opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monitored Buckets</p>
                <p className="text-2xl mt-1">23</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scanned Objects</p>
                <p className="text-2xl mt-1">1.2M</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cyber-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Classified</p>
                <p className="text-2xl mt-1">892 GB</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Sensitive Data Discoveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'PII - Credit Cards', bucket: 'user-uploads-prod', count: 342, severity: 'Critical' },
              { type: 'PII - SSN', bucket: 'customer-data-archive', count: 156, severity: 'Critical' },
              { type: 'Credentials', bucket: 'dev-backups', count: 12, severity: 'High' },
              { type: 'PII - Email Addresses', bucket: 'marketing-lists', count: 8945, severity: 'Medium' },
            ].map((finding, i) => (
              <div key={i} className="cyber-glass p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{finding.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {finding.count} occurrences in {finding.bucket}
                  </p>
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
