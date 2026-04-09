output "api_id" {
  description = "API Gateway HTTP API ID"
  value       = aws_apigatewayv2_api.auth.id
}

output "api_arn" {
  description = "API Gateway HTTP API ARN"
  value       = aws_apigatewayv2_api.auth.arn
}

output "api_endpoint" {
  description = "Base endpoint for the HTTP API"
  value       = aws_apigatewayv2_api.auth.api_endpoint
}

output "stage_invoke_url" {
  description = "Invoke URL including stage"
  value       = "${aws_apigatewayv2_api.auth.api_endpoint}/${aws_apigatewayv2_stage.auth.name}"
}
