import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';
import {
  EncryptedVaultHeader,
  EncryptedRecord,
  VaultSecurityStatus,
  VaultEncryptionConfig,
  EncryptionProgressCallback,
  KdfParameters,
} from './cryptoTypes';
import {
  deriveKeyFromPassphrase,
  DEFAULT_ARGON2ID_PARAMS,
  uint8ArrayToBase64,
  base64ToUint8Array,
  generateSecureRandomBytes,
} from './kdf';
import {
  importRawKeyAsCryptoKey,
  generateVaultKey,
  encryptAesGcm,
  decryptAesGcmToText,
  decryptAesGcm,
  wrapKeyAesGcm,
  unwrapKeyAesGcm,
  computeSha256Hex,
  TamperDetectedError,
  DecryptionError,
} from './aesGcm';
import { vaultPurgeManager } from '../security/vaultPurge';

const VAULT_HEADER_STORAGE_KEY = 'keepnotes_vault_enc_header';
const VAULT_CONFIG_STORAGE_KEY = 'keepnotes_vault_enc_config';
const MAGIC_KEY_CHECK_PLAINTEXT = 'KEEPNOTES_ENCRYPTED_VAULT_AUTHENTICATED_V1';

export class VaultEncryptionService {
  private activeVaultKey: CryptoKey | null = null;
  /** Invalidates pending Argon2id/AES-GCM operations on lock or replacement. */
  private keyOperationEpoch = 0;
  private isCurrentKeyOperation(epoch: number, header: EncryptedVaultHeader | null): boolean {
    return epoch === this.keyOperationEpoch && this.vaultHeader === header;
  }
  private vaultHeader: EncryptedVaultHeader | null = null;
  private securityStatus: VaultSecurityStatus = 'unencrypted';
  private autoLockTimeoutId: any = null;
  private lastActivityTimestamp = Date.now();
  private isAutoLockListenerAttached = false;
  private onLockStateChangeCallbacks: Array<(status: VaultSecurityStatus) => void> = [];

  constructor() {
    this.loadPersistedHeader();
    // Standalone KEEP retains its original global lifecycle. In native Hub,
    // wait until the authenticated React mount explicitly owns this session.
    if (typeof document === 'undefined' || !document.querySelector('[data-keep-native-host]'))
      this.attachAutoLockListeners();
  }

  // --- State & Status Queries ---

  getSecurityStatus(): VaultSecurityStatus {
    return this.securityStatus;
  }

  isEncryptionEnabled(): boolean {
    return this.vaultHeader !== null;
  }

  isVaultEncrypted(): boolean {
    return this.vaultHeader !== null;
  }

  isVaultUnlocked(): boolean {
    return this.securityStatus === 'unlocked' && this.activeVaultKey !== null;
  }

  isVaultLocked(): boolean {
    return this.securityStatus === 'locked';
  }

  getVaultHeader(): EncryptedVaultHeader | null {
    return this.vaultHeader ? { ...this.vaultHeader } : null;
  }

  getActiveKey(): CryptoKey | null {
    return this.activeVaultKey;
  }

  subscribeLockStateChange(callback: (status: VaultSecurityStatus) => void): () => void {
    this.onLockStateChangeCallbacks.push(callback);
    return () => {
      this.onLockStateChangeCallbacks = this.onLockStateChangeCallbacks.filter((c) => c !== callback);
    };
  }

  private notifyLockStateChange() {
    for (const cb of this.onLockStateChangeCallbacks) {
      try {
        cb(this.securityStatus);
      } catch (err) {
        console.error('Error in lock state callback:', err);
      }
    }
  }

  // --- Persistence of Header ---

  private loadPersistedHeader(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(VAULT_HEADER_STORAGE_KEY);
    if (raw) {
      try {
        this.vaultHeader = JSON.parse(raw);
        this.securityStatus = 'locked'; // locked by default on page start until passphrase entered
      } catch {
        this.vaultHeader = null;
        this.securityStatus = 'unencrypted';
      }
    } else {
      this.vaultHeader = null;
      this.securityStatus = 'unencrypted';
    }
  }

  private savePersistedHeader(header: EncryptedVaultHeader | null): void {
    this.vaultHeader = header;
    if (typeof localStorage === 'undefined') return;
    if (header) {
      localStorage.setItem(VAULT_HEADER_STORAGE_KEY, JSON.stringify(header));
    } else {
      localStorage.removeItem(VAULT_HEADER_STORAGE_KEY);
    }
  }

  // --- Unlock Vault ---

