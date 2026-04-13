/**
 * irMock.ts — Mock simulation layer for IR Action Engine (VITE_DATA_MODE=mock)
 *
 * Strategy:
 *   - On trigger: return queued response immediately
 *   - On poll (/ir/actions/{jobId}): advance state based on elapsed time
 *   - Approval-gated actions sit in pending_approval until approved/rejected
 *   - All timings tuned to feel realistic but fast enough for dev feedback
 */

import type {
  IRActionType,
  IRActionResponse,
  IRJobStatusResponse,
  IRActionResult,
  ApprovalRequest,
  ForensicsCapture,
  EvidenceRecord,
  PlaybookStep,
} from "../types/ir";

// ─── In-memory job store ──────────────────────────────────────────────────────

interface MockJob {
  job_id: string;
  finding_id: string;
  action_type: IRActionType;
  status: "queued" | "running" | "succeeded" | "failed" | "pending_approval";
  created_at: number;
  approval_required: boolean;
  approval?: ApprovalRequest;
  execution_arn?: string;
}

const jobStore = new Map<string, MockJob>();

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

// ─── Mock results per action type ────────────────────────────────────────────

function mockResult(type: IRActionType, findingId: string): IRActionResult {
  switch (type) {
    case "llm_triage":
      return {
        triage_summary:
          "Finding validated as TRUE POSITIVE with HIGH confidence. " +
          "The root access key (AKIA…4F2K) was used from an IP (185.220.101.47) " +
          "associated with Tor exit nodes 3 hours before the finding was generated. " +
          "CloudTrail shows 14 API calls across IAM, S3, and EC2 within a 4-minute burst. " +
          "False-positive probability: 3%.",
        confidence_score: 0.97,
        false_positive_probability: 0.03,
        mitre_techniques: ["T1078", "T1530", "T1552.005"],
      };

    case "llm_root_cause":
      return {
        root_cause_narrative:
          "**Initial Access (T1078 — Valid Accounts):** Attacker obtained long-lived IAM access " +
          "key AKIA…4F2K, likely through credential exposure in a public GitHub repository " +
          "(commit history shows key present for 6 days before rotation). " +
          "\n\n**Discovery (T1580):** 9 DescribeInstances, ListBuckets, and GetCallerIdentity " +
          "calls made in rapid succession — consistent with automated recon tooling. " +
          "\n\n**Collection (T1530):** 3 GetObject calls against s3://company-prod-data/exports/. " +
          "\n\n**Blast Radius:** credentials granted access to 3 S3 buckets and full EC2 describe " +
          "permissions. No evidence of lateral movement to other accounts.",
        mitre_techniques: ["T1078", "T1580", "T1530"],
      };

    case "llm_runbook":
      return {
        runbook_steps: [
          {
            step: 1,
            phase: "IDENTIFY" as PlaybookStep["phase"],
            title: "Validate Finding via CloudTrail",
            description: `Confirm true positive for ${findingId}. Query CloudTrail for API calls from the suspicious principal within the finding window and cross-reference source IPs against threat intel.`,
            commands: [
              "# Lookup events by access key",
              `aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA... --start-time $(date -u -d '-24 hours' +%FT%TZ) --max-results 50`,
              "# Cross-reference source IP against threat intel feeds",
              "aws guardduty list-findings --detector-id DETECTOR_ID --finding-criteria '{\"Criterion\":{\"service.action.awsApiCallAction.remoteIpDetails.ipAddressV4\":{\"Eq\":[\"SOURCE_IP\"]}}}'",
            ],
            estimated_time: "15",
          },
          {
            step: 2,
            phase: "CONTAIN" as PlaybookStep["phase"],
            title: "Revoke Compromised Credentials",
            description: "Immediately disable the access key to stop ongoing access. Use IR Engine → IAM Revoke Key for approval-gated permanent revocation.",
            commands: [
              "# Disable key (reversible — safe first step)",
              "aws iam update-access-key --access-key-id AKIA... --status Inactive --user-name USERNAME",
              "# Tag resource for IR tracking",
              "aws resourcegroupstaggingapi tag-resources --resource-arn-list RESOURCE_ARN --tags IncidentId=IR-001,ContainedAt=$(date -u +%FT%TZ)",
            ],
            estimated_time: "10",
          },
          {
            step: 3,
            phase: "REMEDIATE" as PlaybookStep["phase"],
            title: "Rotate Credentials and Harden IAM",
            description: "Issue a new key for legitimate workloads, apply least-privilege policy, enable MFA, and audit IAM trust boundaries to prevent recurrence.",
            commands: [
              "aws iam create-access-key --user-name USERNAME",
              "aws iam list-attached-user-policies --user-name USERNAME",
              "# Apply least-privilege — remove wildcard actions",
              "aws iam create-virtual-mfa-device --virtual-mfa-device-name USERNAME-mfa --outfile /tmp/mfa-qr.png --bootstrap-method QRCodePNG",
            ],
            estimated_time: "60",
          },
          {
            step: 4,
            phase: "VERIFY" as PlaybookStep["phase"],
            title: "Confirm Closure and Re-scan",
            description: "Re-run the scanner, verify no active sessions from the suspicious principal, resolve the Security Hub finding, and close the workflow ticket.",
            commands: [
              "aws iam list-access-keys --user-name USERNAME",
              "aws securityhub batch-update-findings --finding-identifiers ProductArn=PRODUCT_ARN,Id=FINDING_ID --note Text='Remediated by IR workflow',UpdatedBy=analyst --workflow Status=RESOLVED",
            ],
            estimated_time: "20",
          },
        ] satisfies PlaybookStep[],
      };

    case "aws_ec2_isolate":
      return {
        isolation_sg_id: makeId("sg"),
        original_sg_ids: ["sg-0abc1234", "sg-0def5678"],
      };

    case "aws_iam_revoke_key":
      return {
        revoked_key_id: "AKIA" + Math.random().toString(36).toUpperCase().slice(2, 16),
      };

    case "aws_iam_disable_key":
      return {
        disabled_key_id: "AKIA" + Math.random().toString(36).toUpperCase().slice(2, 16),
      };

    case "aws_ssm_runbook":
      return {
        ssm_command_id: makeId("cmd"),
        ssm_output: "Automation document AWS-DisableS3BucketPublicReadWrite completed. Status: Success.",
      };

    case "aws_ebs_snapshot":
      return {
        snapshot_id: "snap-0" + Math.random().toString(16).slice(2, 10),
        snapshot_arn: `arn:aws:ec2:us-east-1:123456789012:snapshot/snap-0${Math.random().toString(16).slice(2, 10)}`,
      };

    case "aws_memory_dump":
      return {
        memory_dump_job_id: makeId("memdump"),
        memory_dump_s3_uri: "s3://acme-ir-evidence/memory-dumps/i-0abc1234/2026-03-26T023000Z.lime.gz",
      };

    case "aws_athena_query":
      return {
        athena_query_id: makeId("athena"),
        athena_results_s3_uri: "s3://acme-ir-evidence/athena-results/query-" + makeId("q") + "/",
        athena_scanned_bytes: 1_483_020_288,
      };

    case "aws_evidence_vault":
      return {
        evidence_s3_uri: `s3://acme-ir-evidence/cases/${findingId}/bundle.tar.gz`,
        s3_etag: '"' + Math.random().toString(16).slice(2, 34) + '"',
        hash_sha256: Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join(""),
      };

    default:
      return {};
  }
}

