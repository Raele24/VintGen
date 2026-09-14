# vintgen

> Create marketplace listings from clothing photos directly in your terminal.

VintGen scans photos of clothes and writes ready-to-copy listings for Vinted, eBay, Depop, Subito, and Wallapop, with suggested prices and descriptions.

[![npm version](https://img.shields.io/npm/v/vintgen.svg)](https://www.npmjs.com/package/vintgen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Other Platforms

VintGen is also available as:
- **Web App (Browser):** [https://vintgen-ai.vercel.app](https://vintgen-ai.vercel.app)
- **Windows App (Installer & Portable):** [GitHub Releases](https://github.com/Raele24/VintGen/releases)
- **Android App (APK):** [GitHub Releases](https://github.com/Raele24/VintGen/releases)

---

## Quick Start

### 1. Run without installing:
```bash
npx vintgen
```

### 2. Or install globally:
```bash
npm install -g vintgen
```

---

## Setting Up Your AI Provider

Choose your preferred AI provider or run 100% offline with Ollama:

```bash
# Example: Google Gemini
vintgen config --provider gemini --key <YOUR_KEY>

# Example: OpenAI
vintgen config --provider openai --key <YOUR_KEY>

# Example: Anthropic Claude
vintgen config --provider claude --key <YOUR_KEY>

# Example: local Ollama (runs offline on your PC, no key needed)
vintgen config --provider ollama
```

You can also pass keys using environment variables (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) or the `-k, --key` flag.

---

## How to Use

### Scan the current folder (Default)
Place photos in any folder, open your terminal there, and run:
```bash
vintgen
```

vintgen will:
1. Find image files in the folder (.jpg, .png, .webp, .heic).
2. Inspect the item (brand, size, condition, material, color).
3. Suggest realistic resale prices (minimum, recommended, maximum).
4. Print the listing and save it to `vintgen-listing.txt`.

### With Seller Notes:
```bash
vintgen -n "Size M, pure silk, vintage Ralph Lauren"
```

### Choose Language:
```bash
# Italian
vintgen -l it -n "Ottime condizioni, pura lana vergine"

# English (default)
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

| Option | Short | Description |
| :--- | :--- | :--- |
| `--images <paths>` | `-i` | Comma-separated image paths (scans folder if omitted) |
| `--notes <text>` | `-n` | Notes about the item (condition, fabric, flaws) |
| `--title <text>` | `-t` | Item title hint |
| `--brand <brand>` | `-b` | Brand name hint |
| `--lang <code>` | `-l` | Language for listing: `en` (default), `it`, `fr`, `es`, `de` |
| `--provider <name>` | `-p` | AI provider: `gemini`, `openai`, `claude`, `ollama` |
| `--key <key>` | `-k` | API key override |
| `--model <name>` | `-m` | Model name override |
| `--endpoint <url>` | `-e` | Ollama URL (default: `http://localhost:11434`) |
| `--format <type>` | `-f` | Output format: `text` (default), `json`, `vinted` |
| `--output <file>` | `-o` | Output file path (default: `vintgen-listing.txt`) |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

---

## License

MIT License.
