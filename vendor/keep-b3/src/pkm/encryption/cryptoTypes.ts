// Cryptographic Types for Full-Vault Client-Side Encryption & Versioned Containers

export type KdfAlgorithm = 'argon2id';
export type CipherAlgorithm = 'AES-256-GCM';

export interface KdfParameters {
  algorithm: KdfAlgorithm;
  memoryCost: number; // in KB (e.g. 65536 for 64MB)
  timeCost: number; // iterations (e.g. 3)
  parallelism: number; // e.g. 1
  salt: string; // base64 encoded
  hashLength: number; // in bytes (e.g. 32)
}

export interface CipherParameters {
  cipher: CipherAlgorithm;
  iv: string; // base64 encoded 12-byte nonce
  tagLength: number; // in bits (128 for GCM)
}

export interface EncryptedKeyCheck {
  iv: string; // base64
  ciphertext: string; // base64
  expectedPlaintextHash: string; // SHA-256 hash of magic constant
}

export interface WrappedVaultKey {
  iv: string; // base64
  ciphertext: string; // base64
}

export interface EncryptedVaultHeader {
  format: 'keepnotes-vault-enc';
  version: '1.0.0';
  createdAt: string;
  updatedAt: string;
  vaultId: string;
  kdf: KdfParameters;
  cipher: CipherParameters;
  keyCheck: EncryptedKeyCheck;
  wrappedKey: WrappedVaultKey;
  autoLockMinutes: number; // 0 = disabled, e.g. 5, 15, 30
}

export interface EncryptedVaultPackage {
  header: EncryptedVaultHeader;
  payload: string; // base64 encoded AES-256-GCM ciphertext of the JSON serialized vault
  checksum: string; // SHA-256 checksum of payload
}

export interface EncryptedRecord<T = any> {
  id: string;
  isEncrypted: true;
  version: number;
  iv: string; // base64
  ciphertext: string; // base64
  updatedAt: string;
  entityType: 'note' | 'folder' | 'saved_search' | 'canvas' | 'pdf' | 'pdf_attachment' | 'pdf_annotation' | 'settings' | 'media_attachment';
  // Non-sensitive indexing helpers only if explicitly configured
  nonSensitiveMeta?: {
    trashed?: boolean;
    archived?: boolean;
  };
}

export type VaultSecurityStatus = 'unencrypted' | 'locked' | 'unlocked';

export interface VaultEncryptionConfig {
  isEncryptionEnabled: boolean;
  autoLockMinutes: number;
  lastUnlockedAt?: string;
  vaultId?: string;
}

export interface EncryptionProgressCallback {
  (progress: { step: string; percent: number; details?: string }): void;
}
