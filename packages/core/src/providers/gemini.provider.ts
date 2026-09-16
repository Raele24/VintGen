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
      `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.`
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

    const model =
      config.model?.trim() || (await this.discoverModel(baseUrl, config.apiKey.trim()));

    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(
      config.apiKey.trim()
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 45000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();

        // If the dynamically discovered model failed due to unsupported modality or resource exhaustion with limit 0,
        // retry once with the official dynamic alias
        if (
          !config.model &&
          model !== 'gemini-flash-latest' &&
          (response.status === 404 ||
            response.status === 400 ||
            (response.status === 429 && errorText.includes('limit: 0')))
        ) {
          const fallbackEndpoint = `${baseUrl}/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(
            config.apiKey.trim()
          )}`;
          const fallbackResponse = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          if (fallbackResponse.ok) {
            this.cachedModelByKey.set(config.apiKey.trim(), 'gemini-flash-latest');
            const fallbackJson = await fallbackResponse.json();
            const fallbackCandidate = fallbackJson.candidates?.[0];
            const fallbackRawText = fallbackCandidate?.content?.parts?.[0]?.text;
            if (fallbackRawText) {
              const parsedData = JSON.parse(fallbackRawText);
              return this.sanitizeListingResult(parsedData);
            }
          }
        }

        let errorMessage = `Gemini API responded with status ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) {
            errorMessage = `${errorMessage}: ${parsed.error.message}`;
          }
        } catch {
          errorMessage = `${errorMessage}: ${errorText.slice(0, 200)}`;
        }

        throw new Error(errorMessage);
      }

      const jsonResponse = await response.json();
      const candidate = jsonResponse.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('No content returned from Gemini model.');
      }

      const parsedData = JSON.parse(rawText);
      return this.sanitizeListingResult(parsedData);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Gemini API request timed out after 45s. Please check your connection.');
        }
        throw err;
      }
      throw new Error(String(err));
    }
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
      const res = await fetch(testUrl, { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
            thinking?: boolean;
            supportedInputModalities?: string[];
          }>;
        };
        const validModels = (data.models || []).filter((m) =>
          this.isValidVisionModel(m)
        );
        const selected =
          config.model?.trim() ||
          this.pickVisionModel(validModels) ||
          'gemini-flash-latest';
        if (selected && !config.model?.trim()) {
          this.cachedModelByKey.set(config.apiKey.trim(), selected);
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
    thinking?: boolean;
  }): boolean {
    const rawName = (m.name || '').toLowerCase();
    const name = rawName.replace(/^models\//, '');

    // Must be a Gemini family model
    if (!name.startsWith('gemini-')) return false;

    const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent');
    if (!supportsGenerate) return false;

    // Reject text-only thinking models
    if (m.thinking === true || name.includes('thinking')) return false;

    // Reject embeddings, verification/answer, audio, tts, and image generation models
    if (
      name.includes('embed') ||
      name.includes('aqa') ||
      name.includes('audio') ||
      name.includes('tts') ||
      name.includes('imagen') ||
      name.endsWith('-image') ||
      name.includes('preview-image') ||
      name.includes('image-preview')
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
   * Selects the optimal multimodal vision model from available candidates,
   * prioritizing stable releases, higher semantic versions, and flash models.
   */
  private pickVisionModel(models: Array<{ name: string }>): string | null {
    const modelNames = models.map((m) => m.name.replace(/^models\//, ''));
    if (modelNames.length === 0) return null;

    const sorted = [...modelNames].sort((a, b) => {
      // Prioritize stable over experimental/preview
      const aIsExp =
        a.toLowerCase().includes('exp') || a.toLowerCase().includes('preview') ? 1 : 0;
      const bIsExp =
        b.toLowerCase().includes('exp') || b.toLowerCase().includes('preview') ? 1 : 0;
      if (aIsExp !== bIsExp) {
        return aIsExp - bIsExp;
      }

      const vA = this.extractModelVersion(a);
      const vB = this.extractModelVersion(b);
      if (vB !== vA) {
        return vB - vA; // Highest version first
      }

      // If identical version, prioritize flash variants for fast listings
      const aIsFlash = a.toLowerCase().includes('flash') ? 1 : 0;
      const bIsFlash = b.toLowerCase().includes('flash') ? 1 : 0;
      if (bIsFlash !== aIsFlash) {
        return bIsFlash - aIsFlash;
      }

      return a.localeCompare(b);
    });

    return sorted[0] || null;
  }

  /**
   * Discovers an active model supporting multimodal content generation for the provided API key.
   * If discovery encounters errors or no candidate, gracefully falls back to the dynamic latest alias.
   */
  private async discoverModel(baseUrl: string, apiKey: string): Promise<string> {
    const cached = this.cachedModelByKey.get(apiKey);
    if (cached) return cached;

    const fallbackModel = 'gemini-flash-latest';
    const listUrl = `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(listUrl, { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
            thinking?: boolean;
          }>;
        };
        const validModels = (data.models || []).filter((m) => this.isValidVisionModel(m));
        const selected = this.pickVisionModel(validModels);
        if (selected) {
          this.cachedModelByKey.set(apiKey, selected);
          return selected;
        }
      }
    } catch {
      // Fall through to fallback
    }

    this.cachedModelByKey.set(apiKey, fallbackModel);
    return fallbackModel;
  }
}

