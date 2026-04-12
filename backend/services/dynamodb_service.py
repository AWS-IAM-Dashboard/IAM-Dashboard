"""
DynamoDB Service for data persistence and management
"""

import os
import logging
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Default TTL window for new items (must match data retention policy)
_DEFAULT_RETENTION_DAYS = 90


def _compute_expires_at_epoch(days: int = _DEFAULT_RETENTION_DAYS) -> int:
    """Unix epoch seconds for DynamoDB TTL (expires_at)."""
    if days <= 0:
        raise ValueError("days must be positive")
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def _parse_item_time_epoch(value: Any) -> Optional[float]:
    """Parse DynamoDB item timestamp fields to UTC epoch seconds, or None if unparseable."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.timestamp()
    except ValueError:
        return None


class DynamoDBService:
    """Service for DynamoDB operations"""

    def __init__(self):
        """Initialize DynamoDB service"""
        try:
            # Get AWS session from environment or use default
            self.dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
            self.client = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
            
            # Table names from environment or default
            self.scan_results_table = os.environ.get('DYNAMODB_SCAN_RESULTS_TABLE', 'iam-dashboard-scan-results')
            self.iam_findings_table = os.environ.get('DYNAMODB_IAM_FINDINGS_TABLE', 'iam-dashboard-iam-findings')
            self.compliance_table = os.environ.get('DYNAMODB_COMPLIANCE_TABLE', 'iam-dashboard-compliance')
            
            # Get table references
            self.scan_results = self.dynamodb.Table(self.scan_results_table)
            self.iam_findings = self.dynamodb.Table(self.iam_findings_table)
            self.compliance = self.dynamodb.Table(self.compliance_table)
            
            logger.info(f"DynamoDB service initialized. Region: {os.environ.get('AWS_REGION', 'us-east-1')}")
        except Exception as e:
            logger.error(f"Error initializing DynamoDB service: {str(e)}")
            raise

    def create_scan_record(self, scan_data: Dict[str, Any]) -> bool:
        """Create a new scan record"""
        try:
            item = {
                'scan_id': scan_data.get('scan_id', f"scan-{datetime.utcnow().isoformat()}"),
                'timestamp': scan_data.get('timestamp', datetime.utcnow().isoformat()),
                'status': scan_data.get('status', 'in_progress'),
                'scan_type': scan_data.get('scan_type', 'full'),
                'findings_count': scan_data.get('findings_count', 0),
                'metadata': scan_data.get('metadata', {}),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'expires_at': scan_data.get('expires_at', _compute_expires_at_epoch()),
            }
            
            self.scan_results.put_item(Item=item)
            logger.info(f"Created scan record: {item['scan_id']}")
            return True
        except ClientError as e:
            logger.error(f"DynamoDB error creating scan record: {str(e)}")
            return False

    def get_scan_record(self, scan_id: str, timestamp: str) -> Optional[Dict]:
        """Get a scan record by ID and timestamp"""
        try:
            response = self.scan_results.get_item(
                Key={
                    'scan_id': scan_id,
                    'timestamp': timestamp
                }
            )
            return response.get('Item')
        except ClientError as e:
            logger.error(f"DynamoDB error getting scan record: {str(e)}")
            return None

    def list_scan_records(self, limit: Optional[int] = 100) -> List[Dict]:
        """List scan records using paginated DynamoDB scan.

        If limit is None, fetches all records.
        """
        try:
            items: List[Dict[str, Any]] = []

            scan_kwargs: Dict[str, Any] = {}
            if limit is not None:
                scan_kwargs["Limit"] = max(1, int(limit))

            response = self.scan_results.scan(**scan_kwargs)
            items.extend(response.get('Items', []))

            while response.get("LastEvaluatedKey"):
                if limit is not None and len(items) >= scan_kwargs["Limit"]:
                    break

                scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                response = self.scan_results.scan(**scan_kwargs)
                items.extend(response.get('Items', []))

            if limit is not None:
                return items[: scan_kwargs["Limit"]]
            return items
        except ClientError as e:
            logger.error(f"DynamoDB error listing scan records: {str(e)}")
            raise

    def create_iam_finding(self, finding_data: Dict[str, Any]) -> bool:
        """Create a new IAM finding"""
        try:
            item = {
                'finding_id': finding_data.get('finding_id', f"finding-{datetime.utcnow().isoformat()}"),
                'detected_at': finding_data.get('detected_at', datetime.utcnow().isoformat()),
                'resource_type': finding_data.get('resource_type', 'user'),
                'resource_id': finding_data.get('resource_id', ''),
                'severity': finding_data.get('severity', 'medium'),
                'title': finding_data.get('title', ''),
                'description': finding_data.get('description', ''),
                'recommendation': finding_data.get('recommendation', ''),
                'status': finding_data.get('status', 'open'),
                'account_id': finding_data.get('account_id', ''),
                'region': finding_data.get('region', 'us-east-1'),
                'metadata': finding_data.get('metadata', {}),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'expires_at': finding_data.get('expires_at', _compute_expires_at_epoch()),
            }
            
            self.iam_findings.put_item(Item=item)
            logger.info(f"Created IAM finding: {item['finding_id']}")
            return True
        except ClientError as e:
            logger.error(f"DynamoDB error creating IAM finding: {str(e)}")
            return False

    def get_iam_findings_by_resource(self, resource_type: str, severity: str = None) -> List[Dict]:
        """Get IAM findings by resource type and severity"""
        try:
            if severity:
                response = self.iam_findings.query(
                    IndexName='resource-index',
                    KeyConditionExpression='resource_type = :rt',
                    FilterExpression='severity = :s',
                    ExpressionAttributeValues={
                        ':rt': resource_type,
                        ':s': severity
                    }
                )
            else:
                response = self.iam_findings.query(
                    IndexName='resource-index',
                    KeyConditionExpression='resource_type = :rt',
                    ExpressionAttributeValues={
                        ':rt': resource_type
                    }
                )
            
            return response.get('Items', [])
        except ClientError as e:
            logger.error(f"DynamoDB error getting IAM findings: {str(e)}")
            return []

    def update_compliance_status(self, compliance_data: Dict[str, Any]) -> bool:
        """Update or create compliance status"""
        try:
            item = {
                'account_id': compliance_data.get('account_id', 'default'),
                'framework': compliance_data.get('framework', 'CIS'),
                'status': compliance_data.get('status', 'non_compliant'),
                'score': compliance_data.get('score', 0.0),
                'findings_count': compliance_data.get('findings_count', 0),
                'last_assessed': compliance_data.get('last_assessed', datetime.utcnow().isoformat()),
                'details': compliance_data.get('details', {}),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            self.compliance.put_item(Item=item)
            logger.info(f"Updated compliance status: {item['account_id']}/{item['framework']}")
            return True
        except ClientError as e:
            logger.error(f"DynamoDB error updating compliance status: {str(e)}")
            return False

    def get_compliance_status(self, account_id: str, framework: str = None) -> Optional[Dict]:
        """Get compliance status for account and framework"""
        try:
            if framework:
                response = self.compliance.get_item(
                    Key={
                        'account_id': account_id,
                        'framework': framework
                    }
                )
            else:
                response = self.compliance.query(
                    KeyConditionExpression='account_id = :aid',
                    ExpressionAttributeValues={
                        ':aid': account_id
                    }
                )
                items = response.get('Items', [])
                return items if not framework else items[0] if items else None
            
            return response.get('Item')
        except ClientError as e:
            logger.error(f"DynamoDB error getting compliance status: {str(e)}")
            return None

    def batch_create_findings(self, findings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch create IAM findings"""
        try:
            with self.iam_findings.batch_writer() as batch:
                success_count = 0
                for finding in findings:
                    try:
                        item = {
                            'finding_id': finding.get('finding_id', f"finding-{datetime.utcnow().isoformat()}"),
                            'detected_at': finding.get('detected_at', datetime.utcnow().isoformat()),
                            'resource_type': finding.get('resource_type', 'user'),
                            'resource_id': finding.get('resource_id', ''),
                            'severity': finding.get('severity', 'medium'),
                            'title': finding.get('title', ''),
                            'description': finding.get('description', ''),
                            'recommendation': finding.get('recommendation', ''),
                            'status': finding.get('status', 'open'),
                            'account_id': finding.get('account_id', ''),
                            'region': finding.get('region', 'us-east-1'),
                            'metadata': finding.get('metadata', {}),
                            'created_at': datetime.utcnow().isoformat(),
                            'updated_at': datetime.utcnow().isoformat(),
                            'expires_at': finding.get('expires_at', _compute_expires_at_epoch()),
                        }
                        batch.put_item(Item=item)
                        success_count += 1
                    except Exception as e:
                        logger.error(f"Error adding finding to batch: {str(e)}")
                
                logger.info(f"Batch created {success_count}/{len(findings)} findings")
                return {'success': success_count, 'failed': len(findings) - success_count}
        
        except ClientError as e:
            logger.error(f"DynamoDB error in batch create: {str(e)}")
            return {'success': 0, 'failed': len(findings)}

    def delete_old_records(self, table_name: str, days: int = 90) -> int:
        """Delete records older than ``days`` using a paginated table scan.

        Uses the correct primary key for scan results vs IAM findings tables.
        """
        if days <= 0:
            raise ValueError("days must be positive")
        cutoff_dt = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=days)
        cutoff_epoch = cutoff_dt.timestamp()

        table = self.dynamodb.Table(table_name)
        is_scan = table_name == self.scan_results_table
        is_findings = table_name == self.iam_findings_table
        if not is_scan and not is_findings:
            logger.warning("delete_old_records: unsupported table name %s", table_name)
            return 0
        deleted_count = 0
        scan_kwargs: Dict[str, Any] = {}

        try:
            while True:
                response = table.scan(**scan_kwargs)
                with table.batch_writer() as batch:
                    for item in response.get("Items", []):
                        if is_scan:
                            item_epoch = _parse_item_time_epoch(item.get("timestamp"))
                            if item_epoch is None or item_epoch >= cutoff_epoch:
                                continue
                            sid = item.get("scan_id")
                            ts = item.get("timestamp")
                            if sid is None or ts is None:
                                continue
                            batch.delete_item(Key={"scan_id": sid, "timestamp": ts})
                            deleted_count += 1
                        else:
                            item_epoch = _parse_item_time_epoch(
                                item.get("detected_at") or item.get("created_at")
                            )
                            if item_epoch is None or item_epoch >= cutoff_epoch:
                                continue
                            fid = item.get("finding_id")
                            det = item.get("detected_at")
                            if fid is None or det is None:
                                continue
                            batch.delete_item(Key={"finding_id": fid, "detected_at": det})
                            deleted_count += 1

                lek = response.get("LastEvaluatedKey")
                if not lek:
                    break
                scan_kwargs["ExclusiveStartKey"] = lek

            logger.info("Deleted %s old records from %s", deleted_count, table_name)
            return deleted_count

        except ClientError as e:
            logger.error("DynamoDB error deleting old records from %s: %s", table_name, str(e))
            raise

