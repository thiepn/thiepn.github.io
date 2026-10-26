/**
 * V2.15 Workspace Arrangement Manager
 * 
 * Purpose:
 *   Captures which Resources/views are open, pane arrangement (1-3 panes),
 *   and relevant view state for repeatable power-user working setups.
 * 
 * Non-Negotiable Rules:
 *   - NEVER stores canonical Resource copies or secret snapshots
 *   - Semantic definitions sync across devices; exact pixel geometry is device-local
 *   - Graceful degradation when a resource is missing/deleted
 *   - Lazy load: only hydrates the active pane immediately; inactive panes load on demand
 *   - Mobile adaptation: automatically translates multi-pane arrangements into a coherent single-pane stack
 */

export type PaneLayoutMode = 'single' | 'split-vertical' | 'split-horizontal' | 'two-pane-inspector' | 'three-pane';

export interface WorkspacePaneDefinition {
  paneId: string;
  surfaceType: 'note' | 'pdf' | 'graph' | 'kanban' | 'calendar' | 'search' | 'saved_view' | 'review' | 'copilot' | 'media';
  resourceId?: string;
  savedViewId?: string;
  title?: string;
  isPrimary?: boolean;
}

export interface WorkspacePresetV2 {
  id: string;
  name: string;
  description: string;
  layout: PaneLayoutMode;
  panes: WorkspacePaneDefinition[];
  activePaneId: string;
  isBuiltin?: boolean;
  contextId?: string;
  updatedAt: number;
}

export const BUILTIN_V2_15_WORKSPACES: WorkspacePresetV2[] = [
  {
    id: 'ws-writing',
    name: 'Focused Writing',
    description: 'Single note pane with clean typography and minimal distractions.',
    layout: 'single',
    panes: [
      {
        paneId: 'p-1',
        surfaceType: 'note',
        isPrimary: true,
        title: 'Active Note',
      },
    ],
    activePaneId: 'p-1',
    isBuiltin: true,
    updatedAt: Date.now(),
  },
  {
    id: 'ws-research',
    name: 'Research & Citations',
    description: 'Two-pane side-by-side: Primary note with secondary PDF / reference document.',
    layout: 'split-vertical',
    panes: [
      {
        paneId: 'p-1',
        surfaceType: 'note',
        isPrimary: true,
        title: 'Research Synthesis',
      },
      {
        paneId: 'p-2',
        surfaceType: 'pdf',
        isPrimary: false,
        title: 'Reference Document / PDF',
      },
    ],
    activePaneId: 'p-1',
    isBuiltin: true,
    updatedAt: Date.now(),
  },
  {
    id: 'ws-weekly-review',
    name: 'Weekly Review Setup',
    description: 'Weekly reflection guide on left, Universal Inbox & tasks on right.',
    layout: 'split-vertical',
    panes: [
      {
        paneId: 'p-1',
        surfaceType: 'review',
        isPrimary: true,
        title: 'Weekly Review',
      },
      {
        paneId: 'p-2',
        surfaceType: 'saved_view',
        savedViewId: 'sv-inbox-pending',
        isPrimary: false,
        title: 'Universal Inbox View',
      },
    ],
    activePaneId: 'p-1',
    isBuiltin: true,
    updatedAt: Date.now(),
  },
  {
    id: 'ws-project-planning',
    name: 'Project & Milestone Planning',
    description: 'Kanban milestone board on left with project notes and action items on right.',
    layout: 'split-vertical',
    panes: [
      {
        paneId: 'p-1',
        surfaceType: 'kanban',
        isPrimary: true,
        title: 'Milestone Kanban',
      },
      {
        paneId: 'p-2',
        surfaceType: 'note',
        isPrimary: false,
        title: 'Project Brief',
      },
    ],
    activePaneId: 'p-1',
    isBuiltin: true,
    updatedAt: Date.now(),
  },
];

export class WorkspaceArrangementManager {
  private static instance: WorkspaceArrangementManager | null = null;
  private workspaces: Map<string, WorkspacePresetV2> = new Map();
  private activeWorkspaceId: string | null = null;
  private isMobileDevice: boolean = false;

  private constructor() {
    for (const ws of BUILTIN_V2_15_WORKSPACES) {
      this.workspaces.set(ws.id, ws);
    }
  }

  public static getInstance(): WorkspaceArrangementManager {
    if (!WorkspaceArrangementManager.instance) {
      WorkspaceArrangementManager.instance = new WorkspaceArrangementManager();
    }
    return WorkspaceArrangementManager.instance;
  }

  public setMobileDevice(isMobile: boolean): void {
    this.isMobileDevice = isMobile;
  }

  public getAllWorkspaces(): WorkspacePresetV2[] {
    return Array.from(this.workspaces.values());
  }

  public getWorkspace(id: string): WorkspacePresetV2 | undefined {
    return this.workspaces.get(id);
  }

  public saveWorkspace(workspace: WorkspacePresetV2): void {
    this.workspaces.set(workspace.id, {
      ...workspace,
      updatedAt: Date.now(),
    });
  }

  public deleteWorkspace(id: string): boolean {
    const ws = this.workspaces.get(id);
    if (ws && !ws.isBuiltin) {
      return this.workspaces.delete(id);
    }
    return false;
  }

  public duplicateWorkspace(id: string, newName: string): WorkspacePresetV2 | null {
    const source = this.workspaces.get(id);
    if (!source) return null;

    const dup: WorkspacePresetV2 = {
      ...source,
      id: `ws-custom-${Date.now()}`,
      name: newName,
      isBuiltin: false,
      updatedAt: Date.now(),
    };
    this.workspaces.set(dup.id, dup);
    return dup;
  }

  /**
   * Resolves runtime panes for active device:
   * On mobile, collapses multi-pane layouts into a single primary pane navigation item.
   */
  public resolvePanesForDevice(workspace: WorkspacePresetV2): {
    panes: WorkspacePaneDefinition[];
    layout: PaneLayoutMode;
    isCollapsedForMobile: boolean;
  } {
    if (this.isMobileDevice) {
      // Find primary pane or first pane
      const primaryPane = workspace.panes.find(p => p.isPrimary) || workspace.panes[0];
      return {
        panes: primaryPane ? [primaryPane] : [],
        layout: 'single',
        isCollapsedForMobile: true,
      };
    }

    return {
      panes: workspace.panes,
      layout: workspace.layout,
      isCollapsedForMobile: false,
    };
  }

  /**
   * Handles missing resource degradation gracefully
   */
  public sanitizePanesAgainstVault(
    panes: WorkspacePaneDefinition[],
    existingResourceIds: Set<string>
  ): WorkspacePaneDefinition[] {
    return panes.map(pane => {
      if (pane.resourceId && !existingResourceIds.has(pane.resourceId)) {
        return {
          ...pane,
          resourceId: undefined,
          title: `${pane.title || 'Resource'} (Unavailable / Archived)`,
        };
      }
      return pane;
    });
  }
}

export const workspaceArrangementManager = WorkspaceArrangementManager.getInstance();
