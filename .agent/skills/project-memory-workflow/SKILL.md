---
name: project-memory-workflow
description: Mandatory workflow for EVERY task in this repository. Use at the start of every user instruction, without exception. Reads and updates the shared project memory file (docs/PROJECT_MEMORY.md), checks whether a specialised skill is needed (creating it first if missing), drafts an implementation plan for user approval, implements only after approval, verifies that the project works, and pushes to GitHub only after verification with a specific commit message.
---

# Project Memory Workflow

This skill governs how you work in this repository. It exists so that several people and several agents can collaborate on one codebase without repeating mistakes, losing context, or pushing broken code.

**This skill applies to every instruction the user gives, including small ones.** Do not skip steps because a task looks trivial. For trivial tasks, keep each step short, but still do it.

---

## The Memory File

- **Path:** `docs/PROJECT_MEMORY.md` (create it from the template at the bottom of this file if it does not exist).
- **Purpose:** the single shared record of what has been changed, what went wrong, what is planned, and what the project's current state is.
- **It is committed to the repo** so every collaborator and agent reads the same history.
- **It is append-oriented.** Never delete or rewrite previous entries. Corrections are new entries that reference the old one (e.g. "Correction to CHG-014").

---

## Workflow (follow in order)

### Step 0: Sync and read memory (always first)

1. Run `git status` and `git pull --rebase` (if the working tree is dirty, tell the user and do not pull over their changes).
2. Read `docs/PROJECT_MEMORY.md` fully. Pay particular attention to:
   - **Current Project State** (what works, what is broken)
   - **Mistakes and Lessons** (do not repeat them)
   - **Future Implementation / Backlog** (check whether the new instruction overlaps or conflicts)
   - **Open Decisions** and **Conventions**
3. Read any other project docs the memory file points to (architecture, API spec, UI spec) that are relevant to the instruction.
4. State briefly to the user what you found that is relevant (two to five lines). Example: "Memory notes that booking overlap checks live in `bookingEngine.js` and that a previous attempt to edit status directly caused CHG-009's bug."

### Step 1: Understand the instruction

- Restate the request in one or two sentences.
- If it is ambiguous in a way that changes the design, ask up to three focused questions. If the ambiguity is minor, state your assumption and proceed to the plan.
- Check the request against memory: does it contradict a recorded decision? If yes, point it out in the plan.

### Step 2: Skill check (before planning)

For each instruction, decide which specialised skills are relevant (for example: frontend design, API design, database migration, testing, security review, documentation, deployment, document or spreadsheet generation, git/release handling).

