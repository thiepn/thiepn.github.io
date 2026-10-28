/**
 * V1.6 — Personalization, Workspace Presets, Workflows & Refinement Types
 * 
 * Defines the comprehensive, typed schema for:
 * - Preference classification (Global Synced, Device-Local, Vault-Level, Session State)
 * - Visibility profiles ('core' | 'personal-os' | 'custom')
 * - Navigation customization with required anchor preservation
 * - Favorites vs Context Pins vs Focus distinction
 * - Workspace presets with Dynamic Context Slots and mobile degradation
 * - Unified Action Registry & bounded Workflow Presets
 * - Keyboard shortcut normalization, conflict detection, and registry
 * - Home customization (sections, density, limits, layouts)
 * - Reusable Saved Views with missing property detection
 * - Deterministic Quality Templates with safe fallbacks
 * - Quick Capture Presets with MIME and Context awareness
 * - Non-executable Configuration Export & Import with privacy filters
 */

import { WorkspaceSurfaceType, WorkspaceSplitOrientation } from '../workspaceTypes';

// ============================================================================
// 1. PREFERENCE CLASSIFICATION & STORAGE
// ============================================================================

export type PreferenceStorageScope =
  | 'global-synced'   // Synced across devices (Home sections, domain visibility, presets, favorites)
  | 'device-local'    // Device-specific (pane pixel sizes, window geometry, native shortcuts, biometric)
  | 'vault-level'     // Vault configuration (custom templates, property dictionaries)
  | 'transient-session'; // Not stored long-term (open popover, transient search term)

export type VisibilityProfileId = 'core' | 'personal-os' | 'custom';

export type ProductDomainKey =
  | 'notes'
  | 'tasks'
  | 'calendar'
  | 'planning'
  | 'people'
  | 'routines'
  | 'learning'
  | 'library'
  | 'finance'
  | 'health'
  | 'travel'
  | 'assets'
  | 'decisions'
  | 'inbox'
  | 'dashboards'
  | 'collections'
  | 'media'
  | 'references'
  | 'plugins';

export interface DomainVisibilityConfig {
  enabledDomains: Record<ProductDomainKey, boolean>;
  profile: VisibilityProfileId;
}

// ============================================================================
// 2. NAVIGATION CUSTOMIZATION
// ============================================================================

export interface NavigationItemConfig {
  id: string;
  label: string;
  surfaceType: WorkspaceSurfaceType;
  iconName: string;
  isOptional: boolean;
  isVisible: boolean;
  order: number;
  badgeCountKey?: string;
  domainKey?: ProductDomainKey;
}

export interface MobileBottomNavConfig {
  maxItems: number; // Strictly capped at 4-5 items
  items: Array<{
    id: string;
    label: string;
    iconName: string;
    action: string;
    order: number;
  }>;
  useDeviceOverride: boolean;
}

// ============================================================================
// 3. FAVORITES, FOCUS & CONTEXT PINS
// ============================================================================

export type FavoriteResourceType =
  | 'note'
  | 'project'
  | 'course'
  | 'saved-view'
  | 'dashboard'
  | 'collection'
  | 'context'
  | 'markdown-task'
  | 'note-block'
  | 'task'
  | 'event'
  | 'habit'
  | 'routine'
  | 'time-block'
  | 'ics-source'
  | 'check-in'
  | 'canvas'
  | 'pin';

export interface FavoriteItem {
  id: string;
  title: string;
  type: FavoriteResourceType;
  resourceId: string;
  /** KEEP B1b: original opaque owner URI; optional for backwards-compatible favorites. */
  resourceUri?: string;
  iconName?: string;
  color?: string;
  order: number;
  addedAt: string;
  isUnavailable?: boolean; // Set if referenced canonical resource is trashed or missing
}

// ============================================================================
// 4. WORKSPACE PRESETS & DYNAMIC CONTEXT SLOTS
// ============================================================================

export type DynamicSlotType =
  | 'active-context-root'
  | 'current-daily-note'
  | 'context-primary-doc'
  | 'context-tasks'
  | 'context-agenda';

export interface WorkspaceSurfaceDefinition {
  type: WorkspaceSurfaceType;
  resourceId?: string;
  title: string;
  dynamicSlot?: DynamicSlotType;
  viewState?: Record<string, any>;
}

export interface AdvancedWorkspacePreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  splitOrientation: WorkspaceSplitOrientation;
  splitRatio: number; // 0.2 to 0.8 (default 0.5)
  leftSurface: WorkspaceSurfaceDefinition;
  rightSurface?: WorkspaceSurfaceDefinition;
  isBuiltIn: boolean;
  order: number;
  preferredForContextTypes?: string[]; // e.g. ['course', 'project']
  mobileBehavior: 'sequential-tabs' | 'primary-surface-only';
}

// ============================================================================
// 5. UNIFIED ACTION REGISTRY & WORKFLOW PRESETS
// ============================================================================

export type ActionCategory =
  | 'navigation'
  | 'resource'
  | 'workspace'
  | 'context'
  | 'review'
  | 'capture'
  | 'tools';

export type ActionRiskLevel =
  | 'navigation'      // Zero state change, purely switches view
  | 'safe-write'      // Creates standard resources or updates preferences
  | 'destructive'     // Trashes or deletes data
  | 'external-write'; // Network / external sync actions

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface AppAction {
  id: string;
  label: string;
  description: string;
  category: ActionCategory;
  riskLevel: ActionRiskLevel;
  iconName?: string;
  defaultShortcut?: string;
  contexts?: string[]; // e.g. ['project', 'course'] if contextual
  isAvailable?: (runtimeContext: any) => { available: boolean; reason?: string };
  execute: (args: Record<string, any>, runtimeContext: any) => Promise<ActionResult>;
}

