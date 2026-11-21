# Stage 6 Runbook: CI/CD Release, Documentation & Retrospective (Phases 13–15)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phases 13, 14, 15)  
**Responsible Roles:** [`devops-release-engineer`](../agents/devops-release-engineer.md), [`implementation-engineer`](../agents/implementation-engineer.md), [`planner-orchestrator`](../agents/planner-orchestrator.md)  
**Human Approval Gates:** `Gate-04` (Release & Remote Publish Approval), `Gate-05` (Framework Rule/Skill Evolution Approval)  

---

## Step 1: Phase 14 — Documentation & Knowledge Graph Sync
1. Update `README.md`, `docs/*.md`, and inline API documentation to reflect shipped changes.
2. Run `python scripts/sync_adapters.py` to synchronize all platform adapters.
3. If `graphify` is installed, run `graphify .` or `graphify update .` to refresh `graphify-out/`.

## Step 2: Phase 13 — Pre-Release Validation & Git Packaging
1. Run full validation (and container/pipeline smoke checks when applicable):
   ```bash
   python scripts/sync_adapters.py --check
   python scripts/validate.py
   python -m unittest discover -s tests -v
   ```
2. Stage and commit changes locally on the appropriate branch (`main` or feature branch).
3. **STOP at `Gate-04`:** Request explicit human approval before pushing to GitHub, creating a remote repository, tagging a public release, or triggering production/cloud deployments (and verify post-deploy healthcheck + rollback readiness once approved).

## Step 3: Phase 15 — Retrospective & Continuous Improvement
1. Review phase handoffs and any test/review failures from the cycle.
2. Write `docs/retrospectives/RETRO-xxxx-<slug>.md` documenting lessons learned and bounded improvement proposals.
3. If proposing updates to `core/rules/` or `skills/core/`, pause at **`Gate-05`** for human approval.
