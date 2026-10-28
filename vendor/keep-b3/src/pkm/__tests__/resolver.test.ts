import { buildVaultIndex } from '../vaultIndex';
import { PKMResolver } from '../resolver';
import { Note } from '../../types';

export function runResolverTests(): { passed: number; failed: number; errors: string[] } {
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

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Architecture Overview',
      content: `
# Core Systems
Details about systems.

# Data Storage
Details about storage. ^storage-block-1
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['arch'],
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
      id: 'note-2',
      title: 'Database Guide',
      content: `---
aliases: [DB Handbook, Storage Docs]
---
# Getting Started
Link to [[Architecture Overview#Data Storage]]
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['db'],
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
      id: 'note-dup-a',
      title: 'Meeting Notes',
      content: 'Meeting with team A',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
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
      id: 'note-dup-b',
      title: 'Meeting Notes',
      content: 'Meeting with team B',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
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

  const vaultIndex = buildVaultIndex(sampleNotes);

  // 1. Direct ID resolution
  {
    const res = PKMResolver.resolveLink('note:note-1', vaultIndex);
    assert(res.status === 'resolved', 'Direct note:id resolves');
    assert(res.resolvedNoteId === 'note-1', 'Direct note:id resolved correct ID');
  }

  // 2. Exact Title resolution
  {
    const res = PKMResolver.resolveLink('Architecture Overview', vaultIndex);
    assert(res.status === 'resolved', 'Exact title resolves');
    assert(res.resolvedNoteId === 'note-1', 'Exact title resolved correct note');
  }

  // 3. Alias resolution
  {
    const res = PKMResolver.resolveLink('DB Handbook', vaultIndex);
    assert(res.status === 'resolved', 'Alias resolves to note');
    assert(res.resolvedNoteId === 'note-2', 'Alias resolved to correct note ID');
  }

  // 4. Subpath Heading resolution
  {
    const res = PKMResolver.resolveLink('Architecture Overview#Data Storage', vaultIndex);
    assert(res.status === 'resolved', 'Heading link resolves note');
    assert(res.resolvedHeading !== undefined, 'Heading object found');
    assert(res.resolvedHeading?.slug === 'data-storage', 'Heading slug matches');
    assert(res.subpathStatus === 'found', 'Subpath status is found');
  }

  // 5. Subpath Block resolution
  {
    const res = PKMResolver.resolveLink('Architecture Overview#^storage-block-1', vaultIndex);
    assert(res.status === 'resolved', 'Block link resolves note');
    assert(res.resolvedBlock !== undefined, 'Block object found');
    assert(res.resolvedBlock?.id === 'storage-block-1', 'Block ID matches');
    assert(res.subpathStatus === 'found', 'Subpath status is found');
  }

  // 6. Ambiguous Title Resolution (Duplicate Titles)
  {
    const res = PKMResolver.resolveLink('Meeting Notes', vaultIndex);
    assert(res.status === 'ambiguous', 'Duplicate titles are flagged as ambiguous');
    assert(res.candidates !== undefined && res.candidates.length === 2, 'Returns 2 candidate notes');
    assert(res.resolvedNoteId === undefined, 'Does not guess an arbitrary note ID on collision');
  }

  // 7. Missing Link Target
  {
    const res = PKMResolver.resolveLink('Non-existent Note', vaultIndex);
    assert(res.status === 'missing', 'Missing link returns missing status');
  }

  return { passed, failed, errors };
}
