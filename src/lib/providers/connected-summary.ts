import {PROVIDER_BUDGETS} from './registry';
import {connectionErrorCode, sourceStatus, type ConnectedSource, type ConnectionErrorCode} from './connection-state';
export interface SummaryJob<T> {source:ConnectedSource; read(signal:AbortSignal):Promise<T[]>}
/** Bounded ephemeral reads only. Callers must obtain current owner/grant access first. */
export async function collectSummaries<T extends {expiresAt:number}>(jobs:readonly SummaryJob<T>[], signal:AbortSignal):Promise<T[]> {
  if(jobs.length>9)throw new Error('Connected summary budget exceeded');
  const outcomes=new Map<ConnectedSource,{remaining:number;items:T[];successes:number;errors:ConnectionErrorCode[]}>();
  for(const job of jobs){const row=outcomes.get(job.source)??{remaining:0,items:[],successes:0,errors:[]};row.remaining++;outcomes.set(job.source,row);}
  for(const source of outcomes.keys())if(!signal.aborted)sourceStatus(source,'checking');
  let cursor=0;
  const values:T[][]=Array.from({length:jobs.length},()=>[]);
  async function worker(){
    while(cursor<jobs.length&&!signal.aborted){
      const index=cursor++, job=jobs[index]!, row=outcomes.get(job.source)!;
      const deadline=new AbortController();
      const timer=setTimeout(()=>deadline.abort(new DOMException('Read deadline exceeded','TimeoutError')),PROVIDER_BUDGETS.deadlineMs);
      const combined=AbortSignal.any([signal,deadline.signal]);
      let detach=()=>{};
      try{
        const aborted=new Promise<never>((_,reject)=>{const abort=()=>reject(combined.reason);combined.addEventListener('abort',abort,{once:true});detach=()=>combined.removeEventListener('abort',abort);if(combined.aborted)abort();});
        const items=await Promise.race([job.read(combined),aborted]);
        if(signal.aborted)return;
        const fresh=items.filter(item=>Number.isFinite(item.expiresAt)&&item.expiresAt>Date.now());
        values[index]=fresh;row.items.push(...fresh);row.successes++;
      }catch(error){if(signal.aborted)return;row.errors.push(connectionErrorCode(error,typeof navigator==='undefined'||navigator.onLine));}
      finally{clearTimeout(timer);detach();}
      row.remaining--;
      if(row.remaining===0&&!signal.aborted){
        const errorCode=row.errors[0];
        const status=row.successes?row.errors.length?'partial':row.items.length?'ready':'empty':errorCode==='network-unavailable'?'offline':errorCode==='permission-required'?'revoked':'error';
        sourceStatus(job.source,status,{...(errorCode?{errorCode}:{}),expiresAt:Math.min(Date.now()+60_000,...row.items.map(item=>item.expiresAt))});
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(PROVIDER_BUDGETS.concurrency,jobs.length)},worker));
  return signal.aborted?[]:values.flat().slice(0,20);
}
