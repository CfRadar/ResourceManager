"""Tests for health check and internal authentication."""

from fastapi.testclient import TestClient
from config import get_settings
from main import app

client = TestClient(app)
settings = get_settings()


def test_health_endpoint():
    """Assert /ai/health returns 200 and expected schema keys."""
    response = client.get("/ai/health")
    assert response.status_code == 200
    data = response.json()

    # Exact required keys per specification
    assert "ok" in data
    assert "service" in data
    assert "status" in data
    assert "model_loaded" in data
    assert "database" in data

    assert data["ok"] is True
    assert data["service"] == "UviAge"
    assert data["status"] == "healthy"
    assert data["model_loaded"] is False


def test_protected_route_missing_key():
    """Assert protected /ai/* route returns 403 without X-Internal-Key header."""
    response = client.get("/ai/protected-test")
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid or missing X-Internal-Key header"


def test_protected_route_invalid_key():
    """Assert protected /ai/* route returns 403 with invalid X-Internal-Key."""
    response = client.get(
        "/ai/protected-test",
        headers={"X-Internal-Key": "invalid-secret-key"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid or missing X-Internal-Key header"


def test_protected_route_valid_key():
    """Assert protected /ai/* route succeeds (200) with valid X-Internal-Key."""
    valid_key = settings.INTERNAL_API_KEY
    response = client.get(
        "/ai/protected-test",
        headers={
            "X-Internal-Key": valid_key,
            "X-User-Id": "test-user-123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "Access granted" in data["message"]
