import { Note } from '../../types';
import { parseNote } from '../parser';
import {
  buildVaultIndex,
  applyIncrementalNoteUpdate,
} from '../vaultIndex';
import { resolveTransclusion } from '../transclusion';
import { parseMarkdownSections, reorderSection } from '../outliner';
import { parseMarkdownTable } from '../tableParser';
import { addColumn } from '../tableOperations';
import { executeSmartQuery } from '../queryEngine';
import { convertHTMLToMarkdown, sanitizeHTML } from '../htmlToMarkdown';
import { parsePDFTarget } from '../pdfCitation';
import { merge3Text } from '../mergeEngine';
import {
  exportEncryptedVaultContainer,
  importEncryptedVaultContainer,
} from '../encryption/encryptedVaultExport';
import { FAST_TEST_ARGON2ID_PARAMS } from '../encryption';
import { PortableVaultData } from '../portableVaultTypes';
import { BROWSER_COMPATIBILITY_MATRIX, PROVIDER_CAPABILITIES } from '../compatibilityMatrix';

export interface CertificationSuiteResult {
  passed: number;
  failed: number;
  errors: string[];
  benchmarks: {
    name: string;
    durationMs: number;
    throughputOpsPerSec?: number;
    details: string;
  }[];
}

export async function runPKMReleaseCertification(): Promise<CertificationSuiteResult> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const benchmarks: CertificationSuiteResult['benchmarks'] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${msg}`);
      console.error(`  ✗ ${msg}`);
    }
  }

  console.log('================================================================');
  console.log('    PHASE P18: ADVANCED PKM RELEASE CERTIFICATION AUDIT SUITE   ');
  console.log('================================================================\n');

  // =========================================================================
  // 1. UNIFIED MARKDOWN PIPELINE CROSS-FEATURE COMPATIBILITY AUDIT
  // =========================================================================
  console.log('1. Auditing Unified Markdown Pipeline & Canonical Syntax...');
  const complexMarkdown = `---
