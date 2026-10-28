/**
 * Phase P28: Accessible Screen-Reader Live Announcements & A11y Utilities
 */

type AnnouncementListener = (message: string, priority: 'polite' | 'assertive') => void;

class A11yService {
  private listeners: Set<AnnouncementListener> = new Set();
  private lastPoliteMessage = '';
  private lastAssertiveMessage = '';

  public subscribe(listener: AnnouncementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!message || message.trim() === '') return;
    if (priority === 'polite') {
      this.lastPoliteMessage = message;
    } else {
      this.lastAssertiveMessage = message;
    }
    this.listeners.forEach((listener) => {
      try {
        listener(message, priority);
      } catch (err) {
        console.error('Error notifying a11y listener:', err);
      }
    });
  }

  public getRecentAnnouncement(priority: 'polite' | 'assertive' = 'polite'): string {
    return priority === 'polite' ? this.lastPoliteMessage : this.lastAssertiveMessage;
  }

  public clear(): void {
    this.lastPoliteMessage = '';
    this.lastAssertiveMessage = '';
  }
}

export const a11yAnnouncer = new A11yService();
