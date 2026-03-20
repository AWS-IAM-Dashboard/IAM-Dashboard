"""
Future Cognito notification scaffold.

This placeholder handler is reserved for later welcome-email and password-reset
notification work once Cognito resources are managed in Terraform.
"""

import json
import logging
from typing import Any


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Log the received event so future Cognito notification work has a stable entrypoint."""
    logger.info("Received Cognito notification event scaffold: %s", json.dumps(event))
    return {"statusCode": 200, "body": json.dumps({"message": "Cognito notification scaffold only"})}
