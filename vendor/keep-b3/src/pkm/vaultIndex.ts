import { Note } from '../types';
import {
  VaultIndex,
  ParsedNote,
  PKMBacklink,
  PKMWikiLink,
} from './types';
import { parseNote } from './parser';
import { PKMResolver } from './resolver';

/**
 * Creates an empty, clean VaultIndex structure
 */
export function createEmptyVaultIndex(): VaultIndex {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    noteCount: 0,
    notes: {},
    titleToNoteIds: {},
    aliasToNoteIds: {},
    folderToNoteIds: {},
    tagToNoteIds: {},
    forwardLinks: {},
    backlinks: {},
    unresolvedLinks: {},
    tagCounts: {},
    tasks: {},
    allTasks: [],
    propertyDictionary: {},
    citationsByKey: {},
  };
}

/**
 * Build complete Derived VaultIndex from a collection of notes (Full Rebuild)
 */
export function buildVaultIndex(notes: Note[]): VaultIndex {
  const index = createEmptyVaultIndex();

  // Phase 1: Parse all non-trashed notes into ParsedNote entries and populate direct indices
  for (const rawNote of notes) {
    if (!rawNote || rawNote.trashed) continue;

    const parsed = parseNote(rawNote);
    const noteId = parsed.noteId;

    index.notes[noteId] = parsed;
    index.noteCount++;

    // Title index (canonical lower-cased)
    const normTitle = parsed.canonicalTitle;
    if (normTitle) {
      if (!index.titleToNoteIds[normTitle]) {
        index.titleToNoteIds[normTitle] = [];
      }
      index.titleToNoteIds[normTitle].push(noteId);
    }

    // Aliases index
    for (const alias of parsed.aliases) {
      const normAlias = alias.toLowerCase().trim();
      if (normAlias) {
        if (!index.aliasToNoteIds[normAlias]) {
          index.aliasToNoteIds[normAlias] = [];
        }
        index.aliasToNoteIds[normAlias].push(noteId);
      }
    }

    // Folder index
    if (parsed.folderId) {
      if (!index.folderToNoteIds[parsed.folderId]) {
        index.folderToNoteIds[parsed.folderId] = [];
      }
      index.folderToNoteIds[parsed.folderId].push(noteId);
    }

    // Tag index & counts
    for (const tag of parsed.tags) {
      if (!index.tagToNoteIds[tag]) {
        index.tagToNoteIds[tag] = [];
      }
      index.tagToNoteIds[tag].push(noteId);
      index.tagCounts[tag] = (index.tagCounts[tag] || 0) + 1;
    }
  }

  // Phase 2: Compute forward links, backlinks, and unresolved links across all indexed notes
  for (const parsed of Object.values(index.notes)) {
    const noteId = parsed.noteId;
    const forwardTargets = new Set<string>();
    const unresolved: PKMWikiLink[] = [];

    // Check explicit linkedNoteIds
    const rawNote = notes.find((n) => n.id === noteId);
    if (rawNote?.linkedNoteIds) {
      for (const explicitId of rawNote.linkedNoteIds) {
        if (index.notes[explicitId] && explicitId !== noteId) {
          forwardTargets.add(explicitId);
        }
      }
    }

    // Check outgoing wiki links & embeds
    const allLinks = [...parsed.outgoingLinks, ...parsed.embeds.map((e) => ({
      raw: e.raw,
      target: e.target,
      subpath: e.subpath,
      line: e.line,
      charOffset: e.charOffset,
    }))];

    for (const link of allLinks) {
      const res = PKMResolver.resolveLink(link.target, index, { currentNoteId: noteId });

      if (res.status === 'resolved' && res.resolvedNoteId && res.resolvedNoteId !== noteId) {
        forwardTargets.add(res.resolvedNoteId);

        // Add to target's backlinks
        const targetId = res.resolvedNoteId;
        if (!index.backlinks[targetId]) {
          index.backlinks[targetId] = [];
        }

        // Get context snippet
        const lines = (rawNote?.content || '').split('\n');
        const snippet = lines[link.line] || link.raw;

        const backlinkEntry: PKMBacklink = {
          sourceNoteId: noteId,
          sourceNoteTitle: parsed.title,
          link,
          contextSnippet: snippet.trim(),
        };

        // Prevent duplicate backlinks from the exact same line/charOffset
        const exists = index.backlinks[targetId].some(
          (b) =>
            b.sourceNoteId === noteId &&
            b.link.charOffset === link.charOffset &&
            b.link.target === link.target
        );
        if (!exists) {
          index.backlinks[targetId].push(backlinkEntry);
        }
      } else if (res.status === 'missing') {
        unresolved.push(link);
      }
    }

    index.forwardLinks[noteId] = Array.from(forwardTargets);
    if (unresolved.length > 0) {
      index.unresolvedLinks[noteId] = unresolved;
    }
  }

  // Sort backlinks deterministically for stability
  for (const key of Object.keys(index.backlinks)) {
    index.backlinks[key].sort((a, b) =>
      a.sourceNoteId.localeCompare(b.sourceNoteId) || a.link.line - b.link.line
    );
  }

  // Phase 3: Aggregate tasks & citations across parsed notes
  const allTasksList = [];
  index.citationsByKey = {};

  for (const parsed of Object.values(index.notes)) {
    if (parsed.tasks && parsed.tasks.length > 0) {
      index.tasks[parsed.noteId] = parsed.tasks;
      allTasksList.push(...parsed.tasks);
    }

    if (parsed.citations && parsed.citations.length > 0) {
      const rawLines = (parsed.rawContent || '').split('\n');
      for (const cit of parsed.citations) {
        const keyLower = cit.citationKey.toLowerCase();
        if (!index.citationsByKey[keyLower]) {
          index.citationsByKey[keyLower] = [];
        }
        index.citationsByKey[keyLower].push({
          noteId: parsed.noteId,
          noteTitle: parsed.title,
          citationKey: cit.citationKey,
          locator: cit.locator,
          line: cit.line,
          contextSnippet: (rawLines[cit.line] || '').trim().slice(0, 100),
        });
      }
    }
  }
  index.allTasks = allTasksList;

  index.generatedAt = new Date().toISOString();
  return index;
}

