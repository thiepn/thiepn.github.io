import { Note, Folder } from '../../types';
import { NavigableResourceType, ResourceDescriptor, NavOpenTargetOptions } from './navigationTypes';
import { navigationHistoryManager } from './navigationHistoryManager';
import { quickSwitcherService } from './quickSwitcherService';
import { WorkspaceSurfaceType, OpenResourceOptions } from '../workspaceTypes';

export interface RouteExecutionContext {
  openNote?: (noteId: string, options?: any) => void;
  openSurface?: (surfaceType: WorkspaceSurfaceType, resourceId?: string, title?: string, options?: any) => void;
  openSearch?: (query?: string) => void;
  openSmartView?: (viewId: string) => void;
  openCanvas?: (canvasId?: string) => void;
  openPDF?: (pdfId: string, page?: number, highlightId?: string) => void;
  openContextRoot?: (contextId: string) => void;
}

export class ResourceRouter {
  /**
   * Route and open any PKM resource with unified history recording and recents tracking
   */
  public route(
    descriptor: ResourceDescriptor,
    context: RouteExecutionContext,
    options?: {
      targetPane?: 'active' | 'adjacent' | 'split-right' | 'split-down' | 'new-tab' | string;
      replaceCurrent?: boolean;
      eventModifier?: {
        ctrlOrMetaKey?: boolean;
        altKey?: boolean;
        shiftKey?: boolean;
      };
    }
  ): void {
    // 1. Record in bounded navigation history
    navigationHistoryManager.pushEntry({
      resourceType: descriptor.type,
      resourceId: descriptor.id,
      title: descriptor.title,
      subpath: descriptor.subpath,
      contextId: descriptor.contextId,
    });

    // 2. Track in Quick Switcher recents
    quickSwitcherService.saveRecent(descriptor.id, descriptor.type);

    // 3. Resolve target pane and open appropriate workspace surface
    const shouldSplit =
      options?.eventModifier?.altKey ||
      options?.eventModifier?.ctrlOrMetaKey ||
      options?.targetPane === 'adjacent' ||
      options?.targetPane === 'split-right';

    const openOpts = {
      targetPane: shouldSplit ? 'adjacent' : 'active',
      split: shouldSplit,
      ...options,
    };

    switch (descriptor.type) {
      case 'note':
        if (context.openNote) {
          context.openNote(descriptor.id, {
            ...openOpts,
            targetHeading: descriptor.subpath?.type === 'heading' ? String(descriptor.subpath.value) : undefined,
            targetBlockId: descriptor.subpath?.type === 'block' ? String(descriptor.subpath.value) : undefined,
          });
        }
        break;

      case 'pdf':
        if (context.openPDF) {
          const page = descriptor.subpath?.type === 'pdf-page' ? Number(descriptor.subpath.value) : undefined;
          const highlightId = descriptor.subpath?.type === 'pdf-highlight' ? String(descriptor.subpath.value) : undefined;
          context.openPDF(descriptor.id, page, highlightId);
        } else if (context.openSurface) {
          context.openSurface('pdf', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'canvas':
        if (context.openCanvas) {
          context.openCanvas(descriptor.id);
        } else if (context.openSurface) {
          context.openSurface('canvas', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'smart-view':
      case 'saved-search':
        if (context.openSmartView) {
          context.openSmartView(descriptor.id);
        } else if (context.openSurface) {
          context.openSurface('smart-view', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'collection':
        if (context.openSurface) {
          context.openSurface('collection', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'dashboard':
        if (context.openSurface) {
          context.openSurface('dashboard', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'person':
        if (context.openSurface) {
          context.openSurface('people', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'project':
      case 'goal':
      case 'area':
        if (context.openSurface) {
          context.openSurface('goals-projects', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'routine':
        if (context.openSurface) {
          context.openSurface('routines', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'course':
        if (context.openSurface) {
          context.openSurface('course', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'skill':
        if (context.openSurface) {
          context.openSurface('skill', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'exam-prep':
        if (context.openSurface) {
          context.openSurface('exam-prep', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'library-item':
      case 'reference':
        if (context.openSurface) {
          context.openSurface('library', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'trip':
        if (context.openSurface) {
          context.openSurface('travel', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'asset':
        if (context.openSurface) {
          context.openSurface('assets', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'decision':
        if (context.openSurface) {
          context.openSurface('decisions', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'context-root':
        if (context.openContextRoot) {
          context.openContextRoot(descriptor.id);
        } else if (context.openSurface) {
          context.openSurface('context-lens', descriptor.id, descriptor.title, openOpts);
        }
        break;

      case 'universal-inbox':
        if (context.openSurface) {
          context.openSurface('universal-inbox', descriptor.id, descriptor.title, openOpts);
        }
        break;

      default:
        // Default to note or surface fallback
        if (context.openSurface) {
          context.openSurface('home', undefined, 'Home', openOpts);
        }
        break;
    }
  }
}

export const resourceRouter = new ResourceRouter();
