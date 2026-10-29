# Conventions, Known Pitfalls & Developer Runbook

> **OPERATING RULES:**
> Read this document to avoid known pitfalls and ensure full compliance with repository standards.

---

## 1. Hard Rules (Never Violate)

1. **State Machine Discipline (Spec §3):**
   - **Direct SQL `UPDATE ... SET status = ...` is strictly forbidden.**
   - All status transitions on `AccessRequest`, `ServiceRequest`, `Referral`, `Incident`, and `Booking` must route through `transition(entityType, entityOrId, toState, actor, reason, options)`.
   - `transition()` verifies transition lookup tables, executes `assertNoSelfApproval`, appends a SHA-256 chained `audit_events` row, and inserts in-app notifications in a single transaction.

2. **Strict No-Self-Approval (Spec §2.2):**
   - A user can **never** review, approve, reject, or decide upon their own request, booking, or incident report.
   - Use `assertNoSelfApproval(reviewerId, requesterId)` from `src/middleware/rbac.js`. Violations must return `403 FORBIDDEN`.

3. **Demonstration Data Notice:**
   - All data in this repository is fictional and simulated for testing and academic demonstration.
   - Any financial settlement, OTP verification, or signature confirmation response must include `"demo": true`.

4. **Credential & Secret Protection:**
   - Never log database connection strings, passwords, or JWT secrets.
   - `src/config/db.js` logs only host and database name. Never log query bind parameters in production mode.
   - Never commit `.env` files. Keep `.env.example` updated with safe placeholders.

5. **Python Microservice Isolation:**
   - Always manage Python packages and environments with `uv`.
   - Never use global `pip install` or direct `python -m venv`. Use `uv sync` or `uv run ...`.

---

## 2. Known Pitfalls & Lessons Learned

### MST-002: Express 5 `req.query` Getter Quirk
- **Symptom:** `TypeError: Cannot set property query of [object Object] which has only a getter` in Zod validation middleware.
- **Root Cause:** In Express 5 (`^5.3.0`), `req.query` is defined on the request prototype as a getter-only property. Direct assignment (`req.query = result.data`) fails.
- **Rule Going Forward:** In Express 5 middleware, never assign directly to `req.query`. Use `Object.defineProperty(req, 'query', { value: result.data, writable: true, enumerable: true, configurable: true })` or mutate existing properties.

### MST-001: Windows PowerShell & Make Resolution
- **Symptom:** `make clear` failed because GNU Make expanded `$p` as an empty string before PowerShell received it; `make install` failed looking for `/usr/bin/npm`.
- **Root Cause:** MSYS2 / GNU Make shell interpolation differs from Windows PowerShell.
- **Rule Going Forward:** Always use `npm.cmd` on `Windows_NT`, wrap PowerShell script blocks in single quotes in Makefiles, and use `uv venv --allow-existing`.

### Module Import Spying in Unit Tests
- **Symptom:** Destructuring service functions statically at module top-level (`const { checkEligibility } = require(...)`) causes `jest.spyOn()` on the parent module to fail to intercept internal service calls.
- **Rule Going Forward:** In service-to-service orchestration, import the module object (`const eligibilityEngine = require(...)`) and invoke methods as properties (`eligibilityEngine.checkEligibility(...)`) so test spies can hook calls cleanly.

---

## 3. Developer Runbook & Verification Commands

### Daily Development & Service Launch:
```bash
# Clear hung processes on ports 5000, 5173, 8000
make clear

# Run all test suites
npm.cmd test --prefix backend      # Runs 149 Jest tests across 9 suites
uv run pytest                     # Runs 23 Pytest tests inside UviAge/
npm.cmd run build --prefix frontend # Builds React client via Vite

# Start development servers
make backend                      # Express API on http://localhost:5000
make agent                        # FastAPI AI service on http://localhost:8000
make frontend                     # React Vite client on http://localhost:5173
```

### Health Check Probes:
```bash
# Express API root & v1 health
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/health

# UviAge AI microservice health
curl http://localhost:8000/ai/health
```
