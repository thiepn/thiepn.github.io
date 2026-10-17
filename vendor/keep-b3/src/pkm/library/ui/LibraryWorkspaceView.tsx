import React, { useState, useMemo, useEffect } from 'react';
import {
  Book,
  BookOpen,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Upload,
  Download,
  GitMerge,
  Clock,
  Highlighter,
  FileText,
  ChevronDown,
  Sparkles,
  Inbox,
  Bookmark,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  LibraryItem,
  LibraryItemType,
  LibraryStatus,
  LibrarySortField,
  LibrarySortDirection,
  SourceHighlight,
  LibraryDuplicateCandidate,
} from '../libraryTypes';
import { libraryService } from '../libraryService';
import { libraryHighlightService } from '../libraryHighlightService';
import { LibraryExportService } from '../libraryExport';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryItemTableView } from './LibraryItemTableView';
import { LibraryHighlightsView } from './LibraryHighlightsView';
import { LibraryItemFormModal } from './LibraryItemFormModal';
import { LibraryItemDetailModal } from './LibraryItemDetailModal';
import { LibraryReaderModal } from './LibraryReaderModal';
import { LibrarySessionModal } from './LibrarySessionModal';
import { LibraryMergeModal } from './LibraryMergeModal';
import { useWorkspace } from '../../WorkspaceContext';

export interface LibraryWorkspaceViewProps {
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string, content: string, tags?: string[]) => void;
}

