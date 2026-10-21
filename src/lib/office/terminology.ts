import {MAX_BODY} from './documents';
import {reviewOfficeProseCitations,visibleLines,withoutCode} from './footnotes';

export const MAX_TERMINOLOGY_USES=120;
export interface OfficeTermUse {offset:number;line:number;section:string;excerpt:string}
export interface OfficeTermReview {term:string;uses:OfficeTermUse[];paragraphs:number}
export interface OfficeTermChange {value:string;count:number;selectedOffsets:number[]}

/** Prose-only terminology navigation. No interpretation of citations or external authority. */
function validateTerm(value:string,max:number):void{
 if(typeof value!=='string'||value.length<2||value.length>max||
    !/^[\p{L}\p{N}](?:[\p{L}\p{N} -]*[\p{L}\p{N}])?$/u.test(value))
  throw new Error('Use 2–'+max+' letters, numbers, spaces or hyphens for the term.');
}
function maskSourceTokens(line:string):string{
 let safe=withoutCode(line);
 const patterns=[
  /!?\[[^\]\r\n]{1,200}\]\([^\r\n)]{1,2048}\)/gu,
  /\[[^\]\r\n]{1,200}\]\[[^\]\r\n]{0,100}\]/gu,
  /\[\^[a-z][a-z0-9_-]{0,47}\]/gu,
  /https?:\/\/[^\s<>]+/gu,
  /<[^>\r\n]{1,500}>/gu
 ];
 for(const pattern of patterns)safe=safe.replace(pattern,text=>' '.repeat(text.length));
 return safe;
}
function boundary(value:string):boolean{
 return !value||!(/[\p{L}\p{N}]/u.test(value));
}
export function reviewOfficeTerminology(source:string,term:string):OfficeTermReview{
 if(source.length>MAX_BODY)throw new Error('Original Office document exceeds 200,000 characters.');
 validateTerm(term,60);
 const prose=reviewOfficeProseCitations(source);
 const uses:OfficeTermUse[]=[];
 visibleLines(source,(line,start,lineNumber)=>{
  const paragraph=prose.paragraphs.find(p=>start>=p.offset&&start<p.end);
  if(!paragraph)return;
  const safe=maskSourceTokens(line);
  for(let at=safe.indexOf(term);at>=0;at=safe.indexOf(term,at+term.length)){
   const before=at>0?Array.from(safe.slice(0,at)).at(-1)??'':'';
   const after=Array.from(safe.slice(at+term.length))[0]??'';
   if(!boundary(before)||!boundary(after))continue;
   if(source.slice(start+at,start+at+term.length)!==term)
    throw new Error('Original source position mismatch; nothing modified.');
   if(uses.length>=MAX_TERMINOLOGY_USES)
    throw new Error('More than 120 genuine prose occurrences. Narrow the source term.');
   uses.push({offset:start+at,line:lineNumber,section:paragraph.section,
    excerpt:line.trim().slice(0,220)});
  }
 });
 return {term,uses,paragraphs:prose.paragraphs.length};
}
/** Replace only explicitly selected original source spans; caller uses existing Office CAS autosave. */
export function previewOfficeTerminologyChange(
 source:string,term:string,replacement:string,selectedOffsets:readonly number[]
):OfficeTermChange{
 validateTerm(replacement,80);
 if(term===replacement)throw new Error('The replacement is unchanged.');
 if(selectedOffsets.length<1||selectedOffsets.length>MAX_TERMINOLOGY_USES||
    new Set(selectedOffsets).size!==selectedOffsets.length)
  throw new Error('Choose 1–120 distinct original occurrences.');
 const report=reviewOfficeTerminology(source,term);
 const known=new Set(report.uses.map(use=>use.offset));
 if(selectedOffsets.some(offset=>!Number.isSafeInteger(offset)||!known.has(offset)))
  throw new Error('An original occurrence changed. Review the source again.');
 let value=source;
 for(const offset of [...selectedOffsets].sort((a,b)=>b-a)){
  if(value.slice(offset,offset+term.length)!==term)
   throw new Error('Original prose source changed. Nothing modified.');
  value=value.slice(0,offset)+replacement+value.slice(offset+term.length);
 }
 if(value.length>MAX_BODY)throw new Error('Terminology change exceeds Office document limit.');
 return {value,count:selectedOffsets.length,selectedOffsets:[...selectedOffsets].sort((a,b)=>a-b)};
}
