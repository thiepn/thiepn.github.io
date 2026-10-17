import { Note } from '../types';
import { isStopWord } from './stopWords';
import {
  TokenizedDocument,
  LexicalIndex,
  InferredRelation,
  SemanticSettings,
} from './semanticTypes';

// Field weights for intelligent lexical matching
export const FIELD_WEIGHTS = {
  TITLE: 5.0,
  ALIAS: 4.0,
  TAG: 3.0,
  HEADING: 2.0,
  BODY: 1.0,
};

// BM25 parameters
const K1 = 1.2;
const B = 0.75;

/**
 * Computes a fast string hash for note content to support caching and cache invalidation
 */
export function computeNoteContentHash(note: Partial<Note> & { id?: string; title?: string; content?: string }): string {
  const payload = `${note.id || ''}|${note.title || ''}|${note.content || ''}|${(note.tags || []).join(',')}|${(note.checklist || [])
    .map((c) => c.text)
    .join(',')}|${note.updatedAt || ''}`;
  
  // Fast 32-bit FNV-1a hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Normalizes text with diacritics stripping, Turkish special casing, and CJK segmentation support.
 */
export function normalizeTextMultilingual(text: string): string {
  if (!text) return '';
  // 1. Handle Turkish dotted/dotless I edge-cases and German eszett safely
  let s = text.replace(/\u0130/g, 'i').replace(/\u0131/g, 'i').replace(/ß/g, 'ss');
  
  // 2. Unicode NFD normalization and diacritic removal (e.g. café -> cafe, München -> Munchen)
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

  // 3. Re-compose into standard NFC so decomposed Hangul/alphabets form canonical syllables
  return s.normalize('NFC').toLowerCase();
}

/**
 * Fast, lightweight morphological stemmer for English vocabulary
 */
export function stemWord(word: string): string {
  if (word.length <= 3) return word;
  let w = word.toLowerCase();
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('tion') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('ions') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('ers') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) return w.slice(0, -1);
  return w;
}

/**
 * Tokenizes text into lowercase words, stripping punctuation, filtering stop words,
 * normalizing diacritics, and extracting CJK / Hangul / Latin tokens.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeTextMultilingual(text);

  // Extract CJK / Hangul characters as unigrams and bigrams for robust indexing without whitespace
  const cjkChars = normalized.match(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gu) || [];
  const cjkTokens: string[] = [];
  for (let i = 0; i < cjkChars.length; i++) {
    cjkTokens.push(cjkChars[i]);
    if (i < cjkChars.length - 1) {
      cjkTokens.push(cjkChars[i] + cjkChars[i + 1]); // character bi-gram
    }
  }

  // Standard whitespace / alphanumeric tokenization for Latin, Cyrillic, Greek, Arabic, etc.
  const words = normalized
    .replace(/[^\p{L}\p{N}_\-#]/gu, ' ')
    .split(/\s+/);

  const tokens: string[] = [...cjkTokens];
  for (let w of words) {
    w = w.trim();
    if (w.startsWith('#')) w = w.slice(1);
    if (!w || isStopWord(w)) continue;
    const stemmed = stemWord(w);
    tokens.push(stemmed);
  }
  return tokens;
}

/**
 * Tokenizes and weights a note across all its structured fields
 */
export function tokenizeNote(note: Note): TokenizedDocument {
  const contentHash = computeNoteContentHash(note);

  const titleTokens = new Map<string, number>();
  for (const t of tokenizeText(note.title)) {
    titleTokens.set(t, (titleTokens.get(t) || 0) + 1);
  }

  // Extract aliases from frontmatter or note properties if any
  const aliasTokens = new Map<string, number>();
  // Match potential aliases frontmatter e.g. aliases: [a, b]
  const aliasMatch = note.content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (aliasMatch) {
    const frontmatter = aliasMatch[1];
    const aliasesLine = frontmatter.match(/aliases:\s*\[(.*?)\]|aliases:\s*\n((?:\s*-\s*.*?\n)+)/i);
    if (aliasesLine) {
      const rawAliases = aliasesLine[1] || aliasesLine[2] || '';
      for (const t of tokenizeText(rawAliases)) {
        aliasTokens.set(t, (aliasTokens.get(t) || 0) + 1);
      }
    }
  }

  // Tags
  const tagTokens = new Map<string, number>();
  for (const tag of note.tags || []) {
    for (const t of tokenizeText(tag)) {
      tagTokens.set(t, (tagTokens.get(t) || 0) + 1);
    }
  }

  // Headings & Body
  const headingTokens = new Map<string, number>();
  const bodyTokens = new Map<string, number>();

  const lines = note.content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      for (const t of tokenizeText(trimmed.replace(/^#+\s*/, ''))) {
        headingTokens.set(t, (headingTokens.get(t) || 0) + 1);
      }
    } else {
      for (const t of tokenizeText(trimmed)) {
        bodyTokens.set(t, (bodyTokens.get(t) || 0) + 1);
      }
    }
  }

  // Combine into weighted tokens map
  const allWeightedTokens = new Map<string, number>();
  let docLength = 0;

  function addWeighted(map: Map<string, number>, weight: number) {
    for (const [term, count] of map.entries()) {
      const current = allWeightedTokens.get(term) || 0;
      const added = count * weight;
      allWeightedTokens.set(term, current + added);
      docLength += added;
    }
  }

  addWeighted(titleTokens, FIELD_WEIGHTS.TITLE);
  addWeighted(aliasTokens, FIELD_WEIGHTS.ALIAS);
  addWeighted(tagTokens, FIELD_WEIGHTS.TAG);
  addWeighted(headingTokens, FIELD_WEIGHTS.HEADING);
  addWeighted(bodyTokens, FIELD_WEIGHTS.BODY);

  return {
    noteId: note.id,
    contentHash,
    titleTokens,
    aliasTokens,
    tagTokens,
    headingTokens,
    bodyTokens,
    allWeightedTokens,
    docLength: Math.max(1, docLength),
  };
}

