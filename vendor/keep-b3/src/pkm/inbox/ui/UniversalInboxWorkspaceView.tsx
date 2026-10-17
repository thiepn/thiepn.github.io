import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Mail,
  Calendar,
  FileText,
  Zap,
  Sparkles,
  Clock,
  CheckCircle,
  Archive,
  Search,
  Filter,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  CheckSquare,
  Square,
  Eye,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { Note, Folder as FolderType } from '../../../types';
import {
  UniversalInboxItem,
  InboxState,
  UniversalInboxFilter,
} from '../inboxTypes';
import { universalInboxService } from '../universalInboxService';
import { UniversalInboxItemRow } from './UniversalInboxItemRow';
import { UniversalInboxDetailPane } from './UniversalInboxDetailPane';
import { ExternalSourcesModal } from './ExternalSourcesModal';
import { AITriageModal } from './AITriageModal';
import { DraftReplyModal } from './DraftReplyModal';

export interface UniversalInboxWorkspaceViewProps {
  allNotes: Note[];
  allFolders?: FolderType[];
  onSaveNote: (note: Note) => void;
  onNavigateToNote?: (noteId: string) => void;
}

export const UniversalInboxWorkspaceView: React.FC<UniversalInboxWorkspaceViewProps> = ({
  allNotes,
  allFolders = [],
  onSaveNote,
  onNavigateToNote,
}) => {
  const [filter, setFilter] = useState<UniversalInboxFilter>({
    tab: 'all',
    searchQuery: '',
    sourceFilter: 'all',
    actionableOnly: false,
    unseenOnly: false,
  });

  const [items, setItems] = useState<UniversalInboxItem[]>(() =>
    universalInboxService.getItems(filter)
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    const list = universalInboxService.getItems(filter);
    return list.length > 0 ? list[0].id : null;
  });

  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [aiTriageModalOpen, setAiTriageModalOpen] = useState(false);
  const [draftModalItem, setDraftModalItem] = useState<UniversalInboxItem | null>(null);

  // Snooze picker modal
  const [snoozeModalItem, setSnoozeModalItem] = useState<UniversalInboxItem | null>(null);
  const [snoozeDays, setSnoozeDays] = useState(1);

  // Quick Capture modal
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [qcTitle, setQcTitle] = useState('');
  const [qcContent, setQcContent] = useState('');

  // Project picker modal
  const [projectPickerItem, setProjectPickerItem] = useState<UniversalInboxItem | null>(null);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribe = universalInboxService.subscribe(() => {
      const refreshed = universalInboxService.getItems(filter);
      setItems(refreshed);
      if (selectedItemId && !refreshed.find((i) => i.id === selectedItemId)) {
        setSelectedItemId(refreshed.length > 0 ? refreshed[0].id : null);
      }
    });
    return unsubscribe;
  }, [filter, selectedItemId]);

  const handleFilterChange = (newFilter: Partial<UniversalInboxFilter>) => {
    const updated = { ...filter, ...newFilter };
    setFilter(updated);
    const list = universalInboxService.getItems(updated);
    setItems(list);
    if (list.length > 0 && (!selectedItemId || !list.find((i) => i.id === selectedItemId))) {
      setSelectedItemId(list[0].id);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await universalInboxService.syncAllSources();
    setIsSyncing(false);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId) || (items.length > 0 ? items[0] : null);

  const handleToggleCheckAll = () => {
    if (checkedItemIds.size === items.length) {
      setCheckedItemIds(new Set());
    } else {
      setCheckedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleCheckItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(checkedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedItemIds(next);
  };

  const handleBulkAction = (state: InboxState) => {
    universalInboxService.bulkUpdateState(Array.from(checkedItemIds), state);
    setCheckedItemIds(new Set());
  };

  const handleConfirmSnooze = () => {
    if (!snoozeModalItem) return;
    const targetDate = new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    universalInboxService.updateItemState(snoozeModalItem.id, 'snoozed', targetDate);
    setSnoozeModalItem(null);
  };

  const handleAddQuickCapture = () => {
    if (!qcTitle.trim() && !qcContent.trim()) return;
    const created = universalInboxService.ingestLocalCapture(qcTitle, qcContent);
    setQcTitle('');
    setQcContent('');
    setQuickCaptureOpen(false);
    setSelectedItemId(created.id);
  };

  const unprocessedCount = universalInboxService.getUnprocessedCount();
  const sources = universalInboxService.getSources();

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Inbox className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">Universal Inbox</h1>
                {unprocessedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {unprocessedCount} to triage
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Unified external ingestion, communications & local capture triage
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Capture</span>
          </button>

          <button
            onClick={() => setAiTriageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>AI Triage</span>
          </button>

          <button
            onClick={() => setSourcesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-stone-500" />
            <span>Sources ({sources.length})</span>
          </button>

          <button
            disabled={isSyncing}
            onClick={handleSyncAll}
            title="Sync all connected sources"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
        {/* Tab Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Inbox (Active)', icon: Inbox },
            { id: 'local', label: 'Captures', icon: Zap },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'files', label: 'Files', icon: FileText },
            { id: 'snoozed', label: 'Snoozed', icon: Clock },
            { id: 'processed', label: 'Processed', icon: CheckCircle },
            { id: 'dismissed', label: 'Dismissed', icon: Archive },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filter.tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange({ tab: tab.id as any })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Modifiers */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search inbox..."
              value={filter.searchQuery}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 w-44 focus:w-60 transition-all focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <label className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={filter.actionableOnly}
              onChange={(e) => handleFilterChange({ actionableOnly: e.target.checked })}
              className="rounded border-stone-300 text-amber-600"
            />
            <span>Actionable only</span>
          </label>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items are checked) */}
      {checkedItemIds.size > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
            <span>{checkedItemIds.size} items selected</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleBulkAction('seen')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 text-stone-800 dark:text-stone-200 font-medium"
            >
              Mark Seen
            </button>
            <button
              onClick={() => handleBulkAction('processed')}
              className="px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium"
            >
              Mark Processed
            </button>
            <button
              onClick={() => handleBulkAction('dismissed')}
              className="px-2.5 py-1 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 font-medium"
            >
              Dismiss
            </button>
            <button
              onClick={() => setCheckedItemIds(new Set())}
              className="text-stone-500 hover:text-stone-800 ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Master-Detail Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Master List */}
        <div className="lg:col-span-5 border-r border-stone-200 dark:border-stone-800 flex flex-col min-h-0 bg-white dark:bg-stone-900">
          {/* List Header */}
          <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleCheckAll}
                className="text-stone-400 hover:text-stone-600 flex items-center"
              >
                {checkedItemIds.size === items.length && items.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>
              <span>{items.length} items</span>
            </div>

            <span className="text-[11px] text-stone-400">Sorted by received time</span>
          </div>

          {/* Items Virtualized List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/40">
            {items.map((item) => (
              <UniversalInboxItemRow
                key={item.id}
                item={item}
                isSelected={selectedItemId === item.id}
                isChecked={checkedItemIds.has(item.id)}
                onSelect={() => {
                  setSelectedItemId(item.id);
                  if (item.state === 'new') {
                    universalInboxService.updateItemState(item.id, 'seen');
                  }
                }}
                onToggleCheck={(e) => handleToggleCheckItem(item.id, e)}
                onUpdateState={(state) => universalInboxService.updateItemState(item.id, state)}
                onOpenSnoozeModal={() => setSnoozeModalItem(item)}
              />
            ))}

            {items.length === 0 && (
              <div className="text-center py-16 px-6">
                <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Universal Inbox Zero</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  No items matching your current tab or filter. All incoming signals have been triaged or dismissed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="hidden lg:flex lg:col-span-7 flex-col min-h-0 bg-white dark:bg-stone-900">
          {selectedItem ? (
            <UniversalInboxDetailPane
              key={selectedItem.id}
              item={selectedItem}
              allNotes={allNotes}
              onSaveNote={onSaveNote}
              onOpenDraftModal={(it) => setDraftModalItem(it)}
              onOpenSnoozeModal={(it) => setSnoozeModalItem(it)}
              onOpenProjectPicker={(it) => setProjectPickerItem(it)}
              onNavigateToNote={onNavigateToNote}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <Inbox className="w-12 h-12 text-stone-300 dark:text-stone-700 mb-3" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Select an item to inspect and triage</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm leading-relaxed">
                Create canonical notes, tasks, or interaction records while preserving strict external source provenance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- External Sources Modal --- */}
      <ExternalSourcesModal
        isOpen={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
      />

      {/* --- AI Triage Modal --- */}
      <AITriageModal
        isOpen={aiTriageModalOpen}
        onClose={() => setAiTriageModalOpen(false)}
        items={items}
        allNotes={allNotes}
        onSaveNote={onSaveNote}
      />

      {/* --- Draft Reply Modal --- */}
      <DraftReplyModal
        isOpen={!!draftModalItem}
        onClose={() => setDraftModalItem(null)}
        item={draftModalItem}
      />

      {/* --- Quick Capture Modal --- */}
      {quickCaptureOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span>Universal Quick Capture</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">Title / Subject</label>
              <input
                type="text"
                placeholder="e.g. Follow up on database migration"
                value={qcTitle}
                onChange={(e) => setQcTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">Details & Thoughts</label>
              <textarea
                rows={4}
                placeholder="Paste raw notes, links, or quick reminders..."
                value={qcContent}
                onChange={(e) => setQcContent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setQuickCaptureOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuickCapture}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
              >
                Capture to Inbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Snooze Modal --- */}
      {snoozeModalItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-xs w-full shadow-2xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Snooze Item</span>
            </h3>

            <p className="text-stone-600 dark:text-stone-400">
              Hide this item from the active inbox until:
            </p>

            <div className="space-y-1.5">
              {[
                { label: 'Tomorrow (1 day)', days: 1 },
                { label: 'In 3 days', days: 3 },
                { label: 'Next Week (7 days)', days: 7 },
                { label: 'In 2 weeks (14 days)', days: 14 },
              ].map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setSnoozeDays(opt.days)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors ${
                    snoozeDays === opt.days
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSnoozeModalItem(null)}
                className="px-3 py-1.5 font-medium rounded-lg text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSnooze}
                className="px-4 py-1.5 font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Apply Snooze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Project Picker Modal --- */}
      {projectPickerItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-600" />
              <span>Link to Project</span>
            </h3>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {allFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    universalInboxService.linkItemToProject(
                      projectPickerItem.id,
                      folder.id,
                      folder.name
                    );
                    setProjectPickerItem(null);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-stone-800 dark:text-stone-200 flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-purple-500" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setProjectPickerItem(null)}
                className="px-3 py-1.5 font-medium rounded-lg text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
