import { Note } from '../../types';
import { VaultIndex, ParsedNote } from '../types';
import { WikilinkCandidate } from './intelligenceTypes';
import { tokenizeText } from '../lexicalRelatedness';

export interface WikilinkRankerOptions {
  limit?: number;
  includeNewNoteOption?: boolean;
  debugExplainability?: boolean;
  recentNoteIds?: string[];
}

/**
 * Fuzzy substring matcher returning score 0 to 1
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 1.0;
  if (t.startsWith(q)) return 0.85 + (q.length / t.length) * 0.15;
  if (t.includes(q)) return 0.65 + (q.length / t.length) * 0.15;

  // Subsequence matching
  let qIdx = 0;
  let matches = 0;
  let consecutive = 0;
  let maxConsecutive = 0;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      matches++;
      consecutive++;
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    } else {
      consecutive = 0;
    }
  }

  if (matches === q.length && q.length > 1) {
    const ratio = matches / t.length;
    return 0.4 + ratio * 0.2 + (maxConsecutive / q.length) * 0.1;
  }

  return 0.0;
}

/**
 * Rank Wikilink candidates for `[[` autocomplete
 */
export function rankWikilinkCandidates(
  query: string,
  localContext: {
    activeNoteId?: string;
    activeNoteContent?: string;
    currentParagraph?: string;
    currentHeading?: string;
  },
  allNotes: Note[],
  vaultIndex?: VaultIndex,
  options: WikilinkRankerOptions = {}
): WikilinkCandidate[] {
  const limit = options.limit || 8;
  const cleanQuery = query.trim().toLowerCase();
  const candidatesMap = new Map<string, WikilinkCandidate>();
  const activeNote = localContext.activeNoteId
    ? allNotes.find((n) => n.id === localContext.activeNoteId)
    : undefined;

  // Extract contextual tokens around cursor
  const contextText = `${localContext.currentParagraph || ''} ${localContext.currentHeading || ''}`.trim();
  const contextTokens = new Set(tokenizeText(contextText));
  const activeNoteTokens = activeNote ? new Set(tokenizeText(activeNote.content || '')) : new Set<string>();

  const recentSet = new Set(options.recentNoteIds || []);
  const activeNoteFolder = activeNote?.folderId;
  const activeNoteTags = new Set((activeNote?.tags || []).map((t) => t.toLowerCase().replace(/^#/, '')));

  // Check notes in vault
  for (const note of allNotes) {
    if (note.trashed) continue;
    if (activeNote && note.id === activeNote.id) continue;

    const noteTitle = note.title.trim() || 'Untitled Note';
    const noteLower = noteTitle.toLowerCase();
    const noteTags = (note.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''));

    // Check direct Title match
    let textScore = 0;
    let matchType: WikilinkCandidate['matchType'] = 'contextual';

    if (cleanQuery.length === 0) {
      // Empty query: rank purely by context and structural relevance
      textScore = 0.3;
      matchType = 'contextual';
    } else if (noteLower === cleanQuery) {
      textScore = 1.0;
      matchType = 'exact';
    } else if (noteLower.startsWith(cleanQuery)) {
      textScore = 0.85;
      matchType = 'prefix';
    } else {
      const fScore = fuzzyScore(cleanQuery, noteLower);
      if (fScore > 0.35) {
        textScore = fScore * 0.75;
        matchType = 'fuzzy';
      }
    }

    // Check Aliases if available from frontmatter / vault index
    let matchedAlias: string | undefined;
    if (vaultIndex && vaultIndex.notes[note.id]) {
      const parsed = vaultIndex.notes[note.id];
      for (const alias of parsed.aliases) {
        const aliasLower = alias.toLowerCase();
        if (cleanQuery.length > 0) {
          if (aliasLower === cleanQuery) {
            if (textScore < 0.95) {
              textScore = 0.95;
              matchType = 'alias';
              matchedAlias = alias;
            }
          } else if (aliasLower.startsWith(cleanQuery)) {
            if (textScore < 0.8) {
              textScore = 0.8;
              matchType = 'alias';
              matchedAlias = alias;
            }
          } else {
            const afScore = fuzzyScore(cleanQuery, aliasLower);
            if (afScore > 0.4 && afScore * 0.7 > textScore) {
              textScore = afScore * 0.7;
              matchType = 'alias';
              matchedAlias = alias;
            }
          }
        }
      }
    }

    // If there's a text query and no text match was found, skip note
    if (cleanQuery.length > 0 && textScore <= 0) {
      continue;
    }

    // Compute Structural Signals
    let structuralScore = 0;
    // 1. Same Folder
    if (activeNoteFolder && note.folderId === activeNoteFolder) {
      structuralScore += 0.15;
    }
    // 2. Shared Tags
    let sharedTagCount = 0;
    for (const t of noteTags) {
      if (activeNoteTags.has(t)) sharedTagCount++;
    }
    if (sharedTagCount > 0) {
      structuralScore += Math.min(0.25, sharedTagCount * 0.1);
    }
    // 3. Existing Backlinks relationship
    if (vaultIndex) {
      const backlinks = vaultIndex.backlinks[note.id] || [];
      const linksActive = backlinks.some((b) => b.sourceNoteId === localContext.activeNoteId);
      if (linksActive) structuralScore += 0.15;
    }

    // Compute Content Context Signals
    let contentContextScore = 0;
    const noteTitleTokens = tokenizeText(noteTitle);
    let matchedContextTokens = 0;
    for (const tt of noteTitleTokens) {
      if (contextTokens.has(tt)) matchedContextTokens++;
      else if (activeNoteTokens.has(tt)) matchedContextTokens += 0.5;
    }
    if (noteTitleTokens.length > 0 && matchedContextTokens > 0) {
      contentContextScore = Math.min(0.4, (matchedContextTokens / noteTitleTokens.length) * 0.4);
    }

    // Usage / Recency Signal
    const recencyScore = recentSet.has(note.id) ? 0.1 : 0.0;

    // Combined Weighted Score
    const totalScore = textScore * 1.5 + structuralScore + contentContextScore + recencyScore;

    const displayTitle = matchedAlias
      ? `${matchedAlias} — alias of ${noteTitle}`
      : noteTitle;

    candidatesMap.set(note.id, {
      noteId: note.id,
      title: noteTitle,
      displayTitle,
      isAlias: !!matchedAlias,
      canonicalTitle: matchedAlias ? noteTitle : undefined,
      alias: matchedAlias,
      folderPath: note.folderId || undefined,
      tags: noteTags.length > 0 ? noteTags : undefined,
      score: Math.round(totalScore * 100) / 100,
      matchType,
      scoreBreakdown: options.debugExplainability
        ? {
            textMatch: Math.round(textScore * 100) / 100,
            structural: Math.round(structuralScore * 100) / 100,
            contentContext: Math.round(contentContextScore * 100) / 100,
            recency: Math.round(recencyScore * 100) / 100,
            semanticBonus: 0,
          }
        : undefined,
    });
  }

  const results = Array.from(candidatesMap.values()).sort((a, b) => b.score - a.score);

  // Add "Create New Note" candidate if query is non-empty and doesn't exactly match an existing note
  if (
    cleanQuery.length > 0 &&
    (options.includeNewNoteOption !== false) &&
    !results.some((r) => r.title.toLowerCase() === cleanQuery)
  ) {
    const rawCapitalized = query.trim();
    results.push({
      title: rawCapitalized,
      displayTitle: `Create "${rawCapitalized}"`,
      isAlias: false,
      score: 0.01,
      matchType: 'new_note',
    });
  }

  return results.slice(0, limit);
}
