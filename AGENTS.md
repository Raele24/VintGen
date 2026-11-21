<!-- AUTO-GENERATED CONSUMER ADAPTER | Canonical Digest: b0a2dbeb02511f58 -->
# AI Engineering Framework — Universal Agent Instructions (`AGENTS.md`)

This repository is governed by the **AI Engineering Framework** and project-specific rules.
Follow these active instructions automatically without requiring per-turn file reminders.

## 1. Active Engineering Rules & Gates
- **Workflow Profile:** `standard`
- **Spec First ([`.aief/core/rules/engineering-principles.md`](./.aief/core/rules/engineering-principles.md)):** Clarify edge cases and lock testable acceptance criteria before production code.
- **TDD Discipline:** Write failing tests first (Red -> Green -> Refactor) before implementation.
- **Graphify First:** Query `graphify-out/graph.json` (`graphify query`) before broad directory greps; if missing on repos with >=15 files, run `graphify .` or report to the user if `graphify` CLI is not installed.
- **Filesystem Handoffs ([`.aief/core/rules/context-handoff-protocol.md`](./.aief/core/rules/context-handoff-protocol.md)):** Persist phase artifacts under `docs/` and handoff JSON under `.aief/state/handoffs/`.
- **Independent Code Review:** Evaluate git diff against specs and quality rubrics before release.
- **Subagent-First Delegation (`Category B/C`):** Spawn fresh specialist subagents from Section 3 (design/DB-BigData/BE/FE/AI/DevOps/QA/review/security) with disjoint `target_files` rather than executing every phase in one bloated context.
- **Active Approval Gates ([`.aief/core/rules/human-approval-gates.md`](./.aief/core/rules/human-approval-gates.md)):** `Gate-01a`, `Gate-01b`, `Gate-02`, `Gate-03`, `Gate-Sec`, `Gate-04`, `Gate-05`.
- **Security Guardrails ([`.aief/core/rules/security-guardrails.md`](./.aief/core/rules/security-guardrails.md)):** Never commit or echo secrets/tokens/keys; run `python .aief/scripts/validate.py --mode consumer` before finishing.
- **Self-Maintained Customizations:** Whenever you or the user modify `.aief/custom/` or `.aief/config.json`, automatically run `python .aief/scripts/compose.py` (which re-composes and validates consumer integrity in one step).

## Project Custom Instructions (Loaded Inline from `.aief/custom/`)

### Source: `.aief/custom/imported/AGENTS.md`
﻿# Mandatory Assistant Rules & Guidelines

These rules are mandatory and must be strictly adhered to across all tasks, modifications, code, and documentation:

1. **ZERO EMOJIS OR ICONS**:
   - Never use emojis, decorative icons, or unicode symbols (such as keys, rockets, sparkles, package icons, mobile icons, warning symbols, checkmark emojis, etc.) anywhere.
   - This applies to all code, commit messages, documentation, markdown files, PR descriptions, terminal output, and GitHub Release bodies. Keep everything telegraphic, clean, and professional.

2. **STRICT ENGLISH ONLY**:
   - Never use Italian for source code, variable names, comments, docstrings, documentation, commit messages, GitHub release notes, or pull requests unless explicitly instructed by the user for a localized end-user feature.
   - All repository assets and communications in artifacts/docs must be 100% English.

