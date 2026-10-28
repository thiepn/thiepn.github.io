import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  FileText,
  Repeat,
  Download,
  CalendarCheck,
  Folder as FolderIcon,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import { temporalService } from '../temporalService';
import { getTodayDateString, addDays, formatFriendlyDate } from '../dateUtils';
import { TemporalEntry, AgendaGroup } from '../temporalTypes';
import { TaskDatePickerModal } from './TaskDatePickerModal';

export interface AgendaViewProps {
  notes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onOpenDailyNote?: () => void;
  onUpdateNoteContent: (noteId: string, newContent: string) => Promise<void>;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  notes,
  folders,
  onOpenNote,
  onOpenDailyNote,
  onUpdateNoteContent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTaskEntry, setEditingTaskEntry] = useState<TemporalEntry | null>(null);

  const todayStr = getTodayDateString();

  // Query structured agenda groups
  const groups: AgendaGroup[] = useMemo(() => {
    return temporalService.getAgendaGroups(todayStr, 14, {
      showTasks: true,
      showNotes: true,
      showDailyNotes: true,
      showReferences: true,
      showCompleted,
      searchQuery,
      selectedFolderId,
    });
  }, [notes, folders, todayStr, showCompleted, searchQuery, selectedFolderId]);

  const handleToggleTask = async (entry: TemporalEntry) => {
    if (!entry.noteId || entry.taskLine === undefined) return;
    const note = notes.find((n) => n.id === entry.noteId);
    if (!note) return;

    await temporalService.completeTask(note, entry.taskLine, onUpdateNoteContent);
  };

  const handleSaveTaskDates = async (updates: {
    dueDate?: string | null;
    scheduledDate?: string | null;
    recurrence?: string | null;
    reminderTime?: string | null;
  }) => {
    if (!editingTaskEntry || !editingTaskEntry.noteId || editingTaskEntry.taskLine === undefined) return;
    const note = notes.find((n) => n.id === editingTaskEntry.noteId);
    if (!note) return;

    await temporalService.updateTaskTemporalMetadata(note, editingTaskEntry.taskLine, updates, onUpdateNoteContent);
    setEditingTaskEntry(null);
  };

  const totalOpenItems = useMemo(() => {
    return groups
      .filter((g) => g.key !== 'completed')
      .reduce((acc, g) => acc + g.entries.length, 0);
  }, [groups]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfdfc] dark:bg-[#131316] overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between gap-3 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheduled agenda..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Folder Filter */}
          <select
            value={selectedFolderId || ''}
            onChange={(e) => setSelectedFolderId(e.target.value || null)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-800 dark:text-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="">All Folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Show Completed Toggle */}
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-2.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
              showCompleted
                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed</span>
          </button>

          {/* Quick Open Daily Note */}
          {onOpenDailyNote && (
            <button
              type="button"
              onClick={onOpenDailyNote}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today's Note</span>
            </button>
          )}

          {/* Export ICS */}
          <button
            type="button"
            onClick={() => temporalService.exportICS()}
            className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/70 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="Export Calendar (.ics)"
            aria-label="Export Calendar (.ics)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Agenda Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {totalOpenItems === 0 && (!showCompleted || groups.find((g) => g.key === 'completed')?.entries.length === 0) ? (
          <div className="py-20 text-center text-stone-400 dark:text-stone-500 space-y-3">
            <CalendarCheck className="w-12 h-12 mx-auto text-amber-500/50" />
            <h3 className="font-semibold text-stone-700 dark:text-stone-300 text-base">Agenda is completely clear</h3>
            <p className="text-xs max-w-sm mx-auto">
              Add due dates (<code className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded">📅 YYYY-MM-DD</code>) or scheduled dates to notes and tasks to organize your upcoming schedule.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            if (group.entries.length === 0) return null;
            const isOverdue = group.key === 'overdue';
            const isToday = group.key === 'today';

            return (
              <div
                key={group.key}
                className={`rounded-2xl border p-4 transition-all ${
                  isOverdue
                    ? 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                    : isToday
                    ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs'
                    : 'border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/40'
                }`}
              >
                {/* Group Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60 mb-3">
                  <div className="flex items-center gap-2">
                    {isOverdue ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : isToday ? (
                      <Calendar className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-stone-400" />
                    )}
                    <span
                      className={`font-bold text-sm ${
                        isOverdue
                          ? 'text-rose-700 dark:text-rose-300'
                          : isToday
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      {group.label}
                    </span>
                    {group.dateStr && (
                      <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
                        {group.dateStr}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                      isOverdue
                        ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                        : isToday
                        ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {group.entries.length}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60 bg-white dark:bg-stone-900/80 hover:border-amber-400 dark:hover:border-amber-700/60 transition-all flex items-start justify-between gap-3 group ${
                        entry.completed ? 'opacity-60 bg-stone-50 dark:bg-stone-950/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Task Checkbox or Resource Icon */}
                        {entry.resourceType === 'task' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleTask(entry)}
                            className="mt-0.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-0.5 rounded"
                            aria-label={`Toggle ${entry.title}`}
                          >
                            {entry.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded border border-stone-400 group-hover:border-amber-500" />
                            )}
                          </button>
                        ) : entry.resourceType === 'daily-note' ? (
                          <Calendar className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        )}

                        {/* Title and Metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => {
                                if (entry.noteId) onOpenNote(entry.noteId);
                              }}
                              className={`font-semibold text-xs text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer ${
                                entry.completed ? 'line-through text-stone-400 dark:text-stone-500' : ''
                              }`}
                            >
                              {entry.title}
                            </span>

                            {/* Recurrence Badge */}
                            {entry.recurrence && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1 font-mono">
                                <Repeat className="w-2.5 h-2.5" />
                                {entry.recurrence}
                              </span>
                            )}

                            {/* Time badge if present */}
                            {entry.time && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                {entry.time}
                              </span>
                            )}
                          </div>

                          {/* Source Link */}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400 dark:text-stone-500">
                            {entry.noteTitle && (
                              <button
                                type="button"
                                onClick={() => entry.noteId && onOpenNote(entry.noteId)}
                                className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline flex items-center gap-0.5 truncate"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                                <span>{entry.noteTitle}</span>
                              </button>
                            )}
                            {entry.folderName && <span>in {entry.folderName}</span>}
                            {entry.date && !isToday && !isOverdue && (
                              <span className="font-mono">{formatFriendlyDate(entry.date, todayStr)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit Date Trigger for Tasks */}
                      {entry.resourceType === 'task' && (
                        <button
                          type="button"
                          onClick={() => setEditingTaskEntry(entry)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-opacity text-[11px] flex items-center gap-1"
                          title="Reschedule / Change Recurrence"
                          aria-label={`Reschedule ${entry.title}`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Date Picker Modal */}
      {editingTaskEntry && (
        <TaskDatePickerModal
          isOpen={Boolean(editingTaskEntry)}
          onClose={() => setEditingTaskEntry(null)}
          taskLineText={editingTaskEntry.sourceSnippet || editingTaskEntry.title}
          onSave={handleSaveTaskDates}
        />
      )}
    </div>
  );
};
