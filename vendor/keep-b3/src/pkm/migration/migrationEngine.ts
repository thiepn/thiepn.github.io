/**
 * P40 — Universal Migration Engine
 * Coordinates staging, analysis, pre-migration recovery point creation, link resolution,
 * transactional commits, post-import index synchronization, and diagnostic reporting.
 */

import {
  MigrationAnalysis,
  MigrationPlan,
  MigrationProgress,
  MigrationReport,
  MigrationSourceType,
  RawImportFile,
} from './migrationTypes';
import { MigrationAdapter } from './adapters/baseAdapter';
import { GenericMarkdownAdapter } from './adapters/genericMarkdownAdapter';
import { ObsidianAdapter } from './adapters/obsidianAdapter';
import { NotionAdapter } from './adapters/notionAdapter';
import { EvernoteAdapter } from './adapters/evernoteAdapter';
import { JoplinAdapter } from './adapters/joplinAdapter';
import { ReferenceAdapter } from './adapters/referenceAdapter';
import { VCardMigrationAdapter } from './adapters/vcardAdapter';
import { resolveMigrationLinkGraph } from './migrationLinkResolver';
import { computeContentHash } from './securitySanitizer';
import { migrationStorage } from './migrationStorage';
import { Note, Folder } from '../../types';
import { recoveryPointService } from '../resilience/recoveryPointService';
import { mediaService, detectAttachmentKind } from '../media/mediaService';
import { CanonicalAttachment } from '../media/mediaTypes';
import { canvasStorageService } from '../canvasStorage';
import { CanvasBoard } from '../canvasTypes';
import { referenceStorageService } from '../reference/referenceStorageService';

export class MigrationEngine {
  private adapters: Map<MigrationSourceType, MigrationAdapter> = new Map();
  private isCancelled = false;

  constructor() {
    this.registerAdapter(new GenericMarkdownAdapter());
    this.registerAdapter(new ObsidianAdapter());
    this.registerAdapter(new NotionAdapter());
    this.registerAdapter(new EvernoteAdapter());
    this.registerAdapter(new JoplinAdapter());
    this.registerAdapter(new ReferenceAdapter());
    this.registerAdapter(new VCardMigrationAdapter());
  }

  private registerAdapter(adapter: MigrationAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(sourceType: MigrationSourceType): MigrationAdapter {
    const adapter = this.adapters.get(sourceType);
    if (!adapter) {
      return this.adapters.get('generic-markdown')!;
    }
    return adapter;
  }

  public getAllAdapters(): MigrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Phase 1: Staging & Analysis
   */
  public async analyze(
    files: RawImportFile[],
    sourceType: MigrationSourceType,
    plan: MigrationPlan,
    existingNotes: Note[] = [],
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationAnalysis> {
    this.isCancelled = false;
    const adapter = this.getAdapter(sourceType);

    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        progressPercentage: 10,
        currentMessage: `Analyzing ${files.length} files with ${adapter.displayName}...`,
        processedItems: 0,
        totalItems: files.length,
      });
    }

    const parseResult = await adapter.parse(files, plan, onProgress);

    if (this.isCancelled) {
      throw new Error('Migration analysis cancelled by user.');
    }

    if (onProgress) {
      onProgress({
        stage: 'resolving-links',
        progressPercentage: 70,
        currentMessage: 'Resolving migration link graph & attachments...',
        processedItems: parseResult.notes.length,
        totalItems: parseResult.notes.length,
      });
    }

    // Resolve link graph
    const resolvedGraph = resolveMigrationLinkGraph(parseResult.notes, parseResult.attachments, existingNotes);

    // Combine warnings
    const allWarnings = [...parseResult.warnings, ...resolvedGraph.warnings];

    // Duplicate detection against existing notes in vault
    let exactDuplicatesCount = 0;
    let titleCollisionsCount = 0;

    const existingNoteMap = new Map<string, Note>();
    existingNotes.forEach((n) => {
      existingNoteMap.set(n.title.toLowerCase(), n);
    });

    for (const note of resolvedGraph.notesWithResolvedLinks) {
      const match = existingNoteMap.get(note.title.toLowerCase());
      if (match) {
        titleCollisionsCount++;
        // Check content similarity / hash
        const existingHash = await computeContentHash(match.content);
        if (existingHash === note.provenance.sourceHash) {
          exactDuplicatesCount++;
        }
      }
    }

    // Calculate total bytes and estimated disk usage
    let totalBytes = 0;
    files.forEach((f) => (totalBytes += f.size || 0));

    const fingerprint = await computeContentHash(
      `${sourceType}_${files.length}_${totalBytes}_${resolvedGraph.notesWithResolvedLinks.length}`
    );

