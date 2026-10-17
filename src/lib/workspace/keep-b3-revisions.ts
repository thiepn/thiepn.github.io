/**
 * Port of KEEP B3 source:
 * src/pkm/resilience/noteRevisionService.ts (P29)
 * src/pkm/portableVaultSerializer.ts (FNV-1a deterministic checksum)
 * Only imports the original KEEP note shape via keep-b3-device.ts.
 *
 * Bounded metadata stored on the original KEEP note's own revisions field.
 * This is not a new revision database, serializer, crypto engine or Hub store.
 */
import type { KeepOwnerNote } from './keep-b3-device';
export interface KeepBoundedRevision {
  id:string; noteId:string; version:number; timestamp:string; title:string;
  content:string; characterCount:number; wordCount:number; checksum:string;
  trigger:'auto_coalesced'|'manual_checkpoint'|'before_destructive_edit'|'pre_restore';
}
const MAX=50, COALESCE_MS=5*60*1000;
export function keepChecksum(content:string):string {
  let h1=0x811c9dc5,h2=0x811c9dc5;
  for(let i=0;i<content.length;i++){
    const c=content.charCodeAt(i);
    h1=Math.imul(h1^(c&0xff),0x01000193);
    h2=Math.imul(h2^(c>>8),0x01000193);
  }
  return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
}
export function keepRevisionList(note:KeepOwnerNote):KeepBoundedRevision[]{
  if(!Array.isArray(note.revisions))return [];
  return note.revisions.filter((v):v is KeepBoundedRevision=>!!v&&typeof v==='object'&&
    (v as KeepBoundedRevision).noteId===note.id &&
    typeof (v as KeepBoundedRevision).content==='string' &&
    typeof (v as KeepBoundedRevision).title==='string' &&
    typeof (v as KeepBoundedRevision).id==='string' &&
    typeof (v as KeepBoundedRevision).version==='number' &&
    typeof (v as KeepBoundedRevision).timestamp==='string' &&
    typeof (v as KeepBoundedRevision).checksum==='string' &&
    typeof (v as KeepBoundedRevision).trigger==='string');
}
/** KEEP P29 original append/coalesce behavior with a bounded 50-version retention. */
export function recordKeepRevision(note:KeepOwnerNote,currentContent:string,
  trigger:KeepBoundedRevision['trigger']='auto_coalesced',now=new Date()):KeepOwnerNote {
  const compatible=keepRevisionList(note);
  if(Array.isArray(note.revisions)&&compatible.length!==note.revisions.length)
    throw new Error('This KEEP note has legacy revision entries. Use the original KEEP editor for safe editing.');
  const revisions=compatible.slice(),stamp=now.toISOString(),checksum=keepChecksum(currentContent);
  if(revisions.length){
    const last=revisions[revisions.length-1]!,within=now.getTime()-Date.parse(last.timestamp)<COALESCE_MS;
    if(last.checksum===checksum&&trigger==='auto_coalesced')return note;
    if(within&&last.trigger==='auto_coalesced'&&trigger==='auto_coalesced'){
      revisions[revisions.length-1]={...last,content:currentContent,timestamp:stamp,
        characterCount:currentContent.length,
        wordCount:currentContent.trim()?currentContent.trim().split(/\s+/u).length:0,checksum};
      return {...note,revisions};
    }
  }
  const version=revisions.length?revisions[revisions.length-1]!.version+1:1;
  const record:KeepBoundedRevision={
    id:'rev-'+now.getTime()+'-'+crypto.randomUUID().slice(0,8),
    noteId:note.id,version,timestamp:stamp,title:note.title||'Untitled',
    content:currentContent,characterCount:currentContent.length,
    wordCount:currentContent.trim()?currentContent.trim().split(/\s+/u).length:0,
    checksum,trigger
  };
  revisions.push(record);
  return {...note,revisions:revisions.slice(-MAX)};
}
export function prepareKeepRevisionRestore(note:KeepOwnerNote,id:string):KeepOwnerNote|null{
  const match=keepRevisionList(note).find(r=>r.id===id);
  if(!match||keepChecksum(match.content)!==match.checksum)return null;
  const checkpoint=recordKeepRevision(note,note.content,'pre_restore');
  return {...checkpoint,title:match.title,content:match.content};
}
