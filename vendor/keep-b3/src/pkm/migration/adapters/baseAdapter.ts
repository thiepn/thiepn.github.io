/**
 * P40 — Base Migration Adapter Interface & Common Utilities
 */

import {
  AttachmentCandidate,
  CanvasCandidate,
  FolderCandidate,
  MigrationPlan,
  MigrationProgress,
  MigrationSourceType,
  MigrationWarning,
  NoteCandidate,
  RawImportFile,
} from '../migrationTypes';
import { Reference } from '../../reference/referenceTypes';

export interface AdapterParseResult {
  notes: NoteCandidate[];
  attachments: AttachmentCandidate[];
  canvases: CanvasCandidate[];
  references: Reference[];
  folders: FolderCandidate[];
  warnings: MigrationWarning[];
}

export interface MigrationAdapter {
  id: MigrationSourceType;
  displayName: string;
  description: string;
  parse(
    files: RawImportFile[],
    plan: MigrationPlan,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<AdapterParseResult>;
}

/**
 * Extracts filename without extension.
 */
export function getBaseFileName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() || '';
  const dotIdx = filename.lastIndexOf('.');
  return dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
}

/**
 * Extracts folder path from relative file path.
 */
export function getFolderPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/');
}

/**
 * Derives MIME type from file extension.
 */
export function getMimeTypeFromPath(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    bib: 'application/x-bibtex',
    txt: 'text/plain',
    md: 'text/markdown',
    canvas: 'application/json',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Checks if a file path is a supported media/attachment file.
 */
export function isAttachmentFile(path: string): boolean {
  const ext = (path.split('.').pop() || '').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'mp3', 'wav', 'm4a', 'ogg', 'pdf'].includes(ext);
}
