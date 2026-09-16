/**
 * VintGen Command-Line Interface (CLI)
 * 
 * Automated, scriptable secondhand fashion listing generator
 * using Multimodal Vision AI directly from your terminal.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { VintGenEngine, ImageInput, ListingInput } from '@vintgen/core';

interface CliConfig {
  apiKey?: string;
  provider?: 'gemini' | 'openai' | 'claude' | 'ollama';
  model?: string;
  language?: 'it' | 'en' | 'fr' | 'es' | 'de' | 'auto';
  endpoint?: string;
  platform?: 'universal' | 'vinted' | 'ebay' | 'depop' | 'subito' | 'wallapop';
}

const CONFIG_DIR = path.join(os.homedir(), '.vintgen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Redacts an API key for safe terminal display.
 */
function redactApiKey(key?: string): string {
  if (!key) return '(not configured)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * Reads an API key interactively without echoing it to the terminal.
 */
function promptMaskedInput(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(promptText, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    process.stdout.write(promptText);
    let input = '';

    const onData = (char: Buffer) => {
      const str = char.toString('utf-8');
      for (const c of str) {
        if (c === '\n' || c === '\r' || c === '\u0004') {
          process.stdin.removeListener('data', onData);
          if (process.stdin.isRaw) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(input.trim());
          return;
        }
        if (c === '\u0003') {
          process.exit(1);
        }
        if (c === '\u0008' || c === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

function loadConfig(): CliConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch { }
  return {};
}

/**
 * Saves configuration with strict POSIX owner-only permissions (0700 dir, 0600 file).
 */
function saveConfig(cfg: Partial<CliConfig>): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    } else {
      try {
        fs.chmodSync(CONFIG_DIR, 0o700);
      } catch { }
    }
    const current = loadConfig();
    const merged = { ...current, ...cfg };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { encoding: 'utf8', mode: 0o600 });
    try {
      fs.chmodSync(CONFIG_FILE, 0o600);
    } catch { }
  } catch (err) {
    console.error('Failed to save configuration:', err);
  }
}

interface CliArgs {
  provider?: 'gemini' | 'openai' | 'claude' | 'ollama';
  endpoint?: string;
  command?: string;
  commandArg?: string;
  images: string[];
  title?: string;
  notes?: string;
  brand?: string;
  condition?: string;
  apiKey?: string;
  model?: string;
  language?: 'it' | 'en' | 'fr' | 'es' | 'de' | 'auto';
  platform?: 'universal' | 'vinted' | 'ebay' | 'depop' | 'subito' | 'wallapop';
  format: 'text' | 'json' | 'markdown' | 'vinted';
  output?: string;
  help: boolean;
  version: boolean;
}

const PACKAGE_VERSION = '1.0.2';

/**
 * Parses raw command-line arguments into structured configuration.
 */
function parseArguments(args: string[]): CliArgs {
  const result: CliArgs = {
    images: [],
    format: 'text',
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--provider' || arg === '-p') {
      i++;
      if (i < args.length) {
        const val = args[i].toLowerCase();
        if (val === 'gemini' || val === 'openai' || val === 'claude' || val === 'ollama') {
          result.provider = val;
        }
      }
    } else if (arg === '--endpoint' || arg === '-e') {
      i++;
      if (i < args.length) result.endpoint = args[i];
    } else if (arg === '--images' || arg === '-i') {
      i++;
      if (i < args.length) {
        result.images = args[i].split(',').map((s) => s.trim());
      }
    } else if (arg === '--title' || arg === '-t') {
      i++;
      if (i < args.length) result.title = args[i];
    } else if (arg === '--notes' || arg === '-n') {
      i++;
      if (i < args.length) result.notes = args[i];
    } else if (arg === '--brand' || arg === '-b') {
      i++;
      if (i < args.length) result.brand = args[i];
    } else if (arg === '--key' || arg === '-k') {
      i++;
      if (i < args.length) result.apiKey = args[i];
    } else if (arg === '--model' || arg === '-m') {
      i++;
      if (i < args.length) result.model = args[i];
    } else if (arg === '--format' || arg === '-f') {
      i++;
      if (i < args.length) {
        const val = args[i].toLowerCase();
        if (val === 'json' || val === 'markdown' || val === 'vinted' || val === 'text') {
          result.format = val;
        }
      }
    } else if (arg === '--output' || arg === '-o') {
      i++;
      if (i < args.length) result.output = args[i];
    } else if (arg === '--platform' || arg === '-P') {
      i++;
      if (i < args.length) {
        result.platform = args[i].toLowerCase() as any;
      }
    } else if (arg === '--lang' || arg === '-l') {
      i++;
      if (i < args.length) {
        result.language = args[i] as any;
      }
    } else if (!result.command && !arg.startsWith('-')) {
      result.command = arg;
    } else if (result.command && !result.commandArg && !arg.startsWith('-')) {
      result.commandArg = arg;
    }

    i++;
  }

  return result;
}

