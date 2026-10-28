import React, { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import {
  Search,
  Zap,
  Sparkles,
  Type,
  Folder as FolderIcon,
  Tag as TagIcon,
  Clock,
  Sliders,
  X,
  ArrowRight,
  SplitSquareVertical,
  CheckCircle2,
  RefreshCw,
  Cpu,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';
import { Note, Folder } from '../../../types';
import {
  HybridSearchResult,
  SearchMode,
  SemanticModelStatus,
  SearchFilterOptions,
} from '../searchTypes';
import { semanticSearchService } from '../semanticSearchService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string, title?: string, options?: { split?: boolean }) => void;
  initialQuery?: string;
  initialMode?: SearchMode;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onOpenNote,
  initialQuery = '',
  initialMode = 'hybrid',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<SemanticModelStatus>(
    semanticSearchService.getModelStatus()
  );
  const [isIndexingVault, setIsIndexingVault] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [isPending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial query
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Subscribe to model status
  useEffect(() => {
    const unsubscribe = semanticSearchService.onStatusChange((status) => {
      setModelStatus(status);
    });
    return unsubscribe;
  }, []);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const n of notes) {
      if (!n.trashed && n.tags) {
        n.tags.forEach((t) => tagsSet.add(t));
      }
    }
    return Array.from(tagsSet).sort();
  }, [notes]);

  // Execute search when query or filters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const filterOpts: SearchFilterOptions = {
          mode,
          folderId: selectedFolderId,
          tag: selectedTag || undefined,
          limit: 40,
        };

        const searchResults = await semanticSearchService.search(
          query,
          notes,
          folders,
          filterOpts
        );

        if (isMounted) {
          startTransition(() => {
            setResults(searchResults);
            setSelectedIndex(0);
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.warn('Search execution failed:', err);
        if (isMounted) setIsLoading(false);
      }
    }, 80); // Fast 80ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, mode, selectedFolderId, selectedTag, notes, folders, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        const item = results[selectedIndex];
        onOpenNote(item.noteId, item.note.title, { split: e.shiftKey });
        onClose();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle search modes
      if (mode === 'hybrid') setMode('exact');
      else if (mode === 'exact') setMode('semantic');
      else setMode('hybrid');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const selectedEl = resultsContainerRef.current.querySelector(
        `[data-search-index="${selectedIndex}"]`
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Trigger full vault index
  const handleReindexVault = async () => {
    setIsIndexingVault(true);
    try {
      await semanticSearchService.indexEntireVault(notes, (current, total) => {
        setIndexingProgress({ current, total });
      });
      // Re-run search
      const freshResults = await semanticSearchService.search(query, notes, folders, {
        mode,
        folderId: selectedFolderId,
        tag: selectedTag || undefined,
      });
      setResults(freshResults);
    } catch (err) {
      console.warn('Failed to reindex vault:', err);
    } finally {
      setIsIndexingVault(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/90">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-lg text-zinc-100 placeholder-zinc-500 focus:outline-hidden font-normal"
            placeholder="Search notes, concepts, tags, or topics (e.g., 'hypertension remedies', #project)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-lg border border-zinc-700/60 shrink-0 text-xs font-medium">
            <button
              onClick={() => setMode('hybrid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'hybrid'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Hybrid: combines keyword precision & AI vector similarity"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Hybrid</span>
            </button>
            <button
              onClick={() => setMode('exact')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'exact'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Exact: fast lexical keyword & title search"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Exact</span>
            </button>
            <button
              onClick={() => setMode('semantic')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                mode === 'semantic'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Semantic: pure conceptual embedding similarity"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Semantic</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-3.5 py-2 border-b border-zinc-800/60 bg-zinc-950/40 flex items-center gap-2 overflow-x-auto text-xs text-zinc-400">
          <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] shrink-0">
            Filters:
          </span>

          {/* Folder filter */}
          <select
            value={selectedFolderId || ''}
            onChange={(e) => setSelectedFolderId(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-md px-2 py-1 text-xs focus:outline-hidden"
          >
            <option value="">All Folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>

          {/* Tag filter */}
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-md px-2 py-1 text-xs focus:outline-hidden"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>

          {(selectedFolderId || selectedTag) && (
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setSelectedTag(null);
              }}
              className="text-amber-400 hover:underline text-xs flex items-center gap-1 ml-auto shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Model Download / Indexing Status Banner */}
        {(modelStatus.state === 'downloading' || isIndexingVault) && (
          <div className="px-3.5 py-2 bg-amber-950/40 border-b border-amber-800/50 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>
                {isIndexingVault
                  ? `Indexing vault embeddings: ${indexingProgress.current}/${indexingProgress.total} notes...`
                  : `Downloading on-device neural weights: ${modelStatus.progress}% (${modelStatus.device.toUpperCase()})...`}
              </span>
            </div>
            <span className="text-[10px] text-amber-400/80">Running 100% locally</span>
          </div>
        )}

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-zinc-800/40"
        >
          {isLoading ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-500" />
              <span>Searching vault...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="font-medium text-zinc-300">No matching notes found</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Try switching to <strong>Hybrid</strong> or <strong>Semantic</strong> mode to find
                conceptual matches without exact keywords.
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.noteId}
                  data-search-index={idx}
                  onClick={() => {
                    onOpenNote(item.noteId, item.note.title);
                    onClose();
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-800/90 border border-zinc-600 shadow-md'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  {/* Title & Metadata Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-zinc-100 truncate text-sm">
                        {item.note.title || 'Untitled Note'}
                      </span>

                      {/* Section / Heading badge */}
                      {item.matchedHeading && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] rounded-md truncate max-w-[150px]">
                          § {item.matchedHeading}
                        </span>
                      )}
                    </div>

                    {/* Match Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.primaryHitType === 'exact_title' && (
                        <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-[10px] font-medium rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Exact Title
                        </span>
                      )}
                      {item.primaryHitType === 'exact_phrase' && (
                        <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-700/60 text-blue-300 text-[10px] font-medium rounded-full flex items-center gap-1">
                          <Type className="w-3 h-3" /> Exact Phrase
                        </span>
                      )}
                      {item.primaryHitType === 'hybrid' && (
                        <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-700/60 text-amber-300 text-[10px] font-medium rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Hybrid Match
                        </span>
                      )}
                      {item.primaryHitType === 'semantic' && (
                        <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-700/60 text-purple-300 text-[10px] font-medium rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Semantic ({Math.round((item.semanticScore || 0) * 100)}%)
                        </span>
                      )}
                      {item.primaryHitType === 'lexical' && (
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-medium rounded-full">
                          Keyword
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contextual Excerpt */}
                  {item.topExcerpt && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-mono text-[11px] bg-zinc-950/40 p-1.5 rounded-md border border-zinc-800/60">
                      {item.topExcerpt}
                    </p>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    {item.folderName && (
                      <span className="flex items-center gap-1">
                        <FolderIcon className="w-3 h-3 text-zinc-400" />
                        <span>{item.folderName}</span>
                      </span>
                    )}

                    {item.note.tags && item.note.tags.length > 0 && (
                      <div className="flex items-center gap-1 truncate max-w-xs">
                        <TagIcon className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>{item.note.tags.map((t) => `#${t}`).join(' ')}</span>
                      </div>
                    )}

                    <span className="ml-auto flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.note.updatedAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer & Keyboard Shortcut Guide */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-sm text-[10px] text-zinc-300">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-sm text-[10px] text-zinc-300">
                ↵
              </kbd>
              <span>Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-sm text-[10px] text-zinc-300">
                ⇧↵
              </kbd>
              <span>Split View</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-sm text-[10px] text-zinc-300">
                Tab
              </kbd>
              <span>Switch Mode</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReindexVault}
              disabled={isIndexingVault}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 text-xs transition-colors disabled:opacity-50"
              title="Rebuild on-device vector embeddings for all notes"
            >
              <RefreshCw className={`w-3 h-3 ${isIndexingVault ? 'animate-spin' : ''}`} />
              <span>Re-index Vault</span>
            </button>

            <span className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
              <Cpu className="w-3 h-3 text-zinc-400" />
              <span>{modelStatus.device.toUpperCase()} On-Device</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
