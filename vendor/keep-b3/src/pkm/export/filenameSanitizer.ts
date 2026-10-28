/**
 * PKM V1.8: Cross-Platform Filename & Path Sanitizer
 * Guarantees safe export across Windows, macOS, Linux, FAT32, NTFS, APFS, and ext4.
 */

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Sanitizes a single filename segment (not a full path).
 */
export function sanitizeFilename(rawName: string, fallback: string = 'Untitled'): string {
  if (!rawName || typeof rawName !== 'string') return fallback;

  // 1. Unicode normalization (NFC)
  let name = rawName.normalize('NFC').trim();

  // 2. Reject or strip path traversal sequences
  name = name.replace(/(\.\.[\/\\])+/g, '_').replace(/[\/\\]+/g, '_');

  // 3. Strip characters forbidden on Windows/Linux/macOS: \ / : * ? " < > | and control chars 0x00-0x1F
  name = name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');

  // 4. Strip leading and trailing periods or whitespace (e.g. "...filename. " -> "filename")
  name = name.replace(/^[. ]+|[. ]+$/g, '');

  // If entirely stripped, fallback
  if (!name) return fallback;

  // 5. Windows reserved device names check (e.g. CON, aux.md, nul.tar.gz)
  const baseName = name.split('.')[0].toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(baseName)) {
    name = `_${name}`;
  }

  // 6. Max length capping (120 characters per segment)
  if (name.length > 120) {
    const extMatch = name.match(/\.([a-zA-Z0-9_-]{1,10})$/);
    if (extMatch) {
      const ext = extMatch[0];
      const maxBase = 120 - ext.length;
      name = name.slice(0, maxBase) + ext;
    } else {
      name = name.slice(0, 120);
    }
  }

  return name || fallback;
}

/**
 * Sanitizes a multi-segment relative path (e.g. "folder/subfolder/note.md").
 * Strictly prevents absolute paths and path traversal.
 */
export function sanitizeExportPath(rawPath: string, defaultExt: string = '.md'): string {
  if (!rawPath || typeof rawPath !== 'string') return `Untitled${defaultExt}`;

  // Normalize slashes
  const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) return `Untitled${defaultExt}`;

  const cleanSegments: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const isLast = i === segments.length - 1;
    const seg = segments[i];

    // Check for traversal
    if (seg === '.' || seg === '..') {
      continue;
    }

    const clean = sanitizeFilename(seg, isLast ? `item_${i}` : `folder_${i}`);
    cleanSegments.push(clean);
  }

  if (cleanSegments.length === 0) return `Untitled${defaultExt}`;

  let finalPath = cleanSegments.join('/');
  if (defaultExt && !finalPath.includes('.')) {
    finalPath += defaultExt;
  }

  return finalPath;
}

/**
 * Registry to resolve case-insensitive collisions deterministically.
 */
export class FilenameCollisionResolver {
  private usedPaths = new Set<string>();

  constructor() {
    this.usedPaths = new Set<string>();
  }

  /**
   * Generates a unique, collision-free relative path.
   */
  public getUniquePath(basePath: string, preferredId?: string): string {
    const cleanBase = sanitizeExportPath(basePath, '');
    let candidate = cleanBase;
    let counter = 1;

    while (this.usedPaths.has(candidate.toLowerCase())) {
      const extMatch = cleanBase.match(/\.([a-zA-Z0-9_-]{1,10})$/);
      const suffix = preferredId ? preferredId.slice(0, 6) : String(counter);

      if (extMatch) {
        const ext = extMatch[0];
        const withoutExt = cleanBase.slice(0, -ext.length);
        candidate = `${withoutExt}_(${suffix})${ext}`;
      } else {
        candidate = `${cleanBase}_(${suffix})`;
      }
      counter++;
    }

    this.usedPaths.add(candidate.toLowerCase());
    return candidate;
  }

  public reset() {
    this.usedPaths.clear();
  }
}
