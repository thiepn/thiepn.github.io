import { Note, Folder, SavedSearch, AppSettings, ChecklistItem } from '../types';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';
import {
  PortableVaultData,
  PortableVaultManifest,
  PortableFileEntry,
  SerializedVaultFiles,
  NoteManifestEntry,
  CanvasManifestEntry,
  AttachmentManifestEntry,
} from './portableVaultTypes';

/**
 * Deterministic string checksum computation (FNV-1a 64-bit formatted as hex)
 */
export function computeDeterministicChecksum(content: string | Uint8Array): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x811c9dc5;

  if (typeof content === 'string') {
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash1 = Math.imul(hash1 ^ (char & 0xff), 0x01000193);
      hash2 = Math.imul(hash2 ^ (char >> 8), 0x01000193);
    }
  } else {
    for (let i = 0; i < content.length; i++) {
      const byte = content[i];
      hash1 = Math.imul(hash1 ^ byte, 0x01000193);
      hash2 = Math.imul(hash2 ^ (byte * 31), 0x01000193);
    }
  }

  const h1Hex = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2Hex = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${h1Hex}${h2Hex}`;
}

/**
 * Deep sort object keys for deterministic JSON serialization
 */
export function canonicalizeJson(obj: any): string {
  function sortKeys(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }
    const sortedObj: Record<string, any> = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      sortedObj[key] = sortKeys(value[key]);
    }
    return sortedObj;
  }

  return JSON.stringify(sortKeys(obj), null, 2) + '\n';
}

/**
 * Sanitizes path segments (folders, filenames) safely across OS filesystems
 */
export function sanitizePathSegment(name: string): string {
  if (!name || !name.trim()) return 'Untitled';
  // Strip characters forbidden on Windows/Linux/macOS
  let clean = name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim();
  // Strip trailing periods or spaces
  clean = clean.replace(/[. ]+$/, '');
  return clean.length > 0 ? clean.slice(0, 120) : 'Untitled';
}

/**
 * Convert Base64 data URL to Uint8Array binary buffer
 */
export function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const base64Data = parts[1] || '';

  if (typeof atob === 'function') {
    const binStr = atob(base64Data);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return { bytes, mimeType };
  } else {
    // Node / Buffer fallback
    const buffer = Buffer.from(base64Data, 'base64');
    return { bytes: new Uint8Array(buffer), mimeType };
  }
}

/**
 * Convert Uint8Array binary buffer to Base64 data URL
 */
export function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string): string {
  if (typeof btoa === 'function') {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  } else {
    const buffer = Buffer.from(bytes);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

/**
 * Convert Blob or ArrayBuffer to Uint8Array
 */
export async function blobToUint8Array(blobOrBuffer: Blob | Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  if (blobOrBuffer instanceof Uint8Array) {
    return blobOrBuffer;
  }
  if (blobOrBuffer instanceof ArrayBuffer) {
    return new Uint8Array(blobOrBuffer);
  }
  if (typeof Blob !== 'undefined' && blobOrBuffer instanceof Blob) {
    const arrayBuffer = await blobOrBuffer.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  return new Uint8Array();
}

/**
 * Serializes a single Note into human-readable Markdown with deterministic YAML frontmatter
 */
export function serializeNoteToMarkdown(
  note: Note,
  folderMap: Map<string, string>,
  imagePathMap?: Map<string, string>
): string {
  const folderName = note.folderId ? folderMap.get(note.folderId) || '' : '';

  // 1. Build deterministic YAML frontmatter lines
  const fm: string[] = ['---'];

  // ID (stable identity)
  fm.push(`id: "${note.id}"`);

  // Title
  const escapedTitle = (note.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  fm.push(`title: "${escapedTitle}"`);

  // Timestamps
  fm.push(`created: "${note.createdAt}"`);
  fm.push(`updated: "${note.updatedAt}"`);

  // Folder name
  if (folderName) {
    const escapedFolder = folderName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    fm.push(`folder: "${escapedFolder}"`);
  }

  // Color (if non-default)
  if (note.color && note.color !== 'default') {
    fm.push(`color: "${note.color}"`);
  }

  // Tags (sorted alphabetically for determinism)
  if (note.tags && note.tags.length > 0) {
    const sortedTags = [...note.tags].map((t) => (t || '').trim()).filter(Boolean).sort();
    if (sortedTags.length > 0) {
      fm.push(`tags: [${sortedTags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]`);
    }
  }

  // Flags
  if (note.pinned) fm.push('pinned: true');
  if (note.archived) fm.push('archived: true');
  if (note.trashed) fm.push('trashed: true');
  if (note.reminderDate) fm.push(`reminder: "${note.reminderDate}"`);
  if (note.type === 'checklist') fm.push('type: "checklist"');
  if ((note as any).isLocked) fm.push('locked: true');

  // Linked Note IDs
  if (note.linkedNoteIds && note.linkedNoteIds.length > 0) {
    const sortedLinked = [...note.linkedNoteIds].sort();
    fm.push(`linkedNoteIds: [${sortedLinked.map((id) => `"${id}"`).join(', ')}]`);
  }

  // Images reference index
  if (note.images && note.images.length > 0) {
    const imgList = note.images.map((img) => {
      const rel = imagePathMap ? imagePathMap.get(img.id) : undefined;
      return {
        id: img.id,
        name: img.name || 'image',
        file: rel || `attachments/images/${note.id}_${img.id}_image.png`,
      };
    });
    fm.push(`images: ${JSON.stringify(imgList)}`);
  }

  fm.push('---\n');

  // 2. Build Markdown Body
  let body = '';
  if (note.type === 'checklist' && note.checklist && note.checklist.length > 0) {
    const checklistMd = note.checklist
      .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
      .join('\n');

    if (note.content && note.content.trim()) {
      body = `${note.content.trim()}\n\n${checklistMd}\n`;
    } else {
      body = `${checklistMd}\n`;
    }
  } else {
    body = (note.content || '').endsWith('\n') ? note.content : `${note.content || ''}\n`;
  }

  return fm.join('\n') + '\n' + body;
}

/**
 * Parses a YAML Frontmatter Markdown file into a structured Note object
 */
export function parseMarkdownToNote(
  markdown: string,
  foldersByName: Map<string, string>,
  inferredFolderId?: string | null,
  imageBlobResolver?: (fileName: string) => string | undefined
): Note {
  let frontmatterObj: Record<string, any> = {};
  let body = markdown;

  // Extract YAML Frontmatter if present
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fmMatch) {
    const fmText = fmMatch[1];
    body = fmMatch[2];

    const lines = fmText.split(/\r?\n/);
    let currentKey: string | null = null;
    let inList = false;
    let listAccumulator: any[] = [];

    for (let line of lines) {
      line = line.trimEnd();
      if (!line) continue;

      if (line.startsWith('  - ') && currentKey) {
        // Multi-line list item
        const itemLine = line.slice(4).trim();
        if (itemLine.includes(':')) {
          // Object in list
          const [k, v] = itemLine.split(/:\s*(.*)/);
          const cleanV = (v || '').trim().replace(/^["']|["']$/g, '');
          listAccumulator.push({ [k]: cleanV });
        } else {
          listAccumulator.push(itemLine.replace(/^["']|["']$/g, ''));
        }
        continue;
      }

      if (inList && currentKey) {
        frontmatterObj[currentKey] = listAccumulator;
        inList = false;
        listAccumulator = [];
      }

      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val: any = match[2].trim();

        if (val === '') {
          currentKey = key;
          inList = true;
          listAccumulator = [];
          continue;
        }

        // Parse boolean
        if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        // Parse array [a, b] or JSON array
        else if (val.startsWith('[') && val.endsWith(']')) {
          try {
            val = JSON.parse(val);
          } catch {
            const inner = val.slice(1, -1).trim();
            val = inner
              ? inner
                  .split(',')
                  .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
                  .filter(Boolean)
              : [];
          }
        } else {
          // Strip enclosing quotes
          val = val.replace(/^["']|["']$/g, '');
        }

        frontmatterObj[key] = val;
      }
    }

    if (inList && currentKey) {
      frontmatterObj[currentKey] = listAccumulator;
    }
  }

  // Reconstruct Note properties
  const title = frontmatterObj.title || extractTitleFromBody(body) || 'Untitled Note';
  const id = frontmatterObj.id || `note-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = frontmatterObj.created || new Date().toISOString();
  const updatedAt = frontmatterObj.updated || createdAt;
  const color = frontmatterObj.color || 'default';
  const tags: string[] = Array.isArray(frontmatterObj.tags) ? frontmatterObj.tags : [];
  const pinned = Boolean(frontmatterObj.pinned);
  const archived = Boolean(frontmatterObj.archived);
  const trashed = Boolean(frontmatterObj.trashed);
  const reminderDate = frontmatterObj.reminder || null;
  const isTypeChecklist = frontmatterObj.type === 'checklist';

  // Determine folder
  let folderId = inferredFolderId || null;
  if (frontmatterObj.folder && foldersByName.has(frontmatterObj.folder)) {
    folderId = foldersByName.get(frontmatterObj.folder)!;
  }

  // Parse checklist vs text body
  let content = body;
  const checklist: ChecklistItem[] = [];

  if (isTypeChecklist || body.includes('- [ ]') || body.includes('- [x]')) {
    const lines = body.split(/\r?\n/);
    const remainingTextLines: string[] = [];
    let itemIdx = 1;

    for (const line of lines) {
      const chkMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      if (chkMatch) {
        checklist.push({
          id: `c_${itemIdx++}`,
          text: chkMatch[3] || '',
          completed: chkMatch[2].toLowerCase() === 'x',
        });
      } else {
        remainingTextLines.push(line);
      }
    }

    if (isTypeChecklist) {
      content = remainingTextLines.join('\n').trim();
    }
  }

  // Restore images if available
  const images: Array<{ id: string; name: string; dataUrl: string; size?: number }> = [];
  if (Array.isArray(frontmatterObj.images) && imageBlobResolver) {
    for (const imgMeta of frontmatterObj.images) {
      if (imgMeta && imgMeta.file) {
        const dataUrl = imageBlobResolver(imgMeta.file);
        if (dataUrl) {
          images.push({
            id: imgMeta.id || `img-${Math.random().toString(36).slice(2, 8)}`,
            name: imgMeta.name || 'image',
            dataUrl,
          });
        }
      }
    }
  }

  return {
    id,
    title,
    content: content.trim(),
    type: isTypeChecklist ? 'checklist' : 'text',
    checklist,
    color,
    tags,
    folderId,
    pinned,
    archived,
    trashed,
    createdAt,
    updatedAt,
    reminderDate,
    images,
    linkedNoteIds: Array.isArray(frontmatterObj.linkedNoteIds) ? frontmatterObj.linkedNoteIds : [],
  };
}

