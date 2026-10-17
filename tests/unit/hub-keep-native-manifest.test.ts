import {describe,it,expect} from 'vitest';
import {validKeepNativeManifest} from '../../src/scripts/keep-native-loader';
const hash='a'.repeat(64);
const good={
 format:'thiepn-keep-b3-original-react',schema:1,
 entry:'keep-b3-original.js',css:'keep-b3-original.css',
 sourceSha256:hash,jsSha256:hash,cssSha256:hash
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
 });
 it('requires three verifiable sha256 digests',()=>{
   expect(validKeepNativeManifest({...good,jsSha256:'unverified'})).toBe(false);
   expect(validKeepNativeManifest({...good,sourceSha256:null})).toBe(false);
   expect(validKeepNativeManifest({...good,cssSha256:'B'.repeat(64)})).toBe(false);
 });
 it('refuses empty, primitive and array manifests',()=>{
   for(const data of [null,undefined,0,'valid',[],{},false]){
     expect(validKeepNativeManifest(data)).toBe(false);
   }
 });
});
