/**
 * QoL 4: Global Navigation History Stack
 * Tracks visited notes and enables browser-style Back/Forward traversal.
 */

export interface HistoryEntry {
  noteId: string;
  noteTitle: string;
  timestamp: number;
}

class NavigationHistoryManager {
  private backStack: HistoryEntry[] = [];
  private forwardStack: HistoryEntry[] = [];
  private currentEntry: HistoryEntry | null = null;
  private listeners: Array<() => void> = [];
  private maxHistorySize = 50;

  public push(noteId: string, noteTitle: string) {
    if (!noteId) return;

    // Do not duplicate if opening the currently focused note
    if (this.currentEntry && this.currentEntry.noteId === noteId) {
      return;
    }

    if (this.currentEntry) {
      this.backStack.push(this.currentEntry);
      if (this.backStack.length > this.maxHistorySize) {
        this.backStack.shift();
      }
    }

    this.currentEntry = {
      noteId,
      noteTitle: noteTitle || 'Untitled Note',
      timestamp: Date.now(),
    };

    // Pushing a new note clears the forward stack (browser behavior)
    this.forwardStack = [];
    this.notify();
  }

  public canGoBack(): boolean {
    return this.backStack.length > 0;
  }

  public canGoForward(): boolean {
    return this.forwardStack.length > 0;
  }

  public goBack(): HistoryEntry | null {
    if (this.backStack.length === 0) return null;

    if (this.currentEntry) {
      this.forwardStack.push(this.currentEntry);
    }

    const previous = this.backStack.pop()!;
    this.currentEntry = previous;
    this.notify();
    return previous;
  }

  public goForward(): HistoryEntry | null {
    if (this.forwardStack.length === 0) return null;

    if (this.currentEntry) {
      this.backStack.push(this.currentEntry);
    }

    const next = this.forwardStack.pop()!;
    this.currentEntry = next;
    this.notify();
    return next;
  }

  public getCurrent(): HistoryEntry | null {
    return this.currentEntry;
  }

  public getRecentList(limit = 15): HistoryEntry[] {
    const list: HistoryEntry[] = [];
    if (this.currentEntry) {
      list.push(this.currentEntry);
    }
    for (let i = this.backStack.length - 1; i >= 0 && list.length < limit; i--) {
      list.push(this.backStack[i]);
    }
    return list;
  }

  public clear() {
    this.backStack = [];
    this.forwardStack = [];
    this.currentEntry = null;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in navigation history listener', err);
      }
    }
  }
}

export const navigationHistory = new NavigationHistoryManager();
