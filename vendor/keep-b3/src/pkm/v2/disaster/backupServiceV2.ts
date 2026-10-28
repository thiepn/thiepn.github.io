/**
 * PKM V2.6 — Backup Service & Generation Management
 *
 * Implements streamable, atomic, versioned backups with individual SHA-256
 * checksums, cryptographic completion markers, and non-destructive generation retention.
 */

import {
  BackupManifestV2,
  BackupArchiveV2,
  BackupFileEntryV2,
  BackupGenerationV2,
  BackupVerificationResultV2,
} from './backupTypesV2';
import { computeSha256, canonicalizeJsonString } from './cryptoUtilsV2';
import { vaultEncryptionService } from '../../encryption';
import { SyncResourceEnvelope } from '../sync/syncTypes';
import { syncEngineV2 } from '../sync/syncEngineV2';

const GENERATION_STORAGE_KEY = 'pkm_v2_backup_generations_v1';
const MAX_GENERATIONS_KEPT = 10;

export class BackupServiceV2 {
  private generations: BackupGenerationV2[] = [];
  private listeners: Set<(generations: BackupGenerationV2[]) => void> = new Set();
  private isBackupInProgress: boolean = false;
  private cancelRequested: boolean = false;

  constructor() {
    this.loadGenerations();
  }

  private loadGenerations(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(GENERATION_STORAGE_KEY);
        if (raw) {
          this.generations = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('[BackupServiceV2] Failed to load backup generations:', e);
    }
  }

