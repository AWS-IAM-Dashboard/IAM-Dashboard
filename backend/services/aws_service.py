"""
AWS Service for integrating with AWS services
"""

import boto3
import logging
from typing import Dict, List, Optional
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

class AWSService:
    """Service for AWS integrations"""
    
    def __init__(self, session: boto3.Session = None):
        # Accept an optional pre-built session (e.g. from STS AssumeRole).
        # Falls back to the default boto3 session (management account creds from env).
        self.session = session or boto3.Session()
        self.regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
        
    def get_client(self, service_name: str, region: str = 'us-east-1'):
        """Get AWS service client"""
        try:
            return self.session.client(service_name, region_name=region)
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Error creating AWS client: {str(e)}")
            raise
    
    def get_iam_analysis(self, region: str = 'us-east-1') -> Dict:
        """Analyze IAM configuration"""
        try:
            iam_client = self.get_client('iam', region)
            
            # Get IAM users
            users_response = iam_client.list_users()
            users = users_response.get('Users', [])
            
            # Get IAM roles
            roles_response = iam_client.list_roles()
            roles = roles_response.get('Roles', [])
            
            # Get IAM policies
            policies_response = iam_client.list_policies(Scope='Local')
            policies = policies_response.get('Policies', [])
            
            return {
                'users': {
                    'total': len(users),
                    'users_with_mfa': self._count_users_with_mfa(iam_client, users),
                    'users_without_mfa': len(users) - self._count_users_with_mfa(iam_client, users)
                },
                'roles': {
                    'total': len(roles),
                    'cross_account_roles': self._count_cross_account_roles(roles)
                },
                'policies': {
                    'total': len(policies),
                    'inline_policies': self._count_inline_policies(iam_client)
                }
            }
            
        except ClientError as e:
            logger.error(f"AWS IAM analysis error: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error in IAM analysis: {str(e)}")
            return {}
    
    def get_ec2_analysis(self, region: str = 'us-east-1') -> Dict:
        """Analyze EC2 configuration"""
        try:
            ec2_client = self.get_client('ec2', region)
            
            # Get EC2 instances
            instances_response = ec2_client.describe_instances()
            instances = []
            for reservation in instances_response.get('Reservations', []):
                instances.extend(reservation.get('Instances', []))
            
            # Get security groups
            sg_response = ec2_client.describe_security_groups()
            security_groups = sg_response.get('SecurityGroups', [])
            
            # Get EBS volumes
            volumes_response = ec2_client.describe_volumes()
            volumes = volumes_response.get('Volumes', [])
            
            return {
                'instances': {
                    'total': len(instances),
                    'running': len([i for i in instances if i['State']['Name'] == 'running']),
                    'stopped': len([i for i in instances if i['State']['Name'] == 'stopped'])
                },
                'security_groups': {
                    'total': len(security_groups),
                    'with_open_ports': self._count_sg_with_open_ports(security_groups)
                },
                'volumes': {
                    'total': len(volumes),
                    'encrypted': len([v for v in volumes if v.get('Encrypted', False)]),
                    'unencrypted': len([v for v in volumes if not v.get('Encrypted', False)])
                }
            }
            
        except ClientError as e:
            logger.error(f"AWS EC2 analysis error: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error in EC2 analysis: {str(e)}")
            return {}
    
    def get_s3_analysis(self, region: str = 'us-east-1') -> Dict:
        """Analyze S3 configuration"""
        try:
            s3_client = self.get_client('s3', region)
            
            # Get S3 buckets
            buckets_response = s3_client.list_buckets()
            buckets = buckets_response.get('Buckets', [])
            
            # Analyze each bucket
            bucket_analysis = []
            for bucket in buckets:
                bucket_name = bucket['Name']
                try:
                    # Check bucket encryption
                    encryption_response = s3_client.get_bucket_encryption(Bucket=bucket_name)
                    encryption = encryption_response.get('ServerSideEncryptionConfiguration', {})
                except ClientError:
                    encryption = None
                
                # Check bucket versioning
                try:
                    versioning_response = s3_client.get_bucket_versioning(Bucket=bucket_name)
                    versioning = versioning_response.get('Status', 'Disabled')
                except ClientError:
                    versioning = 'Disabled'
                
                bucket_analysis.append({
                    'name': bucket_name,
                    'encryption': encryption is not None,
                    'versioning': versioning == 'Enabled'
                })
            
            return {
                'buckets': {
                    'total': len(buckets),
                    'with_encryption': len([b for b in bucket_analysis if b['encryption']]),
                    'without_encryption': len([b for b in bucket_analysis if not b['encryption']]),
                    'with_versioning': len([b for b in bucket_analysis if b['versioning']]),
                    'without_versioning': len([b for b in bucket_analysis if not b['versioning']])
                }
            }
            
        except ClientError as e:
            logger.error(f"AWS S3 analysis error: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error in S3 analysis: {str(e)}")
            return {}
    
    def get_security_hub_findings(self, region: str = 'us-east-1') -> List[Dict]:
        """Get Security Hub findings"""
        try:
            security_hub_client = self.get_client('securityhub', region)
            
            # Get findings
            findings_response = security_hub_client.get_findings(
                MaxResults=100,
                Filters={
                    'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}]
                }
            )
            
            return findings_response.get('Findings', [])
            
        except ClientError as e:
            logger.error(f"AWS Security Hub analysis error: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in Security Hub analysis: {str(e)}")
            return []
    
    def _count_users_with_mfa(self, iam_client, users: List[Dict]) -> int:
        """Count users with MFA enabled"""
        count = 0
        for user in users:
            try:
                mfa_devices = iam_client.list_mfa_devices(UserName=user['UserName'])
                if mfa_devices.get('MFADevices'):
                    count += 1
            except ClientError:
                continue
        return count
    
    def _count_cross_account_roles(self, roles: List[Dict]) -> int:
        """Count cross-account roles"""
        count = 0
        for role in roles:
            trust_policy = role.get('AssumeRolePolicyDocument', {})
            if 'arn:aws:iam::' in str(trust_policy):
                count += 1
        return count
    
    def _count_inline_policies(self, iam_client) -> int:
        """Count inline policies"""
        try:
            policies_response = iam_client.list_policies(Scope='Local')
            return len(policies_response.get('Policies', []))
        except ClientError:
            return 0
    
    def _count_sg_with_open_ports(self, security_groups: List[Dict]) -> int:
        """Count security groups with open ports"""
        count = 0
        for sg in security_groups:
            for rule in sg.get('IpPermissions', []):
                if rule.get('FromPort') == 0 and rule.get('ToPort') == 65535:
                    count += 1
                    break
        return count
