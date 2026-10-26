import { AICitation, AISourceContext } from './types';

export interface CitationParseResult {
  cleanedText: string;
  citations: AICitation[];
  unsupportedClaimsDetected: boolean;
}

/**
 * Citation Parser & Validator
 * - Extracts `[S1]`, `[SOURCE_X]`, `[Source X]`, or `[X]` markers emitted by the AI model.
 * - Resolves each marker to a verified `AISourceContext`.
 * - Replaces `[SOURCE_X]` / `[S1]` with accessible `[X]` citation markers in the display text.
 * - Flags or strips unverified markers (e.g. `[SOURCE_99]` or `[S99]` when only 3 sources were given).
 */
export function parseAndVerifyCitations(
  rawText: string,
  sources: AISourceContext[]
): CitationParseResult {
  const sourceMap = new Map<string, AISourceContext>();
  for (const s of sources) {
    sourceMap.set(s.markerId.toUpperCase(), s);
    sourceMap.set(`SOURCE_${s.markerNumber}`, s);
    sourceMap.set(`S${s.markerNumber}`, s);
    sourceMap.set(`SOURCE ${s.markerNumber}`, s);
    sourceMap.set(`${s.markerNumber}`, s);
  }

  const citations: AICitation[] = [];
  const foundMarkers = new Set<string>();
  let unsupportedClaimsDetected = false;

  // Regular expression matching [SOURCE_1], [S1], [Source 1], [SOURCE 1], or numbered brackets [1], [2]
  const markerRegex = /\[(SOURCE[_\s]?\d+|S\d+|\d+)\]/gi;

  const cleanedText = rawText.replace(markerRegex, (match, rawKey) => {
    const markerKey = rawKey.toUpperCase().trim();
    const matchedSource = sourceMap.get(markerKey);

    if (!matchedSource) {
      // Fake or hallucinated source marker! Reject and strip.
      unsupportedClaimsDetected = true;
      return '';
    }

    const markerId = matchedSource.markerId;
    const num = matchedSource.markerNumber;

    if (!foundMarkers.has(markerId)) {
      foundMarkers.add(markerId);
      const chunk = matchedSource.chunk;

      citations.push({
        markerNumber: num,
        markerId: markerId,
        noteId: chunk.noteId,
        noteTitle: chunk.noteTitle,
        headingId: chunk.headingId,
        headingText: chunk.headingText,
        blockId: chunk.blockId,
        quoteExcerpt: chunk.content.slice(0, 180).trim() + (chunk.content.length > 180 ? '...' : ''),
        isVerified: true,
        sourceContentHash: chunk.contentHash,
      });
    }

    return `[${num}]`;
  });

  // Sort citations by markerNumber
  citations.sort((a, b) => a.markerNumber - b.markerNumber);

  return {
    cleanedText,
    citations,
    unsupportedClaimsDetected,
  };
}

/**
 * Verifies if a claimed quote exists in the referenced chunk content
 */
export function verifyQuotedExcerpt(quote: string, chunkContent: string): { matches: boolean; normalizedMatch: boolean } {
  if (!quote || !chunkContent) return { matches: false, normalizedMatch: false };

  const cleanQuote = quote.trim().replace(/^["']|["']$/g, '');
  if (chunkContent.includes(cleanQuote)) {
    return { matches: true, normalizedMatch: true };
  }

  const normQuote = cleanQuote.toLowerCase().replace(/\s+/g, ' ');
  const normChunk = chunkContent.toLowerCase().replace(/\s+/g, ' ');
  const normalizedMatch = normChunk.includes(normQuote);

  return {
    matches: false,
    normalizedMatch,
  };
}
