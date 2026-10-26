/**
 * Phase P58 — Universal Inbox, Communications & External Information Flow Service
 * 
 * Core Ingestion & Triage Hub.
 * - Manages unified triage queue (local captures + external projections)
 * - Guarantees source-of-truth integrity (local processing != provider archive)
 * - Retains full provenance on all derived canonical artifacts
 * - Provides proposal-only AI assistance with zero autonomous external actions
 */

import { Note, NotePriority } from '../../types';
import {
  UniversalInboxItem,
  ExternalSource,
  SourceRoutingRule,
  InboxState,
  RSVPStatus,
  UniversalInboxFilter,
  AITriageProposal,
  GeneratedArtifactRef,
  ProcessingAuditEntry,
} from './inboxTypes';
import { inboxStorage } from './inboxStorage';
import { sanitizeExternalHtml, htmlToCleanText, generatePreviewSnippet } from './inboxSanitizer';

export class UniversalInboxService {
  private items: UniversalInboxItem[] = [];
  private sources: ExternalSource[] = [];
  private routingRules: SourceRoutingRule[] = [];
  private isLocked = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.reloadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('UniversalInboxService listener error:', e);
      }
    });
  }

  public reloadFromStorage(): void {
    if (this.isLocked) return;
    this.items = inboxStorage.getItems();
    this.sources = inboxStorage.getSources();
    this.routingRules = inboxStorage.getRoutingRules();
    this.notify();
  }

  public lock(): void {
    this.isLocked = true;
    this.items = [];
    this.sources = [];
    inboxStorage.lock();
    this.notify();
  }

  public unlock(): void {
    this.isLocked = false;
    inboxStorage.unlock();
    this.reloadFromStorage();
  }

  public isVaultLocked(): boolean {
    return this.isLocked;
  }

  // --- Retrieval & Filtering ---

  public getItems(filter?: Partial<UniversalInboxFilter>): UniversalInboxItem[] {
    if (this.isLocked) return [];
    let list = [...this.items];

    // Check snoozed items that may have expired
    const nowIso = new Date().toISOString();
    let modified = false;
    list = list.map((item) => {
      if (item.state === 'snoozed' && item.snoozedUntil && item.snoozedUntil <= nowIso) {
        modified = true;
        return {
          ...item,
          state: 'new',
          snoozedUntil: undefined,
          updatedAt: Date.now(),
        };
      }
      return item;
    });

    if (modified) {
      this.items = list;
      inboxStorage.saveItems(this.items);
    }

    if (!filter) return list;

    // Filter by Tab
    if (filter.tab) {
      switch (filter.tab) {
        case 'all':
          list = list.filter((i) => i.state !== 'processed' && i.state !== 'dismissed' && i.state !== 'snoozed');
          break;
        case 'local':
          list = list.filter((i) => i.source === 'local-capture' && i.state !== 'dismissed');
          break;
        case 'email':
          list = list.filter((i) => i.source === 'email' && i.state !== 'dismissed');
          break;
        case 'calendar':
          list = list.filter((i) => i.source === 'calendar' && i.state !== 'dismissed');
          break;
        case 'files':
          list = list.filter((i) => i.source === 'file' && i.state !== 'dismissed');
          break;
        case 'snoozed':
          list = list.filter((i) => i.state === 'snoozed');
          break;
        case 'processed':
          list = list.filter((i) => i.state === 'processed');
          break;
        case 'dismissed':
          list = list.filter((i) => i.state === 'dismissed');
          break;
      }
    }

    // Source filter
    if (filter.sourceFilter && filter.sourceFilter !== 'all') {
      list = list.filter((i) => i.externalRef?.connectorId === filter.sourceFilter);
    }

    // Search query
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.preview && i.preview.toLowerCase().includes(q)) ||
          (i.senderOrOwner && i.senderOrOwner.toLowerCase().includes(q)) ||
          (i.senderEmail && i.senderEmail.toLowerCase().includes(q))
      );
    }

    if (filter.actionableOnly) {
      list = list.filter((i) => i.actionable);
    }

    if (filter.unseenOnly) {
      list = list.filter((i) => i.state === 'new');
    }

    if (filter.projectId) {
      list = list.filter((i) => i.matchedProjectId === filter.projectId);
    }

    if (filter.personId) {
      list = list.filter((i) => i.matchedPersonId === filter.personId);
    }

    // Sort: Newest received first
    return list.sort((a, b) => {
      const timeA = a.receivedAt ? new Date(a.receivedAt).getTime() : a.createdAt;
      const timeB = b.receivedAt ? new Date(b.receivedAt).getTime() : b.createdAt;
      return timeB - timeA;
    });
  }

  public getItemById(id: string): UniversalInboxItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  public getUnprocessedCount(): number {
    return this.items.filter(
      (i) => i.state === 'new' || i.state === 'seen' || i.state === 'processing'
    ).length;
  }

  public getUnseenCount(): number {
    return this.items.filter((i) => i.state === 'new').length;
  }

  // --- Source Management ---

  public getSources(): ExternalSource[] {
    return this.sources;
  }

  public getSourceById(id: string): ExternalSource | undefined {
    return this.sources.find((s) => s.id === id);
  }

  public addSource(source: ExternalSource): void {
    this.sources = [...this.sources, source];
    inboxStorage.saveSources(this.sources);
    this.notify();
  }

  public updateSource(id: string, updates: Partial<ExternalSource>): void {
    this.sources = this.sources.map((s) => (s.id === id ? { ...s, ...updates } : s));
    inboxStorage.saveSources(this.sources);
    this.notify();
  }

  public removeSource(id: string, options: { keepHistory: boolean; clearCache: boolean }): void {
    this.sources = this.sources.filter((s) => s.id !== id);
    inboxStorage.saveSources(this.sources);

    if (options.clearCache) {
      inboxStorage.clearConnectorCache(id);
      this.items = inboxStorage.getItems();
    }
    this.notify();
  }

  public clearConnectorCache(connectorId?: string): void {
    inboxStorage.clearConnectorCache(connectorId);
    this.items = inboxStorage.getItems();
    this.notify();
  }

  // --- Ingestion / Sync Simulation (Offline safe) ---

  public async syncSource(sourceId: string): Promise<{ syncedCount: number; errors?: string }> {
    const source = this.getSourceById(sourceId);
    if (!source) return { syncedCount: 0, errors: 'Source not found' };

    // Simulate incremental retrieval without unbounded scraping
    await new Promise((resolve) => setTimeout(resolve, 600));

    const now = Date.now();
    this.updateSource(sourceId, {
      lastSyncAt: new Date(now).toISOString(),
      status: 'connected',
      syncError: undefined,
    });

    return { syncedCount: 0 };
  }

  public async syncAllSources(): Promise<void> {
    for (const source of this.sources) {
      if (source.status === 'connected') {
        await this.syncSource(source.id);
      }
    }
  }

  // --- Ingest Local Capture ---

  public ingestLocalCapture(title: string, content: string, tags: string[] = []): UniversalInboxItem {
    const now = Date.now();
    const cleanSnippet = generatePreviewSnippet(content, 180);
    const item: UniversalInboxItem = {
      id: `inbox-loc-${now}-${Math.random().toString(36).substring(2, 6)}`,
      source: 'local-capture',
      title: title || 'Quick Capture Entry',
      preview: cleanSnippet,
      senderOrOwner: 'Local Quick Capture',
      receivedAt: new Date(now).toISOString(),
      state: 'new',
      actionable: true,
      cachedContentAvailable: true,
      contentExcerpt: content,
      rawTextBody: content,
      provenance: {
        sourceRef: {
          connectorId: 'local',
          resourceType: 'local_capture',
          resourceId: `cap_local_${now}`,
        },
        capturedAt: new Date(now).toISOString(),
        providerName: 'Quick Capture',
      },
      processingHistory: [
        {
          id: `audit-${now}`,
          action: 'Captured Locally',
          timestamp: new Date(now).toISOString(),
          userInitiated: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.items = [item, ...this.items];
    inboxStorage.saveItems(this.items);
    this.notify();
    return item;
  }

  // --- Local Processing State Modifications ---

  public updateItemState(itemId: string, newState: InboxState, snoozedUntil?: string): void {
    const now = Date.now();
    this.items = this.items.map((item) => {
      if (item.id !== itemId) return item;

      const audit: ProcessingAuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        action: `State changed to ${newState}${snoozedUntil ? ` until ${snoozedUntil}` : ''}`,
        timestamp: new Date().toISOString(),
        userInitiated: true,
      };

      return {
        ...item,
        state: newState,
        snoozedUntil: newState === 'snoozed' ? snoozedUntil : undefined,
        processingHistory: [...(item.processingHistory || []), audit],
        updatedAt: now,
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
  }

  public bulkUpdateState(itemIds: string[], newState: InboxState): void {
    const now = Date.now();
    const idSet = new Set(itemIds);
    this.items = this.items.map((item) => {
      if (!idSet.has(item.id)) return item;
      return {
        ...item,
        state: newState,
        updatedAt: now,
      };
    });
    inboxStorage.saveItems(this.items);
    this.notify();
  }

  public toggleRemoteImages(itemId: string, allow: boolean): void {
    this.items = this.items.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        remoteImagesBlocked: !allow,
        updatedAt: Date.now(),
      };
    });
    inboxStorage.saveItems(this.items);
    this.notify();
  }

  public addGeneratedArtifact(itemId: string, artifact: GeneratedArtifactRef): void {
    const now = Date.now();
    this.items = this.items.map((item) => {
      if (item.id !== itemId) return item;
      const existing = item.generatedArtifacts || [];
      const audit: ProcessingAuditEntry = {
        id: `audit-${now}`,
        action: `Created ${artifact.type}: "${artifact.title}"`,
        timestamp: new Date().toISOString(),
        artifactId: artifact.id,
        userInitiated: true,
      };
      return {
        ...item,
        generatedArtifacts: [...existing, artifact],
        processingHistory: [...(item.processingHistory || []), audit],
        updatedAt: now,
      };
    });
    inboxStorage.saveItems(this.items);
    this.notify();
  }

  // --- Canonical Conversion Actions (Idempotent & Provenance Preserved) ---

  /**
   * Converts item into a canonical P25 task line inside a task note or daily note
   */
  public createTaskFromItem(
    itemId: string,
    taskTitle: string,
    dueDate?: string,
    priority: NotePriority = 'medium',
    targetNoteId?: string,
    notes: Note[] = [],
    onSaveNote?: (n: Note) => void
  ): { targetNoteId: string; taskText: string } {
    const item = this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const cleanTitle = taskTitle.trim() || item.title;
    const dateFormatted = dueDate ? ` 📅 ${dueDate}` : '';
    const priorityFormatted = priority === 'high' ? ' 🔺' : priority === 'low' ? ' 🔽' : '';
    const sourceLink = item.externalRef?.webUrl ? ` [source](${item.externalRef.webUrl})` : '';
    const taskLine = `- [ ] ${cleanTitle}${dateFormatted}${priorityFormatted}${sourceLink} ^src-${item.id}`;

    let targetNote = notes.find((n) => n.id === targetNoteId);
    if (!targetNote && notes.length > 0) {
      // Find a tasks or inbox note
      targetNote = notes.find(
        (n) => n.title.toLowerCase().includes('task') || n.title.toLowerCase().includes('inbox')
      ) || notes[0];
    }

    if (targetNote && onSaveNote) {
      const updatedContent = `${targetNote.content.trim()}\n\n${taskLine}\n`;
      const updatedNote: Note = {
        ...targetNote,
        content: updatedContent,
        updatedAt: new Date().toISOString(),
      };
      onSaveNote(updatedNote);

      this.addGeneratedArtifact(itemId, {
        type: 'task',
        id: `task-${Date.now()}`,
        title: cleanTitle,
        createdAt: new Date().toISOString(),
        targetId: targetNote.id,
      });

      return { targetNoteId: targetNote.id, taskText: taskLine };
    }

    return { targetNoteId: '', taskText: taskLine };
  }

  /**
   * Saves incoming email/file/meeting as a canonical Markdown note
   */
  public saveItemAsNote(
    itemId: string,
    noteTitle: string,
    customExcerpt?: string,
    tags: string[] = ['source/external'],
    onSaveNote?: (n: Note) => void
  ): Note {
    const item = this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const title = noteTitle.trim() || item.title;
    const bodyExcerpt = customExcerpt || item.contentExcerpt || item.rawTextBody || item.preview || '';
    const capturedTime = item.receivedAt || new Date().toISOString();

    const noteContent = `---
title: "${title}"
source: "${item.source}"
source_id: "${item.externalRef?.resourceId || item.id}"
source_provider: "${item.provenance?.providerName || item.source}"
source_url: "${item.externalRef?.webUrl || ''}"
captured_at: "${capturedTime}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
---

# ${title}

> **Source**: [${item.provenance?.providerName || item.source}](${item.externalRef?.webUrl || '#'})  
> **From**: ${item.senderOrOwner || 'Unknown'} (${item.senderEmail || 'N/A'})  
> **Date**: ${capturedTime}

## Content Excerpt

${bodyExcerpt}

---

## Notes & Actions

- 
`;

    const newNote: Note = {
      id: `note-src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      content: noteContent,
      type: 'text',
      checklist: [],
      tags: Array.from(new Set([...tags, item.source])),
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveNote) {
      onSaveNote(newNote);
    }

    this.addGeneratedArtifact(itemId, {
      type: 'note',
      id: newNote.id,
      title: newNote.title,
      createdAt: new Date().toISOString(),
      targetId: newNote.id,
    });

    return newNote;
  }

  /**
   * Logs an interaction with a P48 contact
   */
  public logInteractionFromItem(
    itemId: string,
    personId: string,
    personName: string,
    summary: string,
    onSaveNote?: (n: Note) => void
  ): Note {
    const item = this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const title = `Interaction with ${personName} - ${item.title}`;
    const dateStr = item.receivedAt ? item.receivedAt.split('T')[0] : new Date().toISOString().split('T')[0];

    const noteContent = `---
type: interaction
person: "[[${personName}]]"
interaction_type: "${item.source === 'email' ? 'email' : item.source === 'calendar' ? 'meeting' : 'message'}"
date: "${dateStr}"
source_ref: "${item.externalRef?.resourceId || item.id}"
---

# ${title}

- **With**: [[${personName}]]
- **Medium**: ${item.source}
- **Date**: ${dateStr}
- **Summary**: ${summary || item.preview}

## Source Context

${item.contentExcerpt || item.preview || ''}
`;

    const interactionNote: Note = {
      id: `note-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      content: noteContent,
      type: 'text',
      checklist: [],
      tags: ['interaction', 'people'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveNote) {
      onSaveNote(interactionNote);
    }

    this.addGeneratedArtifact(itemId, {
      type: 'interaction',
      id: interactionNote.id,
      title: interactionNote.title,
      createdAt: new Date().toISOString(),
      targetId: personId,
    });

    return interactionNote;
  }

  /**
   * Links item to a Project
   */
  public linkItemToProject(itemId: string, projectId: string, projectTitle: string): void {
    const now = Date.now();
    this.items = this.items.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        matchedProjectId: projectId,
        matchedProjectTitle: projectTitle,
        updatedAt: now,
      };
    });

    this.addGeneratedArtifact(itemId, {
      type: 'project_link',
      id: `plink-${now}`,
      title: `Linked to ${projectTitle}`,
      createdAt: new Date().toISOString(),
      targetId: projectId,
    });

    inboxStorage.saveItems(this.items);
    this.notify();
  }

  // --- External Provider Actions (Explicit User Action Only) ---

  public async providerArchive(itemId: string): Promise<boolean> {
    const item = this.getItemById(itemId);
    if (!item || !item.externalRef) return false;

    // Simulate provider API call
    await new Promise((resolve) => setTimeout(resolve, 400));

    this.items = this.items.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        externalState: {
          ...i.externalState,
          isArchived: true,
        },
        processingHistory: [
          ...(i.processingHistory || []),
          {
            id: `audit-${Date.now()}`,
            action: 'Archived on External Provider',
            timestamp: new Date().toISOString(),
            userInitiated: true,
          },
        ],
        updatedAt: Date.now(),
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
    return true;
  }

  public async providerMarkRead(itemId: string, isRead: boolean): Promise<boolean> {
    const item = this.getItemById(itemId);
    if (!item) return false;

    await new Promise((resolve) => setTimeout(resolve, 300));

    this.items = this.items.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        externalState: {
          ...i.externalState,
          isRead,
        },
        updatedAt: Date.now(),
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
    return true;
  }

  public async providerDraftReply(itemId: string, draftBody: string): Promise<boolean> {
    const item = this.getItemById(itemId);
    if (!item) return false;

    await new Promise((resolve) => setTimeout(resolve, 500));

    this.items = this.items.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        processingHistory: [
          ...(i.processingHistory || []),
          {
            id: `audit-${Date.now()}`,
            action: `Created Provider Draft (${draftBody.length} chars)`,
            timestamp: new Date().toISOString(),
            userInitiated: true,
          },
        ],
        updatedAt: Date.now(),
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
    return true;
  }

  public async providerSendReply(itemId: string, replyBody: string): Promise<boolean> {
    const item = this.getItemById(itemId);
    if (!item) return false;

    // Strict boundary: User must have explicitly confirmed send dialog
    await new Promise((resolve) => setTimeout(resolve, 600));

    this.items = this.items.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        processingHistory: [
          ...(i.processingHistory || []),
          {
            id: `audit-${Date.now()}`,
            action: `Sent Email Reply (${replyBody.length} chars)`,
            timestamp: new Date().toISOString(),
            userInitiated: true,
          },
        ],
        updatedAt: Date.now(),
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
    return true;
  }

  public async providerRsvp(itemId: string, status: RSVPStatus): Promise<boolean> {
    const item = this.getItemById(itemId);
    if (!item) return false;

    await new Promise((resolve) => setTimeout(resolve, 400));

    this.items = this.items.map((i) => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        externalState: {
          ...i.externalState,
          rsvpStatus: status,
        },
        processingHistory: [
          ...(i.processingHistory || []),
          {
            id: `audit-${Date.now()}`,
            action: `Updated Calendar RSVP: ${status}`,
            timestamp: new Date().toISOString(),
            userInitiated: true,
          },
        ],
        updatedAt: Date.now(),
      };
    });

    inboxStorage.saveItems(this.items);
    this.notify();
    return true;
  }

  // --- Proposal-Only AI Triage Engine ---

  public generateAITriageProposal(
    item: UniversalInboxItem,
    allPeople: { id: string; displayName: string; emails?: string[] }[] = [],
    allProjects: { id: string; title: string }[] = []
  ): AITriageProposal {
    // 1. Check for hotel / travel reservation
    if (
      item.title.toLowerCase().includes('hotel') ||
      item.title.toLowerCase().includes('flight') ||
      item.title.toLowerCase().includes('reservation') ||
      item.title.toLowerCase().includes('booking')
    ) {
      return {
        inboxItemId: item.id,
        summary: 'Travel reservation confirmation detected with booking details.',
        suggestedAction: 'travel_reservation',
        suggestedTitle: `Trip Reservation: ${item.title.replace(/confirmation[:\-]?/i, '').trim()}`,
        confidence: 'high',
        reasoning: 'Email subject and content structure indicate hotel or travel booking confirmation.',
      };
    }

    // 2. Check for receipt / invoice / finance
    if (
      item.title.toLowerCase().includes('receipt') ||
      item.title.toLowerCase().includes('invoice') ||
      item.title.toLowerCase().includes('payment') ||
      item.title.toLowerCase().includes('bill')
    ) {
      return {
        inboxItemId: item.id,
        summary: 'Receipt / transaction document for expense review.',
        suggestedAction: 'finance_review',
        suggestedTitle: item.title,
        confidence: 'high',
        reasoning: 'Document mentions financial transaction, invoice, or receipt.',
      };
    }

    // 3. Check for calendar meeting changes
    if (item.source === 'calendar') {
      return {
        inboxItemId: item.id,
        summary: 'Meeting invitation or schedule change requiring RSVP and preparation.',
        suggestedAction: 'save_note',
        suggestedTitle: `Meeting Notes: ${item.title}`,
        confidence: 'high',
        reasoning: 'Calendar event projection with updated agenda or time slot.',
      };
    }

    // 4. Check for Actionable Tasks
    if (
      item.title.toLowerCase().includes('review') ||
      item.title.toLowerCase().includes('feedback') ||
      item.title.toLowerCase().includes('action') ||
      item.title.toLowerCase().includes('deadline') ||
      item.preview?.toLowerCase().includes('could you') ||
      item.preview?.toLowerCase().includes('please review')
    ) {
      // Find matching person
      const matchedPerson = allPeople.find(
        (p) =>
          item.senderEmail &&
          p.emails?.some((e) => e.toLowerCase() === item.senderEmail?.toLowerCase())
      );

      return {
        inboxItemId: item.id,
        summary: `Action item requested by ${item.senderOrOwner || 'sender'}.`,
        suggestedAction: 'create_task',
        suggestedTitle: `Review and respond to ${item.senderOrOwner || 'sender'}: ${item.title}`,
        suggestedPersonId: matchedPerson?.id,
        suggestedPersonName: matchedPerson?.displayName,
        suggestedDueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().split('T')[0],
        confidence: 'medium',
        reasoning: 'Sender explicitly requested feedback, review, or action before deadline.',
      };
    }

    // 5. Shared file
    if (item.source === 'file') {
      return {
        inboxItemId: item.id,
        summary: 'Shared research or audit document available for reference note creation.',
        suggestedAction: 'save_note',
        suggestedTitle: `Reference: ${item.title.replace(/\.pdf$/i, '')}`,
        confidence: 'medium',
        reasoning: 'External document shared with you.',
      };
    }

    // Default: Log or Save
    return {
      inboxItemId: item.id,
      summary: 'General informational communication.',
      suggestedAction: 'no_action',
      confidence: 'low',
      reasoning: 'Informational message with no immediate deadline or explicit task request.',
    };
  }

  public generateAITriageBatch(
    items: UniversalInboxItem[],
    allPeople: { id: string; displayName: string; emails?: string[] }[] = [],
    allProjects: { id: string; title: string }[] = []
  ): AITriageProposal[] {
    return items.map((i) => this.generateAITriageProposal(i, allPeople, allProjects));
  }
}

export const universalInboxService = new UniversalInboxService();
