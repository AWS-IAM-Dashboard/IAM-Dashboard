// Compliance & Evidence — wraps existing ComplianceDashboard in embedded mode
import { ComplianceDashboard } from "../ComplianceDashboard";
import { BackendHandoff, ModuleHeader } from "./shared";
import { BadgeCheck } from "lucide-react";

const COMPLIANCE_ENDPOINTS = [
  { method: "GET", path: "GET /config/compliance-by-config-rule", description: "AWS Config compliance status per rule" },
  { method: "GET", path: "GET /securityhub/standards/results", description: "Security Hub compliance standards results" },
  { method: "GET", path: "GET /audit-manager/assessments", description: "AWS Audit Manager assessment reports" },
  { method: "GET", path: "GET /grc/evidence-export/{framework}", description: "Export evidence package for framework audit" },
  { method: "POST", path: "POST /grc/control-override", description: "Override control status with manual evidence (simulation)" },
];

export function ComplianceEvidence({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader
        icon={<BadgeCheck size={16} color="#00ff88" />}
        title="Compliance & Evidence"
        subtitle="CIS, SOC 2, PCI-DSS, and HIPAA framework scores with scan-derived control evidence"
        accent="#00ff88"
      />

      <div style={{
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <ComplianceDashboard onNavigate={onNavigate} embedded />
      </div>

      <BackendHandoff endpoints={COMPLIANCE_ENDPOINTS} />
    </div>
  );
}
