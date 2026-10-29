/**
 * OpenAI Provider
 *
 * Delegates HTTP transport and ResilienceExecutor failover directly to
 * openbyok OpenAIProvider while formatting VintGen marketplace prompts.
 */

import {
  AIProvider,
  ListingInput,
  ListingResult,
  ProviderConfig,
  ItemCondition,
} from '../types';
import { MARKETPLACE_SYSTEM_INSTRUCTION } from '../prompts';
import { OpenAIProvider as ByokOpenAIProvider } from 'openbyok';

export class OpenAIProvider implements AIProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI (BYOK)';
  public static readonly DEFAULT_MODEL = ByokOpenAIProvider.DEFAULT_MODEL;

  private byokProvider = new ByokOpenAIProvider();

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    const textParts: string[] = [
      'Generate a comprehensive, accurate secondhand marketplace listing based on the provided photographs and hints.',
    ];

    if (input.titleHint) textParts.push(`Seller Tentative Title: "${input.titleHint}"`);
    if (input.brandHint) textParts.push(`Seller Brand Hint: "${input.brandHint}"`);
    if (input.conditionHint) textParts.push(`Expected Condition: "${input.conditionHint}"`);
    if (input.notes) textParts.push(`Seller Additional Notes / Known Details: "${input.notes}"`);

    const languageNames: Record<string, string> = {
      it: 'Italian (Italiano)',
      en: 'English',
      fr: 'French (Francais)',
      es: 'Spanish (Espanol)',
      de: 'German (Deutsch)',
    };
    const targetLangName =
      (input.language && languageNames[input.language]) ||
      (input.language ? input.language.toUpperCase() : 'English');

    textParts.push(
      `TARGET OUTPUT LANGUAGE: ${targetLangName.toUpperCase()}\n` +
        `MANDATORY: You MUST generate all text fields (description bullets, title, flaws, condition notes, category, and price reasoning) entirely in ${targetLangName}. Do NOT output English if the target language is ${targetLangName}.\n` +
        `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.\n` +
        `PRICE VALUATION REQUIREMENT: Accurately detect specifications, capacity (GB/TB), interface, and model tier from photos. Benchmark prices realistically to active European secondary marketplace levels (e.g. 1TB NVMe PCIe 4.0 SSDs trade around EUR 60-80 used, 2TB around EUR 120-150). Do NOT assign generic EUR 15-30 lowball defaults to electronics.`
    );

    textParts.push(
      '\nYou MUST respond with a single valid JSON object matching the schema described in the system prompt. Do NOT include markdown fences or any text outside the JSON.'
    );

    const schemaInstruction = `You must output a JSON object with these exact keys:
{
  "title": "string - optimized search title under 65 chars",
  "description": "string - structured bulleted description",
  "category": "string - e.g. Men > Tops > T-Shirts",
  "brand": "string",
  "size": "string - e.g. M / 38",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, satisfactory",
  "color": "string",
  "material": "string",
  "price": { "suggested": number, "min": number, "max": number, "currency": "EUR", "reasoning": "string" },
  "hashtags": ["#brand", "#model", "#spec1", "#spec2", "#category", "#keyword1", "#keyword2", "... (10-15 total)"],
  "flaws": ["string", ...],
  "fitNotes": "string",
  "confidence": number between 0.0 and 1.0
}`;

    const parsedData = await this.byokProvider.generateObject<Record<string, any>>(
      {
        systemPrompt: MARKETPLACE_SYSTEM_INSTRUCTION,
        schemaInstruction,
        userPrompt: textParts.join('\n\n'),
        images: input.images,
        temperature: 0.2,
        maxTokens: 2048,
      },
      {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      }
    );

    return {
      title: String(parsedData['title'] || '').trim(),
      description: String(parsedData['description'] || '').trim(),
      category: String(parsedData['category'] || 'Secondhand Clothing'),
      brand: String(parsedData['brand'] || 'Vintage'),
      size: String(parsedData['size'] || 'One Size'),
      condition: (parsedData['condition'] as ItemCondition) || 'very_good',
      color: String(parsedData['color'] || ''),
      material: String(parsedData['material'] || ''),
      price: {
        suggested: Number(parsedData['price']?.suggested || 15),
        min: Number(parsedData['price']?.min || 10),
        max: Number(parsedData['price']?.max || 25),
        currency: String(parsedData['price']?.currency || 'EUR'),
        reasoning: String(parsedData['price']?.reasoning || 'Market standard pricing'),
      },
      hashtags: Array.isArray(parsedData['hashtags'])
        ? parsedData['hashtags'].map((tag: string) =>
            tag.startsWith('#') ? tag : `#${tag}`
          )
        : [],
      flaws: Array.isArray(parsedData['flaws']) ? parsedData['flaws'] : [],
      fitNotes: String(parsedData['fitNotes'] || ''),
      confidence: Number(parsedData['confidence'] || 0.9),
      createdAt: new Date().toISOString(),
    };
  }

  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    return this.byokProvider.testConnection({
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
  }
}
