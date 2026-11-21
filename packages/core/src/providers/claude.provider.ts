/**
 * Anthropic Claude Provider
 *
 * Delegates HTTP transport and ResilienceExecutor failover directly to
 * openbyok ClaudeProvider while formatting VintGen marketplace prompts.
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
import { ClaudeProvider as ByokClaudeProvider } from 'openbyok';

export class ClaudeProvider implements AIProvider {
  public readonly id = 'claude';
  public readonly name = 'Anthropic Claude';
  public static readonly DEFAULT_MODEL = ByokClaudeProvider.DEFAULT_MODEL;

  private byokProvider = new ByokClaudeProvider();

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    const userPrompt = buildListingUserPrompt(input, {
      rawJsonNotice:
        'You MUST respond with ONLY a single valid raw JSON object matching the requested schema. Do NOT include markdown formatting, backticks, preamble, or commentary outside the JSON.',
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

    return sanitizeListingResult(parsedData, { confidence: 0.95 });
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
