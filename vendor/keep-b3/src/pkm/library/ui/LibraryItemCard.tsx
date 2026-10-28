import React from 'react';
import {
  Book,
  FileText,
  Video,
  Headphones,
  Globe,
  Radio,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  MoreVertical,
  Plus,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LibraryItem } from '../libraryTypes';

export interface LibraryItemCardProps {
  item: LibraryItem;
  onOpenDetail: (item: LibraryItem) => void;
  onOpenReader?: (item: LibraryItem) => void;
  onOpenNote?: (noteId: string) => void;
  onLogSession?: (item: LibraryItem) => void;
  onQuickStatusChange?: (item: LibraryItem, newStatus: LibraryItem['status']) => void;
}

export const LibraryItemCard: React.FC<LibraryItemCardProps> = ({
  item,
  onOpenDetail,
  onOpenReader,
  onOpenNote,
  onLogSession,
  onQuickStatusChange,
}) => {
  const authorStr = item.creators && item.creators.length > 0 ? item.creators.map((c) => c.name).join(', ') : 'Unknown Creator';

  const getTypeIcon = () => {
    switch (item.type) {
      case 'book':
      case 'ebook':
        return <Book className="w-4 h-4 text-rose-500" />;
      case 'article':
      case 'essay':
      case 'paper':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'podcast':
      case 'audiobook':
        return <Headphones className="w-4 h-4 text-emerald-500" />;
      case 'web':
        return <Globe className="w-4 h-4 text-amber-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-stone-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'in-progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
            In Progress
          </span>
        );
      case 'queued':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800/60">
            Queued
          </span>
        );
      case 'finished':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
            Finished
          </span>
        );
      case 'inbox':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            Inbox
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            Paused
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 capitalize">
            {item.status}
          </span>
        );
    }
  };

  // Progress summary
  const progressText = () => {
    if (!item.progress || item.progress.mode === 'none') return null;
    if (item.progress.mode === 'page' && item.progress.currentPage && item.progress.totalPages) {
      return `${item.progress.currentPage} / ${item.progress.totalPages} p. (${item.progress.percent || 0}%)`;
    }
    if (item.progress.percent !== undefined) {
      return `${item.progress.percent}% read`;
    }
    if (item.progress.location) {
      return item.progress.location;
    }
    return null;
  };

  const progressPercent = item.progress?.percent || (item.progress?.currentPage && item.progress?.totalPages ? Math.round((item.progress.currentPage / item.progress.totalPages) * 100) : 0);

  return (
    <div
      id={`library-card-${item.id}`}
      className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-600 transition-all shadow-sm hover:shadow"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 capitalize">
            {getTypeIcon()}
            <span>{item.type}</span>
            {item.format && <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-stone-100 dark:bg-stone-800 rounded">{item.format}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {getStatusBadge()}
          </div>
        </div>

        {/* Title and Author */}
        <div className="cursor-pointer" onClick={() => onOpenDetail(item)}>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 italic mt-0.5">
              {item.subtitle}
            </p>
          )}
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium line-clamp-1">
            {authorStr}
          </p>
        </div>

        {/* Tags / Course pill */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {item.relations?.courseIds && item.relations.courseIds.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
              Course Material
            </span>
          )}
          {item.noteId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenNote) onOpenNote(item.noteId!);
              }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 transition-colors"
            >
              Note Linked
            </button>
          )}
          {item.attachmentIds && item.attachmentIds.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              File Attached
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer & Progress */}
      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
        {item.progress && item.progress.mode !== 'none' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
              <span>Progress</span>
              <span>{progressText()}</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {onOpenReader && (
              <button
                type="button"
                onClick={() => onOpenReader(item)}
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 text-xs font-semibold flex items-center gap-1"
                title="Open in Reader"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Read</span>
              </button>
            )}

            {onLogSession && (
              <button
                type="button"
                onClick={() => onLogSession(item)}
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1"
                title="Log Reading Session"
              >
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>Session</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-bold text-stone-700 dark:text-stone-300 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};