  /**
   * Unlock vault with master passphrase
   */
  async unlockVault(passphrase: string): Promise<{ success: boolean; error?: string }> {
    if (!this.vaultHeader) {
      return { success: false, error: 'Vault is not encrypted' };
    }

    const header = this.vaultHeader;
    const operation = ++this.keyOperationEpoch;
    try {
      // 1. Derive KEK using stored Argon2id parameters
      const { rawKey: kekBytes } = await deriveKeyFromPassphrase(passphrase, header.kdf);
      const kek = await importRawKeyAsCryptoKey(kekBytes, false);

      // 2. Unwrap the Vault Encryption Key (VEK)
      let vek: CryptoKey;
      try {
        vek = await unwrapKeyAesGcm(
          kek,
          header.wrappedKey.ciphertext,
          header.wrappedKey.iv
        );
      } catch (err: any) {
        return { success: false, error: 'Incorrect master passphrase or corrupted key' };
      }

      // 3. Verify KeyCheck magic token
      try {
        const decryptedCheck = await decryptAesGcmToText(
          vek,
          header.keyCheck.ciphertext,
          header.keyCheck.iv
        );
        if (decryptedCheck !== MAGIC_KEY_CHECK_PLAINTEXT) {
          return { success: false, error: 'Vault authentication token mismatch. Vault may be tampered.' };
        }
      } catch (err: any) {
        return { success: false, error: 'Vault authentication failed: ' + err.message };
      }

      // A Hub logout/route unmount may lock the vault during the awaits above.
      if (!this.isCurrentKeyOperation(operation, header))
        return { success: false, error: 'Vault unlock cancelled by a newer lock or session.' };
      // 4. Set unlocked state
      this.activeVaultKey = vek;
      this.securityStatus = 'unlocked';
      this.resetAutoLockTimer();
      this.notifyLockStateChange();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to unlock vault' };
    }
  }

  // --- Lock Vault ---

  /**
   * Lock vault and purge all decrypted caches and keys from memory
   */
  lockVault(): void {
    // Increment even for an unencrypted vault: an async encryption setup must
    // never commit after Hub revokes the original React workspace.
    ++this.keyOperationEpoch;
    if (!this.vaultHeader) return;

    // Purge active cryptographic key
    this.activeVaultKey = null;
    this.securityStatus = 'locked';

    if (this.autoLockTimeoutId) {
      clearTimeout(this.autoLockTimeoutId);
      this.autoLockTimeoutId = null;
    }

    // Comprehensive memory zeroization and in-memory cache destruction
    try {
      vaultPurgeManager.executeVaultPurge();
    } catch (err) {
      console.error('Error executing vault purge:', err);
    }

    this.notifyLockStateChange();
  }

  // --- Enable Vault Encryption (Transactional Setup) ---

