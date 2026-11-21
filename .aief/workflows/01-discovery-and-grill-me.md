# Stage 1 Runbook: Discovery, Grill Me & Specification (Phases 1–3)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phases 1, 2, 3)  
**Responsible Role:** [`agents/product-analyst.md`](../agents/product-analyst.md)  
**Required Skills:** [`grill-me`](../../.agents/skills/grill-me/SKILL.md), [`anti-slop`](../../.agents/skills/anti-slop/SKILL.md)  
**Human Approval Gates:** `Gate-01a` (Clarification Sign-Off), `Gate-01b` (Specification Approval)  

---

## Step 1: Phase 1 — Discovery & Context Inspection
1. **Knowledge Graph Discovery (`graphify`):**
   - If `graphify-out/graph.json` exists in the repository, run `graphify query "<feature/module>"` to map affected components.
   - If `graphify-out/graph.json` does **not** exist yet on a repository with $\ge 15$ tracked code/doc files (or $> 2,000$ LOC) and `graphify` is not disabled in `project.framework.json`: check if the `graphify` CLI is installed. If available, run `graphify .` once to build it; if **not** installed, **report explicitly to the user** (`Graphify CLI is not installed — optional knowledge graph skipped; install with 'pipx install graphifyy' or 'pip install graphifyy'`) and continue with direct file inspection.
2. Read relevant existing documentation and module interfaces.
3. Generate `docs/specs/01-discovery-brief.md` using [`templates/PRD.template.md`](../templates/PRD.template.md).
4. List every unresolved scope, data, security, or edge-case question under Section 5 (`Open Ambiguities`).

## Step 2: Phase 2 — Requirement Clarification (`Grill Me`)
1. Load [`skills/core/grill-me/SKILL.md`](../../.agents/skills/grill-me/SKILL.md).
2. Present 3–5 batched clarifying questions to the user, placing a `(Recommended)` default with a 1-sentence rationale first for every question.
3. **STOP at `Gate-01a`** and wait for user responses.
4. Record all confirmed decisions and locked invariants in `docs/specs/02-clarified-requirements.md` with zero remaining `[AMBIGUOUS]` markers.

## Step 3: Phase 3 — Specification Creation
1. Generate `docs/specs/03-specification.md` using [`templates/SPEC.template.md`](../templates/SPEC.template.md).
2. Ensure every functional requirement (`FR-01..N`) maps to a deterministic `Given / When / Then` acceptance criterion (`AC-01..N`).
3. Verify prose against [`skills/core/anti-slop/SKILL.md`](../../.agents/skills/anti-slop/SKILL.md).
4. Write `.framework-state/handoffs/phase-03-handoff.json` and pause at **`Gate-01b`** for specification sign-off.
