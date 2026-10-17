import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Check,
  GraduationCap,
  Wand2,
  CopyPlus,
  Type,
  AlignLeft,
  Scissors,
  BarChart2,
  BookOpen,
  FileSpreadsheet,
  Table,
  FileUp,
  LayoutTemplate,
  GitMerge,
} from 'lucide-react';
import {
  toTitleCase,
  toUpperCase,
  toLowerCase,
  bulletizeLines,
  checkboxizeLines,
  cleanExtraBlankLines,
  trimTrailingWhitespace,
  getFormattedTimestamp,
  getDetailedStats,
} from '../../utils/textTransform';
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
import { downloadSingleNote, downloadNoteAsHTML, downloadNoteAsPlainText } from '../../services/exporter';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';
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
  SplitScreenWorkspace,
  semanticManager,
  InferredRelation,
  RelatedNotesSection,
} from '../../pkm';
import { UnlinkedMentionsSection } from '../../pkm/UnlinkedMentionsSection';
import {
  rankWikilinkCandidates,
  suggestTagsForNote,
  suggestOrphanConnections,
  isNoteOrphan,
  WikilinkCandidate,
  TagSuggestion,
  OrphanConnectionSuggestion,
} from '../../pkm/intelligence';
import {
  SlashCommandMenu,
  isValidSlashTrigger,
  SlashCommand,
  handleEditorKeyDown,
} from '../../pkm/editor';
import { MarkdownToolbar } from '../MarkdownToolbar';
import { AudioRecorder } from '../AudioRecorder';
import { VersionHistoryModal } from './VersionHistoryModal';
import { LockNoteModal } from './LockNoteModal';
import { ZenModeModal } from './ZenModeModal';
import { ReadingModeView } from './ReadingModeView';
import { WebCaptureModal } from './WebCaptureModal';
import { ImageInsertModal } from './ImageInsertModal';
import { NoteImageLightbox } from './NoteImageLightbox';
import { NoteImageGalleryView } from '../views/NoteImageGalleryView';
import {
  extractNoteImages,
  removeImageFromNoteContent,
  NoteEmbeddedImage,
} from '../../pkm/images/noteImages';
import { PasteOptionsToast } from '../PasteOptionsToast';
import { extractClipboardContent, PasteMode } from '../../pkm/webCapture';
import { isNoteUnlockedInSession } from '../../utils/crypto';
import { NoteSmartToolsBar } from '../NoteSmartToolsBar';
import { smartNoteService } from '../../services/smartNoteService';
import { SmartSuggestionBar } from '../SmartSuggestionBar';
import { AutomationAction } from '../../pkm/automation';
import { extractCardsFromNote } from '../../pkm/review/cardParser';
import { convertCSVToMarkdownTable } from '../../pkm/tableOperations';
import { serializeMarkdownTable } from '../../pkm/tableParser';

