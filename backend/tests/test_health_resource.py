import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.health import HealthResource


class _Mem:
    def __init__(self, used, available, percent):
        self.used = used
        self.available = available
        self.percent = percent


class _Disk:
    def __init__(self, used, free, percent):
        self.used = used
        self.free = free
        self.percent = percent


def test_health_resource_returns_healthy_payload(monkeypatch):
    monkeypatch.setattr("api.health.time.time", lambda: 2000.0)
    monkeypatch.setattr("api.health.psutil.boot_time", lambda: 1000.0)
    monkeypatch.setattr("api.health.psutil.virtual_memory", lambda: _Mem(1, 2, 3.5))
    monkeypatch.setattr("api.health.psutil.cpu_percent", lambda interval=1: 12.5)
    monkeypatch.setattr("api.health.psutil.disk_usage", lambda path: _Disk(10, 20, 33.3))

    resource = HealthResource()
    payload, status = resource.get()

    assert status == 200
    assert payload["status"] == "healthy"
    assert payload["uptime"] == 1000.0
    assert payload["memory"]["percent"] == 3.5
    assert payload["cpu"]["percent"] == 12.5
    assert payload["disk"]["percent"] == 33.3
