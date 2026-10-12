import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,chmodSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareSyntheticBundle,inspectBundle,disposeSyntheticBundle,sha256,FIXTURE} from '../../scripts/ci-r14-sandbox-core.mjs';
import {runSyntheticSandbox} from '../../scripts/ci-r14-sandbox-runner.mjs';
const worker=fileURLToPath(new URL('../../scripts/ci-r14-sandbox-worker.mjs',import.meta.url));
function withBundle(fn){const b=prepareSyntheticBundle({workerPath:worker});try{return fn(b);}finally{assert.equal(disposeSyntheticBundle(b),true);}}
test('fictional offline bundle verifies exact runtime and asset hashes',()=>withBundle(b=>{const m=inspectBundle(b.assets,b.expectedManifestHash);assert.equal(m.fixtureSha256,sha256(FIXTURE));assert.equal(b.runtimeSha256.length,64);assert.equal(b.workerSha256.length,64);}));
test('changed manifest hash is denied',()=>withBundle(b=>assert.throws(()=>inspectBundle(b.assets,'f'.repeat(64)),/UNTRUSTED_MANIFEST/)));
test('mutated fixture bytes denied even when manifest stays unchanged',()=>withBundle(b=>{const f=join(b.assets,'fixture.txt');chmodSync(f,0o644);writeFileSync(f,'FORGED DATA');assert.throws(()=>inspectBundle(b.assets,b.expectedManifestHash),/FICTIONAL_PAYLOAD_CHANGED/);}));
test('unexpected extra file is rejected',()=>withBundle(b=>{writeFileSync(join(b.assets,'extra.txt'),'x');assert.throws(()=>inspectBundle(b.assets,b.expectedManifestHash),/UNEXPECTED_FIXTURE_PATH/);}));
test('symlink replacement is rejected',()=>withBundle(b=>{chmodSync(b.assets,0o700);rmSync(join(b.assets,'fixture.txt'));symlinkSync('/etc/passwd',join(b.assets,'fixture.txt'));assert.throws(()=>inspectBundle(b.assets,b.expectedManifestHash),/UNSAFE_FIXTURE_FILE/);}));
test('rehashed forged manifest schema is rejected',()=>withBundle(b=>{const p=join(b.assets,'manifest.json');const m=JSON.parse(readFileSync(p,'utf8'));m.purpose='PRIVATE_ACCOUNT_BUILD';chmodSync(p,0o644);const content=JSON.stringify(m)+'\n';writeFileSync(p,content);assert.throws(()=>inspectBundle(b.assets,sha256(content)),/UNEXPECTED_MANIFEST_SCHEMA/);}));
test('real kernel mount/network/chroot no host-files/socket/egress and cleanup',async()=>{const r=await runSyntheticSandbox();assert.equal(r.status,'PASS_SYNTHETIC_READONLY_CHROOT_AND_NETNS',JSON.stringify(r));assert.equal(r.cleanup,'PASS');assert.equal(r.executionAllowed,false);assert.equal(r.fullIsolationProven,false);assert.equal(r.checks.length,8);assert.ok(r.checks.every(x=>x.status==='PASS'));});
test('unsupported namespace fails closed and still cleans up',async()=>{const r=await runSyntheticSandbox({unshare:'/nonexistent/unshare'});assert.equal(r.status,'FAIL_CLOSED');assert.equal(r.cleanup,'PASS');assert.equal(r.executionAllowed,false);});
