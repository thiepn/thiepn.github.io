import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  WorkspaceLayout,
  WorkspacePane,
  WorkspaceTab,
  WorkspaceSurfaceType,
  WorkspaceSplitOrientation,
  WorkspacePresetKey,
  OpenResourceOptions,
} from './workspaceTypes';
import {
  createInitialLayout,
  loadStoredWorkspaceLayout,
  saveStoredWorkspaceLayout,
  openTab as engineOpenTab,
  closeTab as engineCloseTab,
  reopenClosedTab as engineReopenClosedTab,
  activateTab as engineActivateTab,
  reorderTabs as engineReorderTabs,
  moveTabToPane as engineMoveTabToPane,
  togglePinTab as engineTogglePinTab,
  updateTabViewState as engineUpdateTabViewState,
  updateTabTitle as engineUpdateTabTitle,
  splitPane as engineSplitPane,
  closePane as engineClosePane,
  swapPanes as engineSwapPanes,
  focusPane as engineFocusPane,
  setSplitRatio as engineSetSplitRatio,
  navigateBack as engineNavigateBack,
  navigateForward as engineNavigateForward,
  applyPreset as engineApplyPreset,
  cleanDanglingReferences as engineCleanDanglingReferences,
} from './workspaceManager';
import { Note } from '../types';

export interface WorkspaceContextValue {
  layout: WorkspaceLayout;
  panes: WorkspacePane[];
  activePane: WorkspacePane;
  activeTab: WorkspaceTab | undefined;
  isSplit: boolean;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  closedTabsCount: number;

  openResource: (
    resource: {
      type: WorkspaceSurfaceType;
      resourceId?: string;
      title?: string;
      viewState?: Record<string, any>;
      pinned?: boolean;
    },
    options?: OpenResourceOptions
  ) => void;
  openNote: (noteId: string, noteTitle?: string, options?: OpenResourceOptions) => void;
  openPDF: (pdfId?: string, page?: number, highlightId?: string, options?: OpenResourceOptions) => void;
  openCanvas: (canvasId?: string, options?: OpenResourceOptions) => void;
  openGraph: (options?: OpenResourceOptions) => void;
  openKanban: (options?: OpenResourceOptions) => void;
  openSmartViews: (options?: OpenResourceOptions) => void;
  openHome: (options?: OpenResourceOptions) => void;
  openSearch: (query?: string, options?: OpenResourceOptions) => void;
  openMedia: (options?: OpenResourceOptions) => void;
  openReferences: (options?: OpenResourceOptions) => void;
  openAutomations: (options?: OpenResourceOptions) => void;
  openCalendar: (options?: OpenResourceOptions) => void;
  openAgenda: (options?: OpenResourceOptions) => void;
  openTimeline: (options?: OpenResourceOptions) => void;
  openReview: (options?: OpenResourceOptions) => void;
  openCopilot: (options?: OpenResourceOptions) => void;
  openCollection: (collectionId?: string, collectionTitle?: string, options?: OpenResourceOptions) => void;
  openDashboard: (dashboardId?: string, dashboardTitle?: string, options?: OpenResourceOptions) => void;
  openPeople: (options?: OpenResourceOptions) => void;
  openPlanningHome: (options?: OpenResourceOptions) => void;
  openGoalsProjects: (options?: OpenResourceOptions) => void;
  openRoutines: (options?: OpenResourceOptions) => void;
  openLearning: (options?: OpenResourceOptions) => void;
  openCourse: (courseId: string, courseTitle?: string, options?: OpenResourceOptions) => void;
  openSkill: (skillId: string, skillTitle?: string, options?: OpenResourceOptions) => void;
  openExamPrep: (courseId?: string, options?: OpenResourceOptions) => void;
  openLibrary: (options?: OpenResourceOptions) => void;
  openFinance: (options?: OpenResourceOptions) => void;
  openHealth: (options?: OpenResourceOptions) => void;
  openTravel: (tripId?: string, tripTitle?: string, options?: OpenResourceOptions) => void;
  openAssets: (assetId?: string, assetTitle?: string, options?: OpenResourceOptions) => void;
  openDecisions: (decisionId?: string, decisionTitle?: string, options?: OpenResourceOptions) => void;
  openUniversalInbox: (options?: OpenResourceOptions) => void;
  openContextLens: (contextId?: string, contextTitle?: string, options?: OpenResourceOptions) => void;

  closeTab: (paneId: string, tabId: string) => void;
  closeActiveTab: () => void;
  reopenClosedTab: () => void;
  activateTab: (paneId: string, tabId: string) => void;
  reorderTabs: (paneId: string, fromIndex: number, toIndex: number) => void;
  moveTabToPane: (sourcePaneId: string, targetPaneId: string, tabId: string) => void;
  togglePinTab: (paneId: string, tabId: string) => void;
  updateTabViewState: (tabId: string, viewState: Record<string, any>) => void;
  updateTabTitle: (resourceId: string, type: WorkspaceSurfaceType, title: string) => void;

