import 'fake-indexeddb/auto';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAttachment } from '../pdfTypes';
import { PortableVaultData } from '../portableVaultTypes';
import {
  serializePortableVault,
  deserializePortableVault,
  serializeNoteToMarkdown,
  parseMarkdownToNote,
  canonicalizeJson,
  computeDeterministicChecksum,
  dataUrlToUint8Array,
  uint8ArrayToDataUrl,
} from '../portableVaultSerializer';
import {
  exportVaultToZipBlob,
  importVaultFromZipBlob,
  getFileSystemCapability,
} from '../filesystemAdapter';
import { localGitService } from '../localGitService';

export async function runPortableVaultAndGitTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
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

  // --- Sample Test Data Fixtures ---
  const sampleFolders: Folder[] = [
    { id: 'f-work', name: 'Work Projects', color: '#3b82f6', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'f-life', name: 'Personal Life', color: '#10b981', createdAt: '2026-01-02T00:00:00.000Z' },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Project Roadmap 2026',
      content: 'Core architecture milestones:\n- [[Sprint Alpha]]\n- [[Personal Life/Habits Tracker]]',
      type: 'text',
      checklist: [],
      color: 'blue',
      tags: ['roadmap', 'arch'],
      folderId: 'f-work',
      pinned: true,
      archived: false,
      trashed: false,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-15T14:30:00.000Z',
      reminderDate: '2026-03-01T09:00:00.000Z',
      images: [
        {
          id: 'img-1',
          name: 'diagram.png',
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          size: 68,
        },
      ],
      linkedNoteIds: ['note-2'],
    },
    {
      id: 'note-2',
      title: 'Sprint Alpha Checklist',
      content: 'Sprint tasks to complete:',
      type: 'checklist',
      checklist: [
        { id: 'c1', text: 'Define deterministic serialization', completed: true },
        { id: 'c2', text: 'Implement Local Git versioning', completed: true },
        { id: 'c3', text: 'Write regression test suite', completed: false },
      ],
      color: 'green',
      tags: ['sprint', 'dev'],
      folderId: 'f-work',
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-11T11:00:00.000Z',
      updatedAt: '2026-01-16T15:00:00.000Z',
      reminderDate: null,
      images: [],
      linkedNoteIds: ['note-1'],
    },
    {
      id: 'note-3',
      title: 'Habits Tracker',
      content: 'Daily habits:\n- 20 mins reading\n- Morning run',
      type: 'text',
      checklist: [],
      color: 'purple',
      tags: ['health', 'habits'],
      folderId: 'f-life',
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-12T08:00:00.000Z',
      updatedAt: '2026-01-12T08:00:00.000Z',
      reminderDate: null,
      images: [],
    },
  ];

  const sampleSearches: SavedSearch[] = [
    { id: 's-1', name: 'Open Sprints', query: 'type:checklist', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  const sampleSettings: AppSettings = {
    theme: 'light',
    canvasBackground: 'subtle-dots',
    defaultViewMode: 'masonry',
    gridColumns: 'auto',
    cardDensity: 'comfortable',
    fontFamily: 'sans',
    fontSize: 'md',
    autoArchiveChecked: false,
    confirmDelete: true,
    defaultColor: 'default',
    defaultFolderId: 'f-work',
    showMonthDividers: true,
    enableWikiLinks: true,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  };

  const sampleCanvases: CanvasBoard[] = [
    {
      id: 'canvas-1',
      title: 'System Design Board',
      description: 'Architecture layout for PKM',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      transform: { panX: 0, panY: 0, zoom: 1 },
      backgroundStyle: 'dots',
      nodes: [
        {
          id: 'node-1',
          type: 'sticky',
          x: 50,
          y: 50,
          width: 200,
          height: 120,
          zIndex: 1,
          text: 'Git Storage Layer',
          color: '#fef08a',
        },
      ],
      connectors: [],
      strokes: [],
    },
  ];

  const samplePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7 header
  const samplePdfs = [
    {
      meta: {
        id: 'pdf-sample',
        name: 'Technical Spec',
        fileName: 'spec.pdf',
        size: samplePdfBytes.length,
        pageCount: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } as PDFAttachment,
      blobData: samplePdfBytes,
    },
  ];

  const initialVaultData: PortableVaultData = {
    notes: sampleNotes,
    folders: sampleFolders,
    savedSearches: sampleSearches,
    settings: sampleSettings,
    canvases: sampleCanvases,
    pdfAttachments: samplePdfs,
  };

  // ==========================================
  // Test 1: Deterministic Serialization
  // ==========================================
  const fixedExportTime = '2026-01-01T00:00:00.000Z';
  const ser1 = await serializePortableVault(initialVaultData, { exportedAt: fixedExportTime });
  const ser2 = await serializePortableVault(initialVaultData, { exportedAt: fixedExportTime });

  assert(ser1.files.length === ser2.files.length, 'Deterministic: file counts match across identical exports');
  assert(
    JSON.stringify(ser1.manifest) === JSON.stringify(ser2.manifest),
    'Deterministic: manifest JSON is byte-for-byte identical'
  );

  for (let i = 0; i < ser1.files.length; i++) {
    const f1 = ser1.files[i];
    const f2 = ser2.files[i];
    assert(f1.path === f2.path, `Deterministic: file paths match for ${f1.path}`);
    if (!f1.isBinary) {
      assert(f1.content === f2.content, `Deterministic: text content matches for ${f1.path}`);
    }
  }

  // ==========================================
  // Test 2: Full Vault Round-Trip Fidelity
  // ==========================================
  const deserialized = await deserializePortableVault(ser1.files);

  assert(deserialized.notes.length === sampleNotes.length, 'Round-trip: restored all notes');
  assert(deserialized.folders.length === sampleFolders.length, 'Round-trip: restored all folders');
  assert(deserialized.savedSearches.length === sampleSearches.length, 'Round-trip: restored saved searches');
  assert(deserialized.canvases?.length === sampleCanvases.length, 'Round-trip: restored canvas boards');
  assert(deserialized.pdfAttachments?.length === samplePdfs.length, 'Round-trip: restored PDF attachments');

  // Verify note 1 properties
  const n1 = deserialized.notes.find((n) => n.id === 'note-1');
  assert(!!n1, 'Round-trip: note-1 found by stable ID');
  assert(n1?.title === 'Project Roadmap 2026', 'Round-trip: note-1 title preserved');
  assert(n1?.color === 'blue', 'Round-trip: note-1 color preserved');
  assert(n1?.pinned === true, 'Round-trip: note-1 pinned flag preserved');
  assert(n1?.tags.includes('roadmap'), 'Round-trip: note-1 tags preserved');
  assert(n1?.folderId === 'f-work', 'Round-trip: note-1 folder preserved');
  assert(n1?.reminderDate === '2026-03-01T09:00:00.000Z', 'Round-trip: note-1 reminder preserved');
  assert(n1?.images.length === 1, 'Round-trip: note-1 image restored');
  assert(n1?.images[0].dataUrl.startsWith('data:image/png;base64,'), 'Round-trip: image data URL reconstructed');

  // Verify note 2 checklist
  const n2 = deserialized.notes.find((n) => n.id === 'note-2');
  assert(!!n2, 'Round-trip: note-2 found');
  assert(n2?.type === 'checklist', 'Round-trip: note-2 recognized as checklist');
  assert(n2?.checklist.length === 3, 'Round-trip: all checklist items restored');
  assert(n2?.checklist[0].completed === true, 'Round-trip: checklist item 0 marked completed');
  assert(n2?.checklist[2].completed === false, 'Round-trip: checklist item 2 marked uncompleted');

  // Verify canvas board
  const c1 = deserialized.canvases?.[0];
  assert(c1?.id === 'canvas-1', 'Round-trip: canvas board ID preserved');
  assert(c1?.nodes.length === 1, 'Round-trip: canvas node preserved');
  const stickyNode = c1?.nodes[0];
  assert(stickyNode?.type === 'sticky' && stickyNode.text === 'Git Storage Layer', 'Round-trip: canvas node text preserved');

  // Verify PDF attachment
  const pdf1 = deserialized.pdfAttachments?.[0];
  assert(pdf1?.meta.id === 'pdf-sample', 'Round-trip: PDF ID preserved');
  const blobSize = pdf1?.blobData instanceof Uint8Array ? pdf1.blobData.length : (pdf1?.blobData as any)?.size || 0;
  assert(blobSize === samplePdfBytes.length, 'Round-trip: PDF binary blob size matched');

  // ==========================================
  // Test 3: Duplicate Note Titles & Collisions
  // ==========================================
  const duplicateNotes: Note[] = [
    {
      id: 'dup-1',
      title: 'Weekly Standup',
      content: 'Standup notes 1',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: 'f-work',
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      reminderDate: null,
      images: [],
    },
    {
      id: 'dup-2',
      title: 'Weekly Standup',
      content: 'Standup notes 2',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: 'f-work',
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      reminderDate: null,
      images: [],
    },
  ];

  const dupVault: PortableVaultData = {
    notes: duplicateNotes,
    folders: sampleFolders,
    savedSearches: [],
  };

  const dupSer = await serializePortableVault(dupVault);
  assert(dupSer.files.some((f) => f.path.includes('Weekly Standup.md')), 'Duplicate handling: first note has clean path');
  assert(
    dupSer.files.some((f) => f.path.includes('Weekly Standup_(')),
    'Duplicate handling: second note has collision-avoided unique path'
  );

  const dupDeser = await deserializePortableVault(dupSer.files);
  assert(dupDeser.notes.length === 2, 'Duplicate handling: both notes restored');
  assert(dupDeser.notes.some((n) => n.id === 'dup-1'), 'Duplicate handling: note dup-1 preserved');
  assert(dupDeser.notes.some((n) => n.id === 'dup-2'), 'Duplicate handling: note dup-2 preserved');

  // ==========================================
  // Test 4: Unicode Filenames & Emojis
  // ==========================================
  const unicodeNotes: Note[] = [
    {
      id: 'uni-1',
      title: '日本語のノート 🍙 & Café / Resumé * 2026',
      content: 'Multilingual and special character test.',
      type: 'text',
      checklist: [],
      color: 'yellow',
      tags: ['unicode', '日本語'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      reminderDate: null,
      images: [],
    },
  ];

  const uniVault: PortableVaultData = {
    notes: unicodeNotes,
    folders: [],
    savedSearches: [],
  };

  const uniSer = await serializePortableVault(uniVault);
  const uniDeser = await deserializePortableVault(uniSer.files);
  assert(uniDeser.notes.length === 1, 'Unicode handling: note restored');
  assert(
    uniDeser.notes[0].title === '日本語のノート 🍙 & Café / Resumé * 2026',
    'Unicode handling: exact title with symbols preserved'
  );
  assert(uniDeser.notes[0].tags.includes('日本語'), 'Unicode handling: Unicode tag preserved');

  // ==========================================
  // Test 5: Universal ZIP Archive Round-Trip
  // ==========================================
  const zipBlob = await exportVaultToZipBlob(initialVaultData);
  assert(zipBlob.size > 100, 'ZIP fallback: exported zip blob has valid size');

  const zipRestored = await importVaultFromZipBlob(zipBlob);
  assert(zipRestored.notes.length === sampleNotes.length, 'ZIP fallback: restored note count from ZIP matches');
  assert(zipRestored.folders.length === sampleFolders.length, 'ZIP fallback: restored folders from ZIP matches');
  assert(zipRestored.canvases?.length === sampleCanvases.length, 'ZIP fallback: restored canvases from ZIP matches');

  // ==========================================
  // Test 6: Local Git Repository Lifecycle
  // ==========================================
  const testRepoDir = '/test_vault';
  await localGitService.initRepository(testRepoDir);

  const isInit = await localGitService.isRepoInitialized(testRepoDir);
  assert(isInit === true, 'Local Git: repository initialized successfully');

  // Sync initial vault into working tree
  const sync1 = await localGitService.syncVaultToWorkingTree(initialVaultData, testRepoDir);
  assert(sync1.written > 0, 'Local Git: written files into working tree');

  // Check status before commit
  const status1 = await localGitService.getStatus(testRepoDir);
  assert(status1.clean === false, 'Local Git: status correctly shows uncommitted changes');
  assert(status1.added.length > 0, 'Local Git: status shows new untracked/added files');

  // Create first commit
  const commit1 = await localGitService.createCommit({
    message: 'Initial vault snapshot',
    author: { name: 'Test PKM User', email: 'test@vault.local' },
    dir: testRepoDir,
  });

  assert(!!commit1.oid, 'Local Git: commit created with valid SHA-1 hash');
  assert(commit1.message === 'Initial vault snapshot', 'Local Git: commit message matches');

  // Check status after commit
  const statusAfter = await localGitService.getStatus(testRepoDir);
  assert(statusAfter.clean === true, 'Local Git: working tree is clean after commit');

  // Modify vault and create second commit
  const modifiedNotes: Note[] = [
    ...sampleNotes.map((n) => (n.id === 'note-1' ? { ...n, content: 'Updated content in roadmap v2' } : n)),
    {
      id: 'note-4-new',
      title: 'Newly Added Note in Git',
      content: 'New content',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['new'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      reminderDate: null,
      images: [],
    },
  ];

  const modifiedVault: PortableVaultData = {
    ...initialVaultData,
    notes: modifiedNotes,
  };

  await localGitService.syncVaultToWorkingTree(modifiedVault, testRepoDir);
  const status2 = await localGitService.getStatus(testRepoDir);
  assert(status2.clean === false, 'Local Git: detects changes in modified vault');

  const commit2 = await localGitService.createCommit({
    message: 'Added note 4 and updated roadmap',
    dir: testRepoDir,
  });
  assert(!!commit2.oid, 'Local Git: second commit created successfully');

  // Get commit log
  const log = await localGitService.getLog({ depth: 10, dir: testRepoDir });
  assert(log.length === 2, 'Local Git: log contains exactly 2 commits');
  assert(log[0].oid === commit2.oid, 'Local Git: latest commit is head of log');
  assert(log[1].oid === commit1.oid, 'Local Git: initial commit is in parent chain');

  // Restore snapshot from commit 1
  const restoredFromCommit1 = await localGitService.restoreVaultFromCommit(commit1.oid, testRepoDir);
  assert(
    restoredFromCommit1.notes.length === sampleNotes.length,
    'Local Git Restore: restored vault note count matches commit 1 snapshot'
  );
  const restoredN1 = restoredFromCommit1.notes.find((n) => n.id === 'note-1');
  assert(
    restoredN1?.content.includes('Core architecture milestones'),
    'Local Git Restore: note-1 content successfully restored to historical commit state'
  );

  // ==========================================
  // Test 7: Browser Capability Detection
  // ==========================================
  const capability = getFileSystemCapability();
  assert(typeof capability.hasFileSystemAccess === 'boolean', 'Capability: detected filesystem access flag');
  assert(!!capability.browserDescription, 'Capability: provides browser description');
  assert(!!capability.fallbackMode, 'Capability: sets valid fallback mode');

  return { passed, failed, errors };
}
