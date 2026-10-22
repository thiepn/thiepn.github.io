import {MAX_BODY} from './documents';
import {outlineFor} from './library';
import {documentSections,type EditorSection} from './navigation';

export type SectionPlacement='sibling'|'child';
export interface SectionInsertion {value:string;offset:number;start:number;end:number;level:number}
export const MAX_SECTION_TITLE=100;

/** Uses original Markdown heading offsets. Never interprets headings inside fenced code. */
export function adjacentDocumentHeading(source:string,caret:number,direction:'previous'|'next'):number{
 if(source.length>MAX_BODY||!Number.isSafeInteger(caret)||caret<0||caret>source.length)
  throw new Error('Invalid source position.');
 const headings=outlineFor(source);
 const target=direction==='next'
  ?headings.find(entry=>entry.offset>caret)
  :[...headings].reverse().find(entry=>entry.offset<caret);
 if(!target)throw new Error('No '+direction+' document heading.');
 return target.offset;
}

/** Finds the most specific authentic Markdown section containing the current insertion point. */
export function documentSectionAt(source:string,caret:number):EditorSection{
 if(source.length>MAX_BODY||!Number.isSafeInteger(caret)||caret<0||caret>source.length)
  throw new Error('Invalid source position.');
 const candidates=documentSections(source).filter(section=>section.offset<=caret&&caret<=section.end);
 const chosen=candidates[candidates.length-1];
 if(!chosen)throw new Error('Place the cursor inside a document heading section.');
 return chosen;
}

/** Inserts one genuine Markdown section at its parent/sibling boundary, never replacing original text. */
export function insertOfficeSection(source:string,selectedOffset:number,title:string,placement:SectionPlacement):SectionInsertion{
 if(source.length>MAX_BODY||!Number.isSafeInteger(selectedOffset)||selectedOffset<0)
  throw new Error('Invalid Office section selection.');
 if(!['sibling','child'].includes(placement))throw new Error('Choose a valid section relationship.');
 if(typeof title!=='string'||title.length>MAX_SECTION_TITLE||/[\r\n\x00-\x1f\x7f]/.test(title)||!title.trim())
  throw new Error('Section title must be 1–100 characters on one line.');
 const section=documentSections(source).find(entry=>entry.offset===selectedOffset);
 if(!section)throw new Error('Selected source heading is no longer available.');
 const level=section.level+(placement==='child'?1:0);
 if(level>6)throw new Error('A level-6 heading cannot contain a deeper Markdown subsection.');
 const normalized=title.trim();
 const position=section.end,before=source.slice(0,position),after=source.slice(position);
 const prefix=!before||before.endsWith('\n\n')?'':before.endsWith('\n')?'\n':'\n\n';
 const suffix=!after?'\n':after.startsWith('\n')?'\n':'\n\n';
 const marker='#'.repeat(level)+' ';
 const inserted=prefix+marker+normalized+suffix;
 const value=before+inserted+after;
 if(value.length>MAX_BODY)throw new Error('Section would exceed the 200,000-character Office limit. No changes applied.');
 const offset=position+prefix.length;
 return {value,offset,start:offset+marker.length,end:offset+marker.length+normalized.length,level};
}
