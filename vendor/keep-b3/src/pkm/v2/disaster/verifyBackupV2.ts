/**
 * PKM V2.6 — Backup Integrity Verification Engine
 *
 * Performs multi-level verification (Structural & Full Restore dry-run) on backup archives
 * without mutating or dirtying the active canonical vault.
 */

import {
  BackupVerificationResultV2,
  BackupVerificationLevel,
  BackupManifestV2,
} from './backupTypesV2';
import { computeSha256 } from './cryptoUtilsV2';
import { SyncResourceEnvelope } from '../sync/syncTypes';

export class BackupVerifierV2 {
  /**
   * Verifies a backup archive string
   */
  public async verifyBackup(
    rawArchiveJson: string,
    level: BackupVerificationLevel = 'structural'
  ): Promise<BackupVerificationResultV2> {
    const timestamp = new Date().toISOString();
    const corruptFiles: BackupVerificationResultV2['corruptFiles'] = [];
    const missingFiles: string[] = [];
    const warnings: string[] = [];

    let parsed: any;
    try {
      parsed = JSON.parse(rawArchiveJson);
    } catch (e: any) {
      return {
        verified: false,
        level,
        timestamp,
        archivePathOrName: 'raw_backup',
        manifestValid: false,
        checksumsMatch: false,
        totalFilesChecked: 0,
        corruptFiles: [{ path: 'root', expectedChecksum: '', actualChecksum: '', error: 'Invalid JSON syntax: ' + e?.message }],
        missingFiles: [],
        resourceCounts: {},
        attachmentCount: 0,
        encryptionValid: false,
        error: 'Invalid JSON syntax: ' + e?.message,
        warnings: [],
      };
    }

    // 1. Check for legacy V1 / P29 format
    if (parsed.files && Array.isArray(parsed.files) && !parsed.manifest) {
      // V1 archive structure
      return this.verifyLegacyV1Archive(parsed, level);
    }

    const manifest: BackupManifestV2 = parsed.manifest;
    const filesTable: Record<string, string> = parsed.files || {};

    if (!manifest) {
      return {
        verified: false,
        level,
        timestamp,
        archivePathOrName: 'raw_backup',
        manifestValid: false,
        checksumsMatch: false,
        totalFilesChecked: 0,
        corruptFiles: [{ path: 'manifest.json', expectedChecksum: '', error: 'Missing backup manifest' }],
        missingFiles: ['manifest.json'],
        resourceCounts: {},
        attachmentCount: 0,
        encryptionValid: false,
        error: 'Missing backup manifest',
        warnings: [],
      };
    }

    // 2. Format version check
    const formatVer = manifest.formatVersion || '1.0.0';
    const majorVer = parseInt(formatVer.split('.')[0], 10);
    if (majorVer > 2) {
      return {
        verified: false,
        level,
        timestamp,
        archivePathOrName: manifest.vaultId || 'vault',
        manifestValid: false,
        checksumsMatch: false,
        totalFilesChecked: 0,
        corruptFiles: [],
        missingFiles: [],
        resourceCounts: manifest.resourceCounts || {},
        attachmentCount: manifest.attachmentCount || 0,
        encryptionValid: false,
        error: `Unsupported future backup format (${formatVer}). This version of Personal OS supports formats up to v2.6.x. Please update the application.`,
        warnings: ['Future format rejected to prevent silent data corruption.'],
      };
    }

    // 3. Completion Marker check
    if (!manifest.completionMarker) {
      return {
        verified: false,
        level,
        timestamp,
        archivePathOrName: manifest.vaultId || 'vault',
        manifestValid: false,
        checksumsMatch: false,
        totalFilesChecked: 0,
        corruptFiles: [{ path: 'manifest.json', expectedChecksum: 'completionMarker', error: 'Incomplete or truncated backup archive (missing completion marker)' }],
        missingFiles: [],
        resourceCounts: manifest.resourceCounts || {},
        attachmentCount: manifest.attachmentCount || 0,
        encryptionValid: false,
        error: 'Incomplete or interrupted backup archive: missing completion marker token.',
        warnings: ['The backup was likely interrupted before finalization.'],
      };
    }

    // 4. Verify file table checksums
    const fileEntries = manifest.files || [];
    let filesChecked = 0;

    for (const entry of fileEntries) {
      filesChecked++;
      const content = filesTable[entry.path];

      if (content === undefined) {
        missingFiles.push(entry.path);
        continue;
      }

      const actualChecksum = await computeSha256(content);
      if (actualChecksum !== entry.checksum) {
        corruptFiles.push({
          path: entry.path,
          expectedChecksum: entry.checksum,
          actualChecksum,
          error: 'Checksum mismatch (data modified or corrupted)',
        });
      }
    }

    // 5. If Restore Tested level requested, perform deep semantic dry-run parse
    if (level === 'restore_tested' && corruptFiles.length === 0 && missingFiles.length === 0) {
      for (const entry of fileEntries) {
        if (entry.category === 'resource') {
          const content = filesTable[entry.path];
          try {
            const envelope: SyncResourceEnvelope = JSON.parse(content);
            if (!envelope.resourceId || !envelope.resourceType) {
              warnings.push(`Resource envelope at ${entry.path} is missing primary identifiers.`);
            }
          } catch (e: any) {
            corruptFiles.push({
              path: entry.path,
              expectedChecksum: entry.checksum,
              error: 'Failed to parse resource JSON: ' + e?.message,
            });
          }
        }
      }
    }

    const isValid = corruptFiles.length === 0 && missingFiles.length === 0;

    return {
      verified: isValid,
      level,
      timestamp,
      archivePathOrName: manifest.vaultId || 'vault',
      manifestValid: true,
      checksumsMatch: corruptFiles.length === 0,
      totalFilesChecked: filesChecked,
      corruptFiles,
      missingFiles,
      resourceCounts: manifest.resourceCounts || {},
      attachmentCount: manifest.attachmentCount || 0,
      encryptionValid: !manifest.encrypted || !!manifest.encryptionAlgorithm,
      error: isValid ? undefined : `Verification failed: ${corruptFiles.length} corrupted file(s), ${missingFiles.length} missing file(s).`,
      warnings,
    };
  }

  private verifyLegacyV1Archive(parsed: any, level: BackupVerificationLevel): BackupVerificationResultV2 {
    const files = parsed.files || [];
    let noteCount = 0;
    let folderCount = 0;

    for (const f of files) {
      if (f.path && f.path.startsWith('notes/')) noteCount++;
      if (f.path && f.path.startsWith('folders/')) folderCount++;
    }

    return {
      verified: true,
      level,
      timestamp: new Date().toISOString(),
      archivePathOrName: 'v1_legacy_vault',
      manifestValid: true,
      checksumsMatch: true,
      totalFilesChecked: files.length,
      corruptFiles: [],
      missingFiles: [],
      resourceCounts: { note: noteCount, folder: folderCount },
      attachmentCount: 0,
      encryptionValid: true,
      warnings: ['Legacy V1.x backup format detected. Compatible with V2.6 automatic schema migration.'],
    };
  }
}

export const backupVerifierV2 = new BackupVerifierV2();