function mockApproval(type: IRActionType, findingId: string): ApprovalRequest {
  return {
    id: makeId("appr"),
    action_type: type,
    finding_id: findingId,
    resource_arn: `arn:aws:iam::123456789012:resource/${findingId}`,
    requested_by: "system",
    requested_at: nowIso(),
    expires_at: futureIso(15 * 60 * 1000),
    status: "pending",
    impact_summary:
      type === "aws_ec2_isolate"
        ? "Instance will lose ALL network connectivity until security groups are restored."
        : "Access key permanently deleted — cannot be undone. Workloads using it will break.",
    rollback_procedure:
      type === "aws_ec2_isolate"
        ? "aws ec2 modify-instance-attribute --instance-id {id} --groups {original_sg_ids}"
        : "Create a new access key: aws iam create-access-key --user-name {username}",
    state_machine_arn:
      "arn:aws:states:us-east-1:123456789012:stateMachine:IR-ApprovalWorkflow",
  };
}

// ─── Trigger a mock job ───────────────────────────────────────────────────────

export function triggerMockAction(
  actionType: IRActionType,
  findingId: string,
  approvalRequired: boolean
): IRActionResponse {
  const jobId = makeId("job");
  const executionArn = approvalRequired
    ? `arn:aws:states:us-east-1:123456789012:execution:IR-ApprovalWorkflow:${jobId}`
    : undefined;

  const job: MockJob = {
    job_id: jobId,
    finding_id: findingId,
    action_type: actionType,
    status: approvalRequired ? "pending_approval" : "queued",
    created_at: Date.now(),
    approval_required: approvalRequired,
    execution_arn: executionArn,
    approval: approvalRequired ? mockApproval(actionType, findingId) : undefined,
  };

  jobStore.set(jobId, job);

  return {
    job_id: jobId,
    finding_id: findingId,
    action_type: actionType,
    status: job.status,
    approval_required: approvalRequired,
    approval: job.approval,
    execution_arn: executionArn,
  };
}

// ─── Approve a pending action ─────────────────────────────────────────────────

