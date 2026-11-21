---
name: rtk-cli
description: "Compresses verbose terminal command outputs by 60-90% using Rust Token Killer (rtk) when installed, with automatic safe fallback to compact native flags."
version: "1.0.0"
source: "https://github.com/rtk-ai/rtk"
license: "Apache-2.0"
category: "token-optimization"
tier: "optional-communication"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [run_command]
dependencies: ["rtk (optional external binary: winget install -e --id rtk-ai.rtk)"]
security_scope: "read-only"
---

# RTK (Rust Token Killer) — Terminal Output Compression Skill

> **Upstream Attribution:** Integrates [`rtk-ai/rtk`](https://github.com/rtk-ai/rtk) (Rust Token Killer), licensed under **Apache License 2.0**.

## 1. Purpose
Prevent raw, verbose terminal outputs (`git status`, `git diff`, `pytest`, `npm`, `cargo`, `docker`) from flooding the agent context window. Terminal observations account for 60–80% of token consumption in tool-heavy coding sessions.

## 2. Activation Conditions
- Active whenever executing high-volume shell commands via `run_command` or `Bash`.
- Automatically checks whether `rtk` is available in `PATH` and falls back to compact native CLI flags when `rtk` is absent.

## 3. Execution & Safe Fallback Protocol

### Mode A: When `rtk` Binary Is Installed (`Get-Command rtk`)
Prefix supported developer commands with `rtk` (or use `rtk init` agent hooks where configured):
```bash
rtk git status
rtk git diff
rtk git log -n 10
rtk pytest
rtk npm test
rtk gain          # View cumulative token savings telemetry
```

### Mode B: Safe Fallback When `rtk` Is Not Installed (Zero-Failure Guarantee)
Never fail a task because `rtk` is not installed. When `rtk` is absent from `PATH`, use compact native CLI flags to achieve 40–70% output reduction natively:

| Verbose Command (Avoid) | Compact Native Fallback (Use When `rtk` Absent) |
| :--- | :--- |
| `git status` | `git status -sb` |
| `git log` | `git log --oneline -n 15` |
| `git diff` (on huge changesets) | `git diff --stat` (then `git diff -- <specific-file>`) |
| `pytest -vv` | `pytest -q --tb=short --no-header` |
| `npm install` / `npm test` | `npm test --silent` / `pnpm --reporter=silent` |
| Dumping $>2,000$ lines to stdout | Redirect to `.framework-state/scratch/cmd.log` and inspect target lines |

## 4. When Never to Compress Output
Do **not** use lossy output truncation when:
1. Inspecting a failing stack trace whose root cause frame was truncated (re-run the single failing test directly without truncation).
2. Verifying cryptographic hashes (`Get-FileHash`, `sha256sum`) or security audit JSON reports.

## 5. Security Considerations
- **Crate Collision Warning:** Never install RTK via `cargo install rtk` (which points to an unrelated crate named *Rust Type Kit*). On Windows, install only via `winget install -e --id rtk-ai.rtk` (requires Category B user approval) or `cargo install --git https://github.com/rtk-ai/rtk --branch master rtk`.
