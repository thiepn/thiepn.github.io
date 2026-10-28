/**
 * PKM V1.8: Dependency & Link Graph Resolver
 * Resolves local assets, citation references, and cross-note wikilinks strictly according to scope.
 */

import { Note, Folder } from '../../types';
import { ExportDependencyItem, ExportScopeConfig } from './exportTypes';
import { sanitizeFilename } from './filenameSanitizer';

export interface ResolvedExportScope {
  primaryNotes: Note[];
  noteIdSet: Set<string>;
  slugMap: Map<string, string>;          // noteId -> clean relative file path (e.g. "notes/Work/Project.md")
  dependencies: ExportDependencyItem[];
  missingAssetNames: string[];
  externalReferences: string[];          // Citation keys
}

/**
 * Resolves all notes and dependencies for a given export scope.
 */
export function resolveExportScope(
  allNotes: Note[],
  folders: Folder[],
  config: ExportScopeConfig
): ResolvedExportScope {
  const folderMap = new Map<string, string>(folders.map((f) => [f.id, f.name]));
  const primaryNotes: Note[] = [];
  const noteIdSet = new Set<string>();

  // 1. Resolve Notes based on Scope
  if (config.scopeType === 'current-note' || config.scopeType === 'selected-notes') {
    const targetSet = new Set(config.primaryNoteIds);
    for (const note of allNotes) {
      if (targetSet.has(note.id) && !note.trashed) {
        primaryNotes.push(note);
        noteIdSet.add(note.id);
      }
    }
  } else if (config.scopeType === 'folder') {
    for (const note of allNotes) {
      if (note.folderId === config.folderId && !note.trashed) {
        primaryNotes.push(note);
        noteIdSet.add(note.id);
      }
    }
  } else if (config.scopeType === 'full-vault') {
    for (const note of allNotes) {
      if (!note.trashed) {
        primaryNotes.push(note);
        noteIdSet.add(note.id);
      }
    }
  } else {
    // Default: use whatever primaryNoteIds were passed
    const targetSet = new Set(config.primaryNoteIds);
    for (const note of allNotes) {
      if (targetSet.has(note.id) && !note.trashed) {
        primaryNotes.push(note);
        noteIdSet.add(note.id);
      }
    }
  }

  // 2. Build Deterministic Slug / Path Map
  const slugMap = new Map<string, string>();
  const usedPaths = new Set<string>();

  for (const note of primaryNotes) {
    const folderName = note.folderId ? folderMap.get(note.folderId) : null;
    const cleanFolder = folderName ? sanitizeFilename(folderName) : null;
    const cleanTitle = sanitizeFilename(note.title || 'Untitled');

    let relPath = cleanFolder
      ? `notes/${cleanFolder}/${cleanTitle}.md`
      : `notes/${cleanTitle}.md`;

    let counter = 1;
    while (usedPaths.has(relPath.toLowerCase())) {
      const suffix = note.id.slice(0, 6) || String(counter);
      relPath = cleanFolder
        ? `notes/${cleanFolder}/${cleanTitle}_(${suffix}).md`
        : `notes/${cleanTitle}_(${suffix}).md`;
      counter++;
    }
    usedPaths.add(relPath.toLowerCase());
    slugMap.set(note.id, relPath);
  }

  // 3. Discover Dependencies & Attachments
  const dependencies: ExportDependencyItem[] = [];
  const missingAssetNames: string[] = [];
  const externalRefKeys = new Set<string>();

  for (const note of primaryNotes) {
    // Note Image attachments
    if (note.images && note.images.length > 0 && config.includeAttachments) {
      for (const img of note.images) {
        const cleanImgName = sanitizeFilename(img.name || 'image');
        const ext = cleanImgName.includes('.') ? '' : '.png';
        const targetPath = `assets/images/${note.id}_${img.id}_${cleanImgName}${ext}`;

        dependencies.push({
          id: img.id,
          name: img.name || 'image.png',
          type: 'image',
          targetPath,
          inScope: true,
          isPrivate: false,
          sizeBytes: img.size || (img.dataUrl ? img.dataUrl.length : 0),
        });
      }
    }

    // Embed references in markdown ![[asset.png]] or ![[audio.mp3]]
    const content = note.content || '';
    const embedRegex = /!\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = embedRegex.exec(content)) !== null) {
      const target = match[1].trim();
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(target)) {
        // Embedded image
        const cleanName = sanitizeFilename(target);
        dependencies.push({
          id: `embed-img-${cleanName}`,
          name: target,
          type: 'image',
          targetPath: `assets/images/${cleanName}`,
          inScope: true,
          isPrivate: false,
        });
      } else if (/\.(mp3|wav|m4a|ogg)$/i.test(target)) {
        // Embedded audio
        const cleanName = sanitizeFilename(target);
        dependencies.push({
          id: `embed-audio-${cleanName}`,
          name: target,
          type: 'audio',
          targetPath: `assets/audio/${cleanName}`,
          inScope: true,
          isPrivate: false,
        });
      } else if (/\.pdf$/i.test(target)) {
        // Embedded PDF
        const cleanName = sanitizeFilename(target);
        dependencies.push({
          id: `embed-pdf-${cleanName}`,
          name: target,
          type: 'pdf',
          targetPath: `assets/pdfs/${cleanName}`,
          inScope: true,
          isPrivate: false,
        });
      }
    }

    // Citation references [@citationKey]
    const citationRegex = /\[@([a-zA-Z0-9_:.-]+)\]/g;
    let citMatch: RegExpExecArray | null;
    while ((citMatch = citationRegex.exec(content)) !== null) {
      const key = citMatch[1].trim();
      if (key) {
        externalRefKeys.add(key);
      }
    }
  }

  return {
    primaryNotes,
    noteIdSet,
    slugMap,
    dependencies,
    missingAssetNames,
    externalReferences: Array.from(externalRefKeys),
  };
}
