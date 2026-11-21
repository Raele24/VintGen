<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: 4f2d7e49e4172799 -->
# Google Antigravity & Gemini CLI Instructions (`GEMINI.md`)

Follow [`AGENTS.md`](./AGENTS.md) for all active framework rules, gates, stage runbooks, and project customizations.

## Platform Integration Notes
- **Google Antigravity:** Skills indexed in `.agents/skills.json` and projected into `.agents/skills/`; delegate isolated research to `research` and UI checks to `browser` (`Model="flash"`).
- **Gemini CLI:** Stage commands in `.gemini/commands/workflow.toml` and skills in `.agents/skills/`.
- **Auto-Sync Rule:** Run `python .aief/scripts/compose.py` automatically after editing `.aief/custom/` or `.aief/config.json`.