  splitWorkspace: (orientation?: WorkspaceSplitOrientation, initialTab?: WorkspaceTab) => void;
  closePane: (paneId: string) => void;
  closeSplit: () => void;
  swapPanes: () => void;
  focusPane: (paneId: string) => void;
  setSplitRatio: (ratio: number) => void;

  navigateBack: () => void;
  navigateForward: () => void;
  applyPreset: (presetKey: WorkspacePresetKey, context?: any) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export interface WorkspaceProviderProps {
  children: React.ReactNode;
  notes: Note[];
  onOpenLiteratureNote?: (note: Note) => void;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children, notes }) => {
  const [layout, setLayout] = useState<WorkspaceLayout>(() => loadStoredWorkspaceLayout());

  // Automatically persist layout changes
  useEffect(() => {
    saveStoredWorkspaceLayout(layout);
  }, [layout]);

  // Clean dangling references when notes list updates
  useEffect(() => {
    const validNoteIds = new Set<string>(notes.map((n) => n.id));
    const validPdfIds = new Set<string>(); // Clean dynamically if needed
    setLayout((prev) => engineCleanDanglingReferences(prev, validNoteIds, validPdfIds));
  }, [notes]);

  // Keyboard shortcut listener for workspace operations (Ctrl+W, Ctrl+Shift+T, Alt+\, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an active input/textarea unless it's a specific workspace global
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      // Close Active Tab: Ctrl+Alt+W or Alt+W (avoid breaking browser Ctrl+W)
      if ((e.altKey && (e.key === 'w' || e.key === 'W')) || (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'w')) {
        e.preventDefault();
        setLayout((prev) => {
          const currentPane = prev.panes.find((p) => p.id === prev.activePaneId) || prev.panes[0];
          if (currentPane && currentPane.activeTabId) {
            return engineCloseTab(prev, currentPane.id, currentPane.activeTabId);
          }
          return prev;
        });
      }

      // Reopen Closed Tab: Ctrl+Shift+T or Alt+Shift+T
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        if (!isInput) {
          e.preventDefault();
          setLayout((prev) => engineReopenClosedTab(prev));
        }
      }

      // Split Workspace Toggle: Alt+\
      if (e.altKey && e.key === '\\') {
        e.preventDefault();
        setLayout((prev) => {
          if (prev.panes.length > 1) {
            return engineClosePane(prev, prev.panes[1].id);
          } else {
            return engineSplitPane(prev, 'horizontal');
          }
        });
      }

      // History Back: Alt+Left
      if (e.altKey && e.key === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        setLayout((prev) => engineNavigateBack(prev));
      }

      // History Forward: Alt+Right
      if (e.altKey && e.key === 'ArrowRight' && !isInput) {
        e.preventDefault();
        setLayout((prev) => engineNavigateForward(prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Workspace Action Dispatchers
  const openResource = useCallback(
    (
      resource: {
        type: WorkspaceSurfaceType;
        resourceId?: string;
        title?: string;
        viewState?: Record<string, any>;
        pinned?: boolean;
      },
      options?: OpenResourceOptions
    ) => {
      setLayout((prev) =>
        engineOpenTab(
          prev,
          {
            type: resource.type,
            resourceId: resource.resourceId,
            title: resource.title || (resource.type === 'home' ? 'Vault Notes' : resource.type),
            viewState: resource.viewState ?? options?.viewState,
            pinned: resource.pinned,
          },
          options
        )
      );
    },
    []
  );

  const openNote = useCallback(
    (noteId: string, noteTitle?: string, options?: OpenResourceOptions) => {
      const targetNote = notes.find((n) => n.id === noteId);
      const title = noteTitle || targetNote?.title || 'Untitled Note';
      openResource(
        {
          type: 'note',
          resourceId: noteId,
          title,
        },
        options
      );
    },
    [notes, openResource]
  );

  const openPDF = useCallback(
    (pdfId?: string, page?: number, highlightId?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'pdf',
          resourceId: pdfId,
          title: 'PDF Reader',
          viewState: {
            activePage: page || 1,
            targetHighlightId: highlightId,
          },
        },
        options
      );
    },
    [openResource]
  );

  const openCanvas = useCallback(
    (canvasId?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'canvas',
          resourceId: canvasId,
          title: 'Infinite Canvas',
        },
        options
      );
    },
    [openResource]
  );

  const openGraph = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'graph',
          title: 'Knowledge Graph',
        },
        options
      );
    },
    [openResource]
  );

  const openKanban = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'kanban',
          title: 'Kanban Board',
        },
        options
      );
    },
    [openResource]
  );

  const openSmartViews = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'smart-view',
          title: 'Smart Queries',
        },
        options
      );
    },
    [openResource]
  );

  const openHome = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'home',
          title: 'Vault Notes',
        },
        options
      );
    },
    [openResource]
  );

  const openSearch = useCallback(
    (query?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'search',
          title: query ? `Search: ${query}` : 'Vault Search',
          viewState: {
            searchQuery: query || '',
          },
        },
        options
      );
    },
    [openResource]
  );

  const openMedia = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'media',
          title: 'Media Library',
        },
        options
      );
    },
    [openResource]
  );

  const openReferences = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'references',
          title: 'Reference Library',
        },
        options
      );
    },
    [openResource]
  );

  const openAutomations = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'automations',
          title: 'Automation Center',
        },
        options
      );
    },
    [openResource]
  );

  const openCalendar = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'calendar',
          title: 'Calendar & Agenda',
        },
        options
      );
    },
    [openResource]
  );

  const openAgenda = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'agenda',
          title: 'Scheduled Agenda',
        },
        options
      );
    },
    [openResource]
  );

  const openTimeline = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'timeline',
          title: 'Activity Timeline',
        },
        options
      );
    },
    [openResource]
  );

  const openReview = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'review',
          title: 'Knowledge Review',
        },
        options
      );
    },
    [openResource]
  );

  const openCopilot = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'copilot',
          title: 'Knowledge Copilot',
        },
        options
      );
    },
    [openResource]
  );

  const openCollection = useCallback(
    (collectionId?: string, collectionTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'collection',
          resourceId: collectionId || 'col-projects',
          title: collectionTitle || 'Collections',
        },
        options
      );
    },
    [openResource]
  );

  const openDashboard = useCallback(
    (dashboardId?: string, dashboardTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'dashboard',
          resourceId: dashboardId || 'dash-vault-overview',
          title: dashboardTitle || 'Dashboard & Analytics',
        },
        options
      );
    },
    [openResource]
  );

  const openPeople = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'people',
          title: 'People & Relationships',
        },
        options
      );
    },
    [openResource]
  );

  const openPlanningHome = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'planning-home',
          title: 'Planning Hub',
        },
        options
      );
    },
    [openResource]
  );

  const openGoalsProjects = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'goals-projects',
          title: 'Goals & Projects',
        },
        options
      );
    },
    [openResource]
  );

  const openRoutines = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'routines',
          title: 'Routines & Tracking',
        },
        options
      );
    },
    [openResource]
  );

  const openLearning = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'learning',
          title: 'Learning & Curriculum',
        },
        options
      );
    },
    [openResource]
  );

  const openCourse = useCallback(
    (courseId: string, courseTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'course',
          resourceId: courseId,
          title: courseTitle || 'Course',
        },
        options
      );
    },
    [openResource]
  );

  const openSkill = useCallback(
    (skillId: string, skillTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'skill',
          resourceId: skillId,
          title: skillTitle || 'Skill',
        },
        options
      );
    },
    [openResource]
  );

  const openExamPrep = useCallback(
    (courseId?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'exam-prep',
          resourceId: courseId,
          title: 'Exam Preparation',
        },
        options
      );
    },
    [openResource]
  );

  const openLibrary = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'library',
          title: 'Library & Reading',
        },
        options
      );
    },
    [openResource]
  );

  const openFinance = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'finance',
          title: 'Personal Finance',
        },
        options
      );
    },
    [openResource]
  );

  const openHealth = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'health',
          title: 'Health & Fitness',
        },
        options
      );
    },
    [openResource]
  );

  const openTravel = useCallback(
    (tripId?: string, tripTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'travel',
          resourceId: tripId,
          title: tripTitle || 'Travel & Places',
        },
        options
      );
    },
    [openResource]
  );

  const openAssets = useCallback(
    (assetId?: string, assetTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'assets',
          resourceId: assetId,
          title: assetTitle || 'Assets & Inventory',
        },
        options
      );
    },
    [openResource]
  );

  const openDecisions = useCallback(
    (decisionId?: string, decisionTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'decisions',
          resourceId: decisionId,
          title: decisionTitle || 'Decisions & Reflection',
        },
        options
      );
    },
    [openResource]
  );

  const openUniversalInbox = useCallback(
    (options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'universal-inbox',
          title: 'Universal Inbox',
        },
        options
      );
    },
    [openResource]
  );

  const openContextLens = useCallback(
    (contextId?: string, contextTitle?: string, options?: OpenResourceOptions) => {
      openResource(
        {
          type: 'context-lens',
          resourceId: contextId,
          title: contextTitle ? `Lens: ${contextTitle}` : 'Context Lens',
        },
        options
      );
    },
    [openResource]
  );

  const closeTab = useCallback((paneId: string, tabId: string) => {
    setLayout((prev) => engineCloseTab(prev, paneId, tabId));
  }, []);

  const closeActiveTab = useCallback(() => {
    setLayout((prev) => {
      const currentPane = prev.panes.find((p) => p.id === prev.activePaneId) || prev.panes[0];
      if (currentPane && currentPane.activeTabId) {
        return engineCloseTab(prev, currentPane.id, currentPane.activeTabId);
      }
      return prev;
    });
  }, []);

  const reopenClosedTab = useCallback(() => {
    setLayout((prev) => engineReopenClosedTab(prev));
  }, []);

  const activateTab = useCallback((paneId: string, tabId: string) => {
    setLayout((prev) => engineActivateTab(prev, paneId, tabId));
  }, []);

  const reorderTabs = useCallback((paneId: string, fromIndex: number, toIndex: number) => {
    setLayout((prev) => engineReorderTabs(prev, paneId, fromIndex, toIndex));
  }, []);

  const moveTabToPane = useCallback((sourcePaneId: string, targetPaneId: string, tabId: string) => {
    setLayout((prev) => engineMoveTabToPane(prev, sourcePaneId, targetPaneId, tabId));
  }, []);

  const togglePinTab = useCallback((paneId: string, tabId: string) => {
    setLayout((prev) => engineTogglePinTab(prev, paneId, tabId));
  }, []);

  const updateTabViewState = useCallback((tabId: string, viewState: Record<string, any>) => {
    setLayout((prev) => engineUpdateTabViewState(prev, tabId, viewState));
  }, []);

  const updateTabTitle = useCallback((resourceId: string, type: WorkspaceSurfaceType, title: string) => {
    setLayout((prev) => engineUpdateTabTitle(prev, resourceId, type, title));
  }, []);

  const splitWorkspace = useCallback(
    (orientation: WorkspaceSplitOrientation = 'horizontal', initialTab?: WorkspaceTab) => {
      setLayout((prev) => engineSplitPane(prev, orientation, initialTab));
    },
    []
  );

  const closePane = useCallback((paneId: string) => {
    setLayout((prev) => engineClosePane(prev, paneId));
  }, []);

  const closeSplit = useCallback(() => {
    setLayout((prev) => {
      if (prev.panes.length <= 1) return prev;
      return engineClosePane(prev, prev.panes[1].id);
    });
  }, []);

  const swapPanes = useCallback(() => {
    setLayout((prev) => engineSwapPanes(prev));
  }, []);

  const focusPane = useCallback((paneId: string) => {
    setLayout((prev) => engineFocusPane(prev, paneId));
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    setLayout((prev) => engineSetSplitRatio(prev, ratio));
  }, []);

  const navigateBack = useCallback(() => {
    setLayout((prev) => engineNavigateBack(prev));
  }, []);

  const navigateForward = useCallback(() => {
    setLayout((prev) => engineNavigateForward(prev));
  }, []);

  const applyPreset = useCallback(
    (presetKey: WorkspacePresetKey, context?: any) => {
      setLayout((prev) => engineApplyPreset(prev, presetKey, { ...context, notes }));
    },
    [notes]
  );

  // Derived Values
  const activePane = useMemo(() => {
    return layout.panes.find((p) => p.id === layout.activePaneId) || layout.panes[0];
  }, [layout]);

  const activeTab = useMemo(() => {
    if (!activePane || !activePane.activeTabId) return undefined;
    return activePane.tabs.find((t) => t.id === activePane.activeTabId);
  }, [activePane]);

  const isSplit = layout.panes.length > 1;
  const canNavigateBack = layout.historyIndex > 0;
  const canNavigateForward = layout.historyIndex < layout.history.length - 1;
  const closedTabsCount = layout.closedTabs.length;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      layout,
      panes: layout.panes,
      activePane,
      activeTab,
      isSplit,
      canNavigateBack,
      canNavigateForward,
      closedTabsCount,

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
      openContextLens,

      closeTab,
      closeActiveTab,
      reopenClosedTab,
      activateTab,
      reorderTabs,
      moveTabToPane,
      togglePinTab,
      updateTabViewState,
      updateTabTitle,

      splitWorkspace,
      closePane,
      closeSplit,
      swapPanes,
      focusPane,
      setSplitRatio,

      navigateBack,
      navigateForward,
      applyPreset,
    }),
    [
      layout,
      activePane,
      activeTab,
      isSplit,
      canNavigateBack,
      canNavigateForward,
      closedTabsCount,
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
      openContextLens,
      closeTab,
      closeActiveTab,
      reopenClosedTab,
      activateTab,
      reorderTabs,
      moveTabToPane,
      togglePinTab,
      updateTabViewState,
      updateTabTitle,
      splitWorkspace,
      closePane,
      closeSplit,
      swapPanes,
      focusPane,
      setSplitRatio,
      navigateBack,
      navigateForward,
      applyPreset,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
