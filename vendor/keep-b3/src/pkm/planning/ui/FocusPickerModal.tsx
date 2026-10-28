import React, { useState, useEffect } from 'react';
import {
  Star,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  FolderKanban,
  Target,
  FileText,
  Search,
} from 'lucide-react';
import { Note } from '../../../types';
import { ProjectRecord, GoalRecord, FocusItem } from '../planningTypes';
import { focusManager } from '../focusManager';

interface FocusPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  projects: ProjectRecord[];
  goals: GoalRecord[];
  onFocusChanged?: () => void;
}

export const FocusPickerModal: React.FC<FocusPickerModalProps> = ({
  isOpen,
  onClose,
  notes,
  projects,
  goals,
  onFocusChanged,
}) => {
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFocusIds(focusManager.getFocusResourceIds());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedItems = focusManager.resolveFocusItems(notes, projects, goals);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    focusManager.reorderFocus(index, index - 1);
    setFocusIds(focusManager.getFocusResourceIds());
    if (onFocusChanged) onFocusChanged();
  };

  const handleMoveDown = (index: number) => {
    if (index === focusIds.length - 1) return;
    focusManager.reorderFocus(index, index + 1);
    setFocusIds(focusManager.getFocusResourceIds());
    if (onFocusChanged) onFocusChanged();
  };

  const handleRemove = (resourceId: string) => {
    focusManager.removeFocus(resourceId);
    setFocusIds(focusManager.getFocusResourceIds());
    if (onFocusChanged) onFocusChanged();
  };

  const handleAdd = (resourceId: string) => {
    focusManager.addFocus(resourceId);
    setFocusIds(focusManager.getFocusResourceIds());
    if (onFocusChanged) onFocusChanged();
  };

  // Search candidate items
  const candidates = [
    ...projects
      .filter((p) => p.status === 'active' && !focusIds.includes(p.id))
      .map((p) => ({ id: p.id, title: p.title, type: 'project' as const })),
    ...goals
      .filter((g) => g.status === 'active' && !focusIds.includes(g.id))
      .map((g) => ({ id: g.id, title: g.title, type: 'goal' as const })),
    ...notes
      .filter(
        (n) =>
          !n.trashed &&
          !focusIds.includes(n.id) &&
          !projects.some((p) => p.id === n.id) &&
          !goals.some((g) => g.id === n.id)
      )
      .slice(0, 30)
      .map((n) => ({ id: n.id, title: n.title || 'Untitled Note', type: 'note' as const })),
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 id="focus-modal-title" className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                Current Planning Focus
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Emphasize key active projects and goals on your Home Dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Focus List */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 overflow-y-auto max-h-56">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">
            Active Focus Items ({resolvedItems.length})
          </h4>
          {resolvedItems.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-4">
              No items currently selected for focus. Add items from below.
            </p>
          ) : (
            <div className="space-y-1.5">
              {resolvedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-400 font-bold w-4">
                      {idx + 1}.
                    </span>
                    {item.type === 'project' && <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    {item.type === 'goal' && <Target className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                    {item.type === 'note' && <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === resolvedItems.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.resourceId)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Remove from Focus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Items to Focus */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Add to Focus
          </h4>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, goals, notes..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-48 flex-1">
            {candidates.slice(0, 15).map((cand) => (
              <button
                key={cand.id}
                onClick={() => handleAdd(cand.id)}
                className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left flex items-center justify-between text-sm transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {cand.type === 'project' && <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  {cand.type === 'goal' && <Target className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                  {cand.type === 'note' && <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                  <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium">
                    {cand.title}
                  </span>
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
