from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
import time
import uuid

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

_UNSET = object()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_dynamo_job_id() -> str:
    return f"remediation-{time.time_ns()}-{uuid.uuid4().hex}"


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
        last_error: Any = _UNSET,
        result: Any = _UNSET,
    ) -> None:
        if job_id not in self._jobs:
            logger.warning(f"missing job: {job_id} in update_job_status")
            return
        job = self._jobs[job_id]
        job["status"] = status
        if attempt_count is not None:
            job["attempt_count"] = attempt_count
        if last_error is not _UNSET:
            job["last_error"] = last_error
        if result is not _UNSET:
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
        self.dynamodb_client = self.dynamodb.meta.client
        self._serializer = TypeSerializer()

    def create_job_if_not_exists(
        self,
        *,
        idempotency_key: str,
        ai2_input_raw: Dict[str, Any],
    ) -> Tuple[str, bool]:
        created_at = _utc_now_iso()
        job_id = _generate_dynamo_job_id()

        account_id = None
        try:
            account_id = ai2_input_raw.get("environment_context", {}).get("account_id")
        except Exception:
            account_id = None

        idempotency_item = {
            "idempotency_key": idempotency_key,
            "job_id": job_id,
            "created_at": created_at,
        }
        job_item = {
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

        # Write idempotency + job record atomically so we cannot return a dangling job_id.
        try:
            idem_item_ddb = {k: self._serializer.serialize(v) for k, v in idempotency_item.items()}
            job_item_ddb = {k: self._serializer.serialize(v) for k, v in job_item.items()}
            self.dynamodb_client.transact_write_items(
                TransactItems=[
                    {
                        "Put": {
                            "TableName": self.idempotency_table_name,
                            "Item": idem_item_ddb,
                            "ConditionExpression": "attribute_not_exists(idempotency_key)",
                        }
                    },
                    {
                        "Put": {
                            "TableName": self.jobs_table_name,
                            "Item": job_item_ddb,
                            "ConditionExpression": "attribute_not_exists(job_id)",
                        }
                    },
                ]
            )
            return job_id, True
        except ClientError as e:
            # If idempotency key already exists, this is a replay: return the mapped job_id.
            if e.response.get("Error", {}).get("Code") == "TransactionCanceledException":
                existing = self.idempotency.get_item(Key={"idempotency_key": idempotency_key}).get("Item")
                if existing and existing.get("job_id"):
                    return existing["job_id"], False
            raise

    def get_job(self, *, job_id: str) -> Optional[Dict[str, Any]]:
        item = self.jobs.get_item(Key={"job_id": job_id}).get("Item")
        return item

    def update_job_status(
        self,
        *,
        job_id: str,
        status: str,
        attempt_count: Optional[int] = None,
        last_error: Any = _UNSET,
        result: Any = _UNSET,
    ) -> None:
        expr_parts = ["#s = :s", "updated_at = :u"]
        expr_values: Dict[str, Any] = {":s": status, ":u": _utc_now_iso()}
        expr_attr_names: Dict[str, str] = {"#s": "status"}

        if attempt_count is not None:
            expr_parts.append("attempt_count = :ac")
            expr_values[":ac"] = attempt_count
        if last_error is not _UNSET:
            expr_parts.append("last_error = :le")
            expr_values[":le"] = last_error
        if result is not _UNSET:
            expr_parts.append("result = :r")
            expr_values[":r"] = result

        self.jobs.update_item(
            Key={"job_id": job_id},
            UpdateExpression="SET " + ", ".join(expr_parts),
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_attr_names,
        )

_INMEMORY_STORE = InMemoryRemediationJobStore()
_DYNAMO_STORE = None

def get_job_store():
    global _DYNAMO_STORE
    # Local/test default: in-memory to avoid hard dependency on AWS.
    use_dynamo = os.environ.get("AI_REMEDIATION_USE_DYNAMODB", "").strip().lower() in {"1", "true", "yes"}
    if use_dynamo:
        if _DYNAMO_STORE is None:
            _DYNAMO_STORE = DynamoDBRemediationJobStore()
        return _DYNAMO_STORE
    return _INMEMORY_STORE 

