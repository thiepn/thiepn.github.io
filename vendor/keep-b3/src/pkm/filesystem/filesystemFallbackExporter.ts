/**
 * Phase P45: Filesystem Fallback Snapshot Exporter & Importer
 * 
 * Provides structured ZIP backup and manual directory re-import for
 * platforms without native directory handle pickers (e.g. Firefox, Safari).
 */

import JSZip from 'jszip';
import { Note, Folder } from '../../types';
import { pathMappingService } from './pathMappingService';
import { serializeNoteToMarkdown, parseMarkdownToNote } from '../portableVaultSerializer';
import { manifestService } from './manifestService';
import { fileHasher } from './fileHasher';

/**
 * Generates and downloads a clean structured ZIP snapshot of the vault
 */
export async function exportVaultZipSnapshot(
  notes: Note[],
  folders: Folder[],
  vaultId = 'vault'
): Promise<void> {
  const zip = new JSZip();
  const folderMap = new Map<string, string>();
  for (const f of folders) {
    folderMap.set(f.id, f.name);
  }

  const activeNotes = notes.filter((n) => !n.trashed);
  const existingPaths = new Set<string>();
  const manifest = manifestService.createEmptyManifest(vaultId);

  for (const note of activeNotes) {
    const filePath = pathMappingService.getNoteFilePath(
      note,
      folders,
      'follow_title',
      existingPaths
    );
    existingPaths.add(filePath.toLowerCase());

    const mdContent = serializeNoteToMarkdown(note, folderMap);
    const hash = await fileHasher.hashText(mdContent);

    zip.file(filePath, mdContent);

    manifestService.updateRecord(manifest, {
      resourceId: note.id,
      resourceType: 'note',
      path: filePath,
      lastHash: hash,
      mtime: Date.now(),
      canonicalTitle: note.title,
      folderId: note.folderId,
    });
  }

  // Include .pkm-manifest.json at root
  zip.file('.pkm-manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vault-snapshot-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a structured ZIP archive containing Markdown notes
 */
export async function importFolderZipSnapshot(
  file: File,
  onSaveNote: (note: Note) => void
): Promise<{ importedCount: number }> {
  const zip = await JSZip.loadAsync(file);
  let importedCount = 0;

  const entries = Object.keys(zip.files);
  for (const path of entries) {
    const entry = zip.files[path];
    if (entry.dir || pathMappingService.isIgnoredPath(path)) continue;

    if (path.endsWith('.md') || path.endsWith('.markdown')) {
      const text = await entry.async('text');
      const parsed = parseMarkdownToNote(text, new Map());
      const segments = path.split('/');
      const fileName = segments[segments.length - 1];

      const note: Note = {
        id: parsed.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: parsed.title || pathMappingService.inferNoteTitle(fileName, text),
        content: parsed.content || '',
        type: 'text',
        checklist: [],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: parsed.tags || [],
        folderId: parsed.folderId || null,
      };

      onSaveNote(note);
      importedCount++;
    }
  }

  return { importedCount };
}