3. **COMPLETE PROVIDER & MARKETPLACE NEUTRALITY (NO GEMINI-FIRST, NO VINTED-FIRST)**:
   - **STRICT FORBIDDEN DIRECT REFERENCES**: Never use direct or exclusive references to "Gemini" or "Vinted" in code comments, docstrings, variable names, markdown export templates (such as `## Vinted Description`), or user-facing copy.
   - **Code & Comments Policy**: Always use neutral terms:
     - Use "AI vision model", "vision provider", or "selected AI engine" instead of "Gemini".
     - Use "Item Description", "Marketplace Description", "secondhand listing", or "item condition" instead of "Vinted Description" or "Vinted listing".
   - **Multi-Provider Neutrality**: VintGen supports Google Gemini, OpenAI, Anthropic Claude, and local offline Ollama. Treat all providers with equal standing across documentation, UI selectors, and code. Technical enum values like `'gemini' | 'openai' | 'claude' | 'ollama'` are permitted only where configuring or selecting providers.
   - **Multi-Marketplace Neutrality**: VintGen generates listings for all online secondhand marketplaces (such as eBay, Vinted, Subito, Wallapop, Depop, etc.). Generated descriptions, copy buttons, and export files must always be universal marketplace listings.
   - **The project brand name** is "VintGen". Outside of the brand name itself, avoid vendor-specific bias.

4. **NO AUTOMATIC GIT PUSH OR COMMIT**:
   - Never run `git push` or `git commit` autonomously. All git staging, committing, and pushing must be executed by the user.

5. **ALWAYS KEEP DOCUMENTATION SYNCHRONIZED**:
   - Review and update documentation (root README.md, package-specific READMEs, and relevant guides in docs/) on every modification, feature addition, platform release, or configuration change.
   - Keep all delivery channels (Web/PWA, Android APK, Windows Desktop, npm CLI, and local development) indexed, accurate, and easy to follow.
   - Ensure all documentation maintains strict English and zero emojis.

6. **NO AI BUZZWORDS OR MARKETING JARGON (USE PLAIN HUMAN LANGUAGE)**:
   - Never use marketing buzzwords, over-hyped AI terms, or promotional fluff (such as "Instant", "Multimodal Vision AI", "high-converting", "pricing corridors", "revolutionary", "state-of-the-art").
   - Write simple, clear, direct human sentences. Explain what the tool actually does so that anyone understands it immediately.

7. **NO `any` IN TYPESCRIPT**:
   - Never use `any` (including explicit `any`, `as any`, or `<any>`) in TypeScript files (`.ts`, `.tsx`, `.mts`, `.cts`), including tests.
   - Always use explicit types, interfaces, generics, `unknown` with type narrowing/guards, or proper utility types instead.

## 2. Active Stage Runbooks (`.aief/workflows/`)
- **Stage 1 (Phases 1-3) [active: 1,2,3]:** [`.aief/workflows/01-discovery-and-grill-me.md`](./.aief/workflows/01-discovery-and-grill-me.md)
- **Stage 2 (Phases 4-5) [active: 4,5]:** [`.aief/workflows/02-specification-and-adr.md`](./.aief/workflows/02-specification-and-adr.md)
- **Stage 3 (Phases 6-8) [active: 6,7,8]:** [`.aief/workflows/03-planning-and-decomposition.md`](./.aief/workflows/03-planning-and-decomposition.md)
- **Stage 4 (Phase 9) [active: 9]:** [`.aief/workflows/04-tdd-and-implementation.md`](./.aief/workflows/04-tdd-and-implementation.md)
- **Stage 5 (Phases 10-12) [active: 10,11,12]:** [`.aief/workflows/05-review-qa-and-security.md`](./.aief/workflows/05-review-qa-and-security.md)
- **Stage 6 (Phases 13-15) [active: 13,14,15]:** [`.aief/workflows/06-release-and-retrospective.md`](./.aief/workflows/06-release-and-retrospective.md)