function extractTitleFromBody(body: string): string {
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  const firstLine = body.trim().split('\n')[0] || '';
  return firstLine.slice(0, 40).trim();
}

/**
 * Serializes the complete Vault into a deterministic, portable file list and manifest
 */
export async function serializePortableVault(
  data: PortableVaultData,
  options?: { exportedAt?: string }
): Promise<SerializedVaultFiles> {
  const files: PortableFileEntry[] = [];
  const folderMap = new Map<string, string>(data.folders.map((f) => [f.id, f.name]));

  // 1. Serialize Folders & Create Deterministic Note Paths
  const usedNoteFileNames = new Set<string>();
  const noteIndex: NoteManifestEntry[] = [];

  // Sort notes deterministically by folder name -> title -> id
  const sortedNotes = [...data.notes].sort((a, b) => {
    const fA = a.folderId ? folderMap.get(a.folderId) || '' : '';
    const fB = b.folderId ? folderMap.get(b.folderId) || '' : '';
    if (fA !== fB) return fA.localeCompare(fB);
    const tA = (a.title || '').toLowerCase();
    const tB = (b.title || '').toLowerCase();
    if (tA !== tB) return tA.localeCompare(tB);
    return a.id.localeCompare(b.id);
  });

  // Track attachments
  const attachmentsIndex: AttachmentManifestEntry[] = [];
  const imagePathMap = new Map<string, string>();

  // Process note image attachments
  for (const note of sortedNotes) {
    if (note.images && note.images.length > 0) {
      for (const img of note.images) {
        if (img.dataUrl && img.dataUrl.startsWith('data:')) {
          const { bytes, mimeType } = dataUrlToUint8Array(img.dataUrl);
          const ext = mimeType.split('/')[1] || 'png';
          const cleanImgName = sanitizePathSegment(img.name || 'image');
          const relPath = `attachments/images/${note.id}_${img.id}_${cleanImgName}.${ext}`;

          imagePathMap.set(img.id, relPath);
          files.push({
            path: relPath,
            content: bytes,
            isBinary: true,
          });

          attachmentsIndex.push({
            id: img.id,
            name: img.name || 'image',
            relativePath: relPath,
            type: 'image',
            sizeBytes: bytes.length,
          });
        }
      }
    }
  }

  // Serialize Notes to Markdown
  for (const note of sortedNotes) {
    const folderName = note.folderId ? folderMap.get(note.folderId) : null;
    const cleanFolder = folderName ? sanitizePathSegment(folderName) : null;
    const cleanTitle = sanitizePathSegment(note.title || 'Untitled');

    // Create unique, deterministic filename
    let relativeNotePath = cleanFolder
      ? `notes/${cleanFolder}/${cleanTitle}.md`
      : `notes/${cleanTitle}.md`;

    let counter = 1;
    while (usedNoteFileNames.has(relativeNotePath.toLowerCase())) {
      const suffix = note.id.slice(0, 6) || String(counter);
      relativeNotePath = cleanFolder
        ? `notes/${cleanFolder}/${cleanTitle}_(${suffix}).md`
        : `notes/${cleanTitle}_(${suffix}).md`;
      counter++;
    }
    usedNoteFileNames.add(relativeNotePath.toLowerCase());

    const markdown = serializeNoteToMarkdown(note, folderMap, imagePathMap);
    const checksum = computeDeterministicChecksum(markdown);

    files.push({
      path: relativeNotePath,
      content: markdown,
      isBinary: false,
    });

    noteIndex.push({
      id: note.id,
      title: note.title,
      relativePath: relativeNotePath,
      folderId: note.folderId,
      checksum,
      updatedAt: note.updatedAt,
    });
  }

  // 2. Serialize Canvas Boards
  const canvasesIndex: CanvasManifestEntry[] = [];
  if (data.canvases && data.canvases.length > 0) {
    const sortedCanvases = [...data.canvases].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '') || a.id.localeCompare(b.id)
    );

    for (const canvas of sortedCanvases) {
      const cleanCanvasTitle = sanitizePathSegment(canvas.title || 'Canvas');
      const relPath = `canvases/${cleanCanvasTitle}_${canvas.id}.json`;
      const jsonStr = canonicalizeJson(canvas);

      files.push({
        path: relPath,
        content: jsonStr,
        isBinary: false,
      });

      canvasesIndex.push({
        id: canvas.id,
        title: canvas.title,
        relativePath: relPath,
        updatedAt: canvas.updatedAt,
      });
    }
  }

  // 3. Serialize PDF Attachments
  if (data.pdfAttachments && data.pdfAttachments.length > 0) {
    for (const pdfItem of data.pdfAttachments) {
      const cleanPdfName = sanitizePathSegment(pdfItem.meta.name || pdfItem.meta.fileName || 'document.pdf');
      const relPath = `attachments/pdfs/${pdfItem.meta.id}_${cleanPdfName}`;

      let bytes: Uint8Array = new Uint8Array();
      if (pdfItem.blobData) {
        bytes = await blobToUint8Array(pdfItem.blobData);
      }

      files.push({
        path: relPath,
        content: bytes,
        isBinary: true,
      });

      attachmentsIndex.push({
        id: pdfItem.meta.id,
        name: pdfItem.meta.name,
        relativePath: relPath,
        type: 'pdf',
        sizeBytes: bytes.length || pdfItem.meta.size || 0,
      });
    }
  }

  // 4. Build Deterministic Manifest
  // Sort folders deterministically
  const sortedFolders = [...data.folders].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const sortedSearches = [...data.savedSearches].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const manifest: PortableVaultManifest = {
    formatVersion: '1.0.0',
    appName: 'KeepNotes PKM',
    exportedAt: options?.exportedAt || new Date().toISOString(),
    stats: {
      noteCount: data.notes.length,
      folderCount: data.folders.length,
      canvasCount: data.canvases?.length || 0,
      pdfCount: data.pdfAttachments?.length || 0,
      imageCount: imagePathMap.size,
    },
    folders: sortedFolders,
    savedSearches: sortedSearches,
    settings: data.settings,
    noteIndex,
    canvasesIndex,
    attachmentsIndex,
  };

  const manifestJson = canonicalizeJson(manifest);
  files.push({
    path: 'metadata/manifest.json',
    content: manifestJson,
    isBinary: false,
  });

  // Sort files deterministically by path
  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    manifest,
    files,
  };
}

