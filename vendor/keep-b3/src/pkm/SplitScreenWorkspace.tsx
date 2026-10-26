import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Columns2,
  Minimize2,
  Maximize2,
  Pin,
  PinOff,
  ArrowLeftRight,
  X,
  Eye,
  Edit3,
  Search,
  Sliders,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Link2,
  FileText,
  UnfoldHorizontal,
  CheckSquare,
  Volume2,
  Lock,
  Unlock,
  CornerUpRight,
} from 'lucide-react';
import { Note, Folder } from '../types';
import { vaultManager } from './indexer';
import { PKMPreviewRenderer } from './PKMPreviewRenderer';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { PKMEditorOutliner } from './PKMEditorOutliner';
import { parseMarkdownSections, FoldStateManager, NoteFoldState } from './outliner';
import {
  SplitMode,
  PinnedPane,
  SplitLayoutState,
  loadStoredSplitLayout,
  saveStoredSplitLayout,
} from './splitTypes';
import { BidirectionalScrollSync } from './scrollSync';
import { extractClipboardContent } from './webCapture';

interface SplitScreenWorkspaceProps {
  primaryNote: Note;
  allNotes: Note[];
  folders: Folder[];
  onUpdatePrimaryNote: (updated: Note) => void;
  onUpdateSecondaryNote?: (updated: Note) => void;
  onOpenLinkedNote: (noteId: string) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onCloseSplit: () => void;
}

