terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote backend configuration - uses S3 for state storage
  # This allows GitHub Actions and local development to share the same state
  backend "s3" {
    bucket  = "iam-dashboard-project"
    key     = "terraform/state/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    # DynamoDB table for state locking (optional but recommended)
    # dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# Shared KMS key for encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for encrypting CloudWatch Log Groups (IAM Dashboard)"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowGitHubActionsRoleAdmin"
        Effect = "Allow"
        Principal = {
          AWS = module.github_actions.github_actions_deployer_role_arn
        }
        Action = [
          "kms:Describe*",
          "kms:Get*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Create*",
          "kms:Enable*",
          "kms:Disable*",
          "kms:Revoke*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion",
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name      = "${var.project_name}-${var.environment}-logs-kms"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_kms_alias" "logs" {
  name          = "alias/${var.project_name}-${var.environment}-logs"
  target_key_id = aws_kms_key.logs.key_id
}

# S3 Module
module "s3" {
  source = "./s3"

  aws_region     = var.aws_region
  environment    = var.environment
  project_name   = var.project_name
  s3_bucket_name = var.s3_bucket_name
  s3_kms_key_arn = aws_kms_key.logs.arn
}

# DynamoDB Module
module "dynamodb" {
  source = "./dynamodb"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_table_name           = var.dynamodb_table_name
  enable_point_in_time_recovery = true
  dynamodb_kms_key_arn          = aws_kms_key.logs.arn
}

# Lambda Module
module "lambda" {
  source = "./lambda"

  aws_region           = var.aws_region
  environment          = var.environment
  project_name         = var.project_name
  lambda_function_name = var.lambda_function_name
  dynamodb_table_name  = var.dynamodb_table_name
  s3_bucket_name       = var.s3_bucket_name
  lambda_kms_key_arn   = aws_kms_key.logs.arn
}

# API Gateway Module
module "api_gateway" {
  source = "./api-gateway"

  aws_region      = var.aws_region
  environment     = var.environment
  project_name    = var.project_name
  log_kms_key_arn = aws_kms_key.logs.arn
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
}

