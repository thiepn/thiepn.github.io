/**
 * PKM V2.6 — Selective Resource & Attachment Restore
 *
 * Allows inspecting and extracting individual items from backup archives
 * without replacing or modifying the rest of the vault.
 */

import { SyncResourceEnvelope } from '../sync/syncTypes';
import { syncEngineV2 } from '../sync/syncEngineV2';
import { BackupManifestV2 } from './backupTypesV2';

export interface SelectiveRestoreItem {
  id: string;
  type: string;
  title: string;
  path: string;
  size: number;
}

export class SelectiveRestoreEngineV2 {
  /**
   * Lists all restorable items inside an archive JSON string
   */
  public listArchiveItems(rawArchiveJson: string): {
    manifest?: BackupManifestV2;
    items: SelectiveRestoreItem[];
    error?: string;
  } {
    try {
      const parsed = JSON.parse(rawArchiveJson);
      const manifest: BackupManifestV2 = parsed.manifest;
      const filesTable: Record<string, string> = parsed.files || {};
      const items: SelectiveRestoreItem[] = [];

      if (manifest && manifest.files) {
        for (const file of manifest.files) {
          if (file.category === 'resource') {
            const raw = filesTable[file.path];
            let title = file.resourceId || file.path;
            try {
              const env = JSON.parse(raw);
              title = env.data?.title || env.data?.name || title;
            } catch {}

            items.push({
              id: file.resourceId || file.path,
              type: file.resourceType || 'unknown',
              title,
              path: file.path,
              size: file.size,
            });
          }
        }
      }

      return { manifest, items };
    } catch (e: any) {
      return { items: [], error: 'Failed to read archive: ' + e?.message };
    }
  }

  /**
   * Restores selected items from archive into the active vault
   */
  public restoreSelectedItems(
    rawArchiveJson: string,
    selectedPaths: string[]
  ): {
    restoredCount: number;
    errors: string[];
  } {
    let restoredCount = 0;
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(rawArchiveJson);
      const filesTable: Record<string, string> = parsed.files || {};

      for (const path of selectedPaths) {
        const raw = filesTable[path];
        if (!raw) {
          errors.push(`Missing content for file ${path}`);
          continue;
        }

        try {
          const envelope: SyncResourceEnvelope = JSON.parse(raw);
          syncEngineV2.putLocalResource(envelope);
          restoredCount++;
        } catch (err: any) {
          errors.push(`Failed to import item at ${path}: ${err?.message}`);
        }
      }
    } catch (e: any) {
      errors.push('Archive parse error: ' + e?.message);
    }

    return { restoredCount, errors };
  }
}

export const selectiveRestoreEngineV2 = new SelectiveRestoreEngineV2();
