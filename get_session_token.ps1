# Script helps automate toke credentials to terraform
# The token code is the number found in Google Authenticator

aws sts get-session-token --serial-number arn:aws:iam::562559071105:mfa/Alvin --token-code 389571