/**
 * Provider Registry
 * 
 * Central registry allowing dynamic registration and selection of AI providers.
 * Designed so that adding Anthropic, OpenAI, or local Ollama requires zero architectural rewrites.
 */

import { AIProvider } from '../types';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';
import { OllamaProvider } from './ollama.provider';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, AIProvider>();

  private constructor() {
    // Register default built-in providers
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new ClaudeProvider());
    this.register(new OllamaProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Registers a new AI provider.
   */
  public register(provider: AIProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  /**
   * Retrieves a registered provider by its unique identifier.
   */
  public get(id: string): AIProvider {
    const provider = this.providers.get(id.toLowerCase());
    if (!provider) {
      throw new Error(
        `Provider "${id}" is not registered. Available providers: ${this.getAvailableIds().join(', ')}`
      );
    }
    return provider;
  }

  /**
   * Lists all available provider IDs.
   */
  public getAvailableIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Returns list of all registered providers with metadata.
   */
  public getAll(): Array<{ id: string; name: string }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }
}
