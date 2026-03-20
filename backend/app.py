"""
Local HTTP adapter for the production Lambda scanner.

This keeps local scan behavior aligned with infra/lambda/lambda_function.py
while still exposing the local-only observability endpoints expected by Docker,
Prometheus, and Grafana.
"""

from __future__ import annotations

import importlib.util
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, make_response, request
from flask_cors import CORS

from api.grafana import GrafanaResource
from api.health import HealthResource
from api.metrics import MetricsResource, register_metrics_hooks
from api.aws_iam import IAMResource
from api.aws_ec2 import EC2Resource
from api.aws_s3 import S3Resource
from api.aws_security_hub import SecurityHubResource
from api.aws_config import ConfigResource


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

SCAN_ROUTE_PREFIX = "/v1/scan"
LAMBDA_MODULE_PATH = Path(__file__).resolve().parent.parent / "infra" / "lambda" / "lambda_function.py"


def _normalize_resource_response(result: Any) -> Response:
    """Convert existing resource-style return values into plain Flask responses."""
    if isinstance(result, Response):
        return result

    if isinstance(result, tuple):
        body, status_code = result
        return make_response(jsonify(body), status_code)

    return make_response(jsonify(result), 200)


def _lambda_response_to_flask(lambda_response: dict[str, Any]) -> Response:
    """Pass the Lambda's HTTP contract through without reshaping the payload."""
    response = make_response(lambda_response.get("body", ""), lambda_response.get("statusCode", 500))
    for header, value in lambda_response.get("headers", {}).items():
        response.headers[header] = value
    return response


def _build_apigw_event(scanner_type: str) -> dict[str, Any]:
    """Mirror the API Gateway shape that the production Lambda handler expects."""
    raw_body = request.get_data(as_text=True)
    return {
        "httpMethod": request.method,
        "path": f"{SCAN_ROUTE_PREFIX}/{scanner_type}",
        "headers": dict(request.headers),
        "queryStringParameters": request.args.to_dict(flat=True) or None,
        "pathParameters": {"scanner_type": scanner_type},
        "body": raw_body if raw_body else None,
        "isBase64Encoded": False,
        "requestContext": {
            "http": {
                "method": request.method,
                "path": f"{SCAN_ROUTE_PREFIX}/{scanner_type}",
            }
        },
    }


@lru_cache(maxsize=1)
def _load_lambda_module():
    """
    Import the production Lambda module once so local HTTP requests call the same
    handler logic that API Gateway invokes in production.
    """
    os.environ.setdefault("LOCAL_LAMBDA_MODE", "true")
    os.environ.setdefault("LOCAL_DISABLE_PERSISTENCE", "true")

    spec = importlib.util.spec_from_file_location("local_lambda_function", LAMBDA_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load Lambda module from {LAMBDA_MODULE_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def create_app() -> Flask:
    """Create the local adapter application."""
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:3001", "http://localhost:5173"])
    register_metrics_hooks(app)

    @app.post(f"{SCAN_ROUTE_PREFIX}/<scanner_type>")
    def scan(scanner_type: str):
        lambda_module = _load_lambda_module()
        # The Lambda remains the source of truth for scan validation and payload shape,
        # including 400 responses for unsupported scanner types.
        lambda_response = lambda_module.lambda_handler(_build_apigw_event(scanner_type), None)
        return _lambda_response_to_flask(lambda_response)

    @app.get("/v1/health")
    def health():
        return _normalize_resource_response(HealthResource().get())

    @app.get("/v1/metrics")
    def metrics():
        return _normalize_resource_response(MetricsResource().get())

    @app.get("/v1/grafana")
    def grafana():
        return _normalize_resource_response(GrafanaResource().get())

    @app.get("/v1/aws/iam")
    def aws_iam():
        return _normalize_resource_response(IAMResource().get())

    @app.get("/v1/aws/ec2")
    def aws_ec2():
        return _normalize_resource_response(EC2Resource().get())

    @app.get("/v1/aws/s3")
    def aws_s3():
        return _normalize_resource_response(S3Resource().get())

    @app.get("/v1/aws/security-hub")
    def aws_security_hub():
        return _normalize_resource_response(SecurityHubResource().get())

    @app.get("/v1/aws/config")
    def aws_config():
        return _normalize_resource_response(ConfigResource().get())

    @app.errorhandler(404)
    def not_found(_: Exception):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(error: Exception):
        logger.exception("Unhandled adapter error")
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    logger.info("Starting local Lambda adapter on port %s", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
