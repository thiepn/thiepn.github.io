import {validateDocument,type OfficeDocument,type OfficeRevision} from './documents';
import {revisionHunks,type RevisionHunk} from './revision-hunks';
export const MAX_HISTORY_QUERY=120;
export const MAX_HISTORY_SNIPPET=160;
export const MAX_COMPARE_PREVIEW_HUNKS=40;
export interface HistorySearchHit {
 revision:number;title:string;updatedAt:string;historical:boolean;
 match:'all'|'title'|'body';snippet:string;
}
export interface SavedRevisionComparison {
 leftRevision:number;rightRevision:number;leftTitle:string;rightTitle:string;
 identicalBodies:boolean;titleChanged:boolean;totalHunks:number;
 truncated:boolean;summaryOnly:boolean;hunks:RevisionHunk[];
}
function actualRevisions(value:OfficeDocument):OfficeRevision[]{
 const doc=validateDocument(value);
 return [...doc.history,{revision:doc.revision,title:doc.title,body:doc.body,updatedAt:doc.updatedAt}];
}
/** Searches existing Office source in memory; never indexes, stores or publishes historical content. */
export function searchOfficeHistory(value:OfficeDocument,query:string,caseSensitive=false):HistorySearchHit[]{
 if(query.length>MAX_HISTORY_QUERY)throw new Error('History search is limited to 120 characters.');
 const trimmed=query.trim();
 const needle=caseSensitive?trimmed:trimmed.toLocaleLowerCase();
 return actualRevisions(value).reverse().flatMap((rev,index)=>{
  if(!needle)return [{
   revision:rev.revision,title:rev.title,updatedAt:rev.updatedAt,
   historical:index!==0,match:'all' as const,snippet:''
  }];
  const title=caseSensitive?rev.title:rev.title.toLocaleLowerCase();
  const body=caseSensitive?rev.body:rev.body.toLocaleLowerCase();
  const titleHit=title.includes(needle),position=body.indexOf(needle);
  if(!titleHit&&position<0)return [];
  const start=Math.max(0,position-45),end=Math.min(rev.body.length,position+needle.length+90);
  const raw=position<0?'':rev.body.slice(start,end).replace(/\s+/g,' ');
  return [{
   revision:rev.revision,title:rev.title,updatedAt:rev.updatedAt,
   historical:index!==0,
   match:(titleHit?'title':'body') as 'title'|'body',
   snippet:raw.length>MAX_HISTORY_SNIPPET?raw.slice(0,MAX_HISTORY_SNIPPET):raw
  }];
 });
}
/** Two authentic stored versions. Diff is bounded and readonly; save remains with original Office CAS writer. */
export function compareOfficeSavedVersions(value:OfficeDocument,leftRevision:number,rightRevision:number):SavedRevisionComparison{
 const snapshots=actualRevisions(value);
 if(!Number.isSafeInteger(leftRevision)||!Number.isSafeInteger(rightRevision)||leftRevision===rightRevision)
  throw new Error('Choose two different retained revision numbers.');
 const left=snapshots.find(row=>row.revision===leftRevision),right=snapshots.find(row=>row.revision===rightRevision);
 if(!left||!right)throw new Error('A selected revision is no longer retained.');
 const differences=revisionHunks(left.body,right.body);
 return {
  leftRevision,rightRevision,leftTitle:left.title,rightTitle:right.title,
  identicalBodies:left.body===right.body,titleChanged:left.title!==right.title,
  totalHunks:differences.totalHunks,truncated:differences.truncated,summaryOnly:differences.summaryOnly,
  hunks:differences.hunks.slice(0,MAX_COMPARE_PREVIEW_HUNKS)
 };
}
