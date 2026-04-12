"""
IR Action Engine — Flask API routes

Endpoints:
  POST /llm/triage            → LLM triage summary
  POST /llm/root-cause        → LLM root-cause narrative
  POST /llm/runbook           → LLM runbook recommendation
  POST /automation/contain    → EC2 isolate / IAM revoke (approval-gated)
  POST /automation/remediate  → IAM disable / SSM runbook
  POST /forensics/capture     → EBS snapshot / memory dump / Athena query
  POST /evidence/preserve     → S3 Object Lock vaulting
  GET  /ir/actions/<job_id>   → Poll job status
  POST /ir/actions/<job_id>/approve → Approve pending action
  POST /ir/actions/<job_id>/reject  → Reject pending action
  GET  /ir/forensics/<finding_id>   → Fetch forensics record
  GET  /ir/evidence/<finding_id>    → Fetch evidence record
  POST /ir/audit              → Append audit entry

Architecture notes:
  - Approval-gated actions (ec2_isolate, iam_revoke_key) post an EventBridge
    event that triggers a Step Functions execution. The execution waits for
    a taskToken callback (the /approve endpoint).
  - All actions are idempotent via idempotency_key (DynamoDB TTL table).
  - Retries: up to 3 attempts with exponential backoff, managed by Step Functions.
  - Rollback guards embedded in SSM automation documents.
"""

import json
import logging
import uuid
import time
import os
import boto3
from datetime import datetime, timezone, timedelta
from flask import request, jsonify
from flask_restful import Resource

logger = logging.getLogger(__name__)

# ─── Bedrock client ───────────────────────────────────────────────────────────

def _get_bedrock_client():
    api_key = os.environ.get("BEDROCK_API_KEY")
    region  = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    if api_key:
        # Bedrock API key auth: boto3 reads AWS_BEARER_TOKEN_BEDROCK automatically.
        # Do not stuff the key into SigV4 credential fields.
        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key
    # Without an API key, boto3 discovers credentials normally (env vars, IAM role, etc.)
    return boto3.client("bedrock-runtime", region_name=region)

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-haiku-4-5-20251001")

# ─── Runbook structured-output constants ──────────────────────────────────────

VALID_PHASES = {"IDENTIFY", "CONTAIN", "REMEDIATE", "VERIFY"}

SYSTEM_RUNBOOK = (
    "You are a cloud security incident responder. "
    "You MUST respond with ONLY a valid JSON array — no markdown, no prose, no code fences, no explanation. "
    "The array must contain exactly 4 objects matching this schema: "
    '{"step": <int>, "phase": <"IDENTIFY"|"CONTAIN"|"REMEDIATE"|"VERIFY">, '
    '"title": <string max 60 chars>, "description": <string max 200 chars>, '
    '"commands": [<bash strings, 1-4 items>], "estimated_time": <numeric string in minutes>}. '
    "Steps must be in phase order: IDENTIFY first, then CONTAIN, REMEDIATE, VERIFY. "
    "Every command must be a real AWS CLI command or a bash comment starting with #. "
    "Do not include any text before or after the JSON array."
)


def _invoke_claude(prompt: str, system: str | None = None, max_tokens: int = 1024) -> str | None:
    """Call Claude via Bedrock and return the text response. Falls back to None if unavailable."""
    try:
        client = _get_bedrock_client()
        body_dict = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            body_dict["system"] = system
        body = json.dumps(body_dict)
        response = client.invoke_model(modelId=MODEL_ID, body=body)
        result = json.loads(response["body"].read())
        return result["content"][0]["text"]
    except Exception as e:
        logger.error("Bedrock invocation failed: %s", e)
        return None  # Fall back to mock


def _parse_runbook_steps(raw: str | None) -> list[dict] | None:
    """
    Parse Claude's JSON response into a validated list of PlaybookStep dicts.
    Returns None if parsing or validation fails — caller falls back to mock steps.
    """
    if not raw:
        return None
    text = raw.strip()
    # Strip accidental code fences Claude sometimes emits despite instruction
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            line for line in lines[1:]
            if not line.strip().startswith("```")
        ).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Runbook JSON parse failed: %s | raw=%r", exc, raw[:200])
        return None
    if not isinstance(data, list) or len(data) == 0:
        logger.warning("Runbook JSON is not a non-empty list")
        return None
    validated = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            logger.warning("Runbook step %d is not a dict", i)
            return None
        phase = item.get("phase", "")
        if phase not in VALID_PHASES:
            logger.warning("Runbook step %d has invalid phase: %r", i, phase)
            return None
        step = {
            "step": int(item.get("step", i + 1)),
            "phase": phase,
            "title": str(item.get("title", ""))[:80],
            "description": str(item.get("description", ""))[:400],
            "commands": [str(c) for c in (item.get("commands") if isinstance(item.get("commands"), list) else []) if isinstance(c, str)][:6],
            "estimated_time": str(item.get("estimated_time", "30")),
        }
        validated.append(step)
    return validated if validated else None

