"""
Cybersecurity Dashboard Flask Application
Main application entry point with API endpoints for AWS integrations
"""

import os
import logging
import threading
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_restful import Api
from werkzeug.exceptions import NotFound

# Import API resources
from api.aws_iam import IAMResource
from api.aws_ec2 import EC2Resource
from api.aws_s3 import S3Resource
from api.aws_security_hub import SecurityHubResource
from api.aws_config import ConfigResource
from api.grafana import GrafanaResource
from api.dashboard import DashboardResource
from api.health import HealthResource
from api.metrics import MetricsResource, register_metrics_hooks
from api.scan_history import ScanHistoryResource
from api.ir import (
    LLMTriageResource,
    LLMRootCauseResource,
    LLMRunbookResource,
    AutomationContainResource,
    AutomationRemediateResource,
    ForensicsCaptureResource,
    EvidencePreserveResource,
    IRJobStatusResource,
    IRJobApproveResource,
    IRJobRejectResource,
    IRForensicsResource,
    IREvidenceResource,
    IRAuditResource,
)
from api.retention import RetentionCleanupResource, run_retention_pass
from api.tts import TTSSynthesizeResource
from api.voice_intent import VoiceIntentResource

# Import services
from services.aws_service import AWSService
from services.grafana_service import GrafanaService
from services.database_service import DatabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__, static_folder='../static')

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get(
        'SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['DATABASE_URL'] = os.environ.get(
        'DATABASE_URL', 'sqlite:///cybersecurity.db')
    app.config['REDIS_URL'] = os.environ.get(
        'REDIS_URL', 'redis://localhost:6379/0')

    # Browser origins allowed to call this Flask API (local Docker + optional prod SPA).
    # Match infra var.allowed_urls; see docs/security/CORS.md. Override with CORS_ALLOWED_ORIGINS (comma-separated).
    _cors_default = (
        'http://localhost:3001,http://localhost:5173,'
        'https://d33ytnxd7i6mo9.cloudfront.net,http://localhost:5001'
    )
    _cors_raw = os.environ.get('CORS_ALLOWED_ORIGINS')
    _cors_src = _cors_default if not (_cors_raw and _cors_raw.strip()) else _cors_raw
    _cors_origins = [o.strip() for o in _cors_src.split(',') if o.strip()]
    CORS(app, origins=_cors_origins, supports_credentials=True)

    # Register metrics collection hooks
    register_metrics_hooks(app)

    # Initialize API
    api = Api(app, prefix='/api/v1')

    # Initialize services
    aws_service = AWSService()
    grafana_service = GrafanaService()
    database_service = DatabaseService()

    # Register API resources
    api.add_resource(HealthResource, '/health')
    api.add_resource(MetricsResource, '/metrics')
    api.add_resource(ScanHistoryResource, '/scan-history')
    api.add_resource(DashboardResource, '/dashboard')
    api.add_resource(IAMResource, '/aws/iam')
    api.add_resource(EC2Resource, '/aws/ec2')
    api.add_resource(S3Resource, '/aws/s3')
    api.add_resource(SecurityHubResource, '/aws/security-hub')
    api.add_resource(ConfigResource, '/aws/config')
    api.add_resource(GrafanaResource, '/grafana')
    api.add_resource(RetentionCleanupResource, '/system/retention')

    # IR Action Engine routes
    api.add_resource(LLMTriageResource,           '/llm/triage')
    api.add_resource(LLMRootCauseResource,        '/llm/root-cause')
    api.add_resource(LLMRunbookResource,          '/llm/runbook')
    api.add_resource(AutomationContainResource,   '/automation/contain')
    api.add_resource(AutomationRemediateResource, '/automation/remediate')
    api.add_resource(ForensicsCaptureResource,    '/forensics/capture')
    api.add_resource(EvidencePreserveResource,    '/evidence/preserve')
    api.add_resource(IRJobStatusResource,         '/ir/actions/<string:job_id>')
    api.add_resource(IRJobApproveResource,        '/ir/actions/<string:job_id>/approve')
    api.add_resource(IRJobRejectResource,         '/ir/actions/<string:job_id>/reject')
    api.add_resource(IRForensicsResource,         '/ir/forensics/<string:finding_id>')
    api.add_resource(IREvidenceResource,          '/ir/evidence/<string:finding_id>')
    api.add_resource(IRAuditResource,             '/ir/audit')
    api.add_resource(TTSSynthesizeResource,       '/tts/synthesize')
    api.add_resource(VoiceIntentResource,         '/voice/intent')

    # Serve static files (React frontend)
    @app.route('/')
    def serve_frontend():
        """Serve the React SPA entry (``index.html``) at ``/``."""
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        """Serve built static assets for client-side routes."""
        return send_from_directory(app.static_folder, path)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Return a JSON body for HTTP 404 responses."""
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Return a JSON body for HTTP 500 responses."""
        return jsonify({'error': 'Internal server error'}), 500

    # Initialize database
    with app.app_context():
        database_service.init_db()
        logger.info("Database initialized")

    def _start_retention_scheduler(flask_app: Flask) -> None:
        """Start a daemon thread that runs ``run_retention_pass`` on a fixed interval."""
        if os.environ.get("RETENTION_SCHEDULER_ENABLED", "true").lower() not in (
            "1",
            "true",
            "yes",
        ):
            logger.info("Retention scheduler disabled (RETENTION_SCHEDULER_ENABLED).")
            return
        raw_interval = os.environ.get("RETENTION_SCHEDULER_INTERVAL_SEC", "86400")
        try:
            interval = int(raw_interval)
        except (TypeError, ValueError):
            interval = 86400
        if interval <= 0:
            interval = 86400

        def _worker():
            """Run retention on startup delay, then loop with ``interval`` sleeps."""
            time.sleep(60)
            while True:
                try:
                    with flask_app.app_context():
                        run_retention_pass()
                except Exception:
                    logger.exception("Scheduled retention pass failed")
                time.sleep(interval)

        threading.Thread(
            target=_worker,
            daemon=True,
            name="retention-scheduler",
        ).start()
        logger.info(
            "Retention scheduler started (interval=%ss, first run after 60s startup delay).",
            interval,
        )

    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME") and os.environ.get(
        "WERKZEUG_RUN_MAIN", "false"
    ) != "true":
        _start_retention_scheduler(app)

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting Cybersecurity Dashboard on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
