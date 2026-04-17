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

The Lambda function automatically receives these environment variables:

- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table (from variable)
- `S3_BUCKET_NAME`: Name of S3 bucket (from variable)
- `PROJECT_NAME`: Project name for tagging
- `ENVIRONMENT`: Environment name (dev, staging, prod)
- `lambda_function_name`: Name of the scanner lambda function
- `session_table_name`: Name of the DynamoDB table that holds user session metadata
- `lambda_kms_key_arn`: KMS key used to encrypt CloudWatch logs
- `CORS_ALLOWED_ORIGINS`: List of origin URLs that are granted access to scan resources
- `ACCOUNTS_TABLE_NAME`: DynamoDB table that contains the registered accounts for multi-scanning
- `CROSS_ACCOUNT_ROLE_NAME`: Name of the IAM role used for cross-account scanning
- `MAIN_ACCOUNT_ID`: The account ID that owns the scanner lambda

Additional variables can be added via `lambda_environment_variables` map.

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

### Event Structure (API Gateway):
```json
{
  "httpMethod": "POST",
  "path": "/scan/{scanner_type}",
  "pathParameters": {
    "scanner_type": "security-hub"
  },
  "body": "{\"region\": \"us-east-1\", optional -> \"account_id\": \"123456789\"}"
}
```

### Event Structure (Direct Invocation):
```json
{
  "scanner_type": "security-hub",
  "region": "us-east-1",
  "scan_parameters": {
    "severity": "HIGH"
  }
}
```

### Response:
```json
{
  "statusCode": 200,
  "body": {
    "scan_id": "security-hub-2024-01-01T00:00:00",
    "scanner_type": "security-hub",
    "region": "us-east-1",
    "status": "completed",
    "results": {...},
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

Triggered by an S3 object-created notification. The SES Lambda reads the exact bucket and object key from the event payload, loads the exact JSON object that triggered the event, parses the required scan values, builds a concise email message, and sends it to the configured SES recipient addresses.

## 🔧 Lambda Configuration

- **Function Name**: `iam-dashboard-ses`
- **IAM Role**: `iam-dashboard-ses-role`
- **Runtime**: Python 3.13 (arm64 architecture)
- **Timeout**: 300 seconds (5 minutes)
- **Memory**: 512 MB

## 🔐 IAM Permissions

The Lambda role (`iam-dashboard-ses-role`) has permissions for:

- **CloudWatch Logs**: Create log groups/streams and write logs
- **S3**: Read the scan-result JSON objects that triggered the notification
- **SES**: `SendEmail` and `SendRawEmail` to send SES notification messages

## 📝 Environment Variables

The Lambda function automatically receives these environment variables:

- `SES_FROM_EMAIL`: Email address the SES notification is sent from
- `scan_alert_recipients`: String containing a list of email addresses separated by a commad (,)
- `ENVIRONMENT`: Environment name (dev, staging, prod)
- `PROJECT_NAME`: Project name for tagging
- `SES_SUBJECT_PREFIX`: Prefix used for SES email subject lines
- `lambda_ses_bucket_name`: Bucket name included in the notification message body
- `email_timezone`: Local timezone configured for email notifications

Additional variables can be added via `lambda_ses_environment_variables` map.

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
2. Ignore records whose object key does not end in `.json`.
3. Read the exact S3 object referenced by the event.
4. Parse the scan-result JSON document.
5. Extract `scanner_type`, `region`, `timestamp`, `results.account_id`, and `results.scan_summary`.
6. Compute `total_findings` by summing numeric values in `results.scan_summary`.
7. Build the email subject and body.
8. Send the email through SES.

### Response Behavior

- Returns `400` when no S3 records are supplied.
- Returns `200` when records are handled successfully, including processed and skipped record counts in the response body.

### Email Content

The SES notification parses these fields from the scan-result JSON:

- `scanner_type`
- `region`
- `timestamp`
- `results.account_id`
- `results.scan_summary`

The email body:

- begins with a `scan_summary: {...}` line containing the serialized `results.scan_summary` object
- follows with a notification sentence containing the scanner type, account ID, timestamp, total findings, and bucket name

`total_findings` is calculated by summing the numeric values in `results.scan_summary`.

## 🏷️ Tags

The Lambda function is tagged with:
- `Project = IAMDash`
- `Env = dev` (or from variable)
- `ManagedBy = terraform`
- `Service = ses-notification`

---

# Welcome Message and Password Reset Notifications

## 🎯 What This Does

`lambda_cognito.py` currently serves only as a placeholder scaffold for future Cognito-triggered welcome and password-reset notifications. It is intentionally not wired yet.

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

**Note**: The Lambda runtime includes `boto3` and `botocore`, so no additional dependencies need to be bundled. If you need custom dependencies, you can:
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
- It owns the S3-triggered notification flow, including reading the exact scan-result JSON object, extracting the required values, and building the SES message.
- It defines the runtime behavior for scan-result notification delivery after new results are written to S3.

### `lambda_cognito.py`
- This is the scaffolded future Cognito notification Lambda.
- It owns the placeholder entrypoint for later welcome and password-reset notification work.
- It is intentionally not wired yet, so it does not affect current deployment behavior.

### `main.tf`
- This is the Terraform resource-definition and packaging entrypoint for the Lambda module.
- It owns the Lambda resources, IAM role attachments, log groups, packaging steps, and related wiring for deployment.
- It determines how the Python handlers in this directory are built and deployed into AWS Lambda.

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
- This is the IAM policy document for the SES notification Lambda.
- It owns the permissions needed to read scan-result objects from S3, write logs, and send email through SES.
- It governs the runtime access available to the scan-result notification path.

### `lambda_cognito_policy.json`
- This is the IAM policy scaffold for the future Cognito notification Lambda.
- It owns the placeholder permission shape for later Cognito-triggered notification work.
- It is present for future deployment wiring, but it does not drive any active notification path yet.

### `requirements.txt`
- This is the Python dependency manifest for the Lambda module.
- It owns the optional third-party package list used when custom dependencies need to be bundled during packaging.
- It matters when the deployment artifact is built outside the default AWS runtime libraries.

### `README.md`
- This is the operational and architectural reference for the Lambda module.
- It owns the module-level documentation for the scanner Lambda, the SES notification Lambda, deployment flow, and current notification behavior.
- It helps keep the deployment and runtime intent understandable without reading every implementation file first.

## Implemented vs scaffolded

Implemented now:
- `lambda_function.py`
- `lambda_ses.py`

Scaffolded only:
- `lambda_cognito.py`

## 📊 Monitoring

- **CloudWatch Logs**: Automatic logging to the respective CloudWatchLog grou[s]
- **CloudWatch Metrics**: Automatic metrics for invocations, errors, duration, throttles
- **X-Ray Tracing**: Can be enabled for distributed tracing

## 🔗 Integration

After deployment, the Lambda function can be integrated with:
- **API Gateway**: For REST API endpoints
- **EventBridge**: For scheduled scans
- **S3 Event Notifications**: For triggering scans on S3 events
- **CloudWatch Events**: For cron-based scheduling
- **Cognito Triggers**: For welcomes messages, and password reset emails