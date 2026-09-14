# BYOK (Bring Your Own Key) & Security Model

VintGen is architected around a strict **Bring Your Own Key (BYOK)** privacy model.

---

## 1. Why BYOK?

Most commercial listing tools operate with centralized servers that:
1. Charge recurring monthly subscriptions for AI tokens with heavy markups.
2. Intercept and store user photographs, garment notes, and personal resale data.
3. Introduce vendor lock-in and potential single-point-of-failure data breaches.

In contrast, **VintGen gives complete privacy and control to the user**:
- You provide your own API credentials directly for your preferred provider (Google Gemini, OpenAI, Anthropic Claude) or run 100% offline via Ollama without any key.
- You incur zero subscription markups or platform fees.
- You leverage your own accounts, existing API credits, or run 100% free locally with Ollama.

---

## 2. Browser & Desktop Key Isolation

In the Web Studio (and Windows / Android shells):
- **Key Storage**: Your API keys are stored exclusively in your local device storage (`window.localStorage`).
- **Direct Communication**: HTTP calls are made directly from your client machine to official AI provider endpoints:
  - Google Gemini: `https://generativelanguage.googleapis.com`
  - OpenAI: `https://api.openai.com`
  - Anthropic Claude: `https://api.anthropic.com`
  - Ollama: `http://localhost:11434`
- **Zero Intermediaries**: There is no proxy server, telemetry middleware, or central backend intercepting your credentials or photographs.
- **Masking & Clearing**: The UI masks keys by default and provides a one-click action to delete saved keys immediately from storage.

---

## 3. Terminal CLI Key Handling

In the `vintgen` CLI:
- Keys can be passed as command-line flags (`--key <KEY>`), set as environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), or saved locally using `vintgen config`.
- When saved with `vintgen config`, settings are stored locally in `~/.vintgen/config.json` on your machine.
- Keys are loaded into memory strictly for the execution of the requested command.
- When using local Ollama (`--provider ollama`), no API keys or external internet connectivity are needed.
