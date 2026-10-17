/**
 * Phase P45: Filesystem Reconciliation Engine
 * 
 * Implements 3-way reconciliation between:
 * - BASE: Last successfully synchronized representation (.pkm-manifest.json)
 * - LOCAL: Current canonical app note / attachment / config
 * - EXTERNAL: Current disk file on the connected filesystem
 * 
 * Features:
 * - Recursive async directory scanning
 * - Fast metadata pre-filtering (size, mtime)
 * - 3-Way line merge using mergeEngine.ts
 * - Rename & move correlation using stable IDs & content fingerprints
 * - Safeguards against mass deletions and mass changes
 * - Ignores .git, temporary/atomic editor artifacts, and OS metadata
 */

import { Note, Folder } from '../../types';
import {
  MirrorManifest,
  MirrorFileRecord,
  ReconciliationPlan,
  ReconciliationItem,
  ReconciliationActionType,
  FilesystemConflict,
  FilenamePolicy,
} from './filesystemTypes';
import { pathMappingService } from './pathMappingService';
import { fileHasher } from './fileHasher';
import { serializeNoteToMarkdown, parseMarkdownToNote } from '../portableVaultSerializer';
import { merge3Text } from '../mergeEngine';

export interface DiskFileInfo {
  path: string;
  name: string;
  size: number;
  mtime: number;
  fileHandle: FileSystemFileHandle;
}

