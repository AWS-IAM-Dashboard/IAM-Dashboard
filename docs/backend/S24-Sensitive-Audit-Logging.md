# S24 — Audit logging for sensitive actions

**Issue:** S24 / #186 — security review and compliance for sensitive operations.  
**Log destination:** [Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html).

---

## 1. CloudWatch log groups and retention

| Source | Log group pattern | Retention (Terraform) | Notes |
|--------|-------------------|----------------------|--------|
| Scanner Lambda | `/aws/lambda/<scanner-function-name>` | **365 days** (`infra/lambda/main.tf`) | Emits structured `SENSITIVE_AUDIT` lines (see §2). |
| HTTP API (main API) | `/aws/apigwv2/<api-name>/<stage>/access` | **365 days** (`infra/api-gateway/main.tf`) | JSON access fields: `requestId`, `ip`, `routeKey`, `httpMethod`, `status`, `userAgent`, `requestTime`. |
| Auth Lambda | `/aws/lambda/<auth-function-name>` | Set in AWS Console or Terraform for that function | **Source code is not in this repository**; login/logout/session validation should emit the same schema (§2) when implemented there. |

If a log group already existed before Terraform managed it, import or align retention manually so it matches policy.

---

## 2. Structured audit schema (`iamdash_sensitive_action_v1`)

Scanner Lambda writes **one log line per event** with the literal prefix `SENSITIVE_AUDIT` followed by a JSON object (parse the substring after the prefix for analysis).

| Field | Type | Description |
|-------|------|-------------|
| `audit_schema` | string | Constant: `iamdash_sensitive_action_v1`. |
| `timestamp_utc` | string | ISO-8601 UTC time of the record. |
| `action` | string | `scan_triggered`, `scan_access_denied`, or (from other services) `login`, `logout`, `account_connected`, `role_changed`. |
| `resource` | string | Logical resource, e.g. `scan:iam`, `scan:full`. |
| `actor_username` | string or null | Cognito username from session, or `lambda_direct_invocation` for non-HTTP invokes, or null when unknown. |
| `actor_groups` | array of string | Cognito groups from session (scanner path only); omitted when not applicable. |
| `environment` | string | Lambda `ENVIRONMENT`. |
| `project` | string | Lambda `PROJECT_NAME`. |
| `details` | object | Context: `scanner_type`, `region`, `scan_id`, `target_account_id` (from request body when present), `reason` (`unauthenticated` / `insufficient_privilege`), etc. |
| `http` | object | When the call is HTTP: `request_id`, `source_ip`, `user_agent`, `http_method`, `path` when available from API Gateway. |

### Example (scan allowed)

```json
{
  "audit_schema": "iamdash_sensitive_action_v1",
  "timestamp_utc": "2026-04-13T12:00:00.000000Z",
  "action": "scan_triggered",
  "resource": "scan:iam",
  "actor_username": "jdoe",
  "actor_groups": ["iam"],
  "environment": "prod",
  "project": "IAMDash",
  "details": {
    "scanner_type": "iam",
    "region": "us-east-1",
    "scan_id": "iam-2026-04-13T12:00:00",
    "target_account_id": "123456789012"
  },
  "http": {
    "request_id": "abc-123",
    "source_ip": "198.51.100.10",
    "user_agent": "Mozilla/5.0 ...",
    "http_method": "POST",
    "path": "/scan/iam"
  }
}
```

### CloudWatch Logs Insights (scanner)

- **Log group:** `/aws/lambda/<scanner-function-name>`
- **Filter:** `@message like /SENSITIVE_AUDIT/`
- Parse JSON: use `parse @message /SENSITIVE_AUDIT (?<audit>.*)/` then `parse audit @audit` if your query language supports chained parse, or export to S3/OpenSearch for heavy analytics.

---

## 3. Event coverage vs. implementation

| Event | Where it should be logged | Status in repo |
|-------|---------------------------|----------------|
| Login | Auth Lambda (after successful Cognito auth) | **Documented only** — implement in auth Lambda codebase with `action: login` and `http` context; do not log passwords. |
| Logout | Auth Lambda (session removed) | **Documented only** — same schema with `action: logout`. |
| Scan trigger | Scanner Lambda | **Implemented** — `scan_triggered` after authorization succeeds. |
| Scan denied (401/403) | Scanner Lambda | **Implemented** — `scan_access_denied` with `reason` in `details`. |
| Account connection | Account-registration API / Lambda (when deployed) | **Not in repo** — use `action: account_connected` (or `account_disconnected`) and `details` with `account_id` / `account_name` (avoid secrets). |
| Role / group changes | Cognito admin operations | Prefer **AWS CloudTrail** (`cognito-idp` events such as `AdminAddUserToGroup`) for IAM/Cognito changes; optionally mirror with `action: role_changed` in the component that performs the change. |

---

## 4. Compliance notes

- **Who / what / when / context:** Covered by `actor_username`, `actor_groups`, `resource`, `details`, `timestamp_utc`, and `http` (IP, request id).
- **Secrets:** Scanner logging continues to redact cookies in generic `Received event` logs (`sanitize_event_for_logging`); audit lines must never include session cookies or passwords.
- **Retention:** Align all production log groups to organizational policy (365 days matches current API Gateway Terraform).
