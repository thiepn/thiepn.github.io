import { commandRegistry } from '../commands/commandRegistry';
import {
  getSharedTags,
  getSharedWikilinks,
  formatQuoteSnippet,
  generateComparativeOutline,
} from '../matrix/synthesisMatrixTypes';
import { Note } from '../../types';

export function runFeatureP4SynthesisMatrixTests(): { passed: number; failed: number; errors: string[] } {
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
  const cmd = commandRegistry.getCommand('tools:synthesis-matrix');
  assert(Boolean(cmd), 'tools:synthesis-matrix command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Synthesis Matrix')), 'Command title includes "Synthesis Matrix"');
  assert(cmd?.shortcut === 'Alt+X', 'Command shortcut is Alt+X');
  assert(Boolean(cmd?.keywords.includes('compare')), 'Keywords include compare');
  assert(Boolean(cmd?.keywords.includes('p4')), 'Keywords include p4');

  // Helper to create mock notes
  const createMockNote = (partial: Partial<Note> & { id: string; title: string }): Note => ({
    id: partial.id,
    title: partial.title,
    content: partial.content || '',
    type: 'text',
    color: 'default',
    folderId: null,
    tags: partial.tags || [],
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

  const noteA = createMockNote({
    id: 'n-a',
    title: 'Paper A: Cognitive Load in UI',
    content: 'Interfaces must respect [[Working Memory Limits]] and [[Attention Economy]]. High density causes friction.',
    tags: ['ui', 'psychology', 'design'],
  });

  const noteB = createMockNote({
    id: 'n-b',
    title: 'Paper B: Information Scent & Ergonomics',
    content: 'Navigation cues must maintain [[Working Memory Limits]] for effortless retrieval. Density is secondary to clarity.',
    tags: ['ux', 'psychology', 'ergonomics'],
  });

  const noteC = createMockNote({
    id: 'n-c',
    title: 'Paper C: Minimalist Tooling',
    content: 'Eliminate bloat. Less is always better.',
    tags: ['minimalism', 'design'],
  });

  // Gate 2: Shared Tags Detection
  const sharedTagsAB = getSharedTags([noteA, noteB]);
  assert(sharedTagsAB.includes('psychology'), 'Identifies shared "psychology" tag between A & B');
  assert(!sharedTagsAB.includes('ui'), 'Excludes single-note tag "ui"');

  const sharedTagsABC = getSharedTags([noteA, noteB, noteC]);
  assert(sharedTagsABC.includes('design'), 'Identifies shared "design" tag present in A & C');

  // Gate 3: Shared Wikilinks Detection
  const sharedLinks = getSharedWikilinks([noteA, noteB]);
  assert(sharedLinks.some((l) => l.toLowerCase() === 'working memory limits'), 'Identifies shared [[Working Memory Limits]] wikilink');
  assert(!sharedLinks.some((l) => l.toLowerCase() === 'attention economy'), 'Excludes non-shared wikilink [[Attention Economy]]');

  // Gate 4: Quote Snippet Formatting with Backlink
  const snippet = formatQuoteSnippet('Paper A: Cognitive Load in UI', 'Interfaces must respect working memory.');
  assert(snippet.includes('> Interfaces must respect working memory.'), 'Formats quote with markdown blockquote prefix');
  assert(snippet.includes('> — *from [[Paper A: Cognitive Load in UI]]*'), 'Attaches accurate source attribution backlink');

  // Gate 5: Structured Synthesis Draft Outlines
  const tradeoffDraft = generateComparativeOutline([noteA, noteB], 'tradeoff');
  assert(tradeoffDraft.includes('Trade-off Analysis & Decision Matrix'), 'Generates tradeoff title');
  assert(tradeoffDraft.includes('| Criteria | Paper A: Cognitive Load in UI | Paper B: Information Scent & Ergonomics |'), 'Generates side-by-side markdown comparison table');

  const literatureDraft = generateComparativeOutline([noteA, noteB], 'literature');
  assert(literatureDraft.includes('Literature Comparative Synthesis'), 'Generates literature synthesis draft');
  assert(literatureDraft.includes('Points of Concordance'), 'Includes points of agreement section');

  const defaultSynthesis = generateComparativeOutline([noteA, noteB], 'synthesis');
  assert(defaultSynthesis.includes('Multi-Note Synthesis & Conceptual Integration'), 'Generates standard unified synthesis draft');
  assert(defaultSynthesis.includes('[[Paper A: Cognitive Load in UI]], [[Paper B: Information Scent & Ergonomics]]'), 'Includes source links in header');

  return { passed, failed, errors };
}
