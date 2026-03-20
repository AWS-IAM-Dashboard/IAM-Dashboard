"""
Local SES parsing test helper.

This mirrors the pure parsing and message-construction behavior of lambda_ses.py
without importing boto3 or attempting any AWS calls.
"""

from __future__ import annotations

import argparse
import json
import sys
from numbers import Number
from pathlib import Path
from typing import Any


DEFAULT_SAMPLE_FILE = Path(__file__).resolve().parents[2] / "s3-2026-03-18T14_40_25.394352.json"
DEFAULT_BUCKET_NAME = "iam-dashboard-scan-results"
DEFAULT_SUBJECT_PREFIX = "IAM Dashboard"


def load_scan_document(file_path: Path) -> dict[str, Any]:
    """Load the sample scan-result JSON file directly from disk."""
    if not file_path.exists():
        raise FileNotFoundError(f"Sample scan file not found: {file_path}")

    document = json.loads(file_path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError("Scan result JSON must decode to an object")

    return document


def extract_scan_values(scan_document: dict[str, Any]) -> dict[str, Any]:
    """Extract and validate the fields required by the SES notification body."""
    scanner_type = scan_document.get("scanner_type")
    region = scan_document.get("region")
    timestamp = scan_document.get("timestamp")
    results = scan_document.get("results")

    if not scanner_type or not region or not timestamp or not isinstance(results, dict):
        raise ValueError("Scan result JSON is missing required top-level fields")

    account_id = results.get("account_id")
    scan_summary = results.get("scan_summary")
    if not account_id or not isinstance(scan_summary, dict):
        raise ValueError("Scan result JSON is missing results.account_id or results.scan_summary")

    total_findings = sum(value for value in scan_summary.values() if isinstance(value, Number))

    return {
        "scanner_type": scanner_type,
        "region": region,
        "timestamp": timestamp,
        "account_id": account_id,
        "scan_summary": scan_summary,
        "total_findings": total_findings,
    }


def build_email_body(parsed_values: dict[str, Any], s3_bucket_name: str) -> str:
    """Build the same email body format used by the SES Lambda."""
    scan_summary_json = json.dumps(parsed_values["scan_summary"])

    return (
        f"scan_summary: {scan_summary_json}\n"
        f"A {parsed_values['scanner_type']} scan was ran in your account "
        f"AccountID:{parsed_values['account_id']} at {parsed_values['timestamp']}. "
        f"A total of {parsed_values['total_findings']} vulnerabilities were found. "
        f"Check the results in {s3_bucket_name}."
    )


def build_subject(scanner_type: str, subject_prefix: str) -> str:
    """Build the same subject format used by the SES Lambda."""
    return f"{subject_prefix}: {scanner_type} scan notification"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local SES scan-notification parsing test")
    parser.add_argument(
        "json_file",
        nargs="?",
        default=str(DEFAULT_SAMPLE_FILE),
        help="Path to the scan-result JSON file to inspect",
    )
    parser.add_argument(
        "--bucket-name",
        default=DEFAULT_BUCKET_NAME,
        help="Bucket name placeholder used in the generated email body",
    )
    parser.add_argument(
        "--subject-prefix",
        default=DEFAULT_SUBJECT_PREFIX,
        help="Subject prefix used in the generated email subject",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        scan_document = load_scan_document(Path(args.json_file).resolve())
        parsed_values = extract_scan_values(scan_document)
        subject = build_subject(parsed_values["scanner_type"], args.subject_prefix)
        body = build_email_body(parsed_values, args.bucket_name)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Parsed Values")
    print(f"  scanner_type: {parsed_values['scanner_type']}")
    print(f"  region: {parsed_values['region']}")
    print(f"  timestamp: {parsed_values['timestamp']}")
    print(f"  account_id: {parsed_values['account_id']}")
    print(f"  scan_summary: {json.dumps(parsed_values['scan_summary'])}")
    print(f"  total_findings: {parsed_values['total_findings']}")
    print()
    print("Email Subject")
    print(f"  {subject}")
    print()
    print("Email Body")
    print(f"  {body}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
