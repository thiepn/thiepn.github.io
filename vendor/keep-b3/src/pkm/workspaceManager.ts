import {
  WorkspaceLayout,
  WorkspacePane,
  WorkspaceTab,
  WorkspaceSurfaceType,
  WorkspaceSplitOrientation,
  WorkspacePresetKey,
  WorkspacePreset,
  OpenResourceOptions,
  WorkspaceNavigationEntry,
} from './workspaceTypes';
import { Note } from '../types';

export const WORKSPACE_STORAGE_KEY = 'keepnotes_workspace_layout_v1';
const CURRENT_VERSION = 1;

/**
 * Creates a clean default workspace layout (Single pane with Vault Home tab)
 */
export function createInitialLayout(): WorkspaceLayout {
  const homeTab: WorkspaceTab = {
    id: 'tab-vault-home',
    type: 'home',
    title: 'Vault Notes',
    pinned: true,
    lastAccessedAt: Date.now(),
  };

  const defaultPane: WorkspacePane = {
    id: 'pane-primary',
    tabs: [homeTab],
    activeTabId: homeTab.id,
  };

  return {
    version: CURRENT_VERSION,
    panes: [defaultPane],
    activePaneId: defaultPane.id,
    splitOrientation: 'horizontal',
    splitRatio: 0.5,
    isSplit: false,
    history: [
      {
        paneId: defaultPane.id,
        tabId: homeTab.id,
        surfaceType: 'home',
        title: homeTab.title,
        timestamp: Date.now(),
      },
    ],
    historyIndex: 0,
    closedTabs: [],
  };
}

/**
 * Generates a unique Tab ID
 */
