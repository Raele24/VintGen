---
name: anti-slop
description: "Eliminates predictable AI writing patterns, promotional filler, vague adjectives, and bloated boilerplate from documentation, specs, and UI copy."
version: "1.0.0"
source: "https://hvpandya.com/stop-slop"
license: "MIT"
category: "token-optimization"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, edit_file]
dependencies: []
security_scope: "workspace-write"
---

# Anti-AI Slop — High-Signal Technical Prose Skill

## 1. Purpose
Enforce clear, direct, verifiable engineering prose across specifications (`Phase 3`), ADRs (`Phase 5`), code comments (`Phase 9`), review reports (`Phase 10`), and documentation (`Phase 14`).

## 2. Banned AI Slop Patterns
1. **Banned Promotional Filler Words:** Never use *delve, tapestry, testament, realm, symphony, beacon, landscape, pivotal, underscore, harness, leverage (as filler verb), seamless, cutting-edge, game-changing, robust (without metric), comprehensive (without scope list)*.
2. **Banned Negative Parallelisms:** Avoid formulaic *"It's not just X — it's Y"* or *"More than a tool, it is a paradigm."* State what the component does directly.
3. **Banned Superficial Participles:** Avoid trailingclauses like *"...ensuring seamless integration and fostering scalability."* Replace with concrete mechanics or delete.
4. **Banned Empty Hedging:** Remove *"It is important to note that"*, *"In conclusion"*, *"Needless to say"*.

## 3. Positive Engineering Style Rules
- **Active Voice & Imperative Verbs:** `"Run python scripts/validate.py"` instead of `"Validation can be performed by running..."`.
- **Quantified Claims:** Replace `"fast startup"` with `"cold start < 50ms"`; replace `"minimal dependencies"` with `"zero third-party pip packages (Python 3.10+ stdlib only)"`.
- **Exact Identifiers:** Always wrap file paths, CLI flags, environment variables, and function names in backticks.

## 4. Validation Criteria
- Zero banned filler phrases in generated markdown files. Every paragraph communicates a concrete technical fact, constraint, or instruction.
