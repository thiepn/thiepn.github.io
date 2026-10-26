import { VaultIndex, ParsedNote } from './types';
import { maskCodeAndMath } from './masking';

/**
 * An unlinked mention candidate occurrence within a note's source text
 */
export interface UnlinkedOccurrence {
  /** 0-indexed start character index in original source text */
  startOffset: number;
  /** 0-indexed end character index in original source text (exclusive) */
  endOffset: number;
  /** 0-indexed line number in source text */
  line: number;
  /** The exact matching raw substring found in source text (e.g. "machine learning") */
  matchedText: string;
  /** Context snippet surrounding the mention */
  contextSnippet: string;
  /** Character index where matched text starts within the context snippet */
  snippetMatchStart: number;
  /** Character index where matched text ends within the context snippet */
  snippetMatchEnd: number;
}

/**
 * An unlinked mention candidate grouping for a specific target note
 */
export interface UnlinkedMentionCandidate {
  /** Target Note ID that this mention refers to */
  targetNoteId: string;
  /** Canonical title of the target note */
  targetTitle: string;
  /** Which term matched: either 'title' or 'alias' */
  matchType: 'title' | 'alias';
  /** The exact matching term (e.g. note title or alias) */
  matchedTerm: string;
  /** Weight / score of the match for ranking */
  score: number;
  /** List of all safe occurrences of this candidate in the note */
  occurrences: UnlinkedOccurrence[];
}

/**
 * Settings & filter options for Unlinked Mentions discovery
 */
export interface UnlinkedMentionOptions {
  /** Minimum character length for candidate terms (default: 3) */
  minCandidateLength?: number;
  /** Set of ignored title/alias strings (lowercase) */
  ignoredTerms?: Set<string> | string[];
  /** Exclude single-word common English stop words */
  filterCommonWords?: boolean;
  /** Case sensitive search (default: false) */
  caseSensitive?: boolean;
}

/**
 * Common short English words that frequently collide with note titles if single-word
 */
export const COMMON_SHORT_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // Common generic single-word abbreviations/terms
  'note', 'notes', 'todo', 'todos', 'task', 'tasks', 'page', 'pages', 'doc', 'docs', 'new', 'daily', 'home',
]);

/**
 * Escape string for RegExp construction
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract excluded regions from markdown text:
 * - Code blocks (fenced)
 * - Math blocks ($$...$$ and $...$)
 * - Inline code (`...`)
 * - Existing WikiLinks ([[...]])
 * - Existing Transclusion Embeds (![[...]])
 * - Markdown links & images ([...](...) and ![...](...))
 * - Markdown URLs (https?://...)
 * - Markdown HTML tags (<tag>...</tag> or <http...>)
 * - Frontmatter (--- ... ---)
 * - Heading markers (optional / lines starting with #)
 */
export interface ExcludedRegion {
  start: number;
  end: number;
  reason: 'code' | 'math' | 'wikilink' | 'markdown_link' | 'url' | 'frontmatter' | 'html';
}

export function computeExcludedRegions(rawText: string): ExcludedRegion[] {
  const regions: ExcludedRegion[] = [];

  // 1. Frontmatter
  if (rawText.startsWith('---')) {
    const endMatch = rawText.slice(3).search(/\n---\s*(\n|$)/);
    if (endMatch !== -1) {
      regions.push({
        start: 0,
        end: 3 + endMatch + 4,
        reason: 'frontmatter',
      });
    }
  }

  // 2. Fenced Code Blocks & Math & Inline Code
  const { regions: codeRegions } = maskCodeAndMath(rawText);
  for (const cr of codeRegions) {
    regions.push({
      start: cr.start,
      end: cr.end,
      reason: cr.type === 'math' ? 'math' : 'code',
    });
  }

  // 3. WikiLinks & Embeds: !?[[ ... ]]
  const wikiLinkRegex = /!?\[\[([\s\S]*?)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = wikiLinkRegex.exec(rawText)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: 'wikilink',
    });
  }

  // 4. Markdown Links & Images: !?[label](url)
  const mdLinkRegex = /!?\[([^\]\n]*)\]\(([^)\n]+)\)/g;
  while ((match = mdLinkRegex.exec(rawText)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: 'markdown_link',
    });
  }

  // 5. Bare URLs: https?://...
  const urlRegex = /https?:\/\/[^\s<>)"]+/g;
  while ((match = urlRegex.exec(rawText)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: 'url',
    });
  }

  // 6. HTML tags: <...>, e.g. <https://example.com> or <span ...>
  const htmlTagRegex = /<[^>\n]+>/g;
  while ((match = htmlTagRegex.exec(rawText)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      reason: 'html',
    });
  }

  // Sort and merge overlapping regions
  regions.sort((a, b) => a.start - b.start);
  const merged: ExcludedRegion[] = [];
  for (const r of regions) {
    if (merged.length === 0) {
      merged.push({ ...r });
    } else {
      const prev = merged[merged.length - 1];
      if (r.start <= prev.end) {
        prev.end = Math.max(prev.end, r.end);
      } else {
        merged.push({ ...r });
      }
    }
  }

  return merged;
}

