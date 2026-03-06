# Architectural Decision: EC2 for the IAM Dashboard

## Summary

This markdown document evaluates the compute infrastructure required to host our Flask-based IAM Dashboard.

## Stateful Authentication (Cognito OAuth 2.0)

### Hosted UI Redirect

Our Flask app will be constantly listening to our login endpoint, redirecting users to the Cognito Hosted UI each time they request to log in.

### Auth callback endpoint

Cognito requires us to give a callback uri for handling token exchange. We are doing this by creating a state token between our EC2 instance and Cognito to prevent CSRF attacks.
We also have our Flask app listening the callback endpoint to handle token exchange to give them back to the user once they are created by Cognito.

## Log In / Sign Up Flow

1. User asks to Log In
2. Server gets request and redirects to Cognito
3. Cognito handles User Authentication

## Token Exchange

1. Cognito redirects to the given Auth Callback URI
2. Backend gets request and asks Cognito for the Users tokens
3. Cognito gives tokens back to the backend and they are sent to the User within our Flask app

## Conclusion

Based on the Auth requirements, and due to the nature of our authentication flow, having an EC2 instance as HTTP server is the best approach to handle all users requests and Cognito responses.
