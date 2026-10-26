export type SplitMode = 'single' | 'edit-preview' | 'two-note';

export type PinnedPane = 'none' | 'left' | 'right';

export interface SplitLayoutState {
  mode: SplitMode;
  splitRatio: number; // percentage width of left pane on desktop, e.g. 50 (range: 20 to 80)
  syncScroll: boolean;
  pinnedPane: PinnedPane;
  secondaryNoteId: string | null;
  activeMobileTab: 'left' | 'right';
}

export const DEFAULT_SPLIT_LAYOUT: SplitLayoutState = {
  mode: 'single',
  splitRatio: 50,
  syncScroll: true,
  pinnedPane: 'none',
  secondaryNoteId: null,
  activeMobileTab: 'left',
};

const STORAGE_KEY = 'pkm_split_layout_v1';

export function loadStoredSplitLayout(): SplitLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SPLIT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === 'edit-preview' || parsed.mode === 'two-note' ? parsed.mode : 'single',
      splitRatio: typeof parsed.splitRatio === 'number' ? Math.max(20, Math.min(80, parsed.splitRatio)) : 50,
      syncScroll: typeof parsed.syncScroll === 'boolean' ? parsed.syncScroll : true,
      pinnedPane: parsed.pinnedPane === 'left' || parsed.pinnedPane === 'right' ? parsed.pinnedPane : 'none',
      secondaryNoteId: typeof parsed.secondaryNoteId === 'string' ? parsed.secondaryNoteId : null,
      activeMobileTab: parsed.activeMobileTab === 'right' ? 'right' : 'left',
    };
  } catch {
    return DEFAULT_SPLIT_LAYOUT;
  }
}

export function saveStoredSplitLayout(state: Partial<SplitLayoutState>): void {
  try {
    const current = loadStoredSplitLayout();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}
