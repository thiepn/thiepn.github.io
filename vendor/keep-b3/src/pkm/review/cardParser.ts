/**
 * Phase P38 - Review Card & Cloze Parser
 *
 * Extracts Review Cards (Question/Answer, Clozes, Definitions) from canonical Markdown.
 * Operates deterministically with mask-safety (skips code blocks, query blocks, etc.).
 */

import { Note } from '../../types';
import { identifyMaskedRegions } from '../masking';
import { ReviewCard, CardType } from './reviewTypes';

/**
 * Fast deterministic string hashing for content and stable ID derivation
 */
export function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parses all review cards from a canonical Note.
 */
export function extractCardsFromNote(note: Note): ReviewCard[] {
  if (!note || !note.content || note.trashed) return [];

  const rawContent = note.content;
  const cards: ReviewCard[] = [];

  // Mask code blocks, inline code, and query blocks to prevent false positive cards
  const { maskedText } = identifyMaskedRegions(rawContent);
  const rawLines = rawContent.split('\n');
  const maskedLines = maskedText.split('\n');

  let lineIdx = 0;

  while (lineIdx < rawLines.length) {
    const rLine = rawLines[lineIdx];
    const mLine = maskedLines[lineIdx];
    const trimmedRaw = rLine.trim();
    const trimmedMasked = mLine.trim();

    if (!trimmedMasked) {
      lineIdx++;
      continue;
    }

    // 1. Check for Question/Answer format (Q:: ... \n A:: ... OR Q: ... \n A: ... OR **Q:** ... \n **A:** ..., with optional bullet prefix)
    const qMatch = trimmedMasked.match(/^(?:[-*+]\s+)?(?:\*\*Q:\*\*|Q::|Q:)\s*(.+)$/i);
    if (qMatch) {
      const qStartLine = lineIdx;
      const questionText = trimmedRaw.replace(/^(?:[-*+]\s+)?(?:\*\*Q:\*\*|Q::|Q:)\s*/i, '').trim();

      // Look ahead for A:: or A:
      let answerLines: string[] = [];
      let explicitCardId: string | undefined;
      let nextIdx = lineIdx + 1;

      while (nextIdx < rawLines.length) {
        const nextRaw = rawLines[nextIdx].trim();
        const nextMasked = maskedLines[nextIdx].trim();

        // Check if block ID is on this line: ^card-xyz or ^xyz
        const blockIdMatch = nextRaw.match(/\^([a-zA-Z0-9_-]+)\s*$/);
        if (blockIdMatch && !explicitCardId) {
          explicitCardId = blockIdMatch[1];
        }

        if (nextMasked.match(/^(?:[-*+]\s+)?(?:\*\*A:\*\*|A::|A:)\s*/i)) {
          const firstAnsLine = nextRaw.replace(/^(?:[-*+]\s+)?(?:\*\*A:\*\*|A::|A:)\s*/i, '').replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim();
          if (firstAnsLine) answerLines.push(firstAnsLine);

          // Consume multiline answer until next Q or heading or blank line followed by new section
          nextIdx++;
          while (nextIdx < rawLines.length) {
            const subRaw = rawLines[nextIdx];
            const subMasked = maskedLines[nextIdx];
            const subTrimmed = subRaw.trim();

            if (subMasked.match(/^(?:[-*+]\s+)?(?:\*\*Q:\*\*|Q::|Q:)\s*/i) || subMasked.match(/^#{1,6}\s+/)) {
              break;
            }

            const subBlockMatch = subTrimmed.match(/\^([a-zA-Z0-9_-]+)\s*$/);
            if (subBlockMatch && !explicitCardId) {
              explicitCardId = subBlockMatch[1];
            }

            if (subTrimmed === '' && nextIdx + 1 < rawLines.length && rawLines[nextIdx + 1].trim() === '') {
              // Double blank line terminates answer
              break;
            }

            const cleanSubLine = subRaw.replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim();
            if (cleanSubLine || answerLines.length > 0) {
              answerLines.push(cleanSubLine);
            }
            nextIdx++;
          }
          break;
        }

        if (nextMasked.match(/^(?:\*\*Q:\*\*|Q::|Q:)\s*/i) || nextMasked.match(/^#{1,6}\s+/)) {
          break; // Next question or heading started
        }
        nextIdx++;
      }

      if (answerLines.length > 0) {
        const answerText = answerLines.join('\n').trim();
        const rawBlock = rawLines.slice(qStartLine, nextIdx).join('\n');
        const cardId = explicitCardId
          ? (explicitCardId.startsWith('card-') ? explicitCardId : `card-${explicitCardId}`)
          : `card-qa-${simpleHash(note.id + ':' + qStartLine + ':' + questionText)}`;

        cards.push({
          id: cardId,
          sourceNoteId: note.id,
          sourceNoteTitle: note.title || 'Untitled',
          sourceBlockId: explicitCardId,
          sourceLine: qStartLine,
          sourceContentHash: simpleHash(questionText + '::' + answerText),
          type: 'question-answer',
          prompt: questionText,
          answer: answerText,
          rawSource: rawBlock,
          tags: note.tags || [],
          folderId: note.folderId || null,
        });

        lineIdx = nextIdx;
        continue;
      }
    }

    // 2. Check for Single-Line Double/Triple-Colon syntax: "Question :: Answer", "Term ::: Definition", or "- Question :: Answer"
    // Must contain " ::: " or " :: " and not be in frontmatter or code
    const colonDelim = trimmedMasked.includes(' ::: ') ? ' ::: ' : (trimmedMasked.includes(' :: ') ? ' :: ' : null);
    if (colonDelim && !trimmedMasked.startsWith('#') && !trimmedMasked.startsWith('- [')) {
      const blockIdMatch = trimmedRaw.match(/\^([a-zA-Z0-9_-]+)\s*$/);
      const explicitCardId = blockIdMatch ? blockIdMatch[1] : undefined;
      const cleanLine = trimmedRaw.replace(/^[-*+]\s+/, '').replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim();

      const parts = cleanLine.split(colonDelim);
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        const question = parts[0].trim();
        const answer = parts[1].trim();
        const cardId = explicitCardId
          ? (explicitCardId.startsWith('card-') ? explicitCardId : `card-${explicitCardId}`)
          : `card-qa-${simpleHash(note.id + ':' + lineIdx + ':' + question)}`;

        cards.push({
          id: cardId,
          sourceNoteId: note.id,
          sourceNoteTitle: note.title || 'Untitled',
          sourceBlockId: explicitCardId,
          sourceLine: lineIdx,
          sourceContentHash: simpleHash(question + '::' + answer),
          type: 'basic',
          prompt: question,
          answer: answer,
          rawSource: rLine,
          tags: note.tags || [],
          folderId: note.folderId || null,
        });

        lineIdx++;
        continue;
      }
    }

    // 3. Check for Cloze Deletions: {{c1::answer}} or {{c1::answer::hint}}
    // Regex looking for {{c(\d+)::(.*?)(?:::([^}]+))?}} in the masked line
    const clozeRegex = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;
    let match: RegExpExecArray | null;
    const clozeIndices = new Set<number>();
    const clozeDetailsMap = new Map<number, Array<{ answer: string; hint?: string }>>();

    while ((match = clozeRegex.exec(mLine)) !== null) {
      // Get the corresponding match from raw line to preserve unmasked text
      const rawMatchSlice = rLine.slice(match.index, match.index + match[0].length);
      const rawMatch = rawMatchSlice.match(/^\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}$/);

      if (rawMatch) {
        const cNum = parseInt(rawMatch[1], 10);
        const ans = rawMatch[2].trim();
        const hint = rawMatch[3] ? rawMatch[3].trim() : undefined;

        if (cNum > 0 && ans) {
          clozeIndices.add(cNum);
          const list = clozeDetailsMap.get(cNum) || [];
          list.push({ answer: ans, hint });
          clozeDetailsMap.set(cNum, list);
        }
      }
    }

    if (clozeIndices.size > 0) {
      const blockIdMatch = trimmedRaw.match(/\^([a-zA-Z0-9_-]+)\s*$/);
      const explicitCardId = blockIdMatch ? blockIdMatch[1] : undefined;
      const baseSiblingId = explicitCardId || `cloze-group-${note.id}-${lineIdx}`;

      // Clean raw text without block ID
      const cleanLine = rLine.replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim();

      // For each distinct cloze number cN, generate one card
      for (const cNum of Array.from(clozeIndices).sort((a, b) => a - b)) {
        const details = clozeDetailsMap.get(cNum) || [];
        const answerStr = details.map((d) => d.answer).join(', ');
        const primaryHint = details.find((d) => d.hint)?.hint;

        // Build masked prompt: replace {{cN::answer::hint}} with [...]
        // while replacing other clozes {{cM::answer::hint}} with their raw answer
        const prompt = cleanLine.replace(
          /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g,
          (_, numStr, ans, h) => {
            const num = parseInt(numStr, 10);
            if (num === cNum) {
              return h ? `[... (${h})]` : `[...]`;
            }
            return ans; // Other clozes show normal answer in prompt
          }
        );

        const cardId = explicitCardId
          ? (explicitCardId.startsWith('card-')
              ? `${explicitCardId}-c${cNum}`
              : `card-${explicitCardId}-c${cNum}`)
          : `card-cloze-${simpleHash(note.id + ':' + lineIdx + ':c' + cNum + ':' + cleanLine)}`;

        cards.push({
          id: cardId,
          sourceNoteId: note.id,
          sourceNoteTitle: note.title || 'Untitled',
          sourceBlockId: explicitCardId,
          sourceLine: lineIdx,
          sourceContentHash: simpleHash(cleanLine),
          type: 'cloze',
          prompt,
          answer: answerStr,
          rawSource: rLine,
          clozeIndex: cNum,
          clozeHint: primaryHint,
          tags: note.tags || [],
          folderId: note.folderId || null,
          isSiblingOf: baseSiblingId,
        });
      }
    }

    lineIdx++;
  }

  return cards;
}

