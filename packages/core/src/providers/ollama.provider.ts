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
  ProviderConfig,
} from '../types';
import { MARKETPLACE_SYSTEM_INSTRUCTION, buildListingUserPrompt } from '../prompts';
import { sanitizeListingResult } from './sanitize';
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
    const userPrompt = buildListingUserPrompt(input, {
      rawJsonNotice:
        'Output ONLY raw JSON conforming strictly to the requested schema. Do not enclose in markdown ticks if possible.',
    });

    const parsed = await this.byokProvider.generateObject<Record<string, unknown>>(
      {
        systemPrompt: MARKETPLACE_SYSTEM_INSTRUCTION,
        userPrompt,
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

    return sanitizeListingResult(parsed, {
      title: 'Secondhand Item',
      description: 'No description provided.',
      category: 'Clothing',
      brand: 'Unbranded',
      size: 'Standard',
      color: 'Multi',
      material: 'Not specified',
      priceSuggested: 25,
      priceMin: 20,
      priceMax: 35,
      priceReasoning: 'Estimated secondhand marketplace valuation',
      defaultHashtags: ['#secondhand', '#fashion', '#marketplace'],
      fitNotes: 'Standard fit',
      confidence: 0.85,
    });
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