export function generateTabId(type: WorkspaceSurfaceType, resourceId?: string): string {
  const cleanRes = resourceId ? `-${resourceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16)}` : '';
  return `tab-${type}${cleanRes}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Generates a unique Pane ID
 */
export function generatePaneId(): string {
  return `pane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Resolve target pane ID based on target options and modifiers
 */
export function resolveTargetPane(
  layout: WorkspaceLayout,
  options?: OpenResourceOptions
): { targetPaneId: string; shouldSplit: boolean; orientation: WorkspaceSplitOrientation } {
  let targetPaneId = layout.activePaneId;
  let shouldSplit = false;
  let orientation: WorkspaceSplitOrientation = layout.splitOrientation;

  // Modifiers evaluation
  if (options?.eventModifier) {
    if (options.eventModifier.altKey) {
      // Alt+click opens in split / adjacent pane
      if (layout.panes.length > 1) {
        const other = layout.panes.find((p) => p.id !== layout.activePaneId);
        if (other) targetPaneId = other.id;
      } else {
        shouldSplit = true;
      }
    }
  }

  // Explicit target option
  if (options?.targetPane) {
    if (options.targetPane === 'adjacent') {
      if (layout.panes.length > 1) {
        const other = layout.panes.find((p) => p.id !== layout.activePaneId);
        if (other) targetPaneId = other.id;
      } else {
        shouldSplit = true;
      }
    } else if (options.targetPane === 'split-right') {
      orientation = 'horizontal';
      shouldSplit = true;
    } else if (options.targetPane === 'split-down') {
      orientation = 'vertical';
      shouldSplit = true;
    } else if (options.targetPane !== 'active' && options.targetPane !== 'new-tab') {
      // Direct pane ID specified
      const exists = layout.panes.some((p) => p.id === options.targetPane);
      if (exists) {
        targetPaneId = options.targetPane;
      }
    }
  }

  return { targetPaneId, shouldSplit, orientation };
}

/**
 * Open or activate a resource tab in the workspace
 */
export function openTab(
  layout: WorkspaceLayout,
  tabDef: {
    type: WorkspaceSurfaceType;
    resourceId?: string;
    title: string;
    viewState?: Record<string, any>;
    pinned?: boolean;
  },
  options?: OpenResourceOptions
): WorkspaceLayout {
  let nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));

  const { targetPaneId, shouldSplit, orientation } = resolveTargetPane(nextLayout, options);

  // If we should split and we only have 1 pane, split first
  if (shouldSplit && nextLayout.panes.length === 1) {
    nextLayout = splitPane(nextLayout, orientation);
    // Find the newly created pane (the second one)
    const newPane = nextLayout.panes[1];
    if (newPane) {
      return openTab(nextLayout, tabDef, { ...options, targetPane: newPane.id });
    }
  }

  // Find target pane
  let targetPane = nextLayout.panes.find((p) => p.id === targetPaneId);
  if (!targetPane) {
    targetPane = nextLayout.panes[0];
  }

  // Check if an existing tab in this pane already displays this exact resource
  let existingTab: WorkspaceTab | undefined;
  if (tabDef.type === 'home' || tabDef.type === 'graph' || tabDef.type === 'kanban' || tabDef.type === 'smart-view') {
    existingTab = targetPane.tabs.find((t) => t.type === tabDef.type);
  } else if (tabDef.resourceId) {
    existingTab = targetPane.tabs.find(
      (t) => t.type === tabDef.type && t.resourceId === tabDef.resourceId
    );
  }

  if (existingTab && !options?.replaceCurrent) {
    // Tab already exists in this pane: simply activate it and update viewState / title if provided
    existingTab.lastAccessedAt = Date.now();
    if (tabDef.title) existingTab.title = tabDef.title;
    if (tabDef.viewState) {
      existingTab.viewState = { ...(existingTab.viewState || {}), ...tabDef.viewState };
    }
    targetPane.activeTabId = existingTab.id;
    nextLayout.activePaneId = targetPane.id;

    // Record history
    nextLayout = recordHistory(nextLayout, targetPane.id, existingTab);
    return nextLayout;
  }

  // Replace current tab if explicitly asked and current tab is not pinned
  if (options?.replaceCurrent && targetPane.activeTabId) {
    const curIdx = targetPane.tabs.findIndex((t) => t.id === targetPane.activeTabId);
    if (curIdx !== -1 && !targetPane.tabs[curIdx].pinned) {
      const newTab: WorkspaceTab = {
        id: generateTabId(tabDef.type, tabDef.resourceId),
        type: tabDef.type,
        resourceId: tabDef.resourceId,
        title: tabDef.title,
        pinned: tabDef.pinned ?? false,
        viewState: tabDef.viewState || {},
        lastAccessedAt: Date.now(),
      };
      targetPane.tabs[curIdx] = newTab;
      targetPane.activeTabId = newTab.id;
      nextLayout.activePaneId = targetPane.id;
      nextLayout = recordHistory(nextLayout, targetPane.id, newTab);
      return nextLayout;
    }
  }

  // Create new tab
  const newTab: WorkspaceTab = {
    id: generateTabId(tabDef.type, tabDef.resourceId),
    type: tabDef.type,
    resourceId: tabDef.resourceId,
    title: tabDef.title,
    pinned: tabDef.pinned ?? false,
    viewState: tabDef.viewState || {},
    lastAccessedAt: Date.now(),
  };

  targetPane.tabs.push(newTab);
  if (options?.activate !== false && !options?.background) {
    targetPane.activeTabId = newTab.id;
    nextLayout.activePaneId = targetPane.id;
    nextLayout = recordHistory(nextLayout, targetPane.id, newTab);
  }

  return nextLayout;
}

/**
 * Record a navigation history step
 */
function recordHistory(
  layout: WorkspaceLayout,
  paneId: string,
  tab: WorkspaceTab
): WorkspaceLayout {
  const entry: WorkspaceNavigationEntry = {
    paneId,
    tabId: tab.id,
    surfaceType: tab.type,
    resourceId: tab.resourceId,
    title: tab.title,
    timestamp: Date.now(),
  };

  // Truncate forward history if we were in the middle
  const updatedHistory = layout.history.slice(0, layout.historyIndex + 1);
  updatedHistory.push(entry);

  // Cap history at 50 entries
  if (updatedHistory.length > 50) {
    updatedHistory.shift();
  }

  return {
    ...layout,
    history: updatedHistory,
    historyIndex: updatedHistory.length - 1,
  };
}

