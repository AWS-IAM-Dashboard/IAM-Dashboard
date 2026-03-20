"""
AWS EC2 API endpoints for compute security analysis.
Data is sourced from the local PostgreSQL database via DatabaseService.
"""

from flask_restful import Resource, reqparse
from services.database_service import DatabaseService
import logging

logger = logging.getLogger(__name__)


class EC2Resource(Resource):
    """EC2 security analysis endpoint"""

    def __init__(self):
        self.db_service = DatabaseService()
        self.parser = reqparse.RequestParser()
        self.parser.add_argument('region', type=str, help='AWS region', location='args')
        self.parser.add_argument('instance_id', type=str, help='Specific instance ID', location='args')

    def get(self):
        """Get EC2 security analysis"""
        try:
            args = self.parser.parse_args()
            region = args.get('region', 'us-east-1')
            instance_id = args.get('instance_id')

            ec2_data = {
                'instances': self._analyze_instances(region, instance_id),
                'security_groups': self._analyze_security_groups(region),
                'volumes': self._analyze_volumes(region),
                'snapshots': self._analyze_snapshots(region),
                'security_findings': self._get_security_findings(region),
                'recommendations': self._get_recommendations(region)
            }

            return ec2_data, 200

        except Exception as e:
            logger.error(f"Error analyzing EC2: {str(e)}")
            return {'error': 'Failed to analyze EC2 configuration'}, 500

    def _analyze_instances(self, region, instance_id=None):
        """Analyze EC2 instances for security issues"""
        try:
            instances = self.db_service.get_ec2_instances(region=region)

            # Filter to a specific instance if requested
            if instance_id:
                instances = [i for i in instances if i.instance_id == instance_id]

            return {
                'total_instances': len(instances),
                'running_instances': sum(1 for i in instances if i.state == 'running'),
                'stopped_instances': sum(1 for i in instances if i.state == 'stopped'),
                'instances_without_encryption': sum(1 for i in instances if not i.has_encrypted_volumes)
            }
        except Exception as e:
            logger.error(f"Error analyzing instances: {str(e)}")
            return {}

    def _analyze_security_groups(self, region):
        """Analyze security groups for security issues"""
        try:
            groups = self.db_service.get_ec2_security_groups(region=region)

            return {
                'total_security_groups': len(groups),
                'security_groups_with_open_ports': sum(1 for g in groups if g.has_open_ports)
            }
        except Exception as e:
            logger.error(f"Error analyzing security groups: {str(e)}")
            return {}

    def _analyze_volumes(self, region):
        """Analyze EBS volumes for security issues"""
        try:
            volumes = self.db_service.get_ec2_volumes(region=region)

            return {
                'total_volumes': len(volumes),
                'encrypted_volumes': sum(1 for v in volumes if v.encrypted),
                'unencrypted_volumes': sum(1 for v in volumes if not v.encrypted),
                'unattached_volumes': sum(1 for v in volumes if v.state == 'available')
            }
        except Exception as e:
            logger.error(f"Error analyzing volumes: {str(e)}")
            return {}

    def _analyze_snapshots(self, region):
        """Snapshots are not stored locally — returns empty placeholder"""
        return {
            'total_snapshots': 0,
            'public_snapshots': 0,
            'private_snapshots': 0,
            'old_snapshots': 0,
            'snapshots_without_encryption': 0
        }

    def _get_security_findings(self, region):
        """Get EC2-related security findings from the database"""
        try:
            findings = self.db_service.get_security_findings()

            # Filter to EC2 resource types only
            ec2_findings = [
                {
                    'finding_id': f.finding_id,
                    'title': f.title,
                    'severity': f.severity,
                    'status': f.status,
                    'resource_type': f.resource_type,
                    'resource_id': f.resource_id
                }
                for f in findings if f.resource_type and 'EC2' in f.resource_type
            ]

            return ec2_findings
        except Exception as e:
            logger.error(f"Error getting EC2 security findings: {str(e)}")
            return []

    def _get_recommendations(self, region):
        """Generate EC2 security recommendations based on current analysis"""
        try:
            recommendations = []

            volumes = self.db_service.get_ec2_volumes(region=region)
            groups = self.db_service.get_ec2_security_groups(region=region)

            # Recommend encryption if any volumes are unencrypted
            if any(not v.encrypted for v in volumes):
                recommendations.append({
                    'type': 'Encryption',
                    'priority': 'High',
                    'description': 'Enable encryption for all EBS volumes',
                    'impact': 'Protects data at rest from unauthorized access'
                })

            # Recommend security group review if any have open ports
            open_sg_count = sum(1 for g in groups if g.has_open_ports)
            if open_sg_count:
                recommendations.append({
                    'type': 'Security Groups',
                    'priority': 'Medium',
                    'description': f'Review and restrict {open_sg_count} security group(s) with open ports',
                    'impact': 'Reduces attack surface by limiting inbound access'
                })

            return recommendations
        except Exception as e:
            logger.error(f"Error getting EC2 recommendations: {str(e)}")
            return []
