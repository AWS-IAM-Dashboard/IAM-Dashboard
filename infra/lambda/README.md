# Lambda Functions for IAM Dashboard Scanner

This directory contains the Lambda code and Terraform packaging/deployment logic for the IAM Dashboard backend.

---

# IAM Scanner

## 🎯 What This Does

Creates an AWS Lambda function that aggregates security findings from AWS native scanners and evaluates resources against OPA policies. The function stores results in DynamoDB and S3.

## 🔧 Lambda Configuration

- **Function Name**: `iam-dashboard-scanner`
- **IAM Role**: `iam-dashboard-lambda-role`
- **Runtime**: Python 3.13 (arm64 architecture)
- **Timeout**: 300 seconds (5 minutes)
- **Memory**: 512 MB

Function name, KMS key, runtime, memory, timeout, and architecture are Terraform resource settings configured in `main.tf`, not runtime environment variables.

## 🔐 IAM Permissions

The Lambda role (`iam-dashboard-lambda-role`) has permissions for:

- **CloudWatch Logs**: Create log groups/streams, write logs
- **S3**: PutObject, GetObject, ListBucket on `iam-dashboard-project` and `iam-dashboard-scan-results-*`
- **DynamoDB**: PutItem, GetItem, UpdateItem, Query, Scan on `iam-dashboard-*` tables
- **AWS Security Services**: Full permissions for security scanning
  - Security Hub: GetFindings, BatchImportFindings, GetInsights, GetComplianceSummary
  - GuardDuty: ListDetectors, GetDetector, ListFindings, GetFindings, DescribeFindings
  - Config: DescribeConfigRules, GetComplianceSummaryByConfigRule, DescribeComplianceByConfigRule
  - Inspector: ListFindings, GetFindings, BatchGetFindings, ListScans
  - Macie: ListFindings, GetFindings, BatchGetFindings, DescribeBuckets
  - IAM: ListUsers, ListRoles, ListMFADevices, ListAccessKeys, GetAccessKeyLastUsed
  - EC2: DescribeInstances, DescribeSecurityGroups, DescribeVolumes, DescribeSnapshots
  - S3: GetBucketEncryption, GetPublicAccessBlock

## 📦 Dependencies and build

Python deps (boto3, etc.) are **not** committed. They are installed at package time:

- **CI (GitHub Actions):** Lambda zip is built **in Docker** via `infra/lambda/Dockerfile.build` (no host Python needed). This runs automatically on push to `main`.
- **Local:** Run `pip install -r requirements.txt -t .` in `infra/lambda`, then zip, or use Docker:  
  `docker buildx build -f infra/lambda/Dockerfile.build --output type=local,dest=./lambda-out infra/lambda`

**Why we do it this way:** Keeping deps out of the repo (and building the zip in CI/Docker) keeps the repo small, speeds up clones, and makes dependency updates a one-line change in `requirements.txt` instead of thousands of committed files. One extra automated build step in the pipeline; no manual step for developers.

## 📝 Environment Variables

The scanner Lambda receives these runtime environment variables:

- `DYNAMODB_TABLE_NAME`: Name of the DynamoDB table for scan results
- `S3_BUCKET_NAME`: Name of the S3 bucket for scan results
- `PROJECT_NAME`: Project name for tagging
- `ENVIRONMENT`: Environment name (dev, staging, prod)
- `SESSION_TABLE_NAME`: Name of the DynamoDB table that holds user session metadata
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of origin URLs granted access to scan resources
- `ACCOUNTS_TABLE_NAME`: DynamoDB table that contains registered accounts for multi-account scanning
- `CROSS_ACCOUNT_ROLE_NAME`: Name of the IAM role used for cross-account scanning
- `MAIN_ACCOUNT_ID`: The account ID that owns the scanner Lambda

Additional variables can be added via the `lambda_environment_variables` map in `variables.tf`.

## 🔄 Lambda Handler Structure

The Lambda function supports the following scanner types:
- **security-hub**: Scan AWS Security Hub for findings
- **guardduty**: Scan GuardDuty for threat detections
- **config**: Scan AWS Config for compliance
- **inspector**: Scan AWS Inspector for vulnerabilities
- **macie**: Scan AWS Macie for data security issues
- **iam**: Scan IAM users, roles, and policies
- **ec2**: Scan EC2 instances for security issues
- **s3**: Scan S3 buckets for security issues
- **full**: Execute all security scans

### Multi-Account Scanning

HTTP scan requests may include an optional `account_id` in the JSON body. When present, the scanner Lambda validates the account against the
registered accounts table and assumes the configured cross-account role before running the scan. When omitted, the scan runs in the main account.

### Event Structure (API Gateway):
```json
{
  "httpMethod": "POST",
  "path": "/scan/{scanner_type}",
  "pathParameters": {
    "scanner_type": "s3"
  },
  "body": "{\"region\": \"us-east-1\", \"account_id\": \"123456789\"}"
}
```

### Event Structure (Direct Invocation):
```json
{
  "scanner_type": "s3",
  "region": "us-east-1",
  "scan_parameters": {}
}
```

