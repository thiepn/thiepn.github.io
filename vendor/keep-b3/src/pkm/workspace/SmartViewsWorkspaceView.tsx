import React, { useState, useMemo } from 'react';
import {
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
  FileText,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { SavedSmartView } from '../queryTypes';
import { loadSavedSmartViews, saveSmartView, deleteSavedSmartView } from '../smartViews';
import { parseSmartQuery } from '../queryParser';
import { executeSmartQuery } from '../queryEngine';
import { vaultManager } from '../indexer';
import { formatRelativeTime } from '../../utils/date';
import { useWorkspace } from '../useWorkspace';

export interface SmartViewsWorkspaceViewProps {
  allNotes: Note[];
  folders: Folder[];
  onOpenNote?: (noteId: string) => void;
}

export const SmartViewsWorkspaceView: React.FC<SmartViewsWorkspaceViewProps> = ({
  allNotes,
  folders,
  onOpenNote,
}) => {
  const { openNote } = useWorkspace();

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

  const activeQueryText = isEditing ? editQuery : selectedView ? selectedView.query : '';

  const parseResult = useMemo(() => {
    return parseSmartQuery(activeQueryText);
  }, [activeQueryText]);

  const evalResult = useMemo(() => {
    if (!parseResult.ast || parseResult.error) {
      return { matches: [], executionTimeMs: 0 };
    }
    return executeSmartQuery(parseResult.ast, {
      notes: allNotes,
      vaultIndex: vaultManager.getIndex(),
    });
  }, [parseResult, allNotes]);

  const handleSelectNote = (noteId: string) => {
    if (onOpenNote) {
      onOpenNote(noteId);
    } else {
      openNote(noteId);
    }
  };

  const handleSaveView = () => {
    if (!editName.trim() || !editQuery.trim()) return;

    const newView: SavedSmartView = {
      id: editingId || `smart-view-${Date.now()}`,
      name: editName.trim(),
      query: editQuery.trim(),
      description: editDesc.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSmartView(newView);
    const updated = loadSavedSmartViews();
    setViews(updated);
    setSelectedViewId(newView.id);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedSmartView(id);
    const updated = loadSavedSmartViews();
    setViews(updated);
    if (selectedViewId === id && updated.length > 0) {
      setSelectedViewId(updated[0].id);
    }
  };

  return (
    <div className="w-full h-full flex flex-col sm:flex-row overflow-hidden bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
      {/* Left Sidebar: List of Saved Views */}
      <div className="w-full sm:w-64 md:w-72 bg-white dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Smart Views</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setEditName('');
              setEditQuery('status: "in-progress" AND priority: "high"');
              setEditDesc('');
              setIsEditing(true);
            }}
            className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-white"
            title="Create Smart View"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-2 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-900 px-2 py-1 rounded-lg text-xs">
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Filter views..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {views
            .filter((v) => v.name.toLowerCase().includes(searchFilter.toLowerCase()))
            .map((v) => {
              const isSelected = selectedViewId === v.id && !isEditing;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedViewId(v.id);
                    setIsEditing(false);
                  }}
                  className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between group transition-colors ${
                    isSelected
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold border border-amber-300 dark:border-amber-800'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Bookmark className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">{v.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(v.id);
                        setEditName(v.name);
                        setEditQuery(v.query);
                        setEditDesc(v.description || '');
                        setIsEditing(true);
                      }}
                      className="p-1 hover:text-amber-600 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {!v.isBuiltIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteView(v.id);
                        }}
                        className="p-1 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Main Content Pane: Query Editor or Live Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isEditing ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h2 className="text-sm font-bold">
                {editingId ? 'Edit Smart View' : 'Create New Smart View'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg text-xs bg-stone-200 dark:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveView}
                  className="px-3 py-1 rounded-lg text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  Save View
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500">View Name</label>
                <input
                  type="text"
                  placeholder="e.g. In-Progress Sprint Tasks"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500">Smart Query Expression</label>
                <textarea
                  rows={4}
                  placeholder={`tag: "work" AND priority: "high"\nSORT BY updatedAt DESC`}
                  value={editQuery}
                  onChange={(e) => setEditQuery(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono focus:outline-hidden"
                />
              </div>

              {parseResult.error && (
                <div className="p-2 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                  {parseResult.error}
                </div>
              )}
            </div>
          </div>
        ) : selectedView ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  {selectedView.name}
                </h2>
                {selectedView.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{selectedView.description}</p>
                )}
              </div>
              <div className="text-xs font-mono text-stone-400">
                {evalResult.matches.length} matches ({evalResult.executionTimeMs} ms)
              </div>
            </div>

            {/* Query Code Badge */}
            <div className="px-4 py-2 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-600 dark:text-stone-400 shrink-0">
              <code>{selectedView.query}</code>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {evalResult.matches.length === 0 ? (
                <div className="py-16 text-center text-stone-400 text-xs">
                  No notes match this smart query.
                </div>
              ) : (
                evalResult.matches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectNote(item.id)}
                    className="p-3 bg-white dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 cursor-pointer transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-stone-100">
                      <span className="truncate">{item.title || 'Untitled Note'}</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        {formatRelativeTime(item.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
