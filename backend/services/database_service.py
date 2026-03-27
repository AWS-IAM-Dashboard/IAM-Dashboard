"""
Database Service for data persistence and management
"""

import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

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

class IAMUser(Base):
    """IAM user resource model"""
    __tablename__ = 'iam_users'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=False)
    mfa_enabled = Column(Boolean, default=False)
    has_console_access = Column(Boolean, default=False)
    has_admin_access = Column(Boolean, default=False)
    last_activity = Column(DateTime, nullable=True)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class IAMRole(Base):
    """IAM role resource model"""
    __tablename__ = 'iam_roles'

    id = Column(Integer, primary_key=True)
    role_id = Column(String(255), unique=True, nullable=False)
    role_name = Column(String(255), nullable=False)
    is_cross_account = Column(Boolean, default=False)
    has_external_trust = Column(Boolean, default=False)
    has_excessive_permissions = Column(Boolean, default=False)
    last_used = Column(DateTime, nullable=True)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class IAMPolicy(Base):
    """IAM policy resource model"""
    __tablename__ = 'iam_policies'

    id = Column(Integer, primary_key=True)
    policy_id = Column(String(255), unique=True, nullable=False)
    policy_name = Column(String(255), nullable=False)
    policy_type = Column(String(50))  # inline or managed
    has_wildcards = Column(Boolean, default=False)
    is_overly_permissive = Column(Boolean, default=False)
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class IAMAccessKey(Base):
    """IAM access key resource model"""
    __tablename__ = 'iam_access_keys'

    id = Column(Integer, primary_key=True)
    key_id = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=False)
    status = Column(String(50), default='Active')  # Active or Inactive
    last_used = Column(DateTime, nullable=True)
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class EC2Instance(Base):
    """EC2 instance resource model"""
    __tablename__ = 'ec2_instances'

    id = Column(Integer, primary_key=True)
    instance_id = Column(String(255), unique=True, nullable=False)
    state = Column(String(50), nullable=False)  # running, stopped, etc.
    instance_type = Column(String(50))
    has_encrypted_volumes = Column(Boolean, default=False)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class EC2SecurityGroup(Base):
    """EC2 security group resource model"""
    __tablename__ = 'ec2_security_groups'

    id = Column(Integer, primary_key=True)
    sg_id = Column(String(255), unique=True, nullable=False)
    sg_name = Column(String(255), nullable=False)
    has_open_ports = Column(Boolean, default=False)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class EC2Volume(Base):
    """EC2 EBS volume resource model"""
    __tablename__ = 'ec2_volumes'

    id = Column(Integer, primary_key=True)
    volume_id = Column(String(255), unique=True, nullable=False)
    encrypted = Column(Boolean, default=False)
    state = Column(String(50))
    size_gb = Column(Integer)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class S3Bucket(Base):
    """S3 bucket resource model"""
    __tablename__ = 's3_buckets'

    id = Column(Integer, primary_key=True)
    bucket_name = Column(String(255), unique=True, nullable=False)
    is_public = Column(Boolean, default=False)
    has_encryption = Column(Boolean, default=False)
    has_versioning = Column(Boolean, default=False)
    has_logging = Column(Boolean, default=False)
    region = Column(String(50))
    account_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


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

    # ------------------------------------------------------------------
    # IAM query methods
    # ------------------------------------------------------------------

    def get_iam_users(self, account_id: str = None) -> list:
        """Get all IAM users, optionally filtered by account"""
        try:
            session = self.get_session()
            query = session.query(IAMUser)
            if account_id:
                query = query.filter(IAMUser.account_id == account_id)
            users = query.all()
            session.close()
            return users
        except Exception as e:
            logger.error(f"Error getting IAM users: {str(e)}")
            return []

    def get_iam_roles(self, account_id: str = None) -> list:
        """Get all IAM roles, optionally filtered by account"""
        try:
            session = self.get_session()
            query = session.query(IAMRole)
            if account_id:
                query = query.filter(IAMRole.account_id == account_id)
            roles = query.all()
            session.close()
            return roles
        except Exception as e:
            logger.error(f"Error getting IAM roles: {str(e)}")
            return []

    def get_iam_policies(self, account_id: str = None) -> list:
        """Get all IAM policies, optionally filtered by account"""
        try:
            session = self.get_session()
            query = session.query(IAMPolicy)
            if account_id:
                query = query.filter(IAMPolicy.account_id == account_id)
            policies = query.all()
            session.close()
            return policies
        except Exception as e:
            logger.error(f"Error getting IAM policies: {str(e)}")
            return []

    def get_iam_access_keys(self, account_id: str = None) -> list:
        """Get all IAM access keys, optionally filtered by account"""
        try:
            session = self.get_session()
            query = session.query(IAMAccessKey)
            if account_id:
                query = query.filter(IAMAccessKey.account_id == account_id)
            keys = query.all()
            session.close()
            return keys
        except Exception as e:
            logger.error(f"Error getting IAM access keys: {str(e)}")
            return []

    # ------------------------------------------------------------------
    # EC2 query methods
    # ------------------------------------------------------------------

    def get_ec2_instances(self, region: str = None, account_id: str = None) -> list:
        """Get all EC2 instances, optionally filtered by region and account"""
        try:
            session = self.get_session()
            query = session.query(EC2Instance)
            if region:
                query = query.filter(EC2Instance.region == region)
            if account_id:
                query = query.filter(EC2Instance.account_id == account_id)
            instances = query.all()
            session.close()
            return instances
        except Exception as e:
            logger.error(f"Error getting EC2 instances: {str(e)}")
            return []

    def get_ec2_security_groups(self, region: str = None, account_id: str = None) -> list:
        """Get all EC2 security groups, optionally filtered by region and account"""
        try:
            session = self.get_session()
            query = session.query(EC2SecurityGroup)
            if region:
                query = query.filter(EC2SecurityGroup.region == region)
            if account_id:
                query = query.filter(EC2SecurityGroup.account_id == account_id)
            groups = query.all()
            session.close()
            return groups
        except Exception as e:
            logger.error(f"Error getting EC2 security groups: {str(e)}")
            return []

    def get_ec2_volumes(self, region: str = None, account_id: str = None) -> list:
        """Get all EC2 volumes, optionally filtered by region and account"""
        try:
            session = self.get_session()
            query = session.query(EC2Volume)
            if region:
                query = query.filter(EC2Volume.region == region)
            if account_id:
                query = query.filter(EC2Volume.account_id == account_id)
            volumes = query.all()
            session.close()
            return volumes
        except Exception as e:
            logger.error(f"Error getting EC2 volumes: {str(e)}")
            return []

    # ------------------------------------------------------------------
    # S3 query methods
    # ------------------------------------------------------------------

    def get_s3_buckets(self, region: str = None, account_id: str = None) -> list:
        """Get all S3 buckets, optionally filtered by region and account"""
        try:
            session = self.get_session()
            query = session.query(S3Bucket)
            if region:
                query = query.filter(S3Bucket.region == region)
            if account_id:
                query = query.filter(S3Bucket.account_id == account_id)
            buckets = query.all()
            session.close()
            return buckets
        except Exception as e:
            logger.error(f"Error getting S3 buckets: {str(e)}")
            return []
