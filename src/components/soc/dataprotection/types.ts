// Data Protection — shared types

export type ComplianceStatus = "compliant" | "non_compliant" | "partial" | "not_applicable" | "unknown";
export type TLSVersion = "1.0" | "1.1" | "1.2" | "1.3";
export type EncryptionAlgorithm = "SSE-S3" | "SSE-KMS" | "SSE-C" | "AES-256" | "aws:kms" | "NONE";
export type RotationStatus = "active" | "stale" | "disabled" | "pending" | "never_rotated";
export type DataClassification = "CRITICAL" | "SENSITIVE" | "INTERNAL" | "PUBLIC";

// ─── In Transit ────────────────────────────────────────────────────────────────

export interface TLSEndpoint {
  id: string;
  name: string;
  resource_type: "ALB" | "CloudFront" | "API_GW" | "RDS" | "ElastiCache" | "MSK" | "Custom";
  resource_id: string;
  min_tls_version: TLSVersion | "none";
  max_tls_version: TLSVersion | "none";
  pfs_enabled: boolean;             // Perfect Forward Secrecy
  hsts_enabled: boolean;
  http_redirect_to_https: boolean;
  compliance: ComplianceStatus;
  region: string;
  certificate_id: string | null;
}

export interface CertificateEntry {
  id: string;
  domain: string;
  san_domains: string[];
  issuer: string;
  issued_at: string;
  expires_at: string;
  days_remaining: number;           // computed
  auto_renew: boolean;
  acm_managed: boolean;
  compliance: ComplianceStatus;
  attached_to: string[];            // resource IDs
  algorithm: "RSA-2048" | "RSA-4096" | "ECDSA-P256" | "ECDSA-P384";
}

export interface PlaintextChannel {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  protocol: string;
  port: number;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  detected_at: string;
}

// ─── At Rest ──────────────────────────────────────────────────────────────────

export interface StorageEncryptionEntry {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_type: "S3" | "EBS" | "RDS" | "DynamoDB" | "ElastiCache" | "EFS" | "Glacier";
  encrypted: boolean;
  algorithm: EncryptionAlgorithm;
  kms_key_id: string | null;
  kms_key_alias: string | null;
  compliance: ComplianceStatus;
  public_accessible: boolean;
  region: string;
  data_classification: DataClassification;
}

export interface PublicSnapshot {
  id: string;
  snapshot_id: string;
  resource_type: "EBS" | "RDS" | "Redshift";
  source_resource: string;
  created_at: string;
  size_gb: number;
  encrypted: boolean;
  severity: "CRITICAL" | "HIGH";
  description: string;
  region: string;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export interface RetentionPolicy {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_type: "S3_Bucket" | "CloudWatch_Logs" | "CloudTrail" | "RDS_Backup" | "Glacier" | "DynamoDB_Backup";
  required_days: number;            // from compliance framework
  actual_days: number | null;       // null = no policy set
  framework: string;                // "SOC2" | "PCI-DSS" | "HIPAA" | "Internal"
  compliance: ComplianceStatus;
  last_reviewed: string;
  drift_days: number;               // actual_days - required_days (negative = under-retained)
  data_classification: DataClassification;
}

export interface S3LifecycleRule {
  id: string;
  bucket: string;
  rule_id: string;
  enabled: boolean;
  prefix: string;
  transitions: Array<{
    storage_class: string;
    days: number;
  }>;
  expiration_days: number | null;
  noncurrent_expiration_days: number | null;
  abort_incomplete_multipart_days: number | null;
  compliance: ComplianceStatus;
}

// ─── Secrets & Keys ───────────────────────────────────────────────────────────

export interface SecretEntry {
  id: string;
  secret_name: string;
  secret_arn: string;
  description: string;
  secret_type: "Database" | "API_Key" | "OAuth" | "TLS_Cert" | "Generic";
  rotation_enabled: boolean;
  rotation_days: number | null;
  last_rotated: string | null;
  next_rotation: string | null;
  days_since_rotation: number;
  rotation_status: RotationStatus;
  compliance: ComplianceStatus;
  kms_key_id: string | null;
  used_by: string[];               // service names
  last_accessed: string | null;
}

export interface KMSKeyEntry {
  id: string;
  key_id: string;
  key_alias: string;
  description: string;
  key_usage: "ENCRYPT_DECRYPT" | "SIGN_VERIFY" | "GENERATE_VERIFY_MAC";
  key_spec: "SYMMETRIC_DEFAULT" | "RSA_2048" | "RSA_4096" | "ECC_NIST_P256" | "HMAC_256";
  rotation_enabled: boolean;
  last_rotation: string | null;
  state: "Enabled" | "Disabled" | "PendingDeletion" | "Unavailable";
  policy_issues: string[];
  usage_7d: number[];               // daily call counts, 7 values
  deletion_date: string | null;
  compliance: ComplianceStatus;
  key_manager: "AWS" | "CUSTOMER";
}

// ─── Policy diff ──────────────────────────────────────────────────────────────

export interface PolicyLine {
  type: "unchanged" | "added" | "removed";
  content: string;
}

export interface PolicyDiffData {
  title: string;
  description: string;
  current: string;
  proposed: string;
  diff: PolicyLine[];
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

export type DataProtectionScenario =
  | "expired_certificate"
  | "plaintext_transport"
  | "unencrypted_storage"
  | "public_snapshot"
  | "retention_drift"
  | "stale_rotation"
  | "overpermissive_key";

export interface DPScenario {
  id: DataProtectionScenario;
  name: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  affected_resources: string[];
  simulation_steps: string[];
  expected_findings: string[];
  remediation_preview: string[];
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

export interface AuditTrailEvent {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: "system" | "engineer" | "automation" | "external";
  resource_id: string;
  action: string;
  detail: string;
  outcome: "success" | "failure" | "warning";
  evidence_hash: string;
}
