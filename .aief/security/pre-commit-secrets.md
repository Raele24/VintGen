# Pre-Commit & Repository Secret Prevention Rules (`security/pre-commit-secrets.md`)

**Applies To:** All commits, PRs, and `scripts/validate.py` checks  

---

## 1. Prohibited Secret Patterns

`scripts/validate.py` scans all tracked files in the repository for the following credential indicators and fails validation (`exit code 1`) if any match is detected:

1. **Private Cryptographic Keys:**
   - `-----BEGIN RSA PRIVATE KEY-----`
   - `-----BEGIN OPENSSH PRIVATE KEY-----`
   - `-----BEGIN EC PRIVATE KEY-----`
   - `-----BEGIN PRIVATE KEY-----`
2. **Cloud & Platform API Tokens:**
   - GitHub Personal Access Tokens (`ghp_[A-Za-z0-9]{36}`, `github_pat_[A-Za-z0-9_]{82}`)
   - OpenAI API Keys (`sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}`, `sk-proj-[A-Za-z0-9_-]{40,}`)
   - Anthropic API Keys (`sk-ant-api03-[A-Za-z0-9_-]{80,}`)
   - Google Cloud / Gemini API Keys (`AIza[0-9A-Za-z-_]{35}`)
   - AWS Access Key IDs (`AKIA[0-9A-Z]{16}`)
   - Slack Tokens (`xox[baprs]-[0-9a-zA-Z]{10,48}`)

---

## 2. Safe Placeholder Convention

When writing documentation, templates, or tests that illustrate configuration format:
- Always use symbolic environment variable placeholders: `"${GITHUB_PERSONAL_ACCESS_TOKEN}"`, `"${STRIX_LLM_API_KEY}"`, `"<YOUR_API_KEY_HERE>"`.
- Never use realistic-looking high-entropy strings that trigger secret scanners.