1. Look in the repository's skills folder (`.agent/skills/` or the folder your agent platform uses, e.g. `.claude/skills/`) and in any globally available skills.
2. **If a relevant skill exists:** read its `SKILL.md` and follow it.
3. **If a relevant skill is required but missing:**
   - Create the skill first (use a `skill-creator` skill if one is available; otherwise write a `SKILL.md` with frontmatter `name` and `description`, followed by clear step-by-step instructions, conventions, and verification steps drawn from this project's actual stack and memory file).
   - Keep it focused on one capability. Do not create a skill for a one-off action that will not recur.
   - Skill files are shared with the team, so write them to be reusable, specific to this repo's conventions, and free of secrets.
   - Record the new skill in the memory file under **Skills Registry**.
   - Commit it separately (see Step 7) with a message like `docs(skills): add api-endpoint-design skill for Express route conventions`. Creating a skill does not change application behaviour, so it does not need plan approval, but tell the user you created it and why.
4. **If no skill is needed:** say so in one line ("No additional skill required; this is a small config change").

### Step 3: Draft the implementation plan (using the skill)

Write the plan in the chat using the skill(s) from Step 2. The plan must contain:

```
## Implementation Plan: <short title>

**Request:** <restated in one or two sentences>
**Skills used:** <names, or "none required">
**Relevant memory:** <entries consulted, past mistakes to avoid>

### Changes
1. <file/module>: <what will change and why>
2. ...

### New files / removed files
- ...

### Risks and impact
- <what could break, what depends on this, migrations or data impact>

### Verification plan
- <exact commands and manual checks that will prove it works>

### Memory updates
- <what will be added to the memory file>

### Proposed commit(s)
- `<type(scope): specific message>`

### Out of scope
- <things deliberately not touched>
```

### Step 4: STOP and wait for approval

- **Do not modify project code until the user explicitly approves the plan** ("approved", "go ahead", "yes proceed", or equivalent).
- If the user requests changes, revise the plan and ask again.
- If the user's reply is ambiguous (for example only a question), answer it and re-confirm approval.
- Exception: reading files, running read-only commands, and creating skill files (Step 2) are allowed before approval.

### Step 5: Implement

- Work only within the approved plan. If you discover that the plan is insufficient (new files, different approach, larger risk), pause, explain, and get approval for the amended plan.
- Make small, coherent changes. Follow conventions recorded in the memory file and the relevant skills.
- Do not commit secrets, `.env` files, credentials, large binaries, or generated build output unless the project already tracks them.
- Do not run destructive commands (`git reset --hard`, `git push --force`, dropping databases, deleting directories) without explicit user permission.

### Step 6: Verify (required before any push)

You must actually verify the project, not assume. Use the verification plan, and at minimum:

1. **Install and build:** dependencies install cleanly; the project builds/compiles.
2. **Static checks:** lint and type checks, if configured.
3. **Tests:** run the existing test suite plus any tests you added for the change.
4. **Run it:** start the application (backend, frontend, AI service as applicable) and exercise the changed behaviour with a real request or interaction. Check logs for errors.
5. **Regression check:** confirm the core flows listed in the memory file's "Current Project State" still work.

Record the outcome honestly:

- **Verified:** list what you ran and the results.
- **Partially verified:** state exactly what could not be verified and why (for example, no database available in this environment).
- **Failed:** fix and re-run. If you cannot fix it, do not push; explain the failure and the options.

**If verification is partial or failed, do not push.** Tell the user, update the memory file with the failure, and ask how to proceed. Never describe something as working unless you observed it working.

### Step 7: Update memory, then commit and push

1. **Update `docs/PROJECT_MEMORY.md`** in the same change set (see formats below):
   - Add a **Change Log** entry.
   - Add any **Mistakes and Lessons** entry (including mistakes made during this task and how they were fixed).
   - Update **Current Project State** and the **Backlog / Future Implementation** list (move finished items, add newly discovered work).
   - Update **Skills Registry** and **Open Decisions** if relevant.
2. **Stage only relevant files** (`git add <paths>`; avoid `git add .` unless you have inspected `git status`).
3. **Commit with a specific message** (see rules below).
4. **Push only if Step 6 reported "Verified"** (or the user explicitly overrides after you stated the unverified parts).
   - `git pull --rebase` immediately before pushing. Resolve conflicts carefully; for the memory file keep both sides' entries (see Collaboration Rules).
   - Push to the working branch. Never force-push. Do not push directly to `main`/`master` if the repo uses pull requests; push a feature branch and tell the user to open a PR (or open it if tooling allows and the user wants that).
5. Report to the user: what changed, what was verified and how, the commit hash and message, and anything left undone.

---

## Commit Message Rules

Format: `<type>(<scope>): <specific description of what changed and why>`

- **Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`, `security`.
- **Scope:** the module, endpoint, or page affected (e.g. `bookings`, `eligibility`, `checkin-page`).
- **Subject:** imperative mood, at most about 72 characters, naming the actual behaviour changed.
- **Body (when the change is more than trivial):** what changed, why, how it was verified, and the memory entry ID (e.g. `Refs: CHG-021`).

Good:
- `fix(bookings): reject overlapping approvals using row lock to stop double-booking`
- `feat(eligibility): return per-check pass/fail with next-action links for training and documents`
- `docs(memory): record CHG-021 and lesson on direct status updates bypassing transition()`

Bad (never use): `update`, `fixes`, `changes`, `wip`, `final`, `misc`, `done`, or messages that describe nothing specific.

One logical change per commit. If a task has several independent parts, make several commits, each verified.

---

## Memory Entry Formats

### Change Log entry (newest first)
```
### CHG-023 | 2026-10-28 | <short title>
- **Requested by:** <user / instruction summary>
- **Skills used:** <names or none>
- **What changed:** <files/modules and behaviour>
- **Why:** <reason / decision>
- **Verification:** <commands run, results; or "NOT VERIFIED: reason">
- **Commit:** <hash> `<message>`
- **Follow-ups:** <anything left>
```

### Mistakes and Lessons entry (newest first)
```
### MST-007 | 2026-10-28 | <short title>
- **What went wrong:** <symptom>
- **Root cause:** <why>
- **Fix:** <what resolved it, or "unresolved">
- **Rule going forward:** <specific instruction to avoid a repeat>
- **Related:** CHG-0xx
```
Record mistakes by any collaborator or agent, factually and without blame. Include failed approaches and dead ends, because they save time for the next person.

### Backlog entry
```
- [ ] BKL-012 (P1) <future implementation, one line> | Depends on: <items> | Source: <CHG/MST/user>
- [x] BKL-009 done in CHG-023
```

---

## Collaboration Rules

- Always `git pull --rebase` before reading memory and before pushing, because others may have updated it.
- Entries have unique, incrementing IDs. If two collaborators create the same ID, the later one renumbers and notes it.
- When resolving a memory-file merge conflict, **keep both sides' entries**, order by date, and fix the numbering. Never discard another collaborator's entry.
- Do not edit another person's past entries except to add a clearly marked correction.
- Keep entries factual and short. The memory file should stay readable; when a section grows very large, move old entries into `docs/memory-archive/<year-month>.md` and leave a pointer (do not delete them).
- Use fictional data only. Never record secrets, tokens, passwords, or personal data in the memory file.
- If the repo uses branches/PRs, mention the branch name in the Change Log entry.

---

## Hard Rules (never violate)

1. Read the memory file before every task, and update it after every task that changes the repo.
2. Never modify project code before the user approves the plan.
3. Never push unverified code. Never claim verification you did not perform.
4. Never use vague commit messages.
5. Never force-push, rewrite shared history, or delete branches without explicit user permission.
6. Never commit secrets or personal data.
7. Never delete history from the memory file.
8. If a skill is needed and missing, create it first, then plan with it.
9. If something is uncertain or blocked, say so plainly and ask, rather than guessing silently.

---

## Short-form Checklist (print at the start of each task)

```
[ ] Pulled latest, read PROJECT_MEMORY.md
[ ] Checked/created relevant skills
[ ] Plan drafted -> user approved
[ ] Implemented within plan
[ ] Verified (build, tests, run, regression) and recorded results
[ ] Memory updated (CHG, MST, BKL, State, Skills)
[ ] Specific commit made
[ ] Pull --rebase, then pushed (only if verified)
[ ] Reported result to user
```

---

## Template: `docs/PROJECT_MEMORY.md`

Create this file if it is missing.

```markdown
# PROJECT MEMORY

> Shared record for all collaborators and agents. Read before every task. Update after every task. Append, never erase.

## 1. Project Overview
- **Name:** <project name>
- **Goal:** <one paragraph>
- **Stack:** <frontend, backend, AI service, database (TBD or chosen), deployment>
- **Key docs:** <links to spec files, e.g. docs/BACKEND_API_SPEC.md, docs/FRONTEND_DESIGN_SPEC.md>
- **Repo layout:** <short tree or description>

## 2. Conventions
- Branching: <e.g. feature/<name>, PRs into main>
- Code style / lint / formatting: <tools>
- API response envelope, error codes: <pointer>
- Naming, folder structure: <pointer>
- Demo data rule: all data is fictional; simulated features are labelled "Demo".

## 3. Current Project State
| Area | Status | Notes |
|---|---|---|
| Backend API | Not started / In progress / Working | |
| Frontend | | |
| AI service | | |
| Database | | |
| Tests | | |
| Deployment | | |

**How to run:** <commands>
**How to verify:** <commands/smoke test steps>
**Core flows that must keep working:** <list>

## 4. Open Decisions
- [ ] DEC-001 <decision pending> | Owner: <name> | Options: <...>
- [x] DEC-002 <decided> -> <outcome and date>

## 5. Skills Registry
| Skill | Path | Purpose | Added in |
|---|---|---|---|
| project-memory-workflow | .agent/skills/project-memory-workflow/SKILL.md | Task workflow, memory, verification, commits | CHG-001 |

## 6. Change Log (newest first)
<entries using the Change Log format>

## 7. Mistakes and Lessons (newest first)
<entries using the Mistakes format>

## 8. Backlog / Future Implementation
<entries using the Backlog format, grouped P0 / P1 / P2>

## 9. Verification History (optional)
| Date | Commit | Build | Tests | Run check | Notes |
|---|---|---|---|---|---|
```
