"""
Dashboard API endpoints for overview data and metrics.
Supports multi-account context via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.aws_service import AWSService
from services.grafana_service import GrafanaService
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class DashboardResource(Resource):
    """Dashboard overview and metrics endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.grafana_service = GrafanaService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('time_range', type=str, location='args',
                                 default='24h', help='Time range for metrics')
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get dashboard overview data, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            time_range = args.get('time_range', '24h')
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given
            session = self.org_service.get_session_for_account(account_id) \
                if account_id else None
            aws_service = AWSService(session=session)  # noqa: F841 — used when methods are wired

            overview_data = {
                'account_id': account_id,
                'summary': self._get_security_summary(region),
                'alerts': self._get_recent_alerts(region),
                'compliance': self._get_compliance_status(region),
                'cost_analysis': self._get_cost_analysis(region),
                'performance_metrics': self._get_performance_metrics(time_range)
            }

            return overview_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error getting dashboard data: {str(e)}")
            return {'error': 'Failed to fetch dashboard data'}, 500

    def _get_security_summary(self, region):
        """Get security summary metrics"""
        return {
            'total_findings': 0,
            'critical_findings': 0,
            'high_findings': 0,
            'medium_findings': 0,
            'low_findings': 0,
            'compliant_resources': 0,
            'non_compliant_resources': 0
        }

    def _get_recent_alerts(self, region):
        """Get recent security alerts"""
        return []

    def _get_compliance_status(self, region):
        """Get compliance status"""
        return {
            'overall_score': 0,
            'frameworks': {
                'SOC2': {'score': 0, 'status': 'Not Assessed'},
                'PCI_DSS': {'score': 0, 'status': 'Not Assessed'},
                'HIPAA': {'score': 0, 'status': 'Not Assessed'}
            }
        }

    def _get_cost_analysis(self, region):
        """Get cost analysis data"""
        return {
            'monthly_cost': 0,
            'cost_trend': 'stable',
            'top_services': [],
            'recommendations': []
        }

    def _get_performance_metrics(self, time_range):
        """Get performance metrics from Grafana"""
        return {
            'response_time': 0,
            'throughput': 0,
            'error_rate': 0,
            'availability': 0
        }
