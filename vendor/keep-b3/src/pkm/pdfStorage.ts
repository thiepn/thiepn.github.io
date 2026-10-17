import { PDFAttachment, PDFAnnotation } from './pdfTypes';
import { vaultEncryptionService, EncryptedRecord } from './encryption';

const PDF_DB_NAME = 'KeepNotes_PDF_DB';
const PDF_DB_VERSION = 1;
const STORE_PDF_ATTACHMENTS = 'pdf_attachments';
const STORE_PDF_ANNOTATIONS = 'pdf_annotations';

class PDFStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryAttachments: Map<string, { attachment: PDFAttachment; blob?: Blob }> = new Map();
  private memoryAnnotations: Map<string, PDFAnnotation> = new Map();

  constructor() {
    // Purge memory cache when vault is locked
    vaultEncryptionService.subscribeLockStateChange((status) => {
      if (status === 'locked') {
        this.clearMemoryCache();
      }
    });
  }

  private async processAttachmentForSave(attachment: PDFAttachment, blob?: Blob): Promise<any> {
    const rawBlob = blob || attachment.dataBlob;
    let serializedBlobData: any = rawBlob;

    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      if (rawBlob) {
        const arrayBuf = await rawBlob.arrayBuffer();
        const encryptedBytes = await vaultEncryptionService.encryptBinary(new Uint8Array(arrayBuf));
        serializedBlobData = {
          isEncryptedBlob: true,
          mimeType: rawBlob.type,
          encrypted: encryptedBytes,
        };
      }
      return await vaultEncryptionService.encryptRecord(attachment.id, 'pdf_attachment', {
        ...attachment,
        blobData: serializedBlobData,
      });
    }

    return {
      ...attachment,
      blobData: serializedBlobData,
    };
  }

  private async processAttachmentFromLoad(record: any): Promise<{ attachment: PDFAttachment; blob?: Blob } | null> {
    if (!record) return null;
    let data = record;

    if (record.isEncrypted) {
      if (!vaultEncryptionService.isVaultUnlocked()) {
        return null;
      }
      try {
        data = await vaultEncryptionService.decryptRecord(record);
      } catch (err) {
        console.error('Failed to decrypt PDF attachment record:', err);
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
            finalBlob = new Blob([decryptedBytes], { type: blobData.mimeType || 'application/pdf' });
          } catch (err) {
            console.error('Failed to decrypt attachment blob bytes:', err);
          }
        }
      } else if (blobData instanceof Blob) {
        finalBlob = blobData;
      }
    }

    return {
      attachment: meta as PDFAttachment,
      blob: finalBlob,
    };
  }

  private async processAnnotationForSave(annotation: PDFAnnotation): Promise<any> {
    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      return await vaultEncryptionService.encryptRecord(annotation.id, 'pdf_annotation', annotation);
    }
    return annotation;
  }

  private async processAnnotationFromLoad(record: any): Promise<PDFAnnotation | null> {
    if (!record) return null;
    if (record.isEncrypted) {
      if (!vaultEncryptionService.isVaultUnlocked()) {
        return null;
      }
      try {
        return await vaultEncryptionService.decryptRecord<PDFAnnotation>(record);
      } catch (err) {
        console.error('Failed to decrypt PDF annotation:', err);
        return null;
      }
    }
    return record as PDFAnnotation;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PDF_ATTACHMENTS)) {
          const store = db.createObjectStore(STORE_PDF_ATTACHMENTS, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_PDF_ANNOTATIONS)) {
          const store = db.createObjectStore(STORE_PDF_ANNOTATIONS, { keyPath: 'id' });
          store.createIndex('pdfId', 'pdfId', { unique: false });
          store.createIndex('page', 'page', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- PDF Attachments ---

  async savePDFAttachment(attachment: PDFAttachment, blob?: Blob): Promise<void> {
    this.memoryAttachments.set(attachment.id, { attachment, blob });

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ATTACHMENTS, 'readwrite');
      const store = tx.objectStore(STORE_PDF_ATTACHMENTS);
      
      const record = await this.processAttachmentForSave(attachment, blob);
      
      store.put(record);
      await this.txPromise(tx);
    } catch (err) {
      console.warn('PDFStorage: IndexedDB save failed, using memory store fallback:', err);
    }
  }

  async getPDFAttachment(id: string): Promise<{ attachment: PDFAttachment; blob?: Blob } | null> {
    if (vaultEncryptionService.isVaultLocked()) {
      return null;
    }

    // Check memory first
    const mem = this.memoryAttachments.get(id);
    if (mem && mem.blob) {
      return mem;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ATTACHMENTS, 'readonly');
      const store = tx.objectStore(STORE_PDF_ATTACHMENTS);
      const req = store.get(id);

      const raw = await new Promise<any>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (!raw) {
        return mem || null;
      }

      const result = await this.processAttachmentFromLoad(raw);
      if (result) {
        this.memoryAttachments.set(id, result);
      }
      return result;
    } catch {
      return mem || null;
    }
  }

  async getAllPDFAttachments(): Promise<PDFAttachment[]> {
    if (vaultEncryptionService.isVaultLocked()) {
      return [];
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ATTACHMENTS, 'readonly');
      const store = tx.objectStore(STORE_PDF_ATTACHMENTS);
      const req = store.getAll();

      const rawRecords = await new Promise<any[]>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const loaded = (
        await Promise.all(rawRecords.map((r) => this.processAttachmentFromLoad(r)))
      ).filter((item): item is { attachment: PDFAttachment; blob?: Blob } => item !== null);

      const list = loaded.map((item) => item.attachment);

      // Merge memory records if not already in DB
      for (const [id, item] of this.memoryAttachments.entries()) {
        if (!list.some((a) => a.id === id)) {
          list.push(item.attachment);
        }
      }

      return list;
    } catch {
      return Array.from(this.memoryAttachments.values()).map((i) => i.attachment);
    }
  }

  async deletePDFAttachment(id: string): Promise<void> {
    this.memoryAttachments.delete(id);

    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_PDF_ATTACHMENTS, STORE_PDF_ANNOTATIONS], 'readwrite');
      tx.objectStore(STORE_PDF_ATTACHMENTS).delete(id);

      // Also remove associated annotations
      const annotStore = tx.objectStore(STORE_PDF_ANNOTATIONS);
      const index = annotStore.index('pdfId');
      const req = index.getAllKeys(id);
      
      req.onsuccess = () => {
        const keys = req.result;
        for (const key of keys) {
          annotStore.delete(key);
        }
      };

      await this.txPromise(tx);
    } catch (err) {
      console.warn('PDFStorage: IndexedDB delete failed:', err);
    }

    // Clean up memory annotations
    for (const [annId, ann] of this.memoryAnnotations.entries()) {
      if (ann.pdfId === id) {
        this.memoryAnnotations.delete(annId);
      }
    }
  }

  // --- PDF Annotations / Highlights ---

  async savePDFAnnotation(annotation: PDFAnnotation): Promise<void> {
    this.memoryAnnotations.set(annotation.id, annotation);

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ANNOTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_PDF_ANNOTATIONS);
      const record = await this.processAnnotationForSave(annotation);
      store.put(record);
      await this.txPromise(tx);
    } catch {
      // Memory fallback persisted
    }
  }

  async getAnnotationsForPDF(pdfId: string): Promise<PDFAnnotation[]> {
    if (vaultEncryptionService.isVaultLocked()) {
      return [];
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ANNOTATIONS, 'readonly');
      const store = tx.objectStore(STORE_PDF_ANNOTATIONS);
      const index = store.index('pdfId');
      const req = index.getAll(pdfId);

      const rawRecords = await new Promise<any[]>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const records = (
        await Promise.all(rawRecords.map((r) => this.processAnnotationFromLoad(r)))
      ).filter((r): r is PDFAnnotation => r !== null);

      // Merge memory
      const map = new Map<string, PDFAnnotation>();
      for (const r of records) {
        map.set(r.id, r);
      }
      for (const ann of this.memoryAnnotations.values()) {
        if (ann.pdfId === pdfId) {
          map.set(ann.id, ann);
        }
      }

      return Array.from(map.values()).sort((a, b) => a.page - b.page);
    } catch {
      return Array.from(this.memoryAnnotations.values())
        .filter((a) => a.pdfId === pdfId)
        .sort((a, b) => a.page - b.page);
    }
  }

  async deletePDFAnnotation(annotationId: string): Promise<void> {
    this.memoryAnnotations.delete(annotationId);

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ANNOTATIONS, 'readwrite');
      tx.objectStore(STORE_PDF_ANNOTATIONS).delete(annotationId);
      await this.txPromise(tx);
    } catch {
      // Memory deleted
    }
  }

  async getAllAnnotations(): Promise<PDFAnnotation[]> {
    if (vaultEncryptionService.isVaultLocked()) {
      return [];
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_PDF_ANNOTATIONS, 'readonly');
      const store = tx.objectStore(STORE_PDF_ANNOTATIONS);
      const req = store.getAll();

      const rawRecords = await new Promise<any[]>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const records = (
        await Promise.all(rawRecords.map((r) => this.processAnnotationFromLoad(r)))
      ).filter((r): r is PDFAnnotation => r !== null);

      const map = new Map<string, PDFAnnotation>();
      for (const r of records) map.set(r.id, r);
      for (const ann of this.memoryAnnotations.values()) map.set(ann.id, ann);

      return Array.from(map.values());
    } catch {
      return Array.from(this.memoryAnnotations.values());
    }
  }

  // Clear memory cache for tests or resets
  clearMemoryCache() {
    this.memoryAttachments.clear();
    this.memoryAnnotations.clear();
  }

  private txPromise(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

export const pdfStorageService = new PDFStorageService();
