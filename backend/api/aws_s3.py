"""
AWS S3 API endpoints for storage security analysis.
Supports multi-account scanning via optional account_id query parameter.
When account_id is provided, an assumed-role session is used for that account.
"""

import logging
from flask_restful import Resource, reqparse
from services.aws_service import AWSService
from services.organizations_service import OrganizationsService

logger = logging.getLogger(__name__)


class S3Resource(Resource):
    """S3 security analysis endpoint"""

    def __init__(self):
        self.org_service = OrganizationsService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, location='args', help='AWS region')
        self.parser.add_argument('bucket_name', type=str, location='args',
                                 help='Specific bucket name')
        # account_id is optional — defaults to management account (backward compatible)
        self.parser.add_argument('account_id', type=str, location='args',
                                 help='Target AWS account ID')

    def get(self):
        """Get S3 security analysis, optionally scoped to a specific account."""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            account_id = args.get('account_id')

            # Resolve the boto3 session — assumed-role session for member accounts,
            # default session for the management account or when no account_id given
            session = self.org_service.get_session_for_account(account_id) \
                if account_id else None
            aws_service = AWSService(session=session)

            # Fetch S3 analysis once and pass the result to helpers to avoid
            # making redundant API calls for each sub-section
            s3_analysis = aws_service.get_s3_analysis(region)
            buckets = s3_analysis.get('buckets', {})

            s3_data = {
                'account_id': account_id,
                'buckets': buckets,
                'encryption': {
                    'buckets_with_encryption': buckets.get('with_encryption', 0),
                    'buckets_without_encryption': buckets.get('without_encryption', 0)
                },
                'versioning': {
                    'buckets_with_versioning': buckets.get('with_versioning', 0),
                    'buckets_without_versioning': buckets.get('without_versioning', 0)
                },
                'logging': self._analyze_logging(),
                'security_findings': self._get_security_findings(aws_service, region),
                'recommendations': self._get_recommendations()
            }

            return s3_data, 200

        except RuntimeError as e:
            # STS AssumeRole failure — return 403 per spec
            logger.error(f"Account session error: {str(e)}")
            return {'error': str(e)}, 403
        except Exception as e:
            logger.error(f"Error analyzing S3: {str(e)}")
            return {'error': 'Failed to analyze S3 configuration'}, 500

    def _analyze_logging(self):
        """S3 logging analysis placeholder"""
        return {
            'buckets_with_logging': 0,
            'buckets_without_logging': 0
        }

    def _get_security_findings(self, aws_service, region):
        """
        Get S3-specific security findings from Security Hub.
        Filters to AWS::S3 resource types only to avoid mixing in IAM/EC2 findings.
        """
        try:
            all_findings = aws_service.get_security_hub_findings(region)
            # Filter to S3 resource types only
            return [
                f for f in all_findings
                if isinstance(f, dict) and
                any('S3' in str(r.get('Type', ''))
                    for r in f.get('Resources', []))
            ]
        except Exception as e:
            logger.error(f"Error getting S3 security findings: {str(e)}")
            return []

    def _get_recommendations(self):
        """Get S3 security recommendations"""
        return [
            {
                'type': 'Public Access',
                'priority': 'High',
                'description': 'Block public access to S3 buckets',
                'impact': 'Prevents unauthorized access to data'
            },
            {
                'type': 'Encryption',
                'priority': 'High',
                'description': 'Enable encryption for all S3 buckets',
                'impact': 'Protects data at rest'
            }
        ]
