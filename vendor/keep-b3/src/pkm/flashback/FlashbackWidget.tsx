import React, { useState, useMemo } from 'react';
import {
  History,
  Clock,
  Sparkles,
  ArrowUpRight,
  Columns2,
  X,
  Calendar,
  Folder as FolderIcon,
  Tag as TagIcon,
  RotateCcw,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { FlashbackItem } from './flashbackTypes';
import { flashbackService } from './flashbackService';

interface FlashbackWidgetProps {
  notes: Note[];
  folders?: Folder[];
  onOpenNote: (noteId: string, options?: any) => void;
  className?: string;
}

export const FlashbackWidget: React.FC<FlashbackWidgetProps> = ({
  notes,
  folders = [],
  onOpenNote,
  className = '',
}) => {
  const [version, setVersion] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const items: FlashbackItem[] = useMemo(() => {
    return flashbackService.getFlashbackNotes(notes, folders, 5);
  }, [notes, folders, version]);

  const handleDismiss = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    flashbackService.dismissNote(noteId);
    setVersion((v) => v + 1);
  };

  const handleResetDismissals = () => {
    flashbackService.resetDismissals();
    setVersion((v) => v + 1);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-amber-300/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden text-xs text-stone-900 dark:text-stone-100 transition-all shadow-2xs ${className}`}
    >
      {/* Header */}
      <div className="px-3.5 py-2 bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1.5 cursor-pointer text-left"
          >
            <span>Flashback (Knowledge Resurfacing)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 dark:bg-amber-800 text-[10px] text-amber-900 dark:text-amber-100 font-mono">
              {items.length} resurfaced
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded text-[11px] font-medium"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Resurfaced Items List */}
      {isExpanded && (
        <div className="p-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.note.id}
              className="p-2 rounded-lg bg-white/80 dark:bg-stone-850/80 border border-amber-200/50 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-700 transition-all flex items-start justify-between gap-2.5 group/card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      item.windowKey === '1year'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800'
                        : item.windowKey === '30days'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800'
                    }`}
                  >
                    {item.windowLabel} ({item.dateFormatted})
                  </span>

                  {item.folderName && (
                    <span className="text-[10px] text-stone-400 truncate">
                      📁 {item.folderName}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNote(item.note.id)}
                  className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left block text-xs cursor-pointer"
                >
                  {item.note.title || 'Untitled Note'}
                </button>

                {item.excerpt && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {item.excerpt}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenNote(item.note.id)}
                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Open note"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Open</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNote(item.note.id, { split: true })}
                  className="p-1 rounded border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                  title="Open Beside"
                >
                  <Columns2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDismiss(item.note.id, e)}
                  className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Dismiss from Flashback"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
