import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  X,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Copy,
  CheckCircle2,
  ListTodo,
  Flame,
  Flag,
  Tag,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Note, Folder, NotePriority } from '../../types';
import { PKMTask, TaskFilterState, TaskGroupBy, TaskSortBy, TaskSortOrder } from '../../pkm/tasks/taskTypes';
import { buildVaultTasks, filterAndSortTasks, groupTasks } from '../../pkm/tasks/taskIndex';
import { toggleTaskInNote, editTaskTextInNote, addTaskToNote, deleteTaskFromNote } from '../../pkm/tasks/taskMutator';

export type TaskPerspective =
  | 'all'
  | 'today_overdue'
  | 'upcoming'
  | 'priority'
  | 'by_note'
  | 'by_folder'
  | 'completed';

interface VaultTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  initialPerspective?: TaskPerspective;
}

export const VaultTasksModal: React.FC<VaultTasksModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onOpenNote,
  onUpdateNote,
  initialPerspective = 'all',
}) => {
  const [perspective, setPerspective] = useState<TaskPerspective>(initialPerspective);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('none');
  const [sortBy, setSortBy] = useState<TaskSortBy>('date');
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('asc');

  // Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddTargetNoteId, setQuickAddTargetNoteId] = useState<string>(
    notes.length > 0 ? notes[0].id : ''
  );

  // Inline Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  // Toast / Feedback State
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Collapsed Groups in Accordion Mode
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Today ISO Date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // Sync quickAddTargetNoteId when notes change
  useEffect(() => {
    if (!quickAddTargetNoteId && notes.length > 0) {
      setQuickAddTargetNoteId(notes[0].id);
    }
  }, [notes, quickAddTargetNoteId]);

  // Handle keyboard shortcut escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingTaskId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingTaskId]);

  // Build master vault tasks
  const { allTasks, openCount, completedCount } = useMemo(() => {
    return buildVaultTasks(notes, folders);
  }, [notes, folders]);

  // Calculate Overdue & Today counts
  const { overdueCount, todayCount, upcomingCount } = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().slice(0, 10);

    for (const t of allTasks) {
      if (t.completed) continue;
      const d = t.dueDate || t.noteDate;
      if (d) {
        if (d < todayStr) overdue++;
        else if (d === todayStr) today++;
        else if (d <= sevenDaysStr) upcoming++;
      }
    }
    return { overdueCount: overdue, todayCount: today, upcomingCount: upcoming };
  }, [allTasks, todayStr]);

  // Filter tasks based on current perspective & criteria
  const filteredTasks = useMemo(() => {
    let tasks = allTasks.slice();

    // 1. Perspective Presets
    if (perspective === 'today_overdue') {
      tasks = tasks.filter((t) => {
        if (t.completed) return false;
        const d = t.dueDate || t.noteDate;
        return d && d <= todayStr;
      });
    } else if (perspective === 'upcoming') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysStr = sevenDaysFromNow.toISOString().slice(0, 10);
      tasks = tasks.filter((t) => {
        if (t.completed) return false;
        const d = t.dueDate || t.noteDate;
        return d && d > todayStr && d <= sevenDaysStr;
      });
    } else if (perspective === 'priority') {
      tasks = tasks.filter((t) => {
        if (t.completed) return false;
        const p = t.priority || t.notePriority;
        return p === 'urgent' || p === 'high';
      });
    } else if (perspective === 'completed') {
      tasks = tasks.filter((t) => t.completed);
    } else {
      // For 'all', 'by_note', 'by_folder': respect the status filter
      if (statusFilter === 'open') {
        tasks = tasks.filter((t) => !t.completed);
      } else if (statusFilter === 'completed') {
        tasks = tasks.filter((t) => t.completed);
      }
    }

    // 2. Custom Filter Criteria
    const filterConfig: TaskFilterState = {
      status: 'all', // already handled above
      searchQuery,
      selectedFolderId: folderFilter,
      selectedTag: tagFilter,
      selectedNoteId: null,
      selectedPriority: priorityFilter,
      groupBy: 'none',
      sortBy,
      sortOrder,
    };

    return filterAndSortTasks(tasks, filterConfig);
  }, [
    allTasks,
    perspective,
    todayStr,
    statusFilter,
    searchQuery,
    folderFilter,
    tagFilter,
    priorityFilter,
    sortBy,
    sortOrder,
  ]);

  // Determine effective group by
  const effectiveGroupBy: TaskGroupBy = useMemo(() => {
    if (perspective === 'by_note') return 'note';
    if (perspective === 'by_folder') return 'folder';
    return groupBy;
  }, [perspective, groupBy]);

  // Grouped task items
  const taskGroups = useMemo(() => {
    return groupTasks(filteredTasks, effectiveGroupBy, folders);
  }, [filteredTasks, effectiveGroupBy, folders]);

  // Toggle Task Completion Handler
  const handleToggleTask = (task: PKMTask) => {
    const note = notes.find((n) => n.id === task.noteId);
    if (!note) return;

    const result = toggleTaskInNote(note, task);
    if (result.success && result.updatedNote) {
      onUpdateNote(result.updatedNote);
    } else {
      showToast(result.error || 'Failed to update task');
    }
  };

  // Save Inline Edit Handler
  const handleSaveInlineEdit = (task: PKMTask) => {
    if (!editingTaskText.trim()) {
      setEditingTaskId(null);
      return;
    }
    const note = notes.find((n) => n.id === task.noteId);
    if (!note) return;

    const result = editTaskTextInNote(note, task, editingTaskText);
    if (result.success && result.updatedNote) {
      onUpdateNote(result.updatedNote);
      setEditingTaskId(null);
    } else {
      showToast(result.error || 'Failed to edit task');
    }
  };

  // Delete Task Handler
  const handleDeleteTask = (task: PKMTask) => {
    const note = notes.find((n) => n.id === task.noteId);
    if (!note) return;

    const result = deleteTaskFromNote(note, task);
    if (result.success && result.updatedNote) {
      onUpdateNote(result.updatedNote);
      showToast('Task removed from note');
    } else {
      showToast(result.error || 'Failed to delete task');
    }
  };

  // Quick Add Task Handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim() || !quickAddTargetNoteId) return;

    const targetNote = notes.find((n) => n.id === quickAddTargetNoteId);
    if (!targetNote) return;

    const result = addTaskToNote(targetNote, quickAddText);
    if (result.success && result.updatedNote) {
      onUpdateNote(result.updatedNote);
      setQuickAddText('');
      showToast(`Task added to "${targetNote.title || 'Untitled'}"`);
    } else {
      showToast(result.error || 'Failed to add task');
    }
  };

  // Export Filtered Tasks as Markdown
  const handleExportMarkdown = () => {
    const lines: string[] = [
      `# Vault Tasks Export (${new Date().toLocaleDateString()})`,
      `> Filter: ${perspective} | Total: ${filteredTasks.length} tasks`,
      '',
    ];

    for (const t of filteredTasks) {
      const check = t.completed ? '[x]' : '[ ]';
      const due = t.dueDate ? ` @due(${t.dueDate})` : '';
      const pri = t.priority ? ` !${t.priority}` : '';
      lines.push(`- ${check} ${t.text}${due}${pri} (from [[${t.noteTitle}]])`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-tasks-${todayStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported tasks to Markdown');
  };

  // Export Filtered Tasks as CSV
  const handleExportCSV = () => {
    const headers = ['Status', 'Task', 'Due Date', 'Priority', 'Source Note', 'Folder', 'Tags'];
    const rows = filteredTasks.map((t) => [
      t.completed ? 'Completed' : 'Open',
      `"${t.text.replace(/"/g, '""')}"`,
      t.dueDate || '',
      t.priority || t.notePriority || '',
      `"${(t.noteTitle || '').replace(/"/g, '""')}"`,
      `"${(t.folderName || '').replace(/"/g, '""')}"`,
      `"${t.tags.join(', ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-tasks-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported tasks to CSV');
  };

  // Copy Filtered Tasks to Clipboard
  const handleCopyClipboard = async () => {
    const text = filteredTasks
      .map((t) => `- [${t.completed ? 'x' : ' '}] ${t.text} (${t.noteTitle})`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
      showToast('Copied tasks to clipboard');
    } catch {
      showToast('Failed to copy to clipboard');
    }
  };

  // Helper toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Toggle group accordion
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  if (!isOpen) return null;

  const totalCount = allTasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 dark:bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-tasks-title"
    >
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold shadow-lg animate-fade-in flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Header Bar */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 bg-stone-50/70 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
              <ListTodo className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <h2 id="vault-tasks-title" className="text-lg font-bold tracking-tight text-stone-950 dark:text-white flex items-center gap-2">
                <span>Vault Task Center</span>
                <span className="text-xs font-normal text-stone-500 dark:text-stone-400 font-mono">
                  {openCount} open · {completedCount} done
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                Global action item hub across {notes.length} notes with bidirectional markdown sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Add Toggle */}
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isQuickAddOpen
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            {/* Export Dropdown / Actions */}
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Copy filtered tasks to clipboard"
            >
              {copiedNotice ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Download tasks as Markdown (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1"
              aria-label="Close task center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Metric Bar & Progress Ring */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold font-mono text-stone-700 dark:text-stone-300">
              {totalCount}
            </div>
            <div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">Total Tasks</span>
              <p className="text-[11px] text-stone-400 font-mono">{completionPercentage}% completed</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold font-mono">
              {openCount}
            </div>
            <div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">Open Action Items</span>
              <p className="text-[11px] text-stone-400">Ready to tackle</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono ${
                overdueCount > 0
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}
            >
              {overdueCount}
            </div>
            <div>
              <span className={`font-semibold ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-700 dark:text-stone-300'}`}>
                Overdue
              </span>
              <p className="text-[11px] text-stone-400">Needs immediate attention</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold font-mono">
              {todayCount}
            </div>
            <div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">Due Today</span>
              <p className="text-[11px] text-stone-400">Scheduled for today</p>
            </div>
          </div>
        </div>

        {/* 3. Quick Add Drawer (Collapsible) */}
        {isQuickAddOpen && (
          <form
            onSubmit={handleCreateTask}
            className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 animate-fade-in"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                placeholder="Type new action item... (e.g. Prepare client deck @due(2026-10-08) !high #work)"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-500 font-medium">Add to note:</span>
              <select
                value={quickAddTargetNoteId}
                onChange={(e) => setQuickAddTargetNoteId(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 max-w-[200px] truncate"
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || 'Untitled Note'}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!quickAddText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 transition-colors shadow-xs"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* 4. Perspective Tabs */}
        <div className="px-5 pt-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1">
          {[
            { id: 'all', label: 'All Tasks', count: openCount },
            { id: 'today_overdue', label: 'Today & Overdue', count: overdueCount + todayCount, badgeColor: overdueCount > 0 ? 'bg-rose-500 text-white' : undefined },
            { id: 'upcoming', label: 'Upcoming (7d)', count: upcomingCount },
            { id: 'priority', label: 'High Priority', count: allTasks.filter((t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high' || t.notePriority === 'urgent' || t.notePriority === 'high')).length },
            { id: 'by_note', label: 'By Note', count: undefined },
            { id: 'by_folder', label: 'By Folder', count: undefined },
            { id: 'completed', label: 'Logbook (Done)', count: completedCount },
          ].map((tab) => {
            const isActive = perspective === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPerspective(tab.id as TaskPerspective)}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-500 text-stone-950 dark:text-white'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      tab.badgeColor
                        ? tab.badgeColor
                        : isActive
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 5. Search & Filters Bar */}
        <div className="px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action items, notes, tags..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector (when perspective is 'all', 'by_note', or 'by_folder') */}
            {(perspective === 'all' || perspective === 'by_note' || perspective === 'by_folder') && (
              <div className="flex items-center gap-1 bg-stone-200/60 dark:bg-stone-800 p-0.5 rounded-lg">
                {(['open', 'completed', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Priority Selector */}
            <select
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 focus:outline-hidden"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Folder Filter */}
            {folders.length > 0 && (
              <select
                value={folderFilter || ''}
                onChange={(e) => setFolderFilter(e.target.value || null)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 focus:outline-hidden max-w-[130px] truncate"
              >
                <option value="">All Folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TaskSortBy)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 focus:outline-hidden"
              >
                <option value="date">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="source">Sort by Note Title</option>
                <option value="title">Sort Alphabetically</option>
                <option value="updated">Sort by Updated</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 6. Tasks List View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-stone-400">
              <CheckCircle2 className="w-12 h-12 stroke-[1.25] text-stone-300 dark:text-stone-700 mb-3" />
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                {perspective === 'completed'
                  ? 'No completed tasks recorded yet'
                  : perspective === 'today_overdue'
                  ? 'All clear for today! No overdue tasks'
                  : 'No tasks matching your current filters'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mb-4">
                {perspective === 'today_overdue'
                  ? 'Great job keeping your task list clean and on schedule.'
                  : 'Action items added in any note via `- [ ]` or checklist will automatically surface here.'}
              </p>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Action Item</span>
              </button>
            </div>
          ) : (
            taskGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.id);
              const showGroupHeader = effectiveGroupBy !== 'none';

              return (
                <div key={group.id} className="space-y-2">
                  {/* Group Header */}
                  {showGroupHeader && (
                    <div className="sticky top-0 z-10 py-1.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md flex items-center justify-between border-b border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                        )}
                        <span>{group.title}</span>
                      </button>
                      <span className="text-[11px] font-mono text-stone-400">
                        {group.openCount} open · {group.completedCount} done
                      </span>
                    </div>
                  )}

                  {/* Tasks in Group */}
                  {!isCollapsed && (
                    <div className="space-y-1.5">
                      {group.tasks.map((task, idx) => {
                        const isOverdue = !task.completed && task.dueDate && task.dueDate < todayStr;
                        const isDueToday = !task.completed && task.dueDate && task.dueDate === todayStr;
                        const isEditing = editingTaskId === task.id;
                        const effectivePriority = task.priority || task.notePriority;

                        return (
                          <div
                            key={task.id}
                            className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                              task.completed
                                ? 'bg-stone-50/60 dark:bg-stone-950/30 border-stone-200/60 dark:border-stone-800/60 opacity-75'
                                : isOverdue
                                ? 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/40 hover:border-rose-300'
                                : isDueToday
                                ? 'bg-amber-50/30 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40 hover:border-amber-300'
                                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs'
                            }`}
                          >
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task)}
                              className={`mt-0.5 p-1 rounded-md transition-colors shrink-0 ${
                                task.completed
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60'
                                  : 'text-stone-400 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                              }`}
                              title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {task.completed ? (
                                <CheckSquare className="w-4 h-4 stroke-[2.25]" />
                              ) : (
                                <Square className="w-4 h-4 stroke-[1.75]" />
                              )}
                            </button>

                            {/* Main Task Body */}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingTaskText}
                                    onChange={(e) => setEditingTaskText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineEdit(task);
                                      if (e.key === 'Escape') setEditingTaskId(null);
                                    }}
                                    className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 focus:outline-hidden"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineEdit(task)}
                                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTaskId(null)}
                                    className="p-1 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {/* Task Title */}
                                  <p
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setEditingTaskText(task.text);
                                    }}
                                    className={`text-xs sm:text-sm font-medium leading-relaxed cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors ${
                                      task.completed
                                        ? 'line-through text-stone-400 dark:text-stone-500'
                                        : 'text-stone-900 dark:text-stone-100'
                                    }`}
                                    title="Click to edit task text"
                                  >
                                    {task.text}
                                  </p>

                                  {/* Metadata Line: Zero-Pill Discipline */}
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                                    {/* Source Note Link */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const note = notes.find((n) => n.id === task.noteId);
                                        if (note) onOpenNote(note);
                                      }}
                                      className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors"
                                    >
                                      <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                                      <span className="truncate max-w-[160px] sm:max-w-[220px]">
                                        {task.noteTitle}
                                      </span>
                                    </button>

                                    {/* Heading Context */}
                                    {task.parentHeading && (
                                      <>
                                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                                        <span className="text-stone-400 dark:text-stone-500 italic truncate max-w-[140px]">
                                          {task.parentHeading}
                                        </span>
                                      </>
                                    )}

                                    {/* Folder */}
                                    {task.folderName && (
                                      <>
                                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                                        <span className="inline-flex items-center gap-1 text-stone-500">
                                          <FolderIcon className="w-3 h-3 text-stone-400" />
                                          <span>{task.folderName}</span>
                                        </span>
                                      </>
                                    )}

                                    {/* Due Date Indicator */}
                                    {task.dueDate && (
                                      <>
                                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                                        <span
                                          className={`inline-flex items-center gap-1 font-mono font-medium ${
                                            isOverdue
                                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                                              : isDueToday
                                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                                              : 'text-stone-500'
                                          }`}
                                        >
                                          <Calendar className="w-3 h-3" />
                                          <span>
                                            {isOverdue
                                              ? `Overdue (${task.dueDate})`
                                              : isDueToday
                                              ? 'Due Today'
                                              : task.dueDate}
                                          </span>
                                        </span>
                                      </>
                                    )}

                                    {/* Priority */}
                                    {effectivePriority && (
                                      <>
                                        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
                                        <span
                                          className={`inline-flex items-center gap-0.5 font-semibold ${
                                            effectivePriority === 'urgent'
                                              ? 'text-rose-600 dark:text-rose-400'
                                              : effectivePriority === 'high'
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-stone-500'
                                          }`}
                                        >
                                          <Flag className="w-3 h-3" />
                                          <span className="capitalize">{effectivePriority}</span>
                                        </span>
                                      </>
                                    )}

                                    {/* Tags */}
                                    {task.tags.map((t) => (
                                      <span
                                        key={t}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTagFilter(t);
                                        }}
                                        className="inline-flex items-center gap-0.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons on Hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskText(task.text);
                                }}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                                title="Edit task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const note = notes.find((n) => n.id === task.noteId);
                                  if (note) onOpenNote(note);
                                }}
                                className="p-1 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                                title="Open source note"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                title="Delete task from note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 7. Footer Status Bar */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Showing {filteredTasks.length} of {allTasks.length} tasks</span>
            {(searchQuery || priorityFilter || folderFilter || tagFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter(null);
                  setFolderFilter(null);
                  setTagFilter(null);
                  setStatusFilter('open');
                }}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline ml-2"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-stone-400">
              Shortcuts: <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded font-mono text-[10px]">Esc</kbd> to close · <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded font-mono text-[10px]">Ctrl+Alt+T</kbd> to toggle
            </span>
            <button
              type="button"
              onClick={handleExportCSV}
              className="font-medium hover:text-stone-800 dark:hover:text-stone-200 hover:underline"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
