/**
 * Phase P58 — Universal Inbox Storage & Vault Privacy Adapter
 * 
 * Manages storage for:
 * 1. Universal Inbox Items (triage projections)
 * 2. External Sources registry & credentials (device-local)
 * 3. Source routing rules
 * 4. Vault Lock hygiene (flushes decrypted in-memory items on lock)
 */

import { UniversalInboxItem, ExternalSource, SourceRoutingRule } from './inboxTypes';

const STORAGE_KEYS = {
  INBOX_ITEMS: 'pkm_universal_inbox_items_v1',
  SOURCES: 'pkm_external_sources_v1',
  ROUTING_RULES: 'pkm_source_routing_rules_v1',
  DEVICE_TOKENS: 'pkm_device_local_tokens_v1', // Strictly device local
};

export class InboxStorage {
  private isLocked = false;
  private inMemoryItems: UniversalInboxItem[] | null = null;
  private inMemorySources: ExternalSource[] | null = null;

  public lock(): void {
    this.isLocked = true;
    this.inMemoryItems = null;
    this.inMemorySources = null;
  }

  public unlock(): void {
    this.isLocked = false;
  }

  public isVaultLocked(): boolean {
    return this.isLocked;
  }

  // --- Inbox Items ---

  public getItems(): UniversalInboxItem[] {
    if (this.isLocked) return [];
    if (this.inMemoryItems) return this.inMemoryItems;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INBOX_ITEMS);
      if (!raw) {
        const seeded = this.getInitialSeededItems();
        this.saveItems(seeded);
        return seeded;
      }
      const parsed = JSON.parse(raw);
      this.inMemoryItems = Array.isArray(parsed) ? parsed : [];
      return this.inMemoryItems;
    } catch (e) {
      console.error('Failed to load Universal Inbox items from storage:', e);
      return [];
    }
  }

  public saveItems(items: UniversalInboxItem[]): void {
    if (this.isLocked) return;
    this.inMemoryItems = items;
    try {
      localStorage.setItem(STORAGE_KEYS.INBOX_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist Universal Inbox items:', e);
    }
  }

  // --- External Sources ---

  public getSources(): ExternalSource[] {
    if (this.isLocked) return [];
    if (this.inMemorySources) return this.inMemorySources;

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SOURCES);
      if (!raw) {
        const seeded = this.getInitialSeededSources();
        this.saveSources(seeded);
        return seeded;
      }
      const parsed = JSON.parse(raw);
      this.inMemorySources = Array.isArray(parsed) ? parsed : [];
      return this.inMemorySources;
    } catch (e) {
      console.error('Failed to load External Sources from storage:', e);
      return [];
    }
  }

  public saveSources(sources: ExternalSource[]): void {
    if (this.isLocked) return;
    this.inMemorySources = sources;
    try {
      localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    } catch (e) {
      console.error('Failed to persist External Sources:', e);
    }
  }

  // --- Routing Rules ---

  public getRoutingRules(): SourceRoutingRule[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROUTING_RULES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  public saveRoutingRules(rules: SourceRoutingRule[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTING_RULES, JSON.stringify(rules));
    } catch (e) {
      console.error('Failed to save source routing rules:', e);
    }
  }

  // --- Clear Cache / Disconnect ---

  public clearConnectorCache(connectorId?: string): void {
    const items = this.getItems();
    let updated: UniversalInboxItem[];
    if (connectorId) {
      // Retain local captures and items from other sources
      updated = items.filter(
        (item) => item.source === 'local-capture' || item.externalRef?.connectorId !== connectorId
      );
    } else {
      // Clear all external items, retain local captures
      updated = items.filter((item) => item.source === 'local-capture');
    }
    this.saveItems(updated);
  }

  // --- Seed Data for Instant Demonstration ---

  private getInitialSeededSources(): ExternalSource[] {
    return [
      {
        id: 'src-gmail-work',
        kind: 'email',
        provider: 'gmail',
        displayName: 'Work Email (Gmail)',
        accountIdentifier: 'alex.taylor@company.com',
        status: 'connected',
        capabilities: {
          canRead: true,
          canMarkRead: true,
          canArchive: true,
          canDraftReply: true,
          canSendReply: true,
          canRsvp: false,
          canDownloadFile: true,
          canSearchRemote: true,
        },
        lastSyncAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        itemCount: 4,
        cacheSizeBytes: 42800,
        authConfig: {
          isAuthorizedLocally: true,
          scopesGranted: ['email.readonly', 'email.modify'],
        },
      },
      {
        id: 'src-gcal-main',
        kind: 'calendar',
        provider: 'google_calendar',
        displayName: 'Primary Calendar',
        accountIdentifier: 'alex.taylor@company.com',
        status: 'connected',
        capabilities: {
          canRead: true,
          canMarkRead: false,
          canArchive: false,
          canDraftReply: false,
          canSendReply: false,
          canRsvp: true,
          canDownloadFile: false,
          canSearchRemote: true,
        },
        lastSyncAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        itemCount: 2,
        cacheSizeBytes: 12400,
        authConfig: {
          isAuthorizedLocally: true,
          scopesGranted: ['calendar.readonly', 'calendar.events'],
        },
      },
      {
        id: 'src-gdrive-shared',
        kind: 'files',
        provider: 'google_drive',
        displayName: 'Shared Team Drive',
        accountIdentifier: 'alex.taylor@company.com',
        status: 'connected',
        capabilities: {
          canRead: true,
          canMarkRead: false,
          canArchive: false,
          canDraftReply: false,
          canSendReply: false,
          canRsvp: false,
          canDownloadFile: true,
          canSearchRemote: true,
        },
        lastSyncAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        itemCount: 2,
        cacheSizeBytes: 8600,
        authConfig: {
          isAuthorizedLocally: true,
          scopesGranted: ['drive.readonly'],
        },
      },
    ];
  }

  private getInitialSeededItems(): UniversalInboxItem[] {
    const now = Date.now();
    return [
      {
        id: 'inbox-eml-001',
        source: 'email',
        externalRef: {
          connectorId: 'src-gmail-work',
          resourceType: 'email_message',
          resourceId: 'msg_gm_9827341',
          sourceAccountId: 'alex.taylor@company.com',
          version: '1',
          webUrl: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9827341',
        },
        title: 'Q3 Architectural Roadmap Review & Action Items',
        preview: 'Hi Alex, attached is the revised proposal for our Q3 service migration. Could you please review the data model section and provide feedback before Thursday?',
        senderOrOwner: 'Dr. Sarah Lin',
        senderEmail: 'sarah.lin@techinnovations.org',
        recipientEmails: ['alex.taylor@company.com'],
        receivedAt: new Date(now - 1000 * 60 * 35).toISOString(),
        state: 'new',
        externalState: {
          isRead: false,
          isArchived: false,
          isImportant: true,
          isStarred: true,
          externalLabel: 'Inbox/Important',
        },
        actionable: true,
        cachedContentAvailable: true,
        contentExcerpt: 'Hi Alex,\n\nAttached is the revised proposal for our Q3 service migration. Could you please review the data model section and provide feedback before Thursday?\n\nKey changes:\n1. Decoupled ingest queue\n2. Real-time projection caching\n3. Zero-loss offline replication\n\nBest regards,\nSarah',
        htmlBodySanitized: '<p>Hi Alex,</p><p>Attached is the revised proposal for our Q3 service migration. Could you please review the <strong>data model section</strong> and provide feedback before Thursday?</p><p>Key changes:<br/>1. Decoupled ingest queue<br/>2. Real-time projection caching<br/>3. Zero-loss offline replication</p><p>Best regards,<br/>Sarah</p>',
        rawTextBody: 'Hi Alex,\n\nAttached is the revised proposal for our Q3 service migration. Could you please review the data model section and provide feedback before Thursday?',
        remoteImagesBlocked: true,
        attachmentsMeta: [
          {
            id: 'att-001',
            name: 'Q3_Architecture_Proposal_v2.pdf',
            size: 2450000,
            mimeType: 'application/pdf',
            isImportedToVault: false,
          },
        ],
        threadMeta: {
          threadId: 'th_gm_12894',
          messageCount: 3,
          participants: ['sarah.lin@techinnovations.org', 'alex.taylor@company.com'],
        },
        provenance: {
          sourceRef: {
            connectorId: 'src-gmail-work',
            resourceType: 'email_message',
            resourceId: 'msg_gm_9827341',
            webUrl: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9827341',
          },
          capturedAt: new Date(now - 1000 * 60 * 35).toISOString(),
          providerName: 'Gmail',
          sourcePermalink: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9827341',
        },
        processingHistory: [],
        createdAt: now - 1000 * 60 * 35,
        updatedAt: now - 1000 * 60 * 35,
      },
      {
        id: 'inbox-cal-002',
        source: 'calendar',
        externalRef: {
          connectorId: 'src-gcal-main',
          resourceType: 'calendar_event',
          resourceId: 'evt_gc_87192',
          sourceAccountId: 'alex.taylor@company.com',
          version: '2',
          webUrl: 'https://calendar.google.com/calendar/event?eid=evt_gc_87192',
        },
        title: 'Design Sync: Universal Ingestion Pipeline',
        preview: 'Updated meeting time: Moved from 14:00 to 15:30 UTC. Agenda: Discuss privacy boundaries, provenance caching, and offline fallbacks.',
        senderOrOwner: 'Marcus Vance',
        senderEmail: 'marcus.vance@designops.co',
        receivedAt: new Date(now - 1000 * 60 * 95).toISOString(),
        state: 'new',
        externalState: {
          rsvpStatus: 'needsAction',
          hasChangedExternally: true,
          isImportant: false,
        },
        actionable: true,
        cachedContentAvailable: true,
        contentExcerpt: 'Meeting Time Updated: Today 15:30 - 16:15 UTC.\nLocation: Meet https://meet.google.com/xyz-abcd-efg\nAgenda: Review information flow specs and multi-device sync boundaries.',
        calendarMeta: {
          startTime: new Date(now + 1000 * 60 * 180).toISOString(),
          endTime: new Date(now + 1000 * 60 * 225).toISOString(),
          location: 'https://meet.google.com/xyz-abcd-efg',
          status: 'confirmed',
          isCancelled: false,
          isOrganizer: false,
          summaryDiff: 'Time shifted by +90 minutes due to timezone conflict',
          attendees: [
            { email: 'marcus.vance@designops.co', name: 'Marcus Vance', rsvp: 'accepted' },
            { email: 'alex.taylor@company.com', name: 'Alex Taylor', rsvp: 'needsAction' },
            { email: 'sarah.lin@techinnovations.org', name: 'Dr. Sarah Lin', rsvp: 'accepted' },
          ],
        },
        provenance: {
          sourceRef: {
            connectorId: 'src-gcal-main',
            resourceType: 'calendar_event',
            resourceId: 'evt_gc_87192',
            webUrl: 'https://calendar.google.com/calendar/event?eid=evt_gc_87192',
          },
          capturedAt: new Date(now - 1000 * 60 * 95).toISOString(),
          providerName: 'Google Calendar',
        },
        processingHistory: [],
        createdAt: now - 1000 * 60 * 95,
        updatedAt: now - 1000 * 60 * 95,
      },
      {
        id: 'inbox-fil-003',
        source: 'file',
        externalRef: {
          connectorId: 'src-gdrive-shared',
          resourceType: 'file',
          resourceId: 'file_gd_339182',
          sourceAccountId: 'alex.taylor@company.com',
          version: '1',
          webUrl: 'https://drive.google.com/file/d/file_gd_339182/view',
        },
        title: 'Team_Security_Audit_Report_2026.pdf',
        preview: 'Shared with you by Elena Rostova (Lead Security Auditor). Contains vulnerability assessments and encryption guidelines.',
        senderOrOwner: 'Elena Rostova',
        senderEmail: 'elena.rostova@cybersec.io',
        receivedAt: new Date(now - 1000 * 60 * 180).toISOString(),
        state: 'new',
        externalState: {
          isRead: false,
        },
        actionable: true,
        cachedContentAvailable: true,
        fileMeta: {
          mimeType: 'application/pdf',
          sizeBytes: 4120000,
          fileExtension: 'pdf',
          ownerName: 'Elena Rostova',
          webViewLink: 'https://drive.google.com/file/d/file_gd_339182/view',
          lastModifiedRemote: new Date(now - 1000 * 60 * 200).toISOString(),
          isSharedWithMe: true,
        },
        provenance: {
          sourceRef: {
            connectorId: 'src-gdrive-shared',
            resourceType: 'file',
            resourceId: 'file_gd_339182',
            webUrl: 'https://drive.google.com/file/d/file_gd_339182/view',
          },
          capturedAt: new Date(now - 1000 * 60 * 180).toISOString(),
          providerName: 'Google Drive',
        },
        processingHistory: [],
        createdAt: now - 1000 * 60 * 180,
        updatedAt: now - 1000 * 60 * 180,
      },
      {
        id: 'inbox-loc-004',
        source: 'local-capture',
        title: 'Idea: Local-first semantic indexing for offline knowledge graphs',
        preview: 'Explore combining vector embeddings with BM25 inverted lexical indexes for hybrid queries in the browser web worker.',
        senderOrOwner: 'Local Quick Capture',
        receivedAt: new Date(now - 1000 * 60 * 300).toISOString(),
        state: 'seen',
        actionable: true,
        cachedContentAvailable: true,
        contentExcerpt: 'Explore combining vector embeddings with BM25 inverted lexical indexes for hybrid queries in the browser web worker. Must run within memory limits of 64MB.',
        provenance: {
          sourceRef: {
            connectorId: 'local',
            resourceType: 'local_capture',
            resourceId: 'cap_local_109',
          },
          capturedAt: new Date(now - 1000 * 60 * 300).toISOString(),
          providerName: 'Quick Capture',
        },
        processingHistory: [
          {
            id: 'audit-01',
            action: 'Marked Seen',
            timestamp: new Date(now - 1000 * 60 * 240).toISOString(),
            userInitiated: true,
          },
        ],
        createdAt: now - 1000 * 60 * 300,
        updatedAt: now - 1000 * 60 * 240,
      },
      {
        id: 'inbox-eml-005',
        source: 'email',
        externalRef: {
          connectorId: 'src-gmail-work',
          resourceType: 'email_message',
          resourceId: 'msg_gm_551029',
          webUrl: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_551029',
        },
        title: 'Hotel Reservation Confirmation: Nordic Tech Summit Oslo',
        preview: 'Your reservation at Grand Hotel Oslo is confirmed. Check-in: Sep 24, 2026. Confirmation Code: #NT-98214-OSL.',
        senderOrOwner: 'Grand Hotel Oslo',
        senderEmail: 'reservations@grandhoteloslo.no',
        receivedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
        state: 'new',
        externalState: {
          isRead: true,
          isArchived: false,
          externalLabel: 'Travel',
        },
        actionable: true,
        cachedContentAvailable: true,
        contentExcerpt: 'Grand Hotel Oslo\nConfirmation: #NT-98214-OSL\nGuest: Alex Taylor\nCheck-in: Sep 24, 2026 (15:00)\nCheck-out: Sep 27, 2026 (11:00)\nTotal Paid: 5,400 NOK',
        provenance: {
          sourceRef: {
            connectorId: 'src-gmail-work',
            resourceType: 'email_message',
            resourceId: 'msg_gm_551029',
            webUrl: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_551029',
          },
          capturedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
          providerName: 'Gmail',
        },
        processingHistory: [],
        createdAt: now - 1000 * 60 * 60 * 8,
        updatedAt: now - 1000 * 60 * 60 * 8,
      },
    ];
  }
}

export const inboxStorage = new InboxStorage();
