from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

import boto3
from flask import request
from flask_restful import Resource

from services.ai.remediation.controller import generate_remediation
from services.ai.remediation.job_store import get_job_store


logger = logging.getLogger(__name__)


def _get_idempotency_key(payload: Dict[str, Any]) -> Optional[str]:
    # Prefer header per AI remediation pipeline doc.
    header_key = request.headers.get("Idempotency-Key")
    if isinstance(header_key, str) and header_key.strip():
        return header_key.strip()

    # Fallback for development clients.
    body_key = payload.get("idempotency_key")
    if isinstance(body_key, str) and body_key.strip():
        return body_key.strip()

    return None


class RemediationResource(Resource):
    """
    POST /remediation
    - Returns 202 with remediation_job_id immediately.
    """

    def post(self):
        ai2_input_raw = request.get_json(silent=True) or {}
        if not isinstance(ai2_input_raw, dict) or not ai2_input_raw:
            return {"error": "Invalid request body. Expected AI-2 input schema JSON."}, 400

        idempotency_key = _get_idempotency_key(ai2_input_raw)
        if not idempotency_key:
            return {"error": "Missing Idempotency-Key header."}, 400

        store = get_job_store()
        try:
            job_id, is_new = store.create_job_if_not_exists(
                idempotency_key=idempotency_key,
                ai2_input_raw=ai2_input_raw,
            )
        except Exception as e:
            logger.exception("Failed to create remediation job")
            return {"error": "Failed to create remediation job", "message": str(e)[:2000]}, 500

        # Async path: enqueue message to SQS if configured.
        queue_url = os.environ.get("REMEDIATION_SQS_QUEUE_URL") or ""
        if queue_url and is_new:
            try:
                sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "us-east-1"))
                sqs.send_message(
                    QueueUrl=queue_url,
                    MessageBody=json.dumps({"job_id": job_id}),
                )
            except Exception as e:
                logger.exception(f"Failed to enqueue remediation job to SQS for job_id={job_id}: {str(e)}")
                # If enqueue fails, mark job as failed so the UI doesn't wait forever.
                store.update_job_status(
                    job_id=job_id,
                    status="failed",
                    last_error="SQS_ENQUEUE_FAILED",
                    result=None,
                )
                return {"error": "Failed to enqueue remediation job."}, 500
        else:
            # Local/dev fallback: if no queue is configured, process immediately.
            # Still returns the job_id (async contract), but completes within the request.
            if is_new:
                try:
                    result = generate_remediation(ai2_input_raw)
                    store.update_job_status(
                        job_id=job_id,
                        status="blocked" if result.get("blocked") else "completed",
                        last_error=None,
                        result=result,
                    )
                except Exception as e:
                    store.update_job_status(
                        job_id=job_id,
                        status="failed",
                        last_error=str(e)[:2000],
                        result=None,
                    )

        return {"remediation_job_id": job_id}, 202


class RemediationJobResource(Resource):
    """
    GET /remediation/{job_id}
    - Returns job status and (when ready) the AI-3 remediation response.
    """

    def get(self, job_id: str):
        store = get_job_store()
        job = store.get_job(job_id=job_id)
        if not job:
            return {"error": "Not found", "job_id": job_id}, 404

        payload: Dict[str, Any] = {"status": job.get("status", "unknown")}
        if job.get("result") is not None:
            payload["result"] = job.get("result")
        return payload, 200

