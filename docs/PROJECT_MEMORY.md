# PROJECT MEMORY

> Shared record for all collaborators and agents. Read before every task. Update after every task. Append, never erase.

---

## 1. Project Overview
- **Name:** Institutional Resource Access and Coordination Network (Resource Manager)
- **Goal:** Unified platform enabling cross-institutional resource sharing, lab equipment bookings, and AI-driven capability matching.
- **Stack:**
  - **Frontend:** React 19 + TypeScript + Vite
  - **Backend API:** Node.js + Express 5
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
| **Backend API** | Complete (100%) | Steps 00–10 complete: modular architecture, all middleware, auth, institutions, facilities, memberships, partner linking, resources catalog, dynamic policy versioning, visibility filtering, confidential field redaction, availability computation, slot generation, blackout collision gating, availability polling, 6-check deterministic eligibility engine, access request lifecycle, central state machine transition engine, reviewer queue, FIFO waitlisting, concurrency-safe bookings & QR check-in, staff-operated service requests, missing-resource intake, candidate discovery, cross-institutional referrals, incident reporting & impartial rulings, fair-use token ledger, simulated billing/invoicing, Excel/PDF/CSV exports, 7 scheduled background cron jobs, scheduler telemetry, SHA-256 tamper-evident hash chain verification, admin controls, in-app notifications, role dashboards, and AI proxy with fallback. |
| **Frontend** | In progress | React 19 + Vite + TypeScript. Steps 00–04 complete: React Router 7, TanStack Query, Axios JWT interceptors, Role switcher, Auth/Toast contexts, Auth/Role guards, Tailwind v4 design tokens, shared components, LoginPage with sample credential hints, RegisterPage with OTP routing, VerifyOtpPage with auto-fill demo banner & 6-digit inputs, JudgeToolbar with 1-click persona switching, LandingPage with NLP search & 3-step timeline, DiscoverPage with filter sidebar & parsed keyword chips, ResourceCard with match reasons popover & eligibility preview, ResourceDetailPage with risk tag, access mode selector, tabbed switcher, EligibilityChecklist (6 checks), PolicySummaryCard, and ConfidentialInstructionsCard. Builds cleanly with 0 errors. |
| **AI Service** | Complete (100%) | Steps 00–09 complete: FastAPI architecture, BaseSettings, X-Internal-Key validation, Pydantic V2 contracts, ReadOnlyRepository with psycopg v3 and fixtures, NeedParser (/ai/parse-need), VectorIndexer (all-MiniLM-L6-v2), BM25Okapi deterministic fallback matcher (/ai/match-need), index rebuild (/ai/reindex) with ISO timestamps, objective incident summary drafting (/ai/incident-summary), Express circuit breaker & anti-hallucination sanitization, resource update webhooks, latency benchmarks, and concurrency stress testing. 55 pytest tests passing. |
| **Database** | Migrations ready | 7 Knex migration files (001–007) cover all spec entities; BaseRepository done; seed ready. Run `npm run migrate:latest`. |
| **Orchestration** | Working | Root Makefile with `make install`, `make backend`, `make frontend`, `make agent`, `make clear` |
| **Tests** | In progress | 335 tests passing (280 backend tests across 19 test suites + 55 UviAge AI service tests); 100% green |

**How to run:**
- Install: `make install`
- Services: `make agent` (port 8000), `make backend` (port 5000), `make frontend` (port 5173) in separate terminals
- Cleanup: `make clear`
- Dev backend with hot-reload: `cd backend && npm run dev`

**How to verify:**
- Backend tests: `npm.cmd test --prefix backend` → 133 tests pass across 8 suites
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
- [x] DEC-002: Choose vector embedding model for AI matching → **sentence-transformers/all-MiniLM-L6-v2 with pure-Python BM25Okapi zero-token fallback** (implemented in `UviAge/matching/`).

---

## 5. Skills Registry
| Skill | Path | Purpose | Added in |
|---|---|---|---|
| `project-memory-workflow` | `.agent/skills/project-memory-workflow/SKILL.md` | Task workflow, memory, verification, commit rules | CHG-001 |
| `fix-errors` | `.agent/skills/fix-errors/SKILL.md` | Automated diagnosis, multi-service terminal probing, approval-gated repair, zero-regression verification | CHG-004 |

---

## 6. Change Log (newest first)

### CHG-024 | 2026-10-29 | React Frontend Step 04 — Resource Detail View & Real-Time Eligibility Verification
- **Requested by:** User (BKL-004).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `frontend/src/api/resources.api.ts` — Created API client and interfaces for `getResourceById` and `checkEligibility` (`POST /api/v1/resources/:id/eligibility-check`).
  - `frontend/src/components/feedback/EligibilityChecklist.tsx` — Built 6-point deterministic status checklist (`membership_verified`, `user_group_allowed`, `training`, `documents`, `fair_use`, `slot_free`) with status badges and contextual action buttons.
  - `frontend/src/components/resources/PolicySummaryCard.tsx` — Human-readable policy breakdown (fair-use limits, advance notice, cancellation threshold, authorized user cohorts, prohibited activities).
  - `frontend/src/components/resources/ConfidentialInstructionsCard.tsx` — Locked confidential credentials card showing security lockout for non-booked users and full credentials upon confirmed booking.
  - `frontend/src/features/resources/ResourceDetailPage.tsx` — Equipment header with risk level tag, access mode selector with disabled styling for unsupported modes, tabbed switcher (`overview`, `specs`, `policy`, `availability`, `confidential`), live eligibility check, and sticky bottom action bar.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Frontend Step 04 **DONE** (5/11 complete, ~45%).
- **Why:** Enable researchers to inspect lab instrument specifications, select compliant access modes, verify live eligibility criteria deterministically, and view human-readable policy rules before initiating access requests per Spec §5.3.
- **Verification:** Ran `cd frontend; npm.cmd run build` → `tsc -b && vite build` built in 502ms with **0 errors**; ran `cd backend; npm.cmd test` → **280/280 passed** across 19 suites; ran `cd UviAge; py -m uv run pytest` → **55/55 passed** across 7 suites.
- **Commit:** pending
- **Follow-ups:** Proceed to Step 05: Dynamic Request Wizard (`Research/Frontend/05_DYNAMIC_REQUEST_WIZARD.md`).


### CHG-023 | 2026-10-29 | React Frontend Step 03 — Landing Page, AI Discovery, Filter Sidebar & Resource Cards
- **Requested by:** User (BKL-004).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `frontend/src/api/discovery.api.ts` — Created API client and interfaces for `searchResources`, `matchNeedWithAi`, `parseNeed`, and `ResourceMatch`.
  - `frontend/src/components/discovery/ResourceCard.tsx` — Built comprehensive equipment card with match label badge (`AVAILABLE_LISTING`, `POTENTIAL_MATCH`, `INACTIVE`), "Why this match?" reasoning modal dialog, token cost badge, and eligibility preview.
  - `frontend/src/features/discovery/DiscoverPage.tsx` — Built multi-criteria search results page with filter sidebar (discipline, access mode, max tokens, eligibility toggle), parsed requirements chips with deletion, `KEYWORD_FALLBACK` alert banner, and empty-match guidance card linking to missing-resource submission.
  - `frontend/src/features/discovery/LandingPage.tsx` — Implemented Hero headline, natural language need search bar with auto-routing to `/discover?q=...&ai=true`, quick category chips, "How The Network Works" 3-step deterministic lifecycle, and connected partner institutions banner.
  - `frontend/src/app/router.tsx` — Mounted `/discover` route.
  - `frontend/src/components/layout/Navbar.tsx` — Added direct navigation link to `/discover` (AI Discovery).
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Frontend Step 03 **DONE** (4/11 complete, ~36%).
- **Why:** Enable researchers to describe complex lab needs in natural language, explore matching equipment envelopes across partner institutions, and verify eligibility per Spec §5.1 & §5.2.
- **Verification:** Ran `cd frontend; npm.cmd run build` → `tsc -b && vite build` built in 364ms with **0 errors**; ran `cd backend; npm.cmd test` → **280/280 passed** across 19 suites; ran `cd UviAge; py -m uv run pytest` → **55/55 passed** across 7 suites.
- **Commit:** 5a1b84f
- **Follow-ups:** Proceed to Step 04: Resource Detail & Eligibility Check (`Research/Frontend/04_RESOURCE_DETAIL_AND_ELIGIBILITY_CHECK.md`).

