/** A whitespace-only miniature, not a replacement for Tiny Tools' full normalizer. */
export function cleanPreviewText(input: string): string {
  return input.replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[^\S\n]+/gu, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
export function characterCount(text: string): number {
  return Array.from(text).length;
}
export const PREVIEW_EXAMPLE = '  A little less friction.    A little more focus.  \n\nKeep the words.    Lose the extra spaces.';
