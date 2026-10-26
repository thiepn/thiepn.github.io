import JSZip from 'jszip';
import { Note, Folder } from '../types';
import { parseMarkdownFile } from './importer';

/**
 * Converts a Note to a Markdown formatted string with YAML frontmatter
 */
export function exportNoteToMarkdown(note: Note, folders: Folder[]): string {
  const folder = folders.find((f) => f.id === note.folderId);
  const folderName = folder ? folder.name : '';

  let frontmatter = '---\n';
  frontmatter += `title: "${note.title.replace(/"/g, '\\"')}"\n`;
  frontmatter += `created: ${note.createdAt}\n`;
  frontmatter += `updated: ${note.updatedAt}\n`;
  if (note.color && note.color !== 'default') {
    frontmatter += `color: ${note.color}\n`;
  }
  if (folderName) {
    frontmatter += `folder: "${folderName}"\n`;
  }
  if (note.tags && note.tags.length > 0) {
    frontmatter += `tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]\n`;
  }
  if (note.pinned) {
    frontmatter += `pinned: true\n`;
  }
  if (note.archived) {
    frontmatter += `archived: true\n`;
  }
  if (note.reminderDate) {
    frontmatter += `reminder: ${note.reminderDate}\n`;
  }
  frontmatter += '---\n\n';

  let body = '';

  // Checklist items
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    const listMarkdown = note.checklist
      .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');
    body = listMarkdown;
    if (note.content && note.content.trim()) {
      body = `${note.content}\n\n${listMarkdown}`;
    }
  } else {
    body = note.content || '';
  }

  return frontmatter + body;
}

/**
 * Sanitizes a title for safe filesystem filenames
 */
export function sanitizeFileName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return clean.length > 0 ? clean.slice(0, 100) : 'Untitled_Note';
}

/**
 * Generates and downloads a ZIP of all notes as Markdown files
 */
