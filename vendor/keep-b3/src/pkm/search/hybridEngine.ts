import { Note, Folder } from '../../types';
import {
  HybridSearchResult,
  LexicalHit,
  SemanticHit,
  SearchFilterOptions,
  VectorRecord,
  HighlightRange,
  SearchChunk,
} from './searchTypes';
import { calculateCosineSimilarity } from '../embeddingsEngine';

/**
 * Tokenizes text into lowercase words/terms, stripping common punctuation
 */
export function tokenizeQuery(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Normalizes text for case-insensitive and punctuation-tolerant exact comparisons
 */
export function normalizeForMatch(text: string): string {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Finds character highlight ranges of query terms inside an excerpt string
 */
export function findHighlightRanges(excerpt: string, terms: string[]): HighlightRange[] {
  if (!excerpt || terms.length === 0) return [];
  const ranges: HighlightRange[] = [];
  const lower = excerpt.toLowerCase();

  for (const term of terms) {
    if (term.length < 2) continue;
    let startIdx = 0;
    while ((startIdx = lower.indexOf(term, startIdx)) !== -1) {
      ranges.push({
        start: startIdx,
        end: startIdx + term.length,
      });
      startIdx += term.length;
    }
  }

  // Merge overlapping ranges
  if (ranges.length <= 1) return ranges;
  ranges.sort((a, b) => a.start - b.start);

  const merged: HighlightRange[] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = ranges[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Extracts a concise, high-relevance excerpt around the best matched terms or chunk
 */
export function extractContextualExcerpt(
  content: string,
  terms: string[],
  preferredHeading?: string,
  maxLength = 180
): string {
  if (!content) return '';
  const cleanContent = content
    .replace(/^#+\s+/gm, '') // Remove markdown heading hashes
    .replace(/\[\[(.*?)\]\]/g, '$1') // Flatten wikilinks
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  // If terms exist, find first occurrence of highest-priority term
  const lower = cleanContent.toLowerCase();
  let bestPos = -1;

  for (const term of terms) {
    const pos = lower.indexOf(term.toLowerCase());
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) {
    return cleanContent.slice(0, maxLength) + '...';
  }

  const half = Math.floor(maxLength / 2);
  let start = Math.max(0, bestPos - half);
  let end = Math.min(cleanContent.length, start + maxLength);

  if (end - start < maxLength) {
    start = Math.max(0, end - maxLength);
  }

  let snippet = cleanContent.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < cleanContent.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Computes fast, robust Lexical / Keyword matches with BM25-style field boosts
 */
export function executeLexicalSearch(
  query: string,
  notes: Note[],
  filter?: SearchFilterOptions
): LexicalHit[] {
  const normQuery = normalizeForMatch(query);
  const terms = tokenizeQuery(query);
  if (terms.length === 0 && !normQuery) return [];

  const hits: LexicalHit[] = [];

  for (const note of notes) {
    if (!filter?.includeTrashed && note.trashed) continue;
    if (!filter?.includeArchived && note.archived) continue;
    if (filter?.folderId !== undefined && note.folderId !== filter.folderId) continue;
    if (filter?.tag && !note.tags?.some((t) => t.toLowerCase() === filter.tag!.toLowerCase())) continue;

    const titleNorm = normalizeForMatch(note.title);
    const contentNorm = normalizeForMatch(note.content);
    const tagsNorm = (note.tags || []).map((t) => normalizeForMatch(t));

    let score = 0;
    const matchedFields = new Set<'title' | 'heading' | 'tag' | 'alias' | 'content' | 'property'>();
    let exactTitle = false;
    let exactPhrase = false;
    let matchedHeading: string | undefined = undefined;

    // 1. Exact Title Match (Highest priority)
    if (titleNorm === normQuery) {
      score += 25.0;
      matchedFields.add('title');
      exactTitle = true;
    } else if (titleNorm.startsWith(normQuery)) {
      score += 15.0;
      matchedFields.add('title');
    } else if (titleNorm.includes(normQuery)) {
      score += 10.0;
      matchedFields.add('title');
    }

    // 2. Exact Phrase Match in Content
    if (normQuery.length > 2 && contentNorm.includes(normQuery)) {
      score += 8.0;
      matchedFields.add('content');
      exactPhrase = true;
    }

    // 3. Tag Matches
    for (const tag of tagsNorm) {
      if (tag === normQuery || tag === normQuery.replace(/^#/, '')) {
        score += 8.0;
        matchedFields.add('tag');
      } else if (tag.includes(normQuery)) {
        score += 4.0;
        matchedFields.add('tag');
      }
    }

    // 4. Token-level matches
    let matchedTermCount = 0;
    for (const term of terms) {
      let termMatched = false;

      // Title term hit
      if (titleNorm.includes(term)) {
        score += 4.0;
        matchedFields.add('title');
        termMatched = true;
      }

      // Tag term hit
      if (tagsNorm.some((t) => t.includes(term))) {
        score += 3.0;
        matchedFields.add('tag');
        termMatched = true;
      }

      // Heading term hit in markdown
      const headingMatches = (note.content || '').match(/^#{1,6}\s+(.+)$/gm);
      if (headingMatches) {
        for (const h of headingMatches) {
          if (h.toLowerCase().includes(term)) {
            score += 2.5;
            matchedFields.add('heading');
            matchedHeading = h.replace(/^#{1,6}\s+/, '');
            termMatched = true;
            break;
          }
        }
      }

      // Content term hit
      if (contentNorm.includes(term)) {
        // Count term frequency up to a cap
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const count = (contentNorm.match(regex) || []).length;
        score += Math.min(4.0, 1.0 + Math.log2(count + 1));
        matchedFields.add('content');
        termMatched = true;
      }

      if (termMatched) {
        matchedTermCount++;
      }
    }

    // Require either exact title/phrase or at least one matched term
    if (score > 0 && (exactTitle || exactPhrase || matchedTermCount > 0)) {
      // Bonus if all terms matched
      if (matchedTermCount === terms.length && terms.length > 1) {
        score += 3.0;
      }

      const excerpt = extractContextualExcerpt(note.content, terms, matchedHeading);
      const highlightRanges = findHighlightRanges(excerpt, terms);

      hits.push({
        noteId: note.id,
        score,
        matchedFields: Array.from(matchedFields),
        exactTitleMatch: exactTitle,
        exactPhraseMatch: exactPhrase,
        matchedHeading,
        matchedTags: (note.tags || []).filter((t) => terms.some((term) => t.toLowerCase().includes(term))),
        excerpt,
        highlightRanges,
      });
    }
  }

  // Sort descending by score
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

/**
 * Computes semantic similarity across stored vectors
 */
export function executeSemanticVectorSearch(
  queryVector: Float32Array | number[],
  vectors: VectorRecord[],
  notesMap: Map<string, Note>,
  filter?: SearchFilterOptions
): SemanticHit[] {
  const minThreshold = filter?.threshold ?? 0.35;
  const hitsByNote = new Map<string, { bestHit: SemanticHit; hitsCount: number }>();

  for (const record of vectors) {
    const note = notesMap.get(record.noteId);
    if (!note) continue;
    if (!filter?.includeTrashed && note.trashed) continue;
    if (!filter?.includeArchived && note.archived) continue;
    if (filter?.folderId !== undefined && note.folderId !== filter.folderId) continue;
    if (filter?.tag && !note.tags?.some((t) => t.toLowerCase() === filter.tag!.toLowerCase())) continue;

    const sim = calculateCosineSimilarity(queryVector, record.vector);
    if (sim >= minThreshold) {
      const hit: SemanticHit = {
        noteId: record.noteId,
        chunkId: record.chunkId,
        score: sim,
        heading: record.heading,
        chunkText: '',
        excerpt: extractContextualExcerpt(note.content, [], record.heading),
      };

      const existing = hitsByNote.get(record.noteId);
      if (!existing || sim > existing.bestHit.score) {
        hitsByNote.set(record.noteId, {
          bestHit: hit,
          hitsCount: (existing?.hitsCount || 0) + 1,
        });
      } else {
        existing.hitsCount += 1;
      }
    }
  }

  const results: SemanticHit[] = [];
  for (const { bestHit, hitsCount } of hitsByNote.values()) {
    // Multi-chunk match slight boost (up to +0.05)
    const multiChunkBonus = Math.min(0.05, (hitsCount - 1) * 0.015);
    results.push({
      ...bestHit,
      score: Math.min(1.0, bestHit.score + multiChunkBonus),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Reciprocal Rank Fusion (RRF) combining Lexical and Semantic ranks
 * Formula: RRF(d) = (W_lex / (k + rank_lex)) + (W_sem / (k + rank_sem)) + exact_match_boosts
 */
export function fuseHybridSearchResults(
  lexicalHits: LexicalHit[],
  semanticHits: SemanticHit[],
  notesMap: Map<string, Note>,
  foldersMap: Map<string, Folder>,
  query: string,
  options?: {
    mode?: 'hybrid' | 'exact' | 'semantic';
    rrfK?: number;
    titleBoost?: number;
    limit?: number;
  }
): HybridSearchResult[] {
  const mode = options?.mode || 'hybrid';
  const k = options?.rrfK || 60;
  const limit = options?.limit || 30;
  const terms = tokenizeQuery(query);

  const combinedMap = new Map<
    string,
    {
      lexicalHit?: LexicalHit;
      semanticHit?: SemanticHit;
      lexicalRank?: number;
      semanticRank?: number;
      rrfScore: number;
    }
  >();

  // Index lexical hits
  if (mode !== 'semantic') {
    lexicalHits.forEach((hit, idx) => {
      const rank = idx + 1;
      const entry = combinedMap.get(hit.noteId) || { rrfScore: 0 };
      entry.lexicalHit = hit;
      entry.lexicalRank = rank;
      entry.rrfScore += 1.0 / (k + rank);
      combinedMap.set(hit.noteId, entry);
    });
  }

  // Index semantic hits
  if (mode !== 'exact') {
    semanticHits.forEach((hit, idx) => {
      const rank = idx + 1;
      const entry = combinedMap.get(hit.noteId) || { rrfScore: 0 };
      entry.semanticHit = hit;
      entry.semanticRank = rank;
      // Semantic weight weight
      const weight = mode === 'semantic' ? 1.0 : 0.85;
      entry.rrfScore += weight / (k + rank);
      combinedMap.set(hit.noteId, entry);
    });
  }

  const results: HybridSearchResult[] = [];

  for (const [noteId, data] of combinedMap.entries()) {
    const note = notesMap.get(noteId);
    if (!note) continue;

    const folder = note.folderId ? foldersMap.get(note.folderId) : undefined;
    const folderName = folder ? folder.name : undefined;

    let matchMode: 'exact' | 'semantic' | 'hybrid' = 'exact';
    let primaryHitType: 'exact_title' | 'exact_phrase' | 'lexical' | 'semantic' | 'hybrid' = 'lexical';

    let boost = 0;
    if (data.lexicalHit?.exactTitleMatch) {
      boost += 0.5; // Massive boost for exact title hit
      primaryHitType = 'exact_title';
    } else if (data.lexicalHit?.exactPhraseMatch) {
      boost += 0.2;
      primaryHitType = 'exact_phrase';
    }

    if (data.lexicalHit && data.semanticHit) {
      matchMode = 'hybrid';
      if (!data.lexicalHit.exactTitleMatch && !data.lexicalHit.exactPhraseMatch) {
        primaryHitType = 'hybrid';
      }
      boost += 0.05; // Co-occurrence boost
    } else if (data.semanticHit) {
      matchMode = 'semantic';
      primaryHitType = 'semantic';
    }

    const totalCombinedScore = data.rrfScore + boost;

    // Pick best excerpt
    const topExcerpt =
      data.lexicalHit?.excerpt ||
      data.semanticHit?.excerpt ||
      extractContextualExcerpt(note.content, terms);

    const highlightRanges =
      data.lexicalHit?.highlightRanges || findHighlightRanges(topExcerpt, terms);

    const matchedHeading = data.lexicalHit?.matchedHeading || data.semanticHit?.heading;
    const matchedTags = data.lexicalHit?.matchedTags || [];

    results.push({
      noteId,
      note,
      folderName,
      combinedScore: totalCombinedScore,
      rrfScore: data.rrfScore,
      lexicalScore: data.lexicalHit?.score,
      semanticScore: data.semanticHit?.score,
      lexicalRank: data.lexicalRank,
      semanticRank: data.semanticRank,
      matchMode,
      primaryHitType,
      topExcerpt,
      matchedHeading,
      matchedTags,
      highlightRanges,
    });
  }

  // Sort descending by combined score
  results.sort((a, b) => b.combinedScore - a.combinedScore);

  return results.slice(0, limit);
}
