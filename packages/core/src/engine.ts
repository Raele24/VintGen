/**
 * VintGen Main Engine
 * 
 * Orchestrates multi-modal AI generation and platform adaptation.
 */

import {
  FormattedListing,
  ListingInput,
  ListingResult,
  ProviderConfig,
} from './types';
import { ProviderRegistry } from './providers/registry';
import { MarketplacePlatform } from './platforms/marketplace.platform';

export class VintGenEngine {
  private registry = ProviderRegistry.getInstance();

  /**
   * Generates a structured listing using the selected AI provider.
   * Resolves provider from config (defaults to 'gemini' if none configured).
   */
  public async generate(
    input: ListingInput,
    config: ProviderConfig & { providerId?: string }
  ): Promise<{ raw: ListingResult; formatted: FormattedListing }> {
    const providerId = config.providerId || 'gemini';
    const provider = this.registry.get(providerId);

    const rawResult = await provider.generateListing(input, config);
    const formatted = MarketplacePlatform.format(rawResult);

    return {
      raw: rawResult,
      formatted,
    };
  }

  /**
   * Tests connection with the given provider and config.
   */
  public async testProvider(
    providerId: string,
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    const provider = this.registry.get(providerId);
    return provider.testConnection(config);
  }

  /**
   * Returns list of supported providers.
   */
  public getProviders(): Array<{ id: string; name: string }> {
    return this.registry.getAll();
  }
}