### CHG-022 | 2026-10-29 | React Frontend Step 02 — Authentication, Virtual OTP Verification & Judge Quick Login
- **Requested by:** User (BKL-004).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `frontend/src/api/auth.api.ts` — Added `RegisterResponseData` interface and `verifyOtp` API client method (`POST /api/v1/auth/verify-otp`).
  - `frontend/src/context/AuthContext.tsx` — Added `verifyOtp(email, otp)` with automatic session persistence, role update, and offline demo fallback; updated `register(...)` signature to return `{ message, demoOtp }`.
  - `frontend/src/features/auth/VerifyOtpPage.tsx` — Created 6-digit verification screen with auto-focus advancing, backspace navigation, paste handling, and demo transparency banner with 1-click `123456` auto-fill.
  - `frontend/src/features/auth/RegisterPage.tsx` — Updated registration flow with institution affiliation and automatic redirection to `/verify-otp?email=...&demoOtp=...`.
  - `frontend/src/features/auth/LoginPage.tsx` — Added fast credential fill buttons alongside 1-click persona quick logins, maintaining deep-link preservation (`?next=...`).
  - `frontend/src/app/router.tsx` — Mounted `/verify-otp` as a public route.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Frontend Step 02 **DONE** (3/11 complete, ~27%).
- **Why:** Provide full authentication lifecycle, evaluator transparency, and instant test-persona switching per Spec §5.16, §16, and Frontend Step 02.
- **Verification:** Ran `cd frontend; npm.cmd run build` → `tsc -b && vite build` built in 397ms with **0 errors**; ran `cd backend; npm.cmd test` → **280/280 passed** across 19 suites; ran `cd UviAge; py -m uv run pytest` → **55/55 passed** across 7 suites.
- **Commit:** 7792898
- **Follow-ups:** Proceed to Step 03: Landing & AI Discovery (`Research/Frontend/03_LANDING_AND_AI_DISCOVERY.md`).

