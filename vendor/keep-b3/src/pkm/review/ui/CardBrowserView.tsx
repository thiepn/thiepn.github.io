import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  FileText,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Edit3,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { ReviewCard, CardScheduleState, ReviewState } from '../reviewTypes';
import { cardIndex } from '../cardIndex';
import { reviewStorageService } from '../reviewStorageService';
import { reviewService } from '../reviewService';
import { formatInterval } from '../fsrsEngine';

export interface CardBrowserViewProps {
  onOpenNote: (noteId: string, line?: number) => void;
}

export const CardBrowserView: React.FC<CardBrowserViewProps> = ({ onOpenNote }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const allCards = useMemo(() => cardIndex.getAllCards(), []);
  const allStates = useMemo(() => reviewStorageService.getAllCardStates(), []);

  // Compute available folders and tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const card of allCards) {
      for (const t of card.tags) {
        tags.add(t.replace(/^#/, ''));
      }
    }
    return Array.from(tags).sort();
  }, [allCards]);

  const filteredCards = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const q = searchQuery.toLowerCase().trim();

    return allCards.filter((card) => {
      const state = allStates.get(card.id) || reviewStorageService.getCardState(card.id);

      // Search query filter
      if (q) {
        const matchesPrompt = card.prompt.toLowerCase().includes(q);
        const matchesAnswer = card.answer.toLowerCase().includes(q);
        const matchesNote = card.sourceNoteTitle.toLowerCase().includes(q);
        const matchesTags = card.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesPrompt && !matchesAnswer && !matchesNote && !matchesTags) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'due') {
        if (state.suspended) return false;
        const isDue =
          state.state === 'learning' ||
          state.state === 'relearning' ||
          (state.state === 'review' && (new Date(state.due) <= now || state.due.slice(0, 10) <= todayStr));
        if (!isDue) return false;
      } else if (statusFilter === 'new') {
        if (state.suspended || state.state !== 'new') return false;
      } else if (statusFilter === 'learning') {
        if (state.suspended || (state.state !== 'learning' && state.state !== 'relearning')) return false;
      } else if (statusFilter === 'review') {
        if (state.suspended || state.state !== 'review') return false;
      } else if (statusFilter === 'suspended') {
        if (!state.suspended) return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        const hasTag = card.tags.some((t) => t.replace(/^#/, '').toLowerCase() === selectedTag.toLowerCase());
        if (!hasTag) return false;
      }

      return true;
    });
  }, [allCards, allStates, searchQuery, statusFilter, selectedTag]);

  const handleSelectAll = useCallback(() => {
    if (selectedCardIds.size === filteredCards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCards.map((c) => c.id)));
    }
  }, [filteredCards, selectedCardIds.size]);

  const handleToggleSelect = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const handleBulkSuspend = useCallback(async () => {
    for (const id of selectedCardIds) {
      await reviewStorageService.setCardSuspended(id, true);
    }
    setSelectedCardIds(new Set());
  }, [selectedCardIds]);

  const handleBulkUnsuspend = useCallback(async () => {
    for (const id of selectedCardIds) {
      await reviewStorageService.setCardSuspended(id, false);
    }
    setSelectedCardIds(new Set());
  }, [selectedCardIds]);

  const handleBulkReset = useCallback(async () => {
    await reviewStorageService.resetMultipleCards(Array.from(selectedCardIds));
    setSelectedCardIds(new Set());
  }, [selectedCardIds]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search card prompt, answer, or note title..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">All States</option>
            <option value="due">Due for Review</option>
            <option value="new">New Cards</option>
            <option value="learning">Learning</option>
            <option value="review">Mature Review</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="all">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedCardIds.size > 0 && (
        <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs">
          <span className="text-neutral-600 dark:text-neutral-300 font-medium">
            {selectedCardIds.size} card{selectedCardIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkSuspend}
              className="px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50"
            >
              Suspend Selected
            </button>
            <button
              onClick={handleBulkUnsuspend}
              className="px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50"
            >
              Unsuspend Selected
            </button>
            <button
              onClick={handleBulkReset}
              className="px-2 py-1 bg-white dark:bg-neutral-700 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Reset Progress
            </button>
          </div>
        </div>
      )}

      {/* Cards Table List */}
      <div className="flex-1 overflow-y-auto">
        {filteredCards.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">
            No cards match your filter criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400">
                <th className="p-3 w-8">
                  <button onClick={handleSelectAll}>
                    {selectedCardIds.size === filteredCards.length && filteredCards.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 font-medium">Prompt</th>
                <th className="p-3 font-medium">Answer</th>
                <th className="p-3 font-medium">Source Note</th>
                <th className="p-3 font-medium">State</th>
                <th className="p-3 font-medium">Interval</th>
                <th className="p-3 font-medium">Due Date</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredCards.map((card) => {
                const state = allStates.get(card.id) || reviewStorageService.getCardState(card.id);
                const isSelected = selectedCardIds.has(card.id);

                let stateBadgeColor = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
                if (state.suspended) {
                  stateBadgeColor = 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400';
                } else if (state.state === 'new') {
                  stateBadgeColor = 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400';
                } else if (state.state === 'learning' || state.state === 'relearning') {
                  stateBadgeColor = 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400';
                } else if (state.state === 'review') {
                  stateBadgeColor = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400';
                }

                return (
                  <tr
                    key={card.id}
                    className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${
                      isSelected ? 'bg-neutral-50 dark:bg-neutral-800/30' : ''
                    }`}
                  >
                    <td className="p-3">
                      <button onClick={() => handleToggleSelect(card.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    </td>

                    <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100 max-w-[200px] truncate" title={card.prompt}>
                      {card.prompt}
                    </td>

                    <td className="p-3 text-neutral-600 dark:text-neutral-400 max-w-[180px] truncate" title={card.answer}>
                      {card.answer}
                    </td>

                    <td className="p-3 text-neutral-600 dark:text-neutral-400 max-w-[140px] truncate">
                      <button
                        onClick={() => onOpenNote(card.sourceNoteId, card.sourceLine)}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{card.sourceNoteTitle}</span>
                      </button>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${stateBadgeColor}`}>
                        {state.suspended ? 'Suspended' : state.state.toUpperCase()}
                      </span>
                    </td>

                    <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono">
                      {formatInterval(state.scheduledDays || 0)}
                    </td>

                    <td className="p-3 text-neutral-500 dark:text-neutral-400">
                      {state.state === 'new' ? '—' : state.due ? state.due.slice(0, 10) : '—'}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onOpenNote(card.sourceNoteId, card.sourceLine)}
                          title="Open note in editor"
                          className="p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => reviewService.toggleCardSuspension(card.id)}
                          title={state.suspended ? 'Unsuspend' : 'Suspend'}
                          className="p-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          {state.suspended ? (
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <PauseCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => reviewService.resetCardProgress(card.id)}
                          title="Reset progress to new"
                          className="p-1 text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="p-3 bg-neutral-50/50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
        <span>Showing {filteredCards.length} of {allCards.length} cards</span>
      </div>
    </div>
  );
};
