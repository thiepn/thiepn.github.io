import { Note, Folder } from '../types';

export interface WikiLinkOccurrence {
  raw: string; // e.g. "[[Project Roadmap 2026#Milestones|Roadmap]]"
  targetTitle: string; // "Project Roadmap 2026"
  targetHeading?: string; // "Milestones"
  targetBlockId?: string; // "^block1"
  alias?: string; // "Roadmap"
  isEmbed: boolean; // true if ![[...]]
  charOffset: number;
  lineNumber: number;
  lineContent: string;
  surroundingContext: string;
}

export interface LinkedMentionGroup {
  sourceNote: Note;
  folder?: Folder;
  occurrences: WikiLinkOccurrence[];
}

export interface UnlinkedOccurrence {
  lineNumber: number;
  lineContent: string;
  charOffset: number;
  matchText: string;
  surroundingContext: string;
}

export interface UnlinkedMentionGroup {
  sourceNote: Note;
  folder?: Folder;
  matchedTerm: string; // Title or Alias that was found
  occurrences: UnlinkedOccurrence[];
}

export interface OutgoingLinkItem {
  raw: string;
  targetTitle: string;
  targetHeading?: string;
  targetBlockId?: string;
  alias?: string;
  isEmbed: boolean;
  isResolved: boolean;
  targetNote?: Note;
}

/**
 * Parses all [[...]] and ![[...]] wiki links from markdown content with line numbers and surrounding context
 */
export function extractWikiLinksDetailed(content: string): WikiLinkOccurrence[] {
  if (!content) return [];

  const occurrences: WikiLinkOccurrence[] = [];
  const lines = content.split('\n');
  const regex = /(!?)\[\[(.*?)\]\]/g;

  let totalCharOffset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const isEmbed = match[1] === '!';
      const rawInner = match[2].trim();
      if (!rawInner) continue;

      let targetPart = rawInner;
      let alias: string | undefined;

      const pipeIdx = rawInner.indexOf('|');
      if (pipeIdx > -1) {
        targetPart = rawInner.slice(0, pipeIdx).trim();
        alias = rawInner.slice(pipeIdx + 1).trim();
      }

      let targetTitle = targetPart;
      let targetHeading: string | undefined;
      let targetBlockId: string | undefined;

      if (targetPart.includes('#^')) {
        const parts = targetPart.split('#^');
        targetTitle = parts[0].trim();
        targetBlockId = parts[1].trim();
      } else if (targetPart.includes('#')) {
        const parts = targetPart.split('#');
        targetTitle = parts[0].trim();
        targetHeading = parts[1].trim();
      }

      // Build 2-3 lines of surrounding context
      const prevLine = lineIdx > 0 ? lines[lineIdx - 1] : '';
      const nextLine = lineIdx < lines.length - 1 ? lines[lineIdx + 1] : '';
      const contextLines = [prevLine, line, nextLine].filter(Boolean);
      const surroundingContext = contextLines.join('\n').trim();

      occurrences.push({
        raw: match[0],
        targetTitle,
        targetHeading,
        targetBlockId,
        alias,
        isEmbed,
        charOffset: totalCharOffset + match.index,
        lineNumber: lineIdx + 1,
        lineContent: line,
        surroundingContext,
      });
    }

    totalCharOffset += line.length + 1; // +1 for newline
  }

  return occurrences;
}

/**
 * Finds all linked mentions targeting `targetNote` from all other notes in the vault
 */
export function findLinkedMentionsForNote(
  targetNote: Note,
  allNotes: Note[],
  folders: Folder[] = []
): LinkedMentionGroup[] {
  if (!targetNote) return [];

  const targetTitleLower = targetNote.title.trim().toLowerCase();
  const targetId = targetNote.id;
  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const groups: LinkedMentionGroup[] = [];

  for (const source of allNotes) {
    if (source.id === targetId || source.trashed) continue;

    const occurrences = extractWikiLinksDetailed(source.content || '');
    const matchingOccurrences = occurrences.filter((occ) => {
      const occTitleLower = occ.targetTitle.toLowerCase();
      return (
        occTitleLower === targetTitleLower ||
        occ.targetTitle === `note:${targetId}` ||
        (source.linkedNoteIds && source.linkedNoteIds.includes(targetId))
      );
    });

    if (matchingOccurrences.length > 0) {
      groups.push({
        sourceNote: source,
        folder: source.folderId ? folderMap.get(source.folderId) : undefined,
        occurrences: matchingOccurrences,
      });
    }
  }

  return groups;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'be',
  'with', 'as', 'by', 'this', 'that', 'from', 'note', 'notes', 'task', 'tasks', 'todo',
  'test', 'new', 'page', 'doc', 'item', 'general', 'main', 'daily', 'log'
]);

/**
 * Discovers unlinked occurrences of `targetNote`'s title across all other notes in the vault
 */
