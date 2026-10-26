/**
 * Phase P52 — Reading, Books, Articles, Media & Knowledge Library Core Service
 *
 * Coordinates Library Items, consumption lifecycles, rereads, explicit progress,
 * reading sessions, duplicate detection, safe merging, and integration with P26/P35/P49/P50/P51.
 */

import {
  LibraryItem,
  LibraryItemType,
  LibraryFormat,
  LibraryStatus,
  LibraryProgress,
  ReadingSession,
  LibraryFilter,
  LibrarySortField,
  LibrarySortDirection,
  LibraryDuplicateCandidate,
  ConsumptionCycle,
} from './libraryTypes';
import { libraryStorage } from './libraryStorage';
import { Note } from '../../types';

export class LibraryService {
  /**
   * Returns all library items with optional filtering and sorting.
   */
  public getItems(filter?: LibraryFilter, sortField: LibrarySortField = 'updated', sortDir: LibrarySortDirection = 'desc'): LibraryItem[] {
    let items = libraryStorage.getItems();

    if (filter) {
      if (filter.query && filter.query.trim()) {
        const q = filter.query.toLowerCase().trim();
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
            (i.creators && i.creators.some((c) => c.name.toLowerCase().includes(q))) ||
            (i.metadata?.isbn && i.metadata.isbn.toLowerCase().includes(q)) ||
            (i.metadata?.publisher && i.metadata.publisher.toLowerCase().includes(q)) ||
            (i.metadata?.tags && i.metadata.tags.some((t) => t.toLowerCase().includes(q)))
        );
      }

      if (filter.type && filter.type !== 'all') {
        items = items.filter((i) => i.type === filter.type);
      }

      if (filter.status && filter.status !== 'all') {
        items = items.filter((i) => i.status === filter.status);
      }

      if (filter.format && filter.format !== 'all') {
        items = items.filter((i) => i.format === filter.format);
      }

      if (filter.creator) {
        const creatorQuery = filter.creator.toLowerCase();
        items = items.filter((i) => i.creators.some((c) => c.name.toLowerCase().includes(creatorQuery)));
      }

      if (filter.courseId) {
        items = items.filter((i) => i.relations?.courseIds?.includes(filter.courseId!));
      }

      if (filter.goalId) {
        items = items.filter((i) => i.relations?.goalIds?.includes(filter.goalId!));
      }

      if (filter.projectId) {
        items = items.filter((i) => i.relations?.projectIds?.includes(filter.projectId!));
      }

      if (filter.hasNote !== undefined) {
        items = items.filter((i) => (filter.hasNote ? !!i.noteId : !i.noteId));
      }

      if (filter.hasFile !== undefined) {
        items = items.filter((i) =>
          filter.hasFile ? !!(i.attachmentIds && i.attachmentIds.length > 0) : !(i.attachmentIds && i.attachmentIds.length > 0)
        );
      }
    }

