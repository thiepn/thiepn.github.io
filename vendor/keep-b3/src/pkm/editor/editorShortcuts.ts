import React from 'react';

export interface EditorShortcutResult {
  handled: boolean;
  newContent?: string;
  newCursorStart?: number;
  newCursorEnd?: number;
  newSelectionStart?: number;
  newSelectionEnd?: number;
}

const PAIR_MAP: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
  '*': '*',
  '_': '_',
  '$': '$',
};

const CLOSING_CHARS = new Set([')', ']', '}', '"', "'", '`', '*', '_', '$']);

/**
 * Handles smart keyboard mechanics inside Markdown textarea:
 * - List continuation on Enter
 * - List exit on empty Enter
 * - List indentation on Tab / Shift+Tab
 * - Auto-pairing for brackets/quotes/markup
 * - Alt+Up / Alt+Down line movement
 */
export function handleEditorKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  content: string,
  selectionStart: number,
  selectionEnd: number,
  autoPairingEnabled: boolean = true
): EditorShortcutResult {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // 1. Enter key: List continuation or exit
  if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
    const textBefore = content.slice(0, selectionStart);
    const lastNewline = textBefore.lastIndexOf('\n');
    const currentLine = textBefore.slice(lastNewline + 1);

    // Checklist pattern: ^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$
    const checklistMatch = currentLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/);
    if (checklistMatch) {
      const indent = checklistMatch[1];
      const bulletChar = checklistMatch[2];
      const textAfterBox = checklistMatch[4];

      // If empty checklist item -> exit list
      if (!textAfterBox.trim()) {
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const newContent = content.slice(0, lineStart) + content.slice(selectionStart);
        return {
          handled: true,
          newContent,
          newCursorStart: lineStart,
          newCursorEnd: lineStart,
        };
      }

      // Continue checklist
      const insertText = `\n${indent}${bulletChar} [ ] `;
      const newContent =
        content.slice(0, selectionStart) + insertText + content.slice(selectionEnd);
      const newCursor = selectionStart + insertText.length;
      return {
        handled: true,
        newContent,
        newCursorStart: newCursor,
        newCursorEnd: newCursor,
      };
    }

    // Numbered list pattern: ^(\s*)(\d+)([.)])\s*(.*)$
    const numberedMatch = currentLine.match(/^(\s*)(\d+)([.)])\s*(.*)$/);
    if (numberedMatch) {
      const indent = numberedMatch[1];
      const currentNum = parseInt(numberedMatch[2], 10);
      const delimiter = numberedMatch[3];
      const textAfterNum = numberedMatch[4];

      // If empty numbered item -> exit list
      if (!textAfterNum.trim()) {
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const newContent = content.slice(0, lineStart) + content.slice(selectionStart);
        return {
          handled: true,
          newContent,
          newCursorStart: lineStart,
          newCursorEnd: lineStart,
        };
      }

      // Continue numbered list (increment number)
      const nextNum = currentNum + 1;
      const insertText = `\n${indent}${nextNum}${delimiter} `;
      const newContent =
        content.slice(0, selectionStart) + insertText + content.slice(selectionEnd);
      const newCursor = selectionStart + insertText.length;
      return {
        handled: true,
        newContent,
        newCursorStart: newCursor,
        newCursorEnd: newCursor,
      };
    }

    // Bullet list pattern: ^(\s*)([-*+])\s+(.*)$
    const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1];
      const bulletChar = bulletMatch[2];
      const textAfterBullet = bulletMatch[3];

      // If empty bullet item -> exit list
      if (!textAfterBullet.trim()) {
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const newContent = content.slice(0, lineStart) + content.slice(selectionStart);
        return {
          handled: true,
          newContent,
          newCursorStart: lineStart,
          newCursorEnd: lineStart,
        };
      }

      // Continue bullet list
      const insertText = `\n${indent}${bulletChar} `;
      const newContent =
        content.slice(0, selectionStart) + insertText + content.slice(selectionEnd);
      const newCursor = selectionStart + insertText.length;
      return {
        handled: true,
        newContent,
        newCursorStart: newCursor,
        newCursorEnd: newCursor,
      };
    }

    // Blockquote / Callout continuation: ^(\s*>+)\s*(.*)$
    const quoteMatch = currentLine.match(/^(\s*>+)\s*(.*)$/);
    if (quoteMatch) {
      const quotePrefix = quoteMatch[1];
      const quoteText = quoteMatch[2];

      // If empty quote line -> exit quote
      if (!quoteText.trim()) {
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const newContent = content.slice(0, lineStart) + content.slice(selectionStart);
        return {
          handled: true,
          newContent,
          newCursorStart: lineStart,
          newCursorEnd: lineStart,
        };
      }

      const insertText = `\n${quotePrefix} `;
      const newContent =
        content.slice(0, selectionStart) + insertText + content.slice(selectionEnd);
      const newCursor = selectionStart + insertText.length;
      return {
        handled: true,
        newContent,
        newCursorStart: newCursor,
        newCursorEnd: newCursor,
      };
    }
  }

  // 2. Tab / Shift+Tab for indentation & outdentation
  if (e.key === 'Tab') {
    e.preventDefault();
    const isOutdent = e.shiftKey;

    // Check if multi-line selection or single line
    const textBefore = content.slice(0, selectionStart);
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    const lineEnd = content.indexOf('\n', selectionEnd);
    const actualEnd = lineEnd === -1 ? content.length : lineEnd;

    const blockText = content.slice(lineStart, actualEnd);
    const lines = blockText.split('\n');

    let modifiedLines: string[];
    let delta = 0;

    if (isOutdent) {
      // Remove up to 2 leading spaces or 1 tab from each line
      modifiedLines = lines.map((l) => {
        if (l.startsWith('  ')) {
          delta -= 2;
          return l.slice(2);
        }
        if (l.startsWith(' ')) {
          delta -= 1;
          return l.slice(1);
        }
        if (l.startsWith('\t')) {
          delta -= 1;
          return l.slice(1);
        }
        return l;
      });
    } else {
      // Add 2 spaces to each line
      modifiedLines = lines.map((l) => {
        delta += 2;
        return '  ' + l;
      });
    }

    const newBlockText = modifiedLines.join('\n');
    const newContent = content.slice(0, lineStart) + newBlockText + content.slice(actualEnd);

    return {
      handled: true,
      newContent,
      newCursorStart: Math.max(lineStart, selectionStart + (isOutdent ? -2 : 2)),
      newCursorEnd: Math.max(lineStart, selectionEnd + delta),
    };
  }

  // 3. Auto-pairing brackets and formatting
  if (autoPairingEnabled && PAIR_MAP[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const openChar = e.key;
    const closeChar = PAIR_MAP[openChar];

    // Case A: Text is selected -> wrap selection in pair
    if (selectionStart !== selectionEnd) {
      const selected = content.slice(selectionStart, selectionEnd);
      const newContent =
        content.slice(0, selectionStart) +
        openChar +
        selected +
        closeChar +
        content.slice(selectionEnd);
      return {
        handled: true,
        newContent,
        newCursorStart: selectionStart + 1,
        newCursorEnd: selectionEnd + 1,
        newSelectionStart: selectionStart + 1,
        newSelectionEnd: selectionEnd + 1,
      };
    }

    // Case B: Step over if closing character typed right before existing closing char
    if (CLOSING_CHARS.has(openChar) && content[selectionStart] === openChar) {
      return {
        handled: true,
        newContent: content,
        newCursorStart: selectionStart + 1,
        newCursorEnd: selectionStart + 1,
        newSelectionStart: selectionStart + 1,
        newSelectionEnd: selectionStart + 1,
      };
    }

    // Case C: Empty insertion -> insert pair and put cursor between
    const newContent =
      content.slice(0, selectionStart) + openChar + closeChar + content.slice(selectionEnd);
    return {
      handled: true,
      newContent,
      newCursorStart: selectionStart + 1,
      newCursorEnd: selectionStart + 1,
      newSelectionStart: selectionStart + 1,
      newSelectionEnd: selectionStart + 1,
    };
  }

  // Step-over for closing characters e.g. ) ] }
  if (
    CLOSING_CHARS.has(e.key) &&
    selectionStart === selectionEnd &&
    content[selectionStart] === e.key &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    return {
      handled: true,
      newCursorStart: selectionStart + 1,
      newCursorEnd: selectionStart + 1,
    };
  }

  // 4. Backspace between empty pair: e.g. () -> backspace removes both
  if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
    const prevChar = content[selectionStart - 1];
    const nextChar = content[selectionStart];
    if (PAIR_MAP[prevChar] && PAIR_MAP[prevChar] === nextChar) {
      const newContent =
        content.slice(0, selectionStart - 1) + content.slice(selectionStart + 1);
      return {
        handled: true,
        newContent,
        newCursorStart: selectionStart - 1,
        newCursorEnd: selectionStart - 1,
      };
    }
  }

  // 4b. Formatting shortcuts: Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+K (Link/WikiLink), Ctrl+Shift+X (Strike), Ctrl+E (Code)
  const isMod = isMac ? e.metaKey : e.ctrlKey;
  if (isMod && !e.altKey) {
    const key = e.key.toLowerCase();
    if (key === 'b' && !e.shiftKey) {
      e.preventDefault();
      const selected = content.slice(selectionStart, selectionEnd);
      const isWrapped = selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4;
      let newContent = '';
      let newStart = selectionStart;
      let newEnd = selectionEnd;
      if (isWrapped) {
        newContent = content.slice(0, selectionStart) + selected.slice(2, -2) + content.slice(selectionEnd);
        newStart = selectionStart;
        newEnd = selectionEnd - 4;
      } else {
        const wrap = `**${selected || 'bold text'}**`;
        newContent = content.slice(0, selectionStart) + wrap + content.slice(selectionEnd);
        newStart = selected ? selectionStart : selectionStart + 2;
        newEnd = selected ? selectionStart + wrap.length : selectionStart + 2 + (selected ? 0 : 9);
      }
      return {
        handled: true,
        newContent,
        newCursorStart: newEnd,
        newCursorEnd: newEnd,
        newSelectionStart: newStart,
        newSelectionEnd: newEnd,
      };
    }

    if (key === 'i' && !e.shiftKey) {
      e.preventDefault();
      const selected = content.slice(selectionStart, selectionEnd);
      const isWrapped = selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2 && !selected.startsWith('**');
      let newContent = '';
      let newStart = selectionStart;
      let newEnd = selectionEnd;
      if (isWrapped) {
        newContent = content.slice(0, selectionStart) + selected.slice(1, -1) + content.slice(selectionEnd);
        newStart = selectionStart;
        newEnd = selectionEnd - 2;
      } else {
        const wrap = `*${selected || 'italic text'}*`;
        newContent = content.slice(0, selectionStart) + wrap + content.slice(selectionEnd);
        newStart = selected ? selectionStart : selectionStart + 1;
        newEnd = selected ? selectionStart + wrap.length : selectionStart + 1 + (selected ? 0 : 11);
      }
      return {
        handled: true,
        newContent,
        newCursorStart: newEnd,
        newCursorEnd: newEnd,
        newSelectionStart: newStart,
        newSelectionEnd: newEnd,
      };
    }

    if (key === 'k' && !e.shiftKey) {
      e.preventDefault();
      const selected = content.slice(selectionStart, selectionEnd);
      const wrap = selected ? `[${selected}](url)` : `[[Note Title]]`;
      const newContent = content.slice(0, selectionStart) + wrap + content.slice(selectionEnd);
      const newStart = selected ? selectionStart + selected.length + 3 : selectionStart + 2;
      const newEnd = selected ? selectionStart + wrap.length - 1 : selectionStart + wrap.length - 2;
      return {
        handled: true,
        newContent,
        newCursorStart: newEnd,
        newCursorEnd: newEnd,
        newSelectionStart: newStart,
        newSelectionEnd: newEnd,
      };
    }

    if (key === 'x' && e.shiftKey) {
      e.preventDefault();
      const selected = content.slice(selectionStart, selectionEnd);
      const wrap = `~~${selected || 'strikethrough'}~~`;
      const newContent = content.slice(0, selectionStart) + wrap + content.slice(selectionEnd);
      const newStart = selected ? selectionStart : selectionStart + 2;
      const newEnd = selected ? selectionStart + wrap.length : selectionStart + 2 + 13;
      return {
        handled: true,
        newContent,
        newCursorStart: newEnd,
        newCursorEnd: newEnd,
        newSelectionStart: newStart,
        newSelectionEnd: newEnd,
      };
    }

    if (key === 'e' && !e.shiftKey) {
      e.preventDefault();
      const selected = content.slice(selectionStart, selectionEnd);
      const isMultiLine = selected.includes('\n');
      const wrap = isMultiLine ? `\`\`\`\n${selected || '// code'}\n\`\`\`\n` : `\`${selected || 'code'}\``;
      const newContent = content.slice(0, selectionStart) + wrap + content.slice(selectionEnd);
      const newStart = selected ? selectionStart : selectionStart + (isMultiLine ? 4 : 1);
      const newEnd = selected ? selectionStart + wrap.length : selectionStart + wrap.length - (isMultiLine ? 5 : 1);
      return {
        handled: true,
        newContent,
        newCursorStart: newEnd,
        newCursorEnd: newEnd,
        newSelectionStart: newStart,
        newSelectionEnd: newEnd,
      };
    }
  }

  // 5. Line movement: Alt+ArrowUp / Alt+ArrowDown
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const isUp = e.key === 'ArrowUp';
    const lines = content.split('\n');

    // Find start and end line indices
    const textBefore = content.slice(0, selectionStart);
    const startLineIdx = textBefore.split('\n').length - 1;
    const selectedText = content.slice(selectionStart, selectionEnd);
    const endLineIdx = startLineIdx + selectedText.split('\n').length - 1;

    if (isUp && startLineIdx > 0) {
      // Swap target line above with selected lines
      const targetLine = lines[startLineIdx - 1];
      const movingLines = lines.slice(startLineIdx, endLineIdx + 1);

      lines.splice(startLineIdx - 1, endLineIdx - startLineIdx + 2, ...movingLines, targetLine);
      const newContent = lines.join('\n');

      // Calculate new cursor offsets
      const linesBeforeNew = lines.slice(0, startLineIdx - 1).join('\n');
      const newStart = linesBeforeNew.length === 0 ? 0 : linesBeforeNew.length + 1;
      const newMovingText = movingLines.join('\n');

      return {
        handled: true,
        newContent,
        newCursorStart: newStart,
        newCursorEnd: newStart + newMovingText.length,
      };
    } else if (!isUp && endLineIdx < lines.length - 1) {
      // Swap target line below with selected lines
      const targetLine = lines[endLineIdx + 1];
      const movingLines = lines.slice(startLineIdx, endLineIdx + 1);

      lines.splice(startLineIdx, endLineIdx - startLineIdx + 2, targetLine, ...movingLines);
      const newContent = lines.join('\n');

      const linesBeforeNew = lines.slice(0, startLineIdx + 1).join('\n');
      const newStart = linesBeforeNew.length + 1;
      const newMovingText = movingLines.join('\n');

      return {
        handled: true,
        newContent,
        newCursorStart: newStart,
        newCursorEnd: newStart + newMovingText.length,
      };
    }
  }

  return { handled: false };
}

/**
 * Typewriter scrolling helper: centers the active editing line vertically
 */
export function scrollCursorIntoTypewriterCenter(
  textarea: HTMLTextAreaElement,
  cursorPosition: number
) {
  if (!textarea) return;

  const totalLines = textarea.value.split('\n').length;
  if (totalLines === 0) return;

  const linesBefore = textarea.value.slice(0, cursorPosition).split('\n');
  const currentLineIndex = linesBefore.length - 1;

  const lineHeight = 24; // Standard line height in px
  const targetScrollTop =
    currentLineIndex * lineHeight - textarea.clientHeight / 2 + lineHeight / 2;

  if (Math.abs(textarea.scrollTop - targetScrollTop) > 30) {
    textarea.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }
}
