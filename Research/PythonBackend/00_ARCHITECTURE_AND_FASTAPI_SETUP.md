# Step 00: FastAPI Architecture & UV Virtual Environment Setup

This guide establishes the project architecture, dependencies, security middleware, and `uv` workflow for the `UviAge` AI service.

---

## 1. Directory Structure

```
UviAge/
├── pyproject.toml / requirements.txt
├── .env.example
├── README.md
├── main.py                     # FastAPI application entrypoint
├── config.py                   # Pydantic BaseSettings (env vars, secrets)
├── auth.py                     # X-Internal-Key header validation
├── schemas.py                  # Pydantic request / response contracts
├── repository.py               # Read-only database query layer
├── matching/
│   ├── embedder.py             # Sentence-transformers embedding wrapper
│   ├── rerank.py               # Multi-factor re-ranking & reasons generator
│   └── fallback.py             # Keyword & BM25 deterministic fallback
├── parsing/
│   └── need_parser.py          # Structured need extractor
├── incidents/
│   └── summarizer.py           # Objective incident dossier drafter
└── tests/
    ├── test_health.py
    ├── test_matching.py
    └── test_parser.py
```

---

## 2. Environment Management with `uv`

> **Rule:** Never use global `pip`. All commands must use `uv`.

### Development Setup
```bash
cd UviAge
uv venv --allow-existing
uv pip install -r requirements.txt
```

### Running the Service
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 3. Security & Internal API Key Validation (`auth.py`)

The AI service is an internal private microservice. Calls from Express must provide `X-Internal-Key`:

```python
import os
from fastapi import Header, HTTPException, status

INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "dev-secret-internal-key")

async def verify_internal_key(
    x_internal_key: str = Header(..., alias="X-Internal-Key"),
    x_user_id: str | None = Header(None, alias="X-User-Id")
):
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Internal-Key header"
        )
    return { "user_id": x_user_id }
```

---

## 4. Healthcheck Endpoint (`/ai/health`)

Returns real-time service health, model load status, and read-only DB connectivity:

```python
@app.get("/ai/health")
async def health_check():
    return {
        "ok": True,
        "service": "UviAge",
        "status": "healthy",
        "model_loaded": embedder.is_ready(),
        "database": repository.ping()
    }
```

---

## 5. Implementation Checklist

- [ ] Configure `config.py` using `pydantic-settings`.
- [ ] Implement `auth.py` dependency and apply to protected `/ai/*` routes.
- [ ] Verify CORS settings restricting access to Express server.
