import {MAX_BODY} from './documents';
import {documentSections} from './navigation';
import {outlineFor} from './library';
export type StructuralAction='promote'|'demote'|'duplicate';
export interface SectionTransformation {
  value:string;offset:number;heading:string;affectedHeadings:number;
  originalCharacters:number;nextLevel:number;
}
/** Source-only transform of a real selected heading and its entire nested Markdown subtree. */
export function transformOfficeSection(source:string,selectedOffset:number,action:StructuralAction):SectionTransformation{
 if(source.length>MAX_BODY||!Number.isSafeInteger(selectedOffset)||selectedOffset<0||!['promote','demote','duplicate'].includes(action))
  throw new Error('Invalid original Office section transform.');
 const sections=documentSections(source);
 const section=sections.find(item=>item.offset===selectedOffset);
 if(!section)throw new Error('Selected original section is no longer available.');
 const subtree=source.slice(section.offset,section.end);
 const headings=outlineFor(subtree);
 if(!headings.length||headings[0]!.offset!==0)throw new Error('Original section heading could not be verified.');
 if(action==='duplicate'){
  const suffix=section.end===source.length?'':source.slice(section.end);
  const between=subtree.endsWith('\n\n')?'':subtree.endsWith('\n')?'\n':'\n\n';
  const duplicate=subtree+between+subtree;
  const value=source.slice(0,section.offset)+duplicate+suffix;
  if(value.length>MAX_BODY)throw new Error('Duplicated section exceeds 200,000 characters. No edits applied.');
  return {value,offset:section.offset+subtree.length+between.length,
   heading:section.title,affectedHeadings:headings.length,
   originalCharacters:subtree.length,nextLevel:section.level};
 }
 const delta=action==='promote'?-1:1;
 if(headings.some(heading=>heading.level+delta<1||heading.level+delta>6))
  throw new Error('Heading levels must stay between 1 and 6. No edits applied.');
 if(action==='demote'){
  // A selected sibling must have a previous equal-level sibling to become its child.
  const siblings=sections.filter(item=>item.level===section.level&&item.parent===section.parent);
  if(siblings.findIndex(item=>item.offset===selectedOffset)<=0)
   throw new Error('Demotion requires an earlier sibling heading.');
 }
 const lines=subtree.split('\n');
 for(const heading of headings){
  const original=lines[heading.line]!;
  const match=original.match(/^( {0,3})(#{1,6})(\s+.*)$/);
  if(!match)throw new Error('Cannot safely transform a nonstandard heading line.');
  lines[heading.line]=match[1]!+'#'.repeat(heading.level+delta)+match[3]!;
 }
 const transformed=lines.join('\n');
 const value=source.slice(0,section.offset)+transformed+source.slice(section.end);
 if(value.length>MAX_BODY)throw new Error('Changed section exceeds 200,000 characters. No edits applied.');
 return {value,offset:section.offset,heading:section.title,affectedHeadings:headings.length,
  originalCharacters:subtree.length,nextLevel:section.level+delta};
}
