import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Note,
  Folder,
  SavedSearch,
  AppSettings,
  FilterState,
  ViewMode,
  NoteColorKey,
  NoteTemplate,
  CustomTheme,
} from './types';
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  FileText,
  Inbox,
  Clock,
  Trash2,
  ArrowUp,
  X,
  Check,
  Undo2,
  Sparkles,
} from 'lucide-react';
import { storageService } from './services/storage';
import { filterNotes } from './utils/search';
import { isNoteUnlockedInSession } from './utils/crypto';
import { isDarkTheme, isHexDark, getAllThemes } from './utils/themes';
import { extractHashtags } from './utils/linking';
import { vaultManager } from './pkm';
import { crdtVaultStore, crdtSyncCoordinator } from './pkm/sync/crdt';
import { downloadMarkdownZip } from './services/exporter';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QuickFilterBar } from './components/QuickFilterBar';
import { BulkActionBar } from './components/BulkActionBar';
import { TimelineScrubber } from './components/TimelineScrubber';
import { QuickNoteInput } from './components/QuickNoteInput';
import { KeepTodayOverview } from './components/home/KeepTodayOverview';
import { A11yLiveRegion } from './components/A11yLiveRegion';
import { MobileBottomBar } from './components/MobileBottomBar';
import { a11yAnnouncer } from './utils/a11y';

// Views
import { MasonryView } from './components/views/MasonryView';
import { ListView } from './components/views/ListView';
import { StackedView } from './components/views/StackedView';
import { CalendarView } from './components/views/CalendarView';
import { GraphView } from './components/views/GraphView';
import { KanbanView } from './components/views/KanbanView';

// Modals (True Dialogs)
import { DrawingModal } from './components/modals/DrawingModal';
import { TakeoutImportModal } from './components/modals/TakeoutImportModal';
import { SyncModal } from './components/modals/SyncModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ThemeCreatorModal } from './components/modals/ThemeCreatorModal';
import { ManageFoldersModal } from './components/modals/ManageFoldersModal';
import { TagManagerModal } from './components/modals/TagManagerModal';
import {
  renameTagAcrossNotes,
  deleteTagAcrossNotes,
  batchMergeTagsAcrossNotes,
  batchDeleteTagsAcrossNotes,
} from './utils/tagManager';
import { SaveSearchModal } from './components/modals/SaveSearchModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { IdeaSparkModal } from './components/modals/IdeaSparkModal';
import { WritingSprintModal } from './components/modals/WritingSprintModal';
import { ThoughtMatrixModal } from './components/modals/ThoughtMatrixModal';
import { CornellNotesModal } from './components/modals/CornellNotesModal';
import { PomodoroFlowModal } from './components/modals/PomodoroFlowModal';
import { ZettelkastenModal } from './components/modals/ZettelkastenModal';
import { ChronoCapsuleModal } from './components/modals/ChronoCapsuleModal';
import { SynthesisMatrixModal } from './components/modals/SynthesisMatrixModal';
import { VoiceMemoStudioModal } from './components/modals/VoiceMemoStudioModal';
import { MindMapStudioModal } from './components/modals/MindMapStudioModal';
import { MacroAutomationModal } from './components/modals/MacroAutomationModal';
import { SerendipityModal } from './components/modals/SerendipityModal';
import { VaultStatsModal } from './components/modals/VaultStatsModal';
import { FlashcardReviewModal } from './components/modals/FlashcardReviewModal';
import { PresentationStudioModal } from './components/modals/PresentationStudioModal';
import { ReactiveSandboxModal } from './components/modals/ReactiveSandboxModal';
import { TemplateModal } from './components/modals/TemplateModal';
import {
  QuickSwitcherModal,
  tabShortcutsManager,
  navigationHistory,
  typewriterManager,
} from './pkm/qol';
import { VaultTasksModal, TaskPerspective } from './components/modals/VaultTasksModal';
import { NoteCompareModal } from './components/modals/NoteCompareModal';
import { ZenModeModal } from './components/modals/ZenModeModal';
import { renderTemplateContent } from './pkm/templates/templateUtils';
import { LockNoteModal } from './components/modals/LockNoteModal';
import { VaultLockModal } from './components/modals/VaultLockModal';
import { VaultEncryptionModal } from './components/modals/VaultEncryptionModal';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';
import { DeviceSyncModal } from './pkm/p2p/DeviceSyncModal';
import { ExtensionSettingsModal } from './components/modals/ExtensionSettingsModal';
import { ZenFocusBar } from './components/ZenFocusBar';
import {
  VaultDoctorModal,
  vaultEncryptionService,
  WorkspaceProvider,
  WorkspaceContainer,
  useWorkspace,
  pdfStorageService,
  generateLiteratureNoteContent,
  CommandPaletteModal,
  CommandExecutionContext,
  dailyNotesService,
  DailyNotesSettings,
  QuickCaptureModal,
  QuickCapturePayload,
  registerServiceWorker,
  parseInitialPWARequest,
  AudioRecorderModal,
  SecurityAuditModal,
  captureBridgeService,
  AddByIdentifierModal,
  BibTeXImportModal,
  DuplicateReviewModal,
  automationEngine,
  AutomationSuggestionToast,
  AutomationSuggestion,
  temporalService,
  regenerateCardIdsInMarkdown,
  reviewService,
  PublicationManagerModal,
  SingleNoteExportModal,
  MigrationHubModal,
  PluginManagerModal,
  PluginWorkspaceView,
  pluginRegistry,
  AICopilotWorkspace,
  AIWritingAssistantModal,
  AISettingsPanel,
  CollectionsIndexModal,
  FilesystemBridgeSettingsModal,
  FilesystemConflictModal,
  FilesystemReconciliationReviewModal,
  filesystemBridgeService,
  ReconciliationPlan,
  FilesystemConflict,
  DesktopDiagnosticsModal,
  DesktopQuickCaptureWindow,
  desktopCapabilityService,
  desktopProtocolService,
  desktopFilesystemWatcher,
  desktopBackgroundService,
  MobileDiagnosticsModal,
  MobileShareInboxModal,
  MobilePrivacyCover,
  mobileCapabilityService,
  mobileShareService,
  mobileWidgetService,
  mobileLifecycleService,
  mobileNotificationService,
  mobileBiometricService,
  peopleService,
  LogInteractionModal,
  VCardImportModal,
  VCardExportModal,
  NativeContactPickerModal,
  MergePeopleModal,
  ExportCenterModal,
  ShareSheetModal,
  DeveloperObservatoryModal,
  V2MigrationModal,
  V2ModuleLauncher,
  cacheRegistry,
  gamificationEngine,
  XpNotificationToast,
  VaultHealthDoctorModal,
  VaultArchiveModal,
} from './pkm';
import {
  PersonalizationSettingsModal,
  WorkflowRunnerModal,
  WorkflowPreset,
} from './pkm/personalization';
import { ConflictCenterModalV2 } from './pkm/v2/ui/ConflictCenterModalV2';
import { DeviceManagerModalV2 } from './pkm/v2/ui/DeviceManagerModalV2';
import { SyncDiagnosticsModalV2 } from './pkm/v2/ui/SyncDiagnosticsModalV2';
import { DisasterRecoveryModalV2 } from './pkm/v2/ui/DisasterRecoveryModalV2';
import { SecurityDiagnosticsModalV2 } from './pkm/v2/ui/SecurityDiagnosticsModalV2';
import { ReleaseCandidateDiagnosticsModalV2 } from './pkm/v2/ui/ReleaseCandidateDiagnosticsModalV2';
import { V2StableReleaseHubModal } from './pkm/v2/ui/V2StableReleaseHubModal';
import { V2MaintenanceDiagnosticsModal } from './pkm/v2/ui/V2MaintenanceDiagnosticsModal';
import { V2PlatformEcosystemModal } from './pkm/v2/ui/V2PlatformEcosystemModal';
import { V2DomainExcellenceModal } from './pkm/v2/ui/V2DomainExcellenceModal';
import { V2QualityCeilingModal } from './pkm/v2/ui/V2QualityCeilingModal';
import { V2PowerUserEfficiencyModal } from './pkm/v2/ui/V2PowerUserEfficiencyModal';
import { V2InteroperabilityHubModal } from './pkm/v2/ui/V2InteroperabilityHubModal';
import { V2UnifiedInteroperabilityCenterModal } from './pkm/v2/ui/V2UnifiedInteroperabilityCenterModal';
import { V2CoreExperienceCenterModal } from './pkm/v2/ui/V2CoreExperienceCenterModal';
import { V2PersonalOSCenterModal } from './pkm/v2/ui/V2PersonalOSCenterModal';
import { V2BlockerEliminationModal } from './pkm/v2/ui/V2BlockerEliminationModal';
import { V2ReliabilitySecurityModal } from './pkm/v2/ui/V2ReliabilitySecurityModal';
import { V2PerformanceAccessibilityModal } from './pkm/v2/ui/V2PerformanceAccessibilityModal';
import { V2ReleaseCandidate1Modal } from './pkm/v2/ui/V2ReleaseCandidate1Modal';
import { V2StableShipModal } from './pkm/v2/ui/V2StableShipModal';
import { GlobalSearchModal, semanticSearchService } from './pkm/search';
import { soundscapeService } from './utils/soundscapes';
import { fireConfetti } from './utils/confetti';

