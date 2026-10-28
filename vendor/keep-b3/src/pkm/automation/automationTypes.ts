/**
 * Phase P36: Local Automation, Rules & Recurring Workflow Engine
 * Core TypeScript Definitions & Canonical Model
 */

import { Note, Folder, AppSettings, NoteColorKey } from '../../types';
import { PropertyType } from '../properties/propertyTypes';

export const AUTOMATION_SCHEMA_VERSION = 1;
export const MAX_EXECUTION_DEPTH = 15;
export const MAX_LOG_ENTRIES = 500;
export const DEFAULT_BULK_IMPACT_LIMIT = 100;

/**
 * Origin of the domain event that triggered automation evaluation
 */
export type EventOrigin =
  | 'user'
  | 'user-action'
  | 'automation'
  | 'capture'
  | 'git-sync'
  | 'device-sync'
  | 'import'
  | 'restore'
  | 'migration';

/**
 * Trigger Types
 */
export type AutomationTriggerType =
  // Note Lifecycle
  | 'note_created'
  | 'note_updated'
  | 'note_renamed'
  | 'note_moved'
  | 'note_restored'
  | 'note_archived'
  | 'note_trashed'
  // Property
  | 'property_added'
  | 'property_changed'
  | 'property_removed'
  | 'property_becomes_value'
  // Tags
  | 'tag_added'
  | 'tag_removed'
  // Tasks
  | 'task_completed'
  | 'task_reopened'
  | 'all_tasks_completed'
  // Capture
  | 'quick_capture_committed'
  | 'browser_capture_committed'
  | 'pwa_share_committed'
  // Reference
  | 'reference_created'
  | 'pdf_linked_reference'
  // Scheduled
  | 'schedule_daily'
  | 'schedule_weekly'
  | 'schedule_monthly'
  | 'schedule_interval'
  | 'app_open';

export interface BaseTrigger {
  type: AutomationTriggerType;
}

export interface NoteLifecycleTrigger extends BaseTrigger {
  type: 'note_created' | 'note_updated' | 'note_renamed' | 'note_moved' | 'note_restored' | 'note_archived';
  folderId?: string | null;
  tag?: string;
}

export interface PropertyTrigger extends BaseTrigger {
  type: 'property_added' | 'property_changed' | 'property_removed' | 'property_becomes_value';
  propertyKey: string;
  targetValue?: any;
  fromValue?: any;
}

export interface TagTrigger extends BaseTrigger {
  type: 'tag_added' | 'tag_removed';
  tag: string;
}

export interface TaskTrigger extends BaseTrigger {
  type: 'task_completed' | 'task_reopened' | 'all_tasks_completed';
}

export interface CaptureTrigger extends BaseTrigger {
  type: 'quick_capture_committed' | 'browser_capture_committed' | 'pwa_share_committed';
  sourceHost?: string;
  destinationFolderId?: string | null;
}

export interface ReferenceTrigger extends BaseTrigger {
  type: 'reference_created' | 'pdf_linked_reference';
  referenceType?: string;
}

export interface ScheduleDailyTrigger extends BaseTrigger {
  type: 'schedule_daily';
  time: string; // e.g. "08:00"
  catchUpPolicy: 'run_once' | 'skip';
}

export interface ScheduleWeeklyTrigger extends BaseTrigger {
  type: 'schedule_weekly';
  weekdays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;
  time: string; // e.g. "08:00"
  catchUpPolicy: 'run_once' | 'skip';
}

export interface ScheduleMonthlyTrigger extends BaseTrigger {
  type: 'schedule_monthly';
  dayOfMonth: number; // 1 to 31
  monthEndPolicy: 'last_day' | 'skip';
  time: string;
  catchUpPolicy: 'run_once' | 'skip';
}

export interface ScheduleIntervalTrigger extends BaseTrigger {
  type: 'schedule_interval';
  intervalDays: number;
  time: string;
  catchUpPolicy: 'run_once' | 'skip';
}

export interface AppOpenTrigger extends BaseTrigger {
  type: 'app_open';
  minIntervalHours: number; // e.g. 24
}

export type AutomationTrigger =
  | NoteLifecycleTrigger
  | PropertyTrigger
  | TagTrigger
  | TaskTrigger
  | CaptureTrigger
  | ReferenceTrigger
  | ScheduleDailyTrigger
  | ScheduleWeeklyTrigger
  | ScheduleMonthlyTrigger
  | ScheduleIntervalTrigger
  | AppOpenTrigger;

/**
 * Condition Types
 */
