# VintStack CLI User Guide

The `vintstack` CLI brings automated AI listing generation straight into your terminal, ideal for power resellers, script automation, and bulk inventory workflows.

---

## 1. Quick Start

Ensure you have your Google Gemini API key:

```bash
export GEMINI_API_KEY="AIzaSyYourActualKeyHere"
```

Run directly without installing via `npx`:

```bash
npx vintstack --images ./jacket_front.jpg,./jacket_label.jpg --notes "Size L, 100% Wool"
```

Or run locally within this workspace:

```bash
npm run cli -- --images ./jacket_front.jpg --lang it
```

---

## 2. Command Reference

### Basic Syntax
```bash
vintstack [command] [options]
```

### Commands
| Command | Description |
|---|---|
| `generate` | Analyze images/notes and generate a Vinted listing (default). |
| `test-key` | Test connection to Gemini API with your current key. |

### Options
| Flag | Short | Default | Description |
|---|---|---|---|
| `--images` | `-i` | — | Comma-separated list of image paths (`.jpg`, `.png`, `.webp`). |
| `--title` | `-t` | — | Tentative or rough title hint. |
| `--notes` | `-n` | — | Seller notes (fabric composition, flaws, fit, provenance). |
| `--brand` | `-b` | — | Brand hint. |
| `--key` | `-k` | `$GEMINI_API_KEY` | Google Gemini API Key. |
| `--model` | `-m` | `gemini-2.5-flash` | Model identifier. |
| `--lang` | `-l` | `it` | Target language (`it`, `en`, `fr`, `es`, `de`). |
| `--format` | `-f` | `text` | Output format: `text`, `json`, or `vinted`. |
| `--output` | `-o` | — | Write output to a designated file. |
| `--version` | `-v` | — | Print CLI version. |
| `--help` | `-h` | — | Print help menu. |

---

## 3. Practical Examples

### 1. Test Key Connection
```bash
vintstack test-key --key "AIzaSy..."
```

### 2. Multi-image Analysis with Flaw Disclosure
```bash
vintstack \
  --images ./sneakers_profile.jpg,./sneakers_sole.jpg,./sneakers_box.jpg \
  --notes "Minor scuff on the left heel, worn twice, includes original box" \
  --lang it
```

### 3. Output Machine-Readable JSON for Scripts
```bash
vintstack \
  --images ./hoodie.jpg \
  --format json \
  --output ./listing_output.json
```

### 4. Copy-Ready Vinted Description Only
```bash
vintstack \
  --images ./dress.jpg \
  --format vinted
```
