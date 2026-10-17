/**
 * Source-owned KEEP B3 device adapter.
 * Exact schema/store identifiers from original src/services/storage.ts (B3).
 * No schema upgrades, seeding, migrations, fallback writes, decryption,
 * authorization token reuse, or Hub record copies.
 */
import {recordKeepRevision,prepareKeepRevisionRestore} from './keep-b3-revisions';
export const KEEP_DB_NAME = 'KeepNotesDB';
export const KEEP_NOTES_STORE = 'notes';
export const KEEP_VAULT_HEADER = 'keepnotes_vault_enc_header';
export const KEEP_FALLBACK = 'keepnotes_notes';
export interface KeepOwnerNote {
  id: string; title: string; content: string;
  type: 'text'|'checklist';
  checklist: Array<{id:string;text:string;completed:boolean}>;
  tags:string[]; folderId:string|null; pinned:boolean;
  archived:boolean; trashed:boolean; isLocked?:boolean; lockHash?:string;
  createdAt:string; updatedAt:string; color:string; reminderDate:string|null;
  images:unknown[]; linkedNoteIds?:string[];
  [key:string]:unknown;
}
export type KeepDeviceResult = {status:'ready';notes:KeepOwnerNote[]} |
  {status:'not_found'|'locked'|'unavailable';notes:[];detail:string};
