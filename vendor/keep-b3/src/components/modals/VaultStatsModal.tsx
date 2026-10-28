import React, { useMemo } from 'react';
import {
  Activity,
  X,
  FileText,
  Folder as FolderIcon,
  Tag,
  CheckSquare,
  Star,
  Pin,
  Flame,
  Calendar,
  Layers,
  BarChart2,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { WritingActivityHeatmap } from '../WritingActivityHeatmap';
import { NOTE_COLORS, COLOR_KEYS } from '../../utils/colors';

interface VaultStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  allTags?: string[];
  onOpenNote: (note: Note) => void;
}

export const VaultStatsModal: React.FC<VaultStatsModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  allTags,
  onOpenNote,
}) => {
  const uniqueTags = useMemo(() => {
    if (allTags && allTags.length > 0) return allTags;
    const set = new Set<string>();
    for (const n of notes) {
      if (n.trashed) continue;
      for (const t of n.tags || []) set.add(t);
    }
    return Array.from(set);
  }, [notes, allTags]);
  // Aggregate vault metrics
  const stats = useMemo(() => {
    const activeNotes = notes.filter((n) => !n.trashed);
    let totalWords = 0;
    let totalChars = 0;
    let checklistNotesCount = 0;
    let totalChecklistItems = 0;
    let completedChecklistItems = 0;
    let favoriteCount = 0;
    let pinnedCount = 0;
    let archivedCount = 0;

    const colorCounts: Partial<Record<string, number>> = {};

    for (const note of activeNotes) {
      if (note.content) {
        const words = note.content.trim().split(/\s+/).filter(Boolean).length;
        totalWords += words;
        totalChars += note.content.length;
      }

      if (note.type === 'checklist' || (note.checklist && note.checklist.length > 0)) {
        checklistNotesCount++;
        totalChecklistItems += note.checklist?.length || 0;
        completedChecklistItems += note.checklist?.filter((i) => i.completed).length || 0;
      }

      if (note.isFavorite) favoriteCount++;
      if (note.pinned) pinnedCount++;
      if (note.archived) archivedCount++;

      const c = note.color || 'default';
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }

    const avgWords = activeNotes.length > 0 ? Math.round(totalWords / activeNotes.length) : 0;
    const checklistCompletionRate =
      totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

    return {
      activeCount: activeNotes.length,
      totalWords,
      totalChars,
      avgWords,
      checklistNotesCount,
      totalChecklistItems,
      completedChecklistItems,
      checklistCompletionRate,
      favoriteCount,
      pinnedCount,
      archivedCount,
      colorCounts,
    };
  }, [notes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              <Activity className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Vault Intelligence & Writing Activity
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Visual activity heatmaps and longitudinal telemetry across your knowledge vault.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close Vault Statistics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main 52-Week Writing Activity Heatmap */}
          <WritingActivityHeatmap
            notes={notes}
            onOpenNote={(note) => {
              onOpenNote(note);
              onClose();
            }}
            variant="full"
            showStats={true}
          />

          {/* Quick Metrics Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
              Vault Composition
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Active</span>
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                  {stats.activeCount}
                </div>
                <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Total Notes
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Volume</span>
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                  {stats.totalWords.toLocaleString()}
                </div>
                <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Words Written
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <FolderIcon className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Folders</span>
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                  {folders.length}
                </div>
                <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Categories
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between text-stone-400 mb-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Taxonomy</span>
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                  {uniqueTags.length}
                </div>
                <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  Unique Hashtags
                </div>
              </div>
            </div>
          </div>

          {/* Deep Metrics & Checklist Completion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Checklist Completion Gauge */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Checklist Execution
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                  {stats.completedChecklistItems} / {stats.totalChecklistItems} ({stats.checklistCompletionRate}%)
                </span>
              </div>

              <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${stats.checklistCompletionRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                <span>{stats.checklistNotesCount} checklist notes</span>
                <span>Avg {stats.avgWords} words/note</span>
              </div>
            </div>

            {/* Color Distribution Palette */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-2.5">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Color-Coding Distribution
              </span>

              <div className="flex h-3 w-full rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800">
                {COLOR_KEYS.map((key) => {
                  const count = stats.colorCounts[key] || 0;
                  if (count === 0) return null;
                  const pct = Math.max(2, (count / (stats.activeCount || 1)) * 100);
                  const conf = NOTE_COLORS[key];
                  return (
                    <div
                      key={key}
                      title={`${conf.name}: ${count} notes (${Math.round(pct)}%)`}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: conf.hex,
                      }}
                      className="h-full transition-all"
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] text-stone-500 dark:text-stone-400">
                {COLOR_KEYS.map((key) => {
                  const count = stats.colorCounts[key] || 0;
                  if (count === 0) return null;
                  const conf = NOTE_COLORS[key];
                  return (
                    <div key={key} className="flex items-center gap-1 font-medium">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: conf.hex }}
                      />
                      <span>
                        {conf.name}: {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
