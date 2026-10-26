import { Note, Folder } from '../../types';
import { LinkPreviewData, NavigableResourceType } from './navigationTypes';
import { PKMResolver } from '../resolver';
import { vaultManager } from '../indexer';

export class LinkPreviewManager {
  private previewCache: Map<string, { data: LinkPreviewData; timestamp: number }> = new Map();
  private pendingHoverTimer: number | null = null;
  private currentAbortController: AbortController | null = null;

  /**
   * Fetch lightweight preview metadata for a link target
   */
  public getPreviewData(
    targetRaw: string,
    notes: Note[],
    folders?: Folder[],
    options?: { currentNoteId?: string; isVaultLocked?: boolean }
  ): LinkPreviewData | null {
    if (!targetRaw) return null;

    // Check cache (15s TTL)
    const cacheKey = `${targetRaw}-${options?.currentNoteId || ''}-${options?.isVaultLocked ? 'locked' : 'open'}`;
    const cached = this.previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 15000) {
      return cached.data;
    }

    if (options?.isVaultLocked) {
      const lockedData: LinkPreviewData = {
        resourceType: 'note',
        resourceId: 'locked',
        title: 'Protected Resource',
        firstExcerpt: 'Content preview is unavailable while the vault is locked.',
        isEncryptedOrLocked: true,
      };
      return lockedData;
    }

    const index = vaultManager.getIndex();
    const resolved = PKMResolver.resolveLink(targetRaw, index, {
      currentNoteId: options?.currentNoteId,
    });

    if (resolved.status !== 'resolved' || !resolved.resolvedNoteId) {
      return {
        resourceType: 'note',
        resourceId: 'missing',
        title: targetRaw,
        firstExcerpt: 'Unresolved link. Click to create this note.',
        subtitle: 'Uncreated Note',
      };
    }

    const targetNote = notes.find((n) => n.id === resolved.resolvedNoteId);
    if (!targetNote) return null;

    const folderMap = new Map<string, string>();
    if (folders) {
      folders.forEach((f) => folderMap.set(f.id, f.name));
    }

    // Extract first clean non-heading excerpt or subpath content
    let excerpt = '';
    let subpathTitle: string | undefined;

    if (resolved.resolvedHeading) {
      subpathTitle = `Heading: ${resolved.resolvedHeading.text}`;
      const lines = (targetNote.content || '').split('\n');
      const startLine = resolved.resolvedHeading.line + 1;
      const relevantLines = lines.slice(startLine, startLine + 4).filter((l) => !l.startsWith('#'));
      excerpt = relevantLines.join(' ').trim().slice(0, 200);
    } else {
      const lines = (targetNote.content || '').split('\n');
      const textLines = lines.filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
      excerpt = textLines.slice(0, 3).join(' ').trim().slice(0, 200);
    }

    if (excerpt.length >= 200) {
      excerpt += '...';
    }

    const numModified =
      typeof targetNote.updatedAt === 'string'
        ? new Date(targetNote.updatedAt).getTime()
        : typeof targetNote.updatedAt === 'number'
        ? targetNote.updatedAt
        : Date.now();

    const previewData: LinkPreviewData = {
      resourceType: 'note',
      resourceId: targetNote.id,
      title: targetNote.title || 'Untitled Note',
      subtitle: targetNote.folderId ? `Folder: ${folderMap.get(targetNote.folderId)}` : undefined,
      folderPath: targetNote.folderId ? folderMap.get(targetNote.folderId) : undefined,
      properties: targetNote.properties,
      tags: targetNote.tags,
      firstExcerpt: excerpt || 'No content preview available.',
      lastModified: numModified,
      subpathTitle,
    };

    this.previewCache.set(cacheKey, { data: previewData, timestamp: Date.now() });

    // Bound cache size
    if (this.previewCache.size > 50) {
      const oldestKey = this.previewCache.keys().next().value;
      if (oldestKey) this.previewCache.delete(oldestKey);
    }

    return previewData;
  }

  /**
   * Schedule debounced peek with cancellation
   */
  public schedulePreview(
    onTrigger: () => void,
    delayMs: number = 300
  ): () => void {
    this.cancelScheduledPreview();
    this.pendingHoverTimer = window.setTimeout(() => {
      onTrigger();
    }, delayMs);

    return () => this.cancelScheduledPreview();
  }

  public cancelScheduledPreview(): void {
    if (this.pendingHoverTimer !== null) {
      clearTimeout(this.pendingHoverTimer);
      this.pendingHoverTimer = null;
    }
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  public clearCache(): void {
    this.previewCache.clear();
    this.cancelScheduledPreview();
  }
}

export const linkPreviewManager = new LinkPreviewManager();
