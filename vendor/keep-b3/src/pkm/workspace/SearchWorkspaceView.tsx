import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Table as TableIcon,
  Sparkles,
  Bookmark,
  Plus,
  Folder as FolderIcon,
  Tag as TagIcon,
  Flame,
  CheckSquare,
  Clock,
  HelpCircle,
  FileText,
  AlertCircle,
  ArrowUpDown,
  Filter,
  Layers,
  X,
  Copy,
  Check,
  Code,
  Calendar,
  Link,
  ChevronDown,
} from 'lucide-react';
import { Note, Folder, FilterState, NotePriority, NoteStatus } from '../../types';
import { parseSmartQuery } from '../queryParser';
import { executeSmartQuery, extractNoteChecklistStats } from '../queryEngine';
import { vaultManager } from '../indexer';
import { formatRelativeTime } from '../../utils/date';
import { useWorkspace } from '../useWorkspace';
import { saveSmartView } from '../smartViews';
import { SmartQueryViewMode, QuerySortField, QuerySortOrder } from '../queryTypes';

export interface SearchWorkspaceViewProps {
  allNotes: Note[];
  folders: Folder[];
  initialQuery?: string;
  onOpenNote?: (noteId: string, options?: any) => void;
  onOpenSaveSearch?: (query: string) => void;
}

