/**
 * IR Action Engine — shared types
 *
 * Two-lane architecture:
 *   LLM Copilot      → /api/llm/{triage,root-cause,runbook}
 *   AWS Automation   → /api/automation/{contain,remediate}
 *                    → /api/forensics/capture
 *                    → /api/evidence/preserve
 */

// ─── Action taxonomy ─────────────────────────────────────────────────────────

export type IRActionType =
  // LLM lane
  | "llm_triage"
  | "llm_root_cause"
  | "llm_runbook"
  // Automation / containment (high-impact → approval required)
  | "aws_ec2_isolate"
  | "aws_iam_revoke_key"
  // Automation (lower-impact)
  | "aws_iam_disable_key"
  | "aws_ssm_runbook"
  // Forensics
  | "aws_ebs_snapshot"
  | "aws_memory_dump"
  | "aws_athena_query"
  // Evidence
  | "aws_evidence_vault";

export type IRActionLane = "llm" | "containment" | "automation" | "forensics" | "evidence";

export type IRActionStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "pending_approval"
  | "approved"
  | "rejected";

// ─── Core action record ───────────────────────────────────────────────────────

export interface IRAction {
  /** Stable ID — format: `{finding_id}:{type}:{timestamp}` */
  id: string;
  type: IRActionType;
  lane: IRActionLane;
  status: IRActionStatus;
  finding_id: string;
  initiated_at?: string;
  completed_at?: string;
  /** Backend job / execution ID */
  job_id?: string;
  /** Step Functions execution ARN (for approval-gated actions) */
  execution_arn?: string;
  result?: IRActionResult;
  error?: string;
  retry_count?: number;
  idempotency_key?: string;
  approval?: ApprovalRequest;
  audit_log: AuditEntry[];
}

// ─── Result shapes per action type ───────────────────────────────────────────

export interface IRActionResult {
  // LLM results
  triage_summary?: string;
  confidence_score?: number;
  false_positive_probability?: number;
  root_cause_narrative?: string;
  mitre_techniques?: string[];
  runbook_markdown?: string;
  // Containment results
  isolation_sg_id?: string;
  original_sg_ids?: string[];
  revoked_key_id?: string;
  disabled_key_id?: string;
  // SSM
  ssm_command_id?: string;
  ssm_output?: string;
  // Forensics
  snapshot_id?: string;
  snapshot_arn?: string;
  memory_dump_job_id?: string;
  memory_dump_s3_uri?: string;
  athena_query_id?: string;
  athena_results_s3_uri?: string;
  athena_scanned_bytes?: number;
  // Evidence
  evidence_s3_uri?: string;
  s3_etag?: string;
  hash_sha256?: string;
  [key: string]: unknown;
}

// ─── Approval workflow ────────────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  action_type: IRActionType;
  finding_id: string;
  resource_arn?: string;
  requested_by: string;
  requested_at: string;
  /** ISO timestamp — approval window is 15 minutes */
  expires_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  status: "pending" | "approved" | "rejected" | "expired";
  /** One-sentence impact description shown in the approval dialog */
  impact_summary: string;
  /** CLI command to roll back if something goes wrong */
  rollback_procedure: string;
  /** Step Functions state machine ARN handling this approval */
  state_machine_arn?: string;
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: "analyst" | "system" | "automation";
  action: string;
  details?: Record<string, string>;
  /** SHA-256 of (prev_entry_id + action + timestamp) for chain integrity */
  integrity_hash?: string;
  idempotency_key: string;
}

// ─── Forensics capture ───────────────────────────────────────────────────────

export interface ForensicsCapture {
  finding_id: string;
  snapshot_id?: string;
  snapshot_status?: "pending" | "creating" | "available" | "error";
  snapshot_arn?: string;
  snapshot_size_gb?: number;
  memory_dump_job_id?: string;
  memory_dump_status?: "pending" | "running" | "complete" | "failed";
  memory_dump_size_mb?: number;
  memory_dump_s3_uri?: string;
  athena_query_id?: string;
  athena_query_status?: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  athena_results_uri?: string;
  athena_scanned_bytes?: number;
  athena_execution_time_ms?: number;
  captured_at?: string;
  region?: string;
}

