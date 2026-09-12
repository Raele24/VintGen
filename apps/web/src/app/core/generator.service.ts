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
    const key = this.storage.apiKey();
    if (!key) {
      this.error.set('Please provide a Google Gemini API Key before generating.');
      return false;
    }

    this.isGenerating.set(true);
    this.error.set(null);
    this.isQuotaExceeded.set(false);
    this.statusMessage.set('Inspecting photographs with Gemini Vision...');

    try {
      const response = await this.engine.generate(input, {
        apiKey: key,
        model: this.storage.selectedModel(),
      });

      this.currentListing.set(response.raw);
      this.formattedListing.set(response.formatted);
      this.storage.saveListing(response.raw, previewThumbnail);
      this.statusMessage.set('');
      this.isQuotaExceeded.set(false);
      return true;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.toLowerCase().includes('quota') ||
        rawMsg.toLowerCase().includes('rate limit')
      ) {
        this.isQuotaExceeded.set(true);
        this.error.set(
          'Temporary rate limit reached (15 requests/minute on Google AI Studio free tier). Please wait 30-60 seconds and try again!'
        );
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
  public async testKey(candidateKey?: string): Promise<{ success: boolean; message: string }> {
    const key = candidateKey !== undefined ? candidateKey : this.storage.apiKey();
    if (!key) {
      return { success: false, message: 'API key is required' };
    }

    this.isTestingKey.set(true);
    try {
      const result = await this.engine.testProvider('gemini', {
        apiKey: key,
        model: this.storage.selectedModel(),
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
