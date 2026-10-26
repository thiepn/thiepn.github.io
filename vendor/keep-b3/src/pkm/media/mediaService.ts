import { Note } from '../../types';
import {
  CanonicalAttachment,
  AttachmentKind,
  AttachmentFilter,
  AttachmentSortField,
  AttachmentSortOrder,
  AttachmentReference,
} from './mediaTypes';
import { vaultEncryptionService } from '../encryption';
import { pdfStorageService } from '../pdfStorage';
import { PDFAttachment } from '../pdfTypes';
import { computeDeterministicChecksum } from '../portableVaultSerializer';
import { parsePDFTarget } from '../pdfCitation';
import { VaultIndex } from '../types';

const MEDIA_DB_NAME = 'KeepNotes_Media_DB';
const MEDIA_DB_VERSION = 1;
const STORE_MEDIA_ATTACHMENTS = 'media_attachments';

/**
 * Detect attachment kind from MIME type and filename extension
 */
export function detectAttachmentKind(mimeType: string, filename: string): AttachmentKind {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (filename || '').toLowerCase();

  if (
    lowerMime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(lowerName)
  ) {
    return 'image';
  }
  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerMime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|webm|m4a|aac|flac)$/i.test(lowerName)
  ) {
    return 'audio';
  }
  if (
    lowerMime.startsWith('text/') ||
    /\.(txt|md|json|csv|log|html|css|js|ts)$/i.test(lowerName)
  ) {
    return 'text';
  }
  return 'other';
}

/**
 * Formats byte size into human readable string
 */
export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Unified Media Storage & Attachment Service
 */
