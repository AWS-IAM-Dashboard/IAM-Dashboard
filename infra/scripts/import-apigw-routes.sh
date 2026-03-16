#!/usr/bin/env bash
# Import API Gateway v2 routes into Terraform state.
# Usage: from repo root, set API_ID then run:
#   API_ID=erh3a09d7l ./infra/scripts/import-apigw-routes.sh
# Or from infra/: API_ID=erh3a09d7l ./scripts/import-apigw-routes.sh
set -e
API_ID="${API_ID:?Set API_ID (e.g. erh3a09d7l)}"
REGION="${REGION:-us-east-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$INFRA_DIR"

# Map route_key to Terraform resource name (must match api-gateway/main.tf)
declare -A ROUTES=(
  ["POST /scan/security-hub"]="security_hub"
  ["POST /scan/guardduty"]="guardduty"
  ["POST /scan/config"]="config"
  ["POST /scan/inspector"]="inspector"
  ["POST /scan/macie"]="macie"
  ["POST /scan/iam"]="iam"
  ["POST /scan/ec2"]="ec2"
  ["POST /scan/s3"]="s3"
  ["POST /scan/full"]="full"
)

for ROUTE_KEY in "${!ROUTES[@]}"; do
  NAME="${ROUTES[$ROUTE_KEY]}"
  ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" --output text)
  if [ -n "$ROUTE_ID" ]; then
    echo "Importing route $NAME ($ROUTE_KEY) -> $ROUTE_ID"
    terraform import "module.api_gateway.aws_apigatewayv2_route.$NAME" "${API_ID}/${ROUTE_ID}"
  else
    echo "Warning: no route found for $ROUTE_KEY"
  fi
done

echo "Done."
