"""
AWS Config API endpoint — serves compliance and resource inventory data from PostgreSQL.
Replaces direct boto3 calls with DatabaseService queries for local development.
"""

import logging
from flask_restful import Resource, reqparse
from services.database_service import DatabaseService

logger = logging.getLogger(__name__)


class ConfigResource(Resource):
    """AWS Config compliance endpoint backed by PostgreSQL mock data."""

    def __init__(self):
        self.db_service = DatabaseService()
        self.parser = reqparse.RequestParser()
        # location='args' prevents 415 errors on GET requests (no JSON body)
        self.parser.add_argument('compliance_type', type=str, location='args',
                                 choices=['COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE'])

    def get(self):
        """Return compliance summary, resource inventory, and recommendations."""
        try:
            args = self.parser.parse_args()
            compliance_type = args.get('compliance_type')

            return {
                'compliance_summary': self._get_compliance_summary(compliance_type),
                'resource_inventory': self._get_resource_inventory(),
                'compliance_rules': self._get_compliance_rules(),
                'recommendations': self._get_recommendations(),
            }, 200

        except Exception as e:
            logger.error(f"Error getting Config data: {str(e)}")
            return {'error': 'Failed to fetch Config data'}, 500

    def _get_compliance_summary(self, compliance_type=None):
        """
        Aggregate compliance counts from the compliance_status table.
        Optionally filters by a specific compliance_type (COMPLIANT / NON_COMPLIANT).
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import ComplianceStatus

            query = session.query(ComplianceStatus)
            if compliance_type:
                query = query.filter(ComplianceStatus.status == compliance_type)

            rows = query.all()
            session.close()

            total = len(rows)
            compliant = sum(1 for r in rows if r.status == 'COMPLIANT')
            non_compliant = sum(1 for r in rows if r.status == 'NON_COMPLIANT')
            not_applicable = sum(1 for r in rows if r.status == 'NOT_APPLICABLE')
            pct = round((compliant / total) * 100, 1) if total > 0 else 0.0

            return {
                'total_resources': total,
                'compliant_resources': compliant,
                'non_compliant_resources': non_compliant,
                'not_applicable_resources': not_applicable,
                'compliance_percentage': pct,
            }
        except Exception as e:
            logger.error(f"Error building compliance summary: {str(e)}")
            return {}

    def _get_resource_inventory(self):
        """
        Count resources across IAM, EC2, and S3 tables to build an inventory snapshot.
        Returns totals and a breakdown by resource type.
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import (
                IAMUser, IAMRole, IAMPolicy, IAMAccessKey,
                EC2Instance, EC2SecurityGroup, EC2Volume, S3Bucket
            )

            counts = {
                'IAM Users': session.query(IAMUser).count(),
                'IAM Roles': session.query(IAMRole).count(),
                'IAM Policies': session.query(IAMPolicy).count(),
                'IAM Access Keys': session.query(IAMAccessKey).count(),
                'EC2 Instances': session.query(EC2Instance).count(),
                'EC2 Security Groups': session.query(EC2SecurityGroup).count(),
                'EC2 Volumes': session.query(EC2Volume).count(),
                'S3 Buckets': session.query(S3Bucket).count(),
            }
            session.close()

            total = sum(counts.values())
            return {
                'total_resources': total,
                'resource_types': counts,
            }
        except Exception as e:
            logger.error(f"Error building resource inventory: {str(e)}")
            return {}

    def _get_compliance_rules(self):
        """
        Summarise compliance rules by framework from the compliance_status table.
        Returns rule counts and per-framework breakdown.
        """
        try:
            rows = self.db_service.get_compliance_status()

            # Group by framework to derive rule-level stats
            frameworks: dict = {}
            for row in rows:
                fw = row.framework
                if fw not in frameworks:
                    frameworks[fw] = {'total': 0, 'compliant': 0, 'non_compliant': 0}
                frameworks[fw]['total'] += 1
                if row.status == 'COMPLIANT':
                    frameworks[fw]['compliant'] += 1
                else:
                    frameworks[fw]['non_compliant'] += 1

            total_rules = sum(v['total'] for v in frameworks.values())
            compliant_rules = sum(v['compliant'] for v in frameworks.values())

            return {
                'total_rules': total_rules,
                'compliant_rules': compliant_rules,
                'non_compliant_rules': total_rules - compliant_rules,
                'rules_by_framework': frameworks,
            }
        except Exception as e:
            logger.error(f"Error building compliance rules: {str(e)}")
            return {}

    def _get_recommendations(self):
        """
        Generate data-driven recommendations based on non-compliant resources.
        Falls back to generic guidance when the table is empty.
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import ComplianceStatus

            non_compliant = session.query(ComplianceStatus).filter(
                ComplianceStatus.status == 'NON_COMPLIANT'
            ).count()
            session.close()

            recommendations = []

            if non_compliant > 0:
                recommendations.append({
                    'type': 'Compliance Remediation',
                    'priority': 'High',
                    'description': f'Resolve {non_compliant} non-compliant resource(s) to improve your compliance score.',
                    'impact': 'Directly raises overall compliance percentage',
                })

            recommendations.append({
                'type': 'Configuration Management',
                'priority': 'Medium',
                'description': 'Enable AWS Config rules for all resource types across all regions.',
                'impact': 'Provides continuous compliance monitoring',
            })

            return recommendations
        except Exception as e:
            logger.error(f"Error building recommendations: {str(e)}")
            return []
