/** Node built-in tests runnable without npm downloads, synthetic fixtures only. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareSyntheticWorkspace,verifySyntheticWorkspace,sha256,PURPOSE} from '../../scripts/ci-r13-synthetic-core.mjs';
const work=f=>{const w=prepareSyntheticWorkspace();try{f(w);}finally{rmSync(w.dir,{recursive:true,force:true});assert.equal(existsSync(w.dir),false);}};
test('fixture hashes and pinned metadata PASS',()=>work(w=>assert.equal(verifySyntheticWorkspace(w.dir,w.manifestHash).valid,true)));
test('wrong trusted manifest digest denied',()=>work(w=>assert.throws(()=>verifySyntheticWorkspace(w.dir,'0'.repeat(64)),/MANIFEST_HASH_MISMATCH/)));
test('mutated payload SHA denied',()=>work(w=>{let p=join(w.dir,'payload.json');chmodSync(p,0o600);writeFileSync(p,'tampered');assert.throws(()=>verifySyntheticWorkspace(w.dir,w.manifestHash),/FILE_HASH_MISMATCH/);}));
test('extra file denied',()=>work(w=>{writeFileSync(join(w.dir,'evil'),'x');assert.throws(()=>verifySyntheticWorkspace(w.dir,w.manifestHash),/FIXTURE_UNEXPECTED_FILES/);}));
test('symlink denied',()=>work(w=>{rmSync(join(w.dir,'synthetic.txt'));symlinkSync('/etc/hosts',join(w.dir,'synthetic.txt'));assert.throws(()=>verifySyntheticWorkspace(w.dir,w.manifestHash),/FIXTURE_NOT_REGULAR_FILE/);}));
test('forged signed pin digest still denied',()=>work(w=>{const p=join(w.dir,'manifest.json');const m=JSON.parse(readFileSync(p,'utf8'));m.externalPins['h20-library']='a'.repeat(40);chmodSync(p,0o600);const s=JSON.stringify(m)+'\n';writeFileSync(p,s);assert.throws(()=>verifySyntheticWorkspace(w.dir,sha256(s)),/SOURCE_PINS_MISMATCH/);}));
test('real local network-namespace and cleanup PASS or fail CLOSED',()=>{const runner=fileURLToPath(new URL('../../scripts/ci-r13-synthetic-runner.mjs',import.meta.url));const r=spawnSync(process.execPath,[runner],{encoding:'utf8',timeout:25000});assert.equal(r.status,0,r.stderr||r.stdout);const result=JSON.parse(r.stdout);assert.equal(result.purpose,PURPOSE);assert.equal(result.status,'PASS_SYNTHETIC_NETWORK_NAMESPACE_ONLY');assert.equal(result.cleanup,'PASS');assert.equal(result.fullFilesystemIsolation,false);assert.equal(result.executionAllowed,false);assert.equal(result.checks.length,5);});
