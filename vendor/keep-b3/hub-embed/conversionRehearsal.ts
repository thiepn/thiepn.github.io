import {generateVaultKey, encryptAesGcm, decryptAesGcmToText} from '../src/pkm/encryption/aesGcm';

type Authority={mayMount():boolean;revoked:AbortSignal};
const NAMES=['notes','folders','saved_searches','settings'] as const;
type Store=typeof NAMES[number];
type Row=Record<string,unknown>;
type Snapshot=Record<Store,Row[]>;
export interface OriginalKeepConversionRehearsal {
 readonly format:'keep-b3-original-conversion-rehearsal';
 readonly ownerDatabase:'KeepNotesDB';
 readonly ownerVersion:1;
 readonly originalSha256:string;
 readonly stagedEncryptedSha256:string;
 readonly counts:Readonly<Record<Store,number>>;
 readonly plaintextMirrorKeys:readonly string[];
 readonly originalIdsPreserved:true;
 readonly verifiedAesRoundTrips:number;
 readonly mutationDetected:false;
 readonly backupVerifiedExternally:false;
 readonly rollbackVerified:false;
 readonly transactionalHeaderCommitImplemented:false;
 readonly writes:0;
 readonly blocked:true;
}
function authorized(a:Authority){
 if(a.revoked.aborted||!a.mayMount())throw new Error('Original KEEP rehearsal authorization revoked.');
}
async function hex(input:string):Promise<string>{
 const bytes=new TextEncoder().encode(input);
 const owned=new ArrayBuffer(bytes.length);new Uint8Array(owned).set(bytes);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',owned))]
  .map(v=>v.toString(16).padStart(2,'0')).join('');
}
function checkJson(value:unknown,path:string,seen=new WeakSet<object>(),depth=0):void {
 if(depth>60)throw new Error('Original KEEP record nesting limit exceeded at '+path);
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object'||seen.has(value))throw new Error('Non-portable original KEEP value at '+path);
 if(ArrayBuffer.isView(value)||value instanceof ArrayBuffer||value instanceof Blob||value instanceof Date)
  throw new Error('Original KEEP attachment requires independent binary custody at '+path);
 if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype)
  throw new Error('Unknown original KEEP record payload at '+path);
 seen.add(value);
 for(const [k,v] of Object.entries(value))checkJson(v,path+'.'+k,seen,depth+1);
 seen.delete(value);
}
async function take(db:IDBDatabase,a:Authority):Promise<Snapshot>{
 authorized(a);
 return await new Promise<Snapshot>((resolve,reject)=>{
  const tx=db.transaction([...NAMES],'readonly');
  const out={} as Snapshot;
  tx.oncomplete=()=>resolve(out);
  tx.onabort=()=>reject(tx.error??new Error('Original KEEP snapshot transaction aborted'));
  tx.onerror=()=>reject(tx.error??new Error('Original KEEP snapshot transaction failed'));
  for(const name of NAMES){
   const req=tx.objectStore(name).getAll();
   req.onsuccess=()=>{out[name]=req.result as Row[];};
  }
 });
}
async function openOriginal(a:Authority):Promise<IDBDatabase>{
 authorized(a);
 if(typeof indexedDB.databases!=='function')throw new Error('Original KEEP database enumeration unavailable.');
 const existing=await indexedDB.databases();
 authorized(a);
 if(!existing.some(x=>x.name==='KeepNotesDB'&&x.version===1))
  throw new Error('No exact original KEEP v1 database; no data was created.');
 return await new Promise((resolve,reject)=>{
  const request=indexedDB.open('KeepNotesDB');
  request.onupgradeneeded=()=>{try{request.transaction?.abort();}catch{};reject(new Error('Original database creation is not authorized.'));};
  request.onerror=()=>reject(request.error??new Error('Original KEEP database open failed'));
  request.onblocked=()=>reject(new Error('Original KEEP database busy'));
  request.onsuccess=()=>{
   const db=request.result;
   if(db.version!==1||NAMES.some(n=>!db.objectStoreNames.contains(n))||
       db.objectStoreNames.length!==NAMES.length){db.close();reject(new Error('Unrecognized original KEEP database schema'));return;}
   resolve(db);
  };
 });
}
/**
 * Original KEEP owner-format read-only conversion REHEARSAL; independent
 * source export, backup proof, cross-tab lock and atomic header commit are
 * deliberately unimplemented. Never return ciphertext, keys or private rows.
 * Source modules remain unchanged; original AES-GCM is used for the dry run.
 */
export async function rehearseOriginalKeepConversion(a:Authority):Promise<OriginalKeepConversionRehearsal>{
 authorized(a);
 if(!document.querySelector('[data-keep-native-host]')||
    document.querySelector('[data-keep-original-react-active="true"]'))
   throw new Error('Original KEEP rehearsal requires an inactive authorized Hub owner.');
 if(localStorage.getItem('keepnotes_vault_enc_header'))
   throw new Error('Existing original KEEP vault header prevents plaintext conversion rehearsal.');
 const db=await openOriginal(a);
 try{
  const before=await take(db,a);
  const baseline=JSON.stringify(NAMES.map(n=>[n,before[n]]));
  const originalSha256=await hex(baseline);
  const seen=new Set<string>();
  const counts={} as Record<Store,number>;
  const {cryptoKey}=await generateVaultKey();
  const staged:string[]=[];
  let verified=0;
  for(const name of NAMES){
   counts[name]=before[name].length;
   for(const row of before[name]){
    authorized(a);
    checkJson(row,name);
    const id=name==='settings'?row.key:row.id;
    if(typeof id!=='string'||!id)throw new Error('Original KEEP record lacks immutable '+name+' key');
    const unique=name+':'+id;
    if(seen.has(unique))throw new Error('Duplicate original KEEP key in '+name);
    seen.add(unique);
    const serialized=JSON.stringify(row);
    const encrypted=await encryptAesGcm(cryptoKey,serialized);
    const decoded=await decryptAesGcmToText(cryptoKey,encrypted.ciphertext,encrypted.iv);
    if(decoded!==serialized)throw new Error('Original AES-GCM round-trip differs from exact source row');
    staged.push(JSON.stringify([unique,encrypted.iv,encrypted.ciphertext]));
    verified++;
   }
  }
  const stagedEncryptedSha256=await hex(JSON.stringify(staged));
  const after=await take(db,a);
  authorized(a);
  if(await hex(JSON.stringify(NAMES.map(n=>[n,after[n]])))!==originalSha256)
   throw new Error('Original KEEP records changed concurrently; conversion rehearsal is void.');
  const plaintextMirrorKeys=Object.keys(localStorage).filter(k=>k.startsWith('keepnotes_')).sort();
  return {format:'keep-b3-original-conversion-rehearsal',ownerDatabase:'KeepNotesDB',ownerVersion:1,
   originalSha256,stagedEncryptedSha256,counts,plaintextMirrorKeys,
   originalIdsPreserved:true,verifiedAesRoundTrips:verified,mutationDetected:false,
   backupVerifiedExternally:false,rollbackVerified:false,
   transactionalHeaderCommitImplemented:false,writes:0,blocked:true};
 }finally{db.close();}
}
