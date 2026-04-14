# RBAC Flow

The IAM Dashboard uses session-cookie-based RBAC to control which users can trigger
which security scans. Authentication and authorization are split across two Lambdas:
an auth Lambda handles login, session creation, and logout; the scanner Lambda enforces
group-based access control on every scan request. Both are exposed through separate API
Gateway routes that share a common host (required for browser cookie scope).

---

## Authentication Prerequisites

Before RBAC is enforced, the user must authenticate via the auth API:

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | Authenticates against Cognito, creates a server-side session record in DynamoDB, sets an HttpOnly `iamdash_session` cookie in the browser |
| `GET /auth/session` | Validates the current cookie and returns the authenticated user |
| `POST /auth/logout` | Deletes the session from DynamoDB and clears the cookie |

The DynamoDB session record contains:

- `session_id` — opaque identifier stored in the cookie
- `username` — authenticated Cognito username
- `groups` — list of Cognito groups the user belongs to
- `expires_at` — Unix timestamp after which the session is invalid

The `groups` field is sourced directly from Cognito and reflects the user's Cognito
group membership at login time.

If you want a more in-depth explanation of how the authentication flow works checkout [Authentication_Flow](../backend/Authentication_Flow.md)

---

## RBAC Enforcement in the Scanner Lambda

### Cookie Extraction

On every HTTP-triggered scan request, the scanner Lambda extracts the `iamdash_session`
cookie via `parse_request_cookies`. It supports both the `cookies` array format used by
API Gateway v2 HTTP APIs and the `Cookie` header format, so the same code works across
both integration styles.

### Session Lookup

The session ID from the cookie is passed to `get_session`, which looks up the record in
the DynamoDB table configured by the `SESSION_TABLE_NAME` environment variable
(default: `iam-dashboard-auth-sessions-test`).

- If no record is found, or the record's `expires_at` is in the past, the session is
  treated as invalid. Expired records are deleted from DynamoDB before returning.
- A missing or expired session returns **401 Authentication required**.
- If the DynamoDB lookup itself fails (network error, permissions issue), the Lambda
  returns **500 Unable to process request** and fails closed — it does not fall back to
  an unauthenticated state.

### Group-Based Authorization

After a valid session is confirmed, `require_groups` checks whether the authenticated
user is permitted to run the requested scanner type.

The `groups` field from the session record is normalized into a set of strings. The
Lambda maintains a `SCANNER_GROUP_MAP` that maps each Cognito group name to the scanner
type it is permitted to run:

| Cognito group | Permitted scanner type |
|---|---|
| `admin` | All scanner types, including `full` |
| `iam` | `iam` |
| `ec2` | `ec2` |
| `s3` | `s3` |
| `guardduty` | `guardduty` |
| `config` | `config` |
| `inspector` | `inspector` |
| `macie` | `macie` |
| `securityhub` | `security-hub` |

> [!NOTE] 
> The Cognito group name `securityhub` maps to the scanner type `security-hub`.
> This normalization is handled inside `require_groups`.

Authorization logic:

1. If the user is in the `admin` group, they are immediately authorized for any scanner
   type including `full`.
2. If the requested scanner type is `full` and the user is not `admin`, the request is
   rejected with **403 Forbidden**.
3. For all other scanner types, the user's groups are checked against `SCANNER_GROUP_MAP`.
   If any group maps to the requested scanner type, the request is authorized.
4. Users in multiple groups can run all their permitted scanner types — a user in both
   `iam` and `ec2` can trigger both scans independently.
5. Users with no matching group receive **403 Forbidden**.

### Error Responses

| Status | Body | Cause |
|---|---|---|
| `401` | `{"error": "Authentication required"}` | Missing or expired session cookie |
| `403` | `{"error": "Forbidden"}` | Authenticated but no group maps to the requested scanner type, or non-admin attempting `full` |
| `500` | `{"error": "Unable to process request"}` | DynamoDB session store failure |

### Direct Invocation Bypass

RBAC is only enforced on HTTP-triggered invocations (API Gateway). Direct Lambda
invocations — via the AWS CLI, EventBridge, or other AWS-internal callers — bypass
session auth entirely. The Lambda detects HTTP context by checking for `httpMethod` or
`requestContext` in the event; if neither is present, auth is skipped.

This is intentional: direct invocations are not browser-originated requests and do not
carry a session cookie.

---

## Future Extensibility

The current implementation uses a flat group-to-scanner mapping. To extend it:

- **Add a new scanner type**: add an entry to `SCANNER_GROUP_MAP` and a corresponding
  Cognito group.
- **Add finer-grained permissions** (e.g. read-only vs scan-trigger): extend
  `require_groups` to accept a permission level in addition to scanner type, and update
  the map values accordingly.
- **Support multiple groups per scanner**: the map values can be changed from a single
  string to a set if multiple groups should share access to the same scanner.

All changes are localized to `SCANNER_GROUP_MAP` and `require_groups` in
`infra/lambda/lambda_function.py`.
