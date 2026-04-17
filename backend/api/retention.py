"""
Data retention: DynamoDB age-based deletes + PostgreSQL cleanup.

Optional HTTP trigger (POST) when RETENTION_RUN_KEY is set.
"""

import hmac
import logging
import os

from flask import jsonify, request
from flask_restful import Resource

from services.database_service import DatabaseService
from services.dynamodb_service import DynamoDBService

logger = logging.getLogger(__name__)


def run_retention_pass(days: int = 90) -> dict:
    """Run DynamoDB paginated deletes and PostgreSQL cleanup.

    Each backend is isolated: failures in one step do not skip the others.
    On success, values are counts (int or dict for postgres). On failure, the
    same key holds a string error message.
    """
    dynamo = DynamoDBService()
    db = DatabaseService()
    result: dict = {}

    try:
        result["dynamo_scan_results_deleted"] = dynamo.delete_old_records(
            dynamo.scan_results_table, days
        )
    except Exception as exc:
        logger.exception("Retention pass: DynamoDB scan_results cleanup failed")
        result["dynamo_scan_results_deleted"] = str(exc)

    try:
        result["dynamo_iam_findings_deleted"] = dynamo.delete_old_records(
            dynamo.iam_findings_table, days
        )
    except Exception as exc:
        logger.exception("Retention pass: DynamoDB iam_findings cleanup failed")
        result["dynamo_iam_findings_deleted"] = str(exc)

    try:
        result["postgres"] = db.cleanup_old_records(days)
    except Exception as exc:
        logger.exception("Retention pass: PostgreSQL cleanup_old_records failed")
        result["postgres"] = str(exc)

    logger.info("Retention pass complete: %s", result)
    return result


class RetentionCleanupResource(Resource):
    """POST /api/v1/system/retention — on-demand retention (requires RETENTION_RUN_KEY)."""

    def post(self):
        """Run a retention pass when ``X-Retention-Run-Key`` matches ``RETENTION_RUN_KEY``."""
        expected = os.environ.get("RETENTION_RUN_KEY", "").strip()
        if not expected:
            return {
                "error": "disabled",
                "message": "Set RETENTION_RUN_KEY to enable HTTP-triggered retention runs.",
            }, 503
        supplied = request.headers.get("X-Retention-Run-Key", "").strip()
        if not hmac.compare_digest(supplied, expected):
            return {"error": "forbidden"}, 403
        raw_days = request.args.get("days")
        if raw_days is None or not str(raw_days).strip():
            days = 90
        else:
            try:
                days = int(str(raw_days).strip())
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": "invalid_parameter",
                            "message": (
                                "Query parameter 'days' must be an integer between 1 and 3650."
                            ),
                        }
                    ),
                    400,
                )
            if days < 1 or days > 3650:
                return (
                    jsonify(
                        {
                            "error": "invalid_parameter",
                            "message": (
                                "Query parameter 'days' must be between 1 and 3650 inclusive."
                            ),
                        }
                    ),
                    400,
                )
        result = run_retention_pass(days=days)
        return result, 200
