---
name: grill-me
description: "Structured stakeholder interview methodology for Phase 2 requirement clarification that resolves ambiguities, edge cases, and non-goals before coding."
version: "1.0.0"
source: "first-party"
license: "Apache-2.0"
category: "core-sdlc"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file, ask_question]
dependencies: []
security_scope: "workspace-write"
---

# Grill Me — Requirement Clarification Skill

## 1. Purpose
Prevent premature architecture and implementation by systematically challenging assumptions, identifying edge cases, and locking scope boundaries with the human stakeholder during **Phase 2 (`docs/WORKFLOW.md`)**.

## 2. When to Activate
- Starting a new project, feature, or significant refactoring (`Phase 2`).
- Whenever `docs/specs/01-discovery-brief.md` contains `[AMBIGUOUS]` items or unverified domain assumptions.

## 3. Execution Protocol
1. **Inspect Context First:** Read existing codebase files and `graphify-out/GRAPH_REPORT.md` so you never ask a question the repository already answers.
2. **Identify High-Leverage Unknowns:** Group ambiguities into:
   - Scope & Non-Goals (what is explicitly excluded).
   - Data Model & State Ownership (source of truth, persistence, retention).
   - Failure Modes & Edge Cases (timeouts, invalid input, partial failure rollback).
   - Security & Access Boundaries (authentication, permissions, rate limits).
3. **Batch Questions (3 to 5 Max per Turn):**
   - Present concrete multiple-choice options (`ask_question` tool where available, or numbered markdown options).
   - **Always place a recommended default first** (`(Recommended) <Option> — <1-sentence technical rationale>`).
4. **Persist Decisions:** Write all confirmed answers and locked constraints to `docs/specs/02-clarified-requirements.md`.

## 4. Validation Criteria
- Zero `[AMBIGUOUS]` or `[TBD]` markers remain in `docs/specs/02-clarified-requirements.md`.
- User explicitly approves the clarified requirements (`Gate-01a`) before Phase 3 begins.