export type AutomationConditionType =
  // Note
  | 'folder_equals'
  | 'folder_under'
  | 'title_contains'
  | 'title_starts_with'
  | 'is_daily_note'
  | 'is_template'
  | 'has_attachments'
  | 'has_open_tasks'
  | 'is_archived'
  | 'is_pinned'
  | 'is_trashed'
  // Tag
  | 'has_tag'
  | 'does_not_have_tag'
  // Property
  | 'property_exists'
  | 'property_equals'
  | 'property_not_equals'
  | 'property_numeric_cmp'
  | 'property_date_cmp'
  // Task
  | 'all_tasks_completed'
  | 'open_task_count'
  // Reference
  | 'has_pdf'
  | 'reference_type_equals'
  // Capture
  | 'source_host_contains'
  | 'source_url_contains'
  | 'capture_type_equals'
  // Origin
  | 'origin_equals'
  | 'origin_in';

export interface AutomationCondition {
  id: string;
  type: AutomationConditionType;
  negate?: boolean;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'starts_with' | 'before' | 'after' | 'is_today' | 'within_days';
  value?: any;
}

/**
 * Action Types
 */
export type AutomationActionType =
  // Note
  | 'create_note'
  | 'move_note'
  | 'rename_note'
  | 'apply_template'
  | 'append_markdown'
  | 'prepend_markdown'
  | 'insert_under_heading'
  | 'archive_note'
  | 'unarchive_note'
  | 'move_to_trash'
  // Property
  | 'set_property'
  | 'remove_property'
  // Tag
  | 'add_tag'
  | 'remove_tag'
  // Task
  | 'add_task'
  | 'complete_all_tasks'
  // Notification / Suggestion
  | 'show_in_app_notification'
  | 'suggest_action';

export interface CreateNoteAction {
  type: 'create_note';
  titleTemplate: string;
  folderId?: string | null;
  contentTemplate?: string;
  templateId?: string;
  tags?: string[];
  properties?: Record<string, any>;
  collisionPolicy: 'skip_if_exists' | 'append_to_existing' | 'create_unique_title';
}

export interface MoveNoteAction {
  type: 'move_note';
  targetFolderId: string | null;
}

export interface RenameNoteAction {
  type: 'rename_note';
  titleTemplate: string;
}

export interface ApplyTemplateAction {
  type: 'apply_template';
  templateId: string;
  mode: 'append' | 'prepend' | 'insert_under_heading';
  heading?: string;
}

export interface AppendMarkdownAction {
  type: 'append_markdown';
  content: string;
}

export interface PrependMarkdownAction {
  type: 'prepend_markdown';
  content: string;
}

export interface InsertUnderHeadingAction {
  type: 'insert_under_heading';
  heading: string;
  content: string;
  fallback: 'create_heading' | 'append_end' | 'skip';
}

export interface ArchiveNoteAction {
  type: 'archive_note';
  archive: boolean;
}

export interface MoveToTrashAction {
  type: 'move_to_trash';
}

export interface SetPropertyAction {
  type: 'set_property';
  key: string;
  value: any;
  propertyType?: PropertyType;
}

export interface RemovePropertyAction {
  type: 'remove_property';
  key: string;
}

export interface AddTagAction {
  type: 'add_tag';
  tag: string;
}

export interface RemoveTagAction {
  type: 'remove_tag';
  tag: string;
}

export interface AddTaskAction {
  type: 'add_task';
  taskText: string;
  heading?: string;
}

export interface CompleteAllTasksAction {
  type: 'complete_all_tasks';
}

export interface ShowInAppNotificationAction {
  type: 'show_in_app_notification';
  message: string;
  severity: 'info' | 'success' | 'warning';
}

export interface SuggestActionAction {
  type: 'suggest_action';
  title: string;
  description: string;
  actionToPropose: AutomationAction;
}

export type AutomationAction =
  | CreateNoteAction
  | MoveNoteAction
  | RenameNoteAction
  | ApplyTemplateAction
  | AppendMarkdownAction
  | PrependMarkdownAction
  | InsertUnderHeadingAction
  | ArchiveNoteAction
  | MoveToTrashAction
  | SetPropertyAction
  | RemovePropertyAction
  | AddTagAction
  | RemoveTagAction
  | AddTaskAction
  | CompleteAllTasksAction
  | ShowInAppNotificationAction
  | SuggestActionAction;

/**
 * Rule Health Status
 */
export type AutomationRuleStatus = 'active' | 'disabled' | 'needs_attention' | 'paused_error';

/**
 * Canonical Automation Rule
 */
export interface AutomationRule {
  id: string;
  schemaVersion: number;
  name: string;
  description?: string;
  enabled: boolean;
  status: AutomationRuleStatus;
  statusReason?: string;
  priority?: 'high' | 'normal' | 'low';
  targetScope?: 'vault' | 'device_only';

  trigger: AutomationTrigger;

  conditionGroup: 'ALL' | 'ANY';
  conditions: AutomationCondition[];

