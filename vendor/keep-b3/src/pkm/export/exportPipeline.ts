/**
 * PKM V1.8: Master Export Pipeline Engine
 * Pipeline: Selection -> Scope -> Privacy -> Dependency -> Transform -> Validate -> Package -> Report
 */

import JSZip from 'jszip';
import { Note, Folder, AppSettings, SavedSearch } from '../../types';
import {
  ExportScopeConfig,
  ExportFormat,
  ExportPipelineResult,
  ExportValidationReport,
  ExportFileEntry,
  ExportProgressCallback,
  PrivacyFinding,
} from './exportTypes';
import { resolveExportScope } from './linkDependencyResolver';
import { scanNoteForPrivacyFindings } from './privacyScanner';
import { transformNoteToMarkdown } from './portableMarkdownTransformer';
import { generateStandaloneHtml } from './standaloneHtmlTransformer';
import {
  exportAcademicReferences,
  exportPeopleContacts,
  exportCalendarEvents,
  exportFinanceData,
  exportConfigurationPackage,
} from './domainInterchangeExporters';
import { referenceStorageService } from '../reference/referenceStorageService';
import { peopleService } from '../people/peopleService';
import { temporalIndex } from '../temporal/temporalIndex';
import { financeService } from '../finance/financeService';
import { computeDeterministicChecksum, serializePortableVault } from '../portableVaultSerializer';
import { sanitizeFilename } from './filenameSanitizer';

