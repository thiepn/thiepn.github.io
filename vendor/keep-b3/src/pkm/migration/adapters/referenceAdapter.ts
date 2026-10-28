/**
 * P40 — Academic References & BibTeX Migration Adapter
 * High fidelity importer for .bib BibTeX bibliographies, Zotero exports, and matched PDF attachments.
 */

import { AdapterParseResult, getBaseFileName, isAttachmentFile, MigrationAdapter } from './baseAdapter';
import { AttachmentCandidate, MigrationPlan, MigrationProgress, MigrationWarning, RawImportFile } from '../migrationTypes';
import { parseBibTeX } from '../../reference/bibtexParser';
import { Reference } from '../../reference/referenceTypes';
import { computeContentHash, sanitizeRelativePath } from '../securitySanitizer';

export class ReferenceAdapter implements MigrationAdapter {
  id = 'bibtex-reference' as const;
  displayName = 'BibTeX & Academic References';
  description = 'Imports .bib bibliography files, preserves citation keys, DOIs, abstracts, and pairs with selected PDFs.';

  async parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult> {
    const references: Reference[] = [];
    const attachments: AttachmentCandidate[] = [];
    const warnings: MigrationWarning[] = [];

    const bibFiles = files.filter((f) => f.name.toLowerCase().endsWith('.bib'));
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    // Process PDF files
    for (const pdfFile of pdfFiles) {
      try {
        const { safePath } = sanitizeRelativePath(pdfFile.path);
        const blob = await pdfFile.readAsBlob();
        const buffer = await pdfFile.readAsArrayBuffer();
        const hash = await computeContentHash(buffer);

        attachments.push({
          id: `ref_pdf_${hash.substring(0, 16)}`,
          sourcePath: safePath,
          originalName: pdfFile.name,
          mimeType: 'application/pdf',
          size: pdfFile.size,
          blob,
          hash,
          referencedByNotePaths: [],
        });
      } catch (err: any) {
        warnings.push({
          id: `warn_pdf_${pdfFile.name}`,
          severity: 'warning',
          category: 'missing-attachment',
          message: `Failed to read PDF attachment: ${pdfFile.name}`,
          sourcePath: pdfFile.path,
        });
      }
    }

    // Process .bib files
    for (const bibFile of bibFiles) {
      try {
        const bibText = await bibFile.readAsText();
        const { references: parsedRefs, errors } = parseBibTeX(bibText);

        errors.forEach((err, idx) => {
          warnings.push({
            id: `warn_bib_${bibFile.name}_${idx}`,
            severity: 'warning',
            category: 'malformed-metadata',
            message: `BibTeX warning in ${bibFile.name}: ${err.error || 'Parsing issue'}`,
            sourcePath: bibFile.path,
          });
        });

        // Match PDFs with references using DOI, CiteKey, or Title
        for (const ref of parsedRefs) {
          const matchedPdf = attachments.find((att) => {
            const nameLower = att.originalName.toLowerCase();
            const keyLower = ref.citationKey.toLowerCase();
            const titleLower = (ref.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            if (nameLower.includes(keyLower)) return true;
            if (ref.doi && nameLower.includes(ref.doi.toLowerCase().replace(/[^a-z0-9]/g, ''))) return true;
            if (titleLower.length > 8 && nameLower.replace(/[^a-z0-9]/g, '').includes(titleLower.substring(0, 20))) return true;
            return false;
          });

          if (matchedPdf) {
            ref.pdfAttachmentIds = [matchedPdf.id];
          }

          references.push(ref);
        }
      } catch (err: any) {
        warnings.push({
          id: `warn_bib_fatal_${bibFile.name}`,
          severity: 'blocking',
          category: 'malformed-metadata',
          message: `Failed to parse BibTeX file ${bibFile.name}: ${err?.message || 'Error'}`,
          sourcePath: bibFile.path,
        });
      }
    }

    return {
      notes: [],
      attachments,
      canvases: [],
      references,
      folders: [],
      warnings,
    };
  }
}
