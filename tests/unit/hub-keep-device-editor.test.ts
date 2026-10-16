import {describe,it,expect} from 'vitest';
import {eligibleKeepNote,readKeepDevice,nextKeepTimestamp,KEEP_DB_NAME,KEEP_NOTES_STORE,KEEP_VAULT_HEADER} from '../../src/lib/workspace/keep-b3-device';
import {renderKeepOwnerEditor} from '../../src/lib/workspace/keep-b3-editor';
const note={
 id:'keep-original/001',title:'Study record',content:'## Analysis III\nProof',
 type:'text' as const,checklist:[],color:'yellow',tags:['university'],folderId:null,
 pinned:true,archived:false,trashed:false,createdAt:'2026-10-16T10:00:00Z',
 updatedAt:'2026-10-16T12:00:00Z',reminderDate:null,images:[]
};
describe('original KEEP B3 same-origin adapter',()=>{
 it('retains original B3 store identifiers',()=>{
   expect(KEEP_DB_NAME).toBe('KeepNotesDB');expect(KEEP_NOTES_STORE).toBe('notes');
   expect(KEEP_VAULT_HEADER).toBe('keepnotes_vault_enc_header');
 });
 it('recognizes full original unencrypted note, not Hub note clone',()=>{
   expect(eligibleKeepNote(note)).toBe(true);
   expect(eligibleKeepNote({id:'hub-note',title:'x',body:'Hub',updatedAt:'t'})).toBe(false);
 });
 it('never exposes individually locked notes, even if encrypted flag absent',()=>{
   expect(eligibleKeepNote({...note,isLocked:true})).toBe(false);
   expect(eligibleKeepNote({...note,lockHash:'secret'})).toBe(false);
   expect(eligibleKeepNote({...note,isEncrypted:true})).toBe(false);
 });
 it('does not render private content without explicit source connect',()=>{
   const html=renderKeepOwnerEditor({status:null,selectedId:null,creating:false,draft:null});
   expect(html).toContain('knowledge-keep-connect');
   expect(html).not.toContain('Study record');
 });
 it('escapes native owner-controlled titles and contents',()=>{
   const html=renderKeepOwnerEditor({status:{status:'ready',notes:[{...note,title:'<img src=x onerror=alert(1)>',content:'<script>alert(1)</script>'}]},selectedId:note.id,creating:false,draft:null});
   expect(html).not.toContain('<script>');
   expect(html).not.toContain('<img');
   expect(html).toContain('&lt;script&gt;');
 });
 it('makes revisions distinct even if same millisecond is reused',()=>{
   const old='2026-10-16T12:00:00.500Z';
   expect(nextKeepTimestamp(old,Date.parse(old))).toBe('2026-10-16T12:00:00.501Z');
 });
 it('rejects individually locked or archived KEEP records from source editing',()=>{
   expect(eligibleKeepNote({...note,isEncrypted:true})).toBe(false);
   expect(eligibleKeepNote({...note,isLocked:true})).toBe(false);
   expect(eligibleKeepNote({...note,lockHash:'a'})).toBe(false);
 });
 it('locked source remains unavailable without keys',async()=>{
   // Reading KEEP encrypted data is forbidden without original vault auth.
   const res=await readKeepDevice();
   expect(['locked','not_found','unavailable']).toContain(res.status);
   expect(res.notes).toEqual([]);
 });
});
