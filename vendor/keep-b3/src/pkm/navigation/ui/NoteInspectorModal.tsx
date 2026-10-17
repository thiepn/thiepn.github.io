import React, { useMemo } from 'react';
import {
  Info,
  Folder as FolderIcon,
  Tag as TagIcon,
  FileText,
  Clock,
  Calendar,
  Link2,
  ArrowUpRight,
  CheckSquare,
  Hash,
  Bookmark,
  Lock,
  X,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import { NoteInspectionData } from '../navigationTypes';
import { headingBlockNavigator } from '../headingBlockNavigator';
import { backlinkNavigationService } from '../backlinkNavigationService';
import { extractNoteChecklistStats } from '../../queryEngine';
import { formatRelativeTime } from '../../../utils/date';

export interface NoteInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  folders: Folder[];
  allNotes: Note[];
  onOpenNote?: (noteId: string) => void;
}

export const NoteInspectorModal: React.FC<NoteInspectorModalProps> = ({
  isOpen,
  onClose,
  note,
  folders,
  allNotes,
  onOpenNote,
}) => {
  const inspectionData: NoteInspectionData = useMemo(() => {
    const content = note.content || '';
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    const headings = headingBlockNavigator.extractHeadings(content);
    const outgoing = backlinkNavigationService.getOutgoingLinks(note);
    const backlinks = backlinkNavigationService.getLinkedMentions(note.id, allNotes);
    const checklistStats = extractNoteChecklistStats(note) || { total: 0, completed: 0, percent: 0 };

    const folderMap = new Map<string, string>();
    folders.forEach((f) => folderMap.set(f.id, f.name));

    return {
      noteId: note.id,
      title: note.title || 'Untitled Note',
      folderPath: note.folderId ? folderMap.get(note.folderId) || 'Unknown Folder' : 'Root (Unorganized)',
      tags: note.tags || [],
      properties: note.properties || {},
      wordCount: words,
      characterCount: chars,
      readingTimeMinutes: readingTime,
      headingsCount: headings.length,
      outgoingLinksCount: outgoing.length,
      backlinksCount: backlinks.length,
      tasksCount: { total: checklistStats.total, completed: checklistStats.completed },
      relations: [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isPinned: !!note.pinned,
      isFavorite: !!note.pinned,
      isLocked: false,
    };
  }, [note, folders, allNotes]);

  if (!isOpen) return null;

  return (
    <div
      id="note-inspector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="note-inspector-modal"
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Note Inspector"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Note Inspector
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Title & Location */}
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {inspectionData.title}
            </h2>
            <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <FolderIcon className="w-3.5 h-3.5" />
              <span>{inspectionData.folderPath}</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-2xs text-neutral-400">Words</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {inspectionData.wordCount.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-2xs text-neutral-400">Reading Time</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                ~{inspectionData.readingTimeMinutes} min
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-2xs text-neutral-400">Characters</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {inspectionData.characterCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Structure Metrics */}
          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            <h4 className="font-semibold text-neutral-700 dark:text-neutral-300">
              Structure & Knowledge Graph
            </h4>
            <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/40">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Headings
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {inspectionData.headingsCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/40">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Tasks
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {inspectionData.tasksCount.completed}/{inspectionData.tasksCount.total}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/40">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Outgoing Links
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {inspectionData.outgoingLinksCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/40">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> Inbound Backlinks
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {inspectionData.backlinksCount}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {inspectionData.tags.length > 0 && (
            <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <h4 className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5" /> Tags
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {inspectionData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1 text-2xs text-neutral-400">
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span>{new Date(inspectionData.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Modified</span>
              <span>
                {new Date(inspectionData.updatedAt).toLocaleString()} (
                {formatRelativeTime(
                  typeof inspectionData.updatedAt === 'string'
                    ? inspectionData.updatedAt
                    : new Date(inspectionData.updatedAt).toISOString()
                )}
                )
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Internal Stable ID</span>
              <span className="font-mono">{inspectionData.noteId}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
