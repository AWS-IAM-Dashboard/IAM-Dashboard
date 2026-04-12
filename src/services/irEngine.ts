/**
 * irEngine.ts — IR Action Engine API client
 *
 * Handles all six IR endpoints:
 *   POST /api/llm/triage
 *   POST /api/llm/root-cause
 *   POST /api/llm/runbook
 *   POST /api/automation/contain
 *   POST /api/automation/remediate
 *   POST /api/forensics/capture
 *   POST /api/evidence/preserve
 *
 * Plus status polling:
 *   GET  /api/ir/actions/{jobId}
 *   POST /api/ir/actions/{jobId}/approve
 *   POST /api/ir/actions/{jobId}/reject
 *
 * Audit log: every action is logged via POST /api/ir/audit
 */

import type {
  IRActionType,
  IRActionRequest,
  IRActionResponse,
  IRActionResult,
  IRJobStatusResponse,
  ForensicsCapture,
  EvidenceRecord,
  AuditEntry,
} from "../types/ir";
import {
  triggerMockAction,
  approveMockAction,
  rejectMockAction,
  pollMockJob,
  mockForensicsData,
  mockEvidenceRecord,
} from "../mock/irMock";

/** IR/LLM base (Flask /api/v1). Split from VITE_API_URL so /scan can stay on API Gateway via Vite proxy. */
const IR_API_BASE_URL =
  import.meta.env.VITE_IR_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_GATEWAY_URL ||
  "https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1";

const DATA_MODE = (import.meta.env.VITE_DATA_MODE || "live").toLowerCase();
const IS_MOCK = DATA_MODE === "mock";

const LLM_MAX_CONCURRENT = Math.max(1, Number(import.meta.env.VITE_LLM_MAX_CONCURRENT || 2));
let llmInFlight = 0;
const llmWaitQueue: Array<() => void> = [];

async function withLlmLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (llmInFlight >= LLM_MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      llmWaitQueue.push(resolve);
    });
  }
  llmInFlight++;
  try {
    return await fn();
  } finally {
    llmInFlight--;
    llmWaitQueue.shift()?.();
  }
}

