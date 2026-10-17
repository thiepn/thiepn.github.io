/**
 * V2.1 Experience Duplication Map & Consolidation Audit
 * 
 * Detailed audit of overlapping user-facing surfaces across V1.x and V2.0,
 * specifying target consolidation, keep/merge/remove decisions, mobile equivalents,
 * and keyboard shortcuts.
 */

export interface DuplicationAuditEntry {
  id: string;
  surfaceName: string;
  purpose: string;
  resourceTypes: string[];
  actionsExposed: string[];
  dataShown: string[];
  mobileEquivalent: string;
  keyboardEquivalent: string;
  overlapWith: string[];
  decision: 'MERGE' | 'KEEP_SPECIALIZED' | 'REMOVE_REDUNDANT';
  consolidationTarget: string;
  rationalization: string;
}

export const V2_1_EXPERIENCE_DUPLICATION_MAP: DuplicationAuditEntry[] = [
  {
    id: 'surface.resource_headers',
    surfaceName: 'Resource Headers',
    purpose: 'Display identity, status, breadcrumbs, and primary controls for an open resource',
    resourceTypes: ['note', 'project', 'person', 'course', 'trip', 'asset', 'decision', 'transaction'],
    actionsExposed: ['Back', 'Favorite', 'Edit', 'Status change', 'Delete', 'Share', 'Archive', 'More'],
    dataShown: ['Title', 'Type badge', 'Status indicator', 'Context breadcrumb', 'Modified date'],
    mobileEquivalent: 'Compact sticky header with icon-only action sheet trigger',
    keyboardEquivalent: 'Esc (Back), Ctrl/Cmd+D (Favorite), Ctrl/Cmd+E (Edit)',
    overlapWith: ['NoteModal header', 'Domain view individual headers', 'Canvas workspace header'],
    decision: 'MERGE',
    consolidationTarget: 'ResourceShellV2 / ResourceHeaderV2',
    rationalization: 'Consolidates 8 distinct header implementations into 1 unified header model with 1-3 visible primary actions and standardized More dropdown.',
  },
  {
    id: 'surface.connections_and_backlinks',
    surfaceName: 'Connections, Backlinks & Citations Panels',
    purpose: 'Display outgoing links, incoming backlinks, structured relations, and literature citations',
    resourceTypes: ['note', 'project', 'person', 'course', 'book', 'decision', 'asset'],
    actionsExposed: ['Navigate to linked resource', 'Add relation', 'Preview target', 'Remove relation'],
    dataShown: ['Wikilinks', 'Typed relations', 'Backlink snippets', 'PDF/Source citations', 'Suggested links'],
    mobileEquivalent: 'Unified Connections bottom sheet / full-screen drawer',
    keyboardEquivalent: 'Ctrl/Cmd+Shift+B (Toggle Connections), Arrow keys (Navigate links)',
    overlapWith: ['RelatedNotesSection', 'UnlinkedMentionsSection', 'V2ConnectionsPanel', 'NotePropertiesModal'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedConnectionsPanel',
    rationalization: 'Merges 4 disjointed relationship sidebars into 1 unified surface with grouped tabs (Links, Relations, Sources, Backlinks, Suggested) while strictly preserving canonical semantics.',
  },
  {
    id: 'surface.resource_inspectors',
    surfaceName: 'Properties, Context Lens & Metadata Sidebars',
    purpose: 'View and edit secondary metadata, custom frontmatter fields, context working set, and timeline',
    resourceTypes: ['all'],
    actionsExposed: ['Edit property', 'Add tag', 'Toggle context pin', 'View revision history'],
    dataShown: ['Frontmatter key-values', 'Tags', 'Word count / reading time', 'Context working set', 'History diffs'],
    mobileEquivalent: 'Unified Resource Inspector full-screen sheet',
    keyboardEquivalent: 'Ctrl/Cmd+I (Toggle Inspector)',
    overlapWith: ['NotePropertiesModal', 'ContextLensSidebar', 'VersionHistoryModal', 'DesktopMetaPanel'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedResourceInspector',
    rationalization: 'Consolidates scattered property modals and sidebars into a tabbed Inspector (Details, Connections, Context, Source, History) that remains secondary for notes.',
  },
  {
    id: 'surface.creation_dialogs',
    surfaceName: 'Resource Creation Dialogs & Wizards',
    purpose: 'Instantiate new resources across various domains',
    resourceTypes: ['note', 'task', 'project', 'person', 'course', 'decision', 'habit', 'asset', 'transaction'],
    actionsExposed: ['Enter fields', 'Select template', 'Assign tags', 'Link context', 'Create', 'Cancel'],
    dataShown: ['Initial input fields', 'Context prefill badges', 'Template selector'],
    mobileEquivalent: 'Fast adaptive creation bottom sheet with minimal initial fields',
    keyboardEquivalent: 'Ctrl/Cmd+N (Create Note), Ctrl/Cmd+Shift+N (Universal Create)',
    overlapWith: ['QuickNoteInput', 'ProjectModal', 'PersonModal', 'DecisionModal', 'TransactionModal'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedCreateModal',
    rationalization: 'Eliminates 9 separate multi-step wizards in favor of 1 universal chooser applying the Minimal Initial Fields principle with explicit context prefill.',
  },
  {
    id: 'surface.relation_pickers',
    surfaceName: 'Domain-Specific Relation & Linking Pickers',
    purpose: 'Search and link existing resources to the current resource',
    resourceTypes: ['all linkable types'],
    actionsExposed: ['Search resources', 'Filter by type', 'Select resource', 'Create new & link'],
    dataShown: ['Resource title', 'Type badge', 'Snippet / subtitle', 'Context indicator'],
    mobileEquivalent: 'Full-screen searchable selection sheet',
    keyboardEquivalent: 'Type to filter, Up/Down to navigate, Enter to select',
    overlapWith: ['PersonPickerModal', 'ProjectSelectDropdown', 'WikilinkAutocomplete', 'AssetLinkModal'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedRelationPicker',
    rationalization: 'Replaces per-domain linking dropdowns with 1 universal relation picker that supports type filtering, context prioritization, and instant "Create New & Link".',
  },
  {
    id: 'surface.home_dashboards',
    surfaceName: 'Home & Module Overview Dashboards',
    purpose: 'Provide daily orientation, recent activity, pending items, and attention items',
    resourceTypes: ['all'],
    actionsExposed: ['Resume work', 'Process inbox item', 'Complete task', 'Start context session'],
    dataShown: ['Active context (Now)', 'Recent notes (Continue)', 'Due items (Attention)', 'Today schedule', 'Inbox'],
    mobileEquivalent: 'Stacked clean single-column 5-pillar Home',
    keyboardEquivalent: 'Ctrl/Cmd+H (Go to Home)',
    overlapWith: ['P44 Dashboard', 'SmartViewsModal', 'RecentNotesList', 'InboxDashboard'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedHomeView (5-Pillar Restrained Home)',
    rationalization: 'Eliminates redundant metric widgets and duplicate items across sections, creating a calm 5-pillar structure (Now, Continue, Attention, Today, Inbox) with lazy module contributions.',
  },
  {
    id: 'surface.module_landing_pages',
    surfaceName: 'Domain Module Landing Pages',
    purpose: 'Serve as the functional entrypoint for each optional life domain',
    resourceTypes: ['person', 'habit', 'course', 'book', 'transaction', 'health_metric', 'itinerary', 'asset', 'decision'],
    actionsExposed: ['1 Primary Action button', 'Scoped search', 'Filter by status/tag', 'Open resource'],
    dataShown: ['Title & icon', 'Active queue / current items', 'Saved views / chips', 'Recent records'],
    mobileEquivalent: 'Mobile card-based module landing with floating primary action',
    keyboardEquivalent: '/ (Focus scoped search), Ctrl/Cmd+Alt+N (Primary module create)',
    overlapWith: ['Individual full-screen dashboard charts', 'Legacy table managers'],
    decision: 'MERGE',
    consolidationTarget: 'UnifiedModuleLanding (Standardized Module Template)',
    rationalization: 'Transforms heavy analytical dashboards into consistent, action-oriented landing views that prioritize doing over passive analytics.',
  },
  {
    id: 'surface.action_menus',
    surfaceName: 'Resource Action Menus (...)',
    purpose: 'Expose secondary and dangerous operations for resources',
    resourceTypes: ['all'],
    actionsExposed: ['Open/Navigate', 'Create/Relate', 'Favorite/Focus', 'Share/Export', 'Archive', 'Trash'],
    dataShown: ['Action label', 'Action icon', 'Keyboard shortcut', 'Destructive warning'],
    mobileEquivalent: 'Standardized bottom sheet action menu',
    keyboardEquivalent: 'Context menu key / Shift+F10',
    overlapWith: ['NoteCard menu', 'ListView row menu', 'Header dropdown', 'Editor more menu'],
    decision: 'MERGE',
    consolidationTarget: 'ResourceActionMenu',
    rationalization: 'Enforces a strict 6-tier canonical action ordering across all resource types with consistent Action IDs wired to ActionSystemV2.',
  },
];
