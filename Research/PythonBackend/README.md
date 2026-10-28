# Python (FastAPI / UviAge) AI Service Implementation Guides

This directory contains modular, step-by-step implementation blueprints for building the Python AI backend service (`UviAge`) according to Section 6 of [Research/01_BACKEND_API_SPEC.md](../01_BACKEND_API_SPEC.md).

---

## Guide Index

| Step | File | Core Topics Covered |
|---|---|---|
| **00** | [00_ARCHITECTURE_AND_FASTAPI_SETUP.md](./00_ARCHITECTURE_AND_FASTAPI_SETUP.md) | FastAPI app layout, UV virtual environment workflow, read-only boundary rules, `X-Internal-Key` auth |
| **01** | [01_PYDANTIC_SCHEMAS_AND_CONTRACTS.md](./01_PYDANTIC_SCHEMAS_AND_CONTRACTS.md) | Pydantic V2 schemas: parsed needs, match outputs, reason tags, candidate scoring models |
| **02** | [02_READ_ONLY_REPOSITORY_LAYER.md](./02_READ_ONLY_REPOSITORY_LAYER.md) | Read-only database access layer, SQL / SQLAlchemy read queries, connection pooling |
| **03** | [03_NATURAL_LANGUAGE_NEED_PARSER.md](./03_NATURAL_LANGUAGE_NEED_PARSER.md) | Natural language extraction: turning free-text research needs into structured categories & specs |
| **04** | [04_EMBEDDING_AND_VECTOR_INDEXING.md](./04_EMBEDDING_AND_VECTOR_INDEXING.md) | Local semantic embeddings (`all-MiniLM-L6-v2`), searchable document format, cosine similarity search |
| **05** | [05_DETERMINISTIC_MATCHING_AND_RERANKING.md](./05_DETERMINISTIC_MATCHING_AND_RERANKING.md) | Matching pipeline: respecting `visibleResourceIds`, scoring, match types, explainable `reasons[]` |
| **06** | [06_DETERMINISTIC_KEYWORD_BM25_FALLBACK.md](./06_DETERMINISTIC_KEYWORD_BM25_FALLBACK.md) | Zero-cost deterministic fallback with domain synonym dictionaries and BM25 / TF-IDF |
| **07** | [07_INCIDENT_SUMMARY_DRAFTING.md](./07_INCIDENT_SUMMARY_DRAFTING.md) | Objective incident synthesis: facts from records, unverified claims, missing info, source attribution |
| **08** | [08_EXPRESS_INTEGRATION_AND_CIRCUIT_BREAKER.md](./08_EXPRESS_INTEGRATION_AND_CIRCUIT_BREAKER.md) | Express HTTP proxy client, timeout handling (4s threshold), circuit breaker, graceful fallback |
| **09** | [09_TESTING_BENCHMARKS_AND_INDEX_REBUILD.md](./09_TESTING_BENCHMARKS_AND_INDEX_REBUILD.md) | Pytest test suite, mock fixtures, background `/ai/reindex` endpoint, Uvicorn production tuning |

---

## Golden Rules for the AI Service

1. **Suggestions Only:** The AI service recommends and drafts. It cannot approve, reject, penalize, or write business data.
2. **Read-Only Database Connection:** Dedicated DB credentials with `SELECT` privileges only.
3. **No Private Field Exposure:** The AI service never receives user contact info, access codes, or private identity documents.
4. **Zero-Hallucination Resource IDs:** The AI service only scores resource IDs explicitly passed by Express in `visibleResourceIds`.
5. **Always Explainable:** Every match must return verified `reasons[]` derived from actual resource capability fields.
