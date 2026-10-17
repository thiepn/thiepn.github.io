import { CitationMatch, CitationGroupMatch } from './referenceTypes';

/**
 * Checks if a position in the markdown string is inside frontmatter, code blocks, inline code, or math
 */
export function buildIgnoredMask(markdown: string): boolean[] {
  if (!markdown || typeof markdown !== 'string') return [];
  const len = markdown.length;
  const isIgnored = new Array<boolean>(len).fill(false);

  // 1. Frontmatter (starts at index 0)
  if (markdown.startsWith('---')) {
    const endFm = markdown.indexOf('\n---', 3);
    if (endFm !== -1) {
      for (let i = 0; i <= endFm + 4 && i < len; i++) {
        isIgnored[i] = true;
      }
    }
  }

  // 2. Fenced code blocks ``` or ~~~
  let inCodeFence = false;
  let fenceChar = '';

  const lines = markdown.split('\n');
  let currentOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const char = trimmed.slice(0, 3);
      if (!inCodeFence) {
        inCodeFence = true;
        fenceChar = char;
      } else if (trimmed.startsWith(fenceChar)) {
        inCodeFence = false;
      }

      // Mark the fence line
      for (let i = currentOffset; i < currentOffset + line.length + 1 && i < len; i++) {
        isIgnored[i] = true;
      }
    } else if (inCodeFence) {
      for (let i = currentOffset; i < currentOffset + line.length + 1 && i < len; i++) {
        isIgnored[i] = true;
      }
    }
    currentOffset += line.length + 1; // +1 for newline
  }

  // 3. Display Math $$ ... $$
  let inMathBlock = false;
  let mathStart = -1;
  for (let i = 0; i < len - 1; i++) {
    if (markdown[i] === '$' && markdown[i + 1] === '$' && !isIgnored[i]) {
      if (!inMathBlock) {
        inMathBlock = true;
        mathStart = i;
        i++; // skip second $
      } else {
        inMathBlock = false;
        for (let k = mathStart; k <= i + 1 && k < len; k++) {
          isIgnored[k] = true;
        }
        i++;
      }
    }
  }

  // 4. Inline code `...` and Inline math $...$
  let inInlineCode = false;
  let codeStart = -1;
  let inInlineMath = false;
  let mathInlineStart = -1;

  for (let i = 0; i < len; i++) {
    if (isIgnored[i]) continue;

    const char = markdown[i];

    // Inline backtick code
    if (char === '`' && markdown[i - 1] !== '\\') {
      if (!inInlineCode) {
        inInlineCode = true;
        codeStart = i;
      } else {
        inInlineCode = false;
        for (let k = codeStart; k <= i && k < len; k++) {
          isIgnored[k] = true;
        }
      }
    }

    // Inline math single $ (not preceded or followed by $)
    if (!inInlineCode && char === '$' && markdown[i - 1] !== '\\' && markdown[i + 1] !== '$' && markdown[i - 1] !== '$') {
      if (!inInlineMath) {
        inInlineMath = true;
        mathInlineStart = i;
      } else {
        inInlineMath = false;
        for (let k = mathInlineStart; k <= i && k < len; k++) {
          isIgnored[k] = true;
        }
      }
    }
  }

  return isIgnored;
}

/**
 * Calculates line number (0-indexed) for a character index in text
 */
