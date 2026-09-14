/**
 * Depop Platform Adapter
 * 
 * Formats listings optimized for Depop search with style aesthetic keywords,
 * fit measurements, and an enforced 5-hashtag limit.
 */

import { FormattedListing, ListingResult, ItemCondition } from '../types';
import { PlatformAdapter } from './platform.interface';

export class DepopPlatform implements PlatformAdapter {
  public readonly id = 'depop';
  public readonly name = 'Depop';
  public readonly shortLabel = 'Depop';
  public readonly description = 'Aesthetic-driven format with condition summary and maximum 5 search hashtags.';
  public readonly maxTagsCount = 5;

  public static readonly CONDITION_MAP: Record<ItemCondition, string> = {
    new_with_tags: 'Brand new with tags',
    new_without_tags: 'Brand new, never worn',
    very_good: 'Excellent vintage/preloved condition',
    good: 'Good vintage/preloved condition',
    satisfactory: 'Worn with character',
  };

  public format(result: ListingResult): FormattedListing {
    return DepopPlatform.format(result);
  }

  public static format(result: ListingResult): FormattedListing {
    const conditionText = DepopPlatform.CONDITION_MAP[result.condition] || result.condition;

    let body = (result.description || '').trim();
    body = body.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    const sections: string[] = [body];
    sections.push('');

    sections.push(`Size: ${result.size}`);
    sections.push(`Brand: ${result.brand}`);
    if (result.color) sections.push(`Color: ${result.color}`);
    if (result.material) sections.push(`Fabric: ${result.material}`);
    sections.push(`Condition: ${conditionText}`);
    if (result.fitNotes) sections.push(`Fit: ${result.fitNotes}`);

    if (result.flaws && result.flaws.length > 0) {
      sections.push('');
      sections.push('Imperfections:');
      for (const flaw of result.flaws) {
        sections.push('- ' + flaw.trim().replace(/^[-*]\s*/, ''));
      }
    }

    sections.push('');
    sections.push('Instant buy is ON. Worldwide / tracked shipping available. Message for bundle deals.');

    const rawTags = (result.hashtags || [])
      .map(t => t.startsWith('#') ? t : ('#' + t))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    const tagsText = rawTags.join(' ');
    if (tagsText) {
      sections.push('');
      sections.push(tagsText);
    }

    const description = sections.join('\n');
    const priceString = result.price.suggested.toFixed(2);

    const fullBundle = [
      `=== DEPOP LISTING ===`,
      `TITLE: ${result.title}`,
      `PRICE: EUR ${priceString}`,
      '',
      `=== DESCRIPTION & TAGS ===`,
      description,
    ].join('\n');

    return {
      title: result.title,
      description,
      tagsText,
      priceString,
      fullBundleText: fullBundle,
      tableMarkdown: '',
    };
  }
}
