import {afterEach,describe,expect,it,vi} from 'vitest';
import {ConnectionFailure,clearSourceStates,sourceStatus,sourceStates,safeDiagnostics,sourcePresentation,connectionErrorCode} from '../../src/lib/providers/connection-state';
import {collectSummaries} from '../../src/lib/providers/connected-summary';
afterEach(()=>{clearSourceStates();vi.useRealTimers();});
describe('connection health and bounded summaries',()=>{
 it('retains last success through failure and treats expired metadata as stale',()=>{
  vi.useFakeTimers();vi.setSystemTime(1000);sourceStatus('notes','ready',{expiresAt:2000});
  expect(sourceStates()[0]).toMatchObject({checkedAt:1000,lastSuccessAt:1000,status:'ready'});
  vi.setSystemTime(2000);expect(sourceStates()[0]?.status).toBe('stale');
  sourceStatus('notes','checking');expect(sourceStates()[0]).toMatchObject({checkedAt:1000,lastSuccessAt:1000});
  sourceStatus('notes','error',{errorCode:'service-unavailable'});expect(sourceStates()[0]).toMatchObject({checkedAt:2000,lastSuccessAt:1000,errorCode:'service-unavailable'});
 });
 it('uses explicit recovery actions and never exports an exception message or owner data',()=>{
  const error=new ConnectionFailure('permission-required','SECRET token and private resource title');
  sourceStatus('notes','revoked',{errorCode:connectionErrorCode(error)});
  const report=JSON.stringify(safeDiagnostics());expect(report).not.toContain('SECRET');expect(report).not.toContain('private resource');
  expect(sourcePresentation(sourceStates()[0],true).repair).toBe('sharing');expect(sourcePresentation(sourceStates()[0],false).repair).toBe('account');
  clearSourceStates();expect(safeDiagnostics().sources).toEqual([]);
 });
 it('rejects diagnostic codes outside the public allowlist',()=>{
  expect(()=>sourceStatus('notes','error',{errorCode:'private query' as any})).toThrow('Invalid connection');
 });
 it('limits concurrent reads and publishes partial results when one translation fails',async()=>{
  let active=0,max=0;const releases:(()=>void)[]=[];
  const jobs=Array.from({length:5},(_,index)=>({source:'tms60' as const,read:async()=>{active++;max=Math.max(max,active);await new Promise<void>(resolve=>releases.push(resolve));active--;if(index===2)throw new ConnectionFailure('permission-required','private response');return [{expiresAt:Date.now()+60000,index}];}}));
  const run=collectSummaries(jobs,new AbortController().signal);
  await vi.waitFor(()=>expect(releases.length).toBe(3));releases.splice(0).forEach(resolve=>resolve());
  await vi.waitFor(()=>expect(releases.length).toBe(2));releases.splice(0).forEach(resolve=>resolve());
  expect(await run).toHaveLength(4);expect(max).toBe(3);expect(sourceStates()[0]).toMatchObject({status:'partial',errorCode:'permission-required'});
 });
 it('enforces a deadline even if an owner ignores cancellation, without false empty results',async()=>{
  vi.useFakeTimers();const run=collectSummaries([{source:'notes',read:()=>new Promise<never>(()=>{})}],new AbortController().signal);
  await vi.advanceTimersByTimeAsync(2001);expect(await run).toEqual([]);expect(sourceStates()[0]).toMatchObject({status:'error',errorCode:'deadline-exceeded',lastSuccessAt:null});
 });
 it('never emits late results or status after an owner/privacy boundary abort',async()=>{
  const controller=new AbortController();let finish!:(items:{expiresAt:number}[])=>void;
  const run=collectSummaries([{source:'notes',read:()=>new Promise<{expiresAt:number}[]>(resolve=>finish=resolve)}],controller.signal);
  controller.abort();clearSourceStates();finish([{expiresAt:Date.now()+60000}]);expect(await run).toEqual([]);expect(sourceStates()).toEqual([]);
 });
});
