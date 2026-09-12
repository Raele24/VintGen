# VintGen

> **Open-Source AI Listing Generator for Vinted & Secondhand Fashion**  
> Multimodal Vision &bull; Fair Market Pricing &bull; Pure BYOK Privacy &bull; Zero AI Slop

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Angular 21](https://img.shields.io/badge/Angular-21-red.svg)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

---

## Overview

**VintGen** turns raw clothing and accessory photographs into high-converting, search-optimized listings for **Vinted** in seconds.

Built for privacy-conscious resellers, developers, and vintage enthusiasts, VintGen operates on a **strict Bring Your Own Key (BYOK)** model powered by Google Gemini Multimodal Vision.

### Three Delivery Channels:
1. **Web Studio (`apps/web`)**: Modern Angular 21 application with direct client-to-API communication (no proxy, 100% private in your browser).
2. **Terminal CLI (`packages/cli`)**: Scriptable command-line tool for local processing and batch workflows (`npx vintgen`).
3. **Agent Skill (`skills/vintgen`)**: Standardized agent skill for Google Antigravity, Claude Code, GitHub Copilot, and Gemini Gems.

---

## Key Features

- **Multimodal Garment Inspection**: Identifies brand logos, wash tags, fabric composition, silhouette cuts, and micro-flaws from photos.
- **Search-Optimized Titles**: Generates concise, high-CTR titles (under 65 chars) structured for Vinted's search algorithm.
- **Fair-Market Resale Valuation**: Calculates recommended price, minimum negotiation floor, and high ceiling based on brand and condition.
- **Honest Flaw Disclosure**: Discloses visible wear, marks, or alterations to maintain 5-star seller ratings and prevent dispute returns.
- **Vinted Taxonomy Mapping**: Accurately maps items to standard condition levels (`new_with_tags`, `very_good`, `good`, etc.).
- **One-Click Clipboard Export**: Copy title, specs, description, or the entire bundle directly into the Vinted mobile or web app.
- **Zero AI Slop**: Clean, architectural, dark-themed UI. No cartoonish emojis, no rainbow gradient backgrounds, strict typographic hierarchy.

---

## Quick Start

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org/)
- A free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/vintgen/vintgen.git
cd vintgen
npm install
```

### 3. Launch the Web Studio
```bash
npm run web
```
Navigate to `http://localhost:4200` in your browser. Configure your free Gemini API Key in the top right, upload clothing photos, and generate!

### 4. Run via Terminal CLI
```bash
export GEMINI_API_KEY="AIzaSy..."

# Generate a listing from clothing photos
npm run cli -- --images ./jacket_front.jpg,./jacket_tag.jpg --notes "Size L, 100% Cotton"
```

---

## Repository Structure

```
vintgen/
├── apps/
│   └── web/                 # Angular 21 Standalone Web Studio (Signals + SCSS)
├── packages/
│   ├── core/                # Shared AI Engine, JSON Schemas & Platform Adapters
│   └── cli/                 # Terminal CLI binary (vintgen executable)
├── skills/
│   └── vintgen/           # Agent Skill (SKILL.md) & Prompt Templates
├── docs/                    # Architectural & Developer Guides
│   ├── architecture.md      # System data flow and package decoupling
│   ├── byok-security.md     # Private key isolation documentation
│   ├── cli-guide.md         # Full CLI flag and piping manual
│   ├── skills-integration.md# Antigravity, Claude Code & Copilot setup
│   └── adding-providers.md  # How to add Ollama, OpenAI, or Claude
├── package.json             # Root workspace orchestration
└── README.md
```

---

## Security & Privacy (BYOK)

VintGen contains **zero telemetry proxies** and **zero data-logging servers**:
- In the **Web Studio**, your API key is stored exclusively in your browser's local storage and sent directly to Google's official endpoints via client-side `fetch`.
- In the **CLI**, the key remains in-memory for the duration of the command.
- Your photos and listings are never stored on external databases or sold to third parties.

For more information, see [docs/byok-security.md](docs/byok-security.md).

---

## AI Agent Integration

Want your AI assistant to generate Vinted listings for you?

- **Google Antigravity**: Place `skills/vintgen/SKILL.md` inside `.agents/skills/vintgen/SKILL.md`.
- **Gemini Gems / ChatGPT**: Copy the prompt template from `skills/vintgen/prompts/web-instructions.md`.

---

## License

MIT License &copy; 2026 VintGen Contributors.
