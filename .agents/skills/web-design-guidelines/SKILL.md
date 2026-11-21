---
name: web-design-guidelines
description: "Enforces WCAG AA/AAA accessibility, semantic HTML/ARIA, responsive layout grids, typography scales, and interaction states for web UI implementation."
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

# Web Design Guidelines — Frontend UX & Accessibility Skill

## 1. Purpose
Provide systematic UI/UX engineering standards when building or reviewing web applications, dashboards, or component libraries. Kept in `optional/frontend-design/` so backend-only services never load frontend rules.

## 2. Core Engineering Rules
1. **Accessibility First (WCAG 2.1 AA Minimum):**
   - Use semantic HTML elements (`<main>`, `<nav>`, `<button>`, `<dialog>`) before adding `role` attributes.
   - Maintain contrast ratio $\ge 4.5:1$ for normal text and $\ge 3.0:1$ for large text/UI controls.
   - Ensure full keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Escape`) with visible `:focus-visible` outlines.
2. **Responsive Layout & Spacing:**
   - Use a consistent `4px` / `8px` spacing scale (`0.25rem` increments).
   - Verify layouts at `320px` (mobile), `768px` (tablet), `1024px` (laptop), and `1440px` (desktop) without horizontal overflow.
3. **Complete Interaction States:**
   - Every async view or interactive control must implement 5 states: `default`, `hover/focus`, `loading/skeleton`, `empty`, and `error`.

## 3. Validation Criteria
- Zero missing form labels, unlabelled icon buttons, or contrast violations; verified in Phase 11 via Playwright / `agent-browser`.
