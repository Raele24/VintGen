/**
 * WebCrypto AES-GCM-256 Client-Side Encryption Utilities
 *
 * Delegated to openbyok WebCryptoVaultAdapter.
 * Fixes legacy userAgent key derivation instability while maintaining transparent backward compatibility.
 */

import { WebCryptoVaultAdapter } from 'openbyok';

export const vintgenWebCryptoVault = new WebCryptoVaultAdapter({
  storagePrefix: 'vintgen_',
  saltStorageKey: 'vintgen_sec_salt',
  passphrase: 'vintgen_vault_v1',
  legacyKeyMap: {
    gemini: 'vintgen_gemini_api_key',
    openai: 'vintgen_openai_api_key',
    claude: 'vintgen_claude_api_key',
    ollama: 'vintgen_ollama_api_key',
  },
});

export async function encryptSecret(secret: string): Promise<string> {
  return vintgenWebCryptoVault.encryptSecret(secret);
}

export async function decryptSecret(payload: string): Promise<string> {
  return vintgenWebCryptoVault.decryptSecret(payload);
}
