import { Injectable, signal, computed } from '@angular/core';
import { ListingResult } from '@vintgen/core';
import { ByokClient, UsageMetrics } from 'openbyok';
import { ByokHeadlessController, registerByokSettingsElement } from 'openbyok/ui';
import { createByokSignalStore } from 'openbyok/angular';
import { vintgenWebCryptoVault } from './crypto.util';

export interface SavedListingItem {
  id: string;
  result: ListingResult;
  timestamp: number;
  previewThumbnail?: string;
}

export type StorageMode = 'session' | 'encrypted' | 'passphrase';

const STORAGE_KEY_HISTORY = 'vintgen_saved_listings';
const STORAGE_KEY_PROVIDER = 'vintgen_provider';
const STORAGE_KEY_OLLAMA_ENDPOINT = 'vintgen_ollama_endpoint';
const STORAGE_KEY_OLLAMA_MODEL = 'vintgen_ollama_model';
const STORAGE_KEY_STORAGE_MODE = 'vintgen_storage_mode';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /** Reactive openbyok/angular signal store */
  private readonly byokStore = createByokSignalStore(
    { signal, computed },
    {
      defaultProvider: this.loadProvider(),
      fallbackProviders: ['gemini', 'openai', 'claude', 'ollama'],
      defaultVaultMode: this.loadStorageMode(),
      customVaultAdapters: [vintgenWebCryptoVault],
    }
  );

  /** Underlying openbyok ByokClient */
  public readonly client: ByokClient = this.byokStore.client;

  /** Underlying openbyok/ui Headless Controller */
  public readonly uiController: ByokHeadlessController;

  /** Storage mode: 'session' (RAM), 'encrypted' (Device AES-GCM), or 'passphrase' (User PIN AES-GCM) */
  public storageMode = this.byokStore.storageMode as ReturnType<typeof signal<StorageMode>>;

  /** Whether the PIN/Passphrase vault is currently locked */
  public isVaultLocked = signal<boolean>(this.client.passphraseVault.isLocked());

  /** Live session token & request usage metrics from openbyok UsageTracker */
  public usageMetrics = signal<UsageMetrics>(this.client.getUsageMetrics());

  /** Primary provider API key (Gemini) */
  public apiKey = this.byokStore.geminiKey;

  /** Selected AI provider */
  public selectedProvider = this.byokStore.selectedProvider as ReturnType<
    typeof signal<'gemini' | 'openai' | 'claude' | 'ollama'>
  >;

  /** Ollama local endpoint URL */
  public ollamaEndpoint = signal<string>(this.loadOllamaEndpoint());

  /** Ollama vision model name */
  public ollamaModel = signal<string>(this.loadOllamaModel());

  /** Ollama optional API key/auth token */
  public ollamaApiKey = this.byokStore.ollamaKey;

  /** Claude API key */
  public claudeApiKey = this.byokStore.claudeKey;

  /** OpenAI API key */
  public openaiApiKey = this.byokStore.openaiKey;

  /** Whether the currently active provider has an API key configured */
  public hasApiKey = this.byokStore.hasApiKey;

  /** Active API key for the selected provider */
  public activeApiKey = this.byokStore.activeApiKey;

  /** Recent listing history */
  public history = signal<SavedListingItem[]>(this.loadHistory());

  constructor() {
    registerByokSettingsElement('byok-settings');
    this.uiController = new ByokHeadlessController(this.client, 'en');
    this.uiController.setCustomEndpoint(this.ollamaEndpoint(), 'ollama');
    this.uiController.setCustomModel(this.ollamaModel(), 'ollama');
    if (this.storageMode() !== 'passphrase') {
      this.byokStore.hydrate();
    }
  }

  /**
   * Sets the storage mode ('session', 'encrypted', or 'passphrase') via openbyok/angular store.
   */
  public async setStorageMode(mode: StorageMode): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY_STORAGE_MODE, mode);
    } catch { }
    if (mode === 'passphrase' && this.client.passphraseVault.isLocked()) {
      this.storageMode.set('passphrase');
      this.isVaultLocked.set(true);
      return;
    }
    await this.byokStore.setMode(mode);
    this.isVaultLocked.set(this.client.passphraseVault.isLocked());
  }

  /**
   * Unlocks the PassphraseVaultAdapter with the user's PIN/passphrase and hydrates stored keys.
   */
  public async unlockWithPin(pin: string): Promise<boolean> {
    const ok = await this.client.passphraseVault.unlock(pin);
    this.isVaultLocked.set(this.client.passphraseVault.isLocked());
    if (ok) {
      await this.byokStore.setMode('passphrase');
      await this.byokStore.hydrate();
    }
    return ok;
  }

  /**
   * Locks the PassphraseVaultAdapter and wipes decrypted keys from volatile RAM.
   */
  public lockPinVault(): void {
    this.client.passphraseVault.lock();
    this.isVaultLocked.set(true);
    this.apiKey.set('');
    this.openaiApiKey.set('');
    this.claudeApiKey.set('');
    this.ollamaApiKey.set('');
  }

  /**
   * Records a generation event in the UsageTracker and refreshes usageMetrics signal.
   */
  public recordGenerationUsage(
    providerId: string,
    promptChars: number,
    imageCount: number,
    outputText: string
  ): void {
    this.client.budget.recordUsage(
      providerId,
      {
        userPrompt: 'x'.repeat(promptChars),
        images: Array.from({ length: imageCount }, () => ({ data: '', mimeType: 'image/jpeg' })),
      },
      outputText
    );
    this.usageMetrics.set(this.client.getUsageMetrics());
  }

  /**
   * Immediately purges all credentials from memory and disk via openbyok/angular store.
   */
  public purgeAllCredentials(): void {
    this.byokStore.purgeAll();
    this.isVaultLocked.set(this.client.passphraseVault.isLocked());
    try {
      sessionStorage.clear();
    } catch { }
  }

  /** Active model for the selected provider */
  public activeModel = computed(() => {
    if (this.selectedProvider() === 'ollama') {
      return this.ollamaModel();
    }
    return undefined;
  });

  public setApiKey(key: string): void {
    this.byokStore.setKey('gemini', key.trim());
  }

  public clearApiKey(): void {
    this.setApiKey('');
  }

  public setProvider(provider: 'gemini' | 'openai' | 'claude' | 'ollama'): void {
    this.selectedProvider.set(provider);
    this.uiController.selectProvider(provider);
    try {
      localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOpenAIKey(key: string): void {
    this.byokStore.setKey('openai', key.trim());
  }

  public clearOpenAIKey(): void {
    this.setOpenAIKey('');
  }

  public setClaudeKey(key: string): void {
    this.byokStore.setKey('claude', key.trim());
  }

  public clearClaudeKey(): void {
    this.setClaudeKey('');
  }

  public setOllamaEndpoint(endpoint: string): void {
    const clean = endpoint.trim() || 'http://localhost:11434';
    this.ollamaEndpoint.set(clean);
    this.uiController.setCustomEndpoint(clean, 'ollama');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_ENDPOINT, clean);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOllamaModel(model: string): void {
    const clean = model.trim() || 'llama3.2-vision';
    this.ollamaModel.set(clean);
    this.uiController.setCustomModel(clean, 'ollama');
    try {
      localStorage.setItem(STORAGE_KEY_OLLAMA_MODEL, clean);
    } catch (e) {
      console.warn('localStorage is unavailable', e);
    }
  }

  public setOllamaKey(key: string): void {
    this.byokStore.setKey('ollama', key.trim());
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
      if (mode === 'passphrase') return 'passphrase';
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
