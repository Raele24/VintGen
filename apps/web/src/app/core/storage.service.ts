import { Injectable, signal, computed } from '@angular/core';
import { ListingResult } from '@vintgen/core';

export interface SavedListingItem {
  id: string;
  result: ListingResult;
  timestamp: number;
  previewThumbnail?: string;
}

const STORAGE_KEY_API_KEY = 'vintgen_gemini_api_key';
const STORAGE_KEY_MODEL = 'vintgen_gemini_model';
const STORAGE_KEY_HISTORY = 'vintgen_saved_listings';
const STORAGE_KEY_PROVIDER = 'vintgen_provider';
const STORAGE_KEY_OPENAI_KEY = 'vintgen_openai_api_key';
const STORAGE_KEY_OPENAI_MODEL = 'vintgen_openai_model';
const STORAGE_KEY_CLAUDE_KEY = 'vintgen_claude_api_key';
const STORAGE_KEY_CLAUDE_MODEL = 'vintgen_claude_model';
const STORAGE_KEY_OLLAMA_ENDPOINT = 'vintgen_ollama_endpoint';
const STORAGE_KEY_OLLAMA_MODEL = 'vintgen_ollama_model';
const STORAGE_KEY_OLLAMA_KEY = 'vintgen_ollama_api_key';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /** Reactive signal holding the currently stored Gemini API key */
  public apiKey = signal<string>(this.loadApiKey());

  /** Reactive signal holding the preferred model */
  public selectedModel = signal<string>(this.loadModel());

  /** Selected AI provider */
  public selectedProvider = signal<'gemini' | 'openai' | 'claude' | 'ollama'>(this.loadProvider());

  /** Ollama local endpoint URL */
  public ollamaEndpoint = signal<string>(this.loadOllamaEndpoint());

  /** Ollama vision model */
  public ollamaModel = signal<string>(this.loadOllamaModel());

  /** Ollama optional API key/auth token */
  public ollamaApiKey = signal<string>(this.loadOllamaKey());

  /** Claude API key */
  public claudeApiKey = signal<string>(this.loadClaudeKey());

  /** Claude selected model */
  public claudeModel = signal<string>(this.loadClaudeModel());

  /** OpenAI API key (separate from Gemini) */
  public openaiApiKey = signal<string>(this.loadOpenAIKey());

  /** OpenAI selected model */
  public openaiModel = signal<string>(this.loadOpenAIModel());

  /** Reactive signal holding recent listing history */
  public history = signal<SavedListingItem[]>(this.loadHistory());

  /** Computed boolean indicating whether an API key is configured */
  /** Whether the currently active provider has an API key configured */
  public hasApiKey = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return true; // Local Ollama does not require an API key by default
    }
    if (this.selectedProvider() === 'claude') {
      return this.claudeApiKey().trim().length > 0;
    }
    if (this.selectedProvider() === 'openai') {
      return this.openaiApiKey().trim().length > 0;
    }
    return this.apiKey().trim().length > 0;
  });

  /** Returns the active API key for the selected provider */
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

  /** Returns the active model for the selected provider */
  public activeModel = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return this.ollamaModel();
    }
    if (this.selectedProvider() === 'claude') {
      return this.claudeModel();
    }
    if (this.selectedProvider() === 'openai') {
      return this.openaiModel();
    }
    return this.selectedModel();
  });

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
   * Sets the active AI provider.
   */
  public setProvider(provider: 'gemini' | 'openai' | 'claude' | 'ollama'): void {
    this.selectedProvider.set(provider);
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Sets and persists the OpenAI API key.
   */
  public setOpenAIKey(key: string): void {
    const cleanKey = key.trim();
    this.openaiApiKey.set(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_OPENAI_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_OPENAI_KEY);
      }
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Sets and persists the OpenAI model.
   */
  public setOpenAIModel(model: string): void {
    this.openaiModel.set(model);
    try {
      localStorage.setItem(STORAGE_KEY_OPENAI_MODEL, model);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Clears the OpenAI API key.
   */
  public clearOpenAIKey(): void {
    this.setOpenAIKey('');
  }

  /**
   * Sets and persists the Claude API key.
   */
  public setClaudeKey(key: string): void {
    const cleanKey = key.trim();
    this.claudeApiKey.set(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_CLAUDE_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_CLAUDE_KEY);
      }
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Sets and persists the Claude model.
   */
  public setClaudeModel(model: string): void {
    this.claudeModel.set(model);
    try {
      localStorage.setItem(STORAGE_KEY_CLAUDE_MODEL, model);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Clears the Claude API key.
   */
  public clearClaudeKey(): void {
    this.setClaudeKey('');
  }

  /**
   * Sets and persists the Ollama endpoint URL.
   */
  public setOllamaEndpoint(endpoint: string): void {
    const clean = endpoint.trim();
    this.ollamaEndpoint.set(clean || 'http://localhost:11434');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_ENDPOINT, clean || 'http://localhost:11434');
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Sets and persists the Ollama model name.
   */
  public setOllamaModel(model: string): void {
    const clean = model.trim();
    this.ollamaModel.set(clean || 'llama3.2-vision');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_MODEL, clean || 'llama3.2-vision');
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Sets and persists the optional Ollama API key / auth token.
   */
  public setOllamaKey(key: string): void {
    const clean = key.trim();
    this.ollamaApiKey.set(clean);
    try {
      if (clean) {
        localStorage.setItem(STORAGE_KEY_OLLAMA_KEY, clean);
      } else {
        localStorage.removeItem(STORAGE_KEY_OLLAMA_KEY);
      }
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  /**
   * Clears the stored Ollama auth token.
   */
  public clearOllamaKey(): void {
    this.setOllamaKey('');
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

  private loadOllamaKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_OLLAMA_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadClaudeKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_CLAUDE_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadClaudeModel(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_CLAUDE_MODEL) || 'claude-3-5-haiku-20241022';
    } catch {
      return 'claude-3-5-haiku-20241022';
    }
  }

  private loadOpenAIKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_OPENAI_KEY) || '';
    } catch {
      return '';
    }
  }

  private loadOpenAIModel(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_OPENAI_MODEL) || 'gpt-4o-mini';
    } catch {
      return 'gpt-4o-mini';
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
