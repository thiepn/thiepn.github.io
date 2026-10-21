import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument,restoreDocument,validateDocument,documentFilename,MAX_HISTORY} from '../../src/lib/office/documents';
describe('Hub Office isolated document model',()=>{
 const now='2026-10-18T00:00:00.000Z';
 it('creates a versioned document without modifying Hub v1 schema',()=>expect(newDocument('abc',now)).toMatchObject({schemaVersion:1,revision:0,body:'',history:[]}));
 it('saves and restores earlier content without discarding present revision',()=>{
  const first=nextDocument(newDocument('id',now),0,'Paper','# Draft',now);
  const second=nextDocument(first,1,'Paper','# Edited',now);
  const restored=restoreDocument(second,1,now);
  expect(restored.body).toBe('# Draft');expect(restored.revision).toBe(3);
  expect(restored.history.at(-1)?.body).toBe('# Edited');
 });
 it('rejects old-version writes and never overwrites unseen edits',()=>{
  const d=nextDocument(newDocument('id',now),0,'Paper','one',now);
  expect(()=>nextDocument(d,0,'Paper','two',now)).toThrow();
 });
 it('keeps last twelve recoverable snapshots',()=>{
  let doc=newDocument('id',now);
  for(let i=0;i<20;i++)doc=nextDocument(doc,doc.revision,'Paper',String(i),now);
  expect(doc.history).toHaveLength(MAX_HISTORY);expect(doc.history[0]?.revision).toBe(8);
 });
 it('fails closed on unknown version or malformed history',()=>{
  expect(()=>validateDocument({...newDocument('id',now),schemaVersion:2})).toThrow();
  expect(()=>validateDocument({...newDocument('id',now),history:[{revision:0,title:'x',body:'x',updatedAt:now}]})).toThrow();
 });
 it('caps content and sanitizes export names',()=>{
  expect(()=>nextDocument(newDocument('id',now),0,'Doc','x'.repeat(200001),now)).toThrow();
  expect(documentFilename('../paper:/draft.')).not.toMatch(/[\\/:*?"<>|]/);
 });
});
