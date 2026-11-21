# Definition of Done (`quality/definition-of-done.md`)

A feature, bugfix, or milestone in the **AI Engineering Framework** is **Done** only when all of the following conditions are verified:

- [ ] **Clarified & Specified:** Ambiguities resolved (`Phase 2`) and `docs/specs/03-specification.md` approved (`Gate-01b`).
- [ ] **Architecture Documented:** Consequential technical choices recorded in `docs/adr/ADR-xxxx.md` (`Gate-02`).
- [ ] **TDD Verified:** Unit, integration, and edge-case tests written and passing (`0` failures, `0` skipped target tests).
- [ ] **Independent Code Review Passed:** `.framework-state/10-review-report.md` records zero unresolved `BLOCKER` or `MAJOR` findings (`Phase 10`).
- [ ] **Security Validated:** Secret scan, static security review, and dependency checks pass with zero critical/high findings (`Phase 12`).
- [ ] **Adapters & Docs Synced:** `python scripts/sync_adapters.py --check` and `python scripts/validate.py` return exit code `0` (`Phase 14`).
- [ ] **Knowledge Graph Updated:** `graphify-out/` updated via `graphify .` or `graphify update .` when Graphify is installed.
- [ ] **Human Release Gate Approved:** `Gate-04` approved before any remote push or release publication (`Phase 13`).
