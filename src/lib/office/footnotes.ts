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


export interface OfficeCitationEntry{
 id:string;definitionOffset:number;definitionLine:number;excerpt:string;
 definitionCount:number;uses:readonly SourceReference[];
}
export interface OfficeCitationInventory{entries:OfficeCitationEntry[];limited:boolean}
/** Derived from the current original Markdown only: no independent index. */
export function officeCitationInventory(source:string):OfficeCitationInventory{
 const report=analyzeOfficeReferences(source);
 if(report.limited)return {entries:[],limited:true};
 return {entries:report.definitions.map(def=>({
  id:def.id,definitionOffset:def.offset,definitionLine:def.line,
  excerpt:def.content.slice(0,160),definitionCount:def.count,
  uses:report.references.filter(ref=>ref.kind==='footnote'&&ref.id===def.id)
 })),limited:false};
}
function uniqueCitation(source:string,id:string){
 const report=analyzeOfficeReferences(source);
 if(report.limited)throw new Error('Reference inspection is limited; shorten the original source first.');
 if(!footnoteId.test(id))throw new Error('Invalid citation ID.');
 const definition=report.definitions.find(row=>row.id===id);
 if(!definition||definition.count!==1)throw new Error('A unique original footnote definition is required.');
 return {report,definition};
}

export type OfficeCitationDiagnostic=ReferenceProblem['kind'];
export interface OfficeCitationSnapshot{
 id:string;definitionCount:number;definitionText:string|null;definitionOffset:number|null;
 definitionLine:number|null;useCount:number;firstUseOffset:number|null;firstUseLine:number|null;
 diagnostics:readonly OfficeCitationDiagnostic[];
}
export interface OfficeCitationAuditChange{
 id:string;before:OfficeCitationSnapshot;after:OfficeCitationSnapshot;changes:readonly string[];
}
export interface OfficeCitationAudit{
 limited:boolean;beforeCount:number;afterCount:number;unchanged:number;
 changes:OfficeCitationAuditChange[];
}
const MAX_AUDIT_IDENTITIES=160;
/** Compare two actual Markdown sources, never inferring a rename or an externally verified source. */
export function compareOfficeCitationRevisions(before:string,after:string):OfficeCitationAudit{
 const empty:OfficeCitationAudit={limited:true,beforeCount:0,afterCount:0,unchanged:0,changes:[]};
 const a=analyzeOfficeReferences(before),b=analyzeOfficeReferences(after);
 if(a.limited||b.limited)return empty;
 const gather=(report:ReferenceReport)=>{
  const map=new Map<string,OfficeCitationSnapshot>();
  const ids=new Set([
   ...report.definitions.map(row=>row.id),
   ...report.references.filter(row=>row.kind==='footnote').map(row=>row.id)
  ]);
  for(const id of ids){
   const def=report.definitions.find(row=>row.id===id);
   const uses=report.references.filter(row=>row.kind==='footnote'&&row.id===id);
   const diagnostics=[...new Set(report.problems.filter(p=>p.id===id&&p.kind!=='broken-heading')
     .map(p=>p.kind))].sort() as OfficeCitationDiagnostic[];
   map.set(id,{
    id,definitionCount:def?.count??0,definitionText:def?.content??null,
    definitionOffset:def?.offset??null,definitionLine:def?.line??null,
    useCount:uses.length,firstUseOffset:uses[0]?.offset??null,
    firstUseLine:uses[0]?.line??null,diagnostics
   });
  }
  return map;
 };
 const first=gather(a),last=gather(b);
 const ids=[...new Set([...first.keys(),...last.keys()])].sort();
 if(ids.length>MAX_AUDIT_IDENTITIES)return empty;
 const absent=(id:string):OfficeCitationSnapshot=>({
  id,definitionCount:0,definitionText:null,definitionOffset:null,definitionLine:null,
  useCount:0,firstUseOffset:null,firstUseLine:null,diagnostics:[]
 });
 const changes:OfficeCitationAuditChange[]=[];
 let unchanged=0;
 for(const id of ids){
  const earlier=first.get(id)??absent(id),later=last.get(id)??absent(id),reasons:string[]=[];
  if(earlier.definitionCount!==later.definitionCount)
   reasons.push('Definitions '+earlier.definitionCount+' → '+later.definitionCount);
  if(earlier.definitionText!==later.definitionText)
   reasons.push('Definition text changed');
  if(earlier.useCount!==later.useCount)
   reasons.push('Uses '+earlier.useCount+' → '+later.useCount);
  if(earlier.diagnostics.join('|')!==later.diagnostics.join('|'))
   reasons.push('Issues '+(earlier.diagnostics.join(', ')||'none')+' → '+(later.diagnostics.join(', ')||'none'));
  if(reasons.length)changes.push({id,before:earlier,after:later,changes:reasons});
  else unchanged++;
 }
 return {limited:false,beforeCount:first.size,afterCount:last.size,unchanged,changes};
}

