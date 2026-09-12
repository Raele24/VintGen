# Adding Custom AI Providers (OpenAI, Claude, Ollama)

VintStack was engineered with strict provider decoupling. Adding support for another AI model requires **zero changes** to the web application UI or CLI commands.

---

## 1. The `AIProvider` Interface

All providers implement the `AIProvider` interface located in `@vintstack/core`:

```typescript
import { AIProvider, ListingInput, ListingResult, ProviderConfig } from '@vintstack/core';

export class OllamaProvider implements AIProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama Local (BYOK)';

  public async generateListing(input: ListingInput, config: ProviderConfig): Promise<ListingResult> {
    const endpoint = config.baseUrl || 'http://localhost:11434/api/generate';
    const model = config.model || 'llava:latest';

    // 1. Prepare base64 images and prompt
    // 2. Post to Ollama HTTP API
    // 3. Return normalized ListingResult object
  }

  public async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    // Ping Ollama /api/tags
    return { success: true, message: 'Ollama reachable locally' };
  }
}
```

---

## 2. Registering with `ProviderRegistry`

To make the provider available system-wide:

```typescript
import { ProviderRegistry } from '@vintstack/core';
import { OllamaProvider } from './ollama.provider';

// Register instance
ProviderRegistry.getInstance().register(new OllamaProvider());
```

Once registered, users can specify `--provider ollama` in the CLI or select it from the web dropdown.
