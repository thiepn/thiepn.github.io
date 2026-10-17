export type NoteType = 'text' | 'checklist';

export type NoteColorKey =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'rose'
  | 'emerald'
  | 'cyan'
  | 'lime'
  | 'fuchsia'
  | 'amber'
  | 'violet'
  | 'brown'
  | 'slate'
  | 'gray';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteImage {
  id: string;
  name: string;
  dataUrl: string;
  url?: string;
  caption?: string;
  size?: number;
}

export interface NoteRevision {
  id: string;
  timestamp: string; // ISO string
  title: string;
  content: string;
  checklist: ChecklistItem[];
  summary?: string;
  wordCount?: number;
}

export interface NoteAudio {
  id: string;
  name: string;
  dataUrl: string;
  duration?: number;
  createdAt: string;
}

export interface NoteTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  type: NoteType;
  checklist?: ChecklistItem[];
  tags?: string[];
  color?: NoteColorKey;
  icon?: string;
  isCustom?: boolean;
}

export type NotePriority = 'urgent' | 'high' | 'medium' | 'low';
export type NoteStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown or plain text
  type: NoteType;
  checklist: ChecklistItem[];
  color: NoteColorKey;
  tags: string[]; // e.g. ["work", "ideas"] without #
  folderId: string | null;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  reminderDate: string | null; // ISO string
  images: NoteImage[];
  audios?: NoteAudio[];
  sourceUrl?: string; // Web capture source attribution URL
  linkedNoteIds?: string[]; // IDs of explicitly linked notes
  revisions?: NoteRevision[];
  isLocked?: boolean;
  lockHash?: string; // SHA-256 hash of password/PIN
  isFavorite?: boolean;
  order?: number; // Zero-based index for custom manual sorting
  priority?: NotePriority;
  status?: NoteStatus;
  properties?: Record<string, any>;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  createdAt: string;
  autoSortByTag?: boolean;
  autoSortTag?: string | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  icon?: string;
  createdAt: string;
}

export type ViewMode = 'masonry' | 'list' | 'recent' | 'stacked' | 'calendar' | 'graph' | 'kanban';
export type GridColumns = 'auto' | '2' | '3' | '4' | '5';
export type CardDensity = 'compact' | 'comfortable' | 'spacious';
export type BuiltinThemeMode =
  | 'light'
  | 'dark'
  | 'system'
  | 'cyberpunk'
  | 'synthwave'
  | 'nordic'
  | 'forest'
  | 'sunset'
  | 'sakura'
  | 'matrix'
  | 'dracula'
  | 'sepia'
  | 'ocean'
  | 'monokai';

export type ThemeMode = BuiltinThemeMode | (string & {});

export interface CustomTheme {
  id: string; // e.g. "custom-1718000000000" or custom identifier
  name: string;
  primaryColor: string; // Hex for primary element/brand color
  backgroundColor: string; // Hex for canvas / page background
  accentColor: string; // Hex for accent buttons, glow, badges
  cardColor?: string; // Hex for note card surface (optional)
  textColor?: string; // Hex for primary text (optional)
  isDark?: boolean; // explicitly set or auto-calculated from background luminance
  createdAt?: string;
  updatedAt?: string;
}

export type CanvasBackground =
  | 'clean'
  | 'warm-paper'
  | 'subtle-dots'
  | 'subtle-grid'
  | 'vintage-notepad'
  | 'dark-obsidian'
  | 'isometric-grid'
  | 'neon-circuit'
  | 'galaxy-dust'
  | 'japanese-washi'
  | 'blueprint'
  | 'honeycomb';

export type AccentColorKey =
  | 'amber'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'pink'
  | 'cyan'
  | 'orange'
  | 'lime';

export type AppFontFamily = 'sans' | 'serif' | 'mono' | 'handwriting';
export type AppFontSize = 'sm' | 'md' | 'lg';

export interface AppSettings {
  theme: ThemeMode;
  customThemes?: CustomTheme[];
  accentColor?: AccentColorKey;
  canvasBackground: CanvasBackground;
  defaultViewMode: ViewMode;
  gridColumns: GridColumns;
  cardDensity: CardDensity;
  compactMode?: boolean;
  fontFamily: AppFontFamily;
  fontSize: AppFontSize;
  autoArchiveChecked: boolean;
  confirmDelete: boolean;
  defaultColor: NoteColorKey;
  defaultFolderId: string | null;
  showMonthDividers: boolean;
  enableWikiLinks: boolean;
  sortBy: 'updatedAt' | 'createdAt' | 'title' | 'reminder' | 'manual';
  sortOrder: 'asc' | 'desc';
  cardGlow?: boolean;
  vibrantMode?: boolean;
}

export interface FilterState {
  searchQuery: string;
  selectedFolderId: string | null; // null = all, 'unorganized' = no folder
  selectedTag: string | null;
  selectedColor: NoteColorKey | null;
  selectedType: 'all' | 'text' | 'checklist';
  scope: 'active' | 'reminders' | 'archived' | 'trash' | 'favorites';
  viewMode: ViewMode;
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'reminder' | 'manual';
  sortOrder?: 'asc' | 'desc';
  selectedMonth?: string | null;
  hasReminderOnly?: boolean;
  hasImagesOnly?: boolean;
  hasLinksOnly?: boolean;
  isFavoriteOnly?: boolean;
  pinnedOnly?: boolean;
}

export interface SyncStatus {
  lastSyncTime: string | null;
  folderConnected: boolean;
  folderName: string | null;
  itemCount: number;
}
