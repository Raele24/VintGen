---
name: ponytail
description: "Enforces the 7-rung YAGNI decision ladder to eliminate over-engineering, speculative abstractions, and unnecessary code while preserving security and correctness."
version: "1.0.0"
source: "https://github.com/DietrichGebert/ponytail"
license: "MIT"
category: "token-optimization"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, edit_file, write_file]
dependencies: []
security_scope: "workspace-write"
---

# Ponytail — YAGNI & Minimalist Implementation Skill

> **Upstream Attribution:** Adapted from [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert, licensed under the **MIT License**.

## 1. Purpose
Combat LLM over-engineering, speculative boilerplate, and dependency bloat by forcing coding agents to evaluate a strict **7-Rung YAGNI Decision Ladder** before writing a single line of code.

*Core Principle:* **The best code is the code you never wrote.**

## 2. Activation Conditions
- Automatically active during **Phase 5 (Architecture & ADRs)**, **Phase 9 (TDD Implementation)**, and **Phase 10 (Code Review)**.
- Explicitly triggered when the user says `"ponytail"`, `"apply YAGNI"`, `"simplest solution"`, or `"minimal diff"`.

## 3. The 7-Rung Decision Ladder

Before creating any file, class, abstraction, helper, or dependency, step down this ladder in order and stop at the first rung that solves the verified requirement:

1. **Rung 1 — Does this need to exist at all? (YAGNI)**
   - If the requirement is hypothetical, future-looking, or not traced to an approved acceptance criterion (`AC-xx` in `docs/specs/03-specification.md`), **skip it completely**.
2. **Rung 2 — Is it already in this codebase?**
   - Search existing modules (`graphify query` or `read_file`). Reuse or parameterize an existing function instead of writing a duplicate.
3. **Rung 3 — Does the language standard library do it?**
   - Use built-in stdlib modules (`pathlib`, `json`, `urllib`, `unittest`, `crypto`, `Intl`, `fetch`) instead of writing custom helpers or adding packages.
4. **Rung 4 — Is it a native platform/framework feature?**
   - Use native browser/OS/framework primitives (HTML `<dialog>`, CSS Grid, native `FormData`, Angular `signal()`, PostgreSQL constraints) before writing JS/code workarounds.
5. **Rung 5 — Does an already-installed dependency solve it?**
   - Check `package.json`, `pyproject.toml`, or `.csproj`. Use what is already in the lockfile before proposing a new dependency.
6. **Rung 6 — Can it be a clear one-liner or inline expression?**
   - Do not create a 40-line `AbstractStrategyFactory` or a single-use helper file for logic used in exactly one place. Three similar lines of code are better than a premature abstraction.
7. **Rung 7 — Write the strict minimum that passes the test.**
   - Write only the code needed to turn the failing Phase 9 test **GREEN**. Zero unused parameters, zero dead feature flags, zero speculative interfaces.

## 4. Non-Negotiable Safety & Correctness Boundaries (Never Cut These)

Ponytail cuts **bloat**, never **safety**. You must **never** use YAGNI as an excuse to omit:
- Input validation and sanitization at trust boundaries (user input, HTTP payloads, CLI args, external files).
- Authentication, authorization, and permission checks.
- Parameterized SQL/database queries and path-traversal checks.
- Explicit error handling and resource cleanup (`try/finally`, `with` context managers).
- Automated unit/regression tests required by Phase 9 (`tdd-cycle`).
- Accessibility attributes (semantic HTML, ARIA labels, keyboard focus).

## 5. Security Considerations
- **Scope:** `workspace-write`. Contains pure engineering rules; executes no external shell scripts or network calls.
- **Validation:** During Phase 10 (`code-reviewer`), flag any new class, wrapper, or dependency that violates Rungs 1–6 as a `MINOR` or `MAJOR` review finding.
