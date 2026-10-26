/**
 * Original VaultEncryptionService scheduling regressions.
 * KDF/AES primitives are controlled stubs ONLY to test asynchronous lock races;
 * this does not validate Argon2id/AES-GCM cryptographic correctness.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/pkm/encryption/vaultEncryptionService.ts');
const source=fs.readFileSync(filename,'utf8');
const compiled=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}}
function setup(queue){
  const store=new Map(),storage={getItem:key=>store.get(key)??null,setItem:(key,val)=>store.set(key,val),removeItem:key=>store.delete(key)};
  const header={format:'keepnotes-vault-enc',version:'1.0.0',kdf:{},wrappedKey:{iv:'iv',ciphertext:'data'},keyCheck:{iv:'iv',ciphertext:'data'},autoLockMinutes:15};
  const kdf={deriveKeyFromPassphrase:()=>{const d=queue.shift();if(!d)throw Error('Missing deferred KDF');return d.promise},DEFAULT_ARGON2ID_PARAMS:{},uint8ArrayToBase64:()=>'',base64ToUint8Array:()=>new Uint8Array(),generateSecureRandomBytes:()=>new Uint8Array()};
  const aes={importRawKeyAsCryptoKey:async()=>({}),generateVaultKey:async()=>({cryptoKey:{}}),encryptAesGcm:async()=>({iv:'iv',ciphertext:'data'}),decryptAesGcmToText:async()=> 'KEEPNOTES_ENCRYPTED_VAULT_AUTHENTICATED_V1',decryptAesGcm:async()=>new Uint8Array(),wrapKeyAesGcm:async()=>({iv:'iv',ciphertext:'data'}),unwrapKeyAesGcm:async()=>({}),computeSha256Hex:async()=> 'sha',TamperDetectedError:Error,DecryptionError:Error};
  let purges=0;
  const mocks={'./kdf':kdf,'./aesGcm':aes,'../security/vaultPurge':{vaultPurgeManager:{executeVaultPurge:()=>purges++}}},exports={};
  vm.runInNewContext(compiled.outputText,{exports,require:spec=>{if(!(spec in mocks))throw Error('Unexpected import '+spec);return mocks[spec]},localStorage:storage,window:undefined,console,setTimeout:()=>42,clearTimeout:()=>{}},{filename:'vaultEncryptionService.js'});
  return {instance:new exports.VaultEncryptionService(),store,storage,header,purges:()=>purges};
}
(async()=>{
  let passed=0;
  {
    const k=deferred(),t=setup([k]);t.instance.vaultHeader=t.header;t.instance.securityStatus='locked';
    const pending=t.instance.unlockVault('passphrase');t.instance.lockVault();k.resolve({rawKey:new Uint8Array(32)});
    assert.equal((await pending).success,false);assert.equal(t.instance.isVaultUnlocked(),false);
    assert.equal(t.instance.getActiveKey(),null);assert.ok(t.purges()>0);passed++;
  }
  {
    const k=deferred(),t=setup([k]);const pending=t.instance.setupVaultEncryption('passphrase');
    t.instance.lockVault();k.resolve({rawKey:new Uint8Array(32),kdf:{}});
    assert.equal((await pending).success,false);assert.equal(t.instance.isVaultUnlocked(),false);
    assert.equal(t.storage.getItem('keepnotes_vault_enc_header'),null);passed++;
  }
  {
    const older=deferred(),fresh=deferred(),t=setup([older,fresh]);t.instance.vaultHeader=t.header;t.instance.securityStatus='locked';
    const first=t.instance.unlockVault('older'),second=t.instance.unlockVault('newer');
    fresh.resolve({rawKey:new Uint8Array(32)});assert.equal((await second).success,true);
    older.resolve({rawKey:new Uint8Array(32)});assert.equal((await first).success,false);
    t.instance.lockVault();assert.equal(t.instance.isVaultUnlocked(),false);passed++;
  }
  {
    const k=deferred(),t=setup([k]);t.instance.vaultHeader=t.header;t.instance.securityStatus='locked';
    const pending=t.instance.changeMasterPassphrase('oldpass','newpass');
    t.instance.lockVault();k.resolve({rawKey:new Uint8Array(32)});
    assert.equal((await pending).success,false);assert.equal(t.instance.vaultHeader,t.header);
    assert.equal(t.instance.isVaultUnlocked(),false);passed++;
  }
  console.log('KEEP_VAULT_LOCK_RACE_PASS='+passed);
})().catch(e=>{console.error(e);process.exitCode=1});
