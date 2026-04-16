# Frontend Telemetry Spec (A16)

## Summary
This spec defines low-cardinality frontend telemetry for IAM Dashboard so Data can use real usage and RUM data in Prometheus and Grafana. This slice keeps implementation intentionally small while establishing a stable contract for future metrics.

## Scope
Implemented in this slice:
1. `frontend_page_load_seconds`
2. `frontend_scans_triggered_total`
3. `frontend_js_errors_total` (optional in issue, implemented here)

Deferred for future iterations:
- `frontend_ttfb_seconds`
- `frontend_api_request_duration_seconds_bucket`
- `frontend_api_calls_total`
- `frontend_dashboard_views_total`

## Cardinality rules
- Keep total telemetry metrics small (<= 10).
- Labels must use fixed enums.
- No user IDs, session IDs, request IDs, raw URLs, or raw error messages in labels.

## Metric definitions

### 1) `frontend_page_load_seconds`
- **Type:** Histogram
- **Description:** Time from navigation start to first meaningful render (frontend mount point).
- **Labels:**
  - `page`: `landing | login | dashboard`
- **Emit when:** Once per page load.
- **Priority:** P0

### 2) `frontend_scans_triggered_total`
- **Type:** Counter
- **Description:** Count of successful scan trigger actions in frontend.
- **Labels:**
  - `scanner_type`: `iam | full | s3 | ec2 | security-hub | guardduty | config | inspector | macie`
  - `environment`: `dev | prod`
- **Emit when:** After scan trigger request succeeds.
- **Priority:** P0

### 3) `frontend_js_errors_total`
- **Type:** Counter
- **Description:** Count of unhandled JavaScript errors.
- **Labels:**
  - `page`: `landing | login | dashboard | unknown`
  - `error_type`: `runtime | promise_rejection | render_error | network`
- **Emit when:** On global runtime error or unhandled promise rejection.
- **Priority:** P1

## Telemetry endpoint contract

### Endpoint
`POST /api/v1/telemetry`

### Payload schema
```json
{
  "metric": "frontend_page_load_seconds",
  "labels": {
    "page": "dashboard"
  },
  "value": 1.23,
  "timestamp": "2026-04-16T15:04:05.000Z"
}
```

### Validation behavior
- Reject unknown metric names.
- Reject missing/extra label keys.
- Reject label values outside allowed enums.
- For histogram metrics, `value` must be a positive number.
- For counter metrics, `value` defaults to `1` when omitted.

### Response
- `202 Accepted` for valid events.
- `400 Bad Request` for invalid payloads.

## Implementation details (this slice)
- Backend receives telemetry at `/api/v1/telemetry`, validates payloads, and updates Prometheus metrics in-process.
- Prometheus scrapes metrics from existing `/api/v1/metrics`.
- Frontend emits:
  - page-load events for landing, login, and dashboard
  - scan-trigger events for IAM and full scans
  - JS error events via global listeners

## Grafana queries
- P50 page load:
  - `histogram_quantile(0.50, sum(rate(frontend_page_load_seconds_bucket[5m])) by (le, page))`
- P90 page load:
  - `histogram_quantile(0.90, sum(rate(frontend_page_load_seconds_bucket[5m])) by (le, page))`
- Scan triggers over time:
  - `sum(rate(frontend_scans_triggered_total[5m])) by (scanner_type)`
- JS errors over time:
  - `sum(rate(frontend_js_errors_total[5m])) by (error_type, page)`
