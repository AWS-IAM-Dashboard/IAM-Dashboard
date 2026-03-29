import base64
import json
import logging
import os
import secrets
import time
from http import cookies
from typing import Any
from urllib.parse import urlparse

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError

COGNITO_CLIENT_ID_ENV = "COGNITO_CLIENT_ID"
SESSION_TABLE_NAME_ENV = "SESSION_TABLE_NAME"
SESSION_TTL_SECONDS_ENV = "SESSION_TTL_SECONDS"
ALLOWED_ORIGINS_ENV = "ALLOWED_ORIGINS"
USERNAME_INDEX_NAME = "username-index"

COOKIE_NAME = "iamdash_session"
DEFAULT_SESSION_TTL_SECONDS = 3600
AUTH_FAILURE_CODES = {
    "NotAuthorizedException",
    "UserNotFoundException",
    "PasswordResetRequiredException",
    "UserNotConfirmedException",
}

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

session = boto3.session.Session()
dynamodb = boto3.resource("dynamodb")
cognito = boto3.client("cognito-idp", region_name=session.region_name)


class InvalidRequestError(Exception):
    # Represents malformed or incomplete client input.
    pass


class AuthenticationFailedError(Exception):
    # Represents failed Cognito authentication without exposing internals.
    pass


class SessionStoreError(Exception):
    # Represents DynamoDB-backed session persistence failures.
    pass


class OriginRejectedError(Exception):
    # Represents requests from missing or disallowed browser origins.
    pass


def get_required_env(name: str) -> str:
    # Return a required environment variable or fail fast for misconfiguration.
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_allowed_origins() -> list[str]:
    # Parse the configured browser origin allowlist from a comma-separated env var.
    raw_value = os.getenv(ALLOWED_ORIGINS_ENV, "")
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def get_origin(event: dict[str, Any]) -> str | None:
    # Extract the browser Origin header from the HTTP API event.
    headers = event.get("headers") or {}
    return headers.get("origin") or headers.get("Origin")


def normalize_request_path(event: dict[str, Any], path: str) -> str:
    # Strip a leading API Gateway stage segment when the raw path includes it.
    stage = str(event.get("requestContext", {}).get("stage", "")).strip()
    if not stage or not path.startswith(f"/{stage}/"):
        return path
    return path[len(stage) + 1 :]


def is_origin_allowed(origin: str | None) -> bool:
    # Check whether the provided origin is explicitly allowed.
    return bool(origin and origin in get_allowed_origins())


def require_allowed_origin(origin: str | None) -> None:
    # Enforce an allowed browser origin for state-changing auth routes.
    if not is_origin_allowed(origin):
        raise OriginRejectedError("Unable to process request.")


def should_use_secure_cookie(origin: str | None) -> bool:
    # Localhost development may relax Secure, but non-local origins should keep it.
    if not origin:
        return True

    parsed = urlparse(origin)
    hostname = (parsed.hostname or "").lower()
    if hostname in {"localhost", "127.0.0.1"}:
        return False
    return parsed.scheme == "https"


def build_cors_headers(origin: str | None) -> dict[str, str]:
    # Return CORS headers only for explicitly allowed browser origins.
    headers = {
        "Content-Type": "application/json",
        "Vary": "Origin",
    }

    if is_origin_allowed(origin):
        headers.update(
            {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            }
        )

    return headers


def response(
    status_code: int,
    body: dict[str, Any],
    origin: str | None,
    *,
    cookies_list: list[str] | None = None,
) -> dict[str, Any]:
    # Build an HTTP API v2 Lambda response with optional Set-Cookie values.
    result: dict[str, Any] = {
        "statusCode": status_code,
        "headers": build_cors_headers(origin),
        "body": json.dumps(body),
    }
    if cookies_list:
        result["cookies"] = cookies_list
    return result


def parse_json_body(event: dict[str, Any]) -> dict[str, Any]:
    # Parse a JSON request body and normalize invalid input into one client-safe error.
    body = event.get("body")
    if not body:
        return {}

    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    try:
        parsed = json.loads(body)
    except (TypeError, ValueError) as exc:
        raise InvalidRequestError("Invalid request.") from exc

    if not isinstance(parsed, dict):
        raise InvalidRequestError("Invalid request.")
    return parsed


def parse_request_cookies(event: dict[str, Any]) -> dict[str, str]:
    # Extract request cookies from both HTTP API cookie formats.
    parsed: dict[str, str] = {}

    for raw_cookie in event.get("cookies") or []:
        morsel = cookies.SimpleCookie()
        morsel.load(raw_cookie)
        for key, value in morsel.items():
            parsed[key] = value.value

    headers = event.get("headers") or {}
    cookie_header = headers.get("cookie") or headers.get("Cookie")
    if cookie_header:
        morsel = cookies.SimpleCookie()
        morsel.load(cookie_header)
        for key, value in morsel.items():
            parsed[key] = value.value

    return parsed