function getLineNumber(text: string, charOffset: number): number {
  let line = 0;
  for (let i = 0; i < charOffset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Extracts all Pandoc-style citation groups and matches from Markdown text.
 * Format: `[@key]`, `[@key, p. 42]`, `[@key1; @key2, pp. 10-12]`
 */
export function extractCitations(markdown: string): {
  citations: CitationMatch[];
  groups: CitationGroupMatch[];
} {
  const citations: CitationMatch[] = [];
  const groups: CitationGroupMatch[] = [];

  if (!markdown || typeof markdown !== 'string' || !markdown.includes('@')) {
    return { citations, groups };
  }

  const ignoredMask = buildIgnoredMask(markdown);

  // Match bracketed citation groups: `\[\s*@[^\]]+\]`
  // We check that it starts with `[@` or `[... @`
  const groupRegex = /\[\s*(@[a-zA-Z0-9_:-]+(?:\s*,\s*[^;\]]+)?(?:\s*;\s*@[a-zA-Z0-9_:-]+(?:\s*,\s*[^;\]]+)?)*)\s*\]/g;

  let match: RegExpExecArray | null;

  while ((match = groupRegex.exec(markdown)) !== null) {
    const fullBracketed = match[0];
    const groupInner = match[1];
    const matchOffset = match.index;

    // Check if within ignored mask (e.g. inside code or math)
    if (ignoredMask[matchOffset] || ignoredMask[matchOffset + fullBracketed.length - 1]) {
      continue;
    }

    // Ignore if looks like an email: [user@example.com]
    if (groupInner.includes('.') && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(groupInner.trim())) {
      continue;
    }

    const line = getLineNumber(markdown, matchOffset);
    const groupCitations: CitationMatch[] = [];

    // Split group by ';'
    const items = groupInner.split(';');

    for (const item of items) {
      const trimmedItem = item.trim();
      if (!trimmedItem.startsWith('@')) continue;

      // Extract citationKey and optional locator: "@smith2026, p. 42" or "@smith2026"
      const commaIdx = trimmedItem.indexOf(',');
      let key = '';
      let locator: string | undefined;

      if (commaIdx !== -1) {
        key = trimmedItem.slice(1, commaIdx).trim();
        locator = trimmedItem.slice(commaIdx + 1).trim();
      } else {
        key = trimmedItem.slice(1).trim();
      }

      // Clean citation key
      key = key.replace(/[^a-zA-Z0-9_:-]/g, '');

      if (key) {
        const citationMatch: CitationMatch = {
          raw: trimmedItem,
          citationKey: key,
          locator: locator || undefined,
          line,
          charOffset: matchOffset,
        };

        groupCitations.push(citationMatch);
        citations.push(citationMatch);
      }
    }

    if (groupCitations.length > 0) {
      groups.push({
        raw: fullBracketed,
        citations: groupCitations,
        line,
        charOffset: matchOffset,
      });
    }
  }

  return { citations, groups };
}

/**
 * Vault-wide safe renaming of a citation key in markdown note content.
 * Replaces occurrences of `[@oldKey]` or `[@oldKey, ...]` or `[...; @oldKey...]` with newKey,
 * preserving locators, multiple citations, and ignoring code blocks/math.
 */
export function replaceCitationKeyInMarkdown(
  markdown: string,
  oldKey: string,
  newKey: string
): { newMarkdown: string; replacementCount: number } {
  if (!markdown || !oldKey || !newKey || oldKey === newKey) {
    return { newMarkdown: markdown, replacementCount: 0 };
  }

  const { groups } = extractCitations(markdown);
  if (groups.length === 0) {
    return { newMarkdown: markdown, replacementCount: 0 };
  }

  // Filter groups that contain oldKey
  const relevantGroups = groups
    .filter((g) => g.citations.some((c) => c.citationKey.toLowerCase() === oldKey.toLowerCase()))
    .sort((a, b) => b.charOffset - a.charOffset); // Process backwards from end of string

  if (relevantGroups.length === 0) {
    return { newMarkdown: markdown, replacementCount: 0 };
  }

  let result = markdown;
  let replacementCount = 0;

  for (const group of relevantGroups) {
    // Reconstruct group string
    const updatedParts: string[] = [];
    let groupChanged = false;

    for (const cit of group.citations) {
      if (cit.citationKey.toLowerCase() === oldKey.toLowerCase()) {
        groupChanged = true;
        replacementCount++;
        if (cit.locator) {
          updatedParts.push(`@${newKey}, ${cit.locator}`);
        } else {
          updatedParts.push(`@${newKey}`);
        }
      } else {
        if (cit.locator) {
          updatedParts.push(`@${cit.citationKey}, ${cit.locator}`);
        } else {
          updatedParts.push(`@${cit.citationKey}`);
        }
      }
    }

    if (groupChanged) {
      const newGroupStr = `[${updatedParts.join('; ')}]`;
      result =
        result.slice(0, group.charOffset) +
        newGroupStr +
        result.slice(group.charOffset + group.raw.length);
    }
  }

  return { newMarkdown: result, replacementCount };
}
