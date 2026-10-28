/**
 * Phase P59 - Unified Context Engine & Resolver
 * Orchestrates domain adapters, active context lifecycles, working sets,
 * resume checkpoints, "What Changed?" semantic diffs, and privacy-preserving AI context scopes.
 */

import { Note, Folder } from '../../types';
import {
  ContextDescriptor,
  ContextSnapshot,
  ContextWorkingSet,
  ContextSummary,
  ContextResumeState,
  WhatChangedSummary,
  SemanticChangeEvent,
  ContextAIScopePreview,
  WorkingSetItem,
  ContextResolveOptions,
} from './contextTypes';
import {
  ContextAdapter,
  TodayContextAdapter,
  ProjectContextAdapter,
  CourseContextAdapter,
  TripContextAdapter,
  PersonContextAdapter,
  DecisionContextAdapter,
  AssetContextAdapter,
  CustomContextAdapter,
} from './domainAdapters';
import { attentionEngine } from './attentionEngine';
import { contextStorage } from './contextStorage';

class ContextEngineService {
  private adapters: ContextAdapter[] = [];
  private activeContext: ContextDescriptor | null = null;
  private isContextPinned = false;
  private contextHistory: ContextDescriptor[] = [];
  private historyIndex = -1;
  private listeners: Set<() => void> = new Set();
  private snapshotCache: Map<string, { snapshot: ContextSnapshot; timestamp: number }> = new Map();

  constructor() {
    // Register default domain adapters
    this.registerAdapter(new TodayContextAdapter());
    this.registerAdapter(new ProjectContextAdapter());
    this.registerAdapter(new CourseContextAdapter());
    this.registerAdapter(new TripContextAdapter());
    this.registerAdapter(new PersonContextAdapter());
    this.registerAdapter(new DecisionContextAdapter());
    this.registerAdapter(new AssetContextAdapter());
    this.registerAdapter(new CustomContextAdapter());
  }

