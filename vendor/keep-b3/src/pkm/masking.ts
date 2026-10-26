import { PKMCodeBlock } from './types';

export interface MaskedRegion {
  start: number;
  end: number;
  type: 'fenced' | 'inline' | 'math';
}

export interface MaskedResult {
  maskedText: string;
  regions: MaskedRegion[];
  codeBlocks: PKMCodeBlock[];
  mathBlocks: string[];
}

/**
 * Identifies code blocks (fenced & inline) and math blocks ($$ and $)
 * and returns the masked text with these regions blanked out by spaces to preserve character offsets.
 */
export function identifyMaskedRegions(text: string): MaskedResult {
  if (!text || typeof text !== 'string') {
    return {
      maskedText: '',
      regions: [],
      codeBlocks: [],
      mathBlocks: [],
    };
  }

  const regions: MaskedRegion[] = [];
  const codeBlocks: PKMCodeBlock[] = [];
  const mathBlocks: string[] = [];

  // 1. Fenced code blocks: ```lang ... ``` or ~~~lang ... ~~~
  const fencedRegex = /(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1/g;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    const lang = (match[2] || '').trim().toLowerCase();
    const content = match[3] || '';

    let type: PKMCodeBlock['type'] = 'fenced';
    if (lang === 'query') type = 'query';
    else if (lang === 'mermaid') type = 'mermaid';
    else if (lang === 'math' || lang === 'latex' || lang === 'katex') type = 'math';

    const lineStart = text.slice(0, start).split('\n').length - 1;
    const lineEnd = text.slice(0, end).split('\n').length - 1;

    codeBlocks.push({
      language: lang,
      type,
      content,
      lineStart,
      lineEnd,
    });

    regions.push({ start, end, type: 'fenced' });
  }

  // 2. Block math: $$ ... $$
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  while ((match = blockMathRegex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    // Only if not already inside a fenced code block
    if (!regions.some((r) => start >= r.start && end <= r.end)) {
      mathBlocks.push(match[1].trim());
      regions.push({ start, end, type: 'math' });
    }
  }

  // 3. Inline code: ` ... `
  const inlineCodeRegex = /(`+)([^`\n]+?)\1/g;
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (!regions.some((r) => start >= r.start && end <= r.end)) {
      regions.push({ start, end, type: 'inline' });
    }
  }

  // 4. Inline math: $ ... $ (excluding $$)
  const inlineMathRegex = /(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    if (!regions.some((r) => start >= r.start && end <= r.end)) {
      mathBlocks.push(match[1].trim());
      regions.push({ start, end, type: 'math' });
    }
  }

  // Sort regions by start index
  regions.sort((a, b) => a.start - b.start);

  // Build masked text: replace masked regions with whitespace of equal length to preserve offsets & line numbers
  let maskedText = '';
  let lastIdx = 0;
  for (const r of regions) {
    maskedText += text.slice(lastIdx, r.start);
    const slice = text.slice(r.start, r.end);
    // Preserve newlines so line numbers match
    const masked = slice.replace(/[^\n]/g, ' ');
    maskedText += masked;
    lastIdx = r.end;
  }
  maskedText += text.slice(lastIdx);

  return { maskedText, regions, codeBlocks, mathBlocks };
}

export const maskCodeAndMath = identifyMaskedRegions;