def build_session_cookie(session_id: str, max_age: int, secure: bool) -> str:
    # Build the opaque session cookie returned after successful server-side session creation.
    parts = [
        f"{COOKIE_NAME}={session_id}",
        f"Max-Age={max_age}",
        "Path=/",
        "HttpOnly",
        "SameSite=None",
    ]
    if secure:
        parts.append("Secure")
    return "; ".join(parts)


def build_clear_cookie(secure: bool) -> str:
    # Build the cookie-clearing value used for logout and invalid-session cleanup.
    parts = [
        f"{COOKIE_NAME}=",
        "Max-Age=0",
        "Path=/",
        "HttpOnly",
        "SameSite=None",
    ]
    if secure:
        parts.append("Secure")
    return "; ".join(parts)


def decode_jwt_payload(token: str) -> dict[str, Any]:
    # Decode JWT claims locally only to extract identity context after Cognito has authenticated.
    parts = token.split(".")
    if len(parts) != 3:
        raise InvalidRequestError("Unable to process request.")

    try:
        payload = parts[1]
        payload += "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8")
        return json.loads(decoded)
    except (ValueError, json.JSONDecodeError) as exc:
        raise InvalidRequestError("Unable to process request.") from exc


def extract_user_context(claims: dict[str, Any]) -> tuple[str, list[str]]:
    # Pull username and groups from Cognito claims for the session record.
    username = (
        claims.get("cognito:username")
        or claims.get("username")
        or claims.get("preferred_username")
        or claims.get("sub")
    )
    if not username:
        raise InvalidRequestError("Unable to process request.")

    groups = claims.get("cognito:groups") or []
    if isinstance(groups, str):
        groups = [groups]
    if not isinstance(groups, list):
        groups = []

    normalized_groups = [str(group) for group in groups]
    return str(username), normalized_groups


def get_session_table():
    # Resolve the DynamoDB session table from the configured environment.
    table_name = get_required_env(SESSION_TABLE_NAME_ENV)
    return dynamodb.Table(table_name)


def get_session_ttl_seconds() -> int:
    # Read and validate the fixed server-side session TTL.
    raw_value = os.getenv(SESSION_TTL_SECONDS_ENV, str(DEFAULT_SESSION_TTL_SECONDS)).strip()
    try:
        ttl = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{SESSION_TTL_SECONDS_ENV} must be an integer.") from exc
    if ttl <= 0:
        raise RuntimeError(f"{SESSION_TTL_SECONDS_ENV} must be a positive integer.")
    return ttl


def authenticate_with_cognito(username: str, password: str) -> dict[str, Any]:
    # Authenticate directly with Cognito and normalize auth failures separately from backend errors.
    try:
        return cognito.initiate_auth(
            ClientId=get_required_env(COGNITO_CLIENT_ID_ENV),
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password,
            },
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        if error_code in AUTH_FAILURE_CODES:
            logger.info("Cognito authentication failed for username=%s code=%s", username, error_code)
            raise AuthenticationFailedError("Authentication failed.") from exc
        logger.exception("Unexpected Cognito error during login for username=%s", username)
        raise SessionStoreError("Unable to process request.") from exc
    except BotoCoreError as exc:
        logger.exception("BotoCore error during Cognito login for username=%s", username)
        raise SessionStoreError("Unable to process request.") from exc


def list_sessions_for_username(username: str) -> list[dict[str, Any]]:
    # Query the username GSI so session replacement does not scan the full table.
    try:
        table = get_session_table()
        items: list[dict[str, Any]] = []
        query_kwargs: dict[str, Any] = {
            "IndexName": USERNAME_INDEX_NAME,
            "KeyConditionExpression": Key("username").eq(username),
            "ProjectionExpression": "session_id",
        }

        while True:
            response_data = table.query(**query_kwargs)
            items.extend(response_data.get("Items", []))
            last_key = response_data.get("LastEvaluatedKey")
            if not last_key:
                break
            query_kwargs["ExclusiveStartKey"] = last_key

        return items
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to list existing sessions for username=%s", username)
        raise SessionStoreError("Unable to create session.") from exc


def replace_user_session(username: str, groups: list[str]) -> tuple[str, int]:
    # Replace prior sessions first so one username maps to one active session in this version.
    session_id = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + get_session_ttl_seconds()
    table = get_session_table()

    try:
        for item in list_sessions_for_username(username):
            prior_session_id = item.get("session_id")
            if prior_session_id:
                table.delete_item(Key={"session_id": prior_session_id})

        table.put_item(
            Item={
                "session_id": session_id,
                "username": username,
                "groups": groups,
                "expires_at": expires_at,
            }
        )
        return session_id, expires_at
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to replace session for username=%s", username)
        raise SessionStoreError("Unable to create session.") from exc


