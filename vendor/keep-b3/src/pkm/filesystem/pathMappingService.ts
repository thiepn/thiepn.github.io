/**
 * Phase P45: Path Mapping & Filename Sanitization Service
 * 
 * Safely decouples canonical note titles from filesystem paths.
 * Enforces platform-safe filenames, handles Windows reserved words,
 * Unicode normalization, collision resolution, and path length limits.
 */

import { Note, Folder } from '../../types';
import { FilenamePolicy } from './filesystemTypes';

// Windows reserved names (case-insensitive)
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

// Illegal filename characters for Windows / POSIX / macOS
const ILLEGAL_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;

export class PathMappingService {
  /**
   * Sanitizes a single path segment (file name or folder name)
   */
  public sanitizeSegment(name: string, fallback = 'Untitled'): string {
    if (!name || !name.trim()) return fallback;

    // Unicode normalization (NFC)
    let clean = name.normalize('NFC').trim();

    // Replace illegal characters with safe hyphen or underscore
    clean = clean.replace(ILLEGAL_CHARS_REGEX, '-');

    // Remove control characters
    clean = clean.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');

    // Trim trailing spaces and dots (Windows compatibility)
    clean = clean.replace(/[ .]+$/, '');

    // Check Windows reserved names
    const baseUpper = clean.split('.')[0].toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(baseUpper)) {
      clean = `_${clean}`;
    }

    if (!clean || clean === '.') {
      return fallback;
    }

    return clean;
  }

  /**
   * Resolves the full folder path from canonical Folder records
   */
  public getFolderDirectoryPath(folderId: string | null | undefined, folders: Folder[]): string {
    if (!folderId || folderId === 'unorganized') return '';

    const folderMap = new Map<string, Folder>();
    for (const f of folders) {
      folderMap.set(f.id, f);
    }

    const segments: string[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = folderMap.get(currentId);
      if (!folder) break;
      const cleanName = this.sanitizeSegment(folder.name, 'Folder');
      segments.unshift(cleanName);
      currentId = (folder as any).parentId || null;
    }

    return segments.join('/');
  }

  /**
   * Generates a safe relative filesystem path for a note
   */
  public getNoteFilePath(
    note: Note,
    folders: Folder[],
    policy: FilenamePolicy = 'follow_title',
    existingPaths: Set<string> = new Set(),
    maxPathLength = 240
  ): string {
    const folderPath = this.getFolderDirectoryPath(note.folderId, folders);

    let baseName: string;
    if (policy === 'stable_id') {
      const cleanTitle = this.sanitizeSegment(note.title || 'Untitled', 'Note');
      baseName = `${cleanTitle}_${note.id.slice(0, 8)}`;
    } else {
      baseName = this.sanitizeSegment(note.title || 'Untitled Note', 'Untitled Note');
    }

    let fileName = `${baseName}.md`;
    let fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Check max path length constraint
    if (fullPath.length > maxPathLength) {
      const excess = fullPath.length - maxPathLength;
      const truncatedBase = baseName.slice(0, Math.max(10, baseName.length - excess - 4));
      fileName = `${truncatedBase}.md`;
      fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    }

    // Collision detection & resolution
    if (existingPaths.has(fullPath.toLowerCase())) {
      let counter = 2;
      let candidatePath: string;
      do {
        fileName = `${baseName} (${counter}).md`;
        candidatePath = folderPath ? `${folderPath}/${fileName}` : fileName;
        counter++;
      } while (existingPaths.has(candidatePath.toLowerCase()) && counter < 1000);
      fullPath = candidatePath;
    }

    return fullPath;
  }

  /**
   * Generates a safe relative filesystem path for an attachment
   */
  public getAttachmentFilePath(
    attachmentId: string,
    originalName: string,
    existingPaths: Set<string> = new Set()
  ): string {
    const cleanName = this.sanitizeSegment(originalName || `attachment_${attachmentId}`, 'attachment');
    let fullPath = `Attachments/${cleanName}`;

    if (existingPaths.has(fullPath.toLowerCase())) {
      const parts = cleanName.split('.');
      const ext = parts.length > 1 ? `.${parts.pop()}` : '';
      const base = parts.join('.');
      let counter = 2;
      let candidate: string;
      do {
        candidate = `Attachments/${base} (${counter})${ext}`;
        counter++;
      } while (existingPaths.has(candidate.toLowerCase()) && counter < 1000);
      fullPath = candidate;
    }

    return fullPath;
  }

  /**
   * Checks if a path is ignored (e.g. .git, system files, editor temp files)
   */
  public isIgnoredPath(relativePath: string): boolean {
    if (!relativePath) return true;

    // Normalize path separators
    const normalized = relativePath.replace(/\\/g, '/');
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1];

    // Ignore .git directories
    if (segments.includes('.git') || segments.includes('.pkm-manifest.json')) {
      return true;
    }

    // Ignore OS metadata files
    if (
      fileName === '.DS_Store' ||
      fileName === 'Thumbs.db' ||
      fileName === 'desktop.ini' ||
      fileName.startsWith('._')
    ) {
      return true;
    }

    // Ignore temporary/atomic editor files
    if (
      fileName.endsWith('~') ||
      fileName.endsWith('.swp') ||
      fileName.endsWith('.swo') ||
      fileName.endsWith('.tmp') ||
      fileName.endsWith('.bak') ||
      (fileName.startsWith('#') && fileName.endsWith('#')) ||
      fileName.startsWith('.#')
    ) {
      return true;
    }

    // Ignore top-level hidden directories/files except managed ones
    if (fileName.startsWith('.') && fileName !== '.pkm-manifest.json') {
      return true;
    }

    return false;
  }

  /**
   * Extracts note title from filename or frontmatter content
   */
  public inferNoteTitle(fileName: string, content?: string): string {
    // 1. Check if first line of markdown is an H1 header
    if (content) {
      const match = content.match(/^#\s+(.+)$/m);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    // 2. Strip .md or .markdown extension
    const base = fileName.replace(/\.(md|markdown)$/i, '');
    
    // 3. Remove trailing duplicate counters e.g. "Note (2)" -> "Note" if title was preserved
    return base.replace(/\s+\(\d+\)$/, '').trim() || 'Untitled Note';
  }
}

export const pathMappingService = new PathMappingService();