export const tokenizeDocument = tokenizeNote;

/**
 * Builds an inverted lexical index from a set of notes, reusing cached tokenizations when valid
 */
export function buildLexicalIndex(
  notes: Note[],
  cachedDocs: Map<string, TokenizedDocument> = new Map()
): LexicalIndex {
  const documents: Record<string, TokenizedDocument> = {};
  const invertedIndex: Record<string, Array<{ noteId: string; weightedTf: number }>> = {};
  const docFrequencies: Record<string, number> = {};
  let totalDocLength = 0;

  const validNotes = notes.filter((n) => !n.trashed);

  for (const note of validNotes) {
    const hash = computeNoteContentHash(note);
    let doc = cachedDocs.get(note.id);

    if (!doc || doc.contentHash !== hash) {
      doc = tokenizeNote(note);
      cachedDocs.set(note.id, doc);
    }

    documents[note.id] = doc;
    totalDocLength += doc.docLength;

    for (const [term, weightedTf] of doc.allWeightedTokens.entries()) {
      if (!invertedIndex[term]) {
        invertedIndex[term] = [];
        docFrequencies[term] = 0;
      }
      invertedIndex[term].push({ noteId: note.id, weightedTf });
      docFrequencies[term]++;
    }
  }

  const totalDocs = validNotes.length;
  const avgDocLength = totalDocs > 0 ? totalDocLength / totalDocs : 1;

  return {
    documents,
    invertedIndex,
    avgDocLength,
    totalDocs,
    docFrequencies,
  };
}

/**
 * Calculates Inverse Document Frequency (IDF) with BM25 smoothing
 */
export function calculateIDF(df: number, totalDocs: number): number {
  return Math.log(1 + (totalDocs + 1) / (df + 0.5)) + 0.1;
}

/**
 * Scores the lexical relatedness between a source note and candidate target notes using BM25-Cosine
 */
