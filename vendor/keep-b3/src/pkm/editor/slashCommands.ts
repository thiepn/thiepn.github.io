import { createCalloutSnippet, CalloutType } from './callouts';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  category: 'structure' | 'callout' | 'pkm' | 'insert' | 'utility';
  icon: string;
  keywords: string[];
  template: (context: SlashCommandContext) => { snippet: string; cursorOffset: number };
  hotkeyHint?: string;
}

export interface SlashCommandContext {
  linePrefix: string;
  currentDateStr: string;
  currentTimeStr: string;
}

/**
 * Checks if the slash menu should be triggered at the current cursor position.
 * Returns true only if:
 * 1. The slash `/` is at the beginning of the line (or only preceded by spaces/tabs)
 * 2. Not inside fenced code block (``` or ~~~)
 * 3. Not inside math block ($$ ... $$) or inline math ($...$)
 * 4. Not in frontmatter (between --- and --- at doc start)
 * 5. Not inside a URL (e.g. https://)
 */
export function isValidSlashTrigger(
  text: string,
  cursorPosition: number
): { isValid: boolean; query: string; slashIndex: number } {
  if (cursorPosition <= 0 || cursorPosition > text.length) {
    return { isValid: false, query: '', slashIndex: -1 };
  }

  // 1. Find line boundaries
  const textBeforeCursor = text.slice(0, cursorPosition);
  const lastNewline = textBeforeCursor.lastIndexOf('\n');
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const currentLineToCursor = textBeforeCursor.slice(lineStart);

  // 2. Check frontmatter
  if (text.startsWith('---')) {
    const secondFence = text.indexOf('\n---', 3);
    if (secondFence !== -1 && cursorPosition <= secondFence + 4) {
      return { isValid: false, query: '', slashIndex: -1 };
    }
  }

  // 3. Check if inside code block
  const linesBefore = textBeforeCursor.split('\n');
  let inCodeFence = false;
  for (let i = 0; i < linesBefore.length - 1; i++) {
    const trimmed = linesBefore[i].trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeFence = !inCodeFence;
    }
  }
  if (inCodeFence) {
    return { isValid: false, query: '', slashIndex: -1 };
  }

  // 4. Check if inside display math block ($$ ... $$)
  let inMathBlock = false;
  for (let i = 0; i < linesBefore.length - 1; i++) {
    const trimmed = linesBefore[i].trim();
    if (trimmed.startsWith('$$') && !trimmed.endsWith('$$', trimmed.length > 2 ? undefined : 2)) {
      inMathBlock = !inMathBlock;
    }
  }
  if (inMathBlock) {
    return { isValid: false, query: '', slashIndex: -1 };
  }

  // 5. Look for slash in current line
  // Must be either at start of line or preceded only by whitespace e.g. "   /command"
  const match = currentLineToCursor.match(/^(\s*)\/([a-zA-Z0-9_-]*)$/);
  if (!match) {
    return { isValid: false, query: '', slashIndex: -1 };
  }

  const indent = match[1];
  const query = match[2];
  const slashIndex = lineStart + indent.length;

  return {
    isValid: true,
    query,
    slashIndex,
  };
}

/**
 * Registry of all available slash commands
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  // Structure Commands
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Top level section heading',
    category: 'structure',
    icon: 'Heading1',
    keywords: ['h1', 'heading', 'title', 'header', 'one', '#'],
    template: () => ({ snippet: '# ', cursorOffset: 2 }),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    category: 'structure',
    icon: 'Heading2',
    keywords: ['h2', 'heading', 'subtitle', 'header', 'two', '##'],
    template: () => ({ snippet: '## ', cursorOffset: 3 }),
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small subsection heading',
    category: 'structure',
    icon: 'Heading3',
    keywords: ['h3', 'heading', 'header', 'three', '###'],
    template: () => ({ snippet: '### ', cursorOffset: 4 }),
  },
  {
    id: 'h4',
    title: 'Heading 4',
    description: 'Compact subsection heading',
    category: 'structure',
    icon: 'Heading4',
    keywords: ['h4', 'heading', 'header', 'four', '####'],
    template: () => ({ snippet: '#### ', cursorOffset: 5 }),
  },
  {
    id: 'bullet',
    title: 'Bullet List',
    description: 'Unordered itemized list',
    category: 'structure',
    icon: 'List',
    keywords: ['bullet', 'list', 'unordered', 'item', '-', '*'],
    template: () => ({ snippet: '- ', cursorOffset: 2 }),
  },
  {
    id: 'number',
    title: 'Numbered List',
    description: 'Ordered sequence list',
    category: 'structure',
    icon: 'ListOrdered',
    keywords: ['number', 'ordered', 'list', '1.', 'sequence'],
    template: () => ({ snippet: '1. ', cursorOffset: 3 }),
  },
  {
    id: 'task',
    title: 'Task Checklist',
    description: 'Interactive checkbox task item',
    category: 'structure',
    icon: 'CheckSquare',
    keywords: ['task', 'todo', 'check', 'checkbox', 'list', '[]'],
    template: () => ({ snippet: '- [ ] ', cursorOffset: 6 }),
  },
  {
    id: 'quote',
    title: 'Blockquote',
    description: 'Indented quote block',
    category: 'structure',
    icon: 'Quote',
    keywords: ['quote', 'blockquote', 'cite', '>'],
    template: () => ({ snippet: '> ', cursorOffset: 2 }),
  },
  {
    id: 'divider',
    title: 'Horizontal Rule',
    description: 'Divider line between sections',
    category: 'structure',
    icon: 'Minus',
    keywords: ['divider', 'rule', 'line', 'separator', 'hr', '---'],
    template: () => ({ snippet: '---\n', cursorOffset: 4 }),
  },

  // Callouts
  {
    id: 'callout-note',
    title: 'Callout: Note',
    description: 'Informational note callout',
    category: 'callout',
    icon: 'Info',
    keywords: ['callout', 'note', 'info', 'box'],
    template: () => createCalloutSnippet('note'),
  },
  {
    id: 'callout-tip',
    title: 'Callout: Tip',
    description: 'Helpful advice or tip',
    category: 'callout',
    icon: 'Lightbulb',
    keywords: ['callout', 'tip', 'hint', 'idea'],
    template: () => createCalloutSnippet('tip'),
  },
  {
    id: 'callout-important',
    title: 'Callout: Important',
    description: 'Crucial requirement or alert',
    category: 'callout',
    icon: 'AlertOctagon',
    keywords: ['callout', 'important', 'notice', 'alert'],
    template: () => createCalloutSnippet('important'),
  },
  {
    id: 'callout-warning',
    title: 'Callout: Warning',
    description: 'Warning or caveat',
    category: 'callout',
    icon: 'AlertTriangle',
    keywords: ['callout', 'warning', 'warn', 'caution'],
    template: () => createCalloutSnippet('warning'),
  },
  {
    id: 'callout-caution',
    title: 'Callout: Caution / Danger',
    description: 'High risk or destructive action warning',
    category: 'callout',
    icon: 'ShieldAlert',
    keywords: ['callout', 'caution', 'danger', 'error', 'stop'],
    template: () => createCalloutSnippet('caution'),
  },
  {
    id: 'callout-success',
    title: 'Callout: Success',
    description: 'Success or completion notice',
    category: 'callout',
    icon: 'CheckCircle2',
    keywords: ['callout', 'success', 'done', 'check'],
    template: () => createCalloutSnippet('success'),
  },

  // Structured Content & Inserts
  {
    id: 'image',
    title: 'Image URL Embed',
    description: 'Insert markdown image link ![alt](url)',
    category: 'insert',
    icon: 'ImageIcon',
    keywords: ['image', 'photo', 'picture', 'embed', 'url', 'img'],
    template: () => ({ snippet: '![Image description](https://)\n', cursorOffset: 21 }),
  },
  {
    id: 'camera',
    title: 'Camera Photo Embed',
    description: 'Insert camera photo markdown tag',
    category: 'insert',
    icon: 'Camera',
    keywords: ['camera', 'photo', 'snap', 'capture', 'picture'],
    template: () => ({ snippet: '![Camera Photo](url)\n', cursorOffset: 16 }),
  },
  {
    id: 'table',
    title: 'Markdown Table',
    description: 'Editable 3x3 table with headers',
    category: 'insert',
    icon: 'Table',
    keywords: ['table', 'grid', 'columns', 'rows', 'spreadsheet'],
    template: () => {
      const snippet =
        '| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n';
      return { snippet, cursorOffset: snippet.length };
    },
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Fenced code syntax block',
    category: 'insert',
    icon: 'Code',
    keywords: ['code', 'block', 'syntax', 'javascript', 'python', 'typescript', '```'],
    template: () => ({ snippet: '```\n\n```\n', cursorOffset: 4 }),
  },
  {
    id: 'mathblock',
    title: 'Math Block (KaTeX)',
    description: 'Multi-line display LaTeX equation',
    category: 'insert',
    icon: 'Sigma',
    keywords: ['math', 'equation', 'latex', 'katex', 'formula', '$$'],
    template: () => ({ snippet: '$$\n\n$$\n', cursorOffset: 3 }),
  },
  {
    id: 'mermaid',
    title: 'Mermaid Diagram',
    description: 'Flowchart or sequence diagram',
    category: 'insert',
    icon: 'Workflow',
    keywords: ['mermaid', 'diagram', 'chart', 'flowchart', 'graph', 'sequence'],
    template: () => {
      const snippet = '```mermaid\ngraph TD\n  A[Start] --> B[Process]\n  B --> C[Done]\n```\n';
      return { snippet, cursorOffset: snippet.length };
    },
  },
  {
    id: 'query',
    title: 'Smart Query Block',
    description: 'Dynamic PKM vault query filter',
    category: 'insert',
    icon: 'Search',
    keywords: ['query', 'smart', 'search', 'filter', 'vault'],
    template: () => ({ snippet: '```query\ntag:#active OR folder:Projects\n```\n', cursorOffset: 9 }),
  },
  {
    id: 'moc',
    title: 'Map of Content (MOC)',
    description: 'Self-updating hierarchy of related notes',
    category: 'insert',
    icon: 'FolderTree',
    keywords: ['moc', 'map of content', 'hierarchy', 'tree', 'outline', 'living'],
    template: () => {
      const snippet = '```moc\nfolder:\ndepth:2\nsort:title\n```\n';
      return { snippet, cursorOffset: 14 }; // cursor right after folder:
    },
  },

  // PKM & Linking
  {
    id: 'extract',
    title: 'Extract to Note',
    description: 'Turn selection into atomic note (Mod+Shift+E)',
    category: 'pkm',
    icon: 'Scissors',
    keywords: ['extract', 'atomic', 'split', 'break', 'refactor', 'selection'],
    template: () => ({ snippet: '', cursorOffset: 0 }),
  },
  {
    id: 'wikilink',
    title: 'Wiki Link',
    description: 'Link to another vault note [[...]]',
    category: 'pkm',
    icon: 'Link2',
    keywords: ['wikilink', 'link', 'note', 'page', '[['],
    template: () => ({ snippet: '[[]]', cursorOffset: 2 }),
  },
  {
    id: 'embed',
    title: 'Embed Note / Transclusion',
    description: 'Live embed content from another note ![[...]]',
    category: 'pkm',
    icon: 'ExternalLink',
    keywords: ['embed', 'transclusion', 'include', '![['],
    template: () => ({ snippet: '![[]]', cursorOffset: 3 }),
  },
  {
    id: 'blockid',
    title: 'Block Reference ID',
    description: 'Anchor this paragraph with ^block-id',
    category: 'pkm',
    icon: 'Anchor',
    keywords: ['block', 'id', 'anchor', 'reference', '^'],
    template: () => {
      const id = `block-${Math.random().toString(36).substring(2, 8)}`;
      const snippet = ` ^${id}`;
      return { snippet, cursorOffset: snippet.length };
    },
  },

  // Utility Commands
  {
    id: 'date',
    title: 'Current Date',
    description: 'Insert today’s date (YYYY-MM-DD)',
    category: 'utility',
    icon: 'Calendar',
    keywords: ['date', 'today', 'now', 'time', 'day'],
    template: ({ currentDateStr }) => ({
      snippet: currentDateStr,
      cursorOffset: currentDateStr.length,
    }),
  },
  {
    id: 'time',
    title: 'Current Time',
    description: 'Insert current time (HH:mm)',
    category: 'utility',
    icon: 'Clock',
    keywords: ['time', 'now', 'clock', 'hour'],
    template: ({ currentTimeStr }) => ({
      snippet: currentTimeStr,
      cursorOffset: currentTimeStr.length,
    }),
  },
  {
    id: 'datetime',
    title: 'Date & Time Stamp',
    description: 'Insert timestamp (YYYY-MM-DD HH:mm)',
    category: 'utility',
    icon: 'CalendarClock',
    keywords: ['datetime', 'stamp', 'timestamp'],
    template: ({ currentDateStr, currentTimeStr }) => {
      const val = `${currentDateStr} ${currentTimeStr}`;
      return { snippet: val, cursorOffset: val.length };
    },
  },
];

/**
 * Fuzzy / prefix search for slash commands
 */
