import React, { useState, useMemo, useEffect } from 'react';
import { Note, Folder } from '../../../types';
import {
  Collection,
  CollectionView,
  CollectionViewType,
  CollectionRecord,
  CollectionFilterRule,
} from '../collectionTypes';
import { collectionService } from '../collectionService';
import { CollectionTableView } from './CollectionTableView';
import { CollectionBoardView } from './CollectionBoardView';
import { CollectionGalleryView } from './CollectionGalleryView';
import { CollectionCalendarView } from './CollectionCalendarView';
import { CollectionSchemaModal } from './CollectionSchemaModal';
import {
  Table2,
  Kanban,
  LayoutGrid,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Settings2,
  Download,
  MoreVertical,
  Layers,
  Sparkles,
  Info,
  X,
  Check,
  ChevronDown,
  Trash2,
  FileText,
  ExternalLink,
} from 'lucide-react';

export interface CollectionWorkspaceViewProps {
  collectionId?: string;
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => void;
  onCreateNewNote?: (title?: string, folderId?: string | null, tags?: string[], initialContent?: string) => void;
  onBulkTrashNotes?: (noteIds: string[]) => void;
}

export const CollectionWorkspaceView: React.FC<CollectionWorkspaceViewProps> = ({
  collectionId,
  allNotes,
  folders,
  onOpenNote,
  onSaveNote,
  onCreateNewNote,
  onBulkTrashNotes,
}) => {
  const [collections, setCollections] = useState<Collection[]>(() => collectionService.loadCollections());

  // Active Collection
  const activeCollection = useMemo(() => {
    if (!collectionId) return collections[0] || null;
    return collections.find((c) => c.id === collectionId) || collections[0] || null;
  }, [collections, collectionId]);

  // Active View in Collection
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  useEffect(() => {
    if (activeCollection && (!activeViewId || !activeCollection.views.some((v) => v.id === activeViewId))) {
      const defaultView = activeCollection.views.find((v) => v.isDefault) || activeCollection.views[0];
      setActiveViewId(defaultView?.id || null);
    }
  }, [activeCollection, activeViewId]);

  const activeView = useMemo(() => {
    if (!activeCollection) return null;
    return activeCollection.views.find((v) => v.id === activeViewId) || activeCollection.views[0] || null;
  }, [activeCollection, activeViewId]);

  // Search, Filter, Sort popover states
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  // Inspector Sidebar
  const [inspectorRecord, setInspectorRecord] = useState<CollectionRecord | null>(null);

  // Evaluated Records Projection
  const evaluatedRecords = useMemo(() => {
    if (!activeCollection) return [];
    return collectionService.getCollectionRecords(activeCollection, allNotes, folders);
  }, [activeCollection, allNotes, folders]);

  // Filtered & Sorted Records for current View
  const viewRecords = useMemo(() => {
    if (!activeView) return evaluatedRecords;
    return collectionService.applyViewFiltersAndSorts(evaluatedRecords, activeView, searchQuery);
  }, [evaluatedRecords, activeView, searchQuery]);

  if (!activeCollection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-white dark:bg-stone-900">
        <Layers className="w-12 h-12 stroke-1 mb-3 text-stone-300 dark:text-stone-700" />
        <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200">No Collection Selected</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-sm">
          Create or select a Collection from the sidebar to manage notes with structured properties, relations, and formulas.
        </p>
      </div>
    );
  }

  // Update Collection Handlers
  const handleSaveCollection = (updated: Collection) => {
    const saved = collectionService.saveCollection(updated);
    setCollections((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
  };

  const handleUpdateActiveView = (updatedView: CollectionView) => {
    const updatedViews = activeCollection.views.map((v) => (v.id === updatedView.id ? updatedView : v));
    handleSaveCollection({ ...activeCollection, views: updatedViews });
  };

  const handleAddNewView = (type: CollectionViewType) => {
    const newView: CollectionView = {
      id: `view-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} View`,
      type,
      filters: { conjunction: 'and', rules: [] },
      sorts: [],
      visiblePropertyIds: activeCollection.schema.map((s) => s.id),
      groupByPropertyId: type === 'board' ? 'status' : undefined,
      datePropertyId: type === 'calendar' ? 'due' : undefined,
    };
    const updated = {
      ...activeCollection,
      views: [...activeCollection.views, newView],
    };
    handleSaveCollection(updated);
    setActiveViewId(newView.id);
    setIsViewMenuOpen(false);
  };

  const handleDeleteView = (viewId: string) => {
    if (activeCollection.views.length <= 1) return; // Keep at least one view
    const remaining = activeCollection.views.filter((v) => v.id !== viewId);
    handleSaveCollection({ ...activeCollection, views: remaining });
    if (activeViewId === viewId) {
      setActiveViewId(remaining[0].id);
    }
  };

  // Create new Note in this Collection
  const handleCreateNoteInCollection = (title: string = 'Untitled Note', initialProps?: Record<string, any>) => {
    if (!onCreateNewNote) return;

    let targetFolderId: string | null = null;
    const targetTags: string[] = [];

    if (activeCollection.source.type === 'folder') {
      targetFolderId = activeCollection.source.folderId;
    } else if (activeCollection.source.type === 'tag') {
      targetTags.push(activeCollection.source.tag);
    }

    // Build initial frontmatter YAML
    const propsToSerialize = { ...initialProps };
    if (targetTags.length > 0 && !propsToSerialize.tags) {
      propsToSerialize.tags = targetTags;
    }

    let initialYaml = '';
    if (Object.keys(propsToSerialize).length > 0) {
      const lines = ['---'];
      for (const [k, v] of Object.entries(propsToSerialize)) {
        if (Array.isArray(v)) {
          lines.push(`${k}: [${v.map((item) => JSON.stringify(item)).join(', ')}]`);
        } else if (typeof v === 'string') {
          lines.push(`${k}: ${v.includes('\n') ? `"${v}"` : v}`);
        } else {
          lines.push(`${k}: ${v}`);
        }
      }
      lines.push('---', '', '');
      initialYaml = lines.join('\n');
    }

    onCreateNewNote(title, targetFolderId, targetTags, initialYaml);
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvData = collectionService.exportCollectionAsCSV(
      activeCollection,
      viewRecords,
      true,
      activeView || undefined
    );
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeCollection.name.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getViewIcon = (type: CollectionViewType) => {
    switch (type) {
      case 'table':
        return Table2;
      case 'board':
        return Kanban;
      case 'gallery':
        return LayoutGrid;
      case 'calendar':
        return Calendar;
      default:
        return Table2;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-stone-900 overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="px-6 pt-4 pb-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Collection Name & Source Badge */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeCollection.name}
                  onChange={(e) => handleSaveCollection({ ...activeCollection, name: e.target.value })}
                  className="font-bold text-stone-900 dark:text-stone-100 text-base bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  {evaluatedRecords.length} {evaluatedRecords.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                <span>
                  Source:{' '}
                  <strong className="text-stone-600 dark:text-stone-300">
                    {activeCollection.source.type === 'tag'
                      ? `#${activeCollection.source.tag}`
                      : activeCollection.source.type === 'folder'
                      ? `Folder: ${folders.find((f) => f.id === activeCollection.source.folderId)?.name || 'Root'}`
                      : activeCollection.source.type}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                activeView?.filters && activeView.filters.rules.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600'
                  : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeView?.filters && activeView.filters.rules.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeView.filters.rules.length}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                activeView?.sorts && activeView.sorts.length > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600'
                  : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1.5 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              title="Export Collection as CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Schema Settings */}
            <button
              type="button"
              onClick={() => setIsSchemaModalOpen(true)}
              className="p-1.5 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              title="Collection Schema & Properties"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* + New Note in Collection */}
            <button
              type="button"
              onClick={() => handleCreateNoteInCollection()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* 2. View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 overflow-x-auto">
          {activeCollection.views.map((v) => {
            const Icon = getViewIcon(v.type);
            const isActive = v.id === activeViewId;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveViewId(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-stone-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-stone-200 dark:border-stone-700'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{v.name}</span>
                {activeCollection.views.length > 1 && isActive && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(v.id);
                    }}
                    className="ml-1 p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-400 hover:text-rose-500"
                    title="Delete view"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          {/* + Add View Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add View</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {isViewMenuOpen && (
              <div className="absolute left-0 top-full mt-1 z-40 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg p-1 min-w-[140px] space-y-0.5 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => handleAddNewView('table')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Table2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewView('board')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Kanban className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewView('gallery')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Gallery</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewView('calendar')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Calendar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Popover Dropdown */}
      {isFilterOpen && activeView && (
        <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-850 animate-in slide-in-from-top duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Filter Rules ({activeView.filters.rules.length})
            </span>
            <button
              type="button"
              onClick={() => {
                const newRule: CollectionFilterRule = {
                  id: `rule-${Date.now()}`,
                  field: activeCollection.schema[0]?.id || 'title',
                  operator: 'equals',
                  value: '',
                };
                handleUpdateActiveView({
                  ...activeView,
                  filters: {
                    ...activeView.filters,
                    rules: [...activeView.filters.rules, newRule],
                  },
                });
              }}
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              <Plus className="w-3 h-3" />
              Add rule
            </button>
          </div>

          {activeView.filters.rules.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No filter rules applied. Showing all notes.</p>
          ) : (
            <div className="space-y-2">
              {activeView.filters.rules.map((rule, idx) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <select
                    value={rule.field}
                    onChange={(e) => {
                      const updatedRules = [...activeView.filters.rules];
                      updatedRules[idx] = { ...rule, field: e.target.value };
                      handleUpdateActiveView({
                        ...activeView,
                        filters: { ...activeView.filters, rules: updatedRules },
                      });
                    }}
                    className="p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  >
                    <option value="title">Title</option>
                    {activeCollection.schema.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const updatedRules = [...activeView.filters.rules];
                      updatedRules[idx] = { ...rule, operator: e.target.value as any };
                      handleUpdateActiveView({
                        ...activeView,
                        filters: { ...activeView.filters, rules: updatedRules },
                      });
                    }}
                    className="p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  >
                    <option value="equals">equals</option>
                    <option value="not_equals">does not equal</option>
                    <option value="contains">contains</option>
                    <option value="not_contains">does not contain</option>
                    <option value="is_empty">is empty</option>
                    <option value="is_not_empty">is not empty</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>

                  <input
                    type="text"
                    value={rule.value || ''}
                    placeholder="Value..."
                    onChange={(e) => {
                      const updatedRules = [...activeView.filters.rules];
                      updatedRules[idx] = { ...rule, value: e.target.value };
                      handleUpdateActiveView({
                        ...activeView,
                        filters: { ...activeView.filters, rules: updatedRules },
                      });
                    }}
                    className="p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs flex-1"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const updatedRules = activeView.filters.rules.filter((_, i) => i !== idx);
                      handleUpdateActiveView({
                        ...activeView,
                        filters: { ...activeView.filters, rules: updatedRules },
                      });
                    }}
                    className="p-1 text-stone-400 hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort Popover Dropdown */}
      {isSortOpen && activeView && (
        <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-850 animate-in slide-in-from-top duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Sorts ({activeView.sorts.length})
            </span>
            <button
              type="button"
              onClick={() => {
                const newSort = {
                  field: activeCollection.schema[0]?.id || 'title',
                  direction: 'asc' as const,
                };
                handleUpdateActiveView({
                  ...activeView,
                  sorts: [...activeView.sorts, newSort],
                });
              }}
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              <Plus className="w-3 h-3" />
              Add sort
            </button>
          </div>

          {activeView.sorts.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No sorts applied.</p>
          ) : (
            <div className="space-y-2">
              {activeView.sorts.map((sort, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={sort.field}
                    onChange={(e) => {
                      const updated = [...activeView.sorts];
                      updated[idx] = { ...sort, field: e.target.value };
                      handleUpdateActiveView({ ...activeView, sorts: updated });
                    }}
                    className="p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  >
                    <option value="title">Title</option>
                    {activeCollection.schema.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sort.direction}
                    onChange={(e) => {
                      const updated = [...activeView.sorts];
                      updated[idx] = { ...sort, direction: e.target.value as any };
                      handleUpdateActiveView({ ...activeView, sorts: updated });
                    }}
                    className="p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  >
                    <option value="asc">Ascending (A to Z / 0 to 9)</option>
                    <option value="desc">Descending (Z to A / 9 to 0)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = activeView.sorts.filter((_, i) => i !== idx);
                      handleUpdateActiveView({ ...activeView, sorts: updated });
                    }}
                    className="p-1 text-stone-400 hover:text-rose-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Main View Renderer */}
      <div className="flex-1 flex overflow-hidden">
        {activeView?.type === 'table' && (
          <CollectionTableView
            collection={activeCollection}
            view={activeView}
            records={viewRecords}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={onOpenNote}
            onSaveNote={onSaveNote}
            onUpdateView={handleUpdateActiveView}
            onBulkTrashNotes={onBulkTrashNotes}
          />
        )}

        {activeView?.type === 'board' && (
          <CollectionBoardView
            collection={activeCollection}
            view={activeView}
            records={viewRecords}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={onOpenNote}
            onSaveNote={onSaveNote}
            onCreateNewNote={handleCreateNoteInCollection}
          />
        )}

        {activeView?.type === 'gallery' && (
          <CollectionGalleryView
            collection={activeCollection}
            view={activeView}
            records={viewRecords}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={onOpenNote}
            onSaveNote={onSaveNote}
            onCreateNewNote={handleCreateNoteInCollection}
          />
        )}

        {activeView?.type === 'calendar' && (
          <CollectionCalendarView
            collection={activeCollection}
            view={activeView}
            records={viewRecords}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={onOpenNote}
            onSaveNote={onSaveNote}
            onCreateNewNote={handleCreateNoteInCollection}
          />
        )}
      </div>

      {/* Collection Schema Configuration Modal */}
      {isSchemaModalOpen && (
        <CollectionSchemaModal
          isOpen={true}
          onClose={() => setIsSchemaModalOpen(false)}
          collection={activeCollection}
          onSaveSchema={(newSchema) => {
            handleSaveCollection({ ...activeCollection, schema: newSchema });
          }}
        />
      )}
    </div>
  );
};
