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

data "aws_caller_identity" "current" {}

# Use existing KMS key (no create in Terraform; CI does not need kms:CreateKey).
# Set var.kms_key_id to the key alias (e.g. alias/IAMDash-prod-logs) or key ID via tfvars or TF_VAR_kms_key_id.
data "aws_kms_key" "logs" {
  key_id = var.kms_key_id
}

data "aws_lambda_function" "auth" { # No longer needed
  function_name = var.auth_lambda_function_name
}

data "aws_wafv2_web_acl" "cloudfront" {
  name  = "CreatedByCloudFront-b037e429"
  scope = "CLOUDFRONT"
}

# S3 Module
module "s3" {
  source = "./s3"

  aws_region                   = var.aws_region
  environment                  = var.environment
  project_name                 = var.project_name
  s3_bucket_name               = var.s3_bucket_name
  s3_kms_key_arn               = data.aws_kms_key.logs.arn
  s3_logging_bucket_name       = "${var.s3_bucket_name}-access-logs"
  scan_notification_lambda_arn = module.lambda.lambda_ses_function_arn
  scan_notification_prefix     = var.scan_notification_prefix

  depends_on = [module.lambda]
}

# DynamoDB Module
module "dynamodb" {
  source = "./dynamodb"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_table_name           = var.dynamodb_table_name
  accounts_table_name           = var.accounts_table_name
  dynamodb_kms_key_arn          = data.aws_kms_key.logs.arn
  enable_point_in_time_recovery = true
}

module "auth_dynamodb" {
  source = "./DynamoDB_Auth"

  aws_region                    = var.aws_region
  environment                   = var.environment
  project_name                  = var.project_name
  dynamodb_kms_key_arn          = data.aws_kms_key.logs.arn
  enable_point_in_time_recovery = true
}

# SES Module
module "ses" {
  source = "./ses"

  aws_region      = var.aws_region
  environment     = var.environment
  project_name    = var.project_name
  sender_email    = var.sender_email
  recipient_email = var.recipient_email
}

# Lambda Module
module "lambda" {
  source = "./lambda"

  aws_region               = var.aws_region
  environment              = var.environment
  project_name             = var.project_name
  lambda_function_name     = var.lambda_function_name
  dynamodb_table_name      = var.dynamodb_table_name
  session_table_name       = module.auth_dynamodb.dynamodb_table_name
  s3_bucket_name           = var.s3_bucket_name
  scan_alert_recipients    = module.ses.recipient_email
  ses_from_email           = module.ses.sender_email
  lambda_ses_bucket_name   = var.s3_bucket_name
  email_timezone           = var.email_timezone
  scan_notification_prefix = var.scan_notification_prefix
  lambda_kms_key_arn       = data.aws_kms_key.logs.arn

  lambda_environment_variables = {
    CORS_ALLOWED_ORIGINS    = join(",", var.allowed_urls)
    ACCOUNTS_TABLE_NAME     = module.dynamodb.accounts_table_name
    CROSS_ACCOUNT_ROLE_NAME = var.cross_account_role_name
    MAIN_ACCOUNT_ID         = var.main_account_id
  }
}

# Account Management Lambda Module
module "lambda_accounts" {
  source = "./lambda-accounts"

  aws_region                     = var.aws_region
  environment                    = var.environment
  project_name                   = var.project_name
  lambda_function_name           = var.account_mgmt_lambda_function_name
  lambda_role_name               = var.account_mgmt_lambda_role_name
  accounts_table_name            = var.accounts_table_name
  accounts_table_arn             = module.dynamodb.accounts_table_arn
  session_table_name             = module.auth_dynamodb.dynamodb_table_name
  session_table_arn              = module.auth_dynamodb.dynamodb_table_arn
  cross_account_role_name        = var.cross_account_role_name
  cross_account_role_arn_pattern = var.cross_account_role_arn_pattern
  lambda_kms_key_arn             = data.aws_kms_key.logs.arn
}

# API Gateway Module for the Scanner APIs
module "api_gateway" {
  source = "./api-gateway"

  aws_region                        = var.aws_region
  environment                       = var.environment
  project_name                      = var.project_name
  kms_key_arn                       = data.aws_kms_key.logs.arn
  cognito_issuer_url                = module.cognito.issuer_url
  cognito_app_client_id             = module.cognito.app_client_id
  scanner_lambda_function_name      = var.lambda_function_name
  auth_lambda_function_name         = var.auth_lambda_function_name
  cors_allowed_origins              = var.allowed_urls
  account_mgmt_lambda_function_name = module.lambda_accounts.lambda_function_name
  account_mgmt_lambda_invoke_arn    = module.lambda_accounts.lambda_invoke_arn

}

# API Gateway Module for the Authentication APIs (Deprecated)
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
