import {MAX_BODY} from './documents';
import {revisionHunks} from './revision-hunks';
export const MAX_MULTI_RECOVERY_HUNKS=20;
export interface MultiRevisionRecovery {
  value:string;
  selected:number;
  removedCurrentLines:number;
  restoredHistoricalLines:number;
}
/** Pure preview; caller is responsible for one original CAS save, never a new storage path. */
export function previewMultiRevisionRecovery(historical:string,current:string,indices:readonly number[]):MultiRevisionRecovery{
 if(!indices.length||indices.length>MAX_MULTI_RECOVERY_HUNKS)throw new Error('Choose between 1 and 20 historical changes.');
 if(historical.length>MAX_BODY||current.length>MAX_BODY)throw new Error('Source exceeds the Office document limit.');
 const diff=revisionHunks(historical,current);
 if(diff.summaryOnly||diff.truncated)throw new Error('Detailed historical changes are unavailable for this document. Use single-line recovery.');
 const ordered=[...indices].sort((a,b)=>a-b);
 for(let i=0;i<ordered.length;i++){
  if(!Number.isSafeInteger(ordered[i])||ordered[i]!<0||ordered[i]!>=diff.hunks.length||i>0&&ordered[i]===ordered[i-1])
   throw new Error('Selection contains an invalid or repeated historical change.');
 }
 const old=historical.split('\n'),lines=current.split('\n');
 let removed=0,restored=0;
 for(let i=ordered.length-1;i>=0;i--){
  const hunk=diff.hunks[ordered[i]!]!;
  const position=hunk.currentFrom-1;
  if(position<0||position>lines.length||hunk.added<0||position+hunk.added>lines.length)
   throw new Error('Invalid changed-hunk source boundary.');
  const original=hunk.removed?old.slice(hunk.historicalFrom-1,hunk.historicalTo):[];
  if(original.length!==hunk.removed)throw new Error('Invalid historical line boundary.');
  lines.splice(position,hunk.added,...original);
  removed+=hunk.added;restored+=hunk.removed;
 }
 const value=lines.join('\n');
 if(value.length>MAX_BODY)throw new Error('Combined recovery exceeds the 200,000-character Office limit. Nothing was applied.');
 if(value===current)throw new Error('Selected changes do not alter the current document.');
 return {value,selected:indices.length,removedCurrentLines:removed,restoredHistoricalLines:restored};
}
