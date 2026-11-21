# Stage 4 Runbook: Test-Driven Development & Implementation (Phase 9)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phase 9)  
**Responsible Roles:** [`backend-engineer`](../agents/backend-engineer.md), [`frontend-engineer`](../agents/frontend-engineer.md), [`data-engineer`](../agents/data-engineer.md), [`ai-engineer`](../agents/ai-engineer.md), [`devops-release-engineer`](../agents/devops-release-engineer.md), [`implementation-engineer`](../agents/implementation-engineer.md)  
**Required Skills:** [`tdd-cycle`](../../.agents/skills/tdd-cycle/SKILL.md), plus task-specific domain skills  

---

## Step 1: Load Clean Context
1. Read `docs/specs/03-specification.md`, `docs/adr/ADR-*.md`, and the assigned task in `docs/plans/07-task-backlog.json`.
2. Load [`skills/core/tdd-cycle/SKILL.md`](../../.agents/skills/tdd-cycle/SKILL.md) and any assigned domain skills (e.g., `web-design-guidelines`).

## Step 2: Execute Red-Green-Refactor Loop
For each atomic task:
1. **RED:** Write the automated unit/component test in `test_files` verifying the target `AC-xx`. Run `verification_command` and confirm it fails as expected.
2. **GREEN:** Implement the minimal production logic in `target_files` to make the test pass.
3. **REFACTOR:** Clean up code structure, typing, and lint warnings while keeping all tests green.

## Step 3: Circuit Breaker & Handoff
1. If any test fails 3 consecutive fix attempts, stop immediately, revert uncommitted broken mutations, and escalate.
2. Once all unit tests and linters pass, write `.framework-state/handoffs/phase-09-handoff.json` and transition to Stage 5 (`05-review-qa-and-security.md`).
