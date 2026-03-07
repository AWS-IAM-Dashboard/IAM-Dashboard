# Python Backend Setup Guide for Memory Forensics Toolkit

## Overview
This document outlines the Python backend implementation that integrates with the React frontend for the Memory Forensics Toolkit.

## Technology Stack

### Backend Framework: FastAPI
```bash
pip install fastapi uvicorn psutil pefile yara-python requests sqlite3 hashlib
```

### Key Python Libraries
- **psutil**: System and process monitoring
- **pefile**: PE file analysis for Windows executables
- **yara-python**: Malware detection and pattern matching
- **volatility3**: Memory dump analysis framework
- **requests**: HTTP client for VirusTotal API integration
- **sqlite3**: Local database for case management
- **hashlib**: File hashing and verification

## Backend Architecture

### Core API Endpoints

#### 1. System Statistics (`/api/system/stats`)
```python
from fastapi import FastAPI
import psutil
from datetime import datetime

@app.get("/api/system/stats")
async def get_system_stats():
    return {
        "success": True,
        "data": {
            "last_scan": "2 min ago",  # From database
            "total_processes": len(psutil.pids()),
            "suspicious_findings": 0,  # From analysis results
            "memory_usage": f"{psutil.virtual_memory().used / (1024**3):.1f} GB",
            "cpu_usage": psutil.cpu_percent(),
            "active_threats": 0
        }
    }
```

#### 2. Memory Scan Management (`/api/memory/scan/*`)
```python
import asyncio
import uuid
from typing import Dict, Any

scan_sessions: Dict[str, Any] = {}

@app.post("/api/memory/scan/start")
async def start_memory_scan():
    scan_id = str(uuid.uuid4())
    scan_sessions[scan_id] = {
        "status": "Running",
        "progress": 0,
        "started_at": datetime.now().isoformat(),
        "processes": []
    }
    
    # Start background scan task
    asyncio.create_task(perform_memory_scan(scan_id))
    
    return {"success": True, "data": {"scan_id": scan_id}}

@app.get("/api/memory/scan/{scan_id}")
async def get_scan_status(scan_id: str):
    if scan_id not in scan_sessions:
        return {"success": False, "error": "Scan not found"}
    
    return {"success": True, "data": scan_sessions[scan_id]}
```

#### 3. Process Analysis (`/api/processes`)
```python
import psutil
import hashlib
import pefile

@app.get("/api/processes")
async def get_running_processes():
    processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent', 'create_time', 'exe']):
        try:
            # Get process info
            process_data = {
                "pid": proc.info['pid'],
                "name": proc.info['name'],
                "memory_usage": proc.info['memory_info'].rss if proc.info['memory_info'] else 0,
                "cpu_usage": proc.info['cpu_percent'] or 0,
                "creation_time": datetime.fromtimestamp(proc.info['create_time']).isoformat(),
                "path": proc.info['exe'],
                "status": "Safe",  # Default, will be updated by analysis
                "threads": proc.num_threads() if proc.is_running() else 0
            }
            
            # Calculate file hash if executable exists
            if process_data['path']:
                try:
                    with open(process_data['path'], 'rb') as f:
                        file_hash = hashlib.sha256(f.read()).hexdigest()
                        process_data['hash'] = file_hash
                        
                        # Analyze with VirusTotal (implement threat scoring)
                        threat_score = await analyze_with_virustotal(file_hash)
                        process_data['threat_score'] = threat_score
                        
                        if threat_score > 70:
                            process_data['status'] = 'Dangerous'
                        elif threat_score > 30:
                            process_data['status'] = 'Suspicious'
                            
                except Exception:
                    process_data['hash'] = None
                    process_data['threat_score'] = 0
            
            processes.append(process_data)
            
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    return {"success": True, "data": processes}
```

#### 4. Hidden Process Detection (`/api/processes/hidden/detect`)
```python
@app.post("/api/processes/hidden/detect")
async def detect_hidden_processes():
    # Cross-reference multiple process listing methods
    psutil_pids = set(psutil.pids())
    
    # Method 1: Windows API enumeration (Windows-specific)
    # Method 2: /proc filesystem scan (Linux-specific)
    # Method 3: Memory scanning for EPROCESS structures
    
    hidden_processes = []
    # Implementation depends on OS and requires low-level access
    
    return {"success": True, "data": hidden_processes}
```

