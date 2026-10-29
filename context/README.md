# Agent Context Hub: First-Chat Orientation

> **MANDATORY FOR ALL AI AGENTS & COLLABORATORS:**
> If this is your first prompt in a session or conversation, **read this directory before performing any task or proposing changes**. This directory gives you the complete operating manual, workflow discipline, architecture map, and the live implementation progress of the entire repository.

---

## 1. Executive Summary

- **Project:** Institutional Resource Access and Coordination Network (Resource Manager).
- **Mission:** A multi-tenant platform enabling research institutions, universities, and labs to catalog, discover, share, book, and coordinate high-value resources, equipment, and services with deterministic eligibility rules and explainable AI-driven matchmaking.
- **Demo Data Notice:** All institutions, users, resources, payments, tokens, and virtual signatures are demonstration data. Simulated features must always be labelled with `"demo": true`.

---

## 2. Quick Orientation Checklist (First Chat Routine)

Whenever you receive a prompt as an agent in this repository, follow this sequence:

```
[ ] 1. Read context/README.md (this file)
[ ] 2. Sync Git & Read docs/PROJECT_MEMORY.md (Check recent CHG-xxx entries & lessons)
[ ] 3. Review context/03_IMPLEMENTATION_STATUS_TRACKER.md (Know what is built vs what is pending)
[ ] 4. Perform Step 2 Skill Check (Check .agent/skills/ for relevant skills)
[ ] 5. Draft Plan -> STOP and WAIT for User Approval before touching any code
```

---

## 3. Context Hub Directory Map

| Document | Purpose |
| :--- | :--- |
| **[01_PROJECT_WORKFLOW_AND_SKILLS.md](./01_PROJECT_WORKFLOW_AND_SKILLS.md)** | Mandatory 7-step task workflow (`project-memory-workflow`), skill invocation (`fix-errors`), approval gates, and commit rules. |
| **[02_ARCHITECTURE_AND_SPECS_MAP.md](./02_ARCHITECTURE_AND_SPECS_MAP.md)** | Deep dive into system topology, services, database schemas, and navigation map for all specifications in `Research/` and `docs/`. |
| **[03_IMPLEMENTATION_STATUS_TRACKER.md](./03_IMPLEMENTATION_STATUS_TRACKER.md)** | **Live step-by-step progress matrix** across Node Backend (00–10), Python UviAge (00–09), and React Frontend (00–10). |
| **[04_CONVENTIONS_AND_PITFALLS.md](./04_CONVENTIONS_AND_PITFALLS.md)** | Hard rules, known mistakes, Express 5 prototype getters, strict no-self-approval rule, state machine discipline, and runbook commands. |

---

## 4. Multi-Service Architecture at a Glance

```
                         ┌────────────────────────────────────────┐
                         │ React Frontend (Port 5173)             │
                         │ Vite + TypeScript + TanStack Router/UI │
                         └───────────────────┬────────────────────┘
                                             │ HTTP / REST
                                             ▼
                         ┌────────────────────────────────────────┐
                         │ Express API (Node.js) (Port 5000)      │
                         │ - Master authority & ONLY DB WRITER   │
                         │ - Auth, RBAC, State Machines           │
                         │ - Booking engine & Eligibility checks  │
                         └───────┬────────────────────────┬───────┘
                                 │                        │
       X-Internal-Key (Private)  │                        │ Knex / pg Pool
                                 ▼                        ▼
┌────────────────────────────────────────┐    ┌────────────────────────────────────────┐
│ Python AI Service (UviAge) (Port 8000) │    │ PostgreSQL Database (Neon DB)          │
│ - FastAPI + Uvicorn + uv                │    │ - 14 relational tables (migrations 1-7)│
│ - READ-ONLY database query user        │◄───┤ - GIST exclusion constraint for booking│
│ - Semantic need matching & parser      │    │ - SHA-256 audit hash chain             │
│ - NEVER writes decisions or mutations  │    │ - Append-only token ledger             │
└────────────────────────────────────────┘    └────────────────────────────────────────┘
```

### Port Allocation:
- **`5173`**: React client application (`frontend/`)
- **`5000`**: Express backend application (`backend/`)
- **`8000`**: Python AI FastAPI microservice (`UviAge/`)

---

## 5. Next Step

Proceed to **[01_PROJECT_WORKFLOW_AND_SKILLS.md](./01_PROJECT_WORKFLOW_AND_SKILLS.md)** to understand how instructions are processed under the mandatory project workflow.
