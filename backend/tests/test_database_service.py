import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.database_service import DatabaseService


def test_database_service_uses_default_url_when_env_missing(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)

    service = DatabaseService()

    assert service.database_url == "sqlite:///cybersecurity.db"


def test_database_service_create_and_read_security_finding(monkeypatch, tmp_path):
    db_path = tmp_path / "test_dashboard.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    service = DatabaseService()
    service.init_db()

    finding = service.create_security_finding(
        {
            "finding_id": "finding-1",
            "title": "Test Finding",
            "severity": "HIGH",
            "status": "NEW",
        }
    )

    results = service.get_security_findings(limit=10, offset=0)

    assert finding.finding_id == "finding-1"
    assert len(results) == 1
    assert results[0].title == "Test Finding"

    if db_path.exists():
        os.remove(db_path)
