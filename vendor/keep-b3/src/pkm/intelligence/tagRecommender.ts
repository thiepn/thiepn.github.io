import { Note } from '../../types';
import { VaultIndex } from '../types';
import { TagSuggestion } from './intelligenceTypes';
import { tokenizeText, calculateIDF } from '../lexicalRelatedness';

export interface TagRecommenderOptions {
  limit?: number;
  minScore?: number;
  dismissedTags?: string[];
}

/**
 * Builds an in-memory tag co-occurrence matrix across the vault
 */
export function buildTagCoOccurrenceMap(
  notes: Note[]
): Map<string, Map<string, number>> {
  const coOccurrence = new Map<string, Map<string, number>>();

  for (const note of notes) {
    if (note.trashed || !note.tags || note.tags.length < 2) continue;

    const tags = Array.from(
      new Set(note.tags.map((t) => t.toLowerCase().replace(/^#/, '')))
    ).filter(Boolean);

    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const t1 = tags[i];
        const t2 = tags[j];

        if (!coOccurrence.has(t1)) coOccurrence.set(t1, new Map());
        if (!coOccurrence.has(t2)) coOccurrence.set(t2, new Map());

        const m1 = coOccurrence.get(t1)!;
        const m2 = coOccurrence.get(t2)!;

        m1.set(t2, (m1.get(t2) || 0) + 1);
        m2.set(t1, (m2.get(t1) || 0) + 1);
      }
    }
  }

  return coOccurrence;
}

/**
 * Computes suggested existing tags for a note
 */
export function suggestTagsForNote(
  note: Note,
  allNotes: Note[],
  vaultIndex?: VaultIndex,
  options: TagRecommenderOptions = {}
): TagSuggestion[] {
  const limit = options.limit || 5;
  const minScore = options.minScore || 0.25;
  const dismissedSet = new Set(
    (options.dismissedTags || []).map((t) => t.toLowerCase().replace(/^#/, ''))
  );

  const existingNoteTags = new Set(
    (note.tags || []).map((t) => t.toLowerCase().replace(/^#/, ''))
  );

  // 1. Calculate vault-wide tag frequencies and IDF
  const tagFrequency = new Map<string, number>();
  const totalNotes = allNotes.filter((n) => !n.trashed).length;

  for (const n of allNotes) {
    if (n.trashed || !n.tags) continue;
    const uniqueTags = new Set(
      n.tags.map((t) => t.toLowerCase().replace(/^#/, ''))
    );
    for (const t of uniqueTags) {
      if (!t) continue;
      tagFrequency.set(t, (tagFrequency.get(t) || 0) + 1);
    }
  }

  if (tagFrequency.size === 0) return [];

  // Build tag co-occurrence
  const coOccurrenceMap = buildTagCoOccurrenceMap(allNotes);

  // Tokenize note content and title
  const noteTokens = new Set(
    tokenizeText(`${note.title} ${note.content || ''}`)
  );

  const candidateScores = new Map<
    string,
    { score: number; reasons: string[]; source: TagSuggestion['source'] }
  >();

  // 2. Score Candidate Tags from Co-occurrence with existing tags on note
  for (const existingTag of existingNoteTags) {
    const coTags = coOccurrenceMap.get(existingTag);
    if (coTags) {
      for (const [candidateTag, count] of coTags.entries()) {
        if (existingNoteTags.has(candidateTag) || dismissedSet.has(candidateTag)) continue;

        const freq = tagFrequency.get(candidateTag) || 1;
        // Inverse document frequency penalty for overly ubiquitous tags (>70% of notes)
        const idfWeight = calculateIDF(freq, totalNotes);
        const coScore = (count / (freq + 1)) * idfWeight * 0.8;

        const current = candidateScores.get(candidateTag) || {
          score: 0,
          reasons: [],
          source: 'co_occurrence',
        };
        current.score += coScore;
        current.reasons.push(`Co-occurs with #${existingTag}`);
        candidateScores.set(candidateTag, current);
      }
    }
  }

  // 3. Score Candidate Tags from Keyword Matching in Content/Title
  for (const [candidateTag, freq] of tagFrequency.entries()) {
    if (existingNoteTags.has(candidateTag) || dismissedSet.has(candidateTag)) continue;

    const tagTokens = tokenizeText(candidateTag.replace(/[-_]/g, ' '));
    let matches = 0;
    for (const tt of tagTokens) {
      if (noteTokens.has(tt)) matches++;
    }

    if (matches > 0 && tagTokens.length > 0) {
      const matchRatio = matches / tagTokens.length;
      const idfWeight = calculateIDF(freq, totalNotes);
      const keywordScore = matchRatio * idfWeight * 0.6;

      const current = candidateScores.get(candidateTag) || {
        score: 0,
        reasons: [],
        source: 'keywords',
      };
      current.score += keywordScore;
      current.reasons.push('Matches keywords in note');
      if (current.source !== 'co_occurrence') current.source = 'keywords';
      candidateScores.set(candidateTag, current);
    }
  }

  // 4. Score Candidate Tags from Same Folder
  if (note.folderId) {
    const folderNotes = allNotes.filter(
      (n) => !n.trashed && n.folderId === note.folderId && n.id !== note.id
    );
    for (const fn of folderNotes) {
      for (const t of fn.tags || []) {
        const clean = t.toLowerCase().replace(/^#/, '');
        if (existingNoteTags.has(clean) || dismissedSet.has(clean)) continue;

        const current = candidateScores.get(clean) || {
          score: 0,
          reasons: [],
          source: 'folder',
        };
        current.score += 0.2;
        if (!current.reasons.includes('Common in this folder')) {
          current.reasons.push('Common in this folder');
        }
        candidateScores.set(clean, current);
      }
    }
  }

  // 5. Build, filter, and sort final suggestions
  const suggestions: TagSuggestion[] = [];

  for (const [tag, data] of candidateScores.entries()) {
    const freq = tagFrequency.get(tag) || 1;
    // Suppress tags that appear in > 80% of all notes (e.g. generic #notes)
    if (totalNotes > 5 && freq / totalNotes > 0.8) continue;

    const normalizedScore = Math.min(1.0, Math.round(data.score * 100) / 100);
    if (normalizedScore >= minScore) {
      suggestions.push({
        tag,
        score: normalizedScore,
        confidence: normalizedScore >= 0.6 ? 'strong' : 'moderate',
        reason: data.reasons.slice(0, 2).join('; '),
        source: data.source,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}