def get_session(session_id: str) -> dict[str, Any] | None:
    # Load a session record and treat expired data as invalid.
    try:
        result = get_session_table().get_item(Key={"session_id": session_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to read session_id=%s", session_id)
        raise SessionStoreError("Unable to process request.") from exc

    item = result.get("Item")
    if not item:
        return None

    expires_at = int(item.get("expires_at", 0))
    if expires_at <= int(time.time()):
        try:
            delete_session(session_id)
        except SessionStoreError:
            logger.warning("Failed to delete expired session_id=%s", session_id)
        return None

    return item


def delete_session(session_id: str) -> None:
    # Delete a session record from DynamoDB.
    try:
        get_session_table().delete_item(Key={"session_id": session_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to delete session_id=%s", session_id)
        raise SessionStoreError("Unable to process request.") from exc


def handle_login(event: dict[str, Any], origin: str | None) -> dict[str, Any]:
    # Authenticate the user, replace any prior session, and then return one opaque cookie.
    require_allowed_origin(origin)

    body = parse_json_body(event)
    username = str(body.get("username", "")).strip()
    password = str(body.get("password", ""))
    if not username or not password:
        raise InvalidRequestError("Invalid request.")

    auth_result = authenticate_with_cognito(username, password)
    token_payload = auth_result.get("AuthenticationResult") or {}
    id_token = token_payload.get("IdToken")
    if not id_token:
        logger.error("Cognito login returned no IdToken for username=%s", username)
        raise SessionStoreError("Unable to process request.")

    claims = decode_jwt_payload(id_token)
    resolved_username, groups = extract_user_context(claims)

    # Only set the cookie after the server-side session record is durable.
    session_id, _expires_at = replace_user_session(resolved_username, groups)
    secure_cookie = should_use_secure_cookie(origin)
    session_cookie = build_session_cookie(session_id, get_session_ttl_seconds(), secure_cookie)

    return response(
        200,
        {
            "authenticated": True,
            "user": {
                "username": resolved_username,
                "groups": groups,
            },
        },
        origin,
        cookies_list=[session_cookie],
    )


def handle_logout(event: dict[str, Any], origin: str | None) -> dict[str, Any]:
    # Clear the session cookie and delete the backing session if it exists.
    require_allowed_origin(origin)

    request_cookies = parse_request_cookies(event)
    session_id = request_cookies.get(COOKIE_NAME)
    if session_id:
        delete_session(session_id)

    clear_cookie = build_clear_cookie(should_use_secure_cookie(origin))
    return response(
        200,
        {"session_cleared": True},
        origin,
        cookies_list=[clear_cookie],
    )


def handle_session(event: dict[str, Any], origin: str | None) -> dict[str, Any]:
    # Return the current authenticated session state without minting new credentials.
    request_cookies = parse_request_cookies(event)
    session_id = request_cookies.get(COOKIE_NAME)
    if not session_id:
        return response(200, {"authenticated": False}, origin)

    item = get_session(session_id)
    if not item:
        return response(200, {"authenticated": False}, origin)

    return response(
        200,
        {
            "authenticated": True,
            "user": {
                "username": item.get("username"),
                "groups": item.get("groups", []),
            },
        },
        origin,
    )


def handle_options(origin: str | None) -> dict[str, Any]:
    # Return the CORS preflight response for browser clients.
    return response(200, {}, origin)


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    # Route HTTP API requests and keep auth, origin, and backend failures separate.
    origin = get_origin(event)
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    raw_path = event.get("rawPath") or event.get("requestContext", {}).get("http", {}).get("path", "")
    path = normalize_request_path(event, raw_path)
    logger.info("method=%s raw_path=%s normalized_path=%s origin=%s", method, raw_path, path, origin)

    try:
        if method == "OPTIONS":
            return handle_options(origin)
        if method == "POST" and path == "/auth/login":
            return handle_login(event, origin)
        if method == "POST" and path == "/auth/logout":
            return handle_logout(event, origin)
        if method == "GET" and path == "/auth/session":
            return handle_session(event, origin)

        return response(404, {"error": "Unable to process request."}, origin)
    except OriginRejectedError:
        return response(403, {"error": "Unable to process request."}, origin)
    except InvalidRequestError:
        if method == "POST" and path == "/auth/logout":
            return response(400, {"session_cleared": False, "error": "Invalid request."}, origin)
        return response(400, {"authenticated": False, "error": "Invalid request."}, origin)
    except AuthenticationFailedError:
        return response(401, {"authenticated": False, "error": "Authentication failed."}, origin)
    except SessionStoreError as exc:
        logger.exception("Session/backend failure on %s %s", method, path, exc_info=exc)
        if method == "POST" and path == "/auth/login":
            return response(500, {"authenticated": False, "error": "Unable to create session."}, origin)
        if method == "POST" and path == "/auth/logout":
            return response(500, {"session_cleared": False, "error": "Unable to process request."}, origin)
        return response(500, {"authenticated": False, "error": "Unable to process request."}, origin)
    except RuntimeError as exc:
        logger.exception("Runtime configuration failure on %s %s", method, path, exc_info=exc)
        if method == "POST" and path == "/auth/logout":
            return response(500, {"session_cleared": False, "error": "Unable to process request."}, origin)
        return response(500, {"authenticated": False, "error": "Unable to process request."}, origin)
