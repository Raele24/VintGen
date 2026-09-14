# Mandatory Assistant Rules & Guidelines

These rules are mandatory and must be strictly adhered to across all tasks, modifications, code, and documentation:

1. **ZERO EMOJIS OR ICONS**:
   - Never use emojis, decorative icons, or unicode symbols (such as keys, rockets, sparkles, package icons, mobile icons, warning symbols, checkmark emojis, etc.) anywhere.
   - This applies to all code, commit messages, documentation, markdown files, PR descriptions, terminal output, and GitHub Release bodies. Keep everything telegraphic, clean, and professional.

2. **STRICT ENGLISH ONLY**:
   - Never use Italian for source code, variable names, comments, docstrings, documentation, commit messages, GitHub release notes, or pull requests unless explicitly instructed by the user for a localized end-user feature.
   - All repository assets and communications in artifacts/docs must be 100% English.

3. **MULTI-PROVIDER NEUTRALITY (NEVER GEMINI-ONLY)**:
   - Never document or implement AI provider setup as "Google Gemini only".
   - VintGen supports multiple providers (Google Gemini, OpenAI, Anthropic Claude, and local offline Ollama).
   - When documenting configuration or API keys, always present provider options neutrally (e.g. `vintgen config --key <KEY> --provider <gemini|openai|claude>` or offline with Ollama without an API key). If Gemini is mentioned, cite it purely as an example alongside OpenAI, Claude, and Ollama.

4. **NO AUTOMATIC GIT PUSH OR COMMIT**:
   - Never run `git push` or `git commit` autonomously. All git staging, committing, and pushing must be executed by the user.

5. **ALWAYS KEEP DOCUMENTATION SYNCHRONIZED**:
   - Review and update documentation (root README.md, package-specific READMEs, and relevant guides in docs/) on every modification, feature addition, platform release, or configuration change.
   - Keep all delivery channels (Web/PWA, Android APK, Windows Desktop, npm CLI, and local development) indexed, accurate, and easy to follow.
   - Ensure all documentation maintains strict English and zero emojis.
