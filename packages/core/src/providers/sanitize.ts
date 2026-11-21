import type { ItemCondition, ListingResult, PriceRecommendation } from '../types';

export const VALID_CONDITIONS: readonly ItemCondition[] = [
  'new_with_tags',
  'new_without_tags',
  'very_good',
  'good',
  'satisfactory',
];

export interface SanitizeListingDefaults {
  title?: string;
  description?: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  priceSuggested?: number;
  priceMin?: number;
  priceMax?: number;
  priceCurrency?: string;
  priceReasoning?: string;
  defaultHashtags?: string[];
  fitNotes?: string;
  confidence?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTrimmedString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  return fallback;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' || typeof value === 'string') {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
      return num;
    }
  }
  return fallback;
}

function sanitizeCondition(value: unknown): ItemCondition {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return VALID_CONDITIONS.find((cond) => cond === normalized) ?? 'very_good';
}

/**
 * Normalizes raw provider JSON output into a validated ListingResult.
 */
export function sanitizeListingResult(
  raw: Record<string, unknown>,
  defaults: SanitizeListingDefaults = {}
): ListingResult {
  const rawPrice = isRecord(raw['price']) ? raw['price'] : {};
  const price: PriceRecommendation = {
    suggested: toPositiveNumber(rawPrice['suggested'], defaults.priceSuggested ?? 15),
    min: toPositiveNumber(rawPrice['min'], defaults.priceMin ?? 10),
    max: toPositiveNumber(rawPrice['max'], defaults.priceMax ?? 25),
    currency: toTrimmedString(rawPrice['currency'], defaults.priceCurrency ?? 'EUR'),
    reasoning: toTrimmedString(
      rawPrice['reasoning'],
      defaults.priceReasoning ?? 'Market standard pricing'
    ),
  };

  const parsedHashtags = Array.isArray(raw['hashtags'])
    ? raw['hashtags']
        .map((tag) => (tag === null || tag === undefined ? '' : String(tag).trim()))
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    : [];

  const hashtags =
    parsedHashtags.length > 0
      ? parsedHashtags
      : defaults.defaultHashtags
        ? [...defaults.defaultHashtags]
        : [];

  const flaws = Array.isArray(raw['flaws'])
    ? raw['flaws']
        .map((flaw) => (flaw === null || flaw === undefined ? '' : String(flaw).trim()))
        .filter((flaw) => flaw.length > 0)
    : [];

  return {
    title: toTrimmedString(raw['title'], defaults.title ?? ''),
    description: toTrimmedString(raw['description'], defaults.description ?? ''),
    category: toTrimmedString(raw['category'], defaults.category ?? 'Secondhand Clothing'),
    brand: toTrimmedString(raw['brand'], defaults.brand ?? 'Vintage'),
    size: toTrimmedString(raw['size'], defaults.size ?? 'One Size'),
    condition: sanitizeCondition(raw['condition']),
    color: toTrimmedString(raw['color'], defaults.color ?? ''),
    material: toTrimmedString(raw['material'], defaults.material ?? ''),
    price,
    hashtags,
    flaws,
    fitNotes: toTrimmedString(raw['fitNotes'], defaults.fitNotes ?? ''),
    confidence: toPositiveNumber(raw['confidence'], defaults.confidence ?? 0.9),
    createdAt: new Date().toISOString(),
  };
}
