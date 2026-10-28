import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Play,
  Bookmark,
  Folder as FolderIcon,
  Tag as TagIcon,
  Flame,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Note, Folder } from '../types';
import { SavedSmartView } from './queryTypes';
import { loadSavedSmartViews, saveSmartView, deleteSavedSmartView } from './smartViews';
import { parseSmartQuery } from './queryParser';
import { executeSmartQuery } from './queryEngine';
import { vaultManager } from './indexer';
import { formatRelativeTime } from '../utils/date';

interface SmartViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onInsertQueryBlock?: (queryCode: string) => void;
}

export const SmartViewsModal: React.FC<SmartViewsModalProps> = ({
  isOpen,
  onClose,
  allNotes,
  folders,
  onOpenNote,
  onInsertQueryBlock,
}) => {
  const [views, setViews] = useState<SavedSmartView[]>(() => loadSavedSmartViews());
  const [selectedViewId, setSelectedViewId] = useState<string>(views[0]?.id || 'view-urgent-tasks');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // View Creator / Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQuery, setEditQuery] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSyntaxCheatSheet, setShowSyntaxCheatSheet] = useState(false);

  const selectedView = useMemo(() => {
    return views.find((v) => v.id === selectedViewId) || views[0];
  }, [views, selectedViewId]);

  // Live evaluation of the currently active query (either from selected view or editor)
  const activeQueryText = isEditing ? editQuery : selectedView ? selectedView.query : '';

  const parseResult = useMemo(() => {
    return parseSmartQuery(activeQueryText);
  }, [activeQueryText]);

  const evalResult = useMemo(() => {
    if (!parseResult.ast || parseResult.error) {
      return { items: [], totalMatches: 0, modifiers: {}, executionTimeMs: 0 };
    }
    return executeSmartQuery(parseResult.ast, {
      notes: allNotes,
      vaultIndex: vaultManager.getIndex(),
      folders,
    });
  }, [parseResult, allNotes, folders]);

  const filteredViews = useMemo(() => {
    if (!searchFilter.trim()) return views;
    const term = searchFilter.toLowerCase();
    return views.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        v.query.toLowerCase().includes(term) ||
        (v.description && v.description.toLowerCase().includes(term))
    );
  }, [views, searchFilter]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setEditName('');
    setEditQuery('tag:project status:in_progress sort:updated order:desc');
    setEditDesc('');
  };

  const handleStartEdit = (view: SavedSmartView) => {
    setIsEditing(true);
    setEditingId(view.id);
    setEditName(view.name);
    setEditQuery(view.query);
    setEditDesc(view.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editQuery.trim()) return;

    const saved = saveSmartView({
      id: editingId || undefined,
      name: editName.trim(),
      query: editQuery.trim(),
      description: editDesc.trim() || undefined,
    });

    const refreshed = loadSavedSmartViews();
    setViews(refreshed);
    setSelectedViewId(saved.id);
    setIsEditing(false);
  };

  const handleDeleteView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedSmartView(id);
    const refreshed = loadSavedSmartViews();
    setViews(refreshed);
    if (selectedViewId === id) {
      setSelectedViewId(refreshed[0]?.id || '');
    }
  };

  const handleCopyQuery = (queryText: string, id: string) => {
    navigator.clipboard.writeText(queryText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] max-h-[800px] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Smart Views & Live Search Blocks
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Dynamic queries and saved views that update automatically with vault changes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSyntaxCheatSheet(!showSyntaxCheatSheet)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Syntax Guide</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Syntax Cheat Sheet Drawer */}
        {showSyntaxCheatSheet && (
          <div className="p-4 bg-amber-50/90 dark:bg-stone-950 border-b border-amber-200 dark:border-stone-800 text-xs grid grid-cols-1 md:grid-cols-3 gap-3 overflow-y-auto max-h-48">
            <div>
              <h5 className="font-bold text-amber-900 dark:text-amber-300 uppercase text-[10px] mb-1">
                Field Filters
              </h5>
              <ul className="space-y-0.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                <li><span className="font-semibold text-amber-700">folder:</span>"Work Projects", none</li>
                <li><span className="font-semibold text-amber-700">tag:</span>work, #todo, react</li>
                <li><span className="font-semibold text-amber-700">status:</span>todo, in_progress, done</li>
                <li><span className="font-semibold text-amber-700">priority:</span>urgent, high, medium, low</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-amber-900 dark:text-amber-300 uppercase text-[10px] mb-1">
                Dates & Features
              </h5>
              <ul className="space-y-0.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                <li><span className="font-semibold text-amber-700">updated:</span>today, &lt;7d, &gt;2026-01-01</li>
                <li><span className="font-semibold text-amber-700">has:</span>checklist, todo, images, links</li>
                <li><span className="font-semibold text-amber-700">is:</span>pinned, favorite, archived</li>
                <li><span className="font-semibold text-amber-700">text:</span>"search phrase", meeting</li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-amber-900 dark:text-amber-300 uppercase text-[10px] mb-1">
                Operators & Modifiers
              </h5>
              <ul className="space-y-0.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                <li><span className="font-semibold text-purple-700">AND, OR, NOT, (...)</span></li>
                <li><span className="font-semibold text-stone-600 dark:text-stone-400">-prefix:</span> -status:done</li>
                <li><span className="font-semibold text-emerald-700">sort:</span>updated, title, priority</li>
                <li><span className="font-semibold text-emerald-700">limit:</span>10, <span className="font-semibold text-emerald-700">view:</span>list, table, cards</li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Main Body (Two Columns: Sidebar Views List & Execution Panel) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Smart Views List */}
          <div className="w-full md:w-72 border-r border-stone-200 dark:border-stone-800 flex flex-col bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
            {/* Search & Add Bar */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search smart views..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handleStartCreate}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Smart View</span>
              </button>
            </div>

            {/* Views List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredViews.map((view) => {
                const isSelected = !isEditing && selectedViewId === view.id;
                return (
                  <div
                    key={view.id}
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedViewId(view.id);
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all cursor-pointer group flex items-start justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800/80 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                          {view.name}
                        </span>
                        {view.isBuiltIn && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {view.query}
                      </p>
                    </div>

                    {!view.isBuiltIn && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(view);
                          }}
                          className="p-1 text-stone-400 hover:text-amber-600 rounded"
                          title="Edit View"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteView(view.id, e)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          title="Delete View"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Execution / Editor Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5 space-y-4">
            {isEditing ? (
              /* --- Query Editor Form --- */
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    {editingId ? 'Edit Smart View' : 'Create New Smart View'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    View Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. 🔥 High Priority Projects"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Smart Query Expression
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    placeholder="e.g. folder:Projects tag:active sort:updated order:desc"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-stone-900 text-stone-100 border border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Short description of this query's purpose"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    Save Smart View
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Discard
                  </button>
                </div>
              </form>
            ) : selectedView ? (
              /* --- View Details & Actions Bar --- */
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {selectedView.name}
                    </h4>
                    {selectedView.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {selectedView.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyQuery(selectedView.query, selectedView.id)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === selectedView.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === selectedView.id ? 'Copied' : 'Copy Query'}</span>
                    </button>

                    {onInsertQueryBlock && (
                      <button
                        type="button"
                        onClick={() => {
                          onInsertQueryBlock(`\`\`\`query\n${selectedView.query}\n\`\`\``);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert Block in Note</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Raw Query Display */}
                <div className="p-2.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{selectedView.query}</span>
                  <span className="text-[10px] text-stone-400 shrink-0 uppercase font-bold">
                    {evalResult.totalMatches} matches ({evalResult.executionTimeMs}ms)
                  </span>
                </div>
              </div>
            ) : null}

            {/* Live Matches List */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                <span>Matching Vault Notes ({evalResult.items.length})</span>
              </div>

              {parseResult.error ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
                  <p className="font-bold">Syntax Error: {parseResult.error.message}</p>
                  {parseResult.error.suggestion && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      💡 {parseResult.error.suggestion}
                    </p>
                  )}
                </div>
              ) : evalResult.items.length === 0 ? (
                <div className="py-8 text-center text-stone-500 dark:text-stone-400 text-xs border border-dashed border-stone-300 dark:border-stone-800 rounded-xl">
                  No notes match this query.
                </div>
              ) : (
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl divide-y divide-stone-200 dark:divide-stone-800 overflow-hidden bg-white dark:bg-stone-900">
                  {evalResult.items.map((item) => (
                    <div
                      key={item.note.id}
                      onClick={() => {
                        onOpenNote(item.note.id);
                        onClose();
                      }}
                      className="px-3.5 py-2.5 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {item.note.title || 'Untitled Note'}
                          </span>
                          {item.folderName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                              <FolderIcon className="w-2.5 h-2.5" />
                              {item.folderName}
                            </span>
                          )}
                          {item.note.priority && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                item.note.priority === 'urgent'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {item.note.priority}
                            </span>
                          )}
                        </div>
                        {item.matchedSnippet && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                            {item.matchedSnippet}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0 text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(item.note.updatedAt || item.note.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
