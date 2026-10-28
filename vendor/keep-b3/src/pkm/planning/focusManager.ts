/**
 * Phase P49 — Focus State Manager
 * 
 * Focus represents a small, user-selected set of resources emphasized NOW.
 * It is distinct from Favorites (Favorites = long-term navigation preferences;
 * Focus = current execution planning emphasis).
 * 
 * Stored in localStorage / vault configuration, with immediate memory scrubbing on lock.
 */

import { Note } from '../../types';
import { FocusItem, ProjectRecord, GoalRecord } from './planningTypes';

const FOCUS_STORAGE_KEY = 'pkm_planning_focus_v1';

export class FocusManager {
  private focusResourceIds: string[] = [];
  private listeners: Set<(items: FocusItem[]) => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.focusResourceIds = parsed.filter((id) => typeof id === 'string');
        }
      }
    } catch (e) {
      console.warn('Failed to load focus items from localStorage', e);
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(this.focusResourceIds));
    } catch (e) {
      console.warn('Failed to save focus items to localStorage', e);
    }
  }

  public subscribe(listener: (items: FocusItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(items: FocusItem[]) {
    for (const listener of this.listeners) {
      try {
        listener(items);
      } catch (err) {
        console.error('Error in focus manager listener:', err);
      }
    }
  }

  public getFocusResourceIds(): string[] {
    return [...this.focusResourceIds];
  }

  public isFocused(resourceId: string): boolean {
    return this.focusResourceIds.includes(resourceId);
  }

  public addFocus(resourceId: string): void {
    if (!this.focusResourceIds.includes(resourceId)) {
      this.focusResourceIds.push(resourceId);
      this.save();
    }
  }

  public removeFocus(resourceId: string): void {
    const next = this.focusResourceIds.filter((id) => id !== resourceId);
    if (next.length !== this.focusResourceIds.length) {
      this.focusResourceIds = next;
      this.save();
    }
  }

  public toggleFocus(resourceId: string): boolean {
    if (this.isFocused(resourceId)) {
      this.removeFocus(resourceId);
      return false;
    } else {
      this.addFocus(resourceId);
      return true;
    }
  }

  public setFocusList(resourceIds: string[]): void {
    this.focusResourceIds = Array.from(new Set(resourceIds.filter(Boolean)));
    this.save();
  }

  public reorderFocus(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.focusResourceIds.length ||
      toIndex < 0 ||
      toIndex >= this.focusResourceIds.length
    ) {
      return;
    }
    const next = [...this.focusResourceIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    this.focusResourceIds = next;
    this.save();
  }

  /**
   * Resolves raw focus resource IDs against active vault notes/projects/goals
   */
  public resolveFocusItems(
    notes: Note[],
    projects: ProjectRecord[] = [],
    goals: GoalRecord[] = []
  ): FocusItem[] {
    const noteMap = new Map<string, Note>(notes.map((n) => [n.id, n]));
    const projectMap = new Map<string, ProjectRecord>(projects.map((p) => [p.id, p]));
    const goalMap = new Map<string, GoalRecord>(goals.map((g) => [g.id, g]));

    const items: FocusItem[] = [];

    for (const resourceId of this.focusResourceIds) {
      const project = projectMap.get(resourceId);
      if (project) {
        items.push({
          id: `focus-${resourceId}`,
          type: 'project',
          resourceId,
          title: project.title,
          status: project.status,
          due: project.due,
          nextAction: project.nextActionTask?.text,
          progressText: project.progressText,
          progressPercent: project.progressPercent ?? undefined,
          isMissing: false,
        });
        continue;
      }

      const goal = goalMap.get(resourceId);
      if (goal) {
        items.push({
          id: `focus-${resourceId}`,
          type: 'goal',
          resourceId,
          title: goal.title,
          status: goal.status,
          due: goal.targetDate,
          progressPercent: goal.progressPercent,
          progressText:
            goal.activeProjectsCount > 0
              ? `${goal.activeProjectsCount} active project${goal.activeProjectsCount === 1 ? '' : 's'}`
              : undefined,
          isMissing: false,
        });
        continue;
      }

      const note = noteMap.get(resourceId);
      if (note && !note.trashed) {
        items.push({
          id: `focus-${resourceId}`,
          type: 'note',
          resourceId,
          title: note.title || 'Untitled Note',
          isMissing: false,
        });
        continue;
      }

      // Note was deleted or not found
      items.push({
        id: `focus-${resourceId}`,
        type: 'note',
        resourceId,
        title: 'Deleted / Missing Resource',
        isMissing: true,
      });
    }

    this.notify(items);
    return items;
  }

  /**
   * Clears memory upon vault lock
   */
  public lock(): void {
    this.focusResourceIds = [];
    this.notify([]);
  }
}

export const focusManager = new FocusManager();
