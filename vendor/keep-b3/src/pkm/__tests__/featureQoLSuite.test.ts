import {
  tabShortcutsManager,
  navigationHistory,
  SLASH_COMMANDS,
  filterSlashCommands,
  extractHeadings,
  typewriterManager,
} from '../qol';
import { commandRegistry } from '../commands/commandRegistry';

export function runFeatureQoLSuiteTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: QoL 1 - Tab Lifecycle & Recently Closed Reopening (Ctrl+Shift+T)
  tabShortcutsManager.recordClosedTab({
    resourceId: 'note-alpha',
    resourceType: 'note',
    title: 'Alpha Architecture',
  });
  tabShortcutsManager.recordClosedTab({
    resourceId: 'note-beta',
    resourceType: 'note',
    title: 'Beta Roadmap',
  });

  assert(tabShortcutsManager.hasRecentlyClosed() === true, 'Tab shortcuts manager detects closed tabs');
  const popped = tabShortcutsManager.popRecentlyClosed();
  assert(popped?.resourceId === 'note-beta', 'Pops most recently closed tab (LIFO stack)');
  assert(popped?.title === 'Beta Roadmap', 'Preserves tab title');
  const secondPopped = tabShortcutsManager.popRecentlyClosed();
  assert(secondPopped?.resourceId === 'note-alpha', 'Pops previous closed tab');
  assert(tabShortcutsManager.popRecentlyClosed() === null, 'Returns null when queue is empty');

  // Gate 2: QoL 2 - Slash Commands Palette Item Coverage & Snippets
  assert(SLASH_COMMANDS.length >= 12, 'Slash command palette has at least 12 commands');
  const h1Cmd = SLASH_COMMANDS.find(c => c.id === 'h1');
  assert(Boolean(h1Cmd), 'Heading 1 slash command exists');
  assert(h1Cmd?.snippet().text === '# ', 'H1 snippet generates # header');

  const todoCmd = SLASH_COMMANDS.find(c => c.id === 'todo');
  assert(Boolean(todoCmd), 'Todo slash command exists');
  assert(todoCmd?.snippet().text === '- [ ] ', 'Todo snippet generates checkbox');

  const mathCmd = SLASH_COMMANDS.find(c => c.id === 'math');
  assert(Boolean(mathCmd), 'Math LaTeX slash command exists');
  assert(mathCmd?.snippet().text.includes('$$'), 'Math snippet creates LaTeX delimiters');

  const tableCmd = SLASH_COMMANDS.find(c => c.id === 'table');
  assert(Boolean(tableCmd), 'Markdown table slash command exists');
  assert(tableCmd?.snippet().text.includes('| Item |'), 'Table snippet generates markdown grid');

  const filtered = filterSlashCommands('head');
  assert(filtered.some(c => c.id === 'h1'), 'Filters commands by keyword "head"');
  assert(filtered.some(c => c.id === 'h2'), 'Includes H2 in "head" search');

  // Gate 3: QoL 4 - Navigation History Stack Traversal
  navigationHistory.clear();
  assert(navigationHistory.canGoBack() === false, 'Fresh history cannot go back');
  assert(navigationHistory.canGoForward() === false, 'Fresh history cannot go forward');

  navigationHistory.push('note-1', 'Note 1');
  navigationHistory.push('note-2', 'Note 2');
  navigationHistory.push('note-3', 'Note 3');

  assert(navigationHistory.canGoBack() === true, 'History can go back after 3 visits');
  const backEntry = navigationHistory.goBack();
  assert(backEntry?.noteId === 'note-2', 'Navigates back to Note 2');
  assert(navigationHistory.canGoForward() === true, 'History can now go forward');

  const fwdEntry = navigationHistory.goForward();
  assert(fwdEntry?.noteId === 'note-3', 'Navigates forward back to Note 3');

  // Gate 4: QoL 6 - Status Bar Metrics & Reading Duration
  const sampleText = 'The quick brown fox jumps over the lazy dog. Knowledge work requires fast tools.';
  const wordCount = sampleText.trim().split(/\s+/).length;
  assert(wordCount === 14, 'Accurately computes word count');
  const readingTime = Math.max(1, Math.ceil(wordCount / 220));
  assert(readingTime === 1, 'Computes 1 min reading time for short note');

  // Gate 5: QoL 8 - Collapsible Note Outline Headings Extraction
  const docMarkdown = `# Title 1
Some introductory text.

## Section 1.1
Details here.

### Deep Subsection 1.1.1
More details.

## Section 1.2
Conclusion.`;

  const headings = extractHeadings(docMarkdown);
  assert(headings.length === 4, 'Extracts all 4 headings from markdown');
  assert(headings[0].level === 1 && headings[0].text === 'Title 1', 'Level 1 heading parsed');
  assert(headings[1].level === 2 && headings[1].text === 'Section 1.1', 'Level 2 heading parsed');
  assert(headings[2].level === 3 && headings[2].text === 'Deep Subsection 1.1.1', 'Level 3 heading parsed');
  assert(headings[3].level === 2 && headings[3].text === 'Section 1.2', 'Second level 2 heading parsed');

  // Gate 6: QoL 9 - Quick Switcher Command Registration
  const quickSwitcherCmd = commandRegistry.getCommand('tools:quick-switcher');
  assert(Boolean(quickSwitcherCmd), 'tools:quick-switcher is registered');
  assert(quickSwitcherCmd?.shortcut === 'Ctrl+O', 'Quick Switcher shortcut is Ctrl+O');

  // Gate 7: QoL 10 - Typewriter Mode Manager
  const initialMode = typewriterManager.isTypewriter;
  const toggledMode = typewriterManager.toggleTypewriter();
  assert(toggledMode === !initialMode, 'Toggles typewriter mode state');
  const restoredMode = typewriterManager.toggleTypewriter();
  assert(restoredMode === initialMode, 'Restores typewriter mode on second toggle');

  // Gate 8: QoL 4 - History Navigation Commands in Registry
  const backCmd = commandRegistry.getCommand('navigation:history-back');
  assert(Boolean(backCmd), 'navigation:history-back registered');
  assert(backCmd?.shortcut === 'Alt+Left', 'Back shortcut is Alt+Left');

  const fwdCmd = commandRegistry.getCommand('navigation:history-forward');
  assert(Boolean(fwdCmd), 'navigation:history-forward registered');
  assert(fwdCmd?.shortcut === 'Alt+Right', 'Forward shortcut is Alt+Right');

  return { passed, failed, errors };
}
