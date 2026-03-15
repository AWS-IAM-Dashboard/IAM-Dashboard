# Bootstrap – Terraform state backend

Creates the S3 bucket and DynamoDB table used by the **main** Terraform in `../` as its remote backend. Run this **once per account/region** before using the main configuration.

## Why bootstrap?

- **Chicken-and-egg**: Main Terraform needs an S3 bucket to store state. This folder creates that bucket using **local** state, so it does not depend on S3.
- **Industry practice**: The state backend is a one-time dependency; documenting and automating it (IaC) avoids manual steps and drift.

## What it creates

| Resource | Purpose |
|----------|---------|
| S3 bucket `iam-dashboard-terraform-state` | Stores `terraform.tfstate` for the main infra. Versioning enabled so you can recover previous state. |
| DynamoDB table `terraform-state-lock` | Used by the main backend for locking so two applies cannot run at once. |

## Prerequisites

- AWS CLI configured (or env vars) with permissions to create S3 buckets and DynamoDB tables.
- Terraform installed.

## Run once

```bash
cd infra/bootstrap
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

After this, the main Terraform in `infra/` can use the backend (bucket + lock table). If the bucket or table already exists (e.g. created by CLI), either import them into this bootstrap state or skip bootstrap and use the existing resources.

## Outputs

- `state_bucket_name` – use as `bucket` in the main backend (already set in `../main.tf`).
- `lock_table_name` – use as `dynamodb_table` in the main backend (already set in `../main.tf`).

No need to copy these manually; the main `infra/main.tf` backend is already configured to use these names.
