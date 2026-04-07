# CORS configuration

**Review date:** 2026-04-02

This document records **approved browser origins** and the **outcome of the CORS review** (restrict API Gateway and backend APIs to intended origins). Implementation details live in Terraform, the scanner Lambda, and Flask as summarized below.

## Approved origins

Browser origins allowed to call the dashboard APIs (scheme + host + port, no path). Update production when the SPA URL changes.

| Environment | Origins |
|-------------|---------|
| Local development | `http://localhost:3001`, `http://localhost:5173`, `http://localhost:5001` |
| Production (example) | `https://d33ytnxd7i6mo9.cloudfront.net` |

**Terraform:** `allowed_urls` in [`infra/variables.tf`](../../infra/variables.tf) (and overrides in `terraform.tfvars`) drives scanner and auth HTTP APIs and the scanner Lambda allowlist. **Cognito:** keep `cognito_allowed_urls` aligned with the same front-end URLs (callbacks often use a trailing `/`).

## Review outcome

1. **Scanner HTTP API (API Gateway):** `allow_origins` is set from `var.allowed_urls` at the root module; the scanner module default is no longer `*`.
2. **Auth HTTP API:** CORS origins match `var.allowed_urls`; `allow_credentials` remains enabled for session cookies.
3. **Scanner Lambda:** Response headers set `Access-Control-Allow-Origin` only when the request `Origin` is in the allowlist (`CORS_ALLOWED_ORIGINS` from Terraform), not `*`.
4. **Local Flask:** CORS uses an explicit origin list consistent with the above; optional override via `CORS_ALLOWED_ORIGINS` (comma-separated).
5. **Follow-up for operators:** After adding or changing a front-end URL, update Terraform variables, apply, and confirm in the browser (Network tab) that preflight and API responses succeed.
