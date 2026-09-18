/**
 * Gemini AI Provider Implementation
 * 
 * Interacts directly with the Google Gemini REST API (v1beta).
 * Fully compatible with both Node.js (18+) and modern Web Browsers (zero native dependencies).
 */

import {
  AIProvider,
  ImageInput,
  ListingInput,
  ListingResult,
  ProviderConfig,
  ItemCondition,
} from '../types';
import { STRUCTURED_RESPONSE_SCHEMA, MARKETPLACE_SYSTEM_INSTRUCTION } from '../prompts';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini (BYOK)';
  private cachedModelByKey = new Map<string, string>();
  private cachedCandidatesByKey = new Map<string, string[]>();
  private failedModelsInSession = new Set<string>();

  /**
   * Generates a structured marketplace listing using the vision model.
   */
  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('Gemini API key is required. Please provide your API key.');
    }

    // Assemble user text content with hints
    const textPromptParts: string[] = [
      'Generate a comprehensive, accurate secondhand marketplace listing based on the provided photographs and hints.',
    ];

    if (input.titleHint) {
      textPromptParts.push(`Seller Tentative Title: "${input.titleHint}"`);
    }
    if (input.brandHint) {
      textPromptParts.push(`Seller Brand Hint: "${input.brandHint}"`);
    }
    if (input.conditionHint) {
      textPromptParts.push(`Expected Condition: "${input.conditionHint}"`);
    }
    if (input.notes) {
      textPromptParts.push(`Seller Additional Notes / Known Details: "${input.notes}"`);
    }
    const languageNames: Record<string, string> = {
      it: 'Italian (Italiano)',
      en: 'English',
      fr: 'French (FranÃ§ais)',
      es: 'Spanish (EspaÃ±ol)',
      de: 'German (Deutsch)',
    };
    const targetLangName = (input.language && languageNames[input.language]) || (input.language ? input.language.toUpperCase() : 'English');

    textPromptParts.push(
      `TARGET OUTPUT LANGUAGE: ${targetLangName.toUpperCase()}\n` +
      `MANDATORY: You MUST generate all text fields (description bullets, title, flaws, condition notes, category, and price reasoning) entirely in ${targetLangName}. Do NOT output English if the target language is ${targetLangName}.\n` +
      `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.\n` +
      `PRICE VALUATION REQUIREMENT: Accurately detect specifications, capacity (GB/TB), interface, and model tier from photos. Benchmark prices realistically to active European secondary marketplace levels (e.g. 1TB NVMe PCIe 4.0 SSDs trade around €60-€80 used, 2TB around €120-€150). Do NOT assign generic €15-€30 lowball defaults to electronics.`
    );

    // Build parts: text prompt + multimodal images
    const parts: Array<Record<string, unknown>> = [
      { text: textPromptParts.join('\n\n') },
    ];

    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = img.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        parts.push({
          inline_data: {
            mime_type: img.mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: MARKETPLACE_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: STRUCTURED_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    };

    const baseUrl =
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

    const candidates = config.model?.trim()
      ? [config.model.trim()]
      : await this.getCandidateOrder(baseUrl, config.apiKey.trim());

    let lastError: Error | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(
        config.apiKey.trim()
      )}`;

      // Allow 12s per candidate for full multimodal vision encoding without premature timeouts
      const candidateTimeoutMs =
        i < candidates.length - 1
          ? 12000
          : Math.min(config.timeoutMs || 25000, 25000);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), candidateTimeoutMs);

      try {
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.apiKey.trim(),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          let errorMessage = `AI vision model (${model}) responded with status ${response.status}`;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.error?.message) {
              errorMessage = `${errorMessage}: ${parsed.error.message}`;
            }
          } catch {
            if (errorText) {
              errorMessage = `${errorMessage}: ${errorText.slice(0, 200)}`;
            }
          }

          lastError = new Error(errorMessage);

          // Track congested models (503), rate-limited models (429), or modality errors (400)
          this.failedModelsInSession.add(model);

          const isFailoverStatus =
            response.status === 503 ||
            response.status === 429 ||
            response.status === 404 ||
            response.status === 400 ||
            response.status >= 500;

          if (i < candidates.length - 1 && isFailoverStatus) {
            console.warn(`[GeminiProvider] Candidate ${model} returned status ${response.status}, failing over immediately to candidate ${candidates[i + 1]}.`);
            continue;
          }

          throw lastError;
        }

        const jsonResponse = await response.json();
        const candidate = jsonResponse.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error(`No content returned from AI vision model (${model}).`);
        }

        const parsedData = JSON.parse(rawText);
        // Successful generation: remember this active model and unmark from failed pool
        this.failedModelsInSession.delete(model);
        this.setWorkingModel(config.apiKey.trim(), model);
        return this.sanitizeListingResult(parsedData);
      } catch (err: unknown) {
        clearTimeout(timeout);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        this.failedModelsInSession.add(model);

        if (isAbort) {
          lastError = new Error(
            `AI vision model (${model}) timed out after ${candidateTimeoutMs / 1000}s due to high server load.`
          );
        } else if (err instanceof Error) {
          lastError = err;
        } else {
          lastError = new Error(String(err));
        }

        // If further candidates exist, failover immediately without throwing prematurely
        if (i < candidates.length - 1) {
          console.warn(
            `[GeminiProvider] Candidate ${model} encountered ${isAbort ? 'timeout' : 'error'}, failing over immediately to candidate ${candidates[i + 1]}.`
          );
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('All candidate vision models failed to generate listing.');
  }

  /**
   * Tests API key validity with a call to the models endpoint.
   */
  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { success: false, message: 'API key is missing' };
    }

    const baseUrl =
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const testUrl = `${baseUrl}/models?key=${encodeURIComponent(config.apiKey.trim())}`;

    try {
      const res = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'x-goog-api-key': config.apiKey.trim(),
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
          }>;
        };
        const validModels = (data.models || []).filter((m) =>
          this.isValidVisionModel(m)
        );
        const sorted = this.getSortedVisionModels(validModels);
        if (sorted.length > 0) {
          this.cachedCandidatesByKey.set(config.apiKey.trim(), sorted);
        }
        const selected =
          config.model?.trim() ||
          sorted[0] ||
          'gemini-flash-latest';
        if (selected && !config.model?.trim()) {
          this.setWorkingModel(config.apiKey.trim(), selected);
        }
        return {
          success: true,
          message: `Connected. Active vision engine: ${selected}`,
        };
      }
      const errorJson = await res.json().catch(() => null);
      const msg = errorJson?.error?.message || `HTTP ${res.status} (${res.statusText})`;
      return { success: false, message: `Authentication failed: ${msg}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Network error connecting to Gemini: ${msg}` };
    }
  }

  /**
   * Sanitizes the parsed model JSON output into a strongly-typed ListingResult.
   */
  private sanitizeListingResult(parsedData: any): ListingResult {
    return {
      title: String(parsedData.title || '').trim(),
      description: String(parsedData.description || '').trim(),
      category: String(parsedData.category || 'Secondhand Clothing'),
      brand: String(parsedData.brand || 'Vintage'),
      size: String(parsedData.size || 'One Size'),
      condition: (parsedData.condition as ItemCondition) || 'very_good',
      color: String(parsedData.color || ''),
      material: String(parsedData.material || ''),
      price: {
        suggested: Number(parsedData.price?.suggested || 15),
        min: Number(parsedData.price?.min || 10),
        max: Number(parsedData.price?.max || 25),
        currency: String(parsedData.price?.currency || 'EUR'),
        reasoning: String(parsedData.price?.reasoning || 'Market standard pricing'),
      },
      hashtags: Array.isArray(parsedData.hashtags)
        ? parsedData.hashtags.map((tag: string) =>
            tag.startsWith('#') ? tag : `#${tag}`
          )
        : [],
      flaws: Array.isArray(parsedData.flaws) ? parsedData.flaws : [],
      fitNotes: String(parsedData.fitNotes || ''),
      confidence: Number(parsedData.confidence || 0.9),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates whether a model entry supports multimodal vision generation.
   */
  private isValidVisionModel(m: {
    name?: string;
    supportedGenerationMethods?: string[];
  }): boolean {
    const rawName = (m.name || '').toLowerCase();
    const name = rawName.replace(/^models\//, '');

    // Must be a Gemini family model
    if (!name.startsWith('gemini-')) return false;

    // If API declares supported methods, ensure generateContent is supported
    if (
      Array.isArray(m.supportedGenerationMethods) &&
      m.supportedGenerationMethods.length > 0 &&
      !m.supportedGenerationMethods.includes('generateContent')
    ) {
      return false;
    }

    // Reject non-vision models (embeddings, verification/aqa, audio, tts, and imagen image generation)
    if (
      name.includes('embed') ||
      name.includes('aqa') ||
      name.includes('audio') ||
      name.includes('tts') ||
      name.includes('imagen')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Extracts the numeric version of a model from its name identifier.
   */
  private extractModelVersion(name: string): number {
    const match = name.match(/gemini-(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Evaluates the production stability and availability score of a vision model identifier.
   * Prioritizes officially recommended GA stable flash models (such as gemini-3.5-flash and gemini-flash-latest)
   * which have dedicated production clusters, over experimental or preview releases (3.8, 3.7, 3.6)
   * that frequently suffer 503 capacity spikes.
   * Completely filters out retired 2.5-flash models that return 404.
   */
  private getModelPriority(name: string): number {
    const lower = name.toLowerCase();

    // Completely disqualify retired models that Google returns 404 for new users
    if (lower.includes('2.5-flash') || lower.includes('2.5')) {
      return -1000;
    }

    // 1. Top Tier: Official GA stable recommendations with full cluster capacity
    if (lower === 'gemini-3.5-flash' || lower.endsWith('/gemini-3.5-flash')) return 1000;
    if (lower === 'gemini-flash-latest' || lower.endsWith('/gemini-flash-latest')) return 950;
    if (lower.includes('3.5-flash-lite')) return 920;
    if (lower.includes('3.5-flash')) return 900;

    // 2. High-capacity mature LTS releases
    if (lower === 'gemini-1.5-flash' || lower.includes('1.5-flash-latest')) return 800;
    if (lower.includes('1.5-flash-8b')) return 780;
    if (lower.includes('1.5-flash')) return 750;

    // 3. Stable 2.0 releases (if available and not deprecated)
    if (lower.includes('2.0-flash') && !lower.includes('exp') && !lower.includes('preview')) return 600;

    // 4. Cutting-edge preview tiers (3.6, 3.7, 3.8) which experience heavy 503 load
    if (lower.includes('flash')) {
      const v = this.extractModelVersion(name);
      return 300 + v;
    }

    return 100;
  }

  /**
   * Sorts candidate vision models by production stability and cluster capacity.
   */
  private getSortedVisionModels(models: Array<{ name: string }>): string[] {
    const modelNames = models.map((m) => m.name.replace(/^models\//, ''));
    if (modelNames.length === 0) return [];

    // Filter out deprecated models that return 404 and experimental/preview models
    const activeModels = modelNames.filter((name) => {
      const lower = name.toLowerCase();
      if (lower.includes('2.5-flash') || lower.includes('2.5')) return false;
      if (lower.includes('exp') || lower.includes('preview')) return false;
      return true;
    });

    const candidatePool = activeModels.length > 0 ? activeModels : modelNames;

    // Sort by model priority score descending
    const sorted = [...candidatePool].sort((a, b) => {
      const scoreA = this.getModelPriority(a);
      const scoreB = this.getModelPriority(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.localeCompare(b);
    });

    // Ensure rock-solid fallback aliases are present
    const standardFallbacks = [
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-1.5-flash',
    ];
    for (const fb of standardFallbacks) {
      if (!sorted.includes(fb) && modelNames.includes(fb)) {
        sorted.push(fb);
      }
    }

    return sorted;
  }

  /**
   * Selects the optimal multimodal vision model from available candidates.
   */
  private pickVisionModel(models: Array<{ name: string }>): string | null {
    const sorted = this.getSortedVisionModels(models);
    return sorted[0] || null;
  }

  /**
   * Discovers candidate models supporting multimodal vision generation for the provided API key.
   */
  private async discoverModelCandidates(baseUrl: string, apiKey: string): Promise<string[]> {
    const cached = this.cachedCandidatesByKey.get(apiKey);
    if (cached && cached.length > 0) return cached;

    const listUrl = `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
          }>;
        };
        const validModels = (data.models || []).filter((m) => this.isValidVisionModel(m));
        const sorted = this.getSortedVisionModels(validModels);
        if (sorted.length > 0) {
          this.cachedCandidatesByKey.set(apiKey, sorted);
          return sorted;
        }
      }
    } catch {
      // Fall through to fallback
    }

    const fallbackCandidates = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
    this.cachedCandidatesByKey.set(apiKey, fallbackCandidates);
    return fallbackCandidates;
  }

  /**
   * Retrieves the last working model from memory or session storage.
   */
  private getWorkingModel(apiKey: string): string | null {
    const keyHash = apiKey.slice(-6);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(`vg_engine_${keyHash}`);
        if (stored) return stored;
      }
    } catch { }
    return this.cachedModelByKey.get(apiKey) || null;
  }

  /**
   * Stores the last confirmed working model in memory and session storage.
   */
  private setWorkingModel(apiKey: string, model: string): void {
    this.cachedModelByKey.set(apiKey, model);
    const keyHash = apiKey.slice(-6);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(`vg_engine_${keyHash}`, model);
      }
    } catch { }
  }

  /**
   * Resolves the ordered candidate models to try, prioritizing the last known successful model if present.
   */
  private async getCandidateOrder(baseUrl: string, apiKey: string): Promise<string[]> {
    const candidates = await this.discoverModelCandidates(baseUrl, apiKey);
    const lastWorking = this.getWorkingModel(apiKey);

    let ordered = [...candidates];
    if (lastWorking && ordered.includes(lastWorking) && !this.failedModelsInSession.has(lastWorking)) {
      ordered = [lastWorking, ...ordered.filter((c) => c !== lastWorking)];
    }

    // Demote any model that suffered an error or timeout in the active session
    const healthy = ordered.filter((c) => !this.failedModelsInSession.has(c));
    const congested = ordered.filter((c) => this.failedModelsInSession.has(c));
    const sortedCandidates = [...healthy, ...congested];

    // Ensure official GA stable endpoints are present
    if (!sortedCandidates.includes('gemini-3.5-flash')) {
      sortedCandidates.unshift('gemini-3.5-flash');
    }
    if (!sortedCandidates.includes('gemini-flash-latest')) {
      sortedCandidates.splice(1, 0, 'gemini-flash-latest');
    }

    // Cap candidate pool to top 6 across stable and fallback tiers
    return sortedCandidates.slice(0, 6);
  }

  /**
   * Discovers an active model supporting multimodal content generation for the provided API key.
   */
  private async discoverModel(baseUrl: string, apiKey: string): Promise<string> {
    const candidates = await this.getCandidateOrder(baseUrl, apiKey);
    return candidates[0] || 'gemini-flash-latest';
  }
}

