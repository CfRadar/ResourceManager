# Institutional Resource Access and Coordination Network (Resource Manager)

A unified platform enabling cross-institutional resource sharing, lab equipment reservations, and AI-assisted matching.

---

## 🏛️ Architecture Overview

The system consists of three interconnected services:

| Service | Directory | Stack | Port | Purpose |
|---|---|---|---|---|
| **Python AI Service** | [`/UviAge`](./UviAge) | FastAPI + Uvicorn (`uv`) | `8000` | Natural language resource matching & drafting |
| **Express Backend** | [`/backend`](./backend) | Node.js + Express | `5000` | Core API, authentication, RBAC, state machine |
| **Web Frontend** | [`/frontend`](./frontend) | React + TypeScript + Vite | `5173` | Interactive web interface |

---

## 🚀 Quickstart Guide

### 1. One-Time Setup (Install All Dependencies)

Open your terminal in the root repository folder and run:

```bash
make install
```

This will automatically:
- Install all Node.js dependencies for `backend/` via `npm`.
- Install all frontend dependencies for `frontend/` via `npm`.
- Set up the Python virtual environment (`.venv`) and install dependencies in `UviAge/` using **`uv`**.

---

## 🖥️ Running the Application (3-Terminal Workflow)

Each service runs in the foreground with live reloading enabled. Open **three separate terminal windows** (or split tabs in VS Code / Windows Terminal) in the project root:

### 📟 Terminal 1 — Start the Python AI Service (`UviAge`)
```bash
make agent
```
- **URL:** [http://localhost:8000](http://localhost:8000)
- **Health check:** [http://localhost:8000/ai/health](http://localhost:8000/ai/health)
- **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 📟 Terminal 2 — Start the Express Backend API
```bash
make backend
```
- **URL:** [http://localhost:5000](http://localhost:5000)
- **Health check:** [http://localhost:5000/health](http://localhost:5000/health)

---

### 📟 Terminal 3 — Start the React Frontend UI
```bash
make frontend
```
- **Web App:** [http://localhost:5173](http://localhost:5173)

---

## 🛑 How to Stop a Running Service

To stop any active service:
1. Click into the terminal window running that service.
2. Press **`Ctrl + C`**.
3. **On Windows:** If prompted with `Terminate batch job (Y/N)?`, type **`Y`** and press **`Enter`**.

---

## 🧹 Clearing Stuck Ports (`make clear`)

If a process was terminated abruptly or a port is already occupied (`EADDRINUSE` or port conflict), run:

```bash
make clear
```

This immediately finds and terminates any zombie processes listening on ports **`5000`**, **`5173`**, **`8000`**, and **`3000`**.

> **Note:** Every `make backend`, `make frontend`, and `make agent` command also automatically clears its specific port before starting up.

---

## 📋 Makefile Commands Reference

| Command | Action |
|---|---|
| `make install` | Installs dependencies across all 3 services (`npm` + `uv`) |
| `make backend` | Clears port `5000`, installs backend deps, and starts Express |
| `make frontend` | Clears port `5173`, installs frontend deps, and starts Vite |
| `make agent` | Clears port `8000`, ensures `uv` environment, and starts Uvicorn |
| `make clear` | Kills all processes running on ports `5000`, `5173`, `8000`, and `3000` |
| `make help` | Displays list of available make targets |

---

## 🛠️ Agent Workflows & The "fix errors" Command

The repository includes specialized agent skills under `.agent/skills/` to ensure collaborative consistency, memory retention, and zero-regression troubleshooting.

### 1. `fix-errors` Skill (Debugging & Self-Healing)
Triggered whenever you say **`"fix errors"`** or report broken services, port conflicts, or runtime failures:

1. **Consults Memory:** Inspects [`docs/PROJECT_MEMORY.md`](./docs/PROJECT_MEMORY.md) (specifically Section 7 *Mistakes & Lessons* `MST-xxx`) to check if similar errors or port issues occurred previously.
2. **Diagnostic Sweep:** Systematically checks all 3 service terminals:
   - **Express Backend:** Port 5000, syntax checks, dependencies, `.env`.
   - **Python AI Service (`UviAge`):** Port 8000, `uv` virtual environment, packages, and health endpoint.
   - **React Frontend:** Port 5173, TypeScript compilation (`tsc -b`), build checks, and Vite server.
   - **Port Audit:** Detects and handles hung or zombie processes on ports 5000, 5173, 8000, and 3000.
3. **Drafts Implementation Plan:** Presents diagnostic findings, root cause, blast radius, proposed code diffs, and verification steps for **your explicit approval**.
4. **Approval Gate:** Waits for your approval before touching any code.
5. **Surgical Repair:** Fixes only the identified root cause without creating new regressions or modifying unrelated files.
6. **Zero-Regression Verification:** Verifies the fix and runs cross-service smoke tests (`make clear`, backend, frontend, and AI service health).
7. **Records Lesson:** Automatically logs a new `MST-xxx` entry in `docs/PROJECT_MEMORY.md` to prevent future agents from repeating the mistake.

### 2. `project-memory-workflow` Skill (Collaborative Development)
Mandatory workflow governing every code change in this repository:
- Reads and updates the append-only shared record: [`docs/PROJECT_MEMORY.md`](./docs/PROJECT_MEMORY.md).
- Enforces the plan-approval gate before modifying code.
- Enforces honest verification before any commit or push.

---

## 📚 Documentation & Implementation Blueprints

- **[Project Memory (`docs/PROJECT_MEMORY.md`)](./docs/PROJECT_MEMORY.md):** The single source of truth for changes (`CHG-xxx`), mistakes (`MST-xxx`), open decisions, and backlog.
- **[Node.js Backend Blueprints (`Research/NodeBackend/`)](./Research/NodeBackend/README.md):** 12 step-by-step implementation guides for Express, Knex migrations, RBAC, state machines, and audit hash chaining.
- **[Python AI Service Blueprints (`Research/PythonBackend/`)](./Research/PythonBackend/README.md):** 11 step-by-step implementation guides for FastAPI, Pydantic schemas, local vector embeddings, and BM25 fallback.
- **[React Frontend Blueprints (`Research/Frontend/`)](./Research/Frontend/README.md):** 12 step-by-step implementation guides for UI pages, dynamic wizards, digital signatures, and operations dashboards.
- **[Backend API Specification](./Research/01_BACKEND_API_SPEC.md):** Original backend contract and endpoints catalog.
- **[Frontend Design Specification](./Research/02_FRONTEND_DESIGN_SPEC.md):** Original frontend wireframes, tokens, and user flows.
- **[Developer Setup Guide](./Research/Instructions/SETUP_AND_BUILD_INSTRUCTIONS.md):** Complete manual onboarding guide.
