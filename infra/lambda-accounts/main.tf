terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# IAM execution role
resource "aws_iam_role" "lambda_role" {
  name = var.lambda_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name      = var.lambda_role_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

# Inline policy
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.lambda_role_name}-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Sid    = "AccountsTable"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = var.accounts_table_arn
      },
      {
        Sid      = "SessionTable"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = var.session_table_arn
      },
      {
        Sid      = "STSAssumeRole"
        Effect   = "Allow"
        Action   = "sts:AssumeRole"
        Resource = var.cross_account_role_arn_pattern
      },
      {
        Sid      = "STSCallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      },
      {
        Sid    = "KMS"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = var.lambda_kms_key_arn
      },
      {
        Sid    = "XRay"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# Package Lambda source
data "archive_file" "lambda_zip" {
  count       = var.lambda_zip_file == "" ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"
  source_file = "${path.module}/lambda_function.py"
}

# Lambda function
resource "aws_lambda_function" "account_mgmt" {
  filename                       = var.lambda_zip_file != "" ? var.lambda_zip_file : data.archive_file.lambda_zip[0].output_path
  function_name                  = var.lambda_function_name
  role                           = aws_iam_role.lambda_role.arn
  handler                        = "lambda_function.lambda_handler"
  runtime                        = var.lambda_runtime
  architectures                  = [var.lambda_architecture]
  timeout                        = var.lambda_timeout
  memory_size                    = var.lambda_memory_size
  kms_key_arn                    = var.lambda_kms_key_arn
  reserved_concurrent_executions = var.lambda_reserved_concurrency
  source_code_hash               = var.lambda_zip_file != "" ? filebase64sha256(var.lambda_zip_file) : data.archive_file.lambda_zip[0].output_base64sha256

  environment {
    variables = {
      ACCOUNTS_TABLE_NAME     = var.accounts_table_name
      SESSION_TABLE_NAME      = var.session_table_name
      CROSS_ACCOUNT_ROLE_NAME = var.cross_account_role_name
      PROJECT_NAME            = var.project_name
      ENVIRONMENT             = var.environment
    }
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  tags = {
    Name      = var.lambda_function_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Service   = "account-management"
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}
