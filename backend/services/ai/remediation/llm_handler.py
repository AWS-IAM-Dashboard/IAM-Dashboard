"""
This is the "AI Brain" of the IAM Dashboard, it connects the dashboard to Google's Gemini AI to 
generate security advice.

When the dashboard finds a security issue (like a misconfigured IAM policy), we want to show the user
how to fix it. Instead of writing fixed, generic instructions for every possible issue, we send the 
specific issue to the AI so it can write custom, context-aware remediation instructions. Since the 
AI can take a few seconds to think, we run this in the background so the dashboard doesn't freeze 
while waiting.

What does it do?
1. It takes finding details (the issue to fix) and passes them to the Gemini AI.
2. It runs these tasks in the background using "threading", keeping track of the status in `_job_store`.
3. It strictly checks everything the AI says against our safety rules to make sure the AI isn't 
suggesting anything dangerous (like giving someone Administrator access).
"""
import os
import json
import time
import requests
import threading
import logging

logger = logging.getLogger(__name__)

# In-memory job store to track async work
# Format: { "job_id": {"status": "pending|running|succeeded|failed", "result": None, "error": None} }
_job_store = {}
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
def get_job(job_id):
    """Retrieve job status and result from the store."""
    return _job_store.get(job_id, {"status": "not_found"})
def _validate_guardrails(response_json):
    """
    Validates the parsed response against Guardrails & Safety Rules.md
    """
    # Enforce strictly True for requires_review
    response_json["requires_review"] = True
        
    violations = response_json.get("violations", [])
    blocked = response_json.get("blocked", False)
    
    proposed_change = response_json.get("proposed_change", "")
    # Convert proposed_change to string for checking patterns
    proposed_change_str = json.dumps(proposed_change) if isinstance(proposed_change, dict) else str(proposed_change)
    
    # Remove all spaces for checking patterns securely
    compact_pc_str = proposed_change_str.replace(" ", "")
    
    # Check for banned properties like Action: "*" or Resource: "*"
    if '"Action":"*"' in compact_pc_str or "'Action':'*'" in compact_pc_str:
        violations.append("BANNED_WILDCARD_ACTION")
        blocked = True
        
    if '"Resource":"*"' in compact_pc_str or "'Resource':'*'" in compact_pc_str:
        violations.append("BANNED_WILDCARD_RESOURCE")
        blocked = True
    # Check for excessive privilege grants
    if '"AdministratorAccess"' in proposed_change_str:
        violations.append("BANNED_ADMIN_ACCESS")
        blocked = True
        
    response_json["blocked"] = blocked
    if violations:
        response_json["violations"] = list(set(violations)) # deduplicate
    
    return response_json
def _call_gemini_api(prompt_text, max_retries=3):
    """
    Constructs and sends request to Gemini API, returning parsed JSON.
    Includes exponential backoff for rate limiting and handles errors gracefully.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
         logger.error("GEMINI_API_KEY is not set in environment variables")
         raise ValueError("GEMINI_API_KEY is not set in environment variables")
         
    url = f"{GEMINI_API_URL}?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # The payload structure for Gemini
    payload = {
        "contents": [{
            "parts": [{"text": prompt_text}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content)
            
        except requests.exceptions.RequestException as e:
            # Safely extract status code from the exception itself to avoid scoping leaks
            status_code = e.response.status_code if getattr(e, 'response', None) is not None else None
            
            if status_code in [429, 503, 504] and attempt < max_retries - 1:
                sleep_time = 2 ** attempt
                logger.warning(f"Gemini API rate limited (status {status_code}). Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
                continue
                
            logger.error(f"Gemini API network request failed: {str(e)}")
            raise
            
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse Gemini API JSON response: {str(e)}")
            raise ValueError("Failed to parse Gemini response as JSON")
        
def _create_prompt(task_type, finding_data):
    """
    Generates a prompt embedding the AI Input Schema data.
    """
    base_prompt = f"""
    You are a Cloud Security Remediation Engine for an IAM Dashboard.
    Task: {task_type}
    
    Analyze the following finding according to the AI Input Schema:
    {json.dumps(finding_data, indent=2)}
    
    You must return a single JSON object with the following fields:
    - type: string (e.g. 'iam_policy', 'trust_policy', 'mfa', etc.)
    - risk_level: string ('low', 'medium', 'high')
    - explanation: string (Why this remediation matters)
    - proposed_change: object or array (The actual fix, policy JSON or steps)
    - requires_review: true
    - blocked: boolean
    - violations: array of strings
    """
    return base_prompt
def process_triage_job_async(job_id, finding_data):
    """Async worker for triage jobs"""
    def worker():
        _job_store[job_id] = {"status": "running", "result": None}
        try:
            prompt = _create_prompt("Provide a triage priority and initial assessment.", finding_data)
            raw_response = _call_gemini_api(prompt)
            validated_response = _validate_guardrails(raw_response)
            
            _job_store[job_id] = {"status": "succeeded", "result": validated_response}
        except Exception as e:
            logger.error(f"Background worker failed for job {job_id}: {str(e)}")
            _job_store[job_id] = {"status": "failed", "error": str(e)}
    threading.Thread(target=worker, daemon=True).start()
def process_root_cause_job_async(job_id, finding_data):
    """Async worker for root-cause analysis jobs"""
    def worker():
        _job_store[job_id] = {"status": "running", "result": None}
        try:
            prompt = _create_prompt("Explain the core root cause of this vulnerability.", finding_data)
            raw_response = _call_gemini_api(prompt)
            validated_response = _validate_guardrails(raw_response)
            
            _job_store[job_id] = {"status": "succeeded", "result": validated_response}
        except Exception as e:
            logger.error(f"Background worker failed for job {job_id}: {str(e)}")
            _job_store[job_id] = {"status": "failed", "error": str(e)}
    threading.Thread(target=worker, daemon=True).start()
def process_runbook_job_async(job_id, finding_data):
    """Async worker for runbook generation jobs"""
    def worker():
        _job_store[job_id] = {"status": "running", "result": None}
        try:
            prompt = _create_prompt("Generate a remediation runbook with exact policy JSON fixes if applicable.", finding_data)
            raw_response = _call_gemini_api(prompt)
            validated_response = _validate_guardrails(raw_response)
            
            _job_store[job_id] = {"status": "succeeded", "result": validated_response}
        except Exception as e:
            logger.error(f"Background worker failed for job {job_id}: {str(e)}")
            _job_store[job_id] = {"status": "failed", "error": str(e)}
    threading.Thread(target=worker, daemon=True).start()