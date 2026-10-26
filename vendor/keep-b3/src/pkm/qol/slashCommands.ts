export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Structure' | 'Formatting' | 'Data & Math' | 'Productivity';
  iconName: string;
  keywords: string[];
  snippet: (context?: { cursorOffset?: number }) => { text: string; cursorOffset?: number };
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Top-level major section header',
    category: 'Structure',
    iconName: 'Heading1',
    keywords: ['h1', 'header', 'title', 'section', '1'],
    snippet: () => ({ text: '# ', cursorOffset: 2 }),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section subheading',
    category: 'Structure',
    iconName: 'Heading2',
    keywords: ['h2', 'header', 'subheading', '2'],
    snippet: () => ({ text: '## ', cursorOffset: 3 }),
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small subsection header',
    category: 'Structure',
    iconName: 'Heading3',
    keywords: ['h3', 'header', 'sub', '3'],
    snippet: () => ({ text: '### ', cursorOffset: 4 }),
  },
  {
    id: 'todo',
    title: 'Task Checkbox',
    description: 'Interactive checklist item',
    category: 'Structure',
    iconName: 'CheckSquare',
    keywords: ['todo', 'task', 'check', 'box', 'action'],
    snippet: () => ({ text: '- [ ] ', cursorOffset: 6 }),
  },
  {
    id: 'bullet',
    title: 'Bullet List',
    description: 'Unordered point item',
    category: 'Structure',
    iconName: 'List',
    keywords: ['bullet', 'list', 'point', 'unordered'],
    snippet: () => ({ text: '- ', cursorOffset: 2 }),
  },
  {
    id: 'numbered',
    title: 'Numbered List',
    description: 'Sequential ordered list',
    category: 'Structure',
    iconName: 'ListOrdered',
    keywords: ['numbered', 'order', 'numeric', '1'],
    snippet: () => ({ text: '1. ', cursorOffset: 3 }),
  },
  {
    id: 'quote',
    title: 'Blockquote / Callout',
    description: 'Emphasized citation or note',
    category: 'Formatting',
    iconName: 'Quote',
    keywords: ['quote', 'callout', 'cite', 'italic'],
    snippet: () => ({ text: '> ', cursorOffset: 2 }),
  },
  {
    id: 'code',
    title: 'Code Fence Block',
    description: 'Monospace syntax highlighting block',
    category: 'Formatting',
    iconName: 'Code',
    keywords: ['code', 'block', 'fence', 'typescript', 'python'],
    snippet: () => ({ text: '```typescript\n\n```', cursorOffset: 14 }),
  },
  {
    id: 'math',
    title: 'LaTeX Math Formula',
    description: 'Mathematical equation block',
    category: 'Data & Math',
    iconName: 'Sigma',
    keywords: ['math', 'latex', 'formula', 'equation', 'sigma'],
    snippet: () => ({ text: '$$\n\n$$', cursorOffset: 3 }),
  },
  {
    id: 'table',
    title: 'Data Table',
    description: '3-column Markdown table grid',
    category: 'Data & Math',
    iconName: 'Table',
    keywords: ['table', 'grid', 'column', 'rows', 'spreadsheet'],
    snippet: () => ({
      text: '| Item | Quantity | Price |\n| :--- | ---: | ---: |\n| Product A | 1 | $10.00 |',
      cursorOffset: 72,
    }),
  },
  {
    id: 'divider',
    title: 'Horizontal Divider',
    description: 'Visual section boundary line',
    category: 'Structure',
    iconName: 'Minus',
    keywords: ['divider', 'line', 'hr', 'separator'],
    snippet: () => ({ text: '\n---\n', cursorOffset: 5 }),
  },
  {
    id: 'today',
    title: 'Today Date Stamp',
    description: 'Current date in YYYY-MM-DD format',
    category: 'Productivity',
    iconName: 'Calendar',
    keywords: ['today', 'date', 'stamp', 'now'],
    snippet: () => {
      const d = new Date().toISOString().slice(0, 10);
      return { text: `**${d}** ` };
    },
  },
  {
    id: 'flashcard-qa',
    title: 'Flashcard Q&A Card',
    description: 'Active recall spaced repetition prompt',
    category: 'Productivity',
    iconName: 'GraduationCap',
    keywords: ['flashcard', 'qa', 'recall', 'anki', 'card'],
    snippet: () => ({ text: 'Q:: Question prompt\nA:: Answer explanation\n', cursorOffset: 4 }),
  },
  {
    id: 'flashcard-cloze',
    title: 'Cloze Deletion Snippet',
    description: 'Fill-in-the-blank {{c1::cloze}} card',
    category: 'Productivity',
    iconName: 'HelpCircle',
    keywords: ['cloze', 'fill', 'blank', 'flashcard'],
    snippet: () => ({ text: '{{c1::Hidden text}}', cursorOffset: 7 }),
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Log Stamp',
    description: 'Interstitial focus work block',
    category: 'Productivity',
    iconName: 'Timer',
    keywords: ['pomodoro', 'focus', 'work', 'session'],
    snippet: () => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { text: `🍅 **[${time}] Focus Sprint:** ` };
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const clean = query.trim().toLowerCase().replace(/^\//, '');
  if (!clean) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter(cmd => {
    if (cmd.title.toLowerCase().includes(clean)) return true;
    if (cmd.description.toLowerCase().includes(clean)) return true;
    return cmd.keywords.some(k => k.toLowerCase().includes(clean));
  });
}
