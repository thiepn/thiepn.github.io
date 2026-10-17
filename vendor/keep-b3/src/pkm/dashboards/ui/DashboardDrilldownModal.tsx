import React, { useState } from 'react';
import { TableRowItem } from '../dashboardTypes';
import { Note } from '../../../types';
import { X, Search, ExternalLink, Calendar, Tag, Layers } from 'lucide-react';

interface DashboardDrilldownModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  itemIds: string[];
  allNotes: Note[];
  onClose: () => void;
  onOpenNote: (noteId: string) => void;
}

export const DashboardDrilldownModal: React.FC<DashboardDrilldownModalProps> = ({
  isOpen,
  title,
  subtitle,
  itemIds,
  allNotes,
  onClose,
  onOpenNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Find matching notes by itemIds
  const matchingNotes = itemIds
    .map((id) => allNotes.find((n) => n.id === id))
    .filter((n): n is Note => Boolean(n));

  const filtered = matchingNotes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title || '').toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q) ||
      (note.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </h2>
            </div>
            {subtitle && (
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {subtitle} • {matchingNotes.length} source records
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close Drilldown"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search filter bar */}
        <div className="px-6 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search within contributing notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 text-xs">
              No matching records found
            </div>
          ) : (
            filtered.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  onOpenNote(note.id);
                  onClose();
                }}
                className="flex items-center justify-between p-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex flex-col truncate pr-4">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {note.title || 'Untitled Note'}
                  </span>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                    {note.tags && note.tags.length > 0 && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <Tag className="w-3 h-3" />
                        {note.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-stone-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0 px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center text-xs text-stone-500">
          <span>{filtered.length} notes listed</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 rounded-lg text-stone-800 dark:text-stone-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
