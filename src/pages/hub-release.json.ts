import hub from '../data/hub.json';
import registry from '../data/hub-providers.json';
import { AUTOMATED_TRANSFERS_ENABLED } from '../lib/workflows/transfer';
import release from '../../release-hub.json';
import { READING_PILOT_ENABLED } from '../lib/reading-pilot';
import { type HubReleaseStatus } from '../lib/hub-release-policy';
export const prerender = true;
export function GET() {
  const status: HubReleaseStatus = {
    schemaVersion: 1, releaseId: release.releaseId, profile: release.profile as HubReleaseStatus['profile'], appCount: hub.expectedCount,
    features: {
      hubSignIn: release.profile === 'library-ecosystem',
      privateReads: READING_PILOT_ENABLED || (import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_CAPTURE_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_NOTES_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_TMS60_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_LIBRARY_PRIVATE === 'staged-v1') || registry.providers.some(p => p.privateReadsEnabled || ['summary', 'continue', 'search'].some(op => p.operations[op as keyof typeof p.operations])),
      inlineWrites: import.meta.env.PUBLIC_HUB_WORKFLOWS_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_CAPTURE_PRIVATE === 'staged-v1' || import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || registry.providers.some(p => p.inlineWritesEnabled || p.operations.capture) || registry.attentionContract.inlineWritesEnabled,
      inboxReads: import.meta.env.PUBLIC_HUB_INBOX_PRIVATE === 'staged-v1' || registry.attentionContract.privateReadsEnabled || registry.providers.some(p => p.operations.inbox),
      automatedTransfers: AUTOMATED_TRANSFERS_ENABLED,
    },
  };
  return new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
}