export interface WorkflowStep {
  actionId: string;
  label?: string;
  args?: Record<string, any>;
  optional?: boolean;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'productivity' | 'learning' | 'review' | 'travel' | 'custom';
  steps: WorkflowStep[];
  isBuiltIn: boolean;
  shortcut?: string;
  order: number;
}

export interface WorkflowExecutionReport {
  presetId: string;
  presetName: string;
  startedAt: string;
  completedAt?: string;
  success: boolean;
  totalSteps: number;
  completedSteps: number;
  stepResults: Array<{
    stepIndex: number;
    actionId: string;
    success: boolean;
    message?: string;
    skipped?: boolean;
  }>;
  stoppedAtStep?: number;
  errorMessage?: string;
}

// ============================================================================
// 6. KEYBOARD SHORTCUTS
// ============================================================================

export type ShortcutCategory =
  | 'global'
  | 'navigation'
  | 'editor'
  | 'workspace'
  | 'context'
  | 'views'
  | 'workflows';

export interface ShortcutBinding {
  actionId: string;
  keys: string; // e.g. "Mod+K", "Mod+Alt+R", "Mod+Shift+P"
  category: ShortcutCategory;
  label: string;
  isCustom: boolean;
  isPlugin?: boolean;
}

export interface ShortcutConflict {
  keyCombination: string;
  existingActionId: string;
  existingLabel: string;
  newActionId: string;
  newLabel: string;
}

// ============================================================================
// 7. HOME PERSONALIZATION
// ============================================================================

export type HomeSectionId =
  | 'continue'
  | 'attention'
  | 'focus'
  | 'today'
  | 'routines'
  | 'inbox'
  | 'projects'
  | 'saved-views'
  | 'domains';

export type HomeLayoutPresetId = 'balanced' | 'minimal' | 'planning' | 'custom';

export interface HomeSectionConfig {
  id: HomeSectionId;
  label: string;
  isVisible: boolean;
  order: number;
  itemLimit: number;
  density: 'compact' | 'comfortable';
}

export interface HomeCustomizationConfig {
  presetId: HomeLayoutPresetId;
  sections: HomeSectionConfig[];
  density: 'compact' | 'comfortable';
}

// ============================================================================
// 8. SAVED VIEWS
// ============================================================================

export type SavedViewDomain =
  | 'keep-workspace' // B3: bounded read-only union of native source records
  | 'notes'
  | 'tasks'
  | 'collection'
  | 'library'
  | 'finance'
  | 'assets'
  | 'projects';

export interface SavedViewFilterRule {
  field: string;
  operator: 'equals' | 'contains' | 'not-equals' | 'greater-than' | 'less-than' | 'in' | 'is-empty';
  value: any;
}

export interface SavedViewSortRule {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SavedViewConfig {
  id: string;
  name: string;
  description?: string;
  domain: SavedViewDomain;
  iconName?: string;
  filters: SavedViewFilterRule[];
  sort?: SavedViewSortRule;
  displayMode?: 'list' | 'cards' | 'table' | 'kanban';
  visibleColumns?: string[];
  isFavorite?: boolean;
  shortcut?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 9. QUALITY TEMPLATES
// ============================================================================

export type TemplateResourceType =
  | 'note'
  | 'daily-note'
  | 'project'
  | 'person'
  | 'interaction'
  | 'course'
  | 'review'
  | 'decision'
  | 'trip';

export interface QualityTemplate {
  id: string;
  name: string;
  description: string;
  resourceType: TemplateResourceType;
  content: string;
  isDefault: boolean;
  isBuiltIn: boolean;
  tags?: string[];
  metadataDefaults?: Record<string, any>;
  variablesUsed?: string[]; // e.g. ['date', 'time', 'title', 'context', 'project']
}

// ============================================================================
// 10. QUICK CAPTURE PRESETS
// ============================================================================

export type QuickCaptureDestination = 'inbox' | 'daily-note' | 'new-note' | 'tasks' | 'library';

export interface QuickCapturePreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  destination: QuickCaptureDestination;
  defaultTags: string[];
  templateId?: string;
  shortcut?: string;
  isDefault?: boolean;
  order: number;
}

// ============================================================================
// 11. CONFIGURATION EXPORT / IMPORT BUNDLE
// ============================================================================

export interface PersonalizationConfigBundle {
  version: '1.6.0';
  exportedAt: string;
  domainVisibility: DomainVisibilityConfig;
  navigation: {
    sidebarItems: NavigationItemConfig[];
    mobileNav: MobileBottomNavConfig;
  };
  favorites: FavoriteItem[];
  workspacePresets: AdvancedWorkspacePreset[];
  workflowPresets: WorkflowPreset[];
  shortcuts: ShortcutBinding[];
  home: HomeCustomizationConfig;
  savedViews: SavedViewConfig[];
  templates: QualityTemplate[];
  quickCapturePresets: QuickCapturePreset[];
  /** KEEP B1b: optional for compatible V1.6 backups. Declarative only. */
  resourceLinks?: Array<{ id: string; fromUri: string; toUri: string; label: string; createdAt: string }>;
}
