import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Pin,
  X,
  Palette,
  Folder as FolderIcon,
  Tag,
  Bell,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Images,
  Camera,
  Brush,
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  Copy,
  Link2,
  Eye,
  Edit3,
  Plus,
  ArrowUpRight,
  Sparkles,
  History,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  Clock,
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  Printer,
  ListOrdered,
  Mic,
  Volume2,
  FileCode,
  Undo2,
  Redo2,
  Columns2,
  Flame,
  Globe,
  Share2,
  Scissors,
  FolderTree,
  Check,
  AlertTriangle,
  Loader2,
  GraduationCap,
  LayoutTemplate,
  GitMerge,
} from 'lucide-react';
import {
  Note,
  Folder,
  NoteColorKey,
  ChecklistItem,
  NoteImage,
  NoteAudio,
  NoteRevision,
  NotePriority,
  NoteStatus,
} from '../../types';
import { NOTE_COLORS, COLOR_KEYS } from '../../utils/colors';
import {
  getBacklinksForNote,
  parseTextWithWikiLinks,
  resolveLinkedNoteIds,
} from '../../utils/linking';
import {
  downloadSingleNote,
  downloadNoteAsHTML,
  downloadNoteAsPlainText,
} from '../../services/exporter';
import {
  vaultManager,
  findUnlinkedMentions,
  replaceSingleOccurrence,
  replaceOccurrences,
  UnlinkedMentionCandidate,
  UnlinkedOccurrence,
  PKMPreviewRenderer,
  parseMarkdownSections,
  reorderSection,
  getHeadingBreadcrumb,
  FoldStateManager,
  NoteFoldState,
  DocumentSection,
  StickyBreadcrumb,
  PKMEditorOutliner,
  semanticManager,
  InferredRelation,
  RelatedNotesSection,
  SlashCommandMenu,
  SlashCommand,
  isValidSlashTrigger,
  executeSlashCommand,
  handleEditorKeyDown,
  scrollCursorIntoTypewriterCenter,
  FindReplaceBar,
  DocumentOutlinePanel,
  EditorPreferencesManager,
  DailyNoteBanner,
  dailyNotesService,
  isDailyNote,
  SingleNoteExportModal,
} from '../index';
import {
  noteSaveStateMachine,
  noteRevisionService,
  type NoteSaveState,
} from '../resilience';
import { UnlinkedMentionsSection } from '../UnlinkedMentionsSection';
import { MarkdownToolbar } from '../../components/MarkdownToolbar';
import { AudioRecorder } from '../../components/AudioRecorder';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { LockNoteModal } from '../../components/modals/LockNoteModal';
import { ZenModeModal } from '../../components/modals/ZenModeModal';
import { WebCaptureModal } from '../../components/modals/WebCaptureModal';
import { ImageInsertModal } from '../../components/modals/ImageInsertModal';
import { NoteImageLightbox } from '../../components/modals/NoteImageLightbox';
import { NoteImageGalleryView } from '../../components/views/NoteImageGalleryView';
import {
  extractNoteImages,
  removeImageFromNoteContent,
  NoteEmbeddedImage,
} from '../images/noteImages';
import { PasteOptionsToast } from '../../components/PasteOptionsToast';
import { extractClipboardContent, PasteMode } from '../webCapture';
import { isNoteUnlockedInSession } from '../../utils/crypto';
import { soundscapeService } from '../../utils/soundscapes';
import { extractCardsFromNote } from '../review/cardParser';
import { FlashcardReviewModal } from '../../components/modals/FlashcardReviewModal';
import { useWorkspace } from '../useWorkspace';
import { ExtractionModal } from '../extraction/ExtractionModal';
import { LocalGraphInspector } from '../localGraph/LocalGraphInspector';
import { FlashbackWidget } from '../flashback/FlashbackWidget';
import { AIWritingAssistantModal } from '../ai/ui/AIWritingAssistantModal';
import { TagAutocompleteInput } from '../../components/TagAutocompleteInput';
import { ObsidianBacklinksPanel } from '../../components/pkm/ObsidianBacklinksPanel';
import {
  WikiLinkAutocompleteMenu,
  WikiLinkAutocompleteTrigger,
} from '../../components/pkm/WikiLinkAutocompleteMenu';
import {
  checkWikiLinkTrigger,
  refactorWikiLinksOnNoteRename,
} from '../../utils/obsidianLinks';
import {
  SlashCommandsMenu,
  SlashCommandItem,
  FloatingFormatToolbar,
  EditorStatusBar,
  typewriterManager,
  InlineAutocompletePopover,
  AutocompleteItem,
} from '../qol';

