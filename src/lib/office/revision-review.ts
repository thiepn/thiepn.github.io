import {MAX_BODY,type OfficeRevision} from './documents';
export const MAX_COMPARE_ROWS=80;
export const MAX_RECOVER_LINES=200;
export const MAX_RECOVER_TEXT=40_000;
export interface RevisionDifference {line:number;historical:string|null;current:string|null}
export interface RevisionComparison {
 historicalLines:number;currentLines:number;changedRows:number;addedRows:number;removedRows:number;
 differences:RevisionDifference[];truncated:boolean;
}
export function compareOfficeRevision(historical:string,current:string):RevisionComparison{
 if(historical.length>MAX_BODY||current.length>MAX_BODY)throw new Error('Cannot compare text beyond Office document limits.');
 const before=historical.split('\n'),after=current.split('\n');
 let prefix=0;
 while(prefix<Math.min(before.length,after.length)&&before[prefix]===after[prefix])prefix++;
 let oldEnd=before.length,newEnd=after.length;
 while(oldEnd>prefix&&newEnd>prefix&&before[oldEnd-1]===after[newEnd-1]){oldEnd--;newEnd--;}
 const oldChanged=oldEnd-prefix,newChanged=newEnd-prefix,changedRows=Math.max(oldChanged,newChanged);
 const differences:RevisionDifference[]=[];
 for(let i=0;i<Math.min(changedRows,MAX_COMPARE_ROWS);i++){
  differences.push({line:prefix+i+1,historical:i<oldChanged?before[prefix+i]!:null,current:i<newChanged?after[prefix+i]!:null});
 }
 return {historicalLines:before.length,currentLines:after.length,changedRows,
  addedRows:Math.max(0,newChanged-oldChanged),removedRows:Math.max(0,oldChanged-newChanged),
  differences,truncated:changedRows>MAX_COMPARE_ROWS};
}
export function recoverRevisionLines(history:OfficeRevision,startLine:number,endLine:number):string{
 if(!Number.isSafeInteger(startLine)||!Number.isSafeInteger(endLine)||startLine<1||endLine<startLine||
   endLine-startLine+1>MAX_RECOVER_LINES)throw new Error('Select 1–200 consecutive historical lines.');
 const rows=history.body.split('\n');
 if(endLine>rows.length)throw new Error('Requested historical lines are not available.');
 const excerpt=rows.slice(startLine-1,endLine).join('\n');
 if(!excerpt||excerpt.length>MAX_RECOVER_TEXT)throw new Error('Historical excerpt must be nonempty and at most 40,000 characters.');
 return excerpt;
}
export function applyRevisionExcerpt(current:string,excerpt:string,start:number,end:number,mode:'insert'|'replace'):string{
 if(current.length>MAX_BODY||!excerpt.length||excerpt.length>MAX_RECOVER_TEXT||
   !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>current.length)
   throw new Error('Invalid revision recovery selection. Nothing changed.');
 if(mode==='insert'){end=start;}
 else if(mode==='replace'&&start===end)throw new Error('Select nonempty current text to replace. Nothing changed.');
 else if(mode!=='replace')throw new Error('Unknown recovery action.');
 const result=current.slice(0,start)+excerpt+current.slice(end);
 if(result.length>MAX_BODY)throw new Error('Recovered content would exceed 200,000 characters.');
 return result;
}
