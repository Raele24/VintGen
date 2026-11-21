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
} from '../types';
import {
  MARKETPLACE_SYSTEM_INSTRUCTION,
  TEXT_SCHEMA_INSTRUCTION,
  buildListingUserPrompt,
} from '../prompts';
import { sanitizeListingResult } from './sanitize';
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
    const userPrompt = buildListingUserPrompt(input, {
      rawJsonNotice:
        'You MUST respond with a single valid JSON object matching the schema described in the system prompt. Do NOT include markdown fences or any text outside the JSON.',
    });

    const parsedData = await this.byokProvider.generateObject<Record<string, unknown>>(
      {
        systemPrompt: MARKETPLACE_SYSTEM_INSTRUCTION,
        schemaInstruction: TEXT_SCHEMA_INSTRUCTION,
        userPrompt,
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