export async function executeExportPipeline(
  allNotes: Note[],
  folders: Folder[],
  config: ExportScopeConfig,
  format: ExportFormat,
  options: {
    settings?: AppSettings;
    savedSearches?: SavedSearch[];
    onProgress?: ExportProgressCallback;
    abortSignal?: AbortSignal;
  } = {}
): Promise<ExportPipelineResult> {
  const startTime = performance.now();
  const { onProgress, abortSignal, settings, savedSearches } = options;

  const notify = (stage: any, percentage: number, message: string, currentItem?: string) => {
    if (onProgress) {
      onProgress({ stage, percentage, message, currentItem });
    }
  };

  const checkCancelled = () => {
    if (abortSignal?.aborted) {
      throw new Error('Export operation was cancelled by the user.');
    }
  };

  // 1. Stage: Select & Scope Resolution
  notify('scope', 10, 'Resolving target scope and dependencies...');
  checkCancelled();

  const resolvedScope = resolveExportScope(allNotes, folders, config);
  const allNotesMap = new Map<string, Note>(allNotes.map((n) => [n.id, n]));
  const folderMap = new Map<string, string>(folders.map((f) => [f.id, f.name]));

  // 2. Stage: Privacy Validation & Secret Scan
  notify('privacy', 25, 'Scanning notes for credentials, private tags, and secrets...');
  checkCancelled();

  const privacyFindings: PrivacyFinding[] = [];
  for (const note of resolvedScope.primaryNotes) {
    const findings = scanNoteForPrivacyFindings(note, config, allNotesMap);
    privacyFindings.push(...findings);
  }

  // 3. Stage: Dependency & Asset Preparation
  notify('dependency', 40, 'Mapping assets and external references...');
  checkCancelled();

  const files: ExportFileEntry[] = [];
  let primaryFileName = 'export';
  let primaryFileContent: string | undefined;

  // 4. Stage: Transformation
  notify('transform', 55, `Transforming content to ${format}...`);
  checkCancelled();

  if (format === 'portable-markdown' || format === 'native-markdown') {
    // Transform notes to Markdown
    for (let i = 0; i < resolvedScope.primaryNotes.length; i++) {
      const note = resolvedScope.primaryNotes[i];
      const { markdown, relativeFilePath } = transformNoteToMarkdown(
        note,
        config,
        format,
        {
          folderMap,
          slugMap: resolvedScope.slugMap,
          allNotesMap,
          currentNoteSlug: resolvedScope.slugMap.get(note.id),
        }
      );

      files.push({
        path: relativeFilePath,
        content: markdown,
        isBinary: false,
        sizeBytes: new TextEncoder().encode(markdown).length,
        mimeType: 'text/markdown',
      });

      if (i === 0) {
        primaryFileName = relativeFilePath.split('/').pop() || 'note.md';
        primaryFileContent = markdown;
      }
    }

    // Include attachments if requested
    if (config.includeAttachments) {
      for (const dep of resolvedScope.dependencies) {
        if (dep.type === 'image') {
          // Find matching note image
          for (const note of resolvedScope.primaryNotes) {
            const img = (note.images || []).find((im) => im.id === dep.id);
            if (img && img.dataUrl && img.dataUrl.startsWith('data:')) {
              const base64 = img.dataUrl.split(',')[1] || '';
              const binStr = atob(base64);
              const bytes = new Uint8Array(binStr.length);
              for (let b = 0; b < binStr.length; b++) {
                bytes[b] = binStr.charCodeAt(b);
              }
              files.push({
                path: dep.targetPath,
                content: bytes,
                isBinary: true,
                sizeBytes: bytes.length,
                mimeType: 'image/png',
              });
              break;
            }
          }
        }
      }
    }
  } else if (format === 'standalone-html') {
    // Generate Standalone HTML for primary note
    const targetNote = resolvedScope.primaryNotes[0] || allNotes[0];
    if (targetNote) {
      const html = generateStandaloneHtml(targetNote, config, resolvedScope.primaryNotes);
      const cleanTitle = sanitizeFilename(targetNote.title || 'Note');
      const fileName = `${cleanTitle}.html`;

      files.push({
        path: fileName,
        content: html,
        isBinary: false,
        sizeBytes: new TextEncoder().encode(html).length,
        mimeType: 'text/html',
      });

      primaryFileName = fileName;
      primaryFileContent = html;
    }
  } else if (format === 'bibtex') {
    const refs = referenceStorageService.getAllReferences();
    const bibFiles = exportAcademicReferences(refs, 'bibliography');
    files.push(...bibFiles);
    if (files.length > 0) {
      primaryFileName = files[0].path;
      primaryFileContent = typeof files[0].content === 'string' ? files[0].content : undefined;
    }
  } else if (format === 'vcard') {
    const contacts = peopleService.getPeople();
    const vcfFiles = exportPeopleContacts(contacts, 'contacts');
    files.push(...vcfFiles);
    if (files.length > 0) {
      primaryFileName = files[0].path;
      primaryFileContent = typeof files[0].content === 'string' ? files[0].content : undefined;
    }
  } else if (format === 'ics') {
    const events = temporalIndex.getAllEntries();
    const icsFiles = exportCalendarEvents(events, 'personal_calendar');
    files.push(...icsFiles);
    if (files.length > 0) {
      primaryFileName = files[0].path;
      primaryFileContent = typeof files[0].content === 'string' ? files[0].content : undefined;
    }
  } else if (format === 'data-csv') {
    const txs = financeService.getTransactions();
    const accs = financeService.getAccounts();
    const finFiles = exportFinanceData(txs, accs, 'finance_ledger');
    files.push(...finFiles);
    if (files.length > 0) {
      primaryFileName = files[0].path;
      primaryFileContent = typeof files[0].content === 'string' ? files[0].content : undefined;
    }
  } else if (format === 'config-package') {
    const cfgFiles = exportConfigurationPackage(
      {
        savedViews: savedSearches || [],
        themePresets: { theme: settings?.theme },
      },
      'personal_os_settings'
    );
    files.push(...cfgFiles);
    if (files.length > 0) {
      primaryFileName = files[0].path;
      primaryFileContent = typeof files[0].content === 'string' ? files[0].content : undefined;
    }
  } else if (format === 'full-portable-vault') {
    const serialized = await serializePortableVault({
      notes: allNotes,
      folders,
      savedSearches: savedSearches || [],
      settings,
    });
    for (const f of serialized.files) {
      files.push({
        path: f.path,
        content: f.content,
        isBinary: f.isBinary,
      });
    }
    primaryFileName = 'personal_vault_backup.zip';
  }

  // 5. Stage: Validation & Integrity Checksum
  notify('validate', 75, 'Validating export integrity and checksums...');
  checkCancelled();

  let combinedContent = '';
  for (const f of files) {
    if (typeof f.content === 'string') {
      combinedContent += f.content;
    }
  }
  const manifestChecksum = computeDeterministicChecksum(combinedContent || String(files.length));

  const validationReport: ExportValidationReport = {
    isValid: files.length > 0,
    errors: files.length === 0 ? ['No files were generated for the specified scope.'] : [],
    warnings: privacyFindings.filter((f) => f.severity === 'warning').map((f) => f.description),
    privacyFindings,
    totalNotes: resolvedScope.primaryNotes.length,
    totalAssets: resolvedScope.dependencies.length,
    totalDependencies: resolvedScope.dependencies.length + resolvedScope.externalReferences.length,
    missingDependencies: resolvedScope.missingAssetNames,
    brokenInternalLinks: [],
    excludedPrivateRelations: privacyFindings
      .filter((f) => f.type === 'unselected-relation')
      .map((f) => f.description),
    generatedAt: new Date().toISOString(),
    checksum: manifestChecksum,
  };

  // 6. Stage: Packaging (JSZip)
  notify('package', 90, 'Packaging archive bundle...');
  checkCancelled();

  let zipBlob: Blob | undefined;
  if (files.length > 1 || format === 'portable-markdown' || format === 'full-portable-vault') {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    // Add validation report to package
    zip.file('export_report.json', JSON.stringify(validationReport, null, 2));
    zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  notify('report', 100, 'Export completed successfully.');

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    success: validationReport.isValid,
    format,
    files,
    validation: validationReport,
    zipBlob,
    primaryFileName,
    primaryFileContent,
    executionTimeMs,
  };
}
