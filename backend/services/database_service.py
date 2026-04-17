"""
Database Service for data persistence and management
"""

import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float, and_, or_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Iterator, List, Optional, Set

logger = logging.getLogger(__name__)

Base = declarative_base()

class SecurityFinding(Base):
    """Security finding model"""
    __tablename__ = 'security_findings'
    
    id = Column(Integer, primary_key=True)
    finding_id = Column(String(255), unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    severity = Column(String(50), nullable=False)
    status = Column(String(50), default='NEW')
    resource_type = Column(String(100))
    resource_id = Column(String(255))
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved = Column(Boolean, default=False)

class ComplianceStatus(Base):
    """Compliance status model"""
    __tablename__ = 'compliance_status'
    
    id = Column(Integer, primary_key=True)
    framework = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    score = Column(Float, default=0.0)
    last_assessed = Column(DateTime, default=datetime.utcnow)
    findings_count = Column(Integer, default=0)
    region = Column(String(50))
    account_id = Column(String(50))

class PerformanceMetric(Base):
    """Performance metric model"""
    __tablename__ = 'performance_metrics'
    
    id = Column(Integer, primary_key=True)
    metric_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
    region = Column(String(50))
    account_id = Column(String(50))

class DatabaseService:
    """Service for database operations"""
    
    def __init__(self):
        self.database_url = os.environ.get('DATABASE_URL', 'sqlite:///cybersecurity.db')
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def init_db(self):
        """Initialize database tables"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    def get_session(self):
        """Get database session"""
        return self.SessionLocal()
    
    def create_security_finding(self, finding_data: dict) -> SecurityFinding:
        """Create a new security finding"""
        try:
            session = self.get_session()
            finding = SecurityFinding(**finding_data)
            session.add(finding)
            session.commit()
            session.refresh(finding)
            session.close()
            return finding
        except Exception as e:
            logger.error(f"Error creating security finding: {str(e)}")
            raise
    
    def get_security_findings(self, limit: int = 100, offset: int = 0) -> list:
        """Get security findings"""
        try:
            session = self.get_session()
            findings = session.query(SecurityFinding).offset(offset).limit(limit).all()
            session.close()
            return findings
        except Exception as e:
            logger.error(f"Error getting security findings: {str(e)}")
            return []

    def _export_findings_query(
        self,
        session,
        severities: Optional[Set[str]] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        statuses: Optional[Set[str]] = None,
    ):
        """Build filtered ORM query for CSV export (no execution)."""
        q = session.query(SecurityFinding)
        if severities:
            q = q.filter(SecurityFinding.severity.in_(list(severities)))
        if start is not None:
            q = q.filter(SecurityFinding.created_at >= start)
        if end is not None:
            q = q.filter(SecurityFinding.created_at <= end)
        if statuses:
            status_conds = []
            if "OPEN" in statuses:
                status_conds.append(
                    and_(
                        SecurityFinding.resolved.is_(False),
                        or_(
                            SecurityFinding.status.is_(None),
                            SecurityFinding.status.notin_(
                                ["SUPPRESSED", "RESOLVED", "CLOSED"]
                            ),
                        ),
                    )
                )
            if "RESOLVED" in statuses:
                status_conds.append(
                    or_(
                        SecurityFinding.resolved.is_(True),
                        SecurityFinding.status.in_(["RESOLVED", "CLOSED"]),
                    )
                )
            if "SUPPRESSED" in statuses:
                status_conds.append(SecurityFinding.status == "SUPPRESSED")
            if status_conds:
                q = q.filter(or_(*status_conds))
        return q.order_by(SecurityFinding.created_at.desc())

    def iter_security_findings_for_export(
        self,
        severities: Optional[Set[str]] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        statuses: Optional[Set[str]] = None,
        chunk_size: int = 500,
    ) -> Iterator[SecurityFinding]:
        """Yield findings for CSV export in DB chunks (bounded ORM memory)."""
        session = self.get_session()
        try:
            q = self._export_findings_query(
                session, severities, start, end, statuses
            ).yield_per(max(1, int(chunk_size)))
            yield from q
        except Exception as e:
            logger.error(f"Error iterating security findings for export: {str(e)}")
            raise
        finally:
            try:
                session.close()
            except Exception as close_err:
                logger.exception(
                    "iter_security_findings_for_export: session.close failed: %s",
                    close_err,
                )

    def query_security_findings_for_export(
        self,
        severities: Optional[Set[str]] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        statuses: Optional[Set[str]] = None,
    ) -> List[SecurityFinding]:
        """Filtered query for CSV export (loads all rows; prefer iter_* for large sets)."""
        return list(
            self.iter_security_findings_for_export(
                severities=severities,
                start=start,
                end=end,
                statuses=statuses,
            )
        )

    def update_security_finding(self, finding_id: str, update_data: dict) -> bool:
        """Update security finding"""
        try:
            session = self.get_session()
            finding = session.query(SecurityFinding).filter(SecurityFinding.finding_id == finding_id).first()
            if finding:
                for key, value in update_data.items():
                    setattr(finding, key, value)
                finding.updated_at = datetime.utcnow()
                session.commit()
                session.close()
                return True
            session.close()
            return False
        except Exception as e:
            logger.error(f"Error updating security finding: {str(e)}")
            return False
    
    def create_compliance_status(self, compliance_data: dict) -> ComplianceStatus:
        """Create compliance status"""
        try:
            session = self.get_session()
            compliance = ComplianceStatus(**compliance_data)
            session.add(compliance)
            session.commit()
            session.refresh(compliance)
            session.close()
            return compliance
        except Exception as e:
            logger.error(f"Error creating compliance status: {str(e)}")
            raise
    
    def get_compliance_status(self, framework: str = None) -> list:
        """Get compliance status"""
        try:
            session = self.get_session()
            query = session.query(ComplianceStatus)
            if framework:
                query = query.filter(ComplianceStatus.framework == framework)
            compliance = query.all()
            session.close()
            return compliance
        except Exception as e:
            logger.error(f"Error getting compliance status: {str(e)}")
            return []
    
    def create_performance_metric(self, metric_data: dict) -> PerformanceMetric:
        """Create performance metric"""
        try:
            session = self.get_session()
            metric = PerformanceMetric(**metric_data)
            session.add(metric)
            session.commit()
            session.refresh(metric)
            session.close()
            return metric
        except Exception as e:
            logger.error(f"Error creating performance metric: {str(e)}")
            raise
    
    def get_performance_metrics(self, metric_name: str = None, limit: int = 100) -> list:
        """Get performance metrics"""
        try:
            session = self.get_session()
            query = session.query(PerformanceMetric)
            if metric_name:
                query = query.filter(PerformanceMetric.metric_name == metric_name)
            metrics = query.order_by(PerformanceMetric.timestamp.desc()).limit(limit).all()
            session.close()
            return metrics
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return []
    
    def get_dashboard_summary(self) -> dict:
        """Get dashboard summary data"""
        try:
            session = self.get_session()
            
            # Get security findings summary
            total_findings = session.query(SecurityFinding).count()
            critical_findings = session.query(SecurityFinding).filter(SecurityFinding.severity == 'CRITICAL').count()
            high_findings = session.query(SecurityFinding).filter(SecurityFinding.severity == 'HIGH').count()
            resolved_findings = session.query(SecurityFinding).filter(SecurityFinding.resolved == True).count()
            
            # Get compliance summary
            total_compliance = session.query(ComplianceStatus).count()
            compliant_resources = session.query(ComplianceStatus).filter(ComplianceStatus.status == 'COMPLIANT').count()
            
            session.close()
            
            return {
                'security_findings': {
                    'total': total_findings,
                    'critical': critical_findings,
                    'high': high_findings,
                    'resolved': resolved_findings
                },
                'compliance': {
                    'total_resources': total_compliance,
                    'compliant': compliant_resources,
                    'non_compliant': total_compliance - compliant_resources
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary: {str(e)}")
            return {}
