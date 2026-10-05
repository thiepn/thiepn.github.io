import hub from '../data/hub.json';
import registry from '../data/hub-providers.json';
import { AUTOMATED_TRANSFERS_ENABLED } from '../lib/workflows/transfer';
import { HUB_RELEASE_ID, type HubReleaseStatus } from '../lib/hub-release-policy';
export const prerender = true;
export function GET() {
  const status: HubReleaseStatus = {
    schemaVersion: 1, releaseId: HUB_RELEASE_ID, profile: 'public-handoffs', appCount: hub.expectedCount,
    features: {
      hubSignIn: import.meta.env.PUBLIC_HUB_ACCOUNT_ENTRY === 'v1',
      privateReads: (import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_NOTES_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_TMS60_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_LIBRARY_PRIVATE === 'staged-v1') || registry.providers.some(p => p.privateReadsEnabled || ['summary', 'continue', 'search'].some(op => p.operations[op as keyof typeof p.operations])),
      inlineWrites: import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || registry.providers.some(p => p.inlineWritesEnabled || p.operations.capture) || registry.attentionContract.inlineWritesEnabled,
      inboxReads: import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || registry.attentionContract.privateReadsEnabled || registry.providers.some(p => p.operations.inbox),
      automatedTransfers: AUTOMATED_TRANSFERS_ENABLED,
    },
  };
  return new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
}