const DEFAULT_FILTER: FilterState = {
  searchQuery: '',
  selectedFolderId: null,
  selectedTag: null,
  selectedColor: null,
  selectedType: 'all',
  scope: 'active',
  viewMode: 'masonry',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

// Inner Application Component wrapped by WorkspaceProvider
function PKMAppContent({
  notes,
  folders,
  savedSearches,
  settings,
  filter,
  sidebarOpen,
  isVaultEncrypted,
  isVaultLocked,
  canvasBgClass,
  fontFamilyClass,
  filteredNotes,
  tagsList,
  matchingArchivedCount,
  matchingActiveCount,
  setFilter,
  setSidebarOpen,
  setNotes,
  setFolders,
  setSavedSearches,
  setSettings,
  handleUpdateSettings,
  handleCreateNote,
  handleUpdateNote,
  handleDeleteNote,
  handleRestoreNote,
  handleDeleteForever,
  handleDuplicateNote,
  handleImportNotes,
  handleClearAllNotes,
  handleCreateFolder,
  handleUpdateFolder,
  handleDeleteFolder,
  handleSaveSearch,
  handleDeleteSavedSearch,
  handleEmptyTrash,
  handleLockVault,
  handleVaultUnlocked,
  reloadData,
  handleReorderNotes,
}: {
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  filter: FilterState;
  sidebarOpen: boolean;
  isVaultEncrypted: boolean;
  isVaultLocked: boolean;
  canvasBgClass: string;
  fontFamilyClass: string;
  filteredNotes: Note[];
  tagsList: { name: string; count: number }[];
  matchingArchivedCount: number;
  matchingActiveCount: number;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setSavedSearches: React.Dispatch<React.SetStateAction<SavedSearch[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  handleUpdateSettings: (newSettings: Partial<AppSettings> & { viewMode?: ViewMode }) => void;
  handleCreateNote: (newNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  handleUpdateNote: (updatedNote: Note) => Promise<void>;
  handleDeleteNote: (noteId: string) => Promise<void>;
  handleRestoreNote: (noteId: string) => Promise<void>;
  handleDeleteForever: (noteId: string) => Promise<void>;
  handleDuplicateNote: (note: Note) => Promise<void>;
  handleImportNotes: (importedNotes: Note[]) => Promise<void>;
  handleClearAllNotes: () => Promise<void>;
  handleCreateFolder: (name: string, color?: string) => Promise<void>;
  handleUpdateFolder: (folder: Folder) => Promise<void>;
  handleDeleteFolder: (folderId: string) => Promise<void>;
  handleSaveSearch: (savedSearch: SavedSearch) => Promise<void>;
  handleDeleteSavedSearch: (id: string) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;
  handleLockVault: () => void;
  handleVaultUnlocked: () => Promise<void>;
  reloadData: () => Promise<void>;
  handleReorderNotes: (reorderedNotes: Note[]) => Promise<void>;
}) {
  const workspace = useWorkspace();
  const {
    openResource,
    openNote,
    openPDF,
    openCanvas,
    openGraph,
    openKanban,
    openSmartViews,
    openHome,
    openSearch,
    openMedia,
    openReferences,
    openAutomations,
    openCalendar,
    openAgenda,
    openTimeline,
    openReview,
    openCopilot,
    openCollection,
    openDashboard,
    openPeople,
    openPlanningHome,
    openGoalsProjects,
    openRoutines,
    openLearning,
    openCourse,
    openSkill,
    openExamPrep,
    openLibrary,
    openFinance,
    openHealth,
    openTravel,
    openAssets,
    openDecisions,
    openUniversalInbox,
    splitWorkspace,
    closeActiveTab,
    reopenClosedTab,
    closeSplit,
    swapPanes,
    navigateBack,
    navigateForward,
    applyPreset,
  } = workspace;

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureInitialPayload, setQuickCaptureInitialPayload] = useState<
    Partial<QuickCapturePayload> | undefined
  >(undefined);
  const [automationSuggestions, setAutomationSuggestions] = useState<AutomationSuggestion[]>([]);

  // Bulk selection & QoL states
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [focusedNoteIndex, setFocusedNoteIndex] = useState<number>(-1);
  const [undoTrash, setUndoTrash] = useState<{ noteId: string; title: string } | null>(null);
  const undoTrashTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const homeScrollRef = useRef<HTMLDivElement>(null);

  // Clear selection & reset focus when view or filter scope changes
  useEffect(() => {
    setSelectedNoteIds([]);
    setFocusedNoteIndex(-1);
  }, [filter.scope, filter.selectedFolderId, filter.selectedTag, filter.viewMode]);

  // Deep Link handler: Opens target note directly when URL has ?note=ID or #note-ID
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || notes.length === 0) return;

    const parseAndOpenDeepLink = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const queryNoteId = params.get('note');
        const hash = window.location.hash || '';
        const hashNoteId = hash.startsWith('#note-')
          ? hash.replace('#note-', '')
          : hash.startsWith('#') && hash.length > 1 && !hash.includes('/')
          ? hash.substring(1)
          : null;
        const targetNoteId = queryNoteId || hashNoteId;

        if (targetNoteId && handledDeepLinkRef.current !== targetNoteId) {
          const targetNote = notes.find((n) => n.id === targetNoteId);
          if (targetNote) {
            handledDeepLinkRef.current = targetNoteId;
            openNote(targetNote.id, targetNote.title);
            a11yAnnouncer.announce(`Opened linked note ${targetNote.title || 'Untitled'}`);
          }
        }
      } catch (err) {
        console.error('Failed to parse deep link:', err);
      }
    };

    parseAndOpenDeepLink();
    window.addEventListener('hashchange', parseAndOpenDeepLink);
    return () => window.removeEventListener('hashchange', parseAndOpenDeepLink);
  }, [notes, openNote]);

  const focusedNote =
    focusedNoteIndex >= 0 && focusedNoteIndex < filteredNotes.length
      ? filteredNotes[focusedNoteIndex]
      : null;

  // Bulk Selection Handlers
  const handleSelectAll = useCallback(() => {
    setSelectedNoteIds(filteredNotes.map((n) => n.id));
  }, [filteredNotes]);

  const handleClearSelection = useCallback(() => {
    setSelectedNoteIds([]);
    lastSelectedNoteIdRef.current = null;
  }, []);

  const lastSelectedNoteIdRef = useRef<string | null>(null);

  const handleToggleSelectNote = useCallback(
    (noteId: string, shiftKey?: boolean) => {
      setSelectedNoteIds((prev) => {
        const isCurrentlySelected = prev.includes(noteId);

        if (shiftKey && lastSelectedNoteIdRef.current && lastSelectedNoteIdRef.current !== noteId) {
          const lastIdx = filteredNotes.findIndex((n) => n.id === lastSelectedNoteIdRef.current);
          const currIdx = filteredNotes.findIndex((n) => n.id === noteId);

          if (lastIdx !== -1 && currIdx !== -1) {
            const start = Math.min(lastIdx, currIdx);
            const end = Math.max(lastIdx, currIdx);
            const rangeIds = filteredNotes.slice(start, end + 1).map((n) => n.id);
            lastSelectedNoteIdRef.current = noteId;
            const union = new Set([...prev, ...rangeIds]);
            return Array.from(union);
          }
        }

        lastSelectedNoteIdRef.current = noteId;
        return isCurrentlySelected ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      });
    },
    [filteredNotes]
  );

  const handleBulkChangeColor = useCallback(
    async (color: NoteColorKey) => {
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, color, updatedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Changed color of ${selectedNoteIds.length} notes`);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkMoveFolder = useCallback(
    async (folderId: string | null) => {
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, folderId, updatedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Moved ${selectedNoteIds.length} notes to folder`);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkAddTag = useCallback(
    async (tag: string) => {
      const cleanTag = tag.trim().replace(/^#/, '');
      if (!cleanTag) return;
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) => {
        if (!selectedNoteIds.includes(n.id)) return n;
        const tags = n.tags.includes(cleanTag) ? n.tags : [...n.tags, cleanTag];
        return { ...n, tags, updatedAt: now };
      });
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Added tag #${cleanTag} to ${selectedNoteIds.length} notes`);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkPin = useCallback(
    async (pinned: boolean) => {
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, pinned, updatedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`${pinned ? 'Pinned' : 'Unpinned'} ${selectedNoteIds.length} notes`);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkFavorite = useCallback(
    async (isFavorite: boolean) => {
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, isFavorite, updatedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`${isFavorite ? 'Favorited' : 'Unfavorited'} ${selectedNoteIds.length} notes`);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkArchive = useCallback(
    async (archived: boolean) => {
      const count = selectedNoteIds.length;
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, archived, updatedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`${archived ? 'Archived' : 'Unarchived'} ${count} notes`);
      setSelectedNoteIds([]);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkDelete = useCallback(
    async () => {
      const count = selectedNoteIds.length;
      const now = new Date().toISOString();
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, trashed: true, trashedAt: now } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Moved ${count} notes to trash`);
      setSelectedNoteIds([]);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkRestore = useCallback(
    async () => {
      const count = selectedNoteIds.length;
      const updatedNotes = notes.map((n) =>
        selectedNoteIds.includes(n.id) ? { ...n, trashed: false, trashedAt: undefined } : n
      );
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        const note = updatedNotes.find((n) => n.id === id);
        if (note) await storageService.saveNote(note);
      }
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Restored ${count} notes from trash`);
      setSelectedNoteIds([]);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkDeleteForever = useCallback(
    async () => {
      if (!window.confirm(`Permanently delete ${selectedNoteIds.length} notes? This cannot be undone.`)) {
        return;
      }
      const count = selectedNoteIds.length;
      const updatedNotes = notes.filter((n) => !selectedNoteIds.includes(n.id));
      setNotes(updatedNotes);
      for (const id of selectedNoteIds) {
        await storageService.deleteNotePermanently(id);
      }
      vaultManager.rebuildIndex(updatedNotes);
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Permanently deleted ${count} notes`);
      setSelectedNoteIds([]);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkDuplicate = useCallback(
    async () => {
      const targetNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
      const newCopies: Note[] = [];
      const now = new Date().toISOString();
      for (const orig of targetNotes) {
        const duplicate: Note = {
          ...orig,
          id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: orig.title ? `${orig.title} (Copy)` : 'Copy of Note',
          createdAt: now,
          updatedAt: now,
        };
        newCopies.push(duplicate);
        await storageService.saveNote(duplicate);
      }
      setNotes((prev) => [...newCopies, ...prev]);
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Duplicated ${targetNotes.length} notes`);
      setSelectedNoteIds([]);
    },
    [notes, selectedNoteIds, setNotes]
  );

  const handleBulkMerge = useCallback(
    async () => {
      const targetNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
      if (targetNotes.length < 2) return;
      const mergedTitle = targetNotes.map((n) => n.title).filter(Boolean).join(' & ') || 'Merged Notes';
      const mergedContent = targetNotes
        .map((n) => `## ${n.title || 'Untitled Note'}\n\n${n.content || ''}`)
        .join('\n\n---\n\n');
      const allTagsSet = new Set<string>();
      targetNotes.forEach((n) => n.tags.forEach((t) => allTagsSet.add(t)));
      const now = new Date().toISOString();
      const mergedNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: mergedTitle,
        content: mergedContent,
        type: 'text',
        checklist: [],
        tags: Array.from(allTagsSet),
        color: targetNotes[0]?.color || 'default',
        pinned: targetNotes.some((n) => n.pinned),
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        folderId: targetNotes[0]?.folderId || null,
        createdAt: now,
        updatedAt: now,
      };
      await storageService.saveNote(mergedNote);
      setNotes((prev) => [mergedNote, ...prev]);
      filesystemBridgeService.triggerDebouncedSync();
      a11yAnnouncer.announce(`Merged ${targetNotes.length} notes into a single note`);
      setSelectedNoteIds([]);
      openNote(mergedNote.id, mergedNote.title);
    },
    [notes, selectedNoteIds, setNotes, openNote]
  );

  const handleBulkExportZip = useCallback(
    async () => {
      const targetNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
      if (targetNotes.length === 0) return;
      await downloadMarkdownZip(targetNotes, folders);
      a11yAnnouncer.announce(`Exported ${targetNotes.length} notes as zip archive`);
    },
    [notes, folders, selectedNoteIds]
  );

  // Intercepted Delete with Undo Toast
  const handleDeleteNoteWithUndo = useCallback(
    async (noteId: string) => {
      const target = notes.find((n) => n.id === noteId);
      await handleDeleteNote(noteId);
      if (target) {
        if (undoTrashTimerRef.current) clearTimeout(undoTrashTimerRef.current);
        setUndoTrash({ noteId, title: target.title || 'Untitled note' });
        undoTrashTimerRef.current = setTimeout(() => {
          setUndoTrash(null);
        }, 6000);
      }
    },
    [notes, handleDeleteNote]
  );

  const handleUndoTrash = useCallback(async () => {
    if (undoTrash) {
      await handleRestoreNote(undoTrash.noteId);
      setUndoTrash(null);
      if (undoTrashTimerRef.current) clearTimeout(undoTrashTimerRef.current);
    }
  }, [undoTrash, handleRestoreNote]);

  const handleScrollToTop = () => {
    if (homeScrollRef.current) {
      homeScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Dialog modals state
  const [activeModal, setActiveModal] = useState<
    | null
    | 'drawing'
    | 'import'
    | 'sync'
    | 'settings'
    | 'manage_folders'
    | 'manage_tags'
    | 'save_search'
    | 'shortcuts'
    | 'templates'
    | 'vault_tasks'
    | 'note_compare'
    | 'unlock_note'
    | 'vault_doctor'
    | 'vault_encryption'
    | 'recovery_center'
    | 'audio_recorder'
    | 'security_audit'
    | 'device_sync'
    | 'extension_settings'
    | 'theme_creator'
    | 'reference_library'
    | 'reference_add_identifier'
    | 'reference_import_bibtex'
    | 'reference_duplicates'
    | 'publication_manager'
    | 'single_note_export'
    | 'migration_hub'
    | 'plugin_manager'
    | 'ai_copilot'
    | 'ai_writing_assistant'
    | 'ai_settings'
    | 'collections_index'
    | 'filesystem_bridge'
    | 'filesystem_review'
    | 'filesystem_conflicts'
    | 'desktop_diagnostics'
    | 'desktop_quick_capture'
    | 'mobile_diagnostics'
    | 'mobile_share_inbox'
    | 'people_log_interaction'
    | 'people_import_vcard'
    | 'people_export_vcard'
    | 'people_native_picker'
    | 'people_duplicates'
    | 'personalization'
    | 'export_center'
    | 'share_sheet'
    | 'v2_migration'
    | 'v2_module_launcher'
    | 'v2_sync_conflicts'
    | 'v2_device_manager'
    | 'v2_sync_diagnostics'
    | 'v2_disaster_recovery'
    | 'v2_security_diagnostics'
    | 'v2_rc_diagnostics'
    | 'v2_stable_release_hub'
    | 'v2_maintenance_diagnostics'
    | 'v2_platform_ecosystem'
    | 'v2_domain_excellence'
    | 'v2_quality_ceiling'
    | 'v2_power_user_efficiency'
    | 'v2_interoperability'
    | 'v2_core_experience'
    | 'idea_spark'
    | 'writing_sprint'
    | 'thought_matrix'
    | 'serendipity'
    | 'vault_stats'
    | 'flashcard_review'
    | 'presentation_studio'
    | 'reactive_sandbox'
  >(null);

  const [flashcardReviewNoteId, setFlashcardReviewNoteId] = useState<string | undefined>(undefined);

  const [templateTargetNote, setTemplateTargetNote] = useState<Note | null>(null);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isHealthDoctorOpen, setIsHealthDoctorOpen] = useState(false);
  const [isVaultArchiveOpen, setIsVaultArchiveOpen] = useState(false);
  const [xpNotification, setXpNotification] = useState<{
    amount: number;
    reason?: string;
    level: number;
    leveledUp?: boolean;
  } | null>(null);

  useEffect(() => {
    let xpTimer: NodeJS.Timeout;
    const handleQuickSwitcherEvent = () => setIsQuickSwitcherOpen(true);
    const handleHistoryBack = () => {
      const prev = navigationHistory.goBack();
      if (prev) openNote(prev.noteId, prev.noteTitle);
    };
    const handleHistoryForward = () => {
      const next = navigationHistory.goForward();
      if (next) openNote(next.noteId, next.noteTitle);
    };
    const handleToggleTypewriterEvent = () => {
      typewriterManager.toggleTypewriter();
    };
    const handleHealthDoctorEvent = () => setIsHealthDoctorOpen(true);
    const handleVaultArchiveEvent = () => setIsVaultArchiveOpen(true);
    const handleXpGainedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.amount) {
        setXpNotification(detail);
        clearTimeout(xpTimer);
        xpTimer = setTimeout(() => setXpNotification(null), 3500);
      }
    };

    window.addEventListener('pkm_open_quick_switcher', handleQuickSwitcherEvent);
    window.addEventListener('pkm_navigate_history_back', handleHistoryBack);
    window.addEventListener('pkm_navigate_history_forward', handleHistoryForward);
    window.addEventListener('pkm_toggle_typewriter', handleToggleTypewriterEvent);
    window.addEventListener('pkm_open_health_doctor', handleHealthDoctorEvent);
    window.addEventListener('pkm_open_vault_archive', handleVaultArchiveEvent);
    window.addEventListener('pkm_xp_gained', handleXpGainedEvent);

    return () => {
      window.removeEventListener('pkm_open_quick_switcher', handleQuickSwitcherEvent);
      window.removeEventListener('pkm_navigate_history_back', handleHistoryBack);
      window.removeEventListener('pkm_navigate_history_forward', handleHistoryForward);
      window.removeEventListener('pkm_toggle_typewriter', handleToggleTypewriterEvent);
      window.removeEventListener('pkm_open_health_doctor', handleHealthDoctorEvent);
      window.removeEventListener('pkm_open_vault_archive', handleVaultArchiveEvent);
      window.removeEventListener('pkm_xp_gained', handleXpGainedEvent);
      clearTimeout(xpTimer);
    };
  }, [openNote]);

  const handleOpenTemplates = useCallback((targetNote?: Note | null) => {
    setTemplateTargetNote(targetNote || null);
    setActiveModal('templates');
  }, []);

  const [vaultTasksPerspective, setVaultTasksPerspective] = useState<TaskPerspective>('all');

  const handleOpenVaultTasks = useCallback((perspective: TaskPerspective = 'all') => {
    setVaultTasksPerspective(perspective);
    setActiveModal('vault_tasks');
  }, []);

  const [compareNoteAId, setCompareNoteAId] = useState<string | null>(null);
  const [compareNoteBId, setCompareNoteBId] = useState<string | null>(null);

  const handleOpenNoteCompare = useCallback((noteAId?: string | null, noteBId?: string | null) => {
    const activeResourceId =
      workspace.activeTab && workspace.activeTab.type === 'note'
        ? workspace.activeTab.resourceId
        : null;
    setCompareNoteAId(noteAId || activeResourceId || null);
    setCompareNoteBId(noteBId || null);
    setActiveModal('note_compare');
  }, [workspace.activeTab]);

  const handleOpenFlashcards = (noteId?: string) => {
    setFlashcardReviewNoteId(noteId);
    setActiveModal('flashcard_review');
  };

  const [activeWorkflowPreset, setActiveWorkflowPreset] = useState<WorkflowPreset | null>(null);
  const [editingCustomTheme, setEditingCustomTheme] = useState<CustomTheme | null>(null);

  const handleOpenThemeCreator = (theme?: CustomTheme | null) => {
    setEditingCustomTheme(theme || null);
    setActiveModal('theme_creator');
  };

  const handleSaveCustomTheme = (theme: CustomTheme, andApply: boolean = true) => {
    const existing = settings.customThemes || [];
    const index = existing.findIndex((t) => t.id === theme.id);
    let updatedThemes: CustomTheme[];
    if (index >= 0) {
      updatedThemes = existing.map((t, i) => (i === index ? theme : t));
    } else {
      updatedThemes = [...existing, theme];
    }
    const newSettings: AppSettings = {
      ...settings,
      customThemes: updatedThemes,
      ...(andApply ? { theme: theme.id } : {}),
    };
    handleUpdateSettings(newSettings);
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    const existing = settings.customThemes || [];
    const updatedThemes = existing.filter((t) => t.id !== themeId);
    const isCurrent = settings.theme === themeId;
    const nextTheme = isCurrent ? 'light' : settings.theme;
    const newSettings: AppSettings = {
      ...settings,
      customThemes: updatedThemes,
      theme: nextTheme,
    };
    handleUpdateSettings(newSettings);
  };

  const handleCycleFavoriteTheme = useCallback(
    (direction: 1 | -1 = 1) => {
      let favoriteIds = [
        'light',
        'dark',
        'cyberpunk',
        'nordic',
        'forest',
        'sunset',
        'sakura',
        'dracula',
        'sepia',
        'monokai',
      ];
      try {
        const stored = localStorage.getItem('open_notes_favorite_themes');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            favoriteIds = parsed;
          }
        }
      } catch {
        // fallback
      }

      const allThemes = getAllThemes(settings.customThemes);
      const availableFavs = allThemes.filter((t) => favoriteIds.includes(t.id));
      const pool = availableFavs.length > 0 ? availableFavs : allThemes;

      const currentIndex = pool.findIndex((t) => t.id === settings.theme);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + direction + pool.length) % pool.length
          : 0;
      const nextTheme = pool[nextIndex];
      if (nextTheme) {
        handleUpdateSettings({ theme: nextTheme.id });
        a11yAnnouncer.announce(`Switched theme to ${nextTheme.name}`);
      }
    },
    [settings.theme, settings.customThemes, handleUpdateSettings]
  );

  // Tag Management Across All Notes (Rename, Delete, Batch Merge, Batch Delete)
  const handleRenameTagAcrossNotes = useCallback(
    async (
      oldTag: string,
      newTag: string,
      updateContent: boolean = true
    ): Promise<{ updatedCount: number }> => {
      const { updatedNotes, changedCount } = renameTagAcrossNotes(
        notes,
        oldTag,
        newTag,
        updateContent
      );
      if (changedCount > 0) {
        setNotes(updatedNotes);
        const changedOnly = updatedNotes.filter((n, idx) => notes[idx] !== n);
        await storageService.bulkSaveNotes(changedOnly);
        vaultManager.rebuildIndex(updatedNotes);
        filesystemBridgeService.triggerDebouncedSync();
        a11yAnnouncer.announce(
          `Renamed tag #${oldTag} to #${newTag} across ${changedCount} notes`,
          'polite'
        );

        const cleanOld = oldTag.trim().toLowerCase().replace(/^#/, '');
        const cleanNew = newTag.trim().replace(/^#/, '');
        if (filter.selectedTag && filter.selectedTag.toLowerCase() === cleanOld) {
          setFilter((prev) => ({ ...prev, selectedTag: cleanNew }));
        }
      }
      return { updatedCount: changedCount };
    },
    [notes, filter.selectedTag, setFilter, setNotes]
  );

  const handleDeleteTagAcrossNotes = useCallback(
    async (
      tagToDelete: string,
      removeFromContent: boolean = false
    ): Promise<{ updatedCount: number }> => {
      const { updatedNotes, changedCount } = deleteTagAcrossNotes(
        notes,
        tagToDelete,
        removeFromContent
      );
      if (changedCount > 0) {
        setNotes(updatedNotes);
        const changedOnly = updatedNotes.filter((n, idx) => notes[idx] !== n);
        await storageService.bulkSaveNotes(changedOnly);
        vaultManager.rebuildIndex(updatedNotes);
        filesystemBridgeService.triggerDebouncedSync();
        a11yAnnouncer.announce(
          `Deleted tag #${tagToDelete} from ${changedCount} notes`,
          'polite'
        );

        const cleanTag = tagToDelete.trim().toLowerCase().replace(/^#/, '');
        if (filter.selectedTag && filter.selectedTag.toLowerCase() === cleanTag) {
          setFilter((prev) => ({ ...prev, selectedTag: null }));
        }
      }
      return { updatedCount: changedCount };
    },
    [notes, filter.selectedTag, setFilter, setNotes]
  );

  const handleBatchMergeTags = useCallback(
    async (
      sourceTags: string[],
      targetTag: string,
      updateContent: boolean = true
    ): Promise<{ updatedCount: number }> => {
      const { updatedNotes, changedCount } = batchMergeTagsAcrossNotes(
        notes,
        sourceTags,
        targetTag,
        updateContent
      );
      if (changedCount > 0) {
        setNotes(updatedNotes);
        const changedOnly = updatedNotes.filter((n, idx) => notes[idx] !== n);
        await storageService.bulkSaveNotes(changedOnly);
        vaultManager.rebuildIndex(updatedNotes);
        filesystemBridgeService.triggerDebouncedSync();
        a11yAnnouncer.announce(
          `Merged ${sourceTags.length} tags into #${targetTag} across ${changedCount} notes`,
          'polite'
        );

        const cleanTarget = targetTag.trim().replace(/^#/, '');
        if (
          filter.selectedTag &&
          sourceTags.some(
            (t) => t.trim().toLowerCase().replace(/^#/, '') === filter.selectedTag?.toLowerCase()
          )
        ) {
          setFilter((prev) => ({ ...prev, selectedTag: cleanTarget }));
        }
      }
      return { updatedCount: changedCount };
    },
    [notes, filter.selectedTag, setFilter, setNotes]
  );

  const handleBatchDeleteTags = useCallback(
    async (
      tagsToDelete: string[],
      removeFromContent: boolean = false
    ): Promise<{ updatedCount: number }> => {
      const { updatedNotes, changedCount } = batchDeleteTagsAcrossNotes(
        notes,
        tagsToDelete,
        removeFromContent
      );
      if (changedCount > 0) {
        setNotes(updatedNotes);
        const changedOnly = updatedNotes.filter((n, idx) => notes[idx] !== n);
        await storageService.bulkSaveNotes(changedOnly);
        vaultManager.rebuildIndex(updatedNotes);
        filesystemBridgeService.triggerDebouncedSync();
        a11yAnnouncer.announce(
          `Deleted ${tagsToDelete.length} tags across ${changedCount} notes`,
          'polite'
        );

        if (
          filter.selectedTag &&
          tagsToDelete.some(
            (t) => t.trim().toLowerCase().replace(/^#/, '') === filter.selectedTag?.toLowerCase()
          )
        ) {
          setFilter((prev) => ({ ...prev, selectedTag: null }));
        }
      }
      return { updatedCount: changedCount };
    },
    [notes, filter.selectedTag, setFilter, setNotes]
  );

  const [activePluginWorkspaceView, setActivePluginWorkspaceView] = useState<{
    pluginId: string;
    viewId: string;
  } | null>(null);

  const [pendingUnlockNote, setPendingUnlockNote] = useState<Note | null>(null);
  const [singleNoteExportTarget, setSingleNoteExportTarget] = useState<Note | null>(null);
  const [exportCenterTargetNoteId, setExportCenterTargetNoteId] = useState<string | undefined>(undefined);
  const [shareSheetTarget, setShareSheetTarget] = useState<Note | null>(null);
  const [filesystemPlan, setFilesystemPlan] = useState<ReconciliationPlan | null>(null);
  const [filesystemConflicts, setFilesystemConflicts] = useState<FilesystemConflict[]>([]);
  const [drawingSaveCallback, setDrawingSaveCallback] = useState<((url: string) => void) | null>(
    null
  );

  // Determine active note from active workspace tab
  const activeWorkspaceNote =
    workspace.activeTab && workspace.activeTab.type === 'note'
      ? notes.find((n) => n.id === workspace.activeTab?.resourceId) || null
      : null;

  // Initialize Phase P41 Plugin Architecture Sandbox Gateway
  useEffect(() => {
    pluginRegistry.initialize({
      getActiveNote: () => {
        const tab = workspace.activeTab;
        if (tab && tab.type === 'note') {
          return notes.find((n) => n.id === tab.resourceId) || null;
        }
        return null;
      },
      getSelectedText: () => {
        return window.getSelection()?.toString() || '';
      },
      replaceSelectedText: (newText: string) => {
        const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (activeEl && typeof activeEl.selectionStart === 'number' && typeof activeEl.selectionEnd === 'number') {
          const start = activeEl.selectionStart;
          const end = activeEl.selectionEnd;
          const val = activeEl.value;
          activeEl.value = val.substring(0, start) + newText + val.substring(end);
          activeEl.selectionStart = activeEl.selectionEnd = start + newText.length;
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      mutateCurrentNote: async (updated: Note) => {
        await handleUpdateNote(updated);
      },
      getAllNotesMetadata: () => {
        return notes.filter((n) => !n.trashed).map((n) => ({
          id: n.id,
          title: n.title,
          tags: n.tags || [],
          updatedAt: n.updatedAt,
          folderId: n.folderId,
        }));
      },
      isVaultLocked: () => {
        return vaultEncryptionService.isVaultLocked();
      },
    });
  }, [notes, workspace.activeTab, handleUpdateNote]);

  // Synchronize execution context with Capture Bridge Service (P34), Automation Engine (P36), and Temporal Service (P37)
  useEffect(() => {
    captureBridgeService.setExecutionContext({
      notes,
      folders,
      settings,
      activeNote: activeWorkspaceNote,
      createNote: handleCreateNote,
      saveNote: handleUpdateNote,
      createFolder: handleCreateFolder,
      openNote: (noteId, title) => openNote(noteId, title),
    });

    if (automationEngine?.setExecutionContext) {
      automationEngine.setExecutionContext({
        notes,
        folders,
        settings,
        activeNote: activeWorkspaceNote,
        createNote: handleCreateNote,
        saveNote: handleUpdateNote,
        createFolder: handleCreateFolder,
        deleteNote: handleDeleteNote,
        openNote: (noteId, title) => openNote(noteId, title),
        showToast: (msg) => a11yAnnouncer.announce(msg),
      });
    }

    if (temporalService?.syncVault) {
      temporalService.syncVault(notes, folders);
    }
  }, [notes, folders, settings, activeWorkspaceNote, handleCreateNote, handleUpdateNote, handleCreateFolder, handleDeleteNote, openNote]);

  // Subscribe to pending suggestions from confirmation-mode rules
  useEffect(() => {
    if (!automationEngine?.subscribeSuggestions) return;
    const unsub = automationEngine.subscribeSuggestions((suggestions) => {
      setAutomationSuggestions(suggestions);
    });
    return () => unsub?.();
  }, []);

  // Daily Notes Navigation & Creation Handler
  const handleOpenDailyNote = useCallback(
    async (date: Date = new Date(), options?: any) => {
      const result = await dailyNotesService.getOrCreateDailyNote({
        date,
        notes,
        folders,
        appSettings: settings,
        createNote: handleCreateNote,
        createFolder: handleCreateFolder,
      });
      if (result && result.note) {
        openNote(result.note.id, result.note.title, options);
      }
    },
    [notes, folders, settings, handleCreateNote, handleCreateFolder, openNote]
  );

  // Quick Capture Modal Opener
  const handleOpenQuickCapture = useCallback((initialPayload?: Partial<QuickCapturePayload>) => {
    setQuickCaptureInitialPayload(initialPayload);
    setIsQuickCaptureOpen(true);
  }, []);

  // Serendipity: Open a random active note
  const handleOpenRandomNote = useCallback(() => {
    const activeNotes = notes.filter((n) => !n.trashed && !n.archived);
    if (activeNotes.length === 0) return;
    const randomIndex = Math.floor(Math.random() * activeNotes.length);
    const target = activeNotes[randomIndex];
    openNote(target.id, target.title);
  }, [notes, openNote]);

  // Register Service Worker & Handle PWA Deep-links / Share Target on mount
  useEffect(() => {
    registerServiceWorker();

    const pwaReq = parseInitialPWARequest();
    if (pwaReq) {
      if (pwaReq.action === 'daily-note') {
        handleOpenDailyNote(new Date());
      } else if (pwaReq.action === 'quick-capture' || pwaReq.isShareTarget) {
        handleOpenQuickCapture({
          title: pwaReq.title || '',
          content:
            pwaReq.text ||
            (pwaReq.url ? `${pwaReq.title ? pwaReq.title + '\n' : ''}${pwaReq.url}` : ''),
          sourceUrl: pwaReq.url || undefined,
        });
      }
    }
  }, [handleOpenDailyNote, handleOpenQuickCapture]);

  // Phase P46 Native Desktop App Event Integrations
  useEffect(() => {
    // Protocol / Deep Link Handler (pkm://note/<id>, pkm://today, etc.)
    const unsubProtocol = desktopProtocolService.subscribe((parsed) => {
      if (!parsed.isValid) return;
      if (parsed.action === 'note' && parsed.resourceId) {
        openNote(parsed.resourceId);
      } else if (parsed.action === 'today') {
        handleOpenDailyNote(new Date());
      } else if (parsed.action === 'collection' && parsed.resourceId) {
        openCollection(parsed.resourceId);
      } else if (parsed.action === 'reference') {
        openReferences();
      } else if (parsed.action === 'capture') {
        setActiveModal('desktop_quick_capture');
      }
    });

    // Global Quick Capture Listener (from OS-level shortcut)
    const unsubQC = desktopCapabilityService.subscribeQuickCapture(() => {
      setActiveModal('desktop_quick_capture');
    });

    // OS Session Lock Handler (triggers vault lock when computer screen locks)
    const unsubLock = desktopCapabilityService.subscribeSessionLock(() => {
      handleLockVault();
    });

    // P47 Mobile Lifecycle & Privacy Initialization
    mobileLifecycleService.initialize({
      lockVault: handleLockVault,
      isVaultLocked: () => isVaultLocked,
      flushPendingSaves: async () => {
        // Ensure pending note changes are flushed
      },
    });

    // Mobile Deep Link URL Launch Handler
    const unsubMobileUrl = mobileCapabilityService.subscribeUrlLaunch((url) => {
      const parsed = desktopProtocolService.parseProtocolUrl(url);
      if (parsed.action === 'note' && parsed.targetId) {
        openNote(parsed.targetId);
      } else if (parsed.action === 'daily') {
        handleOpenDailyNote();
      } else if (parsed.action === 'collection' && parsed.targetId) {
        openCollection(parsed.targetId);
      } else if (parsed.action === 'reference') {
        openReferences();
      } else if (parsed.action === 'capture') {
        handleOpenQuickCapture();
      }
    });

    // Mobile Auto-drain share queue on start if vault is already unlocked
    if (!isVaultLocked) {
      mobileShareService.drainPendingShares({
        notes,
        folders,
        settings,
        isVaultLocked,
        createNote: handleCreateNote,
        saveNote: handleUpdateNote,
        createFolder: handleCreateFolder,
        openNote: (id, title) => openNote(id, title),
      });
    }

    // Update Mobile Widgets with latest note states
    mobileWidgetService.updateAllWidgets(notes, isVaultLocked);

    // Register Background Task Coordinator Jobs
    desktopBackgroundService.registerJob('filesystem_rescan', 60000, async () => {
      if (filesystemBridgeService.isConfigured()) {
        await filesystemBridgeService.scanAndReconcile(
          notes,
          folders,
          handleUpdateNote,
          handleDeleteNote
        );
      }
    });

    return () => {
      unsubProtocol();
      unsubQC();
      unsubLock();
      unsubMobileUrl();
      desktopBackgroundService.unregisterJob('filesystem_rescan');
    };
  }, [openNote, handleOpenDailyNote, openCollection, openReferences, handleLockVault, isVaultLocked, notes, folders, settings, handleCreateNote, handleUpdateNote, handleCreateFolder, handleDeleteNote, handleOpenQuickCapture]);


  // Build Command Execution Context
  const commandContext: CommandExecutionContext = useMemo(() => {
    return {
      notes,
      folders,
      settings,
      activeNote: activeWorkspaceNote,
      activeFolderId: filter.selectedFolderId,
      openResource,
      openNote: (noteId, title, options) => {
        const target = notes.find((n) => n.id === noteId);
        if (target && target.isLocked && !isNoteUnlockedInSession(target.id)) {
          setPendingUnlockNote(target);
          setActiveModal('unlock_note');
        } else {
          openNote(noteId, title, options);
        }
      },
      openDailyNote: handleOpenDailyNote,
      openQuickCapture: handleOpenQuickCapture,
      openTemplates: handleOpenTemplates,
      openTasks: handleOpenVaultTasks,
      openNoteCompare: handleOpenNoteCompare,
      openPDF,
      openCanvas,
      openGraph,
      openKanban,
      openSmartViews,
      openHome,
      openSearch,
      openMedia,
      openReferences,
      openCalendar,
      openAgenda,
      openTimeline,
      openReview,
      openCopilot,
      openCollection,
      openDashboard,
      openPeople,
      openPlanningHome,
      openGoalsProjects,
      openLearning,
      openCourse,
      openSkill,
      openExamPrep,
      openLibrary,
      openFinance,
      openHealth,
      openTravel,
      openAssets,
      openDecisions,
      openUniversalInbox,
      createNote: handleCreateNote,
      openPublishing: () => setActiveModal('publication_manager'),
      openSingleNoteExport: (targetNote?: Note) => {
        setSingleNoteExportTarget(targetNote || activeWorkspaceNote || null);
        setActiveModal('single_note_export');
      },
      openExportCenter: (initialNoteId?: string) => {
        setExportCenterTargetNoteId(initialNoteId || activeWorkspaceNote?.id);
        setActiveModal('export_center');
      },
      openShareSheet: (targetNote?: Note) => {
        setShareSheetTarget(targetNote || activeWorkspaceNote || null);
        setActiveModal('share_sheet');
      },
      openDeveloperObservatory: () => setActiveModal('developer_observatory'),
      openFilesystemBridge: () => setActiveModal('filesystem_bridge'),
      openZenMode: () => setActiveModal('zen_mode'),
      openSerendipity: () => setActiveModal('serendipity'),
      openThemeCreator: handleOpenThemeCreator,
      insertMarkdownSnippet: (snippet: string) => {
        if (activeWorkspaceNote) {
          handleUpdateNote({
            ...activeWorkspaceNote,
            content: `${activeWorkspaceNote.content}\n\n${snippet}`,
            updatedAt: new Date().toISOString(),
          });
        }
      },
      splitWorkspace,
      closeActiveTab,
      reopenClosedTab,
      closeSplit,
      swapPanes,
      navigateBack,
      navigateForward,
      applyPreset,
      handleCreateNote: async (type: 'text' | 'checklist' = 'text') => {
        return await handleCreateNewBlankNote(type);
      },
      handleSaveNote: handleUpdateNote,
      handleDeleteNote,
      handleUpdateSettings,
      openModal: (modalName) => {
        setActiveModal(modalName as any);
      },
      lockVault: handleLockVault,
    };
  }, [
    notes,
    folders,
    settings,
    activeWorkspaceNote,
    filter.selectedFolderId,
    openResource,
    openNote,
    handleOpenDailyNote,
    handleOpenQuickCapture,
    openPDF,
    openCanvas,
    openGraph,
    openKanban,
    openSmartViews,
    openHome,
    openSearch,
    openMedia,
    openReferences,
    openCalendar,
    openAgenda,
    openTimeline,
    openReview,
    openCopilot,
    openCollection,
    openDashboard,
    openPeople,
    openLearning,
    openCourse,
    openSkill,
    openExamPrep,
    splitWorkspace,
    closeActiveTab,
    reopenClosedTab,
    closeSplit,
    swapPanes,
    navigateBack,
    navigateForward,
    applyPreset,
    handleUpdateNote,
    handleDeleteNote,
    handleUpdateSettings,
    handleLockVault,
  ]);

  // Note Opening with Lock Verification
  const handleOpenNote = useCallback(
    (note: Note, split = false) => {
      if (note.isLocked && !isNoteUnlockedInSession(note.id)) {
        setPendingUnlockNote(note);
        setActiveModal('unlock_note');
      } else {
        openNote(note.id, note.title, { split });
      }
    },
    [openNote]
  );

  const handleOpenLinkedNote = useCallback(
    (targetNoteId: string, options?: any) => {
      const target = notes.find((n) => n.id === targetNoteId);
      if (target) {
        handleOpenNote(target, options?.split);
      }
    },
    [notes, handleOpenNote]
  );

  // Template Selection Handler
  const handleSelectTemplate = async (template: NoteTemplate) => {
    const renderedTitle = renderTemplateContent(template.title || 'Untitled', {
      title: template.title,
    });
    const renderedContent = renderTemplateContent(template.content || '', {
      title: renderedTitle,
    });
    const renderedChecklist = template.checklist
      ? template.checklist.map((item) => ({
          ...item,
          text: renderTemplateContent(item.text, { title: renderedTitle }),
          completed: false,
        }))
      : [];

    const newDraft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      title: renderedTitle,
      content: renderedContent,
      type: template.type,
      checklist: renderedChecklist,
      tags: template.tags ? [...template.tags] : filter.selectedTag ? [filter.selectedTag] : [],
      color: template.color || settings.defaultColor || 'default',
      folderId: filter.selectedFolderId === 'unorganized' ? null : filter.selectedFolderId,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
    };
    const created = await handleCreateNote(newDraft);
    openNote(created.id, created.title);
  };

  const handleCreateNewBlankNote = async (type: 'text' | 'checklist' = 'text') => {
    const newDraft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      title: '',
      content: '',
      type,
      checklist: type === 'checklist' ? [{ id: `item-${Date.now()}`, text: '', completed: false }] : [],
      tags: filter.selectedTag ? [filter.selectedTag] : [],
      color: settings.defaultColor || 'default',
      folderId: filter.selectedFolderId === 'unorganized' ? null : filter.selectedFolderId,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
    };
    const created = await handleCreateNote(newDraft);
    openNote(created.id, created.title || 'Untitled Note');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
      const isMod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl+K / Cmd+K / Ctrl+P / Cmd+P -> Universal Command Palette
      if (isMod && (key === 'k' || key === 'p') && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Alt+D -> Today's Daily Note
      if (e.altKey && key === 'd' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleOpenDailyNote(new Date());
        return;
      }

      // Alt+R -> Open Random Note (Serendipity)
      if (e.altKey && key === 'r' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleOpenRandomNote();
        return;
      }

      // Alt+Shift+R or Mod+Alt+R -> Open Serendipity Oracle Studio
      if ((e.altKey && e.shiftKey && key === 'r') || (isMod && e.altKey && key === 'r')) {
        e.preventDefault();
        setActiveModal('serendipity');
        return;
      }

      // Alt+T -> Quick Cycle through Favorite Themes directly
      if (e.altKey && key === 't' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleCycleFavoriteTheme(1);
        return;
      }

      // Alt+Shift+T or Mod+Alt+P -> Open Theme Studio & Customizer
      if ((e.altKey && e.shiftKey && key === 't') || (isMod && e.altKey && key === 'p')) {
        e.preventDefault();
        handleOpenThemeCreator();
        return;
      }

      // Alt+W / Alt+Shift+W / Mod+Alt+W -> Writing Sprint Arena & Flow Studio (Feature 7)
      if (
        (e.altKey && key === 'w' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'w') ||
        (isMod && e.altKey && key === 'w')
      ) {
        e.preventDefault();
        setActiveModal('writing_sprint');
        a11yAnnouncer.announce('Opened Writing Sprint Arena');
        return;
      }

      // Alt+I / Alt+Shift+I / Mod+Alt+I -> Idea Spark & Thought Combinator
      if (
        (e.altKey && key === 'i' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'i') ||
        (isMod && e.altKey && key === 'i')
      ) {
        e.preventDefault();
        setActiveModal('idea_spark');
        a11yAnnouncer.announce('Opened Idea Spark Combinator');
        return;
      }

      // Alt+M / Alt+Shift+M -> Thought Matrix · 2×2 Decision & Priority Studio (Feature 9)
      if (
        (e.altKey && key === 'm' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'm' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('thought_matrix');
        a11yAnnouncer.announce('Opened Thought Matrix 2x2 Decision Studio');
        return;
      }

      // Alt+C / Alt+Shift+C -> Cornell Notes & Structured Study Studio (Feature 10)
      if (
        (e.altKey && key === 'c' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'c' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('cornell_notes');
        a11yAnnouncer.announce('Opened Cornell Notes and Active Recall Studio');
        return;
      }

      // Alt+P / Alt+Shift+P -> Pomodoro Deep Work Flow & Interstitial Journaling Hub (P1)
      if (
        (e.altKey && key === 'p' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'p' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('pomodoro_flow');
        a11yAnnouncer.announce('Opened Pomodoro Deep Work Flow & Interstitial Journaling Hub');
        return;
      }

      // Alt+Z / Alt+Shift+Z -> Zettelkasten Atomic Slip-Box & Concept Extraction Studio (P2)
      if (
        (e.altKey && key === 'z' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'z' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('zettelkasten_studio');
        a11yAnnouncer.announce('Opened Zettelkasten Atomic Slip-Box Studio');
        return;
      }

      // Alt+K / Alt+Shift+K -> Chrono Capsule & Spaced Incremental Reading Studio (P3)
      if (
        (e.altKey && key === 'k' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'k' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('chrono_capsule');
        a11yAnnouncer.announce('Opened Chrono Capsule & Incremental Reading Studio');
        return;
      }

      // Alt+X / Alt+Shift+X -> Multi-Note Parallel Comparison & Synthesis Matrix (P4)
      if (
        (e.altKey && key === 'x' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'x' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('synthesis_matrix');
        a11yAnnouncer.announce('Opened Synthesis Matrix');
        return;
      }

      // Alt+V / Alt+Shift+V -> Voice Memo Transcriber & Audio Snippet Studio (P5)
      if (
        (e.altKey && key === 'v' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'v' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('voice_memo_studio');
        a11yAnnouncer.announce('Opened Voice Memo Studio');
        return;
      }

      // Alt+B / Alt+Shift+B -> Visual Mind Map & Concept Outline Studio (P6)
      if (
        (e.altKey && key === 'b' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'b' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('mind_map_studio');
        a11yAnnouncer.announce('Opened Visual Mind Map Studio');
        return;
      }

      // Alt+Y / Alt+Shift+Y -> Hotkey Super-Palette & Macro Automation Engine (P7)
      if (
        (e.altKey && key === 'y' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'y' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('macro_automation');
        a11yAnnouncer.announce('Opened Macro Automation Engine');
        return;
      }

      // Alt+H / Alt+Shift+H -> Vault Statistics & Writing Activity Heatmap
      if (
        (e.altKey && key === 'h' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'h')
      ) {
        e.preventDefault();
        setActiveModal('vault_stats');
        a11yAnnouncer.announce('Opened Vault Statistics');
        return;
      }

      // Alt+F / Alt+Shift+F -> Flashcard Review & SRS
      if (
        (e.altKey && key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'f')
      ) {
        e.preventDefault();
        handleOpenFlashcards();
        a11yAnnouncer.announce('Opened Flashcard Review');
        return;
      }

      // Alt+G / Alt+Shift+G -> Markdown Presentation & Slide Deck Studio (P9)
      if (
        (e.altKey && key === 'g' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'g' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('presentation_studio');
        a11yAnnouncer.announce('Opened Markdown Presentation & Slide Deck Studio');
        return;
      }

      // Alt+Q / Alt+Shift+Q -> Reactive Computational Sandbox & Formula Matrix (P10)
      if (
        (e.altKey && key === 'q' && !e.ctrlKey && !e.metaKey && !e.shiftKey) ||
        (e.altKey && e.shiftKey && key === 'q' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setActiveModal('reactive_sandbox');
        a11yAnnouncer.announce('Opened Reactive Computational Sandbox & Formula Matrix');
        return;
      }

      // Ctrl+Shift+C / Cmd+Shift+C / Ctrl+Alt+C -> Quick Capture Modal
      if ((isMod && e.shiftKey && key === 'c') || (isMod && e.altKey && key === 'c')) {
        e.preventDefault();
        handleOpenQuickCapture();
        return;
      }

      // Ctrl+Alt+Z / Cmd+Alt+Z -> Restore/Expand Zen Focus Bar
      if (isMod && e.altKey && key === 'z') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('keepnotes_restore_zen_dock'));
        return;
      }

      // Ctrl+Shift+T / Cmd+Shift+T -> Reopen Recently Closed Tab (QoL 1) or Templates
      if (isMod && e.shiftKey && key === 't') {
        e.preventDefault();
        const recent = tabShortcutsManager.popRecentlyClosed();
        if (recent) {
          if (recent.resourceType === 'note') {
            openNote(recent.resourceId, recent.title);
          } else {
            openResource({
              type: recent.resourceType as any,
              resourceId: recent.resourceId,
              title: recent.title,
            });
          }
          a11yAnnouncer.announce(`Reopened closed tab: ${recent.title}`);
        } else {
          handleOpenTemplates();
        }
        return;
      }

      // Ctrl+W / Cmd+W -> Close active tab in active pane (QoL 1)
      if (isMod && !e.shiftKey && !e.altKey && (key === 'w' || key === 'W')) {
        const activePane = workspace.activePane;
        if (activePane && activePane.tabs.length > 1) {
          const tabToClose = activePane.tabs.find((t) => t.id === activePane.activeTabId);
          if (tabToClose && !tabToClose.pinned) {
            e.preventDefault();
            tabShortcutsManager.recordClosedTab({
              resourceId: tabToClose.resourceId || '',
              resourceType: tabToClose.type,
              title: tabToClose.title || tabToClose.type,
            });
            workspace.closeTab(activePane.id, tabToClose.id);
            a11yAnnouncer.announce(`Closed tab: ${tabToClose.title || tabToClose.type}`);
            return;
          }
        }
      }

      // Ctrl+Tab / Ctrl+Shift+Tab -> Cycle workspace tabs (QoL 1)
      if (isMod && (e.key === 'Tab' || key === 'tab')) {
        const activePane = workspace.activePane;
        if (activePane && activePane.tabs.length > 1) {
          e.preventDefault();
          const curIdx = activePane.tabs.findIndex((t) => t.id === activePane.activeTabId);
          const delta = e.shiftKey ? -1 : 1;
          const nextIdx = (curIdx + delta + activePane.tabs.length) % activePane.tabs.length;
          workspace.activateTab(activePane.id, activePane.tabs[nextIdx].id);
          return;
        }
      }

      // Ctrl+O / Cmd+O -> Quick Switcher & Instant Jump (QoL 9)
      if (isMod && !e.shiftKey && !e.altKey && (key === 'o' || key === 'O')) {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
        a11yAnnouncer.announce('Opened Quick Switcher');
        return;
      }

      // Alt+Left -> Navigate Back in note history (QoL 4)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'Left')) {
        if (navigationHistory.canGoBack()) {
          e.preventDefault();
          const prev = navigationHistory.goBack();
          if (prev) {
            openNote(prev.noteId, prev.noteTitle);
            a11yAnnouncer.announce(`Navigated back to ${prev.noteTitle}`);
          }
          return;
        }
      }

      // Alt+Right -> Navigate Forward in note history (QoL 4)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowRight' || e.key === 'Right')) {
        if (navigationHistory.canGoForward()) {
          e.preventDefault();
          const next = navigationHistory.goForward();
          if (next) {
            openNote(next.noteId, next.noteTitle);
            a11yAnnouncer.announce(`Navigated forward to ${next.noteTitle}`);
          }
          return;
        }
      }

      // Alt+T -> Toggle Typewriter Mode (QoL 10)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (key === 't' || key === 'T')) {
        e.preventDefault();
        const active = typewriterManager.toggleTypewriter();
        a11yAnnouncer.announce(`Typewriter mode ${active ? 'enabled' : 'disabled'}`);
        return;
      }

      // Alt+Shift+G -> Knowledge Quests & Gamification Hub
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (key === 'g' || key === 'G')) {
        e.preventDefault();
        openResource({ type: 'gamification', title: 'Knowledge Quests & Mastery' });
        a11yAnnouncer.announce('Opened Knowledge Quests & Gamification Hub');
        return;
      }

      // Alt+Shift+H -> Vault Health & Integrity Doctor
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (key === 'h' || key === 'H')) {
        e.preventDefault();
        setIsHealthDoctorOpen(true);
        a11yAnnouncer.announce('Opened Vault Health & Integrity Doctor');
        return;
      }

      // Alt+Shift+E -> Complete Standalone Vault Archive Exporter
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (key === 'e' || key === 'E')) {
        e.preventDefault();
        setIsVaultArchiveOpen(true);
        a11yAnnouncer.announce('Opened Vault Archive Exporter');
        return;
      }

      // Ctrl+Alt+T / Cmd+Alt+T -> Vault Tasks Center & Global Action Items
      if (isMod && e.altKey && key === 't') {
        e.preventDefault();
        handleOpenVaultTasks();
        return;
      }

      // Ctrl+Alt+M / Cmd+Alt+M -> Note Compare & Merge Studio
      if (isMod && e.altKey && key === 'm') {
        e.preventDefault();
        handleOpenNoteCompare();
        return;
      }

      // Ctrl+Shift+F / Cmd+Shift+F -> Dedicated Vault Search & Query Explorer
      if (isMod && e.shiftKey && key === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }

      // Ctrl+N / Cmd+N -> Create new note in active workspace pane
      if (isMod && key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleCreateNewBlankNote();
        return;
      }

      // Ctrl+F / Cmd+F -> Focus Search Bar
      if (isMod && key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const searchInput = document.getElementById('main-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Single-key '/' -> Focus search bar when not typing in an input
      if (!isInput && !isMod && !e.altKey && !e.shiftKey && key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('main-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Single-key 'c' -> Quick capture note when browsing
      if (!isInput && !isMod && !e.altKey && !e.shiftKey && key === 'c') {
        e.preventDefault();
        handleOpenQuickCapture();
        return;
      }

      // Single-key 'n' -> New blank note when browsing
      if (!isInput && !isMod && !e.altKey && !e.shiftKey && key === 'n') {
        e.preventDefault();
        handleCreateNewBlankNote();
        return;
      }

      // Arrow & Vim list navigation and direct actions: J / K / Enter / X / * / E / A / Delete
      if (!isInput && !isMod && !e.altKey && !activeModal && !isCommandPaletteOpen) {
        if (key === 'j' || key === 'arrowdown') {
          e.preventDefault();
          setFocusedNoteIndex((prev) => {
            const next = prev + 1;
            return next < filteredNotes.length ? next : Math.max(0, filteredNotes.length - 1);
          });
          return;
        }

        if (key === 'k' || key === 'arrowup') {
          e.preventDefault();
          setFocusedNoteIndex((prev) => {
            const next = prev - 1;
            return next >= 0 ? next : 0;
          });
          return;
        }

        // Enter -> Open focused note
        if (key === 'enter' && focusedNote) {
          e.preventDefault();
          handleOpenNote(focusedNote);
          return;
        }

        // x -> Toggle selection of focused note
        if (key === 'x' && !e.shiftKey && focusedNote) {
          e.preventDefault();
          handleToggleSelectNote(focusedNote.id);
          return;
        }

        // * -> Select all or deselect visible notes
        if (e.key === '*') {
          e.preventDefault();
          if (selectedNoteIds.length === filteredNotes.length && filteredNotes.length > 0) {
            setSelectedNoteIds([]);
          } else {
            handleSelectAll();
          }
          return;
        }

        // e or a -> Archive / unarchive note(s)
        if (!e.shiftKey && (key === 'e' || key === 'a')) {
          if (selectedNoteIds.length > 0) {
            e.preventDefault();
            const anyUnarchived = notes.some((n) => selectedNoteIds.includes(n.id) && !n.archived);
            handleBulkArchive(anyUnarchived);
            return;
          } else if (focusedNote) {
            e.preventDefault();
            handleUpdateNote({
              ...focusedNote,
              archived: !focusedNote.archived,
              updatedAt: new Date().toISOString(),
            });
            a11yAnnouncer.announce(focusedNote.archived ? 'Note unarchived' : 'Note archived');
            return;
          }
        }

        // p -> Toggle Pin on focused or selected note(s)
        if (!e.shiftKey && key === 'p') {
          if (selectedNoteIds.length > 0) {
            e.preventDefault();
            const anyUnpinned = notes.some((n) => selectedNoteIds.includes(n.id) && !n.pinned);
            handleBulkPin(anyUnpinned);
            return;
          } else if (focusedNote) {
            e.preventDefault();
            handleUpdateNote({
              ...focusedNote,
              pinned: !focusedNote.pinned,
              updatedAt: new Date().toISOString(),
            });
            a11yAnnouncer.announce(focusedNote.pinned ? 'Note unpinned' : 'Note pinned to top');
            return;
          }
        }

        // s or f -> Toggle Favorite / Star on focused or selected note(s)
        if (!e.shiftKey && (key === 's' || key === 'f')) {
          if (selectedNoteIds.length > 0) {
            e.preventDefault();
            const anyUnfavorited = notes.some((n) => selectedNoteIds.includes(n.id) && !n.isFavorite);
            handleBulkFavorite(anyUnfavorited);
            return;
          } else if (focusedNote) {
            e.preventDefault();
            handleUpdateNote({
              ...focusedNote,
              isFavorite: !focusedNote.isFavorite,
              updatedAt: new Date().toISOString(),
            });
            a11yAnnouncer.announce(focusedNote.isFavorite ? 'Removed from favorites' : 'Added to favorites');
            return;
          }
        }

        // d -> Duplicate focused or selected note(s)
        if (!e.shiftKey && key === 'd') {
          if (selectedNoteIds.length > 0) {
            e.preventDefault();
            handleBulkDuplicate();
            return;
          } else if (focusedNote) {
            e.preventDefault();
            handleDuplicateNote(focusedNote);
            a11yAnnouncer.announce(`Duplicated note ${focusedNote.title || 'Untitled'}`);
            return;
          }
        }

        // Delete / Backspace / # -> Move note(s) to trash
        if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '#') {
          if (selectedNoteIds.length > 0) {
            e.preventDefault();
            handleBulkDelete();
            return;
          } else if (focusedNote && !focusedNote.trashed) {
            e.preventDefault();
            handleDeleteNoteWithUndo(focusedNote.id);
            return;
          }
        }
      }

      // Escape -> Deselect notes or clear focus or close any open dialog or clear search/filters
      if (e.key === 'Escape') {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          setSelectedNoteIds([]);
          return;
        }
        if (focusedNoteIndex !== -1) {
          setFocusedNoteIndex(-1);
        }
        if (activeModal) {
          e.preventDefault();
          setActiveModal(null);
          return;
        }
        const searchInput = document.getElementById('main-search-input') as HTMLInputElement | null;
        if (searchInput && document.activeElement === searchInput) {
          if (filter.searchQuery) {
            setFilter((prev) => ({ ...prev, searchQuery: '' }));
          }
          searchInput.blur();
          return;
        }
        if (filter.searchQuery || filter.selectedTag || filter.selectedFolderId || filter.selectedColor) {
          setFilter((prev) => ({
            ...prev,
            searchQuery: '',
            selectedTag: null,
            selectedFolderId: null,
            selectedColor: null,
            selectedType: 'all',
          }));
          return;
        }
        return;
      }

      // Ctrl+Shift+E -> Export & Sharing Center
      if (isMod && e.shiftKey && key === 'e') {
        e.preventDefault();
        setActiveModal('export_center');
        return;
      }

      // Ctrl+Alt+S -> Quick Share Sheet
      if (isMod && e.altKey && key === 's') {
        e.preventDefault();
        setActiveModal('share_sheet');
        return;
      }

      // Ctrl+/ or '?' -> Shortcuts Guide
      if ((isMod && key === '/') || (!isInput && e.key === '?' && !isMod)) {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'shortcuts' ? null : 'shortcuts'));
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    selectedNoteIds,
    activeModal,
    filter,
    filteredNotes,
    focusedNote,
    focusedNoteIndex,
    handleOpenNote,
    handleToggleSelectNote,
    handleSelectAll,
    handleBulkArchive,
    handleBulkPin,
    handleBulkFavorite,
    handleBulkDuplicate,
    handleDuplicateNote,
    handleBulkDelete,
    handleUpdateNote,
    handleDeleteNoteWithUndo,
    notes,
    isCommandPaletteOpen,
    handleCycleFavoriteTheme,
  ]);

  // Render Home Feed inside a Workspace Pane
  const renderHomeFeed = () => (
    <div
      ref={homeScrollRef}
      onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 350)}
      className={`w-full h-full overflow-y-auto ${
        settings.compactMode ? 'px-3 sm:px-6 py-3' : 'px-4 sm:px-8 py-6'
      } relative ${canvasBgClass}`}
    >
      {/* Source-owned daily command center; no duplicate Folio or Habits records. */}
      {filter.scope === 'active' && !filter.searchQuery && !filter.selectedTag && !filter.selectedFolderId && !isVaultLocked && (
        <KeepTodayOverview
          notes={notes}
          onOpenNote={(note, line) => line !== undefined && !note.isLocked ? openNote(note.id, note.title, { viewState: { cursorLine: line } }) : handleOpenNote(note)}
          onSaveNote={handleUpdateNote}
          onOpenTasks={() => handleOpenVaultTasks('today_overdue')}
          onOpenCalendar={() => openCalendar()}
          onOpenPlanning={() => openPlanningHome()}
          onOpenRoutines={() => openRoutines()}
          onOpenDiscovery={(viewId) => openResource({ type: 'knowledge-explorer', resourceId: viewId, title: 'Knowledge & projects' })}
        />
      )}

      {/* Quick Filter Bar */}
      <QuickFilterBar
        filter={filter}
        onFilterChange={setFilter}
        folders={folders}
        allTags={tagsList.map((t) => t.name)}
        notes={notes}
        totalNotesCount={notes.length}
        filteredNotesCount={filteredNotes.length}
        onOpenRandomNote={handleOpenRandomNote}
        onEmptyTrash={handleEmptyTrash}
        sortBy={filter.sortBy || settings.sortBy}
        sortOrder={filter.sortOrder || settings.sortOrder}
        onSortChange={(sortBy, sortOrder) => {
          setFilter((prev) => ({ ...prev, sortBy, sortOrder }));
          handleUpdateSettings({ sortBy, sortOrder });
        }}
      />

      {/* Quick Note Input Box */}
      {filter.scope === 'active' && filter.viewMode !== 'calendar' && (
        <div className={settings.compactMode ? 'mb-4' : 'mb-8'}>
          <QuickNoteInput
            folders={folders}
            allNotes={notes}
            selectedFolderId={filter.selectedFolderId}
            onCreateNote={async (draft) => {
              const created = await handleCreateNote(draft);
              openNote(created.id, created.title);
            }}
            onOpenDrawingModal={(cb) => {
              setDrawingSaveCallback(() => cb);
              setActiveModal('drawing');
            }}
          />
        </div>
      )}

      {/* Timeline Scrubber */}
      {filter.viewMode !== 'calendar' && filteredNotes.length > 0 && (
        <TimelineScrubber
          notes={filteredNotes}
          onSelectMonth={(monthKey) => {
            setFilter((prev) => ({ ...prev, selectedMonth: monthKey }));
          }}
          selectedMonth={filter.selectedMonth || null}
        />
      )}

      {/* Cross-Scope Search Discovery Banners */}
      {matchingArchivedCount > 0 && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Found <strong>{matchingArchivedCount}</strong> matching {matchingArchivedCount === 1 ? 'note' : 'notes'} in your <strong>Archive</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter((prev) => ({ ...prev, scope: 'archived' }))}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
          >
            View in Archive <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {matchingActiveCount > 0 && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Found <strong>{matchingActiveCount}</strong> matching {matchingActiveCount === 1 ? 'note' : 'notes'} in your <strong>Active Notes</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter((prev) => ({ ...prev, scope: 'active' }))}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
          >
            View Active Notes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contextual Archive Notice */}
      {filter.scope === 'archived' && !filter.searchQuery && filteredNotes.length > 0 && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Archive View</strong>: Archived notes are hidden from your main workspace but remain fully searchable.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter((prev) => ({ ...prev, scope: 'active' }))}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
          >
            Back to Main Notes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Archive Empty State */}
      {filter.scope === 'archived' && filteredNotes.length === 0 && !filter.searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800/60 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-xs">
            <Archive className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">
            Your archive is empty
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm text-center leading-relaxed">
            Archive notes to clear clutter from your workspace while keeping them organized, searchable, and easy to restore anytime.
          </p>
          <button
            type="button"
            onClick={() => setFilter((prev) => ({ ...prev, scope: 'active' }))}
            className="mt-5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Inbox className="w-4 h-4" /> Go to Main Notes
          </button>
        </div>
      ) : (
        /* Active View Mode Renderer */
        <div className="mt-4 flex-1">
          {filter.viewMode === 'masonry' && (
            <MasonryView
              notes={filteredNotes}
              allNotes={notes}
              folders={folders}
              settings={settings}
              searchQuery={filter.searchQuery}
              selectedNoteIds={selectedNoteIds}
              onToggleSelect={handleToggleSelectNote}
              onOpenNote={handleOpenNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNoteWithUndo}
              onRestoreNote={handleRestoreNote}
              onDeleteForever={handleDeleteForever}
              onDuplicateNote={handleDuplicateNote}
              onFilterTag={(t) => setFilter((prev) => ({ ...prev, selectedTag: t }))}
              onFilterFolder={(fId) => setFilter((prev) => ({ ...prev, selectedFolderId: fId }))}
              onOpenLinkedNote={handleOpenLinkedNote}
              focusedNoteId={focusedNote?.id}
              onSaveAsTemplate={(n) => handleOpenTemplates(n)}
              onCompareNote={(n) => handleOpenNoteCompare(n.id)}
              onReorderNotes={handleReorderNotes}
            />
          )}

          {(filter.viewMode === 'list' || filter.viewMode === 'recent') && (
            <div className="space-y-3">
              {filter.viewMode === 'recent' && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Showing top 20 most recently edited notes sorted strictly by updated timestamp</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/60">
                    {filteredNotes.length} notes
                  </span>
                </div>
              )}
              <ListView
                notes={filteredNotes}
                allNotes={notes}
                folders={folders}
                settings={settings}
                searchQuery={filter.searchQuery}
                selectedNoteIds={selectedNoteIds}
                onToggleSelect={handleToggleSelectNote}
                onOpenNote={handleOpenNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNoteWithUndo}
                onRestoreNote={handleRestoreNote}
                onDeleteForever={handleDeleteForever}
                onFilterTag={(t) => setFilter((prev) => ({ ...prev, selectedTag: t }))}
                onFilterFolder={(fId) => setFilter((prev) => ({ ...prev, selectedFolderId: fId }))}
                onOpenLinkedNote={handleOpenLinkedNote}
                focusedNoteId={focusedNote?.id}
                onCompareNote={(n) => handleOpenNoteCompare(n.id)}
              />
            </div>
          )}

          {filter.viewMode === 'stacked' && (
            <StackedView
              notes={filteredNotes}
              allNotes={notes}
              folders={folders}
              settings={settings}
              searchQuery={filter.searchQuery}
              selectedNoteIds={selectedNoteIds}
              onToggleSelect={handleToggleSelectNote}
              onOpenNote={handleOpenNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNoteWithUndo}
              onRestoreNote={handleRestoreNote}
              onDeleteForever={handleDeleteForever}
              onDuplicateNote={handleDuplicateNote}
              onFilterTag={(t) => setFilter((prev) => ({ ...prev, selectedTag: t }))}
              onFilterFolder={(fId) => setFilter((prev) => ({ ...prev, selectedFolderId: fId }))}
              onOpenLinkedNote={handleOpenLinkedNote}
              focusedNoteId={focusedNote?.id}
              onReorderNotes={handleReorderNotes}
              onSortChange={(sortBy) => handleUpdateSettings({ sortBy })}
              onSaveAsTemplate={(n) => handleOpenTemplates(n)}
              onCompareNote={(n) => handleOpenNoteCompare(n.id)}
            />
          )}

          {filter.viewMode === 'calendar' && (
            <CalendarView
              notes={filteredNotes}
              allNotes={notes}
              folders={folders}
              onOpenNote={handleOpenNote}
              onOpenNewNoteWithDate={async (dateIso) => {
                const newDraft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
                  title: '',
                  content: '',
                  type: 'text',
                  checklist: [],
                  tags: [],
                  color: settings.defaultColor || 'default',
                  folderId: filter.selectedFolderId === 'unorganized' ? null : filter.selectedFolderId,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  reminderDate: dateIso,
                  images: [],
                };
                const created = await handleCreateNote(newDraft);
                openNote(created.id, created.title);
              }}
            />
          )}

          {filter.viewMode === 'graph' && (
            <GraphView
              notes={filteredNotes}
              allNotes={notes}
              folders={folders}
              settings={settings}
              searchQuery={filter.searchQuery}
              onOpenNote={handleOpenNote}
              onUpdateNote={handleUpdateNote}
            />
          )}

          {filter.viewMode === 'kanban' && (
            <KanbanView
              notes={filteredNotes}
              allNotes={notes}
              folders={folders}
              settings={settings}
              searchQuery={filter.searchQuery}
              onOpenNote={handleOpenNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onOpenNewNoteWithAttributes={async (attrs) => {
                const newDraft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
                  title: attrs.title || '',
                  content: attrs.content || '',
                  type: attrs.type || 'text',
                  checklist: attrs.checklist ? [...attrs.checklist] : [],
                  tags: attrs.tags ? [...attrs.tags] : filter.selectedTag ? [filter.selectedTag] : [],
                  color: attrs.color || settings.defaultColor || 'default',
                  folderId:
                    attrs.folderId !== undefined
                      ? attrs.folderId
                      : filter.selectedFolderId === 'unorganized'
                      ? null
                      : filter.selectedFolderId,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  reminderDate: attrs.reminderDate || null,
                  priority: attrs.priority,
                  status: attrs.status,
                  images: [],
                };
                const created = await handleCreateNote(newDraft);
                openNote(created.id, created.title);
              }}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-150 ${fontFamilyClass} bg-[#f0eee8] dark:bg-[#0d0d10] text-stone-900 dark:text-stone-100`}
    >
      {/* Accessible Screen Reader Live Region */}
      <A11yLiveRegion />

      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-xl focus:ring-2 focus:ring-white focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <Header
        filter={filter}
        onFilterChange={setFilter}
        savedSearches={savedSearches}
        folders={folders}
        settings={settings}
        onSettingsChange={handleUpdateSettings}
        onOpenNewNote={(type) => handleCreateNewBlankNote(type)}
        onOpenTemplates={() => handleOpenTemplates()}
        onOpenVaultTasks={() => handleOpenVaultTasks()}
        onOpenNoteCompare={() => handleOpenNoteCompare()}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenThemeCreator={handleOpenThemeCreator}
        onOpenSync={() => setActiveModal('sync')}
        onOpenImport={() => setActiveModal('import')}
        onOpenSmartViews={() => openSmartViews()}
        onOpenDailyNote={() => handleOpenDailyNote(new Date())}
        onOpenQuickCapture={() => handleOpenQuickCapture()}
        onOpenRandomNote={handleOpenRandomNote}
        onOpenIdeaSpark={() => setActiveModal('idea_spark')}
        onOpenWritingSprint={() => setActiveModal('writing_sprint')}
        onOpenThoughtMatrix={() => setActiveModal('thought_matrix')}
        onOpenCornellNotes={() => setActiveModal('cornell_notes')}
        onOpenPomodoroFlow={() => setActiveModal('pomodoro_flow')}
        onOpenZettelkasten={() => setActiveModal('zettelkasten_studio')}
        onOpenChronoCapsule={() => setActiveModal('chrono_capsule')}
        onOpenSynthesisMatrix={() => setActiveModal('synthesis_matrix')}
        onOpenVoiceMemoStudio={() => setActiveModal('voice_memo_studio')}
        onOpenMindMapStudio={() => setActiveModal('mind_map_studio')}
        onOpenMacroAutomation={() => setActiveModal('macro_automation')}
        onOpenSerendipity={() => setActiveModal('serendipity')}
        onOpenActivityHeatmap={() => setActiveModal('vault_stats')}
        onOpenFlashcards={() => handleOpenFlashcards()}
        onOpenPresentationStudio={() => setActiveModal('presentation_studio')}
        onOpenReactiveSandbox={() => setActiveModal('reactive_sandbox')}
        onOpenCopilot={() => openCopilot()}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenVaultSearch={() => openSearch()}
        onOpenShortcuts={() => setActiveModal('shortcuts')}
        onOpenVaultDoctor={() => setActiveModal('vault_doctor')}
        onOpenEncryption={() => setActiveModal('vault_encryption')}
        onOpenSecurityAudit={() => setActiveModal('security_audit')}
        onOpenFilesystemBridge={() => setActiveModal('filesystem_bridge')}
        onOpenFilesystemConflicts={() => {
          const conflicts = filesystemBridgeService.getConflicts();
          if (conflicts.length > 0) {
            setFilesystemConflicts(conflicts);
            setActiveModal('filesystem_conflicts');
          }
        }}
        onOpenConflictCenter={() => setActiveModal('v2_sync_conflicts')}
        onOpenDeviceManager={() => setActiveModal('v2_device_manager')}
        onOpenDiagnostics={() => setActiveModal('v2_sync_diagnostics')}
        onLockVault={handleLockVault}
        isVaultEncrypted={isVaultEncrypted}
        onOpenSaveSearchModal={() => setActiveModal('save_search')}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        notesCount={notes.length}
      />

      {/* Main App Body with Persistent Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          filter={filter}
          onFilterChange={setFilter}
          onOpenManageFolders={() => setActiveModal('manage_folders')}
          onOpenManageTags={() => setActiveModal('manage_tags')}
          onOpenSaveSearchModal={() => setActiveModal('save_search')}
          onOpenSearch={() => openSearch()}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenDailyNote={() => handleOpenDailyNote(new Date())}
          onOpenQuickCapture={() => handleOpenQuickCapture()}
          onOpenSmartViews={() => openSmartViews()}
          onOpenPDFReader={() => openPDF()}
          onOpenCanvas={() => openCanvas()}
          onOpenMedia={() => openMedia()}
          onOpenReferences={() => openReferences()}
          onOpenAutomations={() => openAutomations()}
          onOpenCalendar={() => openCalendar()}
          onOpenAgenda={() => openAgenda()}
          onOpenTimeline={() => openTimeline()}
          onOpenReview={() => openReview()}
          onOpenCollections={() => openCollection()}
          onOpenDashboards={() => openDashboard()}
          onOpenPeople={() => openPeople()}
          onOpenPlanningHome={() => openPlanningHome()}
          onOpenGoalsProjects={() => openGoalsProjects()}
          onOpenRoutines={() => openRoutines()}
          onOpenLearning={() => openLearning()}
          onOpenLibrary={() => openLibrary()}
          onOpenFinance={() => openFinance()}
          onOpenHealth={() => openHealth()}
          onOpenTravel={() => openTravel()}
          onOpenAssets={() => openAssets()}
          onOpenDecisions={() => openDecisions()}
          onOpenUniversalInbox={() => openUniversalInbox()}
          onOpenPublishing={() => setActiveModal('publication_manager')}
          onOpenExportCenter={() => setActiveModal('export_center')}
          onOpenMigrationHub={() => setActiveModal('migration_hub')}
          onOpenVaultDoctor={() => setActiveModal('vault_doctor')}
          onOpenRecoveryCenter={() => setActiveModal('recovery_center')}
          onOpenPersonalization={() => setActiveModal('personalization')}
          onOpenTemplates={() => handleOpenTemplates()}
          onOpenVaultTasks={handleOpenVaultTasks}
          onOpenNoteCompare={handleOpenNoteCompare}
          onOpenSerendipity={() => setActiveModal('serendipity')}
          onOpenThemeCreator={handleOpenThemeCreator}
          onOpenWritingSprint={() => setActiveModal('writing_sprint')}
          onOpenIdeaSpark={() => setActiveModal('idea_spark')}
          onOpenThoughtMatrix={() => setActiveModal('thought_matrix')}
          onOpenCornellNotes={() => setActiveModal('cornell_notes')}
          onOpenPomodoroFlow={() => setActiveModal('pomodoro_flow')}
          onOpenZettelkasten={() => setActiveModal('zettelkasten_studio')}
          onOpenChronoCapsule={() => setActiveModal('chrono_capsule')}
          onOpenSynthesisMatrix={() => setActiveModal('synthesis_matrix')}
          onOpenVoiceMemoStudio={() => setActiveModal('voice_memo_studio')}
          onOpenMindMapStudio={() => setActiveModal('mind_map_studio')}
          onOpenMacroAutomation={() => setActiveModal('macro_automation')}
          onOpenVaultStats={() => setActiveModal('vault_stats')}
          onOpenFlashcards={handleOpenFlashcards}
          onOpenPresentationStudio={() => setActiveModal('presentation_studio')}
          onOpenReactiveSandbox={() => setActiveModal('reactive_sandbox')}
          onDeleteSavedSearch={handleDeleteSavedSearch}
          onEmptyTrash={handleEmptyTrash}
          compactMode={Boolean(settings.compactMode)}
        />

        {/* Persistent Multi-Pane Workspace */}
        <main
          id="main-content"
          tabIndex={-1}
          role="main"
          aria-label="Main content workspace"
          className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 lg:pb-0 focus:outline-none"
        >
          <WorkspaceContainer
            notes={filteredNotes}
            allNotes={notes}
            folders={folders}
            settings={settings}
            onSaveNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onDuplicateNote={handleDuplicateNote}
            onOpenDailyDate={(date) => handleOpenDailyNote(date)}
            onOpenPersonalization={() => setActiveModal('personalization')}
            onSaveAsTemplate={(n) => handleOpenTemplates(n)}
            onCompareNote={(n) => handleOpenNoteCompare(n.id)}
            onOpenDrawingModal={(cb) => {
              setDrawingSaveCallback(() => cb);
              setActiveModal('drawing');
            }}
            onCreateNoteWithTitle={async (newTitle) => {
              const newDraft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
                title: newTitle,
                content: '',
                type: 'text',
                checklist: [],
                tags: [],
                color: 'default',
                folderId: null,
                pinned: false,
                archived: false,
                trashed: false,
                reminderDate: null,
                images: [],
              };
              const created = await handleCreateNote(newDraft);
              openNote(created.id, created.title);
            }}
            onOpenLiteratureNote={async (litNote) => {
              await handleCreateNote(litNote);
            }}
            onRenderHome={renderHomeFeed}
            onOpenNewNote={() => handleCreateNewBlankNote('text')}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (P28) */}
      <MobileBottomBar
        filter={filter}
        onNavigateHome={() => {
          setFilter((prev) => ({
            ...(prev || DEFAULT_FILTER),
            scope: 'active',
            selectedFolderId: null,
            selectedTag: null,
            selectedColor: null,
            selectedMonth: null,
            searchQuery: '',
          }));
          openHome();
          a11yAnnouncer.announce('Navigated to Notes feed');
        }}
        onOpenSearch={() => {
          setIsCommandPaletteOpen(true);
          a11yAnnouncer.announce('Search and Command Palette opened');
        }}
        onOpenQuickCapture={() => handleOpenQuickCapture()}
        onOpenDailyNote={() => handleOpenDailyNote(new Date())}
        onOpenNewNote={() => handleCreateNewBlankNote('text')}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />

      {/* TRUE DIALOG MODALS */}
      {/* 1. Drawing Sketch Modal */}
      {activeModal === 'drawing' && (
        <DrawingModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSave={(dataUrl) => {
            if (drawingSaveCallback) {
              drawingSaveCallback(dataUrl);
            }
          }}
        />
      )}

      {/* Idea Spark Combinator Modal */}
      {activeModal === 'idea_spark' && (
        <IdeaSparkModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateSynthesizedNote={async (title, content, linkedIds) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'default',
              folderId: null,
              tags: ['spark', 'synthesis'],
              isFavorite: false,
              pinned: false,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
              linkedNoteIds: linkedIds,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
          }}
        />
      )}

      {/* Writing Sprint & Flow Arena Modal */}
      {activeModal === 'writing_sprint' && (
        <WritingSprintModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSaveAsNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'default',
              folderId: null,
              tags,
              isFavorite: false,
              pinned: false,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
          }}
        />
      )}

      {/* Thought Matrix · 2x2 Decision & Priority Studio (Feature 9) */}
      {activeModal === 'thought_matrix' && (
        <ThoughtMatrixModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateSynthesizedNote={async (title, content, linkedIds) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'indigo',
              folderId: null,
              tags: ['matrix', 'strategy', 'decision', 'priority'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
              linkedNoteIds: linkedIds,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
          }}
        />
      )}

      {/* Cornell Notes · Structured Study & Active Recall Studio (Feature 10) */}
      {activeModal === 'cornell_notes' && (
        <CornellNotesModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateSynthesizedNote={async (title, content, linkedIds) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'purple',
              folderId: null,
              tags: ['cornell', 'study', 'active-recall', 'flashcard'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
              linkedNoteIds: linkedIds,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
          }}
        />
      )}

      {/* Pomodoro Deep Work Flow & Interstitial Journaling Hub (P1) */}
      {activeModal === 'pomodoro_flow' && (
        <PomodoroFlowModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onAppendToNote={async (noteId, appendContent) => {
            const targetNote = notes.find((n) => n.id === noteId);
            if (targetNote) {
              const updatedContent = `${targetNote.content}${appendContent}`;
              await handleUpdateNote({
                ...targetNote,
                content: updatedContent,
                updatedAt: new Date().toISOString(),
              });
              a11yAnnouncer.announce('Appended interstitial log to note');
            }
          }}
          onCreateSessionNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'red',
              folderId: null,
              tags: tags || ['pomodoro', 'deepwork', 'interstitial'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
            a11yAnnouncer.announce('Created deep work log note');
          }}
        />
      )}

      {/* Zettelkasten Atomic Slip-Box & Concept Extraction Studio (P2) */}
      {activeModal === 'zettelkasten_studio' && (
        <ZettelkastenModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateAtomicNote={async (title, content, tags, sourceNoteId, updatedSourceContent) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'amber',
              folderId: null,
              tags: tags || ['zettel', 'permanent'],
              isFavorite: false,
              pinned: false,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);

            // If source note was updated with backlink transclusion
            if (sourceNoteId && updatedSourceContent) {
              const src = notes.find((n) => n.id === sourceNoteId);
              if (src) {
                await handleUpdateNote({
                  ...src,
                  content: updatedSourceContent,
                  updatedAt: new Date().toISOString(),
                });
              }
            }

            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created atomic zettel "${created.title}"`);
          }}
          onOpenNote={(noteId) => {
            const target = notes.find((n) => n.id === noteId);
            if (target) {
              openNote(target.id, target.title);
            }
          }}
        />
      )}

      {/* Chrono Capsule & Spaced Incremental Reading Studio (P3) */}
      {activeModal === 'chrono_capsule' && (
        <ChronoCapsuleModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onOpenNote={(noteId) => {
            const target = notes.find((n) => n.id === noteId);
            if (target) {
              openNote(target.id, target.title);
            }
          }}
          onCreateReflectionNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'purple',
              folderId: null,
              tags: tags || ['chrono-capsule', 'reflection'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created reflection note "${created.title}"`);
          }}
        />
      )}

      {/* Multi-Note Parallel Comparison & Synthesis Matrix (P4) */}
      {activeModal === 'synthesis_matrix' && (
        <SynthesisMatrixModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateSynthesisNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'teal',
              folderId: null,
              tags: tags || ['synthesis', 'comparison'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created synthesis note "${created.title}"`);
          }}
          onOpenNote={(noteId) => {
            const target = notes.find((n) => n.id === noteId);
            if (target) {
              openNote(target.id, target.title);
            }
          }}
        />
      )}

      {/* Voice Memo Transcriber & Audio Snippet Studio (P5) */}
      {activeModal === 'voice_memo_studio' && (
        <VoiceMemoStudioModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateVoiceNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'rose',
              folderId: null,
              tags: tags || ['voice-memo', 'audio'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created voice note "${created.title}"`);
          }}
          onAppendToDailyNote={async (appendContent) => {
            const todayDaily = dailyNotesService.findDailyNote(notes, new Date());
            if (todayDaily) {
              const updated = `${todayDaily.content}${appendContent}`;
              await handleUpdateNote({
                ...todayDaily,
                content: updated,
                updatedAt: new Date().toISOString(),
              });
              a11yAnnouncer.announce('Appended voice memo to daily note');
            }
          }}
        />
      )}

      {/* Visual Mind Map & Concept Tree Studio (P6) */}
      {activeModal === 'mind_map_studio' && (
        <MindMapStudioModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onSaveToNote={async (noteId, updatedContent) => {
            const targetNote = notes.find((n) => n.id === noteId);
            if (targetNote) {
              await handleUpdateNote({
                ...targetNote,
                content: updatedContent,
                updatedAt: new Date().toISOString(),
              });
              a11yAnnouncer.announce('Updated note outline from mind map');
            }
          }}
          onCreateNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'cyan',
              folderId: null,
              tags: tags || ['mindmap', 'outline'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created mind map note "${created.title}"`);
          }}
        />
      )}

      {/* Hotkey Super-Palette & Macro Automation Engine (P7) */}
      {activeModal === 'macro_automation' && (
        <MacroAutomationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          executionContext={{
            createNote: async (title, content, tags) => {
              const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
                title,
                content,
                type: 'text',
                color: 'amber',
                folderId: null,
                tags: tags || ['macro'],
                isFavorite: false,
                pinned: true,
                archived: false,
                trashed: false,
                checklist: [],
                images: [],
                reminderDate: null,
              };
              const created = await handleCreateNote(newNote);
              openNote(created.id, created.title);
              a11yAnnouncer.announce(`Macro created note "${created.title}"`);
              return created;
            },
            appendDailyNote: async (appendContent) => {
              const todayDaily = dailyNotesService.findDailyNote(notes, new Date());
              if (todayDaily) {
                const updated = `${todayDaily.content}${appendContent}`;
                await handleUpdateNote({
                  ...todayDaily,
                  content: updated,
                  updatedAt: new Date().toISOString(),
                });
                a11yAnnouncer.announce('Macro updated daily note');
              } else {
                const dateTitle = new Date().toISOString().slice(0, 10);
                const created = await handleCreateNote({
                  title: dateTitle,
                  content: `# 📅 Daily Note: ${dateTitle}\n\n${appendContent}`,
                  type: 'text',
                  color: 'default',
                  folderId: null,
                  tags: ['daily-notes'],
                  isFavorite: false,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  checklist: [],
                  images: [],
                  reminderDate: null,
                });
                openNote(created.id, created.title);
              }
            },
            openModal: (modalName: any, payload: any) => {
              setActiveModal(modalName);
              a11yAnnouncer.announce(`Macro opened tool: ${modalName}`);
            },
            playSound: () => {
              soundscapeService.playCompletionChime();
            },
            fireConfetti: () => {
              fireConfetti();
            },
            copyText: async (text: string) => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {}
            },
          }}
        />
      )}

      {/* Serendipity Oracle Modal */}
      {activeModal === 'serendipity' && (
        <SerendipityModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onOpenNote={(note) => {
            openNote(note.id, note.title);
          }}
          onCreateReflectionNote={async (title, content, tags) => {
            const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
              title,
              content,
              type: 'text',
              color: 'default',
              folderId: null,
              tags,
              isFavorite: false,
              pinned: false,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            };
            const created = await handleCreateNote(newNote);
            openNote(created.id, created.title);
          }}
        />
      )}

      {/* Vault Statistics & 52-Week Writing Activity Heatmap Modal */}
      {activeModal === 'vault_stats' && (
        <VaultStatsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onOpenNote={(note) => {
            openNote(note.id, note.title);
          }}
        />
      )}

      {/* Integrated Flashcard Review & Spaced Repetition (SRS) Modal */}
      {activeModal === 'flashcard_review' && (
        <FlashcardReviewModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setFlashcardReviewNoteId(undefined);
          }}
          notes={notes}
          folders={folders}
          initialNoteId={flashcardReviewNoteId}
          onUpdateNoteContent={async (noteId, updatedContent) => {
            const targetNote = notes.find((n) => n.id === noteId);
            if (targetNote) {
              await handleUpdateNote({
                ...targetNote,
                content: updatedContent,
                updatedAt: new Date().toISOString(),
              });
              a11yAnnouncer.announce('Updated note with flashcards');
            }
          }}
          onOpenNote={(noteId) => {
            setActiveModal(null);
            setFlashcardReviewNoteId(undefined);
            const targetNote = notes.find((n) => n.id === noteId);
            openNote(noteId, targetNote?.title || 'Note');
          }}
        />
      )}

      {/* Markdown Presentation & Slide Deck Studio (P9) */}
      {activeModal === 'presentation_studio' && (
        <PresentationStudioModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateNote={async (newNoteData) => {
            const created = await handleCreateNote({
              title: newNoteData.title || 'Untitled Presentation',
              content: newNoteData.content || '',
              type: 'text',
              color: 'purple',
              folderId: newNoteData.folderId || null,
              tags: newNoteData.tags || ['presentation', 'slides', 'p9'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            });
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created presentation note "${created.title}"`);
            return created;
          }}
          onOpenNote={(noteId, title) => {
            setActiveModal(null);
            openNote(noteId, title);
          }}
        />
      )}

      {/* Reactive Computational Sandbox & Formula Matrix (P10) */}
      {activeModal === 'reactive_sandbox' && (
        <ReactiveSandboxModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onCreateNote={async (newNoteData) => {
            const created = await handleCreateNote({
              title: newNoteData.title || 'Untitled Model',
              content: newNoteData.content || '',
              type: 'text',
              color: 'cyan',
              folderId: newNoteData.folderId || null,
              tags: newNoteData.tags || ['compute', 'data', 'finance', 'p10'],
              isFavorite: false,
              pinned: true,
              archived: false,
              trashed: false,
              checklist: [],
              images: [],
              reminderDate: null,
            });
            openNote(created.id, created.title);
            a11yAnnouncer.announce(`Created computational note "${created.title}"`);
            return created;
          }}
          onOpenNote={(noteId, title) => {
            setActiveModal(null);
            openNote(noteId, title);
          }}
        />
      )}

      {/* Quick Switcher & Instant Jump Modal (QoL 9) */}
      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        notes={notes}
        onSelectNote={(noteId, title) => {
          openNote(noteId, title);
        }}
      />

      {/* Vault Health & Integrity Doctor Modal */}
      <VaultHealthDoctorModal
        isOpen={isHealthDoctorOpen}
        onClose={() => setIsHealthDoctorOpen(false)}
        notes={notes}
        onSaveNote={handleUpdateNote}
        onOpenNote={(noteId, title) => {
          openNote(noteId, title);
        }}
      />

      {/* Complete Standalone Vault Archive Exporter Modal */}
      <VaultArchiveModal
        isOpen={isVaultArchiveOpen}
        onClose={() => setIsVaultArchiveOpen(false)}
        notes={notes}
        folders={folders}
      />

      {/* 2. Google Takeout / Markdown Import Modal */}
      {activeModal === 'import' && (
        <TakeoutImportModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          folders={folders}
          onImportNotes={handleImportNotes}
        />
      )}

      {/* 3. Directory Sync & Backups Modal */}
      {activeModal === 'sync' && (
        <SyncModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          settings={settings}
          onNotesUpdated={(updated) => {
            setNotes(updated);
            vaultManager.rebuildIndex(updated);
          }}
          onFoldersUpdated={(updated) => setFolders(updated)}
          onSavedSearchesUpdated={(updated) => setSavedSearches(updated)}
          onSettingsUpdated={(updated) => setSettings(updated)}
          onOpenDeviceSync={() => setActiveModal('device_sync')}
        />
      )}

      {/* 4. Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearAllNotes={handleClearAllNotes}
          totalNotesCount={notes.length}
          onOpenThemeCreator={handleOpenThemeCreator}
          onDeleteCustomTheme={handleDeleteCustomTheme}
          onOpenShortcuts={() => setActiveModal('shortcuts')}
          onOpenVaultDoctor={() => setActiveModal('vault_doctor')}
          onOpenEncryption={() => setActiveModal('vault_encryption')}
          onOpenRecoveryCenter={() => setActiveModal('recovery_center')}
          onOpenDeviceSync={() => setActiveModal('device_sync')}
          onOpenExtensionSettings={() => setActiveModal('extension_settings')}
          onOpenMigrationHub={() => setActiveModal('migration_hub')}
          onOpenPluginManager={() => setActiveModal('plugin_manager')}
          onOpenAISettings={() => setActiveModal('ai_settings')}
          onOpenPersonalization={() => setActiveModal('personalization')}
          onOpenIntegrationsHub={() => setActiveModal('v2_unified_interoperability')}
          onOpenFilesystemBridge={() => setActiveModal('filesystem_bridge')}
          onOpenDesktopDiagnostics={() => setActiveModal('desktop_diagnostics')}
          onOpenMobileDiagnostics={() => setActiveModal('mobile_diagnostics')}
          onOpenMobileShareInbox={() => setActiveModal('mobile_share_inbox')}
          onOpenV2Migration={() => setActiveModal('v2_migration')}
          onOpenV2ModuleLauncher={() => setActiveModal('v2_module_launcher')}
          isVaultLocked={isVaultLocked}
        />
      )}

      {/* 4b. Theme Creator Modal */}
      {activeModal === 'theme_creator' && (
        <ThemeCreatorModal
          isOpen={true}
          onClose={() => {
            setActiveModal('settings');
            setEditingCustomTheme(null);
          }}
          editingTheme={editingCustomTheme}
          onSaveTheme={(savedTheme, andApply) => {
            handleSaveCustomTheme(savedTheme, andApply);
          }}
          onDeleteTheme={(themeId) => {
            handleDeleteCustomTheme(themeId);
            setActiveModal('settings');
          }}
          currentSettings={settings}
        />
      )}

      {/* Browser Extension Settings & Capture Bridge Modal (Phase P34) */}
      {activeModal === 'extension_settings' && (
        <ExtensionSettingsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onDrainStagedCaptures={async () => {
            return await captureBridgeService.drainStagedCaptures({
              notes,
              folders,
              settings,
              activeNote: activeWorkspaceNote,
              createNote: handleCreateNote,
              saveNote: handleUpdateNote,
              createFolder: handleCreateFolder,
              openNote: (id, t) => openNote(id, t),
            });
          }}
        />
      )}

      {/* P2P Device Sync Modal (Phase P32) */}
      {activeModal === 'device_sync' && (
        <DeviceSyncModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          settings={settings}
          onVaultUpdated={(updatedNotes, updatedFolders) => {
            setNotes(updatedNotes);
            if (updatedFolders) setFolders(updatedFolders);
            vaultManager.rebuildIndex(updatedNotes);
          }}
        />
      )}

      {/* 5. Manage Folders Modal */}
      {activeModal === 'manage_folders' && (
        <ManageFoldersModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      )}

      {/* 5b. Tag Manager Modal */}
      {activeModal === 'manage_tags' && (
        <TagManagerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onRenameTag={handleRenameTagAcrossNotes}
          onDeleteTag={handleDeleteTagAcrossNotes}
          onBatchMergeTags={handleBatchMergeTags}
          onBatchDeleteTags={handleBatchDeleteTags}
          onSelectTagFilter={(tag) => {
            setFilter((prev) => ({
              ...(prev || DEFAULT_FILTER),
              selectedTag: tag,
              selectedFolderId: null,
              selectedColor: null,
              selectedMonth: null,
              searchQuery: '',
              scope: 'active',
            }));
          }}
          onOpenNote={(noteId, title) => {
            openNote(noteId, title);
          }}
        />
      )}

      {/* 6. Save Search Preset Modal */}
      {activeModal === 'save_search' && (
        <SaveSearchModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          currentQuery={filter.searchQuery}
          onSave={handleSaveSearch}
        />
      )}

      {/* 7. Keyboard Shortcuts Guide Modal */}
      {activeModal === 'shortcuts' && (
        <KeyboardShortcutsModal isOpen={true} onClose={() => setActiveModal(null)} />
      )}

      {/* 8. Note Templates Library Modal */}
      {activeModal === 'templates' && (
        <TemplateModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setTemplateTargetNote(null);
          }}
          onSelectTemplate={handleSelectTemplate}
          allNotes={notes}
          currentNoteToSave={templateTargetNote}
        />
      )}

      {/* 8b. Vault Tasks & Global Action Items Modal */}
      {activeModal === 'vault_tasks' && (
        <VaultTasksModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onOpenNote={(note) => {
            setActiveModal(null);
            openNote(note.id, note.title);
          }}
          onUpdateNote={handleUpdateNote}
          initialPerspective={vaultTasksPerspective}
        />
      )}

      {/* 8c. Note Compare & Visual Merge Studio Modal */}
      {activeModal === 'note_compare' && (
        <NoteCompareModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setCompareNoteAId(null);
            setCompareNoteBId(null);
          }}
          allNotes={notes}
          folders={folders}
          initialNoteAId={compareNoteAId}
          initialNoteBId={compareNoteBId}
          onMergeComplete={async (surviving, discarded, updatedNotes) => {
            const updatedMap = new Map(updatedNotes.map((n) => [n.id, n]));
            setNotes((prev) => prev.map((n) => updatedMap.get(n.id) || n));
            for (const n of updatedNotes) {
              vaultManager.onNoteUpdated(n);
              await storageService.saveNote(n);
              crdtSyncCoordinator.handleLocalNoteSaved(n);
              semanticSearchService.onNoteSaved(n);
            }
            filesystemBridgeService.triggerDebouncedSync();
            a11yAnnouncer.announce(`Merged into "${surviving.title || 'Note'}"`);
          }}
          onOpenNote={(nId) => {
            setActiveModal(null);
            openNote(nId);
          }}
        />
      )}

      {/* 8d. Zen Mode Distraction-Free Modal */}
      {activeModal === 'zen_mode' && (
        <ZenModeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          note={activeWorkspaceNote || notes.find((n) => !n.trashed && !n.archived) || {
            id: 'zen-draft',
            title: '',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
          }}
          onUpdateContent={async (title, content) => {
            const target = activeWorkspaceNote || notes.find((n) => !n.trashed && !n.archived);
            if (target) {
              await handleUpdateNote({ ...target, title, content, updatedAt: new Date().toISOString() });
            } else {
              await handleCreateNote({
                title,
                content,
                type: 'text',
                color: 'default',
                folderId: null,
                tags: [],
                isFavorite: false,
                pinned: false,
                archived: false,
                trashed: false,
                checklist: [],
                images: [],
                reminderDate: null,
              });
            }
          }}
        />
      )}

      {/* 9. Passcode Protected Note Unlock Modal */}
      {activeModal === 'unlock_note' && pendingUnlockNote && (
        <LockNoteModal
          isOpen={true}
          note={pendingUnlockNote}
          onClose={() => {
            setActiveModal(null);
            setPendingUnlockNote(null);
          }}
          onNoteUnlocked={() => {
            const n = pendingUnlockNote;
            setPendingUnlockNote(null);
            openNote(n.id, n.title);
          }}
          onUpdateLockState={(isLocked, lockHash) => {
            const updated = {
              ...pendingUnlockNote,
              isLocked,
              lockHash,
              updatedAt: new Date().toISOString(),
            };
            handleUpdateNote(updated);
          }}
        />
      )}

      {/* Global Hybrid Semantic Search Modal */}
      <GlobalSearchModal
        isOpen={activeModal === 'vault_search' || activeModal === 'global_search'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        onOpenNote={(noteId, title, options) => {
          const target = notes.find((n) => n.id === noteId);
          if (target) {
            handleOpenNote(target, options?.split);
          } else {
            openNote(noteId, title, options);
          }
        }}
        initialQuery={filter.searchQuery || ''}
      />

      {/* 10. Vault Doctor and Storage Diagnostics (P14) */}
      <VaultDoctorModal
        isOpen={activeModal === 'vault_doctor'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        savedSearches={savedSearches}
        settings={settings}
        vaultIndex={vaultManager.getIndex()}
        onUpdateNotes={(updated) => {
          setNotes(updated);
          vaultManager.rebuildIndex(updated);
        }}
        onUpdateFolders={(updated) => setFolders(updated)}
        onSelectNote={(noteId) => {
          const target = notes.find((n) => n.id === noteId);
          if (target) {
            handleOpenNote(target);
          }
        }}
        onOpenCanvas={() => {
          openCanvas();
        }}
      />

      {/* 11. Vault Full Client-Side Encryption Setup & Settings (P17) */}
      {activeModal === 'vault_encryption' && (
        <VaultEncryptionModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          savedSearches={savedSearches}
          settings={settings}
          onVaultStateChange={async () => {
            await reloadData();
          }}
        />
      )}

      {/* 11b. Data Resilience, Recovery Points & Disaster Recovery (P29) */}
      {activeModal === 'recovery_center' && (
        <RecoveryCenterModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onRestoreSnapshot={async () => {
            await reloadData();
          }}
        />
      )}

      {/* 11c. Security Posture Audit & Self-Tests (P30) */}
      {activeModal === 'security_audit' && (
        <SecurityAuditModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 11d. Academic Reference Management Modals (Phase P35) */}
      {activeModal === 'reference_add_identifier' && (
        <AddByIdentifierModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onReferenceAdded={(ref) => {
            setActiveModal(null);
            openReferences();
          }}
        />
      )}

      {activeModal === 'reference_import_bibtex' && (
        <BibTeXImportModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onImportComplete={() => {
            setActiveModal(null);
            openReferences();
          }}
        />
      )}

      {activeModal === 'reference_duplicates' && (
        <DuplicateReviewModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onMergeComplete={() => {
            setActiveModal(null);
            openReferences();
          }}
        />
      )}

      {/* 12. Full Vault Unlock Screen Modal (shown when vault is locked) */}
      <VaultLockModal isOpen={isVaultLocked} onUnlocked={handleVaultUnlocked} />

      {/* 13. Universal Command Palette Modal (P22) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        context={commandContext}
      />

      {/* 14. Quick Capture & Fleeting Notes Modal (P23) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => {
          setIsQuickCaptureOpen(false);
          setQuickCaptureInitialPayload(undefined);
        }}
        notes={notes}
        folders={folders}
        settings={settings}
        activeNote={activeWorkspaceNote}
        initialPayload={quickCaptureInitialPayload}
        onCreateNote={handleCreateNote}
        onSaveNote={handleUpdateNote}
        onCreateFolder={handleCreateFolder}
        onOpenCapturedNote={(note) => {
          openNote(note.id, note.title);
        }}
      />

      {/* 15. Voice & Audio Notes Recorder Modal (P26) */}
      <AudioRecorderModal
        isOpen={activeModal === 'audio_recorder'}
        onClose={() => setActiveModal(null)}
        activeNoteId={activeWorkspaceNote?.id}
        onSaveAudio={async (attachment, markdownSnippet, noteTitle) => {
          if (activeWorkspaceNote) {
            const updated = {
              ...activeWorkspaceNote,
              content: `${activeWorkspaceNote.content}\n\n${markdownSnippet}`,
              updatedAt: new Date().toISOString(),
            };
            await handleUpdateNote(updated);
          } else {
            const newNote = await handleCreateNote({
              title: noteTitle || `Audio: ${attachment.filename}`,
              content: `# Audio Memo\n\n${markdownSnippet}\n\n*Recorded: ${new Date().toLocaleString()}*`,
              type: 'text',
              tags: ['audio', 'memo'],
              checklist: [],
              color: 'default',
              trashed: false,
              reminderDate: undefined,
              images: [],
              pinned: false,
              archived: false,
              folderId: null,
            });
            openNote(newNote.id, newNote.title);
          }
        }}
      />

      {/* 16. Automation Suggestion Toast (P36) */}
      <AutomationSuggestionToast suggestions={automationSuggestions} />

      {/* 17. Static Site Publication & Export Manager Modal (P39) */}
      <PublicationManagerModal
        isOpen={activeModal === 'publication_manager'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        initialNoteId={activeWorkspaceNote?.id}
      />

      {/* 18. Single Note Export & Print Modal (P39) */}
      <SingleNoteExportModal
        isOpen={activeModal === 'single_note_export'}
        onClose={() => {
          setActiveModal(null);
          setSingleNoteExportTarget(null);
        }}
        note={singleNoteExportTarget || activeWorkspaceNote}
        allNotes={notes}
        folders={folders}
      />

      {/* 18b. Unified Export, Publishing & Sharing Center Modal (V1.8) */}
      <ExportCenterModal
        isOpen={activeModal === 'export_center'}
        onClose={() => {
          setActiveModal(null);
          setExportCenterTargetNoteId(undefined);
        }}
        notes={notes}
        folders={folders}
        settings={settings}
        savedSearches={savedSearches}
        initialNoteId={exportCenterTargetNoteId || activeWorkspaceNote?.id}
        onOpenRecoveryCenter={() => setActiveModal('recovery_center')}
      />

      {/* 18c. Quick Share Sheet Modal (V1.8) */}
      <ShareSheetModal
        isOpen={activeModal === 'share_sheet'}
        onClose={() => {
          setActiveModal(null);
          setShareSheetTarget(null);
        }}
        note={shareSheetTarget || activeWorkspaceNote}
        allNotes={notes}
        onOpenFullExportCenter={() => {
          setActiveModal('export_center');
        }}
      />

      {/* 19. Universal Import & Migration Hub Modal (P40) */}
      <MigrationHubModal
        isOpen={activeModal === 'migration_hub'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        settings={settings}
        onVaultUpdated={async () => {
          await reloadData();
        }}
      />

      {/* 20. Sandboxed Plugin Architecture & Extensions Manager Modal (P41) */}
      <PluginManagerModal
        isOpen={activeModal === 'plugin_manager'}
        onClose={() => setActiveModal(null)}
        onOpenPluginView={(pluginId, viewId) => {
          setActivePluginWorkspaceView({ pluginId, viewId });
        }}
      />

      {/* 21. Knowledge Copilot AI Workspace Modal (P42) */}
      {activeModal === 'ai_copilot' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="copilot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-4xl w-full h-[82vh] overflow-hidden flex flex-col">
            <AICopilotWorkspace
              allNotes={notes}
              folders={folders}
              activeNote={activeWorkspaceNote}
              onOpenNote={(noteId) => {
                setActiveModal(null);
                openNote(noteId, undefined, { split: true });
              }}
              onCreateNewNote={async (title, content) => {
                const newNote = await handleCreateNote({
                  title,
                  content,
                  type: 'text',
                  tags: ['ai-synthesis', 'copilot'],
                  checklist: [],
                  color: 'default',
                  pinned: false,
                  archived: false,
                  trashed: false,
                  folderId: null,
                  reminderDate: null,
                  images: [],
                  audios: [],
                });
                setActiveModal(null);
                openNote(newNote.id, newNote.title);
              }}
              onInsertIntoNote={async (text) => {
                if (activeWorkspaceNote) {
                  const updated = {
                    ...activeWorkspaceNote,
                    content: `${activeWorkspaceNote.content}\n\n${text}`,
                    updatedAt: new Date().toISOString(),
                  };
                  await handleUpdateNote(updated);
                  setActiveModal(null);
                }
              }}
              onOpenSettings={() => setActiveModal('ai_settings')}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}

      {/* 22. AI Writing Assistant Modal (P42) */}
      {activeModal === 'ai_writing_assistant' && (
        <AIWritingAssistantModal
          activeNote={activeWorkspaceNote}
          selectedText={window.getSelection()?.toString() || undefined}
          allNotes={notes}
          onApplyAction={async (action) => {
            if (activeWorkspaceNote) {
              let updatedContent = activeWorkspaceNote.content;
              if (action.type === 'replace_selection' && action.originalText) {
                updatedContent = updatedContent.replace(action.originalText, action.proposedText);
              } else {
                updatedContent = `${updatedContent}\n\n${action.proposedText}`;
              }
              await handleUpdateNote({
                ...activeWorkspaceNote,
                content: updatedContent,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          onCreateNewNote={async (title, content) => {
            const newNote = await handleCreateNote({
              title,
              content,
              type: 'text',
              tags: ['ai-writing'],
              checklist: [],
              color: 'default',
              pinned: false,
              archived: false,
              trashed: false,
              folderId: null,
              reminderDate: null,
              images: [],
              audios: [],
            });
            openNote(newNote.id, newNote.title);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 23. AI Settings Panel Modal (P42) */}
      {activeModal === 'ai_settings' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 id="ai-settings-title" className="font-semibold text-sm">
                AI Knowledge Copilot Settings
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <AISettingsPanel />
            </div>
          </div>
        </div>
      )}

      {/* 24. Collections & Databases Hub Modal (P43) */}
      {activeModal === 'collections_index' && (
        <CollectionsIndexModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          folders={folders}
          tags={tagsList.map((t) => t.name)}
          onOpenCollection={(colId) => {
            openCollection(colId);
            setActiveModal(null);
          }}
        />
      )}

      {/* 25. Filesystem Vault Bridge Settings Modal (P45) */}
      {activeModal === 'filesystem_bridge' && (
        <FilesystemBridgeSettingsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          notes={notes}
          folders={folders}
          onSaveNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onOpenReviewModal={() => {
            const plan = filesystemBridgeService.getPendingPlan();
            if (plan) {
              setFilesystemPlan(plan);
              setActiveModal('filesystem_review');
            }
          }}
          onOpenConflictModal={() => {
            const conflicts = filesystemBridgeService.getConflicts();
            if (conflicts.length > 0) {
              setFilesystemConflicts(conflicts);
              setActiveModal('filesystem_conflicts');
            }
          }}
        />
      )}

      {/* 26. Filesystem Reconciliation Safety Review Modal (P45) */}
      {activeModal === 'filesystem_review' && filesystemPlan && (
        <FilesystemReconciliationReviewModal
          isOpen={true}
          plan={filesystemPlan}
          notes={notes}
          folders={folders}
          onClose={() => {
            setActiveModal(null);
            setFilesystemPlan(null);
          }}
          onSaveNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {/* 27. Filesystem 3-Way Conflict Resolution Modal (P45) */}
      {activeModal === 'filesystem_conflicts' && filesystemConflicts.length > 0 && (
        <FilesystemConflictModal
          isOpen={true}
          conflicts={filesystemConflicts}
          onSaveNote={handleUpdateNote}
          onClose={() => {
            setActiveModal(null);
            setFilesystemConflicts([]);
          }}
        />
      )}

      {/* 28. Desktop & Native Subsystem Diagnostics Modal (P46) */}
      <DesktopDiagnosticsModal
        isOpen={activeModal === 'desktop_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 29. Dedicated Global Quick Capture Window / Modal (P46) */}
      <DesktopQuickCaptureWindow
        isOpen={activeModal === 'desktop_quick_capture'}
        onClose={() => setActiveModal(null)}
        isVaultLocked={isVaultLocked}
        onUnlockVault={() => {
          setActiveModal(null);
        }}
        onSaveCapture={async (content, destination, title) => {
          if (destination === 'daily') {
            const { note } = await dailyNotesService.getOrCreateDailyNote({
              date: new Date(),
              notes,
              folders,
              appSettings: settings,
              createNote: handleCreateNote,
              createFolder: handleCreateFolder,
            });
            const updated = {
              ...note,
              content: `${note.content}\n\n- [ ] ${content} *(Captured ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})*`,
              updatedAt: new Date().toISOString(),
            };
            await handleUpdateNote(updated);
            openNote(updated.id, updated.title);
          } else if (destination === 'new_note') {
            const firstLine = content.split('\n')[0] || '';
            const newNote = await handleCreateNote({
              title: title || firstLine.replace(/^#*\s*/, '').slice(0, 40) || 'Quick Capture',
              content,
              type: 'text',
              tags: ['quick-capture'],
              checklist: [],
              color: 'default',
              pinned: false,
              archived: false,
              trashed: false,
              folderId: null,
              reminderDate: undefined,
              images: [],
            });
            openNote(newNote.id, newNote.title);
          } else {
            // Inbox
            let inboxFolder = folders.find((f) => f.name.toLowerCase() === 'inbox');
            let folderId = inboxFolder?.id || null;
            if (!inboxFolder) {
              const newF: Folder = {
                id: `folder-inbox-${Date.now()}`,
                name: 'Inbox',
                color: '#f59e0b',
                createdAt: new Date().toISOString(),
              };
              await handleCreateFolder(newF.name, newF.color);
              folderId = newF.id;
            }
            const firstLine = content.split('\n')[0] || '';
            const newNote = await handleCreateNote({
              title: title || firstLine.replace(/^#*\s*/, '').slice(0, 40) || 'Captured Note',
              content,
              type: 'text',
              tags: ['inbox', 'quick-capture'],
              checklist: [],
              color: 'default',
              pinned: false,
              archived: false,
              trashed: false,
              folderId,
              reminderDate: undefined,
              images: [],
            });
            openNote(newNote.id, newNote.title);
          }
        }}
      />


      {/* Sandboxed Plugin Workspace View Modal / Overlay */}
      {activePluginWorkspaceView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-3xl w-full h-[75vh] overflow-hidden flex flex-col">
            {(() => {
              const plugin = pluginRegistry.getPlugin(activePluginWorkspaceView.pluginId);
              if (!plugin) return null;
              return (
                <PluginWorkspaceView
                  plugin={plugin}
                  viewId={activePluginWorkspaceView.viewId}
                  theme={settings.theme === 'dark' ? 'dark' : 'light'}
                  onClose={() => setActivePluginWorkspaceView(null)}
                />
              );
            })()}
          </div>
        </div>
      )}
      {/* 30. Mobile Diagnostics & Doctor Modal (P47) */}
      <MobileDiagnosticsModal
        isOpen={activeModal === 'mobile_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 31. Mobile Share Staging Inbox Modal (P47) */}
      <MobileShareInboxModal
        isOpen={activeModal === 'mobile_share_inbox'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        settings={settings}
        isVaultLocked={isVaultLocked}
        createNote={handleCreateNote}
        saveNote={handleUpdateNote}
        createFolder={handleCreateFolder}
        openNote={(id, title) => openNote(id, title)}
      />

      {/* 32. People: Log Interaction Modal (P48) */}
      <LogInteractionModal
        isOpen={activeModal === 'people_log_interaction'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        onCreateNote={handleCreateNote}
        onSaveNote={handleUpdateNote}
      />

      {/* 33. People: vCard Import Modal (P48) */}
      <VCardImportModal
        isOpen={activeModal === 'people_import_vcard'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        onCreateNote={handleCreateNote}
        onSaveNote={handleUpdateNote}
        onCreateFolder={handleCreateFolder}
      />

      {/* 34. People: vCard Export Modal (P48) */}
      <VCardExportModal
        isOpen={activeModal === 'people_export_vcard'}
        onClose={() => setActiveModal(null)}
        notes={notes}
      />

      {/* 35. People: Native Contact Picker Modal (P48) */}
      <NativeContactPickerModal
        isOpen={activeModal === 'people_native_picker'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        onCreateNote={handleCreateNote}
        onSaveNote={handleUpdateNote}
        onCreateFolder={handleCreateFolder}
      />

      {/* 36. People: Duplicate Detection & Merge Modal (P48) */}
      <MergePeopleModal
        isOpen={activeModal === 'people_duplicates'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        onSaveNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />

      {/* 37. V1.6 Personalization & Workflows Settings Modal */}
      <PersonalizationSettingsModal
        isOpen={activeModal === 'personalization'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        onExecuteWorkflow={(preset) => {
          setActiveModal(null);
          setActiveWorkflowPreset(preset);
        }}
        onApplyWorkspacePreset={(preset) => {
          applyPreset(
            preset.leftSurface.surfaceType,
            preset.rightSurface?.surfaceType
          );
        }}
        onNavigateHome={() => {
          setActiveModal(null);
          openPlanningHome();
        }}
      />

      {/* 38. V1.6 Workflow Runner Modal */}
      <WorkflowRunnerModal
        isOpen={activeWorkflowPreset !== null}
        onClose={() => setActiveWorkflowPreset(null)}
        preset={activeWorkflowPreset}
        runtimeContext={{
          notes,
          folders,
          settings,
          openDailyNote: () => {
            handleOpenDailyNote(new Date());
          },
          openNote: (id: string, title?: string) => openNote(id, title),
          openModal: (modalName: any) => setActiveModal(modalName),
          createNote: handleCreateNote,
          saveNote: handleUpdateNote,
          createFolder: handleCreateFolder,
          applyPreset: (leftType: any, rightType?: any) => applyPreset(leftType, rightType),
          openPlanningHome,
          openUniversalInbox,
        }}
      />

      {/* 39. V1.9 Developer Observatory & Performance Diagnostics Hub */}
      <DeveloperObservatoryModal
        isOpen={activeModal === 'developer_observatory'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        onOpenNote={(note) => { setActiveModal(null); handleOpenNote(note); }}
        onSaveNote={handleUpdateNote}
        vaultLocked={isVaultLocked}
      />

      {/* 40. V2.0 Verified Migration Modal */}
      <V2MigrationModal
        isOpen={activeModal === 'v2_migration'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        savedSearches={savedSearches}
        settings={settings}
        onMigrationComplete={async () => {
          await reloadData();
        }}
      />

      {/* 41. V2.0 Modular Life Domain Launcher */}
      <V2ModuleLauncher
        isOpen={activeModal === 'v2_module_launcher'}
        onClose={() => setActiveModal(null)}
      />

      {/* 43. V2.5 Conflict Center Modal */}
      <ConflictCenterModalV2
        isOpen={activeModal === 'v2_sync_conflicts'}
        onClose={() => setActiveModal(null)}
      />

      {/* 44. V2.5 Device Manager Modal */}
      <DeviceManagerModalV2
        isOpen={activeModal === 'v2_device_manager'}
        onClose={() => setActiveModal(null)}
      />

      {/* 45. V2.5 Sync Diagnostics Modal */}
      <SyncDiagnosticsModalV2
        isOpen={activeModal === 'v2_sync_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 46. V2.6 Disaster Recovery, Backup & Storage Integrity Modal */}
      <DisasterRecoveryModalV2
        isOpen={activeModal === 'v2_disaster_recovery'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        folders={folders}
        savedSearches={savedSearches}
        settings={settings}
        onVaultReload={async () => {
          await reloadData();
        }}
      />

      {/* 47. V2.8 Security, Privacy & Adversarial Hardening Diagnostics Modal */}
      <SecurityDiagnosticsModalV2
        isOpen={activeModal === 'v2_security_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 48. V2.9 Whole-System Stabilization & Release Candidate Hub Modal */}
      <ReleaseCandidateDiagnosticsModalV2
        isOpen={activeModal === 'v2_rc_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 49. V2.10 Final Release Certification & Stable Launch Hub Modal */}
      <V2StableReleaseHubModal
        isOpen={activeModal === 'v2_stable_release_hub'}
        onClose={() => setActiveModal(null)}
      />

      {/* 50. V2.11 Post-Launch Stability & Maintenance Hub Modal */}
      <V2MaintenanceDiagnosticsModal
        isOpen={activeModal === 'v2_maintenance_diagnostics'}
        onClose={() => setActiveModal(null)}
      />

      {/* 51. V2.12 Native Platform & Ecosystem Hub Modal */}
      <V2PlatformEcosystemModal
        isOpen={activeModal === 'v2_platform_ecosystem'}
        onClose={() => setActiveModal(null)}
      />

      {/* 52. V2.13 First-Party Domain Excellence Hub Modal */}
      <V2DomainExcellenceModal
        isOpen={activeModal === 'v2_domain_excellence'}
        onClose={() => setActiveModal(null)}
      />

      {/* 53. V2.14 Quality Ceiling & V3 Readiness Hub Modal */}
      <V2QualityCeilingModal
        isOpen={activeModal === 'v2_quality_ceiling'}
        onClose={() => setActiveModal(null)}
      />

      {/* 54. V2.15 Sustainable Evolution & Power-User Efficiency Hub Modal */}
      <V2PowerUserEfficiencyModal
        isOpen={activeModal === 'v2_power_user_efficiency'}
        onClose={() => setActiveModal(null)}
      />

      {/* 55. V2.16 Open Interoperability & Ecosystem Expansion Hub Modal */}
      <V2InteroperabilityHubModal
        isOpen={activeModal === 'v2_interoperability'}
        onClose={() => setActiveModal(null)}
      />

      {/* 55b. V2.24 Unified Interoperability, Ecosystem & Freedom Center Modal */}
      <V2UnifiedInteroperabilityCenterModal
        isOpen={activeModal === 'v2_interoperability' || activeModal === 'v2_unified_interoperability'}
        onClose={() => setActiveModal(null)}
        notes={notes}
        onImportNotes={handleImportNotes}
      />

      {/* 56. V2.21 Core Experience Completion Hub Modal */}
      <V2CoreExperienceCenterModal
        isOpen={activeModal === 'v2_core_experience'}
        onClose={() => setActiveModal(null)}
      />

      {/* 57. V2.22 Personal OS Feature Completion Center Modal */}
      <V2PersonalOSCenterModal
        isOpen={activeModal === 'v2_personal_os_center'}
        onClose={() => setActiveModal(null)}
      />

      {/* 58. V2.26 Full-System Audit & Blocker Elimination Modal */}
      <V2BlockerEliminationModal
        isOpen={activeModal === 'v2_blocker_elimination'}
        onClose={() => setActiveModal(null)}
      />

      {/* 59. V2.27 Reliability, Security & Data Integrity Center Modal */}
      <V2ReliabilitySecurityModal
        isOpen={activeModal === 'v2_reliability_security'}
        onClose={() => setActiveModal(null)}
      />

      {/* 60. V2.28 Performance, Accessibility & Platform Hardening Center Modal */}
      <V2PerformanceAccessibilityModal
        isOpen={activeModal === 'v2_performance_accessibility'}
        onClose={() => setActiveModal(null)}
      />

      {/* 61. V2.29 Release Candidate 1 Center Modal */}
      <V2ReleaseCandidate1Modal
        isOpen={activeModal === 'v2_release_candidate_1'}
        onClose={() => setActiveModal(null)}
      />

      {/* 62. V2.30 Stable Ship & Gold Master Center Modal */}
      <V2StableShipModal
        isOpen={activeModal === 'v2_stable_ship'}
        onClose={() => setActiveModal(null)}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedNoteIds={selectedNoteIds}
        totalNotesCount={filteredNotes.length}
        notes={notes}
        folders={folders}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkChangeColor={handleBulkChangeColor}
        onBulkMoveFolder={handleBulkMoveFolder}
        onBulkAddTag={handleBulkAddTag}
        onBulkPin={handleBulkPin}
        onBulkFavorite={handleBulkFavorite}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onBulkRestore={handleBulkRestore}
        onBulkDeleteForever={handleBulkDeleteForever}
        onBulkDuplicate={handleBulkDuplicate}
        onBulkMerge={handleBulkMerge}
        onCompareAndMerge={() => {
          if (selectedNoteIds.length === 2) {
            handleOpenNoteCompare(selectedNoteIds[0], selectedNoteIds[1]);
          }
        }}
        onBulkExportZip={handleBulkExportZip}
        isTrashScope={filter.scope === 'trash'}
      />

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={handleScrollToTop}
          className="fixed bottom-20 right-6 z-40 p-2.5 rounded-full bg-stone-900/90 dark:bg-stone-100/90 text-white dark:text-stone-900 shadow-lg hover:shadow-xl hover:scale-105 transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* Floating Undo Trash Notification Toast */}
      {undoTrash && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-950 shadow-2xl border border-stone-800 dark:border-stone-200 animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-md"
        >
          <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium max-w-[220px] sm:max-w-xs truncate">
            Moved &ldquo;{undoTrash.title}&rdquo; to trash
          </span>
          <button
            type="button"
            onClick={handleUndoTrash}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow-xs"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoTrash(null)}
            className="p-1 rounded-md text-stone-400 hover:text-white dark:hover:text-stone-900 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 42. Mobile App-Switcher Privacy Cover (P47) */}
      <MobilePrivacyCover />

      {/* Floating Zen Focus Bar (Mini-Player Mode) */}
      <ZenFocusBar
        onOpenQuickCapture={() => handleOpenQuickCapture()}
        onOpenWritingSprint={() => setActiveModal('writing_sprint')}
      />

      {/* GSAP-Powered Gamification XP & Level Up Floating HUD Notification */}
      <XpNotificationToast
        notification={xpNotification}
        onDismiss={() => setXpNotification(null)}
      />
    </div>
  );
}

// Root Application Component providing Workspace Context
export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    viewMode: settings.defaultViewMode,
  });

  // In Hub's embedded mobile workspace the original drawer must not obscure
  // the note composer on first entry. Standalone KEEP preserves its default.
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof document === 'undefined' || !document.querySelector('[data-keep-native-host]')
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVaultEncrypted, setIsVaultEncrypted] = useState(
    vaultEncryptionService.isEncryptionEnabled()
  );
  const [isVaultLocked, setIsVaultLocked] = useState(vaultEncryptionService.isVaultLocked());

  // Initial Load from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const initData = await storageService.initialize();

      setNotes(initData.notes);
      setFolders(initData.folders);
      setSavedSearches(initData.savedSearches);
      setSettings(initData.settings);
      setFilter((prev) => ({ ...prev, viewMode: initData.settings.defaultViewMode }));

      // Initialize Derived Vault Index
      vaultManager.rebuildIndex(initData.notes);
      peopleService.rebuild(initData.notes, initData.folders);
      crdtVaultStore.ensureInitializedFromVault(initData.notes, initData.folders);

      // Dispatch P36 Automation app_open trigger
      automationEngine?.dispatchEvent?.({
        type: 'app_open',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to load vault data:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadData();
    filesystemBridgeService.initStartupHandle().catch(console.error);

    // Subscribe to encryption & lock state changes
    const unsub = vaultEncryptionService.subscribeLockStateChange((status) => {
      const isEnc = vaultEncryptionService.isEncryptionEnabled();
      setIsVaultEncrypted(isEnc);
      if (status === 'locked') {
        setIsVaultLocked(true);
        setNotes([]);
        setFolders([]);
        setSavedSearches([]);
        vaultManager.rebuildIndex([]);
        peopleService.lock();
      } else if (status === 'unlocked') {
        setIsVaultLocked(false);
        reloadData();
      }
    });

    // Subscribe to CRDT differential P2P sync updates from remote peers
    const unsubCRDT = crdtSyncCoordinator.subscribeToRemoteUpdates((update) => {
      if (update.type === 'note_upserted') {
        setNotes((prev) => {
          const idx = prev.findIndex((n) => n.id === update.note.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = update.note;
            return next;
          }
          return [update.note, ...prev];
        });
        vaultManager.onNoteUpdated(update.note);
        storageService.saveNote(update.note);
      } else if (update.type === 'note_deleted') {
        setNotes((prev) => prev.filter((n) => n.id !== update.noteId));
        vaultManager.onNoteDeleted(update.noteId);
        storageService.deleteNotePermanently(update.noteId);
      }
    });

    return () => {
      unsub();
      unsubCRDT();
    };
  }, [reloadData]);

  // Helper to determine auto-sorted folder based on note tags
  const getAutoSortedFolderId = useCallback((noteTags?: string[], currentFolders: Folder[] = []): string | null => {
    if (!noteTags || noteTags.length === 0) return null;
    for (const folder of currentFolders) {
      if (folder.autoSortByTag && folder.autoSortTag) {
        const cleanFolderTag = folder.autoSortTag.trim().toLowerCase().replace(/^#/, '');
        if (cleanFolderTag) {
          const hasTag = noteTags.some((t) => t.trim().toLowerCase().replace(/^#/, '') === cleanFolderTag);
          if (hasTag) {
            return folder.id;
          }
        }
      }
    }
    return null;
  }, []);

  // Note CRUD Operations
  const handleCreateNote = async (
    newNoteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Note> => {
    // Extract hashtags from content, title, and checklist items
    const checklistText = (newNoteData.checklist || []).map((c) => c.text).join('\n');
    const extractedTags = extractHashtags(`${newNoteData.title || ''}\n${newNoteData.content || ''}\n${checklistText}`);
    const mergedTags = Array.from(new Set([...(newNoteData.tags || []), ...extractedTags]));

    // Check auto-sort by tag if folder is not explicitly set
    const autoFolderId = !newNoteData.folderId || newNoteData.folderId === 'unorganized'
      ? getAutoSortedFolderId(mergedTags, folders)
      : null;

    const newNote: Note = {
      ...newNoteData,
      tags: mergedTags,
      folderId: autoFolderId || newNoteData.folderId,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    vaultManager.onNoteCreated(newNote);
    await storageService.saveNote(newNote);
    crdtSyncCoordinator.handleLocalNoteSaved(newNote);
    semanticSearchService.onNoteSaved(newNote);
    a11yAnnouncer.announce(`Note "${newNote.title || 'Untitled'}" created`);

    // Dispatch P36 Automation domain event
    automationEngine?.dispatchEvent?.({
      type: 'note_created',
      note: newNote,
      timestamp: Date.now(),
    });

    // Award Gamification XP for creating note
    gamificationEngine.recordNoteCreated(newNote.title);
    if (newNote.isDailyNote) {
      gamificationEngine.recordDailyNoteWritten();
    }

    // Mirror to filesystem if connected
    filesystemBridgeService.triggerDebouncedSync();

    return newNote;
  };

  const handleUpdateNote = async (updatedNote: Note) => {
    const previousNote = notes.find((n) => n.id === updatedNote.id);

    // Extract hashtags from updated note content, title, and checklist
    const checklistText = (updatedNote.checklist || []).map((c) => c.text).join('\n');
    const extractedTags = extractHashtags(`${updatedNote.title || ''}\n${updatedNote.content || ''}\n${checklistText}`);
    const mergedTags = Array.from(new Set([...(updatedNote.tags || []), ...extractedTags]));

    // Check if auto-sort should apply
    let noteToSave = { ...updatedNote, tags: mergedTags };
    const autoFolderId = getAutoSortedFolderId(mergedTags, folders);
    if (autoFolderId) {
      const tagsChanged = previousNote && JSON.stringify(previousNote.tags) !== JSON.stringify(mergedTags);
      const isUnorganized = !noteToSave.folderId || noteToSave.folderId === 'unorganized';
      if (tagsChanged || isUnorganized) {
        noteToSave = { ...noteToSave, folderId: autoFolderId };
      }
    }

    const updated = notes.map((n) => (n.id === noteToSave.id ? noteToSave : n));
    setNotes(updated);
    vaultManager.onNoteUpdated(noteToSave);
    await storageService.saveNote(noteToSave);
    crdtSyncCoordinator.handleLocalNoteSaved(noteToSave);
    semanticSearchService.onNoteSaved(noteToSave);

    // Dispatch P36 Automation domain events
    automationEngine?.dispatchEvent?.({
      type: 'note_updated',
      note: updatedNote,
      previousNote,
      timestamp: Date.now(),
    });

    if (previousNote && previousNote.folderId !== updatedNote.folderId) {
      automationEngine?.dispatchEvent?.({
        type: 'note_moved',
        note: updatedNote,
        previousFolderId: previousNote.folderId,
        targetFolderId: updatedNote.folderId,
        timestamp: Date.now(),
      });
    }

    if (previousNote && previousNote.title !== updatedNote.title) {
      automationEngine?.dispatchEvent?.({
        type: 'note_renamed',
        note: updatedNote,
        previousTitle: previousNote.title,
        newTitle: updatedNote.title,
        timestamp: Date.now(),
      });
    }

    if (previousNote && !previousNote.archived && updatedNote.archived) {
      automationEngine?.dispatchEvent?.({
        type: 'note_archived',
        note: updatedNote,
        timestamp: Date.now(),
      });
    }

    // Award Gamification XP for writing words, adding links, and daily notes
    const prevWords = previousNote?.content ? previousNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
    const currWords = noteToSave.content ? noteToSave.content.trim().split(/\s+/).filter(Boolean).length : 0;
    const wordDiff = Math.max(0, currWords - prevWords);
    if (wordDiff > 0) {
      gamificationEngine.recordWordsWritten(wordDiff);
    }
    const prevLinks = (previousNote?.content?.match(/\[\[(.*?)\]\]/g) || []).length;
    const currLinks = (noteToSave.content?.match(/\[\[(.*?)\]\]/g) || []).length;
    if (currLinks > prevLinks) {
      gamificationEngine.recordLinkCreated();
    }
    if (noteToSave.isDailyNote && !previousNote?.isDailyNote) {
      gamificationEngine.recordDailyNoteWritten();
    }

    // Mirror to filesystem if connected
    filesystemBridgeService.triggerDebouncedSync();
  };

  const handleDeleteNote = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const trashedNote: Note = {
      ...note,
      trashed: true,
      updatedAt: new Date().toISOString(),
    };
    const updated = notes.map((n) => (n.id === noteId ? trashedNote : n));
    setNotes(updated);
    vaultManager.onNoteDeleted(noteId);
    await storageService.saveNote(trashedNote);
    crdtSyncCoordinator.handleLocalNoteSaved(trashedNote);
    semanticSearchService.onNoteDeleted(noteId);
    a11yAnnouncer.announce(`Note "${note.title || 'Untitled'}" moved to trash`);

    automationEngine?.dispatchEvent?.({
      type: 'note_trashed',
      note: trashedNote,
      timestamp: Date.now(),
    });

    // Mirror to filesystem if connected
    filesystemBridgeService.triggerDebouncedSync();
  };

  const handleRestoreNote = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const restoredNote: Note = {
      ...note,
      trashed: false,
      updatedAt: new Date().toISOString(),
    };
    const updated = notes.map((n) => (n.id === noteId ? restoredNote : n));
    setNotes(updated);
    vaultManager.onNoteCreated(restoredNote);
    await storageService.saveNote(restoredNote);
    crdtSyncCoordinator.handleLocalNoteSaved(restoredNote);
    a11yAnnouncer.announce(`Note "${note.title || 'Untitled'}" restored`);

    automationEngine?.dispatchEvent?.({
      type: 'note_restored',
      note: restoredNote,
      timestamp: Date.now(),
    });

    // Mirror to filesystem if connected
    filesystemBridgeService.triggerDebouncedSync();
  };

  const handleDeleteForever = async (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    vaultManager.onNoteDeleted(noteId);
    await storageService.deleteNotePermanently(noteId);
    crdtSyncCoordinator.handleLocalNoteDeleted(noteId);

    // Mirror to filesystem if connected
    filesystemBridgeService.triggerDebouncedSync();
  };

  const handleDuplicateNote = async (note: Note) => {
    const duplicate: Note = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: note.title ? `${note.title} (Copy)` : 'Copy of Note',
      content: regenerateCardIdsInMarkdown(note.content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicate, ...notes];
    setNotes(updated);
    vaultManager.onNoteCreated(duplicate);
    await storageService.saveNote(duplicate);

    automationEngine?.dispatchEvent?.({
      type: 'note_created',
      note: duplicate,
      timestamp: Date.now(),
    });

    filesystemBridgeService.triggerDebouncedSync();
  };

  const handleImportNotes = async (importedNotes: Note[]) => {
    const updated = [...importedNotes, ...notes];
    setNotes(updated);
    vaultManager.rebuildIndex(updated);
    await storageService.bulkSaveNotes(importedNotes);
  };

  const handleClearAllNotes = async () => {
    setNotes([]);
    vaultManager.rebuildIndex([]);
    await storageService.clearAllData();
  };

  const handleReorderNotes = async (reorderedNotes: Note[]) => {
    // 1. Build an index mapping for reordered notes
    const orderMap = new Map<string, number>();
    reorderedNotes.forEach((n, idx) => {
      orderMap.set(n.id, idx);
    });

    const nowIso = new Date().toISOString();
    const updatedNotes = notes.map((n) => {
      if (orderMap.has(n.id)) {
        return {
          ...n,
          order: orderMap.get(n.id)!,
          updatedAt: nowIso,
        };
      }
      return n;
    });

    const reorderedIds = new Set(reorderedNotes.map((n) => n.id));
    const updatedReordered = reorderedNotes.map((n, idx) => ({
      ...n,
      order: idx,
      updatedAt: nowIso,
    }));
    const others = updatedNotes.filter((n) => !reorderedIds.has(n.id));
    const mergedNotes = [...updatedReordered, ...others];

    setNotes(mergedNotes);
    vaultManager.rebuildIndex(mergedNotes);
    await storageService.bulkSaveNotes(mergedNotes);

    // Switch sort to manual so custom sequence persists in views
    if (settings.sortBy !== 'manual') {
      const newSettings = { ...settings, sortBy: 'manual' as const };
      setSettings(newSettings);
      storageService.saveSettings(newSettings);
    }

    a11yAnnouncer.announce('Notes reordered successfully');
    filesystemBridgeService.triggerDebouncedSync();
  };

  // Folder CRUD Operations
  const handleCreateFolder = async (
    name: string,
    color?: string,
    autoSortByTag?: boolean,
    autoSortTag?: string | null
  ) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      color: color || '#f59e0b',
      createdAt: new Date().toISOString(),
      autoSortByTag: Boolean(autoSortByTag),
      autoSortTag: autoSortTag || null,
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    await storageService.saveFolder(newFolder);

    // If autoSortByTag enabled, automatically reassign matching existing notes
    if (newFolder.autoSortByTag && newFolder.autoSortTag) {
      const cleanTag = newFolder.autoSortTag.trim().toLowerCase().replace(/^#/, '');
      if (cleanTag) {
        let changedCount = 0;
        const updatedNotes = notes.map((n) => {
          if (n.trashed) return n;
          const hasTag = (n.tags || []).some((t) => t.trim().toLowerCase().replace(/^#/, '') === cleanTag);
          if (hasTag && n.folderId !== newFolder.id) {
            changedCount++;
            return { ...n, folderId: newFolder.id, updatedAt: new Date().toISOString() };
          }
          return n;
        });

        if (changedCount > 0) {
          setNotes(updatedNotes);
          await storageService.bulkSaveNotes(updatedNotes);
          a11yAnnouncer.announce(`Auto-sorted ${changedCount} notes into "${newFolder.name}"`);
        }
      }
    }
  };

  const handleUpdateFolder = async (folder: Folder) => {
    const updated = folders.map((f) => (f.id === folder.id ? folder : f));
    setFolders(updated);
    await storageService.saveFolder(folder);

    // If autoSortByTag enabled, automatically reassign matching existing notes
    if (folder.autoSortByTag && folder.autoSortTag) {
      const cleanTag = folder.autoSortTag.trim().toLowerCase().replace(/^#/, '');
      if (cleanTag) {
        let changedCount = 0;
        const updatedNotes = notes.map((n) => {
          if (n.trashed) return n;
          const hasTag = (n.tags || []).some((t) => t.trim().toLowerCase().replace(/^#/, '') === cleanTag);
          if (hasTag && n.folderId !== folder.id) {
            changedCount++;
            return { ...n, folderId: folder.id, updatedAt: new Date().toISOString() };
          }
          return n;
        });

        if (changedCount > 0) {
          setNotes(updatedNotes);
          await storageService.bulkSaveNotes(updatedNotes);
          a11yAnnouncer.announce(`Auto-sorted ${changedCount} notes into "${folder.name}"`);
        }
      }
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const updated = folders.filter((f) => f.id !== folderId);
    setFolders(updated);
    await storageService.deleteFolder(folderId);

    const unassignedNotes = notes.map((n) =>
      n.folderId === folderId ? { ...n, folderId: null } : n
    );
    setNotes(unassignedNotes);
    await storageService.bulkSaveNotes(unassignedNotes);
  };

  // Saved Searches CRUD
  const handleSaveSearch = async (savedSearch: SavedSearch) => {
    const updated = [...savedSearches, savedSearch];
    setSavedSearches(updated);
    await storageService.saveSearchPreset(savedSearch);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    await storageService.deleteSavedSearch(id);
  };

  // Settings Update
  const handleUpdateSettings = (newSettings: Partial<AppSettings> & { viewMode?: ViewMode }) => {
    const { viewMode, ...settingsToSave } = newSettings;
    const merged = { ...settings, ...settingsToSave };
    if (viewMode) {
      merged.defaultViewMode = viewMode;
    }
    setSettings(merged);
    storageService.saveSettings(merged);
    if (viewMode) {
      setFilter((prev) => ({ ...prev, viewMode }));
    }
  };

  const handleEmptyTrash = async () => {
    const trashed = notes.filter((n) => n.trashed);
    const active = notes.filter((n) => !n.trashed);
    setNotes(active);
    for (const t of trashed) {
      await storageService.deleteNotePermanently(t.id);
    }
  };

  const handleLockVault = useCallback(() => {
    vaultEncryptionService.lockVault();
    peopleService.lock();
    cacheRegistry.onVaultLock();
    setIsVaultLocked(true);
  }, []);

  const handleVaultUnlocked = useCallback(async () => {
    setIsVaultLocked(false);
    setIsVaultEncrypted(vaultEncryptionService.isEncryptionEnabled());
    await reloadData();
    // Automatically drain captures that were safely staged in memory while vault was locked
    try {
      await captureBridgeService.drainStagedCaptures({
        notes,
        folders,
        settings,
        activeNote: null,
        createNote: handleCreateNote,
        saveNote: handleUpdateNote,
        createFolder: handleCreateFolder,
      });
      await mobileShareService.drainPendingShares({
        notes,
        folders,
        settings,
        isVaultLocked: false,
        createNote: handleCreateNote,
        saveNote: handleUpdateNote,
        createFolder: handleCreateFolder,
      });
      mobileWidgetService.updateAllWidgets(notes, false);
    } catch (drainErr) {
      console.warn('Failed to drain staged captures upon unlock:', drainErr);
    }
  }, [reloadData, notes, folders, settings, handleCreateNote, handleUpdateNote, handleCreateFolder]);

  // Apply Theme & Canvas Background to HTML/Body
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let isDark = false;
      if (settings.theme === 'system') {
        isDark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = isDarkTheme(settings.theme, settings.customThemes);
      }

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }

      root.setAttribute('data-theme', settings.theme);
      root.setAttribute('data-accent', settings.accentColor || 'amber');
      if (settings.vibrantMode) {
        root.setAttribute('data-vibrant', 'true');
      } else {
        root.removeAttribute('data-vibrant');
      }

      // Check if custom theme is currently active
      const activeCustomTheme = settings.customThemes?.find((ct) => ct.id === settings.theme);
      if (activeCustomTheme) {
        root.setAttribute('data-custom-theme', 'true');
        root.style.setProperty('--accent-primary', activeCustomTheme.accentColor);
        root.style.setProperty('--accent-glow', `${activeCustomTheme.accentColor}66`);
        root.style.setProperty('--border-accent', activeCustomTheme.accentColor);
        root.style.setProperty('--custom-theme-bg', activeCustomTheme.backgroundColor);
        root.style.setProperty('--custom-theme-primary', activeCustomTheme.primaryColor);
        root.style.setProperty('--custom-theme-accent', activeCustomTheme.accentColor);
        root.style.setProperty(
          '--custom-theme-card',
          activeCustomTheme.cardColor || (isDark ? '#1a1824' : '#ffffff')
        );
        root.style.setProperty(
          '--custom-theme-text',
          activeCustomTheme.textColor || (isDark ? '#f4f4f5' : '#1c1917')
        );
        document.documentElement.style.backgroundColor = activeCustomTheme.backgroundColor;
        document.body.style.backgroundColor = activeCustomTheme.backgroundColor;
      } else {
        root.removeAttribute('data-custom-theme');
        root.style.removeProperty('--custom-theme-bg');
        root.style.removeProperty('--custom-theme-primary');
        root.style.removeProperty('--custom-theme-accent');
        root.style.removeProperty('--custom-theme-card');
        root.style.removeProperty('--custom-theme-text');
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
      }
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme, settings.accentColor, settings.vibrantMode, settings.customThemes]);

  // Canvas background class
  const canvasBgClass = useMemo(() => {
    switch (settings.canvasBackground) {
      case 'warm-paper':
        return 'bg-canvas-warm-paper';
      case 'subtle-dots':
        return 'bg-canvas-subtle-dots';
      case 'subtle-grid':
        return 'bg-canvas-subtle-grid';
      case 'vintage-notepad':
        return 'bg-canvas-vintage-notepad';
      case 'dark-obsidian':
        return 'bg-canvas-dark-obsidian';
      case 'isometric-grid':
        return 'bg-canvas-isometric-grid';
      case 'neon-circuit':
        return 'bg-canvas-neon-circuit';
      case 'galaxy-dust':
        return 'bg-canvas-galaxy-dust';
      case 'japanese-washi':
        return 'bg-canvas-japanese-washi';
      case 'blueprint':
        return 'bg-canvas-blueprint';
      case 'honeycomb':
        return 'bg-canvas-honeycomb';
      case 'clean':
      default:
        return 'bg-canvas-clean';
    }
  }, [settings.canvasBackground]);

  // Font family class
  const fontFamilyClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'font-app-serif';
      case 'mono':
        return 'font-app-mono';
      case 'handwriting':
        return 'font-app-handwriting';
      case 'sans':
      default:
        return 'font-app-sans';
    }
  }, [settings.fontFamily]);

  // Filtered Notes Computation
  const filteredNotes = useMemo(() => {
    const activeFilter: FilterState = {
      ...filter,
      sortBy: settings.sortBy,
      sortOrder: settings.sortOrder,
    };
    return filterNotes(notes, activeFilter, folders);
  }, [notes, filter, folders, settings.sortBy, settings.sortOrder]);

  // Matching counts for cross-scope search discovery
  const matchingArchivedCount = useMemo(() => {
    if (!filter.searchQuery.trim() || filter.scope === 'archived' || filter.scope === 'trash') {
      return 0;
    }
    const archiveFilter: FilterState = {
      ...filter,
      scope: 'archived',
    };
    return filterNotes(notes, archiveFilter, folders).length;
  }, [notes, filter, folders]);

  const matchingActiveCount = useMemo(() => {
    if (!filter.searchQuery.trim() || filter.scope === 'active' || filter.scope === 'trash') {
      return 0;
    }
    const activeFilter: FilterState = {
      ...filter,
      scope: 'active',
    };
    return filterNotes(notes, activeFilter, folders).length;
  }, [notes, filter, folders]);

  // Tags list with counts
  const tagsList = useMemo(() => {
    const tagCountMap = new Map<string, number>();
    for (const note of notes) {
      if (note.trashed) continue;
      for (const t of note.tags || []) {
        tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
      }
    }
    return Array.from(tagCountMap.entries()).map(([name, count]) => ({ name, count }));
  }, [notes]);

  return (
    <WorkspaceProvider notes={notes}>
      <PKMAppContent
        notes={notes}
        folders={folders}
        savedSearches={savedSearches}
        settings={settings}
        filter={filter}
        sidebarOpen={sidebarOpen}
        isVaultEncrypted={isVaultEncrypted}
        isVaultLocked={isVaultLocked}
        canvasBgClass={canvasBgClass}
        fontFamilyClass={fontFamilyClass}
        filteredNotes={filteredNotes}
        tagsList={tagsList}
        matchingArchivedCount={matchingArchivedCount}
        matchingActiveCount={matchingActiveCount}
        setFilter={setFilter}
        setSidebarOpen={setSidebarOpen}
        setNotes={setNotes}
        setFolders={setFolders}
        setSavedSearches={setSavedSearches}
        setSettings={setSettings}
        handleUpdateSettings={handleUpdateSettings}
        handleCreateNote={handleCreateNote}
        handleUpdateNote={handleUpdateNote}
        handleDeleteNote={handleDeleteNote}
        handleRestoreNote={handleRestoreNote}
        handleDeleteForever={handleDeleteForever}
        handleDuplicateNote={handleDuplicateNote}
        handleImportNotes={handleImportNotes}
        handleClearAllNotes={handleClearAllNotes}
        handleCreateFolder={handleCreateFolder}
        handleUpdateFolder={handleUpdateFolder}
        handleDeleteFolder={handleDeleteFolder}
        handleSaveSearch={handleSaveSearch}
        handleDeleteSavedSearch={handleDeleteSavedSearch}
        handleEmptyTrash={handleEmptyTrash}
        handleLockVault={handleLockVault}
        handleVaultUnlocked={handleVaultUnlocked}
        reloadData={reloadData}
        handleReorderNotes={handleReorderNotes}
      />
    </WorkspaceProvider>
  );
}
