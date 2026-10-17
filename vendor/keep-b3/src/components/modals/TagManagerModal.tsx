import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  Merge,
  FileText,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Folder as FolderIcon,
  Info,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { normalizeTag, detectTagDiscrepancies } from '../../utils/tagManager';

export interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders?: Folder[];
  onRenameTag: (
    oldTag: string,
    newTag: string,
    updateContent: boolean
  ) => Promise<{ updatedCount: number }>;
  onDeleteTag: (
    tagToDelete: string,
    removeFromContent: boolean
  ) => Promise<{ updatedCount: number }>;
  onBatchMergeTags?: (
    sourceTags: string[],
    targetTag: string,
    updateContent: boolean
  ) => Promise<{ updatedCount: number }>;
  onBatchDeleteTags?: (
    tagsToDelete: string[],
    removeFromContent: boolean
  ) => Promise<{ updatedCount: number }>;
  onSelectTagFilter?: (tag: string) => void;
  onOpenNote?: (noteId: string, noteTitle?: string) => void;
}

type SortOption = 'count-desc' | 'count-asc' | 'alpha-asc' | 'alpha-desc';
type FilterCategory = 'all' | 'single' | 'multi';

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders = [],
  onRenameTag,
  onDeleteTag,
  onBatchMergeTags,
  onBatchDeleteTags,
  onSelectTagFilter,
  onOpenNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('count-desc');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  // Single tag inline rename state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [renameUpdateContent, setRenameUpdateContent] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);

  // Single tag inline delete confirm state
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [deleteFromContent, setDeleteFromContent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch action modals/popovers
  const [showBatchMergeModal, setShowBatchMergeModal] = useState(false);
  const [batchMergeTargetTag, setBatchMergeTargetTag] = useState('');
  const [batchMergeUpdateContent, setBatchMergeUpdateContent] = useState(true);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleteFromContent, setBatchDeleteFromContent] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // New tag quick create input
  const [newTagInput, setNewTagInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (text: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setStatusMessage({ text, type });
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBatchMergeModal) {
          setShowBatchMergeModal(false);
        } else if (showBatchDeleteModal) {
          setShowBatchDeleteModal(false);
        } else if (editingTag) {
          setEditingTag(null);
        } else if (deletingTag) {
          setDeletingTag(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showBatchMergeModal, showBatchDeleteModal, editingTag, deletingTag]);

  // Aggregate tags with note mapping and usage count
  const tagData = useMemo(() => {
    const map = new Map<string, { tag: string; notes: Note[]; count: number }>();

    for (const note of notes) {
      if (note.trashed) continue;
      for (const rawTag of note.tags || []) {
        const clean = normalizeTag(rawTag);
        if (!clean) continue;
        const lower = clean.toLowerCase();

        if (!map.has(lower)) {
          map.set(lower, { tag: clean, notes: [], count: 0 });
        }
        const item = map.get(lower)!;
        item.count++;
        if (!item.notes.some((n) => n.id === note.id)) {
          item.notes.push(note);
        }
      }
    }

    return Array.from(map.values());
  }, [notes]);

  // Folder lookup map
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  // Discrepancy analysis
  const discrepancies = useMemo(() => {
    return detectTagDiscrepancies(notes);
  }, [notes]);

  // Filtered and sorted tag items
  const filteredTags = useMemo(() => {
    let list = [...tagData];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
      list = list.filter((item) => item.tag.toLowerCase().includes(q));
    }

    // Category filter
    if (filterCategory === 'single') {
      list = list.filter((item) => item.count === 1);
    } else if (filterCategory === 'multi') {
      list = list.filter((item) => item.count > 1);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortOption) {
        case 'count-desc':
          return b.count - a.count || a.tag.localeCompare(b.tag);
        case 'count-asc':
          return a.count - b.count || a.tag.localeCompare(b.tag);
        case 'alpha-asc':
          return a.tag.localeCompare(b.tag);
        case 'alpha-desc':
          return b.tag.localeCompare(a.tag);
        default:
          return b.count - a.count;
      }
    });

    return list;
  }, [tagData, searchQuery, filterCategory, sortOption]);

  const totalTagsCount = tagData.length;
  const singleUseCount = useMemo(() => tagData.filter((t) => t.count === 1).length, [tagData]);
  const multiUseCount = useMemo(() => tagData.filter((t) => t.count > 1).length, [tagData]);
  const totalTagInstances = useMemo(() => tagData.reduce((acc, t) => acc + t.count, 0), [tagData]);

  if (!isOpen) return null;

  // Single tag rename execution
  const handleStartRename = (tag: string) => {
    setEditingTag(tag);
    setNewTagName(tag);
    setRenameUpdateContent(true);
    setDeletingTag(null);
  };

  const handleSaveRename = async (oldTag: string) => {
    const cleanNew = normalizeTag(newTagName);
    if (!cleanNew) {
      showStatus('Tag name cannot be empty', 'warning');
      return;
    }
    if (cleanNew.toLowerCase() === oldTag.toLowerCase()) {
      setEditingTag(null);
      return;
    }

    setIsRenaming(true);
    try {
      const result = await onRenameTag(oldTag, cleanNew, renameUpdateContent);
      showStatus(`Renamed #${oldTag} to #${cleanNew} across ${result.updatedCount} note(s)`);
      setEditingTag(null);
      // Clean selection
      setSelectedTags((prev) => prev.filter((t) => t.toLowerCase() !== oldTag.toLowerCase()));
    } catch (err) {
      showStatus(`Failed to rename tag: ${(err as Error).message}`, 'warning');
    } finally {
      setIsRenaming(false);
    }
  };

  // Single tag delete execution
  const handleStartDelete = (tag: string) => {
    setDeletingTag(tag);
    setDeleteFromContent(false);
    setEditingTag(null);
  };

  const handleConfirmDelete = async (tag: string) => {
    setIsDeleting(true);
    try {
      const result = await onDeleteTag(tag, deleteFromContent);
      showStatus(`Deleted #${tag} from ${result.updatedCount} note(s)`);
      setDeletingTag(null);
      setSelectedTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
    } catch (err) {
      showStatus(`Failed to delete tag: ${(err as Error).message}`, 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch selection handlers
  const handleToggleSelectTag = (tag: string) => {
    setSelectedTags((prev) => {
      const lower = tag.toLowerCase();
      if (prev.some((t) => t.toLowerCase() === lower)) {
        return prev.filter((t) => t.toLowerCase() !== lower);
      }
      return [...prev, tag];
    });
  };

  const handleSelectAll = () => {
    if (selectedTags.length === filteredTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(filteredTags.map((t) => t.tag));
    }
  };

  // Batch Merge execution
  const handleExecuteBatchMerge = async () => {
    const cleanTarget = normalizeTag(batchMergeTargetTag);
    if (!cleanTarget) {
      showStatus('Please enter a target tag name', 'warning');
      return;
    }
    if (selectedTags.length === 0) return;

    setIsBatchProcessing(true);
    try {
      if (onBatchMergeTags) {
        const result = await onBatchMergeTags(selectedTags, cleanTarget, batchMergeUpdateContent);
        showStatus(`Merged ${selectedTags.length} tags into #${cleanTarget} across ${result.updatedCount} note(s)`);
      } else {
        // Fallback to sequential rename
        let totalUpdated = 0;
        for (const src of selectedTags) {
          if (src.toLowerCase() !== cleanTarget.toLowerCase()) {
            const res = await onRenameTag(src, cleanTarget, batchMergeUpdateContent);
            totalUpdated += res.updatedCount;
          }
        }
        showStatus(`Merged ${selectedTags.length} tags into #${cleanTarget} (${totalUpdated} note updates)`);
      }
      setShowBatchMergeModal(false);
      setSelectedTags([]);
      setBatchMergeTargetTag('');
    } catch (err) {
      showStatus(`Failed to merge tags: ${(err as Error).message}`, 'warning');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Delete execution
  const handleExecuteBatchDelete = async () => {
    if (selectedTags.length === 0) return;

    setIsBatchProcessing(true);
    try {
      if (onBatchDeleteTags) {
        const result = await onBatchDeleteTags(selectedTags, batchDeleteFromContent);
        showStatus(`Deleted ${selectedTags.length} tags from ${result.updatedCount} note(s)`);
      } else {
        let totalUpdated = 0;
        for (const tag of selectedTags) {
          const res = await onDeleteTag(tag, batchDeleteFromContent);
          totalUpdated += res.updatedCount;
        }
        showStatus(`Deleted ${selectedTags.length} tags from notes`);
      }
      setShowBatchDeleteModal(false);
      setSelectedTags([]);
    } catch (err) {
      showStatus(`Failed to delete tags: ${(err as Error).message}`, 'warning');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Quick merge for detected case discrepancies
  const handleQuickMergeCase = async (canonical: string, variants: string[]) => {
    const sources = variants.filter((v) => v !== canonical);
    if (sources.length === 0) return;

    try {
      if (onBatchMergeTags) {
        const res = await onBatchMergeTags(sources, canonical, true);
        showStatus(`Merged case variations into #${canonical} (${res.updatedCount} notes updated)`);
      } else {
        for (const src of sources) {
          await onRenameTag(src, canonical, true);
        }
        showStatus(`Merged case variations into #${canonical}`);
      }
    } catch (err) {
      showStatus(`Error merging case variations: ${(err as Error).message}`, 'warning');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-manager-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tag-manager-title" className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Tag Manager</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold border border-stone-200 dark:border-stone-700">
                  {totalTagsCount} unique {totalTagsCount === 1 ? 'tag' : 'tags'}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
                Rename, merge, delete, and clean up tags across your entire knowledge vault
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b transition-all ${
              statusMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:opacity-75"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toolbar & Filter Controls */}
        <div className="p-4 sm:px-6 bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags by name..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750'
                }`}
              >
                All ({totalTagsCount})
              </button>
              <button
                onClick={() => setFilterCategory('single')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCategory === 'single'
                    ? 'bg-amber-600 dark:bg-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750'
                }`}
                title="Tags attached to exactly 1 note (often good candidates for cleanup or merging)"
              >
                Single-use ({singleUseCount})
              </button>
              <button
                onClick={() => setFilterCategory('multi')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCategory === 'multi'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750'
                }`}
              >
                Multi-use ({multiUseCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 text-stone-400 pointer-events-none" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 appearance-none cursor-pointer"
                  aria-label="Sort tags"
                >
                  <option value="count-desc">Most Notes</option>
                  <option value="count-asc">Fewest Notes</option>
                  <option value="alpha-asc">Name (A → Z)</option>
                  <option value="alpha-desc">Name (Z → A)</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedTags.length > 0 && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 rounded-xl flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  {selectedTags.length} {selectedTags.length === 1 ? 'tag' : 'tags'} selected
                </span>
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-[11px] underline text-amber-800 dark:text-amber-300 hover:text-amber-950"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBatchMergeTargetTag(selectedTags[0] || '');
                    setBatchMergeUpdateContent(true);
                    setShowBatchMergeModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <Merge className="w-3.5 h-3.5" />
                  <span>Merge Selected ({selectedTags.length})</span>
                </button>

                <button
                  onClick={() => {
                    setBatchDeleteFromContent(false);
                    setShowBatchDeleteModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* Tag Health / Case Discrepancies Alert */}
          {discrepancies.caseDiscrepancies.length > 0 && (
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-sky-900 dark:text-sky-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Clean-up recommendation:</strong> Found {discrepancies.caseDiscrepancies.length} tag case variation(s) (e.g. {discrepancies.caseDiscrepancies.slice(0, 2).map((d) => d.variants.join(' vs ')).join(', ')}).
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {discrepancies.caseDiscrepancies.slice(0, 2).map((disc) => (
                  <button
                    key={disc.canonical}
                    onClick={() => handleQuickMergeCase(disc.canonical, disc.variants)}
                    className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition-colors"
                  >
                    Unify #{disc.canonical}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-2">
          {/* Header Row / Select All Checkbox */}
          {filteredTags.length > 0 && (
            <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  {selectedTags.length > 0 && selectedTags.length === filteredTags.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  ) : selectedTags.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600 opacity-60" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span>Select All ({filteredTags.length})</span>
                </button>
              </div>
              <span>Usage & Actions</span>
            </div>
          )}

          {/* Empty State */}
          {filteredTags.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-stone-300 dark:border-stone-800 rounded-2xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {searchQuery ? `No tags found matching "${searchQuery}"` : 'No tags in your vault yet'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'Try checking for typos or clear your search query.'
                  : 'Add tags using #hashtag in your notes or note editors to organize and manage them here.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* List of Tags */}
          {filteredTags.map((item) => {
            const isSelected = selectedTags.some((t) => t.toLowerCase() === item.tag.toLowerCase());
            const isExpanded = expandedTag === item.tag;
            const isEditing = editingTag === item.tag;
            const isDeletingThis = deletingTag === item.tag;
            const alreadyExists = tagData.some(
              (t) => t.tag.toLowerCase() === newTagName.trim().toLowerCase() && t.tag.toLowerCase() !== item.tag.toLowerCase()
            );

            return (
              <div
                key={item.tag}
                className={`border rounded-xl transition-all ${
                  isSelected
                    ? 'border-amber-400 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Standard / Rename / Delete View Row */}
                <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Left: Checkbox + Tag Name + Notes Count */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectTag(item.tag)}
                      className="p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0"
                      aria-label={`Select tag #${item.tag}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600 fill-amber-100 dark:fill-amber-950" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {isEditing ? (
                      /* Inline Rename Form */
                      <div className="flex-1 space-y-2 py-1">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-sm">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-stone-400 font-bold">
                              #
                            </span>
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveRename(item.tag);
                                }
                              }}
                              className="w-full pl-6 pr-3 py-1.5 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 border border-amber-500 font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              autoFocus
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isRenaming}
                            onClick={() => handleSaveRename(item.tag)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isRenaming ? 'Saving...' : 'Rename'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingTag(null)}
                            className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-300 dark:hover:bg-stone-700"
                          >
                            Cancel
                          </button>
                        </div>

                        {alreadyExists && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Tag #{newTagName.trim()} already exists. Renaming will merge #{item.tag} into #{newTagName.trim()} across all notes.
                            </span>
                          </div>
                        )}

                        <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={renameUpdateContent}
                            onChange={(e) => setRenameUpdateContent(e.target.checked)}
                            className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span>Also replace #{item.tag} in note body text, titles, and checklists</span>
                        </label>
                      </div>
                    ) : isDeletingThis ? (
                      /* Inline Delete Confirmation */
                      <div className="flex-1 space-y-2 py-1">
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Delete tag #{item.tag} from all {item.count} note(s)?</span>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={deleteFromContent}
                            onChange={(e) => setDeleteFromContent(e.target.checked)}
                            className="rounded border-stone-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                          />
                          <span>Also strip inline #{item.tag} text from note body</span>
                        </label>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleConfirmDelete(item.tag)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingTag(null)}
                            className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-300 dark:hover:bg-stone-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Tag View */
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExpandedTag(isExpanded ? null : item.tag)}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                          <span className="text-amber-500">#</span>
                          <span className="truncate max-w-[200px] sm:max-w-xs">{item.tag}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                          )}
                        </button>

                        <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                          {item.count} {item.count === 1 ? 'note' : 'notes'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions (Rename, Delete, Filter in Vault) */}
                  {!isEditing && !isDeletingThis && (
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                      {onSelectTagFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTagFilter(item.tag);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-xs inline-flex items-center gap-1"
                          title="Filter vault by this tag"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">View</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartRename(item.tag)}
                        className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors text-xs inline-flex items-center gap-1"
                        title="Rename this tag across all notes"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Rename</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartDelete(item.tag)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-xs inline-flex items-center gap-1"
                        title="Delete this tag from all notes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible Notes Preview List */}
                {isExpanded && (
                  <div className="border-t border-stone-200 dark:border-stone-800 p-3 bg-stone-50/80 dark:bg-stone-900/60 rounded-b-xl space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                    <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Notes tagged with #{item.tag} ({item.notes.length})</span>
                      <span className="text-[10px] lowercase font-normal">Click note to open</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {item.notes.map((note) => {
                        const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
                        return (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => {
                              if (onOpenNote) {
                                onOpenNote(note.id, note.title);
                                onClose();
                              }
                            }}
                            className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-left hover:border-amber-500 dark:hover:border-amber-500 transition-colors flex items-center justify-between gap-2 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                {note.title || 'Untitled Note'}
                              </div>
                              <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate flex items-center gap-1.5 mt-0.5">
                                {folder && (
                                  <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400">
                                    <FolderIcon
                                      className="w-2.5 h-2.5 shrink-0"
                                      style={{ color: folder.color || '#f59e0b' }}
                                    />
                                    <span>{folder.name}</span>
                                  </span>
                                )}
                                <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-stone-300 dark:text-stone-600 group-hover:text-amber-500 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
            <span>
              {totalTagsCount} tags total • {totalTagInstances} tags across notes
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Batch Merge Dialog Modal */}
      {showBatchMergeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl p-5 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Merge className="w-4 h-4 text-amber-600" />
                <span>Merge {selectedTags.length} Tags</span>
              </h3>
              <button
                onClick={() => setShowBatchMergeModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Combine all selected tags ({selectedTags.map((t) => `#${t}`).join(', ')}) into a single unified tag across all notes.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Target Tag Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-stone-400 font-bold">
                  #
                </span>
                <input
                  type="text"
                  value={batchMergeTargetTag}
                  onChange={(e) => setBatchMergeTargetTag(e.target.value)}
                  placeholder="unified-tag-name"
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={batchMergeUpdateContent}
                onChange={(e) => setBatchMergeUpdateContent(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Also replace inline #hashtags in note text</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchMergeModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchProcessing || !batchMergeTargetTag.trim()}
                onClick={handleExecuteBatchMerge}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                {isBatchProcessing ? 'Merging...' : 'Merge Tags'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Dialog Modal */}
      {showBatchDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl p-5 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete {selectedTags.length} Tags</span>
              </h3>
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Are you sure you want to delete the following tags from all notes?
            </p>

            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded-lg bg-stone-100 dark:bg-stone-800">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-600"
                >
                  #{t}
                </span>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={batchDeleteFromContent}
                onChange={(e) => setBatchDeleteFromContent(e.target.checked)}
                className="rounded border-stone-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
              <span>Also strip inline #hashtags from note text</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleExecuteBatchDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                {isBatchProcessing ? 'Deleting...' : 'Delete Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
