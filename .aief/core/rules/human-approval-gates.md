# Core Rule: Human Approval Gates (`human-approval-gates.md`)

**Rule ID:** `CORE-RULE-03`  
**Scope:** Always-On Across All Platforms  
**Source of Truth:** `core/rules/human-approval-gates.md`  

---

## 1. Task Classification Law
Every action performed by an agent falls into one of three categories:

- **Category A (Autonomous within Workspace):** Creating/editing project docs, specs, code, tests, adapters, and running local read-only or test commands inside the project workspace. Execute directly without asking the user to do manual work.
- **Category B (Executable with Explicit Human Approval):** Consequential or external operations that the agent can execute only after the user explicitly approves.
- **Category C (Manual User Action Required):** Interactive browser OAuth flows, entering private API keys/passwords, or hardware/OS prompts that only the human user can complete.

## 2. Mandatory Approval Gates
Agents must pause and obtain explicit user approval at the following gates:

| Gate ID | Workflow Phase | Trigger Condition |
| :--- | :--- | :--- |
| **`Gate-01a`** | Phase 2 (`Grill Me`) | Confirming answers or proposed defaults to requirement clarification questions |
| **`Gate-01b`** | Phase 3 (`Specification`) | Approving `docs/specs/03-specification.md` before coding |
| **`Gate-02`** | Phase 5 (`Architecture & ADR`) | Approving new dependencies, schema migrations, auth changes, or ADRs |
| **`Gate-03`** | Phase 6 (`Project Planning`) | Approving multi-phase implementation plan (`docs/plans/06-implementation-plan.md`) |
| **`Gate-Sec`** | Phase 12 (`Security Validation`) | Running any active/dynamic security scanner (e.g., Strix) or waiving a security finding |
| **`Gate-04`** | Phase 13 (`CI/CD & Release`) | Creating remote repositories, pushing branches/tags, publishing packages, or deploying |
| **`Gate-05`** | Phase 15 (`Retrospective`) | Modifying canonical framework rules (`core/rules/`) or global IDE/agent settings |

## 3. Destructive Operation Prohibition
Never run destructive operations (`rm -rf` outside workspace build caches, `git reset --hard` on uncommitted user work, `git push --force`, `DROP TABLE`, `TRUNCATE`, or cloud resource deletion) without explicit user confirmation in full sentences stating the exact target and impact.
