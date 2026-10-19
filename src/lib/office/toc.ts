import {MAX_BODY} from './documents';
import {outlineFor} from './library';
export const TOC_START='<!-- thiepn-office-toc:start -->';
export const TOC_END='<!-- thiepn-office-toc:end -->';
export const MAX_TOC_ENTRIES=120;
export interface OfficeHeadingRef {id:string;title:string;level:number;offset:number;line:number}
export interface OfficeTocChange {value:string;mode:'insert'|'update';headings:number;start:number;end:number}
interface TocRegion {start:number;end:number}
function managedRegion(source:string):TocRegion|null{
 const lines=source.split('\n');let offset=0,start=-1,end=-1,startCount=0,endCount=0;
 for(const line of lines){
  if(line===TOC_START){startCount++;start=offset;}
  if(line===TOC_END){endCount++;end=offset+line.length;}
  offset+=line.length+1;
 }
 if(startCount===0&&endCount===0)return null;
 if(startCount!==1||endCount!==1||start<0||end<=start)
  throw new Error('Office contents markers are incomplete or duplicated. No source modified.');
 return {start,end};
}
function slug(title:string):string{
 const result=Array.from(title.toLocaleLowerCase()).map(ch=>
  /^[a-z0-9]$/.test(ch)?ch:/^[\s-]$/.test(ch)?'-':'u'+ch.codePointAt(0)!.toString(16)+'-'
 ).join('').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,90).replace(/-$/,'');
 return result||'section';
}
export function officeHeadingReferences(source:string):OfficeHeadingRef[]{
 if(source.length>MAX_BODY)throw new Error('Document exceeds Office size limit.');
 // Malformed markers must never break normal editing/preview; the explicit TOC writer still refuses them.
 let region:TocRegion|null=null;
 try{region=managedRegion(source);}catch{}
 const seen=new Map<string,number>();
 return outlineFor(source).filter(h=>!region||h.offset<region.start||h.offset>=region.end).map(heading=>{
  const stem=slug(heading.title);
  const count=(seen.get(stem)??0)+1;seen.set(stem,count);
  return {...heading,id:'office-ref-'+stem+(count>1?'-'+count:'')};
 });
}
function label(title:string):string{
 return title.replace(/[\\\[\]\r\n]/g,'').trim().slice(0,180)||'Untitled heading';
}
export function generateOfficeToc(source:string):OfficeTocChange{
 if(source.length>MAX_BODY)throw new Error('Document exceeds Office size limit.');
 const region=managedRegion(source),headings=officeHeadingReferences(source);
 if(!headings.length)throw new Error('Add a genuine Markdown heading before generating contents.');
 if(headings.length>MAX_TOC_ENTRIES)throw new Error('Contents exceeds 120 headings. Shorten the outline first.');
 const firstLevel=Math.min(...headings.map(h=>h.level));
 const lines=[TOC_START,'## Contents','',
  ...headings.map(h=>'  '.repeat(Math.max(0,h.level-firstLevel))+'- ['+label(h.title)+'](#'+h.id+')'),
  TOC_END];
 const block=lines.join('\n');
 let value:string,start:number,end:number,mode:'insert'|'update';
 if(region){
  mode='update';start=region.start;end=region.end;
  value=source.slice(0,start)+block+source.slice(end);
 }else{
  mode='insert';
  const titleHeading=headings.find(h=>h.level===1);
  const afterLine=titleHeading?source.indexOf('\n',titleHeading.offset):-1;
  start=afterLine>=0?afterLine+1:0;end=start;
  const before=source.slice(0,start),after=source.slice(start);
  const prefix=before&& !before.endsWith('\n\n')?'\n':'';
  const suffix=after.startsWith('\n')?'\n':'\n\n';
  value=before+prefix+block+suffix+after;
  start+=prefix.length;end=start+block.length;
 }
 if(value.length>MAX_BODY)throw new Error('Generated contents exceeds Office document limit. Source unchanged.');
 return {value,mode,headings:headings.length,start,end};
}
export interface OfficeLinkInsertion{value:string;start:number;end:number}
export function insertOfficeHeadingLink(source:string,start:number,end:number,targetId:string):OfficeLinkInsertion{
 if(source.length>MAX_BODY||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length)
  throw new Error('Invalid original source link selection.');
 const target=officeHeadingReferences(source).find(entry=>entry.id===targetId);
 if(!target)throw new Error('The selected heading reference no longer exists.');
 const insertion='['+label(target.title)+'](#'+target.id+')';
 const value=source.slice(0,start)+insertion+source.slice(end);
 if(value.length>MAX_BODY)throw new Error('Internal reference exceeds Office document limit.');
 return {value,start:start,end:start+insertion.length};
}
