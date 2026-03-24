import { useCallback, useState } from "react";
import { Header } from "../components/Header";

function PlaceholderPage({ title, subtitle, items }: { title: string; subtitle: string; items: string[] }) {
  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{title}</h1>
        <p style={{ fontSize: "12px", color: "rgba(100,116,139,0.7)", margin: "3px 0 0" }}>{subtitle}</p>
      </div>
      <div style={{ background: "rgba(15,23,42,0.5)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: "18px" }}>⚡</span>
        </div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>In Development</div>
        <p style={{ fontSize: "12px", color: "rgba(71,85,105,0.7)", marginBottom: "20px", maxWidth: "380px", margin: "0 auto 20px", lineHeight: 1.6 }}>
          Backend scanning logic for this module is not yet wired up. The following capabilities are planned:
        </p>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
          {items.map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(100,116,139,0.6)" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(100,116,139,0.3)", flexShrink: 0 }} />
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
import { Toaster } from "../components/ui/sonner";
import { ScanResultsProvider } from "../context/ScanResultsContext";
import type { ReportRecord } from "../types/report";

export function DashboardApp() {
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
        return <ComplianceDashboard onNavigate={setActiveTab} />;
      case "cost-optimization":
        return <PlaceholderPage title="Cost & Optimization" subtitle="Identify unused resources, right-sizing opportunities, and cost anomalies tied to security misconfigurations." items={["Unattached EBS volumes & snapshots", "Idle EC2 instances", "Over-provisioned IAM roles", "Unused Elastic IPs", "Orphaned load balancers"]} />;
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
      </div>
    </ScanResultsProvider>
  );
}
