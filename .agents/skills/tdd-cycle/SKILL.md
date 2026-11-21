---
name: tdd-cycle
description: "Enforces strict Red-Green-Refactor Test-Driven Development during Phase 9 implementation with specification traceability and circuit-breaker recovery."
version: "1.0.0"
source: "first-party"
license: "Apache-2.0"
category: "core-sdlc"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file, edit_file, run_command]
dependencies: []
security_scope: "workspace-write"
---

# TDD Cycle — Red-Green-Refactor Protocol

## 1. Purpose
Guarantee that every line of production code in **Phase 9** is justified by an automated test mapped to an approved acceptance criterion (`AC-xx` in `docs/specs/03-specification.md`).

## 2. Execution Protocol

### Step 1: RED (Write a Failing Test First)
1. Select the target acceptance criterion (`AC-xx`) from `docs/specs/03-specification.md` and task from `docs/plans/07-task-backlog.json`.
2. Write a focused unit or integration test asserting the expected `Given / When / Then` behavior.
3. Run the test runner and verify the test **fails for the expected reason** (not due to syntax or import errors).

### Step 2: GREEN (Make the Test Pass Minimalistically)
1. Write the minimum production code necessary to make the failing test pass.
2. Do not add speculative abstractions or unrequested features.
3. Run the test suite and confirm the new test and all existing tests pass.

### Step 3: REFACTOR (Clean Up Safely)
1. Remove duplication, improve naming, enforce strict typing, and satisfy linter rules.
2. Re-run the full test suite to verify zero regressions.

## 3. Circuit-Breaker Rule
If 3 consecutive attempts fail to turn a RED test GREEN:
1. Stop modifying production files immediately.
2. Revert broken uncommitted edits (`git checkout -- <file>`).
3. Document the blocker in `.framework-state/` and escalate to `software-architect` or the user.

## 4. Validation Criteria
- Test runner exits `0` with 100% passing assertions.
- Zero disabled/skipped tests (`@skip`, `xit`, `test.skip`) introduced to bypass failures.
