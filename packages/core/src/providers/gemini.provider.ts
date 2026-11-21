/**
 * Gemini AI Provider Implementation
 *
 * Delegates HTTP transport, model discovery, and ResilienceExecutor failover
 * directly to openbyok GeminiProvider while formatting VintGen marketplace prompts.
 */

import {
  AIProvider,
  ListingInput,
  ListingResult,
  ProviderConfig,
} from '../types';
import {
  STRUCTURED_RESPONSE_SCHEMA,
  MARKETPLACE_SYSTEM_INSTRUCTION,
  buildListingUserPrompt,
} from '../prompts';
import { sanitizeListingResult } from './sanitize';
import { GeminiProvider as ByokGeminiProvider } from 'openbyok';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini (BYOK)';
  private byokProvider = new ByokGeminiProvider();

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    const userPrompt = buildListingUserPrompt(input);

    const parsedData = await this.byokProvider.generateObject<Record<string, unknown>>(
      {
        systemPrompt: MARKETPLACE_SYSTEM_INSTRUCTION,
        userPrompt,
        images: input.images,
        jsonSchema: STRUCTURED_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
      {
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      }
    );

    return sanitizeListingResult(parsedData);
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
