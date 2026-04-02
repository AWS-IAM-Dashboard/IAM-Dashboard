# S15 — Cognito & OAuth (Hosted UI) configuration review

**Task:** Security review of Cognito User Pool and OAuth-related setup (GitHub #127).  
**Scope:** Terraform in this repository as of review; live AWS may differ if Console or non-committed `tfvars` were used.  
**Related docs:** [`infra/cognito/COGNITO_CONFIG.md`](../../infra/cognito/COGNITO_CONFIG.md), [`docs/backend/Authentication_Flow.md`](../backend/Authentication_Flow.md).

---

## Executive summary

The Cognito module (`infra/cognito/`) provisions a user pool, SPA app client, hosted UI domain prefix, and an `admin` group. The primary app flow documented today is **BFF session cookies** (auth Lambda + DynamoDB), not browser-held JWTs; Hosted UI / OAuth code flow remains configured on the app client for compatibility and future use.

Main gaps to address for production readiness: **MFA is off**, **token lifetimes are not pinned in Terraform** (AWS defaults apply), **scanner API CORS defaults to `*`**, and **redirect/CORS URL lists must stay aligned** per environment.

---

## Checklist (per issue)

| Area | Source in repo | Result |
|------|----------------|--------|
| Token expiry | `aws_cognito_user_pool_client.spa` | **Not set in Terraform** — access / ID / refresh validity use provider defaults; confirm in AWS Console or add explicit attributes. |
| Scopes | `infra/cognito/main.tf` | `openid`, `email`, `profile` — appropriate baseline; `profile` can be dropped if unused. |
| Redirect URIs | `var.cognito_allowed_urls` → `callback_urls` / `logout_urls` | **Explicit list** (defaults include localhost + one CloudFront URL). **Exact string match** required by Cognito. |
| CORS | Auth API: `infra/API_Gateway_Auth/`; Scanner API: `infra/api-gateway/` | Auth API: `allow_credentials = true`, origins from `var.allowed_urls`. Scanner module **does not** override CORS from root — **defaults to `allow_origins = ["*"]`** in `infra/api-gateway/variables.tf`. |
| Password / MFA | User pool in `infra/cognito/main.tf` | Password policy enforced (8 chars, complexity). **MFA: OFF** at pool level. |

---

## Findings (with severity)

| ID | Severity | Finding | Risk / notes |
|----|----------|---------|----------------|
| F1 | **High** | `mfa_configuration = "OFF"` on the user pool | Credential-stuffing and password compromise are not mitigated by a second factor. |
| F2 | **Medium** | No `access_token_validity`, `id_token_validity`, `refresh_token_validity` (or `token_validity_units`) on the app client in Terraform | Operational ambiguity and possible overly long-lived tokens vs policy. Stolen refresh tokens may remain valid longer than intended. |
| F3 | **Medium** | Scanner HTTP API CORS allows `["*"]` by default; `module "api_gateway"` does not pass `cors_allowed_origins` from root | Any origin can trigger browser CORS preflight allowances for that API surface; combine with **S16/S17** (no gateway auth on scanner routes today) for full risk picture. |
| F4 | **Medium** | Default `cognito_allowed_urls` embeds a **specific CloudFront hostname** in `infra/variables.tf` | Stale or wrong distribution after infra changes; risk of **broken OAuth redirects** or **accidentally allowing an old deployment**. |
| F5 | **Low** | `callback_urls` and `logout_urls` both map to the **same** variable (`cognito_allowed_urls`) | Usually fine; if logout URLs must differ, split variables. |
| F6 | **Low** | Root variable `allowed_urls` is described as Cognito sign-out in a comment but is wired to **auth API Gateway CORS** (`cors_allowed_origins`), while Cognito uses `cognito_allowed_urls` | Documentation drift in `infra/variables.tf`; easy to update wrong list when URLs change. |
| F7 | **Low** | Password minimum length **8** | Acceptable minimum; many orgs standardize on **12+** for production. |
| F8 | **Informational** | `allow_admin_create_user_only = true` | Good for internal dashboards — no self-sign-up. |
| F9 | **Informational** | Only Cognito group defined in Terraform is **`admin`** | RBAC beyond “admin vs everyone” needs more groups + enforcement in **session/API** (see S16). |
| F10 | **Informational** | `prevent_user_existence_errors = "ENABLED"` | Reduces user enumeration on supported flows; aligns with common hardening guidance. |

---

## OAuth / Hosted UI (app client)

- **Flows:** Authorization code only; public client (`generate_secret = false`).
- **Identity providers:** Cognito only (`COGNITO`).
- **Explicit auth flows:** Refresh, USER_PASSWORD_AUTH, USER_SRP_AUTH — required for **BFF `InitiateAuth`** style login documented in `Authentication_Flow.md`.
- **Hosted UI domain:** `cognito_domain_prefix` → `{prefix}.auth.{region}.amazoncognito.com`.

---

## CORS vs redirect URIs (DevOps note)

- **Cognito OAuth** redirect URIs must match **exactly** what the app / Hosted UI uses (including trailing slash if registered that way). Defaults mix `http://localhost:3001/` (with slash) and `https://…cloudfront.net/` (with slash).
- **Auth API** CORS origins use `var.allowed_urls` (defaults **without** trailing slash on the same hosts). Browser `Origin` is typically scheme + host + port, so this is usually consistent — but **when changing frontend URLs, update both `cognito_allowed_urls` and `allowed_urls`** (and verify OAuth redirect URIs in Console after apply).

---

## Recommendations (Backend / DevOps)

1. **MFA (F1):** Decide policy (off / optional / required) per environment; for production, plan **required MFA** or **risk-based** controls, then implement via Terraform + user comms.
2. **Token validity (F2):** Add explicit token validity to `aws_cognito_user_pool_client.spa` (and refresh token rotation if product agrees), document chosen values in this file.
3. **Scanner CORS (F3):** Pass explicit `cors_allowed_origins` from root `main.tf` into `module.api_gateway` (mirror `allowed_urls` or env-specific list); avoid `*` for any API meant to be browser-accessible with credentials or sensitive responses.
4. **Environment-specific URLs (F4, F6):** Move real URLs out of committed defaults into `terraform.tfvars` (gitignored) or CI variables; fix the misleading `allowed_urls` variable description in `infra/variables.tf`.
5. **Drift check:** Compare Terraform state / plan output with **Cognito Console** (sign-in experience, app client, domain) before Demo Day.
6. **Auth Lambda (out of repo):** Confirm session cookie attributes (`HttpOnly`, `Secure`, `SameSite`) and that **Cognito groups** are reflected in `GET /auth/session` for future RBAC.

---

## Limitations

- This report does **not** inspect the deployed **auth Lambda** source (e.g. `test-BFF`) or live DynamoDB session schema.
- **AWS default** token durations were not verified in Console; treat F2 as “confirm and codify.”

---

## References (paths)

| Resource | Path |
|----------|------|
| Cognito Terraform | `infra/cognito/main.tf`, `infra/cognito/variables.tf` |
| Root wiring | `infra/main.tf` (modules `cognito`, `auth_api_gateway`, `api_gateway`) |
| Root defaults | `infra/variables.tf` (`cognito_allowed_urls`, `allowed_urls`) |
| Auth API CORS | `infra/API_Gateway_Auth/main.tf` |
| Scanner API CORS | `infra/api-gateway/main.tf`, `infra/api-gateway/variables.tf` |