/** Reuse an existing footnote in-place, with original CAS/autosave as sole writer. */
export function insertExistingOfficeCitation(source:string,start:number,end:number,id:string):FootnoteInsertion{
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length)
  throw new Error('Invalid original source selection.');
 uniqueCitation(source,id);
 const marker='[^'+id+']',value=source.slice(0,start)+marker+source.slice(end);
 if(value.length>MAX_BODY)throw new Error('Citation exceeds the Office source limit.');
 return {value,start,end:start+marker.length,id};
}
export interface OfficeCitationRename extends FootnoteInsertion{referenceCount:number}
/** Rename all genuine refs and exactly one definition, leaving code pseudorefs untouched. */
export function renameOfficeCitation(source:string,oldId:string,newId:string):OfficeCitationRename{
 const {report,definition:original}=uniqueCitation(source,oldId);
 if(!footnoteId.test(newId))throw new Error('Use a lowercase letter followed by up to 47 lowercase letters, digits, hyphens or underscores.');
 if(oldId===newId)throw new Error('Choose a different citation ID.');
 if(report.definitions.some(row=>row.id===newId)||
    report.references.some(ref=>ref.kind==='footnote'&&ref.id===newId))
  throw new Error('The destination citation ID is already in use.');
 const oldMarker='[^'+oldId+']',newMarker='[^'+newId+']';
 const sourceLine=source.slice(original.offset).split(/\r\n|\r|\n/,1)[0]!;
 const local=sourceLine.indexOf(oldMarker);
 if(local<0||local>3)throw new Error('Original citation definition changed. Source unchanged.');
 const definitionOffset=original.offset+local;
 const usageOffsets=report.references.filter(ref=>ref.kind==='footnote'&&ref.id===oldId).map(ref=>ref.offset);
 const edits=[definitionOffset,...usageOffsets];
 if(new Set(edits).size!==edits.length||edits.some(offset=>source.slice(offset,offset+oldMarker.length)!==oldMarker))
  throw new Error('Citation source offsets are stale. Source unchanged.');
 if(source.length+edits.length*(newMarker.length-oldMarker.length)>MAX_BODY)
  throw new Error('Citation rename exceeds the Office source limit.');
 let value=source;
 for(const offset of [...edits].sort((a,b)=>b-a))
  value=value.slice(0,offset)+newMarker+value.slice(offset+oldMarker.length);
 const start=definitionOffset+usageOffsets.filter(offset=>offset<definitionOffset).length*(newMarker.length-oldMarker.length);
 return {value,start,end:start+newMarker.length,id:newId,referenceCount:usageOffsets.length};
}


/** Modify only the contents of one unique original definition; keep ID, prefix, uses, line ending and history writer unchanged. */
export function updateOfficeFootnoteDefinition(source:string,id:string,expectedContent:string,newContent:string,expectedOffset:number):FootnoteInsertion{
 if(!Number.isSafeInteger(expectedOffset)||expectedOffset<0||source.length>MAX_BODY)
  throw new Error('Original citation source position is invalid or exceeds the size limit.');
 const {definition:current}=uniqueCitation(source,id);
 if(current.offset!==expectedOffset||current.content!==expectedContent)
  throw new Error('Original citation definition changed. Review current source before applying.');
 if(typeof newContent!=='string'||!newContent.trim()||newContent.length>1000||
    /[\r\n\x00-\x08\x0b-\x1f\x7f]/.test(newContent))
  throw new Error('Footnote text must be 1–1000 characters on one line.');
 const at=current.offset,after=source.indexOf('\n',at);
 const lineEnd=after<0?source.length:after>at&&source[after-1]==='\r'?after-1:after;
 const line=source.slice(at,lineEnd);
 const match=line.match(/^ {0,3}\[\^([a-z][a-z0-9_-]{0,47})\]:[ \t]*/);
 if(!match||match[1]!==id||line.slice(match[0].length)!==expectedContent)
  throw new Error('Original citation marker or contents changed. Source unchanged.');
 const start=at+match[0].length,end=lineEnd;
 const next=newContent.trim();
 if(next===expectedContent)throw new Error('Citation text is unchanged.');
 const value=source.slice(0,start)+next+source.slice(end);
 if(value.length>MAX_BODY)throw new Error('Citation update exceeds the Office source limit.');
 return {value,start,end:start+next.length,id};
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
