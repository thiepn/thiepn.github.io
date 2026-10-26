import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  Pin,
  Star,
  Lock,
  Volume2,
  History,
  CheckSquare,
  Square,
  Folder as FolderIcon,
  Tag as TagIcon,
  Palette,
  Bell,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  MoreVertical,
  MoreHorizontal,
  Copy,
  Download,
  Link,
  Link2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Check,
  Printer,
  Sparkles,
  Wand2,
  X,
  Share2,
  Table,
  LayoutTemplate,
  GitMerge,
} from 'lucide-react';
import { Note, Folder, NoteColorKey, ChecklistItem } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';
import { parseTextWithWikiLinks } from '../utils/linking';
import { downloadSingleNote } from '../services/exporter';
import { HighlightText, extractHighlightTerms } from './HighlightText';
import { WikiLinkWithHoverPreview } from './WikiLinkWithHoverPreview';
import { a11yAnnouncer } from '../utils/a11y';
import { smartNoteService } from '../services/smartNoteService';
import { fireConfetti } from '../utils/confetti';
import { parseMarkdownTable, isDelimiterRow } from '../pkm/tableParser';

interface NoteCardProps {
  note: Note;
  allNotes: Note[];
  folders: Folder[];
  searchQuery?: string;
  highlightTerms?: string[];
  isSelected?: boolean;
  onToggleSelect?: (noteId: string, shiftKey?: boolean) => void;
  isSelectionMode?: boolean;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote?: (noteId: string) => void;
  onDeleteForever?: (noteId: string) => void;
  onDuplicateNote?: (note: Note) => void;
  onFilterTag?: (tag: string) => void;
  onFilterFolder?: (folderId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  cardDensity?: 'compact' | 'comfortable' | 'spacious';
  isFocused?: boolean;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
}

const NoteCardComponent: React.FC<NoteCardProps> = ({
  note,
  allNotes,
  folders,
  searchQuery,
  highlightTerms,
  isSelected = false,
  onToggleSelect,
  isSelectionMode = false,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onDeleteForever,
  onDuplicateNote,
  onFilterTag,
  onFilterFolder,
  onOpenLinkedNote,
  cardDensity = 'comfortable',
  isFocused = false,
  onSaveAsTemplate,
  onCompareNote,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWikiLink, setCopiedWikiLink] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<{ summary: string; keyTakeaways: string[] } | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const hasAnyMenuOpen =
    showColorPicker ||
    showFolderPicker ||
    showReminderPicker ||
    showMoreMenu ||
    showQuickActions;

  const colorConfig = useMemo(() => NOTE_COLORS[note.color] || NOTE_COLORS.default, [note.color]);
  const folder = useMemo(() => folders.find((f) => f.id === note.folderId), [folders, note.folderId]);

  const activeHighlightTerms = useMemo(() => {
    if (highlightTerms && highlightTerms.length > 0) return highlightTerms;
    if (searchQuery) return extractHighlightTerms(searchQuery);
    return [];
  }, [highlightTerms, searchQuery]);

  // Close menus when clicking outside - only attach listener when at least one menu is open
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasAnyMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowFolderPicker(false);
        setShowReminderPicker(false);
        setShowMoreMenu(false);
        setShowQuickActions(false);
        setShowFolderSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hasAnyMenuOpen]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !note.pinned;
    onUpdateNote({
      ...note,
      pinned: nextPinned,
      updatedAt: new Date().toISOString(),
    });
    a11yAnnouncer.announce(nextPinned ? 'Note pinned to top' : 'Note unpinned');
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFav = !note.isFavorite;
    onUpdateNote({
      ...note,
      isFavorite: nextFav,
      updatedAt: new Date().toISOString(),
    });
    a11yAnnouncer.announce(nextFav ? 'Note added to favorites' : 'Note removed from favorites');
  };

  const toggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextArchived = !note.archived;
    onUpdateNote({
      ...note,
      archived: nextArchived,
      updatedAt: new Date().toISOString(),
    });
    a11yAnnouncer.announce(nextArchived ? 'Note archived' : 'Note unarchived');
  };

  const toggleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.trashed) {
      if (onRestoreNote) {
        onRestoreNote(note.id);
        a11yAnnouncer.announce('Note restored from trash');
      }
    } else {
      onDeleteNote(note.id);
      a11yAnnouncer.announce('Note moved to trash');
    }
  };

  const handleToggleCheckItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetItem = note.checklist.find((item) => item.id === itemId);
    const willBeCompleted = targetItem ? !targetItem.completed : false;
    const updatedChecklist = note.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    if (
      willBeCompleted &&
      updatedChecklist.length > 0 &&
      updatedChecklist.every((item) => item.completed)
    ) {
      fireConfetti(e.clientX, e.clientY);
    }
    onUpdateNote({
      ...note,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });
  };

  const changeColor = (newColor: NoteColorKey, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      color: newColor,
      updatedAt: new Date().toISOString(),
    });
    setShowColorPicker(false);
    a11yAnnouncer.announce(`Note color changed to ${NOTE_COLORS[newColor]?.name || newColor}`);
  };

  const changeFolder = (newFolderId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      folderId: newFolderId,
      updatedAt: new Date().toISOString(),
    });
    setShowFolderPicker(false);
    setShowFolderSubmenu(false);
    const targetFolder = folders.find((f) => f.id === newFolderId);
    a11yAnnouncer.announce(
      targetFolder ? `Assigned note to folder ${targetFolder.name}` : 'Removed note from folder'
    );
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicateNote) onDuplicateNote(note);
    setShowMoreMenu(false);
  };

  const handleDownloadMd = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadSingleNote(note, folders);
    setShowMoreMenu(false);
  };

  const handleCopyContent = async (e: React.MouseEvent) => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('note', note.id);
      url.hash = `note-${note.id}`;
      const deepLink = url.toString();
      await navigator.clipboard.writeText(deepLink);
      setCopiedLink(true);
      a11yAnnouncer.announce(`Copied deep link for note ${note.title || 'Untitled'}`);
      setTimeout(() => {
        setCopiedLink(false);
      }, 2000);
    } catch {
      const url = new URL(window.location.href);
      url.searchParams.set('note', note.id);
      url.hash = `note-${note.id}`;
      const deepLink = url.toString();
      const ta = document.createElement('textarea');
      ta.value = deepLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareTitle = note.title || 'Untitled Note';
    let shareText = note.content || '';
    if (note.checklist && note.checklist.length > 0) {
      const checkText = note.checklist
        .map((item) => `${item.completed ? '[x]' : '[ ]'} ${item.text}`)
        .join('\n');
      shareText = shareText ? `${shareText}\n\n${checkText}` : checkText;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('note', note.id);
    url.hash = `note-${note.id}`;
    const deepLink = url.toString();

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText ? `${shareTitle}\n\n${shareText}` : shareTitle,
          url: deepLink,
        });
        a11yAnnouncer.announce(`Shared note ${shareTitle}`);
        setShowQuickActions(false);
        setShowMoreMenu(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Share sheet error:', err);
        }
      }
    } else {
      // Fallback to clipboard copy
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n\nLink: ${deepLink}`);
        setCopied(true);
        a11yAnnouncer.announce(`Copied note content and link to clipboard`);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = `${shareTitle}\n\n${shareText}\n\nLink: ${deepLink}`;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleCopyWikiLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const linkText = `[[${note.title || 'Untitled Note'}]]`;
    try {
      await navigator.clipboard.writeText(linkText);
      setCopiedWikiLink(true);
      setTimeout(() => {
        setCopiedWikiLink(false);
        setShowMoreMenu(false);
      }, 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = linkText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedWikiLink(true);
      setTimeout(() => {
        setCopiedWikiLink(false);
        setShowMoreMenu(false);
      }, 1500);
    }
  };

  const handlePrintNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoreMenu(false);
    onOpenNote(note);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  const handleGenerateSummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickActions(false);
    setShowMoreMenu(false);
    const contentToSummarize =
      note.type === 'checklist' && Array.isArray(note.checklist)
        ? note.checklist.map((c) => `${c.completed ? '[x]' : '[ ]'} ${c.text}`).join('\n')
        : (note.content || '');
    const result = smartNoteService.generateSummary(note.title || 'Untitled Note', contentToSummarize);
    setGeneratedSummary(result);
    setShowSummaryModal(true);
    a11yAnnouncer.announce(`Generated summary for ${note.title || 'note'}`);
  };

  const handleCopySummaryText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!generatedSummary) return;
    const formatted = `**Summary:**\n${generatedSummary.summary}\n\n**Key Takeaways:**\n${generatedSummary.keyTakeaways.map((k) => `- ${k}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formatted;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const handlePrependSummaryToNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!generatedSummary) return;
    const callout = `> [!NOTE] TL;DR (AI Summary)\n> ${generatedSummary.summary}\n>\n${generatedSummary.keyTakeaways.map((k) => `> - ${k}`).join('\n')}\n\n`;
    onUpdateNote({
      ...note,
      content: callout + (note.content || ''),
      updatedAt: new Date().toISOString(),
    });
    setShowSummaryModal(false);
    a11yAnnouncer.announce('Summary prepended to note');
  };

  const isChecklist = note.type === 'checklist' && Array.isArray(note.checklist) && note.checklist.length > 0;
  const completedItems = useMemo(
    () => (isChecklist ? (note.checklist || []).filter((i) => i.completed) : []),
    [isChecklist, note.checklist]
  );
  const openItems = useMemo(
    () => (isChecklist ? (note.checklist || []).filter((i) => !i.completed) : []),
    [isChecklist, note.checklist]
  );

  const cardWordCount = useMemo(() => {
    if (isChecklist) {
      return (note.checklist || []).reduce(
        (acc, item) => acc + (item.text ? item.text.trim().split(/\s+/).filter(Boolean).length : 0),
        0
      );
    }
    return (note.content || '').trim().split(/\s+/).filter(Boolean).length;
  }, [note.content, note.checklist, isChecklist]);

  const checklistProgress = useMemo(() => {
    if (!isChecklist || !note.checklist || note.checklist.length === 0) return 0;
    return Math.round((completedItems.length / note.checklist.length) * 100);
  }, [isChecklist, note.checklist, completedItems.length]);

  const maxItemsToShow = cardDensity === 'compact' ? 4 : cardDensity === 'spacious' ? 10 : 6;
  const visibleOpenItems = showAllChecklist ? openItems : openItems.slice(0, maxItemsToShow);

  const textSegments = useMemo(
    () => parseTextWithWikiLinks(note.content || '', allNotes),
    [note.content, allNotes]
  );

  // Detect if note has a Markdown table for spreadsheet mini-grid preview
  const tableData = useMemo(() => {
    if (isChecklist || !note.content || !note.content.includes('|')) return null;
    const lines = note.content.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i++) {
      const l1 = lines[i].trim();
      const l2 = lines[i + 1].trim();
      if (l1.includes('|') && isDelimiterRow(l2)) {
        const tableLines = [lines[i], lines[i + 1]];
        let j = i + 2;
        while (j < lines.length) {
          const rowLine = lines[j];
          const rowTrim = rowLine.trim();
          if (!rowTrim || !rowTrim.includes('|') || isDelimiterRow(rowTrim)) break;
          tableLines.push(rowLine);
          j++;
        }
        const parsed = parseMarkdownTable(tableLines.join('\n'));
        if (parsed && parsed.headers.length > 0) {
          const leadLines = lines.slice(0, i).filter((l) => l.trim().length > 0);
          return {
            table: parsed,
            leadSnippet: leadLines.length > 0 ? leadLines.slice(0, 2).join(' ') : null,
          };
        }
      }
    }
    return null;
  }, [note.content, isChecklist]);

  const densityPadding =
    cardDensity === 'compact' ? 'p-3' : cardDensity === 'spacious' ? 'p-5' : 'p-4';

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  return (
    <div
      ref={cardRef}
      id={`note-card-${note.id}`}
      onClick={() => onOpenNote(note)}
      style={{ '--card-glow-color': colorConfig.glowColor || 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs card-lift-glow text-stone-900 dark:text-stone-100 ${
        colorConfig.bgLight
      } ${colorConfig.borderLight} ${colorConfig.bgDark} ${colorConfig.borderDark} ${densityPadding} flex flex-col justify-between ${
        isSelected
          ? 'is-card-selected ring-2 ring-amber-500 border-amber-500 dark:border-amber-400 shadow-md'
          : isFocused
          ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80 border-amber-400 dark:border-amber-500 shadow-md scale-[1.01]'
          : ''
      }`}
    >
      {/* Top Header: Select toggle, Title, Pin & Favorite Buttons */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {onToggleSelect && !note.trashed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(note.id, e.shiftKey);
                }}
                className={`p-1 rounded-md transition-all shrink-0 mt-0.5 ${
                  isSelected
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 border border-amber-400 opacity-100'
                    : isSelectionMode
                    ? 'text-stone-400 bg-stone-100/90 dark:bg-stone-800/90 border border-stone-300 dark:border-stone-700 opacity-80 hover:opacity-100 hover:text-amber-500'
                    : 'text-stone-400 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                title={isSelected ? 'Deselect note' : 'Select note for bulk actions'}
                aria-label={isSelected ? 'Deselect note' : 'Select note'}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {note.title ? (
              <h3 className="font-bold text-sm sm:text-base text-stone-950 dark:text-white tracking-tight leading-snug line-clamp-2">
                <HighlightText text={note.title} highlightTerms={activeHighlightTerms} />
              </h3>
            ) : (
              <div />
            )}
          </div>

          {/* Top action pills: Color, Lock, Favorite, Archived, Pin, Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Circular Color Badge matching filter UI */}
            <span
              className="w-3.5 h-3.5 rounded-full border border-stone-400/80 dark:border-stone-500 shrink-0 shadow-2xs transition-transform hover:scale-125"
              style={{ backgroundColor: colorConfig.hex }}
              title={`Color: ${colorConfig.name}`}
              aria-label={`Color: ${colorConfig.name}`}
            />
            {note.isLocked && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300"
                title="Passcode Protected Note"
              >
                <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              </span>
            )}
            {note.archived && !note.trashed && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300"
                title="Archived note (hidden from main workspace)"
              >
                <Archive className="w-3 h-3" />
                Archived
              </span>
            )}
            {!note.trashed && (
              <>
                <button
                  onClick={toggleFavorite}
                  className={`p-1.5 rounded-lg transition-all ${
                    note.isFavorite
                      ? 'text-amber-500 fill-amber-500/30 opacity-100'
                      : 'text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  id={`btn-pin-note-${note.id}`}
                  onClick={togglePin}
                  className={`p-1.5 rounded-lg transition-all ${
                    note.pinned
                      ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/50 dark:border-amber-700/60 opacity-100'
                      : 'text-stone-500 dark:text-stone-400 opacity-0 group-hover:opacity-100 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                  aria-label={note.pinned ? 'Unpin note' : 'Pin note to top'}
                  aria-pressed={Boolean(note.pinned)}
                >
                  <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-600 dark:fill-amber-400' : ''}`} />
                </button>
              </>
            )}

            {/* Quick Actions Ellipses Menu Button */}
            <div className="relative">
              <button
                id={`btn-quick-actions-${note.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuickActions((prev) => !prev);
                  setShowColorPicker(false);
                  setShowFolderPicker(false);
                  setShowMoreMenu(false);
                }}
                className={`p-1.5 rounded-lg transition-all duration-200 ease-out ${
                  showQuickActions
                    ? 'text-stone-900 dark:text-stone-100 bg-stone-200/90 dark:bg-stone-750 opacity-100 ring-1 ring-stone-400/50 shadow-sm scale-100'
                    : 'text-stone-400 dark:text-stone-500 max-sm:opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 sm:scale-95 group-hover:scale-100 focus:scale-100 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                title="Quick actions (Archive, Delete, Set Color, etc.)"
                aria-label={`Quick actions for ${note.title || 'note'}`}
                aria-expanded={showQuickActions}
                aria-haspopup="menu"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Quick Actions Dropdown Menu */}
              {showQuickActions && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-300/90 dark:border-stone-700/90 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150 ease-out"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby={`btn-quick-actions-${note.id}`}
                >
                  {/* Set Color section */}
                  <div className="px-1 pt-0.5 pb-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3 h-3 text-amber-500" /> Set Color
                      </span>
                      <span className="text-[10px] capitalize font-medium text-stone-400">
                        {NOTE_COLORS[note.color]?.name || 'Default'}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 p-1 bg-stone-100/80 dark:bg-stone-800/70 rounded-xl border border-stone-200/70 dark:border-stone-750">
                      {COLOR_KEYS.map((k) => {
                        const isCurrent = note.color === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={(e) => {
                              changeColor(k, e);
                            }}
                            className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? 'ring-2 ring-amber-500 ring-offset-1 scale-110 border-amber-600'
                                : 'border-stone-300 dark:border-stone-700 hover:scale-110 opacity-90 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: NOTE_COLORS[k].hex }}
                            title={NOTE_COLORS[k].name}
                            aria-label={`Set note color to ${NOTE_COLORS[k].name}`}
                          >
                            {isCurrent && <Check className="w-2.5 h-2.5 text-stone-900 dark:text-stone-900 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />

                  {/* Actions List */}
                  <div className="space-y-0.5">
                    {/* AI Writing Assistant: Generate Summary */}
                    <button
                      id={`btn-quick-ai-summary-${note.id}`}
                      type="button"
                      onClick={handleGenerateSummary}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-amber-950 dark:text-amber-200 font-semibold bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 transition-colors border border-amber-500/20"
                      role="menuitem"
                      title="Generate summary with AI Writing Assistant"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/30" />
                        <span className="truncate">AI Summary</span>
                      </span>
                      <span className="px-1 py-0.2 text-[9px] uppercase font-bold tracking-wider bg-amber-200/90 dark:bg-amber-950 text-amber-900 dark:text-amber-300 rounded shrink-0">
                        AI
                      </span>
                    </button>

                    {/* Archive / Unarchive */}
                    <button
                      type="button"
                      onClick={(e) => {
                        toggleArchive(e);
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                    >
                      {note.archived ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Unarchive Note</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>Archive Note</span>
                        </>
                      )}
                    </button>

                    {/* Move to Folder */}
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFolderSubmenu((prev) => !prev);
                        }}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        role="menuitem"
                      >
                        <span className="flex items-center gap-2">
                          <FolderIcon
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: folder?.color || '#f59e0b' }}
                          />
                          <span className="truncate max-w-[130px]">{folder ? folder.name : 'Assign Folder'}</span>
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform ${showFolderSubmenu ? 'rotate-90' : ''}`} />
                      </button>

                      {showFolderSubmenu && (
                        <div className="mt-1 p-1 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200/80 dark:border-stone-750 space-y-0.5 max-h-36 overflow-y-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              changeFolder(null, e);
                              setShowQuickActions(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg text-[11px] hover:bg-stone-200/70 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-medium"
                          >
                            No Folder
                          </button>
                          {folders.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={(e) => {
                                changeFolder(f.id, e);
                                setShowQuickActions(false);
                              }}
                              className="w-full text-left px-2 py-1 rounded-lg text-[11px] hover:bg-stone-200/70 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium flex items-center justify-between gap-1.5"
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <FolderIcon className="w-3 h-3 shrink-0" style={{ color: f.color || '#f59e0b' }} />
                                <span className="truncate">{f.name}</span>
                              </span>
                              {note.folderId === f.id && (
                                <Check className="w-3 h-3 text-amber-500 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pin / Unpin */}
                    {!note.trashed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          togglePin(e);
                          setShowQuickActions(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        role="menuitem"
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-amber-500 text-amber-500' : 'text-stone-500'} shrink-0`} />
                        <span>{note.pinned ? 'Unpin Note' : 'Pin to Top'}</span>
                      </button>
                    )}

                    {/* Favorite / Unfavorite */}
                    {!note.trashed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          toggleFavorite(e);
                          setShowQuickActions(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        role="menuitem"
                      >
                        <Star className={`w-3.5 h-3.5 ${note.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-stone-500'} shrink-0`} />
                        <span>{note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={(e) => {
                        handleDuplicate(e);
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                    >
                      <Copy className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Duplicate Note</span>
                    </button>

                    {/* Save as Template */}
                    {onSaveAsTemplate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveAsTemplate(note);
                          setShowQuickActions(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        role="menuitem"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Save as Template</span>
                      </button>
                    )}

                    {/* Compare & Merge */}
                    {onCompareNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompareNote(note);
                          setShowQuickActions(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-indigo-800 dark:text-indigo-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        role="menuitem"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Compare & Merge...</span>
                      </button>
                    )}

                    {/* Copy Text */}
                    <button
                      type="button"
                      onClick={(e) => {
                        handleCopyContent(e);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      )}
                      <span>{copied ? 'Copied Content!' : 'Copy Text'}</span>
                    </button>

                    {/* Copy WikiLink */}
                    <button
                      type="button"
                      onClick={(e) => {
                        handleCopyWikiLink(e);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                    >
                      {copiedWikiLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>{copiedWikiLink ? 'Copied WikiLink!' : 'Copy [[WikiLink]]'}</span>
                    </button>

                    {/* Share via Native Share Sheet */}
                    <button
                      id={`btn-quick-share-${note.id}`}
                      type="button"
                      onClick={(e) => {
                        handleShare(e);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                      title="Share note via browser share sheet"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Share Note</span>
                    </button>

                    {/* Copy Link (Deep Link) */}
                    <button
                      id={`btn-quick-copy-link-${note.id}`}
                      type="button"
                      onClick={(e) => {
                        handleCopyLink(e);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                      title="Copy deep link to this note"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Link className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      )}
                      <span>{copiedLink ? 'Copied Deep Link!' : 'Copy Link'}</span>
                    </button>

                    {/* Export Markdown */}
                    <button
                      type="button"
                      onClick={(e) => {
                        handleDownloadMd(e);
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      role="menuitem"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span>Export Markdown</span>
                    </button>
                  </div>

                  {/* Divider & Delete Action */}
                  <div className="h-px bg-stone-200/80 dark:bg-stone-800 my-1" />
                  <button
                    type="button"
                    onClick={(e) => {
                      toggleTrash(e);
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    role="menuitem"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{note.trashed ? (onDeleteForever ? 'Delete Forever' : 'Delete') : 'Move to Trash'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attached Images preview */}
        {note.images && note.images.length > 0 && !note.isLocked && (
          <div className="rounded-xl overflow-hidden mb-2 border border-stone-300/80 dark:border-stone-700">
            <img
              src={note.images[0].dataUrl}
              alt={note.images[0].name || 'Attachment'}
              className="w-full h-32 object-cover"
            />
            {note.images.length > 1 && (
              <div className="bg-stone-950/80 text-white text-[10px] px-2 py-0.5 text-right font-semibold">
                +{note.images.length - 1} more images
              </div>
            )}
          </div>
        )}

        {/* Main Content: Text or Checklist or Locked Mask */}
        {note.isLocked ? (
          <div className="py-4 px-3 rounded-xl bg-stone-100/70 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center text-center space-y-1 text-xs text-stone-500 dark:text-stone-400">
            <Lock className="w-5 h-5 text-rose-500 opacity-80 mb-0.5" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">Protected Note</span>
            <span className="text-[11px]">Click to unlock with passcode</span>
          </div>
        ) : isChecklist ? (
          <div className="space-y-2 text-xs text-stone-950 dark:text-stone-50">
            {/* Checklist Progress Bar */}
            {note.checklist && note.checklist.length > 0 && (
              <div className="space-y-1 pb-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  <span>{completedItems.length} of {note.checklist.length} done</span>
                  <span className="font-mono text-[10px] font-bold">{checklistProgress}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-stone-200/80 dark:bg-stone-750 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Open Items */}
            {visibleOpenItems.map((item) => (
              <div
                key={item.id}
                onClick={(e) => handleToggleCheckItem(item.id, e)}
                className="flex items-start gap-2 py-0.5 hover:text-stone-950 dark:hover:text-white text-stone-950 dark:text-stone-50 font-medium"
              >
                <button className="mt-0.5 text-stone-600 dark:text-stone-400 hover:text-amber-600 shrink-0">
                  <Square className="w-3.5 h-3.5 stroke-[2.25]" />
                </button>
                <span className="leading-snug break-words flex-1">
                  <HighlightText text={item.text} highlightTerms={activeHighlightTerms} />
                </span>
              </div>
            ))}

            {/* Hidden items overflow hint */}
            {!showAllChecklist && openItems.length > maxItemsToShow && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllChecklist(true);
                }}
                className="text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white text-[11px] font-semibold flex items-center gap-1 pt-1"
              >
                <ChevronDown className="w-3 h-3" /> +{openItems.length - maxItemsToShow} more items
              </button>
            )}

            {/* Completed items summary */}
            {completedItems.length > 0 && (
              <div className="pt-1.5 border-t border-stone-300/80 dark:border-stone-750 text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                <span className="line-through">
                  ✓ {completedItems.length} completed {completedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}
          </div>
        ) : tableData ? (
          <div className="space-y-2 text-xs">
            {tableData.leadSnippet && (
              <div className="text-stone-700 dark:text-stone-300 font-normal leading-relaxed break-words whitespace-pre-wrap line-clamp-2">
                <HighlightText text={tableData.leadSnippet} highlightTerms={activeHighlightTerms} />
              </div>
            )}
            {/* Spreadsheet Mini Grid */}
            <div className="rounded-xl border border-stone-300/80 dark:border-stone-700/80 overflow-hidden bg-white/70 dark:bg-stone-900/70 text-[11px] shadow-2xs">
              <div className="flex items-center justify-between px-2.5 py-1 bg-stone-200/60 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-750 font-semibold text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-1.5 truncate">
                  <Table className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{tableData.table.headers[0] || 'Table'}</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 shrink-0">
                  {tableData.table.headers.length} cols × {tableData.table.rows.length} rows
                </span>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-stone-100/80 dark:bg-stone-850/80 text-stone-700 dark:text-stone-300 font-medium border-b border-stone-200/80 dark:border-stone-750">
                      {tableData.table.headers.slice(0, 3).map((h, hIdx) => (
                        <th key={hIdx} className="px-2 py-1 truncate max-w-[100px] border-r border-stone-200/80 dark:border-stone-750 last:border-r-0">
                          {h}
                        </th>
                      ))}
                      {tableData.table.headers.length > 3 && (
                        <th className="px-1 py-1 text-stone-400 text-center font-mono text-[10px]">+{tableData.table.headers.length - 3}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60 dark:divide-stone-750/60">
                    {tableData.table.rows.slice(0, 3).map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                        {tableData.table.headers.slice(0, 3).map((_, cIdx) => (
                          <td key={cIdx} className="px-2 py-1 truncate max-w-[100px] border-r border-stone-200/60 dark:border-stone-750/60 last:border-r-0 text-stone-800 dark:text-stone-200">
                            {r[cIdx] ? r[cIdx] : <span className="opacity-30">—</span>}
                          </td>
                        ))}
                        {tableData.table.headers.length > 3 && (
                          <td className="px-1 py-1 text-center text-stone-400 text-[10px] font-mono">···</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tableData.table.rows.length > 3 && (
                <div className="px-2.5 py-1 bg-stone-100/40 dark:bg-stone-850/40 text-[10px] text-stone-400 dark:text-stone-500 border-t border-stone-200/60 dark:border-stone-750/60 flex items-center justify-between">
                  <span>+{tableData.table.rows.length - 3} more rows</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Click to edit</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Text Content with Wiki Link rendering */
          <div className="text-xs text-stone-900 dark:text-stone-100 font-normal leading-relaxed break-words whitespace-pre-wrap line-clamp-8">
            {textSegments.map((seg, idx) => {
              if (seg.type === 'link') {
                return (
                  <WikiLinkWithHoverPreview
                    key={idx}
                    targetTitle={seg.targetTitle || ''}
                    targetNoteId={seg.targetNoteId}
                    targetSnippet={seg.targetSnippet}
                    isEmbed={seg.isEmbed}
                    activeHighlightTerms={activeHighlightTerms}
                    onOpenLinkedNote={onOpenLinkedNote}
                  />
                );
              }
              return (
                <HighlightText
                  key={idx}
                  text={seg.content}
                  highlightTerms={activeHighlightTerms}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Metadata: Folder, Tags, Reminder, Voice, History */}
      <div className="mt-3 pt-2 space-y-2">
        {/* Badges / Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {folder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onFilterFolder) onFilterFolder(folder.id);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-[11px] font-semibold border border-stone-300/80 dark:border-stone-700 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
              title={`Folder: ${folder.name}`}
            >
              <FolderIcon
                className="w-3 h-3 shrink-0"
                style={{ color: folder.color || '#f59e0b' }}
              />
              <span className="truncate max-w-[120px]">
                <HighlightText text={folder.name} highlightTerms={activeHighlightTerms} />
              </span>
            </button>
          )}

          {note.reminderDate && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-200/80 dark:bg-sky-950 text-sky-950 dark:text-sky-200 text-[11px] font-semibold border border-sky-300/80 dark:border-sky-800"
              title={`Reminder: ${new Date(note.reminderDate).toLocaleString()}`}
            >
              <Bell className="w-3 h-3 text-sky-700 dark:text-sky-400" />
              <span>
                {new Date(note.reminderDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {note.audios && note.audios.length > 0 && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 text-[11px] font-semibold border border-rose-300 dark:border-rose-800"
              title={`${note.audios.length} Voice Memo(s)`}
            >
              <Volume2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>{note.audios.length}</span>
            </div>
          )}

          {tableData && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 text-[11px] font-semibold border border-amber-300 dark:border-amber-800"
              title={`Table: ${tableData.table.headers.length} columns × ${tableData.table.rows.length} rows`}
            >
              <Table className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{tableData.table.headers.length}×{tableData.table.rows.length}</span>
            </div>
          )}

          {note.revisions && note.revisions.length > 0 && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-[11px] font-medium border border-stone-300/60 dark:border-stone-700"
              title={`${note.revisions.length} Revision(s) Saved`}
            >
              <History className="w-3 h-3 text-stone-500" />
              <span>v{note.revisions.length}</span>
            </div>
          )}

          {note.tags &&
            note.tags.map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFilterTag) onFilterTag(t);
                }}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 text-[11px] font-semibold border border-amber-300/70 dark:border-amber-700/60 hover:bg-amber-300 dark:hover:bg-amber-900 transition-colors"
              >
                #<HighlightText text={t} highlightTerms={activeHighlightTerms} />
              </button>
            ))}
        </div>

        {/* Hover Action Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 ease-out sm:translate-y-1 group-hover:translate-y-0 focus-within:translate-y-0 pt-1 text-stone-600 dark:text-stone-300"
        >
          {!note.trashed ? (
            <div className="flex items-center gap-1">
              {/* Color Picker Button & Popup */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 rounded-lg hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700 transition-colors flex items-center justify-center"
                  title="Change note color"
                  aria-label="Change note color"
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                </button>
                {showColorPicker && (
                  <div className="absolute left-0 bottom-full mb-1.5 p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 grid grid-cols-5 gap-1.5 w-44">
                    {COLOR_KEYS.map((k) => (
                      <button
                        key={k}
                        onClick={(e) => changeColor(k, e)}
                        className={`w-6 h-6 rounded-full border border-stone-300 dark:border-stone-700 transition-transform ${
                          note.color === k ? 'scale-115 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: NOTE_COLORS[k].hex }}
                        title={NOTE_COLORS[k].name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Folder Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowFolderPicker(!showFolderPicker)}
                  className="p-1.5 rounded-lg hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700 transition-colors flex items-center justify-center"
                  title="Assign to folder"
                  aria-label="Assign to folder"
                >
                  <FolderIcon className="w-3.5 h-3.5 shrink-0" />
                </button>
                {showFolderPicker && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-44 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                    <button
                      onClick={(e) => changeFolder(null, e)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                    >
                      No Folder
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={(e) => changeFolder(f.id, e)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-950 dark:text-stone-100 font-semibold flex items-center gap-1.5"
                      >
                        <FolderIcon
                          className="w-3 h-3 shrink-0"
                          style={{ color: f.color || '#f59e0b' }}
                        />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pin / Unpin directly from hover menu */}
              <button
                id={`btn-hover-pin-${note.id}`}
                onClick={togglePin}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  note.pinned
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/50 dark:border-amber-700/60'
                    : 'hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700'
                }`}
                title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note to top'}
                aria-pressed={Boolean(note.pinned)}
              >
                <Pin className={`w-3.5 h-3.5 shrink-0 ${note.pinned ? 'fill-amber-600 dark:fill-amber-400 text-amber-600 dark:text-amber-400' : ''}`} />
              </button>

              {/* AI Summary from hover menu */}
              <button
                id={`btn-hover-ai-summary-${note.id}`}
                onClick={handleGenerateSummary}
                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100/80 dark:hover:bg-amber-950/70 transition-colors flex items-center justify-center"
                title="Generate AI summary with Writing Assistant"
                aria-label="Generate AI summary"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 fill-amber-500/30" />
              </button>

              {/* Archive Toggle */}
              <button
                onClick={toggleArchive}
                className="p-1.5 rounded-lg hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700 transition-colors flex items-center justify-center"
                title={note.archived ? 'Unarchive' : 'Archive'}
                aria-label={note.archived ? 'Unarchive' : 'Archive'}
              >
                {note.archived ? (
                  <ArchiveRestore className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              {/* Trash */}
              <button
                onClick={toggleTrash}
                className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors flex items-center justify-center"
                title="Send to Trash"
                aria-label="Send to Trash"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
              </button>

              {/* Copy Note Content */}
              <button
                onClick={handleCopyContent}
                className="p-1.5 rounded-lg hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700 transition-colors flex items-center justify-center"
                title={copied ? 'Copied to clipboard!' : 'Copy note content'}
                aria-label="Copy note content"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              {/* More options menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-lg hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-700 transition-colors flex items-center justify-center"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreVertical className="w-3.5 h-3.5 shrink-0" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-44 p-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                    <button
                      onClick={handleGenerateSummary}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-amber-900 dark:text-amber-200 font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-amber-500/30" /> AI Summary
                    </button>
                    <button
                      onClick={handleDuplicate}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" /> Duplicate
                    </button>
                    {onSaveAsTemplate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveAsTemplate(note);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 shrink-0 text-amber-500" /> Save as Template
                      </button>
                    )}
                    {onCompareNote && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompareNote(note);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-indigo-800 dark:text-indigo-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <GitMerge className="w-3.5 h-3.5 shrink-0 text-indigo-500" /> Compare & Merge...
                      </button>
                    )}
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0 text-amber-500" /> Share Note
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <Link className="w-3.5 h-3.5 shrink-0 text-stone-500" />
                      )}
                      <span>{copiedLink ? 'Copied Deep Link!' : 'Copy Link'}</span>
                    </button>
                    <button
                      onClick={handleCopyWikiLink}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      {copiedWikiLink ? (
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      )}
                      <span>{copiedWikiLink ? 'Copied WikiLink!' : 'Copy WikiLink'}</span>
                    </button>
                    <button
                      onClick={handleDownloadMd}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" /> Export Markdown
                    </button>
                    <button
                      onClick={handlePrintNote}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-900 dark:text-stone-100 font-medium hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0 text-purple-500" /> Print / PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Trashed Controls */
            <div className="flex items-center justify-between w-full">
              <button
                onClick={toggleTrash}
                className="inline-flex items-center gap-1 text-xs text-stone-800 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white font-semibold"
              >
                <RotateCcw className="w-3 h-3 shrink-0" /> Restore
              </button>
              {onDeleteForever && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteForever(note.id);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-rose-700 hover:text-rose-800 dark:text-rose-400 font-bold"
                >
                  <Trash2 className="w-3 h-3 shrink-0" /> Delete forever
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-300 font-mono font-medium">
            {cardWordCount > 0 && <span title={`${cardWordCount} words`}>{cardWordCount}w ·</span>}
            <span>
              {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* AI Writing Assistant Summary Dialog / Modal */}
      {showSummaryModal && generatedSummary && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`summary-title-${note.id}`}
        >
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col text-stone-900 dark:text-stone-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 fill-amber-500/30" />
                </div>
                <div>
                  <h3 id={`summary-title-${note.id}`} className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    AI Summary
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300">
                      Writing Assistant
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-xs">
                    {note.title || 'Untitled Note'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Close summary modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 overflow-y-auto pr-1 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Summary (TL;DR)
                </span>
                <p className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 leading-relaxed">
                  {generatedSummary.summary || 'No text content available to summarize.'}
                </p>
              </div>

              {generatedSummary.keyTakeaways && generatedSummary.keyTakeaways.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    Key Takeaways
                  </span>
                  <ul className="space-y-1 p-3 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200">
                    {generatedSummary.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={handleCopySummaryText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied Summary!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrependSummaryToNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-stone-950/20" />
                  <span>Insert into Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const NoteCard = memo(NoteCardComponent);