/**
 * Check if a character span [start, end) overlaps with any excluded region
 */
export function isSpanExcluded(start: number, end: number, excludedRegions: ExcludedRegion[]): boolean {
  for (const region of excludedRegions) {
    if (start < region.end && end > region.start) {
      return true;
    }
  }
  return false;
}

/**
 * Target term candidate for discovery
 */
interface TargetCandidateTerm {
  term: string;
  normalizedTerm: string;
  targetNoteId: string;
  targetTitle: string;
  matchType: 'title' | 'alias';
  isMultiWord: boolean;
  length: number;
}

/**
 * Gather valid target candidate terms from VaultIndex
 */
export function buildCandidateTerms(
  vaultIndex: VaultIndex,
  currentNoteId: string,
  options: UnlinkedMentionOptions = {}
): TargetCandidateTerm[] {
  const minLength = options.minCandidateLength ?? 3;
  const filterCommon = options.filterCommonWords ?? true;

  const ignoredSet = new Set<string>();
  if (options.ignoredTerms) {
    for (const t of options.ignoredTerms) {
      ignoredSet.add(t.toLowerCase().trim());
    }
  }

  const terms: TargetCandidateTerm[] = [];
  const seenTermKeys = new Set<string>();

  for (const [noteId, parsed] of Object.entries(vaultIndex.notes)) {
    // Exclude the current note itself
    if (noteId === currentNoteId) continue;

    // 1. Title candidates
    const title = (parsed.title || '').trim();
    const normTitle = title.toLowerCase();

    if (normTitle.length >= minLength && !ignoredSet.has(normTitle)) {
      const isMultiWord = normTitle.includes(' ') || normTitle.includes('-') || normTitle.includes('_');
      // If single word and common stop word, skip
      if (!isMultiWord && filterCommon && COMMON_SHORT_STOPWORDS.has(normTitle)) {
        // Skip noisy single-word stop word title
      } else {
        const key = `${normTitle}:::${noteId}`;
        if (!seenTermKeys.has(key)) {
          seenTermKeys.add(key);
          terms.push({
            term: title,
            normalizedTerm: normTitle,
            targetNoteId: noteId,
            targetTitle: parsed.title,
            matchType: 'title',
            isMultiWord,
            length: normTitle.length,
          });
        }
      }
    }

    // 2. Alias candidates
    for (const alias of parsed.aliases || []) {
      const trimmedAlias = alias.trim();
      const normAlias = trimmedAlias.toLowerCase();

      if (normAlias.length >= minLength && !ignoredSet.has(normAlias)) {
        const isMultiWord = normAlias.includes(' ') || normAlias.includes('-') || normAlias.includes('_');
        if (!isMultiWord && filterCommon && COMMON_SHORT_STOPWORDS.has(normAlias)) {
          // Skip
        } else {
          const key = `${normAlias}:::${noteId}`;
          if (!seenTermKeys.has(key)) {
            seenTermKeys.add(key);
            terms.push({
              term: trimmedAlias,
              normalizedTerm: normAlias,
              targetNoteId: noteId,
              targetTitle: parsed.title,
              matchType: 'alias',
              isMultiWord,
              length: normAlias.length,
            });
          }
        }
      }
    }
  }

  // Sort terms by descending length so longer phrases match first
  terms.sort((a, b) => b.length - a.length);
  return terms;
}

