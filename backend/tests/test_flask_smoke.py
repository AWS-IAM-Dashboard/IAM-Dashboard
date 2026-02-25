def test_health_endpoint_smoke(client):
    """
    Smoke test: pytest-flask client can hit a real endpoint.
    """
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200

    data = resp.get_json()
    assert isinstance(data, dict)
    assert data.get("status") == "healthy"