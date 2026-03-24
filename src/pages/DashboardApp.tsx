import { useCallback, useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Dashboard } from "../components/Dashboard";
import { SecurityHub } from "../components/SecurityHub";
import { GuardDuty } from "../components/GuardDuty";
import { AWSConfig } from "../components/AWSConfig";
import { Inspector } from "../components/Inspector";
import { Macie } from "../components/Macie";
import { AWSIAMScan } from "../components/AWSIAMScan";
import { EC2Security } from "../components/EC2Security";
import { S3Security } from "../components/S3Security";
import { GrafanaIntegration } from "../components/GrafanaIntegration";
import { CloudSecurityAlerts } from "../components/CloudSecurityAlerts";
import { Reports } from "../components/Reports";
import { Settings } from "../components/Settings";
import { ComplianceDashboard } from "../components/ComplianceDashboard";
import { Toaster } from "../components/ui/sonner";
import { ScanResultsProvider } from "../context/ScanResultsContext";
import type { ReportRecord } from "../types/report";
import { useIsMobile } from "../components/ui/use-mobile";
import { Sheet, SheetContent } from "../components/ui/sheet";

export function DashboardApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

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
              <h2 className="mb-4 text-xl">VPC & Network Security</h2>
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
              <h2 className="mb-4 text-xl">RDS & Database Security</h2>
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
              <h2 className="mb-4 text-xl">Lambda & Serverless Security</h2>
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
              <h2 className="mb-4 text-xl">CloudTrail Monitoring</h2>
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
              <h2 className="mb-4 text-xl">Cost & Optimization</h2>
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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <ScanResultsProvider>
      <div className="flex h-screen flex-col bg-background dark">
        <Header
          onNavigate={handleTabChange}
          onMenuClick={() => setMobileSidebarOpen(true)}
          showMenuButton={isMobile}
        />
        <div className="flex flex-1 overflow-hidden">
          {!isMobile && <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />}

          {isMobile && (
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
                <Sidebar activeTab={activeTab} onTabChange={handleTabChange} className="h-full w-full border-r-0" />
              </SheetContent>
            </Sheet>
          )}

          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(0, 255, 136, 0.3)",
              color: "#e2e8f0",
            },
          }}
        />
      </div>
    </ScanResultsProvider>
  );
}
