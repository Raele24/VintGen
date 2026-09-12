/**
 * VintStack Command-Line Interface (CLI)
 * 
 * Provides automated, scriptable secondhand fashion listing generation
 * using Google Gemini Multimodal Vision API directly from the terminal.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VintStackEngine, ImageInput, ListingInput } from '@vintstack/core';

interface CliArgs {
  command?: string;
  images: string[];
  title?: string;
  notes?: string;
  brand?: string;
  condition?: string;
  apiKey?: string;
  model?: string;
  language?: 'it' | 'en' | 'fr' | 'es' | 'de' | 'auto';
  format: 'text' | 'json' | 'vinted';
  output?: string;
  help: boolean;
  version: boolean;
}

const PACKAGE_VERSION = '1.0.0';

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
        if (val === 'json' || val === 'vinted' || val === 'text') {
          result.format = val;
        }
      }
    } else if (arg === '--output' || arg === '-o') {
      i++;
      if (i < args.length) result.output = args[i];
    } else if (arg === '--lang' || arg === '-l') {
      i++;
      if (i < args.length) {
        result.language = args[i] as any;
      }
    } else if (!result.command && !arg.startsWith('-')) {
      result.command = arg;
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
vintstack v${PACKAGE_VERSION}
Open-Source AI Listing Generator for Vinted & Secondhand Reselling

USAGE:
  $ vintstack [command] [options]
  $ npx vintstack --images path/to/shirt.jpg --notes "Size M, 100% silk"

COMMANDS:
  generate              Generate a listing (default)
  test-key              Test Gemini API key connection

OPTIONS:
  -i, --images <paths>  Comma-separated paths to product images (jpg, png, webp)
  -t, --title <text>    Tentative or rough item title
  -n, --notes <text>    Seller notes (condition details, fabric, fit, flaws)
  -b, --brand <brand>   Brand hint or confirmation
  -k, --key <key>       Google Gemini API key (defaults to $GEMINI_API_KEY env)
  -m, --model <name>    Gemini model (default: gemini-2.5-flash)
  -l, --lang <code>     Language: it, en, fr, es, de (default: it)
  -f, --format <type>   Output format: text (default), json, vinted
  -o, --output <file>   Write output to a destination file
  -v, --version         Print CLI version
  -h, --help            Print help information

EXAMPLES:
  $ export GEMINI_API_KEY="AIzaSy..."
  $ vintstack -i ./front.jpg,./tag.jpg -n "Vintage 90s Ralph Lauren polo"
  $ vintstack -i ./shoes.jpg --format json -o listing.json
`);
}

/**
 * Infers MIME type from file extension.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
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

  if (args.version) {
    console.log(`vintstack v${PACKAGE_VERSION}`);
    process.exitCode = 0; return;
  }

  if (args.help || (process.argv.length <= 2 && !args.command)) {
    printHelp();
    process.exitCode = 0; return;
  }

  const apiKey = args.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`\nError: Gemini API Key not found.`);
    console.error(`Please provide your key using:`);
    console.error(`  - Flag: --key <YOUR_GEMINI_API_KEY>`);
    console.error(`  - Environment: export GEMINI_API_KEY="<YOUR_KEY>"`);
    console.error(`\nGet your free key at: https://aistudio.google.com/app/apikey\n`);
    process.exitCode = 1; return;
  }

  const engine = new VintStackEngine();

  // Test connection command
  if (args.command === 'test-key') {
    console.log('Testing Gemini API key connection...');
    const result = await engine.testProvider('gemini', {
      apiKey,
      model: args.model,
    });
    if (result.success) {
      console.log(`[SUCCESS] ${result.message}`);
      process.exitCode = 0; return;
    } else {
      console.error(`[FAILURE] ${result.message}`);
      process.exitCode = 1; return;
    }
  }

  // Read images if provided
  const imageInputs: ImageInput[] = [];
  for (const imgPath of args.images) {
    const resolvedPath = path.resolve(process.cwd(), imgPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Image file not found at ${resolvedPath}`);
      process.exitCode = 1; return;
    }

    try {
      const buffer = fs.readFileSync(resolvedPath);
      const mimeType = getMimeType(resolvedPath);
      imageInputs.push({
        data: buffer.toString('base64'),
        mimeType,
        fileName: path.basename(resolvedPath),
      });
    } catch (err) {
      console.error(`Error reading image ${resolvedPath}:`, err);
      process.exitCode = 1; return;
    }
  }

  if (imageInputs.length === 0 && !args.title && !args.notes) {
    console.error('Error: Please provide at least one image (--images) or descriptive notes (--notes).');
    process.exitCode = 1; return;
  }

  console.log(`Analyzing item with Gemini Multimodal Vision (${imageInputs.length} image(s))...`);

  const listingInput: ListingInput = {
    images: imageInputs,
    titleHint: args.title,
    notes: args.notes,
    brandHint: args.brand,
    language: args.language || 'it',
  };

  try {
    const { raw, formatted } = await engine.generate(listingInput, {
      apiKey,
      model: args.model,
    });

    let outputContent = '';

    if (args.format === 'json') {
      outputContent = JSON.stringify(raw, null, 2);
    } else if (args.format === 'vinted') {
      outputContent = formatted.fullBundleText;
    } else {
      // Default clean formatted terminal representation
      outputContent = [
        '============================================================',
        `  VINTSTACK LISTING: ${raw.title}`,
        '============================================================',
        `Title:       ${raw.title}`,
        `Price:       €${raw.price.suggested.toFixed(2)} (Range: €${raw.price.min.toFixed(2)} - €${raw.price.max.toFixed(2)})`,
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

    if (args.output) {
      const outPath = path.resolve(process.cwd(), args.output);
      fs.writeFileSync(outPath, outputContent, 'utf-8');
      console.log(`\nListing successfully written to: ${outPath}`);
    } else {
      console.log(`\n${outputContent}`);
    }
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
