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

# DynamoDB table for scan results
resource "aws_dynamodb_table" "scan_results" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scan_id"
  range_key    = "timestamp"

  attribute {
    name = "scan_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # Scanner type attribute for potential GSI (optional)
  dynamic "attribute" {
    for_each = var.enable_scanner_type_index ? [1] : []
    content {
      name = "scanner_type"
      type = "S"
    }
  }

  # Global Secondary Index for querying by scanner_type (optional)
  dynamic "global_secondary_index" {
    for_each = var.enable_scanner_type_index ? [1] : []
    content {
      name            = "scanner-type-index"
      hash_key        = "scanner_type"
      range_key       = "timestamp"
      projection_type = "ALL"
    }
  }

  # Enable point-in-time recovery for data protection (optional)
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  # Enable deletion protection in production
  deletion_protection_enabled = var.environment == "prod"

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name        = var.dynamodb_table_name
    Project     = var.project_name
    Env         = var.environment
    ManagedBy   = "terraform"
    Description = "Stores security scan results from AWS native scanners and custom OPA policies"
  }
}

# Terraform import/state migration notes:
# - If this table already exists, import it into state before applying:
#     terraform -chdir=infra/dynamodb import aws_dynamodb_table.iam_findings <EXISTING_TABLE_NAME>
# - After import, run plan/apply to ensure TTL, tags, and encryption match this config.
# DynamoDB table for IAM findings (TTL aligns with data retention policy)
resource "aws_dynamodb_table" "iam_findings" {
  name         = var.iam_findings_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "finding_id"
  range_key    = "detected_at"

  attribute {
    name = "finding_id"
    type = "S"
  }

  attribute {
    name = "detected_at"
    type = "S"
  }

  attribute {
    name = "resource_type"
    type = "S"
  }

  global_secondary_index {
    name            = "resource-index"
    hash_key        = "resource_type"
    range_key       = "detected_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  deletion_protection_enabled = var.environment == "prod"

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name        = var.iam_findings_table_name
    Project     = var.project_name
    Env         = var.environment
    ManagedBy   = "terraform"
    Description = "Stores IAM security findings; TTL on expires_at for automatic expiration"
  }
}
