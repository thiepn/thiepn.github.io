/**
 * Phase P29: Note Autosave State Machine & Concurrency Race Protection
 */

import { Note, ChecklistItem } from '../../types';
import { NoteSaveState, NoteSaveStatus, NoteMutationResult } from './resilienceTypes';
import { atomicTransactionService } from './atomicTransactions';

export class NoteSaveStateMachine {
  private noteStates: Map<string, NoteSaveState> = new Map();
  private listeners: Set<(states: Map<string, NoteSaveState>) => void> = new Set();
  private noteListeners: Map<string, Set<(state: NoteSaveState) => void>> = new Map();
  private activeSavePromises: Map<string, Promise<any>> = new Map();

  public getState(noteId: string): NoteSaveState {
    return this.getOrCreateState(noteId);
  }

  public subscribe(
    noteIdOrListener: string | ((states: Map<string, NoteSaveState>) => void),
    listener?: (state: NoteSaveState) => void
  ): () => void {
    if (typeof noteIdOrListener === 'string' && listener) {
      const noteId = noteIdOrListener;
      if (!this.noteListeners.has(noteId)) {
        this.noteListeners.set(noteId, new Set());
      }
      this.noteListeners.get(noteId)!.add(listener);
      listener(this.getOrCreateState(noteId));
      return () => {
        this.noteListeners.get(noteId)?.delete(listener);
      };
    } else if (typeof noteIdOrListener === 'function') {
      this.listeners.add(noteIdOrListener);
      noteIdOrListener(new Map(this.noteStates));
      return () => this.listeners.delete(noteIdOrListener);
    }
    return () => {};
  }

  private notify(specificNoteId?: string) {
    const copy = new Map(this.noteStates);
    for (const l of this.listeners) {
      try {
        l(copy);
      } catch (err) {
        console.error('Error in save state machine listener:', err);
      }
    }

    if (specificNoteId) {
      const specificListeners = this.noteListeners.get(specificNoteId);
      if (specificListeners) {
        const state = this.getOrCreateState(specificNoteId);
        for (const l of specificListeners) {
          try {
            l(state);
          } catch (err) {
            console.error('Error in note-specific save listener:', err);
          }
        }
      }
    }
  }

  public getOrCreateState(noteId: string): NoteSaveState {
    let state = this.noteStates.get(noteId);
    if (!state) {
      state = {
        noteId,
        status: 'clean',
        localVersion: 1,
        persistedVersion: 1,
        lastSavedAt: new Date().toISOString(),
        lastAttemptAt: null,
        errorMessage: null,
        isQuotaError: false,
        saveSequenceId: 0,
      };
      this.noteStates.set(noteId, state);
    }
    return state;
  }

  public markDirty(noteId: string, currentContent?: string) {
    const state = this.getOrCreateState(noteId);
    state.status = 'dirty';
    state.localVersion += 1;
    state.uncommittedContent = currentContent;
    state.errorMessage = null;
    state.isQuotaError = false;
    this.notify(noteId);
  }

  /**
   * Safe persistent save with race-condition and out-of-order completion protection
   */
  public async executeSave(
    note: Note,
    persistFn: (n: Note) => Promise<any>
  ): Promise<{ success: boolean; state: NoteSaveState }> {
    const state = this.getOrCreateState(note.id);
    const thisSequenceId = ++state.saveSequenceId;
    const saveVersion = state.localVersion;

    state.status = 'saving';
    state.lastAttemptAt = new Date().toISOString();
    this.notify(note.id);

    try {
      // Execute the storage write
      await persistFn(note);

      // Race check: If user typed again while this save was inflight, sequence/version will have moved.
      // In that case, the note is still DIRTY with respect to the latest user edits!
      if (state.saveSequenceId === thisSequenceId && state.localVersion === saveVersion) {
        state.status = 'saved';
        state.persistedVersion = saveVersion;
        state.lastSavedAt = new Date().toISOString();
        state.uncommittedContent = undefined;
        state.errorMessage = null;
        state.isQuotaError = false;
      } else {
        // More recent changes exist; keep status dirty so next debounced pass will save them
        state.status = 'dirty';
        state.persistedVersion = Math.max(state.persistedVersion, saveVersion);
      }
    } catch (err: any) {
      console.error(`Save failed for note ${note.id}:`, err);
      const isQuota =
        err?.name === 'QuotaExceededError' ||
        err?.message?.toLowerCase().includes('quota') ||
        err?.message?.toLowerCase().includes('storage full');

      state.status = 'error';
      state.isQuotaError = Boolean(isQuota);
      state.errorMessage = isQuota
        ? 'Storage quota exceeded. Your changes remain in memory. Export or clear space to persist.'
        : err?.message || 'Storage write failed';
      state.uncommittedContent = note.content;
    }

    this.notify(note.id);
    return { success: state.status === 'saved', state: { ...state } };
  }

