import React, { useState, useMemo } from 'react';
import { Note } from '../../../types';
import { Search, Plus, Check, Link2, FileText, AlertCircle } from 'lucide-react';
import { resolveRelationTargets, formatRelationForFrontmatter } from '../relationEngine';

export interface RelationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: unknown;
  cardinality: 'single' | 'many';
  allNotes: Note[];
  targetCollectionNotes?: Note[];
  onSelect: (targetNoteIds: string[]) => void;
  onCreateNewRelatedNote?: (title: string) => void;
  title?: string;
}

export const RelationPickerModal: React.FC<RelationPickerModalProps> = ({
  isOpen,
  onClose,
  currentValue,
  cardinality,
  allNotes,
  targetCollectionNotes,
  onSelect,
  onCreateNewRelatedNote,
  title = 'Select Related Note',
}) => {
  const [search, setSearch] = useState('');

  // Currently resolved targets
  const currentResolved = useMemo(() => {
    return resolveRelationTargets(currentValue, allNotes);
  }, [currentValue, allNotes]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return currentResolved
      .map((r) => r.targetNoteId)
      .filter((id): id is string => Boolean(id));
  });

  const candidateNotes = useMemo(() => {
    const pool = targetCollectionNotes || allNotes;
    return pool.filter((n) => !n.trashed);
  }, [targetCollectionNotes, allNotes]);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return candidateNotes.slice(0, 50);
    const q = search.toLowerCase().trim();
    return candidateNotes
      .filter((n) => n.title.toLowerCase().includes(q) || (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))))
      .slice(0, 50);
  }, [candidateNotes, search]);

  if (!isOpen) return null;

  const toggleSelect = (noteId: string) => {
    if (cardinality === 'single') {
      setSelectedIds([noteId]);
    } else {
      if (selectedIds.includes(noteId)) {
        setSelectedIds(selectedIds.filter((id) => id !== noteId));
      } else {
        setSelectedIds([...selectedIds, noteId]);
      }
    }
  };

  const handleApply = () => {
    onSelect(selectedIds);
    onClose();
  };

  const handleCreateNew = () => {
    if (!search.trim()) return;
    if (onCreateNewRelatedNote) {
      onCreateNewRelatedNote(search.trim());
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="relation-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-500" />
            <h2 id="relation-picker-title" className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              {title}
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500">
            {cardinality === 'single' ? 'Single Link' : 'Multiple Links'}
          </span>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search notes by title or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[220px]">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <FileText className="w-8 h-8 stroke-1 text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs">No matching notes found</p>
              {search.trim() && onCreateNewRelatedNote && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create "{search.trim()}"
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedIds.includes(note.id);
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => toggleSelect(note.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-400'}`} />
                    <div className="truncate">
                      <div className={`text-xs font-medium truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200 font-semibold' : 'text-stone-800 dark:text-stone-200'}`}>
                        {note.title || 'Untitled Note'}
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] text-stone-400 dark:text-stone-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="text-[11px] text-stone-500">
            {selectedIds.length} {selectedIds.length === 1 ? 'note' : 'notes'} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