/**
 * Displays command-line help instructions.
 */
function printHelp(): void {
  console.log(`
vintgen v${PACKAGE_VERSION}
Open-Source AI Listing Generator for Secondhand Marketplaces

USAGE:
  $ vintgen                                    (auto-detects images in current directory)
  $ vintgen -n "Size M, 100% silk, excellent"  (with seller notes)
  $ vintgen -i front.jpg,tag.jpg               (manual image paths)
  $ vintgen config --key <key> --provider <name> (save key and provider in ~/.vintgen/config.json)

COMMANDS:
  generate              Generate listing (default)
  set-key [key]         Save API key permanently (run without args for masked input)
  config                View or update configuration (--key, --provider, --model, --lang)
  test-key              Test connection to configured AI provider

OPTIONS:
  -i, --images <paths>  Comma-separated image paths (scans directory if omitted)
  -n, --notes <text>    Seller notes (condition details, fabric, fit, flaws)
  -t, --title <text>    Tentative or rough item title
  -b, --brand <brand>   Brand hint or confirmation
  -l, --lang <code>     Listing language: en (default), it, fr, es, de
  -k, --key <key>       API key (prefer environment variables to prevent shell history leaks)
  -p, --provider <name> AI provider: gemini (default), openai, claude, ollama
  -m, --model <name>    Model name (e.g. custom or provider-specific model)
  -e, --endpoint <url>  Ollama endpoint URL (default: http://localhost:11434)
  -P, --platform <name> Target platform: universal (default), vinted, ebay, depop, subito, wallapop
  -f, --format <type>   Output format: text (default), json, markdown
  -o, --output <file>   Write output to destination file (defaults to vintgen-listing.txt)
  -v, --version         Print CLI version
  -h, --help            Print help information

ENVIRONMENT VARIABLES (RECOMMENDED FOR SECURITY):
  GEMINI_API_KEY        Google Gemini API Key
  OPENAI_API_KEY        OpenAI API Key
  ANTHROPIC_API_KEY     Anthropic Claude API Key
  OLLAMA_HOST           Ollama host URL (default: http://localhost:11434)

EXAMPLES:
  $ vintgen config --provider gemini --key <YOUR_KEY>
  $ vintgen config --provider openai --key <YOUR_KEY>
  $ vintgen config --provider ollama
  $ cd path/to/jacket_photos
  $ vintgen
  $ vintgen -n "Vintage 90s Ralph Lauren polo" -l it
`);
}

/**
 * Scans directory for supported image formats.
 */