/**
 * Test if character is a valid word boundary delimiter
 */
function isWordBoundaryChar(char: string | undefined): boolean {
  if (!char) return true;
  return /[\s.,!?;:()\[\]{}"'“”‘’`~@#$%^&*\/\\<>=+|_\-\n\r\t]/.test(char);
}

/**
 * Extract line number and snippet for a match in source text
 */
function extractContextSnippet(
  sourceText: string,
  startOffset: number,
  endOffset: number,
  contextRadius: number = 40
): {
  line: number;
  snippet: string;
  snippetMatchStart: number;
  snippetMatchEnd: number;
} {
  // Compute 0-indexed line number
  const prefix = sourceText.slice(0, startOffset);
  const line = prefix.split('\n').length - 1;

  // Find line boundaries or clamp by radius
  const lineStart = sourceText.lastIndexOf('\n', startOffset - 1) + 1;
  const lineEnd = sourceText.indexOf('\n', endOffset);
  const effectiveLineEnd = lineEnd === -1 ? sourceText.length : lineEnd;

  // Snippet within the line
  let snippetStart = Math.max(lineStart, startOffset - contextRadius);
  let snippetEnd = Math.min(effectiveLineEnd, endOffset + contextRadius);

  // If clipped, try to align to nearest space
  let leadEllipsis = '';
  let trailEllipsis = '';

  if (snippetStart > lineStart) {
    const spaceIdx = sourceText.indexOf(' ', snippetStart);
    if (spaceIdx !== -1 && spaceIdx < startOffset) {
      snippetStart = spaceIdx + 1;
    }
    leadEllipsis = '…';
  }

  if (snippetEnd < effectiveLineEnd) {
    const spaceIdx = sourceText.lastIndexOf(' ', snippetEnd);
    if (spaceIdx !== -1 && spaceIdx > endOffset) {
      snippetEnd = spaceIdx;
    }
    trailEllipsis = '…';
  }

  const rawSnippet = sourceText.slice(snippetStart, snippetEnd);
  const snippet = `${leadEllipsis}${rawSnippet}${trailEllipsis}`;
  const snippetMatchStart = leadEllipsis.length + (startOffset - snippetStart);
  const snippetMatchEnd = snippetMatchStart + (endOffset - startOffset);

  return {
    line,
    snippet,
    snippetMatchStart,
    snippetMatchEnd,
  };
}

/**
 * Find all unlinked mention candidates in a note's source text
 * using VaultIndex and canonical resolver rules.
 */
export function findUnlinkedMentions(
  noteContent: string,
  currentNoteId: string,
  vaultIndex: VaultIndex,
  options: UnlinkedMentionOptions = {}
): UnlinkedMentionCandidate[] {
  if (!noteContent || !vaultIndex || vaultIndex.noteCount <= 1) {
    return [];
  }

  // Step 1: Pre-calculate all excluded regions (code, math, wikilinks, urls, markdown links)
  const excludedRegions = computeExcludedRegions(noteContent);

  // Step 2: Build sorted candidate terms
  const candidateTerms = buildCandidateTerms(vaultIndex, currentNoteId, options);
  if (candidateTerms.length === 0) {
    return [];
  }

  // Step 3: Track claimed character offsets to prevent overlapping candidate spans
  const claimedSpans: Array<{ start: number; end: number }> = [];
  function isClaimed(start: number, end: number): boolean {
    for (const span of claimedSpans) {
      if (start < span.end && end > span.start) {
        return true;
      }
    }
    return false;
  }

  // Step 4: Scan text for each candidate term
  const candidatesByTarget = new Map<string, UnlinkedMentionCandidate>();

  for (const cand of candidateTerms) {
    // Regex with word boundaries
    const escaped = escapeRegExp(cand.term);
    // Boundary check: not immediately preceded or succeeded by alphanumeric / word char
    const flags = options.caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${escaped}(?![a-zA-Z0-9_])`, flags);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(noteContent)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const matchedText = match[0];

      // Safeguard: Verify boundaries (e.g. ensure not part of file extension like machinelearning.js or foo_bar)
      const prevChar = start > 0 ? noteContent[start - 1] : undefined;
      const nextChar = end < noteContent.length ? noteContent[end] : undefined;

      // If next char is a dot followed by letters (file extension), or dash inside word, check
      if (nextChar === '.' && end + 1 < noteContent.length && /[a-zA-Z0-9]/.test(noteContent[end + 1])) {
        // e.g. "note.txt" or "machinelearning.js" -> exclude
        continue;
      }

      // Check if inside excluded regions (code, existing wiki links, etc.)
      if (isSpanExcluded(start, end, excludedRegions)) {
        continue;
      }

      // Check if already claimed by a longer candidate
      if (isClaimed(start, end)) {
        continue;
      }

      // Valid candidate occurrence!
      claimedSpans.push({ start, end });

      const { line, snippet, snippetMatchStart, snippetMatchEnd } = extractContextSnippet(
        noteContent,
        start,
        end
      );

      const occurrence: UnlinkedOccurrence = {
        startOffset: start,
        endOffset: end,
        line,
        matchedText,
        contextSnippet: snippet,
        snippetMatchStart,
        snippetMatchEnd,
      };

      const groupKey = `${cand.targetNoteId}:::${cand.matchType}:::${cand.term}`;
      let group = candidatesByTarget.get(groupKey);

      if (!group) {
        // Compute base score (longer phrases & titles have higher score)
        let score = cand.length * 10;
        if (cand.matchType === 'title') score += 20;
        if (cand.isMultiWord) score += 30;

        group = {
          targetNoteId: cand.targetNoteId,
          targetTitle: cand.targetTitle,
          matchType: cand.matchType,
          matchedTerm: cand.term,
          score,
          occurrences: [],
        };
        candidatesByTarget.set(groupKey, group);
      }

      group.occurrences.push(occurrence);
    }
  }

  // Sort candidates by score (descending) and occurrences count
  const results = Array.from(candidatesByTarget.values());
  for (const group of results) {
    // Sort occurrences by start offset
    group.occurrences.sort((a, b) => a.startOffset - b.startOffset);
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.occurrences.length - a.occurrences.length;
  });

  return results;
}

/**
 * Format a safe WikiLink replacement:
 * - If matched text matches target title casing exactly: `[[Target]]`
 * - If matched text has different casing or matched an alias: `[[Target|matchedText]]`
 */
export function formatWikiLinkReplacement(targetTitle: string, matchedText: string): string {
  if (targetTitle === matchedText) {
    return `[[${targetTitle}]]`;
  }
  return `[[${targetTitle}|${matchedText}]]`;
}

/**
 * Replace a single occurrence in markdown content
 */
export function replaceSingleOccurrence(
  content: string,
  occurrence: UnlinkedOccurrence,
  targetTitle: string
): { newContent: string; replacementLengthDiff: number } {
  const replacement = formatWikiLinkReplacement(targetTitle, occurrence.matchedText);
  const before = content.slice(0, occurrence.startOffset);
  const after = content.slice(occurrence.endOffset);
  const newContent = `${before}${replacement}${after}`;
  const replacementLengthDiff = replacement.length - (occurrence.endOffset - occurrence.startOffset);
  return { newContent, replacementLengthDiff };
}

/**
 * Replace multiple safe occurrences in markdown content in one atomic pass
 * (processes from highest offset to lowest so character indices remain valid)
 */
export function replaceOccurrences(
  content: string,
  occurrences: Array<{ occurrence: UnlinkedOccurrence; targetTitle: string }>
): string {
  // Sort descending by startOffset
  const sorted = [...occurrences].sort((a, b) => b.occurrence.startOffset - a.occurrence.startOffset);

  let updated = content;
  for (const item of sorted) {
    const rep = formatWikiLinkReplacement(item.targetTitle, item.occurrence.matchedText);
    const before = updated.slice(0, item.occurrence.startOffset);
    const after = updated.slice(item.occurrence.endOffset);
    updated = `${before}${rep}${after}`;
  }

  return updated;
}