// ─── Evidence vault ───────────────────────────────────────────────────────────

export interface EvidenceRecord {
  finding_id: string;
  s3_bucket?: string;
  s3_key?: string;
  s3_object_lock_mode?: "GOVERNANCE" | "COMPLIANCE";
  s3_object_lock_retain_until?: string;
  s3_replication_status?: "PENDING" | "COMPLETE" | "FAILED" | "REPLICA";
  s3_replication_destination?: string;
  chain_of_custody: CustodyEvent[];
  hash_sha256?: string;
  size_bytes?: number;
  preserved_at?: string;
  report_download_url?: string;
}

export interface CustodyEvent {
  id: string;
  timestamp: string;
  action: "created" | "accessed" | "transferred" | "exported" | "verified" | "replicated";
  actor: string;
  details: string;
  integrity_verified?: boolean;
}

// ─── Engine state per finding ─────────────────────────────────────────────────

export interface IREngineState {
  finding_id: string;
  /** Keyed by IRActionType */
  actions: Partial<Record<IRActionType, IRAction>>;
  forensics?: ForensicsCapture;
  evidence?: EvidenceRecord;
  pending_approvals: ApprovalRequest[];
}

// ─── API request / response shapes ───────────────────────────────────────────

export interface IRActionRequest {
  finding_id: string;
  resource_arn?: string;
  resource_id?: string;
  region?: string;
  dry_run?: boolean;
  parameters?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface IRActionResponse {
  job_id: string;
  finding_id: string;
  action_type: IRActionType;
  status: IRActionStatus;
  message?: string;
  result?: IRActionResult;
  approval_required?: boolean;
  approval?: ApprovalRequest;
  execution_arn?: string;
}

export interface IRJobStatusResponse {
  job_id: string;
  status: IRActionStatus;
  result?: IRActionResult;
  error?: string;
  completed_at?: string;
}

// ─── High-impact action metadata ─────────────────────────────────────────────

export const HIGH_IMPACT_ACTIONS: IRActionType[] = [
  "aws_ec2_isolate",
  "aws_iam_revoke_key",
];

export const ACTION_META: Record<
  IRActionType,
  {
    label: string;
    lane: IRActionLane;
    endpoint: string;
    color: string;
    impactLevel: "low" | "medium" | "high";
    requiresApproval: boolean;
    description: string;
    impactSummary: string;
    rollbackProcedure: string;
  }
> = {
  llm_triage: {
    label: "Triage Summary",
    lane: "llm",
    endpoint: "POST /api/llm/triage",
    color: "#818cf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "LLM severity validation, false-positive scoring, and threat-intel context from the finding.",
    impactSummary: "Read-only analysis — no AWS resources modified.",
    rollbackProcedure: "N/A — no state changes made.",
  },
  llm_root_cause: {
    label: "Root Cause",
    lane: "llm",
    endpoint: "POST /api/llm/root-cause",
    color: "#818cf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "Generates a root-cause narrative with MITRE ATT&CK mapping and blast-radius estimate.",
    impactSummary: "Read-only analysis — no AWS resources modified.",
    rollbackProcedure: "N/A — no state changes made.",
  },
  llm_runbook: {
    label: "Runbook Rec.",
    lane: "llm",
    endpoint: "POST /api/llm/runbook",
    color: "#818cf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "Produces a tailored IR runbook based on finding context, MITRE phase, and resource type.",
    impactSummary: "Read-only — produces a markdown runbook document.",
    rollbackProcedure: "N/A — no state changes made.",
  },
  aws_ec2_isolate: {
    label: "EC2 Isolate",
    lane: "containment",
    endpoint: "POST /api/automation/contain",
    color: "#ff6b35",
    impactLevel: "high",
    requiresApproval: true,
    description: "Replaces all security groups on the instance with an isolation SG — cuts all inbound/outbound traffic.",
    impactSummary: "Instance will lose ALL network connectivity until security groups are restored.",
    rollbackProcedure:
      "aws ec2 modify-instance-attribute --instance-id {id} --groups {original_sg_ids}",
  },
  aws_iam_revoke_key: {
    label: "IAM Revoke Key",
    lane: "containment",
    endpoint: "POST /api/automation/contain",
    color: "#ff6b35",
    impactLevel: "high",
    requiresApproval: true,
    description: "Permanently deletes the access key. Any workloads using this key will immediately lose access.",
    impactSummary: "Access key permanently deleted — cannot be undone. Workloads using it will break.",
    rollbackProcedure:
      "Create a new access key: aws iam create-access-key --user-name {username}",
  },
  aws_iam_disable_key: {
    label: "IAM Disable Key",
    lane: "automation",
    endpoint: "POST /api/automation/remediate",
    color: "#ffb000",
    impactLevel: "medium",
    requiresApproval: false,
    description: "Sets the access key status to Inactive. Workloads using it will fail until re-enabled.",
    impactSummary: "Key disabled — can be re-enabled with aws iam update-access-key --status Active.",
    rollbackProcedure:
      "aws iam update-access-key --access-key-id {key_id} --status Active --user-name {username}",
  },
  aws_ssm_runbook: {
    label: "SSM Runbook",
    lane: "automation",
    endpoint: "POST /api/automation/remediate",
    color: "#ffb000",
    impactLevel: "medium",
    requiresApproval: false,
    description: "Executes the AWS Systems Manager automation document matching this finding type.",
    impactSummary: "SSM automation runs against target resources per the runbook document.",
    rollbackProcedure: "Cancel execution: aws ssm cancel-command --command-id {command_id}",
  },
  aws_ebs_snapshot: {
    label: "EBS Snapshot",
    lane: "forensics",
    endpoint: "POST /api/forensics/capture",
    color: "#38bdf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "Creates a point-in-time EBS snapshot of the affected volume for forensic analysis.",
    impactSummary: "Snapshot created — minor I/O impact during creation (~60s).",
    rollbackProcedure: "Delete snapshot: aws ec2 delete-snapshot --snapshot-id {snapshot_id}",
  },
  aws_memory_dump: {
    label: "Memory Dump",
    lane: "forensics",
    endpoint: "POST /api/forensics/capture",
    color: "#38bdf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "Initiates SSM memory dump via LiME kernel module. Output written to evidence S3 bucket.",
    impactSummary: "Memory dump via SSM — minimal performance impact (~5-10% CPU for ~3 min).",
    rollbackProcedure: "N/A — read-only operation.",
  },
  aws_athena_query: {
    label: "Athena Log Query",
    lane: "forensics",
    endpoint: "POST /api/forensics/capture",
    color: "#38bdf8",
    impactLevel: "low",
    requiresApproval: false,
    description: "Runs a scoped Athena query against CloudTrail + VPC Flow Logs for the affected resource.",
    impactSummary: "Read-only Athena query — standard query costs apply.",
    rollbackProcedure: "N/A — read-only.",
  },
  aws_evidence_vault: {
    label: "Evidence Vault",
    lane: "evidence",
    endpoint: "POST /api/evidence/preserve",
    color: "#a78bfa",
    impactLevel: "low",
    requiresApproval: false,
    description: "Packages all collected artifacts into S3 with Object Lock (COMPLIANCE mode) and cross-region replication.",
    impactSummary: "Objects locked for 90 days — cannot be deleted during retention period.",
    rollbackProcedure: "Override requires AWS root account and Object Lock governance override.",
  },
};
