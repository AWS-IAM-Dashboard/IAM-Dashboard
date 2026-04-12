"""
Database Service for data persistence and management
"""

import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

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
    
    def cleanup_old_records(self, days: int = 90) -> dict:
        """Delete rows older than ``days`` from security_findings and performance_metrics."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        session = None
        try:
            session = self.get_session()
            n_findings = (
                session.query(SecurityFinding)
                .filter(SecurityFinding.created_at < cutoff)
                .delete(synchronize_session=False)
            )
            n_metrics = (
                session.query(PerformanceMetric)
                .filter(PerformanceMetric.timestamp < cutoff)
                .delete(synchronize_session=False)
            )
            session.commit()
            return {
                "security_findings_deleted": n_findings,
                "performance_metrics_deleted": n_metrics,
            }
        except Exception as e:
            logger.error(f"Error during cleanup_old_records: {str(e)}")
            if session is not None:
                try:
                    session.rollback()
                except Exception:
                    pass
            return {
                "security_findings_deleted": 0,
                "performance_metrics_deleted": 0,
                "error": str(e),
            }
        finally:
            if session is not None:
                try:
                    session.close()
                except Exception:
                    pass

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
