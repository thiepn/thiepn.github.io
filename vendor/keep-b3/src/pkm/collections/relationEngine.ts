/**
 * Relation Engine for Phase P43
 * 
 * Manages typed Relation properties referencing canonical Markdown notes.
 * Supports portable Wikilink format `[[Target Title]]` or stable note IDs.
 */

import { Note } from '../../types';
import { parseFrontmatterAST, setPropertyInContent } from '../properties/frontmatterEngine';

export interface ResolvedRelationItem {
  targetNoteId: string | null;
  targetTitle: string;
  isDangling: boolean;
  isTrashed: boolean;
  rawWikilink: string;
}

/**
 * Extracts target note references from a property value (string, array of strings, wikilinks, or IDs)
 */
export function parseRelationReferences(rawVal: unknown): string[] {
  if (!rawVal) return [];

  const references: string[] = [];

  const processItem = (item: unknown) => {
    if (typeof item !== 'string') return;
    const str = item.trim();
    if (!str) return;

    // Check for wikilink format [[Note Title]] or [[Note Title|Alias]]
    const wikilinkMatch = str.match(/^\[\[(.*?)\]\]$/);
    if (wikilinkMatch) {
      const inner = wikilinkMatch[1].trim();
      const pipeIdx = inner.indexOf('|');
      const target = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner;
      if (target) references.push(target);
    } else {
      references.push(str);
    }
  };

  if (Array.isArray(rawVal)) {
    rawVal.forEach(processItem);
  } else if (typeof rawVal === 'string') {
    // Might be comma-separated or single value
    if (rawVal.includes(',') && !rawVal.startsWith('[[')) {
      rawVal.split(',').forEach((s) => processItem(s.trim()));
    } else {
      processItem(rawVal);
    }
  }

  return references;
}

/**
 * Resolves raw relation references against all vault notes
 */
export function resolveRelationTargets(
  rawVal: unknown,
  allNotes: Note[]
): ResolvedRelationItem[] {
  const refs = parseRelationReferences(rawVal);
  if (refs.length === 0) return [];

  const noteIdMap = new Map<string, Note>();
  const noteTitleMap = new Map<string, Note>();
  const noteLowerTitleMap = new Map<string, Note>();

  for (const n of allNotes) {
    if (!n) continue;
    noteIdMap.set(n.id, n);
    noteTitleMap.set(n.title, n);
    noteLowerTitleMap.set(n.title.toLowerCase().trim(), n);
  }

  return refs.map((ref) => {
    // 1. Try match by stable ID
    let matched = noteIdMap.get(ref);

    // 2. Try match by exact title
    if (!matched) {
      matched = noteTitleMap.get(ref);
    }

    // 3. Try match by case-insensitive title
    if (!matched) {
      matched = noteLowerTitleMap.get(ref.toLowerCase().trim());
    }

    if (matched) {
      return {
        targetNoteId: matched.id,
        targetTitle: matched.title,
        isDangling: false,
        isTrashed: Boolean(matched.trashed),
        rawWikilink: `[[${matched.title}]]`,
      };
    }

    // Dangling reference
    return {
      targetNoteId: null,
      targetTitle: ref,
      isDangling: true,
      isTrashed: false,
      rawWikilink: `[[${ref}]]`,
    };
  });
}

/**
 * Serializes relation targets back into canonical YAML property format
 */
export function formatRelationForFrontmatter(
  targetNoteIds: string[],
  allNotes: Note[],
  cardinality: 'single' | 'many' = 'many'
): string | string[] {
  const noteIdMap = new Map(allNotes.map((n) => [n.id, n]));

  const formatted = targetNoteIds
    .map((id) => {
      const target = noteIdMap.get(id);
      if (target) {
        return `[[${target.title}]]`;
      }
      return `[[${id}]]`;
    })
    .filter(Boolean);

  if (cardinality === 'single') {
    return formatted.length > 0 ? formatted[0] : '';
  }

  return formatted;
}

/**
 * Updates a relation property on a note content string
 */
export function setRelationInNoteContent(
  content: string,
  propertyKey: string,
  targetNoteIds: string[],
  allNotes: Note[],
  cardinality: 'single' | 'many' = 'many'
): string {
  const formattedVal = formatRelationForFrontmatter(targetNoteIds, allNotes, cardinality);
  return setPropertyInContent(
    content,
    propertyKey,
    formattedVal,
    cardinality === 'single' ? 'text' : 'multiselect'
  );
}
