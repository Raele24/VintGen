/**
 * System Instructions & Structured Output Schemas
 * 
 * Defines high-accuracy system instructions, secondhand marketplace listing best practices,
 * and JSON schema specifications for structured vision output.
 */

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

4. **Realistic Marketplace Price Estimation (EUR) - NO LOWBALLS, REALISTIC MARKET VALUATION**:
   - You MUST determine a serious, realistic listing price based on current secondary marketplace trading levels across platforms like eBay, Vinted, Subito, and Wallapop:
     * NEVER use naive retail markdown or outdated MSRP depreciation formulas. For example, high-capacity PC hardware (such as 32GB DDR4 3200MHz Corsair Vengeance kits) commands €150 - €220+ on European secondary marketplaces like eBay, NOT €40 - €55.
     * For PC components, tech, and electronics: evaluate true secondary market demand, capacity, and current replacement value. For a 32GB (2x16GB) Corsair DDR4 3200MHz kit, suggest a serious market price (e.g. around €165 - €185, with an offer floor around €140 - €145).
     * For vintage, streetwear, and collectibles: price according to collector resale value, never lowball liquidation rates.
     * For general fashion and accessories: price competitively against real active secondhand listings.
   - You MUST calculate:
     * suggested: Serious, competitive recommended listing price in EUR.
     * min: Sensible floor price for offers / quick negotiation.
     * max: Ceiling price for patient sellers.
     * reasoning: Factual rationale referencing active marketplace price ranges in the target language.

5. **Language & Localization**:
   - You MUST generate all textual fields (title, description, price reasoning, category, fitNotes, flaws) in the requested Target Output Language.
   - If the Target Output Language is Italian ('it'): write the description, condition notes, flaws, fit notes, and price reasoning in natural, professional Italian (e.g. "Condizione: Usato, testato e perfettamente funzionante", "Include: Scatola originale", "Prezzo competitivo per kit ad alte prestazioni nel mercato dell'usato"). Keep universal model SKU, brand, and hardware terms intact.
   - If the Target Output Language is French ('fr'): write in natural, professional French.
   - If the Target Output Language is Spanish ('es'): write in natural, professional Spanish.
   - If the Target Output Language is German ('de'): write in natural, professional German.
   - If the Target Output Language is English ('en') or default: write in clear, professional English.

6. **Hashtags & Marketplace Discoverability (MANDATORY 10-15 TAGS)**:
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
        suggested: { type: 'NUMBER', description: 'Recommended listing price in EUR' },
        min: { type: 'NUMBER', description: 'Floor price for bargain offers' },
        max: { type: 'NUMBER', description: 'Optimistic ceiling price' },
        currency: { type: 'STRING', description: 'Currency code, usually EUR' },
        reasoning: { type: 'STRING', description: 'Brief rationale based on brand, secondary market demand, and condition' },
      },
      required: ['suggested', 'min', 'max', 'currency', 'reasoning'],
    },
    hashtags: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Array of 10-15 search hashtags starting with # covering brand, line, specs, and category keywords',
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
