"""
CSV export for security findings (DynamoDB IAM findings table, PostgreSQL fallback).

Streams UTF-8 CSV in chunks so large exports do not buffer the full result set in RAM.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Optional, Set

from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from flask import Response, jsonify, request, stream_with_context

from services.database_service import DatabaseService, SecurityFinding
from services.dynamodb_service import DynamoDBService

logger = logging.getLogger(__name__)

CSV_COLUMNS = [
    "finding_id",
    "severity",
    "type",
    "resource",
    "timestamp",
    "status",
    "remediation_notes",
]

VALID_SEVERITIES = frozenset({"LOW", "MEDIUM", "HIGH", "CRITICAL"})
VALID_STATUSES = frozenset({"OPEN", "RESOLVED", "SUPPRESSED"})

# Flush StringIO to bytes this often to cap memory while streaming CSV rows.
_CSV_STREAM_FLUSH_ROWS = 256


def _parse_multi_args(name: str) -> List[str]:
    raw = request.args.getlist(name)
    if not raw:
        single = request.args.get(name)
        if single:
            raw = [single]
    out: List[str] = []
    for part in raw:
        for piece in part.split(","):
            s = piece.strip()
            if s:
                out.append(s)
    return out


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value or not str(value).strip():
        return None
    s = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return None


def _norm_severity(value: Any) -> str:
    return str(value or "").strip().upper()


def _dynamo_norm_status(item: Dict[str, Any]) -> str:
    s = str(item.get("status") or "").lower()
    if s in ("resolved", "closed", "complete", "completed"):
        return "RESOLVED"
    if s in ("suppressed", "supress"):
        return "SUPPRESSED"
    return "OPEN"


def _dynamo_row(item: Dict[str, Any]) -> Dict[str, str]:
    rid = str(item.get("resource_id") or "")
    rtype = str(item.get("resource_type") or "")
    resource = f"{rtype}:{rid}" if rtype and rid else (rid or rtype or "")
    ts = str(
        item.get("detected_at")
        or item.get("created_at")
        or item.get("updated_at")
        or ""
    )
    return {
        "finding_id": str(item.get("finding_id") or ""),
        "severity": _norm_severity(item.get("severity")) or "UNKNOWN",
        "type": rtype,
        "resource": resource,
        "timestamp": ts,
        "status": _dynamo_norm_status(item),
        "remediation_notes": str(item.get("recommendation") or item.get("description") or ""),
    }


def _sql_norm_status(f: SecurityFinding) -> str:
    st = str(f.status or "").upper()
    if st == "SUPPRESSED":
        return "SUPPRESSED"
    if f.resolved or st in ("RESOLVED", "CLOSED"):
        return "RESOLVED"
    return "OPEN"


def _sql_row(f: SecurityFinding) -> Dict[str, str]:
    rid = str(f.resource_id or "")
    rtype = str(f.resource_type or "")
    resource = f"{rtype}:{rid}" if rtype and rid else (rid or rtype or "")
    ts = f.created_at.isoformat() if f.created_at else ""
    return {
        "finding_id": str(f.finding_id or ""),
        "severity": _norm_severity(f.severity) or "UNKNOWN",
        "type": rtype,
        "resource": resource,
        "timestamp": ts,
        "status": _sql_norm_status(f),
        "remediation_notes": str(f.description or ""),
    }


def _row_matches_filters(
    row: Dict[str, str],
    severities: Optional[Set[str]],
    statuses: Optional[Set[str]],
    start: Optional[datetime],
    end: Optional[datetime],
) -> bool:
    """Apply export filters to one normalized CSV row (Dynamo path)."""
    if severities and row["severity"] not in severities:
        return False
    if statuses and row["status"] not in statuses:
        return False
    if start or end:
        ts_raw = row.get("timestamp") or ""
        dt: Optional[datetime] = None
        try:
            dt = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
            if dt.tzinfo:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            dt = None
        if dt is None:
            return False
        if start and dt < start:
            return False
        if end and dt > end:
            return False
    return True


def _sanitize_csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    if text[:1] in ("=", "+", "-", "@"):
        return f"'{text}"
    return text


def _iter_csv_bytes(rows: Iterator[Dict[str, str]]) -> Iterator[bytes]:
    """Stream RFC-style CSV rows as UTF-8 chunks (bounded StringIO size)."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    chunk = buf.getvalue()
    buf.seek(0)
    buf.truncate(0)
    yield chunk.encode("utf-8")

    pending = 0
    for r in rows:
        writer.writerow(
            {col: _sanitize_csv_cell(r.get(col)) for col in CSV_COLUMNS}
        )
        pending += 1
        if pending >= _CSV_STREAM_FLUSH_ROWS:
            out = buf.getvalue()
            buf.seek(0)
            buf.truncate(0)
            pending = 0
            if out:
                yield out.encode("utf-8")
    tail = buf.getvalue()
    if tail:
        yield tail.encode("utf-8")


