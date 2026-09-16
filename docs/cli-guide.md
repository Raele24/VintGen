# VintGen CLI User Guide

The `vintgen` CLI provides listing creation directly in your terminal from item photos.
Published on [npm (vintgen)](https://www.npmjs.com/package/vintgen).

---

## 1. Quick Start

Run directly without installation via `npx`:

```bash
npx vintgen
```

Or install globally:

```bash
npm install -g vintgen
```

---

## 2. Provider Setup

VintGen supports multi-provider Bring Your Own Key (BYOK) configurations and local offline models.

### Recommended: Environment Variables (Highest Security)
Environment variables prevent secrets from entering shell history (`~/.bash_history`, PowerShell PSReadLine) and process inspection tables (`ps aux`, Task Manager):

```bash
export GEMINI_API_KEY="<YOUR_KEY>"
export OPENAI_API_KEY="<YOUR_KEY>"
export ANTHROPIC_API_KEY="<YOUR_KEY>"
```

### Workstation Persistence (Interactive Masked Input)
To persist credentials locally on your workstation, use `vintgen set-key` without arguments. It prompts for the key with muted terminal input and enforces POSIX `0600` permissions on `~/.vintgen/config.json`:

```bash
# Prompts for key with hidden input
vintgen set-key

# Local Ollama (100% offline, zero API key required)
vintgen config --provider ollama
```

---

## 3. Command Reference

### Basic Syntax
```bash
vintgen [options]
```

### Options
| Flag | Short | Default | Description |
| :--- | :--- | :--- | :--- |
| `--images` | `-i` | (auto) | Comma-separated list of image paths (.jpg, .png, .webp, .heic). Scans folder if omitted. |
| `--notes` | `-n` | none | Seller notes (fabric composition, flaws, fit, provenance). |
| `--title` | `-t` | none | Tentative or rough title hint. |
| `--brand` | `-b` | none | Brand hint or override. |
| `--lang` | `-l` | `en` | Target language (`en`, `it`, `fr`, `es`, `de`). |
| `--provider` | `-p` | `gemini` | AI provider (`gemini`, `openai`, `claude`, `ollama`). |
| `--key` | `-k` | none | API key override. |
| `--model` | `-m` | auto | Model identifier override. |
| `--endpoint` | `-e` | `http://localhost:11434` | Ollama endpoint URL. |
| `--platform` | `-P` | `universal` | Target marketplace (`universal`, `vinted`, `ebay`, `depop`, `subito`, `wallapop`). |
| `--format` | `-f` | `text` | Output format: `text`, `json`, or `markdown`. |
| `--output` | `-o` | `vintgen-listing.txt` | Custom output file destination. |
| `--version` | `-v` | none | Print CLI version. |
| `--help` | `-h` | none | Print help menu. |

---

## 4. Usage Examples

### 1. Automatic Folder Scan
Navigate to any directory with item photos:
```bash
cd /path/to/photos
vintgen
```

### 2. Multi-image Analysis with Seller Notes
```bash
vintgen \
  -i ./front.jpg,./label.jpg,./cuff.jpg \
  -n "Vintage 1990s wool overcoat, size 48, missing bottom button" \
  -l it
```

### 3. Machine-Readable JSON Export
```bash
vintgen -i ./item.jpg -f json -o ./listing.json
```

### 4. Vinted-Formatted Description Only
```bash
vintgen -i ./item.jpg -f vinted
```




