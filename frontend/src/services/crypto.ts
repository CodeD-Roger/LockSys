/**
 * Client-side cryptography using the browser's native Web Crypto API.
 * The master password and derived key NEVER leave the browser.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a 256-bit AES-GCM key from the master password using PBKDF2.
 * @param password  Master password (plaintext, never leaves client)
 * @param saltBase64  Per-user salt from the server (base64)
 */
export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = base64ToBytes(saltBase64);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 300_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns separate base64 strings for ciphertext and IV.
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey,
): Promise<{ encrypted: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );

  return {
    encrypted: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypt a base64 ciphertext with AES-256-GCM.
 * Throws if the key is wrong or the ciphertext is corrupt.
 */
export async function decryptData(
  encryptedBase64: string,
  ivBase64: string,
  key: CryptoKey,
): Promise<string> {
  const ciphertext = base64ToBytes(encryptedBase64);
  const iv = base64ToBytes(ivBase64);
  const dec = new TextDecoder();

  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return dec.decode(plaintext);
}
