import {MAX_DOCUMENTS,validateDocument,type OfficeDocument} from './documents';
export type DocumentSort = 'recent'|'title';
export interface DocumentHit {doc:OfficeDocument;match:'title'|'body'|null;snippet:string}
export interface OutlineHeading {level:number;title:string;offset:number;line:number}
const MAX_QUERY=120;
export function findDocuments(input:readonly OfficeDocument[],rawQuery:string,sort:DocumentSort='recent'):DocumentHit[]{
  const query=rawQuery.trim().toLocaleLowerCase().slice(0,MAX_QUERY);
  const words=query.split(/\s+/).filter(Boolean);
  const matches:DocumentHit[]=[];
  for(const doc of input){
    const title=doc.title.toLocaleLowerCase(),body=doc.body.toLocaleLowerCase();
    if(words.some(word=>!title.includes(word)&&!body.includes(word)))continue;
    const inTitle=words.length>0&&words.every(word=>title.includes(word));
    const firstBody=words.length?body.indexOf(words.find(word=>body.includes(word))??'\u0000'):-1;
    const start=firstBody>=0?Math.max(0,firstBody-45):0;
    const snippet=doc.body.slice(start,start+125).replace(/\s+/g,' ').trim();
    matches.push({doc,match:words.length?(inTitle?'title':'body'):null,snippet});
  }
  matches.sort((a,b)=>sort==='title'
    ?a.doc.title.localeCompare(b.doc.title)||b.doc.updatedAt.localeCompare(a.doc.updatedAt)||a.doc.id.localeCompare(b.doc.id)
    :b.doc.updatedAt.localeCompare(a.doc.updatedAt)||a.doc.title.localeCompare(b.doc.title)||a.doc.id.localeCompare(b.doc.id));
  return matches;
}
export function outlineFor(source:string):OutlineHeading[]{
  const lines=source.split('\n');const outline:OutlineHeading[]=[];
  let offset=0,fence:string|null=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i]!,match=line.match(/^ {0,3}(`{3,}|~{3,})/);
    if(match){
      const marker=match[1]![0]!;
      if(!fence)fence=marker;
      else if(fence===marker)fence=null;
    }else if(!fence){
      const h=line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if(h)outline.push({level:h[1]!.length,title:h[2]!.trim(),offset,line:i});
    }
    offset+=line.length+1;
  }
  return outline;
}
export interface OfficeBackup {kind:'thiepn-hub-office-backup';schemaVersion:1;createdAt:string;documents:OfficeDocument[]}
export function backupDocuments(input:readonly OfficeDocument[],date:string):string{
  if(!Number.isFinite(Date.parse(date))||input.length>MAX_DOCUMENTS)throw new Error('Invalid backup request.');
  const ids=new Set<string>();let size=100;
  for(const raw of input){
    const doc=validateDocument(raw);
    if(ids.has(doc.id))throw new Error('Duplicate Office document. Backup cancelled.');
    ids.add(doc.id);
    size+=doc.body.length+doc.title.length+300;
    for(const rev of doc.history)size+=rev.body.length+rev.title.length+120;
    if(size>15_000_000)throw new Error('Office backup exceeds the safe browser export limit. Export individual Markdown documents instead.');
  }
  const result=JSON.stringify({kind:'thiepn-hub-office-backup',schemaVersion:1,createdAt:date,documents:input} satisfies OfficeBackup);
  if(new TextEncoder().encode(result).byteLength>20_000_000)throw new Error('Office backup exceeds 20 MB.');
  return result;
}
