# System Architecture & Documentation Map

> **OVERVIEW:**
> This document maps all architectural components, database rules, and specifications housed in `Research/` and `docs/`.

---

## 1. Golden Architectural Principles

1. **Express is the Sole Writer of Business Data:**
   - The Express Node.js API is the master authority. All state changes, user creations, bookings, and financial/token ledger entries are written strictly by Express.
   - The Python AI service has a **read-only** database user and generates suggestions only. It NEVER writes mutations or decisions.
2. **Deterministic Rules Over AI:**
   - Eligibility checks, slot availability, working hours boundaries, and state machines are **100% deterministic code** (`bookingEngine.js`, `eligibilityEngine.js`, `transition.js`). AI is reserved strictly for natural language search parsing and incident drafting.
3. **Decisions are Human-Centric:**
   - The system checks eligibility and suggests candidate matches, but human operators/managers approve, reject, waitlist, or rule on incidents.
4. **History is Append-Only:**
   - `audit_events` rows form a cryptographic SHA-256 hash chain.
   - `token_ledger` rows are append-only (balance = SUM of entries).
   - Resources, policies, and documents are versioned or soft-deleted; history is never purged.

---

## 2. Directory & Specifications Navigation Map

### A. Root Documentation & Memory
- `docs/PROJECT_MEMORY.md`: The append-only historical record of all changes (`CHG-xxx`), mistakes/lessons (`MST-xxx`), open decisions (`DEC-xxx`), and backlog (`BKL-xxx`).
- `README.md`: Developer onboarding, quick start commands, and skill descriptions.
- `Makefile`: Cross-platform orchestration (`make install`, `make backend`, `make frontend`, `make agent`, `make clear`).

---

### B. Foundational Specifications (`Research/`)
- **[Research/01_BACKEND_API_SPEC.md](../Research/01_BACKEND_API_SPEC.md)**:
  - Authoritative reference for every backend endpoint, HTTP response envelopes (`{ ok, data, meta }` vs `{ ok, error }`), error codes, RBAC permission matrix (§2.3), state machine diagrams (§3.1–§3.5), and PostgreSQL GIST exclusion constraints.
- **[Research/02_FRONTEND_DESIGN_SPEC.md](../Research/02_FRONTEND_DESIGN_SPEC.md)**:
  - Full client specification covering UI screens, design tokens, role-based navigation shells, slot pickers, condition report diff viewers, QR check-in scanner, and judge evaluation demo helpers.
- **[Research/Instructions/SETUP_AND_BUILD_INSTRUCTIONS.md](../Research/Instructions/SETUP_AND_BUILD_INSTRUCTIONS.md)**:
  - Local environment setup, Node.js v20+, Python 3.12+ via `uv`, PostgreSQL setup, and troubleshooting tips.

---

### C. Node.js Express Backend Blueprints (`Research/NodeBackend/`)

Step-by-step implementation guides for building the backend in `backend/`:

| Step | Blueprint File | Key Responsibilities |
| :---: | :--- | :--- |
| **00** | `00_ARCHITECTURE_AND_SETUP.md` | Express factory, middleware order, error handling, Zod validation, smoke tests. |
| **01** | `01_DATABASE_MODELS_AND_MIGRATIONS.md` | 7 Knex migrations, 14 tables, PostgreSQL exclusion constraints, BaseRepository. |
| **02** | `02_AUTH_RBAC_AND_SECURITY.md` | JWT auth, Argon2/Bcrypt, refresh token rotation, strict `assertNoSelfApproval`. |
| **03** | `03_INSTITUTIONS_FACILITIES_MEMBERSHIPS.md` | Institution CRUD, timezone-aware facility hours, membership reviews, partner linking. |
| **04** | `04_RESOURCES_AND_POLICIES.md` | Resource catalog, dynamic versioned policy JSON schemas, confidential field redaction. |
| **05** | `05_AVAILABILITY_SLOTS_AND_ELIGIBILITY.md` | Discrete slot generator, blackout collisions, 6-check deterministic eligibility engine. |
| **06** | `06_ACCESS_REQUESTS_AND_STATE_MACHINE.md` | Central `transition()`, reviewer queue (`created_at ASC`), FIFO waitlisting, appeals. |
| **07** | `07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md` | Concurrency row-locking, QR code generation/scanning, before/after condition diffs. |
| **08** | `08_SERVICE_REQUESTS_AND_REFERRALS.md` | Staff-operated quote lifecycles, missing-resource intake, inter-institution referrals. |
| **09** | `09_INCIDENTS_TOKENS_PAYMENTS_EXPORTS.md` | Incident rulings, token ledger balance computation, Stripe/mock checkout, PDF exports. |
| **10** | `10_BACKGROUND_JOBS_AND_AUDIT_HASH_CHAIN.md` | Cron schedulers (reminders, auto-close), SHA-256 audit chain verification. |

