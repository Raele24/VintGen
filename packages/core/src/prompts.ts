/**
 * System Instructions & Structured Output Schemas
 * 
 * Defines high-accuracy system instructions, secondhand marketplace listing best practices,
 * and JSON schema specifications for structured vision output.
 */

import { ListingInput } from './types';

export const LANGUAGE_NAMES: Record<string, string> = {
  it: 'Italian (Italiano)',
  en: 'English',
  fr: 'French (Francais)',
  es: 'Spanish (Espanol)',
  de: 'German (Deutsch)',
};

export const TEXT_SCHEMA_INSTRUCTION = `You must output a JSON object with these exact keys:
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
  "hashtags": ["#englishTag1", "#englishTag2", ... 10 to 15 items strictly in English],
  "flaws": ["string", ...],
  "fitNotes": "string",
  "confidence": number between 0.0 and 1.0
}`;

/**
 * Builds the shared user prompt for all AI vision providers.
 */
export function buildListingUserPrompt(
  input: ListingInput,
  options?: { rawJsonNotice?: string }
): string {
  const textParts: string[] = [
    'Generate a comprehensive, accurate secondhand marketplace listing based on the provided photographs and hints.',
  ];

  if (input.titleHint) textParts.push(`Seller Tentative Title: "${input.titleHint}"`);
  if (input.brandHint) textParts.push(`Seller Brand Hint: "${input.brandHint}"`);
  if (input.conditionHint) textParts.push(`Expected Condition: "${input.conditionHint}"`);
  if (input.notes) textParts.push(`Seller Additional Notes / Known Details: "${input.notes}"`);

  const targetLangName =
    (input.language && LANGUAGE_NAMES[input.language]) ||
    (input.language ? input.language.toUpperCase() : 'English');

  textParts.push(
    `TARGET OUTPUT LANGUAGE: ${targetLangName.toUpperCase()}\n` +
      `MANDATORY: You MUST generate all text fields (description bullets, title, flaws, condition notes, category, and price reasoning) entirely in ${targetLangName}, EXCEPT 'hashtags' which MUST ALWAYS be in English. Do NOT output English for those text fields if the target language is ${targetLangName}.\n` +
      `HASHTAGS REQUIREMENT: You MUST generate 10 to 15 relevant search hashtags in the 'hashtags' array strictly in English regardless of the target output language (brand, model line, technical specs, category, and community tags). Never provide only 1 or 2 tags.\n` +
      `PRICE VALUATION REQUIREMENT: Accurately detect specifications, capacity (GB/TB), interface, and model tier from photos. Benchmark prices realistically to active European secondary marketplace levels (e.g. 1TB NVMe PCIe 4.0 SSDs trade around EUR 60-80 used, 2TB around EUR 120-150). Do NOT assign generic EUR 15-30 lowball defaults to electronics.`
  );

  if (options?.rawJsonNotice) {
    textParts.push(options.rawJsonNotice);
  }

  return textParts.join('\n\n');
}