# ─── In-memory job store (replace with DynamoDB in production) ────────────────

_job_store: dict[str, dict] = {}
_audit_log: list[dict] = []
_idempotency_cache: dict[str, str] = {}  # idempotency_key → job_id

# ─── Helpers ──────────────────────────────────────────────────────────────────

HIGH_IMPACT_ACTIONS = {"aws_ec2_isolate", "aws_iam_revoke_key"}

ENDPOINT_TO_ACTION_TYPES = {
    "/llm/triage": "llm_triage",
    "/llm/root-cause": "llm_root_cause",
    "/llm/runbook": "llm_runbook",
    "/automation/remediate": None,  # resolved from body
    "/automation/contain": None,    # resolved from body
    "/forensics/capture": None,     # resolved from body
    "/evidence/preserve": "aws_evidence_vault",
}

STEP_FUNCTION_ARN = (
    "arn:aws:states:us-east-1:123456789012:stateMachine:IR-ApprovalWorkflow"
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _future_iso(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


def _new_job_id() -> str:
    return f"job-{uuid.uuid4().hex[:12]}"


def _write_audit(
    finding_id: str,
    actor: str,
    actor_type: str,
    action: str,
    details: dict | None = None,
    idempotency_key: str = "",
) -> None:
    entry = {
        "id": f"audit-{uuid.uuid4().hex[:8]}",
        "timestamp": _now_iso(),
        "finding_id": finding_id,
        "actor": actor,
        "actor_type": actor_type,
        "action": action,
        "details": details or {},
        "idempotency_key": idempotency_key,
    }
    _audit_log.append(entry)
    logger.info("AUDIT | %s | %s | %s", finding_id, actor, action)


def _check_idempotency(key: str) -> str | None:
    """Return existing job_id if this key was already processed."""
    return _idempotency_cache.get(key)


def _register_idempotency(key: str, job_id: str) -> None:
    _idempotency_cache[key] = job_id


# ─── Simulate async job execution (replace with Lambda/Step Functions) ────────

def _mock_execute_job(job_id: str) -> None:
    """
    In production: this would post an EventBridge event to trigger a Lambda
    or Step Functions execution. Here we immediately mark the job as running
    and schedule completion. In a real deployment, a background worker or
    SQS consumer would handle this.
    """
    job = _job_store.get(job_id)
    if not job:
        return
    job["status"] = "running"
    job["started_at"] = _now_iso()
    # Simulate result (production: Lambda would update DynamoDB)
    job["_mock_complete_at"] = time.time() + 3


# ─── LLM endpoints ────────────────────────────────────────────────────────────

class LLMTriageResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:llm_triage:{_now_iso()[:13]}"

        # Idempotency check
        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_triage",
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "system", "system", "LLM triage triggered", idempotency_key=idempotency_key)

        prompt = (
            f"You are a cloud security incident responder. Triage this AWS security finding:\n"
            f"Finding ID: {finding_id}\n"
            f"Severity: {data.get('severity', 'Unknown')}\n"
            f"Type: {data.get('finding_type', 'Unknown')}\n"
            f"Resource: {data.get('resource_name', 'Unknown')}\n"
            f"Description: {data.get('description', 'No description provided')}\n\n"
            f"Respond with: 1) TRUE/FALSE POSITIVE assessment, 2) confidence score 0-1, "
            f"3) MITRE ATT&CK techniques, 4) immediate recommended actions. Be concise."
        )
        llm_response = _invoke_claude(prompt)
        mock = _mock_result("llm_triage")

        job = _job_store[job_id]
        job["status"] = "succeeded"
        job["completed_at"] = _now_iso()
        # When Bedrock returns real prose, omit mock confidence/MITRE fields — mixing
        # fabricated metadata with real LLM text misleads the operator.
        if llm_response:
            job["result"] = {
                "triage_summary": llm_response,
                "model": MODEL_ID,
            }
        else:
            job["result"] = {**mock, "model": "mock"}

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_triage",
            "status": "succeeded",
            "approval_required": False,
            "result": job["result"],
        }, 202


class LLMRootCauseResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:llm_root_cause:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_root_cause",
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "system", "system", "LLM root-cause analysis triggered", idempotency_key=idempotency_key)

        prompt = (
            f"You are a cloud security expert. Perform root cause analysis for this AWS finding:\n"
            f"Finding ID: {finding_id}\n"
            f"Severity: {data.get('severity', 'Unknown')}\n"
            f"Type: {data.get('finding_type', 'Unknown')}\n"
            f"Resource: {data.get('resource_name', 'Unknown')}\n"
            f"Description: {data.get('description', 'No description provided')}\n\n"
            f"Provide: 1) Root cause narrative, 2) Attack chain reconstruction, "
            f"3) MITRE ATT&CK mapping, 4) Contributing factors. Be concise and technical."
        )
        llm_response = _invoke_claude(prompt)
        mock = _mock_result("llm_root_cause")

        job = _job_store[job_id]
        job["status"] = "succeeded"
        job["completed_at"] = _now_iso()
        # Same rule as triage: omit mock MITRE techniques when Bedrock returns real prose.
        if llm_response:
            job["result"] = {
                "root_cause_narrative": llm_response,
                "model": MODEL_ID,
            }
        else:
            job["result"] = {**mock, "model": "mock"}

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_root_cause",
            "status": "succeeded",
            "approval_required": False,
            "result": job["result"],
        }, 202


class LLMRunbookResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:llm_runbook:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_runbook",
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "system", "system", "LLM runbook generation triggered", idempotency_key=idempotency_key)

        user_prompt = (
            f"Generate a 4-step IR playbook for this AWS security finding.\n"
            f"Finding ID: {finding_id}\n"
            f"Severity: {data.get('severity', 'MEDIUM')}\n"
            f"Type: {data.get('finding_type', 'Unknown')}\n"
            f"Resource: {data.get('resource_name', 'Unknown')}\n"
            f"Resource ARN: {data.get('resource_arn', 'arn:aws:iam::123456789012:resource/unknown')}\n"
            f"Description: {data.get('description', 'No description provided')}\n\n"
            f"Return only the JSON array as instructed."
        )
        llm_response = _invoke_claude(user_prompt, system=SYSTEM_RUNBOOK, max_tokens=2048)
        parsed_steps = _parse_runbook_steps(llm_response)
        mock = _mock_result("llm_runbook")

        job = _job_store[job_id]
        job["status"] = "succeeded"
        job["completed_at"] = _now_iso()
        job["result"] = {
            "runbook_steps": parsed_steps if parsed_steps is not None else mock["runbook_steps"],
            "model": MODEL_ID if (llm_response and parsed_steps is not None) else "mock",
        }

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "llm_runbook",
            "status": "succeeded",
            "approval_required": False,
            "result": job["result"],
        }, 202


# ─── Automation endpoints ─────────────────────────────────────────────────────

class AutomationContainResource(Resource):
    """High-impact containment — requires Step Functions approval gate."""

    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        action_type = data.get("action_type", "aws_ec2_isolate")
        resource_arn = data.get("resource_arn", "")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:{action_type}:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "pending_approval"}), 200

        job_id = _new_job_id()
        execution_arn = f"arn:aws:states:us-east-1:123456789012:execution:IR-ApprovalWorkflow:{job_id}"

        impact_summary = (
            "Instance will lose ALL network connectivity until security groups are restored."
            if action_type == "aws_ec2_isolate"
            else "Access key permanently deleted — cannot be undone."
        )
        rollback = (
            "aws ec2 modify-instance-attribute --instance-id {id} --groups {original_sg_ids}"
            if action_type == "aws_ec2_isolate"
            else "aws iam create-access-key --user-name {username}"
        )

        approval = {
            "id": f"appr-{uuid.uuid4().hex[:8]}",
            "action_type": action_type,
            "finding_id": finding_id,
            "resource_arn": resource_arn,
            "requested_by": "analyst",
            "requested_at": _now_iso(),
            "expires_at": _future_iso(15),
            "status": "pending",
            "impact_summary": impact_summary,
            "rollback_procedure": rollback,
            "state_machine_arn": STEP_FUNCTION_ARN,
        }

        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "pending_approval",
            "created_at": _now_iso(),
            "approval_required": True,
            "approval": approval,
            "execution_arn": execution_arn,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(
            finding_id, "analyst", "analyst",
            f"Containment action requested: {action_type}",
            details={"resource_arn": resource_arn},
            idempotency_key=idempotency_key,
        )

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "pending_approval",
            "approval_required": True,
            "approval": approval,
            "execution_arn": execution_arn,
        }, 202


class AutomationRemediateResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        action_type = data.get("action_type", "aws_iam_disable_key")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:{action_type}:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "analyst", "analyst", f"Remediation triggered: {action_type}", idempotency_key=idempotency_key)
        _mock_execute_job(job_id)

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "queued",
            "approval_required": False,
        }, 202


class ForensicsCaptureResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        action_type = data.get("action_type", "aws_ebs_snapshot")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:{action_type}:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "analyst", "analyst", f"Forensics capture initiated: {action_type}", idempotency_key=idempotency_key)
        _mock_execute_job(job_id)

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": action_type,
            "status": "queued",
            "approval_required": False,
        }, 202


class EvidencePreserveResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        finding_id = data.get("finding_id", "unknown")
        idempotency_key = data.get("idempotency_key") or f"{finding_id}:aws_evidence_vault:{_now_iso()[:13]}"

        existing = _check_idempotency(idempotency_key)
        if existing:
            return _job_store.get(existing, {"job_id": existing, "status": "queued"}), 200

        job_id = _new_job_id()
        _job_store[job_id] = {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "aws_evidence_vault",
            "status": "queued",
            "created_at": _now_iso(),
            "approval_required": False,
        }
        _register_idempotency(idempotency_key, job_id)
        _write_audit(finding_id, "analyst", "analyst", "Evidence preservation initiated", idempotency_key=idempotency_key)
        _mock_execute_job(job_id)

        return {
            "job_id": job_id,
            "finding_id": finding_id,
            "action_type": "aws_evidence_vault",
            "status": "queued",
            "approval_required": False,
        }, 202


# ─── Job status polling ───────────────────────────────────────────────────────

class IRJobStatusResource(Resource):
    def get(self, job_id: str):
        job = _job_store.get(job_id)
        if not job:
            return {"error": "Job not found"}, 404

        # Simulate completion for mock jobs
        mock_complete = job.get("_mock_complete_at")
        if mock_complete and time.time() >= mock_complete and job["status"] == "running":
            job["status"] = "succeeded"
            job["completed_at"] = _now_iso()
            job["result"] = _mock_result(job["action_type"])

        return {
            "job_id": job_id,
            "status": job["status"],
            "result": job.get("result"),
            "error": job.get("error"),
            "completed_at": job.get("completed_at"),
        }, 200

    def _mock_result(self, action_type: str) -> dict:
        return _mock_result(action_type)


