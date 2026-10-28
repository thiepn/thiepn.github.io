/**
 * PKM Outliner Core Module (Phase P4)
 * Collapsible Heading Outliner, Section Reordering, Nested List Folding,
 * Sticky Breadcrumbs, and Fold Persistence.
 */

import { slugify } from './parser';

export interface DocumentSection {
  id: string; // Unique stable ID (e.g. slug + line index)
  title: string; // Extracted heading text
  slug: string; // Slugified heading
  level: number; // Heading level (1 - 6)
  startLine: number; // 0-indexed line where heading starts
  endLine: number; // 0-indexed line where section ends (inclusive)
  headingLineText: string; // The exact raw heading line e.g. "## Methods"
  content: string; // Full section text including heading and nested sub-sections
  bodyContent: string; // Section text excluding the heading line
  children: DocumentSection[]; // Nested child sub-sections
  childSectionIndices: number[]; // Flat indices of nested child sections in the flat sections array
  parentIndex: number | null; // Flat index of parent section or null if root
  wordCount: number; // Word count for this section (including children)
  lineCount: number; // Total lines in this section
}

export interface BreadcrumbItem {
  level: number;
  text: string;
  title: string;
  lineIndex: number;
  slug: string;
  id: string;
}

export interface ListItemNode {
  id: string;
  lineIndex: number;
  indent: number;
  type: 'bullet' | 'ordered' | 'task';
  text: string;
  rawLine: string;
  isChecked?: boolean;
  orderedNumber?: number;
  startLine: number;
  endLine: number; // Line index where all nested children end
  hasChildren: boolean;
  childLineIndices: number[];
}

/**
 * Parses markdown into a flat list of sections and a hierarchical section tree.
 * Correctly handles frontmatter, code blocks (ignoring # inside code blocks), and arbitrary heading levels.
 */
export function parseMarkdownSections(markdown: string): {
  flatSections: DocumentSection[];
  rootSections: DocumentSection[];
  tree: DocumentSection[];
  preamble: string; // Content before the first heading (e.g. frontmatter, initial intro)
  preambleEndLine: number;
} {
  if (!markdown || typeof markdown !== 'string') {
    return { flatSections: [], rootSections: [], tree: [], preamble: '', preambleEndLine: -1 };
  }

  const lines = markdown.split('\n');
  const rawHeadings: Array<{
    level: number;
    text: string;
    lineIndex: number;
    rawLine: string;
  }> = [];

  let inCodeBlock = false;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Frontmatter delimiter
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---' || trimmed === '...') {
        inFrontmatter = false;
      }
      continue;
    }

    // Code block fences
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Check heading match # to ######
    const headingMatch = line.match(/^(#{1,6})(?:\s+(.*))?$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = (headingMatch[2] || '').trim();
      rawHeadings.push({
        level,
        text: text || `Heading ${level}`,
        lineIndex: i,
        rawLine: line,
      });
    }
  }

  if (rawHeadings.length === 0) {
    return {
      flatSections: [],
      rootSections: [],
      tree: [],
      preamble: markdown,
      preambleEndLine: lines.length - 1,
    };
  }

  const preambleEndLine = rawHeadings[0].lineIndex - 1;
  const preamble = preambleEndLine >= 0 ? lines.slice(0, preambleEndLine + 1).join('\n') : '';

  // Calculate section boundary (endLine) for each heading
  // Section for heading at index i ends before the next heading of level <= level_i, or EOF
  const flatSections: DocumentSection[] = [];

  for (let i = 0; i < rawHeadings.length; i++) {
    const curr = rawHeadings[i];
    let endLine = lines.length - 1;

    for (let j = i + 1; j < rawHeadings.length; j++) {
      if (rawHeadings[j].level <= curr.level) {
        endLine = rawHeadings[j].lineIndex - 1;
        break;
      }
    }

    const sectionLines = lines.slice(curr.lineIndex, endLine + 1);
    const bodyLines = lines.slice(curr.lineIndex + 1, endLine + 1);
    const content = sectionLines.join('\n');
    const bodyContent = bodyLines.join('\n');

    const cleanTitle = curr.text.replace(/\^[a-zA-Z0-9_-]+$/, '').trim();
    const slug = slugify(cleanTitle);
    const id = `sec-${slug}-${curr.lineIndex}`;

    const words = content.trim() ? content.trim().split(/\s+/).length : 0;

    flatSections.push({
      id,
      title: cleanTitle,
      slug,
      level: curr.level,
      startLine: curr.lineIndex,
      endLine,
      headingLineText: curr.rawLine,
      content,
      bodyContent,
      children: [],
      childSectionIndices: [],
      parentIndex: null,
      wordCount: words,
      lineCount: endLine - curr.lineIndex + 1,
    });
  }

  // Build parent-child relationships and nested trees
  const stack: { node: DocumentSection; index: number }[] = [];
  const rootSections: DocumentSection[] = [];

  for (let idx = 0; idx < flatSections.length; idx++) {
    const sec = flatSections[idx];

    while (stack.length > 0 && stack[stack.length - 1].node.level >= sec.level) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      sec.parentIndex = parent.index;
      parent.node.children.push(sec);
      parent.node.childSectionIndices.push(idx);
    } else {
      sec.parentIndex = null;
      rootSections.push(sec);
    }

    stack.push({ node: sec, index: idx });
  }

  return {
    flatSections,
    rootSections,
    tree: rootSections,
    preamble,
    preambleEndLine,
  };
}

