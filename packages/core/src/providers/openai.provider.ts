/**
 * OpenAI Provider
 *
 * Implements the AIProvider interface for OpenAI's Chat Completions API
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

export class OpenAIProvider implements AIProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI (BYOK)';

  public static readonly DEFAULT_MODEL = 'gpt-4o-mini';

  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('OpenAI API key is required. Please provide your API key.');
    }

    const userContent: Array<Record<string, unknown>> = [];

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
      fr: 'French (FranÃ§ais)',
      es: 'Spanish (EspaÃ±ol)',
      de: 'German (Deutsch)',
    };
    const targetLangName = (input.language && languageNames[input.language]) || (input.language ? input.language.toUpperCase() : 'English');

    textParts.push(
      `TARGET OUTPUT LANGUAGE: ${targetLangName.toUpperCase()}\n` +
      `MANDATORY: You MUST generate all text fields (description bullets, title, flaws, condition notes, category, and price reasoning) entirely in ${targetLangName}. Do NOT output English if the target language is ${targetLangName}.\n` +
      `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.\n` +
      `PRICE VALUATION REQUIREMENT: Accurately detect specifications, capacity (GB/TB), interface, and model tier from photos. Benchmark prices realistically to active European secondary marketplace levels (e.g. 1TB NVMe PCIe 4.0 SSDs trade around €60-€80 used, 2TB around €120-€150). Do NOT assign generic €15-€30 lowball defaults to electronics.`
    );

    textParts.push(
      '\nYou MUST respond with a single valid JSON object matching the schema described in the system prompt. Do NOT include markdown fences or any text outside the JSON.'
    );

    userContent.push({ type: 'text', text: textParts.join('\n\n') });

    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        const cleanBase64 = img.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        const mimeType = img.mimeType || 'image/jpeg';
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${cleanBase64}`,
            detail: 'high',
          },
        });
      }
    }

    const schemaInstruction = `\n\nYou must output a JSON object with these exact keys:
{
  "title": "string - optimized search title under 65 chars",
  "description": "string - structured bulleted description",
  "category": "string - e.g. Men > Tops > T-Shirts",
  "brand": "string",
  "size": "string - e.g. M / 38",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, satisfactory",
  "color": "string",
  "material": "string",
  "price": { "suggested": number, "min": number, "max": number, "currency": "EUR", "reasoning": "string" },
  "hashtags": ["#brand", "#model", "#spec1", "#spec2", "#category", "#keyword1", "#keyword2", "... (10-15 total)"],
  "flaws": ["string", ...],
  "fitNotes": "string",
  "confidence": number between 0.0 and 1.0
}`;

    const requestBody: Record<string, unknown> = {
      model: config.model || OpenAIProvider.DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: MARKETPLACE_SYSTEM_INSTRUCTION + schemaInstruction,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2048,
    };

    const candidateModels = [
      config.model,
      OpenAIProvider.DEFAULT_MODEL,
      'gpt-4o',
    ]
      .filter((m): m is string => Boolean(m))
      .filter((v, i, a) => a.indexOf(v) === i);

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    let lastError: Error | null = null;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const model = candidateModels[mIdx];
      requestBody['model'] = model;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 60000);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey.trim()}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `OpenAI API responded with status ${response.status}`;
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
        const rawText = jsonResponse.choices?.[0]?.message?.content;

        if (!rawText) {
          throw new Error('No content returned from OpenAI model.');
        }

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
          confidence: Number(parsedData.confidence || 0.9),
          createdAt: new Date().toISOString(),
        };

        return result;
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            throw new Error('OpenAI API request timed out after 60s. Please check your connection.');
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

    throw lastError || new Error('All candidate OpenAI models failed.');
  }

  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { success: false, message: 'API key is missing' };
    }

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey.trim()}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const models = data.data?.map((m: { id: string }) => m.id) || [];
        const hasVision = models.some((m: string) => m.includes('gpt') || m.includes('vision') || m.includes('4o'));
        if (hasVision) {
          return { success: true, message: 'Connected successfully. Vision models available.' };
        }
        return { success: true, message: 'Connected successfully.' };
      }

      const errorJson = await res.json().catch(() => null);
      const msg = errorJson?.error?.message || `HTTP ${res.status} (${res.statusText})`;
      return { success: false, message: `Authentication failed: ${msg}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Network error connecting to OpenAI: ${msg}` };
    }
  }
}

