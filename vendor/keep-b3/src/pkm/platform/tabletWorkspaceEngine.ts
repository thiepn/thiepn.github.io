/**
 * V1.3 — Adaptive Tablet & Multi-Pane Layout Engine
 * Calculates responsive layout modes (Mobile, Tablet Split, Desktop Bento)
 * and preserves semantic workspace state during orientation rotation and window resizing.
 */

export type LayoutMode = 'mobile_stacked' | 'tablet_split' | 'desktop_multi_pane';
export type TabletOrientation = 'portrait' | 'landscape';

export interface AdaptiveWorkspaceState {
  layoutMode: LayoutMode;
  orientation: TabletOrientation;
  viewportWidth: number;
  viewportHeight: number;
  sidebarVisible: boolean;
  contextLensVisible: boolean;
  activeSecondaryPane: 'none' | 'pdf' | 'graph' | 'context_lens' | 'smart_query';
  secondaryPaneWidthPercent: number;
}

export class TabletWorkspaceEngine {
  private static instance: TabletWorkspaceEngine | null = null;
  private state: AdaptiveWorkspaceState;
  private listeners: Set<(state: AdaptiveWorkspaceState) => void> = new Set();

  private constructor() {
    this.state = this.computeInitialState();
    this.initResizeListener();
  }

  public static getInstance(): TabletWorkspaceEngine {
    if (!TabletWorkspaceEngine.instance) {
      TabletWorkspaceEngine.instance = new TabletWorkspaceEngine();
    }
    return TabletWorkspaceEngine.instance;
  }

  public getState(): AdaptiveWorkspaceState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AdaptiveWorkspaceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public setSecondaryPane(pane: AdaptiveWorkspaceState['activeSecondaryPane'], widthPercent: number = 50): void {
    this.state = {
      ...this.state,
      activeSecondaryPane: pane,
      secondaryPaneWidthPercent: Math.min(Math.max(widthPercent, 25), 75),
    };
    this.notify();
  }

  public toggleSidebar(force?: boolean): void {
    const next = force !== undefined ? force : !this.state.sidebarVisible;
    this.state = {
      ...this.state,
      sidebarVisible: next,
    };
    this.notify();
  }

  public toggleContextLens(force?: boolean): void {
    const next = force !== undefined ? force : !this.state.contextLensVisible;
    this.state = {
      ...this.state,
      contextLensVisible: next,
    };
    this.notify();
  }

  private computeInitialState(): AdaptiveWorkspaceState {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const orientation: TabletOrientation = width > height ? 'landscape' : 'portrait';

    let layoutMode: LayoutMode = 'desktop_multi_pane';
    if (width < 768) {
      layoutMode = 'mobile_stacked';
    } else if (width < 1180) {
      layoutMode = 'tablet_split';
    }

    return {
      layoutMode,
      orientation,
      viewportWidth: width,
      viewportHeight: height,
      sidebarVisible: layoutMode !== 'mobile_stacked',
      contextLensVisible: layoutMode === 'desktop_multi_pane',
      activeSecondaryPane: 'none',
      secondaryPaneWidthPercent: 50,
    };
  }

  private initResizeListener(): void {
    if (typeof window === 'undefined') return;

    let resizeTimer: any = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const orientation: TabletOrientation = width > height ? 'landscape' : 'portrait';

        let layoutMode: LayoutMode = 'desktop_multi_pane';
        if (width < 768) {
          layoutMode = 'mobile_stacked';
        } else if (width < 1180) {
          layoutMode = 'tablet_split';
        }

        // Preserve secondary pane selection during orientation change
        this.state = {
          ...this.state,
          layoutMode,
          orientation,
          viewportWidth: width,
          viewportHeight: height,
          sidebarVisible: layoutMode === 'desktop_multi_pane' || (layoutMode === 'tablet_split' && orientation === 'landscape'),
        };

        this.notify();
      }, 50);
    });
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in tablet workspace listener:', err);
      }
    }
  }
}

export const tabletWorkspaceEngine = TabletWorkspaceEngine.getInstance();
