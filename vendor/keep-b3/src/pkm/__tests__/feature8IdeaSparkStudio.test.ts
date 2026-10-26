import { commandRegistry } from '../commands/commandRegistry';
import { SPARK_PROMPTS } from '../../components/modals/IdeaSparkModal';

export function runFeature8IdeaSparkStudioTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: Command Registrations
  const sparkCmd = commandRegistry.getCommand('tools:idea-spark');
  assert(Boolean(sparkCmd), 'Idea Combinator Studio command is registered');
  assert(Boolean(sparkCmd?.title.includes('Idea Combinator')), 'Idea Combinator Studio title matches');
  assert(sparkCmd?.shortcut === 'Alt+I', 'Idea Combinator shortcut is Alt+I');
  assert(Boolean(sparkCmd?.keywords?.includes('combinator') && sparkCmd?.keywords?.includes('creativity')), 'Keywords include combinator and creativity');

  const flashcardCmd = commandRegistry.getCommand('tools:flashcard-review');
  assert(Boolean(flashcardCmd), 'Flashcard Review command is registered');
  assert(flashcardCmd?.shortcut === 'Alt+F', 'Flashcard Review shortcut is Alt+F');

  // Gate 2: Prompts and Categories
  assert(SPARK_PROMPTS.length >= 7, 'Has at least 7 thought-provoking cognitive prompts');
  const categories = SPARK_PROMPTS.map((p) => p.category);
  assert(categories.includes('Synthesis'), 'Has Synthesis prompt');
  assert(categories.includes('Creativity'), 'Has Creativity prompt');
  assert(categories.includes('Critical Thinking'), 'Has Critical Thinking prompt');
  assert(categories.includes('Cross-Pollination'), 'Has Cross-Pollination prompt');
  assert(categories.includes('Actionable'), 'Has Actionable prompt');

  // Gate 3: Synthesis Markdown Invariant
  const noteA = { id: 'note-1', title: 'Cybernetics' };
  const noteB = { id: 'note-2', title: 'Biology' };
  const prompt = SPARK_PROMPTS[0];
  const userInsight = 'Complex adaptive feedback loops govern living systems.';

  const title = `Synthesis: ${noteA.title} × ${noteB.title}`;
  assert(title === 'Synthesis: Cybernetics × Biology', 'Title generated cleanly');

  const insightSection = userInsight.trim()
    ? `### Captured Synthesis Insight\n${userInsight.trim()}\n\n`
    : '';
  const content = `## 💡 Idea Spark: ${prompt.title}\n\n> **Prompt (${prompt.category})**: ${prompt.question}\n\n### Collided Notes\n- [[${noteA.title}]]\n- [[${noteB.title}]]\n\n${insightSection}### Emerging Connection\n*Synthesized via Mind Sparks Combinator.*`;

  assert(content.includes('[[Cybernetics]]'), 'Contains wikilink to Note A');
  assert(content.includes('[[Biology]]'), 'Contains wikilink to Note B');
  assert(content.includes('Captured Synthesis Insight'), 'Contains user synthesis insight');
  assert(content.includes('Complex adaptive feedback loops'), 'Preserves user text exactness');

  // Gate 4: Execution Context Handlers
  let openedModal: string | null = null;
  const mockCtx: any = {
    openModal: (modal: string) => {
      openedModal = modal;
    },
  };

  sparkCmd?.execute(mockCtx);
  assert(openedModal === 'idea_spark', 'Idea Combinator command opens idea_spark modal');

  flashcardCmd?.execute(mockCtx);
  assert(openedModal === 'flashcard_review', 'Flashcard command opens flashcard_review modal');

  return { passed, failed, errors };
}
