import { Note, Folder } from '../types';

/**
 * Escapes special regex characters in string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes a tag string by stripping leading # and trimming whitespace
 */
export function normalizeTag(tag: string): string {
  return (tag || '').trim().replace(/^#+/, '').trim();
}

/**
 * Replaces exact hashtag occurrences in markdown/plain text with a new tag name.
 * Respects word and hashtag boundaries so '#react' does not match '#reaction' or '#123'.
 */
export function replaceTagInText(text: string, oldTag: string, newTag: string): string {
  if (!text || typeof text !== 'string') return text || '';
  const cleanOld = normalizeTag(oldTag);
  const cleanNew = normalizeTag(newTag);
  if (!cleanOld || !cleanNew || cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
    return text;
  }

  // Match #oldTag with boundary: preceded by start of line, whitespace, or opening punctuation,
  // and followed by end of line, whitespace, or punctuation
  const pattern = new RegExp(
    '(^|[\\s(\\[{<>]|(?<=[^\\w]))#' + escapeRegExp(cleanOld) + '(?=$|[\\s)\\]}>.,;:!?]|$)',
    'gi'
  );

  return text.replace(pattern, (_match, prefix) => `${prefix}#${cleanNew}`);
}

/**
 * Removes exact hashtag occurrences from text
 */
export function removeTagFromText(text: string, tagToRemove: string): string {
  if (!text || typeof text !== 'string') return text || '';
  const clean = normalizeTag(tagToRemove);
  if (!clean) return text;

  const pattern = new RegExp(
    '(^|[\\s(\\[{<>]|(?<=[^\\w]))#' + escapeRegExp(clean) + '(?=$|[\\s)\\]}>.,;:!?]|$)',
    'gi'
  );

  // Remove the tag and clean up any double spaces left behind
  return text.replace(pattern, (_match, prefix) => {
    // Keep prefix if it was a newline or punctuation, collapse spaces
    return prefix === ' ' ? ' ' : prefix;
  }).replace(/[ \t]{2,}/g, ' ');
}

/**
 * Renames a tag across a collection of notes
 */
export function renameTagAcrossNotes(
  notes: Note[],
  oldTag: string,
  newTag: string,
  updateContent: boolean = true
): { updatedNotes: Note[]; changedCount: number } {
  const cleanOld = normalizeTag(oldTag).toLowerCase();
  const cleanNew = normalizeTag(newTag);

  if (!cleanOld || !cleanNew) {
    return { updatedNotes: notes, changedCount: 0 };
  }

  let changedCount = 0;
  const now = new Date().toISOString();

  const updatedNotes = notes.map((note) => {
    let noteModified = false;
    const currentTags = note.tags || [];

    // 1. Update note.tags array
    const hasOldTag = currentTags.some((t) => normalizeTag(t).toLowerCase() === cleanOld);
    let newTags = [...currentTags];

    if (hasOldTag) {
      // Replace with cleanNew and deduplicate
      const mapped = currentTags.map((t) => {
        if (normalizeTag(t).toLowerCase() === cleanOld) {
          return cleanNew;
        }
        return t;
      });
      // Deduplicate tags case-insensitively
      const seen = new Set<string>();
      newTags = [];
      for (const t of mapped) {
        const norm = normalizeTag(t).toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          newTags.push(t);
        }
      }
      noteModified = true;
    }

    let updatedContent = note.content;
    let updatedTitle = note.title;
    let updatedChecklist = note.checklist;

    // 2. Optionally update content, title, and checklist items
    if (updateContent) {
      if (updatedContent && updatedContent.toLowerCase().includes(`#${cleanOld}`)) {
        const replaced = replaceTagInText(updatedContent, cleanOld, cleanNew);
        if (replaced !== updatedContent) {
          updatedContent = replaced;
          noteModified = true;
        }
      }

      if (updatedTitle && updatedTitle.toLowerCase().includes(`#${cleanOld}`)) {
        const replaced = replaceTagInText(updatedTitle, cleanOld, cleanNew);
        if (replaced !== updatedTitle) {
          updatedTitle = replaced;
          noteModified = true;
        }
      }

      if (updatedChecklist && updatedChecklist.length > 0) {
        let checklistChanged = false;
        const newChecklist = updatedChecklist.map((item) => {
          if (item.text && item.text.toLowerCase().includes(`#${cleanOld}`)) {
            const replaced = replaceTagInText(item.text, cleanOld, cleanNew);
            if (replaced !== item.text) {
              checklistChanged = true;
              return { ...item, text: replaced };
            }
          }
          return item;
        });

        if (checklistChanged) {
          updatedChecklist = newChecklist;
          noteModified = true;
        }
      }
    }

    if (noteModified) {
      changedCount++;
      return {
        ...note,
        tags: newTags,
        content: updatedContent,
        title: updatedTitle,
        checklist: updatedChecklist,
        updatedAt: now,
      };
    }

    return note;
  });

  return { updatedNotes, changedCount };
}

/**
 * Deletes a tag across all notes
 */
