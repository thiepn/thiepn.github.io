/**
 * Phase P59 - Unified Attention Engine
 * Scans canonical domain indexes for factual actionable states (overdue tasks,
 * unprocessed inbox items, due decision reviews, maintenance dates, system integrity).
 * Strictly zero universal priority scores or opaque rankings.
 */

import { Note } from '../../types';
import { AttentionItem, ContextDescriptor } from './contextTypes';
import { extractTasksFromNote } from '../tasks/taskParser';
import { getTodayDateString } from '../temporal/dateUtils';
import { universalInboxService } from '../inbox/universalInboxService';
import { decisionService } from '../decisions/decisionService';
import { assetService } from '../assets/assetService';
import { travelService } from '../travel/travelService';
import { contextStorage } from './contextStorage';

class AttentionEngineService {
  /**
   * Scans the vault and domain services to build the unified Attention Queue.
   */
  public getAllAttention(notes: Note[], options?: { includeSnoozed?: boolean }): AttentionItem[] {
    const today = getTodayDateString();
    const items: AttentionItem[] = [];

    // 1. Overdue and Due Tasks from Notes
    for (const note of notes) {
      if (note.trashed) continue;
      const tasks = extractTasksFromNote(note);
      for (const t of tasks) {
        let taskDue = t.noteDate;
        if (!taskDue && t.text) {
          const inlineMatch = t.text.match(/@due\((\d{4}-\d{2}-\d{2})\)|due:(\d{4}-\d{2}-\d{2})/);
          if (inlineMatch) {
            taskDue = inlineMatch[1] || inlineMatch[2];
          }
        }

        if (!t.completed && taskDue) {
          const isOverdue = taskDue < today;
          const isDueToday = taskDue === today;

          if (isOverdue || isDueToday) {
            const id = `task-${note.id}-${t.id}`;
            if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
              continue;
            }

            const taskLabel = t.text || 'Untitled task';
            items.push({
              id,
              sourceDomain: 'tasks',
              resourceRef: {
                type: 'note',
                id: note.id,
                title: note.title || 'Untitled Note',
                subpath: t.id,
              },
              reason: isOverdue ? 'overdue' : 'due',
              severity: isOverdue ? 'attention' : 'info',
              dueAt: taskDue,
              explanation: isOverdue
                ? `Task "${taskLabel}" is overdue (${taskDue})`
                : `Task "${taskLabel}" is scheduled for today`,
              actionLabel: 'Open Note',
              actionTarget: { type: 'note', id: note.id },
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    // 2. Unprocessed Inbox Items (Universal Inflow)
    try {
      const inboxItems = universalInboxService.getItems();
      for (const item of inboxItems) {
        if (item.state === 'new' || item.state === 'seen') {
          const id = `inbox-${item.id}`;
          if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
            continue;
          }

          items.push({
            id,
            sourceDomain: 'inbox',
            resourceRef: {
              type: 'inbox',
              id: item.id,
              title: item.title,
            },
            reason: 'unprocessed',
            severity: 'attention',
            explanation: `Incoming ${item.source.toUpperCase()} item "${item.title}" requires triage`,
            actionLabel: 'Triage Inbox',
            actionTarget: { type: 'universal-inbox', id: item.id },
            createdAt: item.receivedAt ? new Date(item.receivedAt).getTime() : Date.now(),
          });
        }
      }
    } catch (_) {}

    // 3. Decision Reviews & Predictions Due
    try {
      const dueDecisions = decisionService.getDecisionsDueForReview();
      for (const d of dueDecisions) {
        const id = `decision-rev-${d.id}`;
        if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
          continue;
        }

        items.push({
          id,
          sourceDomain: 'decisions',
          resourceRef: {
            type: 'decision',
            id: d.id,
            title: d.title,
          },
          reason: 'review-due',
          severity: 'attention',
          dueAt: d.reviewDate,
          explanation: `Decision outcome reflection is due for "${d.title}"`,
          actionLabel: 'Review Decision',
          actionTarget: { type: 'decisions', id: d.id },
          createdAt: Date.now(),
        });
      }

      // Predictions due
      const predictions = decisionService.getPredictions();
      for (const pred of predictions) {
        if (pred.status === 'open' && pred.resolutionDate && pred.resolutionDate <= today) {
          const id = `prediction-due-${pred.id}`;
          if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
            continue;
          }

          items.push({
            id,
            sourceDomain: 'predictions',
            resourceRef: {
              type: 'decision',
              id: pred.id,
              title: pred.title,
            },
            reason: 'review-due',
            severity: 'attention',
            dueAt: pred.resolutionDate,
            explanation: `Prediction resolution due: "${pred.title}"`,
            actionLabel: 'Resolve Prediction',
            actionTarget: { type: 'decisions', id: pred.id },
            createdAt: Date.now(),
          });
        }
      }
    } catch (_) {}

    // 4. Asset Maintenance & Warranties Due
    try {
      const dueMaintenance = assetService.getDueMaintenanceItems();
      for (const item of dueMaintenance) {
        const id = `asset-maint-${item.asset.id}-${item.definition.id}`;
        if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
          continue;
        }

        items.push({
          id,
          sourceDomain: 'assets',
          resourceRef: {
            type: 'asset',
            id: item.asset.id,
            title: item.asset.name,
          },
          reason: item.isOverdue ? 'overdue' : 'due',
          severity: item.isOverdue ? 'important' : 'attention',
          dueAt: item.nextDueDate ? new Date(item.nextDueDate).toISOString().slice(0, 10) : undefined,
          explanation: `Maintenance task "${item.definition.title}" due for ${item.asset.name}`,
          actionLabel: 'Log Service',
          actionTarget: { type: 'assets', id: item.asset.id },
          createdAt: Date.now(),
        });
      }
    } catch (_) {}

    // 5. Travel Departures
    try {
      const trips = travelService.getTrips();
      for (const trip of trips) {
        if ((trip.status === 'booked' || trip.status === 'planning') && trip.startDate && trip.startDate <= today) {
          const id = `trip-dep-${trip.id}`;
          if (!options?.includeSnoozed && contextStorage.isAttentionSnoozed(id)) {
            continue;
          }

          items.push({
            id,
            sourceDomain: 'travel',
            resourceRef: {
              type: 'trip',
              id: trip.id,
              title: trip.title,
            },
            reason: 'due',
            severity: 'important',
            dueAt: trip.startDate,
            explanation: `Trip "${trip.title}" starts today (${trip.startDate})`,
            actionLabel: 'Open Travel',
            actionTarget: { type: 'travel', id: trip.id },
            createdAt: Date.now(),
          });
        }
      }
    } catch (_) {}

    // Deduplicate items by unique ID
    const seenIds = new Set<string>();
    const deduplicatedItems: AttentionItem[] = [];
    for (const it of items) {
      if (!seenIds.has(it.id)) {
        seenIds.add(it.id);
        deduplicatedItems.push(it);
      }
    }

    // Sort items: important first, then attention, then info. Then by date.
    const severityOrder = { important: 0, attention: 1, info: 2 };
    return deduplicatedItems.sort((a, b) => {
      const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sDiff !== 0) return sDiff;
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * Filter attention items to a specific context
   */
  public getAttentionForContext(context: ContextDescriptor, notes: Note[]): AttentionItem[] {
    const all = this.getAllAttention(notes);
    if (context.type === 'today') return all;

    const titleNorm = context.title.toLowerCase();
    const id = context.resourceId || context.id;

    return all.filter((item) => {
      if (item.resourceRef.id === id) return true;
      if (item.resourceRef.title.toLowerCase().includes(titleNorm)) return true;
      if (item.explanation.toLowerCase().includes(titleNorm)) return true;
      return false;
    });
  }

  /**
   * Temporarily snooze an attention item without altering the underlying source date.
   */
  public snoozeItem(itemId: string, days = 1): void {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    contextStorage.snoozeAttentionItem(itemId, targetDate.toISOString());
  }

  /**
   * Clear snooze
   */
  public unSnoozeItem(itemId: string): void {
    contextStorage.clearAttentionSnooze(itemId);
  }
}

export const attentionEngine = new AttentionEngineService();