export function findUnlinkedMentionsForNote(
  targetNote: Note,
  allNotes: Note[],
  folders: Folder[] = [],
  ignoredKeys?: Set<string>
): UnlinkedMentionGroup[] {
  if (!targetNote || !targetNote.title || targetNote.title.trim().length < 2) return [];

  const targetTitle = targetNote.title.trim();
  const targetTitleLower = targetTitle.toLowerCase();

  // Guard against overly generic stop words
  if (STOP_WORDS.has(targetTitleLower) || targetTitle.length < 3) {
    return [];
  }

  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  // Build search terms: note title and any aliases
  const searchTerms = [targetTitle];
  const groups: UnlinkedMentionGroup[] = [];

  // Escape regex special chars
  const escapedTerm = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match whole word boundaries without being inside an existing [[...]] or markdown link
  const wordRegex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');

  for (const source of allNotes) {
    if (source.id === targetNote.id || source.trashed) continue;
    if (!source.content || !source.content.toLowerCase().includes(targetTitleLower)) continue;

    const sourceLines = source.content.split('\n');
    const sourceOccurrences: UnlinkedOccurrence[] = [];

    for (let lineIdx = 0; lineIdx < sourceLines.length; lineIdx++) {
      const line = sourceLines[lineIdx];
      // Skip if line already has [[Target]]
      if (line.toLowerCase().includes(`[[${targetTitleLower}`)) continue;

      let match: RegExpExecArray | null;
      wordRegex.lastIndex = 0;

      while ((match = wordRegex.exec(line)) !== null) {
        const charOffset = match.index;
        const matchedText = match[0];
        const ignoreKey = `${source.id}-${lineIdx + 1}-${charOffset}`;

        if (ignoredKeys && ignoredKeys.has(ignoreKey)) continue;

        // Check if inside a markdown link [Title](url) or code block/tag
        const before = line.slice(0, charOffset);
        const after = line.slice(charOffset + matchedText.length);

        if (
          (before.includes('[[') && !before.includes(']]')) ||
          (before.includes('`') && after.includes('`'))
        ) {
          continue;
        }

        const prevLine = lineIdx > 0 ? sourceLines[lineIdx - 1] : '';
        const nextLine = lineIdx < sourceLines.length - 1 ? sourceLines[lineIdx + 1] : '';
        const surroundingContext = [prevLine, line, nextLine].filter(Boolean).join('\n').trim();

        sourceOccurrences.push({
          lineNumber: lineIdx + 1,
          lineContent: line,
          charOffset,
          matchText: matchedText,
          surroundingContext,
        });
      }
    }

    if (sourceOccurrences.length > 0) {
      groups.push({
        sourceNote: source,
        folder: source.folderId ? folderMap.get(source.folderId) : undefined,
        matchedTerm: targetTitle,
        occurrences: sourceOccurrences,
      });
    }
  }

  return groups;
}

/**
 * Converts a specific unlinked mention in `sourceNote` to `[[targetNote.title]]`
 */
export function convertUnlinkedMentionToLink(
  sourceNote: Note,
  targetNote: Note,
  occurrence: { lineNumber: number; matchText: string; charOffset?: number }
): Note {
  const lines = (sourceNote.content || '').split('\n');
  const targetLineIdx = occurrence.lineNumber - 1;

  if (targetLineIdx >= 0 && targetLineIdx < lines.length) {
    const line = lines[targetLineIdx];
    const escaped = occurrence.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    const updatedLine = line.replace(regex, `[[${targetNote.title}]]`);
    lines[targetLineIdx] = updatedLine;

    const updatedLinkedIds = Array.from(
      new Set([...(sourceNote.linkedNoteIds || []), targetNote.id])
    );

    return {
      ...sourceNote,
      content: lines.join('\n'),
      linkedNoteIds: updatedLinkedIds,
      updatedAt: new Date().toISOString(),
    };
  }

  return sourceNote;
}

/**
 * Converts ALL unlinked occurrences of `targetNote.title` in `sourceNote` to `[[targetNote.title]]`
 */
export function convertAllUnlinkedMentionsInNote(sourceNote: Note, targetNote: Note): Note {
  const targetTitle = targetNote.title.trim();
  const escaped = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<!\\[\\[)\\b${escaped}\\b(?!\\]\\])`, 'gi');

  const updatedContent = (sourceNote.content || '').replace(regex, `[[${targetTitle}]]`);

  const updatedLinkedIds = Array.from(
    new Set([...(sourceNote.linkedNoteIds || []), targetNote.id])
  );

  return {
    ...sourceNote,
    content: updatedContent,
    linkedNoteIds: updatedLinkedIds,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extracts and resolves all outgoing links from `sourceNote`
 */
export function getOutgoingLinks(sourceNote: Note, allNotes: Note[]): OutgoingLinkItem[] {
  if (!sourceNote || !sourceNote.content) return [];

  const occurrences = extractWikiLinksDetailed(sourceNote.content);
  const titleMap = new Map<string, Note>();
  const idMap = new Map<string, Note>();

  for (const n of allNotes) {
    if (!n || n.trashed) continue;
    titleMap.set(n.title.trim().toLowerCase(), n);
    idMap.set(n.id, n);
  }

  const items: OutgoingLinkItem[] = [];
  const seenKeys = new Set<string>();

  for (const occ of occurrences) {
    let resolvedNote: Note | undefined;

    if (occ.targetTitle.startsWith('note:')) {
      resolvedNote = idMap.get(occ.targetTitle.slice(5));
    } else {
      resolvedNote = titleMap.get(occ.targetTitle.trim().toLowerCase());
    }

    const uniqueKey = `${occ.targetTitle.toLowerCase()}-${occ.targetHeading || ''}-${occ.alias || ''}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    items.push({
      raw: occ.raw,
      targetTitle: occ.targetTitle,
      targetHeading: occ.targetHeading,
      targetBlockId: occ.targetBlockId,
      alias: occ.alias,
      isEmbed: occ.isEmbed,
      isResolved: Boolean(resolvedNote),
      targetNote: resolvedNote,
    });
  }

  return items;
}