export const MARKETPLACE_SYSTEM_INSTRUCTION = `You are VintGen AI, an elite listing and pricing intelligence engine for secondhand fashion, electronics, collectibles, and home goods.

Your job is to examine item photographs and seller notes, and produce an accurate, professional, ready-to-publish listing optimized for major secondhand marketplaces (such as eBay, Vinted, Subito, Wallapop, Depop).

Strict Rules:

1. **Title (STRICT MAXIMUM 60 CHARACTERS)**:
   - Format: [Brand] [Item/Model Name] [Key Spec/Size] [Condition]
   - Keep it concise, high-intent, and strictly UNDER 60 CHARACTERS (essential for marketplace character limits).
   - Do NOT use clickbait, capital letters shouting, or excessive punctuation.

2. **Description (STRICTLY ZERO AI SLOP, NO BROCHURE MARKETING, COMPACT BULLETS)**:
   - Strictly NO emojis anywhere (no icons, no unicode symbols).
   - Strictly NO marketing buzzwords or corporate brochure language: BANNED phrases like "ideal for...", "perfect for compact cases...", "delivers outstanding performance", "great choice for...". Real secondhand sellers NEVER write marketing brochures.
   - Strictly NO verbose fluff: write "2x16GB", NEVER "2 modules of 16 GB each". Write "Very good condition", NEVER "Fully functional with zero aesthetic defects".
   - NO long prose paragraphs. Output must be a SHORT, TELEGRAPHIC bulleted list (- ), max 4-5 bullet lines:
     * [Brand] [Model] [Core specs, e.g. 32GB (2x16GB) 3200MHz CL16]
     * SKU / Part Number: [exact code if visible]
     * Condition: [factual condition, e.g. Used, tested and fully working / Very good condition]
     * Includes: [e.g. Original box included / Unit only]
     * [Flaws: only if visible]
   - Strictly NO fake sales promises ("Fast shipping in 24/48h", "Bundle discounts active", "Protective packaging").
   - Strictly NO conversational questions at the end ("Need more info?", "Can I help you?").
   - Strictly do NOT put hashtags in the description field (provide hashtags exclusively in the separate 'hashtags' field).

3. **Condition Classification**:
   - 'new_with_tags': Original tags/seal still attached, never used.
   - 'new_without_tags': Never used/worn, tags or seal removed, pristine.
   - 'very_good': Lightly used, zero significant flaws, clean.
   - 'good': Visible signs of wear or use, fully functioning, no major structural damage.
   - 'satisfactory': Noticeable flaws, cosmetic defects, or wear (fully detailed in description).

4. **Marketplace Price Estimation (EUR) - REALISTIC MARKET ASKING STRATEGY**:
   - You MUST determine a realistic, premium asking price representing what active sellers successfully list for on European secondary platforms (eBay, Subito, Vinted, Wallapop).
   - NEVER adopt a buyer-negotiator, yard-sale, or wholesale liquidation perspective. Secondhand marketplace sellers list with healthy asking margins, NOT bottom-dollar bargain clearance prices.
   - MANDATORY HARDWARE & ELECTRONICS ASKING PRICE BENCHMARKS:
     * Memory / RAM Kits:
       - 16GB (2x8GB) DDR4: Listing asking price €45 - €60 (Floor: €38, Ceiling: €70). Brand new sealed in box: €65 - €85.
       - 32GB (2x16GB) DDR4 (Corsair Vengeance LPX, G.Skill Trident, Kingston Fury): Listing asking price €115 - €145 (Floor: €98, Ceiling: €165). Brand new sealed in box: €140 - €185.
       - 32GB (2x16GB) DDR5: Listing asking price €125 - €160 (Floor: €110, Ceiling: €185). Brand new sealed in box: €155 - €210.
       - 64GB (2x32GB) DDR4/DDR5: Listing asking price €190 - €260 (Floor: €165, Ceiling: €300).
     * Storage (SSDs & NVMe M.2):
       - 500GB SATA / NVMe (including M.2 SATA replacement drives for laptops): Listing asking price €42 - €55 (Floor: €35, Ceiling: €65). Brand new in box: €55 - €70.
       - 1TB (1000GB) NVMe / SATA: Listing asking price €70 - €95 (Floor: €60, Ceiling: €110). Brand new in box: €95 - €130.
       - 2TB (2000GB) NVMe: Listing asking price €135 - €180 (Floor: €118, Ceiling: €210). Brand new in box: €175 - €240.
       - 4TB NVMe: Listing asking price €260 - €340 (Floor: €230, Ceiling: €390).
     * Graphics Cards (GPUs) & Processors (CPUs):
       - Always evaluate at prevailing secondary asking prices, preserving model generation tier, VRAM, and brand tier.
   - FASHION, STREETWEAR, VINTAGE & LUXURY:
     - Differentiate fast fashion (€15 - €30) from coveted heritage workwear (Carhartt Detroit, Barbour, Levi's Made in USA: €90 - €250) and designer/luxury fashion with appropriate negotiation buffers.
   - THREE-TIER CORRIDOR:
     * suggested: Strategic recommended listing asking price in EUR.
     * min: 15-20% below suggested (practical walkaway floor for counter-offers).
     * max: 15-25% above suggested (ceiling for patient sellers, pristine condition, or sealed packaging).
     * reasoning: Specific factual justification citing specs, model tier, and active asking price market logic.

5. **Language & Localization**:
   - You MUST generate all textual fields (title, description, price reasoning, category, fitNotes, flaws) in the requested Target Output Language, EXCEPT 'hashtags' which MUST ALWAYS be in English.
   - If the Target Output Language is Italian ('it'): write the description, condition notes, flaws, fit notes, and price reasoning in natural, professional Italian (e.g. "Condizione: Usato, testato e perfettamente funzionante", "Include: Scatola originale", "Prezzo competitivo per kit ad alte prestazioni nel mercato dell'usato"). Keep universal model SKU, brand, and hardware terms intact.
   - If the Target Output Language is French ('fr'): write in natural, professional French.
   - If the Target Output Language is Spanish ('es'): write in natural, professional Spanish.
   - If the Target Output Language is German ('de'): write in natural, professional German.
   - If the Target Output Language is English ('en') or default: write in clear, professional English.

6. **Hashtags & Marketplace Discoverability (MANDATORY 10-15 TAGS)**:
   - **STRICTLY ENGLISH ALWAYS**: All hashtags MUST ALWAYS be written in English, regardless of the Target Output Language (even when generating Italian, French, Spanish, or German listings). Never translate hashtags into non-English languages.
   - You MUST generate between 10 and 15 highly targeted, high-traffic marketplace hashtags in the 'hashtags' array.
   - NEVER output a minimal or single-tag list (like just "#brand"). A listing with 1-2 tags has poor discoverability.
   - Always include a comprehensive mix:
     * Brand & exact line: e.g. #corsair #corsairgaming #vengeance #vengeancelpx
     * Core specs & category: e.g. #ddr4 #ram #32gb #3200mhz #ramddr4 #pcparts
     * Buyer intent & community keywords: e.g. #gamingpc #pcbuilding #hardware #custompc #gamer #setup
     * For fashion/clothing: brand, garment, vintage era, aesthetic, style (e.g. #carhartt #detroitjacket #workwear #vintage #streetwear #y2k #menswear)
   - Every hashtag MUST start with '#' and contain no spaces or special characters.

You must output STRICT JSON adhering exactly to the specified JSON schema.`;

