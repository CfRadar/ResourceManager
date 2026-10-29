# Project Workflow & Skills Operating Guide

> **CORE GOVERNANCE:**
> This repository is governed by the mandatory agent skill:
> `[.agent/skills/project-memory-workflow/SKILL.md](../.agent/skills/project-memory-workflow/SKILL.md)`.
> Every agent must follow this exact lifecycle for every instruction without exception.

---

## 1. The 7-Step Task Lifecycle

```
[Step 0: Sync & Read Memory]
         │ (git status, git pull --rebase, read docs/PROJECT_MEMORY.md)
         ▼
[Step 1: Understand Instruction]
         │ (Restate in 1-2 lines, check against memory)
         ▼
[Step 2: Skill Check]
         │ (Check .agent/skills/ or create missing skill first)
         ▼
[Step 3: Draft Implementation Plan]
         │ (Changes, risks, verification plan, commit message)
         ▼
[Step 4: STOP & WAIT FOR APPROVAL]  <─── HARD GATE: Never edit code before approval!
         │ (User types "proceed", "approved", or confirms)
         ▼
[Step 5: Implement Within Plan]
         │ (Surgical edits, adhere to conventions)
         ▼
[Step 6: Comprehensive Verification]
         │ (Run test suites: backend, frontend build, python tests)
         ▼
[Step 7: Update Memory, Commit & Push]
           (Update PROJECT_MEMORY.md, git add specific files, commit, git pull --rebase, git push)
```

---

## 2. Detailed Step Breakdown

### Step 0: Sync and Read Memory (Always First)
1. Run `git status` and `git pull --rebase`. If working tree is dirty, notify user before pulling.
2. Read `docs/PROJECT_MEMORY.md` fully, focusing on:
   - **Current Project State** (what is done, what is broken).
   - **Mistakes and Lessons** (e.g. MST-001 through MST-002; avoid repeating them).
   - **Backlog / Future Implementation** (check dependencies).
   - **Open Decisions & Conventions**.
3. State briefly to the user what you found that is relevant (2 to 5 lines).

### Step 1: Understand the Instruction
- Restate the user's prompt in one or two clear sentences.
- Check if it contradicts any recorded decision in memory.

### Step 2: Skill Check
- Inspect `.agent/skills/` for relevant capabilities:
  - `project-memory-workflow`: General task execution and memory tracking.
  - `fix-errors`: Diagnostic workflow for diagnosing broken services, test failures, or crashes.
- If a relevant skill is required but missing, use a skill creator or build it in `.agent/skills/<skill-name>/SKILL.md`, register it in `docs/PROJECT_MEMORY.md` under Skills Registry, and inform the user.
- If standard module development, state: *"Follows established modular conventions from Steps 00–06"*.

### Step 3: Draft the Implementation Plan
The plan **MUST** follow this exact template:

```markdown
## Implementation Plan: <short title>

**Request:** <restated in one or two sentences>
**Skills used:** <names, or "none required">
**Relevant memory:** <entries consulted, past mistakes to avoid>

### Changes
1. <file/module>: <what will change and why>

### New files / removed files
- ...

### Risks and impact
- <what could break, what depends on this>

### Verification plan
- <exact commands that will prove it works>

### Memory updates
- <what will be added to the memory file>

### Proposed commit(s)
- `<type(scope): specific message>`

### Out of scope
- <things deliberately not touched>
```

### Step 4: STOP and Wait for Approval (Critical Rule)
> [!CAUTION]
> **DO NOT modify project code before explicit user approval.**
> Reading files and running read-only status checks are permitted before approval. File creations, code replacements, and database mutations are strictly prohibited until the user says "proceed", "approved", or equivalent.

### Step 5: Implement Within Plan
- Make small, surgical, coherent changes.
- Never commit secrets, credentials, or `.env` files.
- Never run destructive commands (`git reset --hard`, `git push --force`, dropping tables).

### Step 6: Verify
Never claim something works without executing verification commands:
- **Backend:** `npm test` inside `backend/` (must pass 100% of test suites).
- **AI Service:** `uv run pytest` inside `UviAge/`.
- **Frontend:** `npm run build` inside `frontend/`.

### Step 7: Update Memory, Commit & Push
1. Append entry to `docs/PROJECT_MEMORY.md` under **Change Log** (`CHG-xxx`).
2. Update **Current Project State** and mark Backlog item (`BKL-xxx`) complete.
3. Update `context/03_IMPLEMENTATION_STATUS_TRACKER.md`.
4. Stage only specific files: `git add <file1> <file2>`. Avoid blind `git add .`.
5. Commit using conventional format: `<type>(<scope>): <message>` with `Refs: CHG-xxx`.
6. Run `git pull --rebase` immediately before pushing.
7. Push: `git push origin main`.
8. Report exact commit hash, verification results, and next available steps to user.

---

## 3. Available Agent Skills

| Skill Name | Path | Trigger & Usage |
| :--- | :--- | :--- |
| `project-memory-workflow` | `.agent/skills/project-memory-workflow/SKILL.md` | **Mandatory for EVERY instruction.** Manages approval gates, memory append, verification, and commits. |
| `fix-errors` | `.agent/skills/fix-errors/SKILL.md` | Triggered by user command `"fix errors"`, broken ports, runtime crashes, or test failures. Systematically diagnoses root causes across terminals. |