export const SearchWorkspaceView: React.FC<SearchWorkspaceViewProps> = ({
  allNotes,
  folders,
  initialQuery = '',
  onOpenNote,
  onOpenSaveSearch,
}) => {
  const { openNote } = useWorkspace();
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<SmartQueryViewMode>('list');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query if it changes from outside
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Parse query AST
  const parseResult = useMemo(() => {
    return parseSmartQuery(query);
  }, [query]);

  // Execute query against vault notes
  const evalResult = useMemo(() => {
    if (parseResult.error || !parseResult.ast) {
      // If syntax error, fall back to evaluating with plain text search or report error
      return {
        items: [],
        totalMatches: 0,
        modifiers: {},
        executionTimeMs: 0,
        error: parseResult.error ? parseResult.error.message : undefined,
      };
    }

    return executeSmartQuery(parseResult.ast, {
      notes: allNotes,
      vaultIndex: vaultManager.getIndex(),
      folders,
    });
  }, [parseResult, allNotes, folders]);

  // Automatically adapt view mode if specified in query modifiers (e.g. view:table)
  useEffect(() => {
    if (evalResult.modifiers.view) {
      setViewMode(evalResult.modifiers.view);
    }
  }, [evalResult.modifiers.view]);

  // Append filter token to current query
  const appendToken = (token: string) => {
    setQuery((prev) => {
      const current = prev.trim();
      return current ? `${current} ${token}` : token;
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectNote = (noteId: string, split = false) => {
    if (onOpenNote) {
      onOpenNote(noteId, { split });
    } else {
      openNote(noteId, undefined, { split });
    }
  };

  const handleSaveAsSmartView = () => {
    if (!query.trim()) return;
    const viewName = prompt('Enter a name for this Smart View:', query.trim());
    if (!viewName) return;

    saveSmartView({
      name: viewName.trim(),
      query: query.trim(),
      description: `Custom search saved on ${new Date().toLocaleDateString()}`,
    });

    setSavedSuccessMsg('Saved to Smart Views!');
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleCopyQueryBlock = () => {
    const codeBlock = `\`\`\`query\n${query.trim()}\n\`\`\``;
    navigator.clipboard.writeText(codeBlock);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  // Check if query is structured query vs simple keyword
  const isStructuredQuery = useMemo(() => {
    return (
      query.includes(':') ||
      query.includes('AND') ||
      query.includes('OR') ||
      query.includes('NOT') ||
      query.includes('(') ||
      query.startsWith('#')
    );
  }, [query]);

  return (
    <div className="w-full h-full flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Search Header Bar */}
      <div className="p-4 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 shrink-0 space-y-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center bg-stone-100 dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all">
            <Search className="w-4 h-4 text-stone-400 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search full-text, tags (tag:project), status (status:in_progress), folders (folder:Work), boolean (AND, OR)..."
              className="flex-1 bg-transparent text-sm font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showFilterDrawer
                ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-300'
                : 'bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
            title="Filter Assistant"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAsSmartView}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
            title="Save as Smart View"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">Save View</span>
          </button>
        </div>

        {/* Quick Helper Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
            Quick Tokens:
          </span>
          {[
            { label: 'Has Tasks', token: 'has:todo' },
            { label: 'Completed', token: 'status:done' },
            { label: 'In Progress', token: 'status:in_progress' },
            { label: '🔥 Urgent', token: 'priority:urgent' },
            { label: '⭐ Favorites', token: 'is:favorite' },
            { label: '📌 Pinned', token: 'is:pinned' },
            { label: '🔗 Linked', token: 'has:links' },
            { label: 'Math / KaTeX', token: 'has:math' },
            { label: 'Diagrams', token: 'has:mermaid' },
            { label: 'This Week', token: 'updated:this-week' },
            { label: 'Sort: Links', token: 'sort:links' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => appendToken(item.token)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-900 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-600 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-200 border border-stone-200 dark:border-stone-800 text-xs font-medium shrink-0 transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="ml-auto px-2 py-1 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs flex items-center gap-1 shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Syntax Help</span>
          </button>
        </div>

        {/* Status indicator bar */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {evalResult.totalMatches} {evalResult.totalMatches === 1 ? 'match' : 'matches'}
            </span>
            <span>·</span>
            <span>{evalResult.executionTimeMs} ms</span>
            <span>·</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {isStructuredQuery ? 'Structured Smart Query' : 'Full-Text Lexical Search'}
            </span>
            {savedSuccessMsg && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs animate-in fade-in">
                {savedSuccessMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyQueryBlock}
              className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center gap-1"
              title="Copy markdown query block"
            >
              {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedQuery ? 'Copied Block' : 'Copy Query Block'}</span>
            </button>
          </div>
        </div>

        {/* Syntax Error Callout if any */}
        {parseResult.error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Query Syntax Warning:</span> {parseResult.error.message}
              {parseResult.error.suggestion && (
                <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300 font-mono">
                  Suggestion: {parseResult.error.suggestion}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Results Area */}
        <div className="flex-1 h-full overflow-y-auto p-4">
          {evalResult.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                No matching notes found
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mb-4">
                Try loosening your filters, checking for typos, or searching with broader keywords.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600"
                >
                  Clear Search Query
                </button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="w-full overflow-x-auto bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-3 py-3">Folder</th>
                    <th className="px-3 py-3">Tags</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Links</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {evalResult.items.map(({ note, folderName, backlinkCount, forwardLinkCount }) => (
                    <tr
                      key={note.id}
                      onClick={() => handleSelectNote(note.id)}
                      className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        {note.type === 'checklist' ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] sm:max-w-xs">{note.title || 'Untitled Note'}</span>
                      </td>
                      <td className="px-3 py-3 text-stone-500 truncate max-w-[120px]">
                        {folderName ? (
                          <span className="flex items-center gap-1">
                            <FolderIcon className="w-3 h-3 text-stone-400" />
                            {folderName}
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {note.tags && note.tags.length > 0 ? (
                            note.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400"
                              >
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="opacity-40">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {note.status ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            {note.status}
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {note.priority ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              note.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : note.priority === 'high'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                            }`}
                          >
                            {note.priority}
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-stone-500 font-mono text-[11px]">
                        {forwardLinkCount > 0 || backlinkCount > 0 ? (
                          <span>
                            {forwardLinkCount} out / {backlinkCount} in
                          </span>
                        ) : (
                          <span className="opacity-40">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                        {formatRelativeTime(note.updatedAt || note.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'cards' ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {evalResult.items.map(({ note, folderName, matchedSnippet, checklistStats }) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  className="p-4 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer flex flex-col justify-between shadow-xs group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {note.pinned && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          Pinned
                        </span>
                      )}
                    </div>

                    {matchedSnippet && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 mb-3 leading-relaxed">
                        {matchedSnippet}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="truncate max-w-[120px]">
                      {folderName ? `📁 ${folderName}` : formatRelativeTime(note.updatedAt || note.createdAt)}
                    </span>
                    {checklistStats && checklistStats.total > 0 && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {checklistStats.completed}/{checklistStats.total} done
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View (Default) */
            <div className="space-y-2">
              {evalResult.items.map(({ note, folderName, matchedSnippet, checklistStats, forwardLinkCount, backlinkCount }) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  className="p-3.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {note.type === 'checklist' ? (
                        <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                      )}
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {folderName && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                          {folderName}
                        </span>
                      )}
                      {note.status && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {note.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs text-stone-400">
                      <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
                    </div>
                  </div>

                  {matchedSnippet && (
                    <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed pl-6">
                      {matchedSnippet}
                    </p>
                  )}

                  <div className="mt-2.5 pl-6 flex items-center gap-3 text-[11px] text-stone-400">
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {note.tags.map((t) => (
                          <span key={t} className="text-amber-600 dark:text-amber-400 font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    {checklistStats && checklistStats.total > 0 && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ {checklistStats.completed}/{checklistStats.total} ({checklistStats.percent}%)
                      </span>
                    )}
                    {(forwardLinkCount > 0 || backlinkCount > 0) && (
                      <span className="flex items-center gap-1 text-stone-500 font-mono">
                        <Link className="w-3 h-3" /> {forwardLinkCount} out / {backlinkCount} in
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Syntax & Filter Assistant Drawer */}
        {(showCheatSheet || showFilterDrawer) && (
          <div className="w-full md:w-80 bg-white dark:bg-stone-950 border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-800 p-4 overflow-y-auto shrink-0 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <span className="font-bold uppercase tracking-wider text-[11px] text-stone-700 dark:text-stone-300">
                {showCheatSheet ? 'Query Syntax Reference' : 'Filter Assistant'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCheatSheet(false);
                  setShowFilterDrawer(false);
                }}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Syntax Reference List */}
            <div className="space-y-3">
              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100 mb-1">Field Filters</div>
                <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>tag:project</span>
                    <span className="text-stone-400 font-sans">Tag match</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>folder:Work</span>
                    <span className="text-stone-400 font-sans">Folder name</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>status:in_progress</span>
                    <span className="text-stone-400 font-sans">Task status</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>priority:high</span>
                    <span className="text-stone-400 font-sans">Priority level</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>has:todo</span>
                    <span className="text-stone-400 font-sans">Open checklist</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>has:links</span>
                    <span className="text-stone-400 font-sans">Outgoing links</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100 mb-1">Boolean Operators</div>
                <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900">
                    <span>(tag:ai OR tag:pkm) -status:done</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900">
                    <span>has:math AND priority:urgent</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100 mb-1">Modifiers</div>
                <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>sort:updated order:desc</span>
                    <span className="text-stone-400 font-sans">Sort field</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>limit:20</span>
                    <span className="text-stone-400 font-sans">Max results</span>
                  </div>
                  <div className="p-1.5 rounded bg-stone-50 dark:bg-stone-900 flex justify-between">
                    <span>view:table</span>
                    <span className="text-stone-400 font-sans">View format</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
