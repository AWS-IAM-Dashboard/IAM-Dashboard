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

# ── Scan Results Table ─────────────────────────────────────────────────
# Stores security scan output and history from the scanner Lambda.

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

  tags = {
    Name        = var.dynamodb_table_name
    Project     = var.project_name
    Env         = var.environment
    ManagedBy   = "terraform"
    Description = "Stores security scan results from AWS native scanners and custom OPA policies"
  }
}

# ── Registered Accounts Table ─────────────────────────────────────────────────
# Stores AWS accounts registered for multi-account scanning.
# Separate from the scan results table — do not combine.

resource "aws_dynamodb_table" "accounts" {
  name         = var.accounts_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "account_id"

  attribute {
    name = "account_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_accounts_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.dynamodb_kms_key_arn
  }

  deletion_protection_enabled = var.environment == "prod"

  tags = {
    Name      = var.accounts_table_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
    Service   = "account-management"
    Purpose   = "multi-account-registry"
  }
}