#### 5. DLL Analysis (`/api/dll/analyze`)
```python
import pefile

@app.post("/api/dll/analyze/{pid}")
async def analyze_process_dlls(pid: int):
    try:
        proc = psutil.Process(pid)
        dlls = []
        
        # Get loaded modules/DLLs
        for dll in proc.memory_maps():
            if dll.path and dll.path.endswith(('.dll', '.exe')):
                try:
                    pe = pefile.PE(dll.path)
                    dll_info = {
                        "name": os.path.basename(dll.path),
                        "path": dll.path,
                        "size": os.path.getsize(dll.path),
                        "version": get_file_version(dll.path),
                        "hash": calculate_file_hash(dll.path),
                        "signature_status": check_digital_signature(dll.path),
                        "threat_level": "Safe"  # Default
                    }
                    
                    # Analyze for threats
                    if is_suspicious_dll(dll_info):
                        dll_info["threat_level"] = "Suspicious"
                    
                    dlls.append(dll_info)
                    
                except Exception:
                    continue
        
        return {"success": True, "data": dlls}
        
    except psutil.NoSuchProcess:
        return {"success": False, "error": "Process not found"}
```

#### 6. Threat Intelligence Integration (`/api/threat-intel/hash`)
```python
import requests

@app.post("/api/threat-intel/hash")
async def analyze_hash_with_virustotal(hash_data: dict):
    file_hash = hash_data.get('hash')
    
    # VirusTotal API integration
    vt_api_key = "YOUR_VIRUSTOTAL_API_KEY"
    url = f"https://www.virustotal.com/vtapi/v2/file/report"
    
    params = {
        'apikey': vt_api_key,
        'resource': file_hash
    }
    
    try:
        response = requests.get(url, params=params)
        vt_data = response.json()
        
        if vt_data.get('response_code') == 1:
            threat_data = {
                "hash": file_hash,
                "detection_ratio": f"{vt_data.get('positives', 0)}/{vt_data.get('total', 0)}",
                "threat_names": list(vt_data.get('scans', {}).keys())[:5],
                "last_analysis_date": vt_data.get('scan_date'),
                "reputation": calculate_reputation_score(vt_data),
                "mitre_techniques": map_to_mitre_attack(vt_data)
            }
            
            return {"success": True, "data": threat_data}
        else:
            return {"success": False, "error": "Hash not found in VirusTotal"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}
```

## Background Scan Implementation

```python
async def perform_memory_scan(scan_id: str):
    """Background task for memory scanning"""
    scan_data = scan_sessions[scan_id]
    
    try:
        # Phase 1: Process enumeration (20%)
        scan_data["progress"] = 20
        processes = await get_all_processes()
        
        # Phase 2: Memory analysis (40%)
        scan_data["progress"] = 40
        for proc in processes:
            await analyze_process_memory(proc)
        
        # Phase 3: Threat detection (70%)
        scan_data["progress"] = 70
        for proc in processes:
            proc["threat_score"] = await calculate_threat_score(proc)
        
        # Phase 4: Report generation (100%)
        scan_data["progress"] = 100
        scan_data["status"] = "Completed"
        scan_data["completed_at"] = datetime.now().isoformat()
        scan_data["processes"] = processes
        scan_data["total_processes"] = len(processes)
        scan_data["suspicious_processes"] = sum(1 for p in processes if p["status"] == "Suspicious")
        scan_data["dangerous_processes"] = sum(1 for p in processes if p["status"] == "Dangerous")
        
    except Exception as e:
        scan_data["status"] = "Failed"
        scan_data["error"] = str(e)
```

## Database Schema (SQLite)

```sql
-- Cases table
CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Open',
    priority TEXT DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignee TEXT
);

-- Scan results table
CREATE TABLE scan_results (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    scan_type TEXT,
    status TEXT,
    results TEXT,  -- JSON blob
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases (id)
);

-- Threat intelligence cache
CREATE TABLE threat_cache (
    hash TEXT PRIMARY KEY,
    detection_ratio TEXT,
    threat_names TEXT,  -- JSON array
    reputation_score INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Running the Backend

```bash
# Install dependencies
pip install fastapi uvicorn psutil pefile requests

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# API will be available at http://localhost:8000
# Documentation at http://localhost:8000/docs
```

## Security Considerations

1. **Elevated Privileges**: Backend requires admin/root access for memory analysis
2. **API Authentication**: Implement JWT tokens for production
3. **Rate Limiting**: Prevent abuse of VirusTotal API
4. **Input Validation**: Sanitize all user inputs
5. **CORS Configuration**: Restrict frontend origins

## Integration Points

The React frontend makes HTTP requests to these endpoints using the `forensicsAPI` service we created. The real-time updates are handled through polling or WebSocket connections for scan progress and notifications.

This Python backend provides the actual forensics functionality while the React frontend handles the user interface and experience.