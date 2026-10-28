---
name: fix-errors
description: Comprehensive debugging, error diagnosis, and healing workflow for the Resource Manager repository. Activate whenever the user commands "fix errors", reports broken services, test failures, port collisions, or runtime crashes. Reads project memory history (docs/PROJECT_MEMORY.md), systematically probes terminals and services (backend on 5000, frontend on 5173, UviAge on 8000 via uv), isolates root causes, drafts an implementation plan for user approval, applies surgical fixes without regressions, verifies all services, and records lessons in project memory.
---

# Fix Errors Workflow (`fix-errors`)

This skill governs the systematic diagnosis, root-cause isolation, approval-gated repair, and verification of errors across the **Resource Manager** multi-service repository.

---

## The Golden Rules of Error Fixing

1. **Check Memory First:** Always consult `docs/PROJECT_MEMORY.md` (specifically Section 7 "Mistakes and Lessons") before trying any fix. Do not repeat past failed approaches.
2. **Never Guess or Assume:** Observe the exact terminal output, stack trace, and port state before proposing changes.
3. **Approval Gate:** Never touch project code until the user explicitly reviews and approves the diagnosis and implementation plan.
4. **Surgical, Minimal Changes:** Fix the root cause directly. Do not rewrite surrounding functioning code or refactor unrelated files.
5. **Zero-Regression Verification:** After fixing, verify not just the broken component, but the entire multi-service stack (`make clear`, backend on 5000, frontend on 5173, and UviAge on 8000).
6. **Record the Lesson:** Every resolved issue must be documented as an `MST-xxx` entry in `docs/PROJECT_MEMORY.md` to protect future teammates and agents.

---

## Step-by-Step Execution Workflow

### Step 0: Sync & Consult Project Memory
1. Open and read `docs/PROJECT_MEMORY.md`.
2. Review:
   - **Section 7: Mistakes and Lessons (`MST-xxx`):** Check if this error or a related issue occurred before and what rule was established.
   - **Section 3: Current Project State & Core flows that must keep working.**
3. Summarize any relevant past lessons in your diagnostic report.

---

### Step 1: Systematic Diagnostic Sweep across All Services

Probe each service in the stack using non-destructive commands:

#### 1. Port & Process Audit
Check if ports are hung or conflicting:
```powershell
Get-NetTCPConnection -LocalPort 5000, 5173, 8000 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess
```

#### 2. Express Backend Diagnosis (`backend/`)
- Check syntax and startup:
  ```powershell
  cd backend; node --check index.js
  ```
- Check dependencies:
  ```powershell
  cd backend; npm ls --depth=0
  ```
- Verify environment variables (`.env`).

#### 3. Python AI Service Diagnosis (`UviAge/`)
- Verify `uv` environment and core packages:
  ```powershell
  cd UviAge; uv run python -c "import fastapi, uvicorn, pydantic; print('UviAge Core OK')"
  ```
- Check for missing imports or virtual environment corruption.
- Verify `.env` / `.env.example`.

#### 4. React Frontend Diagnosis (`frontend/`)
- Check TypeScript compilation and build:
  ```powershell
  cd frontend; npm run build
  ```
- Check linter / typechecker:
  ```powershell
  cd frontend; npx tsc -b --noEmit
  ```

---

### Step 2: Root-Cause Isolation & Blast Radius Analysis

Determine the precise failure category:
- **Port Collision / Zombie Process:** Process did not terminate; port remains bound.
- **Dependency / Environment Drift:** Missing npm package, corrupted `.venv`, missing `.env` key.
- **Runtime Exception / Uncaught Promise:** Crash on request or startup.
- **Type / Build Error:** TypeScript interface mismatch or bundler failure.
- **Inter-Service Communication Error:** Express proxy timeout to Uvicorn, CORS block, or invalid header.

Identify the **blast radius**: what other endpoints, components, or services rely on the file being modified?

---

### Step 3: Draft the Error Resolution Plan

Format the diagnostic plan in the chat for user review:

```markdown
## Error Diagnosis & Resolution Plan: <Short Title>

**Trigger:** "fix errors" / <user report>
**Relevant Memory & Past Lessons:** <MST-xxx entries consulted>

### 1. Diagnostic Findings
- **Observed Symptoms:** <Exact error messages, status codes, terminal outputs>
- **Probed Services:**
  - Backend (Port 5000): <Healthy / Broken>
  - Frontend (Port 5173): <Healthy / Broken>
  - UviAge AI (Port 8000): <Healthy / Broken>
- **Root Cause:** <Precise technical explanation of why it failed>

### 2. Proposed Surgical Changes
1. `<file path>`: <exact line changes and why this resolves the issue without side effects>

### 3. Risk & Blast Radius Assessment
- <What could break if this fix is applied incorrectly>
- <How regressions are prevented>

### 4. Verification Plan
- <Step 1: Test the specific fix>
- <Step 2: Full regression check (make clear, backend on 5000, frontend on 5173, agent on 8000)>

### 5. Memory Update
- Will record new `MST-xxx` entry in `docs/PROJECT_MEMORY.md`.
```

---

### Step 4: STOP and Wait for User Approval (Approval Gate)

- **Do NOT modify project code before the user explicitly approves the plan.**
- If the user provides additional context or requests changes, adjust the plan and re-confirm.

---

### Step 5: Implement the Surgical Fix

- Edit only the approved files using minimal, targeted replacements.
- Maintain existing comments, formatting, and project style conventions.
- Never delete working logic or rewrite unrelated modules.

---

### Step 6: Full Multi-Service Verification

Execute the verification plan:
1. Clear all ports cleanly:
   ```powershell
   make clear
   ```
2. Re-test the repaired service and verify expected output.
3. Verify remaining services start up cleanly without regressions.
4. Verify HTTP health probes:
   - Backend: `http://localhost:5000/health`
   - AI Service: `http://localhost:8000/ai/health`
   - Frontend: `http://localhost:5173`

---

### Step 7: Record Lesson in Project Memory

1. Open `docs/PROJECT_MEMORY.md`.
2. Add a new **Mistakes and Lessons** entry under Section 7:
   ```markdown
   ### MST-xxx | <YYYY-MM-DD> | <Short Title>
   - **What went wrong:** <symptom>
   - **Root cause:** <underlying cause>
   - **Fix:** <what resolved it>
   - **Rule going forward:** <concrete rule to prevent recurrence>
   - **Related:** <CHG-xxx>
   ```
3. Add a corresponding **Change Log** entry under Section 6 (`CHG-xxx`).
4. Report the verified outcome and new lesson ID to the user.
