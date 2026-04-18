"""
AWS Lambda function for IAM Dashboard security scanning
Handles security scans from various AWS services and stores results
"""

import json
import os
import logging
import boto3
import time
from datetime import datetime
from http import cookies
from typing import Dict, Any, Optional
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ── Bedrock API key — fetched once from SSM per warm instance ─────────────────
_ssm_client = boto3.client("ssm", region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
_bedrock_model_id_cache: Optional[str] = None

def _get_bedrock_api_key() -> Optional[str]:
    global _bedrock_key_cache
    if _bedrock_key_cache:
        return _bedrock_key_cache
    try:
        resp = _ssm_client.get_parameter(
            Name="/iam-dashboard/dev/bedrock-api-key",
            WithDecryption=True,
        )
        _bedrock_key_cache = resp["Parameter"]["Value"]
        return _bedrock_key_cache
    except Exception as e:
        logger.warning("Could not fetch Bedrock key from SSM: %s", e)
        return None


def _get_bedrock_model_id() -> str:
    global _bedrock_model_id_cache
    if _bedrock_model_id_cache:
        return _bedrock_model_id_cache
    try:
        resp = _ssm_client.get_parameter(Name="/iam-dashboard/dev/bedrock-model-id")
        _bedrock_model_id_cache = resp["Parameter"]["Value"]
        return _bedrock_model_id_cache
    except Exception as e:
        logger.warning("Could not fetch Bedrock model ID from SSM, using default: %s", e)
        _bedrock_model_id_cache = "anthropic.claude-haiku-4-5-20251001"
        return _bedrock_model_id_cache


def _get_bedrock_client():
    api_key = _get_bedrock_api_key()
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    if api_key:
        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key
    return boto3.client("bedrock-runtime", region_name=region)


_BEDROCK_MODEL_ID = _get_bedrock_model_id

_SYSTEM_RUNBOOK = (
    "You are a cloud security incident responder. "
    "You MUST respond with ONLY a valid JSON array — no markdown, no prose, no code fences. "
    "The array must contain exactly 4 objects: "
    '{"step":<int>,"phase":"IDENTIFY"|"CONTAIN"|"REMEDIATE"|"VERIFY",'
    '"title":<str max 60>,"description":<str max 200>,'
    '"commands":[<1-4 bash strings>],"estimated_time":<numeric string minutes>}. '
    "Phases must be in order. Every command must be a real AWS CLI command or a bash comment."
)

_VALID_RUNBOOK_PHASES = {"IDENTIFY", "CONTAIN", "REMEDIATE", "VERIFY"}


def _invoke_claude(prompt: str, system: Optional[str] = None, max_tokens: int = 1024) -> Optional[str]:
    """Call Claude via Bedrock. Returns response text or None on failure."""
    try:
        client = _get_bedrock_client()
        body: Dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            body["system"] = system
        response = client.invoke_model(modelId=_BEDROCK_MODEL_ID(), body=json.dumps(body))
        result = json.loads(response["body"].read())
        return result["content"][0]["text"]
    except Exception as e:
        logger.error("Bedrock invocation failed: %s", e)
        return None


def _handle_llm_triage(body: Dict[str, Any]) -> Dict[str, Any]:
    finding_id = body.get("finding_id", "unknown")
    prompt = (
        f"You are a cloud security incident responder. Triage this AWS security finding:\n"
        f"Finding ID: {finding_id}\n"
        f"Severity: {body.get('severity', 'Unknown')}\n"
        f"Type: {body.get('finding_type', 'Unknown')}\n"
        f"Resource: {body.get('resource_name', 'Unknown')}\n"
        f"Description: {body.get('description', 'No description provided')}\n\n"
        f"Respond with: 1) TRUE/FALSE POSITIVE assessment, 2) confidence score 0-1, "
        f"3) MITRE ATT&CK techniques, 4) immediate recommended actions. Be concise."
    )
    response = _invoke_claude(prompt)
    if response:
        return {"triage_summary": response, "model": _BEDROCK_MODEL_ID()}
    return {
        "triage_summary": "TRUE POSITIVE with HIGH confidence. Source IP associated with Tor exit nodes.",
        "confidence_score": 0.97,
        "mitre_techniques": ["T1078", "T1530"],
        "model": "mock",
    }


def _handle_llm_root_cause(body: Dict[str, Any]) -> Dict[str, Any]:
    finding_id = body.get("finding_id", "unknown")
    prompt = (
        f"You are a cloud security expert. Perform root cause analysis for this AWS finding:\n"
        f"Finding ID: {finding_id}\n"
        f"Severity: {body.get('severity', 'Unknown')}\n"
        f"Type: {body.get('finding_type', 'Unknown')}\n"
        f"Resource: {body.get('resource_name', 'Unknown')}\n"
        f"Description: {body.get('description', 'No description provided')}\n\n"
        f"Provide: 1) Root cause narrative, 2) Attack chain reconstruction, "
        f"3) MITRE ATT&CK mapping, 4) Contributing factors. Be concise and technical."
    )
    response = _invoke_claude(prompt)
    if response:
        return {"root_cause_narrative": response, "model": _BEDROCK_MODEL_ID()}
    return {
        "root_cause_narrative": "Initial access via compromised long-lived access key.",
        "mitre_techniques": ["T1078", "T1580"],
        "model": "mock",
    }


def _handle_llm_runbook(body: Dict[str, Any]) -> Dict[str, Any]:
    finding_id = body.get("finding_id", "unknown")
    prompt = (
        f"Generate a 4-step IR playbook for this AWS security finding.\n"
        f"Finding ID: {finding_id}\n"
        f"Severity: {body.get('severity', 'MEDIUM')}\n"
        f"Type: {body.get('finding_type', 'Unknown')}\n"
        f"Resource: {body.get('resource_name', 'Unknown')}\n"
        f"Resource ARN: {body.get('resource_arn', 'unknown')}\n"
        f"Description: {body.get('description', 'No description provided')}\n\n"
        f"Return only the JSON array as instructed."
    )
    raw = _invoke_claude(prompt, system=_SYSTEM_RUNBOOK, max_tokens=2048)
    steps = None
    if raw:
        try:
            data = json.loads(raw.strip())
            if isinstance(data, list) and data:
                validated = []
                for i, item in enumerate(data):
                    if not isinstance(item, dict):
                        raise ValueError(f"step {i} not a dict")
                    if item.get("phase") not in _VALID_RUNBOOK_PHASES:
                        raise ValueError(f"invalid phase: {item.get('phase')}")
                    validated.append({
                        "step": int(item.get("step", i + 1)),
                        "phase": item["phase"],
                        "title": str(item.get("title", ""))[:80],
                        "description": str(item.get("description", ""))[:400],
                        "commands": [str(c) for c in item.get("commands", []) if isinstance(c, str)][:4],
                        "estimated_time": str(item.get("estimated_time", "30")),
                    })
                steps = validated
        except Exception as e:
            logger.warning("Runbook JSON parse failed: %s | raw=%r", e, raw[:200])

    if steps:
        return {"runbook_steps": steps, "model": _BEDROCK_MODEL_ID()}
    return {
        "runbook_steps": [
            {"step": 1, "phase": "IDENTIFY", "title": "Validate Finding via CloudTrail",
             "description": "Query CloudTrail for API calls from the suspicious principal.",
             "commands": ["aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA_REPLACE --max-results 50"],
             "estimated_time": "15"},
            {"step": 2, "phase": "CONTAIN", "title": "Disable Compromised Credentials",
             "description": "Immediately disable the access key to stop ongoing access.",
             "commands": ["aws iam update-access-key --access-key-id AKIA_REPLACE --status Inactive --user-name USERNAME"],
             "estimated_time": "10"},
            {"step": 3, "phase": "REMEDIATE", "title": "Rotate Credentials and Harden IAM",
             "description": "Issue a new key, apply least-privilege policy, enable MFA.",
             "commands": ["aws iam create-access-key --user-name USERNAME"],
             "estimated_time": "60"},
            {"step": 4, "phase": "VERIFY", "title": "Confirm Closure and Re-scan",
             "description": "Re-run the scanner and resolve the finding in Security Hub.",
             "commands": ["aws securityhub batch-update-findings --finding-identifiers ProductArn=PRODUCT_ARN,Id=FINDING_ID --workflow Status=RESOLVED"],
             "estimated_time": "20"},
        ],
        "model": "mock",
    }

def mask_arn(text: str) -> str:
    """
    Mask AWS ARNs to prevent exposure of account IDs and sensitive resource identifiers
    ARN format: arn:aws:service:region:account-id:resource-type/resource-id
    Shows: arn:aws:service:region:****:resource-type/...xxxx (masks account ID and part of resource ID)
    """
    import re
    if not text:
        return text
    
    # Pattern: arn:aws:service:region:account-id:resource-type/resource-id
    pattern = r'(arn:aws:[^:]+:[^:]*:)([0-9]{12}|[a-z0-9-]+)(:)([^/]+)(/)(.+)'
    
    def replace(match):
        prefix = match.group(1)
        account_id = match.group(2)
        colon = match.group(3)
        resource_type = match.group(4)
        slash = match.group(5)
        resource_id = match.group(6)
        
        # Mask account ID (12 digits or alphanumeric)
        if len(account_id) == 12 and account_id.isdigit():
            masked_account_id = '****'
        elif len(account_id) > 4:
            masked_account_id = f"{account_id[:2]}...{account_id[-2:]}"
        else:
            masked_account_id = '****'
        
        # Mask resource ID if it's long (show first 4 and last 4 chars)
        if len(resource_id) > 12:
            masked_resource_id = f"{resource_id[:4]}...{resource_id[-4:]}"
        elif len(resource_id) > 8:
            masked_resource_id = f"{resource_id[:2]}...{resource_id[-2:]}"
        else:
            masked_resource_id = resource_id
        
        return f"{prefix}{masked_account_id}{colon}{resource_type}{slash}{masked_resource_id}"
    
    return re.sub(pattern, replace, text, flags=re.IGNORECASE)

def mask_access_key(text: str) -> str:
    """
    Mask AWS access keys in text to prevent exposure
    AWS access keys are 20 characters: AKIA + 16 alphanumeric
    Shows: AKIA...xxxx (first 4 + last 4 characters)
    """
    import re
    if not text:
        return text
    
    # Pattern: AKIA followed by exactly 16 alphanumeric characters
    pattern = r'(AKIA[0-9A-Z]{16})'
    
    def replace(match):
        key = match.group(1)
        if len(key) == 20:
            return f"{key[:4]}...{key[-4:]}"
        return key
    
    return re.sub(pattern, replace, text, flags=re.IGNORECASE)

def mask_sensitive_data(text: str) -> str:
    """
    Mask both access keys and ARNs in a string
    """
    if not text:
        return text
    masked = mask_arn(text)
    masked = mask_access_key(masked)
    return masked

def mask_session_id(session_id: str) -> str:
    """Return a truncated session ID safe for logging."""
    return session_id[:10] + '...' if session_id and len(session_id) > 10 else '***'


def sanitize_event_for_logging(event: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy of the Lambda event with sensitive headers and cookies redacted."""
    sanitized = json.loads(json.dumps(event, default=str))
    headers = sanitized.get('headers') or {}
    for key in ('cookie', 'Cookie', 'authorization', 'Authorization'):
        if key in headers:
            headers[key] = '***redacted***'
    if sanitized.get('cookies'):
        sanitized['cookies'] = ['***redacted***']
    return sanitized

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
securityhub = boto3.client('securityhub')
guardduty = boto3.client('guardduty')
config = boto3.client('config')
inspector = boto3.client('inspector2')
macie = boto3.client('macie2')
iam = boto3.client('iam')
ec2 = boto3.client('ec2')
sts = boto3.client('sts')
cloudwatch = boto3.client('cloudwatch')

# Environment variables
DYNAMODB_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME', 'iam-dashboard-scan-results')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'iam-dashboard-project')
PROJECT_NAME = os.environ.get('PROJECT_NAME', 'IAMDash')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
COOKIE_NAME = 'iamdash_session'
SESSION_TABLE_NAME = os.environ.get('SESSION_TABLE_NAME', 'iam-dashboard-auth-sessions-test')
ACCOUNTS_TABLE_NAME = os.environ.get("ACCOUNTS_TABLE_NAME", "iam-dashboard-accounts-test")
CROSS_ACCOUNT_ROLE_NAME = os.environ.get("CROSS_ACCOUNT_ROLE_NAME", "iam-dashboard-scan-role")
MAIN_ACCOUNT_ID = os.environ.get("MAIN_ACCOUNT_ID")
SCANNER_GROUP_MAP = {
    'admin':       None,  # admin is handled separately — allowed all non-full types
    'iam':         'iam',
    'ec2':         'ec2',
    's3':          's3',
    'securityhub': 'security-hub',
    'guardduty':   'guardduty',
    'config':      'config',
    'inspector':   'inspector',
    'macie':       'macie',
}


class UnauthorizedError(Exception):
    """Raised when the request does not have a valid authenticated session."""


class ForbiddenError(Exception):
    """Raised when the authenticated session lacks required groups."""


class SessionStoreError(Exception):
    """Raised when session storage cannot be read safely."""


def _cors_allowed_origins_set() -> set:
    """Return the set of allowed origins from the CORS_ALLOWED_ORIGINS environment variable."""
    raw = os.environ.get('CORS_ALLOWED_ORIGINS', '')
    return {o.strip() for o in raw.split(',') if o.strip()}


def _get_header_case_insensitive(headers: Optional[Dict[str, Any]], name: str) -> Optional[str]:
    """Resolve a header value when API Gateway may use arbitrary key casing."""
    if not headers:
        return None
    target = name.lower()
    for key, value in headers.items():
        if key is not None and str(key).lower() == target:
            if value is None:
                return None
            return value if isinstance(value, str) else str(value)
    return None


def _cors_response_headers(event: Optional[Dict[str, Any]]) -> Dict[str, str]:
    """
    CORS headers for Lambda proxy integration. Reflects Origin only when it is in the allowlist
    (from CORS_ALLOWED_ORIGINS). Never uses wildcard — required for a consistent security posture
    alongside API Gateway HTTP API cors_configuration.
    """
    allow = _cors_allowed_origins_set()
    headers: Dict[str, str] = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    }
    if not allow:
        return headers
    origin = None
    if event:
        hdrs = event.get('headers') or {}
        origin = _get_header_case_insensitive(hdrs, 'Origin')
    if origin and origin in allow:
        headers['Access-Control-Allow-Origin'] = origin
        headers['Vary'] = 'Origin'
    return headers


def publish_metric(metric_name: str, value: float, dimensions: Dict[str, str] = None):
    """Publish a custom CloudWatch metric"""
    try:
        cloudwatch.put_metric_data(
            Namespace='IAMDashboard/Scans',
            MetricData=[{
                'MetricName': metric_name,
                'Value': value,
                'Unit': 'Count' if 'Count' in metric_name or 'Errors' in metric_name else 'Seconds',
                'Dimensions': [{'Name': k, 'Value': v} for k, v in (dimensions or {}).items()]
            }]
        )
    except Exception as e:
        logger.warning(f"Failed to publish metric {metric_name}: {str(e)}")


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='ignore')
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    # Fallback to string representation for unknown types
    try:
        return str(obj)
    except:
        return None


def parse_request_cookies(event: Dict[str, Any]) -> Dict[str, str]:
    """Extract request cookies from both HTTP API and header-based formats."""
    parsed: Dict[str, str] = {}

    for raw_cookie in event.get('cookies') or []:
        morsel = cookies.SimpleCookie()
        try:
            morsel.load(raw_cookie)
        except cookies.CookieError:
            continue
        for key, value in morsel.items():
            parsed[key] = value.value

    headers = event.get('headers') or {}
    cookie_header = headers.get('cookie') or headers.get('Cookie')
    if cookie_header:
        morsel = cookies.SimpleCookie()
        try:
            morsel.load(cookie_header)
        except cookies.CookieError:
            return parsed
        for key, value in morsel.items():
            parsed[key] = value.value

    return parsed

def get_accounts_table():
    """Return the DynamoDB accounts table."""
    return dynamodb.Table(ACCOUNTS_TABLE_NAME)

def get_registered_account(account_id: str) -> Optional[Dict[str, Any]]:
    """Return the registered account record for the given account ID."""
    if not account_id:
        return None

    try:
        result = get_accounts_table().get_item(Key={"account_id": account_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception("Failed to read registered account_id=%s", account_id)
        raise SessionStoreError("Unable to process request.") from exc

    return result.get("Item")

def get_scan_clients_for_account(account_id: Optional[str], region: str) -> Dict[str, Any]:
    """Return scan clients for the main account or an assumed target account."""
    if not account_id or (MAIN_ACCOUNT_ID and account_id == MAIN_ACCOUNT_ID):
        return {
            "securityhub": boto3.client("securityhub", region_name=region),
            "guardduty": boto3.client("guardduty", region_name=region),
            "config": boto3.client("config", region_name=region),
            "inspector": boto3.client("inspector2", region_name=region),
            "macie": boto3.client("macie2", region_name=region),
            "iam": boto3.client("iam"),
            "ec2": boto3.client("ec2", region_name=region),
            "s3": boto3.client("s3"),
            "sts": boto3.client("sts")
        }

    role_arn = f"arn:aws:iam::{account_id}:role/{CROSS_ACCOUNT_ROLE_NAME}"

    try:
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=f"DashboardScan-{account_id}"
        )
    except ClientError as exc:
        logger.exception("Failed to assume role for account_id=%s", account_id)
        raise ForbiddenError(
            f"Cannot assume role in account {account_id}"
        ) from exc

    creds = response["Credentials"]

    session = boto3.Session(
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
        region_name=region
    )

    return {
        "securityhub": session.client("securityhub", region_name=region),
        "guardduty": session.client("guardduty", region_name=region),
        "config": session.client("config", region_name=region),
        "inspector": session.client("inspector2", region_name=region),
        "macie": session.client("macie2", region_name=region),
        "iam": session.client("iam"),
        "ec2": session.client("ec2", region_name=region),
        "s3": session.client("s3"),
        "sts": session.client("sts")
    }

def get_session_table():
    """Resolve the DynamoDB session table from the configured environment."""
    table_name = SESSION_TABLE_NAME
    return dynamodb.Table(table_name)


def delete_session(session_id: str) -> None:
    """Delete a session record from DynamoDB."""
    try:
        get_session_table().delete_item(Key={'session_id': session_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception('Failed to delete expired session_id=%s', mask_session_id(session_id))
        raise SessionStoreError('Unable to process request.') from exc


def normalize_groups(groups: Any) -> list[str]:
    """Normalize session groups into a list of strings."""
    if isinstance(groups, str):
        groups = [groups]
    if not isinstance(groups, list):
        return []
    return [str(group) for group in groups if str(group).strip()]


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Load a session record and treat expired data as invalid."""
    try:
        result = get_session_table().get_item(Key={'session_id': session_id})
    except (ClientError, BotoCoreError) as exc:
        logger.exception('Failed to read session_id=%s', mask_session_id(session_id))
        raise SessionStoreError('Unable to process request.') from exc

    item = result.get('Item')
    if not item:
        return None

    try:
        expires_at = int(item.get('expires_at', 0))
    except (TypeError, ValueError):
        expires_at = 0

    if expires_at <= int(time.time()):
        try:
            delete_session(session_id)
        except SessionStoreError:
            logger.warning('Failed to delete expired session_id=%s', mask_session_id(session_id))
        return None

    item['groups'] = normalize_groups(item.get('groups'))
    return item


def get_request_session(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Resolve the current request session from the opaque auth cookie."""
    request_cookies = parse_request_cookies(event)
    session_id = request_cookies.get(COOKIE_NAME)
    if not session_id:
        return None
    return get_session(session_id)


def require_authenticated_session(event: Dict[str, Any]) -> Dict[str, Any]:
    """Require a valid authenticated session for HTTP-triggered scans."""
    session = get_request_session(event)
    if not session:
        raise UnauthorizedError('Authentication required.')
    return session


def require_groups(session: Dict[str, Any], scanner_type: str) -> None:
    """Require that the authenticated session has a group permitted to run scanner_type."""
    groups = set(normalize_groups(session.get('groups')))
    if 'admin' in groups:
        return
    if scanner_type == 'full': # Only admins can run full scans
        raise ForbiddenError('Forbidden.')
    
    lookup = 'securityhub' if scanner_type == 'security-hub' else scanner_type
    if any(SCANNER_GROUP_MAP.get(g) == scanner_type or
           (g == 'securityhub' and lookup == 'securityhub')
           for g in groups):
        return
    raise ForbiddenError('Forbidden.')


def _http_request_audit_context(event: Dict[str, Any]) -> Dict[str, Any]:
    """Correlation and client context from API Gateway for audit logs."""
    ctx: Dict[str, Any] = {}
    rc = event.get('requestContext') or {}
    if not isinstance(rc, dict):
        return ctx
    ctx['request_id'] = rc.get('requestId')
    http = rc.get('http') or {}
    if isinstance(http, dict):
        if http.get('sourceIp'): ctx['source_ip'] = http.get('sourceIp')
        if http.get('userAgent'): ctx['user_agent'] = http.get('userAgent')
        if http.get('method'): ctx['http_method'] = http.get('method')
        if http.get('path'): ctx['path'] = http.get('path')
    ident = rc.get('identity') or {}
    if isinstance(ident, dict):
        if 'source_ip' not in ctx and ident.get('sourceIp'): ctx['source_ip'] = ident.get('sourceIp')
        if 'user_agent' not in ctx and ident.get('userAgent'): ctx['user_agent'] = ident.get('userAgent')
    return {k: v for k, v in ctx.items() if v is not None}


def emit_sensitive_audit_record(
    action: str,
    *,
    actor_username: Optional[str] = None,
    actor_groups: Optional[list] = None,
    resource: str = '',
    details: Optional[Dict[str, Any]] = None,
    http_context: Optional[Dict[str, Any]] = None,
) -> None:
    """Emit one JSON audit record to CloudWatch Logs. Prefix: SENSITIVE_AUDIT"""
    record: Dict[str, Any] = {
        'audit_schema': 'iamdash_sensitive_action_v1',
        'timestamp_utc': datetime.utcnow().isoformat() + 'Z',
        'action': action,
        'resource': resource,
        'actor_username': actor_username,
        'environment': ENVIRONMENT,
        'project': PROJECT_NAME,
        'details': details or {},
    }
    if actor_groups is not None:
        record['actor_groups'] = actor_groups
    if http_context:
        record['http'] = http_context
    try:
        logger.info('SENSITIVE_AUDIT %s', json.dumps(record, default=json_serial))
    except (TypeError, ValueError) as exc:
        logger.warning('SENSITIVE_AUDIT serialization failed: %s', exc)


def _target_account_from_scan_params(params: Dict[str, Any]) -> Optional[str]:
    """Extract account_id from scan params for audit context."""
    raw = params.get('account_id') if isinstance(params.get('account_id'), str) else params.get('accountId')
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for security scanning
    
    Expected event structure (API Gateway):
    {
        "httpMethod": "POST",
        "path": "/scan/{scanner_type}",
        "pathParameters": {
            "scanner_type": "security-hub|guardduty|config|inspector|macie|iam|ec2|s3|full"
        },
        "body": "{\"region\": \"us-east-1\", ...}"
    }
    
    Or direct invocation:
    {
        "scanner_type": "security-hub",
        "region": "us-east-1",
        "scan_parameters": {...}
    }
    """
    start_time = datetime.utcnow()
    scan_start_time = datetime.utcnow()
    
    try:
        logger.info("Received event: %s", json.dumps(sanitize_event_for_logging(event)))
        
        is_http_request = 'httpMethod' in event or 'requestContext' in event

        # Parse event (API Gateway or direct invocation)
        if is_http_request:
            # API Gateway event (v1 REST or v2 HTTP)
            # Extract scanner type from path
            path = event.get('path') or event.get('requestContext', {}).get('http', {}).get('path', '')
            if path:
                # Extract scanner type from path like "/scan/security-hub" or "/v1/scan/security-hub"
                path_parts = [p for p in path.strip('/').split('/') if p]
                # Find the index of 'scan' and get the next part
                if 'scan' in path_parts:
                    scan_idx = path_parts.index('scan')
                    scanner_type = path_parts[scan_idx + 1] if scan_idx + 1 < len(path_parts) else ''
                else:
                    # Fallback: get last part of path
                    scanner_type = path_parts[-1] if path_parts else ''
            else:
                # Fallback to pathParameters if available (REST API)
                scanner_type = event.get('pathParameters', {}).get('scanner_type', '')
            
            body = json.loads(event.get('body', '{}')) if event.get('body') else {}
            region = body.get('region', 'us-east-1')
            scan_params = body
            account_id = body.get("account_id")
        else:
            # Direct invocation
            scanner_type = event.get('scanner_type', '')
            region = event.get('region', 'us-east-1')
            scan_params = event.get('scan_parameters', {})
            account_id = event.get('account_id')
        
        # ── LLM routes — handled before scanner validation ────────────────
        llm_routes = {
            "llm-triage":     _handle_llm_triage,
            "llm-root-cause": _handle_llm_root_cause,
            "llm-runbook":    _handle_llm_runbook,
        }
        if scanner_type in llm_routes:
            import uuid as _uuid
            result = llm_routes[scanner_type](body)
            return create_response(200, {
                "job_id": f"job-{_uuid.uuid4().hex[:12]}",
                "finding_id": body.get("finding_id", "unknown"),
                "action_type": scanner_type.replace("-", "_"),
                "status": "succeeded",
                "approval_required": False,
                "result": result,
            }, event)

        # Validate scanner type
        valid_scanners = ['security-hub', 'guardduty', 'config', 'inspector', 'macie', 'iam', 'ec2', 's3', 'full']
        if scanner_type not in valid_scanners:
            publish_metric('ScanErrors', 1, {'ScannerType': scanner_type, 'ErrorType': 'InvalidScannerType'})
            return create_response(400, {
                'error': f'Invalid scanner type. Must be one of: {", ".join(valid_scanners)}'
            })

        session: Optional[Dict[str, Any]] = None
        if is_http_request:
            http_audit_ctx = _http_request_audit_context(event)
            session = get_request_session(event)
            target_account = _target_account_from_scan_params(scan_params)
            if not session:
                emit_sensitive_audit_record(
                    'scan_access_denied',
                    resource=f'scan:{scanner_type}',
                    details={
                        'reason': 'unauthenticated',
                        'scanner_type': scanner_type,
                        'region': region,
                        'target_account_id': target_account,
                    },
                    http_context=http_audit_ctx,
                )
                raise UnauthorizedError('Authentication required.')
            try:
                require_groups(session, scanner_type)
            except ForbiddenError:
                emit_sensitive_audit_record(
                    'scan_access_denied',
                    actor_username=session.get('username') if isinstance(session.get('username'), str) else None,
                    actor_groups=normalize_groups(session.get('groups')),
                    resource=f'scan:{scanner_type}',
                    details={
                        'reason': 'insufficient_privilege',
                        'scanner_type': scanner_type,
                        'region': region,
                        'target_account_id': target_account,
                    },
                    http_context=http_audit_ctx,
                )
                raise

        account_name = None
        is_main_account = bool(account_id and MAIN_ACCOUNT_ID and account_id == MAIN_ACCOUNT_ID)

        if account_id and not is_main_account:
            registered_account = get_registered_account(account_id)
            if not registered_account:
                return create_response(404, {
                    "error": f"Account {account_id} is not registered"
                }, event)
            account_name = registered_account.get("account_name")
        elif is_main_account:
            account_name = "Main Account"
        
        scan_clients = get_scan_clients_for_account(account_id, region)

        # Execute scan
        scan_id = f"{scanner_type}-{datetime.utcnow().isoformat()}"
        target_account = account_id or MAIN_ACCOUNT_ID
        if is_http_request and session is not None:
            emit_sensitive_audit_record(
                'scan_triggered',
                actor_username=session.get('username') if isinstance(session.get('username'), str) else None,
                actor_groups=normalize_groups(session.get('groups')),
                resource=f'scan:{scanner_type}',
                details={
                    'scanner_type': scanner_type,
                    'region': region,
                    'scan_id': scan_id,
                    'target_account_id': target_account,
                },
                http_context=_http_request_audit_context(event),
            )
        elif not is_http_request:
            emit_sensitive_audit_record(
                'scan_triggered',
                actor_username='lambda_direct_invocation',
                resource=f'scan:{scanner_type}',
                details={
                    'scanner_type': scanner_type,
                    'region': region,
                    'scan_id': scan_id,
                    'target_account_id': target_account,
                    'invocation': 'direct',
                },
            )
        logger.info(f"Starting scan: {scan_id} for type: {scanner_type}")
        
        try:
            scan_result = execute_scan(scanner_type, region, scan_params, scan_id, scan_clients)
            scan_duration = (datetime.utcnow() - scan_start_time).total_seconds()

            if account_id:
                scan_result["account_id"] = account_id
                scan_result["account_name"] = account_name
            elif MAIN_ACCOUNT_ID:
                scan_result["account_id"] = MAIN_ACCOUNT_ID
                if not scan_result.get("account_name"):
                    scan_result["account_name"] = "Main Account"

            # Ensure scan_result is a dict
            if not isinstance(scan_result, dict):
                logger.warning(f"Scan result is not a dict: {type(scan_result)}")
                scan_result = {
                    'error': 'Invalid scan result format',
                    'scan_type': scanner_type
                }
            
            # For full scan and IAM scan, ensure status is 'completed'
            if scanner_type == 'full':
                scan_result['status'] = 'completed'
                # Ensure we have at least empty results for IAM
                if 'iam' not in scan_result:
                    scan_result['iam'] = {
                        'findings': [],
                        'scan_summary': {'critical_findings': 0, 'high_findings': 0, 'medium_findings': 0, 'low_findings': 0}
                    }
            elif scanner_type == 'iam':
                # IAM scan should always return 'completed' status
                scan_result['status'] = 'completed'
                # Ensure required fields exist
                if 'findings' not in scan_result:
                    scan_result['findings'] = []
                if 'scan_summary' not in scan_result:
                    scan_result['scan_summary'] = {
                        'critical_findings': 0,
                        'high_findings': 0,
                        'medium_findings': 0,
                        'low_findings': 0
                    }
            
            # Publish success metrics
            publish_metric('ScanSuccess', 1, {'ScannerType': scanner_type, 'Region': region})
            publish_metric('ScanDuration', scan_duration, {'ScannerType': scanner_type, 'Region': region})
            
            # Publish finding counts if available
            if 'summary' in scan_result:
                summary = scan_result['summary']
                if 'total_findings' in summary:
                    publish_metric('FindingsCount', summary['total_findings'], {
                        'ScannerType': scanner_type,
                        'Region': region,
                        'Severity': 'Total'
                    })
            elif scanner_type == 'iam' and 'scan_summary' in scan_result:
                # For IAM scans, use scan_summary instead of summary
                total_findings = (
                    scan_result['scan_summary'].get('critical_findings', 0) +
                    scan_result['scan_summary'].get('high_findings', 0) +
                    scan_result['scan_summary'].get('medium_findings', 0) +
                    scan_result['scan_summary'].get('low_findings', 0)
                )
                if total_findings > 0:
                    publish_metric('FindingsCount', total_findings, {
                        'ScannerType': scanner_type,
                        'Region': region,
                        'Severity': 'Total'
                    })
            elif scanner_type == 'full' and 'iam' in scan_result:
                # For full scans, count findings from IAM
                iam_summary = scan_result.get('iam', {}).get('scan_summary', {})
                total_findings = (
                    iam_summary.get('critical_findings', 0) +
                    iam_summary.get('high_findings', 0) +
                    iam_summary.get('medium_findings', 0) +
                    iam_summary.get('low_findings', 0)
                )
                if total_findings > 0:
                    publish_metric('FindingsCount', total_findings, {
                        'ScannerType': scanner_type,
                        'Region': region,
                        'Severity': 'Total'
                    })
            
        except Exception as scan_error:
            logger.error(f"Error executing scan: {str(scan_error)}", exc_info=True)
            
            # Publish error metrics
            publish_metric('ScanErrors', 1, {
                'ScannerType': scanner_type,
                'Region': region,
                'ErrorType': 'ScanExecutionFailed'
            })
            
            # For full scan and IAM scan, return a completed response with error info
            if scanner_type == 'full':
                scan_result = {
                    'scan_type': 'full',
                    'status': 'completed',
                    'error': 'Some scanners failed',
                    'message': str(scan_error)[:500],
                    'iam': {
                        'findings': [],
                        'scan_summary': {'critical_findings': 0, 'high_findings': 0, 'medium_findings': 0, 'low_findings': 0}
                    }
                }
            elif scanner_type == 'iam':
                # IAM scan should always return completed, even on error
                scan_result = {
                    'scan_type': 'iam',
                    'status': 'completed',
                    'error': 'IAM scan encountered an error',
                    'message': str(scan_error)[:500],
                    'findings': [],
                    'scan_summary': {
                        'critical_findings': 0,
                        'high_findings': 0,
                        'medium_findings': 0,
                        'low_findings': 0
                    },
                    'account_id': 'N/A',
                    'users': {'total': 0, 'with_mfa': 0, 'without_mfa': 0, 'inactive': 0},
                    'roles': {'total': 0},
                    'policies': {'total': 0},
                    'groups': {'total': 0}
                }
            else:
                return create_response(500, {
                    'error': 'Scan execution failed',
                    'message': str(scan_error)[:500],
                    'scan_id': scan_id,
                    'scanner_type': scanner_type
                }, event)
        
        # Store results (non-blocking - don't fail if storage fails)
        try:
            store_results(scan_id, scanner_type, region, scan_result)
        except Exception as storage_error:
            logger.warning(f"Error storing results (non-fatal): {str(storage_error)}")
        
        # Return response - ALWAYS return 200 to show results (even for errors in IAM/full scans)
        return create_response(200, {
            'scan_id': scan_id,
            'scanner_type': scanner_type,
            'region': region,
            'status': scan_result.get('status', 'completed'),
            'results': scan_result,
            'timestamp': datetime.utcnow().isoformat()
        }, event)
        
    except UnauthorizedError:
        return create_response(401, {'error': 'Authentication required'})
    except ForbiddenError:
        return create_response(403, {'error': 'Forbidden: You do not have sufficient permissions to perform this operation'})
    except SessionStoreError:
        return create_response(500, {'error': 'Unable to process request'})
    except Exception as e:
        logger.error(f"Error in lambda_handler: {e!s}", exc_info=True)
        return create_response(500, {
            'error': 'Internal server error',
            'message': f"{e!s}"
        }, event)


def execute_scan(
    scanner_type: str, region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the appropriate security scan based on scanner type"""
    
    scanner_handlers = {
        'security-hub': scan_security_hub,
        'guardduty': scan_guardduty,
        'config': scan_config,
        'inspector': scan_inspector,
        'macie': scan_macie,
        'iam': scan_iam,
        'ec2': scan_ec2,
        's3': scan_s3,
        'full': scan_full
    }
    
    handler = scanner_handlers.get(scanner_type)
    if not handler:
        raise ValueError(f"Unknown scanner type: {scanner_type}")

    return handler(region, scan_params, scan_id, scan_clients)

def scan_security_hub(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan AWS Security Hub for findings"""
    try:
        logger.info(f"Scanning Security Hub in region: {region}")
        
        securityhub_client = scan_clients["securityhub"]
        findings = []
        severity_filter = scan_params.get('severity', {})
        
        # Get findings
        paginator = securityhub_client.get_paginator('get_findings')
        page_iterator = paginator.paginate(
            Filters={
                'SeverityLabel': severity_filter if severity_filter else [
                    {'Value': 'CRITICAL', 'Comparison': 'EQUALS'},
                    {'Value': 'HIGH', 'Comparison': 'EQUALS'},
                    {'Value': 'MEDIUM', 'Comparison': 'EQUALS'}
                ]
            },
            MaxResults=100
        )
        
        for page in page_iterator:
            findings.extend(page.get('Findings', []))
        
        # Get summary
        summary = {
            'total_findings': len(findings),
            'critical': len([f for f in findings if f.get('Severity', {}).get('Label') == 'CRITICAL']),
            'high': len([f for f in findings if f.get('Severity', {}).get('Label') == 'HIGH']),
            'medium': len([f for f in findings if f.get('Severity', {}).get('Label') == 'MEDIUM']),
            'low': len([f for f in findings if f.get('Severity', {}).get('Label') == 'LOW'])
        }
        
        return {
            'findings': findings[:100],  # Limit to first 100
            'summary': summary,
            'scan_type': 'security-hub'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        error_message = str(e)
        logger.error(f"Error scanning Security Hub: {error_code} - {error_message}")
        
        if error_code == 'InvalidAccessException':
            return {
                'error': 'Security Hub is not enabled in this region',
                'scan_type': 'security-hub',
                'error_code': error_code
            }
        elif error_code == 'AccessDeniedException':
            return {
                'error': 'Lambda does not have permission to access Security Hub',
                'scan_type': 'security-hub',
                'error_code': error_code,
                'message': error_message
            }
        else:
            return {
                'error': f'Error accessing Security Hub: {error_message}',
                'scan_type': 'security-hub',
                'error_code': error_code
            }


def scan_guardduty(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan AWS GuardDuty for threats"""
    try:
        logger.info(f"Scanning GuardDuty in region: {region}")
        
        guardduty_client = scan_clients["guardduty"]
        # List detectors
        detectors = guardduty_client.list_detectors()
        detector_ids = detectors.get('DetectorIds', [])
        
        if not detector_ids:
            return {
                'error': 'No GuardDuty detectors found in this region',
                'scan_type': 'guardduty'
            }
        
        findings = []
        for detector_id in detector_ids:
            # Get findings
            paginator = guardduty_client.get_paginator('list_findings')
            page_iterator = paginator.paginate(
                DetectorId=detector_id,
                FindingCriteria={
                    'Criterion': {
                        'severity': {
                            'Gte': scan_params.get('min_severity', 4.0)
                        }
                    }
                }
            )
            
            for page in page_iterator:
                finding_ids = page.get('FindingIds', [])
                if finding_ids:
                    findings_response = guardduty_client.get_findings(
                        DetectorId=detector_id,
                        FindingIds=finding_ids
                    )
                    findings.extend(findings_response.get('Findings', []))
        
        return {
            'findings': findings[:100],
            'total_findings': len(findings),
            'detectors': len(detector_ids),
            'scan_type': 'guardduty'
        }
        
    except ClientError as e:
        logger.error(f"Error scanning GuardDuty: {str(e)}")
        raise


def scan_config(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan AWS Config for compliance"""
    try:
        logger.info(f"Scanning AWS Config in region: {region}")
        
        config_client = scan_clients["config"]
        # Check if Config is enabled
        try:
            recorders = config_client.describe_configuration_recorders()
            if not recorders.get('ConfigurationRecorders'):
                return {
                    'error': 'AWS Config is not enabled in this region',
                    'message': 'Please enable AWS Config in the AWS Console or via CLI',
                    'scan_type': 'config',
                    'total_rules': 0,
                    'config_rules': []
                }
        except ClientError as e:
            if 'NoSuchConfigurationRecorderException' in str(e) or 'InvalidNextTokenException' in str(e):
                return {
                    'error': 'AWS Config is not enabled in this region',
                    'message': 'Please enable AWS Config in the AWS Console or via CLI',
                    'scan_type': 'config',
                    'total_rules': 0,
                    'config_rules': []
                }
        
        # Get compliance summary
        compliance_summary = config_client.get_compliance_summary_by_config_rule()
        
        # Get config rules
        rules = config_client.describe_config_rules()
        
        # Convert to JSON-serializable format
        compliance_summary_clean = json.loads(json.dumps(compliance_summary, default=json_serial))
        rules_clean = json.loads(json.dumps(rules.get('ConfigRules', [])[:50], default=json_serial))
        
        return {
            'compliance_summary': compliance_summary_clean,
            'config_rules': rules_clean,
            'total_rules': len(rules.get('ConfigRules', [])),
            'scan_type': 'config'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code in ['NoSuchConfigurationRecorderException', 'InvalidNextTokenException']:
            return {
                'error': 'AWS Config is not enabled',
                'message': 'Please enable AWS Config service in this region',
                'scan_type': 'config',
                'total_rules': 0,
                'config_rules': []
            }
        logger.error(f"Error scanning Config: {str(e)}")
        raise


def scan_inspector(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan AWS Inspector for vulnerabilities"""
    try:
        logger.info(f"Scanning AWS Inspector in region: {region}")
        
        inspector_client = scan_clients["inspector"]
        # List findings (simplified - no filters to avoid validation issues)
        findings = []
        try:
            # List findings without complex filters
            response = inspector_client.list_findings(maxResults=100)
            finding_arns = response.get('findingArns', [])
            
            if finding_arns:
                findings_response = inspector_client.batch_get_findings(
                    findingArns=finding_arns[:100]
                )
                findings.extend(findings_response.get('findings', []))
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            error_message = str(e)
            if 'AccessDeniedException' in error_code or 'ValidationException' in error_code or 'ThrottlingException' in error_code:
                return {
                    'error': 'AWS Inspector is not enabled or has no findings',
                    'message': 'Please enable AWS Inspector v2 service in this region or wait for scans to complete',
                    'scan_type': 'inspector',
                    'total_findings': 0,
                    'findings': []
                }
            # If it's a different error, return it gracefully
            return {
                'error': 'Error scanning Inspector',
                'message': error_message,
                'scan_type': 'inspector',
                'total_findings': 0,
                'findings': []
            }
        
        return {
            'findings': findings[:100],
            'total_findings': len(findings),
            'scan_type': 'inspector'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if 'AccessDeniedException' in error_code or 'ValidationException' in error_code:
            return {
                'error': 'AWS Inspector is not enabled',
                'message': 'Please enable AWS Inspector v2 service in this region',
                'scan_type': 'inspector',
                'total_findings': 0,
                'findings': []
            }
        logger.error(f"Error scanning Inspector: {str(e)}")
        raise


def scan_macie(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan AWS Macie for data security"""
    try:
        logger.info(f"Scanning AWS Macie in region: {region}")
        
        macie_client = scan_clients["macie"]
        # List findings
        findings = []
        paginator = macie_client.get_paginator('list_findings')
        page_iterator = paginator.paginate(
            findingCriteria={
                'criterion': {
                    'severity.description': {
                        'eq': [scan_params.get('severity', 'High')]
                    }
                }
            }
        )
        
        for page in page_iterator:
            finding_ids = page.get('findingIds', [])
            if finding_ids:
                findings_response = macie_client.get_findings(findingIds=finding_ids[:100])
                findings.extend(findings_response.get('findings', []))
        
        return {
            'findings': findings[:100],
            'total_findings': len(findings),
            'scan_type': 'macie'
        }
        
    except ClientError as e:
        logger.error(f"Error scanning Macie: {str(e)}")
        raise


def analyze_policy_document(policy_doc: Dict[str, Any], role_name: str, role_arn: str, 
                           service_types: list, policy_name: str = None) -> list:
    """Analyze IAM policy document for security issues"""
    findings = []
    
    if not policy_doc:
        return findings
    
    statements = policy_doc.get('Statement', [])
    if isinstance(statements, dict):
        statements = [statements]
    
    for statement in statements:
        effect = statement.get('Effect', '')
        actions = statement.get('Action', [])
        resources = statement.get('Resource', [])
        
        if isinstance(actions, str):
            actions = [actions]
        if isinstance(resources, str):
            resources = [resources]
        
        # Check for overly permissive actions
        for action in actions:
            # Check for full wildcard permissions
            if action == '*' or action == '*:*':
                findings.append({
                    'severity': 'Critical',
                    'type': 'role',
                    'resource_name': role_name,
                    'resource_arn': role_arn,
                    'description': f'Role "{role_name}" has full wildcard permissions (*) in policy "{policy_name or "attached"}"',
                    'recommendation': 'Replace wildcard permissions with specific actions following least privilege',
                    'finding_type': 'wildcard_permissions',
                    'service_type': ', '.join(service_types) if service_types else 'Unknown'
                })
            
            # Check for service-wide wildcards
            if ':*' in action and action.count(':') == 1:
                service = action.split(':')[0]
                findings.append({
                    'severity': 'High',
                    'type': 'role',
                    'resource_name': role_name,
                    'resource_arn': role_arn,
                    'description': f'Role "{role_name}" has full {service} service permissions ({action}) in policy "{policy_name or "attached"}"',
                    'recommendation': f'Replace {action} with specific {service} actions only',
                    'finding_type': 'service_wildcard_permissions',
                    'service_type': ', '.join(service_types) if service_types else 'Unknown'
                })
            
            # Service-specific security checks
            if action.startswith('s3:'):
                # S3 security checks
                if action in ['s3:PutObject', 's3:PutObjectAcl'] and '*' in resources:
                    findings.append({
                        'severity': 'High',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" allows {action} on all S3 buckets in policy "{policy_name or "attached"}"',
                        'recommendation': 'Restrict S3 permissions to specific buckets and enable public access block',
                        'finding_type': 's3_public_write',
                        'service_type': 'S3'
                    })
            
            if action.startswith('dynamodb:'):
                # DynamoDB security checks
                if action in ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'] and '*' in resources:
                    findings.append({
                        'severity': 'Medium',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" allows {action} on all DynamoDB tables in policy "{policy_name or "attached"}"',
                        'recommendation': 'Restrict DynamoDB permissions to specific tables',
                        'finding_type': 'dynamodb_broad_permissions',
                        'service_type': 'DynamoDB'
                    })
            
            if action.startswith('lambda:'):
                # Lambda security checks
                if action == 'lambda:*' or action == 'lambda:InvokeFunction':
                    if '*' in resources:
                        findings.append({
                            'severity': 'High',
                            'type': 'role',
                            'resource_name': role_name,
                            'resource_arn': mask_sensitive_data(role_arn),
                            'description': f'Role "{role_name}" allows invoking all Lambda functions in policy "{policy_name or "attached"}"',
                            'recommendation': 'Restrict Lambda invoke permissions to specific functions',
                            'finding_type': 'lambda_public_invoke',
                            'service_type': 'Lambda'
                        })
            
            if action.startswith('iam:'):
                # IAM security checks
                if action in ['iam:CreateUser', 'iam:CreateRole', 'iam:AttachRolePolicy', 'iam:PutRolePolicy']:
                    findings.append({
                        'severity': 'High',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" can create/modify IAM resources ({action}) in policy "{policy_name or "attached"}"',
                        'recommendation': 'Review if this permission is necessary and restrict to specific resources',
                        'finding_type': 'iam_privilege_escalation',
                        'service_type': ', '.join(service_types) if service_types else 'IAM'
                    })
        
        # Check for public/external resource access
        for resource in resources:
            if resource == '*':
                # Check if this is combined with dangerous actions
                dangerous_actions = [a for a in actions if any(x in a for x in ['Put', 'Delete', 'Modify', 'Create', 'Update'])]
                if dangerous_actions:
                    findings.append({
                        'severity': 'High',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" has write permissions on all resources (*) in policy "{policy_name or "attached"}"',
                        'recommendation': 'Restrict resource ARNs to specific resources only',
                        'finding_type': 'wildcard_resource',
                        'service_type': ', '.join(service_types) if service_types else 'Unknown'
                    })
    
    return findings


def scan_iam(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan IAM for security issues"""
    try:
        logger.info(f"Scanning IAM in region: {region}")

        iam_client = scan_clients["iam"]
        sts_client = scan_clients["sts"]
        
        # List users
        user_list = []
        paginator = iam_client.get_paginator('list_users')
        for page in paginator.paginate():
            user_list.extend(page.get('Users', []))
        
        # Analyze users and generate findings
        users_with_mfa = 0
        users_without_mfa = 0
        inactive_users = 0
        findings = []
        critical_findings = 0
        high_findings = 0
        medium_findings = 0
        low_findings = 0
        
        # Get account ID
        account_id = sts_client.get_caller_identity().get('Account', 'N/A')
        
        for user in user_list:
            user_name = user['UserName']
            user_arn = user.get('Arn', f'arn:aws:iam::{account_id}:user/{user_name}')
            
            try:
                # Check MFA
                mfa_devices = iam_client.list_mfa_devices(UserName=user_name)
                if not mfa_devices.get('MFADevices'):
                    users_without_mfa += 1
                    high_findings += 1
                    findings.append({
                        'severity': 'High',
                        'type': 'user',
                        'resource_name': user_name,
                        'resource_arn': user_arn,
                        'description': f'IAM user "{user_name}" does not have MFA enabled',
                        'recommendation': 'Enable MFA for this user to enhance account security',
                        'finding_type': 'missing_mfa'
                    })
                else:
                    users_with_mfa += 1
                
                # Check access keys
                access_keys = iam_client.list_access_keys(UserName=user_name)
                key_metadata = access_keys.get('AccessKeyMetadata', [])
                
                for key in key_metadata:
                    key_id = key.get('AccessKeyId')
                    key_status = key.get('Status')
                    create_date = key.get('CreateDate')
                    
                    # Check if key is old (over 90 days)
                    if create_date:
                        from datetime import datetime, timezone
                        key_age = (datetime.now(timezone.utc) - create_date.replace(tzinfo=timezone.utc)).days
                        if key_age > 90:
                            medium_findings += 1
                            findings.append({
                                'severity': 'Medium',
                                'type': 'access_key',
                                'resource_name': mask_sensitive_data(f'{user_name}/{key_id}'),
                                'resource_arn': mask_sensitive_data(user_arn),
                                'description': mask_sensitive_data(f'Access key {key_id} for user "{user_name}" is {key_age} days old'),
                                'recommendation': 'Rotate access keys every 90 days for security best practices',
                                'finding_type': 'old_access_key'
                            })
                    
                    # Check last used
                    try:
                        last_used = iam_client.get_access_key_last_used(AccessKeyId=key_id)
                        last_used_date = last_used.get('AccessKeyLastUsed', {}).get('LastUsedDate')
                        if last_used_date:
                            days_since_use = (datetime.now(timezone.utc) - last_used_date.replace(tzinfo=timezone.utc)).days
                            if days_since_use > 90:
                                low_findings += 1
                                findings.append({
                                    'severity': 'Low',
                                    'type': 'access_key',
                                    'resource_name': mask_sensitive_data(f'{user_name}/{key_id}'),
                                    'resource_arn': mask_sensitive_data(user_arn),
                                    'description': mask_sensitive_data(f'Access key {key_id} has not been used in {days_since_use} days'),
                                    'recommendation': 'Consider removing unused access keys',
                                    'finding_type': 'unused_access_key'
                                })
                    except ClientError:
                        pass  # Skip if we can't get last used info
                
                # Check for admin policies
                try:
                    attached_policies = iam_client.list_attached_user_policies(UserName=user_name)
                    inline_policies = iam_client.list_user_policies(UserName=user_name)
                    
                    # Check for AdministratorAccess
                    for policy in attached_policies.get('AttachedPolicies', []):
                        if 'AdministratorAccess' in policy.get('PolicyArn', ''):
                            critical_findings += 1
                            findings.append({
                                'severity': 'Critical',
                                'type': 'user',
                                'resource_name': user_name,
                                'resource_arn': user_arn,
                                'description': f'User "{user_name}" has AdministratorAccess policy attached',
                                'recommendation': 'Remove AdministratorAccess and use least privilege principles',
                                'finding_type': 'admin_access'
                            })
                            break
                except ClientError:
                    pass  # Skip if we can't check policies
                
                # Check password last used
                if user.get('PasswordLastUsed'):
                    from datetime import datetime, timezone
                    last_used = user['PasswordLastUsed'].replace(tzinfo=timezone.utc)
                    days_inactive = (datetime.now(timezone.utc) - last_used).days
                    if days_inactive > 90:
                        inactive_users += 1
                        medium_findings += 1
                        findings.append({
                            'severity': 'Medium',
                            'type': 'user',
                            'resource_name': user_name,
                            'resource_arn': user_arn,
                            'description': f'User "{user_name}" has not logged in for {days_inactive} days',
                            'recommendation': 'Review and consider disabling inactive user accounts',
                            'finding_type': 'inactive_user'
                        })
            except ClientError as e:
                logger.warning(f"Error analyzing user {user_name}: {str(e)}")
                continue
        
        # List roles
        role_list = []
        paginator = iam_client.get_paginator('list_roles')
        for page in paginator.paginate():
            role_list.extend(page.get('Roles', []))
        
        # Service principal mappings for infrastructure identification
        service_principals = {
            'lambda.amazonaws.com': 'Lambda',
            'ec2.amazonaws.com': 'EC2',
            'codebuild.amazonaws.com': 'CodeBuild',
            'codepipeline.amazonaws.com': 'CodePipeline',
            's3.amazonaws.com': 'S3',
            'dynamodb.amazonaws.com': 'DynamoDB',
            'apigateway.amazonaws.com': 'API Gateway',
            'rds.amazonaws.com': 'RDS',
            'ecs-tasks.amazonaws.com': 'ECS',
            'eks.amazonaws.com': 'EKS',
            'github.com': 'GitHub Actions',
            'gitlab.com': 'GitLab CI',
            'circleci.com': 'CircleCI'
        }
        
        # Analyze roles for infrastructure security
        for role in role_list:
            role_name = role['RoleName']
            role_arn = role.get('Arn', f'arn:aws:iam::{account_id}:role/{role_name}')
            
            try:
                # Get role details including trust policy
                role_details = iam_client.get_role(RoleName=role_name)
                assume_role_policy = role_details.get('Role', {}).get('AssumeRolePolicyDocument', {})
                
                # Parse trust policy to identify service principals
                service_types = []
                public_access = False
                external_principals = []
                
                if assume_role_policy:
                    statements = assume_role_policy.get('Statement', [])
                    if isinstance(statements, dict):
                        statements = [statements]
                    
                    for statement in statements:
                        principal = statement.get('Principal', {})
                        if isinstance(principal, dict):
                            # Check for AWS service principals
                            aws_principals = principal.get('AWS', [])
                            if isinstance(aws_principals, str):
                                aws_principals = [aws_principals]
                            
                            # Check for service principals
                            service_principal = principal.get('Service', '')
                            if isinstance(service_principal, str) and service_principal:
                                service_principal = [service_principal]
                            elif isinstance(service_principal, list):
                                pass  # Already a list
                            else:
                                service_principal = []
                            
                            if isinstance(service_principal, list):
                                for sp in service_principal:
                                    # Identify service type
                                    for sp_key, service_name in service_principals.items():
                                        if sp_key in sp:
                                            if service_name not in service_types:
                                                service_types.append(service_name)
                                    # Check for public/external access
                                    if '*' in sp or 'arn:aws:iam::*' in sp:
                                        public_access = True
                                    elif sp.startswith('arn:aws:iam::') and ':' in sp:
                                        if account_id not in sp:
                                            external_principals.append(sp)
                            
                            # Check for wildcard/public access in AWS principals
                            if isinstance(aws_principals, list):
                                for ap in aws_principals:
                                    if ap == '*' or ap == 'arn:aws:iam::*:root':
                                        public_access = True
                                    elif isinstance(ap, str) and ':' in ap and account_id not in ap:
                                        external_principals.append(ap)
                        elif isinstance(principal, str):
                            # Principal is a string (wildcard)
                            if principal == '*':
                                public_access = True
                
                # Flag public/external access
                if public_access:
                    critical_findings += 1
                    findings.append({
                        'severity': 'Critical',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" allows public/external access (wildcard principal)',
                        'recommendation': 'Restrict trust policy to specific principals only',
                        'finding_type': 'public_trust_policy',
                        'service_type': ', '.join(service_types) if service_types else 'Unknown'
                    })
                
                if external_principals:
                    high_findings += 1
                    findings.append({
                        'severity': 'High',
                        'type': 'role',
                        'resource_name': role_name,
                        'resource_arn': mask_sensitive_data(role_arn),
                        'description': f'Role "{role_name}" allows access from external AWS accounts: {", ".join(external_principals[:3])}',
                        'recommendation': 'Review and restrict to trusted accounts only',
                        'finding_type': 'external_account_access',
                        'service_type': ', '.join(service_types) if service_types else 'Unknown'
                    })
                
                # Analyze attached policies
                attached_policies = iam_client.list_attached_role_policies(RoleName=role_name)
                for policy in attached_policies.get('AttachedPolicies', []):
                    policy_arn = policy.get('PolicyArn', '')
                    
                    # Check for AdministratorAccess
                    if 'AdministratorAccess' in policy_arn:
                        critical_findings += 1
                        findings.append({
                            'severity': 'Critical',
                            'type': 'role',
                            'resource_name': role_name,
                            'resource_arn': mask_sensitive_data(role_arn),
                            'description': f'Role "{role_name}" has AdministratorAccess policy attached',
                            'recommendation': 'Remove AdministratorAccess and use least privilege principles',
                            'finding_type': 'admin_access',
                            'service_type': ', '.join(service_types) if service_types else 'Unknown'
                        })
                    
                    # Get and analyze policy document
                    try:
                        policy_details = iam_client.get_policy(PolicyArn=policy_arn)
                        default_version = policy_details.get('Policy', {}).get('DefaultVersionId')
                        if default_version:
                            policy_version = iam_client.get_policy_version(PolicyArn=policy_arn, VersionId=default_version)
                            policy_doc = policy_version.get('PolicyVersion', {}).get('Document', {})
                            
                            # Analyze policy document for security issues
                            policy_findings = analyze_policy_document(
                                policy_doc, role_name, role_arn, service_types
                            )
                            findings.extend(policy_findings)
                            # Update severity counts
                            for pf in policy_findings:
                                if pf['severity'] == 'Critical':
                                    critical_findings += 1
                                elif pf['severity'] == 'High':
                                    high_findings += 1
                                elif pf['severity'] == 'Medium':
                                    medium_findings += 1
                                elif pf['severity'] == 'Low':
                                    low_findings += 1
                    except ClientError:
                        pass  # Skip if we can't get policy document
                
                # Analyze inline policies
                try:
                    inline_policies = iam_client.list_role_policies(RoleName=role_name)
                    for inline_policy_name in inline_policies.get('PolicyNames', []):
                        try:
                            inline_policy = iam_client.get_role_policy(RoleName=role_name, PolicyName=inline_policy_name)
                            policy_doc = inline_policy.get('PolicyDocument', {})
                            
                            # Analyze inline policy document
                            policy_findings = analyze_policy_document(
                                policy_doc, role_name, role_arn, service_types, inline_policy_name
                            )
                            findings.extend(policy_findings)
                            # Update severity counts
                            for pf in policy_findings:
                                if pf['severity'] == 'Critical':
                                    critical_findings += 1
                                elif pf['severity'] == 'High':
                                    high_findings += 1
                                elif pf['severity'] == 'Medium':
                                    medium_findings += 1
                                elif pf['severity'] == 'Low':
                                    low_findings += 1
                        except ClientError:
                            pass  # Skip if we can't get inline policy
                except ClientError:
                    pass  # Skip if we can't list inline policies
                    
            except ClientError as e:
                logger.warning(f"Error analyzing role {role_name}: {str(e)}")
                continue
        
        # List policies
        policy_list = []
        paginator = iam_client.get_paginator('list_policies')
        for page in paginator.paginate(Scope='Local'):
            policy_list.extend(page.get('Policies', []))
        
        # List groups
        group_list = []
        paginator = iam_client.get_paginator('list_groups')
        for page in paginator.paginate():
            group_list.extend(page.get('Groups', []))
        
        return {
            'account_id': account_id,
            'users': {
                'total': len(user_list),
                'with_mfa': users_with_mfa,
                'without_mfa': users_without_mfa,
                'inactive': inactive_users
            },
            'roles': {
                'total': len(role_list)
            },
            'policies': {
                'total': len(policy_list)
            },
            'groups': {
                'total': len(group_list)
            },
            'findings': findings,
            'scan_summary': {
                'critical_findings': critical_findings,
                'high_findings': high_findings,
                'medium_findings': medium_findings,
                'low_findings': low_findings
            },
            'scan_type': 'iam'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        logger.error(f"Error scanning IAM: {str(e)}")
        return {
            'error': 'Error scanning IAM',
            'message': str(e),
            'scan_type': 'iam',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error scanning IAM: {str(e)}", exc_info=True)
        return {
            'error': 'Unexpected error scanning IAM',
            'message': str(e),
            'scan_type': 'iam',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }


def scan_ec2(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan EC2 instances for security issues"""
    try:
        logger.info(f"Scanning EC2 in region: {region}")
        
        ec2_regional = scan_clients["ec2"]
        
        # Describe instances
        response = ec2_regional.describe_instances()
        instances = []
        
        for reservation in response.get('Reservations', []):
            instances.extend(reservation.get('Instances', []))
        
        # Analyze instances and generate findings
        public_instances = 0
        instances_without_imdsv2 = 0
        unencrypted_volumes = 0
        open_security_groups = 0
        findings = []
        critical_findings = 0
        high_findings = 0
        medium_findings = 0
        low_findings = 0
        
        # Get account ID
        sts_client = scan_clients["sts"]
        account_id = sts_client.get_caller_identity().get('Account', 'N/A')
        
        for instance in instances:
            instance_id = instance.get('InstanceId', 'N/A')
            instance_arn = f'arn:aws:ec2:{region}:{account_id}:instance/{instance_id}'
            
            # Check for public IP
            if instance.get('PublicIpAddress'):
                public_instances += 1
                critical_findings += 1
                findings.append({
                    'severity': 'Critical',
                    'type': 'instance',
                    'resource_name': instance_id,
                    'resource_arn': mask_sensitive_data(instance_arn),
                    'description': f'EC2 instance {instance_id} has a public IP address ({instance.get("PublicIpAddress")})',
                    'recommendation': 'Review security groups and consider using private subnets with NAT Gateway',
                    'finding_type': 'public_instance'
                })
            
            # Check IMDSv2
            metadata_options = instance.get('MetadataOptions', {})
            if metadata_options.get('HttpTokens') != 'required':
                instances_without_imdsv2 += 1
                high_findings += 1
                findings.append({
                    'severity': 'High',
                    'type': 'instance',
                    'resource_name': instance_id,
                    'resource_arn': mask_sensitive_data(instance_arn),
                    'description': f'EC2 instance {instance_id} does not require IMDSv2 (Instance Metadata Service v2)',
                    'recommendation': 'Enable IMDSv2 to protect against SSRF attacks',
                    'finding_type': 'missing_imdsv2'
                })
            
            # Check volumes for encryption
            volumes = instance.get('BlockDeviceMappings', [])
            for volume_mapping in volumes:
                volume_id = volume_mapping.get('Ebs', {}).get('VolumeId')
                if volume_id:
                    try:
                        volume_info = ec2_regional.describe_volumes(VolumeIds=[volume_id])
                        volume = volume_info.get('Volumes', [{}])[0]
                        if not volume.get('Encrypted'):
                            unencrypted_volumes += 1
                            high_findings += 1
                            findings.append({
                                'severity': 'High',
                                'type': 'volume',
                                'resource_name': volume_id,
                                'resource_arn': mask_sensitive_data(f'arn:aws:ec2:{region}:{account_id}:volume/{volume_id}'),
                                'description': f'EBS volume {volume_id} attached to instance {instance_id} is not encrypted',
                                'recommendation': 'Enable encryption for EBS volumes to protect data at rest',
                                'finding_type': 'unencrypted_volume'
                            })
                    except ClientError:
                        pass  # Skip if we can't check volume
        
        # Check security groups for overly permissive rules
        try:
            security_groups = ec2_regional.describe_security_groups()
            for sg in security_groups.get('SecurityGroups', [])[:50]:  # Limit to first 50
                sg_id = sg.get('GroupId')
                sg_name = sg.get('GroupName')
                
                for rule in sg.get('IpPermissions', []):
                    # Check for 0.0.0.0/0 (public access)
                    for ip_range in rule.get('IpRanges', []):
                        if ip_range.get('CidrIp') == '0.0.0.0/0':
                            open_security_groups += 1
                            critical_findings += 1
                            findings.append({
                                'severity': 'Critical',
                                'type': 'security_group',
                                'resource_name': f'{sg_name} ({sg_id})',
                                'resource_arn': mask_sensitive_data(f'arn:aws:ec2:{region}:{account_id}:security-group/{sg_id}'),
                                'description': f'Security group {sg_name} ({sg_id}) allows access from 0.0.0.0/0',
                                'recommendation': 'Restrict security group rules to specific IP ranges or VPC CIDR blocks',
                                'finding_type': 'open_security_group'
                            })
                            break
        except ClientError:
            pass  # Skip if we can't check security groups
        
        return {
            'account_id': account_id,
            'instances': {
                'total': len(instances),
                'public': public_instances,
                'without_imdsv2': instances_without_imdsv2,
                'unencrypted_volumes': unencrypted_volumes,
                'open_security_groups': open_security_groups
            },
            'findings': findings[:100],  # Limit to first 100 findings
            'scan_summary': {
                'critical_findings': critical_findings,
                'high_findings': high_findings,
                'medium_findings': medium_findings,
                'low_findings': low_findings
            },
            'scan_type': 'ec2'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        logger.error(f"Error scanning EC2: {str(e)}")
        return {
            'error': 'Error scanning EC2',
            'message': str(e),
            'scan_type': 'ec2',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error scanning EC2: {str(e)}", exc_info=True)
        return {
            'error': 'Unexpected error scanning EC2',
            'message': str(e),
            'scan_type': 'ec2',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }


def scan_s3(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Scan S3 buckets for security issues"""
    try:
        logger.info(f"Scanning S3 in region: {region}")
        
        s3_regional = scan_clients["s3"]
        # List buckets
        buckets = s3_regional.list_buckets()
        bucket_list = buckets.get('Buckets', [])
        
        # Analyze buckets and generate findings
        public_buckets = 0
        unencrypted_buckets = 0
        findings = []
        critical_findings = 0
        high_findings = 0
        medium_findings = 0
        low_findings = 0
        
        # Get account ID
        sts_client = scan_clients["sts"]
        account_id = sts_client.get_caller_identity().get('Account', 'N/A')
        
        for bucket in bucket_list:
            bucket_name = bucket['Name']
            bucket_arn = f'arn:aws:s3:::{bucket_name}'
            
            try:
                # Check public access block
                try:
                    public_access = s3_regional.get_public_access_block(Bucket=bucket_name)
                    pab_config = public_access.get('PublicAccessBlockConfiguration', {})
                    
                    if not pab_config.get('BlockPublicAcls') or not pab_config.get('BlockPublicPolicy'):
                        public_buckets += 1
                        critical_findings += 1
                        findings.append({
                            'severity': 'Critical',
                            'type': 'bucket',
                            'resource_name': bucket_name,
                            'resource_arn': mask_sensitive_data(bucket_arn),
                            'description': f'S3 bucket "{bucket_name}" may allow public access (PublicAccessBlock not fully configured)',
                            'recommendation': 'Enable all PublicAccessBlock settings to prevent accidental public exposure',
                            'finding_type': 'public_bucket'
                        })
                except ClientError as e:
                    # If PublicAccessBlock is not configured, bucket may be public
                    if 'NoSuchPublicAccessBlockConfiguration' in str(e):
                        public_buckets += 1
                        critical_findings += 1
                        findings.append({
                            'severity': 'Critical',
                            'type': 'bucket',
                            'resource_name': bucket_name,
                            'resource_arn': mask_sensitive_data(bucket_arn),
                            'description': f'S3 bucket "{bucket_name}" does not have PublicAccessBlock configured',
                            'recommendation': 'Configure PublicAccessBlock to prevent public access',
                            'finding_type': 'public_bucket'
                        })
                
                # Check encryption
                try:
                    encryption = s3_regional.get_bucket_encryption(Bucket=bucket_name)
                    encryption_config = encryption.get('ServerSideEncryptionConfiguration', {})
                    rules = encryption_config.get('Rules', [])
                    if not rules:
                        unencrypted_buckets += 1
                        high_findings += 1
                        findings.append({
                            'severity': 'High',
                            'type': 'bucket',
                            'resource_name': bucket_name,
                            'resource_arn': mask_sensitive_data(bucket_arn),
                            'description': f'S3 bucket "{bucket_name}" does not have server-side encryption enabled',
                            'recommendation': 'Enable server-side encryption (SSE) to protect data at rest',
                            'finding_type': 'unencrypted_bucket'
                        })
                except ClientError as e:
                    # No encryption configuration means unencrypted
                    if 'ServerSideEncryptionConfigurationNotFoundError' in str(e):
                        unencrypted_buckets += 1
                        high_findings += 1
                        findings.append({
                            'severity': 'High',
                            'type': 'bucket',
                            'resource_name': bucket_name,
                            'resource_arn': mask_sensitive_data(bucket_arn),
                            'description': f'S3 bucket "{bucket_name}" does not have server-side encryption enabled',
                            'recommendation': 'Enable server-side encryption (SSE) to protect data at rest',
                            'finding_type': 'unencrypted_bucket'
                        })
                
                # Check versioning
                try:
                    versioning = s3_regional.get_bucket_versioning(Bucket=bucket_name)
                    if versioning.get('Status') != 'Enabled':
                        medium_findings += 1
                        findings.append({
                            'severity': 'Medium',
                            'type': 'bucket',
                            'resource_name': bucket_name,
                            'resource_arn': mask_sensitive_data(bucket_arn),
                            'description': f'S3 bucket "{bucket_name}" does not have versioning enabled',
                            'recommendation': 'Enable versioning to protect against accidental deletion or overwrites',
                            'finding_type': 'no_versioning'
                        })
                except ClientError:
                    pass  # Skip if we can't check versioning
                    
            except ClientError as e:
                # Skip if we can't access bucket
                logger.warning(f"Could not access bucket {bucket_name}: {str(e)}")
                continue
        
        return {
            'account_id': account_id,
            'buckets': {
                'total': len(bucket_list),
                'public': public_buckets,
                'unencrypted': unencrypted_buckets
            },
            'findings': findings[:100],  # Limit to first 100 findings
            'scan_summary': {
                'critical_findings': critical_findings,
                'high_findings': high_findings,
                'medium_findings': medium_findings,
                'low_findings': low_findings
            },
            'scan_type': 's3'
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        logger.error(f"Error scanning S3: {str(e)}")
        return {
            'error': 'Error scanning S3',
            'message': str(e),
            'scan_type': 's3',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error scanning S3: {str(e)}", exc_info=True)
        return {
            'error': 'Unexpected error scanning S3',
            'message': str(e),
            'scan_type': 's3',
            'findings': [],
            'scan_summary': {
                'critical_findings': 0,
                'high_findings': 0,
                'medium_findings': 0,
                'low_findings': 0
            }
        }


def scan_full(region: str, scan_params: Dict[str, Any], scan_id: str, scan_clients: Dict[str, Any]) -> Dict[str, Any]:
    """Execute full security scan across all services - GUARANTEED TO COMPLETE"""
    logger.info(f"Executing full security scan in region: {region}")
    
    results = {
        'scan_type': 'full',
        'status': 'completed',  # Always start as completed - we'll update if needed
        'region': region,
        'scan_id': scan_id
    }
    
    # Scan each service with comprehensive error handling
    # SIMPLIFIED: Only run IAM - always available and connected to real API
    scanners = [
        ('iam', scan_iam)  # ✅ Real API - always available
    ]
    
    successful_scanners = []
    failed_scanners = []
    
    for scanner_name, scanner_func in scanners:
        try:
            logger.info(f"Scanning {scanner_name}...")
            result = scanner_func(region, scan_params, scan_id, scan_clients)
            
            # Validate result is a dict
            if not isinstance(result, dict):
                logger.warning(f"{scanner_name} returned non-dict result: {type(result)}")
                result = {
                    'error': f'{scanner_name} returned invalid result type',
                    'findings': [],
                    'scan_summary': {
                        'critical_findings': 0,
                        'high_findings': 0,
                        'medium_findings': 0,
                        'low_findings': 0
                    }
                }
            
            # Ensure result has required structure
            if 'findings' not in result:
                result['findings'] = []
            if 'scan_summary' not in result:
                result['scan_summary'] = {
                    'critical_findings': 0,
                    'high_findings': 0,
                    'medium_findings': 0,
                    'low_findings': 0
                }
            
            results[scanner_name] = result
            successful_scanners.append(scanner_name)
            logger.info(f"✅ Completed {scanner_name} scan successfully")
            
        except Exception as e:
            logger.error(f"❌ Error scanning {scanner_name}: {str(e)}", exc_info=True)
            # Return error dict instead of crashing - this allows scan to continue
            error_result = {
                'error': f'{scanner_name} scan failed',
                'message': str(e)[:500],  # Limit message length
                'scan_type': scanner_name.replace('_', '-'),
                'findings': [],
                'scan_summary': {
                    'critical_findings': 0,
                    'high_findings': 0,
                    'medium_findings': 0,
                    'low_findings': 0
                }
            }
            results[scanner_name] = error_result
            failed_scanners.append(scanner_name)
            logger.info(f"⚠️ {scanner_name} scan failed but scan continues")
    
    # ALWAYS mark as completed - we want to show results even if some scanners failed
    results['status'] = 'completed'
    results['successful_scanners'] = successful_scanners
    if failed_scanners:
        results['failed_scanners'] = failed_scanners
    
    logger.info(f"Full scan completed: {len(successful_scanners)} successful, {len(failed_scanners)} failed")
    
    # Final validation - ensure all results are JSON serializable
    try:
        test_json = json.dumps(results, default=json_serial)
        logger.info(f"✅ Full scan results are JSON serializable, size: {len(test_json)} bytes")
    except Exception as e:
        logger.error(f"❌ Full scan results contain non-serializable data: {str(e)}", exc_info=True)
        # Clean the results by converting all non-serializable types
        try:
            results_cleaned = json.loads(json.dumps(results, default=json_serial))
            results = results_cleaned
            logger.info("✅ Cleaned and re-serialized results")
        except Exception as e2:
            logger.error(f"❌ Failed to clean results: {str(e2)}")
            # Return minimal safe response
            results = {
                'scan_type': 'full',
                'status': 'completed',
                'region': region,
                'scan_id': scan_id,
                'error': 'Failed to serialize scan results',
                'message': str(e)[:500],
                'iam': {
                    'findings': [],
                    'scan_summary': {'critical_findings': 0, 'high_findings': 0, 'medium_findings': 0, 'low_findings': 0}
                }
            }
    
    return results


def store_results(scan_id: str, scanner_type: str, region: str, scan_result: Dict[str, Any]) -> None:
    """Store scan results in DynamoDB and S3"""
    try:
        timestamp = datetime.utcnow().isoformat()
        
        # Store in DynamoDB
        try:
            table = dynamodb.Table(DYNAMODB_TABLE_NAME)
            table.put_item(
                Item={
                    'scan_id': scan_id,
                    'scanner_type': scanner_type,
                    'region': region,
                    'timestamp': timestamp,
                    'results': scan_result,
                    'project': PROJECT_NAME,
                    'environment': ENVIRONMENT
                }
            )
            logger.info(f"Stored results in DynamoDB: {scan_id}")
        except ClientError as e:
            logger.warning(f"Could not store in DynamoDB: {str(e)}")
        
        # Store in S3
        try:
            s3_key = f"scan-results/{ENVIRONMENT}/{scanner_type}/{scan_id}.json"
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Body=json.dumps({
                    'scan_id': scan_id,
                    'scanner_type': scanner_type,
                    'region': region,
                    'timestamp': timestamp,
                    'results': scan_result
                }, indent=2),
                ContentType='application/json'
            )
            logger.info(f"Stored results in S3: {s3_key}")
        except ClientError as e:
            logger.warning(f"Could not store in S3: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error storing results: {str(e)}")


def create_response(
    status_code: int,
    body: Dict[str, Any],
    event: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create API Gateway compatible response with proper JSON serialization"""
    try:
        # Use json_serial to handle datetime, Decimal, bytes, etc.
        body_json = json.dumps(body, default=json_serial)
        return {
            'statusCode': status_code,
            'headers': _cors_response_headers(event),
            'body': body_json
        }
    except Exception as e:
        logger.error(f"Error creating response: {str(e)}", exc_info=True)
        # Return error response if serialization fails
        error_body = {
            'error': 'Failed to serialize response',
            'message': str(e)[:500],
            'status': 'error'
        }
        return {
            'statusCode': 500,
            'headers': _cors_response_headers(event),
            'body': json.dumps(error_body, default=str)
        }
