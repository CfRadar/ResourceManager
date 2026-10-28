# Step 09: Testing, Performance Benchmarks & Background Reindexing

This guide details unit and integration testing with pytest, latency benchmarks, and background index rebuilding.

---

## 1. Test Suite Architecture (`UviAge/tests/`)

Use `pytest` and `httpx` for asynchronous endpoint testing:

```
UviAge/tests/
├── conftest.py               # Test fixtures, mock repository, sample embeddings
├── test_health.py            # /ai/health status & auth checks
├── test_matching.py          # /ai/match-need ranking & visibility constraints
├── test_parser.py            # /ai/parse-need extraction checks
└── test_fallback.py          # Keyword synonym & BM25 verification
```

### 1.1 Sample Test: Verifying Visibility Constraints (`test_matching.py`)

```python
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_matching_does_not_leak_unauthorized_resources():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "text": "3D printer for ABS plastic gears",
            "visibleResourceIds": ["res_allowed_01"] # res_private_99 deliberately omitted
        }
        headers = {"X-Internal-Key": "dev-secret-internal-key"}
        response = await client.post("/ai/match-need", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        returned_ids = [m["resourceId"] for m in data["matches"]]
        assert "res_private_99" not in returned_ids
        for rid in returned_ids:
            assert rid in payload["visibleResourceIds"]
```

---

## 2. Background Reindexing (`POST /ai/reindex`)

When an institutional resource is created, updated, or deactivated in Express, Express fires an internal webhook to `/ai/reindex`:

```python
@app.post("/ai/reindex")
async def reindex_resources(auth: dict = Depends(verify_internal_key)):
    """Background task rebuilding vector and BM25 index."""
    resources = repository.get_all_active_resources()
    vector_indexer.index_resources(resources)
    bm25_searcher.index(resources)
    return {
        "ok": True,
        "indexed_count": len(resources),
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## 3. Performance Benchmarks

Target performance thresholds on standard developer workstations:

| Operation | Target Latency | Notes |
|---|---|---|
| `/ai/health` | < 10 ms | Memory status + quick DB ping |
| `/ai/match-need` (Neural) | < 350 ms | Sentence-transformers CPU inference + cosine scoring |
| `/ai/match-need` (Keyword) | < 30 ms | BM25 tokenized lookup |
| `/ai/reindex` (1,000 resources) | < 5 s | Batch model encode |

---

## 4. Implementation Checklist

- [ ] Add `pytest`, `pytest-asyncio`, and `httpx` to development dependencies.
- [ ] Run test suite via `uv run pytest`.
- [ ] Connect Express webhook to trigger `/ai/reindex` after resource updates.
