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

resource "aws_iam_role" "lambda_ses_role" {
  name = "${var.lambda_ses_function}-role"

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
    Name      = "${var.lambda_ses_function}-role"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role_policy" "lambda_ses_policy" {
  name = "${var.lambda_ses_function}-policy"
  role = aws_iam_role.lambda_ses_role.id

  policy = file("${path.module}/lambda_ses_policy.json")
}

# Package Lambda function code
data "archive_file" "lambda_zip" {
  count       = var.lambda_zip_file == "" ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"
  source_file = "${path.module}/lambda_function.py"
}

data "archive_file" "lambda_ses_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda_ses.zip"
  source_file = "${path.module}/lambda_ses.py"
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

  depends_on = [aws_iam_role_policy.lambda_policy]
}

resource "aws_cloudwatch_log_group" "lambda_ses" {
  name              = "/aws/lambda/${var.lambda_ses_function}"
  retention_in_days = 365
  kms_key_id        = var.lambda_kms_key_arn

  tags = {
    Name      = "/aws/lambda/${var.lambda_ses_function}"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Service   = "ses-notification"
  }
}

resource "aws_lambda_function" "ses_notification" {
  filename                       = data.archive_file.lambda_ses_zip.output_path
  function_name                  = var.lambda_ses_function
  role                           = aws_iam_role.lambda_ses_role.arn
  handler                        = "lambda_ses.lambda_handler"
  runtime                        = var.lambda_runtime
  architectures                  = [var.lambda_architecture]
  timeout                        = var.lambda_timeout
  memory_size                    = var.lambda_memory_size
  kms_key_arn                    = var.lambda_kms_key_arn
  reserved_concurrent_executions = var.lambda_reserved_concurrency
  source_code_hash               = data.archive_file.lambda_ses_zip.output_base64sha256

  environment {
    variables = merge(
      var.lambda_ses_environment_variables,
      {
        SES_FROM_EMAIL        = var.ses_from_email
        SCAN_ALERT_RECIPIENTS = var.scan_alert_recipients
        S3_BUCKET_NAME        = var.lambda_ses_bucket_name
        SES_SUBJECT_PREFIX    = var.ses_subject_prefix
        PROJECT_NAME          = var.project_name
        ENVIRONMENT           = var.environment
      }
    )
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  tags = {
    Name      = var.lambda_ses_function
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Service   = "ses-notification"
  }

  depends_on = [
    aws_iam_role_policy.lambda_ses_policy,
    aws_cloudwatch_log_group.lambda_ses
  ]
}

resource "aws_lambda_permission" "allow_scan_results_s3_invoke_ses_notification" {
  statement_id  = "AllowScanResultsS3InvokeSesNotification"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ses_notification.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${var.lambda_ses_bucket_name}"
}