/** Clock-safe revision: never reuse the source's prior timestamp. */
export function nextKeepTimestamp(previous:string, now=Date.now()):string{
  const earlier=Date.parse(previous);
  return new Date(Math.max(now,Number.isFinite(earlier)?earlier+1:now)).toISOString();
}
/** In-memory one-step undo; never persisted to Hub storage or shared with another user. */
export interface KeepEditReceipt {
  original:KeepOwnerNote;
  writtenAt:string;
}
/** Checked inside the original IndexedDB transaction. Rejected on identity/masking changes. */
export type KeepWriteAuthorization = () => boolean;
export class KeepDeviceAuthorizationExpired extends Error {
  constructor(){super('Hub source session changed; original KEEP write refused.');}
}
/** Abort a pending original owner write if the Hub authorization generation is revoked. */
function attachOwnerAbort(tx:IDBTransaction,signal:AbortSignal):()=>void {
  const onAbort=()=>{try{tx.abort();}catch{/* Transaction already closed */}};
  if(signal.aborted)onAbort();
  else signal.addEventListener('abort',onAbort,{once:true});
  return ()=>signal.removeEventListener('abort',onAbort);
}
export function keepWriteAuthorized(allowed:KeepWriteAuthorization):boolean {
  try{return allowed()===true;}catch{return false;}
}
export class KeepDeviceConflict extends Error {
  constructor(){super('KEEP changed in another tab. Reopen its original record before editing.');}
}
export function eligibleKeepNote(v:unknown):v is KeepOwnerNote {
  if(!v||typeof v!=='object'||Array.isArray(v))return false;
  const n=v as Record<string,unknown>;
  return !n.isEncrypted && !n.isLocked && !n.lockHash &&
    typeof n.id==='string' && n.id.length>0 && n.id.length<=256 &&
    typeof n.title==='string' && n.title.length<=1000 &&
    typeof n.content==='string' && n.content.length<=500000 &&
    (n.type==='text'||n.type==='checklist') &&
    Array.isArray(n.checklist) && typeof n.updatedAt==='string' &&
    typeof n.createdAt==='string' && typeof n.pinned==='boolean' &&
    typeof n.archived==='boolean' && typeof n.trashed==='boolean' &&
    Array.isArray(n.tags) && Array.isArray(n.images);
}
function vaultAllowed():boolean {
  try { return localStorage.getItem(KEEP_VAULT_HEADER)===null; }
  catch { return false; }
}
/** Abort if storage introspection is unavailable. Never create an empty KEEP database. */
async function connectExisting():Promise<IDBDatabase> {
  if(!vaultAllowed())throw new Error('KEEP encrypted vault is locked to Hub. Unlock in the original KEEP application.');
  if(typeof indexedDB.databases!=='function')throw new Error('Browser cannot safely inspect existing KEEP storage.');
  const existing=await indexedDB.databases();
  if(!existing.some(db=>db.name===KEEP_DB_NAME))throw new Error('No same-origin KEEP database found.');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const open=indexedDB.open(KEEP_DB_NAME);
    open.onupgradeneeded=()=>{open.transaction?.abort();reject(new Error('KEEP schema initialization is forbidden in Hub.'));};
    open.onerror=()=>reject(open.error??new Error('KEEP IndexedDB unavailable'));
    open.onblocked=()=>reject(new Error('KEEP storage is busy in another tab'));
    open.onsuccess=()=>resolve(open.result);
  });
  db.onversionchange=()=>db.close();
  if(db.version!==1){db.close();throw new Error('KEEP schema version is not B3 v1; use the original application.');}
  if(!db.objectStoreNames.contains(KEEP_NOTES_STORE)){db.close();throw new Error('KEEP notes store is absent.');}
  if(!vaultAllowed()){db.close();throw new Error('KEEP vault became protected.');}
  return db;
}
export async function readKeepDevice():Promise<KeepDeviceResult>{
  if(!vaultAllowed())return {status:'locked',notes:[],detail:'KEEP encryption is enabled. Hub does not access its keys or plaintext.'};
  let db:IDBDatabase;
  try {db=await connectExisting();}
  catch(e){const message=e instanceof Error?e.message:'KEEP data unavailable';
    return {status:message.includes('No same-origin')?'not_found':'unavailable',notes:[],detail:message};}
  try{
    const rows=await new Promise<unknown[]>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readonly');
      const req=tx.objectStore(KEEP_NOTES_STORE).getAll();
      req.onsuccess=()=>resolve(req.result as unknown[]);
      req.onerror=()=>reject(req.error);
      tx.onabort=()=>reject(tx.error);
    });
    if(!vaultAllowed()||rows.some(r=>!!r&&typeof r==='object'&&'isEncrypted' in r&&
      (r as {isEncrypted?:unknown}).isEncrypted===true))
      return {status:'locked',notes:[],detail:'KEEP vault encryption is active; original app unlock is required.'};
    if(rows.length>10000)return {status:'unavailable',notes:[],detail:'KEEP contains too many records for this safe view.'};
    return {status:'ready',notes:rows.filter(eligibleKeepNote).filter(n=>!n.trashed&&!n.archived)};
  }catch(e){return {status:'unavailable',notes:[],detail:e instanceof Error?e.message:'Read failed'};}
  finally {db.close();}
}
/** Create one original KEEP B3 note only inside an existing unencrypted owner database. */
export async function createKeepDeviceNote(changes:{title:string;content:string;pinned:boolean}, allowed:KeepWriteAuthorization,signal:AbortSignal):Promise<string>{
  if(!changes.title.trim()||changes.title.length>1000||changes.content.length>500000)
    throw new Error('Invalid KEEP note title or content.');
  if(signal.aborted||!keepWriteAuthorized(allowed))throw new KeepDeviceAuthorizationExpired();
  const db=await connectExisting();
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const original:KeepOwnerNote={
    id,title:changes.title.trim(),content:changes.content,type:'text',checklist:[],color:'default',tags:[],
    folderId:null,pinned:changes.pinned,archived:false,trashed:false,createdAt:now,updatedAt:now,
    reminderDate:null,images:[],linkedNoteIds:[]
  };
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite');
      const detach=attachOwnerAbort(tx,signal);
      let cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      if(!vaultAllowed())abort(new Error('KEEP vault changed; creation refused.'));
      else if(!keepWriteAuthorized(allowed))abort(new KeepDeviceAuthorizationExpired());
      else tx.objectStore(KEEP_NOTES_STORE).add(original);
      tx.oncomplete=()=>{detach();resolve();};
      tx.onabort=()=>{detach();reject(cause??tx.error??new Error('KEEP creation aborted.'));};
      tx.onerror=()=>{};
    });
    return id;
  } finally {db.close();}
}

