import JSZip from 'jszip';
import { Note, NoteColorKey, ChecklistItem, NoteImage } from '../types';

export interface ImportResult {
  notes: Note[];
  foldersDetected: string[];
  tagsDetected: string[];
  totalParsed: number;
  errors: string[];
}

const GOOGLE_KEEP_COLOR_MAP: Record<string, NoteColorKey> = {
  DEFAULT: 'default',
  WHITE: 'default',
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green',
  TEAL: 'teal',
  BLUE: 'blue',
  CERULEAN: 'blue',
  PURPLE: 'purple',
  PINK: 'pink',
  BROWN: 'brown',
  GRAY: 'gray',
  DARK_GRAY: 'gray',
};

/**
 * Parses Google Keep JSON export format
 */
export function parseGoogleKeepJson(jsonString: string, filename: string): Note | null {
  try {
    const data = JSON.parse(jsonString);

    const title: string = data.title || filename.replace(/\.json$/i, '') || 'Untitled Note';
    const isChecklist = Array.isArray(data.listContent) && data.listContent.length > 0;
    const checklist: ChecklistItem[] = isChecklist
      ? data.listContent.map((item: { text?: string; isChecked?: boolean }, idx: number) => ({
          id: `chk-${Date.now()}-${idx}`,
          text: item.text || '',
          completed: Boolean(item.isChecked),
        }))
      : [];

    const content: string = data.textContent || (isChecklist ? '' : '');

    // Color
    const rawColor = String(data.color || 'DEFAULT').toUpperCase();
    const color: NoteColorKey = GOOGLE_KEEP_COLOR_MAP[rawColor] || 'default';

    // Tags / Labels
    const tags: string[] = [];
    if (Array.isArray(data.labels)) {
      for (const label of data.labels) {
        if (label && label.name) {
          tags.push(label.name.trim().toLowerCase());
        }
      }
    }

    // Timestamps (microseconds to ISO)
    const createdAt = data.createdTimestampUsec
      ? new Date(Math.floor(data.createdTimestampUsec / 1000)).toISOString()
      : new Date().toISOString();

    const updatedAt = data.userEditedTimestampUsec
      ? new Date(Math.floor(data.userEditedTimestampUsec / 1000)).toISOString()
      : createdAt;

    return {
      id: `imported-keep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      content,
      type: isChecklist ? 'checklist' : 'text',
      checklist,
      color,
      tags,
      folderId: null,
      pinned: Boolean(data.isPinned),
      archived: Boolean(data.isArchived),
      trashed: Boolean(data.isTrashed),
      createdAt,
      updatedAt,
      reminderDate: null,
      images: [],
    };
  } catch (err) {
    console.error('Error parsing Keep JSON file:', filename, err);
    return null;
  }
}

/**
 * Parses Markdown (.md) or Text (.txt) with optional YAML frontmatter
 */
export function parseMarkdownFile(fileText: string, filename: string): Note {
  let title = filename.replace(/\.(md|markdown|txt)$/i, '');
  let content = fileText;
  let tags: string[] = [];
  let color: NoteColorKey = 'default';
  let folderName: string | null = null;
  let createdAt = new Date().toISOString();
  let updatedAt = createdAt;
  let pinned = false;
  let archived = false;

  // Check for YAML frontmatter (--- ... ---)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = frontmatterRegex.exec(fileText);

  if (match) {
    const rawYaml = match[1];
    content = fileText.slice(match[0].length);

    const lines = rawYaml.split('\n');
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();

        if (key === 'title') {
          title = value.replace(/^["']|["']$/g, '');
        } else if (key === 'tags' || key === 'labels') {
          const rawTags = value.replace(/[[\]"']/g, '').split(',');
          tags = rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean);
        } else if (key === 'color') {
          const c = value.toLowerCase() as NoteColorKey;
          if (GOOGLE_KEEP_COLOR_MAP[c.toUpperCase()] || c in GOOGLE_KEEP_COLOR_MAP) {
            color = c;
          }
        } else if (key === 'folder') {
          folderName = value.replace(/^["']|["']$/g, '');
        } else if (key === 'created' || key === 'createdat') {
          const parsedDate = new Date(value);
          if (!isNaN(parsedDate.getTime())) createdAt = parsedDate.toISOString();
        } else if (key === 'updated' || key === 'updatedat') {
          const parsedDate = new Date(value);
          if (!isNaN(parsedDate.getTime())) updatedAt = parsedDate.toISOString();
        } else if (key === 'pinned') {
          pinned = value.toLowerCase() === 'true';
        } else if (key === 'archived') {
          archived = value.toLowerCase() === 'true';
        }
      }
    }
  } else {
    // If first line is a Markdown header # Title, use it as title
    const firstLineMatch = /^#\s+(.+)$/m.exec(fileText);
    if (firstLineMatch) {
      title = firstLineMatch[1].trim();
    }
  }

  // Parse markdown checklists `- [ ] task` or `- [x] task`
  const checklistLines = content.split('\n');
  const checklistItems: ChecklistItem[] = [];
  let isChecklistOnly = true;

  for (const line of checklistLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
      checklistItems.push({
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed.slice(6),
        completed: false,
      });
    } else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('* [x] ') || trimmed.startsWith('- [X] ')) {
      checklistItems.push({
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed.slice(6),
        completed: true,
      });
    } else if (trimmed.length > 0) {
      isChecklistOnly = false;
    }
  }

  const isChecklistType = checklistItems.length > 0 && isChecklistOnly;

  return {
    id: `imported-md-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || 'Untitled Note',
    content: isChecklistType ? '' : content,
    type: isChecklistType ? 'checklist' : 'text',
    checklist: checklistItems,
    color,
    tags,
    folderId: null, // will be mapped by importer if folderName exists
    pinned,
    archived,
    trashed: false,
    createdAt,
    updatedAt,
    reminderDate: null,
    images: [],
  };
}

/**
 * Handles batch file ingestion (files from Drag & Drop or input picker)
 */
export async function importFiles(files: FileList | File[]): Promise<ImportResult> {
  const result: ImportResult = {
    notes: [],
    foldersDetected: [],
    tagsDetected: [],
    totalParsed: 0,
    errors: [],
  };

  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const name = file.name.toLowerCase();

    // 1. Google Takeout ZIP Archive
    if (name.endsWith('.zip')) {
      try {
        const zipResult = await importTakeoutZip(file);
        result.notes.push(...zipResult.notes);
        result.foldersDetected.push(...zipResult.foldersDetected);
        result.tagsDetected.push(...zipResult.tagsDetected);
        result.totalParsed += zipResult.totalParsed;
        result.errors.push(...zipResult.errors);
      } catch (err: any) {
        result.errors.push(`Failed to read ZIP ${file.name}: ${err.message || String(err)}`);
      }
    }
    // 2. Google Keep JSON
    else if (name.endsWith('.json')) {
      try {
        const text = await file.text();
        const note = parseGoogleKeepJson(text, file.name);
        if (note) {
          result.notes.push(note);
          result.totalParsed++;
          note.tags.forEach((t) => {
            if (!result.tagsDetected.includes(t)) result.tagsDetected.push(t);
          });
        }
      } catch (err: any) {
        result.errors.push(`Error reading JSON ${file.name}: ${err.message}`);
      }
    }
    // 3. Markdown or Text file
    else if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
      try {
        const text = await file.text();
        const note = parseMarkdownFile(text, file.name);
        result.notes.push(note);
        result.totalParsed++;
        note.tags.forEach((t) => {
          if (!result.tagsDetected.includes(t)) result.tagsDetected.push(t);
        });
      } catch (err: any) {
        result.errors.push(`Error reading Markdown ${file.name}: ${err.message}`);
      }
    }
  }

  return result;
}

