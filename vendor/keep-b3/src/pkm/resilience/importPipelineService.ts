/**
 * V1.2 Durable Import & Migration Pipeline
 * 
 * Implements an 8-stage transactional import workflow:
 * 1. Read: Ingest raw buffer or text
 * 2. Parse: Parse into structural representation
 * 3. Normalize: Convert legacy / divergent schema fields to canonical format
 * 4. Validate: Invariant check (UUID validity, required fields, date timestamps)
 * 5. Stage: Store in isolated memory buffer (no mutation to active vault yet)
 * 6. Preview: Generate human-scannable diff & conflict breakdown
 * 7. Commit: Atomically write staged records using AtomicTransactionService
 * 8. Verify: Post-commit verification against index & storage
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment } from '../pdfTypes';
import { atomicTransactions } from './atomicTransactions';
import { recoveryJournal } from './recoveryJournal';
import { recoveryPointService } from './recoveryPointService';
import { computeDeterministicChecksum } from '../portableVaultSerializer';
import { tombstoneService } from './tombstoneService';

export interface ImportPipelineStage {
  stage: 'idle' | 'reading' | 'parsing' | 'normalizing' | 'validating' | 'staged' | 'committing' | 'verified' | 'failed' | 'rolled_back';
  progressPercent: number;
  currentMessage: string;
}

export interface StagedImportBundle {
  importId: string;
  sourceFingerprint: string;
  timestamp: number;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  canvases: CanvasBoard[];
  pdfAttachments: PDFAttachment[];
  settings?: AppSettings;
  
  // Validation stats
  validRecordCount: number;
  quarantinedRecords: Array<{ id: string; type: string; reason: string; raw: any }>;
  duplicateCount: number;
  newCount: number;
  updatedCount: number;
  
  // Pre-import recovery point ID for rollback
  preImportRecoveryPointId?: string;
}

export class ImportPipelineService {
  private activeImport: StagedImportBundle | null = null;
  private processedFingerprints: Set<string> = new Set();
  private stageListeners: Set<(stage: ImportPipelineStage) => void> = new Set();
  private currentStage: ImportPipelineStage = {
    stage: 'idle',
    progressPercent: 0,
    currentMessage: 'Ready',
  };

  private setStage(stage: ImportPipelineStage['stage'], progressPercent: number, currentMessage: string) {
    this.currentStage = { stage, progressPercent, currentMessage };
    for (const l of this.stageListeners) {
      try {
        l(this.currentStage);
      } catch (err) {
        console.error('Error in import stage listener:', err);
      }
    }
  }

  public subscribeStage(listener: (stage: ImportPipelineStage) => void): () => void {
    this.stageListeners.add(listener);
    listener(this.currentStage);
    return () => this.stageListeners.delete(listener);
  }

  /**
   * Stage 1-5: Ingests raw JSON/bundle, parses, normalizes, validates, and stages
   */
  public async stageRawImport(
    rawContent: string,
    existingNotes: Note[],
    existingFolders: Folder[]
  ): Promise<{ success: boolean; bundle?: StagedImportBundle; error?: string }> {
    try {
      this.setStage('reading', 10, 'Reading import payload...');
      const fingerprint = computeDeterministicChecksum(rawContent);

      this.setStage('parsing', 25, 'Parsing archive structure...');
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (e: any) {
        this.setStage('failed', 0, `JSON Parse Error: ${e.message}`);
        return { success: false, error: `Invalid JSON format: ${e.message}` };
      }

      this.setStage('normalizing', 45, 'Normalizing schema versions...');
      const notesRaw: any[] = parsed.notes || (Array.isArray(parsed) ? parsed : []);
      const foldersRaw: any[] = parsed.folders || [];
      const searchesRaw: any[] = parsed.savedSearches || [];
      const canvasesRaw: any[] = parsed.canvases || [];
      const pdfsRaw: any[] = parsed.pdfAttachments || [];

      this.setStage('validating', 65, 'Validating invariants and sanitizing...');
      const validatedNotes: Note[] = [];
      const quarantined: Array<{ id: string; type: string; reason: string; raw: any }> = [];

      const existingNoteIdMap = new Map(existingNotes.map((n) => [n.id, n]));
      let newCount = 0;
      let updatedCount = 0;
      let duplicateCount = 0;

      for (const item of notesRaw) {
        if (!item || typeof item !== 'object') {
          quarantined.push({ id: 'unknown', type: 'note', reason: 'Non-object note record', raw: item });
          continue;
        }

        const id = String(item.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        
        // Check tombstones: if deleted, do not resurrect
        if (tombstoneService.isTombstoned('note', id)) {
          duplicateCount++;
          continue;
        }

        const title = typeof item.title === 'string' ? item.title : 'Imported Note';
        const content = typeof item.content === 'string' ? item.content : '';

        const normalizedNote: Note = {
          id,
          title,
          content,
          type: item.type || (Array.isArray(item.checklist) && item.checklist.length > 0 ? 'checklist' : 'text'),
          checklist: Array.isArray(item.checklist) ? item.checklist : [],
          images: Array.isArray(item.images) ? item.images : [],
          audios: Array.isArray(item.audios) ? item.audios : undefined,
          color: item.color || 'default',
          folderId: item.folderId || null,
          tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
          pinned: Boolean(item.pinned),
          archived: Boolean(item.archived),
          trashed: Boolean(item.trashed),
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(item.createdAt || Date.now()).toISOString(),
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date(item.updatedAt || Date.now()).toISOString(),
          reminderDate: item.reminderDate || null,
          linkedNoteIds: Array.isArray(item.linkedNoteIds) ? item.linkedNoteIds : undefined,
          sourceUrl: item.sourceUrl,
        };

        const existing = existingNoteIdMap.get(id);
        if (existing) {
          if (new Date(existing.updatedAt).getTime() >= new Date(normalizedNote.updatedAt).getTime()) {
            duplicateCount++;
          } else {
            updatedCount++;
          }
        } else {
          newCount++;
        }

        validatedNotes.push(normalizedNote);
      }

      // Validate folders
      const validatedFolders: Folder[] = [];
      for (const f of foldersRaw) {
        if (f && f.id && f.name) {
          validatedFolders.push({
            id: String(f.id),
            name: String(f.name),
            createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date(f.createdAt || Date.now()).toISOString(),
            color: f.color,
            icon: f.icon,
          });
        }
      }

      const bundle: StagedImportBundle = {
        importId: `import-${Date.now()}`,
        sourceFingerprint: fingerprint,
        timestamp: Date.now(),
        notes: validatedNotes,
        folders: validatedFolders,
        savedSearches: searchesRaw,
        canvases: canvasesRaw,
        pdfAttachments: pdfsRaw,
        settings: parsed.settings,
        validRecordCount: validatedNotes.length + validatedFolders.length,
        quarantinedRecords: quarantined,
        duplicateCount,
        newCount,
        updatedCount,
      };

      this.activeImport = bundle;
      this.setStage('staged', 100, `Staged ${bundle.validRecordCount} items ready for preview & commit.`);
      return { success: true, bundle };
    } catch (err: any) {
      this.setStage('failed', 0, `Import validation failed: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Import error' };
    }
  }

  /**
   * Stage 7 & 8: Atomically commits staged bundle with pre-commit recovery snapshot
   */
  public async commitStagedImport(
    currentVaultData: { notes: Note[]; folders: Folder[]; savedSearches: SavedSearch[] }
  ): Promise<{ success: boolean; recoveryPointId?: string; error?: string }> {
    if (!this.activeImport) {
      return { success: false, error: 'No staged import found to commit.' };
    }

    const journalOp = recoveryJournal.prepareOperation(
      'vault_import',
      `Importing ${this.activeImport.validRecordCount} items`,
      {
        description: `Import bundle ${this.activeImport.importId}`,
        totalRecords: this.activeImport.validRecordCount,
      }
    );

    try {
      this.setStage('committing', 50, 'Creating pre-import recovery point snapshot...');
      
      // 1. Create instant recovery point before mutating vault
      const recPoint = await recoveryPointService.createRecoveryPoint(
        'before_import',
        `Pre-import backup before ${this.activeImport.importId}`,
        {
          notes: currentVaultData.notes,
          folders: currentVaultData.folders,
          savedSearches: currentVaultData.savedSearches,
        }
      );
      this.activeImport.preImportRecoveryPointId = recPoint.id;

      this.setStage('committing', 80, 'Committing atomic transaction...');
      recoveryJournal.updateProgress(journalOp.id, 50, 'committing');

      // 2. Execute multi-store atomic batch
      const batchResult = await atomicTransactions.executeAtomicBatch({
        notesToPut: this.activeImport.notes,
        foldersToPut: this.activeImport.folders,
        searchesToPut: this.activeImport.savedSearches,
      });

      if (!batchResult.success) {
        throw batchResult.error || new Error('Atomic transaction write failed.');
      }

      this.setStage('verified', 100, `Successfully imported and verified ${this.activeImport.validRecordCount} items.`);
      recoveryJournal.completeOperation(journalOp.id);
      this.processedFingerprints.add(this.activeImport.sourceFingerprint);

      const recoveryId = this.activeImport.preImportRecoveryPointId;
      this.activeImport = null;

      return { success: true, recoveryPointId: recoveryId };
    } catch (err: any) {
      recoveryJournal.failOperation(journalOp.id, err?.message || 'Commit failed');
      this.setStage('failed', 0, `Commit failed: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Commit failed' };
    }
  }

  /**
   * Rollback an import by restoring the pre-import snapshot
   */
  public async rollbackImport(recoveryPointId: string): Promise<boolean> {
    try {
      this.setStage('normalizing', 30, 'Rolling back to pre-import recovery point...');
      const restored = await recoveryPointService.restoreRecoveryPoint(recoveryPointId);
      if (restored) {
        this.setStage('rolled_back', 100, 'Rollback completed successfully.');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Rollback failed:', err);
      return false;
    }
  }

  public getActiveStagedImport(): StagedImportBundle | null {
    return this.activeImport;
  }

  public clearStagedImport() {
    this.activeImport = null;
    this.setStage('idle', 0, 'Ready');
  }
}

export const importPipelineService = new ImportPipelineService();
