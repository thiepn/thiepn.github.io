import React, { useState, useMemo } from 'react';
import {
  Search,
  Highlighter,
  Copy,
  FilePlus,
  BookOpen,
  Sparkles,
  Check,
  Tag,
  Filter,
  Trash2,
} from 'lucide-react';
import { SourceHighlight, LibraryItem } from '../libraryTypes';
import { libraryHighlightService } from '../libraryHighlightService';

export interface LibraryHighlightsViewProps {
  items: LibraryItem[];
  onCreateNoteFromHighlight: (highlight: SourceHighlight, item: LibraryItem) => void;
  onOpenItemDetail: (item: LibraryItem) => void;
}

export const LibraryHighlightsView: React.FC<LibraryHighlightsViewProps> = ({
  items,
  onCreateNoteFromHighlight,
  onOpenItemDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const allHighlights = useMemo(() => {
    return libraryHighlightService.getAllHighlights(items);
  }, [items]);

  const filteredHighlights = useMemo(() => {
    return allHighlights.filter((hl) => {
      const parentItem = itemMap.get(hl.libraryItemId);
      if (!parentItem) return false;

      if (selectedSourceType !== 'all' && hl.sourceType !== selectedSourceType) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText = hl.text.toLowerCase().includes(q);
        const matchesAnnotation = hl.annotation?.toLowerCase().includes(q);
        const matchesTitle = parentItem.title.toLowerCase().includes(q);
        const matchesTags = hl.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesText && !matchesAnnotation && !matchesTitle && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [allHighlights, selectedSourceType, searchQuery, itemMap]);

  const handleCopyQuote = (hl: SourceHighlight) => {
    const parentItem = itemMap.get(hl.libraryItemId);
    if (!parentItem) return;

    const formatted = libraryHighlightService.formatQuoteWithProvenance(hl, parentItem);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedId(hl.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'green':
        return 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20';
      case 'blue':
        return 'border-sky-400 bg-sky-50/50 dark:bg-sky-950/20';
      case 'pink':
        return 'border-pink-400 bg-pink-50/50 dark:bg-pink-950/20';
      case 'purple':
        return 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/20';
      case 'yellow':
      default:
        return 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search highlights, quotes, annotations, and sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent border-none focus:outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Source:</span>
          <select
            value={selectedSourceType}
            onChange={(e) => setSelectedSourceType(e.target.value)}
            className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-lg px-2.5 py-1.5 border-none focus:ring-1 focus:ring-amber-500 font-medium"
          >
            <option value="all">All Sources</option>
            <option value="epub">EPUB</option>
            <option value="pdf">PDF</option>
            <option value="web">Web Article</option>
            <option value="manual">Manual / Book</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
        </div>
      </div>

      {/* Highlights Feed */}
      {filteredHighlights.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-900/50">
          <Highlighter className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
            No highlights found
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Read EPUBs, PDFs, or add manual quotes to your library items to capture excerpts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHighlights.map((hl) => {
            const parentItem = itemMap.get(hl.libraryItemId);
            if (!parentItem) return null;

            return (
              <div
                key={hl.id}
                className={`border-l-4 rounded-r-xl border-y border-r border-stone-200 dark:border-stone-800 p-4 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between transition-all hover:shadow ${getColorClasses(
                  hl.color
                )}`}
              >
                <div>
                  {/* Quote content */}
                  <blockquote className="text-xs text-stone-900 dark:text-stone-100 italic leading-relaxed mb-3">
                    "{hl.text}"
                  </blockquote>

                  {/* Personal Annotation if any */}
                  {hl.annotation && (
                    <div className="mb-3 p-2 bg-white/80 dark:bg-stone-800/80 rounded-lg text-xs text-stone-700 dark:text-stone-300 font-medium border border-stone-200/60 dark:border-stone-700/60">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 mr-1">
                        Note:
                      </span>
                      {hl.annotation}
                    </div>
                  )}

                  {/* Provenance Footer */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    <button
                      type="button"
                      onClick={() => onOpenItemDetail(parentItem)}
                      className="font-semibold text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1 text-left"
                    >
                      {parentItem.title}
                    </button>
                    <span className="font-mono text-[10px] shrink-0 ml-2">
                      {hl.locator.locationText || (hl.locator.page ? `p. ${hl.locator.page}` : hl.sourceType)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/60">
                  <button
                    type="button"
                    onClick={() => handleCopyQuote(hl)}
                    className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1"
                    title="Copy formatted quote with citation"
                  >
                    {copiedId === hl.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === hl.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateNoteFromHighlight(hl, parentItem)}
                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-semibold flex items-center gap-1 border border-amber-200 dark:border-amber-900"
                    title="Create atomic canonical note from highlight"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Create Note</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
