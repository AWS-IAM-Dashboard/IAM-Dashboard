"""
AWS Security Hub API endpoint — serves findings and compliance data from PostgreSQL.
Replaces direct boto3 calls with DatabaseService queries for local development
"""

import logging
from flask_restful import Resource, reqparse
from services.database_service import DatabaseService

logger = logging.getLogger(__name__)


class SecurityHubResource(Resource):
    """Security Hub analysis endpoint backed by PostgreSQL mock data."""

    def __init__(self):
        self.db_service = DatabaseService()
        self.parser = reqparse.RequestParser()
        # location='args' prevents 415 errors on GET requests (no JSON body)
        self.parser.add_argument('severity', type=str, location='args',
                                 choices=['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'])
        self.parser.add_argument('status', type=str, location='args',
                                 choices=['NEW', 'NOTIFIED', 'SUPPRESSED', 'RESOLVED'])
        self.parser.add_argument('limit', type=int, location='args', default=100)

    def get(self):
        """Return Security Hub findings, summary, compliance, and recommendations."""
        try:
            args = self.parser.parse_args()
            severity = args.get('severity')
            status = args.get('status')
            limit = args.get('limit', 100)

            return {
                'findings': self._get_findings(severity, status, limit),
                'summary': self._get_findings_summary(),
                'compliance': self._get_compliance_status(),
                'recommendations': self._get_recommendations()
            }, 200

        except Exception as e:
            logger.error(f"Error getting Security Hub data: {str(e)}")
            return {'error': 'Failed to fetch Security Hub data'}, 500

    def _get_findings(self, severity=None, status=None, limit=100):
        """
        Fetch security findings from the DB, applying optional severity/status filters.
        Returns a list of serialisable finding dicts.
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import SecurityFinding

            query = session.query(SecurityFinding)
            if severity:
                query = query.filter(SecurityFinding.severity == severity)
            if status:
                query = query.filter(SecurityFinding.status == status)

            rows = query.limit(limit).all()
            session.close()

            return [
                {
                    'finding_id': f.finding_id,
                    'title': f.title,
                    'description': f.description,
                    'severity': f.severity,
                    'status': f.status,
                    'resource_type': f.resource_type,
                    'resource_id': f.resource_id,
                    'region': f.region,
                    'account_id': f.account_id,
                    'resolved': f.resolved,
                    'created_at': f.created_at.isoformat() if f.created_at else None,
                }
                for f in rows
            ]
        except Exception as e:
            logger.error(f"Error fetching findings: {str(e)}")
            return []

    def _get_findings_summary(self):
        """
        Aggregate finding counts by severity and status from the DB.
        Returns a summary dict matching the shape the frontend expects.
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import SecurityFinding

            total = session.query(SecurityFinding).count()
            critical = session.query(SecurityFinding).filter(SecurityFinding.severity == 'CRITICAL').count()
            high = session.query(SecurityFinding).filter(SecurityFinding.severity == 'HIGH').count()
            medium = session.query(SecurityFinding).filter(SecurityFinding.severity == 'MEDIUM').count()
            low = session.query(SecurityFinding).filter(SecurityFinding.severity == 'LOW').count()
            informational = session.query(SecurityFinding).filter(SecurityFinding.severity == 'INFORMATIONAL').count()
            new_count = session.query(SecurityFinding).filter(SecurityFinding.status == 'NEW').count()
            resolved_count = session.query(SecurityFinding).filter(SecurityFinding.resolved == True).count()
            session.close()

            return {
                'total_findings': total,
                'critical_findings': critical,
                'high_findings': high,
                'medium_findings': medium,
                'low_findings': low,
                'informational_findings': informational,
                'new_findings': new_count,
                'resolved_findings': resolved_count,
            }
        except Exception as e:
            logger.error(f"Error building findings summary: {str(e)}")
            return {}

    def _get_compliance_status(self):
        """
        Build per-framework compliance scores from the compliance_status table.
        Returns overall score and a breakdown by framework.
        """
        try:
            rows = self.db_service.get_compliance_status()

            # Group rows by framework and compute average score
            frameworks: dict = {}
            for row in rows:
                fw = row.framework
                if fw not in frameworks:
                    frameworks[fw] = {'scores': [], 'statuses': []}
                frameworks[fw]['scores'].append(row.score or 0.0)
                frameworks[fw]['statuses'].append(row.status)

            framework_summary = {}
            all_scores = []
            for fw, data in frameworks.items():
                avg_score = round(sum(data['scores']) / len(data['scores']), 1) if data['scores'] else 0.0
                all_scores.append(avg_score)
                # Determine overall status: COMPLIANT only if all entries are compliant
                statuses = set(data['statuses'])
                overall_status = 'COMPLIANT' if statuses == {'COMPLIANT'} else 'NON_COMPLIANT'
                framework_summary[fw] = {'score': avg_score, 'status': overall_status}

            overall_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

            return {
                'overall_score': overall_score,
                'frameworks': framework_summary,
            }
        except Exception as e:
            logger.error(f"Error building compliance status: {str(e)}")
            return {}

    def _get_recommendations(self):
        """
        Generate data-driven recommendations based on unresolved critical/high findings.
        Falls back to generic recommendations when no findings are present.
        """
        try:
            session = self.db_service.get_session()
            from services.database_service import SecurityFinding

            critical_open = session.query(SecurityFinding).filter(
                SecurityFinding.severity == 'CRITICAL',
                SecurityFinding.resolved == False
            ).count()
            high_open = session.query(SecurityFinding).filter(
                SecurityFinding.severity == 'HIGH',
                SecurityFinding.resolved == False
            ).count()
            session.close()

            recommendations = []

            if critical_open > 0:
                recommendations.append({
                    'type': 'Critical Findings',
                    'priority': 'Critical',
                    'description': f'Remediate {critical_open} open critical finding(s) immediately.',
                    'impact': 'Eliminates highest-risk exposure in your environment',
                })

            if high_open > 0:
                recommendations.append({
                    'type': 'High Severity Findings',
                    'priority': 'High',
                    'description': f'Address {high_open} open high-severity finding(s).',
                    'impact': 'Significantly reduces attack surface',
                })

            # Always include baseline recommendations
            recommendations.append({
                'type': 'Vulnerability Management',
                'priority': 'Medium',
                'description': 'Enable automated vulnerability scanning across all regions.',
                'impact': 'Provides continuous visibility into new risks',
            })

            return recommendations
        except Exception as e:
            logger.error(f"Error building recommendations: {str(e)}")
            return []
