/**
 * Universal Marketplace Platform Adapter
 * 
 * Provides a clean, standardized listing format suitable across all online secondhand channels.
 */

import { FormattedListing, ListingResult, ItemCondition } from '../types';
import { PlatformAdapter } from './platform.interface';

export class UniversalPlatform implements PlatformAdapter {
  public readonly id = 'universal';
  public readonly name = 'Universal Marketplace';
  public readonly shortLabel = 'Universal';
  public readonly description = 'Standardized, clean secondhand listing suitable for any platform.';

  public static readonly CONDITION_LABELS: Record<ItemCondition, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New without tags',
    very_good: 'Very good',
    good: 'Good',
    satisfactory: 'Satisfactory',
  };

  public format(result: ListingResult): FormattedListing {
    return UniversalPlatform.format(result);
  }

  public static format(result: ListingResult): FormattedListing {
    const conditionLabel =
      UniversalPlatform.CONDITION_LABELS[result.condition] || result.condition;

    let cleanDescription = (result.description || '').trim();
    cleanDescription = cleanDescription.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    const descriptionLines: string[] = [cleanDescription];

    if (result.flaws && result.flaws.length > 0) {
      for (const flaw of result.flaws) {
        const clean = flaw.trim().replace(/^[-*]\s*/, '');
        descriptionLines.push('- ' + clean);
      }
    }

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
      `| **Market Search Links** | [eBay Live Search](${ebayLink})<br>[Vinted Live Search](${vintedLink})<br>[Subito Live Search](${subitoLink}) |`,
      `| **Price** | EUR ${priceString}${result.price?.min != null ? ` (Floor: EUR ${result.price.min.toFixed(2)})` : ''} |`,
      `| **Description** | ${fullDescription.replace(/\n+/g, '<br>')} |`,
      `| **Hashtags** | ${tagsText} |`,
    ].join('\n');

    const minStr = result.price?.min != null ? `Min: EUR ${result.price.min.toFixed(2)}` : '';
    const maxStr = result.price?.max != null ? `Max: EUR ${result.price.max.toFixed(2)}` : '';
    const priceRange = [minStr, maxStr].filter(Boolean).join(' - ');

    const fullBundle = [
      `=== MARKETPLACE LISTING: ${result.title} ===`,
      `TITLE: ${result.title}`,
      `PRICE: EUR ${priceString}${priceRange ? ` (${priceRange})` : ''}`,
      `BRAND: ${result.brand}`,
      `SIZE: ${result.size}`,
      `CONDITION: ${conditionLabel}`,
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
