# OAuth Login Flow

## Setup

### EC2 Instance

- We create an EC2 instance that will serve as our backend server
- This is where requests will be handled

### Cognito Hosted UI Redirect

- We receive login requests from the frontend, then we redirect them to Cognito Hosted UI
- Cognito Hosted UI handles user authentication

### Auth Callback

- We create a callback endpoint that will ask for Cognito tokens
- We handle token exchange from the server side

## Communication Sequence

### Initial Log In / Sign Up

1. User asks to Log In
2. Server gets request and redirects to Cognito
3. Cognito handles User Authentication

### Token Exchange

1. Callback asks for Cognito tokens
2. Backend handles tokens and returns a response to User
