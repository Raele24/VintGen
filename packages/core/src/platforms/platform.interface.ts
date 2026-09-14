/**
 * Platform Adapter Interface and Types
 * 
 * Defines the contract for marketplace-specific listing formatters.
 */

import { FormattedListing, ListingResult } from '../types';

export type PlatformId =
  | 'universal'
  | 'vinted'
  | 'ebay'
  | 'depop'
  | 'subito'
  | 'wallapop';

export interface PlatformMetadata {
  id: PlatformId;
  name: string;
  shortLabel: string;
  description: string;
  maxTitleLength?: number;
  maxTagsCount?: number;
}

export interface PlatformAdapter extends PlatformMetadata {
  /**
   * Formats the normalized listing result for the target marketplace.
   */
  format(result: ListingResult): FormattedListing;
}
