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

# S3 Module
module "s3" {
  source = "./s3"

  aws_region     = var.aws_region
  environment    = var.environment
  project_name   = var.project_name
  s3_bucket_name = var.s3_bucket_name
}

# DynamoDB Module
module "dynamodb" {
  source = "./dynamodb"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_table_name           = var.dynamodb_table_name
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
}

# API Gateway Module
module "api_gateway" {
  source = "./api-gateway"

  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name
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