export interface NoteWorkspaceViewProps {
  note: Note;
  initialCursorLine?: number;
  allNotes: Note[];
  folders: Folder[];
  onSaveNote: (updatedNote: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenLinkedNote?: (noteId: string, options?: any) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onOpenDrawingModal?: (onSaveDrawing: (dataUrl: string) => void) => void;
  onDuplicateNote?: (note: Note) => void;
  onCloseSurface?: () => void;
  onOpenDailyDate?: (date: Date) => void;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
}

export const NoteWorkspaceView: React.FC<NoteWorkspaceViewProps> = ({
  note,
  initialCursorLine,
  allNotes,
  folders,
  onSaveNote,
  onDeleteNote,
  onOpenLinkedNote,
  onCreateNoteWithTitle,
  onOpenPDF,
  onOpenDrawingModal,
  onDuplicateNote,
  onCloseSurface,
  onOpenDailyDate,
  onSaveAsTemplate,
  onCompareNote,
}) => {
  const { openNote, openPDF: wsOpenPDF, updateTabTitle, splitWorkspace } = useWorkspace();

  const dailySettings = useMemo(() => dailyNotesService.getSettings(), []);
  const isCurrentNoteDaily = useMemo(() => isDailyNote(note, dailySettings), [note, dailySettings]);

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [type, setType] = useState<'text' | 'checklist'>(note.type);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(note.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [color, setColor] = useState<NoteColorKey>(note.color || 'default');
  const [folderId, setFolderId] = useState<string | null>(note.folderId);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(note.pinned);
  const [isArchived, setIsArchived] = useState(note.archived || false);
  const [reminderDate, setReminderDate] = useState<string | null>(note.reminderDate);
  const [images, setImages] = useState<NoteImage[]>(note.images || []);
  const [audios, setAudios] = useState<NoteAudio[]>(note.audios || []);
  const [revisions, setRevisions] = useState<NoteRevision[]>(note.revisions || []);
  const [isLocked, setIsLocked] = useState(note.isLocked || false);
  const [lockHash, setLockHash] = useState(note.lockHash);
  const [sourceUrl, setSourceUrl] = useState<string | undefined>(note.sourceUrl);
  const [priority, setPriority] = useState<NotePriority | undefined>(note.priority);
  const [status, setStatus] = useState<NoteStatus | undefined>(note.status);
  const [previewMode, setPreviewMode] = useState(false);

  // Popups & Tools
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  // Secondary Modals (True Dialogs)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showZenModal, setShowZenModal] = useState(false);
  const [showWebCaptureModal, setShowWebCaptureModal] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [showGalleryView, setShowGalleryView] = useState(false);
  const [showImageInsertModal, setShowImageInsertModal] = useState(false);
  const [imageInsertDefaultTab, setImageInsertDefaultTab] = useState<'camera' | 'url' | 'upload'>('url');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allNoteImages = useMemo(() => {
    return extractNoteImages(content, images);
  }, [content, images]);

  const handleRemoveNoteImage = (img: NoteEmbeddedImage) => {
    pushUndo(content);
    const updatedContent = removeImageFromNoteContent(content, img);
    setContent(updatedContent);
    if (img.sourceType === 'attachment') {
      setImages((prev) => prev.filter((i) => i.id !== img.id && i.url !== img.url && i.dataUrl !== img.url));
    }
  };

  const handleInsertImageMarkdown = (
    snippet: string,
    imageInfo?: { name: string; dataUrl: string; size?: number }
  ) => {
    pushUndo(content);
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = content.slice(0, start) + snippet + content.slice(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
      }, 20);
    } else {
      setContent((prev) => `${prev}\n\n${snippet}`);
    }

    if (imageInfo) {
      setImages((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: imageInfo.name,
          dataUrl: imageInfo.dataUrl,
          size: imageInfo.size,
        },
      ]);
    }
  };

  const noteFlashcards = useMemo(() => {
    if (!note || !content) return [];
    return extractCardsFromNote({ ...note, content });
  }, [note, content]);

  // Preferences
  const [editorPrefs, setEditorPrefs] = useState(() => EditorPreferencesManager.loadPreferences());
  const [typewriterMode, setTypewriterMode] = useState(editorPrefs.typewriterMode);
  const [focusMode, setFocusMode] = useState(editorPrefs.focusMode);
  const [showOutline, setShowOutline] = useState(editorPrefs.showOutline);

  // Slash Command Menu State
  const [slashMenu, setSlashMenu] = useState<{
    isOpen: boolean;
    query: string;
    slashIndex: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    query: '',
    slashIndex: -1,
    position: { top: 0, left: 0 },
  });

  // WikiLink [[ Autocomplete Menu State
  const [wikiLinkMenu, setWikiLinkMenu] = useState<WikiLinkAutocompleteTrigger>({
    isOpen: false,
    query: '',
    triggerIndex: -1,
    targetTitle: '',
    mode: 'note',
    position: { top: 0, left: 0 },
  });

  // QoL 3: Floating Contextual Formatting Toolbar State
  const [floatingFormatState, setFloatingFormatState] = useState<{
    isOpen: boolean;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    position: { top: 0, left: 0 },
  });

  // QoL 7: Inline Autocomplete for #tags
  const [tagAutocomplete, setTagAutocomplete] = useState<{
    isOpen: boolean;
    query: string;
    triggerIndex: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    query: '',
    triggerIndex: -1,
    position: { top: 0, left: 0 },
  });

  // QoL 10: Typewriter mode subscription
  const [isTypewriter, setIsTypewriter] = useState(() => typewriterManager.isTypewriter);
  useEffect(() => {
    return typewriterManager.subscribe(() => {
      setIsTypewriter(typewriterManager.isTypewriter);
    });
  }, []);

  // Find and Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Outliner and Section Folding State
  const [foldState, setFoldState] = useState<NoteFoldState>(() =>
    FoldStateManager.loadFoldState(note.id)
  );
  const [activeCursorLine, setActiveCursorLine] = useState(0);

  // Undo/Redo stack for document content & section reorders
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Smart Web Clip / Paste Toast State
  const [showPasteToast, setShowPasteToast] = useState(false);
  const [pendingPasteData, setPendingPasteData] = useState<{
    html: string;
    text: string;
    markdown: string;
    sourceUrl?: string;
  } | null>(null);

  // P24: Atomic Extraction & Local Graph state
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractionInitialText, setExtractionInitialText] = useState('');
  const [extractionRange, setExtractionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [showLocalGraph, setShowLocalGraph] = useState(false);
  const [showFlashback, setShowFlashback] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAIWritingModal, setShowAIWritingModal] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Visual Reading Progress Calculation
  const [readingProgress, setReadingProgress] = useState<number>(0);

  // Dynamic Word Count & Estimated Reading Time (200 words/min)
  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readingTimeMinutes = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Escape key handler to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        EditorPreferencesManager.savePreferences({ focusMode: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  const updateReadingProgress = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const scrollableDistance = el.scrollHeight - el.clientHeight;
    if (scrollableDistance <= 0) {
      setReadingProgress(content.trim().length > 0 ? 100 : 0);
    } else {
      const progress = Math.min(100, Math.max(0, Math.round((el.scrollTop / scrollableDistance) * 100)));
      setReadingProgress(progress);
    }
  }, [content]);

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    updateReadingProgress(e.currentTarget);
  };

  useEffect(() => {
    if (contentScrollRef.current) {
      updateReadingProgress(contentScrollRef.current);
    }
  }, [content, note.id, previewMode, updateReadingProgress]);

  // P29: Save state tracking & subscription
  const [saveStatus, setSaveStatus] = useState<NoteSaveState>(noteSaveStateMachine.getState(note.id));

  useEffect(() => {
    const unsub = noteSaveStateMachine.subscribe(note.id, (st) => {
      setSaveStatus(st);
    });
    return unsub;
  }, [note.id]);

  // Sync state when incoming note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setType(note.type);
    setChecklist(note.checklist || []);
    setColor(note.color || 'default');
    setFolderId(note.folderId);
    setTags(note.tags || []);
    setIsPinned(note.pinned);
    setIsArchived(note.archived || false);
    setReminderDate(note.reminderDate);
    setImages(note.images || []);
    setAudios(note.audios || []);
    setRevisions(note.revisions || []);
    setIsLocked(note.isLocked || false);
    setLockHash(note.lockHash);
    setSourceUrl(note.sourceUrl);
    setPriority(note.priority);
    setStatus(note.status);
    setFoldState(FoldStateManager.loadFoldState(note.id));
  }, [note.id]);

  // Color config
  const colorConfig = NOTE_COLORS[color] || NOTE_COLORS.default;

  // Persist Fold state
  useEffect(() => {
    FoldStateManager.saveFoldState(note.id, foldState);
  }, [note.id, foldState]);

  // Save changes handler with Transaction Safety & bounded revisions
  const saveCurrentNote = useCallback(
    async (overrides?: Partial<Note>) => {
      // Coalesced revision recording
      const noteWithRevs = noteRevisionService.recordRevision(
        note,
        content,
        'auto_coalesced'
      );
      const updatedRevisions = (noteWithRevs.revisions as any[]) || [];

      const updated: Note = {
        ...note,
        title,
        content,
        type,
        checklist,
        color,
        folderId,
        tags,
        pinned: isPinned,
        archived: isArchived,
        reminderDate,
        images,
        audios,
        revisions: updatedRevisions,
        isLocked,
        lockHash,
        sourceUrl,
        priority,
        status,
        updatedAt: new Date().toISOString(),
        ...overrides,
      };

      if (updatedRevisions.length !== (note.revisions?.length || 0)) {
        setRevisions(updatedRevisions);
      }

      try {
        await noteSaveStateMachine.executeSave(updated, async (n) => {
          onSaveNote(n);
        });
        if (updated.title !== note.title) {
          updateTabTitle(note.id, 'note', updated.title || 'Untitled Note');
          if (note.title && note.title.trim() && updated.title && updated.title.trim()) {
            const { updatedNotes, count } = refactorWikiLinksOnNoteRename(
              allNotes,
              note.title,
              updated.title
            );
            if (count > 0) {
              for (const un of updatedNotes) {
                if (un.id !== note.id) {
                  onSaveNote(un);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Safe save failed:', err);
      }
    },
    [
      note,
      title,
      content,
      type,
      checklist,
      color,
      folderId,
      tags,
      isPinned,
      isArchived,
      reminderDate,
      images,
      audios,
      revisions,
      isLocked,
      lockHash,
      sourceUrl,
      priority,
      status,
      onSaveNote,
      updateTabTitle,
      allNotes,
    ]
  );

  // Debounced auto-save on typing & dirty state management
  useEffect(() => {
    noteSaveStateMachine.markDirty(note.id);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote();
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, checklist, color, folderId, tags, isPinned, isArchived, priority, status, saveCurrentNote, note.id]);

  // Outliner sections calculation
  const flatSections = useMemo(() => {
    return parseMarkdownSections(content);
  }, [content]);

  // Sticky breadcrumbs based on cursor line
  const breadcrumbs = useMemo(() => {
    return getHeadingBreadcrumb(flatSections, activeCursorLine);
  }, [flatSections, activeCursorLine]);

  // Backlinks & unlinked mentions
  const backlinks = useMemo(() => {
    return getBacklinksForNote(note, allNotes);
  }, [note, allNotes]);

  const unlinkedMentions = useMemo(() => {
    return findUnlinkedMentions(content, note.id, vaultManager.getIndex());
  }, [content, note.id, allNotes]);

  const relatedNotes = useMemo(() => {
    return semanticManager.getSimilarNotesForNote(note.id, allNotes, { maxNeighborsPerNode: 5 });
  }, [note.id, allNotes]);

  // Undo/Redo operations
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, content]);
    setContent(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, content]);
    setContent(next);
  };

  const pushUndo = (prevContent: string) => {
    setUndoStack((s) => [...s.slice(-30), prevContent]);
    setRedoStack([]);
  };

  // Section reordering
  const handleReorderSection = (sourceSec: DocumentSection, targetSec: DocumentSection) => {
    const srcIndex = flatSections.findIndex((s) => s.id === sourceSec.id);
    const dstIndex = flatSections.findIndex((s) => s.id === targetSec.id);
    if (srcIndex !== -1 && dstIndex !== -1) {
      pushUndo(content);
      const newDoc = reorderSection(content, srcIndex, dstIndex);
      setContent(newDoc);
    }
  };

  // KEEP B1b: source-owned task pins open their containing editor at the
  // current parsed line. This is a navigation hint, not a stored task cursor.
  useEffect(() => {
    if (initialCursorLine === undefined || !Number.isInteger(initialCursorLine) || initialCursorLine < 0) return;
    const field = textareaRef.current;
    if (!field) return;
    const lines = (note.content || '').split('\n');
    if (initialCursorLine >= lines.length) return;
    const position = lines.slice(0, initialCursorLine).reduce((total, line) => total + line.length + 1, 0);
    field.focus();
    field.setSelectionRange(position, position);
    setActiveCursorLine(initialCursorLine);
  }, [initialCursorLine, note.id]);

  // Jump to heading in textarea
  const handleJumpToSection = (section: DocumentSection) => {
    if (!textareaRef.current) return;
    const lines = content.split('\n');
    let charPos = 0;
    for (let i = 0; i < section.startLine && i < lines.length; i++) {
      charPos += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charPos, charPos);
    setActiveCursorLine(section.startLine);
  };

  // Fold state actions
  const handleToggleFold = (headingId: string) => {
    setFoldState((prev) => FoldStateManager.toggleHeadingFold(note.id, headingId, prev));
  };

  const handleFoldAll = () => {
    setFoldState((prev) => FoldStateManager.foldAll(note.id, flatSections.map((s) => s.id)));
  };

  const handleUnfoldAll = () => {
    setFoldState((prev) => FoldStateManager.unfoldAll(note.id));
  };

  // Calculate cursor position for floating slash menu
  const calculateCursorCoordinates = (
    textarea: HTMLTextAreaElement,
    charIndex: number
  ): { top: number; left: number } => {
    const rect = textarea.getBoundingClientRect();
    const textBefore = textarea.value.slice(0, charIndex);
    const lines = textBefore.split('\n');
    const lineIndex = lines.length - 1;
    const currentLineText = lines[lineIndex];

    const top = rect.top + (lineIndex + 1) * 24 - textarea.scrollTop;
    const left = rect.left + Math.min(rect.width - 290, Math.max(10, currentLineText.length * 8.5 + 16));

    return {
      top: Math.max(10, Math.min(window.innerHeight - 340, top)),
      left: Math.max(10, Math.min(window.innerWidth - 300, left)),
    };
  };

  // Check for slash trigger
  const checkSlashTrigger = (newContent: string, cursorPosition: number) => {
    if (!editorPrefs.slashCommandsEnabled) return;
    const trigger = isValidSlashTrigger(newContent, cursorPosition);
    if (trigger.isValid && textareaRef.current) {
      const pos = calculateCursorCoordinates(textareaRef.current, trigger.slashIndex);
      setSlashMenu({
        isOpen: true,
        query: trigger.query,
        slashIndex: trigger.slashIndex,
        position: pos,
      });
    } else {
      if (slashMenu.isOpen) {
        setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      }
    }
  };

  // Check for Obsidian [[ WikiLink Autocomplete trigger
  const checkWikiLinkTriggerState = (newContent: string, cursorPosition: number) => {
    const trigger = checkWikiLinkTrigger(newContent, cursorPosition);
    if (trigger.isValid && textareaRef.current) {
      const pos = calculateCursorCoordinates(textareaRef.current, trigger.triggerIndex);
      setWikiLinkMenu({
        isOpen: true,
        query: trigger.query,
        triggerIndex: trigger.triggerIndex,
        targetTitle: trigger.targetTitle,
        headingQuery: trigger.headingQuery,
        aliasQuery: trigger.aliasQuery,
        mode: trigger.mode,
        position: pos,
      });
    } else {
      if (wikiLinkMenu.isOpen) {
        setWikiLinkMenu((prev) => ({ ...prev, isOpen: false }));
      }
    }
  };

  // Handle selection from [[ WikiLink menu
  const handleSelectWikiLink = (insertedLink: string) => {
    if (!textareaRef.current || wikiLinkMenu.triggerIndex === -1) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;

    const before = content.slice(0, wikiLinkMenu.triggerIndex);
    const after = content.slice(cursorPos);
    const newContent = `${before}${insertedLink}${after}`;
    const newCursor = before.length + insertedLink.length;

    pushUndo(content);
    setContent(newContent);
    saveCurrentNote({ content: newContent });
    setWikiLinkMenu((prev) => ({ ...prev, isOpen: false }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // P24: Extraction Handlers
  const handleOpenExtraction = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setExtractionInitialText('');
      setExtractionRange({ start: 0, end: 0 });
      setShowExtractionModal(true);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    setExtractionInitialText(selectedText || '');
    setExtractionRange({ start, end });
    setShowExtractionModal(true);
  }, [content]);

  const handleExtractionSuccess = (result: any) => {
    setShowExtractionModal(false);
    if (result.updatedSourceContent !== undefined) {
      pushUndo(content);
      setContent(result.updatedSourceContent);
      saveCurrentNote({ content: result.updatedSourceContent });
    }
    if (result.targetNote) {
      if (onOpenLinkedNote) {
        onOpenLinkedNote(result.targetNote.id);
      } else {
        openNote(result.targetNote.id, result.targetNote.title);
      }
    }
  };

  // Execute QoL slash command
  const handleSelectSlashCommandQoL = (cmd: SlashCommandItem) => {
    if (!textareaRef.current || slashMenu.slashIndex === -1) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;

    pushUndo(content);
    const before = content.slice(0, slashMenu.slashIndex);
    const after = content.slice(cursorPos);
    const snippetObj = cmd.snippet();
    const newContent = `${before}${snippetObj.text}${after}`;
    const newCursor = before.length + (snippetObj.cursorOffset ?? snippetObj.text.length);

    setContent(newContent);
    saveCurrentNote({ content: newContent });
    setSlashMenu({ isOpen: false, query: '', slashIndex: -1, position: { top: 0, left: 0 } });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
      if (isTypewriter || typewriterMode) {
        typewriterManager.centerCursor(textarea);
      }
    }, 10);
  };

  // QoL 3: Floating Format Toolbar handler
  const handleApplyFloatingFormat = (
    formatType: 'bold' | 'italic' | 'strike' | 'code' | 'highlight' | 'wikilink' | 'link' | 'todo' | 'quote'
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;

    const selectedText = textarea.value.substring(start, end);
    let replacement = selectedText;
    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        break;
      case 'strike':
        replacement = `~~${selectedText}~~`;
        break;
      case 'code':
        replacement = `\`${selectedText}\``;
        break;
      case 'highlight':
        replacement = `==${selectedText}==`;
        break;
      case 'wikilink':
        replacement = `[[${selectedText}]]`;
        break;
      case 'link':
        replacement = `[${selectedText}](url)`;
        break;
      case 'todo':
        replacement = selectedText
          .split('\n')
          .map((l) => `- [ ] ${l}`)
          .join('\n');
        break;
      case 'quote':
        replacement = selectedText
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
        break;
    }

    pushUndo(content);
    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setContent(newContent);
    saveCurrentNote({ content: newContent });
    setFloatingFormatState({ isOpen: false, position: { top: 0, left: 0 } });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 15);
  };

  const handleUpdateSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.selectionStart !== textarea.selectionEnd) {
      const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
      if (selectedText.length > 0) {
        const coords = calculateCursorCoordinates(textarea, textarea.selectionStart);
        setFloatingFormatState({
          isOpen: true,
          position: {
            top: Math.max(10, coords.top - 46),
            left: Math.min(window.innerWidth - 320, coords.left),
          },
        });
        return;
      }
    }
    setFloatingFormatState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  // QoL 7: All vault tags for inline autocomplete
  const allVaultTags = useMemo(() => {
    const set = new Set<string>();
    allNotes.forEach((n) => {
      n.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [allNotes]);

  const checkTagTriggerState = (newContent: string, cursorPos: number) => {
    const textBefore = newContent.slice(0, cursorPos);
    const lastHash = textBefore.lastIndexOf('#');
    if (lastHash !== -1) {
      const prevChar = lastHash === 0 ? ' ' : newContent[lastHash - 1];
      if (/[\s\n]/.test(prevChar)) {
        const query = textBefore.slice(lastHash + 1);
        if (!/\s/.test(query) && query.length >= 0) {
          if (textareaRef.current) {
            const pos = calculateCursorCoordinates(textareaRef.current, lastHash);
            setTagAutocomplete({
              isOpen: true,
              query,
              triggerIndex: lastHash,
              position: pos,
            });
            return;
          }
        }
      }
    }
    if (tagAutocomplete.isOpen) {
      setTagAutocomplete((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleSelectTagAutocomplete = (item: AutocompleteItem) => {
    if (!textareaRef.current || tagAutocomplete.triggerIndex === -1) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;

    const before = content.slice(0, tagAutocomplete.triggerIndex);
    const after = content.slice(cursorPos);
    const tagText = `#${item.id} `;
    const newContent = `${before}${tagText}${after}`;
    const newCursor = before.length + tagText.length;

    pushUndo(content);
    setContent(newContent);
    saveCurrentNote({ content: newContent });
    setTagAutocomplete((prev) => ({ ...prev, isOpen: false }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Keyboard shortcut listener
  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Tactile typewriter audio feedback
    soundscapeService.playTypewriterClick();

    // Alt+Z: Quick toggle Zen Focus Mode
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      setShowZenModal(true);
      return;
    }

    if (slashMenu.isOpen && e.key === 'Escape') {
      e.preventDefault();
      setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    if (wikiLinkMenu.isOpen && e.key === 'Escape') {
      e.preventDefault();
      setWikiLinkMenu((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    // Mod+Shift+E: Atomic Extraction
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      handleOpenExtraction();
      return;
    }

    // Mod+Shift+G: Local Graph Inspector Toggle
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      setShowLocalGraph((prev) => !prev);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFindReplace((prev) => !prev);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
    ) {
      e.preventDefault();
      handleRedo();
      return;
    }

    const result = handleEditorKeyDown(
      e,
      content,
      textarea.selectionStart,
      textarea.selectionEnd,
      editorPrefs.autoPairingEnabled
    );

    if (result.handled) {
      if (result.newContent !== undefined) {
        pushUndo(content);
        setContent(result.newContent);
      }
      setTimeout(() => {
        textarea.focus();
        const selStart = result.newSelectionStart ?? result.newCursorStart ?? textarea.selectionStart;
        const selEnd = result.newSelectionEnd ?? result.newCursorEnd ?? selStart;
        textarea.setSelectionRange(selStart, selEnd);
        if (typewriterMode) {
          scrollCursorIntoTypewriterCenter(textarea, selStart);
        }
        if (result.newContent !== undefined) {
          checkSlashTrigger(result.newContent, selStart);
        }
      }, 0);
    }
  };

  // Apply Markdown formatting
  const handleApplyFormat = (formatType: string, defaultPlaceholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        cursorOffset = 1;
        break;
      case 'strike':
        replacement = `~~${selectedText || 'strikethrough'}~~`;
        cursorOffset = 2;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || 'Heading 1'}\n`;
        cursorOffset = 3;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Heading 2'}\n`;
        cursorOffset = 4;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || 'Heading 3'}\n`;
        cursorOffset = 5;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'Quote text'}\n`;
        cursorOffset = 3;
        break;
      case 'callout':
        replacement = `\n> [!NOTE] Note\n> ${selectedText || 'Important context or information here.'}\n`;
        cursorOffset = 19;
        break;
      case 'code':
        replacement = selectedText.includes('\n')
          ? `\n\`\`\`typescript\n${selectedText || '// Code here'}\n\`\`\`\n`
          : `\`${selectedText || 'code'}\``;
        cursorOffset = 1;
        break;
      case 'math':
        replacement = `$${selectedText || 'E = mc^2'}$`;
        cursorOffset = 1;
        break;
      case 'mathblock':
        replacement = `\n$$\n${selectedText || '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}'}\n$$\n`;
        cursorOffset = 4;
        break;
      case 'mermaid':
        replacement = `\n\`\`\`mermaid\ngraph TD;\n  A[Start] --> B{Decision};\n  B -->|Yes| C[Success];\n  B -->|No| D[Retry];\n\`\`\`\n`;
        cursorOffset = 12;
        break;
      case 'query':
        replacement = `\n\`\`\`query\ntype: note\nsort: updated-desc\nlimit: 10\n\`\`\`\n`;
        cursorOffset = 10;
        break;
      case 'bullet':
        replacement = `\n- ${selectedText || 'List item'}`;
        cursorOffset = 3;
        break;
      case 'number':
        replacement = `\n1. ${selectedText || 'List item'}`;
        cursorOffset = 4;
        break;
      case 'task':
        replacement = `\n- [ ] ${selectedText || 'New task'}`;
        cursorOffset = 7;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Item 2 | Item 3 |\n`;
        cursorOffset = 2;
        break;
      case 'date': {
        const now = new Date().toISOString().split('T')[0];
        replacement = ` ${now} `;
        cursorOffset = replacement.length;
        break;
      }
      case 'divider':
        replacement = `\n\n---\n\n`;
        cursorOffset = 5;
        break;
      case 'wikilink':
        replacement = `[[${selectedText || 'Note Title'}]]`;
        cursorOffset = 2;
        break;
      default:
        replacement = selectedText;
    }

    pushUndo(content);
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + (selectedText ? replacement.length : cursorOffset);
      textarea.setSelectionRange(newPos, newPos);
      if (typewriterMode) {
        scrollCursorIntoTypewriterCenter(textarea, newPos);
      }
    }, 10);
  };

  // Intercept paste for HTML-to-Markdown web capture
  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipData = await extractClipboardContent(e.clipboardData);
    if (clipData && clipData.hasHtml && clipData.rawHtml.length > 50) {
      e.preventDefault();
      setPendingPasteData({
        html: clipData.rawHtml,
        text: clipData.plainText,
        markdown: clipData.markdown,
        sourceUrl: clipData.sourceUrl,
      });
      setShowPasteToast(true);
    }
  };

  const handleConfirmPasteMode = (mode: PasteMode) => {
    if (!pendingPasteData || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let insertion = pendingPasteData.markdown;
    if (mode === 'plain') {
      insertion = pendingPasteData.text;
    } else if (mode === 'raw') {
      insertion = pendingPasteData.html;
    } else if (mode === 'smart' && pendingPasteData.sourceUrl) {
      insertion += `\n\n> *Source: [${pendingPasteData.sourceUrl}](${pendingPasteData.sourceUrl})*`;
    }

    pushUndo(content);
    const newContent = content.substring(0, start) + insertion + content.substring(end);
    setContent(newContent);
    setShowPasteToast(false);
    setPendingPasteData(null);
  };

  // Image attachment
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      const newImg: NoteImage = {
        id: `img-${Date.now()}`,
        name: file.name,
        dataUrl,
        size: file.size,
      };
      setImages((prev) => [...prev, newImg]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Link click handlers from preview
  const handleWikiLinkClick = (targetNoteId: string, event?: React.MouseEvent) => {
    if (onOpenLinkedNote) {
      onOpenLinkedNote(targetNoteId, {
        eventModifier: {
          ctrlOrMetaKey: event?.ctrlKey || event?.metaKey,
          altKey: event?.altKey,
          shiftKey: event?.shiftKey,
        },
      });
    } else {
      openNote(targetNoteId, undefined, {
        eventModifier: {
          ctrlOrMetaKey: event?.ctrlKey || event?.metaKey,
          altKey: event?.altKey,
          shiftKey: event?.shiftKey,
        },
      });
    }
  };

  const handlePDFLinkClick = (pdfId: string, page?: number, highlightId?: string) => {
    if (onOpenPDF) {
      onOpenPDF(pdfId, page, highlightId);
    } else {
      wsOpenPDF(pdfId, page, highlightId);
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden transition-all ${
        focusMode
          ? 'fixed inset-0 z-50 bg-stone-50 dark:bg-stone-950 p-2 sm:p-4 md:p-6 shadow-2xl'
          : ''
      } ${colorConfig.bgLight} ${colorConfig.borderLight} ${colorConfig.bgDark} ${colorConfig.borderDark}`}
    >
      {/* Focus Mode Banner */}
      {focusMode && (
        <div className="px-3 py-1.5 mb-2 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Focus Mode Active — sidebars and clutter hidden for maximum space</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFocusMode(false);
              EditorPreferencesManager.savePreferences({ focusMode: false });
            }}
            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            <Minimize2 className="w-3 h-3" /> Exit Focus (Esc)
          </button>
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800 gap-2 shrink-0 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs">
        <div className="flex-1 min-w-0 mr-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="Note Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-base sm:text-lg font-bold text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden tracking-tight truncate"
          />

          {/* Minutes to Read Label */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60 shrink-0"
            title={`Estimated reading time: ${readingTimeMinutes} min read based on 200 words per minute (${wordCount.toLocaleString()} words)`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{readingTimeMinutes === 1 ? '1 min read' : `${readingTimeMinutes} mins read`}</span>
          </div>

          {/* Real-time Save & Safety State */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100/60 dark:bg-stone-800/60 border border-stone-200/50 dark:border-stone-700/50 shrink-0">
            {saveStatus?.status === 'saving' && (
              <>
                <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="text-stone-500 dark:text-stone-400">Saving...</span>
              </>
            )}
            {saveStatus?.status === 'dirty' && (
              <span className="text-amber-600 dark:text-amber-400">Unsaved edits</span>
            )}
            {(saveStatus?.status === 'clean' || saveStatus?.status === 'saved') && (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-stone-400 dark:text-stone-500">Saved</span>
              </>
            )}
            {saveStatus?.status === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">
                  {saveStatus.isQuotaError ? 'Storage Full' : 'Save Error'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`# ${title}\n\n${content}`);
                  }}
                  className="ml-1 underline font-bold hover:text-rose-700"
                  title="Copy emergency markdown snapshot"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* AI Writing Assistant */}
          {type === 'text' && !focusMode && (
            <button
              type="button"
              onClick={() => setShowAIWritingModal(true)}
              className="p-1.5 sm:p-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors"
              title="AI Writing Assistant"
              aria-label="AI Writing Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
            </button>
          )}

          {/* Local Graph Inspector Toggle */}
          {!focusMode && (
            <button
              type="button"
              onClick={() => setShowLocalGraph(!showLocalGraph)}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                showLocalGraph
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/60'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
              title="Local Graph Inspector (Mod+Shift+G)"
              aria-label="Local Graph Inspector"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Extract Selection to Note */}
          {type === 'text' && !previewMode && !focusMode && (
            <button
              type="button"
              onClick={handleOpenExtraction}
              className="p-1.5 sm:p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
              title="Extract Selection to Note (Mod+Shift+E)"
              aria-label="Extract Selection"
            >
              <Scissors className="w-4 h-4" />
            </button>
          )}

          {/* Split Right Toggle */}
          {!focusMode && (
            <button
              type="button"
              onClick={() => splitWorkspace('horizontal')}
              className="p-1.5 sm:p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
              title="Split Workspace Side-by-Side (Alt+\)"
              aria-label="Split Workspace"
            >
              <Columns2 className="w-4 h-4" />
            </button>
          )}

          {/* Find & Replace Toggle */}
          <button
            type="button"
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              showFindReplace
                ? 'bg-amber-500 text-white'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
            }`}
            title="Find and Replace in Note (Ctrl+H)"
            aria-label="Find and Replace"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextFocus = !focusMode;
              setFocusMode(nextFocus);
              EditorPreferencesManager.savePreferences({ focusMode: nextFocus });
            }}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              focusMode
                ? 'text-stone-950 font-bold bg-amber-500 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
            }`}
            title={focusMode ? 'Exit Focus Mode (Esc)' : 'Focus Mode (Hides sidebars and UI clutter)'}
            aria-label="Focus Mode"
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Version History */}
          {!focusMode && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="p-1.5 sm:p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
              title={`Revisions History (${revisions.length})`}
              aria-label="Version History"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Lock Passcode Protection */}
          {!focusMode && (
            <button
              type="button"
              onClick={() => setShowLockModal(true)}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                isLocked
                  ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/60'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
              }`}
              title={isLocked ? 'Note is Password Protected' : 'Lock Note with Password'}
              aria-label="Lock Note"
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          {/* Pin Toggle */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isPinned
                ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/60'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
            }`}
            title={isPinned ? 'Unpin note' : 'Pin note to top'}
            aria-label="Pin Note"
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Close Surface if in split or modal */}
          {onCloseSurface && (
            <button
              type="button"
              onClick={onCloseSurface}
              className="p-1.5 sm:p-2 rounded-xl text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800"
              title="Close Note"
              aria-label="Close Note"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Archived Notice Banner */}
      {isArchived && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>This note is archived.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsArchived(false)}
            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
          </button>
        </div>
      )}

      {/* Find and Replace Bar */}
      {showFindReplace && (
        <FindReplaceBar
          query={findQuery}
          replaceQuery={replaceQuery}
          matchCase={matchCase}
          totalMatches={findMatchCount}
          currentMatchIndex={currentMatchIndex}
          onQueryChange={(q) => {
            setFindQuery(q);
            if (!q) {
              setFindMatchCount(0);
              setCurrentMatchIndex(0);
              return;
            }
            try {
              const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
              const count = (content.match(regex) || []).length;
              setFindMatchCount(count);
              setCurrentMatchIndex(count > 0 ? 1 : 0);
            } catch {
              setFindMatchCount(0);
            }
          }}
          onReplaceQueryChange={setReplaceQuery}
          onMatchCaseToggle={() => setMatchCase(!matchCase)}
          onNext={() => {
            if (!findQuery || !textareaRef.current) return;
            const textarea = textareaRef.current;
            const flags = matchCase ? 'g' : 'gi';
            const queryPattern = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(queryPattern, flags);
            const matches: { index: number; length: number }[] = [];
            let m: RegExpExecArray | null;
            while ((m = regex.exec(content)) !== null) {
              matches.push({ index: m.index, length: m[0].length });
            }
            setFindMatchCount(matches.length);
            if (matches.length === 0) {
              setCurrentMatchIndex(0);
              return;
            }
            const currentPos = textarea.selectionEnd;
            let nextMatch = matches.find((match) => match.index >= currentPos);
            let nextIdx = matches.findIndex((match) => match.index >= currentPos);
            if (!nextMatch) {
              nextMatch = matches[0];
              nextIdx = 0;
            }
            setCurrentMatchIndex(nextIdx + 1);
            textarea.focus();
            textarea.setSelectionRange(nextMatch.index, nextMatch.index + nextMatch.length);
          }}
          onPrev={() => {
            if (!findQuery || !textareaRef.current) return;
            const textarea = textareaRef.current;
            const flags = matchCase ? 'g' : 'gi';
            const queryPattern = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(queryPattern, flags);
            const matches: { index: number; length: number }[] = [];
            let m: RegExpExecArray | null;
            while ((m = regex.exec(content)) !== null) {
              matches.push({ index: m.index, length: m[0].length });
            }
            setFindMatchCount(matches.length);
            if (matches.length === 0) {
              setCurrentMatchIndex(0);
              return;
            }
            const currentPos = textarea.selectionStart;
            const prevMatches = matches.filter((match) => match.index < currentPos);
            const targetMatch = prevMatches[prevMatches.length - 1] || matches[matches.length - 1];
            const targetIdx = matches.indexOf(targetMatch);
            setCurrentMatchIndex(targetIdx + 1);
            textarea.focus();
            textarea.setSelectionRange(targetMatch.index, targetMatch.index + targetMatch.length);
          }}
          onReplace={() => {
            if (!findQuery || !textareaRef.current) return;
            const textarea = textareaRef.current;
            const selStart = textarea.selectionStart;
            const selEnd = textarea.selectionEnd;
            const selText = content.substring(selStart, selEnd);
            const isMatch = matchCase ? selText === findQuery : selText.toLowerCase() === findQuery.toLowerCase();
            if (isMatch) {
              pushUndo(content);
              const newContent = content.substring(0, selStart) + replaceQuery + content.substring(selEnd);
              setContent(newContent);
            }
          }}
          onReplaceAll={() => {
            if (!findQuery) return;
            pushUndo(content);
            const regex = new RegExp(
              findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              matchCase ? 'g' : 'gi'
            );
            setContent((prev) => prev.replace(regex, replaceQuery));
          }}
          onClose={() => setShowFindReplace(false)}
        />
      )}

      {/* Formatting & Controls Sub-header */}
      {type === 'text' && !previewMode && (
        <div className="px-4 py-2 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-2 flex-wrap shrink-0 bg-stone-50/50 dark:bg-stone-900/30">
          <div className="flex items-center gap-1.5 flex-wrap">
            <MarkdownToolbar
              onApplyFormat={handleApplyFormat}
              onOpenWebCapture={() => setShowWebCaptureModal(true)}
              onOpenPDFReader={() => {
                saveCurrentNote();
                if (onOpenPDF) onOpenPDF('', 1);
                else wsOpenPDF('', 1);
              }}
            />

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-700 pl-1.5 ml-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 transition-colors"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 transition-colors"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Camera & Image Embed Quick Actions */}
            <div className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-700 pl-1.5 ml-0.5">
              <button
                type="button"
                id="btn-workspace-camera"
                onClick={() => {
                  setImageInsertDefaultTab('camera');
                  setShowImageInsertModal(true);
                }}
                className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title="Snap Photo with Camera into Note"
                aria-label="Camera"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="btn-workspace-image"
                onClick={() => {
                  setImageInsertDefaultTab('url');
                  setShowImageInsertModal(true);
                }}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title="Insert Image (URL, Upload, or Camera)"
                aria-label="Insert Image"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Focus Mode Button */}
            <button
              type="button"
              onClick={() => {
                const nextFocus = !focusMode;
                setFocusMode(nextFocus);
                EditorPreferencesManager.savePreferences({ focusMode: nextFocus });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                focusMode
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs ring-2 ring-amber-400/50'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Focus Mode (Hides sidebars and UI clutter, maximizing available space for note content)"
              aria-label="Focus Mode"
            >
              {focusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-stone-950" />
                  <span>Exit Focus</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Focus Mode</span>
                </>
              )}
            </button>

            {/* Typewriter Mode Button */}
            <button
              type="button"
              onClick={() => {
                const updated = !typewriterMode;
                setTypewriterMode(updated);
                EditorPreferencesManager.savePreferences({ typewriterMode: updated });
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                typewriterMode
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Typewriter Mode (centers current line vertically)"
            >
              <span>Typewriter</span>
            </button>

            {/* Document Outline Panel Toggle */}
            <button
              type="button"
              onClick={() => {
                const updated = !showOutline;
                setShowOutline(updated);
                EditorPreferencesManager.savePreferences({ showOutline: updated });
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                showOutline
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Document Outline & Section Reorder Panel"
            >
              <ListOrdered className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Outline</span>
              {flatSections.length > 0 && (
                <span className="px-1 py-0.2 text-[10px] rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                  {flatSections.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !previewMode;
                setPreviewMode(next);
                if (next) setShowGalleryView(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                previewMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewMode ? 'Edit' : 'Preview'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !showGalleryView;
                setShowGalleryView(next);
                if (next) setPreviewMode(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                showGalleryView
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Gallery View (All embedded note photos & lightbox collection)"
            >
              <Images className="w-3.5 h-3.5" />
              <span>Gallery</span>
              {allNoteImages.length > 0 && (
                <span
                  className={`px-1 py-0.2 text-[10px] rounded-full font-mono ${
                    showGalleryView
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {allNoteImages.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Note Workspace Main Layout (Editor + Outline) */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Scrollable Note Content Area */}
        <div
          ref={contentScrollRef}
          onScroll={handleContentScroll}
          className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {/* Daily Note Banner */}
          {noteFlashcards.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">
                  {noteFlashcards.length} Active Recall Flashcard{noteFlashcards.length === 1 ? '' : 's'} detected in this note
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFlashcardModal(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                Study Deck
              </button>
            </div>
          )}

          {isCurrentNoteDaily && (
            <DailyNoteBanner
              note={note}
              dailySettings={dailySettings}
              onNavigateToDate={(targetDate) => {
                if (onOpenDailyDate) {
                  onOpenDailyDate(targetDate);
                }
              }}
              onAppendLogEntry={(entryText) => {
                const updated = dailyNotesService.appendContentToNote(
                  content,
                  entryText,
                  dailySettings.appendHeading,
                  true
                );
                pushUndo(content);
                setContent(updated);
                saveCurrentNote({ content: updated });
              }}
            />
          )}

          {/* Images gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-black/5"
                >
                  <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((i) => i.id !== img.id))}
                    className="absolute top-1.5 right-1.5 p-1 bg-stone-950/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Audio Memos Section */}
          <AudioRecorder
            audios={audios}
            onAddAudio={(newAudio) => setAudios([...audios, newAudio])}
            onRemoveAudio={(id) => setAudios(audios.filter((a) => a.id !== id))}
            onUpdateAudio={(updated) =>
              setAudios(audios.map((a) => (a.id === updated.id ? updated : a)))
            }
            onAppendSpeechTranscript={(transcript) => {
              setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
            }}
          />

          {/* Sticky Breadcrumb */}
          {type === 'text' && breadcrumbs.length > 0 && (
            <div className="sticky top-0 z-10 pb-1">
              <StickyBreadcrumb
                breadcrumbs={breadcrumbs}
                onSelectHeading={(sec) => handleJumpToSection(sec)}
              />
            </div>
          )}

          {/* Primary Markdown Text Editor, Gallery, or Preview */}
          {type === 'text' ? (
            showGalleryView ? (
              <div className="min-h-[260px] p-1">
                <NoteImageGalleryView
                  images={allNoteImages}
                  noteTitle={title || 'Untitled Note'}
                  onOpenLightbox={(idx) => setLightboxIndex(idx)}
                  onOpenInsertModal={(tab) => {
                    setImageInsertDefaultTab(tab || 'url');
                    setShowImageInsertModal(true);
                  }}
                  onRemoveImage={handleRemoveNoteImage}
                />
              </div>
            ) : previewMode ? (
              <div className="min-h-[220px] text-sm text-stone-950 dark:text-stone-50 font-normal leading-relaxed">
                <PKMPreviewRenderer
                  content={content}
                  allNotes={allNotes}
                  currentNoteId={note.id}
                  foldState={foldState}
                  onToggleFold={handleToggleFold}
                  onImageClick={(url) => {
                    const foundIdx = allNoteImages.findIndex((img) => img.url === url);
                    setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
                  }}
                  onOpenNote={(targetId) => handleWikiLinkClick(targetId)}
                  onCreateNoteWithTitle={onCreateNoteWithTitle}
                  onOpenPDF={handlePDFLinkClick}
                  onContentChange={(newMd) => {
                    pushUndo(content);
                    setContent(newMd);
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder="Write canonical Markdown... Type '/' for slash commands, [[wiki-links]], #tags, $math$, ```mermaid, or tables"
                  value={content}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setContent(newText);
                    checkSlashTrigger(newText, e.target.selectionStart);
                    checkWikiLinkTriggerState(newText, e.target.selectionStart);
                    checkTagTriggerState(newText, e.target.selectionStart);
                  }}
                  onKeyDown={onTextareaKeyDown}
                  onKeyUp={(e) => {
                    const target = e.currentTarget;
                    const line = target.value.substring(0, target.selectionStart).split('\n').length - 1;
                    setActiveCursorLine(line);
                    checkSlashTrigger(target.value, target.selectionStart);
                    checkWikiLinkTriggerState(target.value, target.selectionStart);
                    checkTagTriggerState(target.value, target.selectionStart);
                    handleUpdateSelection();
                    if (isTypewriter || typewriterMode) {
                      typewriterManager.centerCursor(target);
                    }
                  }}
                  onClick={(e) => {
                    const target = e.currentTarget;
                    const line = target.value.substring(0, target.selectionStart).split('\n').length - 1;
                    setActiveCursorLine(line);
                    checkSlashTrigger(target.value, target.selectionStart);
                    checkWikiLinkTriggerState(target.value, target.selectionStart);
                    checkTagTriggerState(target.value, target.selectionStart);
                    handleUpdateSelection();
                  }}
                  onSelect={handleUpdateSelection}
                  onMouseUp={handleUpdateSelection}
                  onPaste={handleTextareaPaste}
                  className="w-full min-h-[340px] bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 resize-y focus:outline-hidden leading-relaxed font-mono"
                />

                {/* QoL 2: Floating Slash Command Menu */}
                {slashMenu.isOpen && (
                  <SlashCommandsMenu
                    isOpen={slashMenu.isOpen}
                    query={slashMenu.query}
                    position={slashMenu.position}
                    onSelect={handleSelectSlashCommandQoL}
                    onClose={() => setSlashMenu((prev) => ({ ...prev, isOpen: false }))}
                  />
                )}

                {/* QoL 3: Floating Contextual Formatting Bubble */}
                <FloatingFormatToolbar
                  isOpen={floatingFormatState.isOpen}
                  position={floatingFormatState.position}
                  onApplyFormat={handleApplyFloatingFormat}
                  onClose={() => setFloatingFormatState((prev) => ({ ...prev, isOpen: false }))}
                />

                {/* QoL 7: Floating # Tag Autocomplete Popover */}
                {tagAutocomplete.isOpen && (
                  <InlineAutocompletePopover
                    isOpen={tagAutocomplete.isOpen}
                    type="tag"
                    query={tagAutocomplete.query}
                    notes={allNotes}
                    allTags={allVaultTags}
                    position={tagAutocomplete.position}
                    onSelect={handleSelectTagAutocomplete}
                    onClose={() => setTagAutocomplete((prev) => ({ ...prev, isOpen: false }))}
                  />
                )}

                {/* Floating [[ WikiLink Autocomplete Menu */}
                {wikiLinkMenu.isOpen && (
                  <WikiLinkAutocompleteMenu
                    trigger={wikiLinkMenu}
                    notes={allNotes}
                    folders={folders}
                    onSelect={handleSelectWikiLink}
                    onClose={() => setWikiLinkMenu((prev) => ({ ...prev, isOpen: false }))}
                  />
                )}
              </div>
            )
          ) : (
            /* Checklist Mode */
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => {
                      setChecklist(
                        checklist.map((ci) =>
                          ci.id === item.id ? { ...ci, completed: e.target.checked } : ci
                        )
                      );
                    }}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      setChecklist(
                        checklist.map((ci) =>
                          ci.id === item.id ? { ...ci, text: e.target.value } : ci
                        )
                      );
                    }}
                    className={`flex-1 bg-transparent text-sm focus:outline-hidden ${
                      item.completed ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setChecklist(checklist.filter((ci) => ci.id !== item.id))}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <Plus className="w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Add checklist item..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistText.trim()) {
                      setChecklist([
                        ...checklist,
                        { id: `item-${Date.now()}`, text: newChecklistText.trim(), completed: false },
                      ]);
                      setNewChecklistText('');
                    }
                  }}
                  className="flex-1 bg-transparent text-sm focus:outline-hidden placeholder-stone-400"
                />
              </div>
            </div>
          )}

          {/* Tags Display & Quick Adder */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono flex items-center gap-1"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => {
                    const updated = tags.filter((tag) => tag !== t);
                    setTags(updated);
                    saveCurrentNote({ tags: updated });
                  }}
                  className="hover:text-red-500"
                  title={`Remove tag #${t}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <TagAutocompleteInput
              tags={tags}
              notes={allNotes}
              onAddTag={(newTag) => {
                if (!tags.includes(newTag)) {
                  const updated = [...tags, newTag];
                  setTags(updated);
                  saveCurrentNote({ tags: updated });
                }
              }}
              onRemoveTag={(t) => {
                const updated = tags.filter((tag) => tag !== t);
                setTags(updated);
                saveCurrentNote({ tags: updated });
              }}
              placeholder="Add tag (Enter)..."
              inputClassName="w-28 text-xs font-mono"
              dropdownPosition="top"
            />
          </div>

          {/* Footer Meta Sections: Obsidian Backlinks & Mentions, Semantic Relations, Flashback */}
          <div className="space-y-6 pt-6 border-t border-stone-200/60 dark:border-stone-800/60">
            {/* Obsidian Backlinks & Mentions System */}
            <ObsidianBacklinksPanel
              currentNote={note}
              allNotes={allNotes}
              folders={folders}
              onOpenNote={(targetId) => handleWikiLinkClick(targetId)}
              onCreateNote={(targetTitle) => {
                if (onCreateNoteWithTitle) {
                  onCreateNoteWithTitle(targetTitle);
                }
              }}
              onUpdateNote={(updated) => {
                if (updated.id === note.id) {
                  setContent(updated.content);
                }
                onSaveNote(updated);
              }}
            />

            {/* Semantically Related Notes */}
            <RelatedNotesSection
              currentNoteId={note.id}
              allNotes={allNotes}
              onOpenNote={(targetId) => handleWikiLinkClick(targetId)}
            />

            {/* Knowledge Resurfacing (Flashback) */}
            <FlashbackWidget
              notes={allNotes}
              folders={folders}
              onOpenNote={(targetId) => handleWikiLinkClick(targetId)}
            />
          </div>
        </div>

        {/* Integrated Collapsible Document Outline Panel */}
        {showOutline && type === 'text' && (
          <div className="w-72 border-l border-stone-200 dark:border-stone-800 shrink-0 h-full hidden md:block">
            <DocumentOutlinePanel
              sections={flatSections}
              foldState={foldState}
              activeLineIndex={activeCursorLine}
              onToggleFold={handleToggleFold}
              onFoldAll={handleFoldAll}
              onUnfoldAll={handleUnfoldAll}
              onJumpToSection={handleJumpToSection}
              onReorderSection={handleReorderSection}
              onClose={() => {
                setShowOutline(false);
                EditorPreferencesManager.savePreferences({ showOutline: false });
              }}
            />
          </div>
        )}

        {/* Integrated Local Graph Inspector Panel */}
        {showLocalGraph && (
          <div className="w-full md:w-96 border-l border-stone-200 dark:border-stone-800 shrink-0 h-full p-2 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-md fixed md:static inset-0 top-12 z-30 md:z-auto">
            <LocalGraphInspector
              centerNoteId={note.id}
              allNotes={allNotes}
              folders={folders}
              onOpenNote={(targetId, opts) => {
                if (opts?.split) {
                  splitWorkspace('horizontal');
                }
                handleWikiLinkClick(targetId);
              }}
              onClose={() => setShowLocalGraph(false)}
            />
          </div>
        )}
      </div>

      {/* Reading Progress Indicator Bar at Bottom of Editor */}
      <div
        className="w-full h-1 bg-stone-200/80 dark:bg-stone-800/80 shrink-0 overflow-hidden"
        role="progressbar"
        aria-valuenow={readingProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${readingProgress}%`}
      >
        <div
          className="h-full bg-amber-500 transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="p-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xs flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Color Picker Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Change Color"
              aria-label="Color Palette"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 grid grid-cols-5 gap-1.5 w-44 z-30">
                {COLOR_KEYS.map((ck) => (
                  <button
                    key={ck}
                    type="button"
                    onClick={() => {
                      setColor(ck);
                      setShowColorPicker(false);
                    }}
                    style={{ backgroundColor: NOTE_COLORS[ck].hex }}
                    className={`w-6 h-6 rounded-full border border-stone-300 dark:border-stone-700 transition-transform ${
                      color === ck ? 'scale-115 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'
                    }`}
                    title={NOTE_COLORS[ck].name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Folder Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFolderPicker(!showFolderPicker)}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Assign Folder"
              aria-label="Folder"
            >
              <FolderIcon className="w-4 h-4" />
            </button>
            {showFolderPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 z-30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setFolderId(null);
                    setShowFolderPicker(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Unorganized
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFolderId(f.id);
                      setShowFolderPicker(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs rounded hover:bg-stone-100 dark:hover:bg-stone-800 truncate"
                  >
                    📁 {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Adder */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className={`p-1.5 rounded-lg transition-colors ${
                showTagPicker
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Add Tag"
              aria-label="Tag"
            >
              <Tag className="w-4 h-4" />
            </button>
            {showTagPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 z-30 min-w-[200px]">
                <TagAutocompleteInput
                  tags={tags}
                  notes={allNotes}
                  onAddTag={(newTag) => {
                    if (!tags.includes(newTag)) {
                      const updated = [...tags, newTag];
                      setTags(updated);
                      saveCurrentNote({ tags: updated });
                    }
                    setShowTagPicker(false);
                  }}
                  onRemoveTag={(t) => {
                    const updated = tags.filter((tag) => tag !== t);
                    setTags(updated);
                    saveCurrentNote({ tags: updated });
                  }}
                  placeholder="tag-name..."
                  inputClassName="w-full px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-xs"
                  dropdownPosition="top"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Add Image */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Attach Image"
            aria-label="Attach Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Freehand Drawing Canvas */}
          {onOpenDrawingModal && (
            <button
              type="button"
              onClick={() => {
                onOpenDrawingModal((dataUrl) => {
                  const newImg: NoteImage = {
                    id: `img-${Date.now()}`,
                    name: 'Sketch Drawing',
                    dataUrl,
                    size: dataUrl.length,
                  };
                  setImages((prev) => [...prev, newImg]);
                });
              }}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Add Sketch Drawing"
              aria-label="Draw"
            >
              <Brush className="w-4 h-4" />
            </button>
          )}

          {/* Switch Note Type (Text vs Checklist) */}
          <button
            type="button"
            onClick={() => setType(type === 'text' ? 'checklist' : 'text')}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={type === 'text' ? 'Switch to Checklist' : 'Switch to Markdown Text'}
            aria-label="Checklist Toggle"
          >
            {type === 'text' ? <CheckSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Footer Actions: Export, Duplicate, Archive, Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Export Note (Standalone HTML, Markdown Package, Print)"
            aria-label="Export Note"
          >
            <Download className="w-4 h-4" />
          </button>

          {onDuplicateNote && (
            <button
              type="button"
              onClick={() => onDuplicateNote(note)}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Duplicate Note"
              aria-label="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={() =>
                onSaveAsTemplate({
                  ...note,
                  title,
                  content,
                  checklist,
                  tags,
                  color,
                })
              }
              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Save Structure as Reusable Template"
              aria-label="Save as Template"
            >
              <LayoutTemplate className="w-4 h-4 text-amber-500" />
            </button>
          )}

          {onCompareNote && (
            <button
              type="button"
              onClick={() =>
                onCompareNote({
                  ...note,
                  title,
                  content,
                  checklist,
                  tags,
                  color,
                })
              }
              className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Compare & Merge with another note (Mod+Alt+M)"
              aria-label="Compare & Merge Note"
            >
              <GitMerge className="w-4 h-4 text-indigo-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowZenModal(true)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Zen Focus Mode (Distraction-Free Fullscreen Editor - Alt+Z)"
            aria-label="Zen Focus Mode"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => setIsArchived(!isArchived)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={isArchived ? 'Unarchive Note' : 'Archive Note'}
            aria-label="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteNote(note.id)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Delete Note (Move to Trash)"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Dynamic Word Count Statistic */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-mono text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 ml-1"
            title={`Total Words: ${wordCount.toLocaleString()} | Total Characters: ${content.length.toLocaleString()}`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold">{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
          </div>

          {/* Reading Progress Indicator Badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-mono text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 ml-1"
            title={`Reading progress: ${readingProgress}%`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{readingProgress}%</span>
          </div>
        </div>
      </div>

      {/* QoL 6: Live Word, Character & Reading Time Status Footer */}
      <EditorStatusBar
        content={content}
        isSaving={saveStatus?.status === 'saving'}
        typewriterActive={isTypewriter || typewriterMode}
        onToggleTypewriter={() => {
          const newState = typewriterManager.toggleTypewriter();
          setTypewriterMode(newState);
        }}
        onToggleOutline={() => setShowOutline(!showOutline)}
        isOutlineOpen={showOutline}
      />

      {/* True Dialog Modals */}
      {showHistoryModal && (
        <VersionHistoryModal
          isOpen={true}
          onClose={() => setShowHistoryModal(false)}
          note={note}
          onRestoreRevision={(rev) => {
            setContent(rev.content);
            if (rev.title) setTitle(rev.title);
            setShowHistoryModal(false);
          }}
        />
      )}

      {showLockModal && (
        <LockNoteModal
          isOpen={true}
          onClose={() => setShowLockModal(false)}
          isCurrentlyLocked={isLocked}
          currentHash={lockHash}
          onLockSuccess={(hash) => {
            setIsLocked(true);
            setLockHash(hash);
            setShowLockModal(false);
          }}
          onUnlockSuccess={() => {
            setIsLocked(false);
            setLockHash(undefined);
            setShowLockModal(false);
          }}
        />
      )}

      {showZenModal && (
        <ZenModeModal
          isOpen={true}
          onClose={() => setShowZenModal(false)}
          title={title}
          content={content}
          onChangeContent={setContent}
          onChangeTitle={setTitle}
        />
      )}

      {showFlashcardModal && (
        <FlashcardReviewModal
          isOpen={true}
          onClose={() => setShowFlashcardModal(false)}
          notes={allNotes}
          folders={folders}
          initialNoteId={note.id}
          onOpenNote={(targetNoteId) => {
            setShowFlashcardModal(false);
            openNote(targetNoteId);
          }}
        />
      )}

      {showWebCaptureModal && (
        <WebCaptureModal
          isOpen={true}
          onClose={() => setShowWebCaptureModal(false)}
          onCapture={(importedMarkdown, sourceUrl) => {
            pushUndo(content);
            const extra = sourceUrl ? `\n\n> *Source: [${sourceUrl}](${sourceUrl})*\n` : '\n';
            setContent((prev) => (prev ? `${prev}\n\n${importedMarkdown}${extra}` : `${importedMarkdown}${extra}`));
            setShowWebCaptureModal(false);
          }}
        />
      )}

      {/* Smart Paste Toast */}
      {showPasteToast && pendingPasteData && (
        <PasteOptionsToast
          previewSnippet={pendingPasteData.markdown.slice(0, 100)}
          onSelectMode={handleConfirmPasteMode}
          onDismiss={() => {
            setShowPasteToast(false);
            setPendingPasteData(null);
          }}
        />
      )}

      {/* Atomic Idea Extraction Modal */}
      {showExtractionModal && (
        <ExtractionModal
          isOpen={true}
          onClose={() => setShowExtractionModal(false)}
          sourceNote={note}
          initialSelectedText={extractionInitialText}
          selectionRange={extractionRange}
          folders={folders}
          onExtractionComplete={handleExtractionSuccess}
        />
      )}

      {/* Single Note Export Modal (P39) */}
      {showExportModal && (
        <SingleNoteExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          note={note}
          allNotes={allNotes}
          folders={folders}
        />
      )}

      {/* AI Writing Assistant Modal (P42) */}
      {showAIWritingModal && (
        <AIWritingAssistantModal
          activeNote={note}
          selectedText={
            textareaRef.current && textareaRef.current.selectionStart !== textareaRef.current.selectionEnd
              ? content.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd)
              : undefined
          }
          allNotes={allNotes}
          onApplyAction={(action) => {
            pushUndo(content);
            let updated = content;
            if (action.type === 'replace_selection' && action.originalText) {
              updated = updated.replace(action.originalText, action.proposedText);
            } else {
              updated = `${updated}\n\n${action.proposedText}`;
            }
            setContent(updated);
            saveCurrentNote({ content: updated });
            setShowAIWritingModal(false);
          }}
          onCreateNewNote={(newTitle, newContent) => {
            onCreateNoteWithTitle?.(newTitle);
            setShowAIWritingModal(false);
          }}
          onClose={() => setShowAIWritingModal(false)}
        />
      )}

      {/* Note Image & Camera Insert Modal */}
      <ImageInsertModal
        isOpen={showImageInsertModal}
        onClose={() => setShowImageInsertModal(false)}
        defaultTab={imageInsertDefaultTab}
        onInsertImage={(snippet, imageInfo) => {
          handleInsertImageMarkdown(snippet, imageInfo);
          setShowImageInsertModal(false);
        }}
      />

      {/* Note Image Lightbox Collection Viewer */}
      <NoteImageLightbox
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        images={allNoteImages}
        initialIndex={lightboxIndex ?? 0}
        onRemoveImage={handleRemoveNoteImage}
        noteTitle={title || 'Untitled Note'}
      />
    </div>
  );
};
