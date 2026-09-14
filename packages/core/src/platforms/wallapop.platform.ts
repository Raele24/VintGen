/**
 * Wallapop Platform Adapter
 * 
 * Formats listings for direct resale with punchy item specs and shipping notice.
 */

import { FormattedListing, ListingResult, ItemCondition } from '../types';
import { PlatformAdapter } from './platform.interface';

export class WallapopPlatform implements PlatformAdapter {
  public readonly id = 'wallapop';
  public readonly name = 'Wallapop';
  public readonly shortLabel = 'Wallapop';
  public readonly description = 'Direct resale format with condition, handover notes, and buyer protection compliance.';

  public static readonly CONDITION_MAP: Record<ItemCondition, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New without tags',
    very_good: 'Very good condition',
    good: 'Good condition',
    satisfactory: 'Fair condition',
  };

  public format(result: ListingResult): FormattedListing {
    return WallapopPlatform.format(result);
  }

  public static format(result: ListingResult): FormattedListing {
    const conditionText = WallapopPlatform.CONDITION_MAP[result.condition] || result.condition;

    let body = (result.description || '').trim();
    body = body.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    const sections: string[] = [body];
    sections.push('');

    sections.push(`Brand: ${result.brand}`);
    if (result.size) sections.push(`Size: ${result.size}`);
    if (result.color) sections.push(`Color: ${result.color}`);
    if (result.material) sections.push(`Material: ${result.material}`);
    sections.push(`Condition: ${conditionText}`);

    if (result.flaws && result.flaws.length > 0) {
      sections.push('');
      sections.push('Flaws / Details:');
      for (const flaw of result.flaws) {
        sections.push('- ' + flaw.trim().replace(/^[-*]\s*/, ''));
      }
    }

    sections.push('');
    sections.push('Shipping available via Wallapop Shipping or in-person pickup. Fast reply to offers.');

    const tagsText = (result.hashtags || []).map(t => t.startsWith('#') ? t : ('#' + t)).join(' ').trim();
    if (tagsText) {
      sections.push('');
      sections.push(tagsText);
    }

    const description = sections.join('\n');
    const priceString = result.price.suggested.toFixed(2);

    const fullBundle = [
      `=== WALLAPOP LISTING ===`,
      `TITLE: ${result.title}`,
      `PRICE: EUR ${priceString}`,
      '',
      `=== DESCRIPTION ===`,
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
