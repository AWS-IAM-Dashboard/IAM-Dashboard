terraform {
  required_version = ">= 1.14.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote backend: use a dedicated state bucket, NOT the frontend bucket.
  # Deploy workflow runs "s3 sync build/ s3://iam-dashboard-project/ --delete", which would
  # delete any object not in build/ (including terraform state) if state lived in that bucket.
  backend "s3" {
    bucket         = "iam-dashboard-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock" # created by infra/bootstrap; prevents concurrent apply
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# Use existing KMS key (no create in Terraform; CI does not need kms:CreateKey).
# Set var.kms_key_id to the key alias (e.g. alias/IAMDash-prod-logs) or key ID via tfvars or TF_VAR_kms_key_id.
data "aws_kms_key" "logs" {
  key_id = var.kms_key_id
}

# S3 Module
module "s3" {
  source = "./s3"

  aws_region             = var.aws_region
  environment            = var.environment
  project_name           = var.project_name
  s3_bucket_name         = var.s3_bucket_name
  s3_kms_key_arn         = data.aws_kms_key.logs.arn
  s3_logging_bucket_name = "${var.s3_bucket_name}-access-logs"
}

# DynamoDB Module
module "dynamodb" {
  source = "./dynamodb"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_table_name           = var.dynamodb_table_name
  dynamodb_kms_key_arn          = data.aws_kms_key.logs.arn
  enable_point_in_time_recovery = true
}

# Lambda Module
module "lambda" {
  source = "./lambda"

  aws_region           = var.aws_region
  environment          = var.environment
  project_name         = var.project_name
  lambda_function_name = var.lambda_function_name
  dynamodb_table_name  = var.dynamodb_table_name
  dynamodb_remediation_jobs_table_name       = module.dynamodb.remediation_jobs_table_name
  dynamodb_remediation_idempotency_table_name = module.dynamodb.remediation_idempotency_table_name
  s3_bucket_name       = var.s3_bucket_name
  lambda_kms_key_arn   = data.aws_kms_key.logs.arn
}

# API Gateway Module
module "api_gateway" {
  source = "./api-gateway"

  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name
  kms_key_arn  = data.aws_kms_key.logs.arn
}

# GitHub Actions OIDC Module
module "github_actions" {
  source = "./github-actions"

  aws_region                  = var.aws_region
  environment                 = var.environment
  project_name                = var.project_name
  github_repo_owner           = var.github_repo_owner
  github_repo_name            = var.github_repo_name
  frontend_s3_bucket_name     = var.s3_bucket_name
  scan_results_s3_bucket_name = var.scan_results_s3_bucket_name
  lambda_function_name        = var.lambda_function_name
  dynamodb_table_name         = var.dynamodb_table_name
  # So CI can use Terraform backend (state bucket + lock table)
  terraform_state_bucket     = "iam-dashboard-terraform-state"
  terraform_state_lock_table = "terraform-state-lock"
}

# --- Async AI remediation plumbing (SQS -> Lambda) ---

resource "aws_sqs_queue" "remediation_dlq" {
  name                       = "iam-dashboard-remediation-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id          = data.aws_kms_key.logs.arn
  sqs_managed_sse_enabled    = false

  tags = {
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_sqs_queue" "remediation_queue" {
  name                       = "iam-dashboard-remediation-queue"
  message_retention_seconds = 345600 # 4 days
  visibility_timeout_seconds = 60

  kms_master_key_id       = data.aws_kms_key.logs.arn
  sqs_managed_sse_enabled = false

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.remediation_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_lambda_event_source_mapping" "remediation_sqs_mapping" {
  event_source_arn = aws_sqs_queue.remediation_queue.arn
  function_name    = module.lambda.lambda_function_arn
  batch_size       = 1
  enabled          = true
}
