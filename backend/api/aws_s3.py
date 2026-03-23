"""
AWS S3 API endpoints for storage security analysis.
Data is sourced from the local PostgreSQL database via DatabaseService
"""

from flask_restful import Resource, reqparse
from services.database_service import DatabaseService
import logging

logger = logging.getLogger(__name__)


class S3Resource(Resource):
    """S3 security analysis endpoint"""

    def __init__(self):
        self.db_service = DatabaseService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, help='AWS region', location='args')
        self.parser.add_argument('bucket_name', type=str, help='Specific bucket name', location='args')

    def get(self):
        """Get S3 security analysis"""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            bucket_name = args.get('bucket_name')

            s3_data = {
                'buckets': self._analyze_buckets(region, bucket_name),
                'encryption': self._analyze_encryption(region),
                'versioning': self._analyze_versioning(region),
                'logging': self._analyze_logging(region),
                'security_findings': self._get_security_findings(region),
                'recommendations': self._get_recommendations(region)
            }

            return s3_data, 200

        except Exception as e:
            logger.error(f"Error analyzing S3: {str(e)}")
            return {'error': 'Failed to analyze S3 configuration'}, 500

    def _analyze_buckets(self, region, bucket_name=None):
        """Analyze S3 buckets for security issues"""
        try:
            buckets = self.db_service.get_s3_buckets(region=region)

            # Filter to a specific bucket if requested
            if bucket_name:
                buckets = [b for b in buckets if b.bucket_name == bucket_name]

            return {
                'total_buckets': len(buckets),
                'public_buckets': sum(1 for b in buckets if b.is_public),
                'private_buckets': sum(1 for b in buckets if not b.is_public),
                'buckets_without_encryption': sum(1 for b in buckets if not b.has_encryption),
                'buckets_without_versioning': sum(1 for b in buckets if not b.has_versioning),
                'buckets_without_logging': sum(1 for b in buckets if not b.has_logging)
            }
        except Exception as e:
            logger.error(f"Error analyzing buckets: {str(e)}")
            return {}

    def _analyze_encryption(self, region):
        """Analyze S3 encryption configuration"""
        try:
            buckets = self.db_service.get_s3_buckets(region=region)

            return {
                'buckets_with_encryption': sum(1 for b in buckets if b.has_encryption),
                'buckets_without_encryption': sum(1 for b in buckets if not b.has_encryption)
            }
        except Exception as e:
            logger.error(f"Error analyzing encryption: {str(e)}")
            return {}

    def _analyze_versioning(self, region):
        """Analyze S3 versioning configuration"""
        try:
            buckets = self.db_service.get_s3_buckets(region=region)

            return {
                'buckets_with_versioning': sum(1 for b in buckets if b.has_versioning),
                'buckets_without_versioning': sum(1 for b in buckets if not b.has_versioning)
            }
        except Exception as e:
            logger.error(f"Error analyzing versioning: {str(e)}")
            return {}

    def _analyze_logging(self, region):
        """Analyze S3 logging configuration"""
        try:
            buckets = self.db_service.get_s3_buckets(region=region)

            return {
                'buckets_with_logging': sum(1 for b in buckets if b.has_logging),
                'buckets_without_logging': sum(1 for b in buckets if not b.has_logging)
            }
        except Exception as e:
            logger.error(f"Error analyzing logging: {str(e)}")
            return {}

    def _get_security_findings(self, region):
        """Get S3-related security findings from the database"""
        try:
            findings = self.db_service.get_security_findings()

            # Filter to S3 resource types only
            s3_findings = [
                {
                    'finding_id': f.finding_id,
                    'title': f.title,
                    'severity': f.severity,
                    'status': f.status,
                    'resource_type': f.resource_type,
                    'resource_id': f.resource_id
                }
                for f in findings if f.resource_type and 'S3' in f.resource_type
            ]

            return s3_findings
        except Exception as e:
            logger.error(f"Error getting S3 security findings: {str(e)}")
            return []

    def _get_recommendations(self, region):
        """Generate S3 security recommendations based on current analysis"""
        try:
            recommendations = []
            buckets = self.db_service.get_s3_buckets(region=region)

            # Recommend blocking public access if any buckets are public
            public_count = sum(1 for b in buckets if b.is_public)
            if public_count:
                recommendations.append({
                    'type': 'Public Access',
                    'priority': 'High',
                    'description': f'Block public access on {public_count} bucket(s)',
                    'impact': 'Prevents unauthorized access to sensitive data'
                })

            # Recommend encryption if any buckets are missing it
            if any(not b.has_encryption for b in buckets):
                recommendations.append({
                    'type': 'Encryption',
                    'priority': 'High',
                    'description': 'Enable server-side encryption for all S3 buckets',
                    'impact': 'Protects data at rest from unauthorized access'
                })

            # Recommend logging if any buckets are missing it
            if any(not b.has_logging for b in buckets):
                recommendations.append({
                    'type': 'Logging',
                    'priority': 'Medium',
                    'description': 'Enable access logging for all S3 buckets',
                    'impact': 'Provides audit trail for bucket access and operations'
                })

            return recommendations
        except Exception as e:
            logger.error(f"Error getting S3 recommendations: {str(e)}")
            return []
