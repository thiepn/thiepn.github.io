import { Note, Folder, AppSettings, ViewMode } from '../types';
import { PDFAttachment, PDFAnnotation } from './pdfTypes';

/**
 * Surface types that can live in a workspace tab/pane
 */
export type WorkspaceSurfaceType =
  | 'home'
  | 'note'
  | 'pdf'
  | 'canvas'
  | 'graph'
  | 'kanban'
  | 'smart-view'
  | 'search'
  | 'media'
  | 'references'
  | 'automations'
  | 'calendar'
  | 'agenda'
  | 'timeline'
  | 'review'
  | 'copilot'
  | 'collection'
  | 'dashboard'
  | 'people'
  | 'planning-home'
  | 'goals-projects'
  | 'knowledge-explorer'
  | 'routines'
  | 'learning'
  | 'course'
  | 'skill'
  | 'exam-prep'
  | 'library'
  | 'finance'
  | 'health'
  | 'travel'
  | 'assets'
  | 'decisions'
  | 'universal-inbox'
  | 'context-lens'
  | 'gamification';

/**
 * Individual Tab inside a Workspace Pane
 */
export interface WorkspaceTab {
  id: string;
  type: WorkspaceSurfaceType;
  resourceId?: string; // e.g. noteId, pdfId, canvasId, queryId
  title: string;
  pinned?: boolean;
  isDirty?: boolean;
  viewState?: {
    scrollPosition?: number;
    cursorLine?: number;
    activePage?: number; // for PDF
    targetHighlightId?: string; // for PDF
    zoom?: number; // for Canvas / PDF
    panOffset?: { x: number; y: number }; // for Canvas
    previewMode?: boolean; // for Note
    selectedTag?: string; // for Search / Home
    searchQuery?: string; // for Search / PDF
    [key: string]: any;
  };
  lastAccessedAt: number;
  createdAt?: number;
}

/**
 * Individual Pane containing one or more Tabs
 */
export interface WorkspacePane {
  id: string;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

/**
 * Split orientation when 2 panes are visible
 */
export type WorkspaceSplitOrientation = 'horizontal' | 'vertical';

/**
 * Navigation history item for Back / Forward
 */
export interface WorkspaceNavigationEntry {
  paneId: string;
  tabId: string;
  surfaceType: WorkspaceSurfaceType;
  resourceId?: string;
  title: string;
  timestamp: number;
}

/**
 * Complete Persistent Workspace Layout State
 */
export interface WorkspaceLayout {
  version: number;
  panes: WorkspacePane[];
  activePaneId: string;
  splitOrientation: WorkspaceSplitOrientation;
  splitRatio: number; // 0.15 to 0.85 (default 0.5)
  isSplit: boolean;
  history: WorkspaceNavigationEntry[];
  historyIndex: number;
  closedTabs: WorkspaceTab[];
}

/**
 * Preset configuration for workspace layouts
 */
export type WorkspacePresetKey =
  | 'research'
  | 'knowledge'
  | 'planning'
  | 'spatial'
  | 'comparison'
  | 'temporal'
  | 'default-clean';

export interface WorkspacePreset {
  key: WorkspacePresetKey;
  label: string;
  description: string;
  splitOrientation: WorkspaceSplitOrientation;
  leftSurface: { type: WorkspaceSurfaceType; resourceId?: string; title: string };
  rightSurface?: { type: WorkspaceSurfaceType; resourceId?: string; title: string };
}

/**
 * Options when opening a resource in the workspace
 */
export interface OpenResourceOptions {
  targetPane?: 'active' | 'adjacent' | 'split-right' | 'split-down' | 'new-tab' | string;
  activate?: boolean;
  pinned?: boolean;
  split?: boolean;
  background?: boolean;
  viewState?: Record<string, any>;
  replaceCurrent?: boolean;
  eventModifier?: {
    ctrlOrMetaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  };
}
