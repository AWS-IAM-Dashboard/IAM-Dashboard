import json
import os
import logging
import boto3
import time
from datetime import datetime, timezone
from http import cookies
from typing import Dict, Any, Optional
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
sts = boto3.client("sts")

ACCOUNTS_TABLE_NAME = os.environ.get("ACCOUNTS_TABLE_NAME", "iam-dashboard-accounts-test")
SESSION_TABLE_NAME = os.environ.get("SESSION_TABLE_NAME", "iam-dashboard-auth-sessions-test")
COOKIE_NAME = "iamdash_session"
CROSS_ACCOUNT_ROLE_NAME = os.environ.get("CROSS_ACCOUNT_ROLE_NAME", "iam-dashboard-scan-role")


class UnauthorizedError(Exception):
    """Raised when the request does not have a valid authenticated session."""

class SessionStoreError(Exception):
    """Raised when session storage cannot be read safely."""

class ForbiddenError(Exception):
    """Raised when the authenticated session lacks required groups."""


def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Format a response for API Gateway with the given status code and body."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def parse_request_cookies(event: Dict[str, Any]) -> Dict[str, str]:
    """Extract cookies from the event supporting both HTTP API and header-based formats."""
    parsed: Dict[str, str] = {}

    for raw_cookie in event.get("cookies") or []:
        morsel = cookies.SimpleCookie()
        try:
            morsel.load(raw_cookie)
        except cookies.CookieError:
            continue
        for key, value in morsel.items():
            parsed[key] = value.value

    headers = event.get("headers") or {}
    cookie_header = headers.get("cookie") or headers.get("Cookie")
    if cookie_header:
        morsel = cookies.SimpleCookie()
        try:
            morsel.load(cookie_header)
        except cookies.CookieError:
            return parsed
        for key, value in morsel.items():
            parsed[key] = value.value

    return parsed


def get_session_table():
    """Return the DynamoDB session table."""
    return dynamodb.Table(SESSION_TABLE_NAME)  # type: ignore


def get_accounts_table():
    """Return the DynamoDB accounts table."""
    return dynamodb.Table(ACCOUNTS_TABLE_NAME)  # type: ignore


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve session from DynamoDB; return None if expired or missing."""
    try:
        result = get_session_table().get_item(Key={"session_id": session_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to read session")
        raise SessionStoreError("Unable to process request.") from exc

    item = result.get("Item")
    if not item:
        return None

    try:
        expires_at = int(item.get("expires_at", 0))
    except (TypeError, ValueError):
        expires_at = 0

    if expires_at <= int(time.time()):
        return None

    return item


def get_request_session(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract session from request cookies."""
    request_cookies = parse_request_cookies(event)
    session_id = request_cookies.get(COOKIE_NAME)
    if not session_id:
        return None
    return get_session(session_id)


def require_authenticated_session(event: Dict[str, Any]) -> Dict[str, Any]:
    """Enforce valid session; raise UnauthorizedError if missing or expired."""
    session = get_request_session(event)
    if not session:
        raise UnauthorizedError("Authentication required.")
    return session

def normalize_groups(groups: Any) -> list[str]:
    """Normalize session groups into a list of strings."""
    if isinstance(groups, str):
        groups = [groups]
    if not isinstance(groups, list):
        return []
    return [str(group) for group in groups if str(group).strip()]

def require_admin(session: Dict[str, Any]) -> None:
    """Require that the authenticated session belongs to the admin group."""
    groups = set(normalize_groups(session.get("groups")))
    if "admin" not in groups:
        raise ForbiddenError("Forbidden.")


