# PROJECT MEMORY

> Shared record for all collaborators and agents. Read before every task. Update after every task. Append, never erase.

---

## 1. Project Overview
- **Name:** Institutional Resource Access and Coordination Network (Resource Manager)
- **Goal:** Unified platform enabling cross-institutional resource sharing, lab equipment bookings, and AI-driven capability matching.
- **Stack:**
  - **Frontend:** React 19 + TypeScript + Vite
  - **Backend API:** Node.js + Express
  - **AI Service:** Python 3.12 + FastAPI + Uvicorn (strictly managed via `uv`)
  - **Database:** PostgreSQL (recommended, schema DB-agnostic, pending final driver decision)
- **Key docs:**
  - [01_BACKEND_API_SPEC.md](../Research/01_BACKEND_API_SPEC.md)
  - [02_FRONTEND_DESIGN_SPEC.md](../Research/02_FRONTEND_DESIGN_SPEC.md)
  - [SETUP_AND_BUILD_INSTRUCTIONS.md](../Research/Instructions/SETUP_AND_BUILD_INSTRUCTIONS.md)
  - [README.md](../README.md)
- **Repo layout:**
  - `/frontend`: React client UI application
  - `/backend`: Core Express API and business logic
  - `/UviAge`: Python AI service running on Uvicorn
  - `/Research`: Architecture specifications and onboarding guides
  - `/Makefile`: Multi-service orchestration and port clearance automation

---

## 2. Conventions
- **Workflow:** Strict adherence to `.agent/skills/project-memory-workflow/SKILL.md` (plan approval before code edits, verification before push).
- **Environment Management:** Always use `uv` for Python environments and dependencies (`UviAge/`). Never use global pip.
- **Port Management:** Frontend on `5173`, Express Backend on `5000`, Python AI Service on `8000`. Use `make clear` to kill hung processes.
- **API response envelope:**
  - Success: `{ "ok": true, "data": { ... }, "meta": { ... } }`
  - Error: `{ "ok": false, "error": { "code": "CODE_NAME", "message": "Human readable text", "details": {} } }`
- **Demo data rule:** All data is demonstration only; simulated features are labelled "Demo" (`"demo": true`).
- **Commits:** Conventional commits `<type>(<scope>): <specific description>` with memory entry reference.

---

## 3. Current Project State

| Area | Status | Notes |
|---|---|---|
| **Backend API** | In progress | Step 00 complete: full modular `src/` architecture, all middleware, 24 module stubs, 7 service stubs, 12 passing smoke tests. Endpoints pending (Steps 02–10). |
| **Frontend** | In progress | React + Vite + TypeScript initialized with basic App component on port 5173 |
| **AI Service** | In progress | FastAPI initialized with `/` and `/ai/health` on port 8000; matching engine pending |
| **Database** | Configured | Knex/pg pool configured in `backend/src/config/db.js`; no migrations yet (Step 01). |
| **Orchestration** | Working | Root Makefile with `make install`, `make backend`, `make frontend`, `make agent`, `make clear` |
| **Tests** | In progress | 12 smoke tests passing (`backend/tests/app.smoke.test.js`); integration tests pending |

**How to run:**
- Install: `make install`
- Services: `make agent` (port 8000), `make backend` (port 5000), `make frontend` (port 5173) in separate terminals
- Cleanup: `make clear`
- Dev backend with hot-reload: `cd backend && npm run dev`

**How to verify:**
- Backend smoke: `cd backend && npm test` → 12 tests pass
- Backend health: `curl http://localhost:5000/health` → `{"ok":true,"data":{"status":"healthy"}}`
- Backend API health: `curl http://localhost:5000/api/v1/health` → same shape
- AI Service: `curl http://localhost:8000/ai/health` → `{"ok":true,"status":"healthy"}`
- Frontend: Browse to `http://localhost:5173`

**Core flows that must keep working:**
- `make clear` terminates active port listeners cleanly without errors
- `uv run uvicorn main:app --reload --port 8000` launches AI service without module missing errors

---

