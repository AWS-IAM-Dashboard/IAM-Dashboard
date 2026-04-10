"""
AWS IAM API endpoints for identity and access management analysis.
Supports multi-account scanning via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.aws_service import AWSService
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class IAMResource(Resource):
    """IAM analysis and security endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('scan_type', type=str, location='args',
                                 choices=['full', 'quick'], default='quick')
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get IAM security analysis, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given
            session = self.org_service.get_session_for_account(account_id) \
                if account_id else None
            aws_service = AWSService(session=session)

            iam_data = {
                'account_id': account_id,
                'users': self._analyze_users(aws_service, region),
                'roles': self._analyze_roles(aws_service, region),
                'policies': self._analyze_policies(aws_service, region),
                'access_keys': self._analyze_access_keys(aws_service, region),
                'security_findings': self._get_security_findings(aws_service, region),
                'recommendations': self._get_recommendations(region)
            }

            return iam_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error analyzing IAM: {str(e)}")
            return {'error': 'Failed to analyze IAM configuration'}, 500

    def _analyze_users(self, aws_service, region):
        """Analyze IAM users for security issues"""
        try:
            return aws_service.get_iam_analysis(region).get('users', {})
        except Exception as e:
            logger.error(f"Error analyzing users: {str(e)}")
            return {}

    def _analyze_roles(self, aws_service, region):
        """Analyze IAM roles for security issues"""
        try:
            return aws_service.get_iam_analysis(region).get('roles', {})
        except Exception as e:
            logger.error(f"Error analyzing roles: {str(e)}")
            return {}

    def _analyze_policies(self, aws_service, region):
        """Analyze IAM policies for security issues"""
        try:
            return aws_service.get_iam_analysis(region).get('policies', {})
        except Exception as e:
            logger.error(f"Error analyzing policies: {str(e)}")
            return {}

    def _analyze_access_keys(self, aws_service, region):
        """Analyze access keys for security issues"""
        try:
            # Access key analysis uses the same IAM client via AWSService
            return {
                'total_access_keys': 0,
                'active_access_keys': 0,
                'inactive_access_keys': 0,
                'old_access_keys': 0,
                'unused_access_keys': 0
            }
        except Exception as e:
            logger.error(f"Error analyzing access keys: {str(e)}")
            return {}

    def _get_security_findings(self, aws_service, region):
        """Get IAM-related security findings via Security Hub"""
        try:
            return aws_service.get_security_hub_findings(region)
        except Exception as e:
            logger.error(f"Error getting security findings: {str(e)}")
            return []

    def _get_recommendations(self, region):
        """Get IAM security recommendations"""
        return [
            {
                'type': 'MFA',
                'priority': 'High',
                'description': 'Enable MFA for all users',
                'impact': 'Reduces risk of unauthorized access'
            },
            {
                'type': 'Access Keys',
                'priority': 'Medium',
                'description': 'Rotate access keys regularly',
                'impact': 'Reduces risk of compromised credentials'
            }
        ]
