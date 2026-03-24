terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrap uses local state so it does not depend on S3.
  # Run this once per account/region to create the state bucket and lock table.
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for Terraform state (used by main infra/ Terraform).
# Must be separate from the frontend bucket so deploy's "s3 sync --delete" never touches state.
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  tags = {
    Name        = var.state_bucket_name
    Purpose     = "terraform-state"
    ManagedBy   = "terraform"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Optional: prevent accidental deletion of the state bucket.
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "keep-state"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# DynamoDB table for Terraform state locking (prevents concurrent apply).
# Main Terraform backend should set: dynamodb_table = var.lock_table_name
resource "aws_dynamodb_table" "terraform_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = var.lock_table_name
    Purpose     = "terraform-state-lock"
    ManagedBy   = "terraform"
    Project     = var.project_name
    Environment = var.environment
  }
}
