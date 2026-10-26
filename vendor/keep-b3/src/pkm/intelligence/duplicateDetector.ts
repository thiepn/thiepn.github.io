import { Note } from '../../types';
import { VaultIndex } from '../types';
import {
  DuplicateCandidatePair,
  DuplicateGroup,
  DuplicateMatchLevel,
} from './intelligenceTypes';
import { tokenizeText } from '../lexicalRelatedness';

export interface DuplicateDetectorOptions {
  similarityThreshold?: number; // Default 0.85
  ignoredPairs?: string[]; // "noteA---noteB"
  limit?: number;
}

/**
 * Normalizes Markdown content by stripping formatting markers and normalizing whitespace
 */
export function normalizeMarkdownForDuplicate(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/m, '') // strip YAML frontmatter
    .replace(/[#*`_~>\[\]()!-]/g, ' ') // strip MD formatting symbols
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Computes 3-gram character shingles or 2-gram word shingles for near-duplicate Jaccard similarity
 */
export function computeWordShingles(text: string, k = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const shingles = new Set<string>();
  if (words.length < k) {
    if (words.length > 0) shingles.add(words.join(' '));
    return shingles;
  }

  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

/**
 * Computes Jaccard similarity between two shingle sets
 */
export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Creates a clean snippet for duplicate comparison
 */
function createSnippet(content: string, maxChars = 140): string {
  const clean = content.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---/m, '').trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars) + '...';
}

/**
 * Detects all potential duplicates across the vault using bounded candidate generation
 */
export function detectVaultDuplicates(
  notes: Note[],
  vaultIndex?: VaultIndex,
  options: DuplicateDetectorOptions = {}
): {
  pairs: DuplicateCandidatePair[];
  groups: DuplicateGroup[];
} {
  const threshold = options.similarityThreshold || 0.85;
  const ignoredSet = new Set(options.ignoredPairs || []);
  const validNotes = notes.filter((n) => !n.trashed && n.content && n.content.trim().length > 0);

  const pairs: DuplicateCandidatePair[] = [];
  const exactHashMap = new Map<string, Note[]>();
  const normalizedHashMap = new Map<string, Note[]>();

  // 1. Level 1: Exact Hash Indexing
  for (const n of validNotes) {
    const rawNormalized = n.content.replace(/\r\n/g, '\n').trim();
    const existing = exactHashMap.get(rawNormalized) || [];
    existing.push(n);
    exactHashMap.set(rawNormalized, existing);

    const normText = normalizeMarkdownForDuplicate(n.content);
    const existingNorm = normalizedHashMap.get(normText) || [];
    existingNorm.push(n);
    normalizedHashMap.set(normText, existingNorm);
  }

  const processedPairKeys = new Set<string>();

  // Process Exact Matches
  for (const [rawContent, group] of exactHashMap.entries()) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const noteA = group[i];
          const noteB = group[j];
          const pairKey = [noteA.id, noteB.id].sort().join('---');
          if (processedPairKeys.has(pairKey) || ignoredSet.has(pairKey)) continue;
          processedPairKeys.add(pairKey);

          pairs.push({
            id: pairKey,
            noteAId: noteA.id,
            noteATitle: noteA.title || 'Untitled',
            noteBId: noteB.id,
            noteBTitle: noteB.title || 'Untitled',
            level: 'exact',
            similarityScore: 1.0,
            reason: 'Identical raw content',
            snippetA: createSnippet(noteA.content),
            snippetB: createSnippet(noteB.content),
            modifiedA: noteA.updatedAt || '',
            modifiedB: noteB.updatedAt || '',
          });
        }
      }
    }
  }

  // Process Near-Exact Normalized Matches
  for (const [normText, group] of normalizedHashMap.entries()) {
    if (group.length > 1 && normText.length > 20) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const noteA = group[i];
          const noteB = group[j];
          const pairKey = [noteA.id, noteB.id].sort().join('---');
          if (processedPairKeys.has(pairKey) || ignoredSet.has(pairKey)) continue;
          processedPairKeys.add(pairKey);

          pairs.push({
            id: pairKey,
            noteAId: noteA.id,
            noteATitle: noteA.title || 'Untitled',
            noteBId: noteB.id,
            noteBTitle: noteB.title || 'Untitled',
            level: 'near_exact',
            similarityScore: 0.98,
            reason: 'Identical text content with minor whitespace/formatting differences',
            snippetA: createSnippet(noteA.content),
            snippetB: createSnippet(noteB.content),
            modifiedA: noteA.updatedAt || '',
            modifiedB: noteB.updatedAt || '',
          });
        }
      }
    }
  }

  // 2. Level 3: Content Similarity via Token Inverted Index Candidate Generation
  // Instead of comparing all N*(N-1)/2 pairs, index rare tokens to find candidates
  const tokenInvertedIndex = new Map<string, string[]>();
  const noteShinglesMap = new Map<string, Set<string>>();
  const noteLengthMap = new Map<string, number>();

  for (const n of validNotes) {
    const shingles = computeWordShingles(n.content);
    noteShinglesMap.set(n.id, shingles);
    noteLengthMap.set(n.id, n.content.length);

    const tokens = Array.from(new Set(tokenizeText(n.content)));
    for (const t of tokens) {
      if (t.length < 3) continue;
      const list = tokenInvertedIndex.get(t) || [];
      list.push(n.id);
      tokenInvertedIndex.set(t, list);
    }
  }

  // Candidate generation
  const candidateComparisons = new Set<string>();

  for (const n of validNotes) {
    const tokens = Array.from(new Set(tokenizeText(n.content)));
    for (const t of tokens) {
      const postings = tokenInvertedIndex.get(t) || [];
      if (postings.length > 1 && postings.length < Math.max(10, validNotes.length * 0.3)) {
        for (const targetId of postings) {
          if (targetId !== n.id) {
            const pairKey = [n.id, targetId].sort().join('---');
            if (!processedPairKeys.has(pairKey) && !ignoredSet.has(pairKey)) {
              candidateComparisons.add(pairKey);
            }
          }
        }
      }
    }
  }

  // Title matching candidates (notes with matching normalized titles)
  const titleMap = new Map<string, string[]>();
  for (const n of validNotes) {
    const normTitle = (n.title || '').trim().toLowerCase();
    if (normTitle.length >= 2) {
      const list = titleMap.get(normTitle) || [];
      list.push(n.id);
      titleMap.set(normTitle, list);
    }
  }

  for (const [, ids] of titleMap.entries()) {
    if (ids.length > 1) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const pairKey = [ids[i], ids[j]].sort().join('---');
          if (!processedPairKeys.has(pairKey) && !ignoredSet.has(pairKey)) {
            candidateComparisons.add(pairKey);
          }
        }
      }
    }
  }

  // Score candidate pairs
  for (const pairKey of candidateComparisons) {
    const [idA, idB] = pairKey.split('---');
    const noteA = validNotes.find((n) => n.id === idA);
    const noteB = validNotes.find((n) => n.id === idB);
    if (!noteA || !noteB) continue;

    const normTitleA = (noteA.title || '').trim().toLowerCase();
    const normTitleB = (noteB.title || '').trim().toLowerCase();
    const sameTitle = normTitleA === normTitleB && normTitleA.length >= 2;

    const shinglesA = noteShinglesMap.get(idA) || new Set();
    const shinglesB = noteShinglesMap.get(idB) || new Set();
    const jaccard = computeJaccardSimilarity(shinglesA, shinglesB);

    if (sameTitle) {
      processedPairKeys.add(pairKey);
      const score = Math.max(0.75, Math.round((0.5 + 0.5 * jaccard) * 100) / 100);
      pairs.push({
        id: pairKey,
        noteAId: noteA.id,
        noteATitle: noteA.title || 'Untitled',
        noteBId: noteB.id,
        noteBTitle: noteB.title || 'Untitled',
        level: 'high_similarity',
        similarityScore: score,
        reason: `Identical title "${noteA.title}" (${Math.round(jaccard * 100)}% content overlap)`,
        snippetA: createSnippet(noteA.content),
        snippetB: createSnippet(noteB.content),
        modifiedA: noteA.updatedAt || '',
        modifiedB: noteB.updatedAt || '',
      });
      continue;
    }

    // Fast length ratio pre-filter (length must be within 35% of each other for content-only candidates)
    const lenA = noteLengthMap.get(idA) || 0;
    const lenB = noteLengthMap.get(idB) || 0;
    if (lenA < 30 || lenB < 30) continue;
    const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
    if (lenRatio < 0.65) continue;

    if (jaccard >= threshold) {
      processedPairKeys.add(pairKey);
      pairs.push({
        id: pairKey,
        noteAId: noteA.id,
        noteATitle: noteA.title || 'Untitled',
        noteBId: noteB.id,
        noteBTitle: noteB.title || 'Untitled',
        level: 'high_similarity',
        similarityScore: Math.round(jaccard * 100) / 100,
        reason: `${Math.round(jaccard * 100)}% content phrase overlap`,
        snippetA: createSnippet(noteA.content),
        snippetB: createSnippet(noteB.content),
        modifiedA: noteA.updatedAt || '',
        modifiedB: noteB.updatedAt || '',
      });
    }
  }

  // 3. Build Duplicate Groups (cluster connected pairs with >= 0.9 similarity)
  const adjacency = new Map<string, Set<string>>();
  for (const pair of pairs) {
    if (pair.similarityScore >= 0.88) {
      if (!adjacency.has(pair.noteAId)) adjacency.set(pair.noteAId, new Set());
      if (!adjacency.has(pair.noteBId)) adjacency.set(pair.noteBId, new Set());
      adjacency.get(pair.noteAId)!.add(pair.noteBId);
      adjacency.get(pair.noteBId)!.add(pair.noteAId);
    }
  }

  const visited = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (const noteId of adjacency.keys()) {
    if (visited.has(noteId)) continue;
    const cluster = new Set<string>();
    const queue = [noteId];
    visited.add(noteId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      cluster.add(curr);
      const neighbors = adjacency.get(curr);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }

    if (cluster.size >= 3) {
      const groupNotes = Array.from(cluster)
        .map((id) => validNotes.find((n) => n.id === id))
        .filter((n): n is Note => !!n)
        .map((n) => ({
          id: n.id,
          title: n.title || 'Untitled',
          modifiedTimestamp: n.updatedAt || '',
          snippet: createSnippet(n.content),
        }));

      groups.push({
        groupId: `group-${Date.now()}-${groups.length}`,
        level: 'near_exact',
        similarityScore: 0.95,
        notes: groupNotes,
        reason: `${groupNotes.length} notes share identical or near-identical text`,
      });
    }
  }

  pairs.sort((a, b) => b.similarityScore - a.similarityScore);
  return { pairs, groups };
}