## 3. Active Agent Roles
| Role ID | Title | Workflow Phases | Specification |
| :--- | :--- | :--- | :--- |
| `ai-engineer` | AI Systems, MCP Tooling & Evaluation Engineer | 9, 14 | [`.aief/agents/ai-engineer.md`](./.aief/agents/ai-engineer.md) |
| `backend-engineer` | Backend & API TDD Implementation Engineer | 9, 14 | [`.aief/agents/backend-engineer.md`](./.aief/agents/backend-engineer.md) |
| `code-reviewer` | Independent Code & Architecture Reviewer | 10 | [`.aief/agents/code-reviewer.md`](./.aief/agents/code-reviewer.md) |
| `data-engineer` | Database Architect & Big Data Engineer | 4, 5, 9, 14 | [`.aief/agents/data-engineer.md`](./.aief/agents/data-engineer.md) |
| `devops-release-engineer` | DevOps, CI/CD & Cloud Release Engineer | 9, 13 | [`.aief/agents/devops-release-engineer.md`](./.aief/agents/devops-release-engineer.md) |
| `frontend-engineer` | Frontend & UI TDD Implementation Engineer | 9, 14 | [`.aief/agents/frontend-engineer.md`](./.aief/agents/frontend-engineer.md) |
| `implementation-engineer` | General & Cross-Layer TDD Implementation Engineer | 9, 14 | [`.aief/agents/implementation-engineer.md`](./.aief/agents/implementation-engineer.md) |
| `planner-orchestrator` | Technical Project Planner & Workflow Orchestrator | 6, 7, 8, 15 | [`.aief/agents/planner-orchestrator.md`](./.aief/agents/planner-orchestrator.md) |
| `product-analyst` | Product & Requirements Analyst | 1, 2, 3 | [`.aief/agents/product-analyst.md`](./.aief/agents/product-analyst.md) |
| `qa-engineer` | Quality Assurance & Automated Test Engineer | 11 | [`.aief/agents/qa-engineer.md`](./.aief/agents/qa-engineer.md) |
| `security-engineer` | Application & DevSecOps Security Engineer | 12 | [`.aief/agents/security-engineer.md`](./.aief/agents/security-engineer.md) |
| `software-architect` | Software & Systems Architect | 4, 5, 14 | [`.aief/agents/software-architect.md`](./.aief/agents/software-architect.md) |
| `ui-ux-designer` | UI/UX & Design System Designer | 4, 5, 11 | [`.aief/agents/ui-ux-designer.md`](./.aief/agents/ui-ux-designer.md) |

