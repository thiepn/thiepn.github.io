import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, Clock, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Note } from '../../types';
import { navigationHistory } from './navigationHistory';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string, title: string) => void;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Results calculation
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show recent history first, then most recently updated notes
      const recentIds = navigationHistory.getRecentList(10).map(h => h.noteId);
      const recentNotes = recentIds
        .map(id => notes.find(n => n.id === id))
        .filter((n): n is Note => Boolean(n && !n.trashed));

      const others = notes
        .filter(n => !n.trashed && !recentIds.includes(n.id))
        .slice(0, 10);

      return [...recentNotes, ...others].slice(0, 12);
    }

    return notes
      .filter(n => {
        if (n.trashed) return false;
        if (n.title.toLowerCase().includes(q)) return true;
        if (n.content?.toLowerCase().includes(q)) return true;
        if (n.tags?.some(t => t.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 15);
  }, [query, notes]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          const chosen = results[selectedIndex];
          onSelectNote(chosen.id, chosen.title);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onSelectNote, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100 animate-fade-in">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-800 bg-stone-950/80">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Quick Switch Note (Ctrl+O)..."
            className="flex-1 bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No matching notes found for "{query}".
            </div>
          ) : (
            results.map((note, idx) => (
              <button
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id, note.title);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-purple-600/25 border border-purple-500/30 text-white'
                    : 'hover:bg-stone-800 text-stone-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-stone-850 border border-stone-800 shrink-0">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {note.title || 'Untitled Note'}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {note.content?.slice(0, 60).trim() || 'No preview available'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-stone-500">
                  {idx === selectedIndex && (
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      <span>Jump</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-4 py-2 border-t border-stone-800/80 bg-stone-950/80 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>esc Dismiss</span>
          </div>
          <span>{results.length} notes</span>
        </div>
      </div>
    </div>
  );
};
