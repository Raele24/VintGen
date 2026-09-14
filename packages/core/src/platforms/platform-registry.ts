/**
 * Platform Adapter Registry
 * 
 * Manages marketplace-specific formatters and provides unified formatting methods.
 */

import { FormattedListing, ListingResult } from '../types';
import { PlatformAdapter, PlatformId } from './platform.interface';
import { UniversalPlatform } from './universal.platform';
import { VintedPlatform } from './vinted.platform';
import { EbayPlatform } from './ebay.platform';
import { DepopPlatform } from './depop.platform';
import { SubitoPlatform } from './subito.platform';
import { WallapopPlatform } from './wallapop.platform';

export class PlatformRegistry {
  private static instance: PlatformRegistry;
  private adapters = new Map<PlatformId, PlatformAdapter>();

  private constructor() {
    this.register(new UniversalPlatform());
    this.register(new VintedPlatform());
    this.register(new EbayPlatform());
    this.register(new DepopPlatform());
    this.register(new SubitoPlatform());
    this.register(new WallapopPlatform());
  }

  public static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry();
    }
    return PlatformRegistry.instance;
  }

  public register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: PlatformId | string): PlatformAdapter {
    const normalized = (id || 'universal').toLowerCase() as PlatformId;
    return this.adapters.get(normalized) || this.adapters.get('universal')!;
  }

  public getAll(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  public format(result: ListingResult, platformId?: PlatformId | string): FormattedListing {
    const adapter = this.get(platformId || 'universal');
    return adapter.format(result);
  }
}
