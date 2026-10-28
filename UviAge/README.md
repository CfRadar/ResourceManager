# UviAge — Python Backend (AI Service)

FastAPI service configured for resource matching and drafting, running with Uvicorn.

## Setup & Running with `uv`

### 1. Virtual Environment
The virtual environment is already initialized using `uv`:
```bash
uv venv
```

To activate the virtual environment manually:
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```

### 2. Install / Sync Dependencies
```bash
uv pip install -r requirements.txt
```

### 3. Run Development Server with Uvicorn
You can run it directly using `uv`:
```bash
uv run uvicorn main:app --reload --port 8000
```
Or with python:
```bash
uv run python main.py
```

### 4. API Endpoints
- **Root:** `http://localhost:8000/`
- **Health Check:** `http://localhost:8000/ai/health`
- **Swagger Docs:** `http://localhost:8000/docs`