/**
 * Deserializes an array of portable files back into complete Vault Data with high fidelity
 */
export async function deserializePortableVault(files: PortableFileEntry[]): Promise<PortableVaultData> {
  const fileMap = new Map<string, PortableFileEntry>();
  for (const f of files) {
    // Normalize path separators to forward slash
    const norm = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
    fileMap.set(norm, f);
  }

  // 1. Read Manifest if available
  let manifest: PortableVaultManifest | null = null;
  const manifestEntry = fileMap.get('metadata/manifest.json') || fileMap.get('manifest.json');
  if (manifestEntry) {
    try {
      const text = typeof manifestEntry.content === 'string'
        ? manifestEntry.content
        : new TextDecoder().decode(manifestEntry.content);
      manifest = JSON.parse(text);
    } catch (e) {
      console.warn('Could not parse manifest.json, falling back to directory inference:', e);
    }
  }

  // Reconstruct Folders
  const folders: Folder[] = manifest?.folders ? [...manifest.folders] : [];
  const foldersByName = new Map<string, string>(folders.map((f) => [f.name, f.id]));
  const foldersById = new Map<string, Folder>(folders.map((f) => [f.id, f]));

  // Auto-discover folders from note path structure if not in manifest
  for (const [path] of fileMap.entries()) {
    if (path.startsWith('notes/') && path.endsWith('.md')) {
      const parts = path.slice('notes/'.length).split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        if (!foldersByName.has(folderName)) {
          const newFolder: Folder = {
            id: `folder-${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: folderName,
            color: '#3b82f6',
            createdAt: new Date().toISOString(),
          };
          folders.push(newFolder);
          foldersByName.set(folderName, newFolder.id);
          foldersById.set(newFolder.id, newFolder);
        }
      }
    }
  }

  // Prepare image resolver for notes
  const imageBlobResolver = (filePath: string): string | undefined => {
    const entry = fileMap.get(filePath) || fileMap.get(`attachments/${filePath}`) || fileMap.get(`attachments/images/${filePath}`);
    if (!entry) return undefined;
    const bytes = typeof entry.content === 'string' ? new TextEncoder().encode(entry.content) : entry.content;
    const ext = entry.path.split('.').pop() || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
    return uint8ArrayToDataUrl(bytes, mime);
  };

  // 2. Reconstruct Notes
  const notes: Note[] = [];
  const noteIdMap = new Map<string, Note>();

  for (const [path, entry] of fileMap.entries()) {
    if ((path.startsWith('notes/') || !path.includes('/')) && path.endsWith('.md')) {
      const text = typeof entry.content === 'string'
        ? entry.content
        : new TextDecoder().decode(entry.content);

      // Infer folder from path
      let inferredFolderId: string | null = null;
      if (path.startsWith('notes/')) {
        const sub = path.slice('notes/'.length).split('/');
        if (sub.length > 1 && foldersByName.has(sub[0])) {
          inferredFolderId = foldersByName.get(sub[0])!;
        }
      }

      const note = parseMarkdownToNote(text, foldersByName, inferredFolderId, imageBlobResolver);
      if (!noteIdMap.has(note.id)) {
        noteIdMap.set(note.id, note);
        notes.push(note);
      }
    }
  }

  // 3. Reconstruct Canvases
  const canvases: CanvasBoard[] = [];
  for (const [path, entry] of fileMap.entries()) {
    if (path.startsWith('canvases/') && path.endsWith('.json')) {
      try {
        const text = typeof entry.content === 'string'
          ? entry.content
          : new TextDecoder().decode(entry.content);
        const board = JSON.parse(text) as CanvasBoard;
        if (board && board.id) {
          canvases.push(board);
        }
      } catch (e) {
        console.warn(`Failed to parse canvas board at ${path}:`, e);
      }
    }
  }

  // 4. Reconstruct PDF Attachments
  const pdfAttachments: Array<{ meta: PDFAttachment; blobData?: Uint8Array }> = [];
  for (const [path, entry] of fileMap.entries()) {
    if (path.startsWith('attachments/pdfs/') || (path.startsWith('attachments/') && path.endsWith('.pdf'))) {
      const bytes = typeof entry.content === 'string' ? new TextEncoder().encode(entry.content) : entry.content;
      const fileName = path.split('/').pop() || 'document.pdf';
      const parts = fileName.split('_');
      const id = parts.length > 1 ? parts[0] : `pdf-${Math.random().toString(36).slice(2, 8)}`;
      const cleanName = parts.length > 1 ? parts.slice(1).join('_') : fileName;

      const meta: PDFAttachment = {
        id,
        name: cleanName.replace(/\.pdf$/i, ''),
        fileName: cleanName,
        size: bytes.length,
        pageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      pdfAttachments.push({
        meta,
        blobData: bytes,
      });
    }
  }

  return {
    notes,
    folders,
    savedSearches: manifest?.savedSearches || [],
    settings: manifest?.settings,
    canvases: canvases.length > 0 ? canvases : undefined,
    pdfAttachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
  };
}

export interface BackupVerificationReport {
  isValid: boolean;
  manifestPresent: boolean;
  totalFiles: number;
  verifiedNotes: number;
  verifiedCanvases: number;
  verifiedAttachments: number;
  checksumMismatches: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Non-destructive verification of a portable vault backup archive.
 * Checks manifest existence, file counts, and deterministic checksum matching.
 */
export async function verifyPortableVaultBackup(
  files: PortableFileEntry[]
): Promise<BackupVerificationReport> {
  const report: BackupVerificationReport = {
    isValid: true,
    manifestPresent: false,
    totalFiles: files.length,
    verifiedNotes: 0,
    verifiedCanvases: 0,
    verifiedAttachments: 0,
    checksumMismatches: [],
    warnings: [],
    errors: [],
  };

  const fileMap = new Map<string, PortableFileEntry>();
  for (const f of files) {
    fileMap.set(f.path, f);
  }

  const manifestEntry = fileMap.get('metadata/manifest.json');
  if (!manifestEntry) {
    report.manifestPresent = false;
    report.warnings.push('Backup is missing metadata/manifest.json; restore would require directory inference.');
  } else {
    report.manifestPresent = true;
    try {
      const manifestText = typeof manifestEntry.content === 'string'
        ? manifestEntry.content
        : new TextDecoder().decode(manifestEntry.content);
      const manifest = JSON.parse(manifestText) as PortableVaultManifest;

      if (!manifest.formatVersion || !manifest.stats) {
        report.warnings.push('Manifest structure is incomplete or non-canonical.');
      }

      // Check each note against manifest checksum
      if (manifest.noteIndex) {
        for (const noteMeta of manifest.noteIndex) {
          const matchingFile = fileMap.get(noteMeta.relativePath);
          if (!matchingFile) {
            report.errors.push(`Manifest note ${noteMeta.id} missing at path: ${noteMeta.relativePath}`);
            report.isValid = false;
          } else {
            const actualChecksum = computeDeterministicChecksum(matchingFile.content);
            if (noteMeta.checksum && actualChecksum !== noteMeta.checksum) {
              report.checksumMismatches.push(noteMeta.relativePath);
              report.errors.push(`Checksum mismatch for note ${noteMeta.id} at ${noteMeta.relativePath}`);
              report.isValid = false;
            } else {
              report.verifiedNotes++;
            }
          }
        }
      }

      // Check canvases
      if (manifest.canvasesIndex) {
        for (const cMeta of manifest.canvasesIndex) {
          const matchingFile = fileMap.get(cMeta.relativePath);
          if (!matchingFile) {
            report.warnings.push(`Manifest canvas ${cMeta.id} missing at path: ${cMeta.relativePath}`);
          } else {
            report.verifiedCanvases++;
          }
        }
      }

      // Check attachments
      if (manifest.attachmentsIndex) {
        for (const aMeta of manifest.attachmentsIndex) {
          const matchingFile = fileMap.get(aMeta.relativePath);
          if (!matchingFile) {
            report.warnings.push(`Manifest attachment ${aMeta.id} missing at path: ${aMeta.relativePath}`);
          } else {
            report.verifiedAttachments++;
          }
        }
      }
    } catch (err: any) {
      report.isValid = false;
      report.errors.push(`Failed to parse manifest JSON: ${err?.message || err}`);
    }
  }

  // Count files directly if no manifest
  if (!report.manifestPresent) {
    for (const [path] of fileMap.entries()) {
      if (path.startsWith('notes/') && path.endsWith('.md')) {
        report.verifiedNotes++;
      } else if (path.startsWith('canvases/') && path.endsWith('.json')) {
        report.verifiedCanvases++;
      } else if (path.startsWith('attachments/')) {
        report.verifiedAttachments++;
      }
    }
  }

  return report;
}

