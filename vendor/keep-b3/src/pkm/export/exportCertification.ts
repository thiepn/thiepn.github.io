/**
 * PKM V1.8: Export & Interchange Certification Test Suite
 * Automated tests for "Leave the App", deterministic checksums, secret scans, and format conformance.
 */

import { Note, Folder } from '../../types';
import { executeExportPipeline } from './exportPipeline';
import { sanitizeFilename, FilenameCollisionResolver } from './filenameSanitizer';
import { scanNoteForPrivacyFindings, redactSecretsFromMarkdown } from './privacyScanner';
import { ExportScopeConfig } from './exportTypes';

export interface CertificationResult {
  suiteName: string;
  passed: boolean;
  testsRun: number;
  failures: string[];
  durationMs: number;
}

/**
 * Runs the complete V1.8 certification test suite
 */
export async function runExportCertificationSuite(): Promise<CertificationResult> {
  const startTime = performance.now();
  const failures: string[] = [];
  let testsRun = 0;

  // 1. Test: Windows Reserved Names & Path Sanitization
  testsRun++;
  try {
    const res1 = sanitizeFilename('CON.md');
    if (!res1.startsWith('_CON')) {
      failures.push(`Expected CON.md to be sanitized to start with _, got ${res1}`);
    }

    const res2 = sanitizeFilename('aux.txt');
    if (!res2.startsWith('_aux')) {
      failures.push(`Expected aux.txt to be sanitized to start with _, got ${res2}`);
    }

    const res3 = sanitizeFilename('../../../etc/passwd');
    if (res3.includes('..') || res3.includes('/')) {
      failures.push(`Path traversal not stripped: got ${res3}`);
    }

    const resolver = new FilenameCollisionResolver();
    const p1 = resolver.getUniquePath('notes/test.md', 'id1');
    const p2 = resolver.getUniquePath('notes/test.md', 'id2');
    if (p1 === p2) {
      failures.push(`Collision resolver returned identical paths: ${p1}`);
    }
  } catch (err: any) {
    failures.push(`Filename Sanitizer error: ${err?.message || err}`);
  }

  // 2. Test: Privacy & Secret Scanner
  testsRun++;
  try {
    const secretApiKey = 'sk-proj-1234567890abcdef1234567890abcdef';
    const sampleNote: Note = {
      id: 'test-note-1',
      title: 'Confidential Plan',
      content: `# Secret\nAPI Key: ${secretApiKey}\nCredit Card: 4532 1234 5678 9010`,
      type: 'text',
      tags: ['private', 'finance'],
      checklist: [],
      color: 'default',
      trashed: false,
      pinned: false,
      archived: false,
      folderId: null,
      reminderDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [],
    };

    const cfg: ExportScopeConfig = {
      scopeType: 'selected-notes',
      primaryNoteIds: ['test-note-1'],
      includeAttachments: false,
      includeReferences: false,
      excludeTags: ['private'],
      hidePrivateTags: true,
      maskSensitiveData: true,
      linkRewriteMode: 'relative-markdown',
      includeBacklinks: false,
      includeTableOfContents: false,
      includeBibliography: false,
      theme: 'light',
    };

    const findings = scanNoteForPrivacyFindings(sampleNote, cfg);
    if (findings.length < 2) {
      failures.push(`Expected at least 2 findings (API key + Credit card), got ${findings.length}`);
    }

    const redacted = redactSecretsFromMarkdown(sampleNote.content);
    if (redacted.includes(secretApiKey)) {
      failures.push('Secret API key was not redacted from markdown content.');
    }
  } catch (err: any) {
    failures.push(`Privacy Scanner error: ${err?.message || err}`);
  }

  // 3. Test: "Leave the App" Roundtrip Pipeline Test
  testsRun++;
  try {
    const dummyNotes: Note[] = [
      {
        id: 'n1',
        title: 'Alpha Note',
        content: '# Alpha\nThis links to [[Beta Note]] and has a #tag.\n\n| Header A | Header B |\n| --- | --- |\n| Cell 1 | Cell 2 |',
        type: 'text',
        tags: ['research'],
        checklist: [],
        color: 'default',
        trashed: false,
        pinned: false,
        archived: false,
        folderId: null,
        reminderDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: [],
      },
      {
        id: 'n2',
        title: 'Beta Note',
        content: '# Beta\nDestination note content.',
        type: 'text',
        tags: ['research'],
        checklist: [],
        color: 'default',
        trashed: false,
        pinned: false,
        archived: false,
        folderId: null,
        reminderDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: [],
      },
    ];

    const config: ExportScopeConfig = {
      scopeType: 'selected-notes',
      primaryNoteIds: ['n1', 'n2'],
      includeAttachments: false,
      includeReferences: false,
      excludeTags: [],
      hidePrivateTags: false,
      maskSensitiveData: false,
      linkRewriteMode: 'relative-markdown',
      includeBacklinks: true,
      includeTableOfContents: true,
      includeBibliography: false,
      theme: 'light',
    };

    const exportResult = await executeExportPipeline(dummyNotes, [], config, 'portable-markdown');
    if (!exportResult.success) {
      failures.push('Export pipeline execution failed for portable markdown.');
    }
    if (exportResult.files.length < 2) {
      failures.push(`Expected at least 2 markdown files, got ${exportResult.files.length}`);
    }

    // Verify links were rewritten to standard markdown relative links
    const alphaFile = exportResult.files.find((f) => f.path.includes('Alpha'));
    if (!alphaFile || typeof alphaFile.content !== 'string' || !alphaFile.content.includes('[Beta Note](')) {
      failures.push('Wikilink [[Beta Note]] was not rewritten to standard markdown relative link.');
    }
  } catch (err: any) {
    failures.push(`Export Pipeline error: ${err?.message || err}`);
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    suiteName: 'V1.8 Export & Interchange Certification',
    passed: failures.length === 0,
    testsRun,
    failures,
    durationMs,
  };
}