/** Original B3 note ID + fields, revision-guarded, single-record atomic transaction. */
export async function updateKeepDevice(
  id:string,originalUpdatedAt:string,changes:{title:string;content:string;pinned:boolean},allowed:KeepWriteAuthorization,signal:AbortSignal
):Promise<KeepEditReceipt>{
  if(!changes.title.trim()||changes.title.length>1000||changes.content.length>500000)
    throw new Error('KEEP title/content outside original editor limits.');
  if(signal.aborted||!keepWriteAuthorized(allowed))throw new KeepDeviceAuthorizationExpired();
  const db=await connectExisting();
  try{
    return await new Promise<KeepEditReceipt>((resolve,reject)=>{
      let receipt:KeepEditReceipt|null=null;
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite');
      const detach=attachOwnerAbort(tx,signal);
      const store=tx.objectStore(KEEP_NOTES_STORE);
      let cause:Error|null=null;
      const abort=(err:Error)=>{cause=err;tx.abort();};
      const row=store.get(id);
      row.onsuccess=()=>{
        if(!vaultAllowed())return abort(new Error('KEEP vault changed during edit.'));
        if(!keepWriteAuthorized(allowed))return abort(new KeepDeviceAuthorizationExpired());
        const record:unknown=row.result;
        if(!eligibleKeepNote(record)||record.archived||record.trashed||
            record.updatedAt!==originalUpdatedAt) return abort(new KeepDeviceConflict());
        const changed=record.content!==changes.content||record.title!==changes.title.trim();
        const tracked=changed?
          recordKeepRevision(recordKeepRevision(record,record.content,'before_destructive_edit'),
            changes.content,'auto_coalesced'):record;
        const next={...tracked,title:changes.title.trim(),content:changes.content,pinned:changes.pinned,updatedAt:nextKeepTimestamp(record.updatedAt)};
        receipt={original:structuredClone(record),writtenAt:next.updatedAt};
        store.put(next);
      };
      row.onerror=()=>abort(new Error('KEEP source note could not be read.'));
      tx.oncomplete=()=>{detach();receipt?resolve(receipt):reject(new Error('KEEP edit did not apply.'));};
      tx.onerror=()=>{ /* rejection on abort handles the error */ };
      tx.onabort=()=>{detach();reject(cause??tx.error??new Error('KEEP device edit was cancelled.'));};
    });
  }finally{db.close();}
}

/** Toggle one original KEEP checklist entry without translating it to a Hub task. */
export async function toggleKeepDeviceChecklist(noteId:string,revision:string,itemId:string,allowed:KeepWriteAuthorization,signal:AbortSignal):Promise<KeepEditReceipt>{
  if(signal.aborted||!keepWriteAuthorized(allowed))throw new KeepDeviceAuthorizationExpired();
  const db=await connectExisting();
  try {
    return await new Promise<KeepEditReceipt>((resolve,reject)=>{
      let receipt:KeepEditReceipt|null=null;
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite'),store=tx.objectStore(KEEP_NOTES_STORE);
      const detach=attachOwnerAbort(tx,signal);
      let cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      const get=store.get(noteId);
      get.onsuccess=()=>{
        const raw=get.result;
        if(!keepWriteAuthorized(allowed))return abort(new KeepDeviceAuthorizationExpired());
        if(!vaultAllowed()||!eligibleKeepNote(raw)||raw.archived||raw.trashed||raw.updatedAt!==revision)
          return abort(new KeepDeviceConflict());
        const matches=raw.checklist.filter(item=>item.id===itemId);
        if(matches.length!==1)return abort(new Error('Original KEEP checklist item changed.'));
        const next={...raw,updatedAt:nextKeepTimestamp(raw.updatedAt),
          checklist:raw.checklist.map(item=>item.id===itemId?{...item,completed:!item.completed}:item)};
        receipt={original:structuredClone(raw),writtenAt:next.updatedAt};
        store.put(next);
      };
      get.onerror=()=>abort(new Error('Original KEEP note is unavailable.'));
      tx.oncomplete=()=>{detach();receipt?resolve(receipt):reject(new Error('KEEP checklist edit did not apply.'));};
      tx.onabort=()=>{detach();reject(cause??tx.error??new Error('KEEP checklist update was refused.'));};
      tx.onerror=()=>{};
    });
  }finally{db.close();}
}

