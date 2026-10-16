/**
 * Source-owned KEEP B3 device adapter.
 * Exact schema/store identifiers from original src/services/storage.ts (B3).
 * No schema upgrades, seeding, migrations, fallback writes, decryption,
 * authorization token reuse, or Hub record copies.
 */
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
export async function createKeepDeviceNote(changes:{title:string;content:string;pinned:boolean}):Promise<string>{
  if(!changes.title.trim()||changes.title.length>1000||changes.content.length>500000)
    throw new Error('Invalid KEEP note title or content.');
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
      let cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      if(!vaultAllowed())abort(new Error('KEEP vault changed; creation refused.'));
      else tx.objectStore(KEEP_NOTES_STORE).add(original);
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>reject(cause??tx.error??new Error('KEEP creation aborted.'));
      tx.onerror=()=>{};
    });
    return id;
  } finally {db.close();}
}

/** Original B3 note ID + fields, revision-guarded, single-record atomic transaction. */
export async function updateKeepDevice(
  id:string,originalUpdatedAt:string,changes:{title:string;content:string;pinned:boolean}
):Promise<void>{
  if(!changes.title.trim()||changes.title.length>1000||changes.content.length>500000)
    throw new Error('KEEP title/content outside original editor limits.');
  const db=await connectExisting();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite');
      const store=tx.objectStore(KEEP_NOTES_STORE);
      let cause:Error|null=null;
      const abort=(err:Error)=>{cause=err;tx.abort();};
      const row=store.get(id);
      row.onsuccess=()=>{
        if(!vaultAllowed())return abort(new Error('KEEP vault changed during edit.'));
        const record:unknown=row.result;
        if(!eligibleKeepNote(record)||record.archived||record.trashed||
            record.updatedAt!==originalUpdatedAt) return abort(new KeepDeviceConflict());
        const next={...record,title:changes.title.trim(),content:changes.content,pinned:changes.pinned,updatedAt:nextKeepTimestamp(record.updatedAt)};
        store.put(next);
      };
      row.onerror=()=>abort(new Error('KEEP source note could not be read.'));
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>{ /* rejection on abort handles the error */ };
      tx.onabort=()=>reject(cause??tx.error??new Error('KEEP device edit was cancelled.'));
    });
  }finally{db.close();}
}

/** Toggle one original KEEP checklist entry without translating it to a Hub task. */
export async function toggleKeepDeviceChecklist(noteId:string,revision:string,itemId:string):Promise<void>{
  const db=await connectExisting();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(KEEP_NOTES_STORE,'readwrite'),store=tx.objectStore(KEEP_NOTES_STORE);
      let cause:Error|null=null;
      const abort=(e:Error)=>{cause=e;tx.abort();};
      const get=store.get(noteId);
      get.onsuccess=()=>{
        const raw=get.result;
        if(!vaultAllowed()||!eligibleKeepNote(raw)||raw.archived||raw.trashed||raw.updatedAt!==revision)
          return abort(new KeepDeviceConflict());
        const matches=raw.checklist.filter(item=>item.id===itemId);
        if(matches.length!==1)return abort(new Error('Original KEEP checklist item changed.'));
        const next={...raw,updatedAt:nextKeepTimestamp(raw.updatedAt),
          checklist:raw.checklist.map(item=>item.id===itemId?{...item,completed:!item.completed}:item)};
        store.put(next);
      };
      get.onerror=()=>abort(new Error('Original KEEP note is unavailable.'));
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>reject(cause??tx.error??new Error('KEEP checklist update was refused.'));
      tx.onerror=()=>{};
    });
  }finally{db.close();}
}