def _mock_result(action_type: str) -> dict:
    """Stub result shapes matching frontend expectations."""
    results = {
        "llm_triage": {
            "triage_summary": "TRUE POSITIVE with HIGH confidence. Source IP associated with Tor exit nodes.",
            "confidence_score": 0.97,
            "false_positive_probability": 0.03,
            "mitre_techniques": ["T1078", "T1530"],
        },
        "llm_root_cause": {
            "root_cause_narrative": "Initial access via compromised long-lived access key.",
            "mitre_techniques": ["T1078", "T1580"],
        },
        "llm_runbook": {
            "runbook_steps": [
                {
                    "step": 1,
                    "phase": "IDENTIFY",
                    "title": "Validate Finding via CloudTrail",
                    "description": "Confirm true positive by querying CloudTrail for API calls from the suspicious principal within the finding window. Cross-reference source IPs against threat intel.",
                    "commands": [
                        "# Lookup events by access key or resource",
                        "aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA_REPLACE --start-time $(date -u -d '-24 hours' +%FT%TZ) --max-results 50",
                        "# Check for anomalous IAM activity",
                        "aws iam generate-service-last-accessed-details --arn RESOURCE_ARN",
                    ],
                    "estimated_time": "15",
                },
                {
                    "step": 2,
                    "phase": "CONTAIN",
                    "title": "Revoke Compromised Credentials",
                    "description": "Immediately disable the access key to stop ongoing access. Use the IR Engine contain actions for approval-gated permanent revocation.",
                    "commands": [
                        "# Disable key (reversible — safe first step)",
                        "aws iam update-access-key --access-key-id AKIA_REPLACE --status Inactive --user-name USERNAME",
                        "# Tag resource for IR tracking",
                        "aws resourcegroupstaggingapi tag-resources --resource-arn-list RESOURCE_ARN --tags IncidentId=IR-REPLACE,ContainedAt=$(date -u +%FT%TZ)",
                    ],
                    "estimated_time": "10",
                },
                {
                    "step": 3,
                    "phase": "REMEDIATE",
                    "title": "Rotate Credentials and Harden IAM",
                    "description": "Issue a new key for legitimate workloads, apply least-privilege policy, enable MFA, and audit IAM trust boundaries to prevent recurrence.",
                    "commands": [
                        "# Create replacement key for the workload",
                        "aws iam create-access-key --user-name USERNAME",
                        "# Review and scope down attached policies",
                        "aws iam list-attached-user-policies --user-name USERNAME",
                        "# Enable virtual MFA",
                        "aws iam create-virtual-mfa-device --virtual-mfa-device-name USERNAME-mfa --outfile /tmp/mfa-qr.png --bootstrap-method QRCodePNG",
                    ],
                    "estimated_time": "60",
                },
                {
                    "step": 4,
                    "phase": "VERIFY",
                    "title": "Confirm Closure and Re-scan",
                    "description": "Re-run the scanner, verify no active sessions from the suspicious principal, update the Security Hub finding status, and close the workflow ticket.",
                    "commands": [
                        "# Confirm no active sessions remain",
                        "aws iam list-access-keys --user-name USERNAME",
                        "# Resolve finding in Security Hub",
                        "aws securityhub batch-update-findings --finding-identifiers ProductArn=PRODUCT_ARN,Id=FINDING_ID --note Text='Remediated by IR workflow',UpdatedBy=analyst --workflow Status=RESOLVED",
                    ],
                    "estimated_time": "20",
                },
            ],
        },
        "aws_ec2_isolate": {
            "isolation_sg_id": f"sg-{uuid.uuid4().hex[:8]}",
            "original_sg_ids": ["sg-0abc1234", "sg-0def5678"],
        },
        "aws_iam_revoke_key": {
            "revoked_key_id": f"AKIA{uuid.uuid4().hex[:12].upper()}",
        },
        "aws_iam_disable_key": {
            "disabled_key_id": f"AKIA{uuid.uuid4().hex[:12].upper()}",
        },
        "aws_ssm_runbook": {
            "ssm_command_id": f"cmd-{uuid.uuid4().hex[:12]}",
            "ssm_output": "Automation document completed. Status: Success.",
        },
        "aws_ebs_snapshot": {
            "snapshot_id": f"snap-0{uuid.uuid4().hex[:15]}",
        },
        "aws_memory_dump": {
            "memory_dump_job_id": f"memdump-{uuid.uuid4().hex[:8]}",
            "memory_dump_s3_uri": "s3://acme-ir-evidence/memory-dumps/dump.lime.gz",
        },
        "aws_athena_query": {
            "athena_query_id": f"athena-{uuid.uuid4().hex[:8]}",
            "athena_results_s3_uri": "s3://acme-ir-evidence/athena-results/",
            "athena_scanned_bytes": 1_483_020_288,
        },
        "aws_evidence_vault": {
            "evidence_s3_uri": "s3://acme-ir-evidence/cases/bundle.tar.gz",
            "hash_sha256": uuid.uuid4().hex * 2,
        },
    }
    return results.get(action_type, {})


# ─── Approval / rejection ─────────────────────────────────────────────────────

class IRJobApproveResource(Resource):
    def post(self, job_id: str):
        job = _job_store.get(job_id)
        if not job:
            return {"error": "Job not found"}, 404
        if job.get("status") != "pending_approval":
            return {"error": "Job is not pending approval", "current_status": job.get("status")}, 409

        data = request.get_json(silent=True) or {}
        approved_by = data.get("approved_by", "analyst")

        job["status"] = "queued"
        job["approved_by"] = approved_by
        job["approved_at"] = _now_iso()
        if job.get("approval"):
            job["approval"]["status"] = "approved"
            job["approval"]["approved_by"] = approved_by
            job["approval"]["approved_at"] = _now_iso()

        _write_audit(
            job["finding_id"], approved_by, "analyst",
            f"Approved {job['action_type']}",
            details={"job_id": job_id},
        )
        _mock_execute_job(job_id)

        return {"success": True, "job_id": job_id, "status": "queued"}, 200


