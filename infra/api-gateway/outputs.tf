output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_apigatewayv2_api.api.id
}

output "api_gateway_arn" {
  description = "ARN of the API Gateway"
  value       = aws_apigatewayv2_api.api.arn
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "api_gateway_invoke_url" {
  description = "Full invoke URL for the API Gateway stage"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/${var.stage_name}"
}

output "api_gateway_stage_id" {
  description = "ID of the API Gateway stage"
  value       = aws_apigatewayv2_stage.default.id
}

output "health_check_url" {
  description = "Full URL of the GET /health endpoint used by deploy verification (D13)"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/${var.stage_name}/health"
}

