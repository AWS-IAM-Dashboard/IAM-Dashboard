from backend.ai_remediation import generate_remediation

"""
AWS IAM API endpoints for identity and access management analysis
"""

from flask_restful import Resource, reqparse
from services.aws_service import AWSService
import logging

logger = logging.getLogger(__name__)

class IAMResource(Resource):
    """IAM analysis and security endpoint"""
    
    def __init__(self):
        self.aws_service = AWSService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, help='AWS region')
        self.parser.add_argument('scan_type', type=str, choices=['full', 'quick'], default='quick')
    
    def get(self):
        """Get IAM security analysis"""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            scan_type = args.get('scan_type', 'quick')
            
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
            return {
                'total_users': 0,
                'users_with_mfa': 0,
                'users_without_mfa': 0,
                'inactive_users': 0,
                'users_with_admin_access': 0,
                'users_with_console_access': 0
            }
        except Exception as e:
            logger.error(f"Error analyzing users: {str(e)}")
            return {}
    
    def _analyze_roles(self, region):
        """Analyze IAM roles for security issues"""
        try:
            return {
                'total_roles': 0,
                'cross_account_roles': 0,
                'roles_with_excessive_permissions': 0,
                'unused_roles': 0,
                'roles_with_external_trust': 0
            }
        except Exception as e:
            logger.error(f"Error analyzing roles: {str(e)}")
            return {}
    
    def _analyze_policies(self, region):
        """Analyze IAM policies for security issues"""
        try:
            return {
                'total_policies': 0,
                'inline_policies': 0,
                'managed_policies': 0,
                'policies_with_wildcards': 0,
                'overly_permissive_policies': 0
            }
        except Exception as e:
            logger.error(f"Error analyzing policies: {str(e)}")
            return {}
    
    def _analyze_access_keys(self, region):
        """Analyze access keys for security issues"""
        try:
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
    
    def _get_security_findings(self, region):
        """Get IAM security findings"""
        try:
            iam = self.aws_service.session.client('iam')
            findings = []

            summary = iam.get_account_summary()
            summary_map = summary.get('SummaryMap', {})

            if summary_map.get('AccountMFAEnabled', 0) == 0:
                findings.append({
                    'finding_type': 'ROOT_MFA_DISABLED',
                    'severity': 'High',
                    'resource': 'root-account',
                    'description': 'Root account does not have MFA enabled'
                })

            response = iam.list_users()
            users = response.get('Users', [])

            for user in users:
                username = user.get('UserName')

                policies_response = iam.list_attached_user_policies(UserName=username)
                policies = policies_response.get('AttachedPolicies', [])

                for policy in policies:
                    if policy.get('PolicyName') == "AdministratorAccess":
                        findings.append({
                            'finding_type': 'IAM_USER_ADMIN_PERMISSIONS',
                            'severity': 'High',
                            'resource': username,
                            'description': f'IAM user {username} has AdministratorAccess policy'
                        })

            for f in findings:
                f["remediation"] = generate_remediation(f)

            return findings

        except Exception as e:
            logger.error(f"Error getting security findings: {str(e)}")
            return []
    
    def _get_recommendations(self, region):
        """Get IAM security recommendations"""
        try:
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
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return []
