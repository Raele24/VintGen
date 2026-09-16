import { Injectable, signal, computed } from '@angular/core';
import { ListingResult } from '@vintgen/core';
import { encryptSecret, decryptSecret } from './crypto.util';

export interface SavedListingItem {
  id: string;
  result: ListingResult;
  timestamp: number;
  previewThumbnail?: string;
}

export type StorageMode = 'session' | 'encrypted';

const STORAGE_KEY_API_KEY = 'vintgen_gemini_api_key';
const STORAGE_KEY_HISTORY = 'vintgen_saved_listings';
const STORAGE_KEY_PROVIDER = 'vintgen_provider';
const STORAGE_KEY_OPENAI_KEY = 'vintgen_openai_api_key';
const STORAGE_KEY_CLAUDE_KEY = 'vintgen_claude_api_key';
const STORAGE_KEY_OLLAMA_ENDPOINT = 'vintgen_ollama_endpoint';
const STORAGE_KEY_OLLAMA_MODEL = 'vintgen_ollama_model';
const STORAGE_KEY_OLLAMA_KEY = 'vintgen_ollama_api_key';
const STORAGE_KEY_STORAGE_MODE = 'vintgen_storage_mode';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /** Storage mode: session-only (in-memory, privacy first) or encrypted persistent (WebCrypto AES-GCM) */
  public storageMode = signal<StorageMode>(this.loadStorageMode());

  /** Primary provider API key */
  public apiKey = signal<string>('');

  /** Selected AI provider */
  public selectedProvider = signal<'gemini' | 'openai' | 'claude' | 'ollama'>(this.loadProvider());

  /** Ollama local endpoint URL */
  public ollamaEndpoint = signal<string>(this.loadOllamaEndpoint());

  /** Ollama vision model name */
  public ollamaModel = signal<string>(this.loadOllamaModel());

  /** Ollama optional API key/auth token */
  public ollamaApiKey = signal<string>('');

  /** Claude API key */
  public claudeApiKey = signal<string>('');

  /** OpenAI API key */
  public openaiApiKey = signal<string>('');

  /** Recent listing history */
  public history = signal<SavedListingItem[]>(this.loadHistory());

  constructor() {
    this.hydrateCredentials();
  }

  /**
   * Hydrates credentials on startup.
   * If in encrypted mode, decrypts AES-GCM payloads from localStorage.
   * If in session mode, purges any leftover credentials in localStorage to prevent disk persistence.
   */
  private async hydrateCredentials(): Promise<void> {
    const mode = this.storageMode();
    if (mode === 'session') {
      this.clearDiskStorage();
      return;
    }

    try {
      const rawGemini = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
      const rawOpenAI = localStorage.getItem(STORAGE_KEY_OPENAI_KEY) || '';
      const rawClaude = localStorage.getItem(STORAGE_KEY_CLAUDE_KEY) || '';
      const rawOllama = localStorage.getItem(STORAGE_KEY_OLLAMA_KEY) || '';

      if (rawGemini) {
        const decrypted = await decryptSecret(rawGemini);
        this.apiKey.set(decrypted);
        if (!rawGemini.startsWith('enc:v1:')) {
          this.persistEncrypted(STORAGE_KEY_API_KEY, decrypted);
        }
      }

      if (rawOpenAI) {
        const decrypted = await decryptSecret(rawOpenAI);
        this.openaiApiKey.set(decrypted);
        if (!rawOpenAI.startsWith('enc:v1:')) {
          this.persistEncrypted(STORAGE_KEY_OPENAI_KEY, decrypted);
        }
      }

      if (rawClaude) {
        const decrypted = await decryptSecret(rawClaude);
        this.claudeApiKey.set(decrypted);
        if (!rawClaude.startsWith('enc:v1:')) {
          this.persistEncrypted(STORAGE_KEY_CLAUDE_KEY, decrypted);
        }
      }

      if (rawOllama) {
        const decrypted = await decryptSecret(rawOllama);
        this.ollamaApiKey.set(decrypted);
        if (!rawOllama.startsWith('enc:v1:')) {
          this.persistEncrypted(STORAGE_KEY_OLLAMA_KEY, decrypted);
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate encrypted credentials:', err);
    }
  }

  /**
   * Sets the storage mode ('session' or 'encrypted').
   */
  public async setStorageMode(mode: StorageMode): Promise<void> {
    this.storageMode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY_STORAGE_MODE, mode);
    } catch { }

    if (mode === 'session') {
      this.clearDiskStorage();
    } else {
      await this.persistEncrypted(STORAGE_KEY_API_KEY, this.apiKey());
      await this.persistEncrypted(STORAGE_KEY_OPENAI_KEY, this.openaiApiKey());
      await this.persistEncrypted(STORAGE_KEY_CLAUDE_KEY, this.claudeApiKey());
      await this.persistEncrypted(STORAGE_KEY_OLLAMA_KEY, this.ollamaApiKey());
    }
  }

  /**
   * Helper to encrypt and save a secret to localStorage when encrypted mode is active.
   */
  private async persistEncrypted(key: string, value: string): Promise<void> {
    if (this.storageMode() !== 'encrypted') return;
    try {
      if (value && value.trim()) {
        const encrypted = await encryptSecret(value.trim());
        localStorage.setItem(key, encrypted);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Failed to persist encrypted credential:', e);
    }
  }

  /**
   * Clears credentials from localStorage.
   */
  private clearDiskStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
      localStorage.removeItem(STORAGE_KEY_OPENAI_KEY);
      localStorage.removeItem(STORAGE_KEY_CLAUDE_KEY);
      localStorage.removeItem(STORAGE_KEY_OLLAMA_KEY);
    } catch { }
  }

  /**
   * Immediately purges all credentials from memory and disk.
   */
  public purgeAllCredentials(): void {
    this.apiKey.set('');
    this.openaiApiKey.set('');
    this.claudeApiKey.set('');
    this.ollamaApiKey.set('');
    this.clearDiskStorage();
    try {
      sessionStorage.clear();
    } catch { }
  }

  /** Whether the currently active provider has an API key configured */
  public hasApiKey = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return true;
    }
    if (this.selectedProvider() === 'claude') {
      return this.claudeApiKey().trim().length > 0;
    }
    if (this.selectedProvider() === 'openai') {
      return this.openaiApiKey().trim().length > 0;
    }
    return this.apiKey().trim().length > 0;
  });

  /** Active API key for the selected provider */
  public activeApiKey = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return this.ollamaApiKey();
    }
    if (this.selectedProvider() === 'claude') {
      return this.claudeApiKey();
    }
    if (this.selectedProvider() === 'openai') {
      return this.openaiApiKey();
    }
    return this.apiKey();
  });

  /** Active model for the selected provider (configured for Ollama, defaults handled by provider) */
  public activeModel = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return this.ollamaModel();
    }
    return undefined;
  });

  /**
   * Sets the primary provider API key.
   */
  public setApiKey(key: string): void {
    const cleanKey = key.trim();
    this.apiKey.set(cleanKey);
    this.persistEncrypted(STORAGE_KEY_API_KEY, cleanKey);
  }

  public clearApiKey(): void {
    this.setApiKey('');
  }

  public setProvider(provider: 'gemini' | 'openai' | 'claude' | 'ollama'): void {
    this.selectedProvider.set(provider);
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOpenAIKey(key: string): void {
    const cleanKey = key.trim();
    this.openaiApiKey.set(cleanKey);
    this.persistEncrypted(STORAGE_KEY_OPENAI_KEY, cleanKey);
  }

  public clearOpenAIKey(): void {
    this.setOpenAIKey('');
  }

  public setClaudeKey(key: string): void {
    const cleanKey = key.trim();
    this.claudeApiKey.set(cleanKey);
    this.persistEncrypted(STORAGE_KEY_CLAUDE_KEY, cleanKey);
  }

  public clearClaudeKey(): void {
    this.setClaudeKey('');
  }

  public setOllamaEndpoint(endpoint: string): void {
    const clean = endpoint.trim();
    this.ollamaEndpoint.set(clean || 'http://localhost:11434');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_ENDPOINT, clean || 'http://localhost:11434');
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOllamaModel(model: string): void {
    const clean = model.trim();
    this.ollamaModel.set(clean || 'llama3.2-vision');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_MODEL, clean || 'llama3.2-vision');
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOllamaKey(key: string): void {
    const clean = key.trim();
    this.ollamaApiKey.set(clean);
    this.persistEncrypted(STORAGE_KEY_OLLAMA_KEY, clean);
  }

  public clearOllamaKey(): void {
    this.setOllamaKey('');
  }

  public saveListing(result: ListingResult, previewThumbnail?: string): void {
    const newItem: SavedListingItem = {
      id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      result,
      timestamp: Date.now(),
      previewThumbnail,
    };

    const updated = [newItem, ...this.history().slice(0, 19)];
    this.history.set(updated);

    try {
      const storagePayload = updated.map((item) => ({
        ...item,
        previewThumbnail: undefined,
      }));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(storagePayload));
    } catch (e) {
      console.warn('Failed to persist history to localStorage', e);
    }
  }

  public clearHistory(): void {
    this.history.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (e) {
      console.warn('Failed to clear history', e);
    }
  }

  private loadStorageMode(): StorageMode {
    try {
      const mode = localStorage.getItem(STORAGE_KEY_STORAGE_MODE);
      if (mode === 'encrypted') return 'encrypted';
      return 'session';
    } catch {
      return 'session';
    }
  }

  private loadProvider(): 'gemini' | 'openai' | 'claude' | 'ollama' {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROVIDER);
      if (stored === 'ollama') return 'ollama';
      if (stored === 'claude') return 'claude';
      if (stored === 'openai') return 'openai';
      return 'gemini';
    } catch {
      return 'gemini';
    }
  }

  private loadOllamaEndpoint(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_OLLAMA_ENDPOINT) || 'http://localhost:11434';
    } catch {
      return 'http://localhost:11434';
    }
  }

  private loadOllamaModel(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_OLLAMA_MODEL) || 'llama3.2-vision';
    } catch {
      return 'llama3.2-vision';
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
