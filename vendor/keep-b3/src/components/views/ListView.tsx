import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin,
  Star,
  Lock,
  Volume2,
  CheckSquare,
  Square,
  FileText,
  Folder as FolderIcon,
  Bell,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  Link2,
  Copy,
  Check,
  GitMerge,
} from 'lucide-react';
import { Note, Folder, AppSettings } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import { groupNotesByMonth } from '../../utils/search';
import { HighlightText, extractHighlightTerms } from '../HighlightText';
import { parseTextWithWikiLinks } from '../../utils/linking';
import { WikiLinkWithHoverPreview } from '../WikiLinkWithHoverPreview';
import { NoteEntranceWrapper } from './NoteEntranceWrapper';

interface ListViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  settings: AppSettings;
  searchQuery?: string;
  selectedNoteIds?: string[];
  onToggleSelect?: (noteId: string, shiftKey?: boolean) => void;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote?: (noteId: string) => void;
  onDeleteForever?: (noteId: string) => void;
  onFilterTag?: (tag: string) => void;
  onFilterFolder?: (folderId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  focusedNoteId?: string;
  onCompareNote?: (note: Note) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  notes,
  allNotes,
  folders,
  settings,
  searchQuery,
  selectedNoteIds = [],
  onToggleSelect,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onDeleteForever,
  onFilterTag,
  onFilterFolder,
  onOpenLinkedNote,
  focusedNoteId,
  onCompareNote,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWikiLinkId, setCopiedWikiLinkId] = useState<string | null>(null);
  const monthGroups = settings.showMonthDividers ? groupNotesByMonth(notes) : null;
  const highlightTerms = searchQuery ? extractHighlightTerms(searchQuery) : [];

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Unique key identifying active filters, search criteria, and collection changes.
  // Re-triggers the Tailwind transition entrance animations for visual fluidity.
  const filterKey = useMemo(() => {
    const idsSample = notes.slice(0, 10).map((n) => n.id).join(',');
    return `${searchQuery || ''}_${settings.showMonthDividers}_${settings.compactMode}_${notes.length}_${idsSample}`;
  }, [searchQuery, settings.showMonthDividers, settings.compactMode, notes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleCopyWikiLink = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const linkText = `[[${note.title || 'Untitled Note'}]]`;
    try {
      await navigator.clipboard.writeText(linkText);
      setCopiedWikiLinkId(note.id);
      setTimeout(() => setCopiedWikiLinkId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = linkText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedWikiLinkId(note.id);
      setTimeout(() => setCopiedWikiLinkId(null), 2000);
    }
  };

  const handleCopyRowContent = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    let textToCopy = note.title ? `${note.title}\n\n` : '';
    if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
      textToCopy += note.checklist
        .map((i) => `${i.completed ? '✓' : '☐'} ${i.text}`)
        .join('\n');
    } else {
      textToCopy += note.content || '';
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const isCompact = Boolean(settings.compactMode);

  const renderRow = (note: Note, index: number = 0) => {
    const colorConf = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const folder = folders.find((f) => f.id === note.folderId);
    const isChecklist = note.type === 'checklist';
    const completedCount = isChecklist ? note.checklist.filter((i) => i.completed).length : 0;
    const totalChecklist = isChecklist ? note.checklist.length : 0;
    const isSelected = selectedNoteIds.includes(note.id);
    const isFocused = focusedNoteId === note.id;
    const delay = typeof index === 'number' ? Math.min(index * 0.02, 0.25) : 0;

    return (
      <NoteEntranceWrapper
        key={note.id}
        index={index}
        filterKey={filterKey}
        staggerMs={18}
        maxDelayMs={220}
        className="w-full"
      >
        <div
          id={`list-row-${note.id}`}
          ref={(el) => {
            if (isFocused && el) {
              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }}
          onClick={() => onOpenNote(note)}
          className={`group flex items-center justify-between gap-3 ${
            isCompact ? 'px-3 py-1.5 rounded-lg' : 'px-4 py-3 rounded-xl'
          } border transition-all cursor-pointer hover:shadow-xs ${
            colorConf.bgLight
          } ${colorConf.borderLight} ${colorConf.bgDark} ${colorConf.borderDark} ${
            isSelected
              ? 'ring-2 ring-amber-500 border-amber-500 dark:border-amber-400 shadow-xs'
              : isFocused
              ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 border-amber-400 dark:border-amber-500 shadow-xs scale-[1.005]'
              : ''
          }`}
        >
        {/* Left: Checkbox & Color dot & Pin & Title & Preview */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onToggleSelect && !note.trashed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(note.id, e.shiftKey);
              }}
              className={`p-1 rounded-md transition-all shrink-0 ${
                isSelected
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 border border-amber-400 opacity-100'
                  : selectedNoteIds.length > 0
                  ? 'text-stone-400 bg-stone-100 dark:bg-stone-800 opacity-90 hover:opacity-100 hover:text-amber-500'
                  : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:text-amber-500'
              }`}
              title={isSelected ? 'Deselect note' : 'Select note'}
              aria-label={isSelected ? 'Deselect note' : 'Select note'}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Circular Color Badge matching filter UI */}
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 border border-stone-400/80 dark:border-stone-500 shadow-2xs transition-transform group-hover:scale-110"
            style={{ backgroundColor: colorConf.hex }}
            title={`Color: ${colorConf.name}`}
            aria-label={`Color: ${colorConf.name}`}
          />

          {!note.trashed && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateNote({
                    ...note,
                    isFavorite: !note.isFavorite,
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className={`p-1 rounded transition-colors ${
                  note.isFavorite
                    ? 'text-amber-500 fill-amber-500/30'
                    : 'text-stone-300 dark:text-stone-700 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                }`}
                title={note.isFavorite ? 'Remove favorite' : 'Add favorite'}
              >
                <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                id={`list-pin-note-${note.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateNote({
                    ...note,
                    pinned: !note.pinned,
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className={`p-1 rounded transition-colors ${
                  note.pinned
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
                title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note to top'}
                aria-pressed={Boolean(note.pinned)}
              >
                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-600 dark:fill-amber-400' : ''}`} />
              </button>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {note.isLocked && (
                <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Passcode Protected" />
              )}
              <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                {note.title ? (
                  <HighlightText text={note.title} highlightTerms={highlightTerms} />
                ) : (
                  'Untitled Note'
                )}
              </h4>
              {note.isLocked ? (
                <span className="text-[11px] text-rose-500 font-medium italic">Locked</span>
              ) : isChecklist ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-mono">
                    <CheckSquare className="w-3 h-3 text-amber-500" />
                    {completedCount}/{totalChecklist}
                  </span>
                  {totalChecklist > 0 && (
                    <div className="w-12 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((completedCount / totalChecklist) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <FileText className="w-3 h-3 text-stone-400 shrink-0 opacity-60" />
              )}
              {note.audios && note.audios.length > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-[10px] text-rose-700 dark:text-rose-300 font-mono">
                  <Volume2 className="w-2.5 h-2.5" /> {note.audios.length}
                </span>
              )}
            </div>
            {note.isLocked ? (
              <p className="text-xs text-stone-400 dark:text-stone-500 italic mt-0.5">
                Passcode protected note
              </p>
            ) : note.content ? (
              <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5 max-w-xl">
                {parseTextWithWikiLinks(note.content, allNotes).map((seg, sIdx) => {
                  if (seg.type === 'link') {
                    return (
                      <WikiLinkWithHoverPreview
                        key={sIdx}
                        targetTitle={seg.targetTitle || ''}
                        targetNoteId={seg.targetNoteId}
                        targetSnippet={seg.targetSnippet}
                        isEmbed={seg.isEmbed}
                        activeHighlightTerms={highlightTerms}
                        onOpenLinkedNote={onOpenLinkedNote}
                      />
                    );
                  }
                  return (
                    <HighlightText
                      key={sIdx}
                      text={seg.content}
                      highlightTerms={highlightTerms}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Center: Folder & Tags */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 max-w-xs overflow-hidden">
          {folder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onFilterFolder) onFilterFolder(folder.id);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-medium"
            >
              <FolderIcon
                className="w-3 h-3"
                style={{ color: folder.color || '#f59e0b' }}
              />
              <span className="truncate max-w-[90px]">
                <HighlightText text={folder.name} highlightTerms={highlightTerms} />
              </span>
            </button>
          )}

          {note.reminderDate && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[11px] font-medium">
              <Bell className="w-3 h-3 text-sky-500" />
              <span>{new Date(note.reminderDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}

          {note.tags.slice(0, 2).map((t) => (
            <button
              key={t}
              onClick={(e) => {
                e.stopPropagation();
                if (onFilterTag) onFilterTag(t);
              }}
              className="px-2 py-0.5 rounded-md bg-amber-100/60 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[11px] font-medium"
            >
              #<HighlightText text={t} highlightTerms={highlightTerms} />
            </button>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px] text-stone-400 font-mono">
              +{note.tags.length - 2}
            </span>
          )}
        </div>

        {/* Right: Date & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {!note.trashed ? (
              <>
                <button
                  onClick={(e) => handleCopyRowContent(note, e)}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title={copiedId === note.id ? 'Copied to clipboard!' : 'Copy note content'}
                  aria-label="Copy note content"
                >
                  {copiedId === note.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => handleCopyWikiLink(note, e)}
                  className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400"
                  title={copiedWikiLinkId === note.id ? 'Copied WikiLink!' : 'Copy WikiLink ([[Title]])'}
                  aria-label="Copy WikiLink"
                >
                  {copiedWikiLinkId === note.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {onCompareNote && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompareNote(note);
                    }}
                    className="p-1 text-stone-400 hover:text-indigo-600 rounded transition-colors"
                    title="Compare & Merge with another note..."
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() =>
                    onUpdateNote({
                      ...note,
                      archived: !note.archived,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title={note.archived ? 'Unarchive (restore to active notes)' : 'Archive'}
                >
                  {note.archived ? (
                    <ArchiveRestore className="w-3.5 h-3.5" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="p-1 text-stone-400 hover:text-rose-500"
                  title="Trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onRestoreNote && onRestoreNote(note.id)}
                className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-100"
              >
                Restore
              </button>
            )}
          </div>
        </div>
        </div>
      </NoteEntranceWrapper>
    );
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400 text-sm">
        No notes to display in list view.
      </div>
    );
  }

  return (
    <div className={`w-full max-w-5xl mx-auto ${isCompact ? 'space-y-2 pb-8' : 'space-y-4 pb-16'}`}>
      {settings.showMonthDividers && monthGroups ? (
        monthGroups.map((group) => (
          <div key={group.key} className={isCompact ? 'space-y-1' : 'space-y-2'}>
            <div className="sticky top-16 z-10 py-1 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {group.label}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {group.notes.length}
              </span>
            </div>
            <div className={isCompact ? 'space-y-1' : 'space-y-1.5'}>
              <AnimatePresence mode="popLayout">
                {group.notes.map((note, idx) => renderRow(note, idx))}
              </AnimatePresence>
            </div>
          </div>
        ))
      ) : (
        <div className={isCompact ? 'space-y-1' : 'space-y-1.5'}>
          <AnimatePresence mode="popLayout">
            {notes.map((note, idx) => renderRow(note, idx))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
