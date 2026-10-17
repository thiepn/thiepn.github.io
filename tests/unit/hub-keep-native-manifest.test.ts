import {describe,it,expect} from 'vitest';
import {validKeepNativeManifest} from '../../src/scripts/keep-native-loader';
const hash='a'.repeat(64);
const good={
 format:'thiepn-keep-b3-original-react',schema:1,
 entry:'keep-b3-original.js',css:'keep-b3-original.css',
 sourceSha256:'7dd190d70b957622e2cf37b8e134cd01937f8c0709882c95099df195399a87a0',jsSha256:hash,cssSha256:hash,
 assets:{'keep-b3-original.js':hash,'keep-b3-original.css':hash,'assets/worker-38ab.js':hash},
 inputSha256:{
  'hub-embed/entry.tsx':'f1044595f9f0550dbe38f1e5d9847ddfabd8733cc8d4674892950606a21dfa15',
  'hub-embed/vite.config.ts':'084560c67eb08f0413c97edafc04f16b4f1e15bb7e9c9ceea5aad8eb375581c7',
  'package.json':'653e357793d1361de10003e1ac819f74b791b780ea3e7a3b821c54082356a7e5',
  'bun.lock':'b62a4df384d47672d03dfe00527bce8e6415b05db129f97967d6e82044d043ba'
 }
};
describe('original KEEP native React integrity and source boundary',()=>{
 it('accepts only the qualified original-build shape',()=>{
   expect(validKeepNativeManifest(good)).toBe(true);
 });
 it('rejects external URLs, changed paths and unsupported manifests',()=>{
   expect(validKeepNativeManifest({...good,entry:'https://other.example/keep.js'})).toBe(false);
   expect(validKeepNativeManifest({...good,css:'../inject.css'})).toBe(false);
   expect(validKeepNativeManifest({...good,schema:2})).toBe(false);
   expect(validKeepNativeManifest({...good,format:'generic-react-mock'})).toBe(false);
   expect(validKeepNativeManifest({...good,assets:{'keep-b3-original.js':hash}})).toBe(false);
   expect(validKeepNativeManifest({...good,assets:{...good.assets,'../escape.js':hash}})).toBe(false);
   expect(validKeepNativeManifest({...good,assets:{...good.assets,'assets/worker-38ab.js':'bad'}})).toBe(false);
   expect(validKeepNativeManifest({...good,inputSha256:{...good.inputSha256,'bun.lock':hash}})).toBe(false);
   expect(validKeepNativeManifest({...good,inputSha256:{}})).toBe(false);
 });
 it('requires three verifiable sha256 digests',()=>{
   expect(validKeepNativeManifest({...good,jsSha256:'unverified'})).toBe(false);
   expect(validKeepNativeManifest({...good,sourceSha256:null})).toBe(false);
   expect(validKeepNativeManifest({...good,sourceSha256:hash})).toBe(false);
   expect(validKeepNativeManifest({...good,cssSha256:'B'.repeat(64)})).toBe(false);
 });
 it('refuses empty, primitive and array manifests',()=>{
   for(const data of [null,undefined,0,'valid',[],{},false]){
     expect(validKeepNativeManifest(data)).toBe(false);
   }
 });
});
