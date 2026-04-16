"""
Data retention: DynamoDB age-based deletes + PostgreSQL cleanup.

Optional HTTP trigger (POST) when RETENTION_RUN_KEY is set.
"""

import hmac
import logging
import os

from flask import request
from flask_restful import Resource

from services.database_service import DatabaseService
from services.dynamodb_service import DynamoDBService

logger = logging.getLogger(__name__)


def run_retention_pass(days: int = 90) -> dict:
    """Run DynamoDB paginated deletes and PostgreSQL cleanup."""
    dynamo = DynamoDBService()
    db = DatabaseService()
    scan_deleted = dynamo.delete_old_records(dynamo.scan_results_table, days)
    findings_deleted = dynamo.delete_old_records(dynamo.iam_findings_table, days)
    sql_counts = db.cleanup_old_records(days)
    result = {
        "dynamo_scan_results_deleted": scan_deleted,
        "dynamo_iam_findings_deleted": findings_deleted,
        "postgres": sql_counts,
    }
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
        try:
            days = int(request.args.get("days", "90"))
            if days < 1 or days > 3650:
                days = 90
        except ValueError:
            days = 90
        try:
            result = run_retention_pass(days=days)
            return result, 200
        except Exception:
            logger.exception("Retention pass failed")
            return {"error": "Retention pass failed"}, 500