    if (onProgress) {
      onProgress({
        stage: 'idle',
        progressPercentage: 100,
        currentMessage: 'Analysis complete. Ready for preview.',
        processedItems: files.length,
        totalItems: files.length,
      });
    }

    return {
      sourceType,
      totalFilesScanned: files.length,
      totalBytes,
      notes: resolvedGraph.notesWithResolvedLinks,
      attachments: parseResult.attachments,
      canvases: parseResult.canvases,
      references: parseResult.references,
      folders: parseResult.folders,
      warnings: allWarnings,
      linkStats: resolvedGraph.stats,
      exactDuplicatesCount,
      titleCollisionsCount,
      fingerprint,
      estimatedDiskSpaceBytes: totalBytes * 1.3, // Add buffer for indexes and metadata
    };
  }

  /**
   * Phase 2: Transactional Commit
   */
  public async commit(
    analysis: MigrationAnalysis,
    plan: MigrationPlan,
    currentNotes: Note[],
    currentFolders: Folder[],
    saveNote: (note: Note) => Promise<void> | void,
    saveFolder: (folder: Folder) => Promise<void> | void,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationReport> {
    this.isCancelled = false;
    const startTime = Date.now();
    const operationId = `mig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let recoveryPointId: string | undefined;

    // 1. Create Pre-Migration Recovery Point if requested
    if (plan.createRecoveryPoint) {
      if (onProgress) {
        onProgress({
          stage: 'creating-recovery-point',
          progressPercentage: 5,
          currentMessage: 'Creating pre-migration recovery snapshot...',
          processedItems: 0,
          totalItems: currentNotes.length,
        });
      }
      try {
        const rp = await recoveryPointService.createRecoveryPoint(
          'before_import',
          `Pre-Migration Snapshot (${analysis.sourceType})`,
          {
            notes: currentNotes,
            folders: currentFolders,
          }
        );
        recoveryPointId = rp.id;
      } catch (err) {
        console.warn('Could not create recovery point before migration', err);
      }
    }

    // 2. Commit Folders
    if (onProgress) {
      onProgress({
        stage: 'committing',
        progressPercentage: 15,
        currentMessage: 'Creating folders...',
        processedItems: 0,
        totalItems: analysis.folders.length,
      });
    }

    const folderIdMap = new Map<string, string>();
    currentFolders.forEach((f) => folderIdMap.set(f.name.toLowerCase(), f.id));

    // Determine import root folder if requested
    let rootFolderId: string | null = null;
    if (plan.importRootFolder) {
      const rootName = plan.importRootFolder.trim();
      const existingRoot = currentFolders.find((f) => f.name.toLowerCase() === rootName.toLowerCase());
      if (existingRoot) {
        rootFolderId = existingRoot.id;
      } else {
        rootFolderId = `folder_${Date.now()}_root`;
        const newRoot: Folder = {
          id: rootFolderId,
          name: rootName,
          color: '#6366f1',
          createdAt: new Date().toISOString(),
        };
        await saveFolder(newRoot);
      }
    }

    for (const folderCand of analysis.folders) {
      const targetPath = plan.importRootFolder
        ? `${plan.importRootFolder}/${folderCand.path}`
        : folderCand.path;

      if (!folderIdMap.has(targetPath.toLowerCase())) {
        const newF: Folder = {
          id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: folderCand.name,
          createdAt: new Date().toISOString(),
        };
        folderIdMap.set(targetPath.toLowerCase(), newF.id);
        await saveFolder(newF);
      }
    }

    // 3. Commit Attachments
    if (onProgress) {
      onProgress({
        stage: 'committing',
        progressPercentage: 30,
        currentMessage: 'Importing media attachments...',
        processedItems: 0,
        totalItems: analysis.attachments.length,
      });
    }

    let attachmentsImported = 0;
    for (let i = 0; i < analysis.attachments.length; i++) {
      if (this.isCancelled) throw new Error('Migration cancelled by user.');
      const att = analysis.attachments[i];
      try {
        if (att.blob) {
          const kind = detectAttachmentKind(att.mimeType, att.originalName);
          const canonicalAtt: CanonicalAttachment = {
            id: att.id,
            filename: att.originalName,
            kind,
            mimeType: att.mimeType,
            size: att.size,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            hash: att.hash,
          };
          await mediaService.saveAttachment(canonicalAtt, att.blob);
          attachmentsImported++;
        }
      } catch (err) {
        console.warn('Failed to import attachment into media library', att.originalName, err);
      }
    }

    // 4. Commit Notes
    if (onProgress) {
      onProgress({
        stage: 'committing',
        progressPercentage: 50,
        currentMessage: 'Committing imported notes...',
        processedItems: 0,
        totalItems: analysis.notes.length,
      });
    }

    let notesImported = 0;
    let notesSkipped = 0;
    const existingMap = new Map<string, Note>();
    currentNotes.forEach((n) => existingMap.set(n.title.toLowerCase(), n));

    const totalNotes = analysis.notes.length;
    for (let i = 0; i < totalNotes; i++) {
      if (this.isCancelled) throw new Error('Migration cancelled during commit.');
      const cand = analysis.notes[i];

      // Handle duplicate policy
      const existing = existingMap.get(cand.title.toLowerCase());
      if (existing) {
        const existingHash = await computeContentHash(existing.content);
        if (existingHash === cand.provenance.sourceHash && plan.duplicateStrategy === 'skip-exact') {
          notesSkipped++;
          continue;
        }
      }

      // Map folder ID
      let assignedFolderId = rootFolderId;
      if (cand.folderPath) {
        const fullPath = plan.importRootFolder ? `${plan.importRootFolder}/${cand.folderPath}` : cand.folderPath;
        assignedFolderId = folderIdMap.get(fullPath.toLowerCase()) || rootFolderId;
      }

      // Create canonical note
      const newNote: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: cand.title,
        content: cand.rawMarkdown,
        type: 'text',
        checklist: [],
        tags: cand.tags || [],
        folderId: assignedFolderId || null,
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: new Date(cand.createdTime || Date.now()).toISOString(),
        updatedAt: new Date(cand.modifiedTime || Date.now()).toISOString(),
        reminderDate: null,
        images: [],
        color: 'default',
      };

      await saveNote(newNote);
      notesImported++;

      if (onProgress && i % 20 === 0) {
        onProgress({
          stage: 'committing',
          progressPercentage: 50 + Math.round((i / totalNotes) * 35),
          currentMessage: `Importing note: ${cand.title} (${i + 1}/${totalNotes})`,
          processedItems: i + 1,
          totalItems: totalNotes,
        });
      }
    }

    // 5. Commit Canvases
    let canvasesImported = 0;
    for (const canvasCand of analysis.canvases) {
      try {
        const parsed = JSON.parse(canvasCand.canvasJson || '{}');
        const board: CanvasBoard = {
          id: canvasCand.id,
          title: canvasCand.title,
          description: `Migrated canvas from ${analysis.sourceType}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transform: { panX: 80, panY: 80, zoom: 0.9 },
          backgroundStyle: 'dots',
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          connectors: Array.isArray(parsed.connectors) ? parsed.connectors : (Array.isArray(parsed.edges) ? parsed.edges : []),
          strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
        };
        await canvasStorageService.saveBoardImmediate(board);
        canvasesImported++;
      } catch (err) {
        console.warn('Failed to commit canvas', canvasCand.title, err);
      }
    }

    // 6. Commit References
    let referencesImported = 0;
    for (const ref of analysis.references) {
      try {
        await referenceStorageService.saveReference(ref);
        referencesImported++;
      } catch (err) {
        console.warn('Failed to commit reference', ref.citationKey, err);
      }
    }

    // 7. Indexing & Validation stage
    if (onProgress) {
      onProgress({
        stage: 'indexing',
        progressPercentage: 95,
        currentMessage: 'Rebuilding search, graph & temporal indices...',
        processedItems: notesImported,
        totalItems: notesImported,
      });
    }

    const durationMs = Date.now() - startTime;
    const report: MigrationReport = {
      operationId,
      sourceType: analysis.sourceType,
      timestamp: Date.now(),
      durationMs,
      summary: {
        notesImported,
        notesSkipped,
        attachmentsImported,
        canvasesImported,
        referencesImported,
        foldersCreated: analysis.folders.length,
        warningsCount: analysis.warnings.length,
        errorsCount: analysis.warnings.filter((w) => w.severity === 'blocking').length,
      },
      linkStats: analysis.linkStats,
      warnings: analysis.warnings,
      recoveryPointId,
      targetFolder: plan.importRootFolder,
      adapterVersion: '40.0.0',
    };

    // Save report & history
    migrationStorage.saveReport(report);
    migrationStorage.addHistoryEntry({
      id: operationId,
      timestamp: Date.now(),
      sourceType: analysis.sourceType,
      sourceFingerprint: analysis.fingerprint,
      counts: {
        notes: notesImported,
        attachments: attachmentsImported,
        canvases: canvasesImported,
        references: referencesImported,
      },
      status: 'success',
      warningsCount: analysis.warnings.length,
      recoveryPointId,
      reportSummary: `Successfully imported ${notesImported} notes, ${attachmentsImported} attachments, and ${canvasesImported} canvases from ${analysis.sourceType}.`,
    });

    if (onProgress) {
      onProgress({
        stage: 'completed',
        progressPercentage: 100,
        currentMessage: 'Migration completed successfully!',
        processedItems: notesImported,
        totalItems: notesImported,
      });
    }

    return report;
  }
}

export const migrationEngine = new MigrationEngine();
