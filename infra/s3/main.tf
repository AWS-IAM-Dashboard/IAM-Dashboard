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

# S3 bucket for frontend static hosting
resource "aws_s3_bucket" "frontend" {
  bucket = var.s3_bucket_name

  tags = {
    Name      = var.s3_bucket_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Purpose   = "static-hosting"
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "default-lifecycle"
    status = "Enabled"

    # Empty filter applies this lifecycle rule to all objects (equivalent to empty prefix).
    filter {}

    filter {} # required: apply to whole bucket

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# S3 bucket public access block (optional - disabled for static site hosting)
resource "aws_s3_bucket_public_access_block" "frontend" {
  count  = var.block_public_access ? 1 : 0
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket website configuration for static hosting
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# S3 bucket public read policy for static hosting
resource "aws_s3_bucket_policy" "frontend" {
  count  = var.enable_static_hosting ? 1 : 0
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# ---------- S3 Access Logging ----------

data "aws_caller_identity" "current" {}

# Logging bucket for frontend access logs
resource "aws_s3_bucket" "frontend_logs" {
  #checkov:skip=CKV_AWS_18:Access logging bucket does not need self-logging
  bucket = var.s3_logging_bucket_name

  tags = {
    Name      = var.s3_logging_bucket_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Purpose   = "s3-access-logs"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_logs" {
  bucket                  = aws_s3_bucket.frontend_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend_logs" {
  bucket = aws_s3_bucket.frontend_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_logs" {
  bucket = aws_s3_bucket.frontend_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.s3_kms_key_arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "frontend_logs" {
  bucket = aws_s3_bucket.frontend_logs.id

  rule {
    id     = "expire-access-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Grant the S3 logging service write access to the logging bucket
resource "aws_s3_bucket_policy" "frontend_logs" {
  bucket = aws_s3_bucket.frontend_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "S3ServerAccessLogsPolicy"
        Effect    = "Allow"
        Principal = { Service = "logging.s3.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.frontend_logs.arn}/*"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = aws_s3_bucket.frontend.arn
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Enable server access logging on the frontend bucket
resource "aws_s3_bucket_logging" "frontend" {
  bucket        = aws_s3_bucket.frontend.id
  target_bucket = aws_s3_bucket.frontend_logs.id
  target_prefix = "access-logs/"
}
