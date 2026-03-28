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

  code_signing_config_arn = aws_lambda_code_signing_config.scanner.arn

  depends_on = [aws_iam_role_policy.lambda_policy]
}

# ── Code Signing (CKV_AWS_272) ──────────────────────────────────────────────

# AWS Signer signing profile for Lambda deployments
resource "aws_signer_signing_profile" "lambda" {
  platform_id = "AWSLambda-SHA384-ECDSA"
  name_prefix = "iam_dashboard_"

  signature_validity_period {
    value = 135
    type  = "MONTHS"
  }

  tags = {
    Name      = "${var.project_name}-lambda-signing"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

# Code signing config — only code signed by the profile above can run
resource "aws_lambda_code_signing_config" "scanner" {
  description = "Code signing for IAM Dashboard Lambda"

  allowed_publishers {
    signing_profile_version_arns = [aws_signer_signing_profile.lambda.version_arn]
  }

  policies {
    untrusted_artifact_on_deployment = "Warn"
  }
}

# ── Lambda Artifacts S3 Bucket (required by AWS Signer) ─────────────────────

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.project_name}-lambda-artifacts"

  tags = {
    Name      = "${var.project_name}-lambda-artifacts"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "lambda_artifacts" {
  bucket                  = aws_s3_bucket.lambda_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
