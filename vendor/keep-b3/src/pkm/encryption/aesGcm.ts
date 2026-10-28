import { uint8ArrayToBase64, base64ToUint8Array, generateSecureRandomBytes } from './kdf';

export class TamperDetectedError extends Error {
  constructor(message = 'Ciphertext authentication failed. Data may be corrupted or tampered with.') {
    super(message);
    this.name = 'TamperDetectedError';
  }
}

export class DecryptionError extends Error {
  constructor(message = 'Decryption failed. Incorrect passphrase or invalid key.') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Import a 256-bit raw byte array as a CryptoKey for AES-GCM
 */
export async function importRawKeyAsCryptoKey(
  rawKeyBytes: Uint8Array,
  extractable = false
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a new random 256-bit Vault Encryption Key (VEK)
 */
export async function generateVaultKey(): Promise<{ rawKey: Uint8Array; cryptoKey: CryptoKey }> {
  const rawKey = generateSecureRandomBytes(32);
  const cryptoKey = await importRawKeyAsCryptoKey(rawKey, true);
  return { rawKey, cryptoKey };
}

/**
 * Authenticated encryption of plaintext string or bytes with AES-256-GCM
 */
export async function encryptAesGcm(
  key: CryptoKey,
  plaintext: string | Uint8Array,
  additionalData?: Uint8Array
): Promise<{ ciphertext: string; iv: string; tagLength: number }> {
  const subtle = getSubtleCrypto();
  // Fresh 12-byte cryptographically secure random nonce
  const iv = generateSecureRandomBytes(12);

  const dataBytes =
    typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv,
    tagLength: 128,
    ...(additionalData ? { additionalData } : {}),
  };

  const encryptedBuffer = await subtle.encrypt(algorithm, key, dataBytes);
  const ciphertextBytes = new Uint8Array(encryptedBuffer);

  return {
    ciphertext: uint8ArrayToBase64(ciphertextBytes),
    iv: uint8ArrayToBase64(iv),
    tagLength: 128,
  };
}

/**
 * Authenticated decryption of AES-256-GCM ciphertext
 * Throws TamperDetectedError / DecryptionError if authentication tag verification fails.
 */
export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const ciphertextBytes = base64ToUint8Array(ciphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv,
    tagLength: 128,
    ...(additionalData ? { additionalData } : {}),
  };

  try {
    const decryptedBuffer = await subtle.decrypt(algorithm, key, ciphertextBytes);
    return new Uint8Array(decryptedBuffer);
  } catch (err: any) {
    // Web Crypto API throws OperationError when tag verification fails
    if (err?.name === 'OperationError' || err?.message?.includes('operation failed')) {
      throw new TamperDetectedError('AES-GCM authentication failed: data corrupted or incorrect key.');
    }
    throw new DecryptionError(`Decryption failed: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Authenticated decryption to UTF-8 text string
 */
export async function decryptAesGcmToText(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
  additionalData?: Uint8Array
): Promise<string> {
  const decryptedBytes = await decryptAesGcm(key, ciphertextBase64, ivBase64, additionalData);
  return new TextDecoder().decode(decryptedBytes);
}

/**
 * Wrap (encrypt) a child key (e.g. Vault Key) using a parent key (KEK from master password)
 */
export async function wrapKeyAesGcm(
  kek: CryptoKey,
  keyToWrap: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const subtle = getSubtleCrypto();
  const iv = generateSecureRandomBytes(12);

  const wrappedBuffer = await subtle.wrapKey(
    'raw',
    keyToWrap,
    kek,
    { name: 'AES-GCM', iv, tagLength: 128 }
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
    iv: uint8ArrayToBase64(iv),
  };
}

/**
 * Unwrap (decrypt) a child key using a parent key (KEK)
 */
export async function unwrapKeyAesGcm(
  kek: CryptoKey,
  wrappedCiphertextBase64: string,
  ivBase64: string
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const wrappedBytes = base64ToUint8Array(wrappedCiphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  try {
    return await subtle.unwrapKey(
      'raw',
      wrappedBytes,
      kek,
      { name: 'AES-GCM', iv, tagLength: 128 },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  } catch (err: any) {
    if (err?.name === 'OperationError' || err?.message?.includes('operation failed')) {
      throw new TamperDetectedError('Key unwrapping failed: master passphrase incorrect or key corrupted.');
    }
    throw new DecryptionError(`Key unwrapping failed: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Compute SHA-256 hash of text/bytes
 */
export async function computeSha256Hex(data: string | Uint8Array): Promise<string> {
  const subtle = getSubtleCrypto();
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  const nodeCrypto = (globalThis as any).crypto;
  if (nodeCrypto?.subtle) {
    return nodeCrypto.subtle;
  }
  throw new Error('Web Crypto API (SubtleCrypto) is not available in this environment');
}
