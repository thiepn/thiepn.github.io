import { Note } from '../../types';
import { PKMTask } from './taskTypes';

export interface TaskMutationResult {
  success: boolean;
  updatedContent?: string;
  updatedNote?: Note;
  error?: string;
}

/**
 * Finds the actual line index for a task in markdown content using line hint and fuzzy fallback
 */
export function findTaskLineIndex(lines: string[], task: PKMTask): number {
  // 1. Direct line check
  if (task.line >= 0 && task.line < lines.length) {
    const candidate = lines[task.line];
    if (candidate.includes('[ ]') || candidate.includes('[x]') || candidate.includes('[X]')) {
      if (candidate.includes(task.text) || (task.blockId && candidate.includes(task.blockId))) {
        return task.line;
      }
    }
  }

  // 2. Search whole file by task blockId if present
  if (task.blockId) {
    const idx = lines.findIndex((l) => l.includes(`^${task.blockId}`));
    if (idx !== -1) return idx;
  }

  // 3. Search whole file by text match with checkbox
  const textClean = task.text.trim();
  if (textClean) {
    const matchedIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^\s*[-*+]\s+\[[ xX]\]/.test(l) && l.includes(textClean)) {
        matchedIndices.push(i);
      }
    }

    if (matchedIndices.length === 1) {
      return matchedIndices[0];
    }
    if (matchedIndices.length > 1) {
      // Pick closest to original task.line
      return matchedIndices.reduce((prev, curr) =>
        Math.abs(curr - task.line) < Math.abs(prev - task.line) ? curr : prev
      );
    }
  }

  return -1;
}

/**
 * Toggles a task's completion status in note content and returns the updated note
 */
export function toggleTaskInNote(note: Note, task: PKMTask, newCompleted?: boolean): TaskMutationResult {
  const targetCompleted = newCompleted !== undefined ? newCompleted : !task.completed;

  // Handle native checklist note type
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    let updated = false;
    const updatedChecklist = note.checklist.map((item) => {
      if (item.text === task.text || item.id === task.id) {
        updated = true;
        return { ...item, completed: targetCompleted };
      }
      return item;
    });

    if (updated) {
      const updatedNote: Note = {
        ...note,
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      };
      return { success: true, updatedNote };
    }
  }

  // Handle Markdown text
  const content = note.content || '';
  const lines = content.split('\n');
  const lineIdx = findTaskLineIndex(lines, task);

  if (lineIdx === -1) {
    return {
      success: false,
      error: `Could not locate task line in note "${note.title}".`,
    };
  }

  const originalLine = lines[lineIdx];
  const newMarker = targetCompleted ? '[x]' : '[ ]';

  // Replace [ ] with [x] or vice versa
  const updatedLine = originalLine.replace(/\[([ xX])\]/, newMarker);
  lines[lineIdx] = updatedLine;

  const updatedContent = lines.join('\n');
  const updatedNote: Note = {
    ...note,
    content: updatedContent,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    updatedContent,
    updatedNote,
  };
}

/**
 * Updates task text in note content
 */
export function editTaskTextInNote(note: Note, task: PKMTask, newText: string): TaskMutationResult {
  const cleanNewText = newText.trim();
  if (!cleanNewText) {
    return { success: false, error: 'Task text cannot be empty' };
  }

  // Handle native checklist
  if (note.type === 'checklist' && note.checklist) {
    const updatedChecklist = note.checklist.map((item) => {
      if (item.text === task.text || item.id === task.id) {
        return { ...item, text: cleanNewText };
      }
      return item;
    });
    return {
      success: true,
      updatedNote: {
        ...note,
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const content = note.content || '';
  const lines = content.split('\n');
  const lineIdx = findTaskLineIndex(lines, task);

  if (lineIdx === -1) {
    return { success: false, error: 'Could not locate task line in note.' };
  }

  const originalLine = lines[lineIdx];
  const taskMatch = originalLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s*)(.*)$/);
  if (!taskMatch) {
    return { success: false, error: 'Target line is not a valid task.' };
  }

  const prefix = taskMatch[1];
  const suffixBlockId = task.blockId ? ` ^${task.blockId}` : '';
  const updatedLine = `${prefix}${cleanNewText}${suffixBlockId}`;
  lines[lineIdx] = updatedLine;

  const updatedContent = lines.join('\n');
  return {
    success: true,
    updatedContent,
    updatedNote: {
      ...note,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Appends a new task to a note
 */
export function addTaskToNote(note: Note, taskText: string): TaskMutationResult {
  const clean = taskText.trim();
  if (!clean) return { success: false, error: 'Task text cannot be empty' };

  if (note.type === 'checklist' && note.checklist) {
    const newItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      completed: false,
    };
    return {
      success: true,
      updatedNote: {
        ...note,
        checklist: [...note.checklist, newItem],
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const content = note.content || '';
  const taskLine = `- [ ] ${clean}`;
  let updatedContent = '';
  if (!content.trim()) {
    updatedContent = taskLine;
  } else if (content.endsWith('\n')) {
    updatedContent = `${content}${taskLine}\n`;
  } else {
    updatedContent = `${content}\n${taskLine}\n`;
  }

  return {
    success: true,
    updatedContent,
    updatedNote: {
      ...note,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Deletes a task line from a note
 */
export function deleteTaskFromNote(note: Note, task: PKMTask): TaskMutationResult {
  if (note.type === 'checklist' && note.checklist) {
    const updatedChecklist = note.checklist.filter(
      (item) => item.text !== task.text && item.id !== task.id
    );
    return {
      success: true,
      updatedNote: {
        ...note,
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const content = note.content || '';
  const lines = content.split('\n');
  const lineIdx = findTaskLineIndex(lines, task);

  if (lineIdx === -1) {
    return { success: false, error: 'Could not locate task line in note.' };
  }

  lines.splice(lineIdx, 1);
  const updatedContent = lines.join('\n');
  return {
    success: true,
    updatedContent,
    updatedNote: {
      ...note,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    },
  };
}

