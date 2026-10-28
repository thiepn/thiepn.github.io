import React, { useState } from 'react';
import {
  Target,
  FolderKanban,
  Layers,
  Sparkles,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { Note } from '../../../types';
import { GoalRecord, AreaRecord } from '../planningTypes';
import { planningService } from '../planningService';

interface NewPlanningResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'project' | 'goal' | 'area';
  initialGoalId?: string;
  initialAreaId?: string;
  goals: GoalRecord[];
  areas: AreaRecord[];
  onCreateNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onOpenNote: (noteId: string) => void;
}

export const NewPlanningResourceModal: React.FC<NewPlanningResourceModalProps> = ({
  isOpen,
  onClose,
  initialType = 'project',
  initialGoalId,
  initialAreaId,
  goals,
  areas,
  onCreateNote,
  onOpenNote,
}) => {
  const [resourceType, setResourceType] = useState<'project' | 'goal' | 'area'>(initialType);
  const [title, setTitle] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || '');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(initialAreaId || '');
  const [dateVal, setDateVal] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let draft: { title: string; content: string } = { title: '', content: '' };

      const matchedGoal = goals.find((g) => g.id === selectedGoalId);
      const matchedArea = areas.find((a) => a.id === selectedAreaId);

      if (resourceType === 'project') {
        draft = planningService.generateProjectNoteContent({
          title,
          goalId: selectedGoalId,
          goalTitle: matchedGoal?.title,
          areaId: selectedAreaId,
          areaTitle: matchedArea?.title,
          due: dateVal || undefined,
          priority,
        });
      } else if (resourceType === 'goal') {
        draft = planningService.generateGoalNoteContent({
          title,
          areaId: selectedAreaId,
          areaTitle: matchedArea?.title,
          targetDate: dateVal || undefined,
          priority,
        });
      } else {
        draft = planningService.generateAreaNoteContent({
          title,
        });
      }

      const newNote = await onCreateNote({
        title: draft.title,
        content: draft.content,
        tags: [resourceType],
        isPinned: false,
        isArchived: false,
        trashed: false,
      });

      onOpenNote(newNote.id);
      onClose();
    } catch (err) {
      console.error('Failed to create planning resource note', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-plan-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 id="new-plan-title" className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
            Create Planning Note
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setResourceType('project')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                resourceType === 'project'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              Project
            </button>
            <button
              type="button"
              onClick={() => setResourceType('goal')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                resourceType === 'goal'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Target className="w-4 h-4" />
              Goal
            </button>
            <button
              type="button"
              onClick={() => setResourceType('area')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                resourceType === 'area'
                  ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Area
            </button>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${
                resourceType === 'project'
                  ? 'Launch Website v2'
                  : resourceType === 'goal'
                  ? 'Master TypeScript & Rust'
                  : 'Health & Fitness'
              }`}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date (Due for project, Target for goal) */}
          {resourceType !== 'area' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {resourceType === 'project' ? 'Due Date (Deadline)' : 'Target Outcome Date'}
              </label>
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Goal selection for Project */}
          {resourceType === 'project' && goals.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Linked Goal (Optional)
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Area selection for Project & Goal */}
          {resourceType !== 'area' && areas.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Area of Responsibility (Optional)
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          {resourceType !== 'area' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}

          {/* Submit buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm"
            >
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
