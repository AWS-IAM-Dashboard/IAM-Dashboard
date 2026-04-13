# S16 — Backend Authorization Review

**Scope:** Scanner Lambda (`infra/lambda/lambda_function.py`) — HTTP traffic via API Gateway for `POST /scan/{scanner_type}`.  
**Related:** [RBAC_Flow.md](./RBAC_Flow.md)

---

## 1. Authentication (session cookie, 401)

- The browser sends an HttpOnly session cookie named **`iamdash_session`**. The Lambda reads it from the API Gateway **`cookies`** array and/or the **`Cookie`** header.
- The cookie value is a **`session_id`**. The Lambda loads the session from **DynamoDB** (`SESSION_TABLE_NAME`). Missing row, expired `expires_at`, or absent cookie → **`UnauthorizedError`** → **HTTP 401** with body `{"error": "Authentication required"}`.
- If DynamoDB access fails during session read/delete, the Lambda returns **HTTP 500** `{"error": "Unable to process request"}` (fail closed; no anonymous fallback).

**Applies only when the event is treated as an HTTP API Gateway invocation** (`httpMethod` or `requestContext` present in the event). Other event shapes skip this path.

---

## 2. Authorization (Cognito groups, 403, admin vs non-admin)

- After a valid session, the Lambda uses the session’s **`groups`** list (normalized strings). These reflect **Cognito group membership captured at login** (see [RBAC_Flow.md](./RBAC_Flow.md)).
- **`require_groups`** enforces which **`scanner_type`** the caller may run:
  - Users in **`admin`** may invoke **any** supported scanner, including **`full`**.
  - **`full`** is **admin-only**; any authenticated non-admin receives **`ForbiddenError`** → **HTTP 403** with a forbidden message in the JSON body.
  - For other types, each non-admin group maps to at most one scanner via **`SCANNER_GROUP_MAP`** (e.g. `iam` → `iam`, `ec2` → `ec2`, `securityhub` → `security-hub`, plus `guardduty`, `config`, `inspector`, `macie`). The user must hold a group whose mapped type matches the requested path.
- Users with multiple groups receive the **union** of permitted scanner types.

---

## 3. Findings (what is working)

| Area | Observation |
|------|-------------|
| **Session-bound authn** | HTTP scan requests require a valid server-side session; anonymous callers get **401**. |
| **Group-based authz** | Non-admin users are restricted to scanner types aligned with their Cognito groups; mismatches yield **403**. |
| **Privileged operation** | **`full`** scan is explicitly restricted to **`admin`**. |
| **Session store failures** | Auth store errors surface as **500**, not silent allow. |
| **Documentation** | RBAC behavior and direct-invoke semantics are described in [RBAC_Flow.md](./RBAC_Flow.md). |

---

## 4. Gaps

| Gap | Detail |
|-----|--------|
| **No dedicated viewer role** | There is no first-class **read-only** vs **scan** permission in the Lambda. Groups not in `SCANNER_GROUP_MAP` cannot run scans but there is no separate “viewer” capability defined here. |
| **No per-account (or per-tenant) scoping** | Authorization does not bind a user to specific AWS accounts. Scans execute under the **Lambda execution role**; the UI’s account selection is not a server-side access-control boundary in this handler. |
| **Direct Lambda invocation bypass** | Events without HTTP API Gateway shape **do not** run session or group checks. Anyone with **`lambda:InvokeFunction`** on this function can trigger scans without Cognito/session. |
| **API Gateway may not enforce auth** | Scan routes may use `authorization_type = NONE` at the gateway while the Lambda enforces the session. Unauthenticated requests still reach the Lambda (then **401**). Defense-in-depth depends on gateway/WAF configuration and operational discipline. |
| **No separate VPC scanner RBAC** | Supported types include `iam`, `ec2`, `s3`, etc. VPC-oriented flows that call **`/scan/ec2`** are governed by **EC2** group membership only. |

---

## 5. Risks

- **Over-privileged invoke principals:** Broad `lambda:InvokeFunction` grants negate Cognito/RBAC for batch jobs, compromised credentials, or misconfigured roles.
- **Shared execution identity:** All authorized HTTP users effectively delegate AWS access to the **same** Lambda role; compromise of the function or role has wide blast radius.
- **Session fixation / theft:** Standard cookie and session hygiene (TLS, `Secure`/`HttpOnly`, rotation, short TTL) matter; this document does not audit the auth Lambda or cookie flags.
- **Confused deputy / UI mismatch:** Users may believe the dashboard “account switcher” limits backend access; without server-side account binding, that belief is unsafe.

---

## 6. Recommendations

1. **Treat direct invoke as a controlled interface:** Restrict invocation to specific roles; use tools/scanners only via HTTP path if Cognito alignment is required; document exceptions.
2. **Add per-account (or org) authorization** if multi-account is a requirement: e.g. map users to allowed account IDs and assume role / resource policy checks before `execute_scan`.
3. **Introduce a viewer / read-only model** if product needs it: separate routes and checks (e.g. `GET` latest results) with a Cognito group that **cannot** `POST /scan/*`.
4. **Optional API Gateway hardening:** Consider JWT or custom authorizer at the edge **in addition to** session validation if defense-in-depth or uniform policy is desired (coordinate with cookie-based session design).
5. **Operational monitoring:** Alert on high **401/403** rates and on **direct** invocations if distinguishable in logs/metrics.

---

*This review reflects the scanner Lambda as implemented in the repository at the time of writing.*
