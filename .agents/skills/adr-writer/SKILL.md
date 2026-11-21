---
name: adr-writer
description: "Authors concise, immutable Architecture Decision Records (ADRs) in docs/adr/ during Phase 5 with trade-off analysis and architectural reduction checks."
version: "1.0.0"
source: "first-party"
license: "Apache-2.0"
category: "core-sdlc"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file, edit_file]
dependencies: []
security_scope: "workspace-write"
---

# ADR Writer — Architecture Decision Record Skill

## 1. Purpose
Capture consequential technical decisions, considered alternatives, and trade-offs in `docs/adr/ADR-xxxx-<slug>.md` during **Phase 5 (`docs/WORKFLOW.md`)**.

## 2. When to Activate
- Introducing or replacing a third-party dependency, framework, or runtime.
- Changing database schemas, storage formats, or state handoff contracts.
- Modifying authentication, authorization, encryption, or security boundaries.
- Altering public API contracts, CLI flags, or cross-module boundaries.

## 3. Execution Protocol
1. Check existing files in `docs/adr/` to determine the next sequential 4-digit number (`ADR-0004`, etc.).
2. Copy structure from [`templates/ADR.template.md`](../../../.aief/templates/ADR.template.md).
3. **Mandatory Baseline Comparison:** Always evaluate a "Minimal / Standard Library Baseline" option alongside third-party libraries (Architectural Reduction principle).
4. Specify deterministic verification criteria in Section 5 (`Compliance & Verification`) so `code-reviewer` and `scripts/validate.py` can check adherence.
5. If replacing a previous decision, keep the old ADR file intact, update its status to `Superseded by ADR-YYYY`, and reference it in the new ADR.

## 4. Validation Criteria
- ADR file matches `templates/ADR.template.md` sections (`Context`, `Considered Options`, `Decision Outcome`, `Consequences`, `Compliance`).
- Human approval recorded at `Gate-02`.