/**
 * Reorders a section within the markdown document atomically.
 * Moves the heading, its body content, AND all nested subsections as a single unit.
 *
 * @param markdown The full document markdown string
 * @param sourceSectionIndex The flat section index to move
 * @param targetPosition Target section index OR 'up' | 'down'
 */
export function reorderSection(
  markdown: string,
  sourceSectionIndex: number,
  targetPosition: number | 'up' | 'down'
): string {
  return reorderSectionResult(markdown, sourceSectionIndex, targetPosition).reorderedMarkdown;
}

export function reorderSectionResult(
  markdown: string,
  sourceSectionIndex: number,
  targetPosition: number | 'up' | 'down'
): {
  reorderedMarkdown: string;
  success: boolean;
  newSectionIndex: number;
} {
  if (!markdown || typeof markdown !== 'string') {
    return { reorderedMarkdown: typeof markdown === 'string' ? markdown : '', success: false, newSectionIndex: sourceSectionIndex };
  }
  const { flatSections, preamble } = parseMarkdownSections(markdown);

  if (
    sourceSectionIndex < 0 ||
    sourceSectionIndex >= flatSections.length ||
    flatSections.length <= 1
  ) {
    return { reorderedMarkdown: markdown, success: false, newSectionIndex: sourceSectionIndex };
  }

  const sourceSec = flatSections[sourceSectionIndex];
  let targetIndex = sourceSectionIndex;

  if (targetPosition === 'up') {
    // Find previous sibling or previous section at same or higher level
    let prevIdx = -1;
    for (let i = sourceSectionIndex - 1; i >= 0; i--) {
      // Look for sibling with same parent or previous section of same level
      if (flatSections[i].parentIndex === sourceSec.parentIndex) {
        prevIdx = i;
        break;
      }
    }
    if (prevIdx === -1 && sourceSectionIndex > 0) {
      prevIdx = sourceSectionIndex - 1;
    }
    if (prevIdx === -1) {
      return { reorderedMarkdown: markdown, success: false, newSectionIndex: sourceSectionIndex };
    }
    targetIndex = prevIdx;
  } else if (targetPosition === 'down') {
    // Find next sibling with same parent or next section
    let nextIdx = -1;
    for (let i = sourceSectionIndex + 1; i < flatSections.length; i++) {
      if (flatSections[i].parentIndex === sourceSec.parentIndex) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx === -1 && sourceSectionIndex < flatSections.length - 1) {
      // Skip all child sections of sourceSec
      let afterChildrenIdx = sourceSectionIndex + 1;
      while (
        afterChildrenIdx < flatSections.length &&
        flatSections[afterChildrenIdx].startLine <= sourceSec.endLine
      ) {
        afterChildrenIdx++;
      }
      if (afterChildrenIdx < flatSections.length) {
        nextIdx = afterChildrenIdx;
      }
    }
    if (nextIdx === -1) {
      return { reorderedMarkdown: markdown, success: false, newSectionIndex: sourceSectionIndex };
    }
    targetIndex = nextIdx;
  } else {
    targetIndex = targetPosition;
  }

  if (targetIndex === sourceSectionIndex || targetIndex < 0 || targetIndex >= flatSections.length) {
    return { reorderedMarkdown: markdown, success: false, newSectionIndex: sourceSectionIndex };
  }

  const lines = markdown.split('\n');

  // Extract source section chunk (startLine to endLine inclusive)
  const sourceLines = lines.slice(sourceSec.startLine, sourceSec.endLine + 1);

  // Remove source section lines from document
  const remainingLines = [
    ...lines.slice(0, sourceSec.startLine),
    ...lines.slice(sourceSec.endLine + 1),
  ];

  // Recalculate target insertion line in the remaining document
  const targetSec = flatSections[targetIndex];
  let insertionLine: number;

  if (targetSec.startLine < sourceSec.startLine) {
    // Target was before source
    if (targetPosition === 'down') {
      // Insert after target's section
      insertionLine = targetSec.endLine + 1;
    } else {
      // Insert at target's startLine (before target)
      insertionLine = targetSec.startLine;
    }
  } else {
    // Target was after source: account for removed lines
    const removedCount = sourceSec.endLine - sourceSec.startLine + 1;
    if (targetPosition === 'up') {
      insertionLine = targetSec.startLine - removedCount;
    } else {
      insertionLine = targetSec.endLine + 1 - removedCount;
    }
  }

  // Clamp insertionLine
  insertionLine = Math.max(0, Math.min(insertionLine, remainingLines.length));

  // Assemble new document
  const reorderedLines = [
    ...remainingLines.slice(0, insertionLine),
    ...sourceLines,
    ...remainingLines.slice(insertionLine),
  ];

  const reorderedMarkdown = reorderedLines.join('\n');

  // Verify that new index can be located
  const newParsed = parseMarkdownSections(reorderedMarkdown);
  const newSectionIndex = newParsed.flatSections.findIndex((s) => s.id === sourceSec.id);

  return {
    reorderedMarkdown,
    success: true,
    newSectionIndex: newSectionIndex !== -1 ? newSectionIndex : targetIndex,
  };
}

