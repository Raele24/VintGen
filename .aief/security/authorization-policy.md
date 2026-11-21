# Security Testing Authorization Policy (`security/authorization-policy.md`)

**Rule ID:** `SEC-AUTH-01`  
**Status:** Mandatory Enforcement  

---

## 1. Scope of Policy

This policy governs all **active, dynamic, or intrusive security testing** executed within or via the AI Engineering Framework, including **Strix (`usestrix/strix`)**, dynamic application security testing (DAST), fuzzing, and automated exploit verification.

---

## 2. Passive vs. Active Security Checks

### 2.1 Passive / Static Checks (Category A — Always Allowed Locally)
The following checks inspect local workspace files without sending attack traffic to live targets and may run autonomously during Phase 12:
- Secret and private-key pattern scanning (`python scripts/validate.py`).
- Static code review for OWASP Top 10 patterns (`agents/security-engineer.md`).
- Dependency manifest vulnerability checks (`npm audit`, `pip-audit`).

### 2.2 Active / Dynamic Security Testing (Category B/C — Strictly Gated)
Active security testing (such as **Strix**) sends crafted payloads to running applications or containers. It is **strictly prohibited** unless ALL four preconditions below are satisfied:

1. **Written Scope Configuration:** The target host/URL (`http://localhost:<port>` or isolated local Docker container) is explicitly listed under `authorized_targets` in `security/strix-profile.yaml`.
2. **Forbidden Targets Verification:** Targets must **never** include third-party domains, shared multi-tenant cloud services, or production endpoints without explicit written authorization from the system owner.
3. **Sandbox Isolation:** Dynamic scans must run inside an isolated Docker environment (`docker` required) or ephemeral CI container.
4. **Explicit Human Sign-Off (`Gate-Sec`):** Before running the command, the agent must display the exact target URL, tool command, and scope to the user in full sentences and receive explicit confirmation.
