/**
 * Phase P45: Filesystem Doctor & Diagnostics
 * 
 * Performs health checks on:
 * - Handle permissions
 * - Manifest integrity
 * - Mapped file existence
 * - Duplicate ID / filename collisions
 * - Plaintext mirror encryption warnings
 */

import { Note, Folder } from '../../types';
import {
  FilesystemDoctorCheckResult,
  FilesystemBridgeConfig,
  MirrorManifest,
} from './filesystemTypes';
import { DiskFileInfo } from './reconciliationEngine';
import { pathMappingService } from './pathMappingService';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

export class FilesystemDoctor {
  /**
   * Runs diagnostic checks on the active filesystem bridge
   */
  public async diagnose(
    config: FilesystemBridgeConfig | null,
    manifest: MirrorManifest | null,
    diskInventory: Map<string, DiskFileInfo> | null,
    notes: Note[],
    folders: Folder[]
  ): Promise<FilesystemDoctorCheckResult[]> {
    const results: FilesystemDoctorCheckResult[] = [];

    // 1. Check Configuration Status
    if (!config) {
      results.push({
        id: 'fs-status-none',
        category: 'permission',
        status: 'warning',
        title: 'No Connected Folder',
        details: 'The Filesystem Vault Bridge is not currently connected to an external folder.',
        remedyAction: 'Connect Folder',
      });
      return results;
    }

    // 2. Encryption Plaintext Safety Check
    const isEncrypted = vaultEncryptionService.isVaultEncrypted();
    if (isEncrypted && !config.settings.allowPlaintextEncryptedMirror) {
      results.push({
        id: 'fs-enc-warning',
        category: 'security',
        status: 'warning',
        title: 'Encrypted Vault Plaintext Exposure',
        details:
          'Your vault is encrypted, but mirroring writes human-readable Markdown to disk. Ensure you understand the security implications.',
        remedyAction: 'Review Encryption Policy',
      });
    }

    // 3. Manifest Integrity Check
    if (!manifest) {
      results.push({
        id: 'fs-manifest-missing',
        category: 'manifest',
        status: 'error',
        title: 'Manifest File Missing or Corrupted',
        details: 'The .pkm-manifest.json file could not be loaded from the connected folder root.',
        remedyAction: 'Rebuild Mirror Index',
      });
    } else {
      results.push({
        id: 'fs-manifest-ok',
        category: 'manifest',
        status: 'pass',
        title: 'Manifest Healthy',
        details: `Manifest version ${manifest.formatVersion} contains ${Object.keys(manifest.resources).length} mapped resource records.`,
      });
    }

    // 4. Filename Collisions Check
    const seenPaths = new Map<string, string>();
    let collisionCount = 0;
    const activeNotes = notes.filter((n) => !n.trashed);

    for (const note of activeNotes) {
      const p = pathMappingService.getNoteFilePath(note, folders, config.settings.filenamePolicy);
      const lower = p.toLowerCase();
      if (seenPaths.has(lower)) {
        collisionCount++;
      } else {
        seenPaths.set(lower, note.id);
      }
    }

    if (collisionCount > 0) {
      results.push({
        id: 'fs-collisions-warn',
        category: 'collisions',
        status: 'warning',
        title: 'Filename Collisions Detected',
        details: `${collisionCount} notes would map to identical filenames. Collision counters (e.g. Note (2).md) are being applied automatically.`,
      });
    } else {
      results.push({
        id: 'fs-collisions-pass',
        category: 'collisions',
        status: 'pass',
        title: 'Zero Filename Collisions',
        details: 'All active canonical note titles resolve to unique filesystem paths.',
      });
    }

    // 5. Disk Inventory & Orphans Check
    if (diskInventory && manifest) {
      let missingOnDisk = 0;
      let unmappedOnDisk = 0;

      for (const rec of Object.values(manifest.resources)) {
        if (!diskInventory.has(rec.path)) {
          missingOnDisk++;
        }
      }

      for (const diskPath of diskInventory.keys()) {
        if (
          (diskPath.endsWith('.md') || diskPath.endsWith('.markdown')) &&
          !manifest.pathToResourceId[diskPath]
        ) {
          unmappedOnDisk++;
        }
      }

      if (missingOnDisk > 0) {
        results.push({
          id: 'fs-missing-files',
          category: 'orphans',
          status: 'warning',
          title: 'Missing Files on Disk',
          details: `${missingOnDisk} files recorded in the manifest were not found on disk. They may have been moved or deleted externally.`,
          remedyAction: 'Sync Folder Now',
        });
      }

      if (unmappedOnDisk > 0) {
        results.push({
          id: 'fs-unmapped-files',
          category: 'orphans',
          status: 'pass',
          title: 'External Files Discovered',
          details: `${unmappedOnDisk} external Markdown files found on disk ready for automatic reconciliation.`,
        });
      }
    }

    return results;
  }
}

export const filesystemDoctor = new FilesystemDoctor();