export async function downloadMarkdownZip(
  notes: Note[],
  folders: Folder[],
  options: { groupByFolder?: boolean } = { groupByFolder: true }
): Promise<void> {
  const zip = new JSZip();
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const usedFileNames = new Set<string>();

  for (const note of notes) {
    if (note.trashed) continue;

    const baseName = sanitizeFileName(note.title || 'Untitled Note');
    let fileName = `${baseName}.md`;
    let counter = 1;
    while (usedFileNames.has(fileName.toLowerCase())) {
      fileName = `${baseName}_(${counter}).md`;
      counter++;
    }
    usedFileNames.add(fileName.toLowerCase());

    const mdContent = exportNoteToMarkdown(note, folders);

    if (options.groupByFolder && note.folderId && folderMap.has(note.folderId)) {
      const folderName = sanitizeFileName(folderMap.get(note.folderId)!);
      zip.folder(folderName)?.file(fileName, mdContent);
    } else {
      zip.file(fileName, mdContent);
    }

    // Save attached images if any
    if (note.images && note.images.length > 0) {
      const assetsFolder = zip.folder('assets');
      for (const img of note.images) {
        if (img.dataUrl && img.dataUrl.startsWith('data:')) {
          const parts = img.dataUrl.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
          const ext = mime.split('/')[1] || 'png';
          const imgFileName = `${sanitizeFileName(img.name || note.title)}_${img.id}.${ext}`;
          assetsFolder?.file(imgFileName, parts[1], { base64: true });
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KeepNotes_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single note as a .md file
 */
export function downloadSingleNote(note: Note, folders: Folder[]): void {
  const mdContent = exportNoteToMarkdown(note, folders);
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(note.title || 'Note')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single note as a formatted standalone HTML page
 */
export function downloadNoteAsHTML(note: Note): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${note.title || 'Untitled Note'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; background: #fafafa; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .tag { display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; }
    .content { white-space: pre-wrap; font-size: 15px; }
    .checklist-item { margin: 6px 0; display: flex; align-items: center; gap: 8px; }
    .done { text-decoration: line-through; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>${note.title || 'Untitled Note'}</h1>
  <div class="meta">
    <span>Created: ${new Date(note.createdAt).toLocaleString()}</span>
    ${note.tags.length > 0 ? `• Tags: ${note.tags.map((t) => `<span class="tag">#${t}</span>`).join(' ')}` : ''}
  </div>
  ${
    note.type === 'checklist'
      ? `<div class="checklist">${note.checklist
          .map(
            (c) =>
              `<div class="checklist-item ${c.completed ? 'done' : ''}"><input type="checkbox" ${
                c.completed ? 'checked' : ''
              } disabled /> <span>${c.text}</span></div>`
          )
          .join('')}</div>`
      : `<div class="content">${note.content}</div>`
  }
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(note.title || 'Note')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single note as plain text
 */
export function downloadNoteAsPlainText(note: Note): void {
  let text = `${note.title}\n${'='.repeat(note.title.length)}\n\n`;
  if (note.type === 'checklist') {
    text += note.checklist.map((c) => `[${c.completed ? 'X' : ' '}] ${c.text}`).join('\n');
  } else {
    text += note.content;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(note.title || 'Note')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Bidirectional Sync with Local Directory (using Web File System Access API)
 */
export interface LocalSyncReport {
  importedCount: number;
  exportedCount: number;
  updatedNotes: Note[];
  errors: string[];
}

export async function pickLocalDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    throw new Error('Your browser does not support the File System Access API (use Chrome, Edge, or Opera)');
  }
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });
    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

export async function syncNotesWithDirectory(
  dirHandle: FileSystemDirectoryHandle,
  existingNotes: Note[],
  folders: Folder[]
): Promise<LocalSyncReport> {
  const report: LocalSyncReport = {
    importedCount: 0,
    exportedCount: 0,
    updatedNotes: [...existingNotes],
    errors: [],
  };

  try {
    // 1. Read existing .md files in the directory
    const dirFilesMap = new Map<string, { file: File; text: string }>();

    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (handle.kind === 'file' && (name.endsWith('.md') || name.endsWith('.txt'))) {
        try {
          const file = await handle.getFile();
          const text = await file.text();
          dirFilesMap.set(name.toLowerCase(), { file, text });
        } catch (err: any) {
          report.errors.push(`Could not read ${name}: ${err.message}`);
        }
      }
    }

    // 2. Check each local file to see if it's new or modified externally
    for (const [filename, { file, text }] of dirFilesMap.entries()) {
      const parsed = parseMarkdownFile(text, filename);
      const matchedIdx = report.updatedNotes.findIndex(
        (n) =>
          sanitizeFileName(n.title).toLowerCase() === filename.replace(/\.(md|txt)$/i, '').toLowerCase() ||
          n.title.toLowerCase() === parsed.title.toLowerCase()
      );

      if (matchedIdx >= 0) {
        const existing = report.updatedNotes[matchedIdx];
        const fileLastMod = new Date(file.lastModified).toISOString();

        // If local disk file was edited more recently than app note, update app note
        if (new Date(fileLastMod).getTime() > new Date(existing.updatedAt).getTime() + 1000) {
          report.updatedNotes[matchedIdx] = {
            ...existing,
            title: parsed.title,
            content: parsed.content,
            checklist: parsed.checklist.length > 0 ? parsed.checklist : existing.checklist,
            type: parsed.type,
            tags: Array.from(new Set([...existing.tags, ...parsed.tags])),
            updatedAt: fileLastMod,
          };
          report.importedCount++;
        }
      } else {
        // New note from local folder!
        report.updatedNotes.push(parsed);
        report.importedCount++;
      }
    }

    // 3. Write all active app notes back to directory
    for (const note of report.updatedNotes) {
      if (note.trashed) continue;

      const fileName = `${sanitizeFileName(note.title || 'Untitled Note')}.md`;
      const mdContent = exportNoteToMarkdown(note, folders);

      try {
        const fileHandle = await (dirHandle as any).getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(mdContent);
        await writable.close();
        report.exportedCount++;
      } catch (err: any) {
        report.errors.push(`Failed to write ${fileName}: ${err.message}`);
      }
    }
  } catch (err: any) {
    report.errors.push(`Directory sync error: ${err.message || String(err)}`);
  }

  return report;
}
