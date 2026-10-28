/**
 * QoL 1: Tab Lifecycle & Shortcuts Manager
 * Caches recently closed tabs for instant Ctrl+Shift+T reopening.
 */

export interface ClosedTabSnapshot {
  resourceId: string;
  resourceType: string;
  title: string;
  closedAt: number;
}

class TabShortcutsManager {
  private closedTabsQueue: ClosedTabSnapshot[] = [];
  private maxClosedQueue = 20;
  private listeners: Array<() => void> = [];

  public recordClosedTab(tab: { resourceId: string; resourceType?: string; title: string }) {
    if (!tab.resourceId) return;

    this.closedTabsQueue.push({
      resourceId: tab.resourceId,
      resourceType: tab.resourceType || 'note',
      title: tab.title || 'Untitled',
      closedAt: Date.now(),
    });

    if (this.closedTabsQueue.length > this.maxClosedQueue) {
      this.closedTabsQueue.shift();
    }
    this.notify();
  }

  public popRecentlyClosed(): ClosedTabSnapshot | null {
    if (this.closedTabsQueue.length === 0) return null;
    const tab = this.closedTabsQueue.pop()!;
    this.notify();
    return tab;
  }

  public hasRecentlyClosed(): boolean {
    return this.closedTabsQueue.length > 0;
  }

  public getRecentlyClosedList(): ClosedTabSnapshot[] {
    return [...this.closedTabsQueue].reverse();
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
        console.error('Error in tab shortcuts listener', err);
      }
    }
  }
}

export const tabShortcutsManager = new TabShortcutsManager();
