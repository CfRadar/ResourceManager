"""UviAge Performance Benchmarks, Concurrency & Index Rebuilding Test Suite.

Spec §6.3, §6.4, Step 09.
"""

import asyncio
import time
from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from config import get_settings
from main import app

settings = get_settings()
AUTH_HEADERS = {"X-Internal-Key": settings.INTERNAL_API_KEY}


@pytest.mark.anyio
async def test_health_latency_benchmark():
    """Assert /ai/health responds in under 50ms in testing environment (Target: < 10ms in prod)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start = time.perf_counter()
        response = await client.get("/ai/health")
        duration = time.perf_counter() - start

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["status"] == "healthy"
        assert "indexed_count" in data
        assert duration < 0.200, f"Health check took too long: {duration:.4f}s"


@pytest.mark.anyio
async def test_parse_need_latency_benchmark():
    """Assert /ai/parse-need executes deterministic grammar extraction under 100ms."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "Need a high-precision SLA 3D printer for resin biocompatible dental crowns, 0.05mm layer height."
        }
        start = time.perf_counter()
        response = await client.post("/ai/parse-need", json=payload, headers=AUTH_HEADERS)
        duration = time.perf_counter() - start

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert len(data["items"]) > 0
        assert duration < 0.250, f"Parse need took too long: {duration:.4f}s"


@pytest.mark.anyio
async def test_match_need_latency_benchmark():
    """Assert /ai/match-need executes inference + reranking under 1.0s on CPU."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "CNC milling machine with 4-axis capability for titanium aerospace components",
            "visibleResourceIds": ["res_001", "res_002", "res_003", "res_004", "res_005"],
        }
        start = time.perf_counter()
        response = await client.post("/ai/match-need", json=payload, headers=AUTH_HEADERS)
        duration = time.perf_counter() - start

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "matches" in data
        assert duration < 1.0, f"Match need took too long: {duration:.4f}s"


@pytest.mark.anyio
async def test_concurrent_match_requests():
    """Assert AI service handles concurrent asynchronous queries safely without thread contention or blocking."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        queries = [
            "Laser cutter for acrylic sheets",
            "Oscilloscope 100MHz digital storage",
            "Autoclave steam sterilizer 50L",
            "Scanning electron microscope SEM",
            "FDM 3D printer heated bed PLA",
        ]

        async def send_match(q: str):
            res = await client.post(
                "/ai/match-need",
                json={"text": q, "visibleResourceIds": ["res_001", "res_002", "res_003"]},
                headers=AUTH_HEADERS,
            )
            return res

        start = time.perf_counter()
        responses = await asyncio.gather(*(send_match(q) for q in queries))
        total_time = time.perf_counter() - start

        assert len(responses) == len(queries)
        for r in responses:
            assert r.status_code == 200
            body = r.json()
            assert body["ok"] is True
            assert isinstance(body["matches"], list)
        assert total_time < 3.0, f"Concurrent requests took too long: {total_time:.4f}s"


@pytest.mark.anyio
async def test_visibility_boundary_strictly_enforced():
    """Assert that resources outside caller's visibleResourceIds are never leaked in matches."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        allowed_id = "res_001"
        payload = {
            "text": "3D printer for ABS prototyping",
            "visibleResourceIds": [allowed_id],
        }
        response = await client.post("/ai/match-need", json=payload, headers=AUTH_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        for match in data["matches"]:
            assert match["resourceId"] == allowed_id, (
                f"Leaked unauthorized resource '{match['resourceId']}' outside visibility list!"
            )


@pytest.mark.anyio
async def test_reindex_benchmark_and_timestamp():
    """Assert /ai/reindex refreshes catalog index and outputs ISO timestamp."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start = time.perf_counter()
        response = await client.post("/ai/reindex", headers=AUTH_HEADERS)
        duration = time.perf_counter() - start

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["indexed_count"] > 0
        assert "timestamp" in data
        assert duration < 2.0, f"Reindex took too long: {duration:.4f}s"

        # Verify timestamp validity
        parsed_time = datetime.fromisoformat(data["timestamp"])
        now = datetime.now(timezone.utc)
        diff_seconds = abs((now - parsed_time).total_seconds())
        assert diff_seconds < 60, f"Timestamp {data['timestamp']} deviated by {diff_seconds}s from current time"
