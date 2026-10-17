import { Merge3Result, FileConflict } from './remoteGitTypes';

/**
 * Computes Longest Common Subsequence (LCS) matrix between two arrays of strings
 */
function computeLcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Computes diff operations from array A to array B
 */
export interface DiffOp {
  type: 'equal' | 'insert' | 'delete';
  lines: string[];
}

export function computeLineDiff(orig: string[], mod: string[]): DiffOp[] {
  const dp = computeLcsMatrix(orig, mod);
  let i = orig.length;
  let j = mod.length;
  const ops: DiffOp[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && orig[i - 1] === mod[j - 1]) {
      ops.unshift({ type: 'equal', lines: [orig[i - 1]] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert', lines: [mod[j - 1]] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.unshift({ type: 'delete', lines: [orig[i - 1]] });
      i--;
    }
  }

  // Group adjacent operations of the same type
  const grouped: DiffOp[] = [];
  for (const op of ops) {
    const last = grouped[grouped.length - 1];
    if (last && last.type === op.type) {
      last.lines.push(...op.lines);
    } else {
      grouped.push({ type: op.type, lines: [...op.lines] });
    }
  }

  return grouped;
}

/**
 * Deterministic 3-Way Line-Based Merge Algorithm
 * Merges local and remote text against an optional common ancestor base text.
 */
export function merge3Text(
  base: string,
  local: string,
  remote: string,
  labels = { local: 'LOCAL (Active Vault)', remote: 'REMOTE (Remote Repo)' }
): Merge3Result {
  // Fast path 1: identical contents
  if (local === remote) {
    return { clean: true, mergedText: local, hasConflicts: false, conflictBlocksCount: 0 };
  }

  // Fast path 2: one side is identical to base
  if (base && local === base) {
    return { clean: true, mergedText: remote, hasConflicts: false, conflictBlocksCount: 0 };
  }
  if (base && remote === base) {
    return { clean: true, mergedText: local, hasConflicts: false, conflictBlocksCount: 0 };
  }

  // If no base is provided, treat base as empty string or common lines
  const baseLines = (base || '').split(/\r?\n/);
  const localLines = local.split(/\r?\n/);
  const remoteLines = remote.split(/\r?\n/);

  // If base was empty (e.g. newly created on both sides)
  if (!base || base.trim() === '') {
    // Both added content
    const mergedWithConflict = [
      `<<<<<<< ${labels.local}`,
      local,
      `=======`,
      remote,
      `>>>>>>> ${labels.remote}`,
    ].join('\n');

    return {
      clean: false,
      mergedText: mergedWithConflict,
      hasConflicts: true,
      conflictBlocksCount: 1,
    };
  }

  // Compute diffs against base
  const localDiff = computeLineDiff(baseLines, localLines);
  const remoteDiff = computeLineDiff(baseLines, remoteLines);

  // Synchronize and perform chunk merge
  const resultLines: string[] = [];
  let conflictBlocksCount = 0;
  let hasConflicts = false;

  let bIdx = 0;
  let lIdx = 0;
  let rIdx = 0;

  while (bIdx < baseLines.length || lIdx < localLines.length || rIdx < remoteLines.length) {
    const baseLine = bIdx < baseLines.length ? baseLines[bIdx] : null;
    const localLine = lIdx < localLines.length ? localLines[lIdx] : null;
    const remoteLine = rIdx < remoteLines.length ? remoteLines[rIdx] : null;

    // Both sides agree with each other
    if (localLine === remoteLine) {
      if (localLine !== null) resultLines.push(localLine);
      bIdx++;
      lIdx++;
      rIdx++;
      continue;
    }

    // Local side unchanged from base, remote changed
    if (localLine === baseLine && remoteLine !== baseLine) {
      if (remoteLine !== null) resultLines.push(remoteLine);
      bIdx++;
      lIdx++;
      rIdx++;
      continue;
    }

    // Remote side unchanged from base, local changed
    if (remoteLine === baseLine && localLine !== baseLine) {
      if (localLine !== null) resultLines.push(localLine);
      bIdx++;
      lIdx++;
      rIdx++;
      continue;
    }

    // Both changed from base in different ways -> Collect conflict window
    const localConflictLines: string[] = [];
    const remoteConflictLines: string[] = [];

    // Advance until we find a resynchronization line common in remaining base or both
    let lookAhead = 1;
    let foundSync = false;

    while (
      (lIdx < localLines.length || rIdx < remoteLines.length) &&
      !foundSync &&
      lookAhead < 100
    ) {
      if (lIdx < localLines.length) {
        localConflictLines.push(localLines[lIdx]);
        lIdx++;
      }
      if (rIdx < remoteLines.length) {
        remoteConflictLines.push(remoteLines[rIdx]);
        rIdx++;
      }
      if (bIdx < baseLines.length) {
        bIdx++;
      }

      // Check if current positions match
      if (
        lIdx < localLines.length &&
        rIdx < remoteLines.length &&
        localLines[lIdx] === remoteLines[rIdx]
      ) {
        foundSync = true;
      }
      lookAhead++;
    }

    // Format conflict marker block
    hasConflicts = true;
    conflictBlocksCount++;
    resultLines.push(`<<<<<<< ${labels.local}`);
    resultLines.push(...localConflictLines);
    resultLines.push(`=======`);
    resultLines.push(...remoteConflictLines);
    resultLines.push(`>>>>>>> ${labels.remote}`);
  }

  return {
    clean: !hasConflicts,
    mergedText: resultLines.join('\n'),
    hasConflicts,
    conflictBlocksCount,
  };
}

/**
 * Checks binary content equivalence
 */
export function areBinaryContentsEqual(
  a: Uint8Array | ArrayBuffer | undefined,
  b: Uint8Array | ArrayBuffer | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const bufA = a instanceof Uint8Array ? a : new Uint8Array(a);
  const bufB = b instanceof Uint8Array ? b : new Uint8Array(b);

  if (bufA.length !== bufB.length) return false;
  for (let i = 0; i < bufA.length; i++) {
    if (bufA[i] !== bufB[i]) return false;
  }
  return true;
}

/**
 * Resolves a FileConflict by applying user-selected resolution
 */
export function applyConflictResolution(
  conflict: FileConflict,
  resolution: 'local' | 'remote' | 'both' | 'custom',
  customContent?: string | Uint8Array
): { resolvedContent: string | Uint8Array } {
  conflict.status = 'resolved';
  conflict.resolution = resolution;

  switch (resolution) {
    case 'local':
      return { resolvedContent: conflict.localContent };
    case 'remote':
      return { resolvedContent: conflict.remoteContent };
    case 'both':
      // Return the merged content with markers intact (or concatenated)
      return { resolvedContent: conflict.mergedContent || (conflict.localContent as string) };
    case 'custom':
      return { resolvedContent: customContent ?? conflict.localContent };
  }
}
