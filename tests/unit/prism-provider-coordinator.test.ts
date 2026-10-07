import { describe, expect, it } from 'vitest';
import { PrismProviderCoordinator } from '../../src/lib/prism/provider-coordinator';
import { sessionProviderAdapter } from '../../src/lib/providers/session-adapters';
import type { ProviderAccess, RequestContext } from '../../src/lib/providers/types';

const now=Date.parse('2026-10-07T08:00:00.000Z');
const context={scope:'account' as const,accountId:'11111111-1111-4111-8111-111111111111',workspaceId:null,grantRevision:'44444444-4444-4444-8444-444444444444',translationId:null};
const access:ProviderAccess={providerId:'notes',context,permissions:['notes.hub.summary.read','notes.hub.continue.read'],expiresAt:now+300000};

function response(request:RequestContext){
  const isContinue=request.operation==='continue';
  return JSON.stringify({
    schemaVersion:1,
    providerId:'notes',
    operation:request.operation,
    requestId:request.requestId,
    context:request.context,
    privacy:'private',
    coverage:'cloud-snapshot',
    status:'ready',
    observedAt:new Date(now).toISOString(),
    expiresAt:new Date(now+120000).toISOString(),
    sourceUpdatedAt:new Date(now-1000).toISOString(),
    data:{items:isContinue?[{resourceId:'22222222-2222-4222-8222-222222222222',title:'Current note',updatedAt:new Date(now-1000).toISOString()}]:[]},
  });
}

describe('PrismProviderCoordinator',()=>{
  it('erases private cached contributions when their access expires',async()=>{
    let clock=now;
    const coordinator=new PrismProviderCoordinator(()=>clock);
    coordinator.setConnection(sessionProviderAdapter('notes',{readRequest:async request=>response(request)}),{...access,expiresAt:now+1000});
    await coordinator.refresh([{providerId:'notes',operation:'continue'}],()=>{});
    expect(coordinator.snapshotView().continue.title).toBe('Current note');
    clock=now+1000;
    expect(coordinator.snapshotResults()).toEqual([]);
    expect(coordinator.connectedProviders()).toEqual([]);
    expect(coordinator.snapshotView().continue.title).toBeNull();
  });
  it('retains operation-bound results for visible provider work',async()=>{
    const coordinator=new PrismProviderCoordinator(()=>now);
    const adapter=sessionProviderAdapter('notes',{readRequest:async request=>response(request)});
    coordinator.setConnection(adapter,access);
    const emissions:any[]=[];
    await coordinator.refresh([
      {providerId:'notes',operation:'summary'},
      {providerId:'notes',operation:'continue'},
    ],(view,results)=>emissions.push({view,results}));
    expect(coordinator.snapshotResults().map(result=>result.operation).sort()).toEqual(['continue','summary']);
    expect(coordinator.snapshotView().continue.title).toBe('Current note');
    expect(emissions.length).toBeGreaterThan(0);
  });

  it('drops hidden operations rather than retaining stale Home contributions',async()=>{
    const coordinator=new PrismProviderCoordinator(()=>now);
    const adapter=sessionProviderAdapter('notes',{readRequest:async request=>response(request)});
    coordinator.setConnection(adapter,access);
    await coordinator.refresh([{providerId:'notes',operation:'continue'}],()=>{});
    expect(coordinator.snapshotView().continue.state).toBe('ready');
    await coordinator.refresh([{providerId:'notes',operation:'summary'}],()=>{});
    expect(coordinator.snapshotResults().map(result=>result.operation)).toEqual(['summary']);
    expect(coordinator.snapshotView().continue.state).toBe('empty');
  });

  it('keeps an operation failure scoped to that operation',async()=>{
    const coordinator=new PrismProviderCoordinator(()=>now);
    const adapter=sessionProviderAdapter('notes',{readRequest:async request=>{
      if(request.operation==='summary')throw new Error('fixture failure');
      return response(request);
    }});
    coordinator.setConnection(adapter,access);
    await coordinator.refresh([
      {providerId:'notes',operation:'summary'},
      {providerId:'notes',operation:'continue'},
    ],()=>{});
    expect(coordinator.snapshotResults().find(result=>result.operation==='summary')?.status).toBe('error');
    expect(coordinator.snapshotView().continue.state).toBe('ready');
  });

  it('rejects mismatched adapter/access ownership and clears removed providers',async()=>{
    const coordinator=new PrismProviderCoordinator(()=>now);
    const adapter=sessionProviderAdapter('notes',{readRequest:async request=>response(request)});
    expect(()=>coordinator.setConnection(adapter,{...access,providerId:'tms60'})).toThrow('Provider adapter/access mismatch');
    coordinator.setConnection(adapter,access);
    await coordinator.refresh([{providerId:'notes',operation:'continue'}],()=>{});
    coordinator.removeConnection('notes');
    expect(coordinator.connectedProviders()).toEqual([]);
    expect(coordinator.snapshotResults()).toEqual([]);
  });
});