export function deleteTagAcrossNotes(
  notes: Note[],
  tagToDelete: string,
  removeFromContent: boolean = false
): { updatedNotes: Note[]; changedCount: number } {
  const cleanTag = normalizeTag(tagToDelete).toLowerCase();
  if (!cleanTag) {
    return { updatedNotes: notes, changedCount: 0 };
  }

  let changedCount = 0;
  const now = new Date().toISOString();

  const updatedNotes = notes.map((note) => {
    let noteModified = false;
    const currentTags = note.tags || [];

    const hasTag = currentTags.some((t) => normalizeTag(t).toLowerCase() === cleanTag);
    let newTags = currentTags;

    if (hasTag) {
      newTags = currentTags.filter((t) => normalizeTag(t).toLowerCase() !== cleanTag);
      noteModified = true;
    }

    let updatedContent = note.content;
    let updatedTitle = note.title;
    let updatedChecklist = note.checklist;

    if (removeFromContent) {
      if (updatedContent && updatedContent.toLowerCase().includes(`#${cleanTag}`)) {
        const cleaned = removeTagFromText(updatedContent, cleanTag);
        if (cleaned !== updatedContent) {
          updatedContent = cleaned;
          noteModified = true;
        }
      }

      if (updatedTitle && updatedTitle.toLowerCase().includes(`#${cleanTag}`)) {
        const cleaned = removeTagFromText(updatedTitle, cleanTag);
        if (cleaned !== updatedTitle) {
          updatedTitle = cleaned;
          noteModified = true;
        }
      }

      if (updatedChecklist && updatedChecklist.length > 0) {
        let checklistChanged = false;
        const newChecklist = updatedChecklist.map((item) => {
          if (item.text && item.text.toLowerCase().includes(`#${cleanTag}`)) {
            const cleaned = removeTagFromText(item.text, cleanTag);
            if (cleaned !== item.text) {
              checklistChanged = true;
              return { ...item, text: cleaned };
            }
          }
          return item;
        });

        if (checklistChanged) {
          updatedChecklist = newChecklist;
          noteModified = true;
        }
      }
    }

    if (noteModified) {
      changedCount++;
      return {
        ...note,
        tags: newTags,
        content: updatedContent,
        title: updatedTitle,
        checklist: updatedChecklist,
        updatedAt: now,
      };
    }

    return note;
  });

  return { updatedNotes, changedCount };
}

/**
 * Batch merges multiple tags into a target tag
 */
export function batchMergeTagsAcrossNotes(
  notes: Note[],
  sourceTags: string[],
  targetTag: string,
  updateContent: boolean = true
): { updatedNotes: Note[]; changedCount: number } {
  let currentNotes = notes;
  let totalChanged = 0;
  const changedNoteIds = new Set<string>();

  for (const src of sourceTags) {
    if (normalizeTag(src).toLowerCase() === normalizeTag(targetTag).toLowerCase()) {
      continue;
    }
    const result = renameTagAcrossNotes(currentNotes, src, targetTag, updateContent);
    currentNotes = result.updatedNotes;
    // Track unique notes changed
    currentNotes.forEach((n, idx) => {
      if (notes[idx] !== n) {
        changedNoteIds.add(n.id);
      }
    });
  }

  return { updatedNotes: currentNotes, changedCount: changedNoteIds.size };
}

/**
 * Batch deletes multiple tags across notes
 */
export function batchDeleteTagsAcrossNotes(
  notes: Note[],
  tagsToDelete: string[],
  removeFromContent: boolean = false
): { updatedNotes: Note[]; changedCount: number } {
  let currentNotes = notes;
  const changedNoteIds = new Set<string>();

  for (const tag of tagsToDelete) {
    const result = deleteTagAcrossNotes(currentNotes, tag, removeFromContent);
    currentNotes = result.updatedNotes;
    currentNotes.forEach((n, idx) => {
      if (notes[idx] !== n) {
        changedNoteIds.add(n.id);
      }
    });
  }

  return { updatedNotes: currentNotes, changedCount: changedNoteIds.size };
}

/**
 * Detects discrepancies across the tag library (e.g., case variations or trailing punctuation typos)
 */
export function detectTagDiscrepancies(notes: Note[]): {
  caseDiscrepancies: Array<{ canonical: string; variants: string[]; totalCount: number }>;
  punctuationTypos: Array<{ tag: string; suggested: string }>;
} {
  const tagMap = new Map<string, { originalForms: Map<string, number>; total: number }>();

  for (const note of notes) {
    if (note.trashed) continue;
    for (const tag of note.tags || []) {
      const raw = (tag || '').trim();
      if (!raw) continue;
      const lower = raw.toLowerCase();

      if (!tagMap.has(lower)) {
        tagMap.set(lower, { originalForms: new Map(), total: 0 });
      }
      const entry = tagMap.get(lower)!;
      entry.total++;
      entry.originalForms.set(raw, (entry.originalForms.get(raw) || 0) + 1);
    }
  }

  const caseDiscrepancies: Array<{ canonical: string; variants: string[]; totalCount: number }> = [];
  const punctuationTypos: Array<{ tag: string; suggested: string }> = [];

  for (const [lower, entry] of tagMap.entries()) {
    if (entry.originalForms.size > 1) {
      // Find most common form as canonical
      let canonical = lower;
      let maxCount = -1;
      const variants: string[] = [];
      for (const [form, count] of entry.originalForms.entries()) {
        variants.push(form);
        if (count > maxCount) {
          maxCount = count;
          canonical = form;
        }
      }
      caseDiscrepancies.push({
        canonical,
        variants,
        totalCount: entry.total,
      });
    }

    // Check for trailing punctuation or suspicious chars in tags
    for (const form of entry.originalForms.keys()) {
      if (/[.,;:!?/_-]+$/.test(form)) {
        const suggested = form.replace(/[.,;:!?/_-]+$/, '');
        if (suggested && suggested !== form) {
          punctuationTypos.push({ tag: form, suggested });
        }
      }
    }
  }

  return { caseDiscrepancies, punctuationTypos };
}
