# Stage 3 Runbook: Planning, Decomposition & Delegation (Phases 6–8)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phases 6, 7, 8)  
**Responsible Role:** [`agents/planner-orchestrator.md`](../agents/planner-orchestrator.md)  
**Required Skills:** [`find-skills`](../../.agents/skills/find-skills/SKILL.md), [`anti-slop`](../../.agents/skills/anti-slop/SKILL.md)  
**Human Approval Gates:** `Gate-03` (Implementation Plan Approval)  

---

## Step 1: Phase 6 — Project Planning
1. Read `docs/specs/03-specification.md` and `docs/adr/ADR-*.md`.
2. Author `docs/plans/06-implementation-plan.md` defining milestones, dependency order, rollback points, and the **Category A / B / C** task classification matrix.
3. Pause at **`Gate-03`** for human approval of the implementation plan.

## Step 2: Phase 7 — Atomic Task Decomposition
1. Break the approved plan into atomic TDD tasks in `docs/plans/07-task-backlog.json`.
2. Every task must specify: `task_id`, `title`, `spec_ac_refs`, `target_files`, `test_files`, `verification_command`, and `dependencies`.
3. Ensure parallel tasks have strictly disjoint `target_files`.

## Step 3: Phase 8 — Agent Assignment & Subagent-First Delegation
1. Write `.framework-state/08-assignments.json` assigning each task to its specialist role (`backend-engineer`, `frontend-engineer`, `data-engineer`, `ai-engineer`, `devops-release-engineer`, or `implementation-engineer` for shared/CLI tasks) and listing the exact `SKILL.md` files to load.
2. For `Category B/C` tasks, spawn isolated role subagents (`invoke_subagent` / `swarm` / `.claude/agents/<role>.md` / `.github/agents/<role>.agent.md`); run up to 3–5 workers in parallel only when `target_files` are strictly disjoint.
3. Write `.framework-state/handoffs/phase-08-handoff.json`.
