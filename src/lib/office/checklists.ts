import {MAX_BODY} from './documents';
import {visibleLines} from './footnotes';
import {officeHeadingReferences} from './toc';

export const MAX_OFFICE_CHECKLIST_ITEMS=120;
export interface OfficeChecklistItem {
  offset:number;markerOffset:number;line:number;section:string;label:string;completed:boolean;
}
export interface OfficeChecklistReview {items:OfficeChecklistItem[];open:number;completed:number}
export interface OfficeChecklistChange {value:string;count:number;completed:boolean;offsets:number[]}

/** Source-backed checkbox lines supported by the original Markdown renderer.
 * Fenced code, plain lists, blockquotes, indented text and table data are not tasks.
 */
export function reviewOfficeChecklists(source:string):OfficeChecklistReview{
  if(source.length>MAX_BODY)throw new Error('Original Office document exceeds 200,000 characters.');
  const headings=officeHeadingReferences(source);
  const items:OfficeChecklistItem[]=[];
  const ancestry:{title:string;level:number}[]=[];
  let hi=0;
  visibleLines(source,(line,start,number)=>{
    while(hi<headings.length&&headings[hi]!.offset<start){
      const heading=headings[hi++]!;
      while(ancestry.length&&ancestry[ancestry.length-1]!.level>=heading.level)ancestry.pop();
      ancestry.push({title:heading.title.slice(0,120),level:heading.level});
    }
    // The actual preview checks tasks only in unordered lists, not ordered
    // lists or nested raw code. Accept only the renderer's literal task marker.
    const match=line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.+)$/);
    if(!match||!match[3]!.trim())return;
    const markerOffset=start+match[1]!.length+1;
    if(source[markerOffset]!==match[2])
      throw new Error('Original checklist source offset mismatch.');
    if(items.length>=MAX_OFFICE_CHECKLIST_ITEMS)
      throw new Error('More than 120 original checklist items. Shorten the document first.');
    items.push({offset:start,markerOffset,line:number,
      section:ancestry.map(h=>h.title).join(' › ')||'Before first heading',
      label:match[3]!.trim().slice(0,220),
      completed:match[2]!.toLowerCase()==='x'});
  });
  return {items,open:items.filter(i=>!i.completed).length,
    completed:items.filter(i=>i.completed).length};
}

/** Replace explicitly selected single-character original checkbox spans only.
 * Caller owns the existing Office revision-checked autosave and privacy gate.
 */
export function previewOfficeChecklistChange(
  source:string,selectedMarkerOffsets:readonly number[],completed:boolean
):OfficeChecklistChange{
  if(typeof completed!=='boolean')throw new Error('Choose completed or open state.');
  if(selectedMarkerOffsets.length<1||selectedMarkerOffsets.length>MAX_OFFICE_CHECKLIST_ITEMS||
     new Set(selectedMarkerOffsets).size!==selectedMarkerOffsets.length)
    throw new Error('Choose 1–120 distinct original checklist items.');
  const review=reviewOfficeChecklists(source),known=new Map(review.items.map(i=>[i.markerOffset,i]));
  for(const offset of selectedMarkerOffsets){
    const item=known.get(offset);
    if(!Number.isSafeInteger(offset)||!item)
      throw new Error('A selected checklist item is no longer in the original source.');
    if(item.completed===completed)
      throw new Error('Selected checklist state is already applied. Choose a changed item.');
    const actual=source[offset];
    if(actual!==' '&&actual!=='x'&&actual!=='X')
      throw new Error('Original checklist marker changed. No edits applied.');
  }
  const value=selectedMarkerOffsets.reduce((next,offset)=>
    next.slice(0,offset)+(completed?'x':' ')+next.slice(offset+1),source);
  if(value.length!==source.length)throw new Error('Checklist source length changed. Nothing applied.');
  return {value,count:selectedMarkerOffsets.length,completed,
    offsets:[...selectedMarkerOffsets].sort((a,b)=>a-b)};
}
