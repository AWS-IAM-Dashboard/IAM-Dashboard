// GRC — Governance, Risk, and Compliance types

export type PolicyCategory = "encryption" | "access" | "network" | "logging" | "tagging" | "compute";
export type EnforcementLevel = "enforced" | "advisory" | "exception_granted";
export type GuardrailType = "SCP" | "Config_Rule" | "IAM_Boundary" | "Tag_Policy" | "S3_Block";
export type GuardrailStatus = "active" | "inactive" | "drifted" | "pending";
export type ExceptionStatus = "active" | "expired" | "pending_review" | "revoked";
export type RiskStatus = "open" | "mitigated" | "accepted" | "in_progress";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

// ─── Governance ──────────────────────────────────────────────────────────────

export interface OrgPolicy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  enforcement: EnforcementLevel;
  enforcement_mechanism: string;
  compliance_rate: number;
  affected_resources: number;
  non_compliant_resources: number;
  last_reviewed: string;
  owner: string;
  severity: Severity;
  linked_frameworks: string[];
  linked_service_tab?: string;
}

export interface Guardrail {
  id: string;
  name: string;
  type: GuardrailType;
  status: GuardrailStatus;
  description: string;
  scope: string;
  policies_enforced: string[];
  last_evaluated: string;
  drift_detected: boolean;
}

export interface PolicyException {
  id: string;
  policy_id: string;
  policy_name: string;
  resource_id: string;
  resource_name: string;
  reason: string;
  approved_by: string;
  approved_at: string;
  expires_at: string;
  days_remaining: number;
  status: ExceptionStatus;
  risk_level: Severity;
}

// ─── Architecture & Cost Risk ────────────────────────────────────────────────

export interface ArchitectureRisk {
  id: string;
  name: string;
  category: "availability" | "resilience" | "blast_radius" | "dependency" | "compliance_gap";
  severity: Severity;
  affected_resources: string[];
  description: string;
  recommendation: string;
  linked_service_tab?: string;
  estimated_impact: string;
  status: RiskStatus;
}

export interface CostRisk {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  risk_type: "unused" | "oversized" | "unattached" | "orphaned" | "reservation_waste";
  monthly_waste_usd: number;
  description: string;
  recommendation: string;
  confidence: Confidence;
  linked_service_tab?: string;
  detected_at: string;
}