interface NoteModalProps {
  note: Note | null;
  allNotes: Note[];
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNote: Note) => void;
  onDelete: (noteId: string) => void;
  onOpenLinkedNote: (noteId: string) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onOpenPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  onOpenDrawingModal: (onSaveDrawing: (dataUrl: string) => void) => void;
  onDuplicateNote?: (note: Note) => void;
  onOpenFlashcards?: (noteId?: string) => void;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  note,
  allNotes,
  folders,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenLinkedNote,
  onCreateNoteWithTitle,
  onOpenPDF,
  onOpenDrawingModal,
  onDuplicateNote,
  onOpenFlashcards,
  onSaveAsTemplate,
  onCompareNote,
}) => {
  if (!note || !isOpen) return null;

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
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'split' | 'preview' | 'gallery'>('edit');
  const previewMode = editorViewMode === 'preview';

  // Slash Commands State
  const [slashMenuState, setSlashMenuState] = useState<{
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

  // Popups & Tools
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  // Secondary Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showZenModal, setShowZenModal] = useState(false);
  const [showWebCaptureModal, setShowWebCaptureModal] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [showSmartTools, setShowSmartTools] = useState(false);

  // In-Editor Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  // Smart Paste Options Toast State
  const [pasteData, setPasteData] = useState<{
    previousContent: string;
    smartMarkdown: string;
    plainText: string;
    rawHtml: string;
    currentMode: PasteMode;
    sourceUrl?: string;
    wordCount?: number;
    hasTables?: boolean;
    startCursor: number;
    endCursor: number;
  } | null>(null);

  // Fold State & Outliner State
  const [foldState, setFoldState] = useState<NoteFoldState>(() =>
    FoldStateManager.loadFoldState(note.id)
  );
  const [activeCursorLine, setActiveCursorLine] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Wiki-link autocomplete popup
  const [showLinkSuggest, setShowLinkSuggest] = useState(false);
  const [linkSuggestFilter, setLinkSuggestFilter] = useState('');
  const [dismissedSuggestedTags, setDismissedSuggestedTags] = useState<string[]>([]);
  const [dismissedOrphanTargets, setDismissedOrphanTargets] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioSectionRef = useRef<HTMLDivElement>(null);

  // QoL States & Handlers
  const [copiedContent, setCopiedContent] = useState(false);
  const [showTextTools, setShowTextTools] = useState(false);

  const noteFlashcards = useMemo(() => {
    if (!note || !content) return [];
    return extractCardsFromNote({ ...note, content });
  }, [note, content]);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  // CSV to Markdown Table Import Modal state
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const csvImportFileInputRef = useRef<HTMLInputElement>(null);

  const handleInsertCsvTable = () => {
    if (!csvImportText.trim()) {
      setCsvImportError('Please enter or upload CSV data.');
      return;
    }
    const parsed = convertCSVToMarkdownTable(csvImportText);
    if (!parsed || parsed.headers.length === 0) {
      setCsvImportError('Could not parse valid CSV data.');
      return;
    }
    const serialized = serializeMarkdownTable(parsed);
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = content.slice(0, start) + `\n\n${serialized}\n\n` + content.slice(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + serialized.length + 4, start + serialized.length + 4);
      }, 20);
    } else {
      setContent((prev) => `${prev}\n\n${serialized}\n\n`);
    }
    setShowCsvImportModal(false);
    setCsvImportText('');
    setCsvImportError(null);
  };

  // Image & Camera Embed Modal & Lightbox state
  const [showImageInsertModal, setShowImageInsertModal] = useState(false);
  const [imageInsertDefaultTab, setImageInsertDefaultTab] = useState<'camera' | 'url' | 'upload'>('url');
  const [enlargedPreviewImage, setEnlargedPreviewImage] = useState<{ alt: string; url: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleInsertImageMarkdown = (
    snippet: string,
    imageInfo?: { name: string; dataUrl: string; size?: number }
  ) => {
    setUndoStack((u) => [...u, content]);
    setRedoStack([]);
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

  // Aggregated list of all images embedded in this note (markdown tags, html img tags, and attachments)
  const allNoteImages = useMemo(() => {
    return extractNoteImages(content, images);
  }, [content, images]);

  // Keep backward compatibility for any direct embeddedMarkdownImages references
  const embeddedMarkdownImages = allNoteImages;

  const handleRemoveNoteImage = (img: NoteEmbeddedImage) => {
    setUndoStack((u) => [...u, content]);
    setRedoStack([]);
    const updatedContent = removeImageFromNoteContent(content, img);
    setContent(updatedContent);
    if (img.sourceType === 'attachment') {
      setImages((prev) => prev.filter((i) => i.id !== img.id && i.url !== img.url && i.dataUrl !== img.url));
    }
  };
  const [editorFontSize, setEditorFontSize] = useState<'xs' | 'sm' | 'base'>(() => {
    try {
      return (localStorage.getItem('pkm_editor_fontsize') as any) || 'sm';
    } catch {
      return 'sm';
    }
  });

  const handleSetFontSize = (sz: 'xs' | 'sm' | 'base') => {
    setEditorFontSize(sz);
    try {
      localStorage.setItem('pkm_editor_fontsize', sz);
    } catch {}
  };

  const handleCopyNoteContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  const handleInsertTimestamp = () => {
    const timestamp = getFormattedTimestamp();
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setUndoStack((prev) => [...prev, content]);
      setRedoStack([]);
      const newContent = content.substring(0, start) + timestamp + ' ' + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + timestamp.length + 1, start + timestamp.length + 1);
      }, 0);
    } else {
      setUndoStack((prev) => [...prev, content]);
      setRedoStack([]);
      setContent((prev) => (prev ? `${prev}\n${timestamp} ` : `${timestamp} `));
    }
  };

  // Floating Smart Suggestion Handlers
  const handleAddSuggestedTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '');
    if (clean && !tags.some((t) => t.toLowerCase().replace(/^#/, '') === clean.toLowerCase())) {
      setTags((prev) => [...prev, clean]);
    }
  };

  const handleInsertWikilinkSuggestion = (targetTitle: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const linkText = `[[${targetTitle}]]`;
      const newContent = content.substring(0, start) + linkText + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + linkText.length, start + linkText.length);
        }
      }, 50);
    } else {
      setContent((prev) => `${prev} [[${targetTitle}]]`);
    }
  };

  const handleExecuteRuleAction = (actions: AutomationAction[], ruleName: string) => {
    for (const act of actions) {
      if (act.type === 'add_tag' && act.tag) {
        handleAddSuggestedTag(act.tag);
      } else if (act.type === 'move_note' && act.targetFolderId !== undefined) {
        setFolderId(act.targetFolderId);
      } else if (act.type === 'set_property') {
        if (act.key === 'priority' && act.value) {
          setPriority(act.value);
        } else if (act.key === 'color' && act.value) {
          setColor(act.value);
        } else if (act.key === 'status' && act.value) {
          setStatus(act.value);
        }
      } else if (act.type === 'archive_note') {
        setIsArchived(act.archive);
      }
    }
  };

  const handleApplyTextTransformation = (
    transformFn: (text: string) => string,
    transformSelectionOnly = true
  ) => {
    const ta = textareaRef.current;
    if (ta && transformSelectionOnly && ta.selectionStart !== ta.selectionEnd) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end);
      const transformed = transformFn(selected);
      setUndoStack((prev) => [...prev, content]);
      setRedoStack([]);
      setContent(content.substring(0, start) + transformed + content.substring(end));
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start, start + transformed.length);
      }, 0);
    } else {
      setUndoStack((prev) => [...prev, content]);
      setRedoStack([]);
      setContent(transformFn(content));
    }
    setShowTextTools(false);
  };

  // Sync state when note changes
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
    setSourceUrl(note.sourceUrl);
    setRevisions(note.revisions || []);
    setIsLocked(note.isLocked || false);
    setLockHash(note.lockHash);
    setFoldState(FoldStateManager.loadFoldState(note.id));
    setActiveCursorLine(0);
    setUndoStack([]);
    setRedoStack([]);
    setPasteData(null);
    setDismissedSuggestedTags([]);
    setDismissedOrphanTargets([]);
    setIsReadingMode(false);
  }, [note.id]);

  // Handle Save and Auto-Revision Creation
  const handleSaveAndClose = () => {
    const linkedIds = resolveLinkedNoteIds(content, allNotes);

    // Save snapshot to revision history if content or title changed
    let updatedRevisions = [...revisions];
    if (content !== note.content || title !== note.title) {
      const newRev: NoteRevision = {
        id: `rev-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: note.title,
        content: note.content,
        checklist: note.checklist || [],
        wordCount: note.content ? note.content.trim().split(/\s+/).length : 0,
      };
      // Keep up to 20 recent revisions
      updatedRevisions = [newRev, ...updatedRevisions].slice(0, 20);
    }

    onSave({
      ...note,
      title: title.trim() || 'Untitled Note',
      content,
      type,
      checklist,
      color,
      folderId,
      tags,
      pinned: isPinned,
      archived: isArchived,
      reminderDate,
      priority,
      status,
      images,
      audios,
      sourceUrl: sourceUrl?.trim() || undefined,
      revisions: updatedRevisions,
      isLocked,
      lockHash,
      linkedNoteIds: linkedIds,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showHistoryModal || showLockModal || showZenModal) return;

      if (e.key === 'Escape') {
        if (isReadingMode) {
          setIsReadingMode(false);
        } else if (showFindReplace) {
          setShowFindReplace(false);
        } else {
          handleSaveAndClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSaveAndClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        setShowTOC((prev) => !prev);
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setIsReadingMode((prev) => !prev);
      } else if (e.altKey && e.key === '\\') {
        e.preventDefault();
        setIsSplitMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
    isReadingMode,
    showHistoryModal,
    showLockModal,
    showZenModal,
    showFindReplace,
  ]);

  // Markdown Formatting Helper
  const handleApplyFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'h1':
        replacement = `# ${selected || 'Heading 1'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h2':
        replacement = `## ${selected || 'Heading 2'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h3':
        replacement = `### ${selected || 'Heading 3'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'quote':
        replacement = `> ${selected || 'Quote block'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        replacement = selected.includes('\n')
          ? `\`\`\`\n${selected || '// code'}\n\`\`\`\n`
          : `\`${selected || 'code'}\``;
        cursorOffset = replacement.length;
        break;
      case 'math':
        replacement = `$${selected || 'x^2 + y^2 = z^2'}$`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'mathblock':
        replacement = `$$\n${selected || '\\sum_{i=1}^n x_i = \\frac{n(n+1)}{2}'}\n$$\n`;
        cursorOffset = replacement.length;
        break;
      case 'mermaid':
        replacement = `\`\`\`mermaid\ngraph TD\n  A[Start] --> B{Condition}\n  B -->|Yes| C[Process]\n  B -->|No| D[End]\n\`\`\`\n`;
        cursorOffset = replacement.length;
        break;
      case 'bullet':
        replacement = `- ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'number':
        replacement = `1. ${selected || 'Numbered item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'task':
        replacement = `- [ ] ${selected || 'Task item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Value 1 | Active |\n| Item 2 | Value 2 | Pending |\n\n`;
        cursorOffset = replacement.length;
        break;
      case 'import_csv':
        setShowCsvImportModal(true);
        return;
      case 'date':
        replacement = `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] `;
        cursorOffset = replacement.length;
        break;
      case 'divider':
        replacement = `\n---\n\n`;
        cursorOffset = replacement.length;
        break;
      case 'wikilink':
        replacement = `[[${selected || 'Note Title'}]]`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      default:
        return;
    }

    const newContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 10);
  };

  // Find & Replace Handler
  const matches = useMemo(() => {
    if (!findQuery.trim() || !content) return [];
    const results: number[] = [];
    let pos = 0;
    const lowerContent = content.toLowerCase();
    const lowerQuery = findQuery.toLowerCase();
    while ((pos = lowerContent.indexOf(lowerQuery, pos)) !== -1) {
      results.push(pos);
      pos += lowerQuery.length;
    }
    return results;
  }, [findQuery, content]);

  const handleReplaceNext = () => {
    if (matches.length === 0) return;
    const matchPos = matches[matchIndex % matches.length];
    const newContent =
      content.slice(0, matchPos) +
      replaceQuery +
      content.slice(matchPos + findQuery.length);
    setContent(newContent);
  };

  const handleReplaceAll = () => {
    if (!findQuery.trim()) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    setContent(content.replace(regex, replaceQuery));
  };

  // PKM Document Outliner & Heading Sections
  const { flatSections, tree: sectionTree } = useMemo(() => {
    return parseMarkdownSections(content);
  }, [content]);

  // Backward compatibility alias for TOC
  const headings = useMemo(() => {
    return flatSections.map((s) => ({
      level: s.level,
      text: s.title,
      lineIndex: s.startLine,
    }));
  }, [flatSections]);

  // Real-time Active Breadcrumbs
  const breadcrumbs = useMemo(() => {
    return getHeadingBreadcrumb(content, activeCursorLine);
  }, [content, activeCursorLine]);

  // Outliner & Fold Management
  const handleToggleFold = (secId: string) => {
    const updated = FoldStateManager.toggleHeadingFold(note.id, secId, foldState);
    setFoldState(updated);
  };

  const handleFoldAll = () => {
    const allIds = flatSections.map((s) => s.id);
    const updated = FoldStateManager.saveFoldState(note.id, {
      ...foldState,
      foldedHeadingIds: allIds,
    });
    setFoldState(updated);
  };

  const handleUnfoldAll = () => {
    const updated = FoldStateManager.saveFoldState(note.id, {
      ...foldState,
      foldedHeadingIds: [],
      foldedListLines: [],
    });
    setFoldState(updated);
  };

  // Section Reordering with Undo Safety
  const handleReorderSection = (
    sourceIndex: number,
    targetPosition: number | 'up' | 'down'
  ) => {
    setUndoStack((prev) => [...prev, content]);
    setRedoStack([]);
    const updatedContent = reorderSection(content, sourceIndex, targetPosition);
    setContent(updatedContent);

    // Reposition cursor to the moved section
    const { flatSections: newSections } = parseMarkdownSections(updatedContent);
    const newIdx =
      targetPosition === 'up'
        ? Math.max(0, sourceIndex - 1)
        : targetPosition === 'down'
        ? Math.min(newSections.length - 1, sourceIndex + 1)
        : typeof targetPosition === 'number'
        ? targetPosition
        : 0;

    if (newSections[newIdx]) {
      setActiveCursorLine(newSections[newIdx].startLine);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, content]);
    setContent(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, content]);
    setContent(next);
  };

  // Jump to Section / Heading in Editor or Preview
  const handleJumpToSection = (sec: DocumentSection) => {
    if (!previewMode && textareaRef.current) {
      const lines = content.split('\n');
      let charOffset = 0;
      for (let i = 0; i < sec.startLine && i < lines.length; i++) {
        charOffset += lines[i].length + 1;
      }
      textareaRef.current.focus();
      const headingLineLen = lines[sec.startLine]?.length || 0;
      textareaRef.current.setSelectionRange(charOffset, charOffset + headingLineLen);

      const lineHeight = 22;
      textareaRef.current.scrollTop = Math.max(0, sec.startLine * lineHeight - 60);
      setActiveCursorLine(sec.startLine);
    } else if (previewMode) {
      const elem = document.getElementById(sec.slug);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Track cursor position line
  const updateCursorLine = (el: HTMLTextAreaElement) => {
    const textBefore = el.value.slice(0, el.selectionStart);
    const lineIdx = textBefore.split('\n').length - 1;
    setActiveCursorLine(lineIdx);
  };

  // Statistics Calculations
  const stats = useMemo(() => {
    const text = content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = content.length;
    const lines = content.split('\n').length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, lines, readTime };
  }, [content]);

  const detailedStats = useMemo(() => {
    return getDetailedStats(content);
  }, [content]);

  // Slash Command & Wiki Link Trigger Detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(val);
    updateCursorLine(e.target);

    // 1. Check for slash command trigger
    const slashTrigger = isValidSlashTrigger(val, cursorPos);
    if (slashTrigger.isValid) {
      const lines = val.slice(0, cursorPos).split('\n');
      const lineIndex = lines.length - 1;
      const top = Math.min(260, Math.max(28, (lineIndex + 1) * 22 + 8));
      setSlashMenuState({
        isOpen: true,
        query: slashTrigger.query,
        slashIndex: slashTrigger.slashIndex,
        position: { top, left: 16 },
      });
      setShowLinkSuggest(false);
      return;
    } else {
      if (slashMenuState.isOpen) {
        setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
      }
    }

    // 2. Check for wiki link trigger
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastOpenBracketIndex = textBeforeCursor.lastIndexOf('[[');

    if (lastOpenBracketIndex !== -1) {
      const textAfterOpen = textBeforeCursor.slice(lastOpenBracketIndex + 2);
      if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n')) {
        setShowLinkSuggest(true);
        setLinkSuggestFilter(textAfterOpen.toLowerCase());
        return;
      }
    }
    setShowLinkSuggest(false);
  };

  const handleSelectSlashCommand = (cmd: SlashCommand) => {
    if (!textareaRef.current) return;
    const { slashIndex, query } = slashMenuState;
    const textBefore = content.slice(0, slashIndex);
    const textAfter = content.slice(slashIndex + 1 + query.length);

    const now = new Date();
    const context = {
      linePrefix: '',
      currentDateStr: now.toISOString().slice(0, 10),
      currentTimeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const { snippet, cursorOffset } = cmd.template(context);
    const newContent = textBefore + snippet + textAfter;
    setContent(newContent);
    setSlashMenuState({ isOpen: false, query: '', slashIndex: -1, position: { top: 0, left: 0 } });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = slashIndex + cursorOffset;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const insertWikiLink = (targetTitle: string, alias?: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const lastOpenBracketIndex = textBeforeCursor.lastIndexOf('[[');

    if (lastOpenBracketIndex !== -1) {
      const before = content.slice(0, lastOpenBracketIndex);
      const after = content.slice(cursorPos);
      const linkSnippet =
        alias && alias.toLowerCase() !== targetTitle.toLowerCase()
          ? `[[${targetTitle}|${alias}]]`
          : `[[${targetTitle}]]`;
      const newText = `${before}${linkSnippet} ${after}`;
      setContent(newText);
      setShowLinkSuggest(false);
    }
  };

  // Rich Web Capture & Smart Paste Handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Process clipboard DataTransfer
    const extracted = await extractClipboardContent(e.clipboardData);

    // If image blobs are pasted:
    if (extracted.images.length > 0) {
      e.preventDefault();
      setImages((prev) => [...prev, ...extracted.images]);

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const snippets = extracted.images
          .map((img) => `\n![${img.name || 'Pasted Image'}](${img.dataUrl})\n`)
          .join('');
        const newText = content.slice(0, start) + snippets + content.slice(end);
        setUndoStack((u) => [...u, content]);
        setRedoStack([]);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + snippets.length, start + snippets.length);
        }, 20);
      }
      return;
    }

    // If plain text is a direct image URL (png, jpg, jpeg, gif, webp, svg, avif, data:image):
    const plainTrimmed = (extracted.plainText || '').trim();
    const isDirectImageUrl =
      /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg|avif|bmp)(?:\?[^\s]*)?$/i.test(plainTrimmed) ||
      /^data:image\/[a-zA-Z0-9+.-]+;base64,[^\s]+$/i.test(plainTrimmed);

    if (isDirectImageUrl && !extracted.hasHtml) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const snippet = `\n![Embedded Image](${plainTrimmed})\n`;
        const newText = content.slice(0, start) + snippet + content.slice(end);
        setUndoStack((u) => [...u, content]);
        setRedoStack([]);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + snippet.length, start + snippet.length);
        }, 20);
      }
      return;
    }

    // If HTML/rich text is pasted:
    if (extracted.hasHtml && extracted.markdown) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prevContent = content;

      // Smart Markdown insertion
      const insertedText = extracted.markdown;
      const newContent = content.slice(0, start) + insertedText + content.slice(end);

      setUndoStack((u) => [...u, content]);
      setRedoStack([]);
      setContent(newContent);

      // Auto-set sourceUrl if extracted has one and note doesn't have one
      if (extracted.sourceUrl && !sourceUrl) {
        setSourceUrl(extracted.sourceUrl);
      }

      setPasteData({
        previousContent: prevContent,
        smartMarkdown: insertedText,
        plainText: extracted.plainText,
        rawHtml: extracted.rawHtml,
        currentMode: 'smart',
        sourceUrl: extracted.sourceUrl,
        wordCount: extracted.wordCount,
        hasTables: extracted.hasTables,
        startCursor: start,
        endCursor: start + insertedText.length,
      });

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            start + insertedText.length,
            start + insertedText.length
          );
        }
      }, 10);
    }
  };

  const handleSelectPasteMode = (mode: PasteMode) => {
    if (!pasteData) return;
    const { previousContent, smartMarkdown, plainText, rawHtml, startCursor } = pasteData;
    let textToInsert = smartMarkdown;
    if (mode === 'plain') {
      textToInsert = plainText;
    } else if (mode === 'raw') {
      textToInsert = rawHtml;
    }

    const updatedContent =
      previousContent.slice(0, startCursor) +
      textToInsert +
      previousContent.slice(startCursor);

    setContent(updatedContent);
    setPasteData((prev) => (prev ? { ...prev, currentMode: mode } : null));
  };

  const handleUndoPaste = () => {
    if (!pasteData) return;
    setContent(pasteData.previousContent);
    setPasteData(null);
  };

  const itemInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addChecklistItem = (textToAdd?: string, insertIndex?: number) => {
    const itemText = (textToAdd !== undefined ? textToAdd : newChecklistText).trim();
    if (!itemText && textToAdd === undefined) return;
    const newId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: ChecklistItem = {
      id: newId,
      text: itemText,
      completed: false,
    };

    if (insertIndex !== undefined && insertIndex >= 0) {
      const updated = [...checklist];
      updated.splice(insertIndex + 1, 0, newItem);
      setChecklist(updated);
    } else {
      setChecklist([...checklist, newItem]);
      setNewChecklistText('');
    }

    setTimeout(() => {
      const inputEl = itemInputRefs.current[newId];
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 20);
  };

  const toggleChecklistItem = (id: string, e?: React.MouseEvent) => {
    const target = checklist.find((item) => item.id === id);
    const willBeCompleted = target ? !target.completed : false;
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    if (
      willBeCompleted &&
      updated.length > 0 &&
      updated.every((item) => item.completed)
    ) {
      fireConfetti(e?.clientX, e?.clientY);
    }
    setChecklist(updated);
  };

  const removeChecklistItem = (id: string, focusPrevId?: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
    if (focusPrevId) {
      setTimeout(() => {
        const prevEl = itemInputRefs.current[focusPrevId];
        if (prevEl) {
          prevEl.focus();
          const len = prevEl.value.length;
          prevEl.setSelectionRange(len, len);
        }
      }, 20);
    }
  };

  const toggleAllChecklist = () => {
    const allCompleted = checklist.length > 0 && checklist.every((item) => item.completed);
    const willCompleteAll = !allCompleted;
    if (willCompleteAll && checklist.length > 0) {
      fireConfetti();
    }
    setChecklist(checklist.map((item) => ({ ...item, completed: !allCompleted })));
  };

  const clearCompletedChecklist = () => {
    setChecklist(checklist.filter((item) => !item.completed));
  };

  const handleModalEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    soundscapeService.playTypewriterClick();
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (slashMenuState.isOpen && e.key === 'Escape') {
      e.preventDefault();
      setSlashMenuState((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    // Section reordering
    if (e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const currentSecIdx = flatSections.findIndex(
        (s) => activeCursorLine >= s.startLine && activeCursorLine <= s.endLine
      );
      if (currentSecIdx !== -1) {
        handleReorderSection(currentSecIdx, e.key === 'ArrowUp' ? 'up' : 'down');
      }
      return;
    }

    // Full PKM editor shortcuts (Enter continuation, Tab indent, Alt+Up/Down, Auto-pair, Ctrl+B/I/K/X/E)
    const result = handleEditorKeyDown(
      e,
      content,
      textarea.selectionStart,
      textarea.selectionEnd,
      true
    );

    if (result.handled) {
      if (result.newContent !== undefined) {
        setContent(result.newContent);
      }
      setTimeout(() => {
        textarea.focus();
        const selStart = result.newSelectionStart ?? result.newCursorStart ?? textarea.selectionStart;
        const selEnd = result.newSelectionEnd ?? result.newCursorEnd ?? selStart;
        textarea.setSelectionRange(selStart, selEnd);
      }, 0);
    }
  };

  const addTag = () => {
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: reader.result as string,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const backlinks = getBacklinksForNote(note, allNotes);
  const colorConfig = NOTE_COLORS[color] || NOTE_COLORS.default;

  // Session-based ignored / dismissed terms for unlinked mentions
  const [dismissedTerms, setDismissedTerms] = useState<string[]>([]);

  // Inferred semantic relations for this note
  const [inferredRelations, setInferredRelations] = useState<InferredRelation[]>([]);

  useEffect(() => {
    if (!note || !isOpen || type !== 'text') {
      setInferredRelations([]);
      return;
    }
    let isCurrent = true;
    semanticManager
      .computeInferredLinks(allNotes)
      .then((allRels) => {
        if (!isCurrent) return;
        const forThisNote = allRels
          .filter((r) => r.sourceId === note.id || r.targetId === note.id)
          .map((r) => {
            if (r.sourceId === note.id) return r;
            return { ...r, sourceId: note.id, targetId: r.sourceId };
          });
        setInferredRelations(forThisNote);
      })
      .catch((err) => {
        console.warn('Failed to compute inferred relations for modal note:', err);
      });
    return () => {
      isCurrent = false;
    };
  }, [note.id, allNotes, isOpen, type]);

  const handleInsertRelatedLink = (targetTitle: string) => {
    setUndoStack((u) => [...u, content]);
    setRedoStack([]);
    setContent((prev) => (prev.trim() ? `${prev}\n\n[[${targetTitle}]]` : `[[${targetTitle}]]`));
  };

  // Compute Unlinked Mention Candidates using VaultIndex
  const unlinkedMentions = useMemo(() => {
    if (!content || type !== 'text') return [];
    const index = vaultManager.getIndex();
    return findUnlinkedMentions(content, note.id, index, {
      ignoredTerms: dismissedTerms,
    });
  }, [content, note.id, type, dismissedTerms, allNotes]);

  // Handler: Link a single occurrence
  const handleLinkOccurrence = (
    candidate: UnlinkedMentionCandidate,
    occurrence: UnlinkedOccurrence
  ) => {
    const textarea = textareaRef.current;
    const currentCursor = textarea ? textarea.selectionStart : null;

    const { newContent, replacementLengthDiff } = replaceSingleOccurrence(
      content,
      occurrence,
      candidate.targetTitle
    );
    setContent(newContent);

    if (textarea && currentCursor !== null) {
      const newCursor =
        currentCursor >= occurrence.endOffset
          ? currentCursor + replacementLengthDiff
          : currentCursor;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 10);
    }
  };

  // Handler: Link all occurrences in a candidate
  const handleLinkAllInCandidate = (candidate: UnlinkedMentionCandidate) => {
    const occurrencesToReplace = candidate.occurrences.map((occ) => ({
      occurrence: occ,
      targetTitle: candidate.targetTitle,
    }));
    const newContent = replaceOccurrences(content, occurrencesToReplace);
    setContent(newContent);
  };

  // Handler: Link all safe occurrences across all candidates
  const handleLinkAllSafe = () => {
    const allOccurrences: Array<{ occurrence: UnlinkedOccurrence; targetTitle: string }> = [];
    for (const cand of unlinkedMentions) {
      for (const occ of cand.occurrences) {
        allOccurrences.push({
          occurrence: occ,
          targetTitle: cand.targetTitle,
        });
      }
    }
    const newContent = replaceOccurrences(content, allOccurrences);
    setContent(newContent);
  };

  // Handler: Dismiss / ignore a term
  const handleDismissTerm = (term: string) => {
    setDismissedTerms((prev) => [...prev, term]);
  };

  // Knowledge Intelligence Computations
  const wikilinkCandidates = useMemo<WikilinkCandidate[]>(() => {
    return rankWikilinkCandidates(
      linkSuggestFilter,
      {
        activeNoteId: note.id,
        activeNoteContent: content,
      },
      allNotes
    );
  }, [linkSuggestFilter, note.id, content, allNotes]);

  const currentDraftNote = useMemo<Note>(() => ({
    ...note,
    title,
    content,
    tags,
    folderId,
  }), [note, title, content, tags, folderId]);

  const tagSuggestions = useMemo<TagSuggestion[]>(() => {
    return suggestTagsForNote(currentDraftNote, allNotes, undefined, {
      limit: 3,
      minScore: 0.25,
      dismissedTags: dismissedSuggestedTags,
    });
  }, [currentDraftNote, allNotes, dismissedSuggestedTags]);

  const isOrphanNote = useMemo<boolean>(() => {
    return isNoteOrphan(note.id, allNotes);
  }, [note.id, allNotes]);

  const orphanSuggestions = useMemo<OrphanConnectionSuggestion[]>(() => {
    if (!isOrphanNote) return [];
    return suggestOrphanConnections(note.id, allNotes, undefined, {
      limit: 3,
      minScore: 0.25,
      dismissedTargets: dismissedOrphanTargets,
    });
  }, [isOrphanNote, note.id, allNotes, dismissedOrphanTargets]);

  const handleApplyOrphanLink = (targetTitle: string) => {
    const linkText = `\n\nSee also: [[${targetTitle}]]`;
    setContent((prev) => `${prev.trimEnd()}${linkText}\n`);
  };

  const textSegments = parseTextWithWikiLinks(content, allNotes);

  return (
    <>
      <div
        onClick={handleSaveAndClose}
        className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />

        {isReadingMode ? (
          <ReadingModeView
            note={note}
            title={title}
            content={content}
            type={type}
            checklist={checklist}
            images={images}
            audios={audios}
            allNotes={allNotes}
            folders={folders}
            folderId={folderId}
            foldState={foldState}
            onToggleFold={handleToggleFold}
            onOpenLinkedNote={onOpenLinkedNote}
            onCreateNoteWithTitle={onCreateNoteWithTitle}
            onOpenPDF={onOpenPDF}
            onContentChange={(newContent) => setContent(newContent)}
            onToggleChecklistItem={(id) => toggleChecklistItem(id)}
            onExitReadingMode={() => setIsReadingMode(false)}
            onCloseModal={handleSaveAndClose}
          />
        ) : isSplitMode ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-7xl h-[92vh] rounded-3xl border border-stone-300 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col my-auto transition-all bg-white dark:bg-stone-900"
          >
            <SplitScreenWorkspace
              primaryNote={{
                ...note,
                title,
                content,
                checklist,
                color,
                folderId,
                tags,
                pinned: isPinned,
                archived: isArchived,
                reminderDate,
                images,
                audios,
                revisions,
                isLocked,
                lockHash,
              }}
              allNotes={allNotes}
              folders={folders}
              onUpdatePrimaryNote={(updated) => {
                setTitle(updated.title);
                setContent(updated.content);
                onSave(updated);
              }}
              onUpdateSecondaryNote={(updated) => {
                onSave(updated);
              }}
              onOpenLinkedNote={(linkedId) => {
                onOpenLinkedNote(linkedId);
              }}
              onCreateNoteWithTitle={onCreateNoteWithTitle}
              onCloseSplit={() => setIsSplitMode(false)}
            />
          </div>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${
              colorConfig.bgLight
            } ${colorConfig.borderLight} ${colorConfig.bgDark} ${colorConfig.borderDark}`}
          >
            {/* Top Header Bar */}
            <div className="p-4 flex items-center justify-between border-b border-stone-300/70 dark:border-stone-800 gap-2">
              <div className="flex-1 min-w-0 mr-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-transparent text-lg font-bold text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden tracking-tight truncate"
                />

                {/* Minutes to Read Label & Interactive Detailed Stats Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDetailedStats(!showDetailedStats)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white border border-stone-200/60 dark:border-stone-700/60 shrink-0 transition-colors"
                    title="Click to view detailed document statistics"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{stats.readTime === 1 ? '1 min read' : `${stats.readTime} mins read`}</span>
                  </button>

                  {/* Detailed Statistics Popover */}
                  {showDetailedStats && (
                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl z-50 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-stone-200 dark:border-stone-700">
                        <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                          <BarChart2 className="w-3.5 h-3.5 text-amber-500" /> Document Statistics
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDetailedStats(false)}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg">
                          <span className="text-stone-500 block">Words</span>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">{detailedStats.words}</span>
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg">
                          <span className="text-stone-500 block">Reading Time</span>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">~{detailedStats.readTimeMinutes} min</span>
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg">
                          <span className="text-stone-500 block">Characters</span>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">{detailedStats.charsWithSpaces}</span>
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg">
                          <span className="text-stone-500 block">Lines</span>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">{detailedStats.lines}</span>
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/50 p-2 rounded-lg col-span-2 flex justify-between items-center">
                          <span className="text-stone-500">Paragraphs</span>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">{detailedStats.paragraphs}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* One-Click Copy Note Content */}
                <button
                  type="button"
                  onClick={handleCopyNoteContent}
                  className={`p-2 rounded-xl transition-colors ${
                    copiedContent
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title={copiedContent ? 'Copied to clipboard!' : 'Copy Note Content'}
                >
                  {copiedContent ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* Direct Markdown Download */}
                <button
                  type="button"
                  onClick={() => downloadSingleNote(note, folders)}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                  title="Export / Download as Markdown (.md)"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Duplicate Note */}
                {onDuplicateNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateNote(note);
                      onClose();
                    }}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                    title="Duplicate Note"
                  >
                    <CopyPlus className="w-4 h-4" />
                  </button>
                )}

                {/* Save Structure as Template */}
                {onSaveAsTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveAsTemplate({
                        ...note,
                        title,
                        content,
                        checklist,
                        tags,
                        color,
                      });
                    }}
                    className="p-2 rounded-xl text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                    title="Save Note Structure as Reusable Template"
                  >
                    <LayoutTemplate className="w-4 h-4 text-amber-500" />
                  </button>
                )}

                {/* Compare & Merge with another note */}
                {onCompareNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onCompareNote({
                        ...note,
                        title,
                        content,
                        checklist,
                        tags,
                        color,
                      });
                    }}
                    className="p-2 rounded-xl text-stone-500 hover:text-indigo-600 dark:text-stone-400 dark:hover:text-indigo-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                    title="Compare & Merge Note (Visual Diff & Consolidation Studio)"
                  >
                    <GitMerge className="w-4 h-4 text-indigo-500" />
                  </button>
                )}

                {/* Text Formatting & Clean Tools Dropdown */}
                {type === 'text' && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTextTools(!showTextTools)}
                      className={`p-2 rounded-xl transition-colors ${
                        showTextTools
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                      }`}
                      title="Text Tools & Transformations (Timestamp, Case, Clean)"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>

                    {showTextTools && (
                      <div className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl z-50 text-xs space-y-0.5">
                        <span className="px-2 py-1 text-[10px] font-bold uppercase text-stone-500 block">
                          Text Transformations
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleInsertTimestamp();
                            setShowTextTools(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Insert Timestamp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(toTitleCase)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <Type className="w-3.5 h-3.5 text-blue-500" />
                          <span>Title Case</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(toUpperCase)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <span className="font-mono font-bold text-[11px] text-stone-500">AA</span>
                          <span>UPPERCASE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(toLowerCase)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <span className="font-mono text-[11px] text-stone-500">aa</span>
                          <span>lowercase</span>
                        </button>
                        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-stone-500 block">
                          List & Clean Tools
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(bulletizeLines, false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <ListOrdered className="w-3.5 h-3.5 text-stone-500" />
                          <span>Toggle Bullet List</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(checkboxizeLines, false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-stone-500" />
                          <span>Toggle Task Checkboxes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(cleanExtraBlankLines, false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <AlignLeft className="w-3.5 h-3.5 text-stone-500" />
                          <span>Remove Blank Lines</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTextTransformation(trimTrailingWhitespace, false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-900 dark:hover:text-amber-200 font-medium"
                        >
                          <Scissors className="w-3.5 h-3.5 text-stone-500" />
                          <span>Trim Trailing Spaces</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Split Screen Workspace Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSplitMode(true)}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                  title="Split-Screen Dual Pane Mode (Alt+\)"
                >
                  <Columns2 className="w-4 h-4" />
                </button>

                {/* Find & Replace Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                  className={`p-2 rounded-xl transition-colors ${
                    showFindReplace
                      ? 'bg-amber-500 text-white'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title="Find and Replace in Note (Ctrl+H)"
                >
                  <Search className="w-4 h-4" />
                </button>

              {/* Smart Note Utilities */}
              <button
                type="button"
                onClick={() => setShowSmartTools(!showSmartTools)}
                className={`p-2 rounded-xl transition-colors ${
                  showSmartTools
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                title="Smart Note Utilities (Tags, Tasks, TL;DR, WikiLinks, Structure)"
              >
                <Wand2 className={`w-4 h-4 ${showSmartTools ? 'text-white' : 'text-amber-500'}`} />
              </button>

              {/* Reading Mode Button */}
              <button
                id="modal-reading-mode-btn"
                type="button"
                onClick={() => setIsReadingMode(true)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Reading Mode (Alt+R)"
                aria-label="Reading Mode"
              >
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>

              {/* Zen Focus Mode */}
              <button
                type="button"
                onClick={() => setShowZenModal(true)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Zen Distraction-Free Fullscreen Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Version History */}
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title={`Revisions History (${revisions.length})`}
              >
                <History className="w-4 h-4" />
              </button>

              {/* Lock Passcode Protection */}
              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                className={`p-2 rounded-xl transition-colors ${
                  isLocked
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/60'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                title={isLocked ? 'Note is Password Protected' : 'Lock Note with Password'}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>

              {/* Pin Toggle */}
              <button
                id="modal-pin-note"
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-2 rounded-xl transition-colors ${
                  isPinned
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-950 border border-amber-400/60'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
                title={isPinned ? 'Unpin note' : 'Pin note to top'}
                aria-label={isPinned ? 'Unpin note' : 'Pin note to top'}
                aria-pressed={isPinned}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-600 dark:fill-amber-400' : ''}`} />
              </button>

              {/* Close / Save Button */}
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800"
                title="Save & Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Archived Notice Banner */}
          {isArchived && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>This note is archived.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsArchived(false)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
              >
                <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
              </button>
            </div>
          )}

          {/* Smart Note Utilities Bar (Offline Heuristic Engine) */}
          {showSmartTools && (
            <div className="px-4 pt-2">
              <NoteSmartToolsBar
                note={note}
                currentTitle={title}
                currentContent={content}
                currentTags={tags}
                allNotes={allNotes || []}
                onAddTags={(newTags) => {
                  setTags((prev) => Array.from(new Set([...prev, ...newTags])));
                }}
                onSetTitle={(newTitle) => setTitle(newTitle)}
                onAppendChecklist={(newTasks) => {
                  if (type === 'checklist') {
                    const mapped: ChecklistItem[] = newTasks.map((t, idx) => ({
                      id: `task-${Date.now()}-${idx}`,
                      text: t.text,
                      completed: t.completed,
                    }));
                    setChecklist((prev) => [...prev, ...mapped]);
                  } else {
                    const checklistMd = '\n\n' + newTasks.map((t) => `- [ ] ${t.text}`).join('\n');
                    setContent((prev) => prev + checklistMd);
                  }
                }}
                onPrependContent={(text) => setContent((prev) => text + prev)}
                onInsertContent={(text) => setContent((prev) => prev + text)}
              />
            </div>
          )}

          {/* In-Editor Find & Replace Collapsible Panel */}
          {showFindReplace && (
            <div className="px-4 py-2.5 bg-stone-100/90 dark:bg-stone-800/90 border-b border-stone-200 dark:border-stone-700 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700">
                <Search className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Find in note..."
                  value={findQuery}
                  onChange={(e) => {
                    setFindQuery(e.target.value);
                    setMatchIndex(0);
                  }}
                  autoFocus
                  className="w-32 md:w-44 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
                <span className="text-[10px] text-stone-400 px-1">
                  {matches.length > 0
                    ? `${(matchIndex % matches.length) + 1} of ${matches.length}`
                    : '0 found'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-stone-900 px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700">
                <Replace className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="w-32 md:w-44 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setMatchIndex((idx) => (idx + 1) % Math.max(1, matches.length))}
                disabled={matches.length === 0}
                className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-40"
                title="Next match"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleReplaceNext}
                disabled={matches.length === 0}
                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-40"
              >
                Replace
              </button>

              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-40"
              >
                Replace All
              </button>
            </div>
          )}

          {/* Markdown Quick Formatting Toolbar */}
          {type === 'text' && !previewMode && (
            <div className="px-4 pt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MarkdownToolbar
                  onApplyFormat={handleApplyFormat}
                  onOpenWebCapture={() => setShowWebCaptureModal(true)}
                  onOpenPDFReader={() => {
                    handleSaveAndClose();
                    if (onOpenPDF) onOpenPDF('', 1);
                  }}
                />
                
                {/* Undo / Redo controls for safe section reordering and formatting */}
                <div className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-700 pl-1.5 ml-0.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 transition-colors"
                    title="Undo section reorder / format (Ctrl+Z)"
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
              </div>

              <div className="flex items-center gap-1">
                {flatSections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTOC(!showTOC)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      showTOC
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                    title="Document Outliner & Section Reordering (Ctrl+Shift+O)"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Outline</span>
                    <span className="px-1 py-0.2 text-[10px] rounded-full bg-stone-200 dark:bg-stone-700 font-mono">
                      {flatSections.length}
                    </span>
                  </button>
                )}

                {/* 3-Way Layout Switcher: Edit / Split / Preview */}
                <div className="flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5 border border-stone-200 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => setEditorViewMode('edit')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                      editorViewMode === 'edit'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                    title="Raw Markdown Editor"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorViewMode('split')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                      editorViewMode === 'split'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                    title="Split View (Editor & Live Preview side-by-side)"
                  >
                    <Columns2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Split</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorViewMode('preview')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                      editorViewMode === 'preview'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                    title="Full Rendered Preview"
                  >
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorViewMode('gallery')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                      editorViewMode === 'gallery'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                    title="Gallery View (All embedded note photos & lightbox collection)"
                  >
                    <Images className="w-3 h-3" />
                    <span className="hidden sm:inline">Gallery</span>
                    {allNoteImages.length > 0 && (
                      <span
                        className={`px-1 py-0.2 text-[10px] rounded-full font-mono ${
                          editorViewMode === 'gallery'
                            ? 'bg-amber-700 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {allNoteImages.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReadingMode(true)}
                    className="px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                    title="Reading Mode (Alt+R)"
                  >
                    <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="hidden sm:inline">Read</span>
                  </button>
                </div>

                {/* Font Size Quick Selector */}
                <div className="flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5 border border-stone-200 dark:border-stone-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetFontSize('xs')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      editorFontSize === 'xs'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                    }`}
                    title="Small font size"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetFontSize('sm')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      editorFontSize === 'sm'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                    }`}
                    title="Normal font size"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetFontSize('base')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      editorFontSize === 'base'
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                    }`}
                    title="Large font size"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Document Outliner Drawer */}
          {showTOC && flatSections.length > 0 && (
            <div className="mx-4 mt-2">
              <PKMEditorOutliner
                sections={flatSections}
                foldState={foldState}
                onToggleFold={handleToggleFold}
                onFoldAll={handleFoldAll}
                onUnfoldAll={handleUnfoldAll}
                onSelectSection={handleJumpToSection}
                onReorderSection={handleReorderSection}
                onClose={() => setShowTOC(false)}
                activeLineIndex={activeCursorLine}
              />
            </div>
          )}

          {/* Modal Main Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[55vh] overflow-y-auto">
            {/* Images preview gallery */}
            {onOpenFlashcards && noteFlashcards.length > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold">
                    {noteFlashcards.length} Active Recall Flashcard{noteFlashcards.length === 1 ? '' : 's'} detected in this note
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveAndClose();
                    onOpenFlashcards(note.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  Study Deck
                </button>
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-black/5"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-28 object-cover rounded-xl"
                    />
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

            {/* Audio Memos & Dictation Section */}
            <div ref={audioSectionRef}>
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
            </div>

            {/* Sticky Breadcrumb Navigation above Editor/Preview */}
            {type === 'text' && breadcrumbs.length > 0 && (
              <div className="sticky top-0 z-20 pb-1">
                <StickyBreadcrumb
                  breadcrumbs={breadcrumbs}
                  onSelectHeading={(sec) => handleJumpToSection(sec)}
                />
              </div>
            )}

            {/* Text Editor, Split View, or Checklist Editor */}
            {type === 'text' ? (
              editorViewMode === 'gallery' ? (
                /* Note Image Gallery View */
                <div className="min-h-[220px] p-1">
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
              ) : editorViewMode === 'preview' ? (
                /* Rich Markdown Preview Mode with live transclusions, folding & wiki links */
                <div className="min-h-[140px] text-sm text-stone-950 dark:text-stone-50 font-normal leading-relaxed">
                  <PKMPreviewRenderer
                    content={content}
                    sourceNoteId={note.id}
                    allNotes={allNotes}
                    folders={folders}
                    onContentChange={(newContent) => setContent(newContent)}
                    externalFoldState={foldState}
                    onToggleExternalFold={handleToggleFold}
                    onImageClick={(url) => {
                      const foundIdx = allNoteImages.findIndex((img) => img.url === url);
                      setLightboxIndex(foundIdx >= 0 ? foundIdx : 0);
                    }}
                    onOpenNote={(targetNoteId) => {
                      handleSaveAndClose();
                      onOpenLinkedNote(targetNoteId);
                    }}
                    onCreateNote={(targetTitle) => {
                      handleSaveAndClose();
                      if (onCreateNoteWithTitle) {
                        onCreateNoteWithTitle(targetTitle);
                      }
                    }}
                    onOpenPDF={(pdfId, page, highlightId) => {
                      handleSaveAndClose();
                      if (onOpenPDF) {
                        onOpenPDF(pdfId, page, highlightId);
                      }
                    }}
                  />
                </div>
              ) : editorViewMode === 'split' ? (
                /* Side-by-Side Split View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="relative border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 pb-4 md:pb-0 md:pr-4">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-1 flex items-center gap-1">
                      <Edit3 className="w-3 h-3 text-amber-500" /> Editor
                    </div>
                    <textarea
                      ref={textareaRef}
                      placeholder="Type markdown, '/' for commands, '[[' to link..."
                      value={content}
                      onChange={handleContentChange}
                      onPaste={handlePaste}
                      onSelect={(e) => updateCursorLine(e.currentTarget)}
                      onClick={(e) => updateCursorLine(e.currentTarget)}
                      onKeyUp={(e) => updateCursorLine(e.currentTarget)}
                      onKeyDown={handleModalEditorKeyDown}
                      rows={10}
                      className={`w-full bg-transparent ${
                        editorFontSize === 'xs' ? 'text-xs' : editorFontSize === 'base' ? 'text-base' : 'text-sm'
                      } text-stone-950 dark:text-stone-50 font-mono placeholder-stone-400 dark:placeholder-stone-500 resize-y focus:outline-hidden leading-relaxed`}
                    />

                    {/* Slash Command Popover Menu */}
                    {slashMenuState.isOpen && (
                      <div className="absolute left-2 z-50">
                        <SlashCommandMenu
                          query={slashMenuState.query}
                          position={slashMenuState.position}
                          onSelectCommand={handleSelectSlashCommand}
                          onClose={() => setSlashMenuState((prev) => ({ ...prev, isOpen: false }))}
                        />
                      </div>
                    )}

                    {/* Wiki-Link Autocomplete Popover */}
                    {showLinkSuggest && (
                      <div className="absolute left-4 top-12 w-72 max-h-56 overflow-y-auto bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl z-50 p-1.5 text-xs space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Link to Note:
                          </span>
                          {linkSuggestFilter && (
                            <span className="font-mono text-[9px] text-stone-400">"{linkSuggestFilter}"</span>
                          )}
                        </div>
                        {wikilinkCandidates.length > 0 ? (
                          wikilinkCandidates.map((cand, idx) => (
                            <button
                              key={cand.noteId || `new-${idx}`}
                              type="button"
                              onClick={() => insertWikiLink(cand.canonicalTitle || cand.title, cand.alias)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 text-stone-950 dark:text-stone-100 font-medium flex items-center justify-between group transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-semibold text-xs">
                                    {cand.displayTitle || cand.title}
                                  </span>
                                  {cand.isAlias && (
                                    <span className="px-1 py-0.2 text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded font-semibold shrink-0">
                                      alias
                                    </span>
                                  )}
                                  {cand.matchType === 'new_note' && (
                                    <span className="px-1 py-0.2 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold shrink-0">
                                      + create
                                    </span>
                                  )}
                                </div>
                                {cand.folderPath && (
                                  <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                                    {folders.find((f) => f.id === cand.folderPath)?.name || cand.folderPath}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {cand.score > 0.1 && cand.matchType !== 'new_note' && (
                                  <span className="text-[10px] text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 font-mono">
                                    {Math.round(cand.score * 100)}%
                                  </span>
                                )}
                                <ArrowUpRight className="w-3 h-3 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-stone-500 dark:text-stone-400 text-[11px]">
                            No matching notes
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Half: Live Synchronized Preview */}
                  <div className="pl-0 md:pl-2 min-h-[140px] text-sm text-stone-950 dark:text-stone-50 font-normal leading-relaxed overflow-y-auto max-h-[45vh]">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Live Preview
                    </div>
                    <PKMPreviewRenderer
                      content={content}
                      sourceNoteId={note.id}
                      allNotes={allNotes}
                      folders={folders}
                      onContentChange={(newContent) => setContent(newContent)}
                      externalFoldState={foldState}
                      onToggleExternalFold={handleToggleFold}
                      onOpenNote={(targetNoteId) => {
                        handleSaveAndClose();
                        onOpenLinkedNote(targetNoteId);
                      }}
                      onCreateNote={(targetTitle) => {
                        handleSaveAndClose();
                        if (onCreateNoteWithTitle) {
                          onCreateNoteWithTitle(targetTitle);
                        }
                      }}
                      onOpenPDF={(pdfId, page, highlightId) => {
                        handleSaveAndClose();
                        if (onOpenPDF) {
                          onOpenPDF(pdfId, page, highlightId);
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Standard Full-width Edit Mode */
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    placeholder="Note content... (Markdown supported, type '/' for commands, '[[' to link notes)"
                    value={content}
                    onChange={handleContentChange}
                    onPaste={handlePaste}
                    onSelect={(e) => updateCursorLine(e.currentTarget)}
                    onClick={(e) => updateCursorLine(e.currentTarget)}
                    onKeyUp={(e) => updateCursorLine(e.currentTarget)}
                    onKeyDown={handleModalEditorKeyDown}
                    rows={8}
                    className={`w-full bg-transparent ${
                      editorFontSize === 'xs' ? 'text-xs' : editorFontSize === 'base' ? 'text-base' : 'text-sm'
                    } text-stone-950 dark:text-stone-50 font-normal placeholder-stone-400 dark:placeholder-stone-500 resize-y focus:outline-hidden leading-relaxed font-mono sm:font-sans`}
                  />

                  {/* Slash Command Popover Menu */}
                  {slashMenuState.isOpen && (
                    <div className="absolute left-2 z-50">
                      <SlashCommandMenu
                        query={slashMenuState.query}
                        position={slashMenuState.position}
                        onSelectCommand={handleSelectSlashCommand}
                        onClose={() => setSlashMenuState((prev) => ({ ...prev, isOpen: false }))}
                      />
                    </div>
                  )}

                  {/* Wiki-Link Autocomplete Popover */}
                  {showLinkSuggest && (
                    <div className="absolute left-4 top-12 w-72 max-h-56 overflow-y-auto bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-2xl z-50 p-1.5 text-xs space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Link to Note:
                        </span>
                        {linkSuggestFilter && (
                          <span className="font-mono text-[9px] text-stone-400">"{linkSuggestFilter}"</span>
                        )}
                      </div>
                      {wikilinkCandidates.length > 0 ? (
                        wikilinkCandidates.map((cand, idx) => (
                          <button
                            key={cand.noteId || `new-${idx}`}
                            type="button"
                            onClick={() => insertWikiLink(cand.canonicalTitle || cand.title, cand.alias)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 text-stone-950 dark:text-stone-100 font-medium flex items-center justify-between group transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-semibold text-xs">
                                  {cand.displayTitle || cand.title}
                                </span>
                                {cand.isAlias && (
                                  <span className="px-1 py-0.2 text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded font-semibold shrink-0">
                                    alias
                                  </span>
                                )}
                                {cand.matchType === 'new_note' && (
                                  <span className="px-1 py-0.2 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold shrink-0">
                                    + create
                                  </span>
                                )}
                              </div>
                              {cand.folderPath && (
                                <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                                  {folders.find((f) => f.id === cand.folderPath)?.name || cand.folderPath}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {cand.score > 0.1 && cand.matchType !== 'new_note' && (
                                <span className="text-[10px] text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 font-mono">
                                  {Math.round(cand.score * 100)}%
                                </span>
                              )}
                              <ArrowUpRight className="w-3 h-3 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-stone-500 dark:text-stone-400 text-[11px]">
                          No matching notes
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Images Visual Preview Bar */}
                  {allNoteImages.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                          <span>Embedded Photos ({allNoteImages.length})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditorViewMode('gallery')}
                            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Images className="w-3 h-3" />
                            <span>Open Gallery View</span>
                          </button>
                          <span className="text-[10px] text-stone-400 hidden sm:inline">
                            · Click to open Lightbox
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                        {allNoteImages.map((img, idx) => (
                          <div
                            key={`preview-thumb-${idx}-${img.url.slice(-10)}`}
                            className="relative group shrink-0 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 shadow-xs cursor-pointer"
                            onClick={() => setLightboxIndex(idx)}
                            title={`Click to open in Lightbox: ${img.alt || img.url}`}
                          >
                            <img
                              src={img.url}
                              alt={img.alt}
                              className="w-20 h-16 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[10px] font-medium p-1 text-center">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                            {img.alt && (
                              <div className="max-w-[80px] truncate text-[9px] px-1 py-0.5 text-center bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400">
                                {img.alt}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* Checklist Editor */
              <div className="space-y-3">
                {/* Checklist Toolbar: Progress & Quick Actions */}
                {checklist.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-stone-700 dark:text-stone-300">
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                        <span>
                          {checklist.filter((i) => i.completed).length} of {checklist.length} completed
                        </span>
                        <span className="text-[11px] text-stone-400">
                          ({Math.round((checklist.filter((i) => i.completed).length / checklist.length) * 100)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={toggleAllChecklist}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                        >
                          {checklist.every((i) => i.completed) ? 'Uncheck All' : 'Check All'}
                        </button>
                        {checklist.some((i) => i.completed) && (
                          <button
                            type="button"
                            onClick={clearCompletedChecklist}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
                            title="Remove completed items"
                          >
                            Clear Completed
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(checklist.filter((i) => i.completed).length / checklist.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Checklist Items List */}
                <div className="space-y-1.5">
                  {checklist.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 text-sm text-stone-950 dark:text-stone-50 group hover:bg-stone-100/60 dark:hover:bg-stone-800/40 px-2 py-1 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                      />
                      <input
                        ref={(el) => {
                          itemInputRefs.current[item.id] = el;
                        }}
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          setChecklist(
                            checklist.map((i) =>
                              i.id === item.id ? { ...i, text: e.target.value } : i
                            )
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChecklistItem('', idx);
                          } else if (e.key === 'Backspace' && item.text === '' && checklist.length > 1) {
                            e.preventDefault();
                            const prevItem = checklist[idx - 1] || checklist[idx + 1];
                            removeChecklistItem(item.id, prevItem?.id);
                          }
                        }}
                        placeholder="List item..."
                        className={`flex-1 bg-transparent text-sm focus:outline-hidden ${
                          item.completed
                            ? 'line-through text-stone-400 dark:text-stone-500'
                            : 'text-stone-950 dark:text-stone-50 font-medium'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        className="text-stone-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 p-1 transition-opacity"
                        title="Delete item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Item Row */}
                <div className="flex items-center gap-2 pt-1">
                  <Plus className="w-4 h-4 text-stone-400 ml-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Add item (Press Enter)..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    className="w-full bg-transparent text-sm text-stone-950 dark:text-stone-50 font-medium placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden py-1"
                  />
                  {newChecklistText && (
                    <button
                      type="button"
                      onClick={() => addChecklistItem()}
                      className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shrink-0 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Real-time Floating Smart Suggestion Bar (powered by Automation Engine) */}
            <SmartSuggestionBar
              noteId={note.id}
              title={title}
              content={content}
              tags={tags}
              allNotes={allNotes}
              folders={folders}
              onAddTag={handleAddSuggestedTag}
              onInsertWikilink={handleInsertWikilinkSuggestion}
              onOpenNote={(targetId) => {
                handleSaveAndClose();
                onOpenLinkedNote(targetId);
              }}
              onExecuteRuleAction={handleExecuteRuleAction}
            />

            {/* Badges: Folder, Priority, Status, Tags, Reminder */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {priority && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-900 dark:text-red-200 text-xs font-bold uppercase tracking-wider border border-red-300 dark:border-red-800">
                  <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>{priority}</span>
                  <button
                    type="button"
                    onClick={() => setPriority(undefined)}
                    className="hover:text-rose-600 ml-0.5"
                    title="Remove priority"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {status && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 text-xs font-bold uppercase tracking-wider border border-purple-300 dark:border-purple-800">
                  <ListOrdered className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{status.replace('_', ' ')}</span>
                  <button
                    type="button"
                    onClick={() => setStatus(undefined)}
                    className="hover:text-rose-600 ml-0.5"
                    title="Remove status"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {folderId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-semibold border border-stone-300 dark:border-stone-700">
                  <FolderIcon
                    className="w-3.5 h-3.5"
                    style={{
                      color: folders.find((f) => f.id === folderId)?.color || '#f59e0b',
                    }}
                  />
                  <span>{folders.find((f) => f.id === folderId)?.name || 'Folder'}</span>
                  <button
                    type="button"
                    onClick={() => setFolderId(null)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {reminderDate && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-200 dark:bg-sky-950 text-sky-950 dark:text-sky-200 text-xs font-semibold border border-sky-300 dark:border-sky-800">
                  <Bell className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 stroke-[2.25]" />
                  <span>{new Date(reminderDate).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setReminderDate(null)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {tags.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-800"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-rose-600 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Tag Recommendations */}
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Suggested:
                  </span>
                  {tagSuggestions.map((s) => (
                    <div
                      key={s.tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 text-xs border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 transition-colors"
                      title={s.rationale}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!tags.includes(s.tag)) setTags([...tags, s.tag]);
                        }}
                        className="font-medium hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        + #{s.tag}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedSuggestedTags((prev) => [...prev, s.tag])}
                        className="text-stone-400 hover:text-rose-500"
                        title="Dismiss suggestion"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {sourceUrl && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 text-xs font-semibold border border-blue-300 dark:border-blue-800">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline truncate max-w-[180px]"
                    title={sourceUrl}
                  >
                    Source: {sourceUrl.replace(/^https?:\/\//i, '').split('/')[0]}
                  </a>
                  <button
                    type="button"
                    onClick={() => setSourceUrl(undefined)}
                    className="hover:text-rose-600 ml-0.5"
                    title="Remove source attribution"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Orphan Connection Advisor */}
            {isOrphanNote && orphanSuggestions.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Unconnected Note: Suggested Connections
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">
                    No incoming or outgoing links yet
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                  Connecting notes strengthens your knowledge graph and enables discovery.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {orphanSuggestions.map((s) => (
                    <div
                      key={s.targetNoteId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/60 shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyOrphanLink(s.targetTitle)}
                        className="font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1"
                        title={s.rationale}
                      >
                        <span>+ Link to [[{s.targetTitle}]]</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedOrphanTargets((prev) => [...prev, s.targetNoteId])}
                        className="text-stone-400 hover:text-rose-500 ml-1"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backlinks Navigator */}
            {backlinks.length > 0 && (
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 text-xs space-y-2">
                <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" />
                  Mentioned in {backlinks.length} other {backlinks.length === 1 ? 'note' : 'notes'}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {backlinks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        handleSaveAndClose();
                        onOpenLinkedNote(b.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-900 dark:text-stone-100 font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>{b.title}</span>
                      <ArrowUpRight className="w-3 h-3 text-stone-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unlinked Mentions Discovery */}
            {unlinkedMentions.length > 0 && (
              <UnlinkedMentionsSection
                candidates={unlinkedMentions}
                onLinkOccurrence={handleLinkOccurrence}
                onLinkAllInCandidate={handleLinkAllInCandidate}
                onLinkAllSafe={handleLinkAllSafe}
                onDismissTerm={handleDismissTerm}
                onOpenTargetNote={(targetId) => {
                  handleSaveAndClose();
                  onOpenLinkedNote(targetId);
                }}
              />
            )}

            {/* Inferred Related Notes Section */}
            {inferredRelations.length > 0 && (
              <RelatedNotesSection
                relatedRelations={inferredRelations}
                allNotes={allNotes}
                onInsertLink={handleInsertRelatedLink}
                onOpenTargetNote={(targetId) => {
                  handleSaveAndClose();
                  onOpenLinkedNote(targetId);
                }}
              />
            )}
          </div>

          {/* Bottom Live Stats Sub-bar */}
          <div className="px-5 py-1.5 bg-black/5 dark:bg-white/5 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <button
              type="button"
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              className="flex items-center gap-2 sm:gap-3 hover:text-stone-900 dark:hover:text-stone-200 transition-colors text-left"
              title="Click to view full document statistics breakdown"
            >
              <span>{stats.words} words</span>
              <span>•</span>
              <span>{stats.chars} characters</span>
              <span>•</span>
              <span>{stats.readTime} min read</span>
              <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-medium hover:underline">
                (View breakdown)
              </span>
            </button>
            <div>
              <span>Updated {new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Modal Bottom Actions Bar */}
          <div className="p-4 border-t border-stone-300/70 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-1 relative">
              {/* Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Change Color"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showColorPicker && (
                  <div className="absolute left-0 bottom-full mb-2 p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 grid grid-cols-5 gap-1.5 w-44">
                    {COLOR_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setColor(k);
                          setShowColorPicker(false);
                        }}
                        className={`w-6 h-6 rounded-full border border-stone-300 dark:border-stone-700 transition-transform ${
                          color === k ? 'scale-115 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: NOTE_COLORS[k].hex }}
                        title={NOTE_COLORS[k].name}
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
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Move to Folder"
                >
                  <FolderIcon className="w-4 h-4" />
                </button>
                {showFolderPicker && (
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFolderId(null);
                        setShowFolderPicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                    >
                      No Folder (Unorganized)
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFolderId(f.id);
                          setShowFolderPicker(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-950 dark:text-stone-100 font-semibold flex items-center gap-2"
                      >
                        <FolderIcon
                          className="w-3.5 h-3.5"
                          style={{ color: f.color || '#f59e0b' }}
                        />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                  className={`p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors ${
                    priority ? 'text-red-600 dark:text-red-400 font-bold' : ''
                  }`}
                  title="Set Note Priority"
                >
                  <Flame className="w-4 h-4" />
                </button>
                {showPriorityPicker && (
                  <div className="absolute left-0 bottom-full mb-2 w-44 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                    <span className="px-2 py-1 text-[10px] uppercase font-bold text-stone-400 block">
                      Priority
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPriority(undefined);
                        setShowPriorityPicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                      None (No Priority)
                    </button>
                    {(['urgent', 'high', 'medium', 'low'] as NotePriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPriority(p);
                          setShowPriorityPicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 font-bold uppercase text-[11px] flex items-center justify-between ${
                          priority === p ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200' : 'text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <span>{p}</span>
                        {priority === p && <span className="text-amber-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusPicker(!showStatusPicker)}
                  className={`p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors ${
                    status ? 'text-purple-600 dark:text-purple-400 font-bold' : ''
                  }`}
                  title="Set Workflow Status"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                {showStatusPicker && (
                  <div className="absolute left-0 bottom-full mb-2 w-44 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5">
                    <span className="px-2 py-1 text-[10px] uppercase font-bold text-stone-400 block">
                      Workflow Status
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus(undefined);
                        setShowStatusPicker(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                      None (Unassigned)
                    </button>
                    {(['backlog', 'todo', 'in_progress', 'review', 'done'] as NoteStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStatus(s);
                          setShowStatusPicker(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 font-medium capitalize text-xs flex items-center justify-between ${
                          status === s ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold' : 'text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <span>{s.replace('_', ' ')}</span>
                        {status === s && <span className="text-purple-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tag Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Add Tag / Label"
                >
                  <Tag className="w-4 h-4" />
                </button>
                {showTagPicker && (
                  <div className="absolute left-0 bottom-full mb-2 w-52 p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="tag name"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        className="w-full px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-medium focus:outline-hidden"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => {
                          const extracted = smartNoteService.extractTags(title, content, tags);
                          if (extracted.length > 0) {
                            setTags((prev) => Array.from(new Set([...prev, ...extracted])));
                          }
                        }}
                        className="w-full py-1 px-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center justify-center gap-1.5 font-medium transition-colors"
                        title="Extract semantic tags from note content"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Extract Tags</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reminder Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReminderPicker(!showReminderPicker)}
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Set Reminder Date & Time"
                >
                  <Bell className="w-4 h-4" />
                </button>
                {showReminderPicker && (
                  <div className="absolute left-0 bottom-full mb-2 p-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-2">
                    <input
                      type="datetime-local"
                      onChange={(e) => {
                        if (e.target.value) {
                          setReminderDate(new Date(e.target.value).toISOString());
                          setShowReminderPicker(false);
                        }
                      }}
                      className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 text-[11px] bg-stone-50 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Drawing sketcher */}
              <button
                type="button"
                onClick={() => {
                  onOpenDrawingModal((dataUrl) => {
                    setImages((prev) => [
                      ...prev,
                      {
                        id: `draw-${Date.now()}`,
                        name: 'Drawing.png',
                        dataUrl,
                      },
                    ]);
                  });
                }}
                className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                title="Sketch Drawing"
              >
                <Brush className="w-4 h-4" />
              </button>

              {/* Camera Photo capture directly into markdown */}
              <button
                type="button"
                id="btn-toolbar-camera"
                onClick={() => {
                  setImageInsertDefaultTab('camera');
                  setShowImageInsertModal(true);
                }}
                className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors text-amber-600 dark:text-amber-400"
                title="Snap Photo with Camera into Note"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Image URL, camera, or file upload */}
              <button
                type="button"
                id="btn-toolbar-image"
                onClick={() => {
                  setImageInsertDefaultTab('url');
                  setShowImageInsertModal(true);
                }}
                className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                title="Insert Image (URL, Camera, or File)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Audio Voice Memo */}
              <button
                type="button"
                onClick={() => {
                  audioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className={`p-2 rounded-xl transition-colors ${
                  audios && audios.length > 0
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
                    : 'hover:bg-stone-200/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
                title="Voice Memos & Audio Recorder"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Flashcards / Study Deck */}
              {onOpenFlashcards && (
                <button
                  type="button"
                  onClick={() => {
                    handleSaveAndClose();
                    onOpenFlashcards(note.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    noteFlashcards.length > 0
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80'
                      : 'hover:bg-stone-200/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                  title={
                    noteFlashcards.length > 0
                      ? `Study ${noteFlashcards.length} Flashcard(s) in this note`
                      : 'Open Flashcard Review & Spaced Repetition'
                  }
                >
                  <GraduationCap className="w-4 h-4" />
                </button>
              )}

              {/* Type switch (text vs checklist) */}
              <button
                type="button"
                onClick={() => setType(type === 'text' ? 'checklist' : 'text')}
                className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors text-xs font-bold"
                title="Toggle checklist mode"
              >
                {type === 'text' ? <CheckSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </button>

              {/* Archive / Unarchive toggle */}
              <button
                type="button"
                onClick={() => setIsArchived(!isArchived)}
                className={`p-2 rounded-xl transition-colors ${
                  isArchived
                    ? 'bg-amber-200/90 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-400/60'
                    : 'hover:bg-stone-200/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
                title={isArchived ? 'Unarchive note' : 'Archive note'}
              >
                {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </button>

              {/* Duplicate Note */}
              {onDuplicateNote && (
                <button
                  type="button"
                  onClick={() => onDuplicateNote(note)}
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Duplicate Note"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}

              {/* Export Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 rounded-xl hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors"
                  title="Export / Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-44 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        downloadSingleNote(
                          { ...note, title, content, checklist, tags, color, folderId },
                          folders
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-500" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadNoteAsHTML({ ...note, title, content, checklist, tags });
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Web Page (.html)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadNoteAsPlainText({ ...note, title, content, checklist });
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                      <span>Plain Text (.txt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        window.print();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-500" />
                      <span>Print / PDF</span>
                    </button>
                    {onSaveAsTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          onSaveAsTemplate({
                            ...note,
                            title,
                            content,
                            checklist,
                            tags,
                            color,
                          });
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium border-t border-stone-200 dark:border-stone-800 pt-1.5"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5 text-amber-500" />
                        <span>Save as Template</span>
                      </button>
                    )}
                    {onCompareNote && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          onCompareNote({
                            ...note,
                            title,
                            content,
                            checklist,
                            tags,
                            color,
                          });
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium border-t border-stone-200 dark:border-stone-800 pt-1.5"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Compare & Merge...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Delete note */}
              <button
                type="button"
                onClick={() => {
                  onDelete(note.id);
                  onClose();
                }}
                className="p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 transition-colors"
                title="Send to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Version History Modal */}
      {showHistoryModal && (
        <VersionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          note={{ ...note, title, content, checklist, revisions }}
          onRestoreRevision={(rev) => {
            setTitle(rev.title);
            setContent(rev.content);
            setChecklist(rev.checklist || []);
          }}
        />
      )}

      {/* Lock Passcode Modal */}
      {showLockModal && (
        <LockNoteModal
          isOpen={showLockModal}
          onClose={() => setShowLockModal(false)}
          note={{ ...note, isLocked, lockHash }}
          onUpdateLockState={(locked, hash) => {
            setIsLocked(locked);
            setLockHash(hash);
          }}
        />
      )}

      {/* Zen Mode Modal */}
      {showZenModal && (
        <ZenModeModal
          isOpen={showZenModal}
          onClose={() => setShowZenModal(false)}
          note={{ ...note, title, content }}
          onUpdateContent={(t, c) => {
            setTitle(t);
            setContent(c);
          }}
        />
      )}

      {/* Web Capture & HTML Ingestion Modal */}
      {showWebCaptureModal && (
        <WebCaptureModal
          isOpen={showWebCaptureModal}
          onClose={() => setShowWebCaptureModal(false)}
          allNotes={allNotes}
          folders={folders}
          onInsertMarkdown={(md, newImages, newSourceUrl) => {
            setUndoStack((u) => [...u, content]);
            setRedoStack([]);
            setContent((prev) => (prev.trim() ? `${prev}\n\n${md}` : md));
            if (newImages && newImages.length > 0) {
              setImages((prev) => [...prev, ...newImages]);
            }
            if (newSourceUrl && !sourceUrl) {
              setSourceUrl(newSourceUrl);
            }
          }}
        />
      )}

      {/* Smart Paste Feedback / Mode Switcher Toast */}
      {pasteData && (
        <PasteOptionsToast
          currentMode={pasteData.currentMode}
          sourceUrl={pasteData.sourceUrl}
          wordCount={pasteData.wordCount}
          hasTables={pasteData.hasTables}
          onSelectMode={handleSelectPasteMode}
          onUndo={handleUndoPaste}
          onClose={() => setPasteData(null)}
        />
      )}

      {/* CSV to Table Import Modal */}
      {showCsvImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-modal-title"
        >
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="csv-modal-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Import CSV as Markdown Table
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Convert spreadsheet data into an interactive Markdown table
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCsvImportModal(false);
                  setCsvImportError(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File Upload Zone */}
            <div>
              <input
                type="file"
                ref={csvImportFileInputRef}
                accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) {
                      setCsvImportText(text);
                      setCsvImportError(null);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvImportFileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 rounded-xl bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group"
              >
                <FileUp className="w-5 h-5 text-stone-400 group-hover:text-amber-500 transition-colors" />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  Choose a CSV / TSV file from your computer
                </span>
                <span className="text-[10px] text-stone-400">Supports .csv, .tsv, comma and tab delimiters</span>
              </button>
            </div>

            {/* Paste Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Or Paste Spreadsheet / CSV Text:
              </label>
              <textarea
                value={csvImportText}
                onChange={(e) => {
                  setCsvImportText(e.target.value);
                  setCsvImportError(null);
                }}
                placeholder={`Item,Price,Quantity,Category\nWidget,19.99,5,Tools\nGadget,49.50,2,Electronics`}
                rows={5}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {csvImportError && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <span>{csvImportError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setShowCsvImportModal(false);
                  setCsvImportError(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!csvImportText.trim()}
                onClick={handleInsertCsvTable}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none shadow-xs transition-colors"
              >
                Insert as Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image & Camera Photo Insert Studio Modal */}
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

      {/* Fallback Single Image Preview Overlay */}
      {enlargedPreviewImage && lightboxIndex === null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged Image Preview"
          className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEnlargedPreviewImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200 truncate">
                {enlargedPreviewImage.alt || 'Embedded Image Preview'}
              </span>
              <button
                type="button"
                onClick={() => setEnlargedPreviewImage(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={enlargedPreviewImage.url}
                alt={enlargedPreviewImage.alt}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
            {enlargedPreviewImage.alt && (
              <div className="p-2.5 text-center text-xs text-stone-400 bg-stone-950/80 border-t border-stone-800">
                {enlargedPreviewImage.alt}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
