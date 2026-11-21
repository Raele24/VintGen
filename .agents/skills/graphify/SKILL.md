---
name: graphify
description: "Builds and queries deterministic AST and concept knowledge graphs (graphify-out/) for architecture discovery, dependency paths, and impact analysis."
version: "0.9.48"
source: "https://github.com/Graphify-Labs/graphify"
license: "Apache-2.0"
category: "codebase-intelligence"
tier: "core"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [run_command, read_file]
dependencies: ["graphifyy>=0.9.48"]
security_scope: "workspace-write"
---

## Framework Provenance, Activation & Security

- **Upstream Source:** `https://github.com/Graphify-Labs/graphify` (`Apache-2.0` License)
- **Original File Preserved:** `UPSTREAM_SKILL.md`
- **Category / Tier:** `codebase-intelligence` / `core` (Priority: `P0`)
- **Activation Conditions:** Workflow Phases `[1, 4, 5, 10, 14]` (Progressive disclosure: loads on demand when relevant).
- **Security Scope:** `workspace-write`
- **Adaptation Note:** Added Minimum Corpus Threshold Guard (skip graph build on repositories with <15 files and <2,000 LOC) and integrated Phase 1/4/5/10/14 triggers. Original preserved in UPSTREAM_SKILL.md.

---

﻿---
name: graphify
description: "Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools."
---

# /graphify

Turn any folder of files into a navigable knowledge graph with community detection, an honest audit trail (EXTRACTED/INFERRED/AMBIGUOUS), and three outputs: interactive HTML, GraphRAG-ready JSON, and a plain-language GRAPH_REPORT.md.

## Quick Reference

- Install: `pip install graphifyy` or `uv tool install graphifyy`
- Init: `graphify init .`
- Update (code changes, no API cost): `graphify update .`
- Query existing graph: `graphify query "<question>"`
- Full pipeline: `graphify .` or `/graphify` in an AI assistant

## Usage

```
/graphify                                             # full pipeline on current directory
/graphify <path>                                      # full pipeline on specific path
/graphify <path> --update                             # incremental - re-extract only new/changed files
/graphify <path> --mode deep                          # thorough extraction, richer INFERRED edges
/graphify <path> --directed                           # build directed graph (source->target)
/graphify <path> --watch                              # watch folder, auto-rebuild on code changes
/graphify <path> --wiki                               # build agent-crawlable wiki
/graphify <path> --obsidian                           # generate Obsidian vault
/graphify query "<question>"                          # BFS traversal - broad context
/graphify query "<question>" --dfs                    # DFS - trace a specific path
/graphify query "<question>" --budget 1500            # cap answer at N tokens
/graphify path "AuthModule" "Database"                # shortest path between two concepts
/graphify explain "SwinTransformer"                   # plain-language explanation of a node
```

## What You Must Do When Invoked

**Fast path - existing graph:** Before doing anything else, check whether `graphify-out/graph.json` exists relative to the project root. If it exists AND the user's request is a natural-language question about the codebase: **skip building and run `graphify query "<question>"` immediately.** The graph is already built - use it.

If no path was given, use `.` (current directory). Do not ask the user for a path.

## Outputs (in graphify-out/)

- `graph.html` - interactive graph, open in browser
- `GRAPH_REPORT.md` - audit report with god nodes, communities, surprising connections
- `graph.json` - raw graph data for AI agents
- `manifest.json` - incremental detection cache

## Honesty Rules

- Never invent an edge. If unsure, use AMBIGUOUS.
- Never skip the corpus check warning.
- Always show token cost in the report.
- Never hide cohesion scores behind symbols - show the raw number.
