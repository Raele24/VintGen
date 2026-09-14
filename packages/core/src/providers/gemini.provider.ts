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

  /** Default model recommended for speed, multimodal vision accuracy and cost efficiency */
  public static readonly DEFAULT_MODEL = 'gemini-3.6-flash';

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

    const candidateModels = [
      config.model,
      GeminiProvider.DEFAULT_MODEL,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ]
      .filter((m): m is string => Boolean(m))
      .filter((v, i, a) => a.indexOf(v) === i);

    const baseUrl =
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

    let lastError: Error | null = null;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const model = candidateModels[mIdx];
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
          let errorMessage = `Gemini API responded with status ${response.status}`;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.error?.message) {
              errorMessage = `${errorMessage}: ${parsed.error.message}`;
            }
          } catch {
            errorMessage = `${errorMessage}: ${errorText.slice(0, 200)}`;
          }

          // If 404 model not found and we have another candidate model, fallback to it
          if (response.status === 404 && mIdx < candidateModels.length - 1) {
            console.warn(`Model ${model} returned 404, falling back to ${candidateModels[mIdx + 1]}`);
            continue;
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

        // Sanitize and return strongly-typed ListingResult
        const result: ListingResult = {
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

        return result;
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            throw new Error('Gemini API request timed out after 45s. Please check your connection.');
          }
          lastError = err;
        } else {
          lastError = new Error(String(err));
        }

        if (mIdx < candidateModels.length - 1 && lastError.message.includes('404')) {
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('All candidate Gemini models failed.');
  }

  /**
   * Tests API key validity with a lightweight call to the models endpoint.
   */
  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { success: false, message: 'API key is missing' };
    }

    const baseUrl =
      config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const candidateModels = [
      config.model,
      GeminiProvider.DEFAULT_MODEL,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ]
      .filter((m): m is string => Boolean(m))
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const model of candidateModels) {
      const testUrl = `${baseUrl}/models/${model}?key=${encodeURIComponent(
        config.apiKey.trim()
      )}`;

      try {
        const res = await fetch(testUrl, { method: 'GET' });
        if (res.ok) {
          return { success: true, message: `Connected successfully to ${model}` };
        }
        if (res.status !== 404) {
          const errorJson = await res.json().catch(() => null);
          const msg = errorJson?.error?.message || `HTTP ${res.status} (${res.statusText})`;
          return { success: false, message: `Authentication failed: ${msg}` };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Network error connecting to Gemini: ${msg}` };
      }
    }

    return { success: false, message: 'None of the tested Gemini models are reachable with this key.' };
  }
}

