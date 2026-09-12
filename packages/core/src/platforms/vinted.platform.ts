/**
 * Vinted Platform Adapter
 * 
 * Tailors the normalized listing output into optimized formats for direct copy-pasting
 * into the Vinted mobile app and web interface.
 */

import { FormattedListing, ListingResult, VintedCondition } from '../types';

export class VintedPlatform {
  /**
   * Human-friendly label mapping for Vinted condition states.
   */
  public static readonly CONDITION_LABELS: Record<VintedCondition, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New without tags',
    very_good: 'Very good',
    good: 'Good',
    satisfactory: 'Satisfactory',
  };

  /**
   * Formats the listing result for Vinted.
   */
  public static format(result: ListingResult): FormattedListing {
    const conditionLabel =
      VintedPlatform.CONDITION_LABELS[result.condition] || result.condition;

    // Strip any trailing hashtags from raw description to prevent duplication
    let cleanDescription = (result.description || '').trim();
    cleanDescription = cleanDescription.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    // Build structured clean description - STRICTLY ZERO EMOJIS, ZERO MARKETING SLOP
    const descriptionLines: string[] = [cleanDescription];

    if (result.flaws && result.flaws.length > 0) {
      for (const flaw of result.flaws) {
        descriptionLines.push('- Flaw: ' + flaw);
      }
    }

    // Clean hashtags
    const tagsText = (result.hashtags || []).map(t => t.startsWith('#') ? t : ('#' + t)).join(' ').trim();
    if (tagsText) {
      descriptionLines.push('');
      descriptionLines.push(tagsText);
    }

    const fullDescription = descriptionLines.join('\n');
    const priceString = result.price.suggested.toFixed(2);

    const encodedSearch = encodeURIComponent(`${result.brand} ${result.title}`.trim());
    const ebayLink = `https://www.ebay.it/sch/i.html?_nkw=${encodedSearch}`;
    const vintedLink = `https://www.vinted.it/catalog?search_text=${encodedSearch}`;
    const subitoLink = `https://www.subito.it/annunci-italia/vendita/usato/?q=${encodedSearch}`;

    // Single Clean Markdown Table Representation (Effortless 1-click copy)
    const tableMarkdown = [
      '| Field | Detail |',
      '| :--- | :--- |',
      `| **Title** | ${result.title} |`,
      `| **Brand** | ${result.brand} |`,
      `| **Size / Version** | ${result.size} |`,
      `| **Condition** | ${conditionLabel} |`,
      `| **Category** | ${result.category} |`,
      ...(result.material ? [`| **Material** | ${result.material} |`] : []),
      ...(result.color ? [`| **Color** | ${result.color} |`] : []),
      `| **Market Search Links** | • [eBay Live Search](${ebayLink})<br>• [Vinted Live Search](${vintedLink})<br>• [Subito Live Search](${subitoLink}) |`,
      `| **Price** | €${priceString}${result.price?.min != null ? ` (Floor: €${result.price.min.toFixed(2)})` : ''} |`,
      `| **Description** | ${fullDescription.replace(/\n+/g, '<br>')} |`,
      `| **Hashtags** | ${tagsText} |`,
    ].join('\n');

    // Master bundle representation
    const minStr = result.price?.min != null ? `Min: €${result.price.min.toFixed(2)}` : '';
    const maxStr = result.price?.max != null ? `Max: €${result.price.max.toFixed(2)}` : '';
    const priceRange = [minStr, maxStr].filter(Boolean).join(' - ');

    const fullBundle = [
      `=== MARKETPLACE LISTING: ${result.title} ===`,
      `TITLE: ${result.title}`,
      `PRICE: €${priceString}${priceRange ? ` (${priceRange})` : ''}`,
      `BRAND: ${result.brand}`,
      `SIZE: ${result.size}`,
      `CONDITION: ${result.condition}`,
      `CATEGORY: ${result.category}`,
      '',
      '=== DESCRIPTION ===',
      fullDescription,
    ].join('\n');

    return {
      title: result.title,
      description: fullDescription,
      tagsText,
      priceString,
      fullBundleText: fullBundle,
      tableMarkdown,
    };
  }
}
