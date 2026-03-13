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

resource "aws_kms_key" "IAM_Dashboard_Key" {
  policy              = file("${path.module}/kms_policy.json")
  enable_key_rotation = true
}

# S3 Module
module "s3" {
  source = "./s3"

  aws_region             = var.aws_region
  environment            = var.environment
  project_name           = var.project_name
  s3_bucket_name         = var.s3_bucket_name
  s3_logging_bucket_name = "${var.s3_bucket_name}-access-logs"
}

# DynamoDB Module
module "dynamodb" {
  source = "./dynamodb"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_table_name           = var.dynamodb_table_name
  dynamodb_kms_key_arn          = aws_kms_key.IAM_Dashboard_Key.arn
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
  s3_bucket_name       = var.s3_bucket_name
  lambda_kms_key_arn   = aws_kms_key.IAM_Dashboard_Key.arn
}

# API Gateway Module
module "api_gateway" {
  source = "./api-gateway"

  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name
  kms_key_arn  = aws_kms_key.IAM_Dashboard_Key.arn
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
