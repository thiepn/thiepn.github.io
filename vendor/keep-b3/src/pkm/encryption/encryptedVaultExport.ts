import { PortableVaultData } from '../portableVaultTypes';
import {
  EncryptedVaultHeader,
  EncryptedVaultPackage,
  KdfParameters,
} from './cryptoTypes';
import {
  deriveKeyFromPassphrase,
  DEFAULT_ARGON2ID_PARAMS,
} from './kdf';
import {
  importRawKeyAsCryptoKey,
  generateVaultKey,
  encryptAesGcm,
  decryptAesGcmToText,
  wrapKeyAesGcm,
  unwrapKeyAesGcm,
  computeSha256Hex,
  TamperDetectedError,
  DecryptionError,
} from './aesGcm';

const MAGIC_KEY_CHECK = 'KEEPNOTES_ENCRYPTED_VAULT_AUTHENTICATED_V1';

/**
 * Export entire vault as a single encrypted .vault container
 */
export async function exportEncryptedVaultPackage(
  vaultData: PortableVaultData,
  passphrase: string,
  kdfParams?: Partial<KdfParameters>
): Promise<string> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Passphrase must be at least 6 characters long');
  }

  // 1. Derive KEK
  const { rawKey: kekBytes, kdf } = await deriveKeyFromPassphrase(passphrase, kdfParams);
  const kek = await importRawKeyAsCryptoKey(kekBytes, false);

  // 2. Generate unique VEK for this export package
  const { cryptoKey: vek } = await generateVaultKey();

  // 3. Wrap VEK with KEK
  const wrappedKey = await wrapKeyAesGcm(kek, vek);

  // 4. Encrypt keyCheck token
  const keyCheckEnc = await encryptAesGcm(vek, MAGIC_KEY_CHECK);
  const expectedHash = await computeSha256Hex(MAGIC_KEY_CHECK);

  // 5. Build Header
  const header: EncryptedVaultHeader = {
    format: 'keepnotes-vault-enc',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vaultId: `vault-export-${Date.now()}`,
    kdf,
    cipher: {
      cipher: 'AES-256-GCM',
      iv: keyCheckEnc.iv,
      tagLength: 128,
    },
    keyCheck: {
      iv: keyCheckEnc.iv,
      ciphertext: keyCheckEnc.ciphertext,
      expectedPlaintextHash: expectedHash,
    },
    wrappedKey: {
      iv: wrappedKey.iv,
      ciphertext: wrappedKey.ciphertext,
    },
    autoLockMinutes: 0,
  };

  // 6. Serialize and encrypt the vault payload
  const serializedVault = JSON.stringify(vaultData);
  const payloadEnc = await encryptAesGcm(vek, serializedVault);
  const payloadChecksum = await computeSha256Hex(payloadEnc.ciphertext);

  const container: EncryptedVaultPackage = {
    header: {
      ...header,
      cipher: {
        ...header.cipher,
        iv: payloadEnc.iv,
      },
    },
    payload: payloadEnc.ciphertext,
    checksum: payloadChecksum,
  };

  return JSON.stringify(container, null, 2);
}

/**
 * Export vault as Blob for binary/container workflows
 */
export async function exportEncryptedVaultContainer(
  vaultData: PortableVaultData,
  passphrase?: string,
  kdfParams?: Partial<KdfParameters>
): Promise<Blob> {
  const pass = passphrase || 'KeepNotesVaultEncryptedSyncContainer';
  const jsonStr = await exportEncryptedVaultPackage(vaultData, pass, kdfParams);
  return new Blob([jsonStr], { type: 'application/octet-stream' });
}

/**
 * Import vault from Blob or JSON string
 */
export async function importEncryptedVaultContainer(
  fileOrBlob: Blob | string,
  passphrase?: string
): Promise<PortableVaultData> {
  const jsonStr = typeof fileOrBlob === 'string' ? fileOrBlob : await fileOrBlob.text();
  const pass = passphrase || 'KeepNotesVaultEncryptedSyncContainer';
  const res = await importEncryptedVaultPackage(jsonStr, pass);
  return res.vaultData;
}

/**
 * Import and decrypt an encrypted .vault container
 */
export async function importEncryptedVaultPackage(
  packageJsonString: string,
  passphrase: string
): Promise<{ vaultData: PortableVaultData; header: EncryptedVaultHeader }> {
  let pkg: EncryptedVaultPackage;
  try {
    pkg = JSON.parse(packageJsonString);
  } catch {
    throw new Error('Invalid .vault file: Not a valid JSON container');
  }

  if (!pkg.header || pkg.header.format !== 'keepnotes-vault-enc' || !pkg.payload) {
    throw new Error('Invalid .vault container: Missing encryption header or payload');
  }

  // 1. Verify payload checksum if present
  if (pkg.checksum) {
    const computedChecksum = await computeSha256Hex(pkg.payload);
    if (computedChecksum !== pkg.checksum) {
      throw new TamperDetectedError('Encrypted payload checksum mismatch. File may be corrupted or modified.');
    }
  }

  // 2. Derive KEK with KDF params from header
  const { rawKey: kekBytes } = await deriveKeyFromPassphrase(passphrase, pkg.header.kdf);
  const kek = await importRawKeyAsCryptoKey(kekBytes, false);

  // 3. Unwrap VEK
  let vek: CryptoKey;
  try {
    vek = await unwrapKeyAesGcm(
      kek,
      pkg.header.wrappedKey.ciphertext,
      pkg.header.wrappedKey.iv
    );
  } catch (err: any) {
    throw new DecryptionError('Incorrect passphrase or invalid encryption header');
  }

  // 4. Verify KeyCheck
  try {
    const checkPlaintext = await decryptAesGcmToText(
      vek,
      pkg.header.keyCheck.ciphertext,
      pkg.header.keyCheck.iv
    );
    if (checkPlaintext !== MAGIC_KEY_CHECK) {
      throw new TamperDetectedError('Key check authentication failed. Decryption token mismatch.');
    }
  } catch (err: any) {
    throw new DecryptionError('Failed to authenticate decryption key: ' + err.message);
  }

  // 5. Decrypt payload
  const decryptedJson = await decryptAesGcmToText(
    vek,
    pkg.payload,
    pkg.header.cipher.iv
  );

  let vaultData: PortableVaultData;
  try {
    vaultData = JSON.parse(decryptedJson);
  } catch {
    throw new Error('Corrupted decrypted payload: Unable to parse vault JSON');
  }

  if (!Array.isArray(vaultData.notes)) {
    throw new Error('Invalid decrypted vault: notes collection missing');
  }

  return { vaultData, header: pkg.header };
}

/**
 * Trigger browser file download for .vault file
 */
export function downloadEncryptedVaultFile(encryptedJson: string, filename?: string): void {
  const name = filename || `keepnotes-vault-backup-${new Date().toISOString().slice(0, 10)}.vault`;
  const blob = new Blob([encryptedJson], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