export function filterSlashCommands(query: string): SlashCommand[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter((cmd) => {
    // 1. Direct ID match or prefix
    if (cmd.id.toLowerCase().includes(cleanQuery)) return true;
    // 2. Title match
    if (cmd.title.toLowerCase().includes(cleanQuery)) return true;
    // 3. Keyword match
    if (cmd.keywords.some((kw) => kw.toLowerCase().includes(cleanQuery))) return true;
    // 4. Description match
    if (cmd.description.toLowerCase().includes(cleanQuery)) return true;
    return false;
  });
}

/**
 * Executes a slash command replacement atomically
 */
export function executeSlashCommand(
  command: SlashCommand,
  fullText: string,
  slashStartPos: number,
  cursorCurrentPos: number
): { newText: string; newCursorPos: number } {
  const now = new Date();
  const currentDateStr = now.toISOString().slice(0, 10);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  // Find line prefix (e.g. any indentation before the slash)
  const lineStart = fullText.lastIndexOf('\n', slashStartPos - 1) + 1;
  const linePrefix = fullText.slice(lineStart, slashStartPos);

  const { snippet, cursorOffset } = command.template({
    linePrefix,
    currentDateStr,
    currentTimeStr,
  });

  // Replace text from slashStartPos up to cursorCurrentPos
  const beforeSlash = fullText.slice(0, slashStartPos);
  const afterCursor = fullText.slice(cursorCurrentPos);

  const newText = beforeSlash + snippet + afterCursor;
  const newCursorPos = slashStartPos + cursorOffset;

  return { newText, newCursorPos };
}
