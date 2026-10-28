import { Note } from '../types';

export interface ResolvedLink {
  raw: string; // "[[Project Roadmap 2026]]"
  targetName: string; // "Project Roadmap 2026"
  targetNoteId?: string;
  found: boolean;
}

/**
 * Extracts all [[Note Title]] and [[note:id]] patterns from markdown text
 */
export function extractWikiLinks(text: string): string[] {
  if (!text) return [];
  const regex = /\[\[(.*?)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[1].trim()) {
      matches.push(match[1].trim());
    }
  }
  return matches;
}

/**
 * Finds all note IDs that are linked in the note's content or explicit links
 */
export function resolveLinkedNoteIds(content: string, allNotes: Note[]): string[] {
  const linkNames = extractWikiLinks(content);
  const ids = new Set<string>();

  const titleToId = new Map<string, string>();
  for (const n of allNotes) {
    titleToId.set(n.title.trim().toLowerCase(), n.id);
  }

  for (const name of linkNames) {
    if (name.startsWith('note:')) {
      ids.add(name.slice(5));
    } else {
      const lower = name.toLowerCase();
      const matchedId = titleToId.get(lower);
      if (matchedId) {
        ids.add(matchedId);
      }
    }
  }

  return Array.from(ids);
}

/**
 * Computes backlinks for a given note: all other notes that reference this note
 */
export function getBacklinksForNote(targetNote: Note, allNotes: Note[]): Note[] {
  if (!targetNote) return [];
  const targetId = targetNote.id;
  const targetTitleLower = targetNote.title.trim().toLowerCase();

  return allNotes.filter((note) => {
    if (note.id === targetId || note.trashed) return false;

    // Check explicit linkedNoteIds
    if (note.linkedNoteIds && note.linkedNoteIds.includes(targetId)) {
      return true;
    }

    // Check [[Title]] in content
    const links = extractWikiLinks(note.content);
    return links.some(
      (link) =>
        link.toLowerCase() === targetTitleLower ||
        link === `note:${targetId}`
    );
  });
}

/**
 * Formats text with wiki links and transclusion embeds replaced by structured segments for React rendering
 */
export interface TextSegment {
  type: 'text' | 'link';
  content: string;
  targetTitle?: string;
  targetNoteId?: string;
  targetSnippet?: string;
  isEmbed?: boolean;
}

export function parseTextWithWikiLinks(
  text: string,
  allNotes: Note[] = []
): TextSegment[] {
  if (!text) return [];

  // Fast path: if there is no "[[" in text, avoid regex and map allocations
  if (!text.includes('[[')) {
    return [{ type: 'text', content: text }];
  }

  const titleMap = new Map<string, Note>();
  const idMap = new Map<string, Note>();

  for (const n of allNotes) {
    if (!n) continue;
    titleMap.set(n.title.trim().toLowerCase(), n);
    idMap.set(n.id, n);
  }

  const segments: TextSegment[] = [];
  const regex = /(!?)\[\[(.*?)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const isEmbed = match[1] === '!';
    const rawInner = match[2].trim();
    let targetPart = rawInner;
    let alias: string | undefined;

    // Handle [[Target|Alias]]
    const pipeIdx = rawInner.indexOf('|');
    if (pipeIdx > -1) {
      targetPart = rawInner.slice(0, pipeIdx).trim();
      alias = rawInner.slice(pipeIdx + 1).trim();
    }

    // Handle [[Target#Heading]]
    const hashIdx = targetPart.indexOf('#');
    let baseTarget = targetPart;
    if (hashIdx > -1) {
      baseTarget = targetPart.slice(0, hashIdx).trim();
    }

    let matchedNote: Note | undefined;

    if (baseTarget.startsWith('note:')) {
      matchedNote = idMap.get(baseTarget.slice(5));
    } else if (baseTarget) {
      matchedNote = titleMap.get(baseTarget.toLowerCase());
    }

    const displayTitle = alias || (matchedNote ? matchedNote.title : targetPart);
    const snippet = matchedNote
      ? (matchedNote.content || matchedNote.title || '').trim().slice(0, 100)
      : undefined;

    segments.push({
      type: 'link',
      content: match[0],
      targetTitle: displayTitle,
      targetNoteId: matchedNote ? matchedNote.id : undefined,
      targetSnippet: snippet,
      isEmbed,
    });

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Extracts hashtags from note content or markdown strings (e.g. #react, #todo, #project/v2)
 * Ignores markdown headings (# Heading), pure numbers (#123), and hex colors (#f59e0b)
 */
export function extractHashtags(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  // Match #tag starting at start of string or after whitespace / standard opening punctuation
  const regex = /(?:^|[\s(\[{])#([a-zA-Z0-9_\-\/]+)/g;
  const tags = new Set<string>();
  let match;

  while ((match = regex.exec(text)) !== null) {
    let rawTag = match[1].trim();
    // Strip any trailing punctuation attached to word boundaries
    rawTag = rawTag.replace(/[.,;:!?]+$/, '');

    // Ignore empty, pure numbers (e.g. #123), single punctuation or markdown headers
    if (rawTag && !/^\d+$/.test(rawTag) && rawTag.length >= 1) {
      // Ignore 6-digit hex color codes with numbers
      if (/^[0-9a-fA-F]{6}$/.test(rawTag) && /\d/.test(rawTag)) {
        continue;
      }
      tags.add(rawTag);
    }
  }

  return Array.from(tags);
}


