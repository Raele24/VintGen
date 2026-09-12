# AI Skills & Agent Integration Guide

VintStack provides standardized skill definitions and system instructions, allowing you to use VintStack directly inside your favorite AI tools and coding assistants.

---

## 1. Google Antigravity IDE

To make VintStack a permanent global or project skill in Antigravity:

1. **Project Skill (Current Workspace)**:
   Place `skills/vintstack/SKILL.md` inside `.agents/skills/vintstack/SKILL.md`.
2. **Global Skill**:
   Copy the `skills/vintstack/` directory to:
   ```text
   C:\Users\<YOUR_USER>\.gemini\config\skills\vintstack\SKILL.md
   ```
3. Once placed, Antigravity will automatically discover the skill. Simply ask:
   > *"Analyze these 3 photos of a jacket and prepare the Vinted listing"*

---

## 2. GitHub Copilot & Claude Code

For agent environments like **Claude Code** or **GitHub Copilot CLI**:

- **Claude Code**:
  Copy the contents of `skills/vintstack/SKILL.md` into your `.claude/skills/vintstack/SKILL.md` or append to `CLAUDE.md`.
- **Copilot**:
  Add a reference to `skills/vintstack/SKILL.md` inside `.github/copilot-instructions.md`.

---

## 3. Gemini Gems & Custom GPTs (Web Interfaces)

If you want to use VintStack inside the web versions of Gemini, ChatGPT, or Claude:

1. Open `skills/vintstack/prompts/web-instructions.md`.
2. Copy the text block.
3. Paste into:
   - **Google Gemini**: Go to **Gemini Gems** &rarr; **Create New Gem** &rarr; Paste into **Instructions**. Name it `VintStack Reseller`.
   - **ChatGPT**: Go to **Explore GPTs** &rarr; **Create a GPT** &rarr; Paste into **Instructions**.
   - **Claude**: Create a new **Claude Project** &rarr; Paste into **Project Instructions**.
4. Now you can drag-and-drop photos straight into the chat and receive VintStack-formatted listings!
