import { commandRegistry } from '../commands/commandRegistry';
import { extractCardsFromNote } from '../review/cardParser';
import { calculateRetrievability, SCHEDULER_VERSION } from '../review/fsrsEngine';
import { Note } from '../../types';

export function runFeatureP8ActiveRecallStudioTests(): { passed: number; failed: number; errors: string[] } {
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
  const cmd = commandRegistry.getCommand('tools:flashcard-review');
  assert(Boolean(cmd), 'tools:flashcard-review command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Active Recall Studio')), 'Command title includes "Active Recall Studio"');
  assert(cmd?.shortcut === 'Alt+F', 'Command shortcut is Alt+F');
  assert(Boolean(cmd?.keywords.includes('cloze')), 'Keywords include cloze');
  assert(Boolean(cmd?.keywords.includes('p8')), 'Keywords include p8');

  // Helper note builder
  const createMockNote = (content: string): Note => ({
    id: 'note-srs-1',
    title: 'Cognitive Science & Memory Systems',
    content,
    type: 'text',
    color: 'amber',
    folderId: null,
    tags: ['cognition', 'neuroscience'],
    isFavorite: false,
    pinned: false,
    archived: false,
    trashed: false,
    checklist: [],
    images: [],
    reminderDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Gate 2: Q&A Flashcard Extraction
  const noteWithQa = createMockNote(`
# Working Memory Notes

**Q:** What is the average span of working memory?
**A:** Approximately 4 ± 1 chunks of information according to Cowan (2001).
^card-cowan-span
`);
  const cardsQa = extractCardsFromNote(noteWithQa);
  assert(cardsQa.length >= 1, 'Extracts Q&A card from markdown note');
  assert(
    cardsQa[0].prompt.includes('What is the average span of working memory?'),
    'Extracts accurate question prompt'
  );
  assert(
    cardsQa[0].answer.includes('4 ± 1 chunks'),
    'Extracts accurate answer'
  );
  assert(cardsQa[0].type === 'question-answer', 'Card type is question-answer');

  // Gate 3: Cloze Deletion Extraction
  const noteWithCloze = createMockNote(`
Long-term potentiation requires {{c1::NMDA receptor activation::receptor type}} for synaptic plasticity.
`);
  const cardsCloze = extractCardsFromNote(noteWithCloze);
  assert(cardsCloze.length >= 1, 'Extracts cloze deletion card from note');
  assert(cardsCloze[0].type === 'cloze', 'Card type is cloze');
  assert(cardsCloze[0].answer === 'NMDA receptor activation', 'Cloze answer is extracted cleanly');
  assert(cardsCloze[0].clozeHint === 'receptor type', 'Cloze hint is preserved');
  assert(cardsCloze[0].prompt.includes('[...'), 'Prompt has masked blank placeholder');

  // Gate 4: Definition Extraction
  const noteWithDef = createMockNote(`
- Anterograde Amnesia ::: Inability to create new memories after the causal event.
`);
  const cardsDef = extractCardsFromNote(noteWithDef);
  assert(cardsDef.length >= 1, 'Extracts definition card');
  assert(cardsDef[0].answer.includes('Inability to create new memories'), 'Extracts definition answer');

  // Gate 5: FSRS-4.5 Retrievability Calculation
  assert(SCHEDULER_VERSION === 'FSRS-4.5', 'Uses deterministic FSRS-4.5 algorithm');
  const retImmediate = calculateRetrievability(0, 10);
  assert(retImmediate === 1.0, 'Retrievability at day 0 is exactly 1.0 (100%)');

  const retHalf = calculateRetrievability(10, 10);
  assert(retHalf > 0.6 && retHalf < 0.95, 'Retrievability decays reasonably at elapsed == stability');

  const retFar = calculateRetrievability(100, 10);
  assert(retFar < retHalf, 'Retrievability decays monotonically over time');

  return { passed, failed, errors };
}