### Response:
```json
{
  "statusCode": 200,
  "body": {
    "scan_id": "s3-2024-01-01T00:00:00",
    "scanner_type": "s3",
    "region": "us-east-1",
    "status": "completed",
    "results": {},
    "timestamp": "2024-01-01T00:00:00"
  }
}
```

## 🔐 Authentication and RBAC

### Session Authentication

HTTP-triggered invocations (via API Gateway) require a valid session cookie named `iamdash_session`.
The Lambda reads this cookie from the request and looks up the session record in the DynamoDB table
configured by `SESSION_TABLE_NAME`. Missing or expired sessions are rejected with a **401 Unauthorized**.

Direct Lambda invocations (not via API Gateway) bypass session auth entirely.

### Group-Based RBAC

Authenticated requests are checked against the `groups` field stored in the session record.
Each Cognito group maps to a permitted scanner type:

| Group | Permitted scanner type |
|---|---|
| `admin` | All scanner types, including `full` |
| `iam` | `iam` |
| `ec2` | `ec2` |
| `s3` | `s3` |
| `securityhub` | `security-hub` |
| `guardduty` | `guardduty` |
| `config` | `config` |
| `inspector` | `inspector` |
| `macie` | `macie` |

- Users in multiple groups can run all their permitted scanner types.
- Users with no matching group receive a **403 Forbidden**.
- Only `admin` can run the `full` scan.

## 🏷️ Tags

The Lambda function is tagged with:
- `Project = IAMDash`
- `Env = dev` (or from variable)
- `ManagedBy = terraform`
- `Service = scanner`

---

# Scan Result Notification

## 🎯 What This Does

Triggered by an S3 object-created notification. The SES Lambda reads the exact bucket and object key from the event payload, loads the scan-result JSON object that triggered the event, parses the required scan values, builds a concise email message, and sends it to the configured SES recipient addresses.

## 🔧 Lambda Configuration

- **Function Name**: `iam-dashboard-ses`
- **IAM Role**: `iam-dashboard-ses-role`
- **Runtime**: Python 3.13 (arm64 architecture)
- **Timeout**: 300 seconds (5 minutes)
- **Memory**: 512 MB

## 🔐 IAM Permissions

The Lambda role (`iam-dashboard-ses-role`) has permissions split across two IAM policies:

**`lambda_ses_policy.json` (static — generic permissions):**
- **CloudWatch Logs**: Create log groups/streams and write logs
- **SES**: `SendEmail` and `SendRawEmail`
- **X-Ray**: `PutTraceSegments` and `PutTelemetryRecords`

**`lambda_ses_resource_policy` (Terraform `jsonencode` — variable-scoped permissions):**
- **S3**: `GetObject` on `arn:aws:s3:::${var.lambda_ses_bucket_name}/*`
- **KMS**: `Decrypt` on `var.lambda_kms_key_arn`

## 📝 Environment Variables

The SES notification Lambda receives these runtime environment variables:

- `SES_FROM_EMAIL`: Email address the SES notification is sent from
- `SCAN_ALERT_RECIPIENTS`: Comma-separated list of recipient email addresses
- `S3_BUCKET_NAME`: Bucket name included in the notification message body
- `SES_SUBJECT_PREFIX`: Prefix used for SES email subject lines (default: `IAM Dashboard`)
- `EMAIL_TIMEZONE`: Timezone used for human-readable timestamp formatting in emails (e.g. `America/New_York`)
- `PROJECT_NAME`: Project name for tagging
- `ENVIRONMENT`: Environment name (dev, staging, prod)

Additional variables can be added via the `lambda_ses_environment_variables` map in `variables.tf`.

## 🔄 Lambda Handler Structure

The SES notification Lambda is invoked by an S3 object-created notification.

### Event Structure (S3 Notification):
```json
{
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "iam-dashboard-scan-results"
        },
        "object": {
          "key": "scan-result/prod/s3-2026-03-18T14_40_25.394352.json"
        }
      }
    }
  ]
}
```

### Handler Flow

1. Parse the bucket name and object key from `Records[].s3`.
2. Skip records whose object key does not end in `.json`.
3. Load the exact S3 object referenced by the event.
4. Read the top-level `scanner_type` field.
5. Branch based on scan type:
   - **`iam`, `ec2`, `s3`**: read `results.account_id` and `results.scan_summary`; sum numeric values for `total_findings`.
   - **`full`**: aggregate nested operational scan summaries from nested operational sections such as `results.iam`, `results.ec2`, and `results.s3`; derive `account_id` and merged `scan_summary` from those sections.
   - **`config`, `guardduty`, `inspector`, `security-hub`**: send a fallback "resource not enabled" message using the top-level `timestamp`.
   - **Unsupported types**: raise a clear `ValueError`.
6. Format the ISO timestamp using `EMAIL_TIMEZONE` (naive timestamps are treated as UTC before conversion).
7. Build the email subject and body.
8. Send the email through SES.

### Response Behavior

