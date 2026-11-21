# Stage 2 Runbook: Technical Research, Architecture & ADRs (Phases 4–5)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phases 4, 5)  
**Responsible Roles:** [`agents/software-architect.md`](../agents/software-architect.md), [`agents/ui-ux-designer.md`](../agents/ui-ux-designer.md) (UI scope), [`agents/data-engineer.md`](../agents/data-engineer.md) (DB/Big Data scope)  
**Required Skills:** [`adr-writer`](../../.agents/skills/adr-writer/SKILL.md), [`find-skills`](../../.agents/skills/find-skills/SKILL.md), [`anti-slop`](../../.agents/skills/anti-slop/SKILL.md)  
**Human Approval Gates:** `Gate-02` (Architecture, Design System & ADR Approval)  

---

## Step 1: Verify Upstream Handoff
1. Read `.framework-state/handoffs/phase-03-handoff.json` and confirm `docs/specs/03-specification.md` is approved (`Gate-01b`).

## Step 2: Phase 4 — Technical Research Spike
1. Evaluate candidate technical approaches, including a **Minimal / Standard Library Baseline** (Architectural Reduction principle).
2. Check license compatibility (must be compatible with project license), maintenance status, and host OS support (`docs/ENVIRONMENT_PREFLIGHT.md` / `scripts/preflight.py`).
3. Document findings in `docs/architecture/04-research-spike.md`.

## Step 3: Phase 5 — Architecture, Design Spec & ADRs
1. Load [`skills/core/adr-writer/SKILL.md`](../../.agents/skills/adr-writer/SKILL.md).
2. Create `docs/adr/ADR-xxxx-<slug>.md` using [`templates/ADR.template.md`](../templates/ADR.template.md) for any new dependency, schema change, or boundary contract.
3. Update `docs/ARCHITECTURE.md` with component boundaries and Mermaid data-flow diagrams.
4. For projects with a UI/frontend surface, invoke `ui-ux-designer` to author `docs/design/05-design-spec.md` (design tokens, typography, layout, `loading/empty/error` states, WCAG accessibility).
5. For projects with heavy databases, warehouses, or Big Data pipelines, invoke `data-engineer` to author `docs/data/05-data-spec.md` (OLTP/OLAP schemas, partitioning, index/query strategy, zero-downtime migrations).
6. Write `.framework-state/handoffs/phase-05-handoff.json` and pause at **`Gate-02`** for user approval.
