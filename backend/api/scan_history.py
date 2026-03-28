"""
Scan history API endpoint for scanner performance dashboards.
"""

from datetime import datetime
import logging
import psycopg2

from flask_restful import Resource, reqparse
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

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
            raw_records = self.dynamodb_service.list_scan_records(limit=limit)
            normalized = [self._normalize_record(item) for item in raw_records]
            if scanner_type_filter:
                normalized = [r for r in normalized if r["scanner_type"] == scanner_type_filter]
            if status_filter:
                normalized = [r for r in normalized if r["status"] == status_filter]
            normalized.sort(key=lambda r: r["timestamp"], reverse=True)
            return {"items": normalized[:limit], "total": len(normalized)}, 200
        except (NoCredentialsError, ClientError, BotoCoreError) as error:
            logger.warning("AWS unavailable, trying PostgreSQL: %s", str(error))
            return self._get_from_postgres(limit)
        except Exception as error:
            logger.error("Failed to fetch scan history: %s", str(error))
            return {"items": [], "total": 0}, 200

    def _get_from_postgres(self, limit):
        """Fallback to PostgreSQL for scan history."""
        try:
            conn = psycopg2.connect("postgresql://postgres:password@db:5432/cybersecurity_db")
            cur = conn.cursor()
            cur.execute(
                "SELECT scan_id, scanner_type, status, timestamp::text, started_at::text, completed_at::text, duration_sec FROM scan_history ORDER BY timestamp DESC LIMIT %s",
                (limit,)
            )
            rows = cur.fetchall()
            conn.close()
            cols = ["scan_id", "scanner_type", "status", "timestamp", "started_at", "completed_at", "duration_sec"]
            items = [dict(zip(cols, row)) for row in rows]
            return {"items": items, "total": len(items)}, 200
        except Exception as db_error:
            logger.warning("PostgreSQL fallback failed: %s", str(db_error))
            return {"items": [], "total": 0}, 200

    def _normalize_record(self, item):
        """Normalize scan record shape for dashboard consumption."""
        timestamp = item.get("timestamp") or datetime.utcnow().isoformat()
        results = item.get("results") if isinstance(item.get("results"), dict) else {}
        started_at = item.get("started_at") or results.get("started_at") or timestamp
        completed_at = item.get("completed_at") or results.get("completed_at") or timestamp
        duration_sec = self._duration_seconds(started_at, completed_at)
        return {
            "scan_id": item.get("scan_id", ""),
            "scanner_type": item.get("scanner_type", ""),
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