/**
 * Close a tab from a pane
 */
export function closeTab(
  layout: WorkspaceLayout,
  paneId: string,
  tabId: string
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const pane = nextLayout.panes.find((p) => p.id === paneId);
  if (!pane) return layout;

  const tabIndex = pane.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) return layout;

  const closedTab = pane.tabs[tabIndex];

  // Remove tab
  pane.tabs.splice(tabIndex, 1);

  // Save to closedTabs stack (cap at 20)
  const closedTabs = [closedTab, ...(nextLayout.closedTabs || [])].slice(0, 20);
  nextLayout.closedTabs = closedTabs;

  // If pane is now empty:
  if (pane.tabs.length === 0) {
    if (nextLayout.panes.length > 1) {
      // Auto-collapse this pane if multi-pane
      return closePane(nextLayout, paneId);
    } else {
      // Default to Home tab so screen is never blank
      const homeTab: WorkspaceTab = {
        id: 'tab-vault-home',
        type: 'home',
        title: 'Vault Notes',
        pinned: false,
        lastAccessedAt: Date.now(),
      };
      pane.tabs.push(homeTab);
      pane.activeTabId = homeTab.id;
      return nextLayout;
    }
  }

  // Update activeTabId if the closed tab was currently active
  if (pane.activeTabId === tabId) {
    const nextIdx = Math.min(tabIndex, pane.tabs.length - 1);
    pane.activeTabId = pane.tabs[nextIdx].id;
    pane.tabs[nextIdx].lastAccessedAt = Date.now();
  }

  return nextLayout;
}

/**
 * Reopen the most recently closed tab
 */
export function reopenClosedTab(layout: WorkspaceLayout): WorkspaceLayout {
  if (!layout.closedTabs || layout.closedTabs.length === 0) {
    return layout;
  }

  const [tabToReopen, ...remainingClosed] = layout.closedTabs;
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  nextLayout.closedTabs = remainingClosed;

  return openTab(nextLayout, {
    type: tabToReopen.type,
    resourceId: tabToReopen.resourceId,
    title: tabToReopen.title,
    pinned: tabToReopen.pinned,
    viewState: tabToReopen.viewState,
  });
}

/**
 * Activate a tab in a pane
 */
export function activateTab(
  layout: WorkspaceLayout,
  paneId: string,
  tabId: string
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const pane = nextLayout.panes.find((p) => p.id === paneId);
  if (!pane) return layout;

  const tab = pane.tabs.find((t) => t.id === tabId);
  if (!tab) return layout;

  pane.activeTabId = tabId;
  tab.lastAccessedAt = Date.now();
  nextLayout.activePaneId = paneId;

  return recordHistory(nextLayout, paneId, tab);
}

/**
 * Reorder tabs within a pane
 */
export function reorderTabs(
  layout: WorkspaceLayout,
  paneId: string,
  fromIndex: number,
  toIndex: number
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const pane = nextLayout.panes.find((p) => p.id === paneId);
  if (!pane || fromIndex < 0 || fromIndex >= pane.tabs.length || toIndex < 0 || toIndex >= pane.tabs.length) {
    return layout;
  }

  const [movedTab] = pane.tabs.splice(fromIndex, 1);
  pane.tabs.splice(toIndex, 0, movedTab);

  return nextLayout;
}

/**
 * Move a tab from one pane to another
 */