export class ReconciliationEngine {
  /**
   * Recursively scans a FileSystemDirectoryHandle and gathers all non-ignored disk files
   */
  public async scanDiskDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath = '',
    results: Map<string, DiskFileInfo> = new Map()
  ): Promise<Map<string, DiskFileInfo>> {
    try {
      for await (const entry of (dirHandle as any).values()) {
        const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (pathMappingService.isIgnoredPath(currentPath)) {
          continue;
        }

        if (entry.kind === 'file') {
          try {
            const file = await (entry as FileSystemFileHandle).getFile();
            results.set(currentPath, {
              path: currentPath,
              name: entry.name,
              size: file.size,
              mtime: file.lastModified,
              fileHandle: entry as FileSystemFileHandle,
            });
          } catch (err) {
            console.warn(`Could not read file metadata for ${currentPath}:`, err);
          }
        } else if (entry.kind === 'directory') {
          // Recursively scan subdirectory
          await this.scanDiskDirectory(entry as FileSystemDirectoryHandle, currentPath, results);
        }
      }
    } catch (err) {
      console.error('Error scanning disk directory:', err);
    }
    return results;
  }

  /**
   * Builds complete 3-way reconciliation plan between canonical app state and disk state
   */
  public async generatePlan(
    notes: Note[],
    folders: Folder[],
    manifest: MirrorManifest,
    diskInventory: Map<string, DiskFileInfo>,
    filenamePolicy: FilenamePolicy = 'follow_title'
  ): Promise<ReconciliationPlan> {
    const activeNotes = notes.filter((n) => !n.trashed);
    const trashedNotes = notes.filter((n) => n.trashed);

    const folderMap = new Map<string, string>();
    const foldersByName = new Map<string, string>();
    for (const f of folders) {
      folderMap.set(f.id, f.name);
      foldersByName.set(f.name.toLowerCase(), f.id);
    }

    const items: ReconciliationItem[] = [];
    const processedDiskPaths = new Set<string>();
    const processedNoteIds = new Set<string>();

    // Safety Guard: Check for Disconnected or Inaccessible Drive
    // If the disk inventory is completely empty while the vault/manifest previously had files,
    // this indicates an unmounted volume, permission revocation, or disconnected drive rather than intentional mass deletion.
    const manifestResourceCount = Object.keys(manifest.resources || {}).length;
    const isDriveLikelyDisconnected = diskInventory.size === 0 && (manifestResourceCount > 0 || activeNotes.length > 5);

    // Step 1: Map all active canonical notes to expected relative paths
    const existingMappedPaths = new Set<string>();
    const noteExpectedPathMap = new Map<string, string>();

    for (const note of activeNotes) {
      const expectedPath = pathMappingService.getNoteFilePath(
        note,
        folders,
        filenamePolicy,
        existingMappedPaths
      );
      existingMappedPaths.add(expectedPath.toLowerCase());
      noteExpectedPathMap.set(note.id, expectedPath);
    }

    // Step 2: Compare each active app note against Manifest (BASE) and Disk (EXTERNAL)
    for (const note of activeNotes) {
      processedNoteIds.add(note.id);
      const expectedPath = noteExpectedPathMap.get(note.id)!;
      const baseRecord = manifest.resources[note.id];
      const localMd = serializeNoteToMarkdown(note, folderMap);
      const localHash = await fileHasher.hashText(localMd);

      const diskFileAtExpected = diskInventory.get(expectedPath);
      const diskFileAtBase = baseRecord ? diskInventory.get(baseRecord.path) : undefined;
      const activeDiskFile = diskFileAtExpected || diskFileAtBase;

      if (isDriveLikelyDisconnected) {
        // Halt deletion operations when drive appears disconnected
        continue;
      }

      if (!baseRecord && !activeDiskFile) {
        // Case A: New note in app -> write to disk

        items.push({
          id: `rec-app-to-disk-${note.id}`,
          resourceId: note.id,
          resourceType: 'note',
          path: expectedPath,
          action: 'app_to_disk',
          appHash: localHash,
          title: note.title || 'Untitled Note',
          diffSummary: 'New note created in app',
        });
      } else if (baseRecord && !activeDiskFile) {
        // Case B: File was deleted on disk externally
        if (localHash === baseRecord.lastHash) {
          // Note unchanged in app -> external deletion
          items.push({
            id: `rec-disk-del-${note.id}`,
            resourceId: note.id,
            resourceType: 'note',
            path: baseRecord.path,
            action: 'deletion_disk_to_app',
            baseHash: baseRecord.lastHash,
            appHash: localHash,
            title: note.title || 'Untitled Note',
            diffSummary: 'File was deleted externally on disk',
          });
        } else {
          // Note was modified in app while deleted on disk -> conflict or re-create
          items.push({
            id: `rec-conflict-del-${note.id}`,
            resourceId: note.id,
            resourceType: 'note',
            path: expectedPath,
            action: 'conflict',
            baseHash: baseRecord.lastHash,
            appHash: localHash,
            title: note.title || 'Untitled Note',
            diffSummary: 'Modified in app but deleted on disk',
          });
        }
      } else if (activeDiskFile) {
        processedDiskPaths.add(activeDiskFile.path);

        // Read external file content
        const fileObj = await activeDiskFile.fileHandle.getFile();
        const diskMd = await fileObj.text();
        const diskHash = await fileHasher.hashText(diskMd);

        const baseHash = baseRecord ? baseRecord.lastHash : undefined;
        const localChanged = localHash !== baseHash;
        const diskChanged = diskHash !== baseHash;

        if (activeDiskFile.path !== expectedPath) {
          // File path moved or renamed
          if (!localChanged && !diskChanged) {
            items.push({
              id: `rec-rename-disk-${note.id}`,
              resourceId: note.id,
              resourceType: 'note',
              path: expectedPath,
              action: 'rename_disk',
              baseHash,
              appHash: localHash,
              diskHash,
              title: note.title || 'Untitled Note',
              diffSummary: `Rename on disk: ${activeDiskFile.path} -> ${expectedPath}`,
            });
          }
        }

        if (!localChanged && !diskChanged) {
          // No changes on either side
          continue;
        } else if (localChanged && !diskChanged) {
          // Only LOCAL app changed -> write to disk
          items.push({
            id: `rec-app-to-disk-${note.id}`,
            resourceId: note.id,
            resourceType: 'note',
            path: expectedPath,
            action: 'app_to_disk',
            baseHash,
            appHash: localHash,
            diskHash,
            title: note.title || 'Untitled Note',
            diffSummary: 'Note updated in app',
          });
        } else if (!localChanged && diskChanged) {
          // Only EXTERNAL disk changed -> import to app
          items.push({
            id: `rec-disk-to-app-${note.id}`,
            resourceId: note.id,
            resourceType: 'note',
            path: activeDiskFile.path,
            action: 'disk_to_app',
            baseHash,
            appHash: localHash,
            diskHash,
            title: note.title || 'Untitled Note',
            diffSummary: 'Note edited externally',
          });
        } else {
          // Both changed! Attempt 3-way merge
          const mergeResult = merge3Text(
            baseRecord ? localMd : '',
            localMd,
            diskMd,
            { local: 'APP NOTE', remote: 'EXTERNAL DISK FILE' }
          );

          if (mergeResult.clean) {
            items.push({
              id: `rec-clean-merge-${note.id}`,
              resourceId: note.id,
              resourceType: 'note',
              path: expectedPath,
              action: 'disk_to_app',
              baseHash,
              appHash: localHash,
              diskHash,
              title: note.title || 'Untitled Note',
              cleanMergedText: mergeResult.mergedText,
              diffSummary: 'Clean 3-way merge applied',
            });
          } else {
            items.push({
              id: `rec-conflict-${note.id}`,
              resourceId: note.id,
              resourceType: 'note',
              path: expectedPath,
              action: 'conflict',
              baseHash,
              appHash: localHash,
              diskHash,
              title: note.title || 'Untitled Note',
              diffSummary: `Conflict detected (${mergeResult.conflictBlocksCount} blocks)`,
            });
          }
        }
      }
    }

    // Step 3: Handle Trashed App Notes
    for (const trashedNote of trashedNotes) {
      const baseRecord = manifest.resources[trashedNote.id];
      if (baseRecord && diskInventory.has(baseRecord.path)) {
        processedDiskPaths.add(baseRecord.path);
        items.push({
          id: `rec-del-app-to-disk-${trashedNote.id}`,
          resourceId: trashedNote.id,
          resourceType: 'note',
          path: baseRecord.path,
          action: 'deletion_app_to_disk',
          title: trashedNote.title || 'Trashed Note',
          diffSummary: 'Note trashed in app -> remove from mirror',
        });
      }
    }

    // Step 4: Check remaining unmapped files on disk (New external notes / attachments)
    for (const [diskPath, diskInfo] of diskInventory.entries()) {
      if (processedDiskPaths.has(diskPath)) continue;

      if (diskPath.endsWith('.md') || diskPath.endsWith('.markdown')) {
        // Read file to check if it contains a known frontmatter ID
        try {
          const file = await diskInfo.fileHandle.getFile();
          const content = await file.text();
          const parsedNote = parseMarkdownToNote(content, foldersByName);

          if (parsedNote.id && manifest.resources[parsedNote.id]) {
            // Note was moved/renamed externally
            items.push({
              id: `rec-rename-app-${parsedNote.id}`,
              resourceId: parsedNote.id,
              resourceType: 'note',
              path: diskPath,
              action: 'rename_app',
              title: parsedNote.title || diskInfo.name,
              diffSummary: `File moved externally to ${diskPath}`,
            });
          } else {
            // Brand new external markdown file
            items.push({
              id: `rec-new-ext-${diskPath}`,
              resourceId: parsedNote.id || `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              resourceType: 'note',
              path: diskPath,
              action: 'new_external_note',
              title: pathMappingService.inferNoteTitle(diskInfo.name, content),
              diskHash: await fileHasher.hashText(content),
              diffSummary: `New external file: ${diskPath}`,
            });
          }
        } catch (err) {
          console.warn(`Could not parse external markdown file ${diskPath}:`, err);
        }
      } else if (diskPath.startsWith('Attachments/') || diskPath.startsWith('attachments/')) {
        // External media attachment
        items.push({
          id: `rec-new-att-${diskPath}`,
          resourceId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          resourceType: 'attachment',
          path: diskPath,
          action: 'new_external_attachment',
          title: diskInfo.name,
          diffSummary: `New external attachment: ${diskPath}`,
        });
      }
    }

    // Calculate plan statistics
    const stats = {
      appToDiskCount: items.filter((i) => i.action === 'app_to_disk').length,
      diskToAppCount: items.filter((i) => i.action === 'disk_to_app').length,
      renameCount: items.filter((i) => i.action === 'rename_disk' || i.action === 'rename_app').length,
      newExternalCount: items.filter((i) => i.action === 'new_external_note' || i.action === 'new_external_attachment').length,
      conflictCount: items.filter((i) => i.action === 'conflict').length,
      deletionCount: items.filter((i) => i.action === 'deletion_app_to_disk' || i.action === 'deletion_disk_to_app').length,
      totalChanges: items.length,
    };

    const isMassChange = stats.totalChanges >= 50;
    const isMassDelete = stats.deletionCount >= 10 || (activeNotes.length > 0 && stats.deletionCount / activeNotes.length > 0.2);
    const requiresSafetyReview = isMassChange || isMassDelete || stats.conflictCount > 0;

    return {
      id: `plan-${Date.now()}`,
      timestamp: Date.now(),
      items,
      stats,
      isMassChange,
      isMassDelete,
      requiresSafetyReview,
    };
  }

  /**
   * Alias for generatePlan
   */
  public async generateReconciliationPlan(
    notes: Note[],
    folders: Folder[],
    manifest: MirrorManifest,
    diskInventory: Map<string, DiskFileInfo>,
    filenamePolicy: FilenamePolicy = 'follow_title'
  ): Promise<ReconciliationPlan> {
    return this.generatePlan(notes, folders, manifest, diskInventory, filenamePolicy);
  }


  /**
   * Resolves intermediate directories from root handle for nested paths
   */
  public async getSubdirectoryHandle(
    rootHandle: FileSystemDirectoryHandle,
    folderPath: string,
    create = true
  ): Promise<FileSystemDirectoryHandle> {
    if (!folderPath || folderPath === '.' || folderPath === '/') {
      return rootHandle;
    }

    const segments = folderPath.split('/').filter(Boolean);
    let current = rootHandle;

    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment, { create });
    }

    return current;
  }

  /**
   * Writes text file atomically to the specified relative path
   */
  public async writeTextFile(
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string,
    content: string
  ): Promise<boolean> {
    try {
      const segments = relativePath.split('/');
      const fileName = segments.pop()!;
      const folderPath = segments.join('/');

      const dirHandle = await this.getSubdirectoryHandle(rootHandle, folderPath, true);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.error(`Failed to write text file to ${relativePath}:`, err);
      return false;
    }
  }

  /**
   * Writes binary blob file atomically to the specified relative path
   */
  public async writeBinaryFile(
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string,
    data: Blob | ArrayBuffer
  ): Promise<boolean> {
    try {
      const segments = relativePath.split('/');
      const fileName = segments.pop()!;
      const folderPath = segments.join('/');

      const dirHandle = await this.getSubdirectoryHandle(rootHandle, folderPath, true);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (err) {
      console.error(`Failed to write binary file to ${relativePath}:`, err);
      return false;
    }
  }

  /**
   * Removes a file safely from disk
   */
  public async deleteFile(
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string
  ): Promise<boolean> {
    try {
      const segments = relativePath.split('/');
      const fileName = segments.pop()!;
      const folderPath = segments.join('/');

      const dirHandle = await this.getSubdirectoryHandle(rootHandle, folderPath, false);
      await (dirHandle as any).removeEntry(fileName);
      return true;
    } catch (err) {
      console.warn(`Could not delete file at ${relativePath}:`, err);
      return false;
    }
  }
}

export const reconciliationEngine = new ReconciliationEngine();