---

### D. Python AI Service Blueprints (`Research/PythonBackend/`)

Step-by-step implementation guides for building the UviAge service in `UviAge/`:

| Step | Blueprint File | Key Responsibilities |
| :---: | :--- | :--- |
| **00** | `00_ARCHITECTURE_AND_FASTAPI_SETUP.md` | FastAPI factory, `uv` environment, `X-Internal-Key` constant-time security. |
| **01** | `01_PYDANTIC_SCHEMAS_AND_CONTRACTS.md` | Pydantic V2 models for ParseNeed, MatchNeed, IncidentSummary, Alternatives. |
| **02** | `02_READONLY_REPOSITORY_LAYER.md` | Read-only psycopg v3 queries, mutation prevention, offline JSON fixture fallbacks. |
| **03** | `03_NATURAL_LANGUAGE_NEED_PARSER.md` | Extraction of capabilities, timeframe, domain, constraints from unformatted user text. |
| **04** | `04_EMBEDDING_AND_VECTOR_INDEXING.md` | Local Sentence-Transformers embeddings, FAISS/numpy in-memory vector indexing. |
| **05** | `05_DETERMINISTIC_MATCHING_AND_RERANKING.md` | Multi-factor composite scoring (semantic, proximity, availability) + explainable reasons. |
| **06** | `06_KEYWORD_BM25_FALLBACK.md` | BM25 lexical keyword fallback when vector index is cold or unready. |
| **07** | `07_INCIDENT_SUMMARY_DRAFTING.md` | Objective LLM/template incident summary synthesis from condition diffs. |
| **08** | `08_EXPRESS_INTEGRATION_AND_CIRCUIT_BREAKER.md` | Express client (`aiClient.js`), 4-second timeout, circuit breaker, graceful fallback. |
| **09** | `09_TESTING_BENCHMARKS_AND_INDEX_REBUILD.md` | Pytest suites, precision/recall benchmarks, background index re-indexing task. |

---

### E. React Frontend Blueprints (`Research/Frontend/`)

Step-by-step implementation guides for building the client in `frontend/`:

| Step | Blueprint File | Key Responsibilities |
| :---: | :--- | :--- |
| **00** | `00_ARCHITECTURE_ROUTING_AND_PROVIDERS.md` | Vite, React Router, TanStack Query, Axios interceptors, Judge Quick-Login toolbar. |
| **01** | `01_DESIGN_SYSTEM_AND_SHARED_COMPONENTS.md` | Accessible CSS tokens, StatusBadge, ReasonDialog, DemoTag, AuditIntegrityBadge. |
| **02** | `02_AUTHENTICATION_AND_JUDGE_LOGIN.md` | Register, login, virtual OTP modal, instant role switcher toolbar. |
| **03** | `03_LANDING_AND_AI_DISCOVERY.md` | Natural language search bar, fallback banner, ResourceCard popover previews. |
| **04** | `04_RESOURCE_DETAIL_AND_ELIGIBILITY_CHECK.md` | Spec breakdowns, EligibilityChecklist with live action links, locked private details. |
| **05** | `05_DYNAMIC_REQUEST_WIZARD.md` | 5-step policy-driven wizard, interactive SlotPicker, fair-use meter. |
| **06** | `06_REQUESTER_DASHBOARD_AND_BOOKINGS.md` | Action-required cards, request timeline, appeal modal, active booking countdowns. |
| **07** | `07_CHECKIN_CHECKOUT_AND_SIGNATURE_PAD.md` | BEFORE/AFTER condition report, accessory checklist, SignaturePad, soft GPS signal. |
| **08** | `08_MANAGER_DASHBOARD_AND_REVIEW_QUEUE.md` | Review queue (`created_at ASC`), ReasonDialog, strict no-self-review lockout. |
| **09** | `09_SERVICES_NEEDS_AND_COORDINATION.md` | Missing-resource intake form, coordinator desk, inter-institution referral cards. |
| **10** | `10_INCIDENTS_ADMIN_AUDIT_AND_HISTORY.md` | Incident filing/ruling modal, audit log viewer with hash chain verification badges. |
