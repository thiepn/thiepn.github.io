import {
  encryptAesGcm,
  decryptAesGcm,
  decryptAesGcmToText,
  importRawKeyAsCryptoKey,
  generateVaultKey,
  deriveKeyFromPassphrase,
  FAST_TEST_ARGON2ID_PARAMS,
  generateSecureRandomBytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../encryption';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import {
  exportEncryptedVaultContainer,
  importEncryptedVaultContainer,
} from '../encryption/encryptedVaultExport';
import { PortableVaultData } from '../portableVaultTypes';
import { Note, Folder } from '../../types';

export async function runVaultEncryptionTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  try {
    // 1. Primitive Key Derivation & AES-256-GCM String Roundtrip
    const passphrase = 'SuperSecretVaultMasterPassphrase123!';
    const { rawKey, kdf } = await deriveKeyFromPassphrase(passphrase, FAST_TEST_ARGON2ID_PARAMS);
    const cryptoKey = await importRawKeyAsCryptoKey(rawKey, false);
    assert(cryptoKey !== null && cryptoKey.type === 'secret', 'Derived AES-256-GCM key from passphrase via Argon2id');

    const plaintext = 'Secret note content containing sensitive thoughts, passwords, and data.';
    const encryptedPayload = await encryptAesGcm(cryptoKey, plaintext);
    assert(
      encryptedPayload.ciphertext !== plaintext && encryptedPayload.iv.length > 0,
      'Encrypted string with fresh random IV/nonce'
    );

    const decrypted = await decryptAesGcmToText(cryptoKey, encryptedPayload.ciphertext, encryptedPayload.iv);
    assert(decrypted === plaintext, 'Successfully decrypted string back to exact plaintext');

    // 2. Binary Data Encryption & Decryption Roundtrip
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    const encryptedBin = await encryptAesGcm(cryptoKey, binaryData);
    const decryptedBin = await decryptAesGcm(cryptoKey, encryptedBin.ciphertext, encryptedBin.iv);
    let binMatches = decryptedBin.length === binaryData.length;
    for (let i = 0; i < binaryData.length; i++) {
      if (decryptedBin[i] !== binaryData[i]) {
        binMatches = false;
        break;
      }
    }
    assert(binMatches, 'Binary attachment encryption and decryption round-trip preserved exact bytes');

    // 3. Cryptographic Tamper Resistance (AES-GCM Auth Tag Failure)
    let tamperDetected = false;
    try {
      // Corrupt a byte in the base64 ciphertext
      const corruptedCiphertext =
        encryptedPayload.ciphertext.slice(0, 10) +
        (encryptedPayload.ciphertext[10] === 'A' ? 'B' : 'A') +
        encryptedPayload.ciphertext.slice(11);

      await decryptAesGcmToText(cryptoKey, corruptedCiphertext, encryptedPayload.iv);
    } catch {
      tamperDetected = true;
    }
    assert(
      tamperDetected,
      'AES-GCM rejects corrupted/tampered ciphertext with authentication error'
    );

    // 4. Tampered Nonce Failure
    let nonceTamperDetected = false;
    try {
      const alteredNonce = uint8ArrayToBase64(generateSecureRandomBytes(12));
      await decryptAesGcmToText(cryptoKey, encryptedPayload.ciphertext, alteredNonce);
    } catch {
      nonceTamperDetected = true;
    }
    assert(nonceTamperDetected, 'AES-GCM rejects altered nonce/IV with authentication error');

    // 5. Wrong Password Key Derivation Failure
    let wrongPassphraseRejected = false;
    try {
      const { rawKey: wrongRawKey } = await deriveKeyFromPassphrase(
        'IncorrectWrongPassword!',
        { ...FAST_TEST_ARGON2ID_PARAMS, salt: kdf.salt }
      );
      const wrongKey = await importRawKeyAsCryptoKey(wrongRawKey, false);
      await decryptAesGcmToText(wrongKey, encryptedPayload.ciphertext, encryptedPayload.iv);
    } catch {
      wrongPassphraseRejected = true;
    }
    assert(
      wrongPassphraseRejected,
      'Decrypting with key derived from wrong password fails cleanly with auth tag verification failure'
    );

    // 6. Encrypted .vault Container Export & Import Round-trip
    const sampleNotes: Note[] = [
      {
        id: 'note-enc-1',
        title: 'Top Secret Research',
        content: '# Classified\n\nQuantum algorithms and zero-knowledge proofs.',
        type: 'text',
        tags: ['cryptography', 'security'],
        checklist: [],
        color: 'default',
        folderId: 'folder-sec',
        pinned: true,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:30:00.000Z',
      },
    ];

    const sampleFolders: Folder[] = [
      {
        id: 'folder-sec',
        name: 'Classified',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ];

    const vaultDataToExport: PortableVaultData = {
      notes: sampleNotes,
      folders: sampleFolders,
      savedSearches: [],
      pdfAttachments: [],
      canvases: [],
    };

    // Export container with password
    const exportPassphrase = 'MyVaultPassphrase2026!';
    const encryptedBlob = await exportEncryptedVaultContainer(vaultDataToExport, exportPassphrase, FAST_TEST_ARGON2ID_PARAMS);
    assert(encryptedBlob.size > 0, 'Generated encrypted .vault container binary Blob');

    // Import container with matching password
    const importedVault = await importEncryptedVaultContainer(encryptedBlob, exportPassphrase);
    assert(
      importedVault.notes.length === 1 &&
        importedVault.notes[0].title === 'Top Secret Research' &&
        importedVault.folders.length === 1 &&
        importedVault.folders[0].name === 'Classified',
      'Imported .vault container matches exported vault notes and folders perfectly'
    );

    // Import container with wrong password must fail
    let importWrongPassFailed = false;
    try {
      await importEncryptedVaultContainer(encryptedBlob, 'WrongPassphrase!');
    } catch {
      importWrongPassFailed = true;
    }
    assert(
      importWrongPassFailed,
      'Importing .vault container with wrong password throws authentication error'
    );

    // 7. VaultEncryptionService State and Auto-lock Lifecycle
    const setupRes = await vaultEncryptionService.setupVaultEncryption(
      'ServiceMasterPassword123!',
      15,
      FAST_TEST_ARGON2ID_PARAMS
    );
    assert(setupRes.success, 'Vault encryption setup succeeded');
    assert(vaultEncryptionService.isEncryptionEnabled(), 'Vault encryption is enabled in service');
    assert(vaultEncryptionService.isVaultUnlocked(), 'Vault is initially unlocked upon password setup');

    const encryptedRecord = await vaultEncryptionService.encryptRecord(
      sampleNotes[0].id,
      'note',
      sampleNotes[0]
    );
    assert(
      encryptedRecord.isEncrypted === true &&
        typeof encryptedRecord.ciphertext === 'string' &&
        typeof encryptedRecord.iv === 'string',
      'Note payload serialized and encrypted into authenticated record envelope'
    );

    const decryptedNote = await vaultEncryptionService.decryptRecord<Note>(encryptedRecord);
    assert(
      decryptedNote.title === sampleNotes[0].title &&
        decryptedNote.content === sampleNotes[0].content,
      'VaultEncryptionService decrypted record matches original'
    );

    // Test locking vault
    vaultEncryptionService.lockVault();
    assert(vaultEncryptionService.isVaultLocked(), 'Vault successfully locked and keys wiped from memory');

    let lockedDecryptFailed = false;
    try {
      await vaultEncryptionService.decryptRecord(encryptedRecord);
    } catch {
      lockedDecryptFailed = true;
    }
    assert(
      lockedDecryptFailed,
      'Attempting to decrypt data while vault is locked throws error without leaking plaintext'
    );

    // Test unlocking vault with correct password
    const unlockRes = await vaultEncryptionService.unlockVault('ServiceMasterPassword123!');
    assert(unlockRes.success && vaultEncryptionService.isVaultUnlocked(), 'Successfully unlocked vault with master password');

    // Test unlocking with wrong password
    const wrongUnlockRes = await vaultEncryptionService.unlockVault('WrongPassword');
    assert(!wrongUnlockRes.success, 'Unlocking with incorrect password fails and is rejected');

    // 8. Re-keying / Changing master passphrase without re-encrypting records
    const changePassRes = await vaultEncryptionService.changeMasterPassphrase(
      'ServiceMasterPassword123!',
      'NewSecureMasterPassword2026!',
      FAST_TEST_ARGON2ID_PARAMS
    );
    assert(changePassRes.success, 'Successfully changed master passphrase via KEK re-wrapping');

    // Verify existing encryptedRecord can still be decrypted with current key
    const decryptedAfterKeyChange = await vaultEncryptionService.decryptRecord<Note>(encryptedRecord);
    assert(
      decryptedAfterKeyChange.title === sampleNotes[0].title,
      'Existing records remain decryptable without re-encryption after passphrase change'
    );

    // Verify locking and unlocking with NEW password works
    vaultEncryptionService.lockVault();
    const newUnlockRes = await vaultEncryptionService.unlockVault('NewSecureMasterPassword2026!');
    assert(newUnlockRes.success, 'Unlocked vault with newly configured master passphrase');

    // Clean up service
    await vaultEncryptionService.disableVaultEncryption('NewSecureMasterPassword2026!');
    assert(!vaultEncryptionService.isEncryptionEnabled(), 'Successfully disabled vault encryption and cleared header');
  } catch (e: any) {
    failed++;
    errors.push(`Unhandled test exception: ${e.message}`);
    console.error('Unhandled exception in vaultEncryption.test.ts:', e);
  }

  return { passed, failed, errors };
}
