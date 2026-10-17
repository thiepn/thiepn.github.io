/**
 * V2.12 Tablet Workflow Engine
 * 
 * Manages adaptive multi-pane workspace configurations (Research, Project, Review),
 * orientation transitions (Landscape <-> Portrait), and reduced-width split-screen folding.
 */

export type TabletWorkflowMode = 'research' | 'project' | 'review' | 'standard';

export interface TabletPaneLayout {
  mode: TabletWorkflowMode;
  columnsVisible: number;
  sidebarVisible: boolean;
  primaryPaneWidthPercent: number;
  secondaryPaneWidthPercent: number;
  inspectorVisible: boolean;
}

export class TabletWorkflowEngine {
  private static instance: TabletWorkflowEngine | null = null;
  private currentMode: TabletWorkflowMode = 'standard';
  private primaryResourceId: string | null = null;
  private secondaryResourceId: string | null = null;

  private constructor() {}

  public static getInstance(): TabletWorkflowEngine {
    if (!TabletWorkflowEngine.instance) {
      TabletWorkflowEngine.instance = new TabletWorkflowEngine();
    }
    return TabletWorkflowEngine.instance;
  }

  /**
   * Computes the optimal pane layout given available width and workflow mode
   */
  public computePaneLayout(
    viewportWidth: number,
    mode: TabletWorkflowMode,
    isInspectorOpen: boolean
  ): TabletPaneLayout {
    // 1. Narrow viewport / Split-Screen 1/3 (width < 640px) -> Single focused pane
    if (viewportWidth < 640) {
      return {
        mode,
        columnsVisible: 1,
        sidebarVisible: false,
        primaryPaneWidthPercent: 100,
        secondaryPaneWidthPercent: 0,
        inspectorVisible: false,
      };
    }

    // 2. Medium Tablet Portrait / Split-Screen 1/2 (640px <= width < 960px) -> Dual pane or Pane + Inspector
    if (viewportWidth < 960) {
      if (mode === 'research' || mode === 'project' || mode === 'review') {
        return {
          mode,
          columnsVisible: 2,
          sidebarVisible: false,
          primaryPaneWidthPercent: 50,
          secondaryPaneWidthPercent: 50,
          inspectorVisible: false,
        };
      }
      return {
        mode,
        columnsVisible: isInspectorOpen ? 2 : 1,
        sidebarVisible: false,
        primaryPaneWidthPercent: isInspectorOpen ? 65 : 100,
        secondaryPaneWidthPercent: 0,
        inspectorVisible: isInspectorOpen,
      };
    }

    // 3. Large Tablet Landscape (width >= 960px) -> Tri-pane: Primary | Secondary | Inspector
    switch (mode) {
      case 'research': // PDF | Note | Inspector
        return {
          mode: 'research',
          columnsVisible: isInspectorOpen ? 3 : 2,
          sidebarVisible: false,
          primaryPaneWidthPercent: isInspectorOpen ? 40 : 50,
          secondaryPaneWidthPercent: isInspectorOpen ? 35 : 50,
          inspectorVisible: isInspectorOpen,
        };
      case 'project': // Project View | Task Editor | Inspector
        return {
          mode: 'project',
          columnsVisible: isInspectorOpen ? 3 : 2,
          sidebarVisible: false,
          primaryPaneWidthPercent: isInspectorOpen ? 45 : 55,
          secondaryPaneWidthPercent: isInspectorOpen ? 30 : 45,
          inspectorVisible: isInspectorOpen,
        };
      case 'review': // Review Note | Evidence List
        return {
          mode: 'review',
          columnsVisible: 2,
          sidebarVisible: false,
          primaryPaneWidthPercent: 55,
          secondaryPaneWidthPercent: 45,
          inspectorVisible: false,
        };
      default:
        return {
          mode: 'standard',
          columnsVisible: isInspectorOpen ? 2 : 1,
          sidebarVisible: true,
          primaryPaneWidthPercent: isInspectorOpen ? 70 : 100,
          secondaryPaneWidthPercent: 0,
          inspectorVisible: isInspectorOpen,
        };
    }
  }

  public setWorkflow(
    mode: TabletWorkflowMode,
    primaryId: string,
    secondaryId?: string
  ): void {
    this.currentMode = mode;
    this.primaryResourceId = primaryId;
    this.secondaryResourceId = secondaryId || null;
  }

  public getWorkflowState(): {
    mode: TabletWorkflowMode;
    primaryResourceId: string | null;
    secondaryResourceId: string | null;
  } {
    return {
      mode: this.currentMode,
      primaryResourceId: this.primaryResourceId,
      secondaryResourceId: this.secondaryResourceId,
    };
  }
}

export const tabletWorkflowEngine = TabletWorkflowEngine.getInstance();
