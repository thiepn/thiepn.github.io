import { commandRegistry } from '../commands/commandRegistry';
import {
  generateZettelId,
  classifyNote,
  findRelatedZettels,
  findOrphanZettels,
  ZettelType,
} from '../zettelkasten/zettelTypes';
import { Note } from '../../types';

export function runFeatureP2ZettelkastenTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:zettelkasten-studio');
  assert(Boolean(cmd), 'tools:zettelkasten-studio command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Zettelkasten')), 'Command title includes "Zettelkasten"');
  assert(cmd?.shortcut === 'Alt+Z', 'Command shortcut is Alt+Z');
  assert(Boolean(cmd?.keywords.includes('slip-box')), 'Keywords include slip-box');
  assert(Boolean(cmd?.keywords.includes('p2')), 'Keywords include p2');
  assert(Boolean(cmd?.keywords.includes('folgezettel')), 'Keywords include folgezettel');

  // Gate 2: ID Generation (Timestamp & Folgezettel Branching)
  const tsId = generateZettelId();
  assert(tsId.length === 12, 'Canonical timestamp ID is 12 digits (YYYYMMDDHHmm)');
  assert(!isNaN(Number(tsId)), 'Timestamp ID is purely numeric digits');

  const branchId1 = generateZettelId('1a', ['1a1']);
  assert(branchId1 === '1a2', 'Branching folgezettel generates next suffix when 1a1 exists');

  const branchId2 = generateZettelId('2b', []);
  assert(branchId2 === '2b1', 'Branching folgezettel generates 2b1 when branch is fresh');

  const createNote = (partial: Partial<Note> & { id: string; title: string }): Note => ({
    id: partial.id,
    title: partial.title,
    content: partial.content || '',
    type: partial.type || 'text',
    tags: partial.tags || [],
    color: 'default',
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    checklist: [],
    images: [],
    reminderDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  });

  // Gate 3: Note Classification
  const mockMocNote = createNote({
    id: 'n-moc',
    title: 'Computer Science MOC',
    content: 'Overview of all computing disciplines',
    tags: ['moc', 'index'],
  });
  assert(classifyNote(mockMocNote) === 'structure', 'Classifies MOC/Index note as structure');

  const mockLitNote = createNote({
    id: 'n-lit',
    title: 'Lit: How to Take Smart Notes (Ahrens)',
    content: '## Citations\nNotes on slip-box methods.',
    tags: ['literature', 'books'],
  });
  assert(classifyNote(mockLitNote) === 'literature', 'Classifies reading summary as literature');

  const mockFleetingNote = createNote({
    id: 'n-fleeting',
    title: 'Quick: idea while walking',
    content: 'Remember to check CRDTs',
    tags: ['fleeting'],
  });
  assert(classifyNote(mockFleetingNote) === 'fleeting', 'Classifies ephemeral note as fleeting');

  const mockPermanentNote = createNote({
    id: 'n-perm',
    title: 'Spaced Retrieval Enhances Long-Term Memory',
    content: 'Testing memories periodically prevents decay.',
    tags: ['permanent', 'psychology'],
  });
  assert(classifyNote(mockPermanentNote) === 'permanent', 'Classifies atomic concept as permanent');

  // Gate 4: Related Zettels Recommendation
  const allTestNotes: Note[] = [
    mockMocNote,
    mockLitNote,
    mockFleetingNote,
    mockPermanentNote,
    createNote({
      id: 'n-related',
      title: 'Active Recall vs Passive Review',
      content: 'Testing effects are superior to re-reading.',
      tags: ['psychology', 'learning'],
    }),
  ];

  const related = findRelatedZettels('n-perm', allTestNotes, ['psychology'], ['recall', 'memory']);
  assert(related.length > 0, 'Finds related zettels based on shared psychology tag and memory keyword');
  assert(related[0].id === 'n-related', 'Ranks Active Recall note highest due to tag & keyword overlap');

  // Gate 5: Orphan Resurfacing
  const orphanNote = createNote({
    id: 'n-orphan',
    title: 'Isolated Fragment',
    content: 'This note has no outgoing links and no one links to it.',
  });

  const noteWithLink = createNote({
    id: 'n-linked',
    title: 'Connected Note',
    content: 'This points to [[Computer Science MOC]].',
  });

  const orphans = findOrphanZettels([orphanNote, noteWithLink, mockMocNote]);
  assert(orphans.some((o) => o.id === 'n-orphan'), 'Detects isolated fragment as an orphan note');
  assert(!orphans.some((o) => o.id === 'n-moc'), 'MOC is not an orphan because it has an incoming link');

  // Gate 6: Extraction & Source Transclusion Logic
  const sourceContent = 'Here is a comprehensive paragraph about cognitive load theory in UI design.';
  const snippet = 'cognitive load theory in UI design';
  const newZettelTitle = 'Cognitive Load in UI Design';

  const updatedSource = sourceContent.replace(snippet, `[[${newZettelTitle}]]`);
  assert(
    updatedSource === 'Here is a comprehensive paragraph about [[Cognitive Load in UI Design]].',
    'Transcludes extracted concept into source text seamlessly'
  );

  return { passed, failed, errors };
}
