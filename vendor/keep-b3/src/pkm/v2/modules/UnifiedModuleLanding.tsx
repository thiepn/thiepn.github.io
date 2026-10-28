import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  Clock,
  Compass,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';

export interface ModuleSavedView {
  id: string;
  name: string;
  filterFn?: (item: ResourceCore) => boolean;
}

export interface UnifiedModuleLandingProps {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  icon: React.ReactNode;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  resources: ResourceCore[];
  onOpenResource: (id: string, type: ResourceType) => void;
  savedViews?: ModuleSavedView[];
  activeQueueTitle?: string;
  activeQueueItems?: { id: string; title: string; type: ResourceType; badge?: string }[];
  className?: string;
}

export const UnifiedModuleLanding: React.FC<UnifiedModuleLandingProps> = ({
  moduleId,
  moduleName,
  moduleDescription,
  icon,
  primaryActionLabel,
  onPrimaryAction,
  resources,
  onOpenResource,
  savedViews = [],
  activeQueueTitle = 'Active Queue',
  activeQueueItems = [],
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSavedViewId, setActiveSavedViewId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'updated' | 'title'>('updated');

  const filteredResources = useMemo(() => {
    let list = [...resources];

    // Filter by saved view
    if (activeSavedViewId !== 'all') {
      const view = savedViews.find((v) => v.id === activeSavedViewId);
      if (view?.filterFn) {
        list = list.filter(view.filterFn);
      }
    }

    // Scoped search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    if (sortOrder === 'updated') {
      list.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [resources, activeSavedViewId, savedViews, searchQuery, sortOrder]);

  return (
    <div className={`flex-1 overflow-y-auto bg-stone-50/50 dark:bg-stone-950 p-4 sm:p-6 lg:p-8 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
              {icon}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {moduleName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {moduleDescription}
              </p>
            </div>
          </div>

          {/* 1 Visible Primary Action */}
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{primaryActionLabel}</span>
          </button>
        </div>

        {/* Active Queue / Focus Section (if applicable) */}
        {activeQueueItems.length > 0 && (
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                {activeQueueTitle} ({activeQueueItems.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeQueueItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenResource(item.id, item.type)}
                  className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded bg-stone-200/60 dark:bg-stone-800 shrink-0">
                      {getResourceTypeIcon(item.type)}
                    </div>
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {item.title}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Controls: Scoped Search + Filter Chips + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Scoped Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search within ${moduleName.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Filter Chips / Saved Views */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveSavedViewId('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeSavedViewId === 'all'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold'
                  : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
              }`}
            >
              All ({resources.length})
            </button>
            {savedViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveSavedViewId(view.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeSavedViewId === view.id
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                }`}
              >
                {view.name}
              </button>
            ))}
          </div>
        </div>

        {/* Resource List / Grid */}
        <div className="space-y-2">
          {filteredResources.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
              <Compass className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  No records found matching your filters.
                </p>
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  Create your first {moduleName.toLowerCase()} record
                </button>
              </div>
            </div>
          ) : (
            filteredResources.map((res) => (
              <div
                key={res.id}
                onClick={() => onOpenResource(res.id, res.type)}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0">
                    {getResourceTypeIcon(res.type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {res.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <span className="uppercase tracking-wider">{res.type}</span>
                      <span>•</span>
                      <span>{new Date(res.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {res.tags && res.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-mono text-stone-500"
                    >
                      #{tag}
                    </span>
                  ))}
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
