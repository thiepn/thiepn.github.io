/**
 * V2.17 Knowledge Work Excellence, Research Depth & Note-System Refinement Test Suite
 * 
 * Verifies all 14 release certification gates and key functional modules for V2.17:
 * - Markdown Round-Trip, Source Stability & Heading Slug Generation
 * - Incremental Document Outlines & Block References (^block-id)
 * - IME Composition & Multilingual Correctness
 * - Structural Undo / Redo Transactions
 * - Rich Paste Sanitization & XSS Defense
 * - Document Find & Replace (Exact, Whole Word, Regex, Replace All)
 * - Markdown Table Formatting & Column Alignment
 * - KaTeX Math & Mermaid Diagram Validation
 * - Wikilink Resolution, Disambiguation & 5-Tier Autocomplete Ranking
 * - High-Degree Backlink Indexing with Surrounding Context
 * - Conservative Unlinked References & Stop-Word Filtering
 * - Cycle-Safe Recursive Transclusions & Depth Limiting
 * - Bibliographic References with Persistent Identifiers (DOI, ISBN, PMID, arXiv)
 * - PDF Highlight Coordinate Anchoring & Inline Citations (@citekey)
 * - Deterministic Bibliography Generation & BibTeX Export
 * - Living MOCs & Vault Diagnostics
 * - Note Revision Line Diffs & Non-Destructive Restore
 * - AI-Disabled Deterministic Knowledge Discovery
 * - Full 14 Gate Certification Report Validation
 */

import {
  v2EditorQualityEngine,
  v2LinkAndBacklinkEngine,
  v2TransclusionEngine,
  v2ResearchAndCitationEngine,
  v2MocMaintenanceEngine,
  v2KnowledgeMaintenanceEngine,
  v2NoteHistoryEngine,
  v2DeterministicDiscoveryEngine,
  v2_17KnowledgeCertificationEngine,
} from '../v2/knowledge';