export function moveTabToPane(
  layout: WorkspaceLayout,
  sourcePaneId: string,
  targetPaneId: string,
  tabId: string,
  targetIndex?: number
): WorkspaceLayout {
  if (sourcePaneId === targetPaneId) return layout;

  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const sourcePane = nextLayout.panes.find((p) => p.id === sourcePaneId);
  const targetPane = nextLayout.panes.find((p) => p.id === targetPaneId);
  if (!sourcePane || !targetPane) return layout;

  const tabIndex = sourcePane.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) return layout;

  const [tab] = sourcePane.tabs.splice(tabIndex, 1);

  // Insert into target
  if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetPane.tabs.length) {
    targetPane.tabs.splice(targetIndex, 0, tab);
  } else {
    targetPane.tabs.push(tab);
  }

  targetPane.activeTabId = tab.id;
  nextLayout.activePaneId = targetPaneId;

  // Handle empty source pane
  if (sourcePane.tabs.length === 0) {
    return closePane(nextLayout, sourcePaneId);
  } else if (sourcePane.activeTabId === tabId) {
    sourcePane.activeTabId = sourcePane.tabs[0].id;
  }

  return nextLayout;
}

/**
 * Toggle pinned status for a tab
 */
export function togglePinTab(
  layout: WorkspaceLayout,
  paneId: string,
  tabId: string
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const pane = nextLayout.panes.find((p) => p.id === paneId);
  if (!pane) return layout;

  const tab = pane.tabs.find((t) => t.id === tabId);
  if (!tab) return layout;

  tab.pinned = !tab.pinned;
  return nextLayout;
}

/**
 * Update view state for a specific tab
 */
export function updateTabViewState(
  layout: WorkspaceLayout,
  tabId: string,
  viewState: Record<string, any>
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  for (const pane of nextLayout.panes) {
    const tab = pane.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.viewState = { ...(tab.viewState || {}), ...viewState };
      return nextLayout;
    }
  }
  return layout;
}

/**
 * Update title for any tab referencing a specific resource
 */
export function updateTabTitle(
  layout: WorkspaceLayout,
  resourceId: string,
  type: WorkspaceSurfaceType,
  newTitle: string
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  let modified = false;

  for (const pane of nextLayout.panes) {
    for (const tab of pane.tabs) {
      if (tab.type === type && tab.resourceId === resourceId) {
        tab.title = newTitle;
        modified = true;
      }
    }
  }

  return modified ? nextLayout : layout;
}

/**
 * Split workspace into 2 panes (horizontal or vertical)
 */
export function splitPane(
  layout: WorkspaceLayout,
  orientation: WorkspaceSplitOrientation = 'horizontal',
  initialTab?: WorkspaceTab
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));

  // If already split with 2 panes, just update orientation
  if (nextLayout.panes.length >= 2) {
    nextLayout.splitOrientation = orientation;
    nextLayout.isSplit = true;
    return nextLayout;
  }

  const primaryPane = nextLayout.panes[0] || {
    id: generatePaneId(),
    tabs: [],
    activeTabId: null,
  };

  // Determine second pane's initial tab
  let secondPaneTab: WorkspaceTab;
  if (initialTab) {
    secondPaneTab = { ...initialTab, id: generateTabId(initialTab.type, initialTab.resourceId) };
  } else {
    // Clone or pick active tab or fallback to home
    const activeTab = primaryPane.tabs.find((t) => t.id === primaryPane.activeTabId);
    if (activeTab) {
      secondPaneTab = { ...activeTab, id: generateTabId(activeTab.type, activeTab.resourceId) };
    } else {
      secondPaneTab = {
        id: 'tab-vault-home-split',
        type: 'home',
        title: 'Vault Notes',
        pinned: false,
        lastAccessedAt: Date.now(),
      };
    }
  }

  const secondaryPane: WorkspacePane = {
    id: generatePaneId(),
    tabs: [secondPaneTab],
    activeTabId: secondPaneTab.id,
  };

  nextLayout.panes = [primaryPane, secondaryPane];
  nextLayout.splitOrientation = orientation;
  nextLayout.isSplit = true;
  nextLayout.activePaneId = secondaryPane.id;

  return nextLayout;
}

/**
 * Close a split pane and merge remaining tabs to primary pane
 */