/**
 * Vault-wide link refactoring: When a note is renamed from `oldTitle` to `newTitle`,
 * automatically updates all `[[Old Title]]`, `[[Old Title|Alias]]`, `[[Old Title#Heading]]`,
 * and `![[Old Title]]` references across every note in the vault.
 */
export function refactorWikiLinksOnNoteRename(
  allNotes: Note[],
  oldTitle: string,
  newTitle: string
): { updatedNotes: Note[]; count: number } {
  const cleanOld = oldTitle.trim();
  const cleanNew = newTitle.trim();

  if (!cleanOld || !cleanNew || cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
    return { updatedNotes: allNotes, count: 0 };
  }

  const escapedOld = cleanOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match [[Old Title]], [[Old Title|Alias]], [[Old Title#Heading]], ![[Old Title]], etc.
  const regex = new RegExp(`(!?\\[\\[)${escapedOld}(\\||#|\\]\\])`, 'gi');

  let updatedCount = 0;
  const updatedNotes = allNotes.map((note) => {
    if (!note.content || !regex.test(note.content)) {
      return note;
    }

    regex.lastIndex = 0;
    const newContent = note.content.replace(regex, `$1${cleanNew}$2`);

    if (newContent !== note.content) {
      updatedCount++;
      return {
        ...note,
        content: newContent,
        updatedAt: new Date().toISOString(),
      };
    }
    return note;
  });

  return { updatedNotes, count: updatedCount };
}

/**
 * Extracts headings (# H1, ## H2, ### H3, etc.) from note markdown content for # sub-ref autocomplete
 */
export function extractHeadingsFromMarkdown(content: string): Array<{ heading: string; level: number }> {
  if (!content) return [];
  const lines = content.split('\n');
  const headings: Array<{ heading: string; level: number }> = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        heading: match[2].trim(),
      });
    }
  }

  return headings;
}

/**
 * Checks if the cursor is currently inside an active `[[...` WikiLink typing sequence
 */
export function checkWikiLinkTrigger(
  content: string,
  cursorPosition: number
): {
  isValid: boolean;
  triggerIndex: number;
  query: string;
  targetTitle: string;
  headingQuery?: string;
  aliasQuery?: string;
  mode: 'note' | 'heading' | 'alias';
} {
  const textBefore = content.slice(0, cursorPosition);
  const lastDoubleBracket = textBefore.lastIndexOf('[[');
  if (lastDoubleBracket === -1) {
    return { isValid: false, triggerIndex: -1, query: '', targetTitle: '', mode: 'note' };
  }

  // If there is a closing ]] after the last [[, user is not typing an active link
  const closingAfter = textBefore.indexOf(']]', lastDoubleBracket);
  if (closingAfter !== -1) {
    return { isValid: false, triggerIndex: -1, query: '', targetTitle: '', mode: 'note' };
  }

  // Obsidian links don't span across multiple lines
  const queryText = textBefore.slice(lastDoubleBracket + 2);
  if (queryText.includes('\n')) {
    return { isValid: false, triggerIndex: -1, query: '', targetTitle: '', mode: 'note' };
  }

  if (queryText.includes('#')) {
    const hashIdx = queryText.indexOf('#');
    const targetTitle = queryText.slice(0, hashIdx).trim();
    const headingQuery = queryText.slice(hashIdx + 1);
    return {
      isValid: true,
      triggerIndex: lastDoubleBracket,
      query: queryText,
      targetTitle,
      headingQuery,
      mode: 'heading',
    };
  }

  if (queryText.includes('|')) {
    const pipeIdx = queryText.indexOf('|');
    const targetTitle = queryText.slice(0, pipeIdx).trim();
    const aliasQuery = queryText.slice(pipeIdx + 1);
    return {
      isValid: true,
      triggerIndex: lastDoubleBracket,
      query: queryText,
      targetTitle,
      aliasQuery,
      mode: 'alias',
    };
  }

  return {
    isValid: true,
    triggerIndex: lastDoubleBracket,
    query: queryText,
    targetTitle: queryText,
    mode: 'note',
  };
}
