"""
Accounts API endpoint — exposes the list of AWS Organization accounts.

GET /api/v1/accounts
  Returns all active accounts in the organization, including the management account.
  Response shape: [{id, name, email, is_management}, ...]

  HTTP 502 is returned if the Organizations API call fails, so the frontend
  always receives a clear error rather than an empty list.
"""

import logging
from flask_restful import Resource
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class AccountsResource(Resource):
    """Accounts listing endpoint backed by AWS Organizations."""

    def __init__(self):
        self.org_service = OrganizationsService()

    def get(self):
        """Return all active accounts in the AWS Organization."""
        try:
            accounts = self.org_service.list_accounts()
            return accounts, 200

        except RuntimeError as e:
            # Organizations API failure — surface a clear 502 so the frontend
            # knows the account list is unavailable, not just empty
            logger.error(f"Failed to list accounts: {str(e)}")
            return {'error': str(e)}, 502

        except Exception as e:
            logger.error(f"Unexpected error in accounts endpoint: {str(e)}")
            return {'error': 'Failed to retrieve accounts'}, 500
