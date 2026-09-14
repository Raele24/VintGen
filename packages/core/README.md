# @vintgen/core

Shared engine, multi-provider AI schemas, and platform adapters for VintGen.

## Features

- **Provider Agnostic**: Unified interface for Google Gemini, OpenAI, Anthropic Claude, and local Ollama.
- **Platform Adapters**: Marketplace-specific formatters for Universal, Vinted, eBay, Depop, Subito, and Wallapop.
- **PlatformRegistry**: Query and format listings for any target marketplace synchronously.

## Usage

```typescript
import { VintGenEngine, PlatformRegistry } from '@vintgen/core';

const engine = new VintGenEngine();

// Generate listing
const { raw, formatted } = await engine.generate(
  { images: [...], notes: 'Silk blouse size S' },
  { apiKey: '...', providerId: 'gemini', platformId: 'ebay' }
);

// Format for a different platform on the fly
const registry = PlatformRegistry.getInstance();
const depopListing = registry.format(raw, 'depop');
console.log(depopListing.title, depopListing.description);
```