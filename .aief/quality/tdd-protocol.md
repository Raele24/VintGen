# Test-Driven Development Protocol (`quality/tdd-protocol.md`)

**Applies To:** Phase 9 (`implementation-engineer`) and Phase 11 (`qa-engineer`)  

---

## 1. The Non-Negotiable Red-Green-Refactor Loop

1. **RED — Write the Failing Test First:**
   - Every task in `docs/plans/07-task-backlog.json` references one or more acceptance criteria (`AC-xx`) from `docs/specs/03-specification.md`.
   - Write an automated test that exercises the target interface and asserts the `Then` postcondition of `AC-xx`.
   - Execute the test runner and observe the test fail.
2. **GREEN — Minimal Implementation:**
   - Write only the production code required to satisfy the failing test.
   - Re-run the test suite and verify the test passes.
3. **REFACTOR — Structural Cleanliness:**
   - Eliminate code duplication, extract clear helper functions, verify strict type annotations, and run linters.
   - Re-run the full test suite to verify zero regressions.

---

## 2. Test Quality Rules

- **Determinism:** Unit tests must not depend on wall-clock sleep timers, live external internet endpoints, or execution order.
- **Boundary Coverage:** Every public function or CLI command must test:
  1. Happy path with valid input.
  2. Edge/boundary values (empty collections, zero, maximum length).
  3. Invalid/malformed input and expected error handling.
- **No Self-Mocking:** Never mock the specific function or class under test. Use temporary directories (`tempfile.TemporaryDirectory`) for filesystem tests rather than brittle mocks.