  private persistGenerations(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GENERATION_STORAGE_KEY, JSON.stringify(this.generations));
      }
    } catch (e) {
      console.warn('[BackupServiceV2] Failed to persist backup generations:', e);
    }
    this.notify();
  }

  public subscribe(listener: (generations: BackupGenerationV2[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getGenerations());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const all = this.getGenerations();
    for (const l of this.listeners) {
      try {
        l(all);
      } catch (err) {
        console.error('Error in backup service listener:', err);
      }
    }
  }

  public getGenerations(): BackupGenerationV2[] {
    return [...this.generations];
  }

  public getLastKnownGood(): BackupGenerationV2 | undefined {
    return this.generations.find((g) => g.isLastKnownGood && g.verified);
  }

  public cancelBackup(): void {
    if (this.isBackupInProgress) {
      this.cancelRequested = true;
    }
  }

  /**
   * Generates a complete, structured V2.6 Backup Archive in batches/chunks
   */
  public async createBackupArchive(options?: {
    customResources?: SyncResourceEnvelope[];
    customAttachments?: Array<{ id: string; name: string; mimeType: string; dataBase64: string; size: number }>;
    onProgress?: (progress: { processed: number; total: number; stage: string }) => void;
  }): Promise<{
    archive: BackupArchiveV2;
    rawJson: string;
    generation: BackupGenerationV2;
  }> {
    if (this.isBackupInProgress) {
      throw new Error('A backup operation is already in progress.');
    }

    this.isBackupInProgress = true;
    this.cancelRequested = false;

    try {
      const isEncrypted = vaultEncryptionService.isEncryptionEnabled();
      const createdAt = new Date().toISOString();
      const vaultId = 'vault_' + Date.now().toString(36);

      // 1. Gather canonical resources snapshot
      const canonicalResources: SyncResourceEnvelope[] = options?.customResources || syncEngineV2.getAllLocalResources();
      const totalResources = canonicalResources.length;
      const attachments = options?.customAttachments || [];
      const totalItems = totalResources + attachments.length;

      const filesTable: Record<string, string> = {};
      const fileEntries: BackupFileEntryV2[] = [];
      const resourceCounts: Record<string, number> = {};
      let totalCanonicalBytes = 0;

      // 2. Batch process resources in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < totalResources; i += CHUNK_SIZE) {
        if (this.cancelRequested) {
          throw new Error('Backup cancelled by user.');
        }

        const chunk = canonicalResources.slice(i, i + CHUNK_SIZE);
        for (const res of chunk) {
          // Exclude ephemeral tokens/passwords from resource payload if any
          const cleanMetadata = { ...(res.metadata || {}) };
          delete cleanMetadata.oauth_token;
          delete cleanMetadata.git_password;
          delete cleanMetadata.api_key;

          const cleanEnvelope: SyncResourceEnvelope = {
            ...res,
            metadata: cleanMetadata,
          };

          const path = `resources/${res.resourceType}/${res.resourceId}.json`;
          const content = canonicalizeJsonString(cleanEnvelope);
          const checksum = await computeSha256(content);
          const size = new TextEncoder().encode(content).length;

          filesTable[path] = content;
          totalCanonicalBytes += size;

          fileEntries.push({
            path,
            size,
            checksum,
            category: 'resource',
            resourceType: res.resourceType,
            resourceId: res.resourceId,
          });

          resourceCounts[res.resourceType] = (resourceCounts[res.resourceType] || 0) + 1;
        }

        if (options?.onProgress) {
          options.onProgress({
            processed: Math.min(i + CHUNK_SIZE, totalResources),
            total: totalItems,
            stage: 'Archiving canonical resources...',
          });
        }
      }

      // 3. Process attachments
      for (let j = 0; j < attachments.length; j++) {
        if (this.cancelRequested) {
          throw new Error('Backup cancelled by user.');
        }

        const att = attachments[j];
        const path = `attachments/${att.id}.bin`;
        const checksum = await computeSha256(att.dataBase64);
        filesTable[path] = att.dataBase64;
        totalCanonicalBytes += att.size;

        fileEntries.push({
          path,
          size: att.size,
          checksum,
          category: 'attachment',
          resourceId: att.id,
        });

        if (options?.onProgress) {
          options.onProgress({
            processed: totalResources + j + 1,
            total: totalItems,
            stage: 'Archiving media attachments...',
          });
        }
      }

      // 4. Generate Completion Marker & Final Manifest
      const completionTokenSource = `${vaultId}::${createdAt}::${totalCanonicalBytes}::${fileEntries.length}`;
      const completionMarker = await computeSha256(completionTokenSource);

      const manifest: BackupManifestV2 = {
        formatVersion: '2.6.0',
        appVersion: '2.6.0-pkm',
        schemaVersion: 2,
        createdAt,
        vaultId,
        encrypted: isEncrypted,
        encryptionAlgorithm: isEncrypted ? 'AES-GCM-256' : undefined,
        encryptionFormatVersion: isEncrypted ? 2 : undefined,
        resourceCounts,
        attachmentCount: attachments.length,
        totalCanonicalBytes,
        files: fileEntries,
        completionMarker,
        generator: 'PKM_V2.6_DISASTER_RECOVERY_ENGINE',
      };

      const manifestJson = canonicalizeJsonString(manifest);
      filesTable['manifest.json'] = manifestJson;

      const rawArchiveJson = canonicalizeJsonString({
        manifest,
        files: filesTable,
      });

      const overallArchiveChecksum = await computeSha256(rawArchiveJson);

      const archive: BackupArchiveV2 = {
        manifest,
        files: filesTable,
        checksum: overallArchiveChecksum,
      };

      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestampTag = createdAt.replace(/[:.]/g, '-').slice(0, 19);
      const filename = `vault-backup-${timestampTag}${isEncrypted ? '.encrypted' : ''}.json`;

      const generation: BackupGenerationV2 = {
        id: generationId,
        createdAt,
        destination: 'download',
        filename,
        sizeBytes: new TextEncoder().encode(rawArchiveJson).length,
        checksum: overallArchiveChecksum,
        encrypted: isEncrypted,
        resourceCount: totalResources,
        attachmentCount: attachments.length,
        verified: false,
        isLastKnownGood: false,
      };

      this.recordNewGeneration(generation);

      return {
        archive,
        rawJson: rawArchiveJson,
        generation,
      };
    } finally {
      this.isBackupInProgress = false;
      this.cancelRequested = false;
    }
  }

  /**
   * Registers new generation and applies non-destructive rotation
   * (never deletes the last known-good backup)
   */
  public recordNewGeneration(generation: BackupGenerationV2): void {
    this.generations.unshift(generation);

    // Keep at most MAX_GENERATIONS_KEPT, but NEVER remove a verified last known good generation
    if (this.generations.length > MAX_GENERATIONS_KEPT) {
      const kept: BackupGenerationV2[] = [];
      let keptCount = 0;

      for (const g of this.generations) {
        if (keptCount < MAX_GENERATIONS_KEPT || g.isLastKnownGood) {
          kept.push(g);
          keptCount++;
        }
      }
      this.generations = kept;
    }

    this.persistGenerations();
  }

  /**
   * Marks a generation as verified and updates Last-Known-Good status
   */
  public markGenerationVerified(generationId: string, level: 'structural' | 'restore_tested'): void {
    let found = false;
    for (const g of this.generations) {
      if (g.id === generationId) {
        g.verified = true;
        g.lastVerificationDate = new Date().toISOString();
        g.verificationLevel = level;
        g.isLastKnownGood = true;
        found = true;
      } else if (g.isLastKnownGood) {
        // Demote previous last known good if newly verified is newer
        g.isLastKnownGood = false;
      }
    }

    if (found) {
      this.persistGenerations();
    }
  }

  /**
   * Triggers manual browser download of backup file
   */
  public downloadBackupFile(filename: string, content: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const backupServiceV2 = new BackupServiceV2();
export type { BackupGenerationV2 };

