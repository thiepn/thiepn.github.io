import {MAX_DOCUMENTS,validateDocument,type OfficeDocument} from './documents';
export const MAX_BACKUP_BYTES=20_000_000;
export interface ValidatedOfficeBackup {kind:'thiepn-hub-office-backup';schemaVersion:1;createdAt:string;documents:OfficeDocument[]}
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
export function parseOfficeBackup(bytes:ArrayBuffer):ValidatedOfficeBackup{
 if(bytes.byteLength<1||bytes.byteLength>MAX_BACKUP_BYTES)throw new Error('Backup must be nonempty JSON no larger than 20 MB.');
 let decoded:string;
 try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 catch{throw new Error('Office backup must be valid UTF-8 JSON.');}
 let source:unknown;
 try{source=JSON.parse(decoded);}catch{throw new Error('Office backup is not valid JSON.');}
 if(!object(source)||Object.keys(source).sort().join('|')!=='createdAt|documents|kind|schemaVersion'||
    source.kind!=='thiepn-hub-office-backup'||source.schemaVersion!==1||
    typeof source.createdAt!=='string'||source.createdAt.length>40||!Number.isFinite(Date.parse(source.createdAt))||
    !Array.isArray(source.documents)||source.documents.length>MAX_DOCUMENTS)
    throw new Error('Unsupported Office backup format; no documents changed.');
 const ids=new Set<string>(),documents:OfficeDocument[]=[];
 for(let i=0;i<source.documents.length;i++){
  let doc:OfficeDocument;
  try{doc=validateDocument(source.documents[i]);}
  catch{throw new Error('Office backup document '+String(i+1)+' has invalid schema or revision history.');}
  if(ids.has(doc.id))throw new Error('Office backup contains duplicate IDs; nothing restored.');
  ids.add(doc.id);
  let latest=-1;
  for(const rev of doc.history){
    if(rev.revision<=latest)throw new Error('Office backup history is not in increasing revision order.');
    latest=rev.revision;
  }
  documents.push(doc);
 }
 return {kind:'thiepn-hub-office-backup',schemaVersion:1,createdAt:source.createdAt,documents};
}
export function previewBackupRestore(records:readonly OfficeDocument[],existing:readonly OfficeDocument[]){
 const ids=new Set(existing.map(doc=>doc.id));
 const fresh=records.filter(doc=>!ids.has(doc.id));
 return {add:fresh.length,skip:records.length-fresh.length,full:existing.length+fresh.length>MAX_DOCUMENTS};
}
