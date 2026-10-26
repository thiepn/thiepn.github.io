/**
 * P47 — Mobile Home-Screen Widget Service
 * 
 * Generates lightweight, derived snapshots of Agenda, Review, and Daily Notes
 * for native Android AppWidgets and iOS WidgetKit extensions.
 * Features:
 * - Privacy-first: defaults to counts-only / sanitized titles
 * - Lock event synchronization: immediately scrubs sensitive preview text on vault lock
 * - Read-only snapshot architecture (no raw note bodies stored on home screen)
 */

import { Note } from '../../types';
import { WidgetPrivacyLevel, WidgetSnapshotData, WidgetType } from './mobileTypes';
import { mobileCapabilityService } from './mobileCapabilityService';

const WIDGET_SNAPSHOTS_KEY = 'pkm_mobile_widget_snapshots_v1';

class MobileWidgetService {
  private currentSnapshots: Record<string, WidgetSnapshotData> = {};

  constructor() {
    this.loadCachedSnapshots();
  }

  private loadCachedSnapshots(): void {
    try {
      const raw = localStorage.getItem(WIDGET_SNAPSHOTS_KEY);
      if (raw) {
        this.currentSnapshots = JSON.parse(raw);
      }
    } catch {
      this.currentSnapshots = {};
    }
  }

  private persistSnapshots(): void {
    try {
      localStorage.setItem(WIDGET_SNAPSHOTS_KEY, JSON.stringify(this.currentSnapshots));
      // Dispatch event to native bridge if present
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pkm-mobile-widget-sync', {
            detail: { snapshots: this.currentSnapshots },
          })
        );
      }
    } catch {
      // Ignore
    }
  }

  public updateAllWidgets(notes: Note[], isVaultLocked: boolean): void {
    this.updateWidgetSnapshots({ notes, isVaultLocked });
  }

  /**
   * Generates and updates all native widget snapshots
   */
  public updateWidgetSnapshots(context: {
    notes: Note[];
    isVaultLocked: boolean;
    dueCardsCount?: number;
    newCardsCount?: number;
    reviewStreak?: number;
  }): void {
    const settings = mobileCapabilityService.getSettings();
    const privacyLevel: WidgetPrivacyLevel = settings.widgetPrivacyLevel;
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Calculate Today's Tasks
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasksCount = 0;
    let overdueTasksCount = 0;
    let hasDailyNote = false;
    const previewTasks: Array<{ title: string; completed: boolean }> = [];

    if (!context.isVaultLocked) {
      for (const note of context.notes) {
        if (note.trashed || note.archived) continue;
        if (note.title.includes(todayStr) || note.tags?.includes('daily')) {
          hasDailyNote = true;
        }
        if (Array.isArray(note.checklist)) {
          for (const item of note.checklist) {
            totalTasks++;
            if (item.completed) {
              completedTasks++;
            } else {
              pendingTasksCount++;
              if (previewTasks.length < 5 && privacyLevel === 'full_when_unlocked') {
                previewTasks.push({ title: item.text, completed: item.completed });
              }
            }
          }
        }
      }
    }

    const todaySnapshot: WidgetSnapshotData = {
      widgetId: 'widget_today',
      type: 'today',
      updatedAt: now,
      isVaultLocked: context.isVaultLocked,
      privacyLevel,
      todaySummary: {
        dateFormatted: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(new Date()),
        hasDailyNote,
        totalTasks,
        completedTasks,
        pendingTasksCount,
        overdueTasksCount,
        previewTasks: context.isVaultLocked || privacyLevel !== 'full_when_unlocked' ? undefined : previewTasks,
      },
    };

    // 2. Calculate Review (Flashcards) Snapshot
    const reviewSnapshot: WidgetSnapshotData = {
      widgetId: 'widget_review',
      type: 'review',
      updatedAt: now,
      isVaultLocked: context.isVaultLocked,
      privacyLevel,
      reviewSummary: {
        dueCardsCount: context.dueCardsCount || 0,
        newCardsCount: context.newCardsCount || 0,
        streakDays: context.reviewStreak || 0,
      },
    };

    // 3. Calculate Quick Capture Snapshot
    const captureSnapshot: WidgetSnapshotData = {
      widgetId: 'widget_quick_capture',
      type: 'quick_capture',
      updatedAt: now,
      isVaultLocked: context.isVaultLocked,
      privacyLevel,
    };

    this.currentSnapshots = {
      today: todaySnapshot,
      review: reviewSnapshot,
      quick_capture: captureSnapshot,
    };

    this.persistSnapshots();
  }

  /**
   * Immediately sanitizes all widget snapshots when vault locks
   */
  public handleVaultLocked(): void {
    for (const key of Object.keys(this.currentSnapshots)) {
      const snap = this.currentSnapshots[key];
      snap.isVaultLocked = true;
      if (snap.todaySummary) {
        snap.todaySummary.previewTasks = undefined;
      }
      if (snap.agendaSummary) {
        snap.agendaSummary.previewItems = undefined;
      }
    }
    this.persistSnapshots();
  }

  public getSnapshot(type: WidgetType): WidgetSnapshotData | undefined {
    return this.currentSnapshots[type];
  }

  public getAllSnapshots(): Record<string, WidgetSnapshotData> {
    return { ...this.currentSnapshots };
  }
}

export const mobileWidgetService = new MobileWidgetService();
