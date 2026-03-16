"""
Metrics endpoint — exposes Prometheus-format app metrics.
Tracks per-endpoint request counts and latency.
"""

import time
from flask import g, request, make_response
from flask_restful import Resource
from prometheus_client import (
    Counter,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY,
)

# Metric definitions (module-level singletons)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP request count",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

# Request hooks — attach to the Flask app via register_metrics_hooks()

def _before_request():
    """Store request start time on Flask's g object."""
    g._metrics_start = time.perf_counter()


def _after_request(response):
    """Record count and latency after each request."""
    start = getattr(g, "_metrics_start", None)
    if start is not None:
        latency = time.perf_counter() - start
        endpoint = request.endpoint or "unknown"
        REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(latency)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
        ).inc()
    return response


def register_metrics_hooks(app):
    """Register before/after request hooks on the Flask app."""
    app.before_request(_before_request)
    app.after_request(_after_request)


# ---------------------------------------------------------------------------
# Resource — uses make_response so Flask-RESTful passes the response through
# as-is without attempting JSON serialization of the Prometheus text output
# ---------------------------------------------------------------------------

class MetricsResource(Resource):
    """Expose Prometheus metrics at /api/v1/metrics."""

    def get(self):
        """Return all collected metrics in Prometheus text exposition format."""
        response = make_response(generate_latest(REGISTRY), 200)
        response.mimetype = CONTENT_TYPE_LATEST
        return response
