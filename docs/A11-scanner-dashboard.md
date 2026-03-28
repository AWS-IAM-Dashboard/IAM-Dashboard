# A11 - Scanner Performance Dashboard

## What This Does
Adds a Grafana dashboard that shows:
- Scan duration over time by scanner type
- Success and failure rates
- Recent scans table
- Scanner service health

## How To Run Locally
1. Start the stack:
   docker-compose up -d
2. Open Grafana: http://localhost:3000 (admin/admin)
3. Navigate to Dashboards → Scanner Performance Dashboard

## Testing The Endpoint
Visit: http://localhost:5001/api/v1/scan-history?limit=10

Expected response locally (no AWS credentials):
{"items": [], "total": 0}

This is expected — no AWS credentials are set locally.

## Expected Results With Real AWS
When AWS credentials are configured, panels will show:
- Real scan duration data in the time series panel
- Accurate success/failure rates
- Recent scans populated in the table
- Live health metrics

## Why Panels Show "No Data" Locally
DynamoDB requires real AWS credentials. Locally the
endpoint returns empty data gracefully instead of crashing.

