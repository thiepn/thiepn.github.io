import { Note, Folder, SavedSearch, AppSettings } from '../types';
import { CanvasBoard } from './canvasTypes';
import { PDFAttachment } from './pdfTypes';

export interface PortableVaultData {
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings?: AppSettings;
  canvases?: CanvasBoard[];
  pdfAttachments?: Array<{
    meta: PDFAttachment;
    blobData?: Blob | Uint8Array | ArrayBuffer;
  }>;
}

export interface NoteManifestEntry {
  id: string;
  title: string;
  relativePath: string;
  folderId?: string | null;
  checksum: string;
  updatedAt: string;
}

export interface CanvasManifestEntry {
  id: string;
  title: string;
  relativePath: string;
  updatedAt: string;
}

export interface AttachmentManifestEntry {
  id: string;
  name: string;
  relativePath: string;
  type: 'image' | 'pdf' | 'audio' | 'other';
  sizeBytes: number;
}

export interface PortableVaultManifest {
  formatVersion: '1.0.0';
  appName: string;
  exportedAt: string;
  stats: {
    noteCount: number;
    folderCount: number;
    canvasCount: number;
    pdfCount: number;
    imageCount: number;
  };
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings?: AppSettings;
  noteIndex: NoteManifestEntry[];
  canvasesIndex: CanvasManifestEntry[];
  attachmentsIndex: AttachmentManifestEntry[];
}

export interface PortableFileEntry {
  path: string;
  content: string | Uint8Array;
  isBinary: boolean;
}

export interface SerializedVaultFiles {
  manifest: PortableVaultManifest;
  files: PortableFileEntry[];
}

export interface GitCommitInfo {
  oid: string;
  shortOid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  tree: string;
  parents: string[];
}

export interface GitStatusSummary {
  clean: boolean;
  modified: string[];
  added: string[];
  deleted: string[];
  unmodified: string[];
  totalFiles: number;
}

export interface FileSystemCapability {
  hasFileSystemAccess: boolean;
  fallbackMode: 'zip' | 'directory_input' | 'download';
  browserDescription: string;
}
