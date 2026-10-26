/**
 * QoL 10: Typewriter Scrolling & Focus Dimming Mode
 * Centers the active cursor line and dims inactive text blocks.
 */

class TypewriterManager {
  private isTypewriterActive: boolean = false;
  private isFocusDimmingActive: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.isTypewriterActive = localStorage.getItem('pkm_typewriter_mode') === 'true';
        this.isFocusDimmingActive = localStorage.getItem('pkm_focus_dimming') === 'true';
      } catch {}
    }
  }

  public get isTypewriter(): boolean {
    return this.isTypewriterActive;
  }

  public get isFocusDimming(): boolean {
    return this.isFocusDimmingActive;
  }

  public toggleTypewriter(): boolean {
    this.isTypewriterActive = !this.isTypewriterActive;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pkm_typewriter_mode', String(this.isTypewriterActive));
      } catch {}
    }
    this.notify();
    return this.isTypewriterActive;
  }

  public toggleFocusDimming(): boolean {
    this.isFocusDimmingActive = !this.isFocusDimmingActive;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pkm_focus_dimming', String(this.isFocusDimmingActive));
      } catch {}
    }
    this.notify();
    return this.isFocusDimmingActive;
  }

  /**
   * Adjusts the scrollTop of a textarea/container to keep cursor centered.
   */
  public centerCursor(textarea: HTMLTextAreaElement) {
    if (!this.isTypewriterActive || !textarea) return;

    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, selectionStart);
    const lineCount = (textBeforeCursor.match(/\n/g) || []).length;

    // Estimate line height
    const lineHeight = 24;
    const cursorY = lineCount * lineHeight;
    const viewportHeight = textarea.clientHeight;

    const targetScrollTop = Math.max(0, cursorY - viewportHeight / 2);
    textarea.scrollTop = targetScrollTop;
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
        console.error('Error in typewriter manager listener', err);
      }
    }
  }
}

export const typewriterManager = new TypewriterManager();