export function computeLexicalRelatednessForDoc(
  sourceId: string,
  index: LexicalIndex,
  threshold: number,
  maxNeighbors: number,
  existingLinkPairs: Set<string>
): InferredRelation[] {
  const sourceDoc = index.documents[sourceId];
  if (!sourceDoc || sourceDoc.allWeightedTokens.size === 0) return [];

  // Compute source document BM25 vector weights and L2 norm
  const sourceWeights = new Map<string, number>();
  let sourceNormSq = 0;

  for (const [term, tf] of sourceDoc.allWeightedTokens.entries()) {
    const df = index.docFrequencies[term] || 1;
    // Discount terms appearing in > 90% of docs if vault has more than 10 docs
    if (index.totalDocs > 10 && df > index.totalDocs * 0.9) continue;

    const idf = calculateIDF(df, index.totalDocs);
    const num = tf * (K1 + 1);
    const denom = tf + K1 * (1 - B + B * (sourceDoc.docLength / index.avgDocLength));
    const w = idf * (num / denom);
    sourceWeights.set(term, w);
    sourceNormSq += w * w;
  }

  const sourceNorm = Math.sqrt(sourceNormSq);
  if (sourceNorm <= 0) return [];

  // Candidate generation: accumulate dot product against target documents
  const candidateDots = new Map<string, number>();
  const candidateSharedTerms = new Map<string, Array<{ term: string; score: number }>>();

  for (const [term, w_s] of sourceWeights.entries()) {
    const postings = index.invertedIndex[term];
    if (!postings || postings.length === 0) continue;

    const df = index.docFrequencies[term] || 1;
    const idf = calculateIDF(df, index.totalDocs);

    for (const posting of postings) {
      const targetId = posting.noteId;
      if (targetId === sourceId) continue;

      // Check if already explicitly linked
      const linkKey = [sourceId, targetId].sort().join('---');
      if (existingLinkPairs.has(linkKey)) continue;

      const targetDoc = index.documents[targetId];
      if (!targetDoc) continue;

      const tf_t = posting.weightedTf;
      const num_t = tf_t * (K1 + 1);
      const denom_t = tf_t + K1 * (1 - B + B * (targetDoc.docLength / index.avgDocLength));
      const w_t = idf * (num_t / denom_t);
      const termContribution = w_s * w_t;

      candidateDots.set(targetId, (candidateDots.get(targetId) || 0) + termContribution);

      const termsList = candidateSharedTerms.get(targetId) || [];
      termsList.push({ term, score: termContribution });
      candidateSharedTerms.set(targetId, termsList);
    }
  }

  const results: InferredRelation[] = [];

  for (const [targetId, dotProduct] of candidateDots.entries()) {
    const targetDoc = index.documents[targetId];
    if (!targetDoc) continue;

    // Compute target L2 norm
    let targetNormSq = 0;
    for (const [term, tf] of targetDoc.allWeightedTokens.entries()) {
      const df = index.docFrequencies[term] || 1;
      if (index.totalDocs > 10 && df > index.totalDocs * 0.9) continue;

      const idf = calculateIDF(df, index.totalDocs);
      const num = tf * (K1 + 1);
      const denom = tf + K1 * (1 - B + B * (targetDoc.docLength / index.avgDocLength));
      const w = idf * (num / denom);
      targetNormSq += w * w;
    }

    const targetNorm = Math.sqrt(targetNormSq);
    if (targetNorm <= 0) continue;

    // Calculate tag overlap bonus
    let tagBonus = 0;
    if (sourceDoc.tagTokens.size > 0 && targetDoc.tagTokens.size > 0) {
      let sharedTagCount = 0;
      for (const t of sourceDoc.tagTokens.keys()) {
        if (targetDoc.tagTokens.has(t)) sharedTagCount++;
      }
      const unionTags = sourceDoc.tagTokens.size + targetDoc.tagTokens.size - sharedTagCount;
      if (unionTags > 0 && sharedTagCount > 0) {
        tagBonus = (sharedTagCount / unionTags) * 0.15;
      }
    }

    const cosineSim = Math.min(1.0, Math.max(0.0, dotProduct / (sourceNorm * targetNorm) + tagBonus));

    if (cosineSim >= threshold) {
      // Sort shared terms by contribution
      const terms = candidateSharedTerms.get(targetId) || [];
      terms.sort((a, b) => b.score - a.score);
      const topTerms = terms.slice(0, 4).map((t) => t.term);

      results.push({
        sourceId,
        targetId,
        score: Math.round(cosineSim * 100) / 100,
        mode: 'lexical',
        sharedTerms: topTerms,
        rationale:
          topTerms.length > 0
            ? `Shared key concepts: ${topTerms.join(', ')}`
            : 'Lexical similarity match',
      });
    }
  }

  // Sort descending by score and slice to maxNeighbors
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxNeighbors);
}

/**
 * Computes all top inferred relationships across the vault using fast candidate generation
 */
export function computeAllLexicalRelatedness(
  notes: Note[],
  settings: SemanticSettings,
  existingLinkPairs: Set<string>,
  cachedDocs: Map<string, TokenizedDocument> = new Map()
): InferredRelation[] {
  if (!settings.enabled || notes.length < 2) return [];

  const index = buildLexicalIndex(notes, cachedDocs);
  const relationsMap = new Map<string, InferredRelation>();

  const threshold = Math.max(0.05, Math.min(0.95, settings.threshold));
  const maxNeighbors = Math.max(1, Math.min(10, settings.maxNeighborsPerNode));

  const validNotes = notes.filter((n) => !n.trashed);

  for (const note of validNotes) {
    const related = computeLexicalRelatednessForDoc(
      note.id,
      index,
      threshold,
      maxNeighbors,
      existingLinkPairs
    );

    for (const rel of related) {
      const pairKey = [rel.sourceId, rel.targetId].sort().join('---');
      const existing = relationsMap.get(pairKey);
      if (!existing || rel.score > existing.score) {
        relationsMap.set(pairKey, rel);
      }
    }
  }

  return Array.from(relationsMap.values()).sort((a, b) => b.score - a.score);
}
