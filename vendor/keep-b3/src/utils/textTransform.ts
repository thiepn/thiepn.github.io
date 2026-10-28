/**
 * Utility functions for text transformations, cleanup, and statistics.
 * Provides high-utility QoL text manipulation capabilities for note editors.
 */

export function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

export function bulletizeLines(text: string): string {
  if (!text) return '- ';
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('- ')) {
        return line.replace(/^(\s*)-\s+/, '$1');
      }
      return `- ${line}`;
    })
    .join('\n');
}

export function checkboxizeLines(text: string): string {
  if (!text) return '- [ ] ';
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
        return line.replace(/^(\s*)-\s+\[[ x]\]\s+/, '$1');
      }
      return `- [ ] ${line}`;
    })
    .join('\n');
}

export function cleanExtraBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function trimTrailingWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

export function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `[${year}-${month}-${day} ${hours}:${minutes}]`;
}

export interface DetailedNoteStats {
  words: number;
  charsWithSpaces: number;
  charsNoSpaces: number;
  lines: number;
  paragraphs: number;
  readTimeMinutes: number;
}

export function getDetailedStats(content: string): DetailedNoteStats {
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const charsWithSpaces = content.length;
  const charsNoSpaces = content.replace(/\s/g, '').length;
  const lines = content ? content.split('\n').length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    charsWithSpaces,
    charsNoSpaces,
    lines,
    paragraphs,
    readTimeMinutes,
  };
}