### CHG-021 | 2026-10-29 | Python Backend Steps 08 & 09 — Circuit Breaker, Anti-Hallucination Sanitizer, Reindex Webhook & Benchmarks
- **Requested by:** User — "do step 8 and 9 of python backend"
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/services/aiClient.js` — Enforced 4,000ms strict request timeout threshold via `AbortSignal.timeout(options.timeoutMs || 4_000)` per Spec §6.4.
  - `backend/src/modules/aiProxy/aiProxy.service.js` — Implemented resilient `CircuitBreaker` class (`CLOSED`, `OPEN`, `HALF_OPEN`) with 3-failure threshold, fast-failing directly to keyword fallback during outages.
  - `backend/src/modules/aiProxy/aiProxy.service.js` — Added visibility boundary computation (`visibleResourceIds`), anti-hallucination sanitization stripping any returned IDs outside visible scope, missing-resource `emptyMatchGuidance`, and `AI_UNAVAILABLE_FALLBACK` audit trail.
  - `backend/src/modules/resources/resources.service.js` — Wired asynchronous fire-and-forget `/ai/reindex` notifications on resource creation, update, and deactivation.
  - `backend/tests/aiProxyCircuitBreaker.test.js` — Added 6 integration tests for circuit breaker state transitions, fast-fail, anti-hallucination stripping, and audit logging.
  - `UviAge/main.py` — Added `indexed_count` to `/ai/health`, added ISO `timestamp` to `POST /ai/reindex`.
  - `UviAge/tests/test_benchmarks.py` — Added 6 performance tests for latency (< 50ms health, < 100ms parse, < 1s match), 5 concurrent async queries, strict visibility isolation, and reindex freshness.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Python AI Service 10/10 **DONE (100%)**.
- **Why:** Complete the AI subsystem per Spec §4.24, §6.3, and §6.4, ensuring non-blocking resiliency, fast degradation to deterministic search, and zero hallucinations.
- **Verification:** Ran `cd UviAge; py -m uv run pytest -v` → **55/55 passed** across 7 test suites; ran `cd backend; npm.cmd test` → **280/280 passed** across 19 test suites; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** 3091fab
- **Follow-ups:** Proceed to Frontend Step 02: Authentication & Judge Login (`Research/Frontend/02_AUTHENTICATION_AND_JUDGE_LOGIN.md`).

### CHG-020 | 2026-10-29 | React Frontend Steps 00 & 01 — Architecture, Routing, Providers, Design Tokens & Shared Components
- **Requested by:** User (BKL-004).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `frontend/package.json` & `frontend/vite.config.ts`: Installed `@tailwindcss/vite` and Tailwind v4 alongside `lucide-react`, `clsx`, `tailwind-merge`, `@tanstack/react-query`, `axios`, `react-router-dom`.
  - `frontend/src/index.css`: Injected `@import "tailwindcss"` and semantic color design tokens (`--status-approved`, `--status-pending`, `--status-rejected`, `--status-in-use`, `--status-closed`, etc.).
  - `frontend/src/api/client.ts`: Axios instance (`/api/v1`) with automatic Bearer token injection and 401 token refresh rotation queue.
  - `frontend/src/api/auth.api.ts`: API endpoints for `login`, `register`, `getMe`, `logout`, and standard `ApiResponse` types.
  - `frontend/src/app/queryClient.ts`: TanStack QueryClient configured with 30s stale time and 1 retry.
  - `frontend/src/context/ToastContext.tsx`: Accessible toast notification queue (`success`, `error`, `info`, `warning`).
  - `frontend/src/context/RoleContext.tsx`: Evaluator acting role switcher (`REQUESTER`, `MANAGER`, `COORDINATOR`, `ADMIN`, `COMMUNITY_PARTNER`).
  - `frontend/src/context/AuthContext.tsx`: Session manager with token persistence and 1-click persona logins (`DEMO_USERS`).
  - `frontend/src/app/guards/AuthGuard.tsx` & `RoleGuard.tsx`: Route guards with accessible "Access Restricted" fallback screen.
  - `frontend/src/components/feedback/`: Built `StatusBadge.tsx` (15 states with icon + text), `ReasonDialog.tsx` (reviewer rationale modal), `DemoTag.tsx`, `AiSuggestionBadge.tsx`, and `AuditIntegrityBadge.tsx`.
  - `frontend/src/components/layout/`: Built `DemoBanner.tsx`, `Navbar.tsx`, `RoleSwitcher.tsx`, `JudgeToolbar.tsx`, and `AppLayout.tsx`.
  - `frontend/src/app/router.tsx`: Configured React Router hierarchy covering public, requester, manager, coordinator, admin, and 404 routes.
  - `frontend/src/App.tsx`: Wired QueryClient, Toast, Role, and Auth providers around `RouterProvider`.
  - Pruned unused imports and converted type imports to `import type` across all frontend components for strict `verbatimModuleSyntax` and `noUnusedLocals` compliance.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Steps 00 & 01 **DONE** (2/11 steps complete, ~18%).
- **Why:** Establish foundational frontend application architecture, state providers, design system tokens, and shared UI component primitives per Spec §2, §3, and §12.
- **Verification:** Ran `cd frontend; npm.cmd run build` → `tsc -b && vite build` built in 2.53s with **0 errors**; ran `cd backend; npm.cmd test` → **272/272 tests passing across 18 test suites**; ran `cd UviAge; py -m uv run pytest` → **49/49 tests passing**.
- **Commit:** 7a93012
- **Follow-ups:** Proceed to Step 02: Authentication & Judge Login (`Research/Frontend/02_AUTHENTICATION_AND_JUDGE_LOGIN.md`).

### CHG-019 | 2026-10-29 | UviAge Step 07 — Objective Incident Summary Drafting (/ai/incident-summary)
- **Requested by:** User — "now do this file" (BKL-016).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `UviAge/incidents/summarizer.py` — Implemented `IncidentSummarizer` and `draft_incident_summary()` extracting:
    - `factsFromRecords`: Booking details, before/after condition reports, accessory condition diffs (e.g. PEI sheet EXCELLENT → SCRATCHED), and geofence verification status.
    - `unverifiedClaims`: Reporter description and attributed party statements without accusatory framing.
    - `missingInfo`: Evidential gaps (missing post-use condition reports, absent photos, pending statements).
    - `sources`: Explicit list of referenced record, report, and photo IDs.
    - `summary`: Neutral narrative strictly free of forbidden fault/liability terms (`guilty`, `liable`, `at fault`, `negligent`, `careless`, `breach`).
    - `disclaimer`: "Draft summary for coordinator review. Does not assign fault or liability."
  - `UviAge/schemas.py` — Enhanced `IncidentSummaryRequest` with validator supporting both `incidentId` query and inline `{ incident, notes }` payloads from Express.
  - `UviAge/main.py` — Mounted `POST /ai/incident-summary` on `ai_router` protected by `verify_internal_key`.
  - `UviAge/tests/test_incidents.py` — 7 tests covering facts extraction, claims attribution, neutral language enforcement, gap detection, and HTTP 200, 403, 404, 422 status codes.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Step 07 **DONE** (8/10 steps complete, 49 pytest tests passing).
- **Why:** Provide objective, non-accusatory incident dossier synthesis for impartial facility manager and coordinator review per Spec §4.16, §6.2, and §6.5.
- **Verification:** Ran `cd UviAge; py -m uv run pytest` → **49/49 tests passing** (100% green); ran `cd backend; npm.cmd test` → **272/272 tests passing across 18 test suites**; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `ce9aecf`
- **Follow-ups:** Proceed to Frontend Step 00/01 or Python AI service Step 08/09.

### CHG-018 | 2026-10-29 | UviAge Steps 04, 05 & 06 — Vector Indexing, Semantic Matching, Re-ranking & BM25 Fallback
- **Requested by:** User — "yes" (BKL-003).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `UviAge/matching/embedder.py` — Implemented `build_searchable_document()` combining resource attributes and `VectorIndexer` utilizing `all-MiniLM-L6-v2` with normalized cosine similarity search and lazy loading.
  - `UviAge/matching/fallback.py` — Implemented domain synonym dictionary (covering 3D printing, laser, CNC, microscopy, spectroscopy, electronics) and pure-Python zero-dependency `BM25Okapi` deterministic fallback searcher with score normalization.
  - `UviAge/matching/rerank.py` — Implemented strict caller-authorized `visibleResourceIds` security filtering (Spec §6.2), non-hallucinated reason and caveat generation, `MatchType` classification, and multi-factor re-ranking.
  - `UviAge/repository.py` — Exported module-level helpers `get_resources_by_ids()`, `get_all_active_resources()`, and `get_incident_context()`.
  - `UviAge/main.py` — Mounted `POST /ai/match-need` with visibility boundaries and fallback, `POST /ai/reindex` endpoint, and eager startup index population.
  - `UviAge/tests/test_matching.py` — 12 unit and integration tests verifying vector document builder, domain synonym expansion, strict visibility filtering, reason/caveat generation, `MatchType`, `POST /ai/match-need`, and `POST /ai/reindex`.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Updated AI service to 7/10 steps complete (~70%, 42 pytest tests).
- **Why:** Provide neural semantic capability matching with resilient zero-token deterministic fallback and explainable reasons per Spec §4.24, §6.2, and §6.3.
- **Verification:** Ran `cd UviAge; py -m uv run pytest` → **42/42 tests passing** (100% green); ran `cd backend; npm.cmd test` → **272/272 tests passing across 18 test suites**; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `45201ce`
- **Follow-ups:** Step 07 (Incident Summary Drafting) or Frontend Step 00/01.

### CHG-017 | 2026-10-29 | UviAge Step 03 — Natural Language Need Parser (`/ai/parse-need`)
- **Requested by:** User — "@03_NATURAL_LANGUAGE_NEED_PARSER.md start this" (BKL-003).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `UviAge/parsing/need_parser.py` — Implemented `NeedParser` and `parse_need_text()`:
    - Laboratory taxonomy matching covering 9 key domains (`3D Printing`, `Laser Cutting`, `Microscopy`, `CNC Machining`, `Spectroscopy`, `Thermal Analysis`, `Electronics`, `Materials Testing`, `Meeting Space`).
    - Dimensional and technical unit regex extractors (`layerHeight`, `wavelength`, `power`, `force`, `voltage`, `frequency`, `temperature`, `thickness`).
    - Capability tag mapping (`biocompatible`, `high-resolution`, `SEM`, `TEM`, `FDM`, `SLA`, `CO2_LASER`, `5-axis`, `cleanroom`, etc.).
    - Access mode preference detection (`IN_PERSON`, `STAFF_OPERATED`, `SEND_SAMPLE`) and `staffServiceOk` boolean flag.
    - Duration hours, budget, and geographic location extractors.
    - Robust fallback for unrecognized queries returning `General Laboratory` with baseline 0.50 confidence.
  - `UviAge/main.py` — Mounted `POST /ai/parse-need` on `ai_router` protected by `X-Internal-Key` dependency.
  - `UviAge/tests/test_parser.py` — 11 comprehensive tests verifying multi-need prompt extraction, unit regex parsing, access modes, duration/budget, fallbacks, and HTTP status codes (200, 403, 422).
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Step 03 **DONE** (32 pytest tests passing).
- **Why:** Enable researchers to express equipment requirements in natural language and receive structured requirements for candidate discovery per Spec §4.24 and §6.1.
- **Verification:** Ran `cd UviAge; py -m uv run pytest` → **32/32 tests passing** (100% green); ran `cd backend; npm.cmd test` → **272/272 tests passing across 18 test suites**; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `336118c`
- **Follow-ups:** Proceed to Step 04 (Vector Embedding & Indexing) / Step 05 (Re-ranking) or Frontend Step 00/01.

### CHG-016 | 2026-10-29 | Step 10 — Scheduled Background Jobs, Audit Hash Chain, Admin Control, Notifications, Dashboards, AI Proxy & Health Probes
- **Requested by:** User — "yes" (BKL-015).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/package.json` — Added `node-cron` (^3.0.3).
  - `backend/src/jobs/` — Implemented 7 scheduled background jobs:
    - `bookingReminders.js` — Idempotently sends reminders 24h and 1h prior to `startAt`, and 30m prior to `endAt`.
    - `overdueCheck.js` — Automatically transitions active bookings past return grace period (`BOOKING.LATE_RETURN_GRACE` = 15m) to `OVERDUE` via `transition()` and dispatches alerts.
    - `noShowCheck.js` — Flags scheduled bookings past start grace period (`BOOKING.NO_SHOW_GRACE_MIN` = 15m) without check-in for manager action.
    - `docAndTrainingExpiry.js` — Scans approved compliance documents and verified trainings, transitioning expired records to `EXPIRED` with audit events and user alerts.
    - `waitlistExpiry.js` — Hourly job expiring unaccepted 24h waitlist offers (`EXPIRED`), promoting next FIFO candidate to `OFFERED` with fresh 24h window and notification.
    - `referralTimeout.js` — Daily job transitioning stagnant referrals beyond 7 days (`REFERRAL.NO_RESPONSE_DAYS`) to `NO_RESPONSE` and alerting originating coordinator.
    - `auditIntegrityCheck.js` — Daily cryptographic validation of SHA-256 hash chains across audit events, storing status for admin health dashboard.
  - `backend/src/services/scheduler.js` — Job runner manager handling cron schedules, on-demand execution (`runJob(name)`), execution telemetry recording, and graceful start/stop lifecycle.
  - `backend/src/modules/audit/` — Schemas, service, controller, and router:
    - `GET /api/v1/audit/requests/:id` — Entity timeline with role-gated visibility (requesters restricted to `PARTIES`; staff access `INTERNAL`).
    - `GET /api/v1/audit/resources/:id` — Resource lifecycle and policy change history for staff/managers.
    - `GET /api/v1/audit/institution/:id` — Filterable institutional audit trail for admins.
    - `GET /api/v1/audit/verify/:scope/:id` — Recomputes SHA-256 hash chain and returns `{ valid: true }` or first broken event ID.
    - `POST /api/v1/audit/notes` — Appends immutable `AUDIT_NOTE_ADDED` event referencing prior event ID without mutating original records.
  - `backend/src/modules/notifications/` — Schemas, service, controller, and router:
    - `GET /api/v1/notifications` — In-app alerts listing with `?unread=true` filter and unread count badge.
    - `POST /api/v1/notifications/:id/read` — Mark notification read.
    - `POST /api/v1/notifications/read-all` — Mark all user notifications read.
  - `backend/src/modules/admin/` — Schemas, service, controller, and router:
    - `GET /api/v1/admin/jobs` — Registry of background cron jobs, schedules, and run telemetry.
    - `POST /api/v1/admin/jobs/:jobName/run` — On-demand job trigger.
    - `GET /api/v1/admin/users` — Cross-institutional user directory search.
    - `POST /api/v1/admin/users/:id/suspend` — Account suspension with mandatory reason and immutable audit event.
    - `POST /api/v1/admin/seed-demo` — Idempotent demo dataset seeder.
  - `backend/src/modules/dashboards/` — Service, controller, and router:
    - `GET /api/v1/dashboard/requester` — Next booking, pending request counts, token balance, unread alerts.
    - `GET /api/v1/dashboard/manager` — Queue counts, today's schedule, overdue equipment counts.
    - `GET /api/v1/dashboard/coordinator` — Open need-requests and referral counts by status.
    - `GET /api/v1/dashboard/admin` — Member/facility/resource counts, total incidents, audit integrity status.
    - `GET /api/v1/analytics/utilisation` — Hours utilised vs booked.
    - `GET /api/v1/analytics/demand` — Active waitlist lengths and unfulfilled request demand.
  - `backend/src/modules/aiProxy/` — Service, controller, and router:
    - `POST /api/v1/ai/match-need` — Natural language need matching with 4s timeout and deterministic keyword fallback.
    - `POST /api/v1/ai/parse-need` — Free text requirement parsing into structured fields.
    - `POST /api/v1/ai/incident-summary` — Neutral factual incident timeline summarization.
    - `POST /api/v1/ai/policy-summary` — Plain-language access policy summarization.
  - `backend/src/app.js` — Mounted `/notifications`, `/audit`, `/admin`, `/dashboard`, `/analytics`, and `/ai`. Enhanced `/health` with live DB, AI service, and scheduler telemetry.
  - `backend/src/server.js` — Wired `startScheduler()` on server startup and `stopScheduler()` on graceful shutdown.
  - `backend/tests/auditChain.test.js` & `backend/tests/jobsAndHealth.test.js` — 31 tests covering all Step 10 capabilities.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Step 10 **DONE**, completing the Node.js Express backend (100%).
