import React, { useState, useEffect, useMemo } from 'react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import {
  UnifiedQueryAST,
  FilterGroup,
  SortClause,
  GroupClause,
  QueryResult,
} from '../core/query/queryTypes';
import { unifiedQueryEngineV2 } from '../core/query/unifiedQueryEngine';
import { SavedViewV2, UnifiedViewType } from './savedViewTypes';
import { savedViewRegistryV2 } from './savedViewRegistry';
import { UnifiedFilterBuilder } from './UnifiedFilterBuilder';
import { UnifiedListView } from './UnifiedListView';
import { UnifiedTableView } from './UnifiedTableView';
import { UnifiedBoardView } from './UnifiedBoardView';
import { UnifiedCalendarView } from './UnifiedCalendarView';
import { UnifiedGalleryView } from './UnifiedGalleryView';
import { BulkActionToolbar } from '../bulk/BulkActionToolbar';
import { unifiedBulkActionManager, BulkSelectionScope } from '../bulk/unifiedBulkActions';
import {
  List,
  Table as TableIcon,
  Kanban,
  Calendar as CalendarIcon,
  Grid,
  Filter,
  Search,
  Save,
  Plus,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  Bookmark,
  Check,
  MoreHorizontal,
} from 'lucide-react';

export interface UnifiedViewContainerProps {
  resources: ResourceCore[];
  initialViewId?: string;
  defaultResourceType?: ResourceType;
  onSelectResource: (id: string) => void;
  onUpdateResource: (res: ResourceCore) => void;
  onCreateResource?: (type?: ResourceType) => void;
}

