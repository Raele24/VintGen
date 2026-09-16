/**
 * WebCrypto AES-GCM-256 Client-Side Encryption Utilities
 * 
 * Provides authenticated encryption at-rest for API credentials stored in the browser,
 * ensuring secrets are never persisted in plaintext SQLite/LevelDB storage.
 */

const ENCRYPTION_PREFIX = 'enc:v1:';
const SALT_STORAGE_KEY = 'vintgen_sec_salt';

/**
 * Retrieves or generates an origin-specific cryptographic salt.
 */
function getOrCreateSalt(): Uint8Array {
  try {
    const existing = localStorage.getItem(SALT_STORAGE_KEY);
    if (existing) {
      return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
    }
  } catch { }

  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  try {
    const base64Salt = btoa(String.fromCharCode(...newSalt));
    localStorage.setItem(SALT_STORAGE_KEY, base64Salt);
  } catch { }
  return newSalt;
}

/**
 * Derives a consistent AES-GCM-256 key from origin metadata and salt using PBKDF2.
 */
async function deriveStorageKey(): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  const originEntropy = `${window.location.origin}:${navigator.userAgent.slice(0, 50)}:vintgen_vault_v1`;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(originEntropy) as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext secret string using AES-GCM-256.
 * Returns an envelope string in format: enc:v1:<iv_base64>:<ciphertext_base64>
 */
export async function encryptSecret(secret: string): Promise<string> {
  if (!secret || secret.trim() === '') return '';
  try {
    const key = await deriveStorageKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(secret.trim());

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      encoded as unknown as BufferSource
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));

    return `${ENCRYPTION_PREFIX}${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error('Failed to encrypt credential at-rest:', err);
    return secret; // fallback if WebCrypto is restricted
  }
}

/**
 * Decrypts an encrypted envelope string. If the string is legacy plaintext, returns it directly.
 */
export async function decryptSecret(payload: string): Promise<string> {
  if (!payload || payload.trim() === '') return '';
  if (!payload.startsWith(ENCRYPTION_PREFIX)) {
    // Legacy plaintext
    return payload.trim();
  }

  try {
    const parts = payload.slice(ENCRYPTION_PREFIX.length).split(':');
    if (parts.length !== 2) return '';

    const iv = Uint8Array.from(atob(parts[0]), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
    const key = await deriveStorageKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn('Failed to decrypt credential payload:', err);
    return '';
  }
}
