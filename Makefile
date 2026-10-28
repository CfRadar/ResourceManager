# ==============================================================================
# Makefile for Resource Manager
# Commands for managing Backend, Frontend, and UviAge (Python AI Service)
# ==============================================================================

BACKEND_PORT  ?= 5000
FRONTEND_PORT ?= 5173
AGENT_PORT    ?= 8000

.PHONY: help install backend frontend agent clear clear-backend clear-frontend clear-agent

help:
	@echo "Available commands:"
	@echo "  make install   - Install all dependencies (backend, frontend, UviAge)"
	@echo "  make backend   - Clear port $(BACKEND_PORT), install deps, and start Express backend"
	@echo "  make frontend  - Clear port $(FRONTEND_PORT), install deps, and start Vite frontend"
	@echo "  make agent     - Clear port $(AGENT_PORT), install deps with uv, and start UviAge AI service"
	@echo "  make clear     - Terminate all processes running on ports $(BACKEND_PORT), $(FRONTEND_PORT), $(AGENT_PORT)"

# Detect Windows environment
ifeq ($(OS),Windows_NT)
  NPM ?= npm.cmd
else
  NPM ?= npm
endif

# ------------------------------------------------------------------------------
# Install all dependencies
# ------------------------------------------------------------------------------
install:
	@echo "===> Installing Backend dependencies (npm)..."
	cd backend && $(NPM) install
	@echo "===> Installing Frontend dependencies (npm)..."
	cd frontend && $(NPM) install
	@echo "===> Setting up UviAge virtual environment & dependencies (uv)..."
	cd UviAge && uv venv --allow-existing && uv pip install -r requirements.txt
	@echo "===> All dependencies successfully installed!"

# ------------------------------------------------------------------------------
# Port Clearing Rules (PowerShell)
# ------------------------------------------------------------------------------
clear-backend:
	@powershell -NoProfile -ExecutionPolicy Bypass -Command 'try { Get-NetTCPConnection -LocalPort $(BACKEND_PORT) -ErrorAction Stop | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host "Stopped process on port $(BACKEND_PORT)" } } catch {}; exit 0'

clear-frontend:
	@powershell -NoProfile -ExecutionPolicy Bypass -Command 'try { Get-NetTCPConnection -LocalPort $(FRONTEND_PORT) -ErrorAction Stop | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host "Stopped process on port $(FRONTEND_PORT)" } } catch {}; exit 0'

clear-agent:
	@powershell -NoProfile -ExecutionPolicy Bypass -Command 'try { Get-NetTCPConnection -LocalPort $(AGENT_PORT) -ErrorAction Stop | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host "Stopped process on port $(AGENT_PORT)" } } catch {}; exit 0'

clear:
	@echo "Terminating any processes on ports $(BACKEND_PORT), $(FRONTEND_PORT), $(AGENT_PORT)..."
	@powershell -NoProfile -ExecutionPolicy Bypass -Command '@($(BACKEND_PORT), $(FRONTEND_PORT), $(AGENT_PORT), 3000) | ForEach-Object { try { Get-NetTCPConnection -LocalPort $$_ -ErrorAction Stop | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host "Freed port $$_" } } catch {} }; exit 0'
	@echo "All ports cleared."

# ------------------------------------------------------------------------------
# Run Services
# ------------------------------------------------------------------------------
backend: clear-backend
	@echo "Starting Backend on port $(BACKEND_PORT)..."
	cd backend && $(NPM) install && $(NPM) start

frontend: clear-frontend
	@echo "Starting Frontend on port $(FRONTEND_PORT)..."
	cd frontend && $(NPM) install && $(NPM) run dev

agent: clear-agent
	@echo "Starting UviAge AI Service on port $(AGENT_PORT) using uv..."
	cd UviAge && uv venv --allow-existing && uv pip install -r requirements.txt && uv run uvicorn main:app --reload --port $(AGENT_PORT)
