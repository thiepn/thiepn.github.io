/**
 * V1.7 — Search, Navigation & Knowledge Work Mastery Certification Test Suite
 */

import { Note, Folder } from '../../types';
import {
  QuickSwitcherService,
  quickSwitcherService,
} from '../navigation/quickSwitcherService';
import {
  HeadingBlockNavigator,
  headingBlockNavigator,
} from '../navigation/headingBlockNavigator';
import {
  BacklinkNavigationService,
  backlinkNavigationService,
} from '../navigation/backlinkNavigationService';
import {
  LinkPreviewManager,
  linkPreviewManager,
} from '../navigation/linkPreviewManager';
import {
  BreadcrumbService,
  breadcrumbService,
} from '../navigation/breadcrumbService';
import {
  ResearchNavigationService,
  researchNavigationService,
} from '../navigation/researchNavigationService';
import {
  NavigationHistoryManager,
  navigationHistoryManager,
} from '../navigation/navigationHistoryManager';
import {
  NavigationDoctor,
  navigationDoctor,
} from '../navigation/navigationDoctor';
import { vaultManager } from '../indexer';

export function runV17KnowledgeNavigationCertificationTests(): {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
} {
  let total = 0;
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, desc: string) => {
    total++;
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${desc}`);
    }
  };

  try {
    navigationHistoryManager.clear();
    quickSwitcherService.clearRecents();
    linkPreviewManager.clearCache();

    const mockFolders: Folder[] = [
      { id: 'f-math', name: 'Mathematics', parentId: null, color: '#3b82f6', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'f-analysis', name: 'Analysis', parentId: 'f-math', color: '#6366f1', createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    const mockNotes: Note[] = [
      {
        id: 'note-compactness',
        title: 'Compactness in Metric Spaces',
        content: `# Compactness in Metric Spaces
Compact spaces have sequential compactness properties.
## Definition
A space X is compact if every open cover has a finite subcover.
## Heine-Borel Theorem
Every closed and bounded subset of R^n is compact. ^heine-borel-block
Refer to [[Real Analysis Fundamentals#Introduction]].`,
        folderId: 'f-analysis',
        tags: ['topology', 'analysis', 'alias:Heine-Borel'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        pinned: true,
        type: 'text',
        checklist: [],
        color: 'default',
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
      },
      {
        id: 'note-analysis',
        title: 'Real Analysis Fundamentals',
        content: `# Real Analysis Fundamentals
## Introduction
This note serves as the foundation for modern topology.
See [[Compactness in Metric Spaces#Definition]] for topological details.
Also see unlinked mention of Compactness in Metric Spaces in our research.
Citation: [@rudin1976, p. 37]
Broken reference: [[Missing Theoretical Framework]].`,
        folderId: 'f-analysis',
        tags: ['analysis'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        pinned: false,
        type: 'text',
        checklist: [],
        color: 'default',
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
      },
      {
        id: 'note-intro',
        title: 'The', // Common stop word title to test unlinked mention guard
        content: 'Testing stop word titles.',
        folderId: null,
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        pinned: false,
        type: 'text',
        checklist: [],
        color: 'default',
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
      },
    ];

    // Seed vault manager
    vaultManager.rebuildIndex(mockNotes);

    // ========================================================================
    // 1. QUICK SWITCHER & INSTANT ROUTING
    // ========================================================================
    quickSwitcherService.saveRecent('note-analysis', 'note');
    const index = quickSwitcherService.buildIndex({ notes: mockNotes, folders: mockFolders });
    const exactSearch = quickSwitcherService.search(index, 'Compactness in Metric Spaces');
    assert(exactSearch.length > 0 && exactSearch[0].id === 'note-compactness', 'Exact title search works deterministically');
    assert(exactSearch[0].matchType === 'exact-title' && (exactSearch[0].score || 0) > 1500, 'Exact title outranks recency');

    const aliasSearch = quickSwitcherService.search(index, 'Heine-Borel');
    assert(aliasSearch.length > 0 && aliasSearch[0].id === 'note-compactness', 'Alias search works deterministically');

    const activeContext = {
      id: 'f-analysis',
      title: 'Analysis Context',
      description: 'Focus on analysis notes',
      scopeType: 'folder' as const,
      type: 'custom' as const,
      explicit: true,
    };
    const contextIndex = quickSwitcherService.buildIndex({
      notes: mockNotes,
      folders: mockFolders,
      activeContext: activeContext as any,
    });
    const contextResults = quickSwitcherService.search(contextIndex, 'analysis');
    assert(contextResults.length > 0, 'Context results returned');
    const contextualItem = contextResults.find((r) => r.id === 'note-compactness');
    assert(contextualItem?.contextTag === 'Analysis Context', 'Context tag boosts item');

    // 50k benchmark
    const largeSyntheticNotes: Note[] = [];
    for (let i = 0; i < 50000; i++) {
      largeSyntheticNotes.push({
        id: `synth-${i}`,
        title: `Synthetic Reference Document ${i}`,
        content: 'Synthetic content placeholder',
        folderId: null,
        tags: [`tag-${i % 20}`],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        pinned: false,
        type: 'text',
        checklist: [],
        color: 'default',
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
      });
    }
    const largeIndex = quickSwitcherService.buildIndex({ notes: largeSyntheticNotes });
    assert(largeIndex.length === 50000, '50k items indexed');
    const startBench = performance.now();
    const benchResults = quickSwitcherService.search(largeIndex, 'Synthetic Reference Document 4242');
    const elapsedBench = performance.now() - startBench;
    assert(benchResults.length > 0 && benchResults[0].title === 'Synthetic Reference Document 4242', '50k search finds exact item');
    assert(elapsedBench < 300, '50k search completes in under 300ms on container');

    // ========================================================================
    // 2. HEADING & BLOCK NAVIGATION
    // ========================================================================
    const headings = headingBlockNavigator.extractHeadings(mockNotes[0].content);
    assert(headings.length === 3, 'Heading extraction identifies 3 headings');
    assert(headings[0].headingText === 'Compactness in Metric Spaces' && headings[0].level === 1, 'H1 extracted correctly');
    assert(headings[1].headingText === 'Definition' && headings[1].level === 2, 'H2 extracted correctly');

    const blocks = headingBlockNavigator.extractBlocks(mockNotes[0].content);
    assert(blocks.length === 1 && blocks[0].blockId === 'heine-borel-block', 'Block reference extraction finds block target');
    assert(blocks[0].content.includes('Every closed and bounded subset'), 'Block content preserved');

    const exactHeading = headingBlockNavigator.resolveHeading('Definition', mockNotes[0].content);
    assert(exactHeading.status === 'exact' && exactHeading.resolvedLineIndex === 2, 'Exact heading resolved');

    const fuzzyHeading = headingBlockNavigator.resolveHeading('Heine Borel', mockNotes[0].content);
    assert(fuzzyHeading.status === 'fuzzy_renamed' && fuzzyHeading.resolvedHeading === 'Heine-Borel Theorem', 'Fuzzy heading resolved');

    const missingHeading = headingBlockNavigator.resolveHeading('Nonexistent Subtopic', mockNotes[0].content);
    assert(missingHeading.status === 'missing' && (missingHeading.nearbySuggestions?.length || 0) > 0, 'Missing heading detected');

    const hLink = headingBlockNavigator.formatHeadingLink('Topology', 'Compactness');
    assert(hLink === '[[Topology#Compactness]]', 'Formatted heading link correct');

    const bLink = headingBlockNavigator.formatBlockLink('Topology', 'b123');
    assert(bLink === '[[Topology#^b123]]', 'Formatted block link correct');

    const findRes = headingBlockNavigator.findInNote(mockNotes[0].content, 'compact');
    assert(findRes.matches.length > 1, 'In-note find finds occurrences');

    // ========================================================================
    // 3. BACKLINKS & MENTION SERVICES
    // ========================================================================
    const backlinks = backlinkNavigationService.getLinkedMentions('note-compactness', mockNotes);
    assert(backlinks.length === 1, 'Linked mentions finds inbound reference');
    assert(backlinks[0].sourceNoteId === 'note-analysis', 'Backlink source note correct');
    assert(backlinks[0].headingTarget === 'Definition', 'Backlink heading target correct');

    const unlinkedThe = backlinkNavigationService.getUnlinkedMentions('note-intro', mockNotes);
    assert(unlinkedThe.length === 0, 'Stop word unlinked mentions excluded');

    const unlinkedSubstantive = backlinkNavigationService.getUnlinkedMentions('note-compactness', mockNotes);
    assert(unlinkedSubstantive.length === 1 && unlinkedSubstantive[0].matchedText === 'Compactness in Metric Spaces', 'Substantive unlinked mention found');

    const brokenLinks = backlinkNavigationService.auditBrokenLinks(mockNotes);
    assert(brokenLinks.length > 0, 'Broken links audit finds missing links');
    const missingTarget = brokenLinks.find((b) => b.rawTarget === 'Missing Theoretical Framework');
    assert(missingTarget?.brokenType === 'missing_note', 'Missing note link detected');

    const outgoing = backlinkNavigationService.getOutgoingLinks(mockNotes[1]);
    assert(outgoing.length > 0, 'Outgoing links extracted');
    const outgoingCite = outgoing.find((o) => o.type === 'citation');
    assert(outgoingCite?.target === 'rudin1976', 'Citation target found in outgoing links');

    // ========================================================================
    // 4. LINK PREVIEWS (PEEK)
    // ========================================================================
    const preview = linkPreviewManager.getPreviewData('Compactness in Metric Spaces', mockNotes, mockFolders);
    assert(preview !== null && preview.title === 'Compactness in Metric Spaces', 'Link preview data generated');
    assert(preview?.subtitle === 'Folder: Analysis', 'Preview subtitle has folder');

    const lockedPreview = linkPreviewManager.getPreviewData('Compactness in Metric Spaces', mockNotes, mockFolders, {
      isVaultLocked: true,
    });
    assert(lockedPreview?.isEncryptedOrLocked === true, 'Locked vault preview redacted');

    // ========================================================================
    // 5. TRUTHFUL CANONICAL BREADCRUMBS
    // ========================================================================
    const crumbs = breadcrumbService.getBreadcrumbsForNote(mockNotes[0], mockFolders);
    assert(crumbs.length === 4 && crumbs[0].label === 'Vault' && crumbs[3].label === 'Compactness in Metric Spaces', 'Breadcrumb generated');
    const collapsedCrumbs = breadcrumbService.collapseForMobile(crumbs);
    assert(collapsedCrumbs.length === 4 && collapsedCrumbs[1].label === '...', 'Mobile breadcrumbs collapsed with ellipsis');

    // ========================================================================
    // 6. RESEARCH NAVIGATION & CITATIONS
    // ========================================================================
    const citations = researchNavigationService.extractCitations(mockNotes[1].content);
    assert(citations.length === 1 && citations[0].citeKey === 'rudin1976' && citations[0].pdfPage === 37, 'Citation extracted');
    const provStr = researchNavigationService.formatSourceProvenance({
      citeKey: 'rudin1976',
      referenceTitle: 'Principles of Mathematical Analysis',
      pdfTitle: 'Principles of Mathematical Analysis.pdf',
      pdfPage: 37,
      authors: ['Walter Rudin'],
      year: 1976,
    });
    assert(provStr.includes('Principles of Mathematical Analysis.pdf') && provStr.includes('p. 37'), 'Source provenance formatted');

    // ========================================================================
    // 7. NAVIGATION HISTORY & BACK/FORWARD
    // ========================================================================
    navigationHistoryManager.pushEntry({
      resourceType: 'note',
      resourceId: 'note-compactness',
      title: 'Compactness in Metric Spaces',
      scrollOffset: 120,
    });
    navigationHistoryManager.pushEntry({
      resourceType: 'note',
      resourceId: 'note-analysis',
      title: 'Real Analysis Fundamentals',
      scrollOffset: 450,
    });
    assert(navigationHistoryManager.canGoBack() === true, 'Can go back');
    const back = navigationHistoryManager.goBack();
    assert(back?.resourceId === 'note-compactness' && back?.scrollOffset === 120, 'Go back restores state');
    const fwd = navigationHistoryManager.goForward();
    assert(fwd?.resourceId === 'note-analysis' && fwd?.scrollOffset === 450, 'Go forward restores state');

    for (let i = 0; i < 70; i++) {
      navigationHistoryManager.pushEntry({
        resourceType: 'note',
        resourceId: `note-${i}`,
        title: `Note ${i}`,
      });
    }
    assert(navigationHistoryManager.getHistoryStack().length === 50, 'History bounded to 50 items');

    // ========================================================================
    // 8. NAVIGATION DOCTOR
    // ========================================================================
    const docReport = navigationDoctor.runDiagnostics(mockNotes, mockFolders);
    assert(docReport.totalChecks > 0, 'Doctor ran checks');
    assert(docReport.brokenWikilinks.length > 0, 'Doctor detected broken links');
  } catch (err: any) {
    failed++;
    errors.push(`V1.7 Navigation Certification Exception: ${err.message || String(err)}`);
  }

  return { total, passed, failed, errors };
}
