import { ActionUndoDescriptor } from './actionTypes';

export interface UndoEntry {
  id: string;
  actionId: string;
  description: string;
  timestamp: number;
  descriptor: ActionUndoDescriptor;
}

export class UndoFoundationV2 {
  private stack: UndoEntry[] = [];
  private maxEntries: number = 30;
  private listeners: Set<() => void> = new Set();

  public push(actionId: string, descriptor: ActionUndoDescriptor): void {
    const entry: UndoEntry = {
      id: crypto.randomUUID(),
      actionId,
      description: descriptor.description,
      timestamp: Date.now(),
      descriptor,
    };

    this.stack.unshift(entry);
    if (this.stack.length > this.maxEntries) {
      this.stack.pop();
    }
    this.notify();
  }

  public async undoLatest(): Promise<boolean> {
    if (this.stack.length === 0) return false;
    const entry = this.stack.shift()!;
    try {
      const ok = await entry.descriptor.revert();
      this.notify();
      return !!ok;
    } catch (err) {
      console.error(`Failed to execute undo for ${entry.actionId}:`, err);
      this.notify();
      return false;
    }
  }

  public getHistory(): UndoEntry[] {
    return [...this.stack];
  }

  public clear(): void {
    this.stack = [];
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      cb();
    }
  }
}

export const undoFoundationV2 = new UndoFoundationV2();