- Returns `400` when no S3 records are supplied.
- Returns `200` when records are handled successfully, including processed and skipped record counts in the response body.

### Email Content

**Operational and full scans** (`iam`, `ec2`, `s3`, `full`):
- First line: `scan_summary: {...}` — the serialized scan summary, either `results.scan_summary` for operational scans or the merged nested summary for full scans.
- Notification sentence containing: scanner type, account ID, human-readable formatted timestamp, total findings count, and bucket name
- Example timestamp: `March 18, 2026 at 10:40 AM EDT`

**Non-operational scans** (`config`, `guardduty`, `inspector`, `security-hub`):
- No `scan_summary` line
- Fallback message: the resource is currently not enabled so no information could be extracted

`total_findings` is calculated by summing numeric values in `results.scan_summary` for operational scans, or from the merged summary for full
scans.

Timestamps without timezone info are treated as UTC before conversion to `EMAIL_TIMEZONE`.

## 🏷️ Tags

The Lambda function is tagged with:
- `Project = IAMDash`
- `Env = dev` (or from variable)
- `ManagedBy = terraform`
- `Service = ses-notification`

---

# 🚀 How to Deploy

The Lambda function is automatically packaged by Terraform. Simply run:

```bash
cd infra/lambda
terraform init
terraform plan
terraform apply
```

Terraform will automatically:
1. Package the python code into a ZIP file
2. Deploy the Lambda functions with the packaged code
3. Configure IAM roles and permissions

**Note**: The Lambda runtime includes `boto3` and `botocore`, so no additional dependencies need to be bundled for those libraries.
`EMAIL_TIMEZONE` relies on runtime timezone data; use `UTC` or package `tzdata` if a chosen timezone is unavailable. If you need custom
dependencies, you can:
- Use Lambda Layers
- Create a custom deployment package with `lambda_zip_file` variable

---

# 📁 Files and purpose

### `lambda_function.py`
- This is the primary scanner Lambda implementation for the module.
- It owns the scan execution contract, including the supported scanner types, request handling, and result envelope returned by the backend scan path.
- It drives the main runtime behavior that other notification and infrastructure pieces build around.

### `lambda_ses.py`
- This is the implemented SES notification Lambda for scan-result emails.
- It owns the S3-triggered notification flow, including reading the exact scan-result JSON object, extracting the required values, formatting the timestamp, and building the SES message.
- It defines the runtime behavior for scan-result notification delivery after new results are written to S3.

### `main.tf`
- This is the Terraform resource-definition and packaging entrypoint for the Lambda module.
- It owns the Lambda resources, IAM role attachments, log groups, packaging steps, and related wiring for deployment.
- Variable-scoped SES Lambda permissions (S3 `GetObject` on `var.lambda_ses_bucket_name` and KMS `Decrypt` on `var.lambda_kms_key_arn`) are defined here using `jsonencode` in `aws_iam_role_policy.lambda_ses_resource_policy`.

### `variables.tf`
- This is the module input surface for the Lambda stack.
- It owns the configurable naming, environment, runtime, packaging, and notification-related inputs used by the module.
- It shapes how callers such as the root Terraform module configure deployment and runtime settings.

### `outputs.tf`
- This is the module output definition file.
- It owns the exported values, such as Lambda names and ARNs, that other Terraform modules consume.
- It connects this module to the wider infrastructure stack by exposing deployment results for downstream wiring.

### `lambda-role-policy.json`
- This is the IAM policy document for the main scanner Lambda.
- It owns the permissions the scanner runtime needs for logging, scan execution, and persistence-related AWS access.
- It directly controls what the primary scan Lambda can do once deployed.

### `lambda_ses_policy.json`
- This is the static IAM policy document for the SES notification Lambda.
- It owns generic permissions that do not depend on Terraform variables: CloudWatch Logs, SES `SendEmail`/`SendRawEmail`, and X-Ray tracing.
- Variable-scoped permissions (S3 read and KMS decrypt) are defined separately in `main.tf` using `jsonencode`.

### `requirements.txt`
- This is the Python dependency manifest for the Lambda module.
- It owns the optional third-party package list used when custom dependencies need to be bundled during packaging.
- It matters when the deployment artifact is built outside the default AWS runtime libraries.

### `README.md`
- This is the operational and architectural reference for the Lambda module.
- It owns the module-level documentation for the scanner Lambda, the SES notification Lambda, deployment flow, and current notification behavior.
- It helps keep the deployment and runtime intent understandable without reading every implementation file first.

## 📊 Monitoring

- **CloudWatch Logs**: Automatic logging to the respective CloudWatch log groups
- **CloudWatch Metrics**: Automatic metrics for invocations, errors, duration, throttles
- **X-Ray Tracing**: Can be enabled for distributed tracing

## 🔗 Integration

After deployment, the Lambda functions can be integrated with:
- **API Gateway**: For REST API endpoints (scanner Lambda)
- **EventBridge**: For scheduled scans
- **S3 Event Notifications**: Trigger the SES notification Lambda when new scan-result objects are written to S3
- **CloudWatch Events**: For cron-based scheduling
