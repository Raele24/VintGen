# AI Skills & Agent Integration Guide

VintGen provides standardized skill definitions and system instructions, allowing you to use VintGen directly inside AI tools and coding assistants.

---

## 1. Google Antigravity IDE

To configure VintGen as a permanent skill in Antigravity:

1. **Project Skill (Current Workspace)**:
   Place `skills/vintgen/SKILL.md` inside `.agents/skills/vintgen/SKILL.md`.
2. **Global Skill**:
   Copy the `skills/vintgen/` directory to:
   ```text
   C:\Users\<YOUR_USER>\.gemini\config\skills\vintgen\SKILL.md
   ```
3. Once placed, Antigravity automatically discovers the skill. You can run requests like:
   > "Analyze these photos of a vintage denim jacket and generate the marketplace listing."

---

## 2. GitHub Copilot & Claude Code

For agent environments like **Claude Code** or **GitHub Copilot CLI**:

- **Claude Code**:
  Copy the contents of `skills/vintgen/SKILL.md` into your `.claude/skills/vintgen/SKILL.md` or reference in `CLAUDE.md`.
- **Copilot**:
  Add a reference to `skills/vintgen/SKILL.md` inside `.github/copilot-instructions.md`.

---

## 3. Gemini Gems & Custom GPTs (Web Interfaces)

To run VintGen within the browser versions of Gemini, ChatGPT, or Claude:

1. Open `skills/vintgen/prompts/web-instructions.md`.
2. Copy the text block.
3. Paste into:
   - **Google Gemini**: Navigate to **Gemini Gems** -> **Create New Gem** -> Paste into **Instructions**. Name it `VintGen Reseller`.
   - **ChatGPT**: Navigate to **Explore GPTs** -> **Create a GPT** -> Paste into **Instructions**.
   - **Claude**: Create a **Claude Project** -> Paste into **Project Instructions**.
4. Drag and drop clothing photos directly into the conversation to receive structured, search-optimized listings.
