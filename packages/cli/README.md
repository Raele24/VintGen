# vintgen

> Open-Source AI Listing Generator for Vinted and Secondhand Reselling.

Generate search-optimized listings for online marketplaces (such as Vinted, eBay, Depop, Subito, and Wallapop) directly from your terminal using Multimodal Vision AI.

[![npm version](https://img.shields.io/npm/v/vintgen.svg)](https://www.npmjs.com/package/vintgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Ecosystem

VintGen is also available as:
- **Web App & PWA:** [https://vintgen-ai.vercel.app](https://vintgen-ai.vercel.app)
- **Windows Desktop (Installer & Portable):** [GitHub Releases](https://github.com/Raele24/VintGen/releases)
- **Android Mobile App (APK):** [GitHub Releases](https://github.com/Raele24/VintGen/releases)

---

## Quick Start

### 1. Run without installation (via npx):
```bash
npx vintgen
```

### 2. Or install globally:
```bash
npm install -g vintgen
```

---

## Provider Setup

Configure an API key for your preferred AI provider, or run 100% locally with Ollama:

```bash
# Set key for Google Gemini (default provider)
vintgen config --provider gemini --key <YOUR_KEY>

# Or set key for OpenAI
vintgen config --provider openai --key <YOUR_KEY>

# Or set key for Anthropic Claude
vintgen config --provider claude --key <YOUR_KEY>

# Or use local Ollama (no API key required, runs offline)
vintgen config --provider ollama
```

You can also provide API keys via environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) or CLI flags (`-k, --key`).

---

## Usage

### Automatic Folder Scan (Default)
Place item photos in any folder, navigate to it in your terminal, and run:
```bash
vintgen
```

vintgen will:
1. Auto-detect supported image files in the directory (.jpg, .png, .webp, .heic).
2. Analyze the item using Vision AI (brand, size, condition, material, color).
3. Compute a secondary market valuation (with suggested floor and ceiling prices).
4. Output the ready-to-copy listing and write vintgen-listing.txt to the directory.

### With Seller Notes:
```bash
vintgen -n "Size M, pure silk, vintage 90s Ralph Lauren"
```

### Language Selection:
```bash
# Italian listing
vintgen -l it -n "Ottime condizioni, pura lana vergine"

# English listing (default)
vintgen -l en

# French, Spanish, or German
vintgen -l fr
```

### Specify Images Manually:
```bash
vintgen -i ./front.jpg,./tag.jpg,./details.jpg
```

---

## Options

| Option | Description |
| :--- | :--- |
| -i, --images <paths> | Comma-separated image paths (scans folder if omitted) |
| -n, --notes <text> | Seller notes (condition details, fabric, fit, flaws) |
| -t, --title <text> | Tentative or rough item title |
| -b, --brand <brand> | Brand hint or confirmation |
| -l, --lang <code> | Listing language: en (default), it, fr, es, de |
| -k, --key <key> | API key (defaults to saved config or environment variable) |
| -p, --provider <name> | AI provider: gemini (default), openai, claude, ollama |
| -m, --model <name> | Model name (e.g. gemini-2.5-flash, gpt-4o-mini, llama3.2-vision) |
| -e, --endpoint <url> | Ollama endpoint URL (default: http://localhost:11434) |
| -f, --format <type> | Output format: text (default), json, vinted |
| -o, --output <file> | Custom output file path (defaults to vintgen-listing.txt) |
| -h, --help | Display help information |
| -v, --version | Display version |

---

## License

MIT (c) Raele24
