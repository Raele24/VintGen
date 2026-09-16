# Security Architecture & Credential Management

VintGen implements a strict client-side model with Bring Your Own Key (BYOK) privacy and local offline model support. This document outlines the security architecture, threat model, potential risk vectors, and implemented defensive mitigations across the Web application, native desktop/mobile wrappers, and the terminal CLI.

---

## 1. Architectural Model & Threat Surface

Traditional commercial listing tools route images, seller notes, and account credentials through centralized proprietary servers. This introduces:
- Centralized data harvesting of photographs, pricing, and resale habits.
- Single points of failure for credential leakage and database breaches.
- Subscription markups on upstream AI provider tokens.

VintGen eliminates centralized intermediate servers:
- **Direct Client-to-API Communication**: All network requests originate directly from the user device to official provider endpoints (such as Google, OpenAI, Anthropic, or local Ollama).
- **Zero Intermediary Logging**: No proxy servers, telemetry middleware, or tracking databases intercept keys or user payloads.

However, executing AI calls directly from client environments introduces specific client-side security considerations that require explicit defense mechanisms.

---

## 2. Browser Environment: Risks & Implemented Mitigations

### Identified Risk Vectors

1. **Cross-Site Scripting (XSS) & `localStorage` Vulnerability**:
   Standard browser `window.localStorage` provides no access boundaries: any JavaScript executing within the origin can read storage keys. If a third-party npm dependency is compromised (supply-chain attack) or an unsanitized input is rendered into the DOM, stored secrets can be exfiltrated.
2. **Lack of Encryption at Rest**:
   Standard browser storage engines (LevelDB, SQLite) save `localStorage` data in plaintext on the local filesystem. Anyone with administrative access, disk access, or unencrypted backups can extract plaintext keys.
3. **Malicious Browser Extensions**:
   Extensions configured with broad permissions (e.g. access to all website data) can inspect DOM nodes, read `localStorage`, or hook `window.fetch`/`XMLHttpRequest` calls.
4. **Secret Key Classification**:
   Provider API keys are classified as server-side secrets. Certain providers (such as Anthropic) enforce CORS protection that requires an explicit header (`anthropic-dangerous-direct-browser-access: true`) to permit direct client calls without a backend proxy.

### Implemented Browser Mitigations

VintGen provides multi-tier defense mechanisms inside the Web application:

- **Tier 1: Session-Only In-Memory Storage (Default / Recommended)**:
  - Users can configure the application to store keys exclusively in volatile JavaScript runtime memory (Angular Signals).
  - Keys are never committed to `localStorage`, `sessionStorage`, or IndexedDB.
  - When the browser tab or window is closed, credentials are permanently lost from runtime memory, eliminating disk forensic extraction and at-rest compromise.

- **Tier 2: Authenticated WebCrypto AES-GCM-256 At-Rest Encryption**:
  - When persistent device storage is explicitly enabled, credentials are not stored in plaintext.
  - VintGen uses the standard Web Cryptography API (`crypto.subtle`) to encrypt keys with AES-GCM-256 and a 96-bit cryptographic initialization vector (IV) derived via PBKDF2 with 100,000 SHA-256 iterations.
  - Raw filesystem extraction yields only authenticated ciphertext envelopes (`enc:v1:<iv>:<ciphertext>`).

- **Tier 3: One-Click Credential Purge**:
  - The settings interface provides an instant purge action that zeroes all active memory signals and removes stored credential envelopes from browser storage.

- **Tier 4: Zero-Credential Local Architecture (Ollama)**:
  - Users seeking zero exposure can run local vision models via Ollama. This path requires no API keys, generates zero external internet traffic, and keeps all image analysis on the local machine.

---

## 3. Native Shell Security (Android & Windows)

VintGen packages its core engine into native operating system shells:
- **Android**: Wrapped via Capacitor with strict native sandboxing (`allowMixedContent: false`, `webContentsDebuggingEnabled: false`).
- **Windows Desktop**: Wrapped via Tauri v2 with isolated Rust backend boundaries.

### Keystore Integration Architecture
- In standard browser runtimes, storage is bounded by the browser profile.
- On Android, sensitive persistent state can leverage the Android Keystore system and `EncryptedSharedPreferences` via native plugin bridges.
- On Windows, secrets can be secured using the Windows Data Protection API (DPAPI) and Windows Credential Manager via Tauri native commands, isolating secrets to the specific Windows user profile.

---

## 4. Terminal CLI Credential Management

The `vintgen` CLI allows developers and automated workflows to generate listings directly from the shell.

### Comparative Credential Evaluation

| Method | Security Level | Shell History Exposure | Process Table Exposure | At-Rest Exposure | Recommended Use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Environment Variables** (`*_API_KEY`) | High | None | None | None | **Primary Production Standard** |
| **Interactive Masked Prompt** (`set-key`) | High | None | None | Restricted (`0600`) | Manual persistent workstation setup |
| **Config File** (`~/.vintgen/config.json`) | Medium | None | None | Restricted (`0600`) | Workstation persistence |
| **Command-Line Flag** (`--key <KEY>`) | Low (Advisory Warning) | Logged in shell history | Visible in `ps aux` / WMI | None | Ephemeral testing only |

### Implemented CLI Mitigations

1. **Strict POSIX File Permissions (`0700` and `0600`)**:
   - On directory creation, `~/.vintgen/` is created with mode `0700` (read/write/execute restricted to owner).
   - On configuration write, `config.json` is created with mode `0600` (read/write restricted to owner only, denying access to group and other users).
   - `chmod 600` is enforced on configuration saves to prevent permissive umask inheritance.

2. **Process Table & Shell History Protection**:
   - Passing `--key <KEY>` or `set-key <KEY>` directly as command line arguments causes the CLI to display an explicit security warning, noting that arguments can be captured in shell history (`.bash_history`, `.zsh_history`, PowerShell PSReadLine) and process inspection tables (`ps aux`, Task Manager, WMI).
   - Running `vintgen set-key` without arguments triggers an interactive prompt with masked terminal input (raw mode with muted echo), keeping the secret out of command history.
   - Piped stdin input is supported for automated pipelines (e.g. `echo "$KEY" | vintgen set-key -`).

3. **Output Redaction**:
   - Inspecting configuration with `vintgen config` redacts stored keys (e.g. `AIza...Z4X2` or `sk-p...9aF1`), preventing accidental terminal shoulder surfing or screen recording leaks.

4. **Environment Variable Precedence**:
   - The CLI evaluates environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_HOST`) first. Environment variables leave zero traces on disk, do not appear in process argument lists, and are not recorded in shell command histories.

---

## 5. Security Recommendations for End Users

1. **For Maximum Privacy**:
   - Use local Ollama (`--provider ollama`). All vision processing occurs locally with zero network requests and zero credentials.
2. **For Cloud BYOK in Terminal**:
   - Export keys as environment variables in private session startup scripts or secret managers rather than passing flags on the command line.
3. **For Cloud BYOK in Web App**:
   - Maintain the default **Session-Only Memory** mode if operating on shared or untrusted workstations.
   - Regularly use the **Purge All Credentials** button upon session completion.
