"""
Scan history API endpoint for scanner performance dashboards.
"""

from datetime import datetime
import logging

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
        """Get scan history records from DynamoDB."""
        try:
            args = self.parser.parse_args()
            limit = max(1, min(args.get("limit", 100), 500))
            scanner_type_filter = args.get("scanner_type")
            status_filter = args.get("status")

            raw_records = self.dynamodb_service.list_scan_records(limit=limit)
            normalized = [self._normalize_record(item) for item in raw_records]

            if scanner_type_filter:
                normalized = [
                    row for row in normalized if row["scanner_type"] == scanner_type_filter
                ]
            if status_filter:
                normalized = [row for row in normalized if row["status"] == status_filter]

            normalized.sort(key=lambda row: row["timestamp"], reverse=True)

            return {"items": normalized[:limit], "total": len(normalized)}, 200
        except (NoCredentialsError, ClientError, BotoCoreError) as error:
            logger.warning(
                "Scan history AWS dependency unavailable, returning empty result: %s",
                str(error),
            )
            return {"items": [], "total": 0}, 200
        except Exception as error:
            logger.error("Failed to fetch scan history: %s", str(error), exc_info=True)
            return {"items": [], "total": 0}, 200

    def _normalize_record(self, item):
        """
        Normalize scan record shape for dashboard consumption.
        """
        timestamp = item.get("timestamp") or datetime.utcnow().isoformat()
        results = item.get("results") if isinstance(item.get("results"), dict) else {}

        started_at = (
            item.get("started_at")
            or results.get("started_at")
            or timestamp
        )
        completed_at = (
            item.get("completed_at")
            or results.get("completed_at")
            or timestamp
        )

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
        delta = (completed_dt - started_dt).total_seconds()
        return float(max(delta, 0.0))

    def _parse_iso_datetime(self, value):
        """Best-effort parser for ISO timestamp strings."""
        if not isinstance(value, str) or not value:
            return None
        parsed = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(parsed)
        except ValueError:
            return None