export function closePane(
  layout: WorkspaceLayout,
  paneIdToClose: string
): WorkspaceLayout {
  if (layout.panes.length <= 1) return layout;

  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const remainingPane = nextLayout.panes.find((p) => p.id !== paneIdToClose);
  const closingPane = nextLayout.panes.find((p) => p.id === paneIdToClose);

  if (!remainingPane || !closingPane) return layout;

  // Preserve non-duplicate tabs by moving them over
  for (const tab of closingPane.tabs) {
    const exists = remainingPane.tabs.some(
      (t) => t.type === tab.type && t.resourceId === tab.resourceId
    );
    if (!exists) {
      remainingPane.tabs.push(tab);
    }
  }

  nextLayout.panes = [remainingPane];
  nextLayout.activePaneId = remainingPane.id;
  nextLayout.isSplit = false;

  return nextLayout;
}

/**
 * Swap positions of the two panes
 */
export function swapPanes(layout: WorkspaceLayout): WorkspaceLayout {
  if (layout.panes.length < 2) return layout;

  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  const [paneA, paneB] = nextLayout.panes;
  nextLayout.panes = [paneB, paneA];
  return nextLayout;
}

/**
 * Focus a specific pane
 */
export function focusPane(layout: WorkspaceLayout, paneId: string): WorkspaceLayout {
  if (layout.activePaneId === paneId) return layout;
  const exists = layout.panes.some((p) => p.id === paneId);
  if (!exists) return layout;

  return {
    ...layout,
    activePaneId: paneId,
  };
}

/**
 * Set Split Ratio (clamped 0.15 to 0.85)
 */
export function setSplitRatio(layout: WorkspaceLayout, ratio: number): WorkspaceLayout {
  const clamped = Math.max(0.2, Math.min(0.8, ratio));
  return {
    ...layout,
    splitRatio: clamped,
  };
}

/**
 * Navigate backward in history
 */
export function navigateBack(layout: WorkspaceLayout): WorkspaceLayout {
  if (layout.historyIndex <= 0) return layout;

  const targetIndex = layout.historyIndex - 1;
  const entry = layout.history[targetIndex];
  if (!entry) return layout;

  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  nextLayout.historyIndex = targetIndex;

  const pane = nextLayout.panes.find((p) => p.id === entry.paneId) || nextLayout.panes[0];
  if (!pane) return layout;

  const tab = pane.tabs.find((t) => t.id === entry.tabId);
  if (tab) {
    pane.activeTabId = tab.id;
    nextLayout.activePaneId = pane.id;
  } else {
    // Open as new tab
    return openTab(nextLayout, {
      type: entry.surfaceType,
      resourceId: entry.resourceId,
      title: entry.title,
    }, { targetPane: pane.id });
  }

  return nextLayout;
}

/**
 * Navigate forward in history
 */
export function navigateForward(layout: WorkspaceLayout): WorkspaceLayout {
  if (layout.historyIndex >= layout.history.length - 1) return layout;

  const targetIndex = layout.historyIndex + 1;
  const entry = layout.history[targetIndex];
  if (!entry) return layout;

  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  nextLayout.historyIndex = targetIndex;

  const pane = nextLayout.panes.find((p) => p.id === entry.paneId) || nextLayout.panes[0];
  if (!pane) return layout;

  const tab = pane.tabs.find((t) => t.id === entry.tabId);
  if (tab) {
    pane.activeTabId = tab.id;
    nextLayout.activePaneId = pane.id;
  } else {
    return openTab(nextLayout, {
      type: entry.surfaceType,
      resourceId: entry.resourceId,
      title: entry.title,
    }, { targetPane: pane.id });
  }

  return nextLayout;
}

/**
 * Clean up tabs referencing notes or PDFs that have been permanently deleted
 */
