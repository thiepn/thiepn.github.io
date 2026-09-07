import { describe, expect, it } from 'vitest';
import { cleanPreviewText, characterCount, PREVIEW_EXAMPLE } from '../../src/lib/text-preview';
describe('the bounded Tiny Tools whitespace miniature',()=>{
 it('cleans the displayed example without changing its words',()=>expect(cleanPreviewText(PREVIEW_EXAMPLE)).toBe('A little less friction. A little more focus.\n\nKeep the words. Lose the extra spaces.'));
 it('normalizes CRLF and CR line endings',()=>expect(cleanPreviewText(' a\r\nb \rc ')).toBe('a\nb\nc'));
 it('collapses tabs and preserves meaningful line breaks',()=>expect(cleanPreviewText('one\t\ttwo\n three ')).toBe('one two\nthree'));
 it('keeps at most one empty line',()=>expect(cleanPreviewText('one\n\n\n\n\n two')).toBe('one\n\ntwo'));
 it('leaves punctuation and multilingual text unchanged',()=>expect(cleanPreviewText('  안녕하세요!  Bonjour.   Türkçe — Grüße. ')).toBe('안녕하세요! Bonjour. Türkçe — Grüße.'));
 it('does not break emoji joins or combining marks',()=>expect(cleanPreviewText(' 👩‍💻  e\u0301 ')).toBe('👩‍💻 e\u0301'));
 it('treats an all-whitespace input as empty',()=>expect(cleanPreviewText(' \n\t\r\n ')).toBe(''));
 it('handles a full-length input',()=>expect(cleanPreviewText('a '.repeat(5000))).toBe('a '.repeat(5000).trim()));
 it('is idempotent',()=>{const first=cleanPreviewText(PREVIEW_EXAMPLE);expect(cleanPreviewText(first)).toBe(first);});
 it('counts Unicode code points rather than UTF-16 halves',()=>expect(characterCount('A😀B')).toBe(3));
});
