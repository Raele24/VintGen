/**
 * Ollama Local AI Provider
 *
 * Delegates HTTP transport and model inspection directly to
 * openbyok OllamaProvider while formatting VintGen marketplace prompts.
 */

import {
  AIProvider,
  ListingInput,
  ListingResult,
  PriceRecommendation,
  ProviderConfig,
  ItemCondition,
} from '../types';
import { MARKETPLACE_SYSTEM_INSTRUCTION } from '../prompts';
import { OllamaProvider as ByokOllamaProvider } from 'openbyok';

export class OllamaProvider implements AIProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama (Local)';

  public static readonly DEFAULT_ENDPOINT = ByokOllamaProvider.DEFAULT_ENDPOINT;
  public static readonly DEFAULT_MODEL = ByokOllamaProvider.DEFAULT_MODEL;

  private byokProvider = new ByokOllamaProvider();

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    const textParts: string[] = [
      'Analyze the provided photograph(s) and generate a complete, accurate secondhand marketplace listing in strict JSON format matching the schema.',
    ];

    if (input.titleHint) textParts.push(`Seller Tentative Title: "${input.titleHint}"`);
    if (input.brandHint) textParts.push(`Seller Brand Hint: "${input.brandHint}"`);
    if (input.conditionHint) textParts.push(`Expected Condition: "${input.conditionHint}"`);
    if (input.notes) textParts.push(`Seller Additional Notes: "${input.notes}"`);

    const langMap: Record<string, string> = {
      it: 'Italian',
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
    };
    const targetLang = input.language ? langMap[input.language] || 'English' : 'English';
    textParts.push(`Target Output Language: ${targetLang}.`);
    textParts.push('Output ONLY raw JSON conforming strictly to the requested schema. Do not enclose in markdown ticks if possible.');

    const parsed = await this.byokProvider.generateObject<Record<string, any>>(
      {
        systemPrompt: MARKETPLACE_SYSTEM_INSTRUCTION,
        userPrompt: textParts.join('\n'),
        images: input.images,
        temperature: 0.2,
      },
      {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      }
    );

    const validConditions: ItemCondition[] = [
      'new_with_tags',
      'new_without_tags',
      'very_good',
      'good',
      'satisfactory',
    ];

    const rawCond = String(parsed['condition'] || 'very_good').toLowerCase();
    const condition: ItemCondition = validConditions.includes(rawCond as ItemCondition)
      ? (rawCond as ItemCondition)
      : 'very_good';

    const rawPrice = parsed['price'] || {};
    const price: PriceRecommendation = {
      suggested: Number(rawPrice.suggested) || 25,
      min: Number(rawPrice.min) || 20,
      max: Number(rawPrice.max) || 35,
      currency: 'EUR',
      reasoning: String(rawPrice.reasoning || 'Estimated secondhand marketplace valuation'),
    };

    const rawTags = Array.isArray(parsed['hashtags']) ? parsed['hashtags'] : [];
    const hashtags = rawTags.map((t: unknown) => {
      const s = String(t).trim();
      return s.startsWith('#') ? s : `#${s}`;
    });

    const rawFlaws = Array.isArray(parsed['flaws']) ? parsed['flaws'] : [];
    const flaws = rawFlaws.map((f: unknown) => String(f).trim()).filter(Boolean);

    return {
      title: String(parsed['title'] || 'Secondhand Item').trim(),
      description: String(parsed['description'] || 'No description provided.').trim(),
      category: String(parsed['category'] || 'Clothing').trim(),
      brand: String(parsed['brand'] || 'Unbranded').trim(),
      size: String(parsed['size'] || 'Standard').trim(),
      condition,
      color: String(parsed['color'] || 'Multi').trim(),
      material: String(parsed['material'] || 'Not specified').trim(),
      price,
      hashtags: hashtags.length > 0 ? hashtags : ['#secondhand', '#fashion', '#marketplace'],
      flaws,
      fitNotes: String(parsed['fitNotes'] || 'Standard fit').trim(),
      confidence: Number(parsed['confidence']) || 0.85,
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
