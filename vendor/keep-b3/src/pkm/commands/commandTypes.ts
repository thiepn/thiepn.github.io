import { Note, Folder, AppSettings, ViewMode } from '../../types';
import { WorkspaceSurfaceType, WorkspacePresetKey, WorkspaceSplitOrientation } from '../workspaceTypes';

export type CommandCategory =
  | 'Workspace'
  | 'Navigation'
  | 'Note Actions'
  | 'Create'
  | 'View & Layout'
  | 'Tools & Diagnostics'
  | 'Vault & Security'
  | 'Search & Query';

export interface CommandExecutionContext {
  // App State
  notes: Note[];
  folders: Folder[];
  settings: AppSettings;
  activeNote?: Note | null;
  activeFolderId?: string | null;
  
  // Navigation & Workspace APIs
  openResource: (resource: { type: WorkspaceSurfaceType; resourceId?: string; title?: string; viewState?: Record<string, any> }, options?: any) => void;
  openNote: (noteId: string, title?: string, options?: any) => void;
  openPDF: (pdfId?: string, page?: number, highlightId?: string, options?: any) => void;
  openCanvas: (canvasId?: string, options?: any) => void;
  openGraph: (options?: any) => void;
  openKanban: (options?: any) => void;
  openSmartViews: (options?: any) => void;
  openHome: (options?: any) => void;
  openSearch: (query?: string, options?: any) => void;
  openMedia?: (options?: any) => void;
  openReferences?: (options?: any) => void;
  openCalendar?: (options?: any) => void;
  openAgenda?: (options?: any) => void;
  openTimeline?: (options?: any) => void;
  openReview?: (options?: any) => void;
  openCopilot?: (options?: any) => void;
  openCollection?: (collectionId?: string, title?: string, options?: any) => void;
  openDashboard?: (dashboardId?: string, title?: string, options?: any) => void;
  openPeople?: (options?: any) => void;
  openPlanningHome?: (options?: any) => void;
  openGoalsProjects?: (options?: any) => void;
  openLearning?: (options?: any) => void;
  openExamPrep?: (courseId?: string, options?: any) => void;
  openLibrary?: (options?: any) => void;
  openFinance?: (options?: any) => void;
  openHealth?: (options?: any) => void;
  openUniversalInbox?: (options?: any) => void;
  createNote?: (draft: { title?: string; content?: string }) => void;
  openPublishing?: () => void;
  openSingleNoteExport?: (note?: Note) => void;
  openExportCenter?: (initialNoteId?: string) => void;
  openShareSheet?: (note?: Note) => void;
  openDeveloperObservatory?: () => void;
  openPerformanceDiagnostics?: () => void;
  openFilesystemBridge?: () => void;
  openDailyNote?: (date?: Date, options?: any) => Promise<void> | void;
  openQuickCapture?: (initialPayload?: any) => void;
  openTemplates?: (targetNote?: Note) => void;
  openTasks?: (perspective?: any) => void;
  openNoteCompare?: (noteAId?: string, noteBId?: string) => void;
  openLocalGraph?: () => void;
  openExtraction?: () => void;
  openFlashback?: () => void;
  openZenMode?: () => void;
  openSerendipity?: () => void;
  openThemeCreator?: () => void;
  insertMarkdownSnippet?: (snippet: string) => void;
  
  // Workspace controls
  splitWorkspace: (orientation?: WorkspaceSplitOrientation) => void;
  closeActiveTab: () => void;
  reopenClosedTab: () => void;
  closeSplit: () => void;
  swapPanes: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
  applyPreset: (presetKey: WorkspacePresetKey) => void;
  
  // Actions
  handleCreateNote: (type?: 'text' | 'checklist') => Promise<Note | void>;
  handleSaveNote?: (note: Note) => Promise<void> | void;
  handleDeleteNote?: (noteId: string) => Promise<void> | void;
  handleUpdateSettings: (settings: Partial<AppSettings> & { viewMode?: ViewMode }) => void;
  
  openModal: (modalName: 'settings' | 'sync' | 'import' | 'migration_hub' | 'plugin_manager' | 'personalization' | 'drawing' | 'shortcuts' | 'templates' | 'vault_tasks' | 'note_compare' | 'vault_doctor' | 'vault_encryption' | 'recovery_center' | 'manage_folders' | 'manage_tags' | 'save_search' | 'quick_capture' | 'audio_recorder' | 'device_sync' | 'extension_settings' | 'writing_sprint' | 'idea_spark' | 'thought_matrix' | 'cornell_notes' | 'pomodoro_flow' | 'zettelkasten_studio' | 'chrono_capsule' | 'synthesis_matrix' | 'voice_memo_studio' | 'mind_map_studio' | 'macro_automation' | 'vault_stats' | 'flashcard_review' | 'presentation_studio' | 'reactive_sandbox' | 'zen_mode' | 'serendipity' | 'theme_creator' | 'reference_library' | 'reference_add_identifier' | 'reference_import_bibtex' | 'reference_duplicates' | 'publication_manager' | 'single_note_export' | 'export_center' | 'share_sheet' | 'developer_observatory' | 'performance_diagnostics_v2' | 'v2_security_diagnostics' | 'v2_rc_diagnostics' | 'v2_stable_release_hub' | 'v2_maintenance_diagnostics' | 'v2_platform_ecosystem' | 'v2_domain_excellence' | 'v2_quality_ceiling' | 'v2_power_user_efficiency' | 'v2_interoperability' | 'v2_unified_interoperability' | 'v2_blocker_elimination' | 'v2_reliability_security' | 'v2_performance_accessibility' | 'v2_release_candidate_1' | 'v2_stable_ship' | 'ai_copilot' | 'ai_writing_assistant' | 'ai_settings' | 'collections_index' | 'filesystem_bridge' | 'filesystem_review' | 'filesystem_conflicts' | 'desktop_quick_capture' | 'desktop_diagnostics' | 'mobile_share_inbox' | 'mobile_diagnostics' | 'people_log_interaction' | 'people_import_vcard' | 'people_export_vcard' | 'people_native_picker' | 'people_duplicates', payload?: any) => void;
  lockVault?: () => void;
}

export interface PKMCommand {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  shortcut?: string; // Formatted display string e.g. "Mod+K", "Mod+N", "Alt+\"
  iconName?: string;
  keywords?: string[];
  isAvailable?: (context: CommandExecutionContext) => boolean;
  execute: (context: CommandExecutionContext) => Promise<void> | void;
}

export type PaletteItemType = 'command' | 'note' | 'folder' | 'tag' | 'smart-view' | 'saved-search';

export interface PaletteItem {
  id: string;
  type: PaletteItemType;
  title: string;
  subtitle?: string;
  badge?: string;
  iconName?: string;
  shortcut?: string;
  keywords?: string[];
  score?: number;
  data?: any;
}
