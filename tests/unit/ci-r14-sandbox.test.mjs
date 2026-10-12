import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync,chmodSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareSyntheticBundle,inspectBundle,disposeSyntheticBundle,sha256,FIXTURE,PURPOSE} from '../../scripts/ci-r14-sandbox-core.mjs';
const worker=fileURLToPath(new URL('../../scripts/ci-r14-sandbox-worker.mjs',import.meta.url));
function scenario(callback){const b=prepareSyntheticBundle({workerPath:worker});try{callback(b);}finally{expect(disposeSyntheticBundle(b)).toBe(true);}}
describe('CI R14 synthetic-only filesystem preparation, immutable evidence and refusal',()=>{
 it('prepares pinned fictional bundle and local runtime without online downloads',()=>scenario(b=>{expect(inspectBundle(b.assets,b.expectedManifestHash).fixtureSha256).toBe(sha256(FIXTURE));expect(b.workerSha256).toMatch(/^[a-f0-9]{64}$/);expect(b.runtimeSha256).toMatch(/^[a-f0-9]{64}$/);}));
 it('rejects forged manifest SHA',()=>scenario(b=>expect(()=>inspectBundle(b.assets,'b'.repeat(64))).toThrow('UNTRUSTED_MANIFEST')));
 it('rejects tampered fixture even when manifest unchanged',()=>scenario(b=>{const p=join(b.assets,'fixture.txt');chmodSync(p,0o644);writeFileSync(p,'changed');expect(()=>inspectBundle(b.assets,b.expectedManifestHash)).toThrow('FICTIONAL_PAYLOAD_CHANGED');}));
 it('rejects added payload file',()=>scenario(b=>{writeFileSync(join(b.assets,'new-file'),'bad');expect(()=>inspectBundle(b.assets,b.expectedManifestHash)).toThrow('UNEXPECTED_FIXTURE_PATH');}));
 it('rejects filesystem symlink pointing outside sandbox',()=>scenario(b=>{rmSync(join(b.assets,'fixture.txt'));symlinkSync('/etc/passwd',join(b.assets,'fixture.txt'));expect(()=>inspectBundle(b.assets,b.expectedManifestHash)).toThrow('UNSAFE_FIXTURE_FILE');}));
 it('rejects rehashed manifest changes to purpose',()=>scenario(b=>{const p=join(b.assets,'manifest.json');const d=JSON.parse(readFileSync(p,'utf8'));d.purpose='REAL_PRIVATE_CI';chmodSync(p,0o644);const s=JSON.stringify(d)+'\n';writeFileSync(p,s);expect(()=>inspectBundle(b.assets,sha256(s))).toThrow('UNEXPECTED_MANIFEST_SCHEMA');}));
 it('rejects missing real worker rather than creating a fake pass',()=>expect(()=>prepareSyntheticBundle({workerPath:'/nonexistent'})).toThrow());
 it('retains read-only NO_GO identity and does not load private source',()=>{expect(PURPOSE).toBe('THIEPN_R14_SYNTHETIC_SANDBOX');expect(FIXTURE).toBe('R14 FICTIONAL DATA ONLY\n');});
});
