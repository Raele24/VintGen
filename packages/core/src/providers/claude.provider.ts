/**
 * Anthropic Claude Provider
 *
 * Implements the AIProvider interface for Anthropic's Messages API
 * with multimodal vision support for image-based listing generation.
 */

import {
  AIProvider,
  ListingInput,
  ListingResult,
  ProviderConfig,
  ItemCondition,
} from '../types';
import { MARKETPLACE_SYSTEM_INSTRUCTION } from '../prompts';

export class ClaudeProvider implements AIProvider {
  public readonly id = 'claude';
  public readonly name = 'Anthropic Claude';

  public static readonly DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('Anthropic Claude API key is required. Please provide your API key.');
    }

    const contentItems: Array<Record<string, unknown>> = [];

    // Add images first in Claude format
    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        const cleanBase64 = img.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        let mediaType = img.mimeType || 'image/jpeg';
        // Claude accepts: image/jpeg, image/png, image/gif, image/webp
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
          mediaType = 'image/jpeg';
        }

        contentItems.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: cleanBase64,
          },
        });
      }
    }

    // Build text instructions
    const textParts: string[] = [
      'Generate a comprehensive, accurate secondhand marketplace listing based on the provided photographs and hints.',
    ];

    if (input.titleHint) {
      textParts.push(`Seller Tentative Title: "${input.titleHint}"`);
    }
    if (input.brandHint) {
      textParts.push(`Seller Brand Hint: "${input.brandHint}"`);
    }
    if (input.conditionHint) {
      textParts.push(`Expected Condition: "${input.conditionHint}"`);
    }
    if (input.notes) {
      textParts.push(`Seller Additional Notes / Known Details: "${input.notes}"`);
    }

    const languageNames: Record<string, string> = {
      it: 'Italian (Italiano)',
      en: 'English',
      fr: 'French (Français)',
      es: 'Spanish (Español)',
      de: 'German (Deutsch)',
    };
    const targetLangName = (input.language && languageNames[input.language]) || (input.language ? input.language.toUpperCase() : 'English');

    textParts.push(
      `TARGET OUTPUT LANGUAGE: ${targetLangName.toUpperCase()}\n` +
      `MANDATORY: You MUST generate all text fields (description bullets, title, flaws, condition notes, category, and price reasoning) entirely in ${targetLangName}. Do NOT output English if the target language is ${targetLangName}.\n` +
      `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.`
    );

    textParts.push(
      '\nYou MUST respond with ONLY a single valid raw JSON object matching the requested schema. Do NOT include markdown formatting, backticks, preamble, or commentary outside the JSON.'
    );

    contentItems.push({
      type: 'text',
      text: textParts.join('\n\n'),
    });

    const schemaInstruction = `\n\nYou must output a JSON object with these exact keys:
{
  "title": "string - optimized search title under 65 chars",
  "description": "string - short telegraphic bulleted description with dashes",
  "category": "string - e.g. Men > Tops > T-Shirts or Electronics > RAM Memory",
  "brand": "string",
  "size": "string - normalized size or capacity",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, satisfactory",
  "color": "string",
  "material": "string",
  "price": { "suggested": number, "min": number, "max": number, "currency": "EUR", "reasoning": "string" },
  "hashtags": ["#tag1", "#tag2", ... 10 to 15 items],
  "flaws": ["string", ...],
  "fitNotes": "string",
  "confidence": number between 0.0 and 1.0
}`;

    const candidateModels = [
      config.model,
      ClaudeProvider.DEFAULT_MODEL,
      'claude-3-5-sonnet-20241022',
    ]
      .filter((m): m is string => Boolean(m))
      .filter((v, i, a) => a.indexOf(v) === i);

    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    let lastError: Error | null = null;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const model = candidateModels[mIdx];

      const requestBody: Record<string, unknown> = {
        model,
        max_tokens: 2048,
        system: MARKETPLACE_SYSTEM_INSTRUCTION + schemaInstruction,
        messages: [
          {
            role: 'user',
            content: contentItems,
          },
        ],
        temperature: 0.2,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 60000);

      try {
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey.trim(),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Claude API responded with status ${response.status}`;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.error?.message) {
              errorMessage = `${errorMessage}: ${parsed.error.message}`;
            }
          } catch {
            errorMessage = `${errorMessage}: ${errorText.slice(0, 200)}`;
          }

          if (response.status === 404 && mIdx < candidateModels.length - 1) {
            console.warn(`Model ${model} returned 404, falling back to ${candidateModels[mIdx + 1]}`);
            continue;
          }

          throw new Error(errorMessage);
        }

        const jsonResponse = await response.json();
        const textBlocks = jsonResponse.content?.filter((c: { type: string; text?: string }) => c.type === 'text') || [];
        const rawText = textBlocks.map((c: { text: string }) => c.text).join('\n').trim();

        if (!rawText) {
          throw new Error('No text content returned from Claude model.');
        }

        // Clean any potential markdown wrapping
        const cleanedText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        const parsedData = JSON.parse(cleanedText);

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
          confidence: Number(parsedData.confidence || 0.95),
          createdAt: new Date().toISOString(),
        };

        return result;
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            throw new Error('Claude API request timed out after 60s. Please check your connection.');
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

    throw lastError || new Error('All candidate Claude models failed.');
  }

  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { success: false, message: 'API key is missing' };
    }

    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';

    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'x-api-key': config.apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });

      if (res.ok) {
        return { success: true, message: 'Connected successfully. Claude 3.5 Vision models ready.' };
      }

      const errorJson = await res.json().catch(() => null);
      const msg = errorJson?.error?.message || `HTTP ${res.status} (${res.statusText})`;
      return { success: false, message: `Authentication failed: ${msg}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Network error connecting to Claude: ${msg}` };
    }
  }
}