- **Why:** Provide scheduled background maintenance, tamper-evident audit logging, administrative controls, in-app alerts, role dashboards, and resilient AI proxying per Spec §4.19, §4.20, §4.21, §4.23, §4.24, and §5.3.
- **Verification:** Ran `cd backend; npm.cmd test` → **272/272 tests passing across 18 test suites** (100% green); ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `217bc2b`
- **Follow-ups:** Proceed to React Frontend Step 00/01 or Python AI service Step 03.

### CHG-015 | 2026-10-29 | Step 09 — Incidents, Tokens, Invoicing & Document Exports
- **Requested by:** User — "continue" (BKL-014).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/services/tokenService.js` — Implemented append-only credit ledger service: `balance(userId)` (computing total balance, active holds, available credits, and monthly allowance), `hold(userId, amount, refType, refId, reason)` with balance gating, `charge(userId, amount, refType, refId, reason)`, `refund(userId, amount, refType, refId, reason)`, `grant(userId, amount, adminId, reason)`, and paginated `getLedger`.
  - `backend/src/services/transition.js` — Updated `isResumingReview` exemption logic to permit right-of-reply response transitions (`INFO_REQUESTED → UNDER_REVIEW`) without triggering self-approval lockout on parties.
  - `backend/src/modules/incidents/` — Implemented schemas, repository, service, controller, and router:
    - Incident filing (`POST /api/v1/incidents`) with severity, type, and auto-created initial shared note.
    - Caller incident history (`GET /api/v1/incidents/mine`).
    - Detail view (`GET /api/v1/incidents/:id`) with automatic redaction of `INTERNAL` staff notes from requesters.
    - Facility incident queue (`GET /api/v1/facilities/:id/incidents`).
    - Append-only notes timeline (`POST /api/v1/incidents/:id/notes`) enforcing `SHARED` visibility for non-staff authors.
    - Info requests (`POST /api/v1/incidents/:id/request-info`) advancing `REPORTED → UNDER_REVIEW → INFO_REQUESTED`.
    - Right-of-reply evidence statement (`POST /api/v1/incidents/:id/respond`) returning status to `UNDER_REVIEW`.
    - Impartial ruling (`POST /api/v1/incidents/:id/resolve`) enforcing strict `assertNoSelfApproval` against both reporter and parties to the booking/service, recording findings and recommended remedy (`RESOLVED` or `DISMISSED`).
    - Single-level escalation appeal (`POST /api/v1/incidents/:id/appeal`) incrementing `appeal_count` (capped at 1) and returning incident to `UNDER_REVIEW` for secondary review.
    - AI-assisted factual summary drafting (`POST /api/v1/incidents/:id/draft-summary`) calling `aiClient` with graceful deterministic fallback.
  - `backend/src/modules/tokens/` — Implemented schemas, controller, and routers:
    - User balance breakdown (`GET /api/v1/tokens/balance`).
    - User ledger history (`GET /api/v1/tokens/ledger`).
    - Admin grant (`POST /api/v1/admin/tokens/grant`) gated to platform administrators.
  - `backend/src/modules/payments/` — Implemented schemas, service, controller, and routers:
    - Cost estimate breakdown (`GET /api/v1/bookings/:id/cost-estimate`) based on resource policy hourly rates and operator fees, with `"demo": true`.
    - Demo invoice generation (`POST /api/v1/bookings/:id/invoice`) with itemized line items and `"demo": true`.
    - Simulated invoice settlement (`POST /api/v1/invoices/:id/mark-paid`) returning `"demo": true` and sandbox notice: *"Simulated payment in sandbox. No money moved."*.
  - `backend/src/modules/exports/` — Implemented schemas, service, controller, and router:
    - Facility bookings report spreadsheet (`GET /api/v1/exports/bookings.xlsx`) generating binary `.xlsx` stream via `exceljs`.
    - Institutional equipment utilization report (`GET /api/v1/exports/usage-report.xlsx`) via `exceljs`.
    - Tamper-evident SHA-256 audit log stream (`GET /api/v1/exports/audit.csv`) in CSV format.
    - Formal one-page incident dossier (`GET /api/v1/exports/incident-report/:id.pdf`) generating `.pdf` stream via `pdfkit`.
    - Official transaction history receipt (`GET /api/v1/exports/transaction/:requestId.pdf`) generating `.pdf` stream via `pdfkit`.
    - Every export operation appends an audit event (`EXPORT_GENERATED`).
  - `backend/src/modules/facilities/facilities.router.js` & `backend/src/app.js` — Mounted incident facility queue and top-level routers for `/incidents`, `/tokens`, `/admin/tokens`, `/payments`, and `/exports`.
  - `backend/package.json` — Added `exceljs` (^4.4.0) and `pdfkit` (^0.17.2).
  - `backend/tests/incidents.test.js` — 11 test blocks covering incident filing, note visibility gating, info requests, right of reply, impartial rulings, self-approval lockouts, single appeal limits, and AI summary drafting.
  - `backend/tests/tokensAndExports.test.js` — 10 test blocks covering token balances, ledger, admin grants, cost estimates, demo invoices, simulated payment, and XLSX/CSV/PDF binary stream exports.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Step 09 **DONE** (241 backend tests passing across 16 suites).
- **Why:** Provide complete incident investigation, impartial dispute rulings, fair-use token ledger, simulated billing/invoicing, and production-grade spreadsheet and PDF export capabilities per Spec §4.16, §4.17, §4.18, and §4.22.
- **Verification:** Ran `cd backend; npm.cmd test` → **241/241 tests passing across 16 test suites**; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `8ce6ef1`
- **Follow-ups:** Step 10: Background Jobs and Audit Hash Chain (`Research/NodeBackend/10_BACKGROUND_JOBS_AND_AUDIT_HASH_CHAIN.md`).

### CHG-014 | 2026-10-29 | Step 08 — Staff-Operated Services, Missing-Resource Needs & Referrals
- **Requested by:** User — "@08_SERVICE_REQUESTS_AND_REFERRALS.md start with this process" (BKL-013).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/services/transition.js` — Enhanced `SERVICE_REQUEST_TRANSITIONS` with `NOT_FEASIBLE`, registered `NeedRequest` in `TABLE_MAP` with `NEED_REQUEST_TRANSITIONS`, and wired SHA-256 audit chaining for service and need events.
  - `backend/src/modules/serviceRequests/` — Implemented schemas, repository, service, controller, and router:
    - Service request creation (`POST /api/v1/service-requests`) validating `STAFF_SERVICE` policy mode.
    - User service requests listing (`GET /api/v1/service-requests/mine`).
    - Detail view with joined parties and active itemized quote (`GET /api/v1/service-requests/:id`).
    - Scope review (`POST /api/v1/service-requests/:id/scope-review`) marking feasible/infeasible with strict `assertNoSelfApproval`.
    - Itemized quote issuance (`POST /api/v1/service-requests/:id/quote`) with line items, total calculation, and `"demo": true`.
    - Requester quote response (`POST /api/v1/service-requests/:id/quote/respond`) with `ACCEPT` (advancing to `AWAITING_MATERIALS` or `SERVICE_IN_PROGRESS`) and `DECLINE` (closing request).
    - Physical sample intake receipt recording (`POST /api/v1/service-requests/:id/materials-received`).
    - Progress milestones (`POST /api/v1/service-requests/:id/progress`) for `STARTED` and `IN_ANALYSIS`.
    - Deliverables upload (`POST /api/v1/service-requests/:id/deliver-output`) advancing to `OUTPUT_DELIVERED`.
    - Completion sign-off or dispute triggering (`POST /api/v1/service-requests/:id/confirm-completion`).
    - Manager rejection with mandatory reason (`POST /api/v1/service-requests/:id/decision`).
    - Cancellation handling (`POST /api/v1/service-requests/:id/cancel`).
  - `backend/src/modules/needRequests/` — Implemented schemas, repository, service, controller, and router:
    - Missing-resource need intake (`POST /api/v1/need-requests`) with capabilities, timeframe, and contact sharing consent.
    - Requester need listing (`GET /api/v1/need-requests/mine`).
    - Coordinator network queue (`GET /api/v1/need-requests`).
    - Candidate discovery (`GET /api/v1/need-requests/:id/candidates`) calling `aiClient` with graceful deterministic keyword/category fallback.
    - Need request closure (`POST /api/v1/need-requests/:id/close`) with outcome (`CLOSED_MET` / `CLOSED_UNMET`).
  - `backend/src/modules/referrals/` — Implemented schemas, repository, service, controller, and router:
    - Referral dispatch (`POST /api/v1/need-requests/:id/referrals`) linking target institution and resource.
    - Receiving institution inbox (`GET /api/v1/referrals/inbox`) with requester contact withheld (`[WITHHELD - Contact not released]`) by default.
    - Detail view (`GET /api/v1/referrals/:id`) with privacy sanitization.
    - Referral response (`POST /api/v1/referrals/:id/respond`) strictly gated to receiving institution members and protected by `assertNoSelfApproval`.
    - Contact release (`POST /api/v1/referrals/:id/release-contact`) releasing contact info only when requester gave consent and referral is `ACCEPTED`.
  - `backend/src/modules/facilities/facilities.router.js` & `backend/src/app.js` — Mounted service request queue under `facilities/:id/service-requests` and top-level routers for `/service-requests`, `/need-requests`, and `/referrals`.
  - `backend/tests/serviceRequests.test.js` — 14 test blocks covering service request creation, policy access gating, scope review, quote lifecycle, sample intake, progress, deliverables, and completion/disputes.
  - `backend/tests/referrals.test.js` — 15 test blocks covering need intake, candidate discovery with fallback, referral dispatch, contact withholding, receiving institution response gating, self-approval prevention, and consent-gated contact release.
  - `backend/src/modules/serviceRequests/README.md`, `needRequests/README.md`, `referrals/README.md` — Updated module inventories.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Updated Step 08 to **DONE** (217 backend tests passing across 14 suites).
