import {MAX_BODY} from './documents';
import {visibleLines} from './footnotes';
import {officeInlineSourceLinks} from './markdown';

export const MAX_EXTERNAL_LINK_USES=240;
export const MAX_EXTERNAL_LINK_TARGETS=80;
export const MAX_EXTERNAL_LINK_LENGTH=2048;
export interface OfficeExternalLinkUse {label:string;href:string;offset:number;hrefOffset:number;line:number}
export interface OfficeExternalLinkTarget {href:string;scheme:'http'|'https';uses:OfficeExternalLinkUse[]}
export interface OfficeExternalLinkReport {targets:OfficeExternalLinkTarget[];useCount:number}
export interface OfficeExternalLinkChange {value:string;count:number;previous:string;replacement:string}

/** Read only original Markdown positions; do not fetch or verify external destinations. */
export function reviewOfficeExternalLinks(source:string):OfficeExternalLinkReport{
 if(source.length>MAX_BODY)throw new Error('Original Office source exceeds 200,000 characters.');
 const targets=new Map<string,OfficeExternalLinkTarget>();
 let useCount=0;
 visibleLines(source,(line,offset,lineNumber)=>{
  for(const link of officeInlineSourceLinks(line)){
   if(link.href.length>MAX_EXTERNAL_LINK_LENGTH)
    throw new Error('An original link target exceeds 2,048 characters.');
   if(++useCount>MAX_EXTERNAL_LINK_USES)
    throw new Error('More than 240 source links. Narrow the original document.');
   let target=targets.get(link.href);
   if(!target){
    if(targets.size>=MAX_EXTERNAL_LINK_TARGETS)
     throw new Error('More than 80 distinct source links. Narrow the original document.');
    target={href:link.href,scheme:link.href.startsWith('https://')?'https':'http',uses:[]};
    targets.set(link.href,target);
   }
   const hrefOffset=offset+link.hrefOffset;
   if(source.slice(hrefOffset,hrefOffset+link.href.length)!==link.href)
    throw new Error('Original Markdown link positions changed.');
   target.uses.push({label:link.label,href:link.href,offset:offset+link.offset,hrefOffset,line:lineNumber});
  }
 });
 return {targets:[...targets.values()],useCount};
}
function validatedReplacement(value:string):void{
 if(value.length<9||value.length>MAX_EXTERNAL_LINK_LENGTH||
    !value.startsWith('https://')||/[\s<>"'\x60()\\]/u.test(value))
  throw new Error('Enter one HTTPS link without whitespace or Markdown delimiters.');
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password)
   throw new Error('Unsafe destination');
 }catch{
  throw new Error('Enter a valid HTTPS destination without credentials.');
 }
}
/** Preview only; caller confirms through the existing Office textarea/CAS autosave. */
export function previewOfficeExternalLinkChange(source:string,previous:string,replacement:string):OfficeExternalLinkChange{
 validatedReplacement(replacement);
 if(previous===replacement)throw new Error('The destination is unchanged.');
 const report=reviewOfficeExternalLinks(source);
 const selected=report.targets.find(row=>row.href===previous);
 if(!selected?.uses.length)throw new Error('Original link target not found.');
 if(source.length+selected.uses.length*(replacement.length-previous.length)>MAX_BODY)
  throw new Error('Change exceeds the Office 200,000-character limit.');
 let value=source;
 for(const use of [...selected.uses].reverse()){
  if(value.slice(use.hrefOffset,use.hrefOffset+previous.length)!==previous)
   throw new Error('Original link source changed. Nothing modified.');
  value=value.slice(0,use.hrefOffset)+replacement+value.slice(use.hrefOffset+previous.length);
 }
 const verified=reviewOfficeExternalLinks(value);
 if(verified.targets.some(row=>row.href===previous))
  throw new Error('Some original links were not changed. Nothing modified.');
 const next=verified.targets.find(row=>row.href===replacement);
 if(!next||next.uses.length<selected.uses.length)
  throw new Error('Updated links are not recognized by the Markdown preview.');
 return {value,count:selected.uses.length,previous,replacement};
}
