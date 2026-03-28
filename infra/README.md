# Infrastructure as Code (IaC)

This directory contains Terraform configurations for the IAM Dashboard infrastructure.

## Current Status

✅ **Infrastructure modules are now available for AWS deployment.**

The IAM Dashboard infrastructure is defined as Terraform modules. Each service has its own directory with Terraform configuration files.

## 📁 Directory Structure

```
infra/
├── bootstrap/       # One-time: S3 state bucket + DynamoDB lock table (run before main)
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

## Terraform state bucket (important)

State is stored in a **dedicated** S3 bucket: `iam-dashboard-terraform-state` (not the frontend bucket). A DynamoDB table `terraform-state-lock` is used for state locking so concurrent applies do not corrupt state.

- The deploy workflow runs `aws s3 sync build/ s3://iam-dashboard-project/ --delete`, which removes any object in that bucket that isn’t in the build. If state lived there, it would be deleted and apply would fail or lose state.
- So the backend uses `iam-dashboard-terraform-state` for state only; the frontend bucket is only for the static site.

**One-time setup**

1. Create the state bucket (if it doesn’t exist):
   ```bash
   aws s3 mb s3://iam-dashboard-terraform-state --region us-east-1
   aws s3api put-bucket-versioning --bucket iam-dashboard-terraform-state \
     --versioning-configuration Status=Enabled
   ```
  Create the lock table (main backend requires it): `aws dynamodb create-table --table-name terraform-state-lock --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region us-east-1`
2. If you were previously using state in `iam-dashboard-project` (e.g. under `terraform/state/`), migrate state to the new bucket:
   ```bash
   cd infra
   terraform init -migrate-state
   ```
   When prompted, confirm the migration. The backend in `main.tf` now points at `iam-dashboard-terraform-state`; Terraform will copy state from the old config to the new one. Then remove the old state key from the frontend bucket if you want:
   ```bash
   aws s3 rm s3://iam-dashboard-project/terraform/state/terraform.tfstate --region us-east-1
   ```

  **Option A (IaC):** Instead of the CLI above, you can run the [bootstrap](bootstrap/README.md) Terraform once; it creates the same state bucket and the `terraform-state-lock` DynamoDB table. The main backend in `main.tf` already expects that table for locking.

## How to check Terraform vs console and project

Use these steps to confirm that Terraform state matches the AWS console and your project expectations.

### 1. Config and state (from repo root)

```bash
cd infra
terraform init -input=false
terraform validate
terraform plan -input=false -no-color
```

- **`terraform init`** – Ensures backend (S3) and providers are ready; required before plan/apply.
- **`terraform validate`** – Checks syntax and internal references; fixes any `.tf` errors first.
- **`terraform plan`** – Compares **Terraform state** with **current config**.  
  - **No changes** – State and config agree; if console matches state, you’re in sync.  
  - **Changes shown** – Either you changed config (apply to update) or something in console was changed outside Terraform (drift); fix by apply or by importing/updating state.

### 2. What Terraform is managing

```bash
cd infra
terraform state list
```

This lists every resource in state (S3, DynamoDB, Lambda, API Gateway, KMS, GitHub Actions role, etc.). If a resource exists in the console but is **not** in this list, Terraform doesn’t manage it; create it in code and **import** it, e.g.:

```bash
terraform import 'module.s3.aws_s3_bucket.this' iam-dashboard-project
```

Use the resource address from your config and the real resource ID/name from AWS.

### 3. Compare console with Terraform (script)

From the repo root:

```bash
./infra/verify-resources.sh [region]
# Default region: us-east-1
```

The script uses the AWS CLI to check that **Lambda** (name, runtime, role), **DynamoDB** (table name, encryption, PITR), and **S3** (bucket, versioning, encryption) exist and reports expected vs actual. Compare that output with:

