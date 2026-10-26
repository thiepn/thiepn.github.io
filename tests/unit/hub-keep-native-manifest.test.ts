import {describe,it,expect} from 'vitest';
import {validKeepNativeManifest} from '../../src/scripts/keep-native-loader';
const hash='a'.repeat(64);
const good={
 format:'thiepn-keep-b3-original-react',schema:1,
 entry:'keep-b3-original.js',css:'keep-b3-original.css',
 sourceSha256:'d76f1ef9a0d8fb93ee91a945c9640407b778d757db61925abe911abada8a3e0f',jsSha256:hash,cssSha256:hash,
 assets:{'keep-b3-original.js':hash,'keep-b3-original.css':hash,'assets/worker-38ab.js':hash},
 inputSha256:{
  'hub-embed/entry.tsx':'07779820d97f64a23920b9946f0ecaaffc4d7c32b917d3c07c7d387b75eb5eca',
  'hub-embed/vite.config.ts':'617dbbe87b2083719e187f3ff541f9e811a4955f273512335c99038592bca8df',
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
   expect(validKeepNativeManifest({...good,inputSha256:{...good.inputSha256,'hub-embed/entry.tsx':'e16a552e7562bd58974e91f7f21f1f970f173396c1bb8d2de3e2e0e7437c8d58'}})).toBe(false);
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