export function cleanDanglingReferences(
  layout: WorkspaceLayout,
  validNoteIds: Set<string>,
  validPdfIds: Set<string>
): WorkspaceLayout {
  const nextLayout: WorkspaceLayout = JSON.parse(JSON.stringify(layout));
  let modified = false;

  for (const pane of nextLayout.panes) {
    const validTabs: WorkspaceTab[] = [];
    for (const tab of pane.tabs) {
      if (tab.type === 'note' && tab.resourceId && !validNoteIds.has(tab.resourceId)) {
        modified = true;
        continue; // drop dangling note
      }
      if (tab.type === 'pdf' && tab.resourceId && !validPdfIds.has(tab.resourceId)) {
        modified = true;
        continue; // drop dangling PDF
      }
      validTabs.push(tab);
    }

    if (validTabs.length === 0) {
      // Provide home tab if all dropped
      const homeTab: WorkspaceTab = {
        id: 'tab-vault-home',
        type: 'home',
        title: 'Vault Notes',
        pinned: false,
        lastAccessedAt: Date.now(),
      };
      pane.tabs = [homeTab];
      pane.activeTabId = homeTab.id;
      modified = true;
    } else {
      pane.tabs = validTabs;
      if (!validTabs.some((t) => t.id === pane.activeTabId)) {
        pane.activeTabId = validTabs[0].id;
        modified = true;
      }
    }
  }

  return modified ? nextLayout : layout;
}

/**
 * Built-in Workspace Presets
 */
export const WORKSPACE_PRESETS: Record<WorkspacePresetKey, WorkspacePreset> = {
  research: {
    key: 'research',
    label: 'Research Mode',
    description: 'Note editor on the left with PDF reader on the right',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Note Editor' },
    rightSurface: { type: 'pdf', title: 'PDF Reader' },
  },
  knowledge: {
    key: 'knowledge',
    label: 'Knowledge Graph',
    description: 'Note editor on the left with interactive Graph on the right',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Note Editor' },
    rightSurface: { type: 'graph', title: 'Knowledge Graph' },
  },
  planning: {
    key: 'planning',
    label: 'Sprint Planning',
    description: 'Note editor on the left with Kanban board on the right',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Sprint Backlog' },
    rightSurface: { type: 'kanban', title: 'Kanban Board' },
  },
  spatial: {
    key: 'spatial',
    label: 'Spatial Ideation',
    description: 'Note editor on the left with infinite visual canvas on the right',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Note Editor' },
    rightSurface: { type: 'canvas', title: 'Infinite Canvas' },
  },
  comparison: {
    key: 'comparison',
    label: 'Document Compare',
    description: 'Two note editors side-by-side for reference or diff comparison',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Primary Note' },
    rightSurface: { type: 'note', title: 'Secondary Note' },
  },
  temporal: {
    key: 'temporal',
    label: 'Temporal Workspace',
    description: 'Note editor on the left with Calendar & Agenda on the right',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'note', title: 'Daily Note' },
    rightSurface: { type: 'calendar', title: 'Calendar & Agenda' },
  },
  'default-clean': {
    key: 'default-clean',
    label: 'Single Surface',
    description: 'Single full-width workspace pane focusing on the active task',
    splitOrientation: 'horizontal',
    leftSurface: { type: 'home', title: 'Vault Notes' },
  },
};

/**
 * Apply a layout preset
 */
