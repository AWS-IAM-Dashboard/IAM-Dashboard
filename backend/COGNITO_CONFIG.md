# Cognito Configuration Documentation

This documentation provides detailed information on the architecture of Cognito for the IAM Dashboard.

## Purpose/Explanation

- Authenticates Users
- Authorizes Access

Using Amazon Cognito User Pools as OAuth 2.0. Cognito issues JWT that backend validates per request.

## Implementing OAuth 2.0 Through Amazon Cognito

### OAuth 2.0 roles

1. IAM Dashboard: Client submits request for authenitcation and authorization to AWS Services.
2. AWS Cognito Service: Authenticates and authorizes client. 
3. Backend Service: Issues JWT and validates authentic tokens. 

### JWT used in OAuth 2.0 Protocol

- Authorization Tokens: These are AWS Cognito issued tokens to grant access to IAM Dashboard security scanners.

### Flow in our architecture

1. User attemps to access IAM Dashboard by logging in.
2. The IAM Dashboard gets request, redirects to Cognito hosted UI.
3. Cognito Hosted UI authenticates against backend user pools and responds with access tokens.
4. Backend service exchanges application code for JWT tokens.
5. Any subsequent requests will be screened for JWT validation to ensure the confidentiality of client data.

<center><b>Typical OAuth 2.0 Flow</center>

![OAuth 2.0 Flow](https://d2908q01vomqb2.cloudfront.net/22d200f8670dbdb3e253a90eee5098477c95c23d/2024/03/26/img1-7.png)





