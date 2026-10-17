import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Link,
  Plus,
  Tag,
  Check,
} from 'lucide-react';
import { ResourceCore, ResourceType } from '../core/resource/resourceCore';
import { getResourceTypeIcon } from '../shell/ResourceHeaderV2';

export interface UnifiedRelationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceResource: ResourceCore;
  availableResources: ResourceCore[];
  targetTypeFilter?: ResourceType;
  onSelectResource: (
    targetResource: ResourceCore,
    relationLabel: string
  ) => Promise<void> | void;
  onCreateNewAndLink?: (
    title: string,
    type: ResourceType,
    relationLabel: string
  ) => Promise<void> | void;
}

const COMMON_RELATION_LABELS = [
  'related_to',
  'part_of',
  'depends_on',
  'participant',
  'cites',
  'parent',
  'subtask',
  'authored_by',
  'funded_by',
  'forecast_for',
];

export const UnifiedRelationPicker: React.FC<UnifiedRelationPickerProps> = ({
  isOpen,
  onClose,
  sourceResource,
  availableResources,
  targetTypeFilter,
  onSelectResource,
  onCreateNewAndLink,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationLabel, setSelectedRelationLabel] = useState('related_to');
  const [customRelationLabel, setCustomRelationLabel] = useState('');

  if (!isOpen) return null;

  const filteredResources = useMemo(() => {
    return availableResources.filter((res) => {
      // Exclude self
      if (res.id === sourceResource.id) return false;
      // Filter by type if specified
      if (targetTypeFilter && res.type !== targetTypeFilter) return false;
      // Exclude trashed
      if (res.trashed) return false;
      // Search query
      if (!searchQuery.trim()) return true;
      return res.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [availableResources, sourceResource.id, targetTypeFilter, searchQuery]);

  const activeLabel = customRelationLabel.trim() || selectedRelationLabel;

  const handleSelect = async (target: ResourceCore) => {
    await onSelectResource(target, activeLabel);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!onCreateNewAndLink || !searchQuery.trim()) return;
    const targetType = targetTypeFilter || 'note';
    await onCreateNewAndLink(searchQuery.trim(), targetType, activeLabel);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relation-picker-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-500" />
            <h2 id="relation-picker-title" className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              Connect to {sourceResource.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-stone-100 dark:border-stone-800/60">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${targetTypeFilter ? targetTypeFilter + 's' : 'resources'}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Relationship Label Selector */}
        <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-950/40 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>Relationship Type</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_RELATION_LABELS.slice(0, 5).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSelectedRelationLabel(label);
                  setCustomRelationLabel('');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  activeLabel === label
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredResources.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-stone-400">No matching resources found.</p>
              {onCreateNewAndLink && searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create "{searchQuery.trim()}" as {targetTypeFilter || 'note'} and link
                </button>
              )}
            </div>
          ) : (
            filteredResources.map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => handleSelect(res)}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-stone-100 dark:bg-stone-800 shrink-0">
                    {getResourceTypeIcon(res.type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                      {res.title}
                    </span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                      {res.type}
                    </span>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 transition-opacity">
                  <span>Connect</span>
                  <Link className="w-3 h-3" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