- **Terraform outputs:** `terraform output` (e.g. `api_gateway_id`, `lambda_function_name`, `dynamodb_table_name`, `s3_bucket_name`).
- **Console:** Same resources in the AWS Console (Lambda, DynamoDB, S3).

If the script says a resource is missing or settings differ, either update Terraform and apply or fix the resource in the console so it matches the code.

### 4. Manual checklist (console vs project)

| Resource        | Where in Terraform        | Console location                          |
|----------------|---------------------------|-------------------------------------------|
| KMS key        | `infra/main.tf` (root)    | AWS Console → KMS → Customer managed keys |
| S3 buckets     | `module.s3`               | S3 → Buckets                              |
| DynamoDB table | `module.dynamodb`         | DynamoDB → Tables                         |
| Lambda         | `module.lambda`           | Lambda → Functions                        |
| API Gateway    | `module.api_gateway`      | API Gateway → APIs                        |
| GitHub OIDC role | `module.github_actions` | IAM → Roles                               |

For each resource, confirm:

- **Exists** – Name/ID in console matches what Terraform creates (see `variables.tf` defaults or your `terraform.tfvars`).
- **In state** – Appears in `terraform state list` under the expected module (e.g. `module.api_gateway.aws_apigatewayv2_api.api`).
- **No drift** – `terraform plan` shows no unexpected changes for that resource.

### 5. Common mismatches

- **Resource created in console but not in Terraform** – Add the resource to Terraform (or the right module), then run `terraform import <address> <id>` so state matches. After that, `terraform plan` should show no create/destroy for that resource.
- **Resource was deleted or changed in console** – `terraform plan` will show update/recreate. Apply to re-create or fix the resource so it matches the config.
- **Terraform and script use different region** – Run the script with the same region you use for Terraform, e.g. `./infra/verify-resources.sh us-east-1`.

Using **validate → plan → state list → verify-resources.sh** plus the checklist above gives you a full pass to ensure Terraform is accurate to the console and the project.

**If CI fails with "already exists" or "AccessDeniedException" (e.g. KMS CreateKey):** see [docs/infra/IMPORT-RUNBOOK.md](../docs/infra/IMPORT-RUNBOOK.md) to use the existing KMS key (data source) and import existing resources into state.

---

## Quick Start

### Deploy from root (recommended)

All modules are wired from `infra/main.tf`. Deploy everything from the `infra/` directory:

```bash
cd infra
terraform init
terraform plan -input=false
terraform apply -input=false
```

### Deploy Individual Services (legacy / per-module)

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
- `infra/bootstrap/README.md` - One-time setup for state bucket and lock table
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

## Troubleshooting

### `Provider configuration not present` for `module.cognito.*` (orphan)

If CI or local `terraform plan` fails because **`module.cognito`** resources are still in **remote state** but the Cognito module was removed from `main.tf`, fix it in one of two ways:

1. **Preferred (in-repo):** Temporary `removed { ... }` blocks in `main.tf` (with `lifecycle { destroy = false }`) list each legacy address so the next **apply** removes them from state **without** deleting AWS Cognito. After a successful apply, **delete those `removed` blocks** in a follow-up PR so the config stays clean.

2. **Manual:** With AWS + backend access, from `infra/`:

   ```bash
   terraform init -input=false
   terraform state list | grep '^module\.cognito\.'
   terraform state rm 'module.cognito.aws_cognito_user_pool.this' \
     'module.cognito.aws_cognito_user_pool_client.spa' \
     'module.cognito.aws_cognito_user_pool_domain.this' \
     'module.cognito.aws_cognito_user_group.admin'
   ```

   Add any other `module.cognito.*` lines from `state list`. `state rm` does **not** destroy AWS resources; delete them in the console if you no longer need them.

## Security Notes

- Never commit `.terraform/` directory
- Store sensitive values in environment variables or AWS Secrets Manager
- Use remote state backend for team collaboration
- Enable Terraform Cloud for state management