/** One-step guarded source recovery. The original record is retained only in RAM. */
export async function undoKeepDeviceEdit(receipt:KeepEditReceipt,allowed:KeepWriteAuthorization,signal:AbortSignal):Promise<void>{
  if(!eligibleKeepNote(receipt.original))throw new Error('Invalid KEEP undo receipt.');
  if(signal.aborted||!keepWriteAuthorized(allowed))throw new KeepDeviceAuthorizationExpired();
  const db=await connectExisting();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite');
      const detach=attachOwnerAbort(tx,signal);
      const store=tx.objectStore(KEEP_NOTES_STORE);
      let cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      const get=store.get(receipt.original.id);
      get.onsuccess=()=>{
        const current=get.result;
        if(!keepWriteAuthorized(allowed))return abort(new KeepDeviceAuthorizationExpired());
        if(!vaultAllowed()||!eligibleKeepNote(current)||current.archived||current.trashed||
          current.updatedAt!==receipt.writtenAt)return abort(new KeepDeviceConflict());
        const restored={...structuredClone(receipt.original),
          updatedAt:nextKeepTimestamp(current.updatedAt)};
        store.put(restored);
      };
      get.onerror=()=>abort(new Error('Original KEEP record is unavailable.'));
      tx.oncomplete=()=>{detach();resolve();};
      tx.onabort=()=>{detach();reject(cause??tx.error??new Error('KEEP source undo refused.'));};
      tx.onerror=()=>{};
    });
  }finally{db.close();}
}

/** Restore one original bounded P29 revision, atomically, after exact CAS validation. */
export async function restoreKeepDeviceRevision(noteId:string,originalUpdatedAt:string,revisionId:string,allowed:KeepWriteAuthorization,signal:AbortSignal):Promise<KeepEditReceipt>{
  if(signal.aborted||!keepWriteAuthorized(allowed))throw new KeepDeviceAuthorizationExpired();
  const db=await connectExisting();
  try {
    return await new Promise<KeepEditReceipt>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite'),store=tx.objectStore(KEEP_NOTES_STORE);
      const detach=attachOwnerAbort(tx,signal);
      let receipt:KeepEditReceipt|null=null,cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      const req=store.get(noteId);
      req.onsuccess=()=>{
        const record:unknown=req.result;
        if(!keepWriteAuthorized(allowed))return abort(new KeepDeviceAuthorizationExpired());
        if(!vaultAllowed()||!eligibleKeepNote(record)||record.archived||record.trashed||
          record.updatedAt!==originalUpdatedAt)return abort(new KeepDeviceConflict());
        const previous=prepareKeepRevisionRestore(record,revisionId);
        if(!previous)return abort(new Error('Original KEEP revision is missing or has a changed checksum.'));
        const next={...previous,updatedAt:nextKeepTimestamp(record.updatedAt)};
        receipt={original:structuredClone(record),writtenAt:next.updatedAt};
        store.put(next);
      };
      req.onerror=()=>abort(new Error('Original KEEP note is unavailable.'));
      tx.oncomplete=()=>{detach();receipt?resolve(receipt):reject(new Error('Revision restore was not applied.'));};
      tx.onabort=()=>{detach();reject(cause??tx.error??new Error('Revision restore refused.'));};
      tx.onerror=()=>{};
    });
  }finally{db.close();}
}