def _sql_export_rows(
    severities: Optional[Set[str]],
    statuses: Optional[Set[str]],
    start: Optional[datetime],
    end: Optional[datetime],
) -> Iterator[Dict[str, str]]:
    """Stream SQL rows (filters applied in the database)."""
    db = DatabaseService()
    for finding in db.iter_security_findings_for_export(
        severities=severities,
        start=start,
        end=end,
        statuses=statuses,
    ):
        yield _sql_row(finding)


def _export_csv_response(row_source: Iterator[Dict[str, str]]) -> Response:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"iam_findings_{ts}.csv"
    return Response(
        stream_with_context(_iter_csv_bytes(row_source)),
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


def export_findings_csv():
    """GET /api/findings/export/csv — streamed CSV of IAM/security findings."""
    severities_in = _parse_multi_args("severity")
    statuses_in = _parse_multi_args("status")
    raw_start = request.args.get("start_date")
    raw_end = request.args.get("end_date")
    start = _parse_iso_datetime(raw_start)
    end = _parse_iso_datetime(raw_end)

    if raw_start is not None and str(raw_start).strip() and start is None:
        return (
            jsonify(
                {
                    "error": "invalid_parameter",
                    "message": "start_date could not be parsed as an ISO 8601 datetime.",
                }
            ),
            400,
        )
    if raw_end is not None and str(raw_end).strip() and end is None:
        return (
            jsonify(
                {
                    "error": "invalid_parameter",
                    "message": "end_date could not be parsed as an ISO 8601 datetime.",
                }
            ),
            400,
        )

    if severities_in:
        invalid = [s for s in severities_in if s.upper() not in VALID_SEVERITIES]
        if invalid:
            return (
                jsonify(
                    {
                        "error": "invalid_parameter",
                        "message": "One or more severity values are not allowed.",
                        "invalid": invalid,
                        "allowed": sorted(VALID_SEVERITIES),
                    }
                ),
                400,
            )
    if statuses_in:
        invalid = [s for s in statuses_in if s.upper() not in VALID_STATUSES]
        if invalid:
            return (
                jsonify(
                    {
                        "error": "invalid_parameter",
                        "message": "One or more status values are not allowed.",
                        "invalid": invalid,
                        "allowed": sorted(VALID_STATUSES),
                    }
                ),
                400,
            )

    severities: Optional[Set[str]] = None
    if severities_in:
        severities = {s.upper() for s in severities_in}

    statuses: Optional[Set[str]] = None
    if statuses_in:
        statuses = {s.upper() for s in statuses_in}

    try:
        dynamo = DynamoDBService()
        # Touch first scan page so misconfig / AWS errors return JSON before streaming.
        page_it = dynamo.iter_iam_findings_pages()
        first_page = next(page_it, None)

        def dynamo_rows() -> Iterator[Dict[str, str]]:
            def _pages():
                if first_page is not None:
                    yield first_page
                yield from page_it

            for page in _pages():
                for item in page:
                    row = _dynamo_row(item)
                    if _row_matches_filters(row, severities, statuses, start, end):
                        yield row

        return _export_csv_response(dynamo_rows())

    except (NoCredentialsError, ClientError, BotoCoreError) as e:
        logger.warning("DynamoDB findings export unavailable, using SQL: %s", e)
        try:
            return _export_csv_response(
                _sql_export_rows(severities, statuses, start, end)
            )
        except Exception as db_e:
            logger.error("PostgreSQL findings export failed: %s", db_e, exc_info=True)
            return (
                jsonify(
                    {
                        "error": "export_failed",
                        "message": "Export temporarily unavailable (both data sources failed).",
                    }
                ),
                500,
            )
    except Exception as e:
        logger.error("Unexpected error loading DynamoDB findings: %s", e, exc_info=True)
        try:
            return _export_csv_response(
                _sql_export_rows(severities, statuses, start, end)
            )
        except Exception as db_e:
            logger.error("PostgreSQL findings export failed: %s", db_e, exc_info=True)
            return (
                jsonify(
                    {
                        "error": "export_failed",
                        "message": "Export temporarily unavailable (both data sources failed).",
                    }
                ),
                500,
            )
