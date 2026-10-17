/**
 * KEEP CRDT Note Adapter
 * Bridges standard KEEP Note data structures to Yjs CRDT Documents.
 * Provides character-level conflict-free text editing, checklist item merging,
 * tag set convergence, and state vector delta computation.
 */

import * as Y from 'yjs';
import { Note, ChecklistItem, NoteColorKey } from '../../../types';

export class CRDTNoteAdapter {
  /**
   * Helper to convert Uint8Array to base64
   */
  public static uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper to convert base64 to Uint8Array
   */
  public static base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Creates a new Y.Doc initialized with the contents of a Note
   */
  public static createDocFromNote(note: Note, clientID?: number): Y.Doc {
    const doc = new Y.Doc();
    if (clientID !== undefined) {
      doc.clientID = clientID;
    }

    doc.transact(() => {
      // 1. Text Content
      const yText = doc.getText('content');
      yText.delete(0, yText.length);
      if (note.content) {
        yText.insert(0, note.content);
      }

      // 2. Metadata Map
      const metaMap = doc.getMap('meta');
      metaMap.set('id', note.id);
      metaMap.set('title', note.title || '');
      metaMap.set('color', note.color || 'default');
      metaMap.set('folderId', note.folderId ?? null);
      metaMap.set('pinned', Boolean(note.pinned));
      metaMap.set('archived', Boolean(note.archived));
      metaMap.set('trashed', Boolean(note.trashed));
      metaMap.set('type', note.type || 'text');
      metaMap.set('reminderDate', note.reminderDate ?? null);
      metaMap.set('createdAt', note.createdAt || new Date().toISOString());
      metaMap.set('updatedAt', note.updatedAt || new Date().toISOString());

      // 3. Linked Note IDs
      const linksArray = doc.getArray<string>('linkedNoteIds');
      linksArray.delete(0, linksArray.length);
      if (note.linkedNoteIds && note.linkedNoteIds.length > 0) {
        linksArray.push(note.linkedNoteIds);
      }

      // 4. Images / Attachments
      const imagesArray = doc.getArray<string>('images');
      imagesArray.delete(0, imagesArray.length);
      if (note.images && note.images.length > 0) {
        imagesArray.push(note.images.map((img) => JSON.stringify(img)));
      }

      // 5. Tags Map for deterministic add/remove convergence
      const tagsMap = doc.getMap<boolean>('tags');
      // Clear existing tags
      tagsMap.forEach((_, key) => tagsMap.delete(key));
      if (note.tags) {
        for (const tag of note.tags) {
          tagsMap.set(tag, true);
        }
      }

      // 6. Checklist Items Array of Maps
      const checklistArray = doc.getArray<Y.Map<any>>('checklist');
      checklistArray.delete(0, checklistArray.length);
      if (note.checklist && note.checklist.length > 0) {
        for (const item of note.checklist) {
          const itemMap = new Y.Map<any>();
          itemMap.set('id', item.id);
          itemMap.set('text', item.text);
          itemMap.set('completed', Boolean(item.completed));
          checklistArray.push([itemMap]);
        }
      }
    });

    return doc;
  }

  /**
   * Applies modifications from a Note object to an existing Y.Doc
   * Uses minimal text diffing to preserve character-level concurrency.
   */
  public static updateDocFromNote(doc: Y.Doc, note: Note): void {
    doc.transact(() => {
      // 1. Text Content with prefix/suffix preservation
      const yText = doc.getText('content');
      const currentText = yText.toString();
      const newText = note.content || '';

      if (currentText !== newText) {
        this.applyTextDiff(yText, currentText, newText);
      }

      // 2. Metadata (only write changed values so concurrent field edits on peers don't overwrite each other)
      const metaMap = doc.getMap('meta');
      const setIfDiff = (key: string, val: any) => {
        if (metaMap.get(key) !== val) {
          metaMap.set(key, val);
        }
      };

      setIfDiff('title', note.title || '');
      setIfDiff('color', note.color || 'default');
      setIfDiff('folderId', note.folderId ?? null);
      setIfDiff('pinned', Boolean(note.pinned));
      setIfDiff('archived', Boolean(note.archived));
      setIfDiff('trashed', Boolean(note.trashed));
      setIfDiff('type', note.type || 'text');
      setIfDiff('reminderDate', note.reminderDate ?? null);
      setIfDiff('updatedAt', note.updatedAt || new Date().toISOString());

      // 3. Linked Note IDs
      const linksArray = doc.getArray<string>('linkedNoteIds');
      const currentLinks = linksArray.toArray();
      const newLinks = note.linkedNoteIds || [];
      if (JSON.stringify(currentLinks) !== JSON.stringify(newLinks)) {
        linksArray.delete(0, linksArray.length);
        if (newLinks.length > 0) linksArray.push(newLinks);
      }

      // 4. Images
      const imagesArray = doc.getArray<string>('images');
      const currentImages = imagesArray.toArray();
      const serializedNewImages = (note.images || []).map((img) => JSON.stringify(img));
      if (JSON.stringify(currentImages) !== JSON.stringify(serializedNewImages)) {
        imagesArray.delete(0, imagesArray.length);
        if (serializedNewImages.length > 0) imagesArray.push(serializedNewImages);
      }

      // 5. Tags Map
      const tagsMap = doc.getMap<boolean>('tags');
      const newTagsSet = new Set(note.tags || []);
      // Remove tags not in new note
      tagsMap.forEach((_, tag) => {
        if (!newTagsSet.has(tag)) {
          tagsMap.delete(tag);
        }
      });
      // Add new tags
      for (const tag of newTagsSet) {
        if (!tagsMap.has(tag)) {
          tagsMap.set(tag, true);
        }
      }

      // 6. Checklist
      const checklistArray = doc.getArray<Y.Map<any>>('checklist');
      const newChecklist = note.checklist || [];
      const currentItemsMap = new Map<string, Y.Map<any>>();

      checklistArray.forEach((map) => {
        const id = map.get('id');
        if (id) currentItemsMap.set(id, map);
      });

      const newIds = new Set(newChecklist.map((c) => c.id));

      // Remove deleted items
      for (let i = checklistArray.length - 1; i >= 0; i--) {
        const map = checklistArray.get(i);
        const id = map.get('id');
        if (id && !newIds.has(id)) {
          checklistArray.delete(i, 1);
        }
      }

      // Update existing or append new
      for (let i = 0; i < newChecklist.length; i++) {
        const item = newChecklist[i];
        const existingMap = currentItemsMap.get(item.id);
        if (existingMap) {
          if (existingMap.get('text') !== item.text) {
            existingMap.set('text', item.text);
          }
          if (existingMap.get('completed') !== item.completed) {
            existingMap.set('completed', Boolean(item.completed));
          }
        } else {
          const newMap = new Y.Map<any>();
          newMap.set('id', item.id);
          newMap.set('text', item.text);
          newMap.set('completed', Boolean(item.completed));
          checklistArray.push([newMap]);
        }
      }
    });
  }