class IRJobRejectResource(Resource):
    def post(self, job_id: str):
        job = _job_store.get(job_id)
        if not job:
            return {"error": "Job not found"}, 404
        if job.get("status") != "pending_approval":
            return {"error": "Job is not pending approval"}, 409

        data = request.get_json(silent=True) or {}
        rejected_by = data.get("rejected_by", "analyst")
        reason = data.get("reason", "Rejected by analyst")

        if job.get("approval"):
            job["approval"]["status"] = "rejected"
            job["approval"]["rejected_by"] = rejected_by
            job["approval"]["rejected_at"] = _now_iso()
            job["approval"]["rejection_reason"] = reason

        del _job_store[job_id]

        _write_audit(
            job["finding_id"], rejected_by, "analyst",
            f"Rejected {job['action_type']}: {reason}",
            details={"job_id": job_id},
        )

        return {"success": True, "job_id": job_id, "reason": reason}, 200


# ─── Forensics + evidence records ────────────────────────────────────────────

class IRForensicsResource(Resource):
    def get(self, finding_id: str):
        region = request.args.get("region", "us-east-1")
        # Production: query DynamoDB or S3 manifest
        return {
            "finding_id": finding_id,
            "snapshot_id": f"snap-0{uuid.uuid4().hex[:15]}",
            "snapshot_status": "available",
            "snapshot_size_gb": 32,
            "memory_dump_job_id": f"memdump-{uuid.uuid4().hex[:8]}",
            "memory_dump_status": "complete",
            "memory_dump_size_mb": 8192,
            "memory_dump_s3_uri": f"s3://acme-ir-evidence/memory-dumps/{finding_id}/dump.lime.gz",
            "athena_query_id": f"athena-{uuid.uuid4().hex[:8]}",
            "athena_query_status": "SUCCEEDED",
            "athena_scanned_bytes": 1_483_020_288,
            "athena_execution_time_ms": 4320,
            "captured_at": _now_iso(),
            "region": region,
        }, 200


class IREvidenceResource(Resource):
    def get(self, finding_id: str):
        return {
            "finding_id": finding_id,
            "s3_bucket": "acme-ir-evidence",
            "s3_key": f"cases/{finding_id}/bundle.tar.gz",
            "s3_object_lock_mode": "COMPLIANCE",
            "s3_object_lock_retain_until": _future_iso(90 * 24 * 60),
            "s3_replication_status": "COMPLETE",
            "s3_replication_destination": "arn:aws:s3:::acme-ir-evidence-replica-us-west-2",
            "hash_sha256": uuid.uuid4().hex * 2,
            "size_bytes": 1_457_862_656,
            "preserved_at": _now_iso(),
            "chain_of_custody": [
                {
                    "id": f"coc-{uuid.uuid4().hex[:6]}",
                    "timestamp": _now_iso(),
                    "action": "created",
                    "actor": "ir-automation",
                    "details": "Evidence package created",
                    "integrity_verified": True,
                }
            ],
        }, 200


# ─── Audit ────────────────────────────────────────────────────────────────────

class IRAuditResource(Resource):
    def post(self):
        data = request.get_json(silent=True) or {}
        entry = {
            "id": data.get("id", f"audit-{uuid.uuid4().hex[:8]}"),
            "timestamp": data.get("timestamp", _now_iso()),
            "finding_id": data.get("finding_id", "unknown"),
            "actor": data.get("actor", "unknown"),
            "actor_type": data.get("actor_type", "system"),
            "action": data.get("action", ""),
            "details": data.get("details", {}),
            "idempotency_key": data.get("idempotency_key", ""),
        }
        _audit_log.append(entry)
        logger.info("AUDIT | %s | %s | %s", entry["finding_id"], entry["actor"], entry["action"])
        return {"success": True, "id": entry["id"]}, 201

    def get(self):
        finding_id = request.args.get("finding_id")
        if finding_id:
            return [e for e in _audit_log if e.get("finding_id") == finding_id], 200
        return _audit_log[-100:], 200
