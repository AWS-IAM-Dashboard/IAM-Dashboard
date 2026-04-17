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

resource "aws_iam_role" "scan_role" {
  name = var.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${var.main_account_id}:role/${var.scanner_lambda_role_name}",
            "arn:aws:iam::${var.main_account_id}:role/${var.account_management_lambda_role_name}"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name      = var.role_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role_policy" "scan_policy" {
  name = "${var.role_name}-policy"
  role = aws_iam_role.scan_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "IAMRead"
        Effect = "Allow"
        Action = [
          "iam:ListUsers", "iam:GetUser", "iam:ListRoles", "iam:GetRole",
          "iam:ListAttachedUserPolicies", "iam:ListAttachedRolePolicies",
          "iam:ListRolePolicies", "iam:GetRolePolicy", "iam:GetUserPolicy",
          "iam:ListUserPolicies", "iam:GetPolicy", "iam:GetPolicyVersion",
          "iam:ListPolicyVersions", "iam:ListMFADevices", "iam:ListAccessKeys",
          "iam:GetAccessKeyLastUsed", "iam:ListPolicies", "iam:ListGroups"
        ]
        Resource = "*"
      },
      {
        Sid    = "EC2Read"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances", "ec2:DescribeSecurityGroups",
          "ec2:DescribeVolumes", "ec2:DescribeSnapshots", "ec2:DescribeImages"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3Read"
        Effect = "Allow"
        Action = [
          "s3:ListBucket", "s3:ListAllMyBuckets", "s3:GetBucketEncryption",
          "s3:GetPublicAccessBlock", "s3:GetBucketVersioning"
        ]
        Resource = "*"
      },
      {
        Sid    = "SecurityHubRead"
        Effect = "Allow"
        Action = [
          "securityhub:GetFindings", "securityhub:GetInsights",
          "securityhub:GetComplianceSummary"
        ]
        Resource = "*"
      },
      {
        Sid    = "GuardDutyRead"
        Effect = "Allow"
        Action = [
          "guardduty:ListDetectors", "guardduty:GetDetector",
          "guardduty:ListFindings", "guardduty:GetFindings",
          "guardduty:DescribeFindings"
        ]
        Resource = "*"
      },
      {
        Sid    = "ConfigRead"
        Effect = "Allow"
        Action = [
          "config:DescribeConfigRules", "config:GetComplianceSummaryByConfigRule",
          "config:GetComplianceSummaryByResourceType",
          "config:DescribeComplianceByConfigRule", "config:DescribeComplianceByResource"
        ]
        Resource = "*"
      },
      {
        Sid    = "InspectorRead"
        Effect = "Allow"
        Action = [
          "inspector2:ListFindings", "inspector2:ListCodeSecurityScanConfigurations", "inspector2:BatchGetFindingDetails",
          "inspector2:ListCisScans", "inspector2:ListCoverage"
        ]
        Resource = "*"
      },
      {
        Sid    = "MacieRead"
        Effect = "Allow"
        Action = [
          "macie2:ListFindings", "macie2:GetFindings", "macie2:BatchGetFindings",
          "macie2:DescribeBuckets"
        ]
        Resource = "*"
      },
      {
        Sid      = "STSCallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      }
    ]
  })
}
