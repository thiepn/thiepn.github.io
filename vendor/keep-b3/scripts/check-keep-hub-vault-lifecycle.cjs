/**
 * Exercise the ORIGINAL KEEP vault singleton's native Hub React session lifecycle.
 * KDF/AES functions are controlled test stubs only; cryptographic soundness is
 * independently tested in the original AES/WebCrypto suite.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkm/encryption/vaultEncryptionService.ts'),'utf8');
const built=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
function deferred(){let resolve;const promise=new Promise(res=>resolve=res);return{promise,resolve}}
function environment(embedded,queue=[]){
 const subscriptions=new Map(),logs=[];
 const window={addEventListener:(name,handler)=>{if(!subscriptions.has(name))subscriptions.set(name,new Set());subscriptions.get(name).add(handler)},
   removeEventListener:(name,handler)=>subscriptions.get(name)?.delete(handler)};
 const document={querySelector:selector=>embedded&&selector==='[data-keep-native-host]'?{}:null};
 const local=new Map(),localStorage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)};
 const kdf={deriveKeyFromPassphrase:()=>queue.shift()?.promise??Promise.reject(Error('KDF not scheduled')),DEFAULT_ARGON2ID_PARAMS:{},uint8ArrayToBase64:()=>'',base64ToUint8Array:()=>new Uint8Array(),generateSecureRandomBytes:()=>new Uint8Array()};
 const aes={importRawKeyAsCryptoKey:async()=>({}),generateVaultKey:async()=>({cryptoKey:{}}),encryptAesGcm:async()=>({iv:'iv',ciphertext:'data'}),decryptAesGcmToText:async()=> 'KEEPNOTES_ENCRYPTED_VAULT_AUTHENTICATED_V1',decryptAesGcm:async()=>new Uint8Array(),wrapKeyAesGcm:async()=>({iv:'iv',ciphertext:'data'}),unwrapKeyAesGcm:async()=>({}),computeSha256Hex:async()=> 'sha',TamperDetectedError:Error,DecryptionError:Error};
 let purges=0;
 const mocks={'./kdf':kdf,'./aesGcm':aes,'../security/vaultPurge':{vaultPurgeManager:{executeVaultPurge:()=>purges++}}},exports={};
 vm.runInNewContext(built.outputText,{exports,require:s=>{if(!(s in mocks))throw Error('Unknown original KEEP dependency '+s);return mocks[s]},window,document,localStorage,console,setTimeout:()=>42,clearTimeout:()=>{}},{filename:'vaultEncryptionService.js'});
 const service=new exports.VaultEncryptionService();
 const count=()=>Array.from(subscriptions.values()).reduce((sum,list)=>sum+list.size,0);
 return{service,localStorage,count,purges:()=>purges,window,subscriptions};
}
(async()=>{
 let passed=0;
 {const x=environment(true);assert.equal(x.count(),0);x.service.beginHubSession();assert.equal(x.count(),4);
  x.service.beginHubSession();assert.equal(x.count(),4);x.service.endHubSession();assert.equal(x.count(),0);passed++}
 {const x=environment(false);assert.equal(x.count(),4);x.service.endHubSession();assert.equal(x.count(),0);
  x.service.beginHubSession();assert.equal(x.count(),4);x.service.endHubSession();assert.equal(x.count(),0);passed++}
 {const k=deferred(),x=environment(true,[k]);const h={kdf:{},wrappedKey:{ciphertext:'secret',iv:'iv'},keyCheck:{ciphertext:'check',iv:'iv'},autoLockMinutes:5};
  x.service.vaultHeader=h;x.service.securityStatus='locked';x.service.beginHubSession();
  const pending=x.service.unlockVault('passphrase');x.service.endHubSession();k.resolve({rawKey:new Uint8Array(32)});
  assert.equal((await pending).success,false);assert.equal(x.service.getActiveKey(),null);
  assert.equal(x.service.isVaultUnlocked(),false);assert.ok(x.purges()>0);assert.equal(x.count(),0);passed++}
 {const k=deferred(),x=environment(true,[k]);const pending=x.service.setupVaultEncryption('passphrase');
  x.service.endHubSession();k.resolve({rawKey:new Uint8Array(32),kdf:{}});
  assert.equal((await pending).success,false);assert.equal(x.localStorage.getItem('keepnotes_vault_enc_header'),null);
  assert.equal(x.service.getActiveKey(),null);passed++}
 console.log('KEEP_HUB_VAULT_LIFECYCLE_PASS='+passed);
})().catch(e=>{console.error(e);process.exitCode=1});
