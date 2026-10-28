/**
 * Exercise ORIGINAL aesGcm.ts using actual Node Web Crypto, not mock cipher.
 * KDF random-byte/base64 helpers only; full Argon2id requires hash-wasm.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto'),ts=require('typescript');
const filename=path.resolve(__dirname,'../src/pkm/encryption/aesGcm.ts');
const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const helpers={
  generateSecureRandomBytes:n=>webcrypto.getRandomValues(new Uint8Array(n)),
  uint8ArrayToBase64:bytes=>Buffer.from(bytes).toString('base64'),
  base64ToUint8Array:base64=>new Uint8Array(Buffer.from(base64,'base64')),
};
const out={};
vm.runInNewContext(js,{exports:out,require:name=>{
  if(name!=='./kdf')throw Error('Unexpected crypto import: '+name);
  return helpers;
},crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,console},{filename:'aesGcm.js'});
(async()=>{
  let passed=0;
  const {cryptoKey:vek}=await out.generateVaultKey();
  const original='Original KEEP B3 note — encrypted ä你好';
  const enc=await out.encryptAesGcm(vek,original);
  assert.notEqual(enc.ciphertext,original);
  assert.equal(await out.decryptAesGcmToText(vek,enc.ciphertext,enc.iv),original);passed++;
  const tampered=Buffer.from(enc.ciphertext,'base64');tampered[0]^=1;
  await assert.rejects(()=>out.decryptAesGcmToText(vek,tampered.toString('base64'),enc.iv),
    e=>e.name==='TamperDetectedError');passed++;
  const kek=await out.importRawKeyAsCryptoKey(webcrypto.getRandomValues(new Uint8Array(32)),false);
  const wrapped=await out.wrapKeyAesGcm(kek,vek);
  const recovered=await out.unwrapKeyAesGcm(kek,wrapped.ciphertext,wrapped.iv);
  assert.equal(await out.decryptAesGcmToText(recovered,enc.ciphertext,enc.iv),original);passed++;
  const fresh=await out.encryptAesGcm(vek,original);
  assert.notEqual(fresh.iv,enc.iv);assert.notEqual(fresh.ciphertext,enc.ciphertext);passed++;
  console.log('KEEP_ORIGINAL_AES256_GCM_WEBCRYPTO_PASS='+passed);
})().catch(e=>{console.error(e);process.exitCode=1});
