/**
 * Fuzzy search and ranking utilities for tags and search terms.
 */

export interface FuzzyTagMatch {
  tag: string;
  count: number;
  score: number;
  matchedIndices: number[];
}

/**
 * Computes fuzzy match score and matched indices between query and target tag.
 */
export function fuzzyMatchTag(
  query: string,
  targetTag: string,
  count: number = 0
): FuzzyTagMatch | null {
  const cleanQuery = (query || '').trim().toLowerCase().replace(/^#/, '');
  const cleanTarget = (targetTag || '').trim().toLowerCase().replace(/^#/, '');

  if (!cleanTarget) return null;

  // Empty query matches all, ranked by note count & alphabetical
  if (!cleanQuery) {
    return {
      tag: targetTag,
      count,
      score: count * 10,
      matchedIndices: [],
    };
  }

  // Exact match gets highest priority
  if (cleanTarget === cleanQuery) {
    return {
      tag: targetTag,
      count,
      score: 10000 + count * 5,
      matchedIndices: Array.from({ length: cleanTarget.length }, (_, i) => i),
    };
  }

  // Prefix match gets very high priority
  if (cleanTarget.startsWith(cleanQuery)) {
    return {
      tag: targetTag,
      count,
      score: 5000 + (cleanQuery.length / cleanTarget.length) * 500 + count * 2,
      matchedIndices: Array.from({ length: cleanQuery.length }, (_, i) => i),
    };
  }

  // Substring match
  const subIdx = cleanTarget.indexOf(cleanQuery);
  if (subIdx !== -1) {
    return {
      tag: targetTag,
      count,
      score: 2500 + (cleanQuery.length / cleanTarget.length) * 300 + count * 2,
      matchedIndices: Array.from({ length: cleanQuery.length }, (_, i) => subIdx + i),
    };
  }

  // Subsequence fuzzy search with word-boundary and consecutive-character bonuses
  let qIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;
  const matchedIndices: number[] = [];

  for (let i = 0; i < cleanTarget.length && qIdx < cleanQuery.length; i++) {
    const char = cleanTarget[i];
    if (char === cleanQuery[qIdx]) {
      matchedIndices.push(i);
      qIdx++;
      consecutiveMatches++;
      score += 50 + consecutiveMatches * 30;

      // Word boundary bonus (start of string or right after '-', '_', '/', '.')
      if (i === 0 || /[-_/.]/.test(cleanTarget[i - 1])) {
        score += 100;
      }
    } else {
      consecutiveMatches = 0;
    }
  }

  // If all characters of the query were found in order
  if (qIdx === cleanQuery.length) {
    // Penalty for long non-matching gaps
    const matchDensity = cleanQuery.length / cleanTarget.length;
    score += matchDensity * 200 + count * 2;
    return {
      tag: targetTag,
      count,
      score,
      matchedIndices,
    };
  }

  return null;
}

/**
 * Searches and ranks a list of tags based on fuzzy matching against a query.
 */
export function searchTagsFuzzy(
  query: string,
  allTags: Array<string | { tag: string; count?: number }>,
  excludeTags: string[] = []
): FuzzyTagMatch[] {
  const excludeSet = new Set(excludeTags.map((t) => (t || '').trim().toLowerCase().replace(/^#/, '')));
  const matches: FuzzyTagMatch[] = [];

  for (const item of allTags) {
    const tagName = typeof item === 'string' ? item : item.tag;
    const count = typeof item === 'object' && typeof item.count === 'number' ? item.count : 0;
    const cleanTag = (tagName || '').trim().toLowerCase().replace(/^#/, '');

    if (!cleanTag || excludeSet.has(cleanTag)) {
      continue;
    }

    const match = fuzzyMatchTag(query, tagName, count);
    if (match) {
      matches.push(match);
    }
  }

  return matches.sort((a, b) => b.score - a.score || b.count - a.count || a.tag.localeCompare(b.tag));
}
