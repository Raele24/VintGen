# VintGen

> Create marketplace listings from item photos with AI.  
> Works in your browser, on Android, Windows, and the terminal.

[![npm version](https://img.shields.io/npm/v/vintgen.svg)](https://www.npmjs.com/package/vintgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Web App](https://img.shields.io/badge/Web_App-Live-blue.svg)](https://vintgen-ai.vercel.app)

---

## Overview

VintGen creates ready-to-copy listings for Vinted, eBay, Depop, Subito, and Wallapop from photos of any secondhand item (clothing, electronics, tech, collectibles, and accessories).

Upload photos of an item, and VintGen identifies the brand, model, condition, and key specifications. It then writes a clean title, a description, and suggests realistic selling prices.

You can use it with Google Gemini, OpenAI, Anthropic Claude, or run it 100% offline on your computer using Ollama. No accounts or subscriptions needed.

---

## Quick Links: AI Skills & Web Prompts

If you prefer using VintGen inside an AI coding assistant or web chat, copy these ready-to-use files:

- **AI Agent Skill (Antigravity, Claude Code, Copilot):**  
  [Open skills/vintgen/SKILL.md](skills/vintgen/SKILL.md)  
  *Copy this file to `.agents/skills/vintgen/SKILL.md` or `.claude/skills/vintgen/SKILL.md`.*

- **Web Chat Instructions (ChatGPT, Gemini Gems, Claude):**  
  [Open skills/vintgen/prompts/web-instructions.md](skills/vintgen/prompts/web-instructions.md)  
  *Copy and paste the text block into Custom GPTs, Gemini Gems, or Claude Project instructions.*

---

## How to Install and Use VintGen

| Platform | How to run | Download or Link | Requirements |
| :--- | :--- | :--- | :--- |
| Web App | In your browser (no install) | [https://vintgen-ai.vercel.app](https://vintgen-ai.vercel.app) | Any web browser |
| Android | Phone app | [GitHub Releases](https://github.com/Raele24/VintGen/releases/latest) (`VintGen-v1.0.0.apk`) | Android 8.0 or newer |
| Windows (Installer) | Setup file with shortcut | [GitHub Releases](https://github.com/Raele24/VintGen/releases/latest) (`VintGen-Windows-Installer.exe`) | Windows 10 or 11 |
| Windows (Portable) | Single file, no install | [GitHub Releases](https://github.com/Raele24/VintGen/releases/latest) (`VintGen-Windows-Portable.exe`) | Windows 10 or 11 |
| Command Line (CLI) | Run with npx or npm | `npx vintgen` / `npm i -g vintgen` | Node.js 18+ |
| AI Agent Skill | Use with coding assistants | [skills/vintgen/SKILL.md](skills/vintgen/SKILL.md) | Antigravity, Claude Code, Copilot |
| Web Chat Prompt | Use with web AI chats | [skills/vintgen/prompts/web-instructions.md](skills/vintgen/prompts/web-instructions.md) | ChatGPT, Gemini, Claude |
| Source Code | Clone and run locally | `git clone` from GitHub | Node.js 18+, npm |

---

## Platform Details

### 1. Web App
- Open [https://vintgen-ai.vercel.app](https://vintgen-ai.vercel.app) in your browser.
- Works right away on your phone or computer without installing anything.
- You can also add it to your phone home screen as an app.

### 2. Android App
- Download `VintGen-v1.0.0.apk` from [GitHub Releases](https://github.com/Raele24/VintGen/releases/latest).
- Take photos with your phone camera directly inside the app.

### 3. Windows App
Download from [GitHub Releases](https://github.com/Raele24/VintGen/releases/latest):
- **Installer (`VintGen-Windows-Installer.exe`):** sets up the program and creates a desktop shortcut.
- **Portable (`VintGen-Windows-Portable.exe`):** single file. Double-click to run without installing anything.

### 4. Command Line (CLI)
Run directly without installing:
```bash
npx vintgen
```

Or install it globally on your machine:
```bash
npm install -g vintgen
```

Scan photos in the current folder:
```bash
cd my-folder-with-photos
vintgen
```

With seller notes and language:
```bash
vintgen -n "Wool sweater, size L, good condition" -l en
```

### 5. AI Agent Skill & Prompts
- **Google Antigravity / Claude Code / Copilot:** Place [skills/vintgen/SKILL.md](skills/vintgen/SKILL.md) into your agent skills directory.
- **ChatGPT / Gemini Gems / Claude:** Copy the system prompt from [skills/vintgen/prompts/web-instructions.md](skills/vintgen/prompts/web-instructions.md) into your custom instructions.

### 6. Run from Source Code
```bash
git clone https://github.com/Raele24/VintGen.git
cd VintGen
npm install
npm run web
```

---

## Supported AI Providers

VintGen connects directly from your device to the AI provider you prefer:

| Provider | Provider Name | Where to get a key | Cost |
| :--- | :--- | :--- | :--- |
| Google Gemini | `gemini` | Google AI Studio | Free tier available |
| OpenAI | `openai` | OpenAI Platform | Pay per use |
| Anthropic Claude | `claude` | Anthropic Console | Pay per use |
| Ollama (Local) | `ollama` | ollama.com | 100% free, runs offline on your PC |

### How to set your key

#### In the Web, Windows, or Android App:
Click the **API Settings** button in the top navigation bar to select your provider and enter your key.

#### In the Command Line:
Use the `config` command:
```bash
# Example: Google Gemini
vintgen config --provider gemini --key <YOUR_KEY>

# Example: OpenAI
vintgen config --provider openai --key <YOUR_KEY>

# Example: Anthropic Claude
vintgen config --provider claude --key <YOUR_KEY>

# Example: local Ollama (offline, zero API key)
vintgen config --provider ollama
```

You can also set environment variables:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

---

---

## Multi-Marketplace Platform Adapters

VintGen automatically adapts listings to the specific requirements and formatting conventions of each major secondhand marketplace:

| Platform | Key Features | Title Constraint | Tag Rules |
| :--- | :--- | :--- | :--- |
| **Universal** | Clean markdown table, full item specifications, and direct market search links. | Standard | All detected hashtags |
| **Vinted** | Conversational tone, bundle discount disclaimer, condition details, and hashtags. | Standard | Unlimited hashtags |
| **eBay** | Structured Item Specifics, condition report, and shipping & handling policy. | Enforced 80-character limit | Search keywords in title/specifics |
| **Depop** | Aesthetic style hooks, fit and measurement emphasis, and instant-buy note. | Standard | Enforced 5-hashtag limit |
| **Subito** | Clear classifieds structure with item state, local pickup, and tracked shipping. | Standard | Categorical tags |
| **Wallapop** | Punchy resale format with condition summary and handover availability. | Standard | Standard hashtags |

### In the Web App:
Above the generated listing card, click on any platform tab (`Universal`, `Vinted`, `eBay`, `Depop`, `Subito`, `Wallapop`) to switch views. The title, description, character counters, and 1-click copy buttons update immediately.

### In the CLI:
Specify your target marketplace with the `--platform` or `-P` flag:
```bash
# Generate tailored for eBay
vintgen -n "Vintage denim jacket" --platform ebay

# Generate tailored for Depop
vintgen -n "Y2K leather boots" --platform depop
```
## Command Line Options

| Option | Short | Description |
| :--- | :--- | :--- |
| `--images <paths>` | `-i` | Comma-separated image files (scans folder if omitted) |
| `--notes <text>` | `-n` | Notes about the item (material, size, defects) |
| `--title <text>` | `-t` | Item title hint |
| `--brand <brand>` | `-b` | Brand name hint |
| `--lang <code>` | `-l` | Language for the listing: `en`, `it`, `fr`, `es`, `de` |
| `--provider <name>` | `-p` | AI provider: `gemini`, `openai`, `claude`, `ollama` |
| `--key <key>` | `-k` | API key override |
| `--model <name>` | `-m` | Model name override |
| `--endpoint <url>` | `-e` | Ollama URL (default: `http://localhost:11434`) |
| `--format <type>` | `-f` | Output format: `text`, `json`, or `vinted` |
| `--output <path>` | `-o` | Output file name (default: `vintgen-listing.txt`) |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

---

## Privacy

- Your API keys stay on your device.
- Photos go directly from your device to the AI provider you select.
- No middleman servers, no tracking, and no data collection.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
