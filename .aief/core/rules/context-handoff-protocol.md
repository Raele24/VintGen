# Core Rule: Context Handoff Protocol (`context-handoff-protocol.md`)

**Rule ID:** `CORE-RULE-02`  
**Scope:** Always-On Across All Platforms  
**Source of Truth:** `core/rules/context-handoff-protocol.md`  

---

## 1. Filesystem as State Machine
Agents must never rely solely on conversational chat history to transfer requirements, architecture constraints, or review findings between workflow phases.

## 2. Phase Output Contract
At the completion of each workflow phase (`01` through `15` in `docs/WORKFLOW.md`), the active agent must:
1. Write or update the primary phase deliverable on disk (`docs/specs/`, `docs/adr/`, `docs/plans/`, source code, or verification report).
2. Write `.framework-state/handoffs/phase-<NN>-handoff.json` conforming to `core/schemas/handoff-packet.schema.json`.
3. Update `.framework-state/manifest.json` with the active phase, status, and timestamp.

## 3. Clean-Context Ingestion Rules
When starting any phase $N > 1$:
1. Read `.framework-state/manifest.json` and `.framework-state/handoffs/phase-<N-1>-handoff.json`.
2. Verify that all listed `output_artifacts` from the upstream phase exist on disk and match their recorded SHA-256 checksums.
3. Read `decisions_locked` from the handoff packet and treat them as non-negotiable constraints.
4. If an upstream artifact is missing or marked `"awaiting_human_approval"`, stop and request the missing approval or artifact before proceeding.
