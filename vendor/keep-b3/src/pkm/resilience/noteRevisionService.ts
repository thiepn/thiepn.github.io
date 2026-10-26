/**
 * Phase P29: Bounded Note Revision History & Safe Restore
 */

import { Note, NoteRevision } from '../../types';
import { BoundedNoteRevision, NoteRevisionDiff } from './resilienceTypes';
import { computeDeterministicChecksum } from '../portableVaultSerializer';

const MAX_REVISIONS_PER_NOTE = 50;
const COALESCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export class NoteRevisionService {
  /**
   * Determine if a new revision should be recorded or coalesced with the previous revision
   */
  public shouldCreateRevision(
    note: Note,
    currentContent: string,
    trigger: BoundedNoteRevision['trigger'] = 'auto_coalesced'
  ): boolean {
    if (trigger === 'manual_checkpoint' || trigger === 'pre_restore' || trigger === 'before_destructive_edit') {
      return true;
    }

    const revisions = (note.revisions as unknown as BoundedNoteRevision[]) || [];
    if (revisions.length === 0) {
      return true;
    }

    const last = revisions[revisions.length - 1];
    const checksum = computeDeterministicChecksum(currentContent);

    // If identical content, no new revision needed
    if (last.checksum === checksum) {
      return false;
    }

    // If within coalescing window, update the last revision timestamp and content rather than pushing a new one
    const timeSinceLast = Date.now() - new Date(last.timestamp).getTime();
    if (timeSinceLast < COALESCE_WINDOW_MS && last.trigger === 'auto_coalesced') {
      return false;
    }

    return true;
  }

  /**
   * Create or coalesce a revision into note.revisions, enforcing the bounded limit
   */
  public recordRevision(
    note: Note,
    currentContent: string,
    trigger: BoundedNoteRevision['trigger'] = 'auto_coalesced'
  ): Note {
    const rawRevisions = (note.revisions as unknown as BoundedNoteRevision[]) || [];
    const revisions = [...rawRevisions];
    const now = new Date().toISOString();
    const checksum = computeDeterministicChecksum(currentContent);

    if (revisions.length > 0) {
      const last = revisions[revisions.length - 1];
      const timeSinceLast = Date.now() - new Date(last.timestamp).getTime();

      // If identical content, do nothing
      if (last.checksum === checksum) {
        return note;
      }

      // Coalesce if inside window and both are auto_coalesced
      if (timeSinceLast < COALESCE_WINDOW_MS && last.trigger === 'auto_coalesced' && trigger === 'auto_coalesced') {
        revisions[revisions.length - 1] = {
          ...last,
          content: currentContent,
          timestamp: now,
          characterCount: currentContent.length,
          wordCount: currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0,
          checksum,
        };
        return {
          ...note,
          revisions: revisions as any,
        };
      }
    }

    const nextVersion = revisions.length > 0 ? revisions[revisions.length - 1].version + 1 : 1;
    const newRev: BoundedNoteRevision = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      noteId: note.id,
      version: nextVersion,
      timestamp: now,
      title: note.title || 'Untitled',
      content: currentContent,
      characterCount: currentContent.length,
      wordCount: currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0,
      checksum,
      trigger,
    };

    revisions.push(newRev);

    // Enforce bounded retention
    while (revisions.length > MAX_REVISIONS_PER_NOTE) {
      // Keep version 1 if possible or drop oldest non-protected
      revisions.shift();
    }

    return {
      ...note,
      revisions: revisions as any,
    };
  }

  /**
   * Safe revision restore:
   * First creates a 'pre_restore' checkpoint of current state, then restores the target revision.
   */
  public prepareRevisionRestore(
    note: Note,
    targetRevisionId: string
  ): { success: boolean; restoredNote?: Note; error?: string } {
    const revisions = (note.revisions as unknown as BoundedNoteRevision[]) || [];
    const targetRev = revisions.find((r) => r.id === targetRevisionId);

    if (!targetRev) {
      return { success: false, error: 'Target revision not found' };
    }

    // 1. Take a safety checkpoint of current note content before restoring
    let noteWithPreRestore = this.recordRevision(note, note.content || '', 'pre_restore');

    // 2. Restore content and title from target revision
    const restoredNote: Note = {
      ...noteWithPreRestore,
      title: targetRev.title || note.title,
      content: targetRev.content || '',
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      restoredNote,
    };
  }

  /**
   * Simple line-based diff generator between two text versions
   */
  public computeDiff(
    oldText: string,
    newText: string,
    oldVersion = 1,
    newVersion = 2
  ): NoteRevisionDiff {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const diffChunks: NoteRevisionDiff['diffChunks'] = [];
    let addedLines = 0;
    let removedLines = 0;
    let unchangedLines = 0;

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diffChunks.push({
          type: 'unchanged',
          text: oldLines[i],
          lineNumber: j + 1,
        });
        unchangedLines++;
        i++;
        j++;
      } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
        diffChunks.push({
          type: 'add',
          text: newLines[j],
          lineNumber: j + 1,
        });
        addedLines++;
        j++;
      } else if (i < oldLines.length) {
        diffChunks.push({
          type: 'remove',
          text: oldLines[i],
          lineNumber: i + 1,
        });
        removedLines++;
        i++;
      } else {
        break;
      }
    }

    return {
      oldVersion,
      newVersion,
      addedLines,
      removedLines,
      unchangedLines,
      diffChunks,
    };
  }
}

export const noteRevisionService = new NoteRevisionService();