  public registerAdapter(adapter: ContextAdapter): void {
    this.adapters.push(adapter);
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
        console.error('[ContextEngine] Listener error:', e);
      }
    });
  }

  // --- Active Context Management ---
  public getActiveContext(): ContextDescriptor | null {
    return this.activeContext;
  }

  public isPinned(): boolean {
    return this.isContextPinned;
  }

  public setPinned(pinned: boolean): void {
    this.isContextPinned = pinned;
    this.notify();
  }

  public setActiveContext(descriptor: ContextDescriptor | null, options?: { skipHistory?: boolean }): void {
    if (this.isContextPinned && descriptor?.id !== this.activeContext?.id) {
      // If pinned, ignore automatic context switches unless forced
      return;
    }

    this.activeContext = descriptor;

    if (descriptor && !options?.skipHistory) {
      // Manage bounded navigation history
      if (this.historyIndex < this.contextHistory.length - 1) {
        this.contextHistory = this.contextHistory.slice(0, this.historyIndex + 1);
      }
      this.contextHistory.push(descriptor);
      if (this.contextHistory.length > 20) {
        this.contextHistory.shift();
      }
      this.historyIndex = this.contextHistory.length - 1;
    }

    this.notify();
  }

  public startContext(descriptor: ContextDescriptor): void {
    this.setActiveContext(descriptor);
    // Record resume checkpoint immediately
    contextStorage.saveResumeState({
      contextId: descriptor.id,
      contextTitle: descriptor.title,
      contextType: descriptor.type,
      lastWorkedOn: Date.now(),
      previewText: descriptor.subtitle || `Started ${descriptor.title}`,
    });
  }

  public leaveContext(): void {
    if (this.activeContext) {
      contextStorage.saveResumeState({
        contextId: this.activeContext.id,
        contextTitle: this.activeContext.title,
        contextType: this.activeContext.type,
        lastWorkedOn: Date.now(),
        previewText: `Worked on ${this.activeContext.title}`,
      });
    }
    this.activeContext = null;
    this.isContextPinned = false;
    this.notify();
  }

  // --- Snapshot & Working Set Resolver ---
  public getSnapshot(
    descriptor: ContextDescriptor,
    allNotes: Note[],
    allFolders: Folder[],
    options?: ContextResolveOptions
  ): ContextSnapshot {
    const cacheKey = `${descriptor.id}_${descriptor.type}`;
    const cached = this.snapshotCache.get(cacheKey);
    const now = Date.now();

    // Cache valid for 3 seconds unless invalidated
    if (cached && now - cached.timestamp < 3000) {
      return cached.snapshot;
    }

    // Find handling adapter
    const adapter = this.adapters.find((a) => a.canHandle(descriptor)) || this.adapters[this.adapters.length - 1];

    const baseWorkingSet = adapter.resolveWorkingSet(descriptor, allNotes, allFolders, options);
    const summary = adapter.getSummary(descriptor, allNotes, allFolders);
    const attention = attentionEngine.getAttentionForContext(descriptor, allNotes);
    const whatChanged = this.getWhatChanged(descriptor, allNotes);

    // Merge custom context pins
    const pinnedItems = contextStorage.getPinsForContext(descriptor.id);
    if (pinnedItems.length > 0) {
      pinnedItems.forEach((pin) => {
        if (pin.resourceType === 'note') {
          if (!baseWorkingSet.notes.some((n) => n.resourceId === pin.resourceId)) {
            baseWorkingSet.notes.unshift(pin);
          }
        } else if (pin.resourceType === 'task') {
          if (!baseWorkingSet.tasks.some((t) => t.id === pin.id)) {
            baseWorkingSet.tasks.unshift(pin);
          }
        } else {
          baseWorkingSet.other.unshift(pin);
        }
      });
    }

    const snapshot: ContextSnapshot = {
      context: descriptor,
      workingSet: baseWorkingSet,
      summary,
      attention,
      whatChanged,
      generatedAt: now,
      indexVersion: 1,
    };

    this.snapshotCache.set(cacheKey, { snapshot, timestamp: now });
    return snapshot;
  }

  // --- What Changed Semantic Diff ---
  public getWhatChanged(descriptor: ContextDescriptor, allNotes: Note[]): WhatChangedSummary {
    const lastReviewedAt = contextStorage.getReviewCursor(descriptor.id);
    const adapter = this.adapters.find((a) => a.canHandle(descriptor));
    const events: SemanticChangeEvent[] = adapter
      ? adapter.getSemanticEvents(descriptor, lastReviewedAt, allNotes)
      : [];

    return {
      lastReviewedAt,
      eventsCount: events.length,
      events,
    };
  }

  public markContextReviewed(contextId: string): void {
    contextStorage.setReviewCursor(contextId, Date.now());
    this.snapshotCache.delete(contextId);
    this.notify();
  }

  // --- Context Search ---
  public searchInContext(descriptor: ContextDescriptor, query: string, allNotes: Note[]): WorkingSetItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const snapshot = this.getSnapshot(descriptor, allNotes, []);
    const results: WorkingSetItem[] = [];

    const searchPool: WorkingSetItem[] = [
      ...(snapshot.workingSet.now || []),
      ...snapshot.workingSet.tasks,
      ...snapshot.workingSet.notes,
      ...snapshot.workingSet.people,
      ...snapshot.workingSet.events,
      ...snapshot.workingSet.inboxItems,
      ...snapshot.workingSet.decisions,
      ...snapshot.workingSet.references,
      ...snapshot.workingSet.other,
    ];

    searchPool.forEach((item) => {
      if (item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q) || item.relevanceExplanation.toLowerCase().includes(q)) {
        results.push(item);
      }
    });

    return results;
  }

  // --- AI Scope Preview & Generation ---
  public getAIScopePreview(descriptor: ContextDescriptor, allNotes: Note[]): ContextAIScopePreview {
    const snapshot = this.getSnapshot(descriptor, allNotes, []);
    const included: Array<{ type: string; title: string; itemCount?: number }> = [];
    const excluded: Array<{ type: string; title: string; reason: string }> = [];

    included.push({
      type: 'context',
      title: `${descriptor.type.toUpperCase()}: ${descriptor.title}`,
    });

    if (snapshot.workingSet.notes.length > 0) {
      included.push({
        type: 'notes',
        title: 'Working Set Notes',
        itemCount: snapshot.workingSet.notes.length,
      });
    }

    if (snapshot.workingSet.tasks.length > 0) {
      included.push({
        type: 'tasks',
        title: 'Associated Tasks',
        itemCount: snapshot.workingSet.tasks.length,
      });
    }

    if (snapshot.workingSet.decisions.length > 0) {
      included.push({
        type: 'decisions',
        title: 'Linked Decisions',
        itemCount: snapshot.workingSet.decisions.length,
      });
    }

    // Explicit privacy exclusions for sensitive domains
    excluded.push({
      type: 'finance',
      title: 'Financial Records & Transactions',
      reason: 'Sensitive domain protected by privacy boundary',
    });
    excluded.push({
      type: 'health',
      title: 'Health & Biometric Data',
      reason: 'Sensitive domain protected by privacy boundary',
    });
    excluded.push({
      type: 'notes_unrelated',
      title: 'Unrelated Vault Notes',
      reason: 'Scoped strictly to active context Working Set',
    });

    return {
      contextId: descriptor.id,
      contextTitle: descriptor.title,
      includedSources: included,
      excludedSensitiveSources: excluded,
    };
  }

  // --- Memory Purge on Vault Lock ---
  public purgeOnLock(): void {
    this.activeContext = null;
    this.isContextPinned = false;
    this.contextHistory = [];
    this.historyIndex = -1;
    this.snapshotCache.clear();
    contextStorage.purgeSensitiveMemoryOnLock();
    this.notify();
  }
}

export const contextEngine = new ContextEngineService();
