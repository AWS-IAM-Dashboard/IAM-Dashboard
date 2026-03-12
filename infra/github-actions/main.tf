terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# OIDC Provider for GitHub Actions (already exists, reference it by ARN)
# Using data source with ARN lookup instead of URL to avoid needing ListOpenIDConnectProviders permission
data "aws_caller_identity" "current" {}

locals {
  oidc_provider_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions_deployer" {
  name = var.github_actions_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo_owner}/${var.github_repo_name}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name      = var.github_actions_role_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

# Policy for S3 access (frontend deployment, scan results, and Terraform state)
resource "aws_iam_role_policy" "github_actions_s3_policy" {
  name = "${var.github_actions_role_name}-s3-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # All S3 bucket read operations (Terraform needs to read all bucket attributes)
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucket*",
          "s3:GetAccelerateConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:Get*"
        ]
        Resource = [
          "arn:aws:s3:::${var.frontend_s3_bucket_name}",
          "arn:aws:s3:::${var.scan_results_s3_bucket_name}"
        ]
      },
      {
        # Object operations (on bucket/*)
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutBucket*",
          "s3:DeleteBucket*",
          "s3:*"
        ]
        Resource = [
          "arn:aws:s3:::${var.frontend_s3_bucket_name}/*",
          "arn:aws:s3:::${var.scan_results_s3_bucket_name}/*"
        ]
      }
    ]
  })
}

# Policy for Lambda function updates
resource "aws_iam_role_policy" "github_actions_lambda_policy" {
  name = "${var.github_actions_role_name}-lambda-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:ListFunctions",
          "lambda:ListVersionsByFunction",
          "lambda:GetFunctionCodeSigningConfig",
          "lambda:ListAliases",
          "lambda:GetPolicy",
          "lambda:ListTags",
          "lambda:Get*",
          "lambda:List*",
          "lambda:CreateFunction",
          "lambda:UpdateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:DeleteFunction",
          "lambda:*"
        ]
        Resource = [
          "arn:aws:lambda:${var.aws_region}:*:function:${var.lambda_function_name}",
          "arn:aws:lambda:${var.aws_region}:*:function:${var.lambda_function_name}:*"
        ]
      }
    ]
  })
}

# Policy for DynamoDB access (for scan results and Terraform state)
resource "aws_iam_role_policy" "github_actions_dynamodb_policy" {
  name = "${var.github_actions_role_name}-dynamodb-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:ListTagsOfResource",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams",
          "dynamodb:Describe*",
          "dynamodb:List*",
          "dynamodb:CreateTable",
          "dynamodb:UpdateTable",
          "dynamodb:DeleteTable",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:*"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.dynamodb_table_name}",
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.dynamodb_table_name}/index/*"
        ]
      }
    ]
  })
}

# Policy for CloudFront cache invalidation
resource "aws_iam_role_policy" "github_actions_cloudfront_policy" {
  name = "${var.github_actions_role_name}-cloudfront-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy for API Gateway (if needed for deployment)
resource "aws_iam_role_policy" "github_actions_apigateway_policy" {
  name = "${var.github_actions_role_name}-apigateway-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET",
          "apigatewayv2:GET"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis/*",
          "arn:aws:apigateway:${var.aws_region}::/apis/*",
          "arn:aws:apigateway:${var.aws_region}::/apis/*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:PATCH",
          "apigateway:DELETE",
          "apigateway:*"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis/*",
          "arn:aws:apigateway:${var.aws_region}::/apis/*",
          "arn:aws:apigateway:${var.aws_region}::/tags/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "apigatewayv2:POST",
          "apigatewayv2:PUT",
          "apigatewayv2:PATCH",
          "apigatewayv2:DELETE",
          "apigatewayv2:*"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/apis/*",
          "arn:aws:apigateway:${var.aws_region}::/tags/*"
        ]
      }
    ]
  })
}

# Policy for IAM read access (needed for Terraform to read role state)
resource "aws_iam_role_policy" "github_actions_iam_read_policy" {
  name = "${var.github_actions_role_name}-iam-read-policy"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListRoleTags",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:Get*",
          "iam:List*",
          "iam:CreateRole",
          "iam:UpdateRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:*"
        ]
        Resource = [
          "arn:aws:iam::*:role/${var.github_actions_role_name}",
          "arn:aws:iam::*:role/iam-dashboard-*",
          "arn:aws:iam::*:policy/*"
        ]
      }
    ]
  })
}

# Policy for Terraform state management (S3 backend) - Only created if bucket/table are specified
resource "aws_iam_role_policy" "github_actions_terraform_state_policy" {
  count = var.terraform_state_bucket != "" && var.terraform_state_lock_table != "" ? 1 : 0
  name  = "${var.github_actions_role_name}-terraform-state-policy"
  role  = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.terraform_state_bucket}",
          "arn:aws:s3:::${var.terraform_state_bucket}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:*:table/${var.terraform_state_lock_table}"
      }
    ]
  })
}

