import React from 'react';
import {
  Book,
  FileText,
  Video,
  Headphones,
  Globe,
  BookOpen,
  Clock,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { LibraryItem, LibrarySortField, LibrarySortDirection } from '../libraryTypes';

export interface LibraryItemTableViewProps {
  items: LibraryItem[];
  sortField: LibrarySortField;
  sortDir: LibrarySortDirection;
  onSortChange: (field: LibrarySortField) => void;
  onOpenDetail: (item: LibraryItem) => void;
  onOpenReader?: (item: LibraryItem) => void;
  onOpenNote?: (noteId: string) => void;
  onLogSession?: (item: LibraryItem) => void;
  onQuickStatusChange?: (item: LibraryItem, newStatus: LibraryItem['status']) => void;
}

export const LibraryItemTableView: React.FC<LibraryItemTableViewProps> = ({
  items,
  sortField,
  sortDir,
  onSortChange,
  onOpenDetail,
  onOpenReader,
  onOpenNote,
  onLogSession,
  onQuickStatusChange,
}) => {
  const renderSortIndicator = (field: LibrarySortField) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-amber-500 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const getTypeIcon = (type: LibraryItem['type']) => {
    switch (type) {
      case 'book':
        return <Book className="w-3.5 h-3.5 text-rose-500" />;
      case 'article':
      case 'essay':
      case 'paper':
        return <FileText className="w-3.5 h-3.5 text-sky-500" />;
      case 'video':
        return <Video className="w-3.5 h-3.5 text-purple-500" />;
      case 'podcast':
      case 'audiobook':
        return <Headphones className="w-3.5 h-3.5 text-emerald-500" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-800 select-none">
          <tr>
            <th
              className="py-2.5 px-3 cursor-pointer hover:text-stone-900 dark:hover:text-white"
              onClick={() => onSortChange('title')}
            >
              Title {renderSortIndicator('title')}
            </th>
            <th
              className="py-2.5 px-3 cursor-pointer hover:text-stone-900 dark:hover:text-white"
              onClick={() => onSortChange('creator')}
            >
              Creator {renderSortIndicator('creator')}
            </th>
            <th className="py-2.5 px-3">Type</th>
            <th
              className="py-2.5 px-3 cursor-pointer hover:text-stone-900 dark:hover:text-white"
              onClick={() => onSortChange('status')}
            >
              Status {renderSortIndicator('status')}
            </th>
            <th
              className="py-2.5 px-3 cursor-pointer hover:text-stone-900 dark:hover:text-white"
              onClick={() => onSortChange('progress')}
            >
              Progress {renderSortIndicator('progress')}
            </th>
            <th
              className="py-2.5 px-3 cursor-pointer hover:text-stone-900 dark:hover:text-white"
              onClick={() => onSortChange('updated')}
            >
              Updated {renderSortIndicator('updated')}
            </th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
          {items.map((item) => {
            const authorStr =
              item.creators && item.creators.length > 0
                ? item.creators.map((c) => c.name).join(', ')
                : '—';

            const progressPct =
              item.progress?.percent !== undefined
                ? item.progress.percent
                : item.progress?.currentPage && item.progress?.totalPages
                ? Math.round((item.progress.currentPage / item.progress.totalPages) * 100)
                : 0;

            return (
              <tr
                key={item.id}
                className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors group"
              >
                <td className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(item)}
                    className="font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 text-left line-clamp-1"
                  >
                    {item.title}
                  </button>
                  {item.subtitle && (
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 line-clamp-1 italic">
                      {item.subtitle}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300 line-clamp-1">
                  {authorStr}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5 capitalize text-stone-600 dark:text-stone-400">
                    {getTypeIcon(item.type)}
                    <span>{item.type}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    {item.status}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {item.progress && item.progress.mode !== 'none' ? (
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] font-mono text-stone-500 mb-0.5">
                        <span>{progressPct}%</span>
                        {item.progress.mode === 'page' && item.progress.totalPages && (
                          <span>{item.progress.currentPage}p</span>
                        )}
                      </div>
                      <div className="w-full h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-stone-400 text-[11px]">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-stone-500 dark:text-stone-400 text-[11px] font-mono">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {onOpenReader && (
                      <button
                        type="button"
                        onClick={() => onOpenReader(item)}
                        className="p-1 rounded text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Read"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onLogSession && (
                      <button
                        type="button"
                        onClick={() => onLogSession(item)}
                        className="p-1 rounded text-stone-500 hover:text-sky-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Log Session"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item)}
                      className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950"
                    >
                      Inspect
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