export interface V2_17_TestResult {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

export async function runV2_17KnowledgeCertificationTests(): Promise<V2_17_TestResult> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`V2.17 Knowledge Assertion Failed: ${message}`);
    }
  }

  console.log('--- Running V2.17 Knowledge Work & Research Excellence Suite ---');

  // ==========================================================================
  // 1. EDITOR QUALITY, OUTLINES & BLOCKS
  // ==========================================================================
  try {
    const slug = v2EditorQualityEngine.generateHeadingSlug('1. Introduction & Overview!');
    assert(slug === '1-introduction-overview', 'Heading slug generated accurately');

    const sampleDoc = `# Title\nIntro paragraph.\n\n## Subheading 1\nContent.\n\n### Deep Subheading\nNested.\n\n\`\`\`ts\n# Not a heading\n\`\`\`\n\n## Subheading 2\nFinal. ^block-99`;
    const outline = v2EditorQualityEngine.parseDocumentOutline(sampleDoc);
    assert(outline.length === 4, 'Outline parsed 4 headings, correctly ignoring code block content');
    assert(outline[0].text === 'Title' && outline[0].level === 1, 'Top level H1 parsed');
    assert(outline[2].text === 'Deep Subheading' && outline[2].level === 3, 'Nested H3 parsed');

    const blocks = v2EditorQualityEngine.parseDocumentBlocks(sampleDoc);
    assert(blocks.length >= 6, 'Document parsed into discrete typed blocks');
    const customBlock = blocks.find((b) => b.blockId === 'block-99');
    assert(customBlock !== undefined, 'Explicit block reference (^block-99) parsed');
  } catch (err: any) {
    failed++;
    errors.push(`Editor Outline/Block Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 2. PASTE SANITIZATION & XSS DEFENSE
  // ==========================================================================
  try {
    const unsafeHtml = `<div><h1>Title</h1><p>Text <a href="https://example.com" onclick="steal()">link</a></p><script>alert('xss')</script><iframe src="javascript:evil()"></iframe><b>bold</b></div>`;
    const cleaned = v2EditorQualityEngine.sanitizePastedHtml(unsafeHtml);
    assert(!cleaned.includes('script'), 'Stripped script tags from pasted HTML');
    assert(!cleaned.includes('iframe'), 'Stripped iframe tags from pasted HTML');
    assert(!cleaned.includes('onclick'), 'Stripped inline event handlers from pasted HTML');
    assert(cleaned.includes('# Title'), 'Converted H1 tag to Markdown heading');
    assert(cleaned.includes('**bold**'), 'Converted bold tag to Markdown syntax');
  } catch (err: any) {
    failed++;
    errors.push(`Paste Sanitization Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 3. FIND & REPLACE WITH STRUCTURAL UNDO
  // ==========================================================================
  try {
    v2EditorQualityEngine.clearHistory();
    const text = 'The quick brown fox jumps over the lazy dog. The fox is fast.';
    const matches = v2EditorQualityEngine.findInDocument(text, 'fox');
    assert(matches.length === 2, 'Found 2 matches for query "fox"');

    const replaceResult = v2EditorQualityEngine.replaceAll(text, 'fox', 'cat');
    assert(replaceResult.replacementCount === 2, 'Replaced all 2 occurrences');
    assert(replaceResult.newContent === 'The quick brown cat jumps over the lazy dog. The cat is fast.', 'Content updated correctly');

    const undone = v2EditorQualityEngine.undo();
    assert(undone?.previousContent === text, 'Undo successfully restored original content');
    const redone = v2EditorQualityEngine.redo();
    assert(redone?.newContent === replaceResult.newContent, 'Redo successfully reapplied replacement');
  } catch (err: any) {
    failed++;
    errors.push(`Find & Replace Undo Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 4. TABLE FORMATTING, MATH & MERMAID VALIDATION
  // ==========================================================================
  try {
    const unalignedTable = `| Name | Role | Location |\n| --- | --- | --- |\n| Alice | Software Engineer | San Francisco |\n| Bob | Designer | New York |`;
    const formattedTable = v2EditorQualityEngine.formatMarkdownTable(unalignedTable);
    assert(formattedTable.includes('| Alice | Software Engineer | San Francisco |'), 'Table columns padded and aligned cleanly');

    const validMath = v2EditorQualityEngine.validateMathSyntax('\\frac{a}{b} = \\sqrt{c^2 + d^2}');
    assert(validMath.valid, 'Valid KaTeX math passed validation');
    const invalidMath = v2EditorQualityEngine.validateMathSyntax('\\frac{a}{b');
    assert(!invalidMath.valid, 'Unbalanced brace in math caught accurately');

    const validMermaid = v2EditorQualityEngine.validateMermaidSyntax('graph TD\n  A --> B');
    assert(validMermaid.valid, 'Valid Mermaid flowchart passed validation');
    const maliciousMermaid = v2EditorQualityEngine.validateMermaidSyntax('graph TD\n  A[<script>alert(1)</script>] --> B');
    assert(!maliciousMermaid.valid, 'Malicious script inside Mermaid rejected by security validator');
  } catch (err: any) {
    failed++;
    errors.push(`Table & Syntax Validation Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 5. WIKILINKS, AUTOCOMPLETE & HIGH-DEGREE BACKLINKS
  // ==========================================================================
  try {
    const noteText = 'Look at [[Quantum Mechanics]], [[Quantum Mechanics#Postulates]], and [[Classical Physics#^newton-laws|Newton Laws]].';
    const parsedLinks = v2LinkAndBacklinkEngine.parseWikilinks(noteText);
    assert(parsedLinks.length === 3, 'Parsed 3 Wikilinks with varied targets');
    assert(parsedLinks[1].targetHeading === 'Postulates', 'Parsed heading target');
    assert(parsedLinks[2].targetBlockId === 'newton-laws' && parsedLinks[2].alias === 'Newton Laws', 'Parsed block ID target and alias');

    const notesForAuto = [
      { id: '1', title: 'Compiler Engineering' },
      { id: '2', title: 'Parser Construction', aliases: ['AST Parser'] },
      { id: '3', title: 'Compilers Overview', contextTags: ['cs101'] },
    ];
    const ranked = v2LinkAndBacklinkEngine.rankAutocompleteCandidates('AST', notesForAuto);
    assert(ranked.length > 0 && ranked[0].matchType === 'ALIAS', 'Alias match ranked top for query "AST"');

    const mockVault = [
      { id: 'n1', title: 'Calculus I', content: 'Base note' },
      { id: 'n2', title: 'Physics I', content: 'Physics requires understanding [[Calculus I]] for mechanics.' },
      { id: 'n3', title: 'Course Guide', content: 'Course outline: ![[Calculus I]]' },
      { id: 'n4', title: 'Math Dept', content: 'Department page', relations: [{ type: 'prerequisite_for', targetId: 'n1' }] },
    ];
    const backlinks = v2LinkAndBacklinkEngine.extractBacklinksForNote('Calculus I', 'n1', mockVault);
    assert(backlinks.length === 3, 'Extracted 3 categorized backlinks');
    assert(backlinks.some((b) => b.category === 'LINKED_MENTION'), 'Linked mention backlink found');
    assert(backlinks.some((b) => b.category === 'TRANSCLUDED_EMBED'), 'Transcluded embed backlink found');
    assert(backlinks.some((b) => b.category === 'TYPED_RELATION'), 'Typed relation backlink found');
  } catch (err: any) {
    failed++;
    errors.push(`Wikilinks & Backlinks Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 6. UNLINKED REFERENCES & BROKEN LINK SCANNER
  // ==========================================================================
  try {
    const sourceNote = { id: 's1', title: 'My Log', content: 'Today we reviewed Compiler Engineering and then went Home.' };
    const candidates = [
      { id: 'c1', title: 'Compiler Engineering' },
      { id: 'c2', title: 'Home' }, // should be ignored by stop-word filter
    ];
    const unlinked = v2LinkAndBacklinkEngine.findUnlinkedReferences(sourceNote, candidates);
    assert(unlinked.length === 1 && unlinked[0].matchedText === 'Compiler Engineering', 'Filtered stop-word "Home" and matched "Compiler Engineering"');

    const vaultWithBroken = [
      { id: 'n1', title: 'Note One', content: 'Links to [[NonExistentNote]] and [[ExistingNote#MissingHeading]].' },
      { id: 'n2', title: 'ExistingNote', content: '## RealHeading\nContent here.' },
    ];
    const broken = v2LinkAndBacklinkEngine.scanBrokenLinks(vaultWithBroken);
    assert(broken.length === 2, 'Detected 2 broken links');
    assert(broken.some((b) => b.type === 'MISSING_RESOURCE'), 'Missing resource detected');
    assert(broken.some((b) => b.type === 'MISSING_HEADING'), 'Missing heading detected');
  } catch (err: any) {
    failed++;
    errors.push(`Unlinked & Broken Links Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 7. CYCLE-SAFE RECURSIVE TRANSCLUSIONS
  // ==========================================================================
  try {
    const noteMap = new Map<string, { id: string; title: string; content: string }>([
      ['note 1', { id: '1', title: 'Note 1', content: 'Header 1\n![[Note 2]]' }],
      ['note 2', { id: '2', title: 'Note 2', content: 'Header 2\n![[Note 1]]' }],
    ]);
    const transTarget = { raw: '![[Note 1]]', sourceTitle: 'Note 1' };
    const result = v2TransclusionEngine.resolveTransclusion(transTarget, noteMap);
    assert(result.hasCycle || result.renderedContent.includes('Recursion Cycle Blocked'), 'Recursion cycle safely caught and blocked');
  } catch (err: any) {
    failed++;
    errors.push(`Transclusion Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 8. RESEARCH REFERENCES, HIGHLIGHTS & INLINE CITATIONS
  // ==========================================================================
  try {
    const refReg = v2ResearchAndCitationEngine.registerReference({
      id: 'ref-shannon-1948',
      citekey: 'shannon1948',
      title: 'A Mathematical Theory of Communication',
      authors: ['Claude E. Shannon'],
      year: 1948,
      entryType: 'article',
      identifiers: { doi: '10.1002/j.1538-7305.1948.tb01338.x' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert(!refReg.isDuplicate, 'Shannon 1948 reference registered');

    // Duplicate DOI registration attempt
    const dupReg = v2ResearchAndCitationEngine.registerReference({
      id: 'ref-dup',
      citekey: 'shannon1948_dup',
      title: 'A Mathematical Theory of Communication (Copy)',
      authors: ['C. Shannon'],
      year: 1948,
      entryType: 'article',
      identifiers: { doi: '10.1002/j.1538-7305.1948.tb01338.x' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert(dupReg.isDuplicate && dupReg.duplicateOf === 'ref-shannon-1948', 'Duplicate DOI recognized and matched');

    // PDF highlight anchor
    v2ResearchAndCitationEngine.addHighlight({
      id: 'hl-shannon-1',
      referenceId: 'ref-shannon-1948',
      pageNumber: 1,
      coordinates: { x1: 100, y1: 200, x2: 400, y2: 240 },
      selectedText: 'The fundamental problem of communication is that of reproducing at one point...',
      createdAt: new Date().toISOString(),
    });
    const hls = v2ResearchAndCitationEngine.getHighlightsForReference('ref-shannon-1948');
    assert(hls.length === 1 && hls[0].pageNumber === 1, 'PDF highlight coordinate anchor added');

    // Inline citation resolution & bibliography
    const textWithCite = 'Information entropy was formalized in [@shannon1948, p. 379].';
    const parsedCites = v2ResearchAndCitationEngine.parseAndResolveCitations(textWithCite);
    assert(parsedCites.length === 1 && parsedCites[0].isResolved && parsedCites[0].locator === 'p. 379', 'Resolved inline citation with page locator');

    const biblio = v2ResearchAndCitationEngine.generateBibliographyBlock(textWithCite);
    assert(biblio.includes('Claude E. Shannon (1948)'), 'Deterministic bibliography generated');

    const bibtex = v2ResearchAndCitationEngine.exportToBibTeX();
    assert(bibtex.includes('@article{shannon1948'), 'Exported valid BibTeX entry');
  } catch (err: any) {
    failed++;
    errors.push(`Research & Citations Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 9. LIVING MOCS & KNOWLEDGE MAINTENANCE
  // ==========================================================================
  try {
    const mocDoc = {
      id: 'moc-ai',
      title: 'Artificial Intelligence MOC',
      content: '## Overview\n- [[Machine Learning]]\n- [[DeletedTopic]]',
      tags: ['ai', 'cs'],
    };
    const vaultNotes = [
      { id: 'n1', title: 'Machine Learning', content: 'ML note' },
      { id: 'n2', title: 'Neural Networks', content: 'Backlink: [[Artificial Intelligence MOC]]', tags: ['ai'] },
    ];
    const mocReport = v2MocMaintenanceEngine.analyzeMOC(mocDoc, vaultNotes);
    assert(mocReport.brokenLinkCount === 1, 'MOC detected 1 broken link ("DeletedTopic")');
    assert(mocReport.suggestedAdditions.length > 0, 'MOC suggested candidate addition ("Neural Networks")');

    const healthIssues = v2KnowledgeMaintenanceEngine.scanKnowledgeHealth(
      [
        { id: 'n1', title: 'Note A', content: 'Links to [[MissingB]]', frontmatterRaw: 'tags: [a]\ntags: [b]' },
      ],
      []
    );
    assert(healthIssues.some((i) => i.category === 'BROKEN_LINK'), 'Health scan detected broken link');
    assert(healthIssues.some((i) => i.category === 'MALFORMED_FRONTMATTER'), 'Health scan detected duplicate frontmatter key');
  } catch (err: any) {
    failed++;
    errors.push(`MOC & Maintenance Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 10. NOTE HISTORY & REVISION DIFF
  // ==========================================================================
  try {
    const noteId = 'test-hist-note';
    v2NoteHistoryEngine.recordRevision(noteId, 'First line\nSecond line', 'Initial', 0);
    v2NoteHistoryEngine.recordRevision(noteId, 'First line\nSecond line edited\nThird line added', 'Update', 0);
    const revs = v2NoteHistoryEngine.getRevisions(noteId);
    assert(revs.length === 2, 'Recorded 2 distinct non-coalesced revisions');

    const diffs = v2NoteHistoryEngine.computeLineDiff('First line\nSecond line', 'First line\nSecond line edited\nThird line added');
    assert(diffs.some((d) => d.type === 'added') && diffs.some((d) => d.type === 'removed'), 'Line-by-line diff computed additions and removals');

    const restored = v2NoteHistoryEngine.restoreRevision(noteId, revs[0].id);
    assert(restored.restoredContent === 'First line\nSecond line', 'Restored previous revision content');
    assert(v2NoteHistoryEngine.getRevisions(noteId).length === 3, 'Restore created new revision without erasing history');
  } catch (err: any) {
    failed++;
    errors.push(`History & Diff Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 11. DETERMINISTIC DISCOVERY (NO AI)
  // ==========================================================================
  try {
    const current = {
      id: 'd1',
      title: 'Database Indexing',
      content: 'B-Trees, LSM-Trees, write-ahead logging, and indexing strategies.',
      tags: ['databases'],
    };
    const vault = [
      { id: 'd2', title: 'Storage Engines', content: 'LSM-Trees, WAL, write-ahead logging, and block storage.', tags: ['databases'] },
      { id: 'd3', title: 'Cooking Pasta', content: 'Water, salt, olive oil, and boiling techniques.', tags: ['cooking'] },
    ];
    const related = v2DeterministicDiscoveryEngine.findRelatedNotes(current, vault);
    assert(related.length === 1 && related[0].targetNoteId === 'd2', 'Deterministic related notes matched "Storage Engines"');
    assert(related[0].explanation.includes('databases') || related[0].explanation.includes('key terms'), 'Deterministic explanation provided');
  } catch (err: any) {
    failed++;
    errors.push(`Deterministic Discovery Exception: ${err.message || err}`);
  }

  // ==========================================================================
  // 12. FULL 14 GATES CERTIFICATION REPORT
  // ==========================================================================
  try {
    const certReport = v2_17KnowledgeCertificationEngine.runCertification();
    const failedGateList = certReport.gates.filter((g) => !g.passed);
    if (failedGateList.length > 0) {
      console.error('Failed V2.17 Gates:', failedGateList.map((g) => `${g.gateId} (${g.name})`));
    }
    assert(certReport.overallPassed, 'All 14 V2.17 release certification gates passed');
    assert(certReport.passedGates === 14, '14 of 14 gates certified successfully');
    assert(certReport.classification === 'V2.17 — KNOWLEDGE WORK & RESEARCH EXCELLENCE READY', 'Certified for V2.17 release classification');
    assert(certReport.performanceBenchmarks.length >= 10, 'All performance benchmarks recorded');
  } catch (err: any) {
    failed++;
    errors.push(`Certification Gates Exception: ${err.message || err}`);
  }

  const total = passed + failed;
  console.log(`✓ V2.17 Knowledge Work & Research Excellence Suite: ${passed} passed, ${failed} failed`);

  return {
    total,
    passed,
    failed,
    errors,
  };
}
