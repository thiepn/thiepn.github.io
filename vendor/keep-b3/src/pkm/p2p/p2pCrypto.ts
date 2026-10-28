/**
 * Phase P32: Web Crypto Primitives for P2P Pairing, SAS, and Session Encryption
 * Uses standard Web Crypto API (SubtleCrypto) without third-party crypto dependencies.
 */

// Word dictionary for 4-word mnemonic Short Authentication String (SAS)
const SAS_WORDLIST = [
  'ALFA', 'BRAVO', 'COBALT', 'DELTA', 'ECHO', 'FOREST', 'GALAXY', 'HARBOR',
  'ISLAND', 'JADE', 'KINETIC', 'LUMEN', 'METEOR', 'NEXUS', 'OCEAN', 'POLAR',
  'QUANTUM', 'RIVER', 'SOLAR', 'TITAN', 'URBAN', 'VECTOR', 'WAVE', 'ZENITH',
  'AMBER', 'AURORA', 'CEDAR', 'CORAL', 'EMBER', 'FLINT', 'GLACIER', 'HORIZON',
  'INDIGO', 'JUNIPER', 'LAGOON', 'MARBLE', 'NEBULA', 'ORBIT', 'PEBBLE', 'QUARTZ',
  'RADIANT', 'SIERRA', 'TIMBER', 'VALLEY', 'WILLOW', 'ZEPHYR', 'SUMMIT', 'CANYON'
];

export interface P2PEphemeralKeyPair {
  keyPair: CryptoKeyPair;
  publicKeyBase64: string;
}

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as Crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  throw new Error('Web Crypto API is not available in current environment');
}

/**
 * Generates an ephemeral ECDH (P-256) key pair for pairing/session negotiation
 */
export async function generateEphemeralECDHKeyPair(): Promise<P2PEphemeralKeyPair> {
  const subtle = getCrypto().subtle;
  const keyPair = await subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const exportedPub = await subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(exportedPub);

  return { keyPair, publicKeyBase64 };
}

/**
 * Derives a shared AES-GCM-256 session key and Short Authentication String (SAS)
 * using ECDH + HKDF.
 */
export async function deriveSessionKeyAndSAS(
  localPrivateKey: CryptoKey,
  remotePublicKeyBase64: string,
  saltString: string = 'pkm-p2p-session-v1'
): Promise<{
  sessionKey: CryptoKey;
  sasPhrase: string;
  sasCode: number;
}> {
  const subtle = getCrypto().subtle;
  const remotePubBuffer = base64ToArrayBuffer(remotePublicKeyBase64);

  const remotePublicKey = await subtle.importKey(
    'spki',
    remotePubBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  // 1. Derive raw shared bits via ECDH
  const sharedSecretBits = await subtle.deriveBits(
    {
      name: 'ECDH',
      public: remotePublicKey,
    },
    localPrivateKey,
    256
  );

  // 2. Import shared bits into HKDF key
  const hkdfKey = await subtle.importKey(
    'raw',
    sharedSecretBits,
    'HKDF',
    false,
    ['deriveKey', 'deriveBits']
  );

  const enc = new TextEncoder();
  const salt = enc.encode(saltString);

  // 3. Derive AES-GCM session key
  const sessionKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: enc.encode('pkm-p2p-aes-gcm-key'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // 4. Derive SAS Authentication bytes
  const sasBytes = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: enc.encode('pkm-p2p-sas-auth'),
    },
    hkdfKey,
    64 // 8 bytes
  );

  const sasView = new DataView(sasBytes);
  const word1 = SAS_WORDLIST[sasView.getUint8(0) % SAS_WORDLIST.length];
  const word2 = SAS_WORDLIST[sasView.getUint8(1) % SAS_WORDLIST.length];
  const word3 = SAS_WORDLIST[sasView.getUint8(2) % SAS_WORDLIST.length];
  const sasNum = (sasView.getUint16(3) % 900) + 100; // 100-999

  const sasPhrase = `${word1} ${word2} ${word3} ${sasNum}`;
  const sasCode = sasView.getUint32(0);

  return { sessionKey, sasPhrase, sasCode };
}

/**
 * Encrypts data payload using AES-GCM 256-bit with random 96-bit IV
 */
export async function encryptPayload(
  payload: string | Uint8Array,
  sessionKey: CryptoKey
): Promise<string> {
  const crypto = getCrypto();
  const subtle = crypto.subtle;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;

  const ciphertext = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sessionKey,
    data
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypts AES-GCM ciphertext string with IV prepended
 */
export async function decryptPayload(
  encryptedBase64: string,
  sessionKey: CryptoKey
): Promise<string> {
  const subtle = getCrypto().subtle;
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  if (combined.length < 13) {
    throw new Error('Encrypted payload too short');
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sessionKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Computes deterministic SHA-256 hex checksum
 */
export async function computeSHA256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const subtle = getCrypto().subtle;
  let buffer: ArrayBuffer;

  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer;
  } else if (data instanceof Uint8Array) {
    buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } else {
    buffer = data;
  }

  const hashBuf = await subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically strong random alphanumeric token
 */
export function generateRandomToken(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = getCrypto().getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

/**
 * Generates a short, human-typeable pairing code (e.g. "PKM-7492-8103")
 */
export function generateHumanPairingCode(): string {
  const values = getCrypto().getRandomValues(new Uint16Array(2));
  const part1 = (values[0] % 9000 + 1000).toString();
  const part2 = (values[1] % 9000 + 1000).toString();
  return `PKM-${part1}-${part2}`;
}

// Utility conversion functions
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
