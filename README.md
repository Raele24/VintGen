# VintGen

> Open-Source AI Listing Generator for Vinted and Secondhand Reselling.  
> Multimodal Vision AI, Market Valuation, Multi-Provider BYOK Architecture.

[![npm version](https://img.shields.io/npm/v/vintgen.svg)](https://www.npmjs.com/package/vintgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Angular 21](https://img.shields.io/badge/Angular-21-red.svg)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Web App](https://img.shields.io/badge/Web_App-Live-success.svg)](https://vintgen-ai.vercel.app)

---

## Overview

VintGen transforms clothing and accessory photographs into complete, search-optimized listings for online marketplaces (such as Vinted, eBay, Depop, Subito, and Wallapop) in seconds.

Powered by Multimodal Vision AI, VintGen inspects garment details, identifies brand tags, detects fabric composition, spots micro-flaws, and computes fair secondary-market valuations with recommended pricing corridors.

VintGen is fully open-source and operates on a strict Bring Your Own Key (BYOK) model with multi-provider support: Google Gemini, OpenAI, Anthropic Claude, and 100% offline local models via Ollama.

---

## Delivery Channels & Installation Index

VintGen is distributed across multiple platforms to fit different selling workflows:

| Platform | Channel | Distribution | Requirements |
| :--- | :--- | :--- | :--- |
| Web App & PWA | Cloud / Instant | https://vintgen-ai.vercel.app | Any modern web browser |
| Android | Native Mobile App | GitHub Releases (`VintGen-v1.0.0.apk`) | Android 8.0+ |
| Windows (Installer) | Desktop Application | GitHub Releases (`VintGen-Windows-Installer.exe`) | Windows 10 / 11 |
| Windows (Portable) | Standalone Executable | GitHub Releases (`VintGen-Windows-Portable.exe`) | Windows 10 / 11 |
| Terminal CLI | Developer Tool (npm) | `npx vintgen` / `npm i -g vintgen` | Node.js 18+ |
| Self-Hosted | Source Code | `git clone` from GitHub | Node.js 18+, npm |

---

## Platform Details

### 1. Web App & Progressive Web App (PWA)
- Live URL: [https://vintgen-ai.vercel.app](https://vintgen-ai.vercel.app)
- Instant access with zero setup or installation.
- Fully installable on iOS and Android home screens as an offline-capable PWA.
- All AI processing executes directly client-side via your browser; your API keys and images are never sent through intermediate proxy servers.

### 2. Android Mobile Application
- Download: [GitHub Releases](https://github.com/Raele24/VintGen/releases) -> `VintGen-v1.0.0.apk`
- Features direct camera capture to snap clothing photos and generate listings on the go.
- Includes automated Over-The-Air (OTA) synchronization to keep the client updated with the latest improvements.

### 3. Windows Desktop Application
- Built with Tauri v2 for ultra-fast startup and minimal resource usage.
- Two distribution formats available on [GitHub Releases](https://github.com/Raele24/VintGen/releases):
  - **Installer (`VintGen-Windows-Installer.exe`):** Standard NSIS installer that configures shortcuts and start menu entries.
  - **Portable (`VintGen-Windows-Portable.exe`):** Standalone executable that runs immediately without installation or admin rights.

### 4. Terminal CLI (`vintgen`)
Ideal for power resellers, batch processing, and script automation.

Run immediately without installation:
```bash
npx vintgen
```

Or install globally:
```bash
npm install -g vintgen
```

Automatic directory scan workflow:
Place photos of an item inside a folder, open your terminal in that folder, and run:
```bash
vintgen
```

Generate listing with seller notes and target language:
```bash
vintgen -n "Pure wool coat, size L, 1990s vintage, minor button defect" -l en
```

### 5. Self-Hosted & Local Development
Clone the repository and run the development environment locally:
```bash
git clone https://github.com/Raele24/VintGen.git
cd VintGen
npm install
```

Start the Web Studio on `http://localhost:4200`:
```bash
npm run web
```

Build the CLI binary:
```bash
npm run build:cli
```

---

## Supported AI Providers (BYOK)

VintGen does not lock you into a single vendor. You can configure any of the following providers:

| Provider | Provider ID | Recommended Model | API Key Source |
| :--- | :--- | :--- | :--- |
| Google Gemini | `gemini` | `gemini-2.5-flash` | Google AI Studio |
| OpenAI | `openai` | `gpt-4o-mini` | OpenAI Platform |
| Anthropic Claude | `claude` | `claude-3-5-sonnet` | Anthropic Console |
| Ollama (Local) | `ollama` | `llama3.2-vision` | Local (No key required) |

### Configuring Providers

#### In Web & Desktop Apps:
Click on the **API Settings** button in the navigation header to select your provider, enter your key, or specify a custom local Ollama endpoint.

#### In the Terminal CLI:
Use the `config` command to persist your settings:
```bash
# Set key for Google Gemini (default provider)
vintgen config --provider gemini --key <YOUR_API_KEY>

# Set key for OpenAI
vintgen config --provider openai --key <YOUR_API_KEY>

# Set key for Anthropic Claude
vintgen config --provider claude --key <YOUR_API_KEY>

# Enable local Ollama (offline, zero API key)
vintgen config --provider ollama
```

You can also provide API keys through environment variables:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

---

## CLI Options Reference

| Option | Shorthand | Description |
| :--- | :--- | :--- |
| `--images <paths>` | `-i` | Comma-separated list of image files (auto-scans folder if omitted) |
| `--notes <text>` | `-n` | Seller notes (material, fit, provenance, flaws) |
| `--title <text>` | `-t` | Preliminary or rough item title |
| `--brand <brand>` | `-b` | Brand hint or override |
| `--lang <code>` | `-l` | Listing output language: `en` (default), `it`, `fr`, `es`, `de` |
| `--provider <name>` | `-p` | AI provider: `gemini`, `openai`, `claude`, `ollama` |
| `--key <key>` | `-k` | API key (overrides saved configuration and environment variables) |
| `--model <name>` | `-m` | Model name override |
| `--endpoint <url>` | `-e` | Custom endpoint for Ollama (default: `http://localhost:11434`) |
| `--format <type>` | `-f` | Output format: `text` (default), `json`, or `vinted` |
| `--output <path>` | `-o` | Destination file for the generated listing (default: `vintgen-listing.txt`) |
| `--help` | `-h` | Display command-line usage information |
| `--version` | `-v` | Display installed version |

---

## Repository Architecture

```
VintGen/
├── apps/
│   └── web/                 # Angular 21 Standalone Studio (Signals + SCSS)
├── packages/
│   ├── core/                # Shared AI Provider adapters & schemas
│   └── cli/                 # Published npm CLI package (vintgen)
├── src-tauri/               # Tauri v2 Windows Desktop integration
├── android/                 # Android Capacitor project
├── docs/                    # Architecture and development manuals
└── README.md                # Project documentation
```

---

## Privacy & Security

- **Strict BYOK:** Your API keys remain on your device (stored in local browser storage or CLI configuration file).
- **Direct Requests:** Network calls go straight from your client machine to the selected AI provider.
- **Zero Intermediaries:** There are no backend proxy servers, tracking telemetry, or remote databases collecting your photos or listings.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
