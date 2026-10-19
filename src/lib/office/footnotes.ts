import {MAX_BODY} from './documents';
import {officeHeadingReferences} from './toc';
export const MAX_FOOTNOTE_ID=48;
export const MAX_FOOTNOTES=120;
const footnoteId=/^[a-z][a-z0-9_-]{0,47}$/;
const definition=/^ {0,3}\[\^([a-z][a-z0-9_-]{0,47})\]:[ \t]*(.*)$/;
const marker=/\[\^([a-z][a-z0-9_-]{0,47})\]/g;
const crossRef=/\[[^\]\n]{1,200}\]\(#(office-ref-[a-z0-9-]+)\)/g;
export interface SourceReference{kind:'footnote'|'heading';id:string;offset:number;line:number}
export interface OfficeFootnoteDefinition{id:string;offset:number;line:number;content:string;count:number}
export interface ReferenceProblem{kind:'missing-footnote'|'duplicate-footnote'|'unused-footnote'|'broken-heading';id:string;offset:number;line:number;message:string}
export interface ReferenceReport{definitions:OfficeFootnoteDefinition[];references:SourceReference[];problems:ReferenceProblem[];limited:boolean}
export interface FootnoteInsertion{value:string;start:number;end:number;id:string}
/** Iterate only source outside fully fenced Markdown. Do not inspect text within inline code spans. */
function visibleLines(source:string,visit:(line:string,offset:number,number:number)=>void){
 const parts=source.split(/(\r\n|\r|\n)/);
 let offset=0,fence:{char:string;length:number}|null=null;
 for(let i=0;i<parts.length;i+=2){
  const line=parts[i]!;
  const opening=line.match(/^ {0,3}(\x60{3,}|~{3,})/);
  if(fence){
   const closing=line.match(/^ {0,3}(\x60{3,}|~{3,})\s*$/);
   if(closing&&closing[1]![0]===fence.char&&closing[1]!.length>=fence.length)fence=null;
  }else if(opening)fence={char:opening[1]![0]!,length:opening[1]!.length};
  else visit(line,offset,Math.floor(i/2)+1);
  offset+=line.length+(parts[i+1]?.length??0);
 }
}
function withoutCode(line:string):string{
 // Replace inline code with spaces while preserving exact source offsets.
 return line.replace(/(\x60+)([\s\S]*?)\1/g,match=>' '.repeat(match.length));
}
export function analyzeOfficeReferences(source:string):ReferenceReport{
 if(source.length>MAX_BODY)return {definitions:[],references:[],problems:[],limited:true};
 const definitions=new Map<string,OfficeFootnoteDefinition>(),references:SourceReference[]=[];
 const duplicates:ReferenceProblem[]=[];
 visibleLines(source,(line,offset,number)=>{
  const def=line.match(definition);
  if(def){
   const id=def[1]!,previous=definitions.get(id);
   if(previous){previous.count++;duplicates.push({kind:'duplicate-footnote',id,offset,line:number,message:'Footnote '+id+' has multiple definitions.'});}
   else definitions.set(id,{id,offset,line:number,content:def[2]!,count:1});
   return;
  }
  const text=withoutCode(line);
  for(const match of text.matchAll(marker))
   references.push({kind:'footnote',id:match[1]!,offset:offset+(match.index??0),line:number});
  for(const match of text.matchAll(crossRef))
   references.push({kind:'heading',id:match[1]!,offset:offset+(match.index??0),line:number});
 });
 const headings=new Set(officeHeadingReferences(source).map(row=>row.id));
 const problems=[...duplicates];
 const consumed=new Set<string>();
 for(const ref of references){
  if(ref.kind==='footnote'){
   consumed.add(ref.id);
   if(!definitions.has(ref.id))problems.push({kind:'missing-footnote',id:ref.id,offset:ref.offset,line:ref.line,message:'Footnote '+ref.id+' is referenced but not defined.'});
  }else if(!headings.has(ref.id))problems.push({kind:'broken-heading',id:ref.id,offset:ref.offset,line:ref.line,message:'Heading '+ref.id+' no longer exists.'});
 }
 for(const def of definitions.values())if(!consumed.has(def.id))
  problems.push({kind:'unused-footnote',id:def.id,offset:def.offset,line:def.line,message:'Footnote '+def.id+' is defined but unused.'});
 problems.sort((a,b)=>a.offset-b.offset);
 return {definitions:[...definitions.values()],references,problems,limited:definitions.size>MAX_FOOTNOTES||references.length>MAX_FOOTNOTES*10};
}

/** Repair a missing definition without adding a second marker to original source. */
export function defineMissingOfficeFootnote(source:string,id:string,content:string):FootnoteInsertion{
 const report=analyzeOfficeReferences(source);
 if(report.limited)throw new Error('Source reference inspection is limited; shorten the document first.');
 if(!footnoteId.test(id))throw new Error('Invalid footnote ID.');
 if(report.definitions.some(row=>row.id===id)||
    !report.problems.some(row=>row.kind==='missing-footnote'&&row.id===id))
  throw new Error('This footnote is no longer missing. Source unchanged.');
 if(typeof content!=='string'||!content.trim()||content.length>1000||/[\r\n\x00-\x08\x0b-\x1f\x7f]/.test(content))
  throw new Error('Footnote text must be 1–1000 characters on one line.');
 const spacer=source.endsWith('\n\n')?'':source.endsWith('\n')?'\n':'\n\n';
 const definition='[^'+id+']: '+content.trim()+'\n';
 const value=source+spacer+definition;
 if(value.length>MAX_BODY)throw new Error('Footnote would exceed the 200,000-character Office source limit.');
 return {value,start:source.length+spacer.length,end:source.length+spacer.length+definition.length,id};
}
/** Retarget exactly one broken heading link, retaining its original label. */
export function retargetBrokenOfficeHeading(source:string,offset:number,targetId:string):FootnoteInsertion{
 const report=analyzeOfficeReferences(source);
 if(report.limited)throw new Error('Source reference inspection is limited; shorten the document first.');
 if(!Number.isSafeInteger(offset)||offset<0||offset>=source.length||
    !report.problems.some(row=>row.kind==='broken-heading'&&row.offset===offset))
  throw new Error('This heading reference is no longer broken. Source unchanged.');
 if(!officeHeadingReferences(source).some(row=>row.id===targetId))
  throw new Error('Choose an existing original heading first.');
 const match=source.slice(offset).match(/^\[[^\]\r\n]{1,200}\]\(#office-ref-[a-z0-9-]+\)/);
 if(!match)throw new Error('Original reference changed. Source unchanged.');
 const label=match[0]!.slice(0,match[0]!.indexOf('](#office-ref-')+1);
 const replacement=label+'(#'+targetId+')';
 const value=source.slice(0,offset)+replacement+source.slice(offset+match[0]!.length);
 if(value.length>MAX_BODY)throw new Error('Heading reference exceeds Office source limit.');
 return {value,start:offset,end:offset+replacement.length,id:targetId};
}

/** Inserts an original Markdown footnote marker and a single definition into the SAME source. */
export function insertOfficeFootnote(source:string,start:number,end:number,content:string,requestedId=''):FootnoteInsertion{
 if(source.length>MAX_BODY||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length)
  throw new Error('Invalid original footnote selection.');
 if(typeof content!=='string'||!content.trim()||content.length>1000||/[\r\n\x00-\x08\x0b-\x1f\x7f]/.test(content))
  throw new Error('Footnote text must be 1–1000 characters on one line.');
 const analysis=analyzeOfficeReferences(source);
 if(analysis.limited)throw new Error('Footnote references exceed the safe source limit.');
 const occupied=new Set([...analysis.definitions.map(x=>x.id),...analysis.references.filter(x=>x.kind==='footnote').map(x=>x.id)]);
 let id=requestedId.trim();
 if(id){
  if(!footnoteId.test(id))throw new Error('Use a lowercase letter followed by up to 47 letters, digits, hyphens or underscores.');
  if(occupied.has(id))throw new Error('Footnote ID already exists in this document.');
 }else{
  let counter=1;
  while(occupied.has('note-'+counter))counter++;
  id='note-'+counter;
 }
 const reference='[^'+id+']';
 const updated=source.slice(0,start)+reference+source.slice(end);
 const spacer=updated.endsWith('\n\n')?'':updated.endsWith('\n')?'\n':'\n\n';
 const result=updated+spacer+'[^'+id+']: '+content.trim()+'\n';
 if(result.length>MAX_BODY)throw new Error('Footnote would exceed the 200,000-character Office source limit.');
 return {value:result,start:start,end:start+reference.length,id};
}
