# Developer Setup & Build Instructions

This document provides complete, step-by-step instructions for any developer cloning the **Resource Manager** repository to set up, build, and run the entire stack.

---

## 1. System Overview & Architecture

The repository is organized into three core services:

| Component | Directory | Stack | Default Port | Description |
|---|---|---|---|---|
| **Frontend** | `/frontend` | React + TypeScript + Vite | `5173` | Web UI for users and administrators |
| **Main Backend** | `/backend` | Node.js + Express | `5000` (or `3000`) | Core business logic, authentication, RBAC, DB writer |
| **AI Backend Service** | `/UviAge` | Python + FastAPI + Uvicorn | `8000` | Natural language resource matching & drafting |

---

## 2. Prerequisites

Ensure the following tools are installed on your machine:

1. **Git**: Version control (`git --version`)
2. **Node.js**: v18.x or v20+ (`node -v` and `npm -v`)
3. **Python**: Python 3.10, 3.11, or 3.12 (`python --version`)
4. **`uv` (MANDATORY)**: Fast Python package and environment manager.

### Installing `uv` (Mandatory for Python Backend)
Do not use raw `pip` or global Python environments. Install `uv` using one of the following:

- **Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
- **macOS / Linux:**
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Via Pip or Winget (alternative):**
  ```bash
  winget install astral-sh.uv
  # or
  pip install uv
  ```
- **Verify installation:**
  ```bash
  uv --version
  ```

---

## 3. Step-by-Step Setup Guide

### Step 3.1: Python AI Service (`UviAge`) Setup

> **CRITICAL RULE**: ALWAYS use `uv` for all Python dependency and environment management in this repository.

1. **Navigate to the `UviAge` folder:**
   ```powershell
   cd d:\ALL_USER_DATA\ResourceManager\UviAge
   ```

2. **Create the virtual environment using `uv`:**
   ```powershell
   uv venv
   ```
   *Note: This creates an isolated `.venv` directory configured for the project.*

3. **Install project dependencies:**
   ```powershell
   uv pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Copy the example environment file:
   - Windows PowerShell:
     ```powershell
     Copy-Item .env.example .env
     ```
   - macOS / Linux:
     ```bash
     cp .env.example .env
     ```

5. **Run the AI Service:**
   Always run Python commands and Uvicorn through `uv run`:
   ```powershell
   uv run uvicorn main:app --reload --port 8000
   ```
   - Health check: [http://localhost:8000/ai/health](http://localhost:8000/ai/health)
   - Swagger API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

6. **Adding new Python packages (Important):**
   When adding a new dependency, use:
   ```powershell
   uv pip install <package-name>
   uv pip freeze > requirements.txt
   ```

---

### Step 3.2: Express Backend (`backend`) Setup

1. **Navigate to the `backend` folder:**
   ```powershell
   cd d:\ALL_USER_DATA\ResourceManager\backend
   ```

2. **Install Node dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment variables:**
   Ensure a `.env` file exists with relevant configuration:
   ```env
   PORT=5000
   AI_SERVICE_URL=http://localhost:8000
   INTERNAL_API_KEY=dev-secret-internal-key
   ```

4. **Start the Express server:**
   ```powershell
   node index.js
   # or with nodemon if configured:
   npm run dev
   ```

---

### Step 3.3: React Frontend (`frontend`) Setup

1. **Navigate to the `frontend` folder:**
   ```powershell
   cd d:\ALL_USER_DATA\ResourceManager\frontend
   ```

2. **Install Node dependencies:**
   ```powershell
   npm install
   ```

3. **Start the Vite development server:**
   ```powershell
   npm run dev
   ```
   Open your browser at [http://localhost:5173](http://localhost:5173).

4. **Build for production:**
   ```powershell
   npm run build
   ```

---

## 4. Running the Complete Application (Quickstart with Makefile)

A root `Makefile` is provided to automate dependency installation, port management, and process startup.

### Quick Commands

| Command | Action |
|---|---|
| `make install` | Installs all dependencies across `backend`, `frontend`, and `UviAge` (via `uv` and `npm`) |
| `make backend` | Clears port `5000` (if in use), installs backend dependencies, and runs the Express server |
| `make frontend` | Clears port `5173` (if in use), installs frontend dependencies, and runs the Vite dev server |
| `make agent` | Clears port `8000` (if in use), sets up the virtual environment with `uv`, and starts Uvicorn |
| `make clear` | Automatically stops all running processes listening on ports `5000`, `5173`, `8000`, and `3000` |

### Running in Separate Terminals

Open 3 terminal windows in the repository root:

```powershell
# Terminal 1: Python AI Service
make agent

# Terminal 2: Express Backend
make backend

# Terminal 3: React Frontend
make frontend
```

If you ever encounter an occupied port or need to stop all background processes quickly:
```powershell
make clear
```

---

## 5. Repository Golden Rules & Best Practices

1. **Always use `uv` for Python**:
   - Never run global `pip install`.
   - Always run commands with `uv run <command>` (e.g. `uv run python script.py`, `uv run pytest`).
   - Keep `requirements.txt` updated when installing new packages.

2. **Secrets & Git Hygiene**:
   - Never commit `.env` files. Only commit `.env.example` templates with dummy values.
   - Never commit `node_modules/` or `.venv/` (both are excluded by root `.gitignore`).

3. **Code Style & Specifications**:
   - Refer to `Research/01_BACKEND_API_SPEC.md` for API contract specifications and payload shapes.
   - Refer to `Research/02_FRONTEND_DESIGN_SPEC.md` for UI flow, design tokens, and components.

---

## 6. Troubleshooting

- **PowerShell Execution Policy Error (`Activate.ps1 cannot be loaded`)**:
  You do not need to activate the virtual environment manually if you use `uv run`. Alternatively, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Port Conflicts**:
  If port 8000, 5000, or 5173 is already in use, update the port parameter in the respective `.env` or start command.
