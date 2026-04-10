"""
Organizations Service — AWS Organizations and STS integration.

Responsibilities:
  - list_accounts()              : fetch all active accounts from the Organizations API
  - get_session_for_account()    : return a boto3 Session scoped to a specific account
                                   (management account → default session, member account →
                                   STS AssumeRole using the cross-account role)
"""

import os
import boto3
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Role name that must exist in every member account, granting read-only scan permissions.
# Matches the role name used by the Lambda scanner (CROSS_ACCOUNT_ROLE_NAME env var).
CROSS_ACCOUNT_ROLE_NAME = os.environ.get(
    'CROSS_ACCOUNT_ROLE_NAME', 'SecurityAuditRole-test'
)

# The AWS account ID of the management account (set in env).
# Used to decide whether role assumption is needed.
MANAGEMENT_ACCOUNT_ID = os.environ.get('AWS_MANAGEMENT_ACCOUNT_ID', '')


class OrganizationsService:
    """Service for AWS Organizations account discovery and cross-account session management."""

    def __init__(self):
        # Use the default session — management account creds from env
        self.session = boto3.Session()

    def list_accounts(self) -> list:
        """
        Fetch all ACTIVE accounts in the AWS Organization, including the management account.

        Paginates automatically through the Organizations API.
        Raises RuntimeError (never returns an empty list silently) if the API call fails.

        Returns:
            List of dicts: {id, name, email, is_management}
        """
        try:
            org_client = self.session.client('organizations')
            accounts = []
            paginator = org_client.get_paginator('list_accounts')

            for page in paginator.paginate():
                for account in page.get('Accounts', []):
                    # Only include accounts that are fully active in the org
                    if account.get('Status') != 'ACTIVE':
                        continue

                    accounts.append({
                        'id': account['Id'],
                        'name': account['Name'],
                        'email': account.get('Email', ''),
                        'is_management': account['Id'] == MANAGEMENT_ACCOUNT_ID,
                    })

            logger.info(f"Listed {len(accounts)} active accounts from AWS Organizations")
            return accounts

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Organizations API error ({error_code}): {str(e)}")
            # Raise explicitly — callers must not treat a failure as an empty org
            raise RuntimeError(
                f"Failed to list accounts from AWS Organizations: {error_code}"
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error listing accounts: {str(e)}")
            raise RuntimeError(f"Failed to list accounts: {str(e)}") from e

    def get_session_for_account(self, account_id: str) -> boto3.Session:
        """
        Return a boto3 Session scoped to the given account.

        - Management account → returns the default session (no role assumption needed).
        - Member account     → assumes the cross-account role via STS and returns a
                               new session built from the temporary credentials.
                               Session name: DashboardScan-{account_id}.

        Args:
            account_id: 12-digit AWS account ID to scope the session to.

        Returns:
            boto3.Session configured for the target account.

        Raises:
            RuntimeError: if STS AssumeRole fails (HTTP 403 to the caller).
        """
        # Management account — no role assumption needed
        if account_id == MANAGEMENT_ACCOUNT_ID:
            logger.info(f"Using default session for management account {account_id}")
            return self.session

        # Member account — assume the cross-account role via STS
        sts_client = self.session.client('sts')
        role_arn = f"arn:aws:iam::{account_id}:role/{CROSS_ACCOUNT_ROLE_NAME}"

        try:
            response = sts_client.assume_role(
                RoleArn=role_arn,
                RoleSessionName=f"DashboardScan-{account_id}",
            )
        except ClientError as e:
            logger.error(f"STS AssumeRole failed for account {account_id}: {str(e)}")
            raise RuntimeError(
                f"Cannot assume role in account {account_id} — check that "
                f"{CROSS_ACCOUNT_ROLE_NAME} exists and trusts the management account"
            ) from e

        creds = response['Credentials']
        logger.info(f"Successfully assumed role for account {account_id}")

        return boto3.Session(
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_session_token=creds['SessionToken'],
        )
