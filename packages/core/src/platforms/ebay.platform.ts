/**
 * eBay Platform Adapter
 * 
 * Formats listings strictly tailored to eBay requirements, including
 * an 80-character maximum title and structured Item Specifics.
 */

import { FormattedListing, ListingResult, ItemCondition } from '../types';
import { PlatformAdapter } from './platform.interface';

export class EbayPlatform implements PlatformAdapter {
  public readonly id = 'ebay';
  public readonly name = 'eBay';
  public readonly shortLabel = 'eBay';
  public readonly description = 'Structured listing with 80-character title limit, item specifics, and seller terms.';
  public readonly maxTitleLength = 80;

  public static readonly CONDITION_MAP: Record<ItemCondition, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New without tags',
    very_good: 'Pre-owned - Excellent',
    good: 'Pre-owned - Good',
    satisfactory: 'Pre-owned - Fair',
  };

  public format(result: ListingResult): FormattedListing {
    return EbayPlatform.format(result);
  }

  public static format(result: ListingResult): FormattedListing {
    const conditionText = EbayPlatform.CONDITION_MAP[result.condition] || result.condition;

    let title = `${result.brand} ${result.title}`.trim();
    if (result.size && !title.toLowerCase().includes(result.size.toLowerCase())) {
      title = `${title} ${result.size}`.trim();
    }
    if (title.length > 80) {
      title = title.slice(0, 80).trim();
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 50) {
        title = title.slice(0, lastSpace).trim();
      }
    }

    let body = (result.description || '').trim();
    body = body.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    const sections: string[] = [];
    sections.push(body);
    sections.push('');

    sections.push('ITEM SPECIFICS:');
    sections.push(`- Brand: ${result.brand}`);
    if (result.size) sections.push(`- Size: ${result.size}`);
    if (result.color) sections.push(`- Color: ${result.color}`);
    if (result.material) sections.push(`- Material: ${result.material}`);
    sections.push(`- Condition: ${conditionText}`);
    sections.push(`- Category: ${result.category}`);
    if (result.fitNotes) sections.push(`- Fit Details: ${result.fitNotes}`);

    if (result.flaws && result.flaws.length > 0) {
      sections.push('');
      sections.push('CONDITION REPORT:');
      for (const flaw of result.flaws) {
        sections.push('- ' + flaw.trim().replace(/^[-*]\s*/, ''));
      }
    }

    sections.push('');
    sections.push('SHIPPING & HANDLING:');
    sections.push('- Item will be carefully packaged and dispatched within 1-2 business days.');
    sections.push('- Tracking number provided upon dispatch.');
    sections.push('- Please inspect photographs thoroughly prior to purchase.');

    const description = sections.join('\n');
    const priceString = result.price.suggested.toFixed(2);

    const fullBundle = [
      `=== EBAY LISTING ===`,
      `TITLE (${title.length}/80): ${title}`,
      `STARTING / BUY-IT-NOW PRICE: EUR ${priceString}`,
      `FLOOR PRICE: EUR ${result.price.min.toFixed(2)}`,
      `CONDITION: ${conditionText}`,
      '',
      `=== ITEM SPECIFICS & DESCRIPTION ===`,
      description,
    ].join('\n');

    return {
      title,
      description,
      tagsText: '',
      priceString,
      fullBundleText: fullBundle,
      tableMarkdown: '',
    };
  }
}
