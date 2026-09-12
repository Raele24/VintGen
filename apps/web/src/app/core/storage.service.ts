import { Injectable, signal, computed } from '@angular/core';
import { ListingResult } from '@vintstack/core';

export interface SavedListingItem {
  id: string;
  result: ListingResult;
  timestamp: number;
  previewThumbnail?: string;
}

const STORAGE_KEY_API_KEY = 'vintstack_gemini_api_key';
const STORAGE_KEY_MODEL = 'vintstack_gemini_model';
const STORAGE_KEY_HISTORY = 'vintstack_saved_listings';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /** Reactive signal holding the currently stored Gemini API key */
  public apiKey = signal<string>(this.loadApiKey());

  /** Reactive signal holding the preferred model */
  public selectedModel = signal<string>(this.loadModel());

  /** Reactive signal holding recent listing history */
  public history = signal<SavedListingItem[]>(this.loadHistory());

  /** Computed boolean indicating whether an API key is configured */
  public hasApiKey = computed(() => this.apiKey().trim().length > 0);

  /**
   * Sets and persists the Gemini API key in local storage.
   */
  public setApiKey(key: string): void {
    const cleanKey = key.trim();
    this.apiKey.set(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_API_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
    } catch (e) {
      console.warn('localStorage is unavailable or restricted', e);
    }
  }

  /**
   * Clears the stored API key.
   */
  public clearApiKey(): void {
    this.setApiKey('');
  }

  /**
   * Sets and persists the selected model.
   */
  public setModel(model: string): void {
    this.selectedModel.set(model);
    try {
      localStorage.setItem(STORAGE_KEY_MODEL, model);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Saves a generated listing to local history.
   */
  public saveListing(result: ListingResult, previewThumbnail?: string): void {
    const newItem: SavedListingItem = {
      id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      result,
      timestamp: Date.now(),
      previewThumbnail,
    };

    const updated = [newItem, ...this.history().slice(0, 19)]; // Keep last 20
    this.history.set(updated);

    try {
      // Save without bulky thumbnails to prevent quota limits
      const storagePayload = updated.map((item) => ({
        ...item,
        previewThumbnail: undefined,
      }));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(storagePayload));
    } catch (e) {
      console.warn('Failed to persist history to localStorage', e);
    }
  }

  /**
   * Clears all saved listings from history.
   */
  public clearHistory(): void {
    this.history.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (e) {
      console.warn('Failed to clear history', e);
    }
  }

  private loadApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadModel(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODEL);
      if (stored && stored !== 'gemini-2.5-flash') {
        return stored;
      }
      return 'gemini-3.6-flash';
    } catch {
      return 'gemini-3.6-flash';
    }
  }

  private loadHistory(): SavedListingItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}
