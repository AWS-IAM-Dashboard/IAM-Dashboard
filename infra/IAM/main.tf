terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_iam_role_policy" "backend_full_iam" {
  name = "iam-dashboard-backend-full-iam"
  role = "iam-dashboard-role-backend"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowFullIAM"
        Effect = "Allow"
        Action = "iam:*"
        Resource = "*"
      }
    ]
  })
}