/**
 * Remove a note completely from secondary inverted indexes (title, alias, folder, tag, backlinks)
 */
function removeNoteFromInvertedIndices(noteId: string, index: VaultIndex): ParsedNote | null {
  const oldParsed = index.notes[noteId];
  if (!oldParsed) return null;

  // 1. Remove from title map
  const oldTitle = oldParsed.canonicalTitle;
  if (oldTitle && index.titleToNoteIds[oldTitle]) {
    index.titleToNoteIds[oldTitle] = index.titleToNoteIds[oldTitle].filter((id) => id !== noteId);
    if (index.titleToNoteIds[oldTitle].length === 0) {
      delete index.titleToNoteIds[oldTitle];
    }
  }

  // 2. Remove from aliases map
  for (const alias of oldParsed.aliases) {
    const norm = alias.toLowerCase().trim();
    if (norm && index.aliasToNoteIds[norm]) {
      index.aliasToNoteIds[norm] = index.aliasToNoteIds[norm].filter((id) => id !== noteId);
      if (index.aliasToNoteIds[norm].length === 0) {
        delete index.aliasToNoteIds[norm];
      }
    }
  }

  // 3. Remove from folder map
  if (oldParsed.folderId && index.folderToNoteIds[oldParsed.folderId]) {
    index.folderToNoteIds[oldParsed.folderId] = index.folderToNoteIds[oldParsed.folderId].filter(
      (id) => id !== noteId
    );
    if (index.folderToNoteIds[oldParsed.folderId].length === 0) {
      delete index.folderToNoteIds[oldParsed.folderId];
    }
  }

  // 4. Remove from tag map & counts
  for (const tag of oldParsed.tags) {
    if (index.tagToNoteIds[tag]) {
      index.tagToNoteIds[tag] = index.tagToNoteIds[tag].filter((id) => id !== noteId);
      if (index.tagToNoteIds[tag].length === 0) {
        delete index.tagToNoteIds[tag];
      }
    }
    if (index.tagCounts[tag]) {
      index.tagCounts[tag]--;
      if (index.tagCounts[tag] <= 0) {
        delete index.tagCounts[tag];
      }
    }
  }

  // 5. Remove outgoing links from other notes' backlinks
  const oldTargets = index.forwardLinks[noteId] || [];
  for (const targetId of oldTargets) {
    if (index.backlinks[targetId]) {
      index.backlinks[targetId] = index.backlinks[targetId].filter(
        (b) => b.sourceNoteId !== noteId
      );
      if (index.backlinks[targetId].length === 0) {
        delete index.backlinks[targetId];
      }
    }
  }

  delete index.forwardLinks[noteId];
  delete index.unresolvedLinks[noteId];
  delete index.backlinks[noteId]; // Its own backlinks will be recomputed if needed
  delete index.notes[noteId];
  index.noteCount--;

  return oldParsed;
}