export const LibraryWorkspaceView: React.FC<LibraryWorkspaceViewProps> = ({
  onOpenNote,
  onCreateNote,
}) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'in-progress' | 'queued' | 'finished' | 'highlights'>('in-progress');
  const [selectedType, setSelectedType] = useState<LibraryItemType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');
  const [sortField, setSortField] = useState<LibrarySortField>('updated');
  const [sortDir, setSortDir] = useState<LibrarySortDirection>('desc');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<LibraryItem | undefined>(undefined);
  const [detailItem, setDetailItem] = useState<LibraryItem | null>(null);
  const [readerItem, setReaderItem] = useState<LibraryItem | null>(null);
  const [sessionItem, setSessionItem] = useState<LibraryItem | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<LibraryDuplicateCandidate[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  const refreshItems = () => {
    const loaded = libraryService.getItems();
    setItems([...loaded]);
  };

  useEffect(() => {
    refreshItems();
  }, []);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    const statusFilter = activeTab === 'all' || activeTab === 'highlights' ? undefined : (activeTab as LibraryStatus);

    return libraryService.getItems(
      {
        query: searchQuery,
        type: selectedType,
        status: statusFilter,
      },
      sortField,
      sortDir
    );
  }, [items, searchQuery, activeTab, selectedType, sortField, sortDir]);

  // Status counts
  const counts = useMemo(() => {
    const all = libraryService.getItems();
    return {
      all: all.length,
      inbox: all.filter((i) => i.status === 'inbox').length,
      inProgress: all.filter((i) => i.status === 'in-progress').length,
      queued: all.filter((i) => i.status === 'queued').length,
      finished: all.filter((i) => i.status === 'finished').length,
    };
  }, [items]);

  const handleOpenDetail = (item: LibraryItem) => {
    setDetailItem(item);
  };

  const handleOpenReader = (item: LibraryItem) => {
    setReaderItem(item);
  };

  const handleOpenSession = (item: LibraryItem) => {
    setSessionItem(item);
  };

  const handleEditItem = (item: LibraryItem) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    libraryService.removeItem(id);
    refreshItems();
    if (detailItem?.id === id) setDetailItem(null);
  };

  const handleCheckDuplicates = () => {
    const dups = libraryService.findDuplicateCandidates();
    setDuplicateCandidates(dups);
    if (dups.length > 0) {
      setIsMergeModalOpen(true);
    } else {
      alert('No duplicate library items found!');
    }
  };

  const handleExportCsv = () => {
    const csv = LibraryExportService.exportToCsv(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const imported = LibraryExportService.importFromCsv(text);
        for (const item of imported) {
          if (item.title) {
            libraryService.createItem({
              type: item.type || 'book',
              title: item.title,
              creators: item.creators,
              status: item.status || 'inbox',
              metadata: item.metadata,
            });
          }
        }
        refreshItems();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Workspace Header */}
      <header className="p-4 md:px-6 md:py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Library & Reading
              </h1>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Books, articles, papers, media, unified highlights & reading progress
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckDuplicates}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300"
              title="Detect and merge duplicate items"
            >
              <GitMerge className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Duplicates</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300"
              title="Export Library to CSV"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <label className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 text-stone-700 dark:text-stone-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => {
                setItemToEdit(undefined);
                setIsFormOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Tab Strip: Status Queues */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 gap-4 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('in-progress')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'in-progress'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>In Progress</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
              {counts.inProgress}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queued')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'queued'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {counts.queued}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Inbox</span>
            {counts.inbox > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                {counts.inbox}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finished')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'finished'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Finished</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {counts.finished}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>All Items</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'highlights'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>Highlights & Excerpts</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* If Highlights Tab is selected */}
        {activeTab === 'highlights' ? (
          <LibraryHighlightsView
            items={items}
            onCreateNoteFromHighlight={(hl, parentItem) => {
              const { title, content, tags } = libraryHighlightService.generateAtomicNoteFromHighlight(
                hl,
                parentItem
              );
              if (onCreateNote) onCreateNote(title, content, tags);
            }}
            onOpenItemDetail={handleOpenDetail}
          />
        ) : (
          <>
            {/* Search, Filter & View Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs flex-1 min-w-[220px] shadow-xs">
                <Search className="w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search library by title, author, ISBN, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                />
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-1 text-xs">
                {(['all', 'book', 'article', 'paper', 'video', 'podcast', 'web'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition-colors ${
                        selectedType === t
                          ? 'bg-amber-500 text-stone-900 font-bold'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>

              {/* View Switcher: Gallery vs Table */}
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('gallery')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'gallery'
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                  title="Gallery View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'table'
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Feed */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-white/40 dark:bg-stone-900/40">
                <Book className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                  No items in this view
                </h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Add physical books, import EPUBs / PDFs, or log articles to organize your reading and learning.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setItemToEdit(undefined);
                    setIsFormOpen(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold"
                >
                  Add Your First Item
                </button>
              </div>
            ) : viewMode === 'gallery' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <LibraryItemCard
                    key={item.id}
                    item={item}
                    onOpenDetail={handleOpenDetail}
                    onOpenReader={handleOpenReader}
                    onOpenNote={onOpenNote}
                    onLogSession={handleOpenSession}
                  />
                ))}
              </div>
            ) : (
              <LibraryItemTableView
                items={filteredItems}
                sortField={sortField}
                sortDir={sortDir}
                onSortChange={(field) => {
                  if (sortField === field) {
                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(field);
                    setSortDir('asc');
                  }
                }}
                onOpenDetail={handleOpenDetail}
                onOpenReader={handleOpenReader}
                onOpenNote={onOpenNote}
                onLogSession={handleOpenSession}
              />
            )}
          </>
        )}
      </div>

      {/* Sub-Modals */}
      {isFormOpen && (
        <LibraryItemFormModal
          isOpen={isFormOpen}
          itemToEdit={itemToEdit}
          onClose={() => {
            setIsFormOpen(false);
            setItemToEdit(undefined);
          }}
          onSave={(saved) => {
            refreshItems();
            if (detailItem?.id === saved.id) setDetailItem(saved);
          }}
        />
      )}

      {detailItem && (
        <LibraryItemDetailModal
          isOpen={!!detailItem}
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={handleEditItem}
          onOpenReader={handleOpenReader}
          onOpenNote={onOpenNote}
          onCreateNote={onCreateNote}
          onDelete={handleDeleteItem}
          onItemUpdated={(updated) => {
            setDetailItem(updated);
            refreshItems();
          }}
        />
      )}

      {readerItem && (
        <LibraryReaderModal
          isOpen={!!readerItem}
          item={readerItem}
          onClose={() => setReaderItem(null)}
          onOpenNote={onOpenNote}
        />
      )}

      {sessionItem && (
        <LibrarySessionModal
          isOpen={!!sessionItem}
          item={sessionItem}
          onClose={() => setSessionItem(null)}
          onSessionLogged={() => {
            refreshItems();
            if (detailItem) {
              const refreshed = libraryService.getItem(detailItem.id);
              if (refreshed) setDetailItem(refreshed);
            }
          }}
        />
      )}

      {isMergeModalOpen && (
        <LibraryMergeModal
          isOpen={isMergeModalOpen}
          candidates={duplicateCandidates}
          onClose={() => setIsMergeModalOpen(false)}
          onMergeCompleted={() => {
            refreshItems();
          }}
        />
      )}
    </div>
  );
};
