import React, { useState, useMemo } from 'react';
import {
  Link2,
  Link2Off,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpRight,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Note } from '../../../types';
import {
  LinkedMention,
  NavUnlinkedMentionCandidate,
  BacklinkSortOption,
  BacklinkGroup,
} from '../navigationTypes';
import { backlinkNavigationService } from '../backlinkNavigationService';
import { formatRelativeTime } from '../../../utils/date';

export interface BacklinksPanelProps {
  currentNote: Note;
  allNotes: Note[];
  onOpenNote: (noteId: string, options?: any) => void;
  onCreateNoteFromLink?: (title: string) => void;
  onLinkMention?: (candidate: NavUnlinkedMentionCandidate) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  currentNote,
  allNotes,
  onOpenNote,
  onCreateNoteFromLink,
  onLinkMention,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked' | 'outgoing'>('linked');
  const [sortBy, setSortBy] = useState<BacklinkSortOption>('modified');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 1. Linked Mentions
  const linkedMentions = useMemo(() => {
    return backlinkNavigationService.getLinkedMentions(currentNote.id, allNotes);
  }, [currentNote.id, allNotes]);

  const groups = useMemo(() => {
    return backlinkNavigationService.groupAndSortMentions(linkedMentions, sortBy);
  }, [linkedMentions, sortBy]);

  // 2. Unlinked Mentions
  const unlinkedMentions = useMemo(() => {
    return backlinkNavigationService.getUnlinkedMentions(currentNote.id, allNotes, 15);
  }, [currentNote.id, allNotes]);

  // 3. Outgoing Links
  const outgoingLinks = useMemo(() => {
    return backlinkNavigationService.getOutgoingLinks(currentNote);
  }, [currentNote]);

  const toggleGroup = (sourceId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [sourceId]: prev[sourceId] === undefined ? false : !prev[sourceId],
    }));
  };

  if (isCollapsed) {
    return (
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 flex items-center justify-between text-xs text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Backlinks ({linkedMentions.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="backlinks-panel"
      className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 p-4 space-y-3"
    >
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            id="tab-linked-mentions"
            onClick={() => setActiveTab('linked')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'linked'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Linked ({linkedMentions.length})</span>
          </button>

          <button
            id="tab-unlinked-mentions"
            onClick={() => setActiveTab('unlinked')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'unlinked'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Link2Off className="w-3.5 h-3.5" />
            <span>Unlinked ({unlinkedMentions.length})</span>
          </button>

          <button
            id="tab-outgoing-links"
            onClick={() => setActiveTab('outgoing')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'outgoing'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Outgoing ({outgoingLinks.length})</span>
          </button>
        </div>

        {activeTab === 'linked' && groups.length > 0 && (
          <div className="flex items-center gap-1 text-2xs text-neutral-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BacklinkSortOption)}
              className="bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-1 py-0.5 text-2xs outline-none text-neutral-700 dark:text-neutral-300"
            >
              <option value="modified">Modified</option>
              <option value="relevance">Count</option>
              <option value="title">Title</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Linked Mentions */}
      {activeTab === 'linked' && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              No linked mentions point to this note yet.
            </div>
          ) : (
            groups.map((group) => {
              const isExpanded = expandedGroups[group.sourceNoteId] !== false; // default expanded
              return (
                <div
                  key={group.sourceNoteId}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden text-xs"
                >
                  <div
                    onClick={() => toggleGroup(group.sourceNoteId)}
                    className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      )}
                      <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{group.sourceNoteTitle}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-2xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {group.mentions.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-neutral-400">
                        {formatRelativeTime(group.updatedAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNote(group.sourceNoteId);
                        }}
                        className="p-1 hover:text-primary-600 text-neutral-400 rounded"
                        title="Open note"
                        aria-label="Open note"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-neutral-100 dark:border-neutral-800 p-2 space-y-1.5 bg-neutral-50/30 dark:bg-neutral-900/30">
                      {group.mentions.map((mention) => (
                        <div
                          key={mention.id}
                          onClick={() => onOpenNote(mention.sourceNoteId)}
                          className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800/80 cursor-pointer text-2xs text-neutral-600 dark:text-neutral-300 font-mono transition-colors"
                        >
                          <span className="text-neutral-400 mr-1">L{mention.lineIndex + 1}:</span>
                          <span>{mention.surroundingExcerpt}</span>
                          {mention.headingTarget && (
                            <span className="ml-1 text-primary-600 dark:text-primary-400 font-sans">
                              #{mention.headingTarget}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Unlinked Mentions */}
      {activeTab === 'unlinked' && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {unlinkedMentions.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              No unlinked mentions found for "{currentNote.title}".
            </div>
          ) : (
            unlinkedMentions.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 text-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{candidate.sourceNoteTitle}</span>
                    <span className="text-2xs text-neutral-400">· Line {candidate.lineIndex + 1}</span>
                  </div>
                  <p className="mt-1 text-2xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                    {candidate.surroundingExcerpt}
                  </p>
                </div>

                <button
                  id={`link-mention-btn-${candidate.id}`}
                  onClick={() => onLinkMention && onLinkMention(candidate)}
                  className="px-2 py-1 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 border border-primary-200 dark:border-primary-800/60 font-medium text-2xs shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Link</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Outgoing Links */}
      {activeTab === 'outgoing' && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {outgoingLinks.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400">
              No outgoing links from this note.
            </div>
          ) : (
            outgoingLinks.map((out, idx) => (
              <div
                key={`${out.target}-${idx}`}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {out.type === 'note' && <FileText className="w-3.5 h-3.5 text-neutral-400" />}
                  {out.type === 'external_url' && <ExternalLink className="w-3.5 h-3.5 text-blue-500" />}
                  {out.type === 'citation' && <BookOpen className="w-3.5 h-3.5 text-purple-500" />}
                  <span className="truncate text-neutral-800 dark:text-neutral-200">
                    {out.displayText || out.target}
                  </span>
                </div>

                {out.type === 'note' && (
                  <button
                    onClick={() => {
                      const matchNote = allNotes.find(
                        (n) =>
                          n.id === out.target ||
                          (n.title && n.title.toLowerCase() === out.target.toLowerCase())
                      );
                      if (matchNote) {
                        onOpenNote(matchNote.id);
                      } else if (onCreateNoteFromLink) {
                        onCreateNoteFromLink(out.target);
                      }
                    }}
                    className="text-2xs text-primary-600 hover:underline shrink-0"
                  >
                    Open
                  </button>
                )}
                {out.type === 'external_url' && (
                  <a
                    href={out.target}
                    target="_blank"
                    rel="noreferrer"
                    className="text-2xs text-blue-600 hover:underline shrink-0"
                  >
                    Visit
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
