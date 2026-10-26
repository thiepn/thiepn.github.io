import { Note, Folder } from '../../types';
import { MOCConfig, MOCItemNode, MOCResult } from './mocTypes';
import { vaultManager } from '../indexer';

export class MOCEngine {
  /**
   * Executes MOC query to generate living hierarchical tree.
   */
  public evaluateMOC(
    config: MOCConfig,
    notes: Note[],
    folders: Folder[] = [],
    sourceNoteId?: string
  ): MOCResult {
    const index = vaultManager.getIndex();
    const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));
    const noteMap = new Map<string, Note>(notes.map((n) => [n.id, n]));

    // 1. Initial Candidate Notes Filter
    let matchingNotes = notes.filter((n) => !n.trashed);

    // Filter by Folder
    if (config.folder) {
      const targetFolderQuery = config.folder.toLowerCase().trim();
      const matchingFolderIds = new Set<string>();

      folders.forEach((f) => {
        if (f.name.toLowerCase().includes(targetFolderQuery)) {
          matchingFolderIds.add(f.id);
        }
      });

      matchingNotes = matchingNotes.filter((n) => {
        if (!n.folderId) {
          return targetFolderQuery === 'root' || targetFolderQuery === 'none' || targetFolderQuery === '/';
        }
        return matchingFolderIds.has(n.folderId);
      });
    }

    // Filter by Tag
    if (config.tag) {
      const targetTag = config.tag.toLowerCase().replace(/^#/, '');
      matchingNotes = matchingNotes.filter((n) =>
        (n.tags || []).some((t) => t.toLowerCase() === targetTag || t.toLowerCase().startsWith(targetTag + '/'))
      );
    }

    // Helper to resolve note from wiki link target
    const resolveTargetNote = (targetStr: string): Note | undefined => {
      if (!targetStr) return undefined;
      if (targetStr.startsWith('note:')) {
        return noteMap.get(targetStr.slice(5));
      }
      const direct = noteMap.get(targetStr);
      if (direct) return direct;
      const resIds = index.titleToNoteIds[targetStr.toLowerCase().trim()];
      if (resIds && resIds.length > 0) {
        return noteMap.get(resIds[0]);
      }
      return undefined;
    };

    // Filter by links-to target
    if (config.linksTo) {
      const targetQuery = config.linksTo.toLowerCase();
      matchingNotes = matchingNotes.filter((n) => {
        const parsed = index.notes[n.id];
        const outLinks = parsed?.outgoingLinks || [];
        return outLinks.some((l) => {
          const resolved = resolveTargetNote(l.target);
          return (
            l.target.toLowerCase() === targetQuery ||
            (resolved && resolved.title.toLowerCase() === targetQuery)
          );
        });
      });
    }

    // Filter by linked-from source
    if (config.linkedFrom) {
      const sourceQuery = config.linkedFrom.toLowerCase();
      matchingNotes = matchingNotes.filter((n) => {
        const backlinks = index.backlinks[n.id] || [];
        return backlinks.some((b) => {
          const srcNote = noteMap.get(b.sourceNoteId);
          return srcNote && srcNote.title.toLowerCase() === sourceQuery;
        });
      });
    }

    // Sort matching notes
    this.sortNotes(matchingNotes, config.sort);

    const totalMatches = matchingNotes.length;

    // 2. Build Hierarchy Tree
    let rootItems: MOCItemNode[] = [];

    if (config.hierarchy === 'link') {
      rootItems = this.buildLinkHierarchy(
        matchingNotes,
        noteMap,
        index,
        config.depth,
        sourceNoteId
      );
    } else if (config.hierarchy === 'folder') {
      rootItems = this.buildFolderHierarchy(
        matchingNotes,
        folders,
        folderMap,
        config.depth,
        sourceNoteId
      );
    } else {
      // Flat list
      rootItems = matchingNotes.map((n) => {
        const folder = n.folderId ? folderMap.get(n.folderId) : undefined;
        const bCount = (index.backlinks[n.id] || []).length;
        return {
          id: n.id,
          title: n.title || 'Untitled Note',
          folderName: folder ? folder.name : undefined,
          level: 0,
          note: n,
          children: [],
          backlinkCount: bCount,
          childCount: 0,
          pathKey: n.id,
        };
      });
    }

    // 3. Apply Limits & Truncation
    let truncatedCount = 0;
    if (rootItems.length > config.limit) {
      truncatedCount = rootItems.length - config.limit;
      rootItems = rootItems.slice(0, config.limit);
    }

    return {
      rootItems,
      totalMatches,
      truncatedCount,
    };
  }

  private sortNotes(notes: Note[], sortField: string) {
    if (sortField === 'title') {
      notes.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortField === 'created') {
      notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Updated (default)
      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  }

  /**
   * Builds link-based hierarchy starting from matched notes with cycle detection.
   */
  private buildLinkHierarchy(
    seedNotes: Note[],
    noteMap: Map<string, Note>,
    index: any,
    maxDepth: number,
    sourceNoteId?: string
  ): MOCItemNode[] {
    const buildBranch = (
      note: Note,
      currentDepth: number,
      visitedChain: Set<string>,
      pathPrefix: string
    ): MOCItemNode => {
      const bCount = (index.backlinks[note.id] || []).length;
      const currentPath = `${pathPrefix}/${note.id}`;

      // Check cycle
      if (visitedChain.has(note.id)) {
        return {
          id: note.id,
          title: note.title || 'Untitled Note',
          level: currentDepth,
          note,
          children: [],
          backlinkCount: bCount,
          childCount: 0,
          isCycle: true,
          pathKey: currentPath,
        };
      }

      const nextVisited = new Set(visitedChain);
      nextVisited.add(note.id);

      const children: MOCItemNode[] = [];

      if (currentDepth < maxDepth) {
        const parsed = index.notes[note.id];
        const outLinks = parsed?.outgoingLinks || [];
        for (const link of outLinks) {
          let childNote: Note | undefined;
          if (link.target) {
            if (link.target.startsWith('note:')) {
              childNote = noteMap.get(link.target.slice(5));
            } else {
              childNote = noteMap.get(link.target);
              if (!childNote) {
                const resIds = index.titleToNoteIds[link.target.toLowerCase().trim()];
                if (resIds && resIds.length > 0) childNote = noteMap.get(resIds[0]);
              }
            }
          }

          if (childNote && !childNote.trashed && childNote.id !== sourceNoteId) {
            children.push(buildBranch(childNote, currentDepth + 1, nextVisited, currentPath));
          }
        }
      }

      return {
        id: note.id,
        title: note.title || 'Untitled Note',
        level: currentDepth,
        note,
        children,
        backlinkCount: bCount,
        childCount: children.length,
        isCycle: false,
        pathKey: currentPath,
      };
    };

    return seedNotes.map((note) => {
      const initialVisited = sourceNoteId ? new Set([sourceNoteId]) : new Set<string>();
      return buildBranch(note, 0, initialVisited, 'root');
    });
  }

  /**
   * Groups notes by Folder hierarchy.
   */
  private buildFolderHierarchy(
    notes: Note[],
    folders: Folder[],
    folderMap: Map<string, Folder>,
    maxDepth: number,
    sourceNoteId?: string
  ): MOCItemNode[] {
    const index = vaultManager.getIndex();

    // Group notes by folderId
    const notesByFolder = new Map<string, Note[]>();
    const rootNotes: Note[] = [];

    notes.forEach((n) => {
      if (n.id === sourceNoteId) return; // Prevent self nesting
      if (!n.folderId) {
        rootNotes.push(n);
      } else {
        const list = notesByFolder.get(n.folderId) || [];
        list.push(n);
        notesByFolder.set(n.folderId, list);
      }
    });

    const results: MOCItemNode[] = [];

    // Add folder groups
    folders.forEach((folder) => {
      const folderNotes = notesByFolder.get(folder.id) || [];
      if (folderNotes.length === 0) return;

      const children: MOCItemNode[] = folderNotes.map((n) => {
        const bCount = (index.backlinks[n.id] || []).length;
        return {
          id: n.id,
          title: n.title || 'Untitled Note',
          folderName: folder.name,
          level: 1,
          note: n,
          children: [],
          backlinkCount: bCount,
          childCount: 0,
          pathKey: `${folder.id}/${n.id}`,
        };
      });

      results.push({
        id: `folder-${folder.id}`,
        title: `📁 ${folder.name}`,
        folderName: folder.name,
        level: 0,
        children,
        backlinkCount: 0,
        childCount: children.length,
        pathKey: `folder-${folder.id}`,
      });
    });

    // Add Root notes
    rootNotes.forEach((n) => {
      const bCount = (index.backlinks[n.id] || []).length;
      results.push({
        id: n.id,
        title: n.title || 'Untitled Note',
        level: 0,
        note: n,
        children: [],
        backlinkCount: bCount,
        childCount: 0,
        pathKey: `root/${n.id}`,
      });
    });

    return results;
  }
}

export const mocEngine = new MOCEngine();