    // Sort items
    items.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'creator':
          valA = (a.creators[0]?.name || '').toLowerCase();
          valB = (b.creators[0]?.name || '').toLowerCase();
          break;
        case 'added':
          valA = a.createdAt;
          valB = b.createdAt;
          break;
        case 'updated':
          valA = a.updatedAt;
          valB = b.updatedAt;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'progress':
          valA = a.progress?.percent ?? (a.progress?.currentPage ? (a.progress.currentPage / (a.progress.totalPages || 1)) * 100 : 0);
          valB = b.progress?.percent ?? (b.progress?.currentPage ? (b.progress.currentPage / (b.progress.totalPages || 1)) * 100 : 0);
          break;
        case 'finishedDate':
          valA = a.currentCycle?.finishedAt || '';
          valB = b.currentCycle?.finishedAt || '';
          break;
        case 'publicationDate':
          valA = a.metadata?.publicationDate || '';
          valB = b.metadata?.publicationDate || '';
          break;
        case 'rating':
          valA = a.metadata?.rating || 0;
          valB = b.metadata?.rating || 0;
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }

  public getItem(id: string): LibraryItem | undefined {
    return libraryStorage.getItem(id);
  }

  /**
   * Creates a new Library Item.
   */
  public createItem(data: {
    type: LibraryItemType;
    title: string;
    subtitle?: string;
    creators?: Array<{ name: string; role?: any; personNoteId?: string }>;
    status?: LibraryStatus;
    format?: LibraryFormat;
    noteId?: string;
    attachmentIds?: string[];
    referenceId?: string;
    sourceUrl?: string;
    coverAttachmentId?: string;
    coverUrl?: string;
    metadata?: LibraryItem['metadata'];
    progress?: LibraryProgress;
    relations?: LibraryItem['relations'];
  }): LibraryItem {
    const id = `lib-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    const initialStatus = data.status || 'inbox';
    const initialCycle: ConsumptionCycle = {
      id: `cycle-1`,
      cycleNumber: 1,
      startedAt: initialStatus === 'in-progress' ? todayStr : undefined,
      finishedAt: initialStatus === 'finished' ? todayStr : undefined,
    };

    const item: LibraryItem = {
      id,
      type: data.type,
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || undefined,
      creators: data.creators || [],
      status: initialStatus,
      format: data.format,
      noteId: data.noteId,
      attachmentIds: data.attachmentIds || [],
      referenceId: data.referenceId,
      sourceUrl: data.sourceUrl,
      coverAttachmentId: data.coverAttachmentId,
      coverUrl: data.coverUrl,
      metadata: data.metadata || {},
      progress: data.progress || { mode: 'none', updatedAt: now },
      currentCycle: initialCycle,
      cycles: [initialCycle],
      relations: data.relations || {},
      createdAt: now,
      updatedAt: now,
    };

    libraryStorage.saveItem(item);
    return item;
  }

  /**
   * Updates an existing Library Item.
   */
  public updateItem(id: string, updates: Partial<LibraryItem>): LibraryItem | null {
    const existing = libraryStorage.getItem(id);
    if (!existing) return null;

    const updated: LibraryItem = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    libraryStorage.saveItem(updated);
    return updated;
  }

  /**
   * Sets the status of an item with explicit lifecycle and cycle updates.
   */
  public setStatus(id: string, status: LibraryStatus): LibraryItem | null {
    const item = libraryStorage.getItem(id);
    if (!item) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const currentCycle = item.currentCycle || { id: 'cycle-1', cycleNumber: 1 };

    if (status === 'in-progress' && !currentCycle.startedAt) {
      currentCycle.startedAt = todayStr;
    } else if (status === 'finished' && !currentCycle.finishedAt) {
      currentCycle.finishedAt = todayStr;
    }

    return this.updateItem(id, {
      status,
      currentCycle,
    });
  }

  /**
   * Explicitly marks an item as Finished.
   */
  public markFinished(id: string, finishedDate?: string): LibraryItem | null {
    const item = libraryStorage.getItem(id);
    if (!item) return null;

    const dateStr = finishedDate || new Date().toISOString().split('T')[0];
    const currentCycle = item.currentCycle || { id: 'cycle-1', cycleNumber: 1 };
    currentCycle.finishedAt = dateStr;

    // Update history cycles
    const cycles = item.cycles ? [...item.cycles] : [currentCycle];
    const idx = cycles.findIndex((c) => c.id === currentCycle.id);
    if (idx >= 0) {
      cycles[idx] = currentCycle;
    } else {
      cycles.push(currentCycle);
    }

    return this.updateItem(id, {
      status: 'finished',
      currentCycle,
      cycles,
    });
  }

  /**
   * Begins a new reading cycle (reread) without overwriting historical finished dates.
   */
  public readAgain(id: string): LibraryItem | null {
    const item = libraryStorage.getItem(id);
    if (!item) return null;

    const cycles = item.cycles || (item.currentCycle ? [item.currentCycle] : []);
    const newCycleNum = cycles.length + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    const newCycle: ConsumptionCycle = {
      id: `cycle-${newCycleNum}`,
      cycleNumber: newCycleNum,
      startedAt: todayStr,
      finishedAt: undefined,
    };

    cycles.push(newCycle);

    // Reset current progress for the new cycle
    const newProgress: LibraryProgress = {
      mode: item.progress?.mode || 'page',
      currentPage: 0,
      totalPages: item.progress?.totalPages,
      percent: 0,
      currentSeconds: 0,
      totalSeconds: item.progress?.totalSeconds,
      location: undefined,
      updatedAt: Date.now(),
    };

    return this.updateItem(id, {
      status: 'in-progress',
      currentCycle: newCycle,
      cycles,
      progress: newProgress,
    });
  }

  /**
   * Updates explicit consumption progress for an item.
   */
  public updateProgress(id: string, progress: Partial<LibraryProgress>): {
    item: LibraryItem | null;
    isFinishedSuggested: boolean;
  } {
    const item = libraryStorage.getItem(id);
    if (!item) return { item: null, isFinishedSuggested: false };

    const mergedProgress: LibraryProgress = {
      ...(item.progress || { mode: 'none', updatedAt: Date.now() }),
      ...progress,
      updatedAt: Date.now(),
    };

    // Calculate percentage if in page mode
    if (mergedProgress.mode === 'page' && mergedProgress.currentPage && mergedProgress.totalPages) {
      mergedProgress.percent = Math.min(
        100,
        Math.round((mergedProgress.currentPage / mergedProgress.totalPages) * 100)
      );
    } else if (mergedProgress.mode === 'time' && mergedProgress.currentSeconds && mergedProgress.totalSeconds) {
      mergedProgress.percent = Math.min(
        100,
        Math.round((mergedProgress.currentSeconds / mergedProgress.totalSeconds) * 100)
      );
    }

    const updated = this.updateItem(id, { progress: mergedProgress });

    // Check if progress reached 100% to suggest (never silently auto-finish)
    const isFinishedSuggested =
      item.status !== 'finished' &&
      ((mergedProgress.percent !== undefined && mergedProgress.percent >= 100) ||
        (mergedProgress.mode === 'page' &&
          mergedProgress.totalPages &&
          mergedProgress.currentPage &&
          mergedProgress.currentPage >= mergedProgress.totalPages));

    return {
      item: updated,
      isFinishedSuggested,
    };
  }

  /**
   * Logs a reading session and optionally updates progress.
   */
  public logReadingSession(params: {
    libraryItemId: string;
    durationMinutes: number;
    date?: string;
    progressDelta?: number;
    progressUnit?: 'pages' | 'minutes' | 'percent';
    note?: string;
    courseId?: string;
    habitId?: string;
  }): ReadingSession {
    const id = `rs-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();
    const date = params.date || new Date().toISOString().split('T')[0];

    const session: ReadingSession = {
      id,
      libraryItemId: params.libraryItemId,
      date,
      durationMinutes: params.durationMinutes,
      progressDelta: params.progressDelta,
      progressUnit: params.progressUnit,
      note: params.note?.trim() || undefined,
      courseId: params.courseId,
      habitId: params.habitId,
      createdAt: now,
      updatedAt: now,
    };

    libraryStorage.saveSession(session);

    // If progressDelta is provided and item exists, apply progress update
    if (params.progressDelta && params.progressDelta > 0) {
      const item = libraryStorage.getItem(params.libraryItemId);
      if (item && item.progress) {
        if (item.progress.mode === 'page') {
          const newPage = (item.progress.currentPage || 0) + params.progressDelta;
          this.updateProgress(params.libraryItemId, { currentPage: newPage });
        } else if (item.progress.mode === 'percentage') {
          const newPercent = Math.min(100, (item.progress.percent || 0) + params.progressDelta);
          this.updateProgress(params.libraryItemId, { percent: newPercent });
        }
      }
    }

    return session;
  }

  public getSessions(libraryItemId?: string): ReadingSession[] {
    return libraryStorage.getSessions(libraryItemId);
  }

  /**
   * Generates a template for creating a canonical Markdown note for this Library Item.
   */
  public generateNoteTemplate(item: LibraryItem): { title: string; content: string } {
    const authorStr = item.creators.map((c) => c.name).join(', ');
    const title = `${item.title}${authorStr ? ` — ${authorStr}` : ''}`;

    let content = `# ${item.title}\n\n`;
    if (item.subtitle) {
      content += `*${item.subtitle}*\n\n`;
    }

    content += `## Metadata\n\n`;
    if (authorStr) content += `- **Author(s)**: ${authorStr}\n`;
    content += `- **Type**: ${item.type}\n`;
    if (item.format) content += `- **Format**: ${item.format}\n`;
    if (item.metadata?.publisher) content += `- **Publisher**: ${item.metadata.publisher}\n`;
    if (item.metadata?.publicationDate) content += `- **Published**: ${item.metadata.publicationDate}\n`;
    if (item.metadata?.isbn) content += `- **ISBN**: \`${item.metadata.isbn}\`\n`;
    if (item.sourceUrl) content += `- **Source URL**: ${item.sourceUrl}\n`;
    content += `\n## Summary & Core Theses\n\n- \n\n## Key Ideas & Takeaways\n\n1. \n\n## Highlights & Excerpts\n\n> \n\n## Personal Reflections & Critique\n\n\n\n## Related Notes & Concepts\n\n- \n`;

    return { title, content };
  }

  /**
   * Finds duplicate candidates using strict heuristics (ISBN, DOI, URL, Reference, normalized title + creator).
   */
  public findDuplicateCandidates(): LibraryDuplicateCandidate[] {
    const items = libraryStorage.getItems();
    const candidates: LibraryDuplicateCandidate[] = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];

        // 1. Same ISBN
        if (a.metadata?.isbn && b.metadata?.isbn && a.metadata.isbn.replace(/[-\s]/g, '') === b.metadata.isbn.replace(/[-\s]/g, '')) {
          candidates.push({
            primaryId: a.id,
            duplicateId: b.id,
            primaryTitle: a.title,
            duplicateTitle: b.title,
            reason: 'isbn',
            similarityScore: 1.0,
          });
          continue;
        }

        // 2. Same DOI
        if (a.metadata?.doi && b.metadata?.doi && a.metadata.doi.trim().toLowerCase() === b.metadata.doi.trim().toLowerCase()) {
          candidates.push({
            primaryId: a.id,
            duplicateId: b.id,
            primaryTitle: a.title,
            duplicateTitle: b.title,
            reason: 'doi',
            similarityScore: 1.0,
          });
          continue;
        }

        // 3. Same Reference
        if (a.referenceId && b.referenceId && a.referenceId === b.referenceId) {
          candidates.push({
            primaryId: a.id,
            duplicateId: b.id,
            primaryTitle: a.title,
            duplicateTitle: b.title,
            reason: 'reference',
            similarityScore: 1.0,
          });
          continue;
        }

        // 4. Same Canonical URL
        if (a.sourceUrl && b.sourceUrl && a.sourceUrl.trim().toLowerCase() === b.sourceUrl.trim().toLowerCase()) {
          candidates.push({
            primaryId: a.id,
            duplicateId: b.id,
            primaryTitle: a.title,
            duplicateTitle: b.title,
            reason: 'url',
            similarityScore: 0.95,
          });
          continue;
        }

        // 5. Normalized Title + Creator match
        const normTitleA = a.title.trim().toLowerCase();
        const normTitleB = b.title.trim().toLowerCase();
        const creatorA = (a.creators[0]?.name || '').trim().toLowerCase();
        const creatorB = (b.creators[0]?.name || '').trim().toLowerCase();

        if (normTitleA === normTitleB && creatorA && creatorB && creatorA === creatorB) {
          candidates.push({
            primaryId: a.id,
            duplicateId: b.id,
            primaryTitle: a.title,
            duplicateTitle: b.title,
            reason: 'title_creator',
            similarityScore: 0.9,
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Safely merges two duplicate items, preserving all highlights, sessions, attachments, and relations.
   */
  public mergeItems(primaryId: string, duplicateId: string): LibraryItem | null {
    const primary = libraryStorage.getItem(primaryId);
    const duplicate = libraryStorage.getItem(duplicateId);
    if (!primary || !duplicate) return null;

    // 1. Union Attachments
    const mergedAttachmentIds = Array.from(
      new Set([...(primary.attachmentIds || []), ...(duplicate.attachmentIds || [])])
    );

    // 2. Re-point Highlights
    const duplicateHighlights = libraryStorage.getHighlights(duplicateId);
    for (const hl of duplicateHighlights) {
      libraryStorage.saveHighlight({
        ...hl,
        libraryItemId: primaryId,
      });
    }

    // 3. Re-point Sessions
    const duplicateSessions = libraryStorage.getSessions(duplicateId);
    for (const ses of duplicateSessions) {
      libraryStorage.saveSession({
        ...ses,
        libraryItemId: primaryId,
      });
    }

    // 4. Union Relations
    const mergedRelations = {
      courseIds: Array.from(new Set([...(primary.relations?.courseIds || []), ...(duplicate.relations?.courseIds || [])])),
      skillIds: Array.from(new Set([...(primary.relations?.skillIds || []), ...(duplicate.relations?.skillIds || [])])),
      projectIds: Array.from(new Set([...(primary.relations?.projectIds || []), ...(duplicate.relations?.projectIds || [])])),
      goalIds: Array.from(new Set([...(primary.relations?.goalIds || []), ...(duplicate.relations?.goalIds || [])])),
      areaIds: Array.from(new Set([...(primary.relations?.areaIds || []), ...(duplicate.relations?.areaIds || [])])),
    };

    // 5. Update primary and delete duplicate
    const updated = this.updateItem(primaryId, {
      attachmentIds: mergedAttachmentIds,
      referenceId: primary.referenceId || duplicate.referenceId,
      noteId: primary.noteId || duplicate.noteId,
      relations: mergedRelations,
    });

    libraryStorage.deleteItem(duplicateId);
    return updated;
  }

  /**
   * Removes an item from the library (never deleting canonical attachments/notes).
   */
  public removeItem(id: string): boolean {
    return libraryStorage.deleteItem(id);
  }

  /**
   * Vault Doctor Diagnostics for Library Health
   */
  public runDoctorDiagnostics(allNotes: Note[]): Array<{
    id: string;
    severity: 'error' | 'warn' | 'info';
    message: string;
    itemId?: string;
  }> {
    const items = libraryStorage.getItems();
    const noteIdSet = new Set(allNotes.map((n) => n.id));
    const issues: Array<{ id: string; severity: 'error' | 'warn' | 'info'; message: string; itemId?: string }> = [];

    for (const item of items) {
      // 1. Missing Note reference check
      if (item.noteId && !noteIdSet.has(item.noteId)) {
        issues.push({
          id: `lib-doc-missing-note-${item.id}`,
          severity: 'warn',
          message: `Library Item "${item.title}" references a Markdown note (${item.noteId}) that does not exist or was deleted.`,
          itemId: item.id,
        });
      }

      // 2. Invalid progress check (e.g. current > total)
      if (
        item.progress?.mode === 'page' &&
        item.progress.currentPage &&
        item.progress.totalPages &&
        item.progress.currentPage > item.progress.totalPages
      ) {
        issues.push({
          id: `lib-doc-invalid-progress-${item.id}`,
          severity: 'warn',
          message: `Library Item "${item.title}" has current page (${item.progress.currentPage}) exceeding total pages (${item.progress.totalPages}).`,
          itemId: item.id,
        });
      }
    }

    return issues;
  }
}

export const libraryService = new LibraryService();
