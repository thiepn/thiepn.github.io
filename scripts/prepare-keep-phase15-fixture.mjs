/**
 * Disposable synthetic fixture built by Bun from ORIGINAL untouched KEEP crypto.
 * Not shipped, published, or read by production Hub. No human vault data.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VaultEncryptionService} from '../vendor/keep-b3/src/pkm/encryption/vaultEncryptionService.ts';
import {FAST_TEST_ARGON2ID_PARAMS} from '../vendor/keep-b3/src/pkm/encryption/kdf.ts';
const passphrase='KEEP-SYNTHETIC-EPHEMERAL-2026';
const owner=new VaultEncryptionService();
const setup=await owner.setupVaultEncryption(passphrase,0,FAST_TEST_ARGON2ID_PARAMS);
assert.equal(setup.success,true,setup.error);
const header=owner.getVaultHeader();
assert.equal(header?.format,'keepnotes-vault-enc');
assert.equal(header?.kdf.algorithm,'argon2id');
assert.equal(header?.kdf.memoryCost,FAST_TEST_ARGON2ID_PARAMS.memoryCost);
const note={
 id:'authentic-existing-keep-note',title:'Original encrypted KEEP record',
 content:'KEEP confidential synthetic body',type:'text',checklist:[],color:'yellow',
 tags:['owner'],folderId:null,pinned:false,archived:false,trashed:false,
 createdAt:'2026-10-25T10:00:00Z',updatedAt:'2026-10-25T10:00:00Z',
 reminderDate:null,images:[],linkedNoteIds:[]
};
const record=await owner.encryptRecord(note.id,'note',note);
assert.equal(record.isEncrypted,true);
const decrypted=await owner.decryptRecord(record);
assert.deepEqual(decrypted,note);
owner.lockVault();
assert.equal(owner.isVaultUnlocked(),false);
fs.mkdirSync('.cache',{recursive:true});
fs.writeFileSync('.cache/keep-phase15-synthetic.json',JSON.stringify({passphrase,header,record}));
console.log('KEEP_PHASE15_SYNTHETIC_AUTHENTIC_VAULT_PASS=1');
