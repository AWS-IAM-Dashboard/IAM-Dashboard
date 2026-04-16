"""
Frontend telemetry ingestion endpoint.
Accepts allowlisted frontend events and updates Prometheus metrics.
"""

from flask import request
from flask_restful import Resource
from prometheus_client import Counter, Histogram


FRONTEND_PAGE_LOAD_SECONDS = Histogram(
    "frontend_page_load_seconds",
    "Frontend page load time from navigation start to first meaningful render",
    ["page"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 12.0],
)

FRONTEND_SCANS_TRIGGERED_TOTAL = Counter(
    "frontend_scans_triggered_total",
    "Total successful frontend scan triggers",
    ["scanner_type", "environment"],
)

FRONTEND_JS_ERRORS_TOTAL = Counter(
    "frontend_js_errors_total",
    "Total unhandled frontend JavaScript errors",
    ["page", "error_type"],
)

ALLOWED_METRICS = {
    "frontend_page_load_seconds": {
        "type": "histogram",
        "labels": {
            "page": {"landing", "login", "dashboard"},
        },
    },
    "frontend_scans_triggered_total": {
        "type": "counter",
        "labels": {
            "scanner_type": {
                "iam",
                "full",
                "s3",
                "ec2",
                "security-hub",
                "guardduty",
                "config",
                "inspector",
                "macie",
            },
            "environment": {"dev", "prod"},
        },
    },
    "frontend_js_errors_total": {
        "type": "counter",
        "labels": {
            "page": {"landing", "login", "dashboard", "unknown"},
            "error_type": {"runtime", "promise_rejection", "render_error", "network"},
        },
    },
}


def _is_positive_number(value):
    return isinstance(value, (int, float)) and value > 0


def _validate_labels(metric_name, labels):
    if not isinstance(labels, dict):
        return False, "labels must be an object"

    spec_labels = ALLOWED_METRICS[metric_name]["labels"]
    received_keys = set(labels.keys())
    required_keys = set(spec_labels.keys())

    if received_keys != required_keys:
        return (
            False,
            f"labels must include exactly: {sorted(required_keys)}",
        )

    for key, allowed_values in spec_labels.items():
        value = labels.get(key)
        if value not in allowed_values:
            return False, f"invalid label value for '{key}': '{value}'"

    return True, None


def _record_metric(metric_name, labels, value):
    if metric_name == "frontend_page_load_seconds":
        FRONTEND_PAGE_LOAD_SECONDS.labels(**labels).observe(value)
        return

    if metric_name == "frontend_scans_triggered_total":
        increment = value if _is_positive_number(value) else 1
        FRONTEND_SCANS_TRIGGERED_TOTAL.labels(**labels).inc(increment)
        return

    if metric_name == "frontend_js_errors_total":
        increment = value if _is_positive_number(value) else 1
        FRONTEND_JS_ERRORS_TOTAL.labels(**labels).inc(increment)


class TelemetryResource(Resource):
    """Accept frontend telemetry events and map to Prometheus metrics."""

    def post(self):
        payload = request.get_json(silent=True) or {}
        metric_name = payload.get("metric")
        labels = payload.get("labels")
        value = payload.get("value")

        if metric_name not in ALLOWED_METRICS:
            return {
                "error": "invalid_metric",
                "message": "metric must be an allowlisted telemetry metric",
            }, 400

        labels_valid, labels_error = _validate_labels(metric_name, labels)
        if not labels_valid:
            return {"error": "invalid_labels", "message": labels_error}, 400

        metric_type = ALLOWED_METRICS[metric_name]["type"]
        if metric_type == "histogram" and not _is_positive_number(value):
            return {
                "error": "invalid_value",
                "message": "value must be a positive number for histogram metrics",
            }, 400

        _record_metric(metric_name, labels, value)

        return {"status": "accepted", "metric": metric_name}, 202
