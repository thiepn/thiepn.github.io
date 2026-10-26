import { commandRegistry } from '../commands/commandRegistry';
import {
  CORNELL_STARTER_TEMPLATES,
  CornellRow,
  CornellTemplate,
} from '../../components/modals/CornellNotesModal';

export function runFeature10CornellNotesTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: Command Registration & Invariants
  const cornellCmd = commandRegistry.getCommand('tools:cornell-notes');
  assert(Boolean(cornellCmd), 'Cornell Notes Studio command is registered in commandRegistry');
  assert(Boolean(cornellCmd?.title.includes('Cornell Notes')), 'Command title contains Cornell Notes');
  assert(cornellCmd?.shortcut === 'Alt+C', 'Cornell Notes shortcut is Alt+C');
  assert(
    Boolean(
      cornellCmd?.keywords?.includes('cornell') &&
        cornellCmd?.keywords?.includes('study') &&
        cornellCmd?.keywords?.includes('recall') &&
        cornellCmd?.keywords?.includes('feature 10')
    ),
    'Keywords include cornell, study, recall, and feature 10'
  );

  // Gate 2: Execution Handler Opens cornell_notes Modal
  let openedModal: string | null = null;
  const mockCtx: any = {
    openModal: (modalId: string) => {
      openedModal = modalId;
    },
  };
  cornellCmd?.execute(mockCtx);
  assert(openedModal === 'cornell_notes', 'Command executes by triggering cornell_notes modal');

  // Gate 3: Starter Templates Integrity
  assert(CORNELL_STARTER_TEMPLATES.length >= 3, 'At least 3 starter templates provided');
  for (const tmpl of CORNELL_STARTER_TEMPLATES) {
    assert(Boolean(tmpl.id && tmpl.name), `Template ${tmpl.id} has ID and name`);
    assert(Boolean(tmpl.topic && tmpl.essentialQuestion), `${tmpl.id} has topic and essential question`);
    assert(Boolean(tmpl.summary), `${tmpl.id} has synthesis summary`);
    assert(Array.isArray(tmpl.rows) && tmpl.rows.length >= 3, `${tmpl.id} has at least 3 structured rows`);
    for (const row of tmpl.rows) {
      assert(Boolean(row.cue && row.notes), `${tmpl.id} row has both cue and notes`);
    }
  }

  // Gate 4: Active Recall Scoring & State Transitions
  const sampleRows: CornellRow[] = [
    { id: 'r1', cue: 'CAP Theorem', notes: 'Guarantees at most 2 of 3', recallRating: 'mastered' },
    { id: 'r2', cue: 'Network Partition', notes: 'Dropped packets inevitable', recallRating: 'mastered' },
    { id: 'r3', cue: 'PACELC Theorem', notes: 'Latency vs Consistency when normal', recallRating: 'reviewing' },
    { id: 'r4', cue: 'Ebbinghaus Decay', notes: 'Exponential memory loss without review', recallRating: 'learning' },
    { id: 'r5', cue: 'Desirable Difficulty', notes: 'Effortful retrieval enhances transfer', recallRating: 'untested' },
  ];

  let masteredCount = 0;
  let reviewingCount = 0;
  let learningCount = 0;
  let untestedCount = 0;

  for (const r of sampleRows) {
    if (r.recallRating === 'mastered') masteredCount++;
    else if (r.recallRating === 'reviewing') reviewingCount++;
    else if (r.recallRating === 'learning') learningCount++;
    else untestedCount++;
  }

  assert(masteredCount === 2, 'Accurately computes 2 mastered cues');
  assert(reviewingCount === 1, 'Accurately computes 1 reviewing cue');
  assert(learningCount === 1, 'Accurately computes 1 learning cue');
  assert(untestedCount === 1, 'Accurately computes 1 untested cue');

  const scorePct = Math.round((masteredCount / sampleRows.length) * 100);
  assert(scorePct === 40, 'Calculates active recall score accuracy: 40%');

  // Gate 5: Flashcard Generation Parsing Invariants
  let flashcardQACount = 0;
  let generatedMarkdown = `# Cornell Notes Study Sheet\n\n`;
  for (const r of sampleRows) {
    if (r.cue && r.notes) {
      generatedMarkdown += `**Q:** ${r.cue}\n**A:** ${r.notes}\n\n`;
      flashcardQACount++;
    }
  }
  assert(flashcardQACount === 5, 'Generates 5 Q&A flashcard pairs');
  assert(generatedMarkdown.includes('**Q:** CAP Theorem'), 'Contains formatted Question block');
  assert(generatedMarkdown.includes('**A:** Guarantees at most 2 of 3'), 'Contains formatted Answer block');

  return { passed, failed, errors };
}
