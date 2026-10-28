import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment } from '../pdfTypes';
import {
  runFullVaultDiagnostics,
  repairCreateMissingNote,
  repairRepointLink,
  repairMergeTags,
  repairRemoveStaleCanvasNodes,
  createRecoveryCheckpoint,
} from '../vaultDoctor';

export async function runVaultDoctorTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${msg}`);
      console.error(`  ✗ ${msg}`);
    }
  }

  console.log('Running Vault Doctor & Diagnostics Tests (Phase P14)...');

  // Seed test notes
  const notes: Note[] = [
    {
      id: 'note-1',
      title: 'Knowledge Architecture',
      content: 'Exploring PKM paradigms with [[NonExistentTarget]] and [[Distributed Systems#Raft Protocol]] and [[Database Fundamentals#^block123]]. Also tagging #KnowledgeManagement and #react.',
      type: 'text',
      checklist: [],
      tags: ['KnowledgeManagement', 'react'],
      color: 'default',
      folderId: 'folder-active',
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [
        {
          id: 'img-1',
          name: 'sample.png',
          dataUrl: 'data:image/png;base64,sample123',
          size: 100,
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'note-2',
      title: 'Distributed Systems',
      content: '# Distributed Systems\n\n## Paxos Protocol\nConsensus engine.\n\nLinking back to [[Knowledge Architecture]]. Tagged with #React.',
      type: 'text',
      checklist: [],
      tags: ['React'],
      color: 'default',
      folderId: 'folder-active',
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [
        {
          id: 'img-2',
          name: 'sample.png',
          dataUrl: 'data:image/png;base64,sample123',
          size: 100,
        },
      ], // duplicate image
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'note-3',
      title: 'Database Fundamentals',
      content: 'ACID vs BASE systems. No block id here. Also testing ![[MissingEmbedNote]] and invalid query:\n```query\ntype:invalid_syntax and (\n```',
      type: 'text',
      checklist: [],
      tags: ['rareTagXYZ'],
      color: 'default',
      folderId: 'folder-active',
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 'note-4',
      title: 'Solitary Island Note',
      content: 'This note has completely zero inlinks and zero outlinks.',
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
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
    },
    {
      id: 'note-5',
      title: 'Ambiguous Note Alpha',
      content: 'Points to [[DuplicateTitleTarget]].',
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
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
    },
    {
      id: 'note-6a',
      title: 'DuplicateTitleTarget',
      content: 'First note with this title.',
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
      createdAt: '2026-01-06T00:00:00.000Z',
      updatedAt: '2026-01-06T00:00:00.000Z',
    },
    {
      id: 'note-6b',
      title: 'DuplicateTitleTarget',
      content: 'Second note with this exact same title.',
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
      createdAt: '2026-01-06T01:00:00.000Z',
      updatedAt: '2026-01-06T01:00:00.000Z',
    },
  ];

  const folders: Folder[] = [
    { id: 'folder-active', name: 'Active Projects', color: '#f59e0b', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'folder-empty', name: 'Empty Archive Folder', color: '#64748b', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  const canvasBoards: CanvasBoard[] = [
    {
      id: 'board-1',
      title: 'System Canvas',
      nodes: [
        { id: 'node-1', type: 'note', x: 0, y: 0, width: 200, height: 150, zIndex: 1, noteId: 'note-1' },
        { id: 'node-2', type: 'note', x: 250, y: 0, width: 200, height: 150, zIndex: 1, noteId: 'deleted-note-999' },
      ],
      connectors: [
        {
          id: 'edge-1',
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          lineStyle: 'curved',
          arrowDirection: 'forward',
          color: '#64748b',
          strokeWidth: 2,
        },
      ],
      strokes: [],
      backgroundStyle: 'dots',
      transform: { panX: 0, panY: 0, zoom: 1 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const pdfAttachments: PDFAttachment[] = [
    {
      id: 'pdf-unref-1',
      name: 'Unreferenced Paper',
      fileName: 'paper.pdf',
      size: 102400,
      pageCount: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  // 1. Run Full Diagnostics Scan
  const report = await runFullVaultDiagnostics(notes, folders, canvasBoards, pdfAttachments);

  assert(report.totalIssues > 0, `Diagnostics report generated ${report.totalIssues} issues`);
  assert(report.durationMs >= 0, `Diagnostics scan completed in ${report.durationMs}ms`);

  // 2. Broken WikiLinks checks
  const brokenLinks = report.issuesByCategory.broken_links;
  const missingNoteIssue = brokenLinks.find((i) => i.targetName === 'NonExistentTarget');
  assert(!!missingNoteIssue, 'Detected broken WikiLink to non-existent note target');
  assert(
    missingNoteIssue?.suggestedActions.some((a) => a.actionType === 'create_missing_note') || false,
    'Suggested action to create missing note target exists'
  );

  const missingHeadingIssue = brokenLinks.find((i) => i.description.includes('Raft Protocol'));
  assert(!!missingHeadingIssue, 'Detected broken WikiLink to missing heading #Raft Protocol');

  const missingBlockIssue = brokenLinks.find((i) => i.description.includes('block123'));
  assert(!!missingBlockIssue, 'Detected broken WikiLink to missing block ^block123');

  // 3. Ambiguous Links check
  const ambiguousIssues = report.issuesByCategory.ambiguous_links;
  const ambIssue = ambiguousIssues.find((i) => i.targetName === 'DuplicateTitleTarget');
  assert(!!ambIssue, 'Detected ambiguous WikiLink target with duplicate note titles');

  // 4. Orphan Notes check
  const orphanIssues = report.issuesByCategory.orphan_notes;
  const orphan = orphanIssues.find((i) => i.sourceId === 'note-4');
  assert(!!orphan, 'Detected solitary orphan note with zero connections');

  // 5. Tag Casing Issues & Rare Tags
  const tagIssues = report.issuesByCategory.tags;
  const tagCasingIssue = tagIssues.find((i) => i.metadata?.canonicalTag === 'react');
  assert(!!tagCasingIssue, 'Detected tag casing variant collision (#react vs #React)');
  assert(
    tagCasingIssue?.suggestedActions.some((a) => a.actionType === 'merge_tags') || false,
    'Suggested action to merge tag variations exists'
  );

  const rareTagIssue = tagIssues.find((i) => i.title.includes('rareTagXYZ'));
  assert(!!rareTagIssue, 'Detected rare single-use tag #rareTagXYZ');

  // 6. Empty Folders check
  const folderIssues = report.issuesByCategory.folders;
  const emptyFolderIssue = folderIssues.find((i) => i.sourceId === 'folder-empty');
  assert(!!emptyFolderIssue, 'Detected unused empty folder');

  // 7. Attachments & Duplicates check
  const attachIssues = report.issuesByCategory.attachments;
  const unrefPdf = attachIssues.find((i) => i.sourceId === 'pdf-unref-1');
  assert(!!unrefPdf, 'Detected unreferenced PDF attachment');

  const dupImage = attachIssues.find((i) => i.title.toLowerCase().includes('duplicate'));
  assert(!!dupImage, 'Detected duplicate image embedded across multiple notes');

  // 8. Content Integrity (Broken Transclusions & Stale Canvas Cards)
  const integrityIssues = report.issuesByCategory.invalid_structures;
  const brokenTransclusion = integrityIssues.find((i) => i.description.includes('MissingEmbedNote'));
  assert(!!brokenTransclusion, 'Detected broken transclusion embed');

  const staleCanvasIssue = integrityIssues.find((i) => i.sourceName === 'System Canvas');
  assert(!!staleCanvasIssue, 'Detected stale canvas node referencing deleted note');

  // 9. Verification of Safe Repair Handlers
  // 9a. repairCreateMissingNote
  const newCreatedNote = repairCreateMissingNote('NonExistentTarget');
  assert(newCreatedNote.title === 'NonExistentTarget', 'repairCreateMissingNote created note with title');
  assert(newCreatedNote.content.length > 0, 'repairCreateMissingNote created valid initial body');

  // 9b. repairRepointLink
  const originalNote1 = notes[0];
  const repointedNote1 = repairRepointLink(
    originalNote1,
    '[[NonExistentTarget]]',
    'Database Fundamentals',
    'DB Reference'
  );
  assert(
    repointedNote1.content.includes('[[Database Fundamentals|DB Reference]]'),
    'repairRepointLink successfully updated WikiLink target and alias'
  );
  assert(
    !repointedNote1.content.includes('[[NonExistentTarget]]'),
    'repairRepointLink removed old broken link target'
  );

  // 9c. repairMergeTags
  const updatedTagNotes = repairMergeTags(notes, 'react', ['React', 'react']);
  const note2Updated = updatedTagNotes.find((n) => n.id === 'note-2');
  assert(note2Updated?.tags.includes('react') || false, 'repairMergeTags standardized note tags array');
  assert(!note2Updated?.tags.includes('React'), 'repairMergeTags stripped uppercase variation');
  assert(
    note2Updated?.content.includes('#react') || false,
    'repairMergeTags replaced in-content tag occurrence'
  );

  // 9d. repairRemoveStaleCanvasNodes
  const cleanBoard = repairRemoveStaleCanvasNodes(canvasBoards[0], ['node-2']);
  assert(cleanBoard.nodes.length === 1, 'repairRemoveStaleCanvasNodes removed stale card');
  assert(
    (cleanBoard.connectors?.length || (cleanBoard as any).edges?.length || 0) === 0,
    'repairRemoveStaleCanvasNodes cleaned dangling edges/connectors'
  );

  // 9e. createRecoveryCheckpoint
  const savedSearches: SavedSearch[] = [
    { id: 's1', name: 'Starred', query: 'is:pinned', createdAt: '2026-01-01T00:00:00.000Z' },
  ];
  const settings: AppSettings = {
    theme: 'light',
    defaultViewMode: 'masonry',
    defaultColor: 'default',
    denseMode: false,
    showMonthDividers: true,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    canvasBackground: 'subtle-dots',
    gridColumns: 'auto',
    cardDensity: 'comfortable',
    fontFamily: 'sans',
    fontSize: 'md',
    autoArchiveChecked: false,
    confirmDelete: false,
    defaultFolderId: null,
    enableWikiLinks: true,
  } as any;

  const checkpoint = createRecoveryCheckpoint(notes, folders, savedSearches, settings, 'Test Checkpoint');
  assert(!!checkpoint.id, 'createRecoveryCheckpoint generated unique checkpoint ID');
  assert(checkpoint.backupJSON.length > 50, 'createRecoveryCheckpoint serialized backup JSON payload');
  const parsed = JSON.parse(checkpoint.backupJSON);
  assert(parsed.notes?.length === notes.length, 'createRecoveryCheckpoint captured all notes');

  return { passed, failed, errors };
}
