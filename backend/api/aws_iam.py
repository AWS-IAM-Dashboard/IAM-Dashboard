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

            # Fetch IAM analysis once and pass the cached result to helpers to
            # avoid making redundant API calls for each sub-section
            iam_report = aws_service.get_iam_analysis(region)

            iam_data = {
                'account_id': account_id,
                'users': self._analyze_users(iam_report),
                'roles': self._analyze_roles(iam_report),
                'policies': self._analyze_policies(iam_report),
                'access_keys': self._analyze_access_keys(),
                'security_findings': self._get_security_findings(aws_service, region),
                'recommendations': self._get_recommendations()
            }

            return iam_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error analyzing IAM: {str(e)}")
            return {'error': 'Failed to analyze IAM configuration'}, 500

    def _analyze_users(self, iam_report):
        """Extract user metrics from the pre-fetched IAM analysis result"""
        try:
            return iam_report.get('users', {})
        except Exception as e:
            logger.error(f"Error analyzing users: {str(e)}")
            return {}

    def _analyze_roles(self, iam_report):
        """Extract role metrics from the pre-fetched IAM analysis result"""
        try:
            return iam_report.get('roles', {})
        except Exception as e:
            logger.error(f"Error analyzing roles: {str(e)}")
            return {}

    def _analyze_policies(self, iam_report):
        """Extract policy metrics from the pre-fetched IAM analysis result"""
        try:
            return iam_report.get('policies', {})
        except Exception as e:
            logger.error(f"Error analyzing policies: {str(e)}")
            return {}

    def _analyze_access_keys(self):
        """Access key analysis placeholder — not yet available from get_iam_analysis"""
        return {
            'total_access_keys': 0,
            'active_access_keys': 0,
            'inactive_access_keys': 0,
            'old_access_keys': 0,
            'unused_access_keys': 0
        }

    def _get_security_findings(self, aws_service, region):
        """
        Get IAM-specific security findings from Security Hub.
        Uses AwsIam prefix to match all IAM resource types (AwsIamUser, AwsIamRole, etc.)
        """
        try:
            all_findings = aws_service.get_security_hub_findings(region)
            return [
                f for f in all_findings
                if isinstance(f, dict) and
                any(str(r.get('Type', '')).startswith('AwsIam')
                    for r in f.get('Resources', []))
            ]
        except Exception as e:
            logger.error(f"Error getting IAM security findings: {str(e)}")
            return []

    def _get_recommendations(self):
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
