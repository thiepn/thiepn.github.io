import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  List as ListIcon,
  LayoutGrid,
  Copy,
  Check,
  RefreshCw,
  Folder as FolderIcon,
  Tag as TagIcon,
  Flame,
  ListOrdered,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Note, Folder } from '../types';
import { SmartQueryViewMode, QueryEvaluationResult, QueryItemResult } from './queryTypes';
import { parseSmartQuery } from './queryParser';
import { executeSmartQuery } from './queryEngine';
import { vaultManager } from './indexer';
import { formatRelativeTime } from '../utils/date';

interface SmartQueryBlockViewProps {
  code: string;
  allNotes?: Note[];
  folders?: Folder[];
  onOpenNote?: (noteId: string) => void;
}

export const SmartQueryBlockView: React.FC<SmartQueryBlockViewProps> = ({
  code,
  allNotes,
  folders = [],
  onOpenNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [manualViewOverride, setManualViewOverride] = useState<SmartQueryViewMode | null>(null);
  const [vaultVersion, setVaultVersion] = useState(0);

  // Subscribe to live index updates so the query re-runs reactively
  useEffect(() => {
    const unsubscribe = vaultManager.subscribe(() => {
      setVaultVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Parse query
  const parseResult = useMemo(() => {
    return parseSmartQuery(code);
  }, [code]);

  // Execute query against current note state
  const evaluationResult: QueryEvaluationResult = useMemo(() => {
    // If allNotes not passed directly, fallback to vault index / empty
    const currentNotes = allNotes || [];
    const index = vaultManager.getIndex();

    if (parseResult.error || !parseResult.ast) {
      return {
        items: [],
        totalMatches: 0,
        modifiers: {},
        executionTimeMs: 0,
        error: parseResult.error ? parseResult.error.message : 'Invalid query syntax',
      };
    }

    return executeSmartQuery(parseResult.ast, {
      notes: currentNotes,
      vaultIndex: index,
      folders,
    });
  }, [parseResult, allNotes, folders, vaultVersion]);

  // Active view mode (override > query modifier > default list)
  const activeView: SmartQueryViewMode =
    manualViewOverride || evaluationResult.modifiers.view || 'list';

  // Apply local in-block search filter if typed
  const displayedItems = useMemo(() => {
    if (!localSearch.trim()) return evaluationResult.items;
    const term = localSearch.toLowerCase().trim();
    return evaluationResult.items.filter((item) => {
      const matchTitle = (item.note.title || '').toLowerCase().includes(term);
      const matchFolder = (item.folderName || '').toLowerCase().includes(term);
      const matchSnippet = (item.matchedSnippet || '').toLowerCase().includes(term);
      const matchTags = (item.note.tags || []).some((t) => t.toLowerCase().includes(term));
      return matchTitle || matchFolder || matchSnippet || matchTags;
    });
  }, [evaluationResult.items, localSearch]);

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Error state (Safe, accessible failure box)
  if (parseResult.error) {
    const err = parseResult.error;
    return (
      <div className="my-3 p-3.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-stone-900 dark:text-stone-100 font-sans text-xs">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-rose-700 dark:text-rose-300">
                Invalid Query Syntax
              </span>
              <span className="text-[10px] text-rose-500 font-mono">
                Line {err.line}, Col {err.column}
              </span>
            </div>
            <p className="text-stone-700 dark:text-stone-300 font-medium">
              {err.message}
            </p>
            {err.suggestion && (
              <p className="text-amber-700 dark:text-amber-300 text-[11px] bg-amber-100/50 dark:bg-amber-950/50 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                💡 <span className="font-semibold">Suggestion:</span> {err.suggestion}
              </p>
            )}
            <div className="pt-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">
                Original Query:
              </span>
              <pre className="p-2 rounded-lg bg-stone-900 text-stone-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/90 shadow-sm overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="px-3 py-2 bg-stone-100 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Title & Count */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-stone-800 dark:text-stone-200 truncate max-w-[200px] sm:max-w-xs font-mono text-[11px]">
            {code.replace(/\n+/g, ' ').trim()}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-semibold">
            {displayedItems.length} {displayedItems.length === 1 ? 'note' : 'notes'}
          </span>
          {evaluationResult.executionTimeMs !== undefined && (
            <span className="hidden sm:inline-block text-[10px] text-stone-600 dark:text-stone-400">
              {evaluationResult.executionTimeMs}ms
            </span>
          )}
        </div>

        {/* Right: Search + View Toggles + Copy */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Quick in-block search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter results..."
              className="pl-6 pr-2 py-1 text-[11px] rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500 w-28 sm:w-36 transition-all"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-stone-200/80 dark:bg-stone-700/80 p-0.5 rounded-lg border border-stone-300 dark:border-stone-600">
            <button
              type="button"
              onClick={() => setManualViewOverride('list')}
              className={`p-1 rounded transition-colors ${
                activeView === 'list'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setManualViewOverride('table')}
              className={`p-1 rounded transition-colors ${
                activeView === 'table'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setManualViewOverride('cards')}
              className={`p-1 rounded transition-colors ${
                activeView === 'cards'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyQuery}
            className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            title="Copy Query to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Results Container */}
      <div className="p-2">
        {displayedItems.length === 0 ? (
          <div className="py-6 px-4 text-center text-stone-600 dark:text-stone-400 text-xs">
            <Search className="w-6 h-6 mx-auto mb-1.5 text-stone-500 dark:text-stone-400 opacity-60" />
            <p className="font-semibold text-stone-700 dark:text-stone-300">No notes found</p>
            <p className="text-[11px] mt-0.5">
              {localSearch ? `No matches for "${localSearch}". Try clearing the filter.` : 'No notes in your vault match this query criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* 1. LIST VIEW */}
            {activeView === 'list' && (
              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {displayedItems.map((item) => (
                  <div
                    key={item.note.id}
                    onClick={() => onOpenNote && onOpenNote(item.note.id)}
                    className="group px-3 py-2 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 rounded-lg transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Priority / Status indicator */}
                      {item.note.priority && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.note.priority === 'urgent'
                              ? 'bg-rose-500'
                              : item.note.priority === 'high'
                              ? 'bg-amber-500'
                              : item.note.priority === 'medium'
                              ? 'bg-blue-500'
                              : 'bg-stone-400'
                          }`}
                          title={`Priority: ${item.note.priority}`}
                        />
                      )}

                      {/* Title */}
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                        {item.note.title || 'Untitled Note'}
                      </span>

                      {/* Folder badge */}
                      {item.folderName && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                          <FolderIcon className="w-2.5 h-2.5" />
                          {item.folderName}
                        </span>
                      )}

                      {/* Tags */}
                      {item.note.tags && item.note.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                          {item.note.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-amber-700 dark:text-amber-400 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                          {item.note.tags.length > 3 && (
                            <span className="text-[9px] text-stone-600 dark:text-stone-400 font-medium">
                              +{item.note.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Checklist progress */}
                      {item.checklistStats && (
                        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-stone-600 dark:text-stone-400">
                          <CheckSquare className="w-2.5 h-2.5 text-stone-500" />
                          {item.checklistStats.completed}/{item.checklistStats.total}
                        </span>
                      )}
                    </div>

                    {/* Right side: Status & Date */}
                    <div className="flex items-center gap-2 text-right shrink-0">
                      {item.note.status && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                          {item.note.status.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-[10px] text-stone-600 dark:text-stone-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(item.note.updatedAt || item.note.createdAt)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. TABLE VIEW */}
            {activeView === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-2">Folder</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">Priority</th>
                      <th className="py-2 px-2">Tags</th>
                      <th className="py-2 px-3 text-right">Modified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                    {displayedItems.map((item) => (
                      <tr
                        key={item.note.id}
                        onClick={() => onOpenNote && onOpenNote(item.note.id)}
                        className="group hover:bg-amber-500/5 dark:hover:bg-amber-500/10 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                          <span>{item.note.title || 'Untitled Note'}</span>
                        </td>
                        <td className="py-2 px-2 text-stone-600 dark:text-stone-400 text-[11px]">
                          {item.folderName || '-'}
                        </td>
                        <td className="py-2 px-2">
                          {item.note.status ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                              {item.note.status.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-stone-600 dark:text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {item.note.priority ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.note.priority === 'urgent'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : item.note.priority === 'high'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {item.note.priority}
                            </span>
                          ) : (
                            <span className="text-stone-600 dark:text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-[11px]">
                          {item.note.tags && item.note.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.note.tags.map((t) => (
                                <span key={t} className="text-amber-700 dark:text-amber-400 font-medium">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-600 dark:text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-600 dark:text-stone-400 text-[11px] whitespace-nowrap">
                          {formatRelativeTime(item.note.updatedAt || item.note.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. CARDS VIEW */}
            {activeView === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-1">
                {displayedItems.map((item) => (
                  <div
                    key={item.note.id}
                    onClick={() => onOpenNote && onOpenNote(item.note.id)}
                    className="group p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 hover:border-amber-400 dark:hover:border-amber-600 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs group-hover:text-amber-700 dark:group-hover:text-amber-400 line-clamp-1">
                          {item.note.title || 'Untitled Note'}
                        </h4>
                        {item.note.priority && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              item.note.priority === 'urgent'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : item.note.priority === 'high'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {item.note.priority}
                          </span>
                        )}
                      </div>

                      {/* Snippet / Content Preview */}
                      {item.matchedSnippet && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-2">
                          {item.matchedSnippet}
                        </p>
                      )}

                      {/* Checklist progress bar */}
                      {item.checklistStats && (
                        <div className="my-1.5">
                          <div className="flex items-center justify-between text-[10px] text-stone-600 dark:text-stone-400 mb-0.5">
                            <span>Tasks</span>
                            <span>{item.checklistStats.completed}/{item.checklistStats.total} ({item.checklistStats.percent}%)</span>
                          </div>
                          <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${item.checklistStats.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2 mt-1 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-1 text-[10px] text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-1 truncate">
                        {item.folderName && (
                          <span className="truncate flex items-center gap-0.5">
                            <FolderIcon className="w-2.5 h-2.5" />
                            {item.folderName}
                          </span>
                        )}
                      </div>
                      <span>{formatRelativeTime(item.note.updatedAt || item.note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