  /**
   * Encrypt an existing unencrypted vault.
   * Transactional workflow: Check -> Derive & Wrap -> Test Round-trip -> Commit.
   */
  async setupVaultEncryption(
    passphrase: string,
    autoLockMinutes = 15,
    kdfOverride?: Partial<KdfParameters>,
    onProgress?: EncryptionProgressCallback
  ): Promise<{ success: boolean; error?: string }> {
    if (!passphrase || passphrase.length < 6) {
      return { success: false, error: 'Passphrase must be at least 6 characters' };
    }

    const operation = ++this.keyOperationEpoch;
    const startingHeader = this.vaultHeader;
    onProgress?.({ step: 'Deriving master key encryption key (Argon2id)...', percent: 20 });

    try {
      // 1. Derive KEK with Argon2id
      const { rawKey: kekBytes, kdf } = await deriveKeyFromPassphrase(passphrase, kdfOverride);
      const kek = await importRawKeyAsCryptoKey(kekBytes, false);

      onProgress?.({ step: 'Generating 256-bit Vault Encryption Key (VEK)...', percent: 40 });

      // 2. Generate random 256-bit Vault Key (VEK)
      const { cryptoKey: vek } = await generateVaultKey();

      // 3. Encrypt KeyCheck magic token
      const keyCheckEnc = await encryptAesGcm(vek, MAGIC_KEY_CHECK_PLAINTEXT);
      const expectedHash = await computeSha256Hex(MAGIC_KEY_CHECK_PLAINTEXT);

      onProgress?.({ step: 'Wrapping vault key with AES-256-GCM...', percent: 60 });

      // 4. Wrap the VEK with KEK
      const wrappedKey = await wrapKeyAesGcm(kek, vek);

      // 5. Build Header
      const header: EncryptedVaultHeader = {
        format: 'keepnotes-vault-enc',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        vaultId: `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        autoLockMinutes,
      };

      onProgress?.({ step: 'Verifying round-trip key decryption...', percent: 80 });

      // 6. Test round-trip verification before committing
      const unwrappedTest = await unwrapKeyAesGcm(kek, header.wrappedKey.ciphertext, header.wrappedKey.iv);
      const decryptedCheck = await decryptAesGcmToText(
        unwrappedTest,
        header.keyCheck.ciphertext,
        header.keyCheck.iv
      );

      if (decryptedCheck !== MAGIC_KEY_CHECK_PLAINTEXT) {
        throw new Error('Pre-flight roundtrip key verification failed');
      }

      if (!this.isCurrentKeyOperation(operation, startingHeader))
        return { success: false, error: 'Vault encryption setup cancelled by a newer lock or session.' };
      // 7. Commit header and set active key
      this.savePersistedHeader(header);
      this.activeVaultKey = vek;
      this.securityStatus = 'unlocked';
      this.resetAutoLockTimer();
      this.notifyLockStateChange();

      onProgress?.({ step: 'Vault encryption successfully enabled!', percent: 100 });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup vault encryption' };
    }
  }

  // --- Change Master Passphrase ---

  /**
   * Change master passphrase by deriving new KEK and re-wrapping the existing VEK.
   * Does NOT require re-encrypting the thousands of data payloads!
   */
  async changeMasterPassphrase(
    currentPassphrase: string,
    newPassphrase: string,
    kdfOverride?: Partial<KdfParameters>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.vaultHeader) {
      return { success: false, error: 'Vault is not encrypted' };
    }
    if (!newPassphrase || newPassphrase.length < 6) {
      return { success: false, error: 'New passphrase must be at least 6 characters' };
    }

    const startingHeader = this.vaultHeader;
    const operation = ++this.keyOperationEpoch;
    try {
      // 1. Authenticate old passphrase and get VEK
      const { rawKey: oldKekBytes } = await deriveKeyFromPassphrase(
        currentPassphrase,
        this.vaultHeader.kdf
      );
      const oldKek = await importRawKeyAsCryptoKey(oldKekBytes, false);
      const vek = await unwrapKeyAesGcm(
        oldKek,
        this.vaultHeader.wrappedKey.ciphertext,
        this.vaultHeader.wrappedKey.iv
      );

      // 2. Derive new KEK
      const { rawKey: newKekBytes, kdf: newKdf } = await deriveKeyFromPassphrase(
        newPassphrase,
        kdfOverride
      );
      const newKek = await importRawKeyAsCryptoKey(newKekBytes, false);

      // 3. Re-wrap existing VEK with new KEK
      const newWrappedKey = await wrapKeyAesGcm(newKek, vek);

      // 4. Verify new wrap
      const testUnwrap = await unwrapKeyAesGcm(
        newKek,
        newWrappedKey.ciphertext,
        newWrappedKey.iv
      );
      const checkResult = await decryptAesGcmToText(
        testUnwrap,
        this.vaultHeader.keyCheck.ciphertext,
        this.vaultHeader.keyCheck.iv
      );
      if (checkResult !== MAGIC_KEY_CHECK_PLAINTEXT) {
        throw new Error('New passphrase key check failed');
      }

      if (!this.isCurrentKeyOperation(operation, startingHeader))
        return { success: false, error: 'Passphrase change cancelled by a newer lock or session.' };
      // 5. Commit updated header
      const updatedHeader: EncryptedVaultHeader = {
        ...this.vaultHeader,
        updatedAt: new Date().toISOString(),
        kdf: newKdf,
        wrappedKey: {
          iv: newWrappedKey.iv,
          ciphertext: newWrappedKey.ciphertext,
        },
      };

      this.savePersistedHeader(updatedHeader);
      this.activeVaultKey = vek;
      this.securityStatus = 'unlocked';
      this.notifyLockStateChange();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change master passphrase' };
    }
  }

  // --- Disable Vault Encryption ---

  /**
   * Disable vault encryption, removing header from storage.
   */
  async disableVaultEncryption(currentPassphrase: string): Promise<{ success: boolean; error?: string }> {
    if (!this.vaultHeader) {
      return { success: true };
    }

    const unlockRes = await this.unlockVault(currentPassphrase);
    if (!unlockRes.success) {
      return unlockRes;
    }

    this.savePersistedHeader(null);
    this.activeVaultKey = null;
    this.securityStatus = 'unencrypted';
    if (this.autoLockTimeoutId) {
      clearTimeout(this.autoLockTimeoutId);
      this.autoLockTimeoutId = null;
    }
    this.notifyLockStateChange();

    return { success: true };
  }

  // --- Record-Level Encryption & Decryption ---

  /**
   * Encrypt a data object (note, folder, canvas, attachment) with active Vault Key
   */
  async encryptRecord<T = any>(
    id: string,
    entityType: EncryptedRecord['entityType'],
    data: T,
    nonSensitiveMeta?: EncryptedRecord['nonSensitiveMeta']
  ): Promise<EncryptedRecord<T>> {
    if (!this.activeVaultKey) {
      throw new Error('Vault is locked. Cannot encrypt records without active key.');
    }

    const jsonString = JSON.stringify(data);
    const { ciphertext, iv } = await encryptAesGcm(this.activeVaultKey, jsonString);

    return {
      id,
      isEncrypted: true,
      version: 1,
      iv,
      ciphertext,
      updatedAt: new Date().toISOString(),
      entityType,
      nonSensitiveMeta,
    };
  }

  /**
   * Decrypt an encrypted record back to its typed object
   */
  async decryptRecord<T = any>(record: EncryptedRecord<T>): Promise<T> {
    if (!this.activeVaultKey) {
      throw new Error('Vault is locked. Cannot decrypt records without active key.');
    }
    if (!record || !record.ciphertext || !record.iv) {
      throw new Error('Invalid encrypted record payload');
    }

    const jsonString = await decryptAesGcmToText(
      this.activeVaultKey,
      record.ciphertext,
      record.iv
    );

    return JSON.parse(jsonString) as T;
  }

  /**
   * Encrypt raw binary data (e.g. PDF blob, image attachment)
   */
  async encryptBinary(data: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
    if (!this.activeVaultKey) {
      throw new Error('Vault is locked. Cannot encrypt binary without active key.');
    }
    const res = await encryptAesGcm(this.activeVaultKey, data);
    return { ciphertext: res.ciphertext, iv: res.iv };
  }

  /**
   * Decrypt raw binary data
   */
  async decryptBinary(
    ciphertextOrObj: string | { ciphertext: string; iv: string },
    ivBase64?: string
  ): Promise<Uint8Array> {
    if (!this.activeVaultKey) {
      throw new Error('Vault is locked. Cannot decrypt binary without active key.');
    }
    const ciphertext = typeof ciphertextOrObj === 'string' ? ciphertextOrObj : ciphertextOrObj.ciphertext;
    const iv = typeof ciphertextOrObj === 'string' ? (ivBase64 || '') : ciphertextOrObj.iv;
    return await decryptAesGcm(this.activeVaultKey, ciphertext, iv);
  }

  /**
   * Original KEEP vault lifecycle under a native Hub React mount.
   * The keys remain owned by this service; no Hub passphrase/key handling.
   */
  beginHubSession(): void {
    this.attachAutoLockListeners();
  }

  endHubSession(): void {
    // lockVault invalidates in-flight Argon2id operations even without a header.
    this.lockVault();
    this.detachAutoLockListeners();
  }

  // --- Auto-Lock Settings & Timers ---

  updateAutoLockMinutes(minutes: number): void {
    if (this.vaultHeader) {
      this.vaultHeader.autoLockMinutes = minutes;
      this.savePersistedHeader(this.vaultHeader);
      this.resetAutoLockTimer();
    }
  }

  private resetAutoLockTimer(): void {
    if (this.autoLockTimeoutId) {
      clearTimeout(this.autoLockTimeoutId);
      this.autoLockTimeoutId = null;
    }

    if (!this.vaultHeader || this.vaultHeader.autoLockMinutes <= 0 || !this.activeVaultKey) {
      return;
    }

    const timeoutMs = this.vaultHeader.autoLockMinutes * 60 * 1000;
    this.autoLockTimeoutId = setTimeout(() => {
      if (this.securityStatus === 'unlocked') {
        console.log(`[KeepNotes Security] Inactivity timeout reached (${this.vaultHeader?.autoLockMinutes}m). Locking vault.`);
        this.lockVault();
      }
    }, timeoutMs);
  }

  private onBeforeUnload = () => {
    ++this.keyOperationEpoch;
    this.activeVaultKey = null;
  };

  private recordUserActivity = () => {
    this.lastActivityTimestamp = Date.now();
    if (this.securityStatus === 'unlocked') {
      this.resetAutoLockTimer();
    }
  };

  private attachAutoLockListeners(): void {
    if (typeof window === 'undefined' || this.isAutoLockListenerAttached) return;

    window.addEventListener('mousemove', this.recordUserActivity, { passive: true });
    window.addEventListener('keydown', this.recordUserActivity, { passive: true });
    window.addEventListener('touchstart', this.recordUserActivity, { passive: true });
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.isAutoLockListenerAttached = true;
  }

  private detachAutoLockListeners(): void {
    if (typeof window === 'undefined' || !this.isAutoLockListenerAttached) return;
    window.removeEventListener('mousemove', this.recordUserActivity);
    window.removeEventListener('keydown', this.recordUserActivity);
    window.removeEventListener('touchstart', this.recordUserActivity);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.isAutoLockListenerAttached = false;
  }
}

export const vaultEncryptionService = new VaultEncryptionService();