- **Why:** Provide full staff-operated service lifecycle, missing-resource intake, AI/keyword candidate matching, and privacy-preserving cross-institutional referrals per Spec §4.13 and §4.14.
- **Verification:** Ran `cd backend; npm.cmd test` → **217/217 tests passing across 14 test suites**; ran `cd frontend; npm.cmd run build` → **0 errors**.
- **Commit:** `7099e6c`
- **Follow-ups:** Step 09: Incidents, Tokens, Payments & PDF/Excel Exports (`Research/NodeBackend/09_INCIDENTS_TOKENS_PAYMENTS_EXPORTS.md`).

### CHG-013 | 2026-10-29 | Step 07 — Bookings, Concurrency, Check-In & Physical Returns
- **Requested by:** User — "@07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md start this" (BKL-012).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/utils/geo.js` — Great-circle Haversine distance calculator (`calculateHaversineDistance`) and soft geofence evaluator (`evaluateGeofence` returning `'WITHIN'`, `'OUTSIDE'`, or `'NOT_PROVIDED'`).
  - `backend/src/services/bookingEngine.js` — Implemented `reserveSlot` with PostgreSQL GiST exclusion constraint (`no_overlapping_bookings`) error code `23P01` catching and mapping to `409 BOOKING_CONFLICT`.
  - `backend/src/modules/bookings/` — Implemented schemas, repository, service, controller, and router:
    - User bookings listing (`GET /api/v1/bookings/mine`)
    - Detailed booking view with dynamic digital QR check-in payload (`GET /api/v1/bookings/:id`)
    - Facility calendar feed within `[from, to]` (`GET /api/v1/facilities/:id/bookings`)
    - Rescheduling (`POST /api/v1/bookings/:id/reschedule`) with overlap collision check
    - Duration extension (`POST /api/v1/bookings/:id/extend`) with adjacent collision prevention
    - Cancellation (`POST /api/v1/bookings/:id/cancel`) with FIFO waitlist candidate notification (`WAITLIST_SLOT_AVAILABLE`)
    - No-show strike tracking (`POST /api/v1/bookings/:id/mark-no-show`) after grace period window
    - RFC 5545 iCalendar `.ics` export stream (`GET /api/v1/bookings/:id/calendar.ics`)
  - `backend/src/modules/checkin/` — Implemented schemas, repository, service, controller, and router:
    - Check-in window gating `[startAt - 15min, startAt + graceMinutes]`
    - Soft Haversine geofence calculation
    - Cryptographic virtual signatures with SHA-256 hash chaining (`demo: true`)
    - Physical condition reporting (`BEFORE` and `AFTER` in `condition_reports`)
    - Start-use transition (`POST /api/v1/bookings/:id/start-use` advancing `CHECKED_IN → IN_USE`)
    - Check-out with automated condition diff computation (detecting rating drops >= 2 and missing accessories)
    - Manager return confirmation (`POST /api/v1/bookings/:id/confirm-return` confirming return `RETURNED → CLOSED` or pre-filling incident draft with `requiresInspection: true`)
    - Side-by-side condition report viewing (`GET /api/v1/bookings/:id/condition-reports`)
  - `backend/src/modules/facilities/facilities.router.js` & `backend/src/app.js` — Mounted booking routes and facility calendar feeds.
  - `backend/tests/bookings.test.js` — 9 unit and integration test blocks covering full booking lifecycle.
  - `backend/tests/checkin.test.js` — 8 unit and integration test blocks covering check-in, geofencing, signatures, diffing, and return confirmation.
  - `backend/tests/concurrency/booking.test.js` — 10-client parallel concurrency test verifying exactly 1 reservation succeeds and 9 fail with 409 `BOOKING_CONFLICT`.
  - `backend/src/modules/bookings/README.md` & `backend/src/modules/checkin/README.md` — Updated with complete module documentation.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Marked Step 07 complete (188 backend tests passing).
- **Why:** Provide full concurrency-safe booking lifecycle, physical check-in/out, soft geofencing, virtual electronic signatures, condition diffing, and iCal exports per Spec §4.11 and §4.12.
- **Verification:** Ran `npm test` → **188/188 tests passing across 12 test suites**; ran `uv run pytest` in UviAge → **23/23 tests passing**; ran `npm run build` in frontend → **0 errors**.
- **Commit:** `0a1de78`.
- **Follow-ups:** Step 08: Service Requests, Referrals, Incidents & Dispute Resolution (`Research/NodeBackend/08_SERVICES_INCIDENTS_AND_DISPUTES.md`).

### CHG-012 | 2026-10-29 | Created Agent Context Hub (`context/`)
- **Requested by:** User — "I want to make a context folder, which will be used to give any agent the context of the project workflow, how to use skills, and everything about research and docs folder, it will include marking of which processes are done, and will be updated. it will be given to the agent to analyse on the first chat".
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `context/README.md` — Master agent first-chat onboarding guide with orientation checklist, architecture topology, and port mapping.
  - `context/01_PROJECT_WORKFLOW_AND_SKILLS.md` — Detailed operating guide for `project-memory-workflow` (the 7 steps, approval gates, verification requirements, commit conventions, and skill invocation).
  - `context/02_ARCHITECTURE_AND_SPECS_MAP.md` — Full map and index of all architectural components, database rules, specifications in `Research/` (01 & 02 specs, NodeBackend 00–10, PythonBackend 00–09, Frontend 00–10), and `docs/PROJECT_MEMORY.md`.
  - `context/03_IMPLEMENTATION_STATUS_TRACKER.md` — Real-time progress matrix tracking completion status across all 3 stacks (Node Backend: 7/11 done, 149 tests; Python AI Service: 3/10 done, 23 tests; Frontend: 0/11 done, build verified).
  - `context/04_CONVENTIONS_AND_PITFALLS.md` — Critical operating constraints, known pitfalls (Express 5 req.query getter, Windows Makefile syntax, test module spying), and developer runbook commands.
  - `README.md` — Added Agent Context Hub banner pointing agents to read `context/README.md` upon prompt start.
- **Why:** Provide a single, unified, structured context directory enabling any incoming AI agent to immediately orient itself, adhere to workflow discipline, and navigate documentation without repeating past mistakes.
- **Verification:** Verified all 5 context files exist, cross-links resolve cleanly, `npm test` passes (149/149), and `uv run pytest` passes (23/23).
- **Commit:** Pending.
- **Follow-ups:** Keep `context/03_IMPLEMENTATION_STATUS_TRACKER.md` updated as subsequent steps are completed.

### CHG-011 | 2026-10-29 | Step 06 — Access Requests, State Machine, Review Queue, Decisions & Appeals
- **Requested by:** User — "06_ACCESS_REQUESTS_AND_STATE_MACHINE.md start with this process" (BKL-011).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/services/transition.js` — Central state machine engine enforcing authoritative transition matrices for `AccessRequest`, `ServiceRequest`, `Referral`, `Incident`, and `Booking`. Enforces strict `assertNoSelfApproval` on reviewer decisions, transactional updates, SHA-256 audit chaining via `auditChain.js`, and user notifications.
  - `backend/src/services/auditChain.js` — Tamper-evident SHA-256 hash chaining service (`appendAuditEvent` and `verifyChain`).
  - `backend/src/utils/AppError.js` — Added `BadRequest` error factory to `Errors`.
  - `backend/src/modules/accessRequests/accessRequests.schema.js` — Zod schemas for access requests, drafts, review questions, responses, decisions (`APPROVE`, `REJECT`, `WAITLIST`), and appeals.
  - `backend/src/modules/accessRequests/accessRequests.repository.js` — `AccessRequestRepository` with detail queries, requester listings, oldest-first review queue (`created_at ASC`), FIFO waitlist position calculation, and overlap checks.
  - `backend/src/modules/accessRequests/accessRequests.service.js` — Complete domain service: server-side eligibility re-run on submit and approve, draft management, no-self-approval lockout, `APPROVE` with atomic booking creation or 409 conflict alternatives, `REJECT` with mandatory reason, `WAITLIST` with FIFO assignment, and single-appeal handling.
  - `backend/src/modules/accessRequests/accessRequests.controller.js` & `accessRequests.router.js` — Controllers and routes mounted under `/api/v1/access-requests`.
  - `backend/src/modules/facilities/facilities.router.js` — Mounted review queue endpoint at `GET /api/v1/facilities/:id/access-requests`.
  - `backend/src/app.js` — Mounted `/api/v1/access-requests` in main API router.
  - `backend/src/modules/accessRequests/README.md` — Updated with complete Step 06 implementation inventory.
  - `backend/tests/accessRequests.test.js` — 16 integration tests verifying draft creation, direct submission, eligibility gating, no-self-review lockout, review decisions, 409 conflict handling, clean slot approval with booking creation, and single-appeal limit.
