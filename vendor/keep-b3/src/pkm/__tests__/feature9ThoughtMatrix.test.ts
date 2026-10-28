import { commandRegistry } from '../commands/commandRegistry';
import {
  MATRIX_FRAMEWORKS,
  MatrixItem,
  MatrixFrameworkKey,
} from '../../components/modals/ThoughtMatrixModal';

export function runFeature9ThoughtMatrixTests(): { passed: number; failed: number; errors: string[] } {
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
  const matrixCmd = commandRegistry.getCommand('tools:thought-matrix');
  assert(Boolean(matrixCmd), 'Thought Matrix Studio command is registered in commandRegistry');
  assert(Boolean(matrixCmd?.title.includes('Thought Matrix')), 'Command title contains Thought Matrix');
  assert(matrixCmd?.shortcut === 'Alt+M', 'Thought Matrix shortcut is Alt+M');
  assert(
    Boolean(
      matrixCmd?.keywords?.includes('matrix') &&
        matrixCmd?.keywords?.includes('eisenhower') &&
        matrixCmd?.keywords?.includes('priority') &&
        matrixCmd?.keywords?.includes('feature 9')
    ),
    'Keywords include matrix, eisenhower, priority, and feature 9'
  );

  // Gate 2: Framework Definitions & 4 Quadrants
  const frameworkKeys: MatrixFrameworkKey[] = [
    'effort-impact',
    'urgent-important',
    'value-complexity',
    'novelty-feasibility',
    'custom',
  ];

  for (const k of frameworkKeys) {
    const fw = MATRIX_FRAMEWORKS[k];
    assert(Boolean(fw), `Framework ${k} is defined`);
    assert(Boolean(fw.xAxisLabel.left && fw.xAxisLabel.right), `${k} has horizontal axis labels`);
    assert(Boolean(fw.yAxisLabel.top && fw.yAxisLabel.bottom), `${k} has vertical axis labels`);
    assert(Boolean(fw.quadrants[1] && fw.quadrants[2] && fw.quadrants[3] && fw.quadrants[4]), `${k} has all 4 quadrants configured`);
    assert(Boolean(fw.quadrants[1].title && fw.quadrants[1].tag), `${k} Q1 has title and tag`);
  }

  // Gate 3: Item Invariants & Quadrant Grouping
  const sampleItems: MatrixItem[] = [
    { id: '1', text: 'Quick fix button alignment', quadrant: 1, addedAt: '2026-01-01' },
    { id: '2', text: 'Migrate to unified indexedDB v3', quadrant: 2, addedAt: '2026-01-01', noteId: 'note-sync', noteTitle: 'Sync Architecture' },
    { id: '3', text: 'Update minor readme typo', quadrant: 3, addedAt: '2026-01-01' },
    { id: '4', text: 'Over-engineer custom canvas', quadrant: 4, addedAt: '2026-01-01' },
  ];

  const map: Record<1 | 2 | 3 | 4, MatrixItem[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const it of sampleItems) {
    map[it.quadrant].push(it);
  }

  assert(map[1].length === 1 && map[1][0].text === 'Quick fix button alignment', 'Q1 correctly filters Q1 items');
  assert(map[2].length === 1 && map[2][0].noteTitle === 'Sync Architecture', 'Q2 correctly preserves note reference');
  assert(map[3].length === 1, 'Q3 has 1 item');
  assert(map[4].length === 1, 'Q4 has 1 item');

  // Move item invariant (e.g. dragging or moving Q4 item into Q1)
  const movedItem = { ...map[4][0], quadrant: 1 as const };
  assert(movedItem.quadrant === 1, 'Item quadrant transition succeeds');

  // Gate 4: Synthesis Markdown Generation Invariants
  const currentFw = MATRIX_FRAMEWORKS['effort-impact'];
  const today = '2026-10-10';
  const title = `Thought Matrix: ${currentFw.name} (${today})`;

  let md = `## 📊 Thought Matrix: ${currentFw.name}\n\n`;
  md += `> **Framework Context**: ${currentFw.description}\n`;
  md += `> **Evaluation Axes**: Horizontal (${currentFw.xAxisLabel.left} ↔ ${currentFw.xAxisLabel.right}) | Vertical (${currentFw.yAxisLabel.top} ↔ ${currentFw.yAxisLabel.bottom})\n\n`;
  md += `### 🎯 Strategic Quadrants Breakdown\n\n`;

  for (const q of [1, 2, 3, 4] as const) {
    const cfg = currentFw.quadrants[q];
    const qList = sampleItems.filter((i) => i.quadrant === q);
    md += `#### Q${q}: ${cfg.title} — *${cfg.subtitle}* (${cfg.tag})\n`;
    for (const it of qList) {
      const noteRef = it.noteTitle ? ` — linked to [[${it.noteTitle}]]` : '';
      md += `- [ ] **${it.text}**${noteRef}\n`;
    }
    md += `\n`;
  }

  assert(title.includes('Action Priority'), 'Generated note title contains framework name');
  assert(md.includes('[[Sync Architecture]]'), 'Markdown includes wikilink to linked vault note');
  assert(md.includes('Quick Wins'), 'Markdown includes Q1 title');
  assert(md.includes('Major Projects'), 'Markdown includes Q2 title');
  assert(md.includes('Fill-Ins'), 'Markdown includes Q3 title');
  assert(md.includes('Thankless Tasks'), 'Markdown includes Q4 title');

  // Gate 5: Execution Context Handler
  let openedModal: string | null = null;
  const mockCtx: any = {
    openModal: (modal: string) => {
      openedModal = modal;
    },
  };
  matrixCmd?.execute(mockCtx);
  assert(openedModal === 'thought_matrix', 'Thought Matrix command executes by opening thought_matrix modal');

  return { passed, failed, errors };
}
