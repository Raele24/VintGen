---
name: ai-seo
description: "Generative Engine Optimization (GEO / AEO) for public docs and web apps, including llms.txt generation, entity disambiguation, and citation structure."
version: "1.0.0"
source: "https://github.com/coreyhaines31/marketingskills"
license: "MIT"
category: "seo-growth"
tier: "optional-growth"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file, edit_file]
dependencies: []
security_scope: "workspace-write"
---

# AI SEO — Generative & Answer Engine Optimization Skill

## 1. Purpose
Optimize public technical documentation and open-source project portals for accurate retrieval, citation, and synthesis by AI search engines and LLM agents.

## 2. Execution Protocol
1. **`llms.txt` & `llms-full.txt` Generation:** Maintain a concise root `/llms.txt` index linking to canonical markdown documentation pages.
2. **Self-Contained Semantic Chunks:** Structure documentation sections so each `<h2>`/`<h3>` block states the entity name, version, and concrete fact in its opening sentence (preventing retrieval chunk ambiguity).
3. **Comparison & Specification Tables:** Present feature matrices, CLI flags, and benchmarks in standard Markdown tables and JSON-LD blocks that parsers extract deterministically.

## 3. Validation Criteria
- `/llms.txt` links resolve with 0 broken targets, and primary technical claims are backed by verifiable tables or code blocks.
