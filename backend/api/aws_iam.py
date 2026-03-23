"""
AWS IAM API endpoints for identity and access management analysis.
Data is sourced from the local PostgreSQL database via DatabaseService
"""

from datetime import datetime, timezone
from flask_restful import Resource, reqparse
from services.database_service import DatabaseService
import logging

logger = logging.getLogger(__name__)

# Access keys older than this many days are considered stale
ACCESS_KEY_ROTATION_DAYS = 90


class IAMResource(Resource):
    """IAM analysis and security endpoint"""

    def __init__(self):
        self.db_service = DatabaseService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, help='AWS region', location='args')
        self.parser.add_argument('scan_type', type=str, choices=['full', 'quick'], default='quick', location='args')

    def get(self):
        """Get IAM security analysis"""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')

            iam_data = {
                'users': self._analyze_users(region),
                'roles': self._analyze_roles(region),
                'policies': self._analyze_policies(region),
                'access_keys': self._analyze_access_keys(region),
                'security_findings': self._get_security_findings(region),
                'recommendations': self._get_recommendations(region)
            }

            return iam_data, 200

        except Exception as e:
            logger.error(f"Error analyzing IAM: {str(e)}")
            return {'error': 'Failed to analyze IAM configuration'}, 500

    def _analyze_users(self, region):
        """Analyze IAM users for security issues"""
        try:
            users = self.db_service.get_iam_users()

            # Determine inactive users — no activity in the last 90 days
            now = datetime.now(timezone.utc)
            inactive_users = sum(
                1 for u in users
                if u.last_activity and
                (now - u.last_activity.replace(tzinfo=timezone.utc)).days > ACCESS_KEY_ROTATION_DAYS
            )

            return {
                'total_users': len(users),
                'users_with_mfa': sum(1 for u in users if u.mfa_enabled),
                'users_without_mfa': sum(1 for u in users if not u.mfa_enabled),
                'inactive_users': inactive_users,
                'users_with_admin_access': sum(1 for u in users if u.has_admin_access),
                'users_with_console_access': sum(1 for u in users if u.has_console_access)
            }
        except Exception as e:
            logger.error(f"Error analyzing users: {str(e)}")
            return {}

    def _analyze_roles(self, region):
        """Analyze IAM roles for security issues"""
        try:
            roles = self.db_service.get_iam_roles()

            # Determine unused roles — not used in the last 90 days
            now = datetime.now(timezone.utc)
            unused_roles = sum(
                1 for r in roles
                if not r.last_used or
                (now - r.last_used.replace(tzinfo=timezone.utc)).days > ACCESS_KEY_ROTATION_DAYS
            )

            return {
                'total_roles': len(roles),
                'cross_account_roles': sum(1 for r in roles if r.is_cross_account),
                'roles_with_excessive_permissions': sum(1 for r in roles if r.has_excessive_permissions),
                'unused_roles': unused_roles,
                'roles_with_external_trust': sum(1 for r in roles if r.has_external_trust)
            }
        except Exception as e:
            logger.error(f"Error analyzing roles: {str(e)}")
            return {}

    def _analyze_policies(self, region):
        """Analyze IAM policies for security issues"""
        try:
            policies = self.db_service.get_iam_policies()

            return {
                'total_policies': len(policies),
                'inline_policies': sum(1 for p in policies if p.policy_type == 'inline'),
                'managed_policies': sum(1 for p in policies if p.policy_type == 'managed'),
                'policies_with_wildcards': sum(1 for p in policies if p.has_wildcards),
                'overly_permissive_policies': sum(1 for p in policies if p.is_overly_permissive)
            }
        except Exception as e:
            logger.error(f"Error analyzing policies: {str(e)}")
            return {}

    def _analyze_access_keys(self, region):
        """Analyze access keys for security issues"""
        try:
            keys = self.db_service.get_iam_access_keys()

            # Keys not used in the last 90 days are considered stale
            now = datetime.now(timezone.utc)
            old_keys = sum(
                1 for k in keys
                if k.last_used and
                (now - k.last_used.replace(tzinfo=timezone.utc)).days > ACCESS_KEY_ROTATION_DAYS
            )
            unused_keys = sum(1 for k in keys if not k.last_used)

            return {
                'total_access_keys': len(keys),
                'active_access_keys': sum(1 for k in keys if k.status == 'Active'),
                'inactive_access_keys': sum(1 for k in keys if k.status == 'Inactive'),
                'old_access_keys': old_keys,
                'unused_access_keys': unused_keys
            }
        except Exception as e:
            logger.error(f"Error analyzing access keys: {str(e)}")
            return {}

    def _get_security_findings(self, region):
        """Get IAM-related security findings from the database"""
        try:
            findings = self.db_service.get_security_findings()

            # Filter to IAM resource types only
            iam_findings = [
                {
                    'finding_id': f.finding_id,
                    'title': f.title,
                    'severity': f.severity,
                    'status': f.status,
                    'resource_type': f.resource_type,
                    'resource_id': f.resource_id
                }
                for f in findings if f.resource_type and 'IAM' in f.resource_type
            ]

            return iam_findings
        except Exception as e:
            logger.error(f"Error getting IAM security findings: {str(e)}")
            return []

    def _get_recommendations(self, region):
        """Generate IAM security recommendations based on current analysis"""
        try:
            recommendations = []

            users = self.db_service.get_iam_users()
            keys = self.db_service.get_iam_access_keys()
            now = datetime.now(timezone.utc)

            # Recommend MFA if any users are missing it
            if any(not u.mfa_enabled for u in users):
                recommendations.append({
                    'type': 'MFA',
                    'priority': 'High',
                    'description': 'Enable MFA for all IAM users',
                    'impact': 'Reduces risk of unauthorized access from compromised credentials'
                })

            # Recommend key rotation if any keys are stale
            stale_keys = [
                k for k in keys
                if k.last_used and
                (now - k.last_used.replace(tzinfo=timezone.utc)).days > ACCESS_KEY_ROTATION_DAYS
            ]
            if stale_keys:
                recommendations.append({
                    'type': 'Access Keys',
                    'priority': 'Medium',
                    'description': f'Rotate {len(stale_keys)} access key(s) not used in over {ACCESS_KEY_ROTATION_DAYS} days',
                    'impact': 'Reduces risk of compromised long-lived credentials'
                })

            return recommendations
        except Exception as e:
            logger.error(f"Error getting IAM recommendations: {str(e)}")
            return []