- **Why:** Provide complete access request lifecycle, reviewer operations, FIFO waitlisting, conflict resolution, and central state machine gating per Spec §3.1, §4.9, and §4.10.
- **Verification:** Ran `npm test` → **149/149 tests passing across 9 test suites**; all existing test suites remain 100% green.
- **Commit:** Pending.
- **Follow-ups:** Step 07: Bookings, Concurrency, Check-In/Check-Out & QR Scanning (`Research/NodeBackend/07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md`).

### CHG-010 | 2026-10-29 | Step 05 — Availability, Blackouts, Slots & Deterministic Eligibility Implementation
- **Requested by:** User — "IMPLEMENTATION PROMPT — STEP 05" (BKL-010).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/services/bookingEngine.js` — Core timezone-aware interval arithmetic (`calculateAvailabilityIntervals`), discrete bookable slot generation (`getSuggestedSlots`), interval subtraction math, and IANA timezone UTC mapping.
  - `backend/src/services/eligibilityEngine.js` — 100% deterministic eligibility rule engine (zero AI/LLM) evaluating the 6 standard checks:
    1. `membership_verified` (active affiliation at host or approved partner institution)
    2. `user_group_allowed` (role/userGroup matched against policy permitted groups)
    3. `training` (verified, unexpired prerequisites; returns `FAIL` with actionable `BOOK_TRAINING` links)
    4. `documents` (signed/approved document templates; returns `MISSING` with actionable `SIGN_DOCUMENT` links)
    5. `fair_use` (active bookings cap, weekly hours limit, and cumulative no-show strike limit)
    6. `slot_free` (operating hours boundary check and active reservation/blackout collision prevention)
  - `backend/src/modules/availability/availability.schema.js` — Zod schemas for availability range queries, slots queries, blackout creation payloads with collision confirmation flags, and poll voting.
  - `backend/src/modules/availability/availability.repository.js` — Data access layer querying active bookings (`SCHEDULED`, `CHECKED_IN`, `IN_USE`), active blackouts (`deleted_at IS NULL`), poll creation/votes, and atomic transaction updates for colliding bookings (`NEEDS_REBOOK`).
  - `backend/src/modules/availability/availability.service.js` — Service handling interval merging, privacy redaction (purely anonymized `Booked` blocks without user PII), slot slicing with policy constraints, manager-gated blackout creation with 409 collision rejection unless `confirmCancelAffected: true`, and availability polling.
  - `backend/src/modules/availability/availability.controller.js` & `availability.router.js` — HTTP controllers and Express routers for availability, slots, blackouts, and polls.
  - `backend/src/modules/eligibility/eligibility.schema.js`, `eligibility.controller.js`, `eligibility.router.js` — Validation, controller, and router for `POST /api/v1/resources/:id/eligibility-check`.
  - `backend/src/modules/resources/resources.router.js` — Mounted availability and eligibility sub-routers under `/resources/:id/*`.
  - `backend/src/app.js` — Mounted top-level `pollsRouter` for `/api/v1/availability-polls/:pollId/vote`.
  - `backend/tests/availability.test.js` — 15 integration tests verifying interval calculations, privacy anonymization, slot slicing, blackout collision 409 gating, soft deletion, and polling.
  - `backend/tests/eligibility.test.js` — 8 integration tests covering the 6 deterministic checks, action links, next steps, and boundary conditions.
- **Why:** Provide automated, timezone-accurate schedule management and deterministic access verification prior to request submission.
- **Verification:** Ran `npm.cmd test --prefix backend` → **133/133 passing across 8 test suites**.
- **Commit:** Pending.
- **Follow-ups:** Step 06: Access Requests, State Machine, Review Queue & Appeals (`Research/NodeBackend/06_ACCESS_REQUESTS_AND_STATE_MACHINE.md`).

### CHG-009 | 2026-10-29 | Step 04 — Resources, Policies & Redaction Layer Implementation
- **Requested by:** User — "continue" (BKL-009).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/modules/resources/resources.schema.js` — Zod schemas for resource query filtering (`q`, `category`, `institutionId`, `facilityId`, `accessMode`, `city`), creation, partial edits, and UUID parameters.
  - `backend/src/modules/policies/policies.schema.js` — Zod schema validating complete policy JSON (Spec §4.6) including access modes, user groups, purpose statement, approvals, training/document prerequisites, limits, cancellation, late return, pricing models, geofencing, and condition report rules.
  - `backend/src/modules/resources/redaction.js` — Confidential field-level redaction utility stripping door codes, access instructions, maintenance passwords, internal safety notes, and owner contacts from public view while exposing them to authorized managers/owners or requesters with approved bookings.
  - `backend/src/modules/resources/resources.repository.js` — `ResourceRepository` with visibility filtering (`PUBLIC`, `NETWORK` via partner resolution, `INSTITUTION`, `PRIVATE`), detail retrieval with joined facilities and active policies, distinct category/tag vocabulary extraction, and soft-deactivation.
  - `backend/src/modules/policies/policies.repository.js` — `PolicyRepository` supporting active policy lookups and atomic version creation (`policy_version = current + 1`, marking previous versions `is_current = false`).
  - `backend/src/modules/resources/resources.service.js` — Service handling catalog search with redaction, detail retrieval with strict 404 for unauthorized visibility, unredacted private details check, facility-scoped resource creation/editing, and soft-deactivation.
  - `backend/src/modules/policies/policies.service.js` — Policy retrieval and version increment service checking facility manager/owner role.
  - `backend/src/modules/resources/resources.controller.js` & `backend/src/modules/policies/policies.controller.js` — HTTP controllers.
  - `backend/src/modules/resources/resources.router.js` — Routes mounted under `/api/v1/resources` including `/categories`, `/:id/private-details`, and `/:id/policy`.
  - `backend/src/modules/facilities/facilities.router.js` — Added `POST /:id/resources` to allow facility resource creation.
  - `backend/src/app.js` — Mounted resources router under `/api/v1/resources`.
  - `backend/tests/resources.test.js` — 16 integration tests covering visibility rules (`PUBLIC`, `INSTITUTION`, `NETWORK`, `PRIVATE`), field redaction, private details access control, facility-scoped creation, and soft-deactivation.
  - `backend/tests/policies.test.js` — 10 tests covering policy schema validation, active policy retrieval, and version incrementing.
- **Why:** Enable resource catalog discovery, risk-based access boundaries, policy version tracking, and operational security via redaction.
- **Verification:** Ran `npm.cmd test --prefix backend` → **110/110 passing across 6 test suites**.
- **Commit:** Pending.
- **Follow-ups:** Step 05: Availability Slots & Eligibility Engine (`Research/NodeBackend/05_AVAILABILITY_SLOTS_AND_ELIGIBILITY.md`).

### CHG-008 | 2026-10-29 | Step 03 — Institutions, Facilities & Memberships Implementation
- **Requested by:** User — "Implement Step 03: Institutions, Facilities & Memberships completely in the actual codebase."
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/modules/institutions/institutions.schema.js` — Zod schemas for listing/filtering institutions, registration (platform admin), profile updates, membership requests, decision review (role required on APPROVE), partner linking, and ID params.
  - `backend/src/modules/institutions/institutions.repository.js` — `InstitutionRepository`, `InstitutionPartnerRepository`, `MembershipRequestRepository`, `InstitutionMembershipRepository` with public field sanitizers, case-insensitive duplicate prevention, symmetric partner pair normalization (`a < b`), user join queries, and atomic status updates.
  - `backend/src/modules/institutions/institutions.service.js` — Core domain logic: verified institution listing with pagination, detail retrieval with public facilities, platform-admin registration, profile updates, membership request creation (checks existing active membership and pending requests), admin decision review with strict `assertNoSelfApproval` in an atomic Knex transaction, and symmetric partner institution linking.
  - `backend/src/modules/institutions/institutions.controller.js` — HTTP handlers formatting output to the standard `{ ok, data, meta }` envelope.
  - `backend/src/modules/institutions/institutions.router.js` — Express routes with validation, RBAC (`requireRole`, `requireInstitutionRole`), and nested facility creation.
  - `backend/src/modules/facilities/facilities.schema.js` — Zod schemas for coordinate bounds (-90..90, -180..180), IANA timezone validation (`Intl.DateTimeFormat`), geofence radius (>0, default 150), working hours weekday schedules in strict `HH:mm` format with `null` for closed days.
  - `backend/src/modules/facilities/facilities.repository.js` — `FacilityRepository` with public sanitizer, filters (institutionId, city join, text search q), and pagination.
  - `backend/src/modules/facilities/facilities.service.js` — Facility CRUD with RBAC authorization check (platform admin or institution owner/admin) and timezone-aware `isWithinWorkingHours(facility, startAt, endAt)` helper supporting standard weekday schedules, intraday intervals, and overnight hours crossing midnight.
  - `backend/src/modules/facilities/facilities.controller.js` — HTTP handlers for facilities.
  - `backend/src/modules/facilities/facilities.router.js` — Express routes for `/facilities`.
  - `backend/src/middleware/validate.js` — Fixed Express 5 `req.query` getter conflict via `Object.defineProperty` so coerced/stripped query objects are written back safely.
  - `backend/src/app.js` — Mounted `/institutions` and `/facilities` routers under `/api/v1`.
  - `backend/tests/institutions.test.js` — 26 unit and integration tests covering verified listings, facilities embedding, platform admin registration, duplicate name rejection, profile updates, membership requests, conflict prevention, pending request listing, decision reviews with strict `assertNoSelfApproval` (403), transactional upsert of memberships, and symmetric partner linking.
  - `backend/tests/facilities.test.js` — 22 unit and integration tests covering timezone-aware working hours helper, coordinate validation, geofence validation, IANA timezone validation, public list filtering, and facility updates.
- **Why:** Provide full Step 03 implementation enabling multi-institution collaboration, facility operations, membership applications, and partner network sharing.
- **Verification:** Ran `npm.cmd test --prefix backend` → **84/84 passing across 4 test suites** (smoke, auth, institutions, facilities).
- **Commit:** `fba2cb9`
- **Follow-ups:** Step 04: Resources & Policies API (`Research/NodeBackend/04_RESOURCES_AND_POLICIES.md`).

### CHG-008B | 2026-10-29 | Step 00-02 — UviAge FastAPI Architecture, Pydantic V2 Contracts & ReadOnlyRepository
- **Requested by:** User — “Implement Step 00: FastAPI Architecture & UV Virtual Environment Setup”, followed by Step 01 Schemas and Step 02 Repository layer.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `UviAge/config.py` — Pydantic V2 `BaseSettings` loading `INTERNAL_API_KEY`, `ALLOWED_ORIGINS`, `DATABASE_URL`, `MODEL_NAME`, `HOST`, `PORT` with cached `get_settings()` and `allowed_origins_list`.
  - `UviAge/auth.py` — FastAPI dependency `verify_internal_key` validating `X-Internal-Key` using constant-time comparison (`secrets.compare_digest`) and forwarding `X-User-Id`.
  - `UviAge/main.py` — App entrypoint with CORS restricted to Express origin, unauthenticated `/ai/health`, and protected `/ai/*` router.
  - `UviAge/schemas.py` — Strict Pydantic V2 models with `to_camel` alias generator (`ParseNeedRequest`, `ParseNeedResponse`, `MatchNeedRequest`, `MatchNeedResponse`, `IncidentSummaryRequest`, `IncidentSummaryResponse`, `AlternativesRequest`, `PolicySummaryResponse`, `ReindexResponse`).
  - `UviAge/repository.py` — Read-only repository with psycopg v3 (`dict_row`), mutation detection raising `PermissionError`, and graceful offline fallback to JSON fixtures.
  - `UviAge/fixtures/` — Sample resources and incident dossier contexts for offline test execution.
  - `UviAge/matching/`, `UviAge/parsing/`, `UviAge/incidents/` — Stubs with `embedder.is_ready()` returning `False` without model downloads.
  - `UviAge/tests/` — 23 unit tests across `test_health.py`, `test_matching.py`, `test_parser.py`, `test_schemas.py`, and `test_repository.py`.
- **Why:** Establish foundational AI microservice architecture, API contracts, and read-only database query layer for resource matching and incident drafting.
- **Verification:** `uv run pytest -v` → **23/23 passing**; live probe of `/ai/health` and `/ai/protected-test` verified on Uvicorn.
- **Commit:** `99704ad`
- **Follow-ups:** Step 03: Natural Language Need Parser (/ai/parse-need).

### CHG-007 | 2026-10-29 | Step 02 — Authentication, RBAC & Security Middleware
- **Requested by:** User — “Implement Step 02: Authentication, RBAC & Security Middleware”.
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/src/config/env.js` — Added `LOGIN_RATE_LIMIT_MAX` (5), `LOGIN_RATE_LIMIT_WINDOW_MS` (900 000 ms), `DEMO_AUTH_ENABLED` (bool) to env schema.
  - `backend/.env.example` — Documented new env vars with guidance.
  - `backend/src/middleware/rateLimiter.js` — Added `loginLimiter` (5 req / 15 min per IP, spec §5.2). Exported alongside `apiLimiter` and `authLimiter`.
  - `backend/src/middleware/rbac.js` — Added `assertNoSelfApproval(reviewerId, requesterId)` (spec §2.2 strict no-self-approval).
  - `backend/src/modules/auth/auth.schemas.js` — Zod schemas for register, verify-otp, login with email normalization.
  - `backend/src/modules/auth/auth.repository.js` — `UserRepository`, `OtpRepository`, `RefreshTokenRepository`, `MembershipRepository` — all use actual migration 001/002 column names.
  - `backend/src/modules/auth/token.service.js` — HS256 JWT signing/verification; SHA-256 refresh token generation and hashing; httpOnly cookie helpers (`setRefreshCookie`, `clearRefreshCookie`, `getRefreshCookie`).
  - `backend/src/modules/auth/auth.service.js` — All six endpoint services: register (bcrypt 12 rounds, demo OTP, email-enumeration-safe), verifyOtp (atomic transaction, attempt limit, one-time use), login (constant-time password check, account lockout after 5 failures), refresh (atomic rotation with `FOR UPDATE` lock, reuse detection), logout (idempotent revocation), getMe (profile + memberships + unread count).
  - `backend/src/modules/auth/auth.controller.js` — Thin controller delegating to service.
  - `backend/src/modules/auth/auth.router.js` — Routes with `validate({ body })`, `loginLimiter` on /login, `authenticate` on /me.
  - `backend/src/app.js` — Mounted auth router at `/api/v1/auth` with `authLimiter` prefix.
  - `backend/src/services/aiClient.js` — Express→Python AI client with `X-Internal-Key` and `X-User-Id` headers per spec §3.
  - `backend/tests/auth.test.js` — 36 tests: Zod validation, auth middleware (401 cases), loginLimiter skip in test env, token service unit tests, assertNoSelfApproval, unknown route 404.
- **Why:** Auth is the prerequisite for every subsequent feature step.
- **Verification:** `npm test` → **36/36 passing** (2 suites: smoke + auth).
- **Commit:** Pending.
- **Follow-ups:** Step 03 (Institutions & Facilities API), Step 04 (Resources & Policies).

### CHG-006 | 2026-10-28 | Step 01 — Database Models, Schema & Migrations
- **Requested by:** User — “do task 1” (BKL-006).
- **Skills used:** `project-memory-workflow`
- **What changed:**
  - `backend/knexfile.js` — Knex config for dev/test/prod; reads env vars via dotenv.
  - `backend/package.json` — Added `migrate:latest`, `migrate:rollback`, `migrate:make`, `seed:run` scripts.
  - `backend/migrations/001_users_and_auth.js` — `users`, `otps`, `refresh_tokens`.
  - `backend/migrations/002_institutions_and_facilities.js` — `institutions`, `institution_partners`, `institution_memberships`, `membership_requests`, `facilities`.
  - `backend/migrations/003_resources_and_policies.js` — `resources`, `resource_photos`, `resource_policies` (versioned).
  - `backend/migrations/004_access_requests_and_bookings.js` — `access_requests`, `bookings` + GIST exclusion constraint, `waitlist_entries`, `blackout_periods`, `availability_polls`.
  - `backend/migrations/005_condition_reports_and_uploads.js` — `file_uploads` (metadata-only, soft-delete), `condition_reports`.
  - `backend/migrations/006_docs_trainings_incidents_tokens_audit.js` — `document_templates`, `user_documents`, `trainings`, `user_trainings`, `incidents`, `incident_notes`, `token_ledger` (append-only), `audit_events` (SHA-256 hash chain).
  - `backend/migrations/007_service_and_need_requests.js` — `service_requests`, `service_request_quotes`, `need_requests`, `referrals`, `notifications`; adds deferred FK incidents→service_requests.
  - `backend/seeds/001_demo_data.js` — Idempotent seed: 5 demo users, 2 institutions, 2 facilities, 3 resources, 3 policies.
  - `backend/src/db/BaseRepository.js` — Base class with `findById`, `findOne`, `findAll`, `paginate`, `insert`, `update`, `softRemove`, `exists`; all accept optional trx.
- **Why:** All entity tables required by the API spec must exist before Step 02 (Auth) can be implemented against them.
- **Verification:** `npm test` → 12/12 passing. `node -e "require('./knexfile')"` → loads cleanly. Migrations require a live PostgreSQL DB to run (`npm run migrate:latest`).
- **Commit:** `9cdbfff` `feat(backend): implement Step 01 — 7 Knex migrations for all entities, GIST booking constraint, BaseRepository, and idempotent demo seed`
- **Follow-ups:** Step 02 (Auth/JWT endpoints), run `npm run migrate:latest` against dev DB.

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
- **Commit:** `0cb6143` `feat(backend): implement Step 00 modular Express architecture, middleware, env/db config, and 12 smoke tests`
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

### MST-005 | 2026-10-29 | TypeScript verbatimModuleSyntax and noUnusedLocals in Vite template
- **What went wrong:** `tsc -b` failed with `TS1484: 'UserRole' is a type and must be imported using a type-only import` and `TS6133: '...' is declared but its value is never read`.
- **Root cause:** `frontend/tsconfig.app.json` has `verbatimModuleSyntax: true` and `noUnusedLocals: true`, which strictly forbids value-syntax imports for types and flags any unused symbol as a hard build error.
- **Fix:** Switched to `import type { UserRole }` across all components and cleaned up all unused imports.
- **Rule going forward:** Always write `import type { ... }` for TypeScript types and interfaces; prune all unused imports before triggering builds.
- **Related:** CHG-020

### MST-004 | 2026-10-29 | Missing module-level delegating helpers for singleton class repository
- **What went wrong:** FastAPI route handler crashed with `AttributeError: module 'repository' has no attribute 'get_all_active_resources'`.
- **Root cause:** `repository.py` initialized a singleton instance `repository = ReadOnlyRepository()`, but endpoints imported the module as `import repository` and invoked `repository.get_all_active_resources()` without module-level functions binding to the instance.
- **Fix:** Explicitly exported module-level delegating functions `get_all_active_resources()`, `get_resources_by_ids()`, and `get_incident_context()` in `repository.py`.
- **Rule going forward:** When exporting singleton instances from a module, ensure all public API methods are also exported as top-level delegating functions to prevent import/call confusion.
- **Related:** CHG-018

### MST-003 | 2026-10-29 | Router auth middleware import identifier
- **What went wrong:** When creating new modular routers for notifications, audit, admin, dashboards, and AI proxy, using `const { requireAuth } = require('../../middleware/auth')` caused `TypeError: argument handler is required` in `router.use(requireAuth)`.
- **Root cause:** The auth middleware file (`src/middleware/auth.js`) exports `{ authenticate }`, not `{ requireAuth }`.
- **Fix:** Corrected imports across all 5 new routers to `const { authenticate } = require('../../middleware/auth')`.
- **Rule going forward:** Always inspect the target export signature in `middleware/auth.js` rather than assuming convention names.
- **Related:** CHG-016

### MST-002 | 2026-10-29 | Express 5 req.query getter in request validation middleware
- **What went wrong:** In Express 5 (`^5.3.0`), `req.query` is defined on the request prototype as a getter-only property. Attempting `req.query = result.data` in the Zod validation middleware threw `TypeError: Cannot set property query of [object Object] which has only a getter`.
- **Root cause:** Express 5 modernized request property handling and does not provide a default setter on `req.query`.
- **Fix:** Updated `backend/src/middleware/validate.js` to redefine the property on `req` via `Object.defineProperty(req, 'query', { value: result.data, writable: true, enumerable: true, configurable: true })`.
- **Rule going forward:** In Express 5 middleware, never assign directly to `req.query`; use `Object.defineProperty` or mutate keys.
- **Related:** CHG-008

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
- [x] BKL-001 done in CHG-005 (Step 00 foundation)
- [x] BKL-006 done in CHG-006 (Step 01: all 7 migration files, seed, BaseRepository, knexfile)
- [x] BKL-007 done in CHG-007 (Step 02: all auth endpoints, JWT/refresh tokens, RBAC, assertNoSelfApproval, AI client, 36 tests)
- [x] BKL-008 done in CHG-008 (Step 03: Institutions, Facilities, Memberships & Partners API, 84 tests)
- [x] BKL-002 done in CHG-009 (Step 04: Resources catalog, search, and visibility filtering)
- [x] BKL-009 done in CHG-009 (Step 04: Dynamic policy versioning and confidential redaction layer, 110 tests)
- [x] BKL-010 done in CHG-010 (Step 05: Availability, Blackouts, Slots & Deterministic Eligibility Engine, 133 tests)
- [x] BKL-010B done in CHG-008B (UviAge Steps 00–02: FastAPI setup, Pydantic V2 contracts, ReadOnlyRepository, 23 tests)
- [x] BKL-011 done in CHG-011 (Step 06: Access Requests, State Machine, Review Queue & Appeals, 149 backend tests)
- [x] BKL-012 done in CHG-013 (Step 07: Bookings, Concurrency, Check-In, Geofencing, Signatures & Returns, 188 backend tests)
- [x] BKL-013 done in CHG-014 (Step 08: Staff-Operated Services, Missing-Resource Needs & Referrals, 217 backend tests)
- [x] BKL-014 done in CHG-015 (Step 09: Incidents, Tokens, Payments & PDF/Excel Exports, 241 backend tests)
- [x] BKL-015 done in CHG-016 (Step 10: 7 scheduled cron jobs, scheduler telemetry, SHA-256 audit hash chain verification, admin control, notifications, dashboards, AI proxy, 272 backend tests)
- [x] BKL-003 done in CHG-017 (/ai/parse-need) and CHG-018 (/ai/match-need, Steps 04-06)
- [x] BKL-016 done in CHG-019 (Step 07: /ai/incident-summary objective drafting, 49 UviAge tests)
- [ ] BKL-004 (P1) Implement React frontend navigation, layout, and resource catalog pages | Source: Research/02_FRONTEND_DESIGN_SPEC.md
- [ ] BKL-005 (P1) Implement end-to-end booking reservation and approval workflow | Source: Research/01_BACKEND_API_SPEC.md

