# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

# Create the User Pool
resource "aws_cognito_user_pool" "iam_dashboard_pool" {
  name = var.user_pool_name

  # Ensure email is a required attribute for the dashboard
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    # Simple policy for initial testing
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

# Configure the Client
resource "aws_cognito_user_pool_client" "dashboard_client" {
  name         = "iam-dashboard-client"
  user_pool_id = aws_cognito_user_pool.iam_dashboard_pool.id

  # OpenID Connect settings
  allowed_oauth_flows          = ["code"]
  allowed_oauth_scopes         = ["openid", "email", "profile"] # Focused on requested headers
  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  # logout_urls   = var.logout_urls --> Not needed for initial testing, can add later

  # Secure against unauthorized grant types
  allowed_oauth_flows_user_pool_client = true

  # Prevent username/email enumeration
  prevent_user_existence_errors = "ENABLED"
}

# Create a UI Domain for the login dashboard
resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain
  user_pool_id = aws_cognito_user_pool.iam_dashboard_pool.id
}