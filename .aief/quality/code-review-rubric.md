# Code Review Rubric (`quality/code-review-rubric.md`)

**Applies To:** Phase 10 (`code-reviewer`)  

---

## 1. Severity Classification

| Severity | Definition | Action Required |
| :--- | :--- | :--- |
| **`BLOCKER`** | Security vulnerability, leaked secret, failing test, missing `AC-xx` implementation, data-loss bug, or broken build | **Blocks Phase 11/13.** Must be fixed in Phase 9 and re-reviewed. |
| **`MAJOR`** | Architectural boundary violation (`ADR` breach), missing error handling, untested edge case, or circular dependency | **Blocks Phase 11/13.** Must be fixed or explicitly waived by human user. |
| **`MINOR`** | Suboptimal naming, minor duplication, or documentation clarity issue | Fix before release or track in backlog. |
| **`NIT`** | Purely stylistic preference not covered by automated formatter | Optional; never block progression on `NIT` items. |

---

## 2. Mandatory Review Checklist

1. **Specification Traceability:** Does every `AC-xx` in `docs/specs/03-specification.md` map to both production logic and an automated test assertion?
2. **ADR & Architecture Compliance:** Does the diff respect all active ADRs in `docs/adr/` and passes `graphify update .` without introducing god-nodes or circular imports?
3. **Security Hygiene:** Are all external inputs validated? Are file paths sanitized against traversal? Are zero secrets or tokens present?
4. **Error Handling:** Are exceptions handled explicitly with actionable error messages rather than bare `except: pass` blocks?
5. **Anti-Slop Check:** Are comments, docstrings, and markdown changes concise and factual (`skills/core/anti-slop/SKILL.md`)?
