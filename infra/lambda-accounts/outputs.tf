output "lambda_function_name" {
  description = "Name of the account management Lambda function"
  value       = aws_lambda_function.account_mgmt.function_name
}

output "lambda_function_arn" {
  description = "ARN of the account management Lambda function"
  value       = aws_lambda_function.account_mgmt.arn
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the account management Lambda function"
  value       = aws_lambda_function.account_mgmt.invoke_arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}
