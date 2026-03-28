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

## How To Test
1. Check the scan history endpoint:
   http://localhost:5001/api/v1/scan-history?limit=10

2. Check the health endpoint:
   http://localhost:5001/api/v1/health

## Expected Results Locally (No AWS Credentials)
- scan-history returns: {"items": [], "total": 0}
- health endpoint returns: {"status": "healthy"}
- Grafana panels show "No data" — this is expected
  without real AWS credentials

## Expected Results With Real AWS
When AWS credentials are configured:
- Scan duration panel shows real timing data
- Success/failure rates show actual percentages
- Recent scans table populates with real scan records
- Health panel shows live service metrics

## Why Panels Show No Data Locally
DynamoDB requires real AWS credentials. The endpoint
returns empty data gracefully instead of crashing.

