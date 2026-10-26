import { Note, Folder } from '../../types';
import { CanonicalBreadcrumbItem, NavigableResourceType } from './navigationTypes';
import { ContextDescriptor } from '../context/contextTypes';

export class BreadcrumbService {
  /**
   * Compute truthful breadcrumb hierarchy for a given resource
   */
  public getBreadcrumbsForNote(
    note: Note,
    folders: Folder[],
    activeContext?: ContextDescriptor | null
  ): CanonicalBreadcrumbItem[] {
    const items: CanonicalBreadcrumbItem[] = [];

    // 1. Root Anchor
    items.push({
      id: 'crumb-root',
      label: 'Vault',
      type: 'root',
      resourceType: 'note',
      isClickable: true,
      isActive: false,
    });

    // 2. Active Context indicator if applicable (does not claim false structural parenting)
    if (activeContext) {
      items.push({
        id: `crumb-ctx-${activeContext.id}`,
        label: activeContext.title,
        type: 'context',
        resourceType: 'context-root',
        resourceId: activeContext.id,
        isClickable: true,
        isActive: false,
      });
    }

    // 3. True Folder Path (Canonical filesystem-like hierarchy)
    if (note.folderId) {
      const folderChain = this.buildFolderChain(note.folderId, folders);
      folderChain.forEach((folder) => {
        items.push({
          id: `crumb-folder-${folder.id}`,
          label: folder.name,
          type: 'folder',
          resourceType: 'folder',
          resourceId: folder.id,
          isClickable: true,
          isActive: false,
        });
      });
    }

    // 4. Current Note Target (Active Leaf)
    items.push({
      id: `crumb-note-${note.id}`,
      label: note.title || 'Untitled Note',
      type: 'resource',
      resourceType: 'note',
      resourceId: note.id,
      isClickable: false,
      isActive: true,
    });

    return items;
  }

  /**
   * Generic resource breadcrumb generator
   */
  public getBreadcrumbsForResource(
    resourceType: NavigableResourceType,
    title: string,
    resourceId?: string,
    containerTitle?: string,
    activeContext?: ContextDescriptor | null
  ): CanonicalBreadcrumbItem[] {
    const items: CanonicalBreadcrumbItem[] = [
      {
        id: 'crumb-root',
        label: 'Vault',
        type: 'root',
        isClickable: true,
        isActive: false,
      },
    ];

    if (activeContext) {
      items.push({
        id: `crumb-ctx-${activeContext.id}`,
        label: activeContext.title,
        type: 'context',
        resourceType: 'context-root',
        resourceId: activeContext.id,
        isClickable: true,
        isActive: false,
      });
    }

    if (containerTitle) {
      items.push({
        id: 'crumb-container',
        label: containerTitle,
        type: 'container',
        isClickable: false,
        isActive: false,
      });
    }

    items.push({
      id: `crumb-${resourceType}-${resourceId || 'active'}`,
      label: title,
      type: 'resource',
      resourceType,
      resourceId,
      isClickable: false,
      isActive: true,
    });

    return items;
  }

  /**
   * Responsive middle-truncation / collapsing for narrow viewports
   */
  public collapseForMobile(items: CanonicalBreadcrumbItem[]): CanonicalBreadcrumbItem[] {
    if (items.length <= 3) return items;

    // Keep first (Root or Context) and last (Current Resource), collapse middle into "..."
    const first = items[0];
    const last = items[items.length - 1];
    const secondLast = items[items.length - 2];

    return [
      first,
      {
        id: 'crumb-ellipsis',
        label: '...',
        type: 'container',
        isClickable: false,
        isActive: false,
      },
      secondLast,
      last,
    ];
  }

  private buildFolderChain(folderId: string, folders: Folder[]): Folder[] {
    const chain: Folder[] = [];
    const folderMap = new Map<string, Folder>();
    folders.forEach((f) => folderMap.set(f.id, f));

    let current: Folder | undefined = folderMap.get(folderId);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.unshift(current);
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }

    return chain;
  }
}

export const breadcrumbService = new BreadcrumbService();
