# Purpose:
#   Values in this file are loaded by Terraform to configure
#   Cognito (User Pool, Hosted UI domain, OAuth redirect URLs)

# Where Cognito resources will be created. Should match app's region.
aws_region = "us-east-1"

# The Cognito User Pool name to create/use
user_pool_name = "iam-dashboard-user-pool-dev"

# This becomes:
#   https://<cognito_domain>.auth.<region>.amazoncognito.com
# Must be globally unique *within the region*.
cognito_domain = "iam-dashboard-auth-dev-12345"

# After the user signs in via the Hosted UI, Cognito redirects here.
# Must EXACTLY match what app uses.
callback_urls = ["http://localhost:3000/callback"]

# Where Cognito redirects after logout.
logout_urls = ["http://localhost:3000/logout"]



