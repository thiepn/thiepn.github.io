import { describe, it, expect } from 'vitest';
import { qualify, GATES, INTEGRATIONS } from '../../scripts/h20-release-gate.mjs';
const candidate = 'a'.repeat(40), now = Date.parse('2026-10-05T18:00:00Z');
const owners = Object.fromEntries(['account','library','notes','tms60'].map(k=>[k,'b'.repeat(40)]));
const manifest = {schemaVersion:1, productionActivation:'blocked', owners};
const records = () => INTEGRATIONS.flatMap(integration=>GATES.map(gate=>({integration,gate,status:'passed',candidate,owners,
 observedAt:'2026-10-05T17:00:00Z',tester:'Fictional test fixture',mode:gate.endsWith('-physical')?'physical':'observed',
 device:{model:'Fictional device',os:'Fictional OS',browser:'Fictional browser',browserVersion:'1'},
 artifact:'evidence/h20/artifacts/fictional.json',sha256:'c'.repeat(64)})));
const options = {candidate,now,artifactHash:()=> 'c'.repeat(64)};
describe('H20 activation evidence',()=>{
 it('blocks absent evidence rather than interpreting staging tests as certification',()=>{
  expect(Object.values(qualify(manifest,[],options)).every(s=>!s.ready)).toBe(true);
 });
 it('requires every gate and permits independently qualified integrations',()=>{
  const r=records().filter(r=>r.integration==='capture'); const result=qualify(manifest,r,options);
  expect(result.capture!.ready).toBe(true);expect(result.reading!.ready).toBe(false);
 });
 it('rejects emulator reports substituted for physical devices',()=>{
  const r=records();r.find(r=>r.gate.endsWith('-physical'))!.mode='emulated';
  expect(()=>qualify(manifest,r,options)).toThrow();
 });
 it('blocks evidence for another Hub build',()=>{
  expect(Object.values(qualify(manifest,records(),{...options,candidate:'d'.repeat(40)})).every(s=>!s.ready)).toBe(true);
 });
 it('rejects changed owner revisions, stale evidence and altered artifacts',()=>{
  const r=records();r[0]!.owners={...owners,account:'d'.repeat(40)};
  expect(()=>qualify(manifest,r,options)).toThrow();
  expect(()=>qualify(manifest,records(),{...options,now:now+8*86400000})).toThrow();
  expect(()=>qualify(manifest,records(),{...options,artifactHash:()=> 'd'.repeat(64)})).toThrow();
 });
});
