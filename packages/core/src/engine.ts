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
import { PlatformRegistry } from './platforms/platform-registry';
import { PlatformAdapter, PlatformId } from './platforms/platform.interface';

export class VintGenEngine {
  private registry = ProviderRegistry.getInstance();
  private platformRegistry = PlatformRegistry.getInstance();

  /**
   * Generates a structured listing using the selected AI provider.
   * Resolves provider from config (defaults to 'gemini' if none configured).
   */
  public async generate(
    input: ListingInput,
    config: ProviderConfig & { providerId?: string; platformId?: PlatformId | string }
  ): Promise<{ raw: ListingResult; formatted: FormattedListing }> {
    const providerId = config.providerId || 'gemini';
    const provider = this.registry.get(providerId);

    const rawResult = await provider.generateListing(input, config);
    const platformId = config.platformId || input.platform || 'universal';
    const formatted = this.platformRegistry.format(rawResult, platformId);

    return {
      raw: rawResult,
      formatted,
    };
  }

  /**
   * Formats a raw listing result for a specific marketplace platform.
   */
  public formatPlatform(
    result: ListingResult,
    platformId?: PlatformId | string
  ): FormattedListing {
    return this.platformRegistry.format(result, platformId);
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

  /**
   * Returns list of supported marketplace platform adapters.
   */
  public getPlatforms(): PlatformAdapter[] {
    return this.platformRegistry.getAll();
  }
}
