/**
 * KEEP B1b replaces the historical V2.1 in-memory demo shell with an actual
 * owner-backed inspectable resource view. It intentionally makes no claim that
 * sample V2 project/person/task engines are production record stores.
 */
import React, { useMemo } from 'react';
import type { Note } from '../../../types';
import { KeepResourceBoard } from '../../../components/home/KeepResourceBoard';
import { buildVaultTasks } from '../../tasks/taskIndex';

export const V2UnifiedExperienceView: React.FC<{
  notes: Note[];
  onOpenNote: (note: Note) => void;
  onSaveNote: (note: Note) => Promise<unknown>;
}> = ({ notes, onOpenNote, onSaveNote }) => {
  const available = useMemo(() => notes.filter(n => !n.archived && !n.trashed && !n.isLocked), [notes]);
  const openTasks = useMemo(() => buildVaultTasks(available).allTasks.filter(t => !t.completed), [available]);
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 sm:p-6 space-y-5">
      <header className="border-b border-stone-200 dark:border-stone-800 pb-3">
        <h2 className="text-lg font-semibold">KEEP · Source-backed resources</h2>
        <p className="text-xs text-stone-500 mt-1">Actual local KEEP notes and their Markdown tasks. The former fictitious V2.1 resource demo is no longer used.</p>
        <p className="text-xs mt-2">{available.length} accessible notes · {openTasks.length} open note tasks · 0 connected external data providers</p>
      </header>
      <KeepResourceBoard notes={notes} onOpenNote={onOpenNote} onSaveNote={onSaveNote} />
      <section>
        <h3 className="font-semibold text-sm mb-2">Browse saved knowledge</h3>
        {available.length === 0 ? <p className="text-sm text-stone-500">No saved, accessible KEEP notes. Create a note in the main workspace to see it here.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {available.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 24).map(note => (
              <button type="button" key={note.id} className="text-left border border-stone-200 dark:border-stone-800 rounded-md px-3 py-2 focus-visible:outline-2 focus-visible:outline-amber-500" onClick={() => onOpenNote(note)}>
                <span className="block text-sm truncate">{note.title || 'Untitled note'}</span>
                <span className="block text-xs text-stone-500">{note.updatedAt.slice(0, 10)} · {note.tags.length} tags</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
