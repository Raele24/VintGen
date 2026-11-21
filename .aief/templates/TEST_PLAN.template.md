# Test & Verification Plan (`TEST_PLAN.template.md`)

- **Feature / Release:** `<name>`
- **Author Role:** `qa-engineer`
- **Upstream Spec:** `docs/specs/03-specification.md`

---

## 1. Test Pyramid Matrix

| Test Layer | Runner / Tool | Target Scope | Mapped Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | `<pytest / unittest / vitest / dotnet test>` | Pure functions, domain logic, edge cases | `AC-01`, `AC-02` |
| **Integration Tests** | `<runner>` | Filesystem, DB, CLI, API boundary contracts | `AC-03` |
| **E2E / Browser Tests** | `<Playwright / browser subagent / N/A>` | Critical user journeys | `AC-04` |
| **Security & Static Checks** | `scripts/validate.py`, `<audit tool>` | Secrets, schemas, dependency CVEs | `NFR-Sec` |

---

## 2. Edge Cases & Negative Scenarios
- [ ] Empty / null / missing required inputs
- [ ] Boundary values (`0`, `-1`, `MAX_INT`, oversized payloads)
- [ ] Path traversal / special characters / Windows vs. POSIX separators
- [ ] Permission / authentication denial

---

## 3. Execution Commands
```bash
# Unit & Integration
python -m unittest discover -s tests -v

# Framework & Schema Validation
python scripts/validate.py
```
