"""
SES notification Lambda for scan-result emails.

This function is intended to be invoked with an S3-style event payload that
points at a single scan-result JSON object already stored in S3.
"""

import json
import logging
import os
from numbers import Number
from typing import Any
from urllib.parse import unquote_plus

import boto3


logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
ses_client = boto3.client("ses")

SES_FROM_EMAIL = os.environ.get("SES_FROM_EMAIL", "")
SCAN_ALERT_RECIPIENTS = os.environ.get("SCAN_ALERT_RECIPIENTS", "")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "")
SES_SUBJECT_PREFIX = os.environ.get("SES_SUBJECT_PREFIX", "IAM Dashboard")


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

    # Only count numeric severities so the Lambda remains tolerant of future
    # metadata fields that may appear in the summary object.
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
    """Build the SES notification body from parsed scan values."""
    scan_summary_json = json.dumps(parsed_values["scan_summary"])

    return (
        f"scan_summary: {scan_summary_json}\n"
        f"A {parsed_values['scanner_type']} scan was ran in your account "
        f"AccountID:{parsed_values['account_id']} at {parsed_values['timestamp']}. "
        f"A total of {parsed_values['total_findings']} vulnerabilities were found. "
        f"Check the results in {s3_bucket_name}."
    )


def parse_s3_event_record(record: dict[str, Any]) -> tuple[str, str]:
    """Extract the exact bucket/key pair that triggered the event."""
    s3_info = record.get("s3", {})
    bucket_name = s3_info.get("bucket", {}).get("name")
    object_key = s3_info.get("object", {}).get("key")

    if not bucket_name or not object_key:
        raise ValueError("S3 event record is missing bucket name or object key")

    decoded_key = unquote_plus(object_key)
    if not decoded_key.endswith(".json"):
        raise ValueError(f"Ignoring non-JSON object key: {decoded_key}")

    return bucket_name, decoded_key


def load_scan_document(bucket_name: str, object_key: str) -> dict[str, Any]:
    """Read the exact S3 object referenced by the event and parse its JSON body."""
    response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
    payload = response["Body"].read().decode("utf-8")
    document = json.loads(payload)

    if not isinstance(document, dict):
        raise ValueError("Scan result JSON must decode to an object")

    return document


def send_notification(subject: str, body: str) -> None:
    """Send the notification email through SES."""
    recipients = [email.strip() for email in SCAN_ALERT_RECIPIENTS.split(",") if email.strip()]
    if not SES_FROM_EMAIL or not recipients:
        raise ValueError("SES_FROM_EMAIL and SCAN_ALERT_RECIPIENTS must be configured")

    ses_client.send_email(
        Source=SES_FROM_EMAIL,
        Destination={"ToAddresses": recipients},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
        },
    )


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle an S3-style event payload and send a concise SES notification."""
    records = event.get("Records", [])
    if not records:
        logger.error("Received event without Records: %s", json.dumps(event))
        return {"statusCode": 400, "body": json.dumps({"error": "No S3 records supplied"})}

    processed = 0
    skipped = 0

    for record in records:
        try:
            bucket_name, object_key = parse_s3_event_record(record)
        except ValueError as exc:
            logger.warning("Skipping record: %s", exc)
            skipped += 1
            continue

        try:
            scan_document = load_scan_document(bucket_name, object_key)
            parsed_values = extract_scan_values(scan_document)
            email_body = build_email_body(parsed_values, S3_BUCKET_NAME or bucket_name)
            subject = f"{SES_SUBJECT_PREFIX}: {parsed_values['scanner_type']} scan notification"
            send_notification(subject, email_body)
            logger.info("Sent scan notification for s3://%s/%s", bucket_name, object_key)
            processed += 1
        except Exception as exc:
            logger.exception("Failed to process S3 notification for s3://%s/%s", bucket_name, object_key)
            raise

    return {
        "statusCode": 200,
        "body": json.dumps({"processed_records": processed, "skipped_records": skipped}),
    }