function findImagesInDir(dir: string): string[] {
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.jfif']);
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((f) => supported.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Infers MIME type from file extension.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.jfif':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/**
 * Main execution routine.
 */
async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const savedConfig = loadConfig();

  if (args.version) {
    console.log(`vintgen v${PACKAGE_VERSION}`);
    process.exitCode = 0; return;
  }

  if (args.apiKey || (args.command === 'set-key' && args.commandArg && args.commandArg !== '-')) {
    console.warn('\nSecurity advisory: Passing API keys as command line arguments can expose them in shell history and system process listings.');
    console.warn('Recommended: Use environment variables (e.g. export GEMINI_API_KEY=...) or interactive input ("vintgen set-key").\n');
  }

  // Handle set-key shortcut
  if (args.command === 'set-key') {
    let keyToSave = args.commandArg || args.apiKey;
    if (!keyToSave || keyToSave === '-') {
      keyToSave = await promptMaskedInput('Enter API key (input hidden): ');
    }
    if (!keyToSave) {
      console.error('Error: No API key provided.');
      process.exitCode = 1; return;
    }
    const targetProvider = args.provider || savedConfig.provider || 'gemini';
    saveConfig({ apiKey: keyToSave, provider: targetProvider });
    console.log(`API Key successfully saved for provider "${targetProvider}" to ${CONFIG_FILE} (permissions: 0600 owner only).`);
    console.log('You can now run "vintgen" in any folder without passing --key.');
    process.exitCode = 0; return;
  }

  // Handle config command
  if (args.command === 'config') {
    if (args.apiKey || args.provider || args.language || args.model || args.endpoint || args.platform) {
      const updates: Partial<CliConfig> = {};
      if (args.apiKey) updates.apiKey = args.apiKey;
      if (args.provider) updates.provider = args.provider;
      if (args.language) updates.language = args.language;
      if (args.model) updates.model = args.model;
      if (args.endpoint) updates.endpoint = args.endpoint;
      if (args.platform) updates.platform = args.platform;
      saveConfig(updates);
      const current = loadConfig();
      const safeDisplay = { ...current, apiKey: redactApiKey(current.apiKey) };
      console.log(`Configuration updated in ${CONFIG_FILE} (permissions: 0600):`, safeDisplay);
    } else {
      const safeDisplay = { ...savedConfig, apiKey: redactApiKey(savedConfig.apiKey) };
      console.log('Current configuration:', safeDisplay);
      console.log(`Config file: ${CONFIG_FILE} (permissions: 0600 owner only)`);
      console.log('Environment variables: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY');
    }
    process.exitCode = 0; return;
  }

  if (args.help) {
    printHelp();
    process.exitCode = 0; return;
  }

  const provider = args.provider || savedConfig.provider || 'gemini';
  const endpoint = args.endpoint || (provider === 'ollama' ? (savedConfig.endpoint || process.env.OLLAMA_HOST || 'http://localhost:11434') : (savedConfig.provider === provider ? savedConfig.endpoint : undefined));
  const language = args.language || savedConfig.language || 'en';
  const model = args.model || savedConfig.model;

  let defaultEnvKey: string | undefined;
  if (provider === 'claude') {
    defaultEnvKey = process.env.ANTHROPIC_API_KEY;
  } else if (provider === 'openai') {
    defaultEnvKey = process.env.OPENAI_API_KEY;
  } else if (provider === 'ollama') {
    defaultEnvKey = process.env.OLLAMA_API_KEY || '';
  } else {
    defaultEnvKey = process.env.GEMINI_API_KEY;
  }

  const apiKey = args.apiKey || savedConfig.apiKey || defaultEnvKey;

  if (provider !== 'ollama' && !apiKey) {
    const providerName = provider === 'claude' ? 'Anthropic Claude' : (provider === 'openai' ? 'OpenAI' : 'Google Gemini');
    const envVar = provider === 'claude' ? 'ANTHROPIC_API_KEY' : (provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY');
    const url = provider === 'claude'
      ? 'https://console.anthropic.com/settings/keys'
      : (provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/apikey');

    console.error(`\nError: ${providerName} API Key not found.`);
    console.error('You can save your key permanently with:');
    console.error('  $ vintgen set-key <YOUR_API_KEY>\n');
    console.error('Or pass it via flag or environment variable:');
    console.error(`  - Flag: --key <YOUR_KEY>`);
    console.error(`  - Environment: export ${envVar}="<YOUR_KEY>"`);
    console.error(`\nGet your free key at: ${url}\n`);
    process.exitCode = 1; return;
  }

  const engine = new VintGenEngine();

  // Test connection command
  if (args.command === 'test-key') {
    const targetDesc = provider === 'ollama' ? `Ollama instance at ${endpoint || 'http://localhost:11434'}` : `${provider.toUpperCase()} API key`;
    console.log(`Testing connection with ${targetDesc}...`);
    const result = await engine.testProvider(provider, {
      apiKey: apiKey || '',
      model,
      baseUrl: endpoint,
    });
    if (result.success) {
      console.log(`[SUCCESS] ${result.message}`);
      process.exitCode = 0; return;
    } else {
      console.error(`[FAILURE] ${result.message}`);
      process.exitCode = 1; return;
    }
  }

  // Resolve images: either from -i flag OR automatic discovery in current directory!
  let resolvedImagePaths: string[] = [];
  if (args.images && args.images.length > 0) {
    resolvedImagePaths = args.images.map((p) => path.resolve(process.cwd(), p));
  } else {
    const autoFound = findImagesInDir(process.cwd());
    if (autoFound.length > 0) {
      resolvedImagePaths = autoFound;
      console.log(`Auto-detected ${autoFound.length} image(s) in current directory:`);
      autoFound.forEach((f) => console.log(`    - ${path.basename(f)}`));
    }
  }

  const imageInputs: ImageInput[] = [];
  for (const imgPath of resolvedImagePaths) {
    if (!fs.existsSync(imgPath)) {
      console.error(`Error: Image file not found at ${imgPath}`);
      process.exitCode = 1; return;
    }

    try {
      const buffer = fs.readFileSync(imgPath);
      const mimeType = getMimeType(imgPath);
      imageInputs.push({
        data: buffer.toString('base64'),
        mimeType,
        fileName: path.basename(imgPath),
      });
    } catch (err) {
      console.error(`Error reading image ${imgPath}:`, err);
      process.exitCode = 1; return;
    }
  }

  if (imageInputs.length === 0 && !args.title && !args.notes) {
    console.error('\nError: No images provided or found in the current directory.');
    console.error('Tips:');
    console.error('  1. Place item photos in this folder and run "vintgen"');
    console.error('  2. Or specify image files: vintgen -i front.jpg,tag.jpg');
    console.error('  3. Or provide item notes: vintgen -n "Vintage black leather jacket"\n');
    process.exitCode = 1; return;
  }

  const providerNames: Record<string, string> = {
    claude: 'Anthropic Claude',
    openai: 'OpenAI',
    ollama: 'Local Ollama',
    gemini: 'Google Gemini',
  };
  const baseProviderName = providerNames[provider] || 'AI Vision Model';
  const providerDisplay = model ? `${baseProviderName} (${model})` : baseProviderName;
  console.log(`\nAnalyzing item with ${providerDisplay} (${imageInputs.length} image(s), language: ${language.toUpperCase()})...`);

  const listingInput: ListingInput = {
    images: imageInputs,
    titleHint: args.title,
    notes: args.notes,
    brandHint: args.brand,
    language,
  };

  try {
    const platformId = args.platform || savedConfig.platform || 'universal';
    const { raw, formatted } = await engine.generate(listingInput, {
      apiKey: apiKey || '',
      model,
      baseUrl: endpoint,
      providerId: provider,
      platformId,
    });

    let outputContent = '';

    if (args.format === 'json') {
      outputContent = JSON.stringify(raw, null, 2);
    } else if (args.format === 'markdown' || args.format === 'vinted') {
      outputContent = formatted.fullBundleText;
    } else {
      outputContent = [
        '============================================================',
        `  VINTGEN LISTING: ${raw.title}`,
        '============================================================',
        `Title:       ${raw.title}`,
        `Price:       EUR ${raw.price.suggested.toFixed(2)} (Range: EUR ${raw.price.min.toFixed(2)} - EUR ${raw.price.max.toFixed(2)})`,
        `Reasoning:   ${raw.price.reasoning}`,
        `Brand:       ${raw.brand}`,
        `Size:        ${raw.size}`,
        `Condition:   ${raw.condition}`,
        `Category:    ${raw.category}`,
        `Color:       ${raw.color}`,
        `Material:    ${raw.material}`,
        `Fit:         ${raw.fitNotes}`,
        '------------------------------------------------------------',
        'DESCRIPTION:',
        formatted.description,
        '============================================================',
      ].join('\n');
    }

    console.log(`\n${outputContent}`);

    // Write output to file
    const targetFile = args.output
      ? path.resolve(process.cwd(), args.output)
      : path.resolve(process.cwd(), 'vintgen-listing.txt');

    fs.writeFileSync(targetFile, outputContent, 'utf-8');
    console.log(`Listing successfully saved to: ${path.basename(targetFile)}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\nGeneration failed: ${errorMsg}`);
    process.exitCode = 1; return;
  }
}

main().catch((err) => {
  console.error('Unexpected CLI error:', err);
  process.exitCode = 1; return;
});

