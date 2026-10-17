/** Execute ORIGINAL Argon2id + AES-GCM under the frozen Bun dependencies.
 * This uses ephemeral test-only material in RAM, never account credentials or data.
 */
import assert from 'node:assert/strict';
import {deriveKeyFromPassphrase,FAST_TEST_ARGON2ID_PARAMS} from '../src/pkm/encryption/kdf';
import {importRawKeyAsCryptoKey,generateVaultKey,encryptAesGcm,decryptAesGcmToText,wrapKeyAesGcm,unwrapKeyAesGcm} from '../src/pkm/encryption/aesGcm';

const passphrase='ephemeral-KEEP-test-only-2026';
const first=await deriveKeyFromPassphrase(passphrase,FAST_TEST_ARGON2ID_PARAMS);
const repeated=await deriveKeyFromPassphrase(passphrase,first.kdf);
assert.deepEqual([...repeated.rawKey],[...first.rawKey],'Original Argon2id must reproduce the wrapped KEK');
const other=await deriveKeyFromPassphrase(passphrase+'-different',first.kdf);
assert.notDeepEqual([...other.rawKey],[...first.rawKey],'Incorrect passphrase must derive different key');
const kek=await importRawKeyAsCryptoKey(first.rawKey);
const vault=await generateVaultKey();
const wrapped=await wrapKeyAesGcm(kek,vault.cryptoKey);
const recovered=await unwrapKeyAesGcm(kek,wrapped.ciphertext,wrapped.iv);
const original='Original KEEP B3 encrypted record 2026';
const encrypted=await encryptAesGcm(vault.cryptoKey,original);
assert.equal(await decryptAesGcmToText(recovered,encrypted.ciphertext,encrypted.iv),original);
const corrupted=encrypted.ciphertext.slice(0,-4)+'AAAA';
await assert.rejects(()=>decryptAesGcmToText(recovered,corrupted,encrypted.iv),'AES-GCM must reject altered ciphertext');
console.log('KEEP_REAL_ARGON2ID_AES_GCM_PASS=5');