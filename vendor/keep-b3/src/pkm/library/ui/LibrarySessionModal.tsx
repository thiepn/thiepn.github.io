import React, { useState } from 'react';
import { X, Clock, Plus, BookOpen, Check } from 'lucide-react';
import { LibraryItem, ReadingSession } from '../libraryTypes';
import { libraryService } from '../libraryService';

export interface LibrarySessionModalProps {
  item: LibraryItem;
  isOpen: boolean;
  onClose: () => void;
  onSessionLogged: (session: ReadingSession) => void;
}

export const LibrarySessionModal: React.FC<LibrarySessionModalProps> = ({
  item,
  isOpen,
  onClose,
  onSessionLogged,
}) => {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressDelta, setProgressDelta] = useState<number | undefined>(
    item.progress?.mode === 'page' ? 20 : undefined
  );
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;

    const session = libraryService.logReadingSession({
      libraryItemId: item.id,
      durationMinutes,
      date,
      progressDelta,
      progressUnit: item.progress?.mode === 'page' ? 'pages' : 'minutes',
      note: note.trim() || undefined,
      courseId: item.relations?.courseIds?.[0],
    });

    onSessionLogged(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Log Reading / Media Session
              </h2>
              <p className="text-[11px] text-stone-400 line-clamp-1">{item.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {item.progress && item.progress.mode === 'page' && (
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Pages Read in Session (+Pages)
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 25"
                value={progressDelta || ''}
                onChange={(e) => setProgressDelta(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Current progress: {item.progress.currentPage || 0} / {item.progress.totalPages || '—'}{' '}
                pages
              </p>
            </div>
          )}

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Session Notes / Thoughts (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="What ideas stood out during this session?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-lg p-3 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold shadow-sm transition-colors"
            >
              Log Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
