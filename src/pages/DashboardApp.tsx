import { useCallback, useEffect, useState } from "react";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { OnboardingWizard } from "../components/OnboardingWizard";
import { ProductTour } from "../components/ProductTour";
import { isOnboardingCompleted, markOnboardingCompleted } from "../utils/onboardingStorage";

function PlaceholderPage({ title, subtitle, items }: { title: string; subtitle: string; items: string[] }) {
  return (
    <div style={{ padding: "24px 28px", maxWidth: "860px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
          <p style={{ fontSize: 12, color: "rgba(100,116,139,0.75)", margin: "4px 0 0", lineHeight: 1.4 }}>{subtitle}</p>
        </div>
      </div>

      {/* Body card */}
      <div style={{
        background: "rgba(15,23,42,0.5)",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "32px 40px",
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            background: "rgba(255,176,0,0.08)", border: "1px solid rgba(255,176,0,0.2)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
            fontFamily: "'JetBrains Mono', monospace", color: "#ffb000",
          }}>
            IN DEVELOPMENT
          </span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(100,116,139,0.7)", margin: "12px 0 20px", maxWidth: 440, lineHeight: 1.6 }}>
          Backend scanning logic for this module is not yet wired up. The following capabilities are planned:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(100,116,139,0.65)" }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "rgba(0,255,136,0.3)", flexShrink: 0,
              }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import { Sidebar } from "../components/Sidebar";
import { Dashboard } from "../components/Dashboard";
import { SecurityHub } from "../components/SecurityHub";
import { GuardDuty } from "../components/GuardDuty";
import { AWSConfig } from "../components/AWSConfig";
import { Inspector } from "../components/Inspector";
import { Macie } from "../components/Macie";
import { AWSIAMScan } from "../components/AWSIAMScan";
import { AccessAnalyzer } from "../components/AccessAnalyzer";
import { EC2Security } from "../components/EC2Security";
import { S3Security } from "../components/S3Security";
import { VPCSecurity } from "../components/VPCSecurity";
import { DynamoDBSecurity } from "../components/DynamoDBSecurity";
import { GrafanaIntegration } from "../components/GrafanaIntegration";
import { CloudSecurityAlerts } from "../components/CloudSecurityAlerts";
import { Reports } from "../components/Reports";
import { Settings } from "../components/Settings";
import { ComplianceDashboard } from "../components/ComplianceDashboard";
import { SecurityOpsCenter } from "../components/soc/SecurityOpsCenter";
import { InfraSecurityCenter } from "../components/infra/InfraSecurityCenter";
import { GRCCenter } from "../components/grc/GRCCenter";
import { Toaster } from "../components/ui/sonner";
import { ScanResultsProvider } from "../context/ScanResultsContext";
import { AwsAccountProvider } from "../context/AwsAccountContext";
import type { ReportRecord } from "../types/report";

export function DashboardApp() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const username = auth.user?.username;
    if (!username || auth.isLoading) {
      setShowOnboarding(false);
      return;
    }
    if (isOnboardingCompleted(username)) {
      setShowOnboarding(false);
      return;
    }
    const id = requestAnimationFrame(() => setShowOnboarding(true));
    return () => cancelAnimationFrame(id);
  }, [auth.user?.username, auth.isLoading]);

  const handleOnboardingOpenChange = useCallback(
    (open: boolean) => {
      setShowOnboarding(open);
      if (!open && auth.user?.username) {
        markOnboardingCompleted(auth.user.username);
      }
    },
    [auth.user?.username],
  );

  const handleStartTour = useCallback(() => {
    setShowTour(true);
    // Navigate to the dashboard so the first tour step can find its target
    setActiveTab("dashboard");
  }, []);

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
      case "access-analyzer":
        return <AccessAnalyzer />;
      case "ec2-security":
        return <EC2Security />;
      case "s3-security":
        return <S3Security />;
      case "vpc-security":
        return <VPCSecurity />;
      case "dynamodb-security":
        return <DynamoDBSecurity />;
      case "network-security":
        return <VPCSecurity />;
      case "database-security":
        return <DynamoDBSecurity />;
      case "lambda-security":
        return <PlaceholderPage title="Lambda & Serverless" subtitle="Function-level security scanning, runtime threat detection, and permission analysis for serverless workloads." items={["Function permission over-provisioning", "Runtime code injection detection", "Dead-letter queue encryption", "VPC attachment validation", "Execution role least-privilege audit"]} />;
      case "cloudtrail":
        return <PlaceholderPage title="CloudTrail Monitoring" subtitle="Audit log analysis, anomaly detection, and API activity intelligence across all regions." items={["Unusual API call patterns", "Cross-region activity monitoring", "Root account usage alerts", "Data event analysis (S3/Lambda)", "Log integrity validation"]} />;
      case "compliance":
        // Compliance moved into GRC — redirect
        setActiveTab("grc");
        return null;
      case "cost-optimization":
        return <PlaceholderPage title="Cost & Optimization" subtitle="Identify unused resources, right-sizing opportunities, and cost anomalies tied to security misconfigurations." items={["Unattached EBS volumes & snapshots", "Idle EC2 instances", "Over-provisioned IAM roles", "Unused Elastic IPs", "Orphaned load balancers"]} />;
      case "soc":
        return (
          <div style={{ padding: "20px 24px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <SecurityOpsCenter />
          </div>
        );
      case "infra-security":
        return (
          <div style={{ padding: "20px 24px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <InfraSecurityCenter />
          </div>
        );
      case "grc":
        return (
          <div style={{ padding: "20px 24px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <GRCCenter onNavigate={setActiveTab} />
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

  return (
    <ScanResultsProvider>
      <AwsAccountProvider>
        <div className="flex h-screen flex-col bg-background dark">
          <Header onNavigate={setActiveTab} activeTab={activeTab} />
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
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                color: "#e2e8f0",
              },
            }}
          />
          <OnboardingWizard
            open={showOnboarding}
            onOpenChange={handleOnboardingOpenChange}
            onNavigate={setActiveTab}
            onStartTour={handleStartTour}
          />
          <ProductTour
            active={showTour}
            onClose={() => setShowTour(false)}
            onNavigate={setActiveTab}
          />
        </div>
      </AwsAccountProvider>
    </ScanResultsProvider>
  );
}