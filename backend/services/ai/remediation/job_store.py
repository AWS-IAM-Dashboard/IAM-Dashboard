from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
import time

import boto3
from botocore.exceptions import ClientError



def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class JobEnvelope:
    job_id: str
    status: str
    attempt_count: int
    max_attempts: int
    last_error: Optional[str]
    result: Optional[Dict[str, Any]]
    account_id: Optional[str]
    ai2_input: Optional[Dict[str, Any]]


class InMemoryRemediationJobStore:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._idempotency: Dict[str, str] = {}

    def create_job_if_not_exists(
        self,
        *,
        idempotency_key: str,
        ai2_input_raw: Dict[str, Any],
    ) -> Tuple[str, bool]:
        # Idempotency by exact key within this process.
        if idempotency_key in self._idempotency:
            return self._idempotency[idempotency_key], False

        ##job_id = f"remediation-{datetime.utcnow().timestamp_ns()}"

        job_id = f"remediation-{time.time_ns()}"
        self._idempotency[idempotency_key] = job_id
        self._jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "attempt_count": 0,
            "max_attempts": 4,
            "last_error": None,
            "result": None,
            "ai2_input": ai2_input_raw,
            "created_at": _utc_now_iso(),
            "updated_at": _utc_now_iso(),
        }
        return job_id, True

    def get_job(self, *, job_id: str) -> Optional[Dict[str, Any]]:
        return self._jobs.get(job_id)

    def update_job_status(
        self,
        *,
        job_id: str,
        status: str,
        attempt_count: Optional[int] = None,
        last_error: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
    ) -> None:
        if job_id not in self._jobs:
            return
        job = self._jobs[job_id]
        job["status"] = status
        if attempt_count is not None:
            job["attempt_count"] = attempt_count
        if last_error is not None:
            job["last_error"] = last_error
        if result is not None:
            job["result"] = result
        job["updated_at"] = _utc_now_iso()


class DynamoDBRemediationJobStore:
    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        self.jobs_table_name = os.environ.get(
            "DYNAMODB_REMEDIATION_JOBS_TABLE",
            "iam-dashboard-remediation-jobs",
        )
        self.idempotency_table_name = os.environ.get(
            "DYNAMODB_REMEDIATION_IDEMPOTENCY_TABLE",
            "iam-dashboard-remediation-idempotency",
        )
        self.jobs = self.dynamodb.Table(self.jobs_table_name)
        self.idempotency = self.dynamodb.Table(self.idempotency_table_name)

    def create_job_if_not_exists(
        self,
        *,
        idempotency_key: str,
        ai2_input_raw: Dict[str, Any],
    ) -> Tuple[str, bool]:
        created_at = _utc_now_iso()
        job_id = f"remediation-{int(datetime.utcnow().timestamp())}-{idempotency_key[:8]}"

        # 1) Reserve the idempotency key -> job_id mapping.
        #    This prevents duplicate job creation.
        try:
            self.idempotency.put_item(
                Item={
                    "idempotency_key": idempotency_key,
                    "job_id": job_id,
                    "created_at": created_at,
                },
                ConditionExpression="attribute_not_exists(idempotency_key)",
            )
            is_new = True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            # Already exists: return the existing mapping.
            item = self.idempotency.get_item(
                Key={"idempotency_key": idempotency_key}
            ).get("Item")
            if not item:
                raise RuntimeError("Idempotency key exists but mapping could not be loaded.")
            return item["job_id"], False

        # 2) Create the job record.
        account_id = None
        try:
            account_id = ai2_input_raw.get("environment_context", {}).get("account_id")
        except Exception:
            account_id = None

        self.jobs.put_item(
            Item={
                "job_id": job_id,
                "account_id": account_id,
                "status": "queued",
                "attempt_count": 0,
                "max_attempts": 4,
                "last_error": None,
                "result": None,
                "ai2_input": ai2_input_raw,
                "created_at": created_at,
                "updated_at": created_at,
            }
        )
        return job_id, is_new

    def get_job(self, *, job_id: str) -> Optional[Dict[str, Any]]:
        item = self.jobs.get_item(Key={"job_id": job_id}).get("Item")
        return item

    def update_job_status(
        self,
        *,
        job_id: str,
        status: str,
        attempt_count: Optional[int] = None,
        last_error: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
    ) -> None:
        expr_parts = ["#s = :s", "updated_at = :u"]
        expr_values: Dict[str, Any] = {":s": status, ":u": _utc_now_iso()}
        expr_attr_names: Dict[str, str] = {"#s": "status"}

        if attempt_count is not None:
            expr_parts.append("attempt_count = :ac")
            expr_values[":ac"] = attempt_count
        if last_error is not None:
            expr_parts.append("last_error = :le")
            expr_values[":le"] = last_error
        if result is not None:
            expr_parts.append("result = :r")
            expr_values[":r"] = result

        self.jobs.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET " + ", ".join(expr_parts),
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_attr_names,
        )

_INMEMORY_STORE = InMemoryRemediationJobStore()


def get_job_store():
    # Local/test default: in-memory to avoid hard dependency on AWS.
    use_dynamo = os.environ.get("AI_REMEDIATION_USE_DYNAMODB", "").strip().lower() in {"1", "true", "yes"}
    if use_dynamo:
        return DynamoDBRemediationJobStore()
    return _INMEMORY_STORE 

