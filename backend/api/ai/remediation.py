"""
This is the API controller for the AI Remediation feature of the IAM Dashboard.

When the dashboard requests AI-generated advice for a security finding (like a triage, 
root cause analysis, or a remediation runbook), it reaches these endpoints. Since the 
AI generation process can be slow, these routes don't wait for the AI to finish.

What does it do?
1. It receives HTTP POST requests with the finding data.
2. It generates a unique job ID for the request.
3. It immediately places the job into `_job_store` with a "queued" status.
4. It calls the `llm_handler` background tasks (which start their own threads) to do the real work.
5. It returns an HTTP 202 Accepted response, containing the job ID so the frontend can poll for updates.
"""
import uuid
import logging
from flask import request
from flask_restful import Resource

logger = logging.getLogger(__name__)

# Import AI brain handler and the shared job store
from services.ai.remediation.llm_handler import (
    _job_store,
    get_job,
    process_triage_job_async,
    process_root_cause_job_async,
    process_runbook_job_async
)

class AirTriageResource(Resource):
    def post(self):
        finding_data = request.json
        if not finding_data:
             return {"error": "Missing finding_data payload"}, 400
             
        job_id = str(uuid.uuid4())
        
        # Insert status into shared memory space
        _job_store[job_id] = {"status": "queued", "result": None}
        
        # Dispatch task to background threads
        process_triage_job_async(job_id, finding_data)
        
        # Immediately return accepted status
        return {
            "message": "Job queued successfully", 
            "job_id": job_id, 
            "status": "queued"
        }, 202

class AirRootCauseResource(Resource):
    def post(self):
        finding_data = request.json
        if not finding_data:
             return {"error": "Missing finding_data payload"}, 400
             
        job_id = str(uuid.uuid4())
        
        # Insert status into shared memory space
        _job_store[job_id] = {"status": "queued", "result": None}
        
        # Dispatch task to background threads
        process_root_cause_job_async(job_id, finding_data)
        
        # Immediately return accepted status
        return {
            "message": "Job queued successfully", 
            "job_id": job_id, 
            "status": "queued"
        }, 202

class AirRunbookResource(Resource):
    def post(self):
        finding_data = request.json
        if not finding_data:
             return {"error": "Missing finding_data payload"}, 400
             
        job_id = str(uuid.uuid4())
        
        # Insert status into shared memory space
        _job_store[job_id] = {"status": "queued", "result": None}
        
        # Dispatch task to background threads
        process_runbook_job_async(job_id, finding_data)
        
        # Immediately return accepted status
        return {
            "message": "Job queued successfully", 
            "job_id": job_id, 
            "status": "queued"
        }, 202

class AirJobStatusResource(Resource):
    def get(self, job_id):
        job = get_job(job_id)
        if job.get("status") == "not_found":
            return {"error": "Job not found"}, 404
            
        # Note: We intentionally do NOT pop() the job here. Modern frontends like React 
        # (especially in StrictMode) often fire duplicate fetch requests. Aggressively 
        # purging the result upon first read causes immediate 404s on UI re-renders. 
        # Since this is a local development mock, holding nominal jobs in memory is harmless.
            
        return job, 200
