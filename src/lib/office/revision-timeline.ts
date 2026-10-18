import {validateDocument,type OfficeDocument,type OfficeRevision} from './documents';
import {compareOfficeRevision} from './revision-review';
export const TIMELINE_PREVIEW_LINES=45;
export const TIMELINE_PREVIEW_CHARS=5000;
export interface OfficeTimelineEntry {
 revision:number;title:string;updatedAt:string;
 historical:boolean;lines:number;characters:number;
 changedSpan:number;titleChanged:boolean;
}
export function officeRevisionTimeline(value:OfficeDocument):OfficeTimelineEntry[]{
 const doc=validateDocument(value);
 const snapshots:OfficeRevision[]=[...doc.history,{revision:doc.revision,title:doc.title,body:doc.body,updatedAt:doc.updatedAt}];
 // Oldest source may be truncated by the original 12-snapshot retention policy.
 return snapshots.map((item,i)=>{
  const newer=snapshots[i+1];
  const change=newer?compareOfficeRevision(item.body,newer.body):null;
  return {revision:item.revision,title:item.title,updatedAt:item.updatedAt,
   historical:item.revision!==doc.revision,lines:item.body.split('\n').length,characters:item.body.length,
   changedSpan:change?.changedRows??0,titleChanged:!!newer&&item.title!==newer.title};
 }).reverse();
}
export function timelineExcerpt(source:string):{text:string;shownLines:number;totalLines:number;truncated:boolean}{
 const lines=source.split('\n');
 const limited=lines.slice(0,TIMELINE_PREVIEW_LINES).join('\n');
 const text=limited.slice(0,TIMELINE_PREVIEW_CHARS);
 return {text,shownLines:text.split('\n').length,totalLines:lines.length,
  truncated:lines.length>TIMELINE_PREVIEW_LINES||limited.length>TIMELINE_PREVIEW_CHARS};
}
