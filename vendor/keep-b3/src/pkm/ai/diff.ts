import { AIDiffChunk, AIProposedAction } from './types';
import { Note } from '../../types';
import { computeStringHash } from './chunker';

/**
 * Computes word-level diff chunks between original and proposed text using Longest Common Subsequence (LCS).
 */
export function computeWordDiff(original: string, proposed: string): AIDiffChunk[] {
  if (original === proposed) {
    return [{ type: 'unchanged', value: original }];
  }

  const origTokens = original.split(/(\s+)/);
  const propTokens = proposed.split(/(\s+)/);

  const n = origTokens.length;
  const m = propTokens.length;

  // For very large documents, prevent excessive memory allocation
  if (n * m > 160000) {
    return [
      { type: 'removed', value: original },
      { type: 'added', value: proposed },
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (origTokens[i] === propTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to reconstruct diff chunks
  let i = n;
  let j = m;
  const rawChunks: AIDiffChunk[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === propTokens[j - 1]) {
      rawChunks.push({ type: 'unchanged', value: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawChunks.push({ type: 'added', value: propTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawChunks.push({ type: 'removed', value: origTokens[i - 1] });
      i--;
    }
  }

  rawChunks.reverse();

  // Merge contiguous chunks of identical type
  const merged: AIDiffChunk[] = [];
  for (const chunk of rawChunks) {
    if (!chunk.value) continue;
    const last = merged[merged.length - 1];
    if (last && last.type === chunk.type) {
      last.value += chunk.value;
    } else {
      merged.push({ type: chunk.type, value: chunk.value });
    }
  }

  return merged;
}

/**
 * Validates whether an AI proposal is still fresh against the current target note state.
 * If the note was modified or content changed since proposal generation, flags as stale.
 */
export function validateProposalFreshness(
  proposal: AIProposedAction,
  currentNote?: Note | null
): { isFresh: boolean; reason?: string } {
  if (proposal.type === 'create_note') {
    return { isFresh: true };
  }

  if (!currentNote) {
    return { isFresh: false, reason: 'Target note does not exist or was deleted' };
  }

  if (proposal.expectedNoteVersion !== undefined) {
    const currentHash = computeStringHash(currentNote.content || '');
    const currentVer = currentNote.updatedAt;

    if (typeof proposal.expectedNoteVersion === 'string') {
      if (proposal.expectedNoteVersion !== currentHash && proposal.expectedNoteVersion !== String(currentVer)) {
        return { isFresh: false, reason: 'Target note was modified since proposal was created' };
      }
    } else if (typeof proposal.expectedNoteVersion === 'number') {
      if (currentVer && Number(currentVer) !== proposal.expectedNoteVersion) {
        return { isFresh: false, reason: 'Target note version has changed' };
      }
    }
  }

  return { isFresh: true };
}

