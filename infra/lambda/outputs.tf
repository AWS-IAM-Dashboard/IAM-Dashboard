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

output "lambda_ses_function_name" {
  description = "Name of the SES notification Lambda function"
  value       = aws_lambda_function.ses_notification.function_name
}

output "lambda_ses_function_arn" {
  description = "ARN of the SES notification Lambda function"
  value       = aws_lambda_function.ses_notification.arn
}
