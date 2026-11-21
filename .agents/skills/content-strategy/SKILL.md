---
name: content-strategy
description: "Developer-focused technical content architecture, Diataxis documentation taxonomy, launch messaging, and audience positioning for software products."
version: "1.0.0"
source: "https://github.com/coreyhaines31/marketingskills"
license: "MIT"
category: "seo-growth"
tier: "optional-growth"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file]
dependencies: []
security_scope: "workspace-write"
---

# Content Strategy — Technical Messaging & Documentation Taxonomy Skill

## 1. Purpose
Structure technical documentation portals, open-source release announcements, and developer adoption funnels using evidence-backed messaging rather than promotional fluff.

## 2. Execution Protocol
1. **Diátaxis Documentation Mapping:** Classify every documentation page into one of four distinct forms:
   - *Tutorials* (learning-oriented: `GETTING_STARTED.md`)
   - *How-To Guides* (task-oriented: `INSTALLATION.md`)
   - *Reference* (information-oriented: `CONFIGURATION.md`, `WORKFLOW.md`)
   - *Explanation* (understanding-oriented: `ARCHITECTURE.md`, `docs/adr/`)
2. **Audience & Value Matrix:** Map target personas (Individual Developer, Tech Lead, DevSecOps) to concrete technical pain points and verifiable proof points.
3. **Anti-Slop Enforcement:** Apply `skills/core/anti-slop/SKILL.md` to all generated copy.

## 3. Validation Criteria
- Every content artifact specifies target persona, Diátaxis category, primary technical claim, and verification command/link.