/**
 * Extracts a Google Takeout ZIP file containing Keep notes and attachments
 */
export async function importTakeoutZip(zipFile: File | Blob): Promise<ImportResult> {
  const result: ImportResult = {
    notes: [],
    foldersDetected: [],
    tagsDetected: [],
    totalParsed: 0,
    errors: [],
  };

  const zip = new JSZip();
  const unzipped = await zip.loadAsync(zipFile);

  // Store image files in map by filename
  const imageMap = new Map<string, string>();

  // First pass: locate image attachments
  for (const [relativePath, zipEntry] of Object.entries(unzipped.files)) {
    if (zipEntry.dir) continue;
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
      try {
        const blob = await zipEntry.async('blob');
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const simpleName = relativePath.split('/').pop() || relativePath;
        imageMap.set(simpleName.toLowerCase(), dataUrl);
      } catch (err) {
        console.warn('Failed to load image in zip:', relativePath, err);
      }
    }
  }

  // Second pass: parse Keep JSON and Markdown files
  for (const [relativePath, zipEntry] of Object.entries(unzipped.files)) {
    if (zipEntry.dir) continue;
    const lower = relativePath.toLowerCase();
    const fileName = relativePath.split('/').pop() || relativePath;

    if (lower.endsWith('.json')) {
      try {
        const text = await zipEntry.async('text');
        // Ignore Google Takeout archive metadata JSONs (like archive_browser.json)
        if (fileName.toLowerCase().includes('takeout') || fileName.toLowerCase().includes('manifest')) {
          continue;
        }

        const note = parseGoogleKeepJson(text, fileName);
        if (note) {
          // Attach corresponding images if found in zip
          const baseNameWithoutExt = fileName.replace(/\.json$/i, '').toLowerCase();
          for (const [imgName, dataUrl] of imageMap.entries()) {
            if (imgName.includes(baseNameWithoutExt)) {
              note.images.push({
                id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: imgName,
                dataUrl,
              });
            }
          }

          result.notes.push(note);
          result.totalParsed++;
          note.tags.forEach((t) => {
            if (!result.tagsDetected.includes(t)) result.tagsDetected.push(t);
          });
        }
      } catch (err: any) {
        result.errors.push(`Error reading ${relativePath}: ${err.message}`);
      }
    } else if (lower.endsWith('.md') || lower.endsWith('.txt')) {
      try {
        const text = await zipEntry.async('text');
        const note = parseMarkdownFile(text, fileName);
        result.notes.push(note);
        result.totalParsed++;
        note.tags.forEach((t) => {
          if (!result.tagsDetected.includes(t)) result.tagsDetected.push(t);
        });
      } catch (err: any) {
        result.errors.push(`Error reading Markdown ${relativePath}: ${err.message}`);
      }
    }
  }

  return result;
}
