import { NoteTemplate, Note, ChecklistItem, NoteColorKey, NoteType } from '../../types';
import { PREBUILT_TEMPLATES } from '../../data/templates';

export interface TemplateVariableInfo {
  key: string;
  label: string;
  description: string;
  sample: string;
}

export const SUPPORTED_TEMPLATE_VARIABLES: TemplateVariableInfo[] = [
  {
    key: 'date',
    label: 'Date',
    description: 'Current date (YYYY-MM-DD)',
    sample: new Date().toISOString().slice(0, 10),
  },
  {
    key: 'time',
    label: 'Time',
    description: 'Current 24-hr time (HH:MM)',
    sample: new Date().toTimeString().slice(0, 5),
  },
  {
    key: 'datetime',
    label: 'Date & Time',
    description: 'Full localized date and time',
    sample: new Date().toLocaleString(),
  },
  {
    key: 'weekday',
    label: 'Weekday',
    description: 'Full day of week name',
    sample: new Date().toLocaleDateString(undefined, { weekday: 'long' }),
  },
  {
    key: 'month',
    label: 'Month',
    description: 'Current month name',
    sample: new Date().toLocaleDateString(undefined, { month: 'long' }),
  },
  {
    key: 'year',
    label: 'Year',
    description: 'Current 4-digit year',
    sample: String(new Date().getFullYear()),
  },
  {
    key: 'title',
    label: 'Note Title',
    description: 'Title of the newly created note',
    sample: 'Project Sprint Kickoff',
  },
  {
    key: 'author',
    label: 'Author',
    description: 'Author / Creator identifier',
    sample: 'Me',
  },
];

/**
 * Render a template by interpolating all dynamic variables {{variable}}.
 */
export function renderTemplateContent(
  templateText: string,
  context: { title?: string; author?: string; customVars?: Record<string, string> } = {}
): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  const datetimeStr = now.toLocaleString();
  const weekdayStr = now.toLocaleDateString(undefined, { weekday: 'long' });
  const monthStr = now.toLocaleDateString(undefined, { month: 'long' });
  const yearStr = String(now.getFullYear());

  const replacements: Record<string, string> = {
    date: dateStr,
    time: timeStr,
    datetime: datetimeStr,
    weekday: weekdayStr,
    month: monthStr,
    year: yearStr,
    title: context.title || 'Untitled',
    author: context.author || 'User',
    ...(context.customVars || {}),
  };

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    const key = varName.toLowerCase();
    if (key in replacements) {
      return replacements[key];
    }
    return match;
  });
}

/**
 * Automatically parameterizes specific dates, times, weekdays, and title in note text
 * by turning them into reusable {{date}}, {{time}}, {{weekday}}, {{title}} variables.
 */
export function parameterizeNoteText(text: string, currentTitle?: string): string {
  let result = text;

  // 1. If note title is provided and appears in text, replace with {{title}}
  if (currentTitle && currentTitle.trim().length > 3) {
    const escaped = currentTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '{{title}}');
  }

  // 2. ISO dates: 2024-10-03, 2026-09-30
  result = result.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{{date}}');

  // 3. Formatted dates: October 3, 2026, 3 Oct 2026
  result = result.replace(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    '{{date}}'
  );

  // 4. US/EU slashed dates: 10/03/2026 or 03/10/2026
  result = result.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '{{date}}');

  // 5. Weekdays if preceded or followed by punctuation/spaces
  result = result.replace(
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    '{{weekday}}'
  );

  // 6. Time formats: 14:30 or 2:30 PM
  result = result.replace(
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
    '{{time}}'
  );

  return result;
}

/**
 * Extracts pure structural scaffolding from markdown content:
 * Preserves headers (#, ##, ###), horizontal rules (---), tables (|...|),
 * list outlines, callouts, and clean checklists (- [ ]).
 * Replaces dense body paragraphs with clean template guidance.
 */
