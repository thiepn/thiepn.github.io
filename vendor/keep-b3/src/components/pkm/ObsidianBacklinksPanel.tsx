import React, { useState, useMemo } from 'react';
import {
  Link2,
  Unlink,
  ExternalLink,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder as FolderIcon,
  Check,
  FileText,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Layers,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  findLinkedMentionsForNote,
  findUnlinkedMentionsForNote,
  convertUnlinkedMentionToLink,
  convertAllUnlinkedMentionsInNote,
  getOutgoingLinks,
  LinkedMentionGroup,
  UnlinkedMentionGroup,
  OutgoingLinkItem,
} from '../../utils/obsidianLinks';

export interface ObsidianBacklinksPanelProps {
  currentNote: Note;
  allNotes: Note[];
  folders?: Folder[];
  onOpenNote?: (noteId: string) => void;
  onOpenInSplit?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
  onUpdateNote?: (updatedNote: Note) => void;
  isCompact?: boolean;
}

type TabType = 'linked' | 'unlinked' | 'outgoing';
type SortOption = 'title-asc' | 'title-desc' | 'mentions-desc' | 'recent';

export const ObsidianBacklinksPanel: React.FC<ObsidianBacklinksPanelProps> = ({
  currentNote,
  allNotes,
  folders = [],
  onOpenNote,
  onOpenInSplit,
  onCreateNote,
  onUpdateNote,
  isCompact = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('linked');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('title-asc');
  const [showContext, setShowContext] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [linkedSuccessToast, setLinkedSuccessToast] = useState<string | null>(null);

  // 1. Linked Mentions
  const linkedGroups = useMemo(() => {
    return findLinkedMentionsForNote(currentNote, allNotes, folders);
  }, [currentNote, allNotes, folders]);

  // 2. Unlinked Mentions
  const unlinkedGroups = useMemo(() => {
    return findUnlinkedMentionsForNote(currentNote, allNotes, folders);
  }, [currentNote, allNotes, folders]);

  // 3. Outgoing Links
  const outgoingLinks = useMemo(() => {
    return getOutgoingLinks(currentNote, allNotes);
  }, [currentNote, allNotes]);

  // Count totals
  const totalLinkedOccurrences = useMemo(
    () => linkedGroups.reduce((acc, g) => acc + g.occurrences.length, 0),
    [linkedGroups]
  );
  const totalUnlinkedOccurrences = useMemo(
    () => unlinkedGroups.reduce((acc, g) => acc + g.occurrences.length, 0),
    [unlinkedGroups]
  );
  const unresolvedOutgoing = useMemo(
    () => outgoingLinks.filter((l) => !l.isResolved),
    [outgoingLinks]
  );
  const resolvedOutgoing = useMemo(
    () => outgoingLinks.filter((l) => l.isResolved),
    [outgoingLinks]
  );

  // Filter & Sort Linked Mentions
  const filteredLinkedGroups = useMemo(() => {
    let list = [...linkedGroups];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.sourceNote.title.toLowerCase().includes(q) ||
          g.occurrences.some((occ) => occ.lineContent.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOption === 'title-asc') {
        return a.sourceNote.title.localeCompare(b.sourceNote.title);
      } else if (sortOption === 'title-desc') {
        return b.sourceNote.title.localeCompare(a.sourceNote.title);
      } else if (sortOption === 'mentions-desc') {
        return b.occurrences.length - a.occurrences.length;
      } else {
        return (
          new Date(b.sourceNote.updatedAt || 0).getTime() -
          new Date(a.sourceNote.updatedAt || 0).getTime()
        );
      }
    });

    return list;
  }, [linkedGroups, searchQuery, sortOption]);

  // Filter & Sort Unlinked Mentions
  const filteredUnlinkedGroups = useMemo(() => {
    let list = [...unlinkedGroups];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.sourceNote.title.toLowerCase().includes(q) ||
          g.occurrences.some((occ) => occ.lineContent.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOption === 'title-asc') {
        return a.sourceNote.title.localeCompare(b.sourceNote.title);
      } else if (sortOption === 'title-desc') {
        return b.sourceNote.title.localeCompare(a.sourceNote.title);
      } else if (sortOption === 'mentions-desc') {
        return b.occurrences.length - a.occurrences.length;
      } else {
        return (
          new Date(b.sourceNote.updatedAt || 0).getTime() -
          new Date(a.sourceNote.updatedAt || 0).getTime()
        );
      }
    });

    return list;
  }, [unlinkedGroups, searchQuery, sortOption]);

  // Filter Outgoing Links
  const filteredOutgoing = useMemo(() => {
    if (!searchQuery.trim()) return outgoingLinks;
    const q = searchQuery.toLowerCase();
    return outgoingLinks.filter(
      (l) =>
        l.targetTitle.toLowerCase().includes(q) ||
        (l.alias && l.alias.toLowerCase().includes(q)) ||
        (l.targetHeading && l.targetHeading.toLowerCase().includes(q))
    );
  }, [outgoingLinks, searchQuery]);

  // Toggle expand for a note group
  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isGroupExpanded = (id: string) => {
    return expandedGroups[id] !== false; // default expanded
  };

  const expandAll = () => {
    setExpandedGroups({});
  };

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    for (const g of linkedGroups) collapsed[g.sourceNote.id] = false;
    for (const g of unlinkedGroups) collapsed[g.sourceNote.id] = false;
    setExpandedGroups(collapsed);
  };

  // Convert single unlinked mention to link
  const handleLinkSingle = (group: UnlinkedMentionGroup, occ: any) => {
    if (!onUpdateNote) return;
    const updated = convertUnlinkedMentionToLink(group.sourceNote, currentNote, occ);
    onUpdateNote(updated);

    setLinkedSuccessToast(`Linked mention in "${group.sourceNote.title}"`);
    setTimeout(() => setLinkedSuccessToast(null), 2500);
  };

  // Convert all unlinked mentions in note to links
  const handleLinkAllInNote = (group: UnlinkedMentionGroup) => {
    if (!onUpdateNote) return;
    const updated = convertAllUnlinkedMentionsInNote(group.sourceNote, currentNote);
    onUpdateNote(updated);

    setLinkedSuccessToast(
      `Linked ${group.occurrences.length} mentions in "${group.sourceNote.title}"`
    );
    setTimeout(() => setLinkedSuccessToast(null), 2500);
  };

  // Highlight context match helper
  const renderHighlightedSnippet = (
    text: string,
    highlightRegex: RegExp,
    keyPrefix: string
  ) => {
    const parts = text.split(highlightRegex);
    return (
      <span>
        {parts.map((part, i) => {
          if (highlightRegex.test(part)) {
            return (
              <mark
                key={`${keyPrefix}-${i}`}
                className="bg-amber-300 dark:bg-amber-700/80 text-amber-950 dark:text-amber-100 font-bold px-1 py-0.5 rounded-xs"
              >
                {part}
              </mark>
            );
          }
          return <span key={`${keyPrefix}-${i}`}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 overflow-hidden text-xs shadow-xs">
      {/* Toast Notification */}
      {linkedSuccessToast && (
        <div className="px-3 py-1.5 bg-emerald-600 text-white font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {linkedSuccessToast}
          </span>
          <button
            type="button"
            onClick={() => setLinkedSuccessToast(null)}
            className="hover:text-emerald-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Tabs */}
      <div className="px-3 py-2 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-800/80 p-0.5 rounded-xl">
          {/* Linked Mentions Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('linked')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'linked'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Linked Mentions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-mono">
              {totalLinkedOccurrences}
            </span>
          </button>

          {/* Unlinked Mentions Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('unlinked')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'unlinked'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Unlink className="w-3.5 h-3.5 text-stone-400" />
            <span>Unlinked Mentions</span>
            {totalUnlinkedOccurrences > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] font-mono">
                {totalUnlinkedOccurrences}
              </span>
            )}
          </button>

          {/* Outgoing Links Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'outgoing'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
            <span>Outgoing Links</span>
            <span className="px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-mono">
              {outgoingLinks.length}
            </span>
          </button>
        </div>

        {/* Action controls (Filter, Sort, Expand) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Show/Hide Context toggle */}
          {activeTab !== 'outgoing' && (
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showContext
                  ? 'bg-stone-200 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                  : 'border-transparent text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
              title={showContext ? 'Hide Context Snippets' : 'Show Context Snippets'}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Collapse/Expand toggle */}
          {activeTab !== 'outgoing' && (
            <button
              type="button"
              onClick={Object.keys(expandedGroups).length === 0 ? collapseAll : expandAll}
              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
              title="Toggle Collapse All"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab} links...`}
            className="w-full pl-8 pr-3 py-1 bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-stone-900 dark:text-stone-100 placeholder-stone-400"
          />
        </div>

        {activeTab !== 'outgoing' && (
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-2 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300 focus:outline-hidden"
          >
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="mentions-desc">Most Mentions</option>
            <option value="recent">Recently Modified</option>
          </select>
        )}
      </div>

      {/* TAB 1: Linked Mentions */}
      {activeTab === 'linked' && (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {filteredLinkedGroups.length === 0 ? (
            <div className="p-6 text-center text-stone-400 space-y-1">
              <Link2 className="w-6 h-6 mx-auto opacity-40 text-amber-500" />
              <div className="font-semibold text-xs">No linked mentions found</div>
              <p className="text-[11px] text-stone-500">
                Other notes in your vault linking to <code>[[{currentNote.title}]]</code> will appear here.
              </p>
            </div>
          ) : (
            filteredLinkedGroups.map((group) => {
              const isExpanded = isGroupExpanded(group.sourceNote.id);
              return (
                <div
                  key={group.sourceNote.id}
                  className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-2xs"
                >
                  {/* Source Note Header */}
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.sourceNote.id)}
                      className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 text-left truncate flex-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      )}
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{group.sourceNote.title}</span>
                      {group.folder && (
                        <span className="text-[10px] text-stone-400 font-normal flex items-center gap-0.5">
                          <FolderIcon className="w-2.5 h-2.5" />
                          {group.folder.name}
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-[10px] font-mono text-stone-600 dark:text-stone-300">
                        {group.occurrences.length} {group.occurrences.length === 1 ? 'mention' : 'mentions'}
                      </span>

                      {onOpenNote && (
                        <button
                          type="button"
                          onClick={() => onOpenNote(group.sourceNote.id)}
                          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                          title="Open Note"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mentions Occurrences Snippets */}
                  {isExpanded && showContext && (
                    <div className="p-2 space-y-1.5 bg-stone-50/40 dark:bg-stone-950/40">
                      {group.occurrences.map((occ, idx) => {
                        const targetRegex = new RegExp(
                          `(!?\\[\\[.*?\\]\\])`,
                          'gi'
                        );
                        return (
                          <div
                            key={idx}
                            onClick={() => onOpenNote && onOpenNote(group.sourceNote.id)}
                            className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800/70 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-stone-400">
                              <span className="font-mono">Line {occ.lineNumber}</span>
                              {occ.isEmbed && (
                                <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5">
                                  <span>Embed ![[...]]</span>
                                </span>
                              )}
                              {occ.targetHeading && (
                                <span className="text-amber-600 dark:text-amber-400 font-mono">
                                  #{occ.targetHeading}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-700 dark:text-stone-300 font-mono leading-relaxed line-clamp-3">
                              {renderHighlightedSnippet(
                                occ.surroundingContext || occ.lineContent,
                                targetRegex,
                                `occ-${idx}`
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Unlinked Mentions */}
      {activeTab === 'unlinked' && (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {filteredUnlinkedGroups.length === 0 ? (
            <div className="p-6 text-center text-stone-400 space-y-1">
              <Sparkles className="w-6 h-6 mx-auto opacity-40 text-amber-500" />
              <div className="font-semibold text-xs">No unlinked mentions found</div>
              <p className="text-[11px] text-stone-500">
                Any occurrences of &ldquo;{currentNote.title}&rdquo; in other notes will be automatically discovered here with 1-click linking.
              </p>
            </div>
          ) : (
            filteredUnlinkedGroups.map((group) => {
              const isExpanded = isGroupExpanded(group.sourceNote.id);
              return (
                <div
                  key={group.sourceNote.id}
                  className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-2xs"
                >
                  {/* Group Header */}
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/80">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.sourceNote.id)}
                      className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 text-left truncate flex-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      )}
                      <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{group.sourceNote.title}</span>
                      {group.folder && (
                        <span className="text-[10px] text-stone-400 font-normal flex items-center gap-0.5">
                          <FolderIcon className="w-2.5 h-2.5" />
                          {group.folder.name}
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleLinkAllInNote(group)}
                        className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1"
                        title="Convert all mentions in this note to [[WikiLinks]]"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Link All ({group.occurrences.length})</span>
                      </button>

                      {onOpenNote && (
                        <button
                          type="button"
                          onClick={() => onOpenNote(group.sourceNote.id)}
                          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Occurrences with individual Link action */}
                  {isExpanded && showContext && (
                    <div className="p-2 space-y-1.5 bg-stone-50/40 dark:bg-stone-950/40">
                      {group.occurrences.map((occ, idx) => {
                        const targetRegex = new RegExp(
                          `(\\b${group.matchedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`,
                          'gi'
                        );
                        return (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800/70 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-[10px] text-stone-400 font-mono">
                                Line {occ.lineNumber}
                              </div>
                              <div className="text-[11px] text-stone-700 dark:text-stone-300 font-mono leading-relaxed">
                                {renderHighlightedSnippet(
                                  occ.lineContent,
                                  targetRegex,
                                  `unlinked-${idx}`
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLinkSingle(group, occ)}
                              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-200 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
                              title="Wrap this mention with [[...]]"
                            >
                              <Link2 className="w-3 h-3 text-amber-500" />
                              <span>Link</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: Outgoing Links */}
      {activeTab === 'outgoing' && (
        <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
          {filteredOutgoing.length === 0 ? (
            <div className="p-6 text-center text-stone-400 space-y-1">
              <ArrowUpRight className="w-6 h-6 mx-auto opacity-40 text-blue-500" />
              <div className="font-semibold text-xs">No outgoing links in this note</div>
              <p className="text-[11px] text-stone-500">
                Type <code>[[Note Name]]</code> in your note to connect knowledge.
              </p>
            </div>
          ) : (
            <>
              {/* Resolved Links Section */}
              {resolvedOutgoing.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Existing Notes ({resolvedOutgoing.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {resolvedOutgoing.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => item.targetNote && onOpenNote && onOpenNote(item.targetNote.id)}
                        className="p-2 text-left rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors flex items-center justify-between gap-1.5 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {item.targetTitle}
                          </div>
                          {item.targetHeading && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono truncate">
                              #{item.targetHeading}
                            </div>
                          )}
                          {item.alias && (
                            <div className="text-[10px] text-stone-400 truncate">
                              Alias: &ldquo;{item.alias}&rdquo;
                            </div>
                          )}
                        </div>
                        {item.isEmbed && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-mono">
                            embed
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved / Missing Links Section */}
              {unresolvedOutgoing.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Unresolved Links ({unresolvedOutgoing.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {unresolvedOutgoing.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800 flex items-center justify-between gap-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">
                            {item.targetTitle}
                          </div>
                          <div className="text-[10px] text-stone-400">Page not created yet</div>
                        </div>

                        {onCreateNote && (
                          <button
                            type="button"
                            onClick={() => onCreateNote(item.targetTitle)}
                            className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                            title="Create this note"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
