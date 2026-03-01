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

# IAM role for Lambda function
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

# IAM policy for Lambda function
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.lambda_role_name}-policy"
  role = aws_iam_role.lambda_role.id

  policy = file("${path.module}/lambda-role-policy.json")
}

# Package Lambda function code
data "archive_file" "lambda_zip" {
  count       = var.lambda_zip_file == "" ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"
  source_file = "${path.module}/lambda_function.py"
}

# Lambda function
resource "aws_lambda_function" "scanner" {
  filename         = var.lambda_zip_file != "" ? var.lambda_zip_file : data.archive_file.lambda_zip[0].output_path
  function_name    = var.lambda_function_name
  role            = aws_iam_role.lambda_role.arn
  handler         = "lambda_function.lambda_handler"
  runtime         = var.lambda_runtime
  architectures   = [var.lambda_architecture]
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size
  kms_key_arn     = var.lambda_kms_key_arn
  reserved_concurrent_executions = var.lambda_reserved_concurrency

  # Source code hash will force update when code changes
  source_code_hash = var.lambda_zip_file != "" ? filebase64sha256(var.lambda_zip_file) : data.archive_file.lambda_zip[0].output_base64sha256

  environment {
    variables = merge(
      var.lambda_environment_variables,
      {
        DYNAMODB_TABLE_NAME = var.dynamodb_table_name
        S3_BUCKET_NAME      = var.s3_bucket_name
        PROJECT_NAME        = var.project_name
        ENVIRONMENT         = var.environment
      }
    )
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  tags = {
    Name      = var.lambda_function_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Service   = "scanner"
  }

  depends_on = [aws_iam_role_policy.lambda_policy]
}

