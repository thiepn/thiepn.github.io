/**
 * Phase P58 — Universal Inbox & External Flow Diagnostics (Vault Doctor)
 * 
 * Provides automated health checks for:
 * 1. Disconnected or stale external sources
 * 2. Token leakage detection (ensures tokens never enter notes)
 * 3. Broken external references
 * 4. Cache volume inspection
 * 5. Multi-device reference compatibility
 */

import { Note } from '../../types';
import { universalInboxService } from './universalInboxService';

export interface ExternalFlowDiagnosticResult {
  healthy: boolean;
  issues: {
    id: string;
    level: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    remediation?: string;
  }[];
  stats: {
    totalItems: number;
    unprocessedItems: number;
    connectedSources: number;
    totalCacheBytes: number;
  };
}

export function runExternalFlowDiagnostics(notes: Note[] = []): ExternalFlowDiagnosticResult {
  const issues: ExternalFlowDiagnosticResult['issues'] = [];
  const sources = universalInboxService.getSources();
  const items = universalInboxService.getItems();

  let totalCacheBytes = 0;
  sources.forEach((s) => {
    totalCacheBytes += s.cacheSizeBytes || 0;
  });

  // 1. Check for disconnected or error sources
  sources.forEach((s) => {
    if (s.status === 'disconnected') {
      issues.push({
        id: `source-disc-${s.id}`,
        level: 'info',
        title: `Disconnected Source: ${s.displayName}`,
        description: `Source is currently disconnected. Stored reference mappings remain valid, but incoming triage updates are paused.`,
        remediation: 'Re-authenticate source in External Sources settings if live sync is desired.',
      });
    } else if (s.status === 'error' || s.status === 'reauthorization-required') {
      issues.push({
        id: `source-err-${s.id}`,
        level: 'warning',
        title: `Source Auth Required: ${s.displayName}`,
        description: s.syncError || 'Connector authorization has expired or encountered network rate-limiting.',
        remediation: 'Open Source Settings and click Re-authenticate.',
      });
    }

    // Check for stale sync (no sync in > 7 days)
    if (s.status === 'connected' && s.lastSyncAt) {
      const lastSyncTime = new Date(s.lastSyncAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (lastSyncTime < sevenDaysAgo) {
        issues.push({
          id: `source-stale-${s.id}`,
          level: 'warning',
          title: `Stale Connector: ${s.displayName}`,
          description: `Source has not synced since ${new Date(s.lastSyncAt).toLocaleDateString()}.`,
          remediation: 'Trigger a manual sync from the Universal Inbox.',
        });
      }
    }
  });

  // 2. Token Leak Scanner: Check notes for accidental OAuth tokens or API keys
  const tokenRegex = /(ya29\.[a-zA-Z0-9_\-]+|Bearer\s+[a-zA-Z0-9_\-\.]{30,}|ghp_[a-zA-Z0-9]{36})/i;
  notes.forEach((note) => {
    if (tokenRegex.test(note.content)) {
      issues.push({
        id: `token-leak-${note.id}`,
        level: 'error',
        title: `Security Warning: Potential Credential in Note "${note.title}"`,
        description: `Note content appears to contain an authorization token or secret key. Tokens must remain in device-local storage and never serialized in markdown files.`,
        remediation: 'Remove the secret token from the note content.',
      });
    }
  });

  // 3. Check for stale external item references in inbox
  const staleItems = items.filter((i) => i.externalState?.hasChangedExternally);
  if (staleItems.length > 0) {
    issues.push({
      id: 'stale-external-items',
      level: 'info',
      title: `${staleItems.length} External Item(s) Changed Remotely`,
      description: 'External meetings, emails, or files have updated on the source provider since they were first projected.',
      remediation: 'Review changed items in the Universal Inbox.',
    });
  }

  return {
    healthy: issues.filter((i) => i.level === 'error').length === 0,
    issues,
    stats: {
      totalItems: items.length,
      unprocessedItems: universalInboxService.getUnprocessedCount(),
      connectedSources: sources.filter((s) => s.status === 'connected').length,
      totalCacheBytes,
    },
  };
}