/**
 * Incrementally update index for a single note (Create, Update, or Delete)
 * Avoids rescanning un-affected notes.
 */
export function applyIncrementalNoteUpdate(
  note: Note | null, // null or trashed = delete
  noteId: string,
  index: VaultIndex,
  allNotesLookup?: Map<string, Note>
): VaultIndex {
  const isDeletion = !note || note.trashed;

  // 1. Remove old version of the note from inverted indices
  const oldParsed = removeNoteFromInvertedIndices(noteId, index);

  if (isDeletion) {
    // If a note was deleted, notes that were linking to it now have unresolved links
    // Check if any note has backlinks to this deleted noteId and move to unresolved
    return index;
  }

  // 2. Parse the new/updated note
  const parsed = parseNote(note);
  index.notes[noteId] = parsed;
  index.noteCount++;

  // 3. Add to title index
  const normTitle = parsed.canonicalTitle;
  if (normTitle) {
    if (!index.titleToNoteIds[normTitle]) {
      index.titleToNoteIds[normTitle] = [];
    }
    index.titleToNoteIds[normTitle].push(noteId);
  }

  // 4. Add to alias index
  for (const alias of parsed.aliases) {
    const norm = alias.toLowerCase().trim();
    if (norm) {
      if (!index.aliasToNoteIds[norm]) {
        index.aliasToNoteIds[norm] = [];
      }
      index.aliasToNoteIds[norm].push(noteId);
    }
  }

  // 5. Add to folder index
  if (parsed.folderId) {
    if (!index.folderToNoteIds[parsed.folderId]) {
      index.folderToNoteIds[parsed.folderId] = [];
    }
    index.folderToNoteIds[parsed.folderId].push(noteId);
  }

  // 6. Add to tag index & counts
  for (const tag of parsed.tags) {
    if (!index.tagToNoteIds[tag]) {
      index.tagToNoteIds[tag] = [];
    }
    index.tagToNoteIds[tag].push(noteId);
    index.tagCounts[tag] = (index.tagCounts[tag] || 0) + 1;
  }

  // 7. Recompute forward links & backlinks for this note
  const forwardTargets = new Set<string>();
  const unresolved: PKMWikiLink[] = [];

  if (note.linkedNoteIds) {
    for (const explicitId of note.linkedNoteIds) {
      if (index.notes[explicitId] && explicitId !== noteId) {
        forwardTargets.add(explicitId);
      }
    }
  }

  const allLinks = [...parsed.outgoingLinks, ...parsed.embeds.map((e) => ({
    raw: e.raw,
    target: e.target,
    subpath: e.subpath,
    line: e.line,
    charOffset: e.charOffset,
  }))];

  const contentLines = (note.content || '').split('\n');

  for (const link of allLinks) {
    const res = PKMResolver.resolveLink(link.target, index, { currentNoteId: noteId });

    if (res.status === 'resolved' && res.resolvedNoteId && res.resolvedNoteId !== noteId) {
      const targetId = res.resolvedNoteId;
      forwardTargets.add(targetId);

      if (!index.backlinks[targetId]) {
        index.backlinks[targetId] = [];
      }

      const snippet = contentLines[link.line] || link.raw;
      const backlinkEntry: PKMBacklink = {
        sourceNoteId: noteId,
        sourceNoteTitle: parsed.title,
        link,
        contextSnippet: snippet.trim(),
      };

      const exists = index.backlinks[targetId].some(
        (b) =>
          b.sourceNoteId === noteId &&
          b.link.charOffset === link.charOffset &&
          b.link.target === link.target
      );
      if (!exists) {
        index.backlinks[targetId].push(backlinkEntry);
      }
    } else if (res.status === 'missing') {
      unresolved.push(link);
    }
  }

  index.forwardLinks[noteId] = Array.from(forwardTargets);
  if (unresolved.length > 0) {
    index.unresolvedLinks[noteId] = unresolved;
  }

  // 8. If title or aliases changed, check if any previously unresolved links in OTHER notes now resolve to this note
  const titleChanged = !oldParsed || oldParsed.canonicalTitle !== parsed.canonicalTitle;
  if (titleChanged) {
    const candidateKeys = [parsed.canonicalTitle, ...parsed.aliases.map((a) => a.toLowerCase().trim())];

    for (const [sourceId, unresList] of Object.entries(index.unresolvedLinks)) {
      if (sourceId === noteId) continue;

      const remainingUnres: PKMWikiLink[] = [];
      for (const unresLink of unresList) {
        const linkTargetLower = unresLink.target.toLowerCase().trim();
        if (candidateKeys.includes(linkTargetLower)) {
          // This previously unresolved link now resolves to this note!
          const sourceParsed = index.notes[sourceId];
          if (sourceParsed) {
            if (!index.forwardLinks[sourceId]) {
              index.forwardLinks[sourceId] = [];
            }
            if (!index.forwardLinks[sourceId].includes(noteId)) {
              index.forwardLinks[sourceId].push(noteId);
            }

            if (!index.backlinks[noteId]) {
              index.backlinks[noteId] = [];
            }

            let snippet = unresLink.raw;
            if (allNotesLookup && allNotesLookup.has(sourceId)) {
              const srcNote = allNotesLookup.get(sourceId);
              const sLines = (srcNote?.content || '').split('\n');
              snippet = sLines[unresLink.line] || unresLink.raw;
            }

            index.backlinks[noteId].push({
              sourceNoteId: sourceId,
              sourceNoteTitle: sourceParsed.title,
              link: unresLink,
              contextSnippet: snippet.trim(),
            });
          }
        } else {
          remainingUnres.push(unresLink);
        }
      }

      if (remainingUnres.length === 0) {
        delete index.unresolvedLinks[sourceId];
      } else {
        index.unresolvedLinks[sourceId] = remainingUnres;
      }
    }
  }

  // 9. Re-sort backlinks for determinism across all modified target IDs
  const modifiedBacklinkKeys = new Set<string>();
  if (index.backlinks[noteId]) modifiedBacklinkKeys.add(noteId);
  for (const tid of forwardTargets) {
    if (index.backlinks[tid]) modifiedBacklinkKeys.add(tid);
  }

  for (const bKey of modifiedBacklinkKeys) {
    if (index.backlinks[bKey]) {
      index.backlinks[bKey].sort((a, b) =>
        a.sourceNoteId.localeCompare(b.sourceNoteId) || a.link.line - b.link.line
      );
    }
  }

  index.generatedAt = new Date().toISOString();
  return index;
}
