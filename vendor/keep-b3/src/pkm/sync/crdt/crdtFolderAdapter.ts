/**
 * KEEP CRDT Folder & Canvas Entity Adapter
 * Bridges Folders and Canvases to Yjs Documents for conflict-free hierarchy sync.
 */

import * as Y from 'yjs';
import { Folder } from '../../../types';
import { CanvasBoard } from '../../canvasTypes';

export class CRDTFolderAdapter {
  public static createDocFromFolder(folder: Folder, clientID?: number): Y.Doc {
    const doc = new Y.Doc();
    if (clientID !== undefined) doc.clientID = clientID;

    doc.transact(() => {
      const meta = doc.getMap('meta');
      meta.set('id', folder.id);
      meta.set('name', folder.name);
      meta.set('color', folder.color);
      meta.set('icon', folder.icon || 'Folder');
      meta.set('createdAt', folder.createdAt || new Date().toISOString());
    });

    return doc;
  }

  public static updateDocFromFolder(doc: Y.Doc, folder: Folder): void {
    doc.transact(() => {
      const meta = doc.getMap('meta');
      meta.set('name', folder.name);
      meta.set('color', folder.color);
      meta.set('icon', folder.icon || 'Folder');
    });
  }

  public static extractFolderFromDoc(doc: Y.Doc, fallbackId?: string): Folder {
    const meta = doc.getMap('meta');
    return {
      id: (meta.get('id') as string) || fallbackId || 'folder-unknown',
      name: (meta.get('name') as string) || 'Untitled Folder',
      color: (meta.get('color') as string) || 'blue',
      icon: (meta.get('icon') as string) || 'Folder',
      createdAt: (meta.get('createdAt') as string) || new Date().toISOString(),
    };
  }
}
