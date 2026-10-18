import {MAX_BODY} from './documents';
export const MAX_DETAILED_DIFF_LINES=800;
export const MAX_NAVIGABLE_HUNKS=60;
export const MAX_HUNK_SAMPLE_LINES=8;
export interface RevisionHunk {
  historicalFrom:number;historicalTo:number;
  currentFrom:number;currentTo:number;
  removed:number;added:number;
  historicalSample:string[];currentSample:string[];
}
export interface RevisionHunkResult {hunks:RevisionHunk[];totalHunks:number;truncated:boolean;summaryOnly:boolean}
export function revisionHunks(historical:string,current:string):RevisionHunkResult{
  if(historical.length>MAX_BODY||current.length>MAX_BODY)throw new Error('Office revision exceeds document size limit.');
  const old=historical.split('\n'),now=current.split('\n');
  if(historical===current)return {hunks:[],totalHunks:0,truncated:false,summaryOnly:false};
  if(old.length>MAX_DETAILED_DIFF_LINES||now.length>MAX_DETAILED_DIFF_LINES){
    let start=0;
    while(start<old.length&&start<now.length&&old[start]===now[start])start++;
    let o=old.length,n=now.length;
    while(o>start&&n>start&&old[o-1]===now[n-1]){o--;n--;}
    return {hunks:[{
      historicalFrom:start+1,historicalTo:o,currentFrom:start+1,currentTo:n,
      removed:o-start,added:n-start,
      historicalSample:old.slice(start,Math.min(o,start+MAX_HUNK_SAMPLE_LINES)),
      currentSample:now.slice(start,Math.min(n,start+MAX_HUNK_SAMPLE_LINES))
    }],totalHunks:1,truncated:false,summaryOnly:true};
  }
  const n=old.length,m=now.length,stride=m+1,dp=new Uint16Array((n+1)*stride);
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--){
    const idx=i*stride+j;
    dp[idx]=old[i]===now[j]?1+dp[idx+stride+1]!:Math.max(dp[idx+stride]!,dp[idx+1]!);
  }
  const hunks:RevisionHunk[]=[];
  let totalHunks=0,i=0,j=0,oldStart=-1,newStart=-1;
  const flush=()=>{
    if(oldStart<0)return;
    totalHunks++;
    if(hunks.length<MAX_NAVIGABLE_HUNKS){
      hunks.push({
        historicalFrom:oldStart+1,historicalTo:i,
        currentFrom:newStart+1,currentTo:j,
        removed:i-oldStart,added:j-newStart,
        historicalSample:old.slice(oldStart,Math.min(i,oldStart+MAX_HUNK_SAMPLE_LINES)),
        currentSample:now.slice(newStart,Math.min(j,newStart+MAX_HUNK_SAMPLE_LINES))
      });
    }
    oldStart=newStart=-1;
  };
  while(i<n||j<m){
    if(i<n&&j<m&&old[i]===now[j]){flush();i++;j++;continue;}
    if(oldStart<0){oldStart=i;newStart=j;}
    if(j<m&&(i===n||dp[i*stride+j+1]!>=dp[(i+1)*stride+j]!))j++;
    else i++;
  }
  flush();
  return {hunks,totalHunks,truncated:totalHunks>MAX_NAVIGABLE_HUNKS,summaryOnly:false};
}
