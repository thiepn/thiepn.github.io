import type { Note } from '../../types';
import type { PKMTask } from '../tasks/taskTypes';
import { buildVaultTasks } from '../tasks/taskIndex';
import { classifyPlanningNote } from '../planning/planningNoteClassifier';
import { savedViewsManager } from '../personalization/savedViewsManager';
import type { FavoriteItem } from '../personalization/personalizationTypes';
import { makeOwnerRef, parseOwnerRef, sourceLanding, type OwnerResourceRef } from './ownerResourceRefs';

export type ResourceStatus = 'available' | 'locked' | 'archived' | 'trashed' | 'missing' | 'unverified-owner' | 'legacy-unresolved';

export interface ResolvedKeepResource {
  uri: string | null;
  ref: OwnerResourceRef | null;
  title: string;
  status: ResourceStatus;
  pinned: boolean;
  sourceLabel: string;
  note?: Note;
  task?: PKMTask;
  favoriteId?: string;
  landing: string | null;
}

export function anchoredTaskId(noteId: string, blockId: string): string {
  return `${noteId}::${blockId}`;
}
export function splitAnchoredTaskId(input: string): { noteId: string; blockId: string } | null {
  const separator = input.lastIndexOf('::');
  if (separator <= 0 || separator >= input.length - 2) return null;
  const blockId = input.slice(separator + 2);
  return /^[a-zA-Z0-9_-]{1,100}$/u.test(blockId) ? { noteId: input.slice(0, separator), blockId } : null;
}

/**
 * Add a stable Markdown block anchor only to the EXACT parsed task line. This
 * prepares a new Note value; the caller must await its original owner save
 * before creating the pin. A user-visible failure never writes a shadow task.
 */
export function ensureTaskAnchor(note: Note, task: PKMTask, anchor: string): Note {
  if (note.id !== task.noteId || note.type !== 'text' || note.isLocked || note.archived || note.trashed) throw new Error('Task source unavailable for editing');
  if (!/^[a-zA-Z0-9_-]{1,100}$/u.test(anchor)) throw new Error('Invalid Markdown task anchor');
  if (task.blockId) return note;
  const lines = note.content.split('\n');
  if (task.line < 0 || lines[task.line] !== task.rawLine || !/^\s*[-*+]\s+\[[ xX]\]/u.test(task.rawLine)) {
    throw new Error('Task changed before pinning; refresh its source note');
  }
  if (note.content.includes(`^${anchor}`)) throw new Error('Task anchor already exists');
  lines[task.line] = `${lines[task.line].trimEnd()} ^${anchor}`;
  return { ...note, content: lines.join('\n'), updatedAt: new Date().toISOString() };
}

/** Resolve references against the actual in-memory KEEP owner snapshot. */
export function resolveOwnerResource(ref: OwnerResourceRef, notes: readonly Note[]): Omit<ResolvedKeepResource, 'pinned' | 'favoriteId'> {
  const base = { uri: ref.uri, ref, title: ref.id, sourceLabel: ref.source === 'keep' ? 'KEEP' : ref.source.toUpperCase(), landing: sourceLanding(ref) };
  if (ref.source !== 'keep') return { ...base, status: 'unverified-owner' };
  if (ref.kind === 'saved-view') {
    const view = savedViewsManager.getSavedViewById(ref.id);
    return view ? { ...base, title: view.name, status: 'available' } : { ...base, status: 'missing' };
  }
  const info = ref.kind === 'markdown-task' || ref.kind === 'note-block' ? splitAnchoredTaskId(ref.id) : null;
  const noteId = info?.noteId ?? ref.id;
  const note = notes.find(n => n.id === noteId);
  if (!note) return { ...base, status: 'missing' };
  if (note.trashed) return { ...base, title: note.title, status: 'trashed' };
  if (note.isLocked) return { ...base, title: 'Locked note', status: 'locked' };
  if (note.archived) return { ...base, title: note.title, status: 'archived' };
  if (ref.kind === 'note') return { ...base, title: note.title || 'Untitled note', status: 'available', note };
  if (ref.kind === 'project' || ref.kind === 'goal' || ref.kind === 'area') {
    return classifyPlanningNote(note) === ref.kind
      ? { ...base, title: note.title || 'Untitled ' + ref.kind, status: 'available', note }
      : { ...base, title: note.title, status: 'missing' };
  }
  if (!info) return { ...base, title: note.title, status: 'missing' };
  if (ref.kind === 'markdown-task') {
    const tasks = buildVaultTasks([note]).allTasks;
    const matches = tasks.filter(t => t.blockId === info.blockId);
    return matches.length === 1
      ? { ...base, title: matches[0].text, status: 'available', note, task: matches[0] }
      : { ...base, title: note.title, status: 'missing' };
  }
  // Non-task block refs require a unique explicit ^id anchor in real Markdown.
  const found = note.content.split('\n').filter(line => new RegExp(`\\^${info.blockId}$`, 'u').test(line));
  return found.length === 1
    ? { ...base, title: `${note.title} · ^${info.blockId}`, status: 'available', note }
    : { ...base, title: note.title, status: 'missing' };
}

/** Existing note pin/favorite flags remain canonical. Legacy favorites are never discarded. */
export function collectKeepPins(notes: readonly Note[], favorites: readonly FavoriteItem[]): ResolvedKeepResource[] {
  const result = new Map<string, ResolvedKeepResource>();
  for (const note of notes) {
    if (!note.pinned && !note.isFavorite) continue;
    const ref = makeOwnerRef('keep', 'note', note.id);
    result.set(ref.uri, { ...resolveOwnerResource(ref, notes), pinned: true });
  }
  for (const favorite of [...favorites].sort((a, b) => (a.order || 0) - (b.order || 0))) {
    // Old note favorites use type/resourceId; older project/view shortcuts
    // stay visible as unresolved until a canonical owner is selected.
    let ref = favorite.resourceUri ? parseOwnerRef(favorite.resourceUri) : null;
    if (!favorite.resourceUri && favorite.type === 'note') {
      try { ref = makeOwnerRef('keep', 'note', favorite.resourceId); } catch { /* corrupt legacy preference remains inspectable */ }
    }
    if (!ref) {
      const key = `legacy:${favorite.type}:${favorite.resourceId}`;
      if (!result.has(key)) result.set(key, { uri: null, ref: null, title: favorite.title, sourceLabel: 'Legacy shortcut', status: 'legacy-unresolved', pinned: true, favoriteId: favorite.id, landing: null });
      continue;
    }
    const old = result.get(ref.uri);
    const resolved = resolveOwnerResource(ref, notes);
    result.set(ref.uri, { ...resolved, title: resolved.status === 'unverified-owner' ? favorite.title : resolved.title, pinned: true, favoriteId: favorite.id ?? old?.favoriteId });
  }
  return [...result.values()];
}
