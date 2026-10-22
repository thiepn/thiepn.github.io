import {MAX_BODY} from './documents';
import {outlineFor} from './library';
export const MAX_FIND_MATCHES=500;
export const MAX_FIND_QUERY=120;
export interface TextMatch {start:number;end:number}
export interface TextSearch {matches:TextMatch[];truncated:boolean}
export interface EditorSection {offset:number;end:number;level:number;title:string;parent:number|null}
function literalPattern(term:string,matchCase:boolean):RegExp{
 if(term.length<1||term.length>MAX_FIND_QUERY)throw new Error('Find text must contain 1–120 characters.');
 const escaped=term.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
 return new RegExp(escaped,matchCase?'g':'gi');
}
export function findEditorText(source:string,term:string,matchCase=false):TextSearch{
 if(!term)return {matches:[],truncated:false};
 if(source.length>MAX_BODY)throw new Error('Office document is too long to search.');
 const regex=literalPattern(term,matchCase);
 const matches:TextMatch[]=[];
 for(const match of source.matchAll(regex)){
  if(matches.length===MAX_FIND_MATCHES)return {matches,truncated:true};
  matches.push({start:match.index,end:match.index+match[0].length});
 }
 return {matches,truncated:false};
}
export function replaceEditorText(source:string,term:string,replacement:string,matchCase=false):{value:string;count:number}{
 if(replacement.length>MAX_BODY)throw new Error('Replacement exceeds the Office document limit.');
 const result=findEditorText(source,term,matchCase);
 if(result.truncated)throw new Error('More than 500 matches. Narrow your search before replacing.');
 if(!result.matches.length)return {value:source,count:0};
 let value='',cursor=0;
 for(const hit of result.matches){
  value+=source.slice(cursor,hit.start)+replacement;
  cursor=hit.end;
  if(value.length+source.length-cursor>MAX_BODY)throw new Error('Replacement exceeds 200,000 characters. No edits applied.');
 }
 value+=source.slice(cursor);
 if(value.length>MAX_BODY)throw new Error('Replacement exceeds 200,000 characters. No edits applied.');
 return {value,count:result.matches.length};
}
export function documentSections(source:string):EditorSection[]{
 const heads=outlineFor(source),stack:EditorSection[]=[],sections:EditorSection[]=[];
 for(const heading of heads){
  while(stack.length&&stack[stack.length-1]!.level>=heading.level)stack.pop();
  const section:EditorSection={offset:heading.offset,end:source.length,level:heading.level,title:heading.title,parent:stack.length?stack[stack.length-1]!.offset:null};
  sections.push(section);stack.push(section);
 }
 for(let i=0;i<sections.length;i++){
  const section=sections[i]!;
  const after=sections.slice(i+1).find(other=>other.level<=section.level);
  if(after)section.end=after.offset;
 }
 return sections;
}
export type SectionDirection='earlier'|'later';
export function moveDocumentSection(source:string,offset:number,direction:SectionDirection):{value:string;offset:number}{
 const sections=documentSections(source),index=sections.findIndex(s=>s.offset===offset);
 if(index<0)throw new Error('The selected section no longer exists.');
 const selected=sections[index]!;
 const siblings=sections.filter(s=>s.level===selected.level&&s.parent===selected.parent);
 const position=siblings.findIndex(s=>s.offset===selected.offset);
 const other=siblings[position+(direction==='earlier'?-1:1)];
 if(!other)throw new Error('No adjacent sibling section in that direction.');
 if(direction==='earlier'){
  const beginning=other.offset,end=selected.end;
  return {value:source.slice(0,beginning)+source.slice(selected.offset,end)+source.slice(beginning,selected.offset)+source.slice(end),offset:beginning};
 }
 const beginning=selected.offset,end=other.end;
 return {value:source.slice(0,beginning)+source.slice(other.offset,end)+source.slice(beginning,other.offset)+source.slice(end),offset:beginning+end-other.offset};
}