export function applyPreset(
  layout: WorkspaceLayout,
  presetKey: WorkspacePresetKey,
  context?: {
    primaryNoteId?: string;
    secondaryNoteId?: string;
    pdfId?: string;
    notes?: Note[];
  }
): WorkspaceLayout {
  const preset = WORKSPACE_PRESETS[presetKey];
  if (!preset) return layout;

  if (presetKey === 'default-clean') {
    return createInitialLayout();
  }

  const primaryNote = context?.primaryNoteId
    ? context.notes?.find((n) => n.id === context.primaryNoteId)
    : context?.notes?.[0];

  const secondaryNote = context?.secondaryNoteId
    ? context.notes?.find((n) => n.id === context.secondaryNoteId)
    : context?.notes?.find((n) => n.id !== primaryNote?.id) || primaryNote;

  const leftTab: WorkspaceTab = {
    id: generateTabId(preset.leftSurface.type, primaryNote?.id),
    type: preset.leftSurface.type,
    resourceId: preset.leftSurface.type === 'note' ? primaryNote?.id : undefined,
    title: primaryNote ? primaryNote.title : preset.leftSurface.title,
    lastAccessedAt: Date.now(),
  };

  const rightTab: WorkspaceTab = {
    id: generateTabId(
      preset.rightSurface?.type || 'graph',
      preset.rightSurface?.type === 'note'
        ? secondaryNote?.id
        : preset.rightSurface?.type === 'pdf'
        ? context?.pdfId
        : undefined
    ),
    type: preset.rightSurface?.type || 'graph',
    resourceId:
      preset.rightSurface?.type === 'note'
        ? secondaryNote?.id
        : preset.rightSurface?.type === 'pdf'
        ? context?.pdfId
        : undefined,
    title:
      preset.rightSurface?.type === 'note' && secondaryNote
        ? secondaryNote.title
        : preset.rightSurface?.title || 'Knowledge Graph',
    lastAccessedAt: Date.now(),
  };

  const pane1: WorkspacePane = {
    id: 'pane-left',
    tabs: [leftTab],
    activeTabId: leftTab.id,
  };

  const pane2: WorkspacePane = {
    id: 'pane-right',
    tabs: [rightTab],
    activeTabId: rightTab.id,
  };

  return {
    version: CURRENT_VERSION,
    panes: [pane1, pane2],
    activePaneId: pane1.id,
    splitOrientation: preset.splitOrientation,
    splitRatio: 0.5,
    isSplit: true,
    history: [
      {
        paneId: pane1.id,
        tabId: leftTab.id,
        surfaceType: leftTab.type,
        resourceId: leftTab.resourceId,
        title: leftTab.title,
        timestamp: Date.now(),
      },
    ],
    historyIndex: 0,
    closedTabs: [],
  };
}

/**
 * Storage Helpers
 */
export function loadStoredWorkspaceLayout(): WorkspaceLayout {
  if (typeof localStorage === 'undefined') return createInitialLayout();

  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return createInitialLayout();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.panes) || parsed.panes.length === 0) {
      return createInitialLayout();
    }

    // Validate pane structure
    for (const p of parsed.panes) {
      if (!Array.isArray(p.tabs) || p.tabs.length === 0) {
        return createInitialLayout();
      }
    }

    return {
      version: parsed.version || CURRENT_VERSION,
      panes: parsed.panes,
      activePaneId: parsed.activePaneId || parsed.panes[0].id,
      splitOrientation: parsed.splitOrientation || 'horizontal',
      splitRatio: typeof parsed.splitRatio === 'number' ? Math.max(0.15, Math.min(0.85, parsed.splitRatio)) : 0.5,
      isSplit: parsed.panes.length > 1,
      history: Array.isArray(parsed.history) ? parsed.history.slice(-50) : [],
      historyIndex: typeof parsed.historyIndex === 'number' ? parsed.historyIndex : 0,
      closedTabs: Array.isArray(parsed.closedTabs) ? parsed.closedTabs.slice(0, 20) : [],
    };
  } catch (err) {
    console.warn('Failed to parse stored workspace layout:', err);
    return createInitialLayout();
  }
}

export function saveStoredWorkspaceLayout(layout: WorkspaceLayout): void {
  if (typeof localStorage === 'undefined') return;

  try {
    // Sanitize layout to ensure no secrets or bloated memory
    const cleanLayout: WorkspaceLayout = {
      version: layout.version,
      panes: layout.panes.map((p) => ({
        id: p.id,
        tabs: p.tabs.map((t) => ({
          id: t.id,
          type: t.type,
          resourceId: t.resourceId,
          title: t.title,
          pinned: t.pinned,
          viewState: t.viewState ? { ...t.viewState } : undefined,
          lastAccessedAt: t.lastAccessedAt,
        })),
        activeTabId: p.activeTabId,
      })),
      activePaneId: layout.activePaneId,
      splitOrientation: layout.splitOrientation,
      splitRatio: layout.splitRatio,
      isSplit: layout.panes.length > 1,
      history: layout.history.slice(-30),
      historyIndex: layout.historyIndex,
      closedTabs: layout.closedTabs.slice(0, 15),
    };

    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(cleanLayout));
  } catch (err) {
    console.warn('Failed to save workspace layout:', err);
  }
}
