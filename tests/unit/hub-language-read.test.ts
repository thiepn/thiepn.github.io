import { describe, expect, it, vi } from 'vitest';
import { fetchHubLanguages, ownerLanguageLink, visibleHubLanguages } from '../../src/lib/workspace/language-read';

const NOW = Date.parse('2026-10-16T12:00:00Z');
function snapshot() {
  return {
    schema: 'thiepn-language-dashboard', schemaVersion: 1, contractVersion: 'p9-dashboard-v1',
    generatedAt: '2026-10-16T11:00:00Z',
    enrollments: [{appId:'japanese',languageId:'japanese',visible:true,connectedAt:'2026-10-14T10:00:00Z',updatedAt:'2026-10-16T10:00:00Z'}],
    snapshots: [{
      appId: 'japanese', languageId: 'japanese', revision: 4, storedAt: '2026-10-16T11:00:00Z',
      snapshot: {
        schema: 'thiepn-language-read-model', schemaVersion: 1, generatedAt: '2026-10-16T11:00:00Z',
        appId:'japanese',languageId:'japanese',source:{authority:'consumer'},workload:{dueItems:7},
        activity:{todayEvents:3,streakDays:4,lastStudiedAt:'2026-10-16T10:00:00Z'},
        progress:{metrics:[{label:'Kana introduced',current:65,total:92,unit:'items'}]},
        nextAction:{label:'Review kana',route:'#/review'},
      }
    }]
  };
}
describe('Hub Core P9 read-only language projection', () => {
  it('renders genuine Japanese producer numbers without recomputing grades', () => {
    const cards=visibleHubLanguages(snapshot(),NOW);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({appId:'japanese',due:7,todayEvents:3,streakDays:4,stale:false});
    expect(cards[0]?.metrics).toEqual([{label:'Kana introduced',current:65,total:92,unit:'items'}]);
  });
  it('respects producer enrollment visibility and never turns missing sources into zero due', () => {
    const source=snapshot();
    source.enrollments[0]!.visible=false;
    expect(visibleHubLanguages(source,NOW)).toEqual([]);
  });
  it('rejects mismatched producer identity and malformed Core payloads', () => {
    const source=snapshot();
    source.snapshots[0]!.snapshot.appId='french';
    expect(()=>visibleHubLanguages(source,NOW)).toThrow();
    expect(()=>visibleHubLanguages({},NOW)).toThrow();
  });
  it('keeps owner deep links within the reviewed app path, not merely origin', () => {
    const owner='https://thiepn.dev/japanese/';
    expect(ownerLanguageLink(owner,'#/review')).toBe('https://thiepn.dev/japanese/#/review');
    expect(ownerLanguageLink(owner,'https://example.org/steal')).toBe(owner);
    expect(ownerLanguageLink(owner,'/notes/private')).toBe(owner);
    expect(ownerLanguageLink(owner,'javascript:alert(1)')).toBe(owner);
  });
  it('uses a no-store authenticated GET and Core envelope validation', async () => {
    const fetcher=vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ok:true,data:snapshot()}),{status:200}));
    const cards=await fetchHubLanguages('test-account-token',new AbortController().signal,fetcher as typeof fetch);
    expect(cards[0]?.due).toBe(7);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://thiepn-core-gateway.thiepn.workers.dev/v1/languages/dashboard');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method:'GET',cache:'no-store',credentials:'omit',redirect:'error',
      headers:{Authorization:'Bearer test-account-token'},
    });
  });
});