/**
 * Scan note content to find the next available cloze number (e.g. c1, c2 -> c3)
 */
export function getNextClozeIndex(content: string): number {
  if (!content) return 1;
  const regex = /\{\{c(\d+)::/g;
  let maxIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > maxIdx) {
      maxIdx = num;
    }
  }
  return maxIdx + 1;
}

/**
 * Wraps a selected substring in a note into cloze syntax: {{c<N>::<selection>::<hint?>}}
 */
export function wrapSelectionAsCloze(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  clozeIndex?: number,
  hint?: string
): { updatedContent: string; newCursorPos: number; clozeIndex: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  const selectedText = content.substring(start, end).trim() || 'answer';
  const cIndex = clozeIndex || getNextClozeIndex(content);
  const hintPart = hint ? `::${hint.trim()}` : '';
  const replacement = `{{c${cIndex}::${selectedText}${hintPart}}}`;

  const updatedContent = content.substring(0, start) + replacement + content.substring(end);
  const newCursorPos = start + replacement.length;

  return { updatedContent, newCursorPos, clozeIndex: cIndex };
}

/**
 * Creates a Question / Answer card snippet with an optional block ID
 */
export function createQACardSnippet(question: string, answer: string, cardId?: string): string {
  const q = question.trim();
  const a = answer.trim();
  const idSuffix = cardId ? ` ^card-${cardId.replace(/^card-/, '')}` : ` ^card-${simpleHash(Date.now().toString() + q)}`;
  return `\nQ:: ${q}\nA:: ${a}${idSuffix}\n`;
}

/**
 * Regenerates all card IDs in a Markdown text.
 * CRITICAL for Note Duplication so copied notes never share review states!
 */
export function regenerateCardIdsInMarkdown(content: string): string {
  if (!content) return content;
  // Match any ^card-xyz block marker and replace with fresh unique id
  return content.replace(/\^card-[a-zA-Z0-9_-]+/g, () => {
    const freshId = 'card-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    return `^${freshId}`;
  });
}
