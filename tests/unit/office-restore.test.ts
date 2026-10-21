import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument} from '../../src/lib/office/documents';
import {parseOfficeBackup,previewBackupRestore,MAX_BACKUP_BYTES} from '../../src/lib/office/restore';
import {backupDocuments} from '../../src/lib/office/library';
const at='2026-10-18T18:00:00.000Z';
const original=nextDocument(newDocument('authentic-id',at),0,'Original','# Detailed history',at);
const encode=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).buffer;
describe('Office O6 validated backup recovery',()=>{
 it('reads O3 backups without changing original IDs, revisions or content',()=>{
  const data=backupDocuments([original],at);
  const parsed=parseOfficeBackup(new TextEncoder().encode(data).buffer);
  expect(parsed.documents).toEqual([original]);
  expect(parsed.documents[0]?.history).toEqual(original.history);
 });
 it('marks exact ID collisions as skipped even when a title differs',()=>{
  expect(previewBackupRestore([original],[{...original,title:'Changed title'}])).toEqual({add:0,skip:1,full:false});
 });
 it('rejects duplicate IDs and unknown schema/fields fail-closed',()=>{
  const file={kind:'thiepn-hub-office-backup',schemaVersion:1,createdAt:at,documents:[original,original]};
  expect(()=>parseOfficeBackup(encode(file))).toThrow('duplicate IDs');
  expect(()=>parseOfficeBackup(encode({...file,documents:[],extra:'unexpected'}))).toThrow('Unsupported');
  expect(()=>parseOfficeBackup(encode({...file,schemaVersion:2,documents:[]}))).toThrow('Unsupported');
 });
 it('rejects damaged, unordered histories and bad unicode before any writes',()=>{
  const file={kind:'thiepn-hub-office-backup',schemaVersion:1,createdAt:at,documents:[{...original,history:[{...original.history[0]!,body:null}]}]};
  expect(()=>parseOfficeBackup(encode(file))).toThrow('invalid schema');
  expect(()=>parseOfficeBackup(new Uint8Array([255,0]).buffer)).toThrow('UTF-8');
  expect(()=>parseOfficeBackup(new Uint8Array(MAX_BACKUP_BYTES+1).buffer)).toThrow('20 MB');
 });
 it('reports overflow without assuming another owner or dropping history',()=>{
  const big=Array.from({length:100},(_,i)=>newDocument('id-'+i,at));
  expect(previewBackupRestore([original],big)).toEqual({add:1,skip:0,full:true});
 });
});