function isLlmActionType(t: IRActionType): boolean {
  return t === "llm_triage" || t === "llm_root_cause" || t === "llm_runbook";
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function irFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${IR_API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = res.statusText;
    try {
      const err = JSON.parse(text) as { message?: string; error?: string };
      detail = err.message || err.error || detail;
    } catch {
      if (text.trim()) detail = text.trim().slice(0, 240);
    }
    throw new Error(`${detail} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ─── Idempotency key ─────────────────────────────────────────────────────────

function makeIdempotencyKey(actionType: IRActionType, findingId: string): string {
  return `${findingId}:${actionType}:${new Date().toISOString().slice(0, 13)}`;
}

// ─── Endpoint routing ─────────────────────────────────────────────────────────

function endpointForAction(type: IRActionType): string {
  switch (type) {
    case "llm_triage":     return "/llm/triage";
    case "llm_root_cause": return "/llm/root-cause";
    case "llm_runbook":    return "/llm/runbook";
    case "aws_ec2_isolate":
    case "aws_iam_revoke_key":
      return "/automation/contain";
    case "aws_iam_disable_key":
    case "aws_ssm_runbook":
      return "/automation/remediate";
    case "aws_ebs_snapshot":
    case "aws_memory_dump":
    case "aws_athena_query":
      return "/forensics/capture";
    case "aws_evidence_vault":
      return "/evidence/preserve";
  }
}

// ─── Approval requirement ─────────────────────────────────────────────────────

function requiresApproval(type: IRActionType): boolean {
  return type === "aws_ec2_isolate" || type === "aws_iam_revoke_key";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run an LLM IR action. Live Flask returns `result` on POST; mock mode may need polling.
 * LLM calls share a global concurrency limit (VITE_LLM_MAX_CONCURRENT).
 */
export async function fetchLLMActionResult(
  actionType: "llm_triage" | "llm_root_cause" | "llm_runbook",
  request: IRActionRequest
): Promise<IRActionResult | undefined> {
  const response = await triggerIRAction(actionType, request);
  if (response.result) return response.result;
  if (!response.job_id) return undefined;
  const final = await pollUntilDone(response.job_id, () => {}, 400, 30);
  return final?.result;
}

/**
 * Trigger an IR action. Returns the initial job state.
 * For high-impact actions, returns status=pending_approval with an approval object.
 */
export async function triggerIRAction(
  actionType: IRActionType,
  request: IRActionRequest
): Promise<IRActionResponse> {
  const idempotencyKey =
    request.idempotency_key ?? makeIdempotencyKey(actionType, request.finding_id);

  if (IS_MOCK) {
    return triggerMockAction(actionType, request.finding_id, requiresApproval(actionType));
  }

  const endpoint = endpointForAction(actionType);
  const body = {
    ...request,
    action_type: actionType,
    idempotency_key: idempotencyKey,
  };

  const post = () =>
    irFetch<IRActionResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });

  if (isLlmActionType(actionType)) {
    return withLlmLimit(post);
  }
  return post();
}

/**
 * Poll job status. Returns null if the job is not found.
 */
export async function pollActionStatus(
  jobId: string
): Promise<IRJobStatusResponse | null> {
  if (IS_MOCK) {
    return pollMockJob(jobId);
  }
  return irFetch<IRJobStatusResponse>(`/ir/actions/${jobId}`);
}

/**
 * Approve a pending high-impact action.
 */
export async function approveAction(
  jobId: string,
  approvedBy: string
): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    const ok = approveMockAction(jobId, approvedBy);
    return { success: ok };
  }
  return irFetch<{ success: boolean }>(`/ir/actions/${jobId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });
}

/**
 * Reject a pending high-impact action.
 */
export async function rejectAction(
  jobId: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean }> {
  if (IS_MOCK) {
    const ok = rejectMockAction(jobId, rejectedBy, reason);
    return { success: ok };
  }
  return irFetch<{ success: boolean }>(`/ir/actions/${jobId}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejected_by: rejectedBy, reason }),
  });
}

/**
 * Fetch forensics capture data for a finding.
 */
export async function getForensicsData(
  findingId: string,
  region = "us-east-1"
): Promise<ForensicsCapture | null> {
  if (IS_MOCK) {
    return mockForensicsData(findingId);
  }
  return irFetch<ForensicsCapture>(`/ir/forensics/${findingId}?region=${region}`);
}

/**
 * Fetch evidence record for a finding.
 */
export async function getEvidenceRecord(
  findingId: string
): Promise<EvidenceRecord | null> {
  if (IS_MOCK) {
    return mockEvidenceRecord(findingId);
  }
  return irFetch<EvidenceRecord>(`/ir/evidence/${findingId}`);
}

/**
 * Append an audit entry. Fire-and-forget — errors are swallowed.
 */
export async function logAuditEntry(
  entry: Omit<AuditEntry, "id" | "integrity_hash">
): Promise<void> {
  if (IS_MOCK) return;

  irFetch("/ir/audit", {
    method: "POST",
    body: JSON.stringify({
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }),
  }).catch(() => {
    // audit logging is best-effort — never block the UI
  });
}

/**
 * Poll until a job reaches a terminal state (succeeded/failed) or max attempts.
 * Returns the final status response.
 */
export async function pollUntilDone(
  jobId: string,
  onUpdate: (status: IRJobStatusResponse) => void,
  intervalMs = 2000,
  maxAttempts = 30
): Promise<IRJobStatusResponse | null> {
  let attempts = 0;

  return new Promise((resolve) => {
    const tick = async () => {
      if (attempts >= maxAttempts) {
        resolve(null);
        return;
      }

      attempts++;
      const status = await pollActionStatus(jobId).catch(() => null);

      if (!status) {
        resolve(null);
        return;
      }

      onUpdate(status);

      if (status.status === "succeeded" || status.status === "failed") {
        resolve(status);
        return;
      }

      setTimeout(tick, intervalMs);
    };

    setTimeout(tick, intervalMs);
  });
}
