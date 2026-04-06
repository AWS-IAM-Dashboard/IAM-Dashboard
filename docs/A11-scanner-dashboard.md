# A11 - Scanner Performance Dashboard

## What This Does
Adds a Grafana dashboard that shows:
- Scan duration over time by scanner type
- Success and failure rates
- Recent scans table
- Scanner service health

## Data Sources
- **Primary**: DynamoDB (requires AWS credentials)
- **Fallback**: PostgreSQL (used automatically when AWS is unavailable)
- **Health panel**: Prometheus (`job="backend"`)

## Environment Variables Required
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL DSN e.g. `postgresql://user:pass@db:5432/cybersecurity_db` |
| `AWS_ACCESS_KEY_ID` | AWS credentials for DynamoDB |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for DynamoDB |
| `AWS_DEFAULT_REGION` | AWS region e.g. `us-east-1` |

## How To Run Locally
1. Copy the example env file and fill in your values:

cp .env.example .env

2. Make sure `DATABASE_URL` is set in your `.env` file.
3. Start the stack:
   docker-compose up -d

4. Open Grafana: http://localhost:3000 (admin/admin)
5. Navigate to Dashboards → Scanner Performance Dashboard

## How To Test
1. Check the scan history endpoint (no filters):

http://localhost:5001/api/v1/scan-history?limit=10

2. Check with filters:
http://localhost:5001/api/v1/scan-history?scanner_type=iam&status=completed

3. Check the health endpoint:
http://localhost:5001/api/v1/health

## Expected Results Locally (No AWS Credentials)
- scan-history automatically falls back to PostgreSQL
- If `DATABASE_URL` is set and the DB has data, panels will populate
- If neither AWS nor PostgreSQL is available, the endpoint returns 500
- Grafana panels show "No data" only if the database is genuinely empty

## Expected Results With Real AWS
When AWS credentials are configured:
- Scan duration panel shows real timing data
- Success/failure rates show actual percentages
- Recent scans table populates with real scan records
- Health panel shows live service metrics

## Error Behavior
- AWS errors → automatically retries via PostgreSQL fallback
- Unexpected errors → returns HTTP 500 (never silently returns empty data)
- Missing `DATABASE_URL` → returns HTTP 500 with a log message

## Grafana Panel Notes
- All SQL panels use `$__timeFilter(timestamp)` so the time picker works
- Health panel uses Prometheus query `up{job="backend"}`
- Dashboard auto-refreshes every 30 seconds

