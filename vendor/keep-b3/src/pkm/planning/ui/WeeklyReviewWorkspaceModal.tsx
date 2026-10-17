import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Target,
  Inbox,
  Clock,
  ExternalLink,
  Plus,
  FileText,
  ChevronRight,
  ArrowRight,
  Star,
  Layers,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  ReviewPeriod,
  WeeklyReviewSnapshot,
  ProjectRecord,
  GoalRecord,
} from '../planningTypes';
import {
  buildWeeklyReviewSnapshot,
  formatSectionMarkdown,
  generateReviewNoteContent,
  getReviewPeriodRange,
} from '../planningReviewEngine';
import { focusManager } from '../focusManager';
import { planningService } from '../planningService';

interface WeeklyReviewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  projects?: ProjectRecord[];
  goals?: GoalRecord[];
  onOpenNote: (noteId: string) => void;
  onCreateNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onAppendToNote?: (noteId: string, markdownSnippet: string) => Promise<void>;
  inboxFolderId?: string;
}

export const WeeklyReviewWorkspaceModal: React.FC<WeeklyReviewWorkspaceModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  projects,
  goals,
  onOpenNote,
  onCreateNote,
  onAppendToNote,
  inboxFolderId,
}) => {
  const [period, setPeriod] = useState<ReviewPeriod>('week');
  const [activeTab, setActiveTab] = useState<
    'completed' | 'overdue' | 'projects' | 'goals' | 'upcoming' | 'inbox' | 'focus'
  >('completed');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [insertedSection, setInsertedSection] = useState<string | null>(null);
  const [selectedFocusIds, setSelectedFocusIds] = useState<string[]>(() =>
    focusManager.getFocusResourceIds()
  );

  const activeProjects = projects || planningService.getProjects();
  const activeGoals = goals || planningService.getGoals();

  const snapshot: WeeklyReviewSnapshot = useMemo(() => {
    return buildWeeklyReviewSnapshot({
      period,
      baseDate: new Date(),
      notes: notes || [],
      projects: activeProjects,
      goals: activeGoals,
      inboxFolderId,
    });
  }, [period, notes, activeProjects, activeGoals, inboxFolderId]);

  // Find existing review note for this period
  const existingReviewNote = useMemo(() => {
    return notes.find((n) => {
      if (n.trashed) return false;
      const t = n.title.toLowerCase();
      return (
        t.includes(`${period} review`) &&
        (t.includes(snapshot.periodStart) || t.includes(snapshot.label.toLowerCase()))
      );
    });
  }, [notes, period, snapshot.periodStart, snapshot.label]);

  if (!isOpen) return null;

  const handleCreateOrOpenReview = async () => {
    if (existingReviewNote) {
      onOpenNote(existingReviewNote.id);
      onClose();
      return;
    }

    const { title, content } = generateReviewNoteContent(period, new Date());
    const newNote = await onCreateNote({
      title,
      content,
      tags: ['review', `${period}-review`],
      isPinned: false,
      isArchived: false,
      trashed: false,
    });

    onOpenNote(newNote.id);
    onClose();
  };

  const handleCopyMarkdown = (sectionId: any) => {
    const md = formatSectionMarkdown(sectionId, snapshot);
    navigator.clipboard.writeText(md);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleInsertSnapshot = async (sectionId: any) => {
    if (!existingReviewNote && !onAppendToNote) return;

    const md = formatSectionMarkdown(sectionId, snapshot);
    if (existingReviewNote && onAppendToNote) {
      await onAppendToNote(existingReviewNote.id, '\n\n' + md);
      setInsertedSection(sectionId);
      setTimeout(() => setInsertedSection(null), 2500);
    } else {
      handleCopyMarkdown(sectionId);
    }
  };

  const toggleFocusItem = (id: string) => {
    const next = selectedFocusIds.includes(id)
      ? selectedFocusIds.filter((item) => item !== id)
      : [...selectedFocusIds, id];
    setSelectedFocusIds(next);
    focusManager.setFocusList(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="review-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Planning Review Workspace
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Periodic reflection & live planning inspector over canonical data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              {(['week', 'month', 'quarter', 'year'] as ReviewPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                    period === p
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Review Note Banner */}
        <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="font-semibold">{snapshot.label}:</span>
            <span>
              {existingReviewNote
                ? `Review note exists: "${existingReviewNote.title}"`
                : 'No canonical review note created yet for this period.'}
            </span>
          </div>

          <button
            onClick={handleCreateOrOpenReview}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {existingReviewNote ? 'Open Review Note' : 'Create Canonical Review Note'}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body: Sidebar tabs + Inspector pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-3 space-y-1 bg-zinc-50/30 dark:bg-zinc-900/30 overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completed Tasks
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.completedTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'overdue'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Overdue Tasks
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.overdueTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'projects'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-500" />
                Active Projects
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.activeProjects.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'goals'
                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                Active Goals
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.activeGoals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Upcoming (14 Days)
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.upcomingDeadlines.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-purple-500" />
                Inbox Captures
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700">
                {snapshot.inboxCount}
              </span>
            </button>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('focus')}
                className={`w-full p-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                  activeTab === 'focus'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Focus Planner
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                  {selectedFocusIds.length}
                </span>
              </button>
            </div>
          </div>

          {/* Inspector Details View */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-zinc-900">
            {/* 1. Completed Tasks */}
            {activeTab === 'completed' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Completed Tasks in {snapshot.label}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Derived from task completion timestamps & note history
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMarkdown('completed_tasks')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSection === 'completed_tasks' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Markdown
                        </>
                      )}
                    </button>
                    {existingReviewNote && onAppendToNote && (
                      <button
                        onClick={() => handleInsertSnapshot('completed_tasks')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        {insertedSection === 'completed_tasks' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Appended to Note!
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Insert Snapshot into Review Note
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {snapshot.completedTasks.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
                    No completed tasks recorded in this period.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshot.completedTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm line-through text-zinc-500 dark:text-zinc-400">
                              {t.text}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                              from note: <span className="font-medium">{t.noteTitle}</span>
                              {t.noteDate && ` (date: ${t.noteDate})`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenNote(t.noteId)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Overdue Tasks */}
            {activeTab === 'overdue' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Overdue Open Tasks ({snapshot.overdueTasks.length})
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tasks with deadlines past today requiring rescheduling or completion
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMarkdown('overdue_tasks')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                    {existingReviewNote && onAppendToNote && (
                      <button
                        onClick={() => handleInsertSnapshot('overdue_tasks')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert Snapshot
                      </button>
                    )}
                  </div>
                </div>

                {snapshot.overdueTasks.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-sm">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    All tasks are up to date! No overdue items.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshot.overdueTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                              {t.text}
                            </p>
                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                              {t.noteDate ? `Due: ${t.noteDate} • ` : ''}from [[{t.noteTitle}]]
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenNote(t.noteId)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Active Projects */}
            {activeTab === 'projects' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Active Projects Review ({snapshot.activeProjects.length})
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Inspect next actions, progress, and identify stale projects
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMarkdown('active_projects')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                    {existingReviewNote && onAppendToNote && (
                      <button
                        onClick={() => handleInsertSnapshot('active_projects')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert Snapshot
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {snapshot.activeProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                            {p.title}
                          </h4>
                          {p.progressText && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              {p.progressText}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onOpenNote(p.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          Open Note
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {p.nextActionTask ? (
                        <div className="text-xs bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                          <span className="text-zinc-500 font-medium">Next Action:</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                            {p.nextActionTask.text}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 p-2 rounded border border-amber-200 dark:border-amber-900 flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          No actionable next task defined.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Active Goals */}
            {activeTab === 'goals' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Long-Term Goals Progress ({snapshot.activeGoals.length})
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Verify goals have active supporting projects
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMarkdown('active_goals')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                    {existingReviewNote && onAppendToNote && (
                      <button
                        onClick={() => handleInsertSnapshot('active_goals')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert Snapshot
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {snapshot.activeGoals.map((g) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {g.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {g.targetDate ? `Target: ${g.targetDate} • ` : ''}
                          {g.activeProjectsCount} active supporting project(s)
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenNote(g.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 flex-shrink-0"
                      >
                        Open Goal
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Upcoming Deadlines */}
            {activeTab === 'upcoming' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Upcoming Deadlines (Next 14 Days)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Scheduled calendar events, project deadlines, and outcome targets
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMarkdown('upcoming_deadlines')}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                    {existingReviewNote && onAppendToNote && (
                      <button
                        onClick={() => handleInsertSnapshot('upcoming_deadlines')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Insert Snapshot
                      </button>
                    )}
                  </div>
                </div>

                {snapshot.upcomingDeadlines.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
                    No deadlines scheduled in the next 14 days.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshot.upcomingDeadlines.map((d, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded">
                            {d.date}
                          </span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                            {d.title}
                          </span>
                          <span className="text-xs text-zinc-400 capitalize">({d.type})</span>
                        </div>
                        <button
                          onClick={() => onOpenNote(d.id)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. Inbox Captures */}
            {activeTab === 'inbox' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Inbox & Quick Captures ({snapshot.inboxCount} unprocessed)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Process rough notes into Projects, Goals, Tasks, or Knowledge Notes
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-center">
                  <Inbox className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {snapshot.inboxCount} item(s) in Inbox
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                    During your review, clarify any unorganized thoughts in your inbox. Convert actionable ideas to Projects or Goals.
                  </p>
                </div>
              </div>
            )}

            {/* 7. Focus Planner */}
            {activeTab === 'focus' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      Focus Planner for Next Period
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Select 2–5 key projects or goals to feature on your Home Planning Dashboard
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Active Projects & Goals
                  </p>
                  {projects
                    .filter((p) => p.status === 'active')
                    .map((p) => {
                      const isSelected = selectedFocusIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleFocusItem(p.id)}
                          className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'border-amber-500/50 bg-amber-500/10'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Star
                              className={`w-4 h-4 ${
                                isSelected ? 'text-amber-500 fill-current' : 'text-zinc-400'
                              }`}
                            />
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                                {p.title}
                              </p>
                              {p.nextActionTask && (
                                <p className="text-xs text-zinc-500">
                                  Next: {p.nextActionTask.title}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              isSelected
                                ? 'bg-amber-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            {isSelected ? 'Focused' : 'Add'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