export const SplitScreenWorkspace: React.FC<SplitScreenWorkspaceProps> = ({
  primaryNote,
  allNotes,
  folders,
  onUpdatePrimaryNote,
  onUpdateSecondaryNote,
  onOpenLinkedNote,
  onCreateNoteWithTitle,
  onOpenPDF,
  onCloseSplit,
}) => {
  // 1. Initial State from localStorage
  const [layout, setLayout] = useState<SplitLayoutState>(() => loadStoredSplitLayout());

  // Left (Primary) Note State
  const [leftTitle, setLeftTitle] = useState(primaryNote.title);
  const [leftContent, setLeftContent] = useState(primaryNote.content);
  const [leftPreview, setLeftPreview] = useState(false);
  const [leftFoldState, setLeftFoldState] = useState<NoteFoldState>(() =>
    FoldStateManager.loadFoldState(primaryNote.id)
  );

  // Right (Secondary) Note State
  const [secondaryNoteId, setSecondaryNoteId] = useState<string | null>(() => {
    if (layout.secondaryNoteId && allNotes.some((n) => n.id === layout.secondaryNoteId)) {
      return layout.secondaryNoteId;
    }
    // Default secondary note: pick first different note or fallback to primary
    const other = allNotes.find((n) => n.id !== primaryNote.id && !n.trashed);
    return other ? other.id : null;
  });

  const secondaryNote = useMemo(() => {
    if (!secondaryNoteId) return null;
    return allNotes.find((n) => n.id === secondaryNoteId) || null;
  }, [secondaryNoteId, allNotes]);

  const [rightTitle, setRightTitle] = useState(secondaryNote?.title || '');
  const [rightContent, setRightContent] = useState(secondaryNote?.content || '');
  const [rightPreview, setRightPreview] = useState(false);
  const [rightFoldState, setRightFoldState] = useState<NoteFoldState>(() =>
    secondaryNote ? FoldStateManager.loadFoldState(secondaryNote.id) : { foldedHeadingIds: [], foldedListLines: [] }
  );

  // Active Pane focus for keyboard shortcuts
  const [activeFocusedPane, setActiveFocusedPane] = useState<'left' | 'right'>('left');

  // Secondary Note Picker dropdown state
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [notePickerFilter, setNotePickerFilter] = useState('');

  // Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // DOM Refs for Scroll Synchronization
  const leftEditorRef = useRef<HTMLTextAreaElement>(null);
  const rightPreviewRef = useRef<HTMLDivElement>(null);
  const rightEditorRef = useRef<HTMLTextAreaElement>(null);

  // Scroll Sync Controller Instance
  const scrollSyncRef = useRef<BidirectionalScrollSync>(new BidirectionalScrollSync(layout.syncScroll));

  useEffect(() => {
    scrollSyncRef.current.setEnabled(layout.syncScroll);
  }, [layout.syncScroll]);

  // Sync Primary Note changes from external
  useEffect(() => {
    setLeftTitle(primaryNote.title);
    setLeftContent(primaryNote.content);
    setLeftFoldState(FoldStateManager.loadFoldState(primaryNote.id));
  }, [primaryNote.id]);

  // Sync Secondary Note changes
  useEffect(() => {
    if (secondaryNote) {
      setRightTitle(secondaryNote.title);
      setRightContent(secondaryNote.content);
      setRightFoldState(FoldStateManager.loadFoldState(secondaryNote.id));
    }
  }, [secondaryNote?.id]);

  // Debounced Autosave for Left Note
  const primarySaveTimer = useRef<any>(null);
  const savePrimaryChanges = useCallback(
    (newTitle: string, newContent: string) => {
      clearTimeout(primarySaveTimer.current);
      primarySaveTimer.current = setTimeout(() => {
        const updated: Note = {
          ...primaryNote,
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        onUpdatePrimaryNote(updated);
        vaultManager.onNoteUpdated(updated);
      }, 300);
    },
    [primaryNote, onUpdatePrimaryNote]
  );

  // Debounced Autosave for Right Note
  const secondarySaveTimer = useRef<any>(null);
  const saveSecondaryChanges = useCallback(
    (newTitle: string, newContent: string) => {
      if (!secondaryNote || !onUpdateSecondaryNote) return;
      clearTimeout(secondarySaveTimer.current);
      secondarySaveTimer.current = setTimeout(() => {
        const updated: Note = {
          ...secondaryNote,
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        onUpdateSecondaryNote(updated);
        vaultManager.onNoteUpdated(updated);
      }, 300);
    },
    [secondaryNote, onUpdateSecondaryNote]
  );

  // Flush saves on unmount
  useEffect(() => {
    return () => {
      clearTimeout(primarySaveTimer.current);
      clearTimeout(secondarySaveTimer.current);
    };
  }, []);

  // Update layout and persist
  const updateLayout = useCallback(
    (partial: Partial<SplitLayoutState>) => {
      setLayout((prev) => {
        const next = { ...prev, ...partial };
        saveStoredSplitLayout(next);
        return next;
      });
    },
    []
  );

  // Swap Left and Right Panes
  const handleSwapPanes = useCallback(() => {
    if (layout.mode === 'edit-preview') {
      // In edit-preview mode, swapping toggles left/right roles or switches side
      setLeftPreview((p) => !p);
      setRightPreview((p) => !p);
      return;
    }

    if (layout.mode === 'two-note' && secondaryNote) {
      // Swap primary and secondary notes
      const tempId = primaryNote.id;
      setSecondaryNoteId(tempId);
      updateLayout({ secondaryNoteId: tempId });
      onOpenLinkedNote(secondaryNote.id);
    }
  }, [layout.mode, secondaryNote, primaryNote.id, onOpenLinkedNote, updateLayout]);

  // Pin Toggle
  const handleTogglePin = (pane: 'left' | 'right') => {
    const nextPinned: PinnedPane = layout.pinnedPane === pane ? 'none' : pane;
    updateLayout({ pinnedPane: nextPinned });
  };

  // Switch Secondary Note
  const handleSelectSecondaryNote = (noteId: string) => {
    setSecondaryNoteId(noteId);
    updateLayout({ secondaryNoteId: noteId });
    setShowNotePicker(false);
  };

  // Smart Paste Handlers
  const handleLeftPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const extracted = await extractClipboardContent(e.clipboardData);
    if (extracted.hasHtml && extracted.markdown) {
      e.preventDefault();
      const ta = leftEditorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = leftContent.slice(0, start) + extracted.markdown + leftContent.slice(end);
      setLeftContent(next);
      savePrimaryChanges(leftTitle, next);
    }
  };

  const handleRightPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const extracted = await extractClipboardContent(e.clipboardData);
    if (extracted.hasHtml && extracted.markdown) {
      e.preventDefault();
      const ta = rightEditorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = rightContent.slice(0, start) + extracted.markdown + rightContent.slice(end);
      setRightContent(next);
      saveSecondaryChanges(rightTitle, next);
    }
  };

  // Handle Wiki-Link Navigation with Pin Support
  const handleWikiLinkClick = (targetNoteId: string, isAltKey = false) => {
    // Pin rules:
    // If Left is pinned: link opens in Right pane
    // If Right is pinned: link opens in Left pane
    // If Alt Key is pressed: open in opposite pane
    if (layout.mode === 'single') {
      onOpenLinkedNote(targetNoteId);
      return;
    }

    if (layout.mode === 'edit-preview') {
      if (isAltKey) {
        // Alt key in edit-preview switches mode to two-note comparison
        setSecondaryNoteId(targetNoteId);
        updateLayout({ mode: 'two-note', secondaryNoteId: targetNoteId });
      } else {
        onOpenLinkedNote(targetNoteId);
      }
      return;
    }

    // In two-note mode
    if (layout.pinnedPane === 'left') {
      setSecondaryNoteId(targetNoteId);
      updateLayout({ secondaryNoteId: targetNoteId });
    } else if (layout.pinnedPane === 'right') {
      onOpenLinkedNote(targetNoteId);
    } else if (isAltKey) {
      if (activeFocusedPane === 'left') {
        setSecondaryNoteId(targetNoteId);
        updateLayout({ secondaryNoteId: targetNoteId });
      } else {
        onOpenLinkedNote(targetNoteId);
      }
    } else {
      if (activeFocusedPane === 'right') {
        setSecondaryNoteId(targetNoteId);
        updateLayout({ secondaryNoteId: targetNoteId });
      } else {
        onOpenLinkedNote(targetNoteId);
      }
    }
  };

  // Divider Drag Handlers
  const handleMouseDownDivider = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPercent = (x / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, Math.round(rawPercent)));
      updateLayout({ splitRatio: clamped });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateLayout]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Split Mode: Alt + \
      if (e.altKey && e.key === '\\') {
        e.preventDefault();
        const nextMode: SplitMode =
          layout.mode === 'single'
            ? 'edit-preview'
            : layout.mode === 'edit-preview'
            ? 'two-note'
            : 'single';
        updateLayout({ mode: nextMode });
      }
      // Focus Next Pane: Alt + O or F6
      else if ((e.altKey && (e.key === 'o' || e.key === 'O')) || e.key === 'F6') {
        e.preventDefault();
        setActiveFocusedPane((prev) => (prev === 'left' ? 'right' : 'left'));
        if (activeFocusedPane === 'left') {
          rightEditorRef.current?.focus();
        } else {
          leftEditorRef.current?.focus();
        }
      }
      // Swap Panes: Alt + Shift + S
      else if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handleSwapPanes();
      }
      // Close Secondary Pane: Alt + W
      else if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        updateLayout({ mode: 'single' });
      }
      // Toggle Pin on Active Pane: Alt + P
      else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleTogglePin(activeFocusedPane);
      }
      // Toggle Scroll Sync: Alt + S (without shift)
      else if (e.altKey && !e.shiftKey && (e.key === 's' || e.key === 's')) {
        e.preventDefault();
        updateLayout({ syncScroll: !layout.syncScroll });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout.mode, layout.syncScroll, activeFocusedPane, handleSwapPanes, updateLayout]);

  // Filtered Notes for Picker
  const pickerCandidates = useMemo(() => {
    const query = notePickerFilter.toLowerCase().trim();
    return allNotes
      .filter((n) => !n.trashed && n.id !== primaryNote.id)
      .filter((n) => !query || n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query))
      .slice(0, 15);
  }, [allNotes, primaryNote.id, notePickerFilter]);

  const leftSections = useMemo(() => parseMarkdownSections(leftContent), [leftContent]);
  const rightSections = useMemo(
    () => (layout.mode === 'two-note' && secondaryNote ? parseMarkdownSections(rightContent) : []),
    [layout.mode, secondaryNote, rightContent]
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-stone-50 dark:bg-stone-900 select-none"
    >
      {/* Top Workspace Control Bar */}
      <div className="px-4 py-2.5 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => updateLayout({ mode: 'single' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              layout.mode === 'single'
                ? 'bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="Single Note View"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Single Note</span>
          </button>

          <button
            type="button"
            onClick={() => updateLayout({ mode: 'edit-preview' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              layout.mode === 'edit-preview'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="Edit + Preview Dual Mode (Alt+\)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Edit + Preview</span>
          </button>

          <button
            type="button"
            onClick={() => updateLayout({ mode: 'two-note' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              layout.mode === 'two-note'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
            title="Two-Note Comparison Mode"
          >
            <UnfoldHorizontal className="w-3.5 h-3.5" />
            <span>Compare 2 Notes</span>
          </button>
        </div>

        {/* Global Split Controls */}
        <div className="flex items-center gap-1.5">
          {/* Scroll Sync Toggle */}
          {layout.mode === 'edit-preview' && (
            <button
              type="button"
              onClick={() => updateLayout({ syncScroll: !layout.syncScroll })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                layout.syncScroll
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="Toggle Bidirectional Synchronized Scrolling (Alt+S)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {layout.syncScroll ? 'Sync Scroll: ON' : 'Sync Scroll: OFF'}
              </span>
            </button>
          )}

          {/* Swap Panes */}
          {layout.mode !== 'single' && (
            <button
              type="button"
              onClick={handleSwapPanes}
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Swap Left and Right Panes (Alt+Shift+S)"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}

          {/* Reset 50/50 ratio */}
          {layout.mode !== 'single' && layout.splitRatio !== 50 && (
            <button
              type="button"
              onClick={() => updateLayout({ splitRatio: 50 })}
              className="px-2 py-1 rounded-lg text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800"
              title="Reset to 50/50 Split"
            >
              50:50
            </button>
          )}

          {/* Close Secondary Pane */}
          {layout.mode !== 'single' && (
            <button
              type="button"
              onClick={() => updateLayout({ mode: 'single' })}
              className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Close Secondary Pane (Alt+W)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}

          {/* Close Entire Modal */}
          <button
            type="button"
            onClick={onCloseSplit}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1"
            title="Close Note (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Responsive Segmented Tab Bar (< 768px) */}
      {layout.mode !== 'single' && (
        <div className="md:hidden flex items-center bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 p-1">
          <button
            type="button"
            onClick={() => updateLayout({ activeMobileTab: 'left' })}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              layout.activeMobileTab === 'left'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate max-w-[120px]">{primaryNote.title || 'Pane 1'}</span>
            {layout.pinnedPane === 'left' && <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />}
          </button>

          <button
            type="button"
            onClick={() => updateLayout({ activeMobileTab: 'right' })}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              layout.activeMobileTab === 'right'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {layout.mode === 'edit-preview' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Preview</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate max-w-[120px]">{secondaryNote?.title || 'Pane 2'}</span>
                {layout.pinnedPane === 'right' && (
                  <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Dual Panes Area */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* LEFT PANE */}
        <div
          style={{
            width:
              layout.mode === 'single'
                ? '100%'
                : window.innerWidth < 768
                ? layout.activeMobileTab === 'left'
                  ? '100%'
                  : '0%'
                : `${layout.splitRatio}%`,
            display:
              window.innerWidth < 768 && layout.mode !== 'single' && layout.activeMobileTab !== 'left'
                ? 'none'
                : 'flex',
          }}
          className={`flex flex-col h-full overflow-hidden bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 ${
            activeFocusedPane === 'left' ? 'ring-1 ring-amber-500/20' : ''
          }`}
          onClick={() => setActiveFocusedPane('left')}
        >
          {/* Left Pane Header */}
          <div className="px-4 py-2 bg-stone-50/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={leftTitle}
                onChange={(e) => {
                  setLeftTitle(e.target.value);
                  savePrimaryChanges(e.target.value, leftContent);
                }}
                placeholder="Note title..."
                className="font-bold text-sm text-stone-900 dark:text-white bg-transparent focus:outline-hidden truncate flex-1"
              />
              <span className="text-[10px] text-stone-400 font-mono shrink-0">
                {leftContent.trim() ? `${leftContent.trim().split(/\s+/).length} words` : '0 words'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Pin Left Pane */}
              <button
                type="button"
                onClick={() => handleTogglePin('left')}
                className={`p-1.5 rounded-lg transition-colors ${
                  layout.pinnedPane === 'left'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
                title={layout.pinnedPane === 'left' ? 'Left pane is pinned (links open in right pane)' : 'Pin left pane (Alt+P)'}
              >
                <Pin className={`w-3.5 h-3.5 ${layout.pinnedPane === 'left' ? 'fill-current' : ''}`} />
              </button>

              {/* Mode Toggle within left pane */}
              <button
                type="button"
                onClick={() => setLeftPreview(!leftPreview)}
                className={`p-1.5 rounded-lg transition-colors ${
                  leftPreview
                    ? 'bg-amber-500 text-white'
                    : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                }`}
                title={leftPreview ? 'Switch to Edit' : 'Switch to Preview'}
              >
                {leftPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Left Toolbar */}
          {!leftPreview && (
            <div className="px-4 py-1.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <MarkdownToolbar
                onApplyFormat={(format) => {
                  const ta = leftEditorRef.current;
                  if (!ta) return;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const sel = leftContent.slice(start, end);
                  let ins = `**${sel || 'bold'}**`;
                  if (format === 'italic') ins = `*${sel || 'italic'}*`;
                  if (format === 'h1') ins = `\n# ${sel || 'Heading 1'}\n`;
                  if (format === 'h2') ins = `\n## ${sel || 'Heading 2'}\n`;
                  if (format === 'math-inline') ins = `$${sel || 'E = mc^2'}$`;
                  if (format === 'math-block') ins = `\n$$\n${sel || '\\int_0^\\infty e^{-x} dx = 1'}\n$$\n`;
                  if (format === 'mermaid') ins = `\n\`\`\`mermaid\ngraph TD;\n  A-->B;\n\`\`\`\n`;
                  const next = leftContent.slice(0, start) + ins + leftContent.slice(end);
                  setLeftContent(next);
                  savePrimaryChanges(leftTitle, next);
                }}
                onOpenPDFReader={() => {
                  if (onOpenPDF) onOpenPDF('', 1);
                }}
              />
            </div>
          )}

          {/* Left Body */}
          <div className="flex-1 overflow-y-auto p-4 select-text">
            {leftPreview ? (
              <PKMPreviewRenderer
                content={leftContent}
                sourceNoteId={primaryNote.id}
                allNotes={allNotes}
                folders={folders}
                onContentChange={(newContent) => {
                  setLeftContent(newContent);
                  savePrimaryChanges(leftTitle, newContent);
                }}
                externalFoldState={leftFoldState}
                onOpenNote={(targetId) => handleWikiLinkClick(targetId, false)}
                onCreateNote={(targetTitle) => {
                  if (onCreateNoteWithTitle) onCreateNoteWithTitle(targetTitle);
                }}
                onOpenPDF={onOpenPDF}
              />
            ) : (
              <textarea
                ref={leftEditorRef}
                value={leftContent}
                onChange={(e) => {
                  setLeftContent(e.target.value);
                  savePrimaryChanges(leftTitle, e.target.value);
                }}
                onPaste={handleLeftPaste}
                onScroll={() => {
                  if (layout.mode === 'edit-preview' && layout.syncScroll) {
                    scrollSyncRef.current.handleEditorScroll(
                      leftEditorRef.current,
                      rightPreviewRef.current
                    );
                  }
                }}
                placeholder="Markdown content... Type [[ to link notes"
                className="w-full h-full min-h-[300px] bg-transparent text-stone-900 dark:text-stone-100 text-sm font-mono sm:font-sans focus:outline-hidden resize-none leading-relaxed"
              />
            )}
          </div>
        </div>

        {/* DRAGGABLE RESIZER HANDLE (Desktop only, >= 768px) */}
        {layout.mode !== 'single' && (
          <div
            onMouseDown={handleMouseDownDivider}
            className="hidden md:flex w-2 hover:w-3 bg-stone-200 dark:bg-stone-800 hover:bg-amber-400 dark:hover:bg-amber-600 cursor-col-resize items-center justify-center transition-all z-30 select-none group"
            title="Drag to resize panes (double-click to reset 50/50)"
            onDoubleClick={() => updateLayout({ splitRatio: 50 })}
          >
            <div className="w-0.5 h-8 rounded-full bg-stone-400 dark:bg-stone-600 group-hover:bg-white" />
          </div>
        )}

        {/* RIGHT PANE */}
        {layout.mode !== 'single' && (
          <div
            style={{
              width:
                window.innerWidth < 768
                  ? layout.activeMobileTab === 'right'
                    ? '100%'
                    : '0%'
                  : `${100 - layout.splitRatio}%`,
              display:
                window.innerWidth < 768 && layout.activeMobileTab !== 'right' ? 'none' : 'flex',
            }}
            className={`flex flex-col h-full overflow-hidden bg-white dark:bg-stone-900 ${
              activeFocusedPane === 'right' ? 'ring-1 ring-amber-500/20' : ''
            }`}
            onClick={() => setActiveFocusedPane('right')}
          >
            {/* Right Pane Header */}
            <div className="px-4 py-2 bg-stone-50/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              {layout.mode === 'edit-preview' ? (
                /* Edit-Preview Mode: Right pane represents live preview */
                <div className="flex items-center gap-2 flex-1">
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-sm text-stone-900 dark:text-white truncate">
                    Preview: {leftTitle || 'Untitled Note'}
                  </span>
                </div>
              ) : (
                /* Two-Note Mode: Right pane represents Note B with note picker */
                <div className="relative flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowNotePicker(!showNotePicker)}
                    className="flex items-center gap-1.5 font-bold text-sm text-stone-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 truncate text-left"
                    title="Click to select another note for comparison"
                  >
                    <span className="truncate">{secondaryNote?.title || 'Select Note...'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  </button>

                  {/* Note Picker Dropdown */}
                  {showNotePicker && (
                    <div className="absolute top-8 left-0 w-64 max-h-64 overflow-y-auto bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl z-50 p-2 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
                        <Search className="w-3.5 h-3.5 text-stone-400" />
                        <input
                          type="text"
                          placeholder="Search vault notes..."
                          value={notePickerFilter}
                          onChange={(e) => setNotePickerFilter(e.target.value)}
                          autoFocus
                          className="w-full bg-transparent focus:outline-hidden text-stone-900 dark:text-white"
                        />
                      </div>
                      <div className="mt-1 max-h-44 overflow-y-auto space-y-0.5">
                        {pickerCandidates.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleSelectSecondaryNote(n.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 text-stone-900 dark:text-stone-100 flex items-center justify-between group"
                          >
                            <span className="truncate font-medium">{n.title || 'Untitled'}</span>
                            <CornerUpRight className="w-3 h-3 text-stone-400 group-hover:text-amber-600 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Pane Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {layout.mode === 'two-note' && (
                  <>
                    {/* Pin Right Pane */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin('right')}
                      className={`p-1.5 rounded-lg transition-colors ${
                        layout.pinnedPane === 'right'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                      }`}
                      title={layout.pinnedPane === 'right' ? 'Right pane is pinned' : 'Pin right pane (Alt+P)'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${layout.pinnedPane === 'right' ? 'fill-current' : ''}`} />
                    </button>

                    {/* Mode Toggle for right pane */}
                    <button
                      type="button"
                      onClick={() => setRightPreview(!rightPreview)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        rightPreview
                          ? 'bg-amber-500 text-white'
                          : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'
                      }`}
                      title={rightPreview ? 'Switch to Edit' : 'Switch to Preview'}
                    >
                      {rightPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Pane Body */}
            {layout.mode === 'edit-preview' ? (
              /* Synchronized Preview Container */
              <div
                ref={rightPreviewRef}
                onScroll={() => {
                  if (layout.syncScroll) {
                    scrollSyncRef.current.handlePreviewScroll(
                      rightPreviewRef.current,
                      leftEditorRef.current
                    );
                  }
                }}
                className="flex-1 overflow-y-auto p-4 select-text"
              >
                <PKMPreviewRenderer
                  content={leftContent}
                  sourceNoteId={primaryNote.id}
                  allNotes={allNotes}
                  folders={folders}
                  onContentChange={(newContent) => {
                    setLeftContent(newContent);
                    savePrimaryChanges(leftTitle, newContent);
                  }}
                  externalFoldState={leftFoldState}
                  onOpenNote={(targetId) => handleWikiLinkClick(targetId, false)}
                  onCreateNote={(targetTitle) => {
                    if (onCreateNoteWithTitle) onCreateNoteWithTitle(targetTitle);
                  }}
                  onOpenPDF={onOpenPDF}
                />
              </div>
            ) : secondaryNote ? (
              /* Two-Note Comparison Pane */
              <div className="flex-1 flex flex-col overflow-hidden">
                {!rightPreview && (
                  <div className="px-4 py-1.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <MarkdownToolbar
                      onApplyFormat={(format) => {
                        const ta = rightEditorRef.current;
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        const sel = rightContent.slice(start, end);
                        let ins = `**${sel || 'bold'}**`;
                        if (format === 'italic') ins = `*${sel || 'italic'}*`;
                        if (format === 'h1') ins = `\n# ${sel || 'Heading 1'}\n`;
                        if (format === 'h2') ins = `\n## ${sel || 'Heading 2'}\n`;
                        if (format === 'math-inline') ins = `$${sel || 'E = mc^2'}$`;
                        if (format === 'math-block') ins = `\n$$\n${sel || 'f(x)'}\n$$\n`;
                        if (format === 'mermaid') ins = `\n\`\`\`mermaid\ngraph TD;\n  A-->B;\n\`\`\`\n`;
                        const next = rightContent.slice(0, start) + ins + rightContent.slice(end);
                        setRightContent(next);
                        saveSecondaryChanges(rightTitle, next);
                      }}
                      onOpenPDFReader={() => {
                        if (onOpenPDF) onOpenPDF('', 1);
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 select-text">
                  {rightPreview ? (
                    <PKMPreviewRenderer
                      content={rightContent}
                      sourceNoteId={secondaryNote.id}
                      allNotes={allNotes}
                      folders={folders}
                      onContentChange={(newContent) => {
                        setRightContent(newContent);
                        saveSecondaryChanges(rightTitle, newContent);
                      }}
                      externalFoldState={rightFoldState}
                      onOpenNote={(targetId) => handleWikiLinkClick(targetId, false)}
                      onCreateNote={(targetTitle) => {
                        if (onCreateNoteWithTitle) onCreateNoteWithTitle(targetTitle);
                      }}
                      onOpenPDF={onOpenPDF}
                    />
                  ) : (
                    <textarea
                      ref={rightEditorRef}
                      value={rightContent}
                      onChange={(e) => {
                        setRightContent(e.target.value);
                        saveSecondaryChanges(rightTitle, e.target.value);
                      }}
                      onPaste={handleRightPaste}
                      placeholder="Secondary note content..."
                      className="w-full h-full min-h-[300px] bg-transparent text-stone-900 dark:text-stone-100 text-sm font-mono sm:font-sans focus:outline-hidden resize-none leading-relaxed"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-400 text-center">
                <FileText className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">No secondary note selected</p>
                <button
                  type="button"
                  onClick={() => setShowNotePicker(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs"
                >
                  Choose a Note to Compare
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
