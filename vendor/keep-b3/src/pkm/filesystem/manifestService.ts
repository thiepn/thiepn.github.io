/**
 * Phase P45: Filesystem Mirror Manifest Service
 * 
 * Manages /.pkm-manifest.json synchronization metadata.
 * Strictly excludes machine secrets, device tokens, and temporary derived indexes.
 */

import { MirrorManifest, MirrorFileRecord } from './filesystemTypes';

const MANIFEST_FILENAME = '.pkm-manifest.json';
const CURRENT_FORMAT_VERSION = 1;

export class ManifestService {
  /**
   * Creates a fresh empty manifest for a vault
   */
  public createEmptyManifest(vaultId: string): MirrorManifest {
    return {
      formatVersion: CURRENT_FORMAT_VERSION,
      generator: 'KeepNotes-PKM-P45',
      vaultId,
      generatedAt: new Date().toISOString(),
      resources: {},
      pathToResourceId: {},
    };
  }

  /**
   * Reads and parses manifest from root directory handle
   */
  public async readManifest(rootHandle: FileSystemDirectoryHandle): Promise<MirrorManifest | null> {
    try {
      const fileHandle = await rootHandle.getFileHandle(MANIFEST_FILENAME, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed && parsed.resources && typeof parsed.resources === 'object') {
        // Rebuild pathToResourceId if missing
        if (!parsed.pathToResourceId) {
          parsed.pathToResourceId = {};
          for (const [id, rec] of Object.entries(parsed.resources)) {
            if ((rec as MirrorFileRecord).path) {
              parsed.pathToResourceId[(rec as MirrorFileRecord).path] = id;
            }
          }
        }
        return parsed as MirrorManifest;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Writes manifest atomically to root directory handle
   */
  public async writeManifest(
    rootHandle: FileSystemDirectoryHandle,
    manifest: MirrorManifest
  ): Promise<boolean> {
    try {
      manifest.generatedAt = new Date().toISOString();
      const fileHandle = await rootHandle.getFileHandle(MANIFEST_FILENAME, { create: true });
      const writable = await (fileHandle as any).createWritable();
      const content = JSON.stringify(manifest, null, 2);
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.error('Failed to write .pkm-manifest.json to filesystem:', err);
      return false;
    }
  }

  /**
   * Updates or inserts a file record in the manifest
   */
  public updateRecord(
    manifest: MirrorManifest,
    record: MirrorFileRecord
  ): void {
    // If resource had a previous path, clear old path index
    const existing = manifest.resources[record.resourceId];
    if (existing && existing.path && existing.path !== record.path) {
      delete manifest.pathToResourceId[existing.path];
    }

    manifest.resources[record.resourceId] = record;
    manifest.pathToResourceId[record.path] = record.resourceId;
  }

  /**
   * Removes a file record from the manifest
   */
  public removeRecord(manifest: MirrorManifest, resourceId: string): void {
    const existing = manifest.resources[resourceId];
    if (existing) {
      delete manifest.pathToResourceId[existing.path];
      delete manifest.resources[resourceId];
    }
  }
}

export const manifestService = new ManifestService();