  /**
   * Emergency export helper if persistent save fails
   */
  public exportEmergencyMarkdown(note: Note): string {
    const state = this.getOrCreateState(note.id);
    const contentToExport = state.uncommittedContent !== undefined ? state.uncommittedContent : note.content;
    return `# ${note.title || 'Untitled Note'}\n\n${contentToExport}`;
  }

  /**
   * Canonical atomic mutation helper: Appends text to a note safely
   */
  public async appendToNote(
    note: Note,
    textToAppend: string,
    onSaveCallback: (n: Note) => Promise<void>
  ): Promise<NoteMutationResult> {
    const state = this.getOrCreateState(note.id);
    const prevVersion = state.localVersion;

    const separator = note.content && !note.content.endsWith('\n\n') ? '\n\n' : '';
    const updatedContent = `${note.content || ''}${separator}${textToAppend}`;
    const updatedNote: Note = {
      ...note,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    };

    this.markDirty(note.id, updatedContent);

    try {
      const res = await atomicTransactionService.executeAtomicBatch({
        notesToPut: [updatedNote],
      });

      if (!res.success) {
        throw res.error || new Error('Transaction failed');
      }

      await onSaveCallback(updatedNote);
      state.persistedVersion = state.localVersion;
      state.status = 'saved';
      this.notify();

      return {
        success: true,
        note: updatedNote,
        previousVersion: prevVersion,
        newVersion: state.localVersion,
      };
    } catch (e: any) {
      state.status = 'error';
      state.errorMessage = e?.message || 'Failed to append to note';
      this.notify();
      return {
        success: false,
        error: state.errorMessage || 'Append failed',
      };
    }
  }

  /**
   * Canonical atomic mutation helper: Toggles a task status inside a note
   */
  public async toggleTaskInNote(
    note: Note,
    taskIndex: number,
    onSaveCallback: (n: Note) => Promise<void>
  ): Promise<NoteMutationResult> {
    const state = this.getOrCreateState(note.id);
    const prevVersion = state.localVersion;

    const list = [...(note.checklist || [])];
    if (taskIndex < 0 || taskIndex >= list.length) {
      return { success: false, error: 'Task index out of bounds' };
    }

    list[taskIndex] = {
      ...list[taskIndex],
      completed: !list[taskIndex].completed,
    };

    const updatedNote: Note = {
      ...note,
      checklist: list,
      updatedAt: new Date().toISOString(),
    };

    this.markDirty(note.id);

    try {
      const res = await atomicTransactionService.executeAtomicBatch({
        notesToPut: [updatedNote],
      });

      if (!res.success) {
        throw res.error || new Error('Task toggle transaction failed');
      }

      await onSaveCallback(updatedNote);
      state.persistedVersion = state.localVersion;
      state.status = 'saved';
      this.notify();

      return {
        success: true,
        note: updatedNote,
        previousVersion: prevVersion,
        newVersion: state.localVersion,
      };
    } catch (e: any) {
      state.status = 'error';
      state.errorMessage = e?.message || 'Failed to toggle task in note';
      this.notify();
      return {
        success: false,
        error: state.errorMessage || 'Task toggle failed',
      };
    }
  }
}

export const noteSaveStateMachine = new NoteSaveStateMachine();