  actions: AutomationAction[];

  options?: {
    stopOnError?: boolean;
    requireConfirmation?: boolean;
    runOnImport?: boolean; // default false
    runOnSync?: boolean; // default false
    maxImpact?: number; // safety threshold, default 100
  };

  consecutiveFailures?: number;
  lastExecutedAt?: number;
  lastOccurrenceId?: string;

  createdAt: number;
  updatedAt: number;
}

/**
 * Canonical Domain Event emitted upon durable changes
 */
export interface CanonicalDomainEvent {
  id?: string;
  type: AutomationTriggerType;
  timestamp: number;
  origin?: EventOrigin;
  noteId?: string;
  note?: Note;
  previousNote?: Note;
  folderId?: string | null;
  targetFolderId?: string | null;
  previousFolderId?: string | null;
  newTitle?: string;
  previousTitle?: string;
  tag?: string;
  propertyKey?: string;
  propertyOldValue?: any;
  propertyNewValue?: any;
  captureData?: {
    sourceUrl?: string;
    sourceHost?: string;
    captureType?: string;
    destinationFolderId?: string | null;
  };
  referenceData?: {
    id: string;
    title: string;
    citationKey: string;
    type: string;
    hasPdf: boolean;
  };
  scheduledOccurrenceId?: string;
  executionChainId?: string;
}

/**
 * Execution Chain metadata for loop protection
 */
export interface ExecutionChain {
  id: string;
  depth: number;
  visitedRuleIds: Set<string>;
  originatingRuleId?: string;
}

/**
 * ActionResult detail for execution log
 */
export interface ActionResultItem {
  actionType: AutomationActionType;
  status: 'ok' | 'failed' | 'skipped';
  details?: string;
  error?: string;
  affectedResourceId?: string;
  undoSnapshot?: {
    type: 'note_content' | 'note_properties' | 'note_creation' | 'folder_change';
    noteId: string;
    previousState: any;
  };
}

/**
 * Bounded Execution Log Entry
 */
export interface AutomationLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: AutomationTriggerType;
  timestamp: number;
  origin: EventOrigin;
  status: 'success' | 'failed' | 'skipped' | 'suggestion_pending' | 'loop_detected';
  affectedResourceIds: string[];
  actionResults: ActionResultItem[];
  error?: string;
  durationMs: number;
  isUndoable?: boolean;
  undoData?: any[];
  executionChainId?: string;
}

/**
 * Scheduled Occurrence Receipt for Idempotency
 */
export interface OccurrenceRecord {
  id: string; // ruleId + ':' + occurrenceKey
  ruleId: string;
  occurrenceKey: string;
  status: 'completed' | 'failed' | 'running';
  startedAt: number;
  completedAt?: number;
  createdResourceId?: string;
  error?: string;
}

/**
 * Pending Suggestion for Confirmation-Required rules
 */
export interface AutomationSuggestion {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  description: string;
  noteId?: string;
  noteTitle?: string;
  actions: AutomationAction[];
  contextEvent: CanonicalDomainEvent;
  createdAt: number;
}

/**
 * Dry Run / Trace Output
 */
export interface ConditionTrace {
  conditionId: string;
  conditionType: AutomationConditionType;
  passed: boolean;
  actualValue?: any;
  expectedValue?: any;
  description: string;
}

export interface DryRunResult {
  ruleId: string;
  ruleName: string;
  triggerMatched: boolean;
  conditionsPassed: boolean;
  conditionTraces: ConditionTrace[];
  wouldExecuteActions: AutomationAction[];
  affectedResourceIds: string[];
  simulationSummary: string;
  warnings?: string[];
}

/**
 * Execution Context provided by App
 */
export interface AutomationExecutionContext {
  notes: Note[];
  folders: Folder[];
  settings: AppSettings;
  activeNote: Note | null;
  createNote: (draft: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  saveNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  createFolder?: (name: string, color?: string) => Promise<void>;
  openNote?: (noteId: string, title?: string) => void;
  showToast?: (message: string) => void;
  showNotification?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

/**
 * Real-time Smart Suggestions for Editor
 */
export interface EditorSmartTagSuggestion {
  tag: string;
  source: 'rule' | 'content' | 'co-occurrence' | 'frequency';
  ruleName?: string;
  confidence: number;
}

export interface EditorSmartRelatedNoteSuggestion {
  id: string;
  title: string;
  reason: string;
  confidence: number;
}

export interface EditorSmartRuleSuggestion {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  description: string;
  actions: AutomationAction[];
}

export interface EditorSmartSuggestionsResult {
  tags: EditorSmartTagSuggestion[];
  relatedNotes: EditorSmartRelatedNoteSuggestion[];
  ruleSuggestions: EditorSmartRuleSuggestion[];
}
