/**
 * Ollama Local AI Provider (Llama 3.2 Vision, LLaVA, MiniCPM-V, etc.)
 *
 * Implements the AIProvider interface for locally hosted Ollama instances
 * with multi-modal vision support for private, offline listing generation.
 */

import {
  AIProvider,
  ListingInput,
  ListingResult,
  PriceRecommendation,
  ProviderConfig,
  ItemCondition,
} from '../types';
import { MARKETPLACE_SYSTEM_INSTRUCTION } from '../prompts';

export class OllamaProvider implements AIProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama (Local)';

  public static readonly DEFAULT_ENDPOINT = 'http://localhost:11434';
  public static readonly DEFAULT_MODEL = 'llama3.2-vision';

  /**
   * Generates a marketplace listing using a local Ollama vision model.
   */
  public async generateListing(
    input: ListingInput,
    config: ProviderConfig
  ): Promise<ListingResult> {
    const rawEndpoint = config.baseUrl || OllamaProvider.DEFAULT_ENDPOINT;
    const endpoint = rawEndpoint.trim().replace(/\/+$/, '');
    const model = config.model || OllamaProvider.DEFAULT_MODEL;

    // Collect base64 images without data URI prefix
    const base64Images: string[] = [];
    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        const cleanBase64 = img.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        base64Images.push(cleanBase64);
      }
    }

    // Build user prompt text
    const textParts: string[] = [
      'Analyze the provided photograph(s) and generate a complete, accurate secondhand marketplace listing in strict JSON format matching the schema.',
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
      textParts.push(`Seller Additional Notes: "${input.notes}"`);
    }

    const langMap: Record<string, string> = {
      it: 'Italian',
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
    };
    const targetLang = input.language ? langMap[input.language] || 'English' : 'English';
    textParts.push(`Target Output Language: ${targetLang}.`);
    textParts.push('Output ONLY raw JSON conforming strictly to the requested schema. Do not enclose in markdown ticks if possible.');

    const userContent = textParts.join('\n');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey && config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: MARKETPLACE_SYSTEM_INSTRUCTION,
        },
        {
          role: 'user',
          content: userContent,
          ...(base64Images.length > 0 ? { images: base64Images } : {}),
        },
      ],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
      },
    };

    let response: Response;
    try {
      response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to connect to Ollama at ${endpoint}. Please verify that Ollama is running ('ollama serve') and accessible. Error: ${msg}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 404) {
        throw new Error(
          `Ollama model "${model}" not found. Please install it by running "ollama run ${model}" in your terminal.`
        );
      }
      throw new Error(
        `Ollama API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const resData = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };

    const rawJsonText = resData.message?.content || resData.response || '';
    if (!rawJsonText.trim()) {
      throw new Error('Ollama returned an empty response. Please check model logs.');
    }

    return this.parseAndValidateResponse(rawJsonText);
  }

  /**
   * Tests whether the local Ollama instance is reachable and checks installed models.
   */
  public async testConnection(
    config: ProviderConfig
  ): Promise<{ success: boolean; message: string }> {
    const rawEndpoint = config.baseUrl || OllamaProvider.DEFAULT_ENDPOINT;
    const endpoint = rawEndpoint.trim().replace(/\/+$/, '');
    const targetModel = config.model || OllamaProvider.DEFAULT_MODEL;

    const headers: Record<string, string> = {};
    if (config.apiKey && config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          message: `Ollama server replied with HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = (await response.json()) as {
        models?: Array<{ name: string }>;
      };

      const models = data.models || [];
      const modelNames = models.map((m) => m.name);

      const targetBase = targetModel.split(':')[0].toLowerCase();
      const hasModel = modelNames.some((n) => n.toLowerCase().includes(targetBase));

      if (hasModel) {
        return {
          success: true,
          message: `Connected to Ollama! Model "${targetModel}" is ready.`,
        };
      } else if (modelNames.length > 0) {
        const topModels = modelNames.slice(0, 3).join(', ');
        return {
          success: true,
          message: `Connected to Ollama! (Model "${targetModel}" not detected yet. Available: ${topModels}. Run "ollama run ${targetModel}" to download it).`,
        };
      } else {
        return {
          success: true,
          message: `Connected to Ollama! No models installed yet. Run "ollama run ${targetModel}" to install vision capability.`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        return {
          success: false,
          message: `Connection to Ollama timed out at ${endpoint}. Ensure Ollama is running ('ollama serve').`,
        };
      }
      return {
        success: false,
        message: `Cannot reach Ollama at ${endpoint}. Ensure Ollama is running ('ollama serve'). If in browser, ensure OLLAMA_ORIGINS="*" is set.`,
      };
    }
  }

  /**
   * Sanitizes and parses raw JSON response text from Ollama.
   */
  private parseAndValidateResponse(rawText: string): ListingResult {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      throw new Error(
        `Failed to parse JSON output from Ollama: ${rawText.slice(0, 150)}...`
      );
    }

    const validConditions: ItemCondition[] = [
      'new_with_tags',
      'new_without_tags',
      'very_good',
      'good',
      'satisfactory',
    ];

    const rawCond = String(parsed['condition'] || 'very_good').toLowerCase();
    const condition: ItemCondition = validConditions.includes(rawCond as ItemCondition)
      ? (rawCond as ItemCondition)
      : 'very_good';

    const rawPrice = parsed['price'] || {};
    const price: PriceRecommendation = {
      suggested: Number(rawPrice.suggested) || 25,
      min: Number(rawPrice.min) || 20,
      max: Number(rawPrice.max) || 35,
      currency: 'EUR',
      reasoning: String(rawPrice.reasoning || 'Estimated secondhand marketplace valuation'),
    };

    const rawTags = Array.isArray(parsed['hashtags']) ? parsed['hashtags'] : [];
    const hashtags = rawTags.map((t: unknown) => {
      const s = String(t).trim();
      return s.startsWith('#') ? s : `#${s}`;
    });

    const rawFlaws = Array.isArray(parsed['flaws']) ? parsed['flaws'] : [];
    const flaws = rawFlaws.map((f: unknown) => String(f).trim()).filter(Boolean);

    return {
      title: String(parsed['title'] || 'Secondhand Item').trim(),
      description: String(parsed['description'] || 'No description provided.').trim(),
      category: String(parsed['category'] || 'Clothing').trim(),
      brand: String(parsed['brand'] || 'Unbranded').trim(),
      size: String(parsed['size'] || 'Standard').trim(),
      condition,
      color: String(parsed['color'] || 'Multi').trim(),
      material: String(parsed['material'] || 'Not specified').trim(),
      price,
      hashtags: hashtags.length > 0 ? hashtags : ['#secondhand', '#fashion', '#marketplace'],
      flaws,
      fitNotes: String(parsed['fitNotes'] || 'Standard fit').trim(),
      confidence: Number(parsed['confidence']) || 0.85,
      createdAt: new Date().toISOString(),
    };
  }
}

