"""
Scan history API endpoint for scanner performance dashboards.
"""

import logging
import os
from datetime import datetime

import psycopg2
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from flask_restful import Resource, reqparse
from werkzeug.exceptions import InternalServerError

from services.dynamodb_service import DynamoDBService

logger = logging.getLogger(__name__)


class ScanHistoryResource(Resource):
    """Returns recent scan records for dashboarding."""

    def __init__(self):
        self.dynamodb_service = DynamoDBService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument("limit", type=int, default=100, location="args")
        self.parser.add_argument("scanner_type", type=str, required=False, location="args")
        self.parser.add_argument("status", type=str, required=False, location="args")

    def get(self):
        """Get scan history records from DynamoDB with PostgreSQL fallback."""
        args = self.parser.parse_args()
        limit = max(1, min(args.get("limit", 100), 500))
        scanner_type_filter = args.get("scanner_type")
        status_filter = args.get("status")

        try:
            # Fetch all records, filter in Python, then slice so totals are accurate.
            raw_records = self.dynamodb_service.list_scan_records(limit=None)
            normalized = [self._normalize_record(item) for item in raw_records]

            if scanner_type_filter:
                normalized = [r for r in normalized if r["scanner_type"] == scanner_type_filter]
            if status_filter:
                normalized = [r for r in normalized if r["status"] == status_filter]

            normalized.sort(key=lambda r: r["timestamp"], reverse=True)

            return {"items": normalized[:limit], "total": len(normalized)}, 200

        except (NoCredentialsError, ClientError, BotoCoreError) as error:
            logger.warning("AWS unavailable, trying PostgreSQL: %s", str(error))
            return self._get_from_postgres(limit, scanner_type_filter, status_filter)

        except Exception as error:
            logger.error("Unexpected error in scan history: %s", str(error), exc_info=True)
            raise InternalServerError("Unexpected error fetching scan history.") from error

    def _get_from_postgres(self, limit, scanner_type_filter=None, status_filter=None):
        """Fallback to PostgreSQL for scan history."""
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            logger.error("DATABASE_URL not set; cannot fall back to PostgreSQL.")
            raise InternalServerError("Database unavailable.")

        try:
            with psycopg2.connect(dsn) as conn:
                with conn.cursor() as cur:
                    conditions = []
                    params = []

                    if scanner_type_filter:
                        conditions.append("scanner_type = %s")
                        params.append(scanner_type_filter)
                    if status_filter:
                        conditions.append("status = %s")
                        params.append(status_filter)

                    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

                    cur.execute(f"SELECT COUNT(*) FROM scan_history {where_clause}", params)
                    total = cur.fetchone()[0]

                    cur.execute(
                        f"""SELECT scan_id, scanner_type, status,
                                   timestamp::text, started_at::text,
                                   completed_at::text, duration_sec
                            FROM scan_history
                            {where_clause}
                            ORDER BY timestamp DESC
                            LIMIT %s""",
                        params + [limit],
                    )
                    rows = cur.fetchall()

            cols = [
                "scan_id",
                "scanner_type",
                "status",
                "timestamp",
                "started_at",
                "completed_at",
                "duration_sec",
            ]
            items = [dict(zip(cols, row, strict=True)) for row in rows]
            return {"items": items, "total": total}, 200

        except Exception as db_error:
            logger.error("PostgreSQL fallback failed: %s", str(db_error), exc_info=True)
            raise InternalServerError("Database fallback failed.") from db_error

    def _normalize_record(self, item):
        """Normalize scan record shape for dashboard consumption."""
        scanner_type = item.get("scanner_type") or item.get("scan_type", "")

        timestamp = item.get("timestamp") or datetime.utcnow().isoformat()
        results = item.get("results") if isinstance(item.get("results"), dict) else {}
        started_at = item.get("started_at") or results.get("started_at") or timestamp
        completed_at = item.get("completed_at") or results.get("completed_at") or timestamp
        duration_sec = self._duration_seconds(started_at, completed_at)

        return {
            "scan_id": item.get("scan_id", ""),
            "scanner_type": scanner_type,
            "status": item.get("status") or results.get("status") or "unknown",
            "timestamp": timestamp,
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_sec": duration_sec,
        }

    def _duration_seconds(self, started_at, completed_at):
        """Compute duration in seconds from ISO timestamps."""
        started_dt = self._parse_iso_datetime(started_at)
        completed_dt = self._parse_iso_datetime(completed_at)
        if not started_dt or not completed_dt:
            return 0.0
        return float(max((completed_dt - started_dt).total_seconds(), 0.0))

    def _parse_iso_datetime(self, value):
        """Best-effort parser for ISO timestamp strings."""
        if not isinstance(value, str) or not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