export function extractStructureFromMarkdown(content: string): string {
  if (!content.trim()) return '';

  const lines = content.split(/\r?\n/);
  const outputLines: string[] = [];
  let inCodeBlock = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block fences
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      outputLines.push(rawLine);
      continue;
    }
    if (inCodeBlock) {
      outputLines.push(rawLine);
      continue;
    }

    // Markdown Headings: always preserve
    if (/^#{1,6}\s+/.test(trimmed)) {
      outputLines.push(rawLine);
      inTable = false;
      continue;
    }

    // Horizontal Rules
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      outputLines.push(rawLine);
      inTable = false;
      continue;
    }

    // Callout / Blockquote
    if (trimmed.startsWith('>')) {
      outputLines.push(rawLine);
      inTable = false;
      continue;
    }

    // Markdown Table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      outputLines.push(rawLine);
      continue;
    } else {
      inTable = false;
    }

    // Checklist item: uncheck it and preserve
    if (/^[-*+]\s+\[[ xX]\]\s*(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^([-*+]\s+)\[[ xX]\]\s*(.*)$/);
      if (match) {
        outputLines.push(`${match[1]}[ ] ${match[2]}`);
      }
      continue;
    }

    // Bullet list or numbered list: preserve structure
    if (/^([-*+]|\d+\.)\s+/.test(trimmed)) {
      outputLines.push(rawLine);
      continue;
    }

    // Empty lines: keep spacing clean
    if (trimmed === '') {
      if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
        outputLines.push('');
      }
      continue;
    }

    // Dense prose paragraph: replace with a clean section prompt
    // only if the preceding line was a heading or separator
    const prevLine = outputLines.length > 0 ? outputLines[outputLines.length - 1] : '';
    if (/^#{1,6}\s+/.test(prevLine.trim())) {
      outputLines.push('');
      outputLines.push('- ');
    }
  }

  return outputLines.join('\n').trim();
}

/**
 * Resets all checklist items so none are marked completed.
 */
export function cleanChecklistItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({
    ...item,
    completed: false,
  }));
}

/**
 * Extract complete structure from any Note into a template draft.
 */
export function extractStructureFromNote(note: Note): {
  title: string;
  description: string;
  category: string;
  content: string;
  type: NoteType;
  checklist: ChecklistItem[];
  color: NoteColorKey;
  tags: string[];
} {
  const isChecklist = note.type === 'checklist';
  const cleanTitle = parameterizeNoteText(note.title || 'Note Template');
  const cleanContent = isChecklist
    ? ''
    : extractStructureFromMarkdown(parameterizeNoteText(note.content || '', note.title));
  const cleanChecklist = isChecklist
    ? cleanChecklistItems(note.checklist || [])
    : [];

  return {
    title: cleanTitle ? `${cleanTitle} Template` : 'Reusable Note Template',
    description: `Template created from note "${note.title || 'Untitled'}"`,
    category: 'Work',
    content: cleanContent,
    type: note.type,
    checklist: cleanChecklist,
    color: note.color || 'default',
    tags: note.tags && note.tags.length > 0 ? [...note.tags] : ['template'],
  };
}

// -------------------------------------------------------------
// LOCAL STORAGE & EVENT MANAGEMENT FOR CUSTOM TEMPLATES
// -------------------------------------------------------------

const STORAGE_KEY = 'keepnotes_custom_templates';

export function getCustomTemplates(): NoteTemplate[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load custom templates from localStorage', err);
    return [];
  }
}

export function getAllTemplates(): NoteTemplate[] {
  const custom = getCustomTemplates();
  return [...custom, ...PREBUILT_TEMPLATES];
}

export function saveCustomTemplate(template: NoteTemplate): NoteTemplate[] {
  const current = getCustomTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);

  let updated: NoteTemplate[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...template, isCustom: true };
  } else {
    updated = [{ ...template, isCustom: true }, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keepnotes_templates_updated', { detail: updated }));
    }
  } catch (err) {
    console.error('Failed to persist custom template', err);
  }

  return updated;
}

export function deleteCustomTemplate(id: string): NoteTemplate[] {
  const current = getCustomTemplates();
  const updated = current.filter((t) => t.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keepnotes_templates_updated', { detail: updated }));
    }
  } catch (err) {
    console.error('Failed to delete custom template', err);
  }

  return updated;
}