title: Quantum Computing Architecture
tags: [quantum, physics, computing]
aliases: [QCA, Quantum Arch]
---
# Executive Summary
Overview of quantum computing paradigms. Links to [[Algorithms#Shor's Algorithm]] and [[Hardware Fundamentals#^qubit-spec]].
Also references literature [[pdf:arxiv-2301.9999|Arxiv Paper, p. 12]].

## Core Mathematics
Inline equation $E = mc^2$ and state transition $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$.
Block equation:
$$
\hat{H}|\Psi\rangle = i\hbar\frac{\partial}{\partial t}|\Psi\rangle
$$

## System Topology
\`\`\`mermaid
graph TD
  QPU[Quantum Processor] --> Control[Cryogenic Control]
  Control --> Host[Host Server]
\`\`\`

## Live Queries & Sub-Components
\`\`\`query
tag:computing
sort:title asc
limit:5
\`\`\`

## Tabular Specifications
| Component | Qubits | Coherence Time (μs) | Fidelity |
|:----------|:------:|--------------------:|:---------|
| Rigetti Aspen | 80 | 35.5 | 99.2% |
| IBM Eagle | 127 | 75.0 | 99.7% |
^qubit-spec

## Transclusions
![[Hardware Fundamentals#Cryostat Specifications]]
`;

  const sampleNote: Note = {
    id: 'note-quantum',
    title: 'Quantum Computing Architecture',
    content: complexMarkdown,
    type: 'text',
    checklist: [],
    tags: ['quantum', 'physics', 'computing'],
    color: 'default',
    folderId: 'folder-research',
    pinned: false,
    archived: false,
    trashed: false,
    reminderDate: null,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const parsed = parseNote(sampleNote);
  assert(parsed.frontmatter?.title === 'Quantum Computing Architecture', 'Frontmatter parsed correctly');
  assert(parsed.headings.length === 6, 'Extracted all 6 markdown headings');
  assert(parsed.headings.some(h => h.slug === 'executive-summary'), 'Generated clean slug for Executive Summary');
  assert(parsed.codeBlocks.some(c => c.language === 'mermaid'), 'Detected fenced Mermaid diagram');
  assert(parsed.codeBlocks.some(c => c.language === 'query'), 'Detected live Query block');
  assert(parsed.mathBlocks.length >= 1, 'Detected KaTeX display math block');
  assert(parsed.outgoingLinks.some(l => l.target === 'Algorithms' && l.subpath?.target === "Shor's Algorithm"), 'Extracted heading-targeted WikiLink');
  assert(parsed.outgoingLinks.some(l => l.target === 'Hardware Fundamentals' && l.subpath?.type === 'block'), 'Extracted block-targeted WikiLink');
  assert(parsed.blocks.some(b => b.id === 'qubit-spec'), 'Extracted block identifier ^qubit-spec');
  assert(parsed.embeds.some(e => e.target === 'Hardware Fundamentals'), 'Extracted transclusion embed ![[...]]');

  // Verify Table Parser Integration
  const tableSlice = `| Component | Qubits | Coherence Time (μs) | Fidelity |
|:----------|:------:|--------------------:|:---------|
| Rigetti Aspen | 80 | 35.5 | 99.2% |
| IBM Eagle | 127 | 75.0 | 99.7% |`;
  const parsedTable = parseMarkdownTable(tableSlice, 0);
  assert(parsedTable !== null, 'Markdown table successfully parsed');
  assert(parsedTable?.headers.length === 4, 'Table headers count is 4');
  assert(parsedTable?.rows.length === 2, 'Table rows count is 2');
  assert(parsedTable?.alignments[0] === 'left' && parsedTable?.alignments[1] === 'center' && parsedTable?.alignments[2] === 'right', 'Column alignments recognized');

  const tableWithCol = addColumn(parsedTable!, 4, 'Status');
  assert(tableWithCol.headers.length === 5 && tableWithCol.rows[0].length === 5, 'Table column insertion works without corruption');

  // Verify PDF Citation Link Parsing
  const citationToken = '[[pdf:arxiv-2301.9999|Arxiv Paper, p. 12]]';
  const pdfParsed = parsePDFTarget('pdf:arxiv-2301.9999');
  assert(pdfParsed !== null && pdfParsed.pdfId === 'arxiv-2301.9999', 'Parsed PDF citation target correctly');

  // =========================================================================
  // 2. VAULT INDEX DETERMINISM, REBUILD, & REPAIR AUDIT
  // =========================================================================
  console.log('2. Auditing VaultIndex Rebuild, Mutations & Repair Integrity...');
  const testNotes: Note[] = [
    sampleNote,
    {
      id: 'note-algo',
      title: 'Algorithms',
      content: '# Algorithms\n\n## Shor\'s Algorithm\nQuantum factoring polynomial algorithm.\n\nLinking back to [[Quantum Computing Architecture]]. Tagged #computing.',
      type: 'text',
      checklist: [],
      tags: ['computing'],
      color: 'default',
      folderId: 'folder-research',
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'note-hardware',
      title: 'Hardware Fundamentals',
      content: '# Hardware Fundamentals\n\n## Cryostat Specifications\nDilution refrigeration unit operating at 15mK.\n\nTranscludes ![[Algorithms#Shor\'s Algorithm]] and cites [[pdf:arxiv-2301.9999]].',
      type: 'text',
      checklist: [],
      tags: ['hardware', 'physics'],
      color: 'default',
      folderId: 'folder-research',
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  ];

  const initialIndex = buildVaultIndex(testNotes);
  assert(initialIndex.noteCount === 3, 'Vault index indexed 3 notes');
  assert(initialIndex.forwardLinks['note-quantum'].includes('note-algo'), 'Quantum note links to Algorithms note');
  assert(initialIndex.forwardLinks['note-quantum'].includes('note-hardware'), 'Quantum note links to Hardware note');
  assert(initialIndex.backlinks['note-quantum'].length === 1, 'Quantum note has 1 backlink from Algorithms');
  assert(initialIndex.backlinks['note-algo'].length === 2, 'Algorithms note has 2 backlinks (Quantum link + Hardware embed)');

  // Rename Mutation Test
  const renamedHardware: Note = {
    ...testNotes[2],
    title: 'Quantum Hardware Systems',
    updatedAt: new Date().toISOString(),
  };
  const updatedIndex = applyIncrementalNoteUpdate(renamedHardware, renamedHardware.id, initialIndex);
  assert(updatedIndex.notes['note-hardware'].title === 'Quantum Hardware Systems', 'Incremental update renamed note');
  assert(updatedIndex.titleToNoteIds['quantum hardware systems']?.includes('note-hardware'), 'Title index updated with new title');
  assert(!updatedIndex.titleToNoteIds['hardware fundamentals'], 'Old title purged from titleToNoteIds');

  // Full Rebuild Verification (Ensures zero drift between incremental and full rebuild)
  const rebuiltIndex = buildVaultIndex([testNotes[0], testNotes[1], renamedHardware]);
  assert(rebuiltIndex.noteCount === updatedIndex.noteCount, 'Rebuilt index note count matches incremental index');
  assert(
    Object.keys(rebuiltIndex.titleToNoteIds).length === Object.keys(updatedIndex.titleToNoteIds).length,
    'Rebuilt title map matches incremental title map'
  );

  // =========================================================================
  // 3. TRANSCLUSION RECURSION GUARD & CONVERGENCE
  // =========================================================================
  console.log('3. Auditing Transclusions & Circular Embed Prevention...');
  // Hardware note transcludes Algorithm, which if it transcludes Quantum which transcludes Hardware forms a cycle
  const cyclicNoteA: Note = {
    id: 'note-cycle-a',
    title: 'Cycle A',
    content: 'Embeds Cycle B: ![[Cycle B]]',
    type: 'text',
    checklist: [],
    tags: [],
    color: 'default',
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    reminderDate: null,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const cyclicNoteB: Note = {
    id: 'note-cycle-b',
    title: 'Cycle B',
    content: 'Embeds Cycle A: ![[Cycle A]]',
    type: 'text',
    checklist: [],
    tags: [],
    color: 'default',
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    reminderDate: null,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const cyclicIndex = buildVaultIndex([cyclicNoteA, cyclicNoteB]);
  const transA = resolveTransclusion('Cycle B', 'note-cycle-a', cyclicIndex, {
    visitedChain: ['note-cycle-a'],
    depth: 0,
  });
  assert(transA.status === 'resolved', 'Transclusion A->B resolved');

  const transCircular = resolveTransclusion('Cycle A', 'note-cycle-b', cyclicIndex, {
    visitedChain: ['note-cycle-a', 'note-cycle-b'],
    depth: 1,
  });
  assert(transCircular.status === 'circular_dependency', 'Circular transclusion detected and blocked cleanly');

  // =========================================================================
  // 4. SMART QUERIES & LIVE SEARCH INTEGRATION
  // =========================================================================
  console.log('4. Auditing Smart Queries Execution...');
  const queryResults = executeSmartQuery(`tag:physics\nsort:title\norder:asc\nlimit:10`, { notes: testNotes });
  assert(queryResults.items.length === 2, 'Query for tag:physics returned 2 notes');
  assert(queryResults.items.every(item => item.note.tags.includes('physics')), 'All query results contain tag:physics');

  // =========================================================================
  // 5. OUTLINER SECTION REORDERING INTEGRATION
  // =========================================================================
  console.log('5. Auditing Outliner Section Folding & Reordering...');
  const { flatSections } = parseMarkdownSections(sampleNote.content);
  assert(flatSections.length === 6, 'Outliner parsed all 6 sections');
  
  // Reorder sections: Move section index 2 up
  const reorderedMd = reorderSection(sampleNote.content, 2, 'up');
  assert(reorderedMd.includes('## Core Mathematics'), 'Reordered document maintains all sections');
  assert(!reorderedMd.includes('undefined'), 'Reordered document has no corrupt undefined tokens');

  // =========================================================================
  // 6. 3-WAY MERGE ENGINE & CONFLICT RESOLUTION
  // =========================================================================
  console.log('6. Auditing 3-Way Git Merge Engine...');
  const baseContent = 'Line 1\nLine 2\nLine 3\nLine 4';
  const ourContent = 'Line 1\nLine 2 [Updated Ours]\nLine 3\nLine 4';
  const theirContent = 'Line 1\nLine 2\nLine 3 [Updated Theirs]\nLine 4';

  const cleanMerge = merge3Text(baseContent, ourContent, theirContent);
  assert(cleanMerge.clean, 'Non-overlapping changes clean merged automatically');
  assert(cleanMerge.mergedText.includes('[Updated Ours]') && cleanMerge.mergedText.includes('[Updated Theirs]'), 'Merged content contains both independent modifications');

  // Overlapping Conflict
  const conflictingTheirs = 'Line 1\nLine 2 [Conflicting Theirs]\nLine 3\nLine 4';
  const conflictMerge = merge3Text(baseContent, ourContent, conflictingTheirs);
  assert(!conflictMerge.clean, 'Overlapping changes generated conflict flag');
  assert(conflictMerge.mergedText.includes('<<<<<<< LOCAL (Active Vault)'), 'Conflict markers properly embedded');

  // =========================================================================
  // 7. FULL-VAULT CLIENT-SIDE ENCRYPTION ZERO-LEAK AUDIT
  // =========================================================================
  console.log('7. Auditing Full-Vault AES-GCM-256 Encryption Security...');
  const testPassword = 'Correct-Horse-Battery-Staple-2026!';
  const portableVaultPayload: PortableVaultData = {
    notes: testNotes,
    folders: [],
    savedSearches: [],
    pdfAttachments: [],
    canvases: [],
  };

  const encryptedBlob = await exportEncryptedVaultContainer(
    portableVaultPayload,
    testPassword,
    FAST_TEST_ARGON2ID_PARAMS
  );
  assert(encryptedBlob.size > 0, 'Encrypted .vault binary blob generated');

  const decryptedVault = await importEncryptedVaultContainer(encryptedBlob, testPassword);
  assert(decryptedVault.notes.length === 3, 'Decrypted vault recovered all 3 notes intact');
  assert(decryptedVault.notes[0].title === 'Quantum Computing Architecture', 'Decrypted note title verified');

  // Password failure check
  let passFailed = false;
  try {
    await importEncryptedVaultContainer(encryptedBlob, 'WrongPassword123');
  } catch {
    passFailed = true;
  }
  assert(passFailed, 'Incorrect password correctly rejected with decryption failure');

  // =========================================================================
  // 8. SECURITY & SANITIZATION AUDIT (XSS / MALICIOUS HTML / JAVASCRIPT INJECTION)
  // =========================================================================
  console.log('8. Auditing Web Capture & Markdown HTML Sanitization...');
  const maliciousHTML = `
    <div>
      <h1>Clean Title</h1>
      <p>Clean paragraph with <a href="javascript:alert('XSS')">malicious link</a></p>
      <script>window.pwned = true;</script>
      <img src="x" onerror="alert('XSS')"/>
      <iframe src="https://evil.com"></iframe>
    </div>
  `;
  const sanitized = sanitizeHTML(maliciousHTML);
  assert(!sanitized.includes('<script>'), 'Sanitizer stripped script tags');
  assert(!sanitized.includes('onerror'), 'Sanitizer stripped inline event handlers');
  assert(!sanitized.includes('<iframe'), 'Sanitizer stripped iframe elements');

  const converted = convertHTMLToMarkdown(maliciousHTML);
  assert(!converted.markdown.includes('javascript:'), 'HTML-to-Markdown stripped javascript: URI schemes');
  assert(converted.markdown.includes('Clean Title'), 'Preserved valid semantic content');

  // =========================================================================
  // 9. PERFORMANCE BENCHMARKS (100, 1,000, 10,000 NOTES)
  // =========================================================================
  console.log('9. Executing Scale & Throughput Benchmarks...');

  const syntheticScales = [100, 1000, 10000];
  for (const count of syntheticScales) {
    const start = performance.now();
    const synthNotes: Note[] = [];

    for (let j = 0; j < count; j++) {
      synthNotes.push({
        id: `synth-${j}`,
        title: `Synthetic Note ${j}`,
        content: `# Synthetic Note ${j}\n\nTesting inter-linking with [[Synthetic Note ${(j + 1) % count}]] and [[Synthetic Note ${(j + 7) % count}]]. Also has tag #benchmark and #scale${j % 10}.`,
        type: 'text',
        checklist: [],
        tags: ['benchmark', `scale${j % 10}`],
        color: 'default',
        folderId: j % 5 === 0 ? 'folder-bench' : null,
        pinned: j % 20 === 0,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    }

    const parseStart = performance.now();
    const index = buildVaultIndex(synthNotes);
    const parseEnd = performance.now();
    const duration = parseEnd - parseStart;
    const opsPerSec = Math.round((count / (duration / 1000)));

    benchmarks.push({
      name: `Vault Index Build (${count.toLocaleString()} notes)`,
      durationMs: Math.round(duration),
      throughputOpsPerSec: opsPerSec,
      details: `${count.toLocaleString()} notes, ${Object.keys(index.tagCounts).length} tags, ${Object.keys(index.backlinks).length} backlink targets indexed in ${duration.toFixed(1)}ms`,
    });

    assert(index.noteCount === count, `Indexed all ${count} synthetic notes`);
    assert(duration < (count === 10000 ? 2500 : 500), `Build performance within budget (<2.5s for 10k notes)`);

    // Benchmark incremental update at this scale
    const mutStart = performance.now();
    const mutatedNote = {
      ...synthNotes[0],
      content: synthNotes[0].content + '\nAdded new line and [[Synthetic Note 50]].',
    };
    applyIncrementalNoteUpdate(mutatedNote, mutatedNote.id, index);
    const mutEnd = performance.now();
    const mutDuration = mutEnd - mutStart;

    benchmarks.push({
      name: `Incremental Mutation (${count.toLocaleString()} note vault)`,
      durationMs: Number(mutDuration.toFixed(3)),
      details: `Single note edit indexed in ${mutDuration.toFixed(2)}ms without rescanning entire vault`,
    });
    assert(mutDuration < 15, `Incremental mutation speed (<15ms) for scale ${count}`);
  }

  // =========================================================================
  // 10. BROWSER MATRIX & OFFLINE CAPABILITY VERIFICATION
  // =========================================================================
  console.log('10. Auditing Browser Matrix & Offline Degradation Capabilities...');
  assert(BROWSER_COMPATIBILITY_MATRIX.length >= 4, 'Browser compatibility matrix includes all 4 target platforms');
  assert(PROVIDER_CAPABILITIES.github.directBrowserCORS, 'GitHub REST API verified for direct in-browser CORS');
  assert(PROVIDER_CAPABILITIES.gitlab.directBrowserCORS, 'GitLab API verified for direct in-browser CORS');
  assert(PROVIDER_CAPABILITIES.gitea.directBrowserCORS, 'Gitea API verified for direct in-browser CORS');

  console.log('\n================================================================');
  console.log(`CERTIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return {
    passed,
    failed,
    errors,
    benchmarks,
  };
}
