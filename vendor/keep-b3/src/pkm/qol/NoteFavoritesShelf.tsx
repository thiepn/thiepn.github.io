import React from 'react';
import { Star, Pin, FileText, ChevronRight } from 'lucide-react';
import { Note } from '../../types';

interface NoteFavoritesShelfProps {
  notes: Note[];
  activeNoteId?: string | null;
  onSelectNote: (noteId: string, title: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  default: 'bg-stone-500',
  red: 'bg-rose-500',
  orange: 'bg-orange-500',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
  teal: 'bg-teal-400',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-400',
};

export const NoteFavoritesShelf: React.FC<NoteFavoritesShelfProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
}) => {
  // Filter notes that are either pinned or favorited and not trashed
  const favoriteNotes = notes
    .filter(n => (n.pinned || n.isFavorite) && !n.trashed)
    .slice(0, 12);

  if (favoriteNotes.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-950/60 border-b border-stone-800/80 overflow-x-auto text-xs select-none">
      <div className="flex items-center gap-1 text-[11px] font-mono uppercase text-amber-500/80 shrink-0 mr-1">
        <Pin className="w-3 h-3 fill-amber-500/30" />
        <span className="hidden sm:inline font-bold">Shelf:</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {favoriteNotes.map(note => {
          const isActive = note.id === activeNoteId;
          const colorDot = COLOR_MAP[note.color || 'default'] || 'bg-stone-500';

          return (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id, note.title || 'Untitled Note')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-purple-950/50 text-purple-200 border border-purple-500/40 shadow-xs'
                  : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800 hover:text-stone-100 border border-stone-800/70'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colorDot} shrink-0`} />
              <span className="max-w-[140px] truncate">{note.title || 'Untitled'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
