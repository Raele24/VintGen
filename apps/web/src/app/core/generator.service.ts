import { Injectable, inject, signal } from '@angular/core';
import {
  VintGenEngine,
  ListingInput,
  ListingResult,
  FormattedListing,
  VintedPlatform,
} from '@vintgen/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class GeneratorService {
  private storage = inject(StorageService);
  private engine = new VintGenEngine();

  /** State signals */
  public isGenerating = signal<boolean>(false);
  public isTestingKey = signal<boolean>(false);
  public currentListing = signal<ListingResult | null>(null);
  public formattedListing = signal<FormattedListing | null>(null);
  public isQuotaExceeded = signal<boolean>(false);
  public error = signal<string | null>(null);
  public statusMessage = signal<string>('');

  /**
   * Generates a listing with the current configured API key.
   */
  public async generate(input: ListingInput, previewThumbnail?: string): Promise<boolean> {
    const p = this.storage.selectedProvider();
    const key = this.storage.activeApiKey();
    if (p !== 'ollama' && !key) {
      const providerName = p === 'claude' ? 'Anthropic Claude' : (p === 'openai' ? 'OpenAI' : 'Gemini');
      this.error.set('Please provide a ' + providerName + ' API Key before generating.');
      return false;
    }

    this.isGenerating.set(true);
    this.error.set(null);
    this.isQuotaExceeded.set(false);
    const provider = this.storage.selectedProvider();
    let providerLabel = 'Gemini Vision';
    if (provider === 'claude') providerLabel = 'Claude 3.5 Vision';
    else if (provider === 'openai') providerLabel = 'GPT-4o Vision';
    else if (provider === 'ollama') providerLabel = 'Local Ollama (' + this.storage.ollamaModel() + ')';
    this.statusMessage.set('Inspecting photographs with ' + providerLabel + '...');

    try {
      const response = await this.engine.generate(input, {
        apiKey: key || '',
        model: this.storage.activeModel(),
        baseUrl: provider === 'ollama' ? this.storage.ollamaEndpoint() : undefined,
        providerId: this.storage.selectedProvider(),
      });

      this.currentListing.set(response.raw);
      this.formattedListing.set(response.formatted);
      this.storage.saveListing(response.raw, previewThumbnail);
      this.statusMessage.set('');
      this.isQuotaExceeded.set(false);
      return true;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[VintGen Engine] Generation error (${provider}):`, rawMsg);

      const isRateOrQuota =
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.toLowerCase().includes('quota') ||
        rawMsg.toLowerCase().includes('rate limit');

      if (isRateOrQuota) {
        this.isQuotaExceeded.set(true);
        if (provider === 'claude') {
          if (
            rawMsg.toLowerCase().includes('credit') ||
            rawMsg.toLowerCase().includes('balance') ||
            rawMsg.toLowerCase().includes('quota') ||
            rawMsg.includes('402')
          ) {
            this.error.set(
              'Anthropic Claude balance depleted ($0 credit). Check your billing at console.anthropic.com/settings/plans or switch back to Gemini (free tier).'
            );
          } else {
            this.error.set(
              'Anthropic Claude Rate Limit reached. Please wait a few moments and try again.'
            );
          }
        } else if (provider === 'openai') {
          if (
            rawMsg.toLowerCase().includes('quota') ||
            rawMsg.toLowerCase().includes('billing') ||
            rawMsg.toLowerCase().includes('plan')
          ) {
            this.error.set(
              'OpenAI Quota Exceeded ($0 credit balance or unpaid account). Unlike Gemini, OpenAI APIs require prepaid billing credits. Check your billing at platform.openai.com/billing or switch back to Gemini (free tier).'
            );
          } else {
            this.error.set(
              'OpenAI Rate Limit reached (Too Many Requests). Please wait a few moments and try again.'
            );
          }
        } else {
          this.error.set(
            'Temporary rate limit reached (15 requests/minute on Google AI Studio free tier). Please wait 30–60 seconds and try again!'
          );
        }
      } else if (provider === 'ollama') {
        this.isQuotaExceeded.set(false);
        if (
          rawMsg.includes('Failed to fetch') ||
          rawMsg.includes('Cannot reach') ||
          rawMsg.includes('Failed to connect') ||
          rawMsg.includes('ECONNREFUSED')
        ) {
          this.error.set(
            `Cannot reach local Ollama at ${this.storage.ollamaEndpoint()}. Please verify Ollama is running ('ollama serve'). In web browsers, ensure OLLAMA_ORIGINS="*" is configured.`
          );
        } else {
          this.error.set(rawMsg);
        }
      } else {
        this.isQuotaExceeded.set(false);
        this.error.set(rawMsg);
      }
      return false;
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Tests a provided API key or currently stored key.
   */
  public async testKey(
    candidateKey?: string,
    candidateEndpoint?: string,
    candidateModel?: string
  ): Promise<{ success: boolean; message: string }> {
    const p = this.storage.selectedProvider();
    const key = candidateKey !== undefined ? candidateKey : this.storage.activeApiKey();
    if (p !== 'ollama' && !key) {
      return { success: false, message: 'API key is required' };
    }

    this.isTestingKey.set(true);
    try {
      const result = await this.engine.testProvider(p, {
        apiKey: key || '',
        model: candidateModel || this.storage.activeModel(),
        baseUrl: candidateEndpoint || (p === 'ollama' ? this.storage.ollamaEndpoint() : undefined),
      });
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    } finally {
      this.isTestingKey.set(false);
    }
  }

  /**
   * Sets current active listing (e.g. from history recall).
   */
  public selectHistoricalListing(result: ListingResult): void {
    this.currentListing.set(result);
    this.formattedListing.set(VintedPlatform.format(result));
    this.error.set(null);
  }

  /**
   * Clears the active listing.
   */
  public clearActive(): void {
    this.currentListing.set(null);
    this.formattedListing.set(null);
    this.error.set(null);
  }
}
