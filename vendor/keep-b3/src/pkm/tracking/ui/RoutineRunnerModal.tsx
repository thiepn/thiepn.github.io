import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  Target,
  FolderKanban,
  Compass,
} from 'lucide-react';
import { RoutineDefinition, RoutineRun } from '../trackingTypes';
import { trackingService } from '../trackingService';
import { useWorkspace } from '../../useWorkspace';

interface RoutineRunnerModalProps {
  routine: RoutineDefinition;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const RoutineRunnerModal: React.FC<RoutineRunnerModalProps> = ({
  routine,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { openNote, openGoalsProjects } = useWorkspace();
  const [currentRun, setCurrentRun] = useState<RoutineRun | null>(null);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen && routine) {
      const run = trackingService.startOrGetRoutineRun(routine);
      setCurrentRun(run);
      setNotes(run.notes || '');
    }
  }, [isOpen, routine]);

  if (!isOpen || !routine || !currentRun) return null;

  const items = [...routine.items].sort((a, b) => a.order - b.order);
  const completedCount = items.filter((i) => currentRun.itemStates[i.id]).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isAllComplete = completedCount === items.length;

  const handleToggleItem = (itemId: string) => {
    const currentStatus = !!currentRun.itemStates[itemId];
    const updated = trackingService.updateRoutineRunItem(currentRun.id, itemId, !currentStatus, true);
    if (updated) {
      setCurrentRun({ ...updated });
    }
  };

  const handleFinishRoutine = () => {
    trackingService.completeRoutineRun(currentRun.id, notes);
    if (onCompleted) onCompleted();
    onClose();
  };

  const handleOpenResource = (item: (typeof items)[0]) => {
    if (!item.resourceId) return;
    if (item.resourceType === 'note') {
      openNote(item.resourceId);
    } else {
      openNote(item.resourceId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {routine.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {routine.description || 'Step-by-step routine checklist'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Progress: {completedCount} of {items.length} steps done
              </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Routine Item Checklist */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2.5">
          {items.map((item, index) => {
            const isDone = !!currentRun.itemStates[item.id];
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                  isDone
                    ? 'bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 opacity-75'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm'
                }`}
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                  onClick={() => handleToggleItem(item.id)}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 focus:outline-none flex-shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                        {index + 1}.
                      </span>
                      <p
                        className={`text-sm font-medium ${
                          isDone
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.type === 'habit_ref' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          Habit
                        </span>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 pl-4">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>

                {item.resourceId && (
                  <button
                    onClick={() => handleOpenResource(item)}
                    title="Open linked resource"
                    className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Optional Run Notes */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Run Notes / Observations (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Smooth morning flow, read 15 pages in French"
              className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Pause / Close
          </button>

          <button
            onClick={handleFinishRoutine}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isAllComplete ? 'Complete Routine' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
};