class MediaService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryAttachments: Map<string, { meta: CanonicalAttachment; blob?: Blob }> = new Map();
  private objectUrls: Map<string, string> = new Map(); // attachmentId -> objectUrl for lifecycle management
  private changeListeners: Set<() => void> = new Set();

  constructor() {
    // Purge memory cache and revoke all object URLs when vault is locked
    vaultEncryptionService.subscribeLockStateChange((status) => {
      if (status === 'locked') {
        this.clearMemoryCache();
        this.revokeAllObjectUrls();
        this.notifyChange();
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in media service listener:', err);
      }
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_MEDIA_ATTACHMENTS)) {
          const store = db.createObjectStore(STORE_MEDIA_ATTACHMENTS, { keyPath: 'id' });
          store.createIndex('kind', 'kind', { unique: false });
          store.createIndex('hash', 'hash', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public clearMemoryCache(): void {
    this.memoryAttachments.clear();
  }

  public revokeAllObjectUrls(): void {
    for (const [, url] of this.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    this.objectUrls.clear();
  }

  public revokeObjectUrl(attachmentId: string): void {
    const url = this.objectUrls.get(attachmentId);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      this.objectUrls.delete(attachmentId);
    }
  }

  /**
   * Encrypt attachment data if vault encryption is active
   */
  private async processAttachmentForSave(
    meta: CanonicalAttachment,
    blobOrDataUrl?: Blob | Uint8Array | string
  ): Promise<any> {
    let serializedBlobData: any = null;

    if (blobOrDataUrl instanceof Blob) {
      if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
        const arrayBuf = await blobOrDataUrl.arrayBuffer();
        const encryptedBytes = await vaultEncryptionService.encryptBinary(new Uint8Array(arrayBuf));
        serializedBlobData = {
          isEncryptedBlob: true,
          mimeType: blobOrDataUrl.type || meta.mimeType,
          encrypted: encryptedBytes,
        };
      } else {
        serializedBlobData = blobOrDataUrl;
      }
    } else if (blobOrDataUrl instanceof Uint8Array) {
      if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
        const encryptedBytes = await vaultEncryptionService.encryptBinary(blobOrDataUrl);
        serializedBlobData = {
          isEncryptedBlob: true,
          mimeType: meta.mimeType,
          encrypted: encryptedBytes,
        };
      } else {
        serializedBlobData = new Blob([blobOrDataUrl], { type: meta.mimeType });
      }
    } else if (typeof blobOrDataUrl === 'string' && blobOrDataUrl.startsWith('data:')) {
      if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
        return await vaultEncryptionService.encryptRecord(meta.id, 'media_attachment', {
          ...meta,
          dataUrl: blobOrDataUrl,
        });
      }
      return {
        ...meta,
        dataUrl: blobOrDataUrl,
      };
    }

    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      return await vaultEncryptionService.encryptRecord(meta.id, 'media_attachment', {
        ...meta,
        blobData: serializedBlobData,
      });
    }

    return {
      ...meta,
      blobData: serializedBlobData,
    };
  }

  /**
   * Decrypt and deserialize attachment record
   */
  private async processAttachmentFromLoad(
    record: any
  ): Promise<{ meta: CanonicalAttachment; blob?: Blob } | null> {
    if (!record) return null;
    let data = record;

    if (record.isEncrypted) {
      if (!vaultEncryptionService.isVaultUnlocked()) {
        return null;
      }
      try {
        data = await vaultEncryptionService.decryptRecord(record);
      } catch (err) {
        console.error('Failed to decrypt media attachment record:', err);
        return null;
      }
    }

    const { blobData, ...meta } = data;
    let finalBlob: Blob | undefined = undefined;

    if (blobData) {
      if (blobData.isEncryptedBlob && blobData.encrypted) {
        if (vaultEncryptionService.isVaultUnlocked()) {
          try {
            const decryptedBytes = await vaultEncryptionService.decryptBinary(blobData.encrypted);
            finalBlob = new Blob([decryptedBytes], { type: blobData.mimeType || meta.mimeType || 'application/octet-stream' });
          } catch (err) {
            console.error('Failed to decrypt media attachment blob bytes:', err);
          }
        }
      } else if (blobData instanceof Blob) {
        finalBlob = blobData;
      }
    }

    return {
      meta: meta as CanonicalAttachment,
      blob: finalBlob,
    };
  }

  /**
   * Save or update an attachment in canonical storage
   */
  public async saveAttachment(
    attachment: CanonicalAttachment,
    payload?: Blob | Uint8Array | string
  ): Promise<CanonicalAttachment> {
    // If it's a PDF, also synchronize with pdfStorageService
    if (attachment.kind === 'pdf') {
      const pdfMeta: PDFAttachment = {
        id: attachment.id,
        name: attachment.filename,
        size: attachment.size,
        createdAt: new Date(attachment.createdAt).toISOString(),
        pageCount: attachment.pageCount || 1,
        title: attachment.title,
        author: attachment.author,
        year: attachment.year,
        doi: attachment.doi,
        arxivId: attachment.arxivId,
        url: attachment.url,
      };
      let blobPayload: Blob | undefined = undefined;
      if (payload instanceof Blob) {
        blobPayload = payload;
      } else if (payload instanceof Uint8Array) {
        blobPayload = new Blob([payload], { type: 'application/pdf' });
      }
      await pdfStorageService.savePDFAttachment(pdfMeta, blobPayload);
    }

    // Cache in memory
    const memoryBlob = payload instanceof Blob
      ? payload
      : payload instanceof Uint8Array
      ? new Blob([payload], { type: attachment.mimeType })
      : undefined;

    this.memoryAttachments.set(attachment.id, {
      meta: { ...attachment },
      blob: memoryBlob,
    });

    // Invalidate any existing object URL if payload updated
    this.revokeObjectUrl(attachment.id);

    try {
      const db = await this.getDB();
      const processed = await this.processAttachmentForSave(attachment, payload);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA_ATTACHMENTS, 'readwrite');
        const store = tx.objectStore(STORE_MEDIA_ATTACHMENTS);
        const req = store.put(processed);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('MediaService: IndexedDB write skipped or failed, memory cache preserved:', err);
    }

    this.notifyChange();
    return attachment;
  }

  /**
   * Get single attachment metadata and cached blob
   */
  public async getAttachment(id: string): Promise<CanonicalAttachment | null> {
    if (!id) return null;

    // Check memory cache
    const mem = this.memoryAttachments.get(id);
    if (mem) return mem.meta;

    // Check PDF storage
    if (id.startsWith('pdf-') || id.includes('pdf')) {
      const pdfItem = await pdfStorageService.getPDFAttachment(id);
      if (pdfItem && pdfItem.attachment) {
        const pdf = pdfItem.attachment;
        const canon: CanonicalAttachment = {
          id: pdf.id,
          filename: pdf.name,
          kind: 'pdf',
          mimeType: 'application/pdf',
          size: pdf.size || 0,
          createdAt: new Date(pdf.createdAt).getTime() || Date.now(),
          updatedAt: new Date(pdf.updatedAt || pdf.createdAt).getTime() || Date.now(),
          pageCount: pdf.pageCount,
          title: pdf.title,
          author: pdf.author,
          year: (pdf as any).year,
          doi: (pdf as any).doi,
          arxivId: (pdf as any).arxivId,
          url: (pdf as any).url,
        };
        this.memoryAttachments.set(id, { meta: canon, blob: pdfItem.blob });
        return canon;
      }
    }

    // Load from IndexedDB
    try {
      const db = await this.getDB();
      const record = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA_ATTACHMENTS, 'readonly');
        const store = tx.objectStore(STORE_MEDIA_ATTACHMENTS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (record) {
        const processed = await this.processAttachmentFromLoad(record);
        if (processed) {
          this.memoryAttachments.set(id, processed);
          return processed.meta;
        }
      }
    } catch (err) {
      console.warn(`MediaService: Failed to load attachment ${id} from DB:`, err);
    }

    return null;
  }

  /**
   * Get attachment binary Blob
   */
  public async getAttachmentBlob(id: string): Promise<Blob | null> {
    const mem = this.memoryAttachments.get(id);
    if (mem?.blob) return mem.blob;

    // Check PDF storage
    if (id.startsWith('pdf-') || id.includes('pdf')) {
      const pdfItem = await pdfStorageService.getPDFAttachment(id);
      if (pdfItem?.blob) {
        if (mem) mem.blob = pdfItem.blob;
        return pdfItem.blob;
      }
    }

    try {
      const db = await this.getDB();
      const record = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA_ATTACHMENTS, 'readonly');
        const store = tx.objectStore(STORE_MEDIA_ATTACHMENTS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (record) {
        const processed = await this.processAttachmentFromLoad(record);
        if (processed) {
          this.memoryAttachments.set(id, processed);
          if (processed.blob) return processed.blob;
          if (processed.meta.dataUrl) {
            const { bytes, mimeType } = this.dataUrlToBytes(processed.meta.dataUrl);
            const b = new Blob([bytes], { type: mimeType });
            processed.blob = b;
            return b;
          }
        }
      }
    } catch (err) {
      console.warn(`MediaService: Failed to get blob for attachment ${id}:`, err);
    }

    return null;
  }

  /**
   * Get or create a managed Object URL for preview/playback
   */
  public async getAttachmentObjectUrl(id: string): Promise<string | null> {
    const existing = this.objectUrls.get(id);
    if (existing) return existing;

    const blob = await this.getAttachmentBlob(id);
    if (!blob) {
      // Check if dataUrl exists
      const meta = await this.getAttachment(id);
      if (meta?.dataUrl) return meta.dataUrl;
      return null;
    }

    try {
      const url = URL.createObjectURL(blob);
      this.objectUrls.set(id, url);
      return url;
    } catch (err) {
      console.error('Failed to create object URL for attachment:', err);
      return null;
    }
  }

  /**
   * Delete an attachment from storage
   */
  public async deleteAttachment(id: string): Promise<void> {
    this.memoryAttachments.delete(id);
    this.revokeObjectUrl(id);

    // If PDF, also delete from pdfStorageService
    if (id.startsWith('pdf-') || id.includes('pdf')) {
      await pdfStorageService.deletePDFAttachment(id);
    }

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA_ATTACHMENTS, 'readwrite');
        const store = tx.objectStore(STORE_MEDIA_ATTACHMENTS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`MediaService: Failed to delete attachment ${id} from DB:`, err);
    }

    this.notifyChange();
  }

  /**
   * Delete multiple unreferenced attachments in bulk
   */
  public async deleteUnreferencedAttachments(
    attachmentIds: string[]
  ): Promise<{ deleted: number; freedBytes: number }> {
    let deleted = 0;
    let freedBytes = 0;

    for (const id of attachmentIds) {
      const meta = await this.getAttachment(id);
      if (meta) {
        freedBytes += meta.size || 0;
        await this.deleteAttachment(id);
        deleted++;
      }
    }

    return { deleted, freedBytes };
  }

  /**
   * Update attachment metadata (filename, title, authors, etc.)
   */
  public async updateAttachmentMetadata(
    id: string,
    updates: Partial<CanonicalAttachment>
  ): Promise<CanonicalAttachment | null> {
    const existing = await this.getAttachment(id);
    if (!existing) return null;

    const updated: CanonicalAttachment = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    // If kind or filename changed, recompute kind
    if (updates.filename && !updates.kind) {
      updated.kind = detectAttachmentKind(updated.mimeType, updates.filename);
    }

    const blob = await this.getAttachmentBlob(id);
    await this.saveAttachment(updated, blob || updated.dataUrl);
    return updated;
  }

  /**
   * Get all canonical attachments across storage, PDFs, and active notes
   */
  public async getAllAttachments(notes: Note[] = []): Promise<CanonicalAttachment[]> {
    const attachmentMap = new Map<string, CanonicalAttachment>();

    const toTimestamp = (val: unknown): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const t = new Date(val).getTime();
        if (!isNaN(t)) return t;
      }
      return Date.now();
    };

    // 1. Fetch from Media DB
    try {
      const db = await this.getDB();
      const records = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA_ATTACHMENTS, 'readonly');
        const store = tx.objectStore(STORE_MEDIA_ATTACHMENTS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const rec of records) {
        const processed = await this.processAttachmentFromLoad(rec);
        if (processed) {
          attachmentMap.set(processed.meta.id, processed.meta);
          if (!this.memoryAttachments.has(processed.meta.id)) {
            this.memoryAttachments.set(processed.meta.id, processed);
          }
        }
      }
    } catch (err) {
      console.warn('MediaService: Could not read all from DB, using memory/fallback:', err);
    }

    // 2. Fetch from PDF Storage Service
    try {
      const pdfs = await pdfStorageService.getAllPDFAttachments();
      for (const pdf of pdfs) {
        if (!attachmentMap.has(pdf.id)) {
          const canon: CanonicalAttachment = {
            id: pdf.id,
            filename: pdf.name,
            kind: 'pdf',
            mimeType: 'application/pdf',
            size: pdf.size || 0,
            createdAt: toTimestamp(pdf.createdAt),
            updatedAt: toTimestamp(pdf.updatedAt || pdf.createdAt),
            pageCount: pdf.pageCount,
            title: pdf.title,
            author: pdf.author,
            year: (pdf as any).year,
            doi: (pdf as any).doi,
            arxivId: (pdf as any).arxivId,
            url: (pdf as any).url,
          };
          attachmentMap.set(pdf.id, canon);
        }
      }
    } catch (err) {
      console.warn('MediaService: Error loading PDFs from storage:', err);
    }

    // 3. Extract embedded attachments from Note objects (note.images, note.audios)
    for (const note of notes) {
      if (!note || note.trashed) continue;

      if (Array.isArray(note.images)) {
        for (const img of note.images) {
          if (!img.id) continue;
          if (!attachmentMap.has(img.id)) {
            const canon: CanonicalAttachment = {
              id: img.id,
              filename: img.name || `Image-${img.id.slice(0, 6)}.png`,
              kind: 'image',
              mimeType: this.guessMimeFromDataUrl(img.dataUrl, 'image/png'),
              size: img.size || (img.dataUrl ? Math.round(img.dataUrl.length * 0.75) : 0),
              createdAt: toTimestamp(note.createdAt),
              updatedAt: toTimestamp(note.updatedAt || note.createdAt),
              sourceNoteId: note.id,
              dataUrl: img.dataUrl,
            };
            attachmentMap.set(img.id, canon);
          }
        }
      }

      if (Array.isArray(note.audios)) {
        for (const aud of note.audios) {
          if (!aud.id) continue;
          if (!attachmentMap.has(aud.id)) {
            const canon: CanonicalAttachment = {
              id: aud.id,
              filename: aud.name || `Audio-${aud.id.slice(0, 6)}.webm`,
              kind: 'audio',
              mimeType: this.guessMimeFromDataUrl(aud.dataUrl, 'audio/webm'),
              size: aud.dataUrl ? Math.round(aud.dataUrl.length * 0.75) : 0,
              createdAt: toTimestamp(aud.createdAt || note.createdAt),
              updatedAt: toTimestamp(aud.createdAt || note.updatedAt || note.createdAt),
              duration: aud.duration,
              sourceNoteId: note.id,
              dataUrl: aud.dataUrl,
            };
            attachmentMap.set(aud.id, canon);
          }
        }
      }
    }

    return Array.from(attachmentMap.values());
  }

  /**
   * Find all notes referencing a specific attachment (by ID, filename, or PDF citation)
   */
  public findAttachmentReferences(
    attachmentId: string,
    filename: string,
    notes: Note[],
    vaultIndex?: VaultIndex
  ): AttachmentReference[] {
    const references: AttachmentReference[] = [];
    if (!attachmentId && !filename) return references;

    const lowerName = (filename || '').toLowerCase().trim();
    const idToFind = (attachmentId || '').trim();

    for (const note of notes) {
      if (!note || note.trashed) continue;
      const content = note.content || '';
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        // 1. Direct ID occurrence
        if (idToFind && line.includes(idToFind)) {
          // Check for PDF target
          const pdfTarget = parsePDFTarget(idToFind) || (line.includes('[[pdf:') ? parsePDFTarget(line) : null);
          references.push({
            noteId: note.id,
            noteTitle: note.title || 'Untitled Note',
            line: lineIndex,
            raw: line.trim(),
            snippet: line.trim(),
            page: pdfTarget?.page,
            highlightId: pdfTarget?.highlightId,
          });
          continue;
        }

        // 2. Direct filename occurrence (e.g. ![[image.png]] or [doc](filename))
        if (lowerName && line.toLowerCase().includes(lowerName)) {
          references.push({
            noteId: note.id,
            noteTitle: note.title || 'Untitled Note',
            line: lineIndex,
            raw: line.trim(),
            snippet: line.trim(),
          });
          continue;
        }

        // 3. Check for pdf: citations referencing this attachment ID
        if (idToFind && line.includes('[[pdf:')) {
          const match = line.match(/\[\[pdf:([^#|\]]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/);
          if (match && match[1].trim() === idToFind) {
            const subpath = match[2] || '';
            const pageMatch = subpath.match(/page=(\d+)/);
            const hlMatch = subpath.match(/highlight=([^&]+)/);
            references.push({
              noteId: note.id,
              noteTitle: note.title || 'Untitled Note',
              line: lineIndex,
              raw: match[0],
              snippet: line.trim(),
              page: pageMatch ? parseInt(pageMatch[1], 10) : undefined,
              highlightId: hlMatch ? hlMatch[1] : undefined,
            });
            continue;
          }
        }
      }

      // Check note image/audio object lists
      if (idToFind) {
        if (note.images?.some((img) => img.id === idToFind || img.name === filename)) {
          if (!references.some((r) => r.noteId === note.id && r.line === 0)) {
            references.push({
              noteId: note.id,
              noteTitle: note.title || 'Untitled Note',
              line: 0,
              raw: `Attached image: ${filename || idToFind}`,
              snippet: `Embedded in note image attachments`,
            });
          }
        }
        if (note.audios?.some((aud) => aud.id === idToFind || aud.name === filename)) {
          if (!references.some((r) => r.noteId === note.id && r.line === 0)) {
            references.push({
              noteId: note.id,
              noteTitle: note.title || 'Untitled Note',
              line: 0,
              raw: `Attached audio: ${filename || idToFind}`,
              snippet: `Embedded in note audio attachments`,
            });
          }
        }
      }
    }

    return references;
  }

  /**
   * Check if an attachment with identical content hash already exists
   */
  public async checkDuplicateAttachment(hash: string): Promise<CanonicalAttachment | null> {
    if (!hash) return null;
    const all = await this.getAllAttachments();
    return all.find((a) => a.hash === hash) || null;
  }

  /**
   * Helper to convert data URL to Uint8Array bytes
   */
  private dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
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
      const buffer = Buffer.from(base64Data, 'base64');
      return { bytes: new Uint8Array(buffer), mimeType };
    }
  }

  private guessMimeFromDataUrl(dataUrl?: string, fallback = 'application/octet-stream'): string {
    if (!dataUrl) return fallback;
    const match = dataUrl.match(/^data:([^;]+);/);
    return match ? match[1] : fallback;
  }
}

export const mediaService = new MediaService();
