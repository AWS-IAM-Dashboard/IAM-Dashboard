terraform {
  required_version = ">= 1.12.2"
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
  enable_key_rotation = true
}

data "aws_lambda_function" "auth" {
  function_name = var.auth_lambda_function_name
}

data "aws_wafv2_web_acl" "cloudfront" {
  name  = "CreatedByCloudFront-b037e429"
  scope = "CLOUDFRONT"
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

module "auth_dynamodb" {
  source = "./DynamoDB_Auth"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
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

# API Gateway Module for the Scanner APIs
module "api_gateway" {
  source = "./api-gateway"

  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name
  kms_key_arn  = aws_kms_key.IAM_Dashboard_Key.arn
}

# API Gateway Module for the Authentication APIs
module "auth_api_gateway" {
  source = "./API_Gateway_Auth"

  aws_region           = var.aws_region
  environment          = var.environment
  project_name         = var.project_name
  stage_name           = "v1"
  lambda_function_arn  = data.aws_lambda_function.auth.arn
  cors_allowed_origins = var.allowed_urls
}

module "cognito" {
  source = "./cognito"

  aws_region            = var.aws_region
  environment           = var.environment
  project_name          = var.project_name
  cognito_domain_prefix = var.cognito_domain_prefix
  callback_urls         = var.cognito_allowed_urls
  logout_urls           = var.cognito_allowed_urls
}

# CloudFront Module (frontend SPA behind S3 website)
module "cloudfront" {
  source = "./cloudfront"

  aws_region          = var.aws_region
  environment         = var.environment
  project_name        = var.project_name
  s3_website_endpoint = var.prod_s3_endpoint
  web_acl_id          = data.aws_wafv2_web_acl.cloudfront.arn
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
