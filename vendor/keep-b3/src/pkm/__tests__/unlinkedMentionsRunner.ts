import {
  findUnlinkedMentions,
  formatWikiLinkReplacement,
  replaceSingleOccurrence,
  replaceOccurrences,
} from '../unlinkedMentions';
import { buildVaultIndex } from '../vaultIndex';
import { applyIncrementalNoteUpdate } from '../vaultIndex';
import { Note } from '../../types';

export function runUnlinkedMentionsTests(): { passed: number; failed: number; errors: string[] } {
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
      title: 'Machine Learning',
      content: 'Core note about artificial intelligence algorithms.',
      type: 'text',
      checklist: [],
      tags: ['ai'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      reminderDate: null,
      images: [],
    },
    {
      id: 'note-2',
      title: 'Neural Networks',
      content: '---\naliases:\n  - Deep Learning\n  - ANN\n---\nOverview of neural layers.',
      type: 'text',
      checklist: [],
      tags: ['ai'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      reminderDate: null,
      images: [],
    },
    {
      id: 'note-3',
      title: 'TypeScript',
      content: 'A strongly typed programming language that builds on JavaScript.',
      type: 'text',
      checklist: [],
      tags: ['code'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      reminderDate: null,
      images: [],
    },
    {
      id: 'note-4',
      title: 'The',
      content: 'Common stopword title to test filtering.',
      type: 'text',
      checklist: [],
      tags: [],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      reminderDate: null,
      images: [],
    },
  ];

  let vaultIndex = buildVaultIndex(sampleNotes);

  // 1. Detects exact note title in prose
  {
    const text = 'Today we started exploring Machine Learning for classification.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    assert(candidates.length === 1, '1. Detects exact note title count');
    assert(candidates[0]?.targetNoteId === 'note-1', '1. Target note ID matches');
    assert(candidates[0]?.targetTitle === 'Machine Learning', '1. Target title matches');
    assert(candidates[0]?.occurrences.length === 1, '1. Single occurrence found');
    assert(candidates[0]?.occurrences[0].matchedText === 'Machine Learning', '1. Matched text correct');
  }

  // 2. Detects configured aliases (e.g. Deep Learning, ANN)
  {
    const text = 'We applied Deep Learning and ANN techniques to train the models.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    const nnCandidates = candidates.filter((c) => c.targetNoteId === 'note-2');
    assert(nnCandidates.length === 2, '2. Matches both aliases for note-2');
    const dl = nnCandidates.find((c) => c.matchedTerm === 'Deep Learning');
    assert(dl !== undefined && dl.occurrences[0].matchedText === 'Deep Learning', '2. Deep Learning alias matches');
    const ann = nnCandidates.find((c) => c.matchedTerm === 'ANN');
    assert(ann !== undefined && ann.occurrences[0].matchedText === 'ANN', '2. ANN alias matches');
  }

  // 3. Handles case differences and preserves original text
  {
    const text = 'Recent breakthroughs in machine learning have been remarkable.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    assert(candidates.length === 1, '3. Matches lowercased machine learning');
    assert(candidates[0]?.targetTitle === 'Machine Learning', '3. Target title preserved');
    assert(candidates[0]?.occurrences[0].matchedText === 'machine learning', '3. Matched text casing preserved');

    const rep = formatWikiLinkReplacement(
      candidates[0].targetTitle,
      candidates[0].occurrences[0].matchedText
    );
    assert(rep === '[[Machine Learning|machine learning]]', '3. Replacement format handles case alias');
  }

  // 4. Excludes code blocks and inline code
  {
    const text = `
Here is prose about TypeScript.
\`\`\`ts
import { Machine Learning } from 'ai';
console.log("Deep Learning in code");
\`\`\`
Also check \`machine learning\` in backticks.
Outside code: Machine Learning is great.
`;
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    const ml = candidates.find((c) => c.targetTitle === 'Machine Learning');
    assert(ml !== undefined && ml.occurrences.length === 1, '4. Code block and inline code occurrences ignored');
    assert(ml?.occurrences[0].line === 7, '4. Occurrence line is outside code');
  }

  // 5. Excludes existing [[WikiLinks]] and ![[Embeds]]
  {
    const text = 'We already linked [[Machine Learning]] and embedded ![[Neural Networks]], but mentioned TypeScript here.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    assert(candidates.length === 1, '5. Existing wiki links and embeds excluded');
    assert(candidates[0]?.targetTitle === 'TypeScript', '5. Only unlinked TypeScript detected');
  }

  // 6. Excludes current note itself (self-mentions)
  {
    const text = 'This is the note on Machine Learning discussing Machine Learning principles.';
    const candidates = findUnlinkedMentions(text, 'note-1', vaultIndex);
    assert(candidates.length === 0, '6. Self-mentions excluded');
  }

  // 7. Excludes file extensions and substring false positives
  {
    const text = 'Download machinelearning.js or script_typescript.ts or MachineLearningApp.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    assert(candidates.length === 0, '7. File extensions and attached alphanumeric substrings excluded');
  }

  // 8. Safeguards short/common stopwords from noisy matching
  {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    const theCandidate = candidates.find((c) => c.targetTitle === 'The');
    assert(theCandidate === undefined, '8. Common stop words like "The" suppressed');
  }

  // 9. Finds multiple occurrences in one note
  {
    const text = 'First Machine Learning concept. Later we review Machine Learning benchmarks.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    assert(candidates.length === 1 && candidates[0].occurrences.length === 2, '9. Multiple occurrences discovered');
  }

  // 10. Safely links a single occurrence
  {
    const text = 'Learning Machine Learning is fun.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    const { newContent } = replaceSingleOccurrence(
      text,
      candidates[0].occurrences[0],
      candidates[0].targetTitle
    );
    assert(newContent === 'Learning [[Machine Learning]] is fun.', '10. Single occurrence replacement matches');
  }

  // 11. Safely links all safe occurrences in one pass without offset corruption
  {
    const text = 'Intro to machine learning. Then more Machine Learning later on.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex);
    const allOccurrences = candidates[0].occurrences.map((occ) => ({
      occurrence: occ,
      targetTitle: candidates[0].targetTitle,
    }));
    const result = replaceOccurrences(text, allOccurrences);
    assert(
      result === 'Intro to [[Machine Learning|machine learning]]. Then more [[Machine Learning]] later on.',
      '11. Multi-occurrence atomic replacement maintains character integrity'
    );
  }

  // 12. Supports user-dismissed / ignored terms
  {
    const text = 'We love TypeScript and Machine Learning.';
    const candidates = findUnlinkedMentions(text, 'note-99', vaultIndex, {
      ignoredTerms: ['typescript'],
    });
    assert(candidates.length === 1 && candidates[0].targetTitle === 'Machine Learning', '12. Ignored terms respected');
  }

  // 13. Dynamic update when notes are renamed or deleted in index
  {
    const notesMap = new Map<string, Note>();
    sampleNotes.forEach((n) => notesMap.set(n.id, n));

    // Note renamed from "Machine Learning" -> "Advanced ML"
    const renamedNote: Note = {
      ...sampleNotes[0],
      title: 'Advanced ML',
    };
    notesMap.set(renamedNote.id, renamedNote);
    const updatedIndex = applyIncrementalNoteUpdate(renamedNote, renamedNote.id, vaultIndex, notesMap);

    const oldText = 'Studying Machine Learning today.';
    const newText = 'Studying Advanced ML today.';

    const oldMatches = findUnlinkedMentions(oldText, 'note-99', updatedIndex);
    assert(oldMatches.length === 0, '13. Old title no longer matches after rename');

    const newMatches = findUnlinkedMentions(newText, 'note-99', updatedIndex);
    assert(newMatches.length === 1 && newMatches[0].targetTitle === 'Advanced ML', '13. New title matches after rename');
  }

  return { passed, failed, errors };
}
