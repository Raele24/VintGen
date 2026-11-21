# Stage 5 Runbook: Code Review, QA & Security Validation (Phases 10–12)

**Canonical Reference:** [`AGENTS.md`](../../AGENTS.md) & [`core/rules/engineering-principles.md`](../core/rules/engineering-principles.md) (Phases 10, 11, 12)  
**Responsible Roles:** [`code-reviewer`](../agents/code-reviewer.md), [`qa-engineer`](../agents/qa-engineer.md), [`ui-ux-designer`](../agents/ui-ux-designer.md) (UI audit), [`security-engineer`](../agents/security-engineer.md) *(each executed in an isolated fresh subagent)*  
**Required Skills:** [`anti-slop`](../../.agents/skills/anti-slop/SKILL.md), [`tdd-cycle`](../../.agents/skills/tdd-cycle/SKILL.md), [`agent-browser`](../../.agents/skills/agent-browser/SKILL.md)  
**Human Approval Gates:** `Gate-Sec` (Required before any active/dynamic security scan such as Strix)  

---

## Step 1: Phase 10 — Independent Code Review (`code-reviewer`)

- **Required Inputs:** Working tree / branch diff (`git diff`), approved specification (`docs/specs/03-specification.md`), architecture decisions (`docs/adr/ADR-*.md`), and [`quality/code-review-rubric.md`](../quality/code-review-rubric.md).
- **Execution Rules:**
  1. Conduct read-only adversarial review against every acceptance criterion (`AC-01..N`) and ADR boundary.
  2. If `graphify` is installed, run `graphify update .` to check module dependencies and architectural drift.
  3. Record findings classified by severity (`BLOCKER`, `MAJOR`, `MINOR`, `NIT`) with exact `file:line` references.
- **Expected Outputs & Gate Behavior:**
  - Write `.framework-state/10-review-report.md` and `.framework-state/handoffs/phase-10-handoff.json`.
  - If any `BLOCKER` or `MAJOR` defect exists, route fixes back to Phase 9 (`backend-engineer` / `frontend-engineer` / `data-engineer` / `ai-engineer` / `devops-release-engineer` / `implementation-engineer`) before Phase 11.

---

## Step 2: Phase 11 — Automated Testing & Live Readiness (`qa-engineer`)

- **Required Inputs:** Passed Phase 10 review handoff, Phase 9 implementation & test suites, and application configuration (`angular.json`, `package.json`, or API launch settings) defining local endpoints.
- **Execution Rules:**
  1. Execute full unit, integration, and regression suites (for example `python -m unittest discover -s tests -v`, `dotnet test`, or `npm test -- --watch=false`).
  2. **Windows PowerShell 5.1 Compatibility Rules:**
     - Avoid Bash-only `&&` command chaining in PowerShell 5.1; propagate native exit codes explicitly (`; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`).
     - Always double-quote paths that may contain spaces (`"$projectDir\app"`), pass explicit working directories (`-WorkingDirectory` / `Set-Location`), and never rely on ambient CWD or PowerShell 7 features.
     - For headless `codex exec` runs on Windows, pass prompts via piped `-` stdin (`"..." | & $codexCmd exec -C "$workspace" -s read-only -`) without sandbox bypass flags.
  3. **Bounded Application Startup & Readiness Check (`scripts/readiness.py`):**
     - Derive the expected local HTTP URL/port from project configuration (`angular.json` `serve.options.port`, `package.json` `--port`, or project launch config). Never invent undeclared ports or use blind fixed `Start-Sleep` delays.
     - Launch only the workflow-owned dev server process, poll HTTP readiness via `python scripts/readiness.py --angular-config "..."` (or `--url "..."`), fail early on compilation errors or premature process exit, and stop **only** the child PID started by the workflow:
       ```powershell
       $proc = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory "$frontendDir" -PassThru
       try {
           python "scripts/readiness.py" --angular-config "$frontendDir\angular.json" --timeout 60 --json
           if ($LASTEXITCODE -ne 0) { throw "Application readiness check failed." }
           # Run browser E2E verification via agent-browser here
       } finally {
           if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
       }
       ```
     - Never terminate unrelated user processes by process name (`node`, `dotnet`, `chrome`).
  4. Verify live UI flows via [`skills/core/agent-browser/SKILL.md`](../../.agents/skills/agent-browser/SKILL.md) with zero uncaught console errors and zero failed requests after readiness.
- **Expected Outputs:** `.framework-state/11-test-report.json` recording exact suite names, individual pass/fail/skipped counts (never summing separate suites silently), and exit codes.

---

## Step 3: Phase 12 — Security Validation (`security-engineer`)

- **Required Inputs:** Repository tree, Phase 11 test report, dependency manifests, and [`security/pre-commit-secrets.md`](../security/pre-commit-secrets.md).
- **Execution Rules:**
  1. Run passive/static security checks (`python scripts/validate.py --mode auto`, dependency vulnerability audits, secret scanning).
  2. Classify findings by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`). Any `CRITICAL` or `HIGH` finding blocks release approval (`Gate-04`).
  3. **Conditional Active Security Scan (`Gate-Sec`):** Active scanning (e.g. Strix) requires **both** explicit user request/scope in [`security/strix-profile.yaml`](../security/strix-profile.yaml) and explicit human approval at **`Gate-Sec`**.
  4. **Unavailable Tools / Skipped Scans Rule:** If a scanner, authenticated CLI runtime, or `Gate-Sec` approval is unavailable or declined, record its status explicitly as **`NOT_RUN`** or **`BLOCKED`** with the exact blocker reason. **Never** report a skipped or unexecuted check as `PASS`.
- **Expected Outputs:** `.framework-state/12-security-report.md` and `.framework-state/handoffs/phase-12-handoff.json`.
