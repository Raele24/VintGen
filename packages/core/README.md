# @vintgen/core

Shared engine, multi-provider AI schemas, and platform adapters for VintGen.

## Features

- **Provider Agnostic**: Unified interface for Google Gemini, OpenAI, Anthropic Claude, and local Ollama.
- **Dynamic Model Discovery**: Zero hardcoded model versions in source code. Queries provider model endpoints dynamically at runtime, prioritizing the latest stable multimodal engines.
- **Multi-Candidate Resilient Failover**: If an upstream model encounters temporary server overload (HTTP 503) or rate limits, the engine automatically fails over to the next candidate model in the pool.
- **Working Engine Persistence**: Remembers the confirmed working model across calls and browser sessions, eliminating redundant discovery delays on subsequent requests.
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