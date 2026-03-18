output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.scanner.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.scanner.arn
}

output "lambda_function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.scanner.invoke_arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = aws_iam_role.lambda_role.arn
}

output "lambda_role_name" {
  description = "Name of the Lambda IAM role"
  value       = aws_iam_role.lambda_role.name
}

output "signing_profile_name" {
  description = "Name of the AWS Signer signing profile for Lambda"
  value       = aws_signer_signing_profile.lambda.name
}

output "lambda_artifacts_bucket" {
  description = "S3 bucket for Lambda deployment artifacts (code signing)"
  value       = aws_s3_bucket.lambda_artifacts.bucket
}

