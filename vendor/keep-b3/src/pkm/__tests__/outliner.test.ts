import {
  parseMarkdownSections,
  reorderSection,
  getHeadingBreadcrumb,
  parseNestedListItems,
  FoldStateManager,
} from '../outliner';

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export function runOutlinerTests(): TestResult {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${desc}`);
    }
  }

  function assertEqual(actual: any, expected: any, desc: string) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      passed++;
    } else {
      failed++;
      errors.push(
        `Assertion failed: ${desc}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`
      );
    }
  }

  // Ensure mock localStorage exists if in Node
  const storageMap = new Map<string, string>();
  if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as any).localStorage = {
      getItem: (key: string) => storageMap.get(key) || null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };
  } else {
    localStorage.clear();
  }

  // -------------------------------------------------------------
  // 1. parseMarkdownSections
  // -------------------------------------------------------------
  {
    const md = [
      'Intro preamble',
      '# Introduction', // line 1
      'Some intro body',
      '## Background', // line 3
      'Background details',
      '### Deep Context', // line 5
      'Deep details',
      '## Methodology', // line 7
      'Method details',
      '# Conclusion', // line 9
      'Final thoughts',
    ].join('\n');

    const { tree, flatSections } = parseMarkdownSections(md);

    assertEqual(flatSections.length, 5, 'Total flat sections count');
    assertEqual(tree.length, 2, 'Top level tree sections count');

    const intro = flatSections[0];
    assertEqual(intro.title, 'Introduction', 'Intro title');
    assertEqual(intro.level, 1, 'Intro level');
    assertEqual(intro.startLine, 1, 'Intro start line');
    assertEqual(intro.endLine, 8, 'Intro end line before next H1');
    assertEqual(intro.children.length, 2, 'Intro children count');

    const background = flatSections[1];
    assertEqual(background.title, 'Background', 'Background title');
    assertEqual(background.level, 2, 'Background level');
    assertEqual(background.startLine, 3, 'Background start line');
    assertEqual(background.endLine, 6, 'Background end line before sibling H2');
    assertEqual(background.children.length, 1, 'Background children count');

    const deep = flatSections[2];
    assertEqual(deep.title, 'Deep Context', 'Deep context title');
    assertEqual(deep.level, 3, 'Deep context level');
    assertEqual(deep.startLine, 5, 'Deep context start line');
    assertEqual(deep.endLine, 6, 'Deep context end line');

    const methodology = flatSections[3];
    assertEqual(methodology.title, 'Methodology', 'Methodology title');
    assertEqual(methodology.level, 2, 'Methodology level');
    assertEqual(methodology.startLine, 7, 'Methodology start line');
    assertEqual(methodology.endLine, 8, 'Methodology end line');

    const conclusion = flatSections[4];
    assertEqual(conclusion.title, 'Conclusion', 'Conclusion title');
    assertEqual(conclusion.level, 1, 'Conclusion level');
    assertEqual(conclusion.startLine, 9, 'Conclusion start line');
    assertEqual(conclusion.endLine, 10, 'Conclusion end line');
  }

  // -------------------------------------------------------------
  // 2. Consecutive Headings & Empty Sections
  // -------------------------------------------------------------
  {
    const md = [
      '# Heading 1',
      '## Subheading 1.1',
      '### Subheading 1.1.1',
      '# Heading 2',
    ].join('\n');

    const { flatSections, tree } = parseMarkdownSections(md);
    assertEqual(flatSections.length, 4, 'Consecutive flat sections count');
    assertEqual(tree.length, 2, 'Consecutive tree roots count');

    assertEqual(flatSections[0].startLine, 0, 'H1 start');
    assertEqual(flatSections[0].endLine, 2, 'H1 end');
    assertEqual(flatSections[1].startLine, 1, 'H2 start');
    assertEqual(flatSections[1].endLine, 2, 'H2 end');
    assertEqual(flatSections[2].startLine, 2, 'H3 start');
    assertEqual(flatSections[2].endLine, 2, 'H3 end');
    assertEqual(flatSections[3].startLine, 3, 'H2 next start');
    assertEqual(flatSections[3].endLine, 3, 'H2 next end');
  }

  // -------------------------------------------------------------
  // 3. Ignore Headings in Code Blocks & Frontmatter
  // -------------------------------------------------------------
  {
    const md = [
      '---',
      'title: Note with # in YAML',
      '# fake yaml heading',
      '---',
      '# Real Heading',
      'Body paragraph',
      '```markdown',
      '# Fenced Fake Heading 1',
      '## Fenced Fake Heading 2',
      '```',
      '## Real Subheading',
      'Sub body',
    ].join('\n');

    const { flatSections } = parseMarkdownSections(md);
    assertEqual(flatSections.length, 2, 'Ignores fake headings in code blocks & yaml');
    assertEqual(flatSections[0].title, 'Real Heading', 'Matches real H1');
    assertEqual(flatSections[1].title, 'Real Subheading', 'Matches real H2');
  }

  // -------------------------------------------------------------
  // 4. Clean Trailing Block IDs from Heading Titles
  // -------------------------------------------------------------
  {
    const md = '# Main Architecture ^arch-heading\nSome body';
    const { flatSections } = parseMarkdownSections(md);
    assertEqual(flatSections[0].title, 'Main Architecture', 'Strips block ID from heading title');
    assertEqual(flatSections[0].slug, 'main-architecture', 'Generates clean slug without block ID');
  }

  // -------------------------------------------------------------
  // 5. reorderSection (Move Parent with Subsections & Body)
  // -------------------------------------------------------------
  {
    const md = [
      '# Section 1',
      'Body 1',
      '## Subsection 1.A',
      'Sub body 1.A',
      '# Section 2',
      'Body 2',
      '# Section 3',
      'Body 3',
    ].join('\n');

    // Move Section 1 (index 0) down after Section 2
    const resultDown = reorderSection(md, 0, 'down');
    const expectedDown = [
      '# Section 2',
      'Body 2',
      '# Section 1',
      'Body 1',
      '## Subsection 1.A',
      'Sub body 1.A',
      '# Section 3',
      'Body 3',
    ].join('\n');
    assertEqual(resultDown, expectedDown, 'Reorder section down with nested children');

    // Move Section 2 up
    const resultUp = reorderSection(resultDown, 0, 'down'); // moves Section 2 back down
    assertEqual(resultUp, md, 'Reorder section back up restores exact original');
  }

  // -------------------------------------------------------------
  // 6. Explicit Index Drag & Drop Reordering
  // -------------------------------------------------------------
  {
    const md = [
      '# Alpha',
      'Alpha body',
      '# Beta',
      'Beta body',
      '# Gamma',
      'Gamma body',
    ].join('\n');

    // Drag Alpha (idx 0) to Gamma (idx 2)
    const dragged = reorderSection(md, 0, 2);
    const expected = [
      '# Beta',
      'Beta body',
      '# Gamma',
      'Gamma body',
      '# Alpha',
      'Alpha body',
    ].join('\n');
    assertEqual(dragged, expected, 'Drag and drop section to target index');
  }

  // -------------------------------------------------------------
  // 7. Preamble Preservation
  // -------------------------------------------------------------
  {
    const md = [
      'Document Header / Preamble',
      'Author: John Doe',
      '',
      '# Alpha',
      'Alpha body',
      '# Beta',
      'Beta body',
    ].join('\n');

    const result = reorderSection(md, 0, 'down');
    const expected = [
      'Document Header / Preamble',
      'Author: John Doe',
      '',
      '# Beta',
      'Beta body',
      '# Alpha',
      'Alpha body',
    ].join('\n');
    assertEqual(result, expected, 'Preamble preserved before first heading');
  }

  // -------------------------------------------------------------
  // 8. Sticky Heading Breadcrumbs
  // -------------------------------------------------------------
  {
    const md = [
      '# Project', // line 0
      'Overview', // line 1
      '## Specs', // line 2
      'Specs body', // line 3
      '### Details', // line 4
      'Deep details cursor here', // line 5
      '## Roadmap', // line 6
      'Roadmap body', // line 7
    ].join('\n');

    // Cursor on line 5 (in ### Details)
    const crumbsAt5 = getHeadingBreadcrumb(md, 5);
    assertEqual(crumbsAt5.length, 3, 'Breadcrumb depth at line 5');
    assertEqual(crumbsAt5.map((c) => c.title), ['Project', 'Specs', 'Details'], 'Breadcrumb titles at line 5');
    assertEqual(crumbsAt5.map((c) => c.level), [1, 2, 3], 'Breadcrumb levels at line 5');

    // Cursor on line 7 (in ## Roadmap)
    const crumbsAt7 = getHeadingBreadcrumb(md, 7);
    assertEqual(crumbsAt7.length, 2, 'Breadcrumb depth at line 7');
    assertEqual(crumbsAt7.map((c) => c.title), ['Project', 'Roadmap'], 'Breadcrumb titles at line 7');

    // Cursor in preamble before any heading
    const crumbsAtPreamble = getHeadingBreadcrumb('Preamble\n# First', 0);
    assertEqual(crumbsAtPreamble.length, 0, 'Breadcrumb in preamble is empty');
  }

  // -------------------------------------------------------------
  // 9. parseNestedListItems (Nested List Folding)
  // -------------------------------------------------------------
  {
    const lines = [
      '- Item 1', // 0
      '  - Child 1.1', // 1
      '  - Child 1.2', // 2
      '    - Grandchild 1.2.1', // 3
      '- Item 2', // 4
      '1. Ordered Step 1', // 5
      '   1. Substep 1.1', // 6
      '2. Ordered Step 2', // 7
    ];

    const listItems = parseNestedListItems(lines);
    assertEqual(listItems.length, 8, 'List items parsed count');

    const item1 = listItems[0];
    assertEqual(item1.hasChildren, true, 'Item 1 hasChildren');
    assertEqual(item1.endLine, 3, 'Item 1 endLine spans all nested children');

    const child12 = listItems[2];
    assertEqual(child12.hasChildren, true, 'Child 1.2 hasChildren');
    assertEqual(child12.endLine, 3, 'Child 1.2 endLine spans grandchild');

    const item2 = listItems[4];
    assertEqual(item2.hasChildren, false, 'Item 2 hasChildren is false');
    assertEqual(item2.endLine, 4, 'Item 2 endLine is own line');

    const ordStep1 = listItems[5];
    assertEqual(ordStep1.hasChildren, true, 'Ordered Step 1 hasChildren');
    assertEqual(ordStep1.endLine, 6, 'Ordered Step 1 endLine');
  }

  // -------------------------------------------------------------
  // 10. FoldStateManager (Persistence, Corrupt Handling & Toggle)
  // -------------------------------------------------------------
  {
    const noteId = 'test-note-fold-123';

    let state = FoldStateManager.loadFoldState(noteId);
    assertEqual(state.foldedHeadingIds.length, 0, 'Initial fold state empty');

    state = FoldStateManager.toggleHeadingFold(noteId, 'h-intro-1', state);
    assert(state.foldedHeadingIds.includes('h-intro-1'), 'Heading fold added');

    // Reload from persistence
    const reloaded = FoldStateManager.loadFoldState(noteId);
    assert(reloaded.foldedHeadingIds.includes('h-intro-1'), 'Heading fold persisted in storage');

    // Toggle off
    state = FoldStateManager.toggleHeadingFold(noteId, 'h-intro-1', state);
    assert(!state.foldedHeadingIds.includes('h-intro-1'), 'Heading fold toggled off');

    // Corrupt JSON storage safety
    localStorage.setItem('pkm_folds_v1_corrupt-note', '{invalid_json_garbage:');
    const safeState = FoldStateManager.loadFoldState('corrupt-note');
    assertEqual(safeState, { foldedHeadingIds: [], foldedListLines: [] }, 'Corrupt JSON handled safely without crash');
  }

  // -------------------------------------------------------------
  // 11. Performance & Scale Stress Testing
  // -------------------------------------------------------------
  {
    const bigDocumentLines: string[] = ['# Huge Document Root'];
    for (let i = 1; i <= 100; i++) {
      bigDocumentLines.push(`## Section ${i}`);
      bigDocumentLines.push(`Paragraph 1 of section ${i}`);
      bigDocumentLines.push(`Paragraph 2 of section ${i}`);
      bigDocumentLines.push(`### Subsection ${i}.1`);
      bigDocumentLines.push(`Details for ${i}.1`);
      bigDocumentLines.push(`- List item A`);
      bigDocumentLines.push(`  - Nested subitem B`);
      bigDocumentLines.push(`- List item C`);
    }

    const bigMarkdown = bigDocumentLines.join('\n');
    const start = performance.now();
    const { flatSections, tree } = parseMarkdownSections(bigMarkdown);
    const crumbs = getHeadingBreadcrumb(bigMarkdown, 450);
    const reordered = reorderSection(bigMarkdown, 2, 'down');
    const elapsed = performance.now() - start;

    assertEqual(flatSections.length, 201, 'Parsed 201 headings across 800+ lines');
    assertEqual(tree.length, 1, 'Single root tree');
    assertEqual(tree[0].children.length, 100, '100 H2 children');
    assert(crumbs.length > 0, 'Calculated breadcrumbs in huge note');
    assert(reordered.length > 0, 'Reordered section in huge note');
    assert(elapsed < 100, `Execution time under 100ms (took ${elapsed.toFixed(2)}ms)`);
  }

  return { passed, failed, errors };
}
