/**
 * R13 source-only, synthetic data exclusively. This package NEVER downloads,
 * decrypts, checks out, or executes private Account material.
 */
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync, readdirSync, lstatSync, chmodSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FIXED_SUITES, FIXED_EXTERNAL, canonical} from './ci-r12-signed-admission.mjs';

export const PURPOSE='THIEPN_CI_R13_SYNTHETIC_ONLY';
export const HEAD='da9a7276bb1e4bca1bcc7e4da3e0a4d732c1fabc'; // Pinned R12 parent, not an execution entitlement.
export const SYNTHETIC_PAYLOAD={kind:'fictional-local-fixture',subject:'test-only-no-user-data',items:['alpha','beta','gamma']};
export const SYNTHETIC_TEXT='R13 OFFLINE FICTIONAL TEST ASSET; NO PRIVATE SOURCE\n';
export const sha256=x=>createHash('sha256').update(x).digest('hex');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const exact=(a,b)=>canonical(a)===canonical(b);
const validEntries=(d)=>{
  const expected=['manifest.json','payload.json','synthetic.txt'];
  const items=readdirSync(d).sort();
  if (!exact(items,expected.sort()))throw new Error('FIXTURE_UNEXPECTED_FILES');
  for(const name of items){const st=lstatSync(join(d,name));if(!st.isFile()||st.isSymbolicLink())throw new Error('FIXTURE_NOT_REGULAR_FILE:'+name);if(st.size>65536)throw new Error('FIXTURE_OVERSIZED:'+name);}
};
export function expectedSourcePins(){return {suitePins:structuredClone(FIXED_SUITES),externalPins:structuredClone(FIXED_EXTERNAL)};}
export function prepareSyntheticWorkspace(base=tmpdir()) {
  const dir=mkdtempSync(join(base,'thiepn-r13-synthetic-'));
  try{
    const contents={'payload.json':canonical(SYNTHETIC_PAYLOAD)+'\n','synthetic.txt':SYNTHETIC_TEXT};
    const manifest={schemaVersion:1,purpose:PURPOSE,sourceBaseHead:HEAD,...expectedSourcePins(),fileHashes:Object.fromEntries(Object.entries(contents).map(([n,txt])=>[n,sha256(txt)]))};
    for(const [name,txt] of Object.entries(contents))writeFileSync(join(dir,name),txt,{mode:0o400,flag:'wx'});
    const str=canonical(manifest)+'\n';
    writeFileSync(join(dir,'manifest.json'),str,{mode:0o400,flag:'wx'});
    for(const n of Object.keys(contents).concat('manifest.json'))chmodSync(join(dir,n),0o400);
    return {dir,manifestHash:sha256(str),fileHashes:manifest.fileHashes};
  }catch(e){rmSync(dir,{force:true,recursive:true});throw e;}
}
export function verifySyntheticWorkspace(dir, trustedManifestHash){
  validEntries(dir);
  const source=readFileSync(join(dir,'manifest.json'));
  if(!/^[a-f0-9]{64}$/.test(trustedManifestHash||'')||sha256(source)!==trustedManifestHash)throw new Error('MANIFEST_HASH_MISMATCH');
  let m;
  try {m=JSON.parse(source.toString('utf8'));}catch{throw new Error('MANIFEST_INVALID_JSON');}
  const keys=['schemaVersion','purpose','sourceBaseHead','suitePins','externalPins','fileHashes'];
  if(Object.keys(m).length!==keys.length||keys.some(k=>!own(m,k)))throw new Error('MANIFEST_SCHEMA_INVALID');
  if(m.schemaVersion!==1||m.purpose!==PURPOSE||m.sourceBaseHead!==HEAD)throw new Error('MANIFEST_IDENTITY_MISMATCH');
  const pins=expectedSourcePins();
  if(!exact(m.suitePins,pins.suitePins)||!exact(m.externalPins,pins.externalPins))throw new Error('SOURCE_PINS_MISMATCH');
  const expectedNames=['payload.json','synthetic.txt'];
  if(!exact(Object.keys(m.fileHashes).sort(),expectedNames))throw new Error('FILE_HASH_SCHEMA_MISMATCH');
  for(const n of expectedNames){if(!/^[a-f0-9]{64}$/.test(m.fileHashes[n])||sha256(readFileSync(join(dir,n)))!==m.fileHashes[n])throw new Error('FILE_HASH_MISMATCH:'+n);}
  if(readFileSync(join(dir,'payload.json'),'utf8')!==canonical(SYNTHETIC_PAYLOAD)+'\n'||readFileSync(join(dir,'synthetic.txt'),'utf8')!==SYNTHETIC_TEXT)throw new Error('FICTIONAL_FIXTURE_ONLY');
  return {valid:true,manifestHash:trustedManifestHash,pinsVerified:6,externalPinsVerified:3};
}

/** Validate actual workflow texts supplied by a trusted independent repository read. */
export function verifyWorkflowSources(workflows) {
  const expected=FIXED_SUITES;
  if (!workflows || !exact(Object.keys(workflows).sort(),Object.keys(expected).sort()))throw new Error('WORKFLOW_SET_MISMATCH');
  for(const [name,[sha,config]] of Object.entries(expected)){
    const body=workflows[name];
    if(typeof body!=='string')throw new Error('WORKFLOW_NOT_TEXT:'+name);
    const guard=body.indexOf('run: node scripts/hub-account-ci-boundary.mjs');
    const checkout=body.indexOf('repository: thiepn/account');
    if(guard<0||checkout<=guard||!body.includes('ref: '+sha)||!body.includes('npx playwright test -c '+config))throw new Error('WORKFLOW_PIN_OR_GUARD_MISMATCH:'+name);
    if(!body.includes('permissions:\n  contents: read')||/pull_request_target\s*:/.test(body)||/token:\s*\$\{\{\s*secrets\./.test(body))throw new Error('WORKFLOW_PRIVILEGE_DRIFT:'+name);
  }
  return {valid:true,workflowsVerified:6};
}
