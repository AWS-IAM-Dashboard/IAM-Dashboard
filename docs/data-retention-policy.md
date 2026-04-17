# Data retention policy (A17)

This document defines how long different classes of IAM Dashboard data are kept, how enforcement works in each system, and how the recommended settings compare to what ships in the repo today.

## Retention periods (recommended)

| Data class | Recommended retention | Rationale |
|------------|----------------------|-----------|
| **Prometheus metrics** | **15 days** | TSDB size and query performance; long enough for incident review and short-term trends without unbounded disk growth. |
| **Grafana annotations / snapshots** | **30 days** (annotations policy); snapshots limited | Annotations support incident timelines; bounded cleanup avoids unbounded DB growth. External snapshots disabled to reduce leak surface. |
| **DynamoDB — scan results & IAM findings** | **90 days** | **TTL** on `expires_at` (Unix epoch seconds): AWS removes items after that time without application-driven deletes. Aligns with typical compliance “review quarterly” cycles. |
| **PostgreSQL — `security_findings` & `performance_metrics`** | **90 days** | Row-level deletes for rows older than 90 days by `created_at` / `timestamp` keeps the app DB bounded; run via the same scheduled retention job as DynamoDB cleanup. |

Operational note: **TTL** deletes are **eventually consistent** (typically within 48 hours of expiry). The application also runs **explicit deletes** for scan/findings tables during the scheduled job so behavior is predictable even before TTL backfill on legacy rows.

## Prometheus (metrics)

- **Role:** Time-series storage for scraped targets (e.g. app metrics, Grafana, Postgres exporter targets as configured).
- **Configuration:** Retention is controlled by the Prometheus process flag `--storage.tsdb.retention.time` (not `prometheus.yml`). Scrape rules live in `config/prometheus/prometheus.yml`.
- **Recommended:** `15d` for `--storage.tsdb.retention.time`.

## Grafana (dashboards, annotations, snapshots)

- **Role:** Dashboards and provisioning live under `config/grafana/provisioning/`; Docker mounts `grafana_data` for state.
- **Recommended environment variables:**
  - `GF_ALERTING_MAX_ANNOTATIONS_TO_KEEP=1000` — cap stored annotations.
  - `GF_ANNOTATIONS_CLEANUPJOB_BATCHSIZE=100` — batch size for annotation cleanup.
  - `GF_SNAPSHOTS_EXTERNAL_ENABLED=false` — disable external snapshot uploads by default.

Exact Grafana behavior can vary by major version; validate in staging after upgrades.

## DynamoDB (findings + scan results)

- **Tables:** Scan results (`scan_id` + `timestamp`) and IAM findings (`finding_id` + `detected_at`, with GSI `resource-index` on `resource_type` + `detected_at`) as defined in Terraform and `backend/services/dynamodb_service.py`.
- **TTL:** Attribute name **`expires_at`** (Number, Unix seconds). Terraform enables TTL on both tables. New writes set `expires_at` to **now + 90 days** so AWS can expire items automatically.
- **Application cleanup:** `DynamoDBService.delete_old_records()` performs paginated scans (with a DynamoDB `FilterExpression` on sort keys) and deletes items older than the configured day threshold using the correct primary key per table (complements TTL for legacy items without `expires_at`). This path is **opt-in**: set environment variable **`BACKFILL_DELETE_ENABLED=true`** (or `1`/`yes`) before the job will run table scans and deletes; leave it unset in environments where you rely on TTL only.

## PostgreSQL (`security_findings`, `performance_metrics`)

- **Retention column:** `security_findings.created_at`, `performance_metrics.timestamp`.
- **Cleanup:** `DatabaseService.cleanup_old_records(days=90)` deletes rows strictly older than the cutoff. Invoked from the same retention job as DynamoDB.

## Scheduled job & HTTP trigger

- **Background:** When `RETENTION_SCHEDULER_ENABLED` is `true` (default), a daemon thread runs the full retention pass once per `RETENTION_SCHEDULER_INTERVAL_SEC` (default **86400** = 24h), after an initial **60s** startup delay. When `REDIS_URL` is set, **`RETENTION_SCHEDULER_REDIS_LOCK`** (default `true`) acquires a Redis lock around each pass so only one WSGI worker runs retention at a time; set `RETENTION_SCHEDULER_REDIS_LOCK=false` only if you accept overlapping runs or use a single-worker deployment.
- **HTTP (optional):** `POST /api/v1/system/retention` with header `X-Retention-Run-Key` equal to `RETENTION_RUN_KEY` runs the same pass on demand. If `RETENTION_RUN_KEY` is unset, the endpoint returns **503** (disabled).

**Operational safety (`POST /api/v1/system/retention`):** Treat this route as **internal-only** — do not expose it on a public ingress; front it with network controls (VPC, security groups, private API Gateway, or admin-only paths). Use a **high-entropy** `RETENTION_RUN_KEY`, **rotate** it on a schedule, and **store it in a secrets manager** (not in git or plain env files in prod). **Audit every invocation** (caller identity, timestamp, and response payload or outcome) so destructive runs are traceable.

`(As of April 2026 / PR #390)`

## Current state vs. recommended

| Area | Previous / shipped state | Recommended / implemented |
|------|---------------------------|---------------------------|
| Prometheus TSDB retention | `200h` (~8.3d) in `docker-compose.yml` | **15d** via `--storage.tsdb.retention.time=15d` |
| Grafana annotation / snapshot controls | Only admin password / sign-up flags | Add **annotation caps**, **cleanup batch size**, **disable external snapshots** |
| DynamoDB scan results | Table in Terraform; **no TTL** | **TTL on `expires_at`**; writes set `expires_at` |
| DynamoDB IAM findings | Used by app; **not** in Terraform on older branches | **New table in Terraform** with GSI + **TTL**; writes set `expires_at` |
| `delete_old_records` | Single-page scan; **wrong keys** for findings; **no caller** | **Paginated scan**; correct keys per table; invoked from **scheduler + optional POST** |
| PostgreSQL aged rows | No automated delete | **`cleanup_old_records(90)`** for findings + metrics |

## References (code & config)

- `docker-compose.yml` — Prometheus flags, Grafana env.
- `config/prometheus/prometheus.yml` — scrape configuration.
- `config/grafana/provisioning/` — datasources and dashboard provisioning.
- `infra/dynamodb/main.tf` — DynamoDB tables and TTL.
- `backend/services/dynamodb_service.py` — `expires_at` on writes, `delete_old_records`.
- `backend/services/database_service.py` — `cleanup_old_records`.
- `backend/api/retention.py` — HTTP trigger; `backend/app.py` — route registration and scheduler startup.
