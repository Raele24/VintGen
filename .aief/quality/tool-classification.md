# Quality & Security Tool Classification Matrix (`quality/tool-classification.md`)

To keep the framework lightweight and prevent mandatory toolchain bloat, all testing, quality, and security tools are classified into four tiers:

| Tier | Definition | Tools Included | Installation Policy |
| :--- | :--- | :--- | :--- |
| **1. Core** | Mandatory for every repository using the framework; zero external service dependencies | - Python `unittest` / language native test runner<br>- `scripts/validate.py` (schema, link, frontmatter, secret check)<br>- `scripts/sync_adapters.py`<br>- `scripts/bootstrap.py`<br>- GitHub Actions CI (`.github/workflows/ci-validate.yml`) | Built-in / runs on standard library (`Python 3.10+`, `Git 2.30+`) |
| **2. Recommended** | Strongly advised for architectural observability and dependency hygiene | - **Graphify (`graphify`)**: AST & concept knowledge graph<br>- **GitHub CLI (`gh`)**: PR and release automation<br>- Native package auditors (`npm audit`, `pip-audit`) | Use when installed on host; install with Category B approval if missing |
| **3. Optional** | Activated only when the project domain requires them (e.g., web UI or specific stacks) | - **Playwright (`@playwright/test`)**: Browser E2E testing<br>- Stack linters (`ruff`, `eslint`, `prettier`, `dotnet format`)<br>- Optional skill packs (`frontend-design`, `growth-media`) | Opt-in via `project.framework.json` |
| **4. Conditional** | High-impact tools requiring special infrastructure (Docker) AND explicit legal/human scope authorization | - **Strix (`usestrix/strix`)**: Autonomous AI-assisted dynamic penetration testing (`security/strix-profile.yaml`) | **Never auto-installed or auto-executed.** Requires Docker, LLM API key (`Category C`), and explicit human sign-off at `Gate-Sec` (`Category B`) |
