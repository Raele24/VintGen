# Adding Custom AI Providers

VintGen is engineered with strict provider decoupling. Adding support for another AI provider requires zero changes to the web application UI or CLI command signatures.

---

## 1. Built-in Implemented Providers

The core engine (`@vintgen/core`) comes with four production providers already implemented:

| Provider ID | Provider Class | Default Model | Network Type |
| :--- | :--- | :--- | :--- |
| `gemini` | `GeminiProvider` | `gemini-2.5-flash` | Cloud BYOK (Google AI Studio) |
| `openai` | `OpenAIProvider` | `gpt-4o-mini` | Cloud BYOK (OpenAI Platform) |
| `claude` | `ClaudeProvider` | `claude-3-5-sonnet` | Cloud BYOK (Anthropic Console) |
| `ollama` | `OllamaProvider` | `llama3.2-vision` | Local Offline (No API key) |

All built-in providers are located in `packages/core/src/providers/`.

---

## 2. The `AIProvider` Interface

All providers implement the `AIProvider` interface defined in `@vintgen/core`:

```typescript
import { AIProvider, ListingInput, ListingResult, ProviderConfig } from '@vintgen/core';

export class CustomProvider implements AIProvider {
  public readonly id = 'custom-provider';
  public readonly name = 'Custom AI Provider';

  public async generateListing(input: ListingInput, config: ProviderConfig): Promise<ListingResult> {
    const endpoint = config.baseUrl || 'https://api.example.com/v1/chat/completions';
    const model = config.model || 'default-vision-model';

    // 1. Prepare base64 images and system instructions from input
    // 2. Transmit request to provider endpoint
    // 3. Parse and return normalized ListingResult object
  }

  public async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    // Validate credentials or check service availability
    return { success: true, message: 'Provider connection verified' };
  }
}
```

---

## 3. Registering with `ProviderRegistry`

To make a custom provider available to the orchestrator:

```typescript
import { ProviderRegistry } from '@vintgen/core';
import { CustomProvider } from './custom.provider';

// Register instance
ProviderRegistry.getInstance().register(new CustomProvider());
```

Once registered, users can pass `--provider custom-provider` in the CLI or select it from the provider list in the web studio interface.