def handle_post_accounts(event: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new AWS account after validating the request and role existence."""
    session = require_authenticated_session(event)
    require_admin(session)

    try:
        body = json.loads(event.get("body", "{}")) if event.get("body") else {}
    except json.JSONDecodeError:
        return create_response(400, {"error": "Invalid JSON body"})

    account_id = body.get("account_id")
    account_name = body.get("account_name")

    if account_id is not None:
        account_id = str(account_id).strip()
    if account_name is not None:
        account_name = str(account_name).strip()

    if not account_id or not account_name:
        return create_response(400, {"error": "account_id and account_name are required"})

    accounts_table = get_accounts_table()

    try:
        existing = accounts_table.get_item(Key={"account_id": account_id})
        if existing.get("Item"):
            return create_response(409, {"error": f"Account {account_id} is already registered"})
    except (ClientError, BotoCoreError):
        logger.exception("Failed checking existing account")
        return create_response(500, {"error": "Failed to register account"})

    role_arn = f"arn:aws:iam::{account_id}:role/{CROSS_ACCOUNT_ROLE_NAME}"

    try:
        sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=f"AccountRegistration-{account_id}"
        )
    except ClientError:
        logger.exception("AssumeRole failed for account %s", account_id)
        return create_response(
            403,
            {
                "error": f"Cannot assume role in account {account_id} — verify {CROSS_ACCOUNT_ROLE_NAME} exists and trusts this account"
            }
        )

    username = (
        session.get("username")
        or session.get("user")
        or session.get("email")
        or "unknown"
    )

    item = {
        "account_id": account_id,
        "account_name": account_name,
        "date_added": datetime.now(timezone.utc).isoformat(),
        "added_by": username
    }

    try:
        accounts_table.put_item(Item=item)
    except (ClientError, BotoCoreError):
        logger.exception("Failed writing account to DynamoDB")
        return create_response(500, {"error": "Failed to register account"})

    return create_response(201, {"message": "Account registered successfully"})

def handle_get_accounts(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all registered accounts; always include the main account."""
    require_authenticated_session(event)
    accounts_table = get_accounts_table()
    
    # Always get the main account ID
    main_account_id = None
    try:
        identity = sts.get_caller_identity()
        main_account_id = identity.get("Account", "unknown")
    except (ClientError, BotoCoreError):
        logger.exception("Failed to get caller identity")
        return create_response(500, {"error": "Failed to retrieve accounts"})
    
    # Build accounts list starting with main account
    accounts = [
        {
            "account_id": main_account_id,
            "account_name": "Main Account"
        }
    ]
    
    # Add registered accounts from DynamoDB, avoiding duplicates
    try:
        items = []
        scan_kwargs = {}
        while True:
            response = accounts_table.scan(**scan_kwargs)
            items.extend(response.get("Items", []))
            last_key = response.get("LastEvaluatedKey")
            if not last_key:
                break
            scan_kwargs["ExclusiveStartKey"] = last_key
        for item in items:
            account_id = item.get("account_id")
            # Skip if it's the main account (already added)
            if account_id != main_account_id:
                accounts.append({
                    "account_id": account_id,
                    "account_name": item.get("account_name")
                })
    except (ClientError, BotoCoreError):
        logger.exception("Failed to retrieve registered accounts")
        return create_response(500, {"error": "Failed to retrieve accounts"})
    
    return create_response(
        200,
        {
            "accounts": accounts,
            "total": len(accounts)
        }
    )

def handle_delete_account(event: Dict[str, Any], account_id: str) -> Dict[str, Any]:
    """Remove a registered account and log the deletion."""
    session = require_authenticated_session(event)
    require_admin(session)
    accounts_table = get_accounts_table()

    try:
        existing = accounts_table.get_item(Key={"account_id": account_id})
        item = existing.get("Item")
        if not item:
            return create_response(404, {"error": f"Account {account_id} not found"})
    except (ClientError, BotoCoreError):
        logger.exception("Failed checking account before delete")
        return create_response(500, {"error": "Failed to remove account"})

    try:
        accounts_table.delete_item(Key={"account_id": account_id})
    except (ClientError, BotoCoreError):
        logger.exception("Failed deleting account")
        return create_response(500, {"error": "Failed to remove account"})

    username = (
        session.get("username")
        or session.get("user")
        or session.get("email")
        or "unknown"
    )

    account_name = item.get("account_name", "unknown")
    timestamp = datetime.now(timezone.utc).isoformat()

    logger.info(
        "User %s deleted account %s (%s) at %s",
        username,
        account_name,
        account_id,
        timestamp
    )

    return create_response(200, {"message": "Account removed successfully"})


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main entry point; route requests to account handlers based on HTTP method and path."""
    try:
        method = event.get("httpMethod")
        if not method:
            method = event.get("requestContext", {}).get("http", {}).get("method", "")

        path = event.get("path")
        if not path:
            path = event.get("requestContext", {}).get("http", {}).get("path", "")

        if method == "POST" and path.endswith("/accounts"):
            return handle_post_accounts(event)
        
        if method == "GET" and path.endswith("/accounts"):
            return handle_get_accounts(event)
        
        if method == "DELETE" and "/accounts/" in path:
            account_id = path.rstrip("/").split("/")[-1]
            return handle_delete_account(event, account_id)

        return create_response(404, {"error": "Route not found"})

    except UnauthorizedError:
        return create_response(401, {"error": "Authentication required"})
    except ForbiddenError:
        return create_response(403, {"error": "Forbidden, you do not have sufficient permissions!"})
    except SessionStoreError:
        return create_response(500, {"error": "Unable to process request"})
    except Exception as exc:
        logger.exception("Unhandled error: %s", str(exc))
        return create_response(500, {"error": "Internal server error"})