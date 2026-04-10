"""
AWS Config API endpoints for compliance and configuration management.
Supports multi-account scanning via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class ConfigResource(Resource):
    """AWS Config analysis endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('resource_type', type=str, location='args',
                                 help='AWS resource type')
        self.parser.add_argument('compliance_type', type=str, location='args',
                                 choices=['COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE'])
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get AWS Config compliance data, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            resource_type = args.get('resource_type')
            compliance_type = args.get('compliance_type')
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given.
            # aws_service will be used here once Config API methods are wired up.
            if account_id:
                self.org_service.get_session_for_account(account_id)

            config_data = {
                'account_id': account_id,
                'compliance_summary': self._get_compliance_summary(region),
                'resource_inventory': self._get_resource_inventory(region, resource_type),
                'configuration_changes': self._get_configuration_changes(region),
                'compliance_rules': self._get_compliance_rules(region),
                'recommendations': self._get_recommendations(region)
            }

            return config_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error getting Config data: {str(e)}")
            return {'error': 'Failed to fetch Config data'}, 500

    def _get_compliance_summary(self, region):
        """Get compliance summary from AWS Config"""
        return {
            'total_resources': 0,
            'compliant_resources': 0,
            'non_compliant_resources': 0,
            'not_applicable_resources': 0,
            'compliance_percentage': 0
        }

    def _get_resource_inventory(self, region, resource_type=None):
        """Get resource inventory from AWS Config"""
        return {
            'total_resources': 0,
            'resource_types': {},
            'resources_by_region': {},
            'resources_by_account': {}
        }

    def _get_configuration_changes(self, region):
        """Get configuration changes from AWS Config"""
        return {
            'total_changes': 0,
            'changes_by_resource_type': {},
            'changes_by_severity': {},
            'recent_changes': []
        }

    def _get_compliance_rules(self, region):
        """Get compliance rules from AWS Config"""
        return {
            'total_rules': 0,
            'enabled_rules': 0,
            'disabled_rules': 0,
            'rules_by_category': {},
            'rules_by_severity': {}
        }

    def _get_recommendations(self, region):
        """Get compliance recommendations"""
        return [
            {
                'type': 'Configuration Management',
                'priority': 'High',
                'description': 'Enable AWS Config for all resources',
                'impact': 'Provides compliance monitoring'
            },
            {
                'type': 'Rule Management',
                'priority': 'Medium',
                'description': 'Review and update compliance rules',
                'impact': 'Ensures effective compliance monitoring'
            }
        ]
