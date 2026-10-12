import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync,chmodSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FIXED_SUITES} from '../../scripts/ci-r12-signed-admission.mjs';
import {prepareSyntheticWorkspace,verifySyntheticWorkspace,verifyWorkflowSources,sha256,expectedSourcePins,PURPOSE} from '../../scripts/ci-r13-synthetic-core.mjs';
const fixture=fn=>{const w=prepareSyntheticWorkspace();try{return fn(w);}finally{rmSync(w.dir,{force:true,recursive:true});expect(existsSync(w.dir)).toBe(false);}};
const workflowSources=()=>Object.fromEntries(Object.keys(FIXED_SUITES).map(n=>[n,readFileSync(new URL('../../.github/workflows/'+n,import.meta.url),'utf8')]));
describe('R13 synthetic-only offline runner admission and immutable input guard',()=>{
  it('creates deterministic fictional fixtures, six suites and three ancillary pins',()=>fixture(w=>{
    expect(verifySyntheticWorkspace(w.dir,w.manifestHash)).toEqual({valid:true,manifestHash:w.manifestHash,pinsVerified:6,externalPinsVerified:3});
    expect(Object.keys(expectedSourcePins().suitePins)).toHaveLength(6);
    expect(Object.keys(expectedSourcePins().externalPins)).toHaveLength(3);
    expect(readFileSync(join(w.dir,'payload.json'),'utf8')).toContain('fictional-local-fixture');
  }));
  it('refuses forged trusted-manifest SHA',()=>fixture(w=>expect(()=>verifySyntheticWorkspace(w.dir,'0'.repeat(64))).toThrow('MANIFEST_HASH_MISMATCH')));
  it('refuses changes to a prehashed synthetic asset',()=>fixture(w=>{chmodSync(join(w.dir,'synthetic.txt'),0o600);writeFileSync(join(w.dir,'synthetic.txt'),'changed');expect(()=>verifySyntheticWorkspace(w.dir,w.manifestHash)).toThrow('FILE_HASH_MISMATCH');}));
  it('refuses added unknown fixture files',()=>fixture(w=>{writeFileSync(join(w.dir,'extra'),'malicious');expect(()=>verifySyntheticWorkspace(w.dir,w.manifestHash)).toThrow('FIXTURE_UNEXPECTED_FILES');}));
  it('refuses link substitutions in place of synthetic data',()=>fixture(w=>{rmSync(join(w.dir,'synthetic.txt'));symlinkSync('/etc/hosts',join(w.dir,'synthetic.txt'));expect(()=>verifySyntheticWorkspace(w.dir,w.manifestHash)).toThrow('FIXTURE_NOT_REGULAR_FILE');}));
  it('refuses manifest tamper even if all payloads are left unchanged',()=>fixture(w=>{const p=join(w.dir,'manifest.json');chmodSync(p,0o600);writeFileSync(p,readFileSync(p,'utf8').replace(PURPOSE,'REAL_PRIVATE_CI'));expect(()=>verifySyntheticWorkspace(w.dir,w.manifestHash)).toThrow('MANIFEST_HASH_MISMATCH');}));
  it('rejects maliciously rehashed manifest with changed immutable Account pin',()=>fixture(w=>{const p=join(w.dir,'manifest.json');const manifest=JSON.parse(readFileSync(p,'utf8'));manifest.suitePins['hub-inbox-browser.yml'][0]='f'.repeat(40);chmodSync(p,0o600);const updated=JSON.stringify(manifest)+'\n';writeFileSync(p,updated);expect(()=>verifySyntheticWorkspace(w.dir,sha256(updated))).toThrow('SOURCE_PINS_MISMATCH');}));
  it('checks all six original checked-in public workflows without credentials',()=>{
    expect(verifyWorkflowSources(workflowSources())).toEqual({valid:true,workflowsVerified:6});
  });
  it('refuses removed public R1 fail-closed preflight',()=>{const x=workflowSources();x['hub-notes-browser.yml']=x['hub-notes-browser.yml'].replace('run: node scripts/hub-account-ci-boundary.mjs','run: true');expect(()=>verifyWorkflowSources(x)).toThrow('WORKFLOW_PIN_OR_GUARD_MISMATCH');});
  it('refuses moved checkout before preflight or changed Account pin',()=>{const x=workflowSources();x['hub-inbox-browser.yml']=x['hub-inbox-browser.yml'].replace('ref: '+FIXED_SUITES['hub-inbox-browser.yml'][0],'ref: '+'a'.repeat(40));expect(()=>verifyWorkflowSources(x)).toThrow('WORKFLOW_PIN_OR_GUARD_MISMATCH');});
  it('refuses a privileged public workflow or additional workflow entry',()=>{const x=workflowSources();x['hub-integration.yml']+='\npull_request_target:\n';expect(()=>verifyWorkflowSources(x)).toThrow('WORKFLOW_PRIVILEGE_DRIFT');delete x['hub-integration.yml'];expect(()=>verifyWorkflowSources(x)).toThrow('WORKFLOW_SET_MISMATCH');});
});