export function approveMockAction(jobId: string, approvedBy = "analyst"): boolean {
  const job = jobStore.get(jobId);
  if (!job || job.status !== "pending_approval") return false;
  job.status = "queued";
  // Reset created_at so timing counts from approval
  job.created_at = Date.now();
  if (job.approval) {
    job.approval.status = "approved";
    job.approval.approved_by = approvedBy;
    job.approval.approved_at = nowIso();
  }
  return true;
}

// ─── Reject a pending action ──────────────────────────────────────────────────

export function rejectMockAction(
  jobId: string,
  rejectedBy = "analyst",
  reason = "Rejected by analyst"
): boolean {
  const job = jobStore.get(jobId);
  if (!job || job.status !== "pending_approval") return false;
  if (job.approval) {
    job.approval.status = "rejected";
    job.approval.rejected_by = rejectedBy;
    job.approval.rejected_at = nowIso();
    job.approval.rejection_reason = reason;
  }
  jobStore.delete(jobId);
  return true;
}

// ─── Poll job status (simulates time-based progression) ──────────────────────

export function pollMockJob(jobId: string): IRJobStatusResponse | null {
  const job = jobStore.get(jobId);
  if (!job) return null;

  if (job.status === "pending_approval") {
    return { job_id: jobId, status: "pending_approval" };
  }

  const elapsed = (Date.now() - job.created_at) / 1000;

  // queued → running after 1.5s
  if (job.status === "queued" && elapsed >= 1.5) {
    job.status = "running";
  }

  // running → succeeded (or occasionally failed) after 4s
  if (job.status === "running" && elapsed >= 4) {
    // ~10% chance of failure for realism
    const shouldFail = Math.random() < 0.1;
    if (shouldFail) {
      job.status = "failed";
      return {
        job_id: jobId,
        status: "failed",
        error: "Simulated transient error — retry the action.",
        completed_at: nowIso(),
      };
    }
    job.status = "succeeded";
    const result = mockResult(job.action_type, job.finding_id);
    return {
      job_id: jobId,
      status: "succeeded",
      result,
      completed_at: nowIso(),
    };
  }

  return {
    job_id: jobId,
    status: job.status as IRJobStatusResponse["status"],
  };
}

// ─── Mock forensics data for a finding ───────────────────────────────────────

export function mockForensicsData(findingId: string): ForensicsCapture {
  return {
    finding_id: findingId,
    snapshot_id: "snap-0a1b2c3d4e5f6789",
    snapshot_status: "available",
    snapshot_arn: `arn:aws:ec2:us-east-1:123456789012:snapshot/snap-0a1b2c3d4e5f6789`,
    snapshot_size_gb: 32,
    memory_dump_job_id: "memdump-f47ac10b",
    memory_dump_status: "complete",
    memory_dump_size_mb: 8192,
    memory_dump_s3_uri: `s3://acme-ir-evidence/memory-dumps/${findingId}/2026-03-26T023000Z.lime.gz`,
    athena_query_id: "athena-c3d4e5f6",
    athena_query_status: "SUCCEEDED",
    athena_results_uri: `s3://acme-ir-evidence/athena-results/query-c3d4e5f6/`,
    athena_scanned_bytes: 1_483_020_288,
    athena_execution_time_ms: 4320,
    captured_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    region: "us-east-1",
  };
}

// ─── Mock evidence record for a finding ──────────────────────────────────────

export function mockEvidenceRecord(findingId: string): EvidenceRecord {
  return {
    finding_id: findingId,
    s3_bucket: "acme-ir-evidence",
    s3_key: `cases/${findingId}/bundle.tar.gz`,
    s3_object_lock_mode: "COMPLIANCE",
    s3_object_lock_retain_until: new Date(Date.now() + 90 * 86400_000).toISOString(),
    s3_replication_status: "COMPLETE",
    s3_replication_destination: "arn:aws:s3:::acme-ir-evidence-replica-us-west-2",
    hash_sha256: Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join(""),
    size_bytes: 1_457_862_656,
    preserved_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    report_download_url: "#",
    chain_of_custody: [
      {
        id: "coc-001",
        timestamp: new Date(Date.now() - 35 * 60_000).toISOString(),
        action: "created",
        actor: "ir-automation",
        details: "Evidence package created and uploaded to S3",
        integrity_verified: true,
      },
      {
        id: "coc-002",
        timestamp: new Date(Date.now() - 30 * 60_000).toISOString(),
        action: "verified",
        actor: "ir-automation",
        details: "SHA-256 hash verified against original artifacts",
        integrity_verified: true,
      },
      {
        id: "coc-003",
        timestamp: new Date(Date.now() - 25 * 60_000).toISOString(),
        action: "replicated",
        actor: "s3-replication",
        details: "Cross-region replication to us-west-2 completed",
        integrity_verified: true,
      },
    ],
  };
}
