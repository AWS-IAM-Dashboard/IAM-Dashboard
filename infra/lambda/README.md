# Lambda Function for IAM Dashboard Scanner

## 🎯 What This Does

Creates an AWS Lambda function that aggregates security findings from AWS native scanners and evaluates resources against OPA policies. The function stores results in DynamoDB and S3.

## 🔧 Lambda Configuration

- **Function Name**: `iam-dashboard-scanner`
- **IAM Role**: `iam-dashboard-lambda-role`
- **Runtime**: Python 3.13 (arm64 architecture)
- **Timeout**: 300 seconds (5 minutes)
- **Memory**: 512 MB

## 📁 Files Created

- `infra/lambda/main.tf` - Lambda function and IAM role configuration
- `infra/lambda/variables.tf` - Input variables
- `infra/lambda/outputs.tf` - Output values
- `infra/lambda/lambda-role-policy.json` - IAM permissions for Lambda
- `infra/lambda/lambda_function.py` - Lambda function implementation
- `infra/lambda/requirements.txt` - Python dependencies for Lambda
- `infra/lambda/README.md` - This file

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

## 🚀 How to Deploy

The Lambda function is automatically packaged by Terraform. Simply run:

```bash
cd infra/lambda
terraform init
terraform plan
terraform apply
```

Terraform will automatically:
1. Package `lambda_function.py` into a ZIP file
2. Deploy the Lambda function with the packaged code
3. Configure IAM roles and permissions

**Note**: The Lambda runtime includes `boto3` and `botocore`, so no additional dependencies need to be bundled. If you need custom dependencies, you can:
- Use Lambda Layers
- Create a custom deployment package with `lambda_zip_file` variable

## 📝 Environment Variables

The Lambda function automatically receives these environment variables:

- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table (from variable)
- `S3_BUCKET_NAME`: Name of S3 bucket (from variable)
- `PROJECT_NAME`: Project name for tagging
- `ENVIRONMENT`: Environment name (dev, staging, prod)

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
  "body": "{\"region\": \"us-east-1\"}"
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

## 🏷️ Tags

The Lambda function is tagged with:
- `Project = IAMDash`
- `Env = dev` (or from variable)
- `ManagedBy = terraform`
- `Service = scanner`

## 📊 Monitoring

- **CloudWatch Logs**: Automatic logging to `/aws/lambda/iam-dashboard-scanner`
- **CloudWatch Metrics**: Automatic metrics for invocations, errors, duration, throttles
- **X-Ray Tracing**: Can be enabled for distributed tracing

## 🔗 Integration

After deployment, the Lambda function can be integrated with:
- **API Gateway**: For REST API endpoints
- **EventBridge**: For scheduled scans
- **S3 Event Notifications**: For triggering scans on S3 events
- **CloudWatch Events**: For cron-based scheduling
