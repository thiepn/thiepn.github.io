import { NavigationHistoryEntry, SearchNavigationState, NavigableResourceType } from './navigationTypes';

const HISTORY_STORAGE_KEY = 'keepnotes_nav_history_v1_7';
const MAX_HISTORY_ENTRIES = 50;

export class NavigationHistoryManager {
  private stack: NavigationHistoryEntry[] = [];
  private currentIndex = -1;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.stack = parsed.slice(-MAX_HISTORY_ENTRIES);
          this.currentIndex = this.stack.length - 1;
        }
      }
    } catch {
      this.stack = [];
      this.currentIndex = -1;
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.stack));
    } catch {
      // Safe client fallback
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Push a meaningful navigation entry onto the history stack
   */
  public pushEntry(entry: Omit<NavigationHistoryEntry, 'id' | 'timestamp'>): NavigationHistoryEntry {
    const fullEntry: NavigationHistoryEntry = {
      ...entry,
      id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    // If we were at a prior position due to Back navigation, truncate the forward history
    if (this.currentIndex >= 0 && this.currentIndex < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
    }

    // Deduplicate if identical to the immediate current entry
    const current = this.getCurrentEntry();
    if (
      current &&
      current.resourceType === fullEntry.resourceType &&
      current.resourceId === fullEntry.resourceId &&
      current.subpath?.value === fullEntry.subpath?.value
    ) {
      // Update state/timestamp instead of pushing duplicate
      this.stack[this.currentIndex] = fullEntry;
      this.saveHistory();
      return fullEntry;
    }

    this.stack.push(fullEntry);
    if (this.stack.length > MAX_HISTORY_ENTRIES) {
      this.stack = this.stack.slice(-MAX_HISTORY_ENTRIES);
    }
    this.currentIndex = this.stack.length - 1;

    this.saveHistory();
    return fullEntry;
  }

  public canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  public canGoForward(): boolean {
    return this.currentIndex < this.stack.length - 1;
  }

  public goBack(): NavigationHistoryEntry | null {
    if (!this.canGoBack()) return null;
    this.currentIndex--;
    this.saveHistory();
    return this.stack[this.currentIndex];
  }

  public goForward(): NavigationHistoryEntry | null {
    if (!this.canGoForward()) return null;
    this.currentIndex++;
    this.saveHistory();
    return this.stack[this.currentIndex];
  }

  public getCurrentEntry(): NavigationHistoryEntry | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.stack.length) {
      return this.stack[this.currentIndex];
    }
    return null;
  }

  public getHistoryStack(): NavigationHistoryEntry[] {
    return [...this.stack];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public clear(): void {
    this.stack = [];
    this.currentIndex = -1;
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  /**
   * Scrub sensitive history when vault is locked
   */
  public sanitizeLockedVault(): void {
    this.stack = this.stack.filter(
      (entry) => entry.resourceType === 'dashboard' || entry.resourceType === 'universal-inbox'
    );
    this.currentIndex = this.stack.length - 1;
    this.saveHistory();
  }
}

export const navigationHistoryManager = new NavigationHistoryManager();
