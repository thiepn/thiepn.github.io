import { buildVaultIndex, applyIncrementalNoteUpdate } from '../vaultIndex';
import { VaultIndexManager } from '../indexer';
import { Note } from '../../types';

export function runIncrementalTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  // Initial set of notes
  const initialNotes: Note[] = [
    {
      id: 'n-alpha',
      title: 'Alpha Note',
      content: 'This note links to [[Beta Note]] and [[Gamma Note]].',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['topic/alpha'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    },
    {
      id: 'n-beta',
      title: 'Beta Note',
      content: 'Beta content with #betatag.',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['topic/beta'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    },
  ];

  const manager = new VaultIndexManager(initialNotes);

  // 1. Initial State Check
  {
    const index = manager.getIndex();
    assert(index.noteCount === 2, 'Initial note count is 2');
    assert(index.forwardLinks['n-alpha']?.includes('n-beta'), 'Alpha links to Beta');
    assert(index.backlinks['n-beta']?.length === 1, 'Beta has 1 backlink from Alpha');
    assert(index.unresolvedLinks['n-alpha']?.length === 1, 'Gamma is currently unresolved');
  }

  // 2. Incremental Note Creation: Add "Gamma Note"
  // This should automatically resolve Alpha's unresolved link to Gamma!
  {
    const gammaNote: Note = {
      id: 'n-gamma',
      title: 'Gamma Note',
      content: 'Gamma content linking back to [[Alpha Note]].',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['topic/gamma'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    manager.onNoteCreated(gammaNote);
    const index = manager.getIndex();

    assert(index.noteCount === 3, 'Note count increased to 3');
    assert(index.forwardLinks['n-alpha']?.includes('n-gamma'), 'Alpha forward links now include Gamma');
    assert(index.backlinks['n-gamma']?.length === 1, 'Gamma has backlink from Alpha');
    assert(index.backlinks['n-alpha']?.length === 1, 'Alpha has backlink from Gamma');
    assert(!index.unresolvedLinks['n-alpha'], 'Alpha has no unresolved links now');
  }

  // 3. Incremental Note Modification: Remove link to Beta from Alpha
  {
    const modifiedAlpha: Note = {
      id: 'n-alpha',
      title: 'Alpha Note',
      content: 'This note now ONLY links to [[Gamma Note]].',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['topic/alpha'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:01:00Z',
      reminderDate: null,
      images: [],
    };

    manager.onNoteUpdated(modifiedAlpha);
    const index = manager.getIndex();

    assert(!index.forwardLinks['n-alpha']?.includes('n-beta'), 'Alpha no longer links to Beta');
    assert(!index.backlinks['n-beta'] || index.backlinks['n-beta'].length === 0, 'Beta has 0 backlinks now');
    assert(index.backlinks['n-gamma']?.length === 1, 'Gamma still has backlink from Alpha');
  }

  // 4. Incremental Note Deletion: Delete Gamma Note
  {
    manager.onNoteDeleted('n-gamma');
    const index = manager.getIndex();

    assert(index.noteCount === 2, 'Note count back to 2');
    assert(!index.notes['n-gamma'], 'Gamma removed from notes map');
    assert(!index.titleToNoteIds['gamma note'], 'Gamma title removed from title index');
    assert(!index.backlinks['n-alpha'] || index.backlinks['n-alpha'].length === 0, 'Alpha backlinks cleaned up');
  }

  // 5. Deterministic Consistency Check: Compare Incremental vs Full Rebuild
  {
    const notesDataset: Note[] = [
      {
        id: 'note-101',
        title: 'Project Phoenix',
        content: '# Phoenix\nMain plan linking to [[Design System]] and [[API Gateway]].',
        type: 'text',
        checklist: [],
        color: 'default',
        tags: ['project', 'phoenix'],
        folderId: 'f1',
        pinned: true,
        archived: false,
        trashed: false,
        createdAt: '2026-08-31T00:00:00Z',
        updatedAt: '2026-08-31T00:00:00Z',
        reminderDate: null,
        images: [],
      },
      {
        id: 'note-102',
        title: 'Design System',
        content: '# Design System\nComponents and styles. Links to [[Project Phoenix]].',
        type: 'text',
        checklist: [],
        color: 'default',
        tags: ['design', 'ui'],
        folderId: 'f1',
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: '2026-08-31T00:00:00Z',
        updatedAt: '2026-08-31T00:00:00Z',
        reminderDate: null,
        images: [],
      },
      {
        id: 'note-103',
        title: 'API Gateway',
        content: '# Gateway\nEndpoints. Links to [[Project Phoenix]].',
        type: 'text',
        checklist: [],
        color: 'default',
        tags: ['backend'],
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: '2026-08-31T00:00:00Z',
        updatedAt: '2026-08-31T00:00:00Z',
        reminderDate: null,
        images: [],
      },
    ];

    // Build via Full Rebuild
    const fullRebuiltIndex = buildVaultIndex(notesDataset);

    // Build via Sequential Incremental updates from empty
    const incManager = new VaultIndexManager();
    for (const n of notesDataset) {
      incManager.onNoteCreated(n);
    }
    const incrementalIndex = incManager.getIndex();

    // Check equality of key derived index properties
    assert(
      fullRebuiltIndex.noteCount === incrementalIndex.noteCount,
      'Full and incremental note counts match'
    );

    assert(
      JSON.stringify(Object.keys(fullRebuiltIndex.notes).sort()) ===
        JSON.stringify(Object.keys(incrementalIndex.notes).sort()),
      'Note IDs match exactly'
    );

    assert(
      JSON.stringify(fullRebuiltIndex.tagCounts) === JSON.stringify(incrementalIndex.tagCounts),
      'Tag counts match exactly'
    );

    assert(
      JSON.stringify(fullRebuiltIndex.forwardLinks) === JSON.stringify(incrementalIndex.forwardLinks),
      'Forward links match exactly'
    );

    // Helper to sort keys recursively for canonical comparison
    const sortObjectKeys = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      return Object.keys(obj)
        .sort()
        .reduce((res: Record<string, any>, key) => {
          res[key] = sortObjectKeys(obj[key]);
          return res;
        }, {});
    };

    const fullBlJson = JSON.stringify(sortObjectKeys(fullRebuiltIndex.backlinks));
    const incBlJson = JSON.stringify(sortObjectKeys(incrementalIndex.backlinks));

    assert(
      fullBlJson === incBlJson,
      'Backlinks match exactly'
    );
  }

  return { passed, failed, errors };
}
