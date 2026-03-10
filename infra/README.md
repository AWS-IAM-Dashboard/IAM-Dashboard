# Infrastructure as Code (IaC)

This directory contains Terraform configurations for the IAM Dashboard infrastructure.

## Current Status

✅ **Infrastructure modules are now available for AWS deployment.**

The IAM Dashboard infrastructure is defined as Terraform modules. Each service has its own directory with Terraform configuration files.

## 📁 Directory Structure

```
infra/
├── s3/              # S3 bucket for static hosting and scan results
├── dynamodb/        # DynamoDB table for storing scan results
├── lambda/          # Lambda function and IAM role for security scanning
├── api-gateway/     # API Gateway REST API (placeholder for 9 endpoints)
└── README.md        # This file
```

## 🏗️ Infrastructure Components

### S3 (`infra/s3/`)
- **Bucket**: `iam-dashboard-project` (static hosting)
- **Bucket**: `iam-dashboard-scan-results-{random}` (scan results storage)
- **Purpose**: Static site hosting and storing scan results

### DynamoDB (`infra/dynamodb/`)
- **Table**: `iam-dashboard-scan-results`
- **Purpose**: Store security scan results from AWS scanners and OPA policies
- **Schema**: Partition key `scanner_type`, Sort key `scan_id`

### Lambda (`infra/lambda/`)
- **Function**: `iam-dashboard-scanner`
- **Role**: `iam-dashboard-lambda-role`
- **Purpose**: Aggregate findings from AWS security services and run OPA policy scans
- **Runtime**: Python 3.13 (arm64)

### API Gateway (`infra/api-gateway/`)
- **API**: `iam-dashboard-api`
- **Purpose**: REST API endpoints for triggering scans (9 endpoints planned)
- **Status**: Placeholder structure, routes will be added when Lambda is ready

## 🚀 Quick Start

### Deploy Individual Services

Each service can be deployed independently:

```bash
# Deploy S3
cd infra/s3
terraform init && terraform plan && terraform apply

# Deploy DynamoDB
cd ../dynamodb
terraform init && terraform plan && terraform apply

# Deploy Lambda
cd ../lambda
terraform init && terraform plan && terraform apply

# Deploy API Gateway
cd ../api-gateway
terraform init && terraform plan && terraform apply
```

### View Outputs

After deployment, view outputs for integration:

```bash
cd infra/lambda
terraform output

cd ../api-gateway
terraform output
```

## 🔗 Service Dependencies

- **Lambda** → DynamoDB (writes scan results)
- **Lambda** → S3 (stores detailed results)
- **API Gateway** → Lambda (triggers scans)
- **Frontend** → API Gateway (calls scan endpoints)
- **Frontend** → S3 (serves static site)

## 📝 Environment Variables

Each module uses consistent variables:
- `aws_region` (default: "us-east-1")
- `environment` (default: "dev")
- `project_name` (default: "IAMDash")

Override via `terraform.tfvars` or command line:
```bash
terraform apply -var="environment=prod" -var="aws_region=us-west-2"
```

## 🔐 Security

- All resources use consistent tagging
- IAM roles follow least privilege principle
- Encryption enabled on S3 and DynamoDB
- Public access blocked on S3 buckets
- Deletion protection enabled in production

## 📚 Documentation

Each service directory contains its own README with detailed documentation:
- `infra/s3/README.md` - S3 configuration details
- `infra/dynamodb/README.md` - DynamoDB schema and usage
- `infra/lambda/README.md` - Lambda function and IAM setup
- `infra/api-gateway/README.md` - API Gateway structure and endpoints

## Security Scanning

This directory is scanned by:
- **Checkov** - Infrastructure security scanning
- **OPA** - Policy validation using Terraform policies
- **Terraform Plan** - Built-in security checks

## Getting Started

1. Install Terraform: https://terraform.io/downloads
2. Configure AWS credentials
3. Navigate to the service directory
4. Initialize Terraform: `terraform init`
5. Plan changes: `terraform plan`
6. Apply changes: `terraform apply`

## Security Notes

- Never commit `.terraform/` directory
- Store sensitive values in environment variables or AWS Secrets Manager
- Use remote state backend for team collaboration
- Enable Terraform Cloud for state management