/**
 * Calculates the active heading breadcrumb hierarchy for a given line index in the document.
 * E.g., for cursor in H3, returns [H1, H2, H3]
 */
export function getHeadingBreadcrumb(markdown: string, lineIndex: number): BreadcrumbItem[] {
  if (!markdown || typeof markdown !== 'string' || lineIndex < 0) return [];

  const { flatSections } = parseMarkdownSections(markdown);
  if (flatSections.length === 0) return [];

  // Find the most specific section containing lineIndex
  let currentSec: DocumentSection | null = null;

  for (let i = flatSections.length - 1; i >= 0; i--) {
    const sec = flatSections[i];
    if (lineIndex >= sec.startLine && lineIndex <= sec.endLine) {
      currentSec = sec;
      break;
    }
  }

  // If cursor is before first heading
  if (!currentSec) {
    // If line is after last heading start, pick last section
    if (lineIndex >= flatSections[flatSections.length - 1].startLine) {
      currentSec = flatSections[flatSections.length - 1];
    } else {
      return [];
    }
  }

  // Build breadcrumb chain from root down to currentSec
  const chain: DocumentSection[] = [];
  let curr: DocumentSection | null = currentSec;

  while (curr) {
    chain.unshift(curr);
    if (curr.parentIndex !== null && curr.parentIndex >= 0 && curr.parentIndex < flatSections.length) {
      curr = flatSections[curr.parentIndex];
    } else {
      curr = null;
    }
  }

  return chain.map((sec) => ({
    level: sec.level,
    text: sec.title,
    title: sec.title,
    lineIndex: sec.startLine,
    slug: sec.slug,
    id: sec.id,
  }));
}

/**
 * Parses nested list items (bullet, ordered, and task items) to enable list item folding.
 */