## 4. Open Decisions
- [x] DEC-001: Finalize database choice → **PostgreSQL with Knex** (confirmed by spec §1.1, §4.11; implemented in `backend/src/config/db.js`).
- [ ] DEC-002: Choose vector embedding model for AI matching (local `sentence-transformers` vs API).

---

## 5. Skills Registry
| Skill | Path | Purpose | Added in |
|---|---|---|---|
| `project-memory-workflow` | `.agent/skills/project-memory-workflow/SKILL.md` | Task workflow, memory, verification, commit rules | CHG-001 |
| `fix-errors` | `.agent/skills/fix-errors/SKILL.md` | Automated diagnosis, multi-service terminal probing, approval-gated repair, zero-regression verification | CHG-004 |

---

## 6. Change Log (newest first)

### CHG-005 | 2026-10-28 | Step 00 — NodeBackend Architecture, Project Structure & Setup
- **Requested by:** User — implement Step 00 per `Research/NodeBackend/00_ARCHITECTURE_AND_SETUP.md` and `Research/01_BACKEND_API_SPEC.md`.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/package.json` — added all required runtime deps (express, cors, helmet, dotenv, zod, bcryptjs, jsonwebtoken, cookie-parser, express-rate-limit, knex, pg) and devDeps (nodemon, supertest, jest); added scripts `start`, `dev`, `test`, `test:watch`.
  - `backend/.env.example` — safe placeholder env file created.
  - `backend/index.js` — replaced inline Express with minimal entrypoint delegating to `src/server.js`.
  - `backend/src/app.js` — Express factory with deliberate middleware order: helmet → CORS (allowlist) → JSON body limit → cookieParser → rate limiter → `/api/v1` router → 404 catch-all → error handler.
  - `backend/src/server.js` — HTTP server with graceful shutdown (SIGTERM/SIGINT, pool drain).
  - `backend/src/config/env.js` — dotenv + Zod validation; fails loudly on missing secrets; relaxes JWT in test mode.
  - `backend/src/config/constants.js` — single source for pagination, timeouts, limits.
  - `backend/src/config/db.js` — Knex/pg pool; lazy connect; safe health check; never logs credentials.
  - `backend/src/utils/AppError.js` — AppError class + 11 domain error helpers matching spec §1.4.
  - `backend/src/middleware/errorHandler.js` — handles AppError, Zod, SyntaxError, JWT errors.
  - `backend/src/middleware/auth.js` — JWT bearer verification with `authenticate` and `authenticate.optional`.
  - `backend/src/middleware/rbac.js` — `requireRole`, `requireAnyRole`, `requireInstitutionRole`, `requireSelf`.
  - `backend/src/middleware/validate.js` — Zod factory for body/query/params validation.
  - `backend/src/middleware/rateLimiter.js` — `apiLimiter` (100/min) and `authLimiter` (10/min); disabled in test.
  - `backend/src/middleware/idempotency.js` — foundation with NullStore (dev) and documented DB-store interface; production limitations clearly stated.
  - `backend/src/services/` — 7 placeholder service files with documented interfaces.
  - `backend/src/modules/` — 24 module directories each with a `README.md` placeholder.
  - `backend/src/jobs/README.md` — documents all 7 planned scheduled jobs.
  - `backend/tests/app.smoke.test.js` — 12 smoke tests covering health, 404, malformed JSON, CORS, AppError helpers, validate middleware.
- **Why:** Establish production-grade modular Express foundation before implementing business endpoints.
- **Verification:** `npm test` → 12/12 passing. App imports cleanly in test mode. Env validation correctly rejects missing JWT secrets in production mode.
- **Commit:** Pending.
- **Follow-ups:** Step 01 (Database Models & Migrations), Step 02 (Auth & RBAC endpoints).


### CHG-004 | 2026-10-28 | Created fix-errors Agent Skill and Root Documentation
- **Requested by:** User request to create an agent skill triggered by "fix errors" to probe terminals/services, consult memory, draft an approval-gated plan, fix errors without regressions, and document the workflow in README.md.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - Created `.agent/skills/fix-errors/SKILL.md` detailing the 7-step error diagnosis and repair lifecycle.
  - Updated root `README.md` with full documentation on using "fix errors", the diagnostic workflow, and links to blueprints.
  - Registered `fix-errors` in `docs/PROJECT_MEMORY.md` Skills Registry.
- **Why:** Provide automated, reliable debugging guardrails ensuring no regressions and strict user approval before code modifications.
- **Verification:** Verified skill frontmatter, verified README links, verified `make clear` runs cleanly.
- **Commit:** Pending.
- **Follow-ups:** Ready for debugging or feature development.

### CHG-003 | 2026-10-28 | Modular Implementation Blueprints for React Frontend
- **Requested by:** User request to create modular step-by-step implementation blueprints for `Research/02_FRONTEND_DESIGN_SPEC.md`.
- **Skills used:** `frontend-expert`, `uiux-designer`, `project-memory-workflow`
- **What changed:**
  - Created `Research/Frontend/` containing 12 comprehensive guides:
    - `README.md` (Design philosophy, WCAG AA standards, role matrix)
    - `00_ARCHITECTURE_ROUTING_AND_PROVIDERS.md` (Vite, TanStack Query, Axios, Router guards, Role Switcher)
    - `01_DESIGN_SYSTEM_AND_SHARED_COMPONENTS.md` (StatusBadge, ReasonDialog, DemoTag, AuditIntegrityBadge)
    - `02_AUTHENTICATION_AND_JUDGE_LOGIN.md` (Register, login, virtual OTP, Judge Quick Login toolbar)
    - `03_LANDING_AND_AI_DISCOVERY.md` (Hero natural language search, keyword fallback notice, ResourceCard popover)
    - `04_RESOURCE_DETAIL_AND_ELIGIBILITY_CHECK.md` (Catalog detail, EligibilityChecklist, locked confidential instructions)
    - `05_DYNAMIC_REQUEST_WIZARD.md` (5-step policy-driven wizard, SlotPicker, fair-use meter, conflict alternatives)
    - `06_REQUESTER_DASHBOARD_AND_BOOKINGS.md` (Action-required cards, request detail with appeals, booking countdowns)
    - `07_CHECKIN_CHECKOUT_AND_SIGNATURE_PAD.md` (Condition reporting, 5-star rating, accessories diff, SignaturePad, soft GPS)
    - `08_MANAGER_DASHBOARD_AND_REVIEW_QUEUE.md` (Review queue, ReasonDialog, strict no-self-approval lockout, returns desk)
    - `09_SERVICES_NEEDS_AND_COORDINATION.md` (Service tracking stepper, missing-resource /need form, coordinator desk, referrals)
    - `10_INCIDENTS_ADMIN_AUDIT_AND_HISTORY.md` (Incident filing/ruling, transaction receipt view, admin settings)
- **Why:** Provide comprehensive, screen-by-screen architectural blueprints derived from `02_FRONTEND_DESIGN_SPEC.md`.
- **Verification:** Verified all 12 frontend files exist, directory listing checks pass, and `make clear` runs cleanly.
- **Commit:** Pending.
- **Follow-ups:** Proceed with frontend component and routing implementation (BKL-004).

### CHG-002 | 2026-10-28 | Modular Implementation Blueprints for Node.js and Python Backends
- **Requested by:** User request to create modular step-by-step implementation blueprints in `Research/NodeBackend/` and `Research/PythonBackend/`.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - Created `Research/NodeBackend/` with 12 comprehensive guides (architecture, Knex/Postgres migrations, JWT/RBAC auth, institutions, dynamic policy schema, availability, state machine, bookings & GIST concurrency, staff-operated services & referrals, incidents & tokens, scheduled jobs & audit hash chain).
  - Created `Research/PythonBackend/` with 11 comprehensive guides (FastAPI setup, Pydantic contracts, read-only repository, need parsing, sentence-transformers vector embeddings, multi-factor re-ranking & explainable reasons, BM25 keyword fallback, incident summary drafting, Express proxy integration with 4s timeout, and pytest benchmarks).
- **Why:** Provide granular, phase-by-phase implementation blueprints derived from `01_BACKEND_API_SPEC.md` for both backend engines.
- **Verification:** Verified all 23 files exist, directory listing checks pass, links are valid, and `make clear` continues to function cleanly.
- **Commit:** Pending.
- **Follow-ups:** Proceed with database schema migration and auth implementation (BKL-001).

### CHG-001 | 2026-10-28 | Project Scaffolding, UviAge AI Service & Workflow Setup
- **Requested by:** User initial repository setup, uv environment, and orchestration requests.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - Created `.gitignore` supporting Node.js, Python, OS, and IDE configs.
  - Initialized Express backend in `backend/` with starter `index.js` on port 5000.
  - Initialized `UviAge/` Python backend using `uv`, FastAPI, Uvicorn on port 8000.
  - Created root `Makefile` automating port cleanup (`make clear`), installation (`make install`), and service launching.
  - Created developer onboarding guides in `Research/Instructions/` and root `README.md`.
  - Registered `project-memory-workflow` skill and initialized `docs/PROJECT_MEMORY.md`.
- **Why:** Establish a solid, reproducible, multi-service project foundation with automated developer experience.
- **Verification:** Verified `make install`, `make clear`, `make backend`, `make frontend`, and `make agent` startup and shutdown cycles.
- **Commit:** Pending.
- **Follow-ups:** Implement core backend API endpoints and frontend routing/screens according to specifications.

---

## 7. Mistakes and Lessons (newest first)

### MST-001 | 2026-10-28 | Make execution of PowerShell variables and Windows npm resolution
- **What went wrong:**
  1. `make clear` failed because GNU Make / sh expanded `$p` as an empty string before PowerShell received it.
  2. `make install` failed when invoking `npm` directly because MSYS2 make attempted to invoke a bash wrapper looking for WSL.
  3. `uv venv` failed on repeated runs when `.venv` already existed.
- **Root cause:**
  1. Unquoted / double-quoted variables in Makefile recipes are interpolated by make/sh.
  2. Windows uses `npm.cmd`, not `/usr/bin/npm`.
  3. Default `uv venv` fails if the target directory already contains a virtual environment.
- **Fix:**
  1. Wrapped PowerShell script blocks in single quotes so sh does not expand PowerShell expressions.
  2. Defined `NPM ?= npm.cmd` on `Windows_NT`.
  3. Used `uv venv --allow-existing`.
- **Rule going forward:** Always test Makefile commands across Windows PowerShell and MSYS2 make; use single-quoted script blocks for PowerShell and `.cmd` wrappers for Windows binaries.
- **Related:** CHG-001

---

## 8. Backlog / Future Implementation
- [x] BKL-001 done in CHG-005 (Step 00 foundation: env, db config, middleware, module stubs, smoke tests)
- [ ] BKL-006 (P0) Step 01: Database schema migrations (Knex) for all entities | Depends on: CHG-005 | Source: Research/NodeBackend/01_DATABASE_MODELS_AND_MIGRATIONS.md
- [ ] BKL-007 (P0) Step 02: Auth/JWT endpoints — register, OTP, login, refresh, logout | Depends on: BKL-006 | Source: Research/NodeBackend/02_AUTH_RBAC_AND_SECURITY.md
- [ ] BKL-002 (P0) Implement Core Resource endpoints in Express backend | Depends on: BKL-007 | Source: Research/01_BACKEND_API_SPEC.md
- [ ] BKL-003 (P0) Implement UviAge `/ai/parse-need` and `/ai/match-need` endpoints | Source: Research/01_BACKEND_API_SPEC.md
- [ ] BKL-004 (P1) Implement React frontend navigation, layout, and resource catalog pages | Source: Research/02_FRONTEND_DESIGN_SPEC.md
- [ ] BKL-005 (P1) Implement end-to-end booking reservation and approval workflow | Source: Research/01_BACKEND_API_SPEC.md