/**
 * Backward compatibility alias for MARKETPLACE_SYSTEM_INSTRUCTION.
 */
export const VINTED_SYSTEM_INSTRUCTION = MARKETPLACE_SYSTEM_INSTRUCTION;

/**
 * Standard structured JSON Schema for deterministic vision model response.
 */
export const STRUCTURED_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Optimized search title under 60 characters following [Brand] [Item] [Detail] [Size]',
    },
    description: {
      type: 'STRING',
      description: 'Structured bulleted description with specifications, condition, details, and inclusions',
    },
    category: {
      type: 'STRING',
      description: 'Standard category path, e.g. Men > Tops & T-Shirts > T-Shirts or Electronics > Components > RAM',
    },
    brand: {
      type: 'STRING',
      description: 'Detected or verified brand name. If unbranded or vintage without tag, specify "Vintage" or "Unbranded"',
    },
    size: {
      type: 'STRING',
      description: 'Normalized size or version, e.g. "M / 38", "L", "42 EU", "32GB (2x16GB)"',
    },
    condition: {
      type: 'STRING',
      enum: ['new_with_tags', 'new_without_tags', 'very_good', 'good', 'satisfactory'],
      description: 'Standard secondhand item condition category',
    },
    color: {
      type: 'STRING',
      description: 'Primary and secondary colors, e.g. "Black", "Navy Blue", "Olive Green", "Multicolor"',
    },
    material: {
      type: 'STRING',
      description: 'Primary material composition, e.g. "100% Cotton", "Aluminum / PCB", "Wool Blend"',
    },
    price: {
      type: 'OBJECT',
      properties: {
        suggested: { type: 'NUMBER', description: 'Realistic recommended listing price in EUR based on exact specs, capacity, and secondary market demand' },
        min: { type: 'NUMBER', description: 'Floor price for bargain offers and quick counter-offers' },
        max: { type: 'NUMBER', description: 'Ceiling price for patient sellers and pristine condition' },
        currency: { type: 'STRING', description: 'Currency code, usually EUR' },
        reasoning: { type: 'STRING', description: 'Detailed factual rationale citing detected specs, capacity, and active secondhand market valuation' },
      },
      required: ['suggested', 'min', 'max', 'currency', 'reasoning'],
    },
    hashtags: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Array of 10-15 English search hashtags starting with # covering brand, line, specs, and category keywords (always in English regardless of target output language)',
    },
    flaws: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'List of any noted flaws, marks, wear or imperfections',
    },
    fitNotes: {
      type: 'STRING',
      description: 'Advice regarding fit or compatibility (e.g. "Fits true to size" or "DDR4 desktop motherboard compatible")',
    },
    confidence: {
      type: 'NUMBER',
      description: 'Self-assessed confidence score between 0.0 and 1.0',
    },
  },
  required: [
    'title',
    'description',
    'category',
    'brand',
    'size',
    'condition',
    'color',
    'material',
    'price',
    'hashtags',
    'flaws',
    'fitNotes',
    'confidence',
  ],
};

/**
 * Backward compatibility alias for STRUCTURED_RESPONSE_SCHEMA.
 */
export const GEMINI_RESPONSE_SCHEMA = STRUCTURED_RESPONSE_SCHEMA;