export function parseNestedListItems(lines: string[]): ListItemNode[] {
  const items: ListItemNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check Task Item: - [ ] or - [x]
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      items.push({
        id: `list-task-${i}`,
        lineIndex: i,
        indent: taskMatch[1].length,
        type: 'task',
        isChecked: taskMatch[2].toLowerCase() === 'x',
        text: taskMatch[3],
        rawLine: line,
        startLine: i,
        endLine: i,
        hasChildren: false,
        childLineIndices: [],
      });
      continue;
    }

    // Check Unordered List: - or * or +
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      items.push({
        id: `list-bullet-${i}`,
        lineIndex: i,
        indent: bulletMatch[1].length,
        type: 'bullet',
        text: bulletMatch[2],
        rawLine: line,
        startLine: i,
        endLine: i,
        hasChildren: false,
        childLineIndices: [],
      });
      continue;
    }

    // Check Ordered List: 1. or 2.
    const ordMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ordMatch) {
      items.push({
        id: `list-ord-${i}`,
        lineIndex: i,
        indent: ordMatch[1].length,
        type: 'ordered',
        orderedNumber: parseInt(ordMatch[2], 10),
        text: ordMatch[3],
        rawLine: line,
        startLine: i,
        endLine: i,
        hasChildren: false,
        childLineIndices: [],
      });
      continue;
    }
  }

  // Calculate nested children and endLine for each item
  for (let i = 0; i < items.length; i++) {
    const curr = items[i];
    let endLine = curr.lineIndex;
    const children: number[] = [];

    for (let j = i + 1; j < items.length; j++) {
      const next = items[j];
      if (next.lineIndex === endLine + 1 && next.indent > curr.indent) {
        endLine = next.lineIndex;
        children.push(next.lineIndex);
      } else {
        break;
      }
    }

    curr.endLine = endLine;
    curr.hasChildren = children.length > 0;
    curr.childLineIndices = children;
  }

  return items;
}

/**
 * Fold State Manager
 * Persists fold state in localStorage per note and cleans up obsolete keys safely.
 */
export interface NoteFoldState {
  foldedHeadingIds: string[]; // List of folded section IDs / slugs
  foldedListLines: number[]; // List of folded list item line indices
}

export class FoldStateManager {
  private static STORAGE_PREFIX = 'pkm_folds_v1_';

  public static loadFoldState(noteId: string, availableSectionIds?: string[]): NoteFoldState {
    if (typeof localStorage === 'undefined' || !noteId) {
      return { foldedHeadingIds: [], foldedListLines: [] };
    }

    try {
      const raw = localStorage.getItem(`${this.STORAGE_PREFIX}${noteId}`);
      if (!raw) return { foldedHeadingIds: [], foldedListLines: [] };

      const parsed = JSON.parse(raw);
      let foldedHeadingIds: string[] = Array.isArray(parsed.foldedHeadingIds)
        ? parsed.foldedHeadingIds
        : [];

      // Clean up stale IDs if availableSectionIds is provided
      if (availableSectionIds && availableSectionIds.length > 0) {
        const availableSet = new Set(availableSectionIds);
        foldedHeadingIds = foldedHeadingIds.filter((id) => availableSet.has(id));
      }

      return {
        foldedHeadingIds,
        foldedListLines: Array.isArray(parsed.foldedListLines) ? parsed.foldedListLines : [],
      };
    } catch {
      return { foldedHeadingIds: [], foldedListLines: [] };
    }
  }

  public static saveFoldState(noteId: string, state: NoteFoldState): void {
    if (typeof localStorage === 'undefined' || !noteId) return;
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${noteId}`, JSON.stringify(state));
    } catch {
      // Ignore quota errors safely
    }
  }

  public static toggleHeadingFold(
    noteId: string,
    sectionId: string,
    currentState: NoteFoldState
  ): NoteFoldState {
    const isFolded = currentState.foldedHeadingIds.includes(sectionId);
    const newFoldedHeadings = isFolded
      ? currentState.foldedHeadingIds.filter((id) => id !== sectionId)
      : [...currentState.foldedHeadingIds, sectionId];

    const updated: NoteFoldState = {
      ...currentState,
      foldedHeadingIds: newFoldedHeadings,
    };

    this.saveFoldState(noteId, updated);
    return updated;
  }

  public static toggleListFold(
    noteId: string,
    lineIndex: number,
    currentState: NoteFoldState
  ): NoteFoldState {
    const isFolded = currentState.foldedListLines.includes(lineIndex);
    const newFoldedLists = isFolded
      ? currentState.foldedListLines.filter((l) => l !== lineIndex)
      : [...currentState.foldedListLines, lineIndex];

    const updated: NoteFoldState = {
      ...currentState,
      foldedListLines: newFoldedLists,
    };

    this.saveFoldState(noteId, updated);
    return updated;
  }

  public static foldAll(noteId: string, allSectionIds: string[]): NoteFoldState {
    const updated: NoteFoldState = {
      foldedHeadingIds: [...allSectionIds],
      foldedListLines: [],
    };
    this.saveFoldState(noteId, updated);
    return updated;
  }

  public static unfoldAll(noteId: string): NoteFoldState {
    const updated: NoteFoldState = {
      foldedHeadingIds: [],
      foldedListLines: [],
    };
    this.saveFoldState(noteId, updated);
    return updated;
  }
}
