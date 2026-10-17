import { argon2id } from 'hash-wasm';
import { KdfParameters } from './cryptoTypes';

// Standard secure Argon2id parameters
export const DEFAULT_ARGON2ID_PARAMS: Omit<KdfParameters, 'salt'> = {
  algorithm: 'argon2id',
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 1,
  hashLength: 32, // 256-bit key
};

// Fast profile for test suites or low-spec devices
export const FAST_TEST_ARGON2ID_PARAMS: Omit<KdfParameters, 'salt'> = {
  algorithm: 'argon2id',
  memoryCost: 16384, // 16 MB
  timeCost: 1,
  parallelism: 1,
  hashLength: 32,
};

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandomBytes(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node environment fallback if needed
    const nodeCrypto = (globalThis as any).crypto;
    if (nodeCrypto?.getRandomValues) {
      nodeCrypto.getRandomValues(bytes);
    } else {
      throw new Error('No cryptographically secure random number generator available');
    }
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive 256-bit raw key from passphrase using Argon2id
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  kdfParams?: Partial<KdfParameters>
): Promise<{ rawKey: Uint8Array; kdf: KdfParameters }> {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase must be a non-empty string');
  }

  const saltBytes = kdfParams?.salt
    ? base64ToUint8Array(kdfParams.salt)
    : generateSecureRandomBytes(16);

  const memoryCost = kdfParams?.memoryCost ?? DEFAULT_ARGON2ID_PARAMS.memoryCost;
  const timeCost = kdfParams?.timeCost ?? DEFAULT_ARGON2ID_PARAMS.timeCost;
  const parallelism = kdfParams?.parallelism ?? DEFAULT_ARGON2ID_PARAMS.parallelism;
  const hashLength = kdfParams?.hashLength ?? DEFAULT_ARGON2ID_PARAMS.hashLength;

  const rawKey = await argon2id({
    password: passphrase,
    salt: saltBytes,
    parallelism,
    iterations: timeCost,
    memorySize: memoryCost,
    hashLength,
    outputType: 'binary',
  });

  const completeKdf: KdfParameters = {
    algorithm: 'argon2id',
    memoryCost,
    timeCost,
    parallelism,
    salt: uint8ArrayToBase64(saltBytes),
    hashLength,
  };

  return { rawKey, kdf: completeKdf };
}