export const UnifiedViewContainer: React.FC<UnifiedViewContainerProps> = ({
  resources,
  initialViewId,
  defaultResourceType,
  onSelectResource,
  onUpdateResource,
  onCreateResource,
}) => {
  // Available Saved Views
  const [allViews, setAllViews] = useState<SavedViewV2[]>(() => savedViewRegistryV2.getAll());
  const [activeViewId, setActiveViewId] = useState<string>(() => {
    if (initialViewId && savedViewRegistryV2.getById(initialViewId)) {
      return initialViewId;
    }
    const forType = defaultResourceType ? savedViewRegistryV2.getForResourceType(defaultResourceType) : [];
    return forType[0]?.id || allViews[0]?.id || 'view_everything_due_this_week';
  });

  // Current Working View Configuration
  const currentSavedView = useMemo(
    () => savedViewRegistryV2.getById(activeViewId) || allViews[0],
    [activeViewId, allViews]
  );

  const [viewType, setViewType] = useState<UnifiedViewType>(
    () => currentSavedView?.presentation.viewType || 'list'
  );
  const [activeAST, setActiveAST] = useState<UnifiedQueryAST>(
    () => currentSavedView?.query || { version: 2 }
  );
  const [textSearch, setTextSearch] = useState<string>('');
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [selectionScope, setSelectionScope] = useState<BulkSelectionScope>('explicit');

  // Synchronize when switching active Saved View
  useEffect(() => {
    if (currentSavedView) {
      setActiveAST(JSON.parse(JSON.stringify(currentSavedView.query)));
      setViewType(currentSavedView.presentation.viewType || 'list');
      setTextSearch(currentSavedView.query.textSearch || '');
      setSelectedIds(new Set());
    }
  }, [currentSavedView]);

  // Is View Modified from Saved State?
  const isModified = useMemo(() => {
    if (!currentSavedView) return false;
    const currentQueryStr = JSON.stringify({ ...activeAST, textSearch: textSearch || undefined });
    const savedQueryStr = JSON.stringify(currentSavedView.query);
    const viewTypeDiff = viewType !== currentSavedView.presentation.viewType;
    return currentQueryStr !== savedQueryStr || viewTypeDiff;
  }, [activeAST, textSearch, viewType, currentSavedView]);

  // Combined Query Execution
  const queryResult: QueryResult<ResourceCore> = useMemo(() => {
    const combinedAST: UnifiedQueryAST = {
      ...activeAST,
      textSearch: textSearch.trim() || undefined,
    };
    return unifiedQueryEngineV2.execute(resources, combinedAST, {
      includeArchived: false,
      includeTrashed: false,
    });
  }, [resources, activeAST, textSearch]);

  const items = queryResult.items;

  // Bulk Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectionScope('explicit');
  };

  const handleSelectAllVisible = () => {
    const allVisible = items.map((i) => i.id);
    const isAllSelected = allVisible.every((id) => selectedIds.has(id));
    if (isAllSelected) {
      setSelectedIds(new Set());
      setSelectionScope('explicit');
    } else {
      setSelectedIds(new Set(allVisible));
      setSelectionScope('visible');
    }
  };

  const handleSelectAllMatching = () => {
    const allMatching = queryResult.items.map((i) => i.id);
    setSelectedIds(new Set(allMatching));
    setSelectionScope('all_matching');
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionScope('explicit');
  };

  // Bulk Actions
  const handleBulkTag = async (tag: string) => {
    const targetIds = Array.from(selectedIds) as string[];
    await unifiedBulkActionManager.executeBulkTag(targetIds, tag, resources, onUpdateResource);
    handleClearSelection();
  };

  const handleBulkSetStatus = async (status: string) => {
    const targetIds = Array.from(selectedIds) as string[];
    await unifiedBulkActionManager.executeBulkSetProperty(targetIds, 'status', status, resources, onUpdateResource);
    handleClearSelection();
  };

  const handleBulkArchive = async () => {
    const targetIds = Array.from(selectedIds) as string[];
    await unifiedBulkActionManager.executeBulkArchive(targetIds, true, resources, onUpdateResource);
    handleClearSelection();
  };

  // View Modification / Save Handlers
  const handleSaveChanges = () => {
    if (!currentSavedView || currentSavedView.isBuiltIn) {
      setShowSaveAsModal(true);
      return;
    }
    savedViewRegistryV2.updateView(currentSavedView.id, {
      query: { ...activeAST, textSearch: textSearch || undefined },
      presentation: { ...currentSavedView.presentation, viewType },
    });
    setAllViews(savedViewRegistryV2.getAll());
  };

  const handleResetToSaved = () => {
    if (currentSavedView) {
      setActiveAST(JSON.parse(JSON.stringify(currentSavedView.query)));
      setViewType(currentSavedView.presentation.viewType || 'list');
      setTextSearch(currentSavedView.query.textSearch || '');
    }
  };

  const handleSaveAsNew = () => {
    if (!newViewName.trim()) return;
    const newView = savedViewRegistryV2.saveView({
      name: newViewName.trim(),
      source: { type: 'all' },
      query: { ...activeAST, textSearch: textSearch || undefined },
      presentation: {
        viewType,
        visibleColumns: currentSavedView?.presentation.visibleColumns || ['title', 'type', 'status', 'dueDate'],
      },
    });
    setAllViews(savedViewRegistryV2.getAll());
    setActiveViewId(newView.id);
    setShowSaveAsModal(false);
    setNewViewName('');
  };

  const handleDuplicateView = () => {
    if (!currentSavedView) return;
    const dup = savedViewRegistryV2.duplicateView(currentSavedView.id);
    if (dup) {
      setAllViews(savedViewRegistryV2.getAll());
      setActiveViewId(dup.id);
    }
  };

  const activeFilterCount = activeAST.filter?.criteria.length || 0;

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
      {/* View Header & Toolbar */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/40 space-y-3">
        {/* Top Row: Saved Views Switcher, Presentation Picker, and Save Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Saved View Switcher */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative">
              <select
                value={activeViewId}
                onChange={(e) => setActiveViewId(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white font-semibold text-sm rounded-lg px-3 py-1.5 pr-8 appearance-none hover:border-neutral-600 focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
              >
                {allViews.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            {isModified && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                Modified
              </span>
            )}

            {isModified && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={handleSaveChanges}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Save changes to view"
                >
                  <Save size={12} />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleResetToSaved}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                  title="Reset to saved view"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Presentation Mode Selector & Actions */}
          <div className="flex items-center gap-2 justify-between w-full lg:w-auto">
            {/* View Type Toggle Pills */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-neutral-400">
              <button
                onClick={() => setViewType('list')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewType === 'list' ? 'bg-neutral-800 text-white font-semibold shadow-xs' : 'hover:text-neutral-200'
                }`}
                title="List View"
              >
                <List size={14} />
                <span className="hidden sm:inline">List</span>
              </button>

              <button
                onClick={() => setViewType('table')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewType === 'table' ? 'bg-neutral-800 text-white font-semibold shadow-xs' : 'hover:text-neutral-200'
                }`}
                title="Table View"
              >
                <TableIcon size={14} />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                onClick={() => setViewType('board')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewType === 'board' ? 'bg-neutral-800 text-white font-semibold shadow-xs' : 'hover:text-neutral-200'
                }`}
                title="Board (Kanban) View"
              >
                <Kanban size={14} />
                <span className="hidden sm:inline">Board</span>
              </button>

              <button
                onClick={() => setViewType('calendar')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewType === 'calendar' ? 'bg-neutral-800 text-white font-semibold shadow-xs' : 'hover:text-neutral-200'
                }`}
                title="Calendar View"
              >
                <CalendarIcon size={14} />
                <span className="hidden sm:inline">Calendar</span>
              </button>

              <button
                onClick={() => setViewType('gallery')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewType === 'gallery' ? 'bg-neutral-800 text-white font-semibold shadow-xs' : 'hover:text-neutral-200'
                }`}
                title="Gallery View"
              >
                <Grid size={14} />
                <span className="hidden sm:inline">Gallery</span>
              </button>
            </div>

            {/* Query Explain Button */}
            <button
              onClick={() => setShowExplainModal(!showExplainModal)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 border border-neutral-800 transition-colors"
              title="Query Execution Explain Plan"
            >
              <Info size={15} />
            </button>

            {/* Create New Item Button */}
            {onCreateResource && (
              <button
                onClick={() => onCreateResource(defaultResourceType)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Scoped Text Search & Filter Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative grow max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search items in this view..."
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filter Builder Toggle */}
          <button
            onClick={() => setShowFilterBuilder(!showFilterBuilder)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              activeFilterCount > 0 || showFilterBuilder
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <Filter size={13} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Matches Count Pill */}
          <span className="text-xs text-neutral-500 font-mono hidden sm:inline ml-auto">
            {queryResult.totalMatches} matches ({queryResult.executionTimeMs}ms)
          </span>
        </div>

        {/* Expandable Filter Builder */}
        {showFilterBuilder && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <UnifiedFilterBuilder
              filterGroup={activeAST.filter || { conjunction: 'AND', criteria: [] }}
              resourceType={defaultResourceType}
              onChange={(updatedGroup) => {
                setActiveAST((prev) => ({
                  ...prev,
                  filter: updatedGroup,
                }));
              }}
              onClose={() => setShowFilterBuilder(false)}
            />
          </div>
        )}
      </div>

      {/* Main Presentation View Body */}
      <div className="p-4 grow overflow-y-auto">
        {viewType === 'list' && (
          <UnifiedListView
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectResource={onSelectResource}
            visibleColumns={currentSavedView?.presentation.visibleColumns}
          />
        )}

        {viewType === 'table' && (
          <UnifiedTableView
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAllVisible={handleSelectAllVisible}
            onSelectResource={onSelectResource}
            visibleColumns={currentSavedView?.presentation.visibleColumns}
            sort={activeAST.sort}
            onSortChange={(nextSort) => {
              setActiveAST((prev) => ({
                ...prev,
                sort: nextSort,
              }));
            }}
            onUpdateResourceProperty={(id, field, val) => {
              const res = resources.find((r) => r.id === id);
              if (res) {
                const updated = { ...res, [field]: val, updatedAt: Date.now() };
                onUpdateResource(updated);
              }
            }}
          />
        )}

        {viewType === 'board' && (
          <UnifiedBoardView
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectResource={onSelectResource}
            boardField={currentSavedView?.presentation.boardFieldMapping || 'status'}
            onUpdateResourceProperty={(id, field, val) => {
              const res = resources.find((r) => r.id === id);
              if (res) {
                const updated = { ...res, [field]: val, updatedAt: Date.now() };
                onUpdateResource(updated);
              }
            }}
            onCreateResourceInGroup={(groupVal) => {
              onCreateResource?.(defaultResourceType);
            }}
          />
        )}

        {viewType === 'calendar' && (
          <UnifiedCalendarView
            items={items}
            dateField={currentSavedView?.presentation.dateFieldMapping || 'dueDate'}
            onSelectResource={onSelectResource}
            onCreateResourceOnDate={(dateStr) => {
              onCreateResource?.(defaultResourceType);
            }}
          />
        )}

        {viewType === 'gallery' && (
          <UnifiedGalleryView
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectResource={onSelectResource}
            visibleColumns={currentSavedView?.presentation.visibleColumns}
          />
        )}
      </div>

      {/* Floating Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        totalMatchingCount={queryResult.totalMatches}
        scope={selectionScope}
        onSelectAllVisible={handleSelectAllVisible}
        onSelectAllMatching={handleSelectAllMatching}
        onClearSelection={handleClearSelection}
        onApplyTag={handleBulkTag}
        onSetStatus={handleBulkSetStatus}
        onSetPriority={(p) => {
          const targetIds = Array.from(selectedIds) as string[];
          unifiedBulkActionManager.executeBulkSetProperty(targetIds, 'priority', p, resources, onUpdateResource);
          handleClearSelection();
        }}
        onArchive={handleBulkArchive}
        onRelate={(targetId, label) => {
          const targetIds = Array.from(selectedIds) as string[];
          unifiedBulkActionManager.executeBulkRelate(targetIds, targetId, label, resources);
          handleClearSelection();
        }}
      />

      {/* Query Explain Plan Modal */}
      {showExplainModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-lg w-full p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Info size={18} />
                <h3 className="text-base font-semibold text-white">Query Execution Explain</h3>
              </div>
              <button
                onClick={() => setShowExplainModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-neutral-300">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Source Scope:</span>
                  <span className="text-amber-300 font-bold">{queryResult.explain?.sourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Candidate Pool:</span>
                  <span>{queryResult.explain?.candidateCount} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Post-Filter Matches:</span>
                  <span className="text-emerald-400 font-semibold">{queryResult.explain?.postFilterCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Execution Duration:</span>
                  <span className="text-white font-bold">{queryResult.explain?.executionTimeMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cache Hit:</span>
                  <span className={queryResult.explain?.cacheHit ? 'text-emerald-400' : 'text-neutral-400'}>
                    {queryResult.explain?.cacheHit ? 'YES (Cached)' : 'NO (Fresh Execution)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 font-sans font-semibold block mb-1">Indexes & Optimizations Applied:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {queryResult.explain?.indexesUsed.map((idx) => (
                    <span key={idx} className="bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded text-amber-300">
                      {idx}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowExplainModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save As New View Modal */}
      {showSaveAsModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-left">
            <h3 className="text-base font-semibold text-white mb-2">Save View Configuration</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Saved Views store query rules and layout configurations, without copying or duplicating underlying records.
            </p>
            <input
              type="text"
              placeholder="e.g. My Urgent Tasks Board"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveAsModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsNew}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold rounded-lg"
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
