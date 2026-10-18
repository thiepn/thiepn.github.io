import {MAX_BODY} from './documents';
export type AuthoringBlock='code'|'table'|'tasks'|'rule';
export interface AuthoringResult {value:string;start:number;end:number}
function check(source:string,start:number,end:number){
 if(source.length>MAX_BODY||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length)
  throw new Error('Invalid Office source selection. Nothing changed.');
}
export function sourcePositionAtLine(source:string,line:number):number{
 if(source.length>MAX_BODY||!Number.isSafeInteger(line)||line<1)
  throw new Error('Enter a valid document line number.');
 let start=0,at=1;
 while(at<line){
  const next=source.indexOf('\n',start);
  if(next===-1)throw new Error('Line number exceeds the document length.');
  start=next+1;at++;
 }
 return start;
}
export function sourceWritingStats(source:string){
 if(source.length>MAX_BODY)throw new Error('Document exceeds Office limits.');
 const words=source.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length??0;
 return {characters:source.length,words,lines:source.split('\n').length,
  paragraphs:source.split(/\n\s*\n/).filter(x=>x.trim()).length};
}
export function insertAuthoringBlock(
 source:string,start:number,end:number,kind:AuthoringBlock,
 rows=2,columns=2,language=''
):AuthoringResult{
 check(source,start,end);
 let left=start,right=end,insert='',caretStart=0,caretEnd=0;
 if(kind==='tasks'){
  left=source.lastIndexOf('\n',Math.max(0,start-1))+1;
  const after=source.indexOf('\n',end);right=after<0?source.length:after;
  const raw=source.slice(left,right);
  insert=raw?raw.split('\n').map(line=>line.trim()?'- [ ] '+line.replace(/^\s*(?:[-*+]|\d+[.)])\s+|^\s*-\s+\[[xX ]\]\s+/,''):'').join('\n'):'- [ ] Task';
  caretStart=caretEnd=left+insert.length;
 }else{
  const prefix=start>0&&source[start-1]!=='\n'?'\n':'';
  const suffix=end<source.length&&source[end]!=='\n'?'\n':'';
  if(kind==='code'){
   if(!/^[a-zA-Z0-9_+-]{0,24}$/.test(language))throw new Error('Use a short safe code language label.');
   const chosen=source.slice(start,end);
   const runs=[...chosen.matchAll(/\x60+/g)].map(m=>m[0].length);
   const fence=String.fromCharCode(96).repeat(Math.max(3,...runs.map(n=>n+1)));
   const value=chosen||'code';
   insert=prefix+fence+language+'\n'+value+'\n'+fence+suffix;
   caretStart=left+prefix.length+fence.length+language.length+1;
   caretEnd=caretStart+value.length;
  }else if(kind==='table'){
   if(!Number.isSafeInteger(rows)||!Number.isSafeInteger(columns)||rows<1||rows>12||columns<2||columns>6)
    throw new Error('Choose 1–12 table rows and 2–6 columns.');
   const header='| '+Array.from({length:columns},(_,i)=>'Column '+(i+1)).join(' | ')+' |';
   const separator='| '+Array.from({length:columns},()=>'---').join(' | ')+' |';
   const data=Array.from({length:rows},()=> '| '+Array.from({length:columns},()=>'Value').join(' | ')+' |');
   insert=prefix+[header,separator,...data].join('\n')+suffix;
   caretStart=left+prefix.length;caretEnd=left+insert.length-suffix.length;
  }else if(kind==='rule'){
   insert=prefix+'---'+suffix;caretStart=caretEnd=left+insert.length;
  }else throw new Error('Unsupported Office authoring block.');
 }
 const value=source.slice(0,left)+insert+source.slice(right);
 if(value.length>MAX_BODY)throw new Error('Authoring block exceeds the 200,000-character Office limit.');
 return {value,start:caretStart,end:caretEnd};
}
