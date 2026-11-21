---
name: canvas-design
description: "Token-driven visual architecture (primitive -> semantic -> component), HTML/Canvas layout composition, and structured slide/diagram generation."
version: "1.0.0"
source: "first-party"
license: "Apache-2.0"
category: "ui-ux-design"
tier: "optional-frontend"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file, edit_file]
dependencies: []
security_scope: "workspace-write"
---

# Canvas Design — Three-Layer Design Token & Visual Layout Skill

## 1. Purpose
Standardize design token hierarchies, interactive HTML/Canvas visual artifacts, and presentation layouts without hardcoded magic CSS values.

## 2. Three-Layer Token Architecture
1. **Layer 1 — Primitive Tokens:** Raw palette values and scales (`--color-slate-900`, `--space-4`).
2. **Layer 2 — Semantic Tokens:** Intent-based aliases (`--surface-primary`, `--text-muted`, `--border-focus`) supporting light and dark themes.
3. **Layer 3 — Component Tokens:** Scoped component bindings (`--card-bg: var(--surface-primary)`).

## 3. Validation Criteria
- UI stylesheets and HTML/Canvas artifacts reference semantic or component CSS variables rather than scattered hardcoded hex codes.
