import { useCallback, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { SecurityHub } from "./components/SecurityHub";
import { GuardDuty } from "./components/GuardDuty";
import { AWSConfig } from "./components/AWSConfig";
import { Inspector } from "./components/Inspector";
import { Macie } from "./components/Macie";
import { AWSIAMScan } from "./components/AWSIAMScan";
import { EC2Security } from "./components/EC2Security";
import { S3Security } from "./components/S3Security";
import { GrafanaIntegration } from "./components/GrafanaIntegration";
import { CloudSecurityAlerts } from "./components/CloudSecurityAlerts";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { ComplianceDashboard } from "./components/ComplianceDashboard";
import { Toaster } from "./components/ui/sonner";
import { ScanResultsProvider } from "./context/ScanResultsContext";
import type { ReportRecord } from "./types/report";

export default function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);

  const handleFullScanComplete = useCallback((report: ReportRecord) => {
    setReportHistory((prev) => [report, ...prev]);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} onFullScanComplete={handleFullScanComplete} />;
      case "security-hub":
        return <SecurityHub />;
      case "guardduty":
        return <GuardDuty />;
      case "config":
        return <AWSConfig />;
      case "inspector":
        return <Inspector />;
      case "macie":
        return <Macie />;
      case "iam-security":
        return <AWSIAMScan />;
      case "ec2-security":
        return <EC2Security />;
      case "s3-security":
        return <S3Security />;
      case "network-security":
        return (
          <div className="p-6">
            <div className="cyber-card p-8 text-center">
              <h2 className="text-xl mb-4">VPC & Network Security</h2>
              <p className="text-muted-foreground">
                Network security scanning coming soon...
              </p>
            </div>
          </div>
        );
      case "database-security":
        return (
          <div className="p-6">
            <div className="cyber-card p-8 text-center">
              <h2 className="text-xl mb-4">RDS & Database Security</h2>
              <p className="text-muted-foreground">
                Database security scanning coming soon...
              </p>
            </div>
          </div>
        );
      case "lambda-security":
        return (
          <div className="p-6">
            <div className="cyber-card p-8 text-center">
              <h2 className="text-xl mb-4">Lambda & Serverless Security</h2>
              <p className="text-muted-foreground">
                Serverless security scanning coming soon...
              </p>
            </div>
          </div>
        );
      case "cloudtrail":
        return (
          <div className="p-6">
            <div className="cyber-card p-8 text-center">
              <h2 className="text-xl mb-4">CloudTrail Monitoring</h2>
              <p className="text-muted-foreground">
                CloudTrail analysis coming soon...
              </p>
            </div>
          </div>
        );
      case "compliance":
        return <ComplianceDashboard onNavigate={setActiveTab} />;
      case "cost-optimization":
        return (
          <div className="p-6">
            <div className="cyber-card p-8 text-center">
              <h2 className="text-xl mb-4">Cost & Optimization</h2>
              <p className="text-muted-foreground">
                Cost optimization analysis coming soon...
              </p>
            </div>
          </div>
        );
      case "alerts":
        return <CloudSecurityAlerts />;
      case "grafana":
        return <GrafanaIntegration />;
      case "reports":
        return <Reports reports={reportHistory} />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} onFullScanComplete={handleFullScanComplete} />;
    }
  };

  if (auth.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background dark">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background dark p-6">
        <p className="text-destructive">Error: {auth.error.message}</p>
        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => auth.signinRedirect()}
        >
          Try signing in again
        </button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background dark p-6">
        <h1 className="text-xl font-medium text-foreground">AWS Cloud Security Dashboard</h1>
        <p className="text-muted-foreground">Sign in to continue.</p>
        <button
          type="button"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          onClick={() => auth.signinRedirect()}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <ScanResultsProvider>
      <div className="h-screen flex flex-col bg-background dark">
        <Header onNavigate={setActiveTab} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              color: '#e2e8f0',
            },
          }}
        />
      </div>
    </ScanResultsProvider>
  );
}