## 4. Active Skills
| Skill Name | Tier | Origin | Path |
| :--- | :--- | :--- | :--- |
| `grill-me` | `core` | `framework` | [`.agents/skills/grill-me/SKILL.md`](./.agents/skills/grill-me/SKILL.md) |
| `tdd-cycle` | `core` | `framework` | [`.agents/skills/tdd-cycle/SKILL.md`](./.agents/skills/tdd-cycle/SKILL.md) |
| `ponytail` | `core` | `framework` | [`.agents/skills/ponytail/SKILL.md`](./.agents/skills/ponytail/SKILL.md) |
| `adr-writer` | `core` | `framework` | [`.agents/skills/adr-writer/SKILL.md`](./.agents/skills/adr-writer/SKILL.md) |
| `graphify` | `core` | `framework` | [`.agents/skills/graphify/SKILL.md`](./.agents/skills/graphify/SKILL.md) |
| `agent-browser` | `core` | `framework` | [`.agents/skills/agent-browser/SKILL.md`](./.agents/skills/agent-browser/SKILL.md) |
| `find-skills` | `core` | `framework` | [`.agents/skills/find-skills/SKILL.md`](./.agents/skills/find-skills/SKILL.md) |
| `anti-slop` | `core` | `framework` | [`.agents/skills/anti-slop/SKILL.md`](./.agents/skills/anti-slop/SKILL.md) |
| `caveman` | `optional-communication` | `framework` | [`.agents/skills/caveman/SKILL.md`](./.agents/skills/caveman/SKILL.md) |
| `rtk-cli` | `optional-communication` | `framework` | [`.agents/skills/rtk-cli/SKILL.md`](./.agents/skills/rtk-cli/SKILL.md) |
| `context-optimization` | `optional-context` | `framework` | [`.agents/skills/context-optimization/SKILL.md`](./.agents/skills/context-optimization/SKILL.md) |
| `context-compression` | `optional-context` | `framework` | [`.agents/skills/context-compression/SKILL.md`](./.agents/skills/context-compression/SKILL.md) |
| `filesystem-context` | `optional-context` | `framework` | [`.agents/skills/filesystem-context/SKILL.md`](./.agents/skills/filesystem-context/SKILL.md) |
| `memory-systems` | `optional-context` | `framework` | [`.agents/skills/memory-systems/SKILL.md`](./.agents/skills/memory-systems/SKILL.md) |
| `multi-agent-patterns` | `optional-agent-architecture` | `framework` | [`.agents/skills/multi-agent-patterns/SKILL.md`](./.agents/skills/multi-agent-patterns/SKILL.md) |
| `tool-design` | `optional-agent-architecture` | `framework` | [`.agents/skills/tool-design/SKILL.md`](./.agents/skills/tool-design/SKILL.md) |
| `evaluation` | `optional-agent-architecture` | `framework` | [`.agents/skills/evaluation/SKILL.md`](./.agents/skills/evaluation/SKILL.md) |
| `self-improvement-loops` | `optional-agent-architecture` | `framework` | [`.agents/skills/self-improvement-loops/SKILL.md`](./.agents/skills/self-improvement-loops/SKILL.md) |
| `ui-ux-pro-max` | `optional-frontend` | `framework` | [`.agents/skills/ui-ux-pro-max/SKILL.md`](./.agents/skills/ui-ux-pro-max/SKILL.md) |
| `angular-developer` | `optional-frontend` | `framework` | [`.agents/skills/angular-developer/SKILL.md`](./.agents/skills/angular-developer/SKILL.md) |
| `angular-new-app` | `optional-frontend` | `framework` | [`.agents/skills/angular-new-app/SKILL.md`](./.agents/skills/angular-new-app/SKILL.md) |
| `web-design-guidelines` | `optional-frontend` | `framework` | [`.agents/skills/web-design-guidelines/SKILL.md`](./.agents/skills/web-design-guidelines/SKILL.md) |
| `canvas-design` | `optional-frontend` | `framework` | [`.agents/skills/canvas-design/SKILL.md`](./.agents/skills/canvas-design/SKILL.md) |
| `seo-audit` | `optional-growth` | `framework` | [`.agents/skills/seo-audit/SKILL.md`](./.agents/skills/seo-audit/SKILL.md) |
| `ai-seo` | `optional-growth` | `framework` | [`.agents/skills/ai-seo/SKILL.md`](./.agents/skills/ai-seo/SKILL.md) |
| `content-strategy` | `optional-growth` | `framework` | [`.agents/skills/content-strategy/SKILL.md`](./.agents/skills/content-strategy/SKILL.md) |
| `pricing` | `optional-growth` | `framework` | [`.agents/skills/pricing/SKILL.md`](./.agents/skills/pricing/SKILL.md) |
| `brand-strategy` | `optional-growth` | `framework` | [`.agents/skills/brand-strategy/SKILL.md`](./.agents/skills/brand-strategy/SKILL.md) |
| `video-lens` | `optional-growth` | `framework` | [`.agents/skills/video-lens/SKILL.md`](./.agents/skills/video-lens/SKILL.md) |
| `video-use` | `optional-growth` | `framework` | [`.agents/skills/video-use/SKILL.md`](./.agents/skills/video-use/SKILL.md) |
| `i-have-adhd` | `optional-communication` | `framework` | [`.agents/skills/i-have-adhd/SKILL.md`](./.agents/skills/i-have-adhd/SKILL.md) |
| `humanizer` | `optional-communication` | `framework` | [`.agents/skills/humanizer/SKILL.md`](./.agents/skills/humanizer/SKILL.md) |
| `session-handoff` | `optional-context` | `framework` | [`.agents/skills/session-handoff/SKILL.md`](./.agents/skills/session-handoff/SKILL.md) |

## 5. Consumer Command
```bash
python .aief/scripts/compose.py   # Re-compose inline instructions + validate consumer workspace in one command
```
