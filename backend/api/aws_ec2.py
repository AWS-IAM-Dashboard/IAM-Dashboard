"""
AWS EC2 API endpoints for compute security analysis.
Supports multi-account scanning via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.aws_service import AWSService
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class EC2Resource(Resource):
    """EC2 security analysis endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('instance_id', type=str, location='args',
                                 help='Specific instance ID')
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get EC2 security analysis, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            instance_id = args.get('instance_id')
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given
            session = self.org_service.get_session_for_account(account_id) \
                if account_id else None
            aws_service = AWSService(session=session)

            # Fetch EC2 analysis once and pass the result to helpers to avoid
            # making redundant API calls for each sub-section
            ec2_analysis = aws_service.get_ec2_analysis(region)

            ec2_data = {
                'account_id': account_id,
                'instances': self._analyze_instances(ec2_analysis, instance_id),
                'security_groups': self._analyze_security_groups(ec2_analysis),
                'volumes': self._analyze_volumes(ec2_analysis),
                'snapshots': self._analyze_snapshots(),
                'security_findings': self._get_security_findings(aws_service, region),
                'recommendations': self._get_recommendations()
            }

            return ec2_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error analyzing EC2: {str(e)}")
            return {'error': 'Failed to analyze EC2 configuration'}, 500

    def _analyze_instances(self, ec2_analysis, instance_id=None):
        """Extract instance metrics from the pre-fetched EC2 analysis result"""
        try:
            return ec2_analysis.get('instances', {})
        except Exception as e:
            logger.error(f"Error analyzing instances: {str(e)}")
            return {}

    def _analyze_security_groups(self, ec2_analysis):
        """Extract security group metrics from the pre-fetched EC2 analysis result"""
        try:
            return ec2_analysis.get('security_groups', {})
        except Exception as e:
            logger.error(f"Error analyzing security groups: {str(e)}")
            return {}

    def _analyze_volumes(self, ec2_analysis):
        """Extract volume metrics from the pre-fetched EC2 analysis result"""
        try:
            return ec2_analysis.get('volumes', {})
        except Exception as e:
            logger.error(f"Error analyzing volumes: {str(e)}")
            return {}

    def _analyze_snapshots(self):
        """Snapshots analysis placeholder"""
        return {
            'total_snapshots': 0,
            'public_snapshots': 0,
            'private_snapshots': 0,
            'old_snapshots': 0,
            'snapshots_without_encryption': 0
        }

    def _get_security_findings(self, aws_service, region):
        """
        Get EC2-specific security findings from Security Hub.
        Filters to AWS::EC2 resource types only to avoid mixing in IAM/S3 findings.
        """
        try:
            all_findings = aws_service.get_security_hub_findings(region)
            # Filter to EC2 resource types only
            return [
                f for f in all_findings
                if isinstance(f, dict) and
                any('EC2' in str(r.get('Type', ''))
                    for r in f.get('Resources', []))
            ]
        except Exception as e:
            logger.error(f"Error getting EC2 security findings: {str(e)}")
            return []

    def _get_recommendations(self):
        """Get EC2 security recommendations"""
        return [
            {
                'type': 'Encryption',
                'priority': 'High',
                'description': 'Enable encryption for all EBS volumes',
                'impact': 'Protects data at rest'
            },
            {
                'type': 'Security Groups',
                'priority': 'Medium',
                'description': 'Review and restrict security group rules',
                'impact': 'Reduces attack surface'
            }
        ]
