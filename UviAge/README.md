# UviAge — Python AI Microservice

`UviAge` is the dedicated Python AI microservice for the Institutional Resource Access and Coordination Network. It powers natural language research need parsing, vector embeddings, multi-factor capability matching, deterministic keyword fallbacks, and objective incident dossier summarization.

---

## 1. Directory Structure

```
UviAge/
├── requirements.txt            # Python dependencies strictly managed via uv
├── .env.example                # Safe environment configuration template
├── README.md                   # Service documentation and setup instructions
├── main.py                     # FastAPI application entrypoint & routing
├── config.py                   # Pydantic BaseSettings environment loader
├── auth.py                     # X-Internal-Key header validation dependency
├── schemas.py                  # Pydantic request / response contracts
├── repository.py               # Read-only database query layer
├── matching/
│   ├── __init__.py
│   ├── embedder.py             # Sentence-transformers embedding wrapper stub
│   ├── rerank.py               # Multi-factor re-ranking & reasons generator stub
│   └── fallback.py             # Keyword & BM25 deterministic fallback stub
├── parsing/
│   ├── __init__.py
│   └── need_parser.py          # Structured need extractor stub
├── incidents/
│   ├── __init__.py
│   └── summarizer.py           # Objective incident dossier drafter stub
└── tests/
    ├── __init__.py
    ├── test_health.py          # Health and authentication tests
    ├── test_matching.py        # Matching module smoke tests
    └── test_parser.py          # Parser & summarizer smoke tests
```

---

## 2. Environment Setup with `uv`

> **Golden Rule:** Never use global `pip`, `python -m pip`, or `conda`. All dependency installation and execution must run strictly via `uv`.

### Create Virtual Environment
```bash
cd UviAge
uv venv --allow-existing
```

### Install Dependencies
```bash
uv pip install -r requirements.txt
```

---

## 3. Running the Service

Start the development server with auto-reload:
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The service will listen on `http://localhost:8000`.

---

## 4. Running Tests

Run the complete test suite using pytest via `uv`:
```bash
uv run pytest
```

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env` to configure local variables:
```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `0.0.0.0` | Bind host for Uvicorn server |
| `PORT` | `8000` | Bind port for Uvicorn server |
| `INTERNAL_API_KEY` | `dev-secret-internal-key` | Shared secret for inter-service communication between Express and UviAge |
| `ALLOWED_ORIGINS` | `http://localhost:5000` | Comma-separated CORS allowed origins (strictly restricted to the Express backend) |
| `DATABASE_URL` | *None* | Read-only PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `MODEL_NAME` | `all-MiniLM-L6-v2` | Default embedding model identifier |

---

## 6. Security & Header Authentication

The AI service is an internal, private microservice designed to be reached exclusively by the Express backend.

### Authentication Headers
All protected operational `/ai/*` routes require:
- `X-Internal-Key`: Must match `INTERNAL_API_KEY`. Evaluated with `secrets.compare_digest` in constant time to prevent timing attacks. Missing or invalid keys return `HTTP 403 Forbidden`.
- `X-User-Id` *(Optional)*: Forwards the requesting user ID for audit and telemetry logging.

### Healthcheck Endpoint (`/ai/health`)
- **Route:** `GET /ai/health`
- **Authentication:** **Public (Unauthenticated)** by design.
- **Rationale:** Standard container orchestrators (e.g., Kubernetes probes, Docker healthchecks, cloud load balancers) and Express connectivity diagnostics must ping service liveness without requiring credentials.
- **Response Format:**
  ```json
  {
    "ok": true,
    "service": "UviAge",
    "status": "healthy",
    "model_loaded": false,
    "database": "not_configured"
  }
  ```
