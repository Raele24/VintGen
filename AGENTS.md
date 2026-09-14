# Mandatory Assistant Rules & Guidelines

These rules are mandatory and must be strictly adhered to across all tasks, modifications, code, and documentation:

1. **ZERO EMOJIS OR ICONS**:
   - Never use emojis, decorative icons, or unicode symbols (such as keys, rockets, sparkles, package icons, mobile icons, warning symbols, checkmark emojis, etc.) anywhere.
   - This applies to all code, commit messages, documentation, markdown files, PR descriptions, terminal output, and GitHub Release bodies. Keep everything telegraphic, clean, and professional.

2. **STRICT ENGLISH ONLY**:
   - Never use Italian for source code, variable names, comments, docstrings, documentation, commit messages, GitHub release notes, or pull requests unless explicitly instructed by the user for a localized end-user feature.
   - All repository assets and communications in artifacts/docs must be 100% English.

3. **COMPLETE PROVIDER & MARKETPLACE NEUTRALITY (NO GEMINI-FIRST, NO VINTED-FIRST)**:
   - **STRICT FORBIDDEN DIRECT REFERENCES**: Never use direct or exclusive references to "Gemini" or "Vinted" in code comments, docstrings, variable names, markdown export templates (such as `## Vinted Description`), or user-facing copy.
   - **Code & Comments Policy**: Always use neutral terms:
     - Use "AI vision model", "vision provider", or "selected AI engine" instead of "Gemini".
     - Use "Item Description", "Marketplace Description", "secondhand listing", or "item condition" instead of "Vinted Description" or "Vinted listing".
   - **Multi-Provider Neutrality**: VintGen supports Google Gemini, OpenAI, Anthropic Claude, and local offline Ollama. Treat all providers with equal standing across documentation, UI selectors, and code. Technical enum values like `'gemini' | 'openai' | 'claude' | 'ollama'` are permitted only where configuring or selecting providers.
   - **Multi-Marketplace Neutrality**: VintGen generates listings for all online secondhand marketplaces (such as eBay, Vinted, Subito, Wallapop, Depop, etc.). Generated descriptions, copy buttons, and export files must always be universal marketplace listings.
   - **The project brand name** is "VintGen". Outside of the brand name itself, avoid vendor-specific bias.

4. **NO AUTOMATIC GIT PUSH OR COMMIT**:
   - Never run `git push` or `git commit` autonomously. All git staging, committing, and pushing must be executed by the user.

5. **ALWAYS KEEP DOCUMENTATION SYNCHRONIZED**:
   - Review and update documentation (root README.md, package-specific READMEs, and relevant guides in docs/) on every modification, feature addition, platform release, or configuration change.
   - Keep all delivery channels (Web/PWA, Android APK, Windows Desktop, npm CLI, and local development) indexed, accurate, and easy to follow.
   - Ensure all documentation maintains strict English and zero emojis.

6. **NO AI BUZZWORDS OR MARKETING JARGON (USE PLAIN HUMAN LANGUAGE)**:
   - Never use marketing buzzwords, over-hyped AI terms, or promotional fluff (such as "Instant", "Multimodal Vision AI", "high-converting", "pricing corridors", "revolutionary", "state-of-the-art").
   - Write simple, clear, direct human sentences. Explain what the tool actually does so that anyone understands it immediately.
