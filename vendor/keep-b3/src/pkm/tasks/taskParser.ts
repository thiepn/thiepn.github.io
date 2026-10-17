import { Note } from '../../types';
import { PKMTask } from './taskTypes';
import { identifyMaskedRegions } from '../masking';
import { parseFrontmatterAST } from '../properties/frontmatterEngine';

/**
 * Generates a stable hash for task identifier
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Safely extracts all tasks from a note's Markdown content and native checklist
 */
export function extractTasksFromNote(note: Note): PKMTask[] {
  if (!note || note.trashed) return [];

  const tasks: PKMTask[] = [];
  const content = note.content || '';
  const lines = content.split('\n');

  // Parse frontmatter metadata if present
  const { ast } = parseFrontmatterAST(content);
  const frontmatter = ast.properties;
  const noteDate = typeof frontmatter.due === 'string'
    ? frontmatter.due
    : typeof frontmatter.date === 'string'
    ? frontmatter.date
    : undefined;

  // Mask code blocks and math blocks to prevent false positive task matching inside code
  const { regions: maskedRegions } = identifyMaskedRegions(content);

  // Helper to check if an offset falls inside a masked code/math block
  function isOffsetMasked(offset: number): boolean {
    return Array.isArray(maskedRegions) && maskedRegions.some((r) => offset >= r.start && offset < r.end);
  }

  let currentHeading = '';
  let charOffsetAccumulator = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineStartOffset = charOffsetAccumulator;
    charOffsetAccumulator += line.length + 1; // +1 for newline

    // Check if line is within a masked code block
    if (isOffsetMasked(lineStartOffset)) {
      continue;
    }

    // Track active parent heading
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      continue;
    }

    // Task regex: allows optional whitespace indent, bullet (-, *, +), space, [x] or [ ], space, text
    const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const indentStr = taskMatch[1] || '';
      const bullet = taskMatch[2] as '-' | '*' | '+';
      const mark = taskMatch[3];
      const rawText = taskMatch[4] || '';

      const completed = mark.toLowerCase() === 'x';
      const indentLevel = indentStr.replace(/\t/g, '  ').length;

      // Extract trailing block ID: ^block-id
      let taskText = rawText;
      let blockId: string | undefined;
      const blockIdMatch = rawText.match(/\^([a-zA-Z0-9_-]+)$/);
      if (blockIdMatch) {
        blockId = blockIdMatch[1];
        taskText = rawText.slice(0, blockIdMatch.index).trim();
      }

      // Extract inline due date: @due(YYYY-MM-DD) or due:YYYY-MM-DD or 📅 YYYY-MM-DD
      const dueMatch = taskText.match(/@due\((\d{4}-\d{2}-\d{2})\)|due:(\d{4}-\d{2}-\d{2})|📅\s*(\d{4}-\d{2}-\d{2})/i);
      const dueDate = dueMatch ? (dueMatch[1] || dueMatch[2] || dueMatch[3]) : noteDate;

      // Extract inline priority: !urgent, !high, !medium, !med, !low
      const priorityMatch = taskText.match(/!(urgent|high|medium|med|low)\b/i);
      let inlinePriority: Note['priority'] = undefined;
      if (priorityMatch) {
        const rawP = priorityMatch[1].toLowerCase();
        inlinePriority = rawP === 'med' ? 'medium' : (rawP as Note['priority']);
      }
      const taskPriority = inlinePriority || note.priority;

      // Extract inline hashtags in task text
      const inlineTags: string[] = [];
      const tagMatches = taskText.matchAll(/#([a-zA-Z0-9_/-]+)/g);
      for (const tm of tagMatches) {
        if (tm[1] && !inlineTags.includes(tm[1])) {
          inlineTags.push(tm[1]);
        }
      }
      const combinedTags = Array.from(new Set([...(note.tags || []), ...inlineTags]));

      // Generate stable task ID: task-<noteId>-<line>-<textHash>
      const textHash = hashString(taskText);
      const taskId = `task-${note.id}-${lineIndex}-${textHash}`;

      tasks.push({
        id: taskId,
        noteId: note.id,
        noteTitle: note.title || 'Untitled Note',
        folderId: note.folderId,
        tags: combinedTags,
        text: taskText,
        completed,
        line: lineIndex,
        rawLine: line,
        charOffset: lineStartOffset,
        bulletType: bullet,
        parentHeading: currentHeading || undefined,
        blockId,
        indentLevel,
        notePriority: note.priority,
        noteStatus: note.status,
        noteDate,
        dueDate,
        priority: taskPriority,
        updatedAt: note.updatedAt,
      });
    }
  }

  // If note type is 'checklist' and has native checklist items, include any that weren't represented
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    // If no markdown checkboxes were found, convert checklist items into PKMTasks
    if (tasks.length === 0) {
      note.checklist.forEach((item, idx) => {
        tasks.push({
          id: `checklist-${note.id}-${item.id || idx}`,
          noteId: note.id,
          noteTitle: note.title || 'Untitled Note',
          folderId: note.folderId,
          tags: note.tags || [],
          text: item.text,
          completed: Boolean(item.completed),
          line: idx,
          rawLine: `- [${item.completed ? 'x' : ' '}] ${item.text}`,
          charOffset: 0,
          bulletType: '-',
          indentLevel: 0,
          notePriority: note.priority,
          noteStatus: note.status,
          noteDate,
          updatedAt: note.updatedAt,
        });
      });
    }
  }

  return tasks;
}
