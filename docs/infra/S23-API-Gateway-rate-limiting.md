# S23 — API Gateway rate limiting (task record)

This document matches **GitHub issue S23** (*Rate limiting on API Gateway*): what was asked, what the platform supports, and what this repository configures.

## Task objective

- **Protect** scan and auth HTTP endpoints from abuse.
- **Throttle** using API Gateway controls: steady **requests per second (RPS)** and **burst** capacity.
- **Document** chosen limits and how operators can change them when scaling.
- The original issue also mentioned **usage plans** and **per-day** limits; see *Platform constraints* below.

## Requirements (from the issue)

| Requirement | Notes |
|-------------|--------|
| Throttling on API Gateway | Applied at the HTTP API **stage**, with **per-route overrides** where needed. |
| Scan endpoints | All `POST /scan/*` routes; **`POST /scan/full`** is throttled more strictly than single-service scans. |
| Auth endpoints | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`. |
| Requests per second | Configured via `throttling_*_rate_limit` variables (steady-state RPS). |
| Burst | Configured via `throttling_*_burst_limit` variables (token-bucket burst). |
| Per day | **Not enforced natively** on HTTP APIs; options are documented below. |
| Usage plans | **REST APIs (v1)** feature. This project uses an **HTTP API (v2)**; equivalent abuse protection is **stage + route throttling** unless we migrate or add another layer. |

## Platform constraints (HTTP API vs usage plans)

- **HTTP API (API Gateway v2)** supports **throttling** (RPS + burst) on the stage default and on individual routes. It does **not** support **usage plans**, **API keys**, or built-in **daily quotas**.
- To add **hard per-day quotas** later, typical approaches are: **REST API + usage plans** (often with a server-side caller, not a browser-held API key), **application-level** counters (e.g. DynamoDB + Lambda), or **WAF** / edge rules for abuse patterns—not a single toggle on HTTP API.

## Configured limits (defaults)

Source of truth: Terraform in `infra/api-gateway/` (`main.tf`, `variables.tf`). Summary:

| Route group | Steady RPS | Burst |
|-------------|------------|-------|
| Individual scans (`POST /scan/*` except `/full`) | 25 | 50 |
| Full scan (`POST /scan/full`) | 5 | 10 |
| Auth (`/auth/login`, `/auth/logout`, `/auth/session`) | 35 | 70 |

The deprecated standalone auth HTTP API (`infra/API_Gateway_Auth/`) uses stage throttling aligned with the auth numbers above when that stack is still deployed.

## How to change limits (scaling)

1. Edit **`infra/api-gateway/variables.tf`** (or pass module inputs from **`infra/main.tf`** if you add root-level variables).
2. From the **`infra/`** directory: `terraform plan` then `terraform apply` (with your usual backend / credentials).
3. Clients exceeding limits receive **429 Too Many Requests** from API Gateway.

Detailed operator notes and verification (access logs, 429s) live in **`infra/api-gateway/README.md`** (section *Rate limiting*).

## Verification

- CloudWatch access logs for the stage: log group pattern `/aws/apigwv2/<api-name>/<stage>/access`.
- Filter for HTTP **429** responses after controlled load tests.

## Related files

- `infra/api-gateway/main.tf` — stage `default_route_settings` and `route_settings` overrides.
- `infra/api-gateway/variables.tf` — all throttling variables and defaults.
- `infra/api-gateway/README.md` — endpoint list and rate-limiting runbook.
- `infra/API_Gateway_Auth/main.tf` — optional legacy auth API stage limits.
