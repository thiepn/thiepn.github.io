import {describe,it,expect} from 'vitest';
import {keepChecksum,recordKeepRevision,keepRevisionList,prepareKeepRevisionRestore} from '../../src/lib/workspace/keep-b3-revisions';
import type {KeepOwnerNote} from '../../src/lib/workspace/keep-b3-device';
const base=(content='Version 0'):KeepOwnerNote=>({
  id:'original-keep-b3-id',title:'Original note',content,type:'text',checklist:[],
  color:'yellow',tags:['study'],folderId:null,pinned:false,archived:false,trashed:false,
  images:[],createdAt:'2026-10-17T07:00:00Z',updatedAt:'2026-10-17T07:00:01Z',reminderDate:null
});
describe('original KEEP B3 P29 bounded revisions integrated in Hub',()=>{
 it('uses original KEEP deterministic FNV-1a checksum',()=>{
   expect(keepChecksum('')).toBe('811c9dc5811c9dc5');
   expect(keepChecksum('abc')).toHaveLength(16);
   expect(keepChecksum('abc')).toBe(keepChecksum('abc'));
   expect(keepChecksum('abc')).not.toBe(keepChecksum('abd'));
 });
 it('captures a pre-edit checkpoint in the original owner record',()=>{
   const note=base();
   const checkpoint=recordKeepRevision(note,note.content,'before_destructive_edit',new Date('2026-10-17T07:00:02Z'));
   expect(checkpoint.id).toBe(note.id);
   expect(keepRevisionList(checkpoint)[0]).toMatchObject({noteId:note.id,content:'Version 0',trigger:'before_destructive_edit'});
   expect(note.revisions).toBeUndefined();
 });
 it('stores future content using original P29 revision version sequence',()=>{
   const note=base();
   const previous=recordKeepRevision(note,note.content,'before_destructive_edit');
   const next=recordKeepRevision(previous,'Version 1','auto_coalesced');
   expect(keepRevisionList(next).map(r=>r.version)).toEqual([1,2]);
   expect(next.tags).toEqual(['study']);
 });
 it('coalesces auto revisions within original five-minute window',()=>{
   const note=base();
   const a=recordKeepRevision(note,'First','auto_coalesced',new Date('2026-10-17T07:00:00Z'));
   const b=recordKeepRevision(a,'Second','auto_coalesced',new Date('2026-10-17T07:01:00Z'));
   expect(keepRevisionList(b)).toHaveLength(1);
   expect(keepRevisionList(b)[0]?.content).toBe('Second');
 });
 it('bounds revisions to original P29 fifty-record limit',()=>{
   let note=base();
   for(let i=0;i<55;i++)note=recordKeepRevision(note,'version '+i,'manual_checkpoint',new Date(Date.UTC(2026,9,17,8,0,i)));
   expect(keepRevisionList(note)).toHaveLength(50);
   expect(keepRevisionList(note).at(-1)?.version).toBe(55);
 });
 it('restores a verified original note revision and retains a pre-restore checkpoint',()=>{
   const first=recordKeepRevision(base('Before'),'Before','manual_checkpoint');
   const current={...first,content:'Now'};
   const restored=prepareKeepRevisionRestore(current,keepRevisionList(first)[0]!.id);
   expect(restored).toMatchObject({id:current.id,content:'Before',title:current.title});
   expect(keepRevisionList(restored!)).toHaveLength(2);
   expect(keepRevisionList(restored!).at(-1)?.trigger).toBe('pre_restore');
 });
 it('refuses tampered checksum and does not change owner source',()=>{
   const original=recordKeepRevision(base('Before'),'Before','manual_checkpoint');
   const forged={...original,revisions:keepRevisionList(original).map(r=>({...r,content:'forged'}))};
   expect(prepareKeepRevisionRestore(forged,keepRevisionList(original)[0]!.id)).toBeNull();
   expect(original.content).toBe('Before');
 });
 it('rejects incompatible legacy entries rather than silently deleting them',()=>{
   const legacy=base() as KeepOwnerNote;
   legacy.revisions=[{id:'legacy',title:'Old',content:'Old',timestamp:'2026-10-17T07:00:00Z'}];
   expect(()=>recordKeepRevision(legacy,'New')).toThrow(/legacy revision/);
   expect(legacy.revisions).toHaveLength(1);
 });
});
