"""
AWS Security Hub API endpoints for centralized security findings.
Supports multi-account scanning via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.aws_service import AWSService
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class SecurityHubResource(Resource):
    """Security Hub analysis endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('severity', type=str, location='args',
                                 choices=['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'])
        self.parser.add_argument('status', type=str, location='args',
                                 choices=['NEW', 'NOTIFIED', 'SUPPRESSED', 'RESOLVED'])
        self.parser.add_argument('limit', type=int, location='args', default=100)
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get Security Hub findings, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            severity = args.get('severity')
            status = args.get('status')
            limit = args.get('limit', 100)
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given
            session = self.org_service.get_session_for_account(account_id) \
                if account_id else None
            aws_service = AWSService(session=session)

            security_hub_data = {
                'account_id': account_id,
                'findings': self._get_findings(aws_service, region, limit),
                'summary': self._get_findings_summary(region),
                'compliance': self._get_compliance_status(region),
                'insights': self._get_security_insights(region),
                'recommendations': self._get_recommendations(region)
            }

            return security_hub_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error getting Security Hub data: {str(e)}")
            return {'error': 'Failed to fetch Security Hub data'}, 500

    def _get_findings(self, aws_service, region, limit=100):
        """Get Security Hub findings via AWSService"""
        try:
            return aws_service.get_security_hub_findings(region)[:limit]
        except Exception as e:
            logger.error(f"Error getting findings: {str(e)}")
            return []

    def _get_findings_summary(self, region):
        """Get Security Hub findings summary"""
        return {
            'total_findings': 0,
            'critical_findings': 0,
            'high_findings': 0,
            'medium_findings': 0,
            'low_findings': 0,
            'informational_findings': 0,
            'new_findings': 0,
            'resolved_findings': 0
        }

    def _get_compliance_status(self, region):
        """Get compliance status from Security Hub"""
        return {
            'overall_score': 0,
            'frameworks': {
                'CIS_AWS_Foundations': {'score': 0, 'status': 'Not Assessed'},
                'PCI_DSS': {'score': 0, 'status': 'Not Assessed'},
                'SOC2': {'score': 0, 'status': 'Not Assessed'}
            }
        }

    def _get_security_insights(self, region):
        """Get security insights from Security Hub"""
        return []

    def _get_recommendations(self, region):
        """Get security recommendations"""
        return [
            {
                'type': 'Vulnerability Management',
                'priority': 'High',
                'description': 'Implement automated vulnerability scanning',
                'impact': 'Reduces security risks'
            },
            {
                'type': 'Compliance',
                'priority': 'Medium',
                'description': 'Enable compliance monitoring',
                'impact': 'Ensures regulatory compliance'
            }
        ]
