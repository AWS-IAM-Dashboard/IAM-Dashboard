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
OPERATIONAL_SCANS = {"iam", "ec2", "s3"}
NON_OPERATIONAL_SCANS = {"config", "guardduty", "inspector", "security-hub"}


def get_scan_type(scan_document: dict[str, Any]) -> str:
    """Read and validate the top-level scanner type."""
    scanner_type = scan_document.get("scanner_type")
    if not isinstance(scanner_type, str) or not scanner_type.strip():
        raise ValueError("Scan result JSON is missing top-level scanner_type")

    return scanner_type


def extract_scan_values(scan_document: dict[str, Any]) -> dict[str, Any]:
    """Extract and validate the fields required by the SES notification body."""
    scanner_type = get_scan_type(scan_document)
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


def extract_full_scan_values(scan_document: dict[str, Any]) -> dict[str, Any]:
    """Extract and merge scan-summary values from nested operational full-scan results."""
    scanner_type = get_scan_type(scan_document)
    region = scan_document.get("region")
    timestamp = scan_document.get("timestamp")
    results = scan_document.get("results")

    if scanner_type != "full":
        raise ValueError("Full-scan extractor received a non-full scan document")

    if not region or not timestamp or not isinstance(results, dict):
        raise ValueError("Full scan JSON is missing required top-level fields")

    successful_scanners = results.get("successful_scanners")
    if successful_scanners is not None and not isinstance(successful_scanners, list):
        raise ValueError("Full scan JSON has an invalid results.successful_scanners value")

    merged_summary = {
        "critical_findings": 0,
        "high_findings": 0,
        "medium_findings": 0,
        "low_findings": 0,
    }
    account_id: str | None = None
    processed_operational_sections = 0

    nested_scan_types = successful_scanners if isinstance(successful_scanners, list) else list(OPERATIONAL_SCANS)
    for nested_scan_type in nested_scan_types:
        if nested_scan_type not in OPERATIONAL_SCANS:
            continue

        nested_results = results.get(nested_scan_type)
        if not isinstance(nested_results, dict):
            continue

        nested_summary = nested_results.get("scan_summary")
        if not isinstance(nested_summary, dict):
            continue

        if account_id is None:
            nested_account_id = nested_results.get("account_id")
            if isinstance(nested_account_id, str) and nested_account_id:
                account_id = nested_account_id

        for key in merged_summary:
            value = nested_summary.get(key)
            if isinstance(value, Number):
                merged_summary[key] += value

        processed_operational_sections += 1

    if processed_operational_sections == 0:
        raise ValueError("Full scan JSON does not contain any nested operational scan_summary data")

    if not account_id:
        raise ValueError("Full scan JSON does not contain an account_id in nested operational results")

    total_findings = sum(value for value in merged_summary.values() if isinstance(value, Number))

    return {
        "scanner_type": scanner_type,
        "region": region,
        "timestamp": timestamp,
        "account_id": account_id,
        "scan_summary": merged_summary,
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


def build_unavailable_scan_message(scan_type: str, timestamp: str) -> str:
    """Build the fallback body for non-operational scans that lack extractable findings."""
    return (
        f"A {scan_type} scan was ran in your account at {timestamp}. "
        "The resource is currently not enabled so no information could be extracted."
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
            scan_type = get_scan_type(scan_document)
            subject = f"{SES_SUBJECT_PREFIX}: {scan_type} scan notification"

            if scan_type in OPERATIONAL_SCANS:
                parsed_values = extract_scan_values(scan_document)
                email_body = build_email_body(parsed_values, S3_BUCKET_NAME or bucket_name)
            elif scan_type == "full":
                parsed_values = extract_full_scan_values(scan_document)
                email_body = build_email_body(parsed_values, S3_BUCKET_NAME or bucket_name)
            elif scan_type in NON_OPERATIONAL_SCANS:
                timestamp = scan_document.get("timestamp")
                if not isinstance(timestamp, str) or not timestamp:
                    raise ValueError("Scan result JSON is missing top-level timestamp")

                email_body = build_unavailable_scan_message(scan_type, timestamp)
            else:
                raise ValueError(f"Unsupported scanner_type for SES notification: {scan_type}")

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