  /**
   * Applies minimal diff to Y.Text by identifying common prefix and suffix
   */
  private static applyTextDiff(yText: Y.Text, oldStr: string, newStr: string): void {
    let start = 0;
    while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
      start++;
    }

    let oldEnd = oldStr.length;
    let newEnd = newStr.length;
    while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    const deleteLength = oldEnd - start;
    const insertStr = newStr.slice(start, newEnd);

    if (deleteLength > 0) {
      yText.delete(start, deleteLength);
    }
    if (insertStr.length > 0) {
      yText.insert(start, insertStr);
    }
  }

  /**
   * Extracts a standard Note object from a Y.Doc
   */
  public static extractNoteFromDoc(doc: Y.Doc, fallbackId?: string): Note {
    const metaMap = doc.getMap('meta');
    const yText = doc.getText('content');
    const tagsMap = doc.getMap<boolean>('tags');
    const checklistArray = doc.getArray<Y.Map<any>>('checklist');
    const linksArray = doc.getArray<string>('linkedNoteIds');
    const imagesArray = doc.getArray<string>('images');

    const id = (metaMap.get('id') as string) || fallbackId || 'note-unknown';
    const title = (metaMap.get('title') as string) || '';
    const color = ((metaMap.get('color') as NoteColorKey) || 'default');
    const folderId = (metaMap.get('folderId') as string | null) ?? null;
    const pinned = Boolean(metaMap.get('pinned'));
    const archived = Boolean(metaMap.get('archived'));
    const trashed = Boolean(metaMap.get('trashed'));
    const type = ((metaMap.get('type') as 'text' | 'checklist') || 'text');
    const reminderDate = (metaMap.get('reminderDate') as string | null) ?? null;
    const createdAt = (metaMap.get('createdAt') as string) || new Date().toISOString();
    const updatedAt = (metaMap.get('updatedAt') as string) || new Date().toISOString();

    const tags: string[] = [];
    tagsMap.forEach((val, key) => {
      if (val) tags.push(key);
    });

    const checklist: ChecklistItem[] = [];
    checklistArray.forEach((map) => {
      if (map && map.get) {
        checklist.push({
          id: map.get('id') || `chk-${Math.random().toString(36).slice(2, 8)}`,
          text: map.get('text') || '',
          completed: Boolean(map.get('completed')),
        });
      }
    });

    return {
      id,
      title,
      content: yText.toString(),
      type,
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
      images: imagesArray.toArray().map((s) => {
        try {
          return typeof s === 'string' ? JSON.parse(s) : s;
        } catch {
          return { id: 'img-legacy', name: 'image', dataUrl: String(s) };
        }
      }),
      linkedNoteIds: linksArray.toArray(),
    };
  }

  /**
   * Encodes state vector of a Y.Doc as Uint8Array
   */
  public static encodeStateVector(doc: Y.Doc): Uint8Array {
    return Y.encodeStateVector(doc);
  }

  /**
   * Encodes differential update since a remote state vector
   */
  public static encodeStateAsUpdate(doc: Y.Doc, targetStateVector?: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(doc, targetStateVector);
  }

  /**
   * Compacts entire document into a single snapshot update
   */
  public static compactDocSnapshot(doc: Y.Doc): Uint8Array {
    return Y.encodeStateAsUpdate(doc);
  }

  /**
   * Applies an incoming incremental update to a Y.Doc
   */
  public static applyUpdate(doc: Y.Doc, update: Uint8Array, origin?: any): void {
    Y.applyUpdate(doc, update, origin);
  }
}
