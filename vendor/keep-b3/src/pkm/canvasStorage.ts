import { CanvasBoard, CanvasNode, CanvasConnector, CanvasStroke, CanvasTransform } from './canvasTypes';
import { vaultEncryptionService, EncryptedRecord } from './encryption';

const CANVAS_DB_NAME = 'KeepNotes_Canvas_DB';
const CANVAS_DB_VERSION = 1;
const STORE_CANVAS_BOARDS = 'canvas_boards';

const DEFAULT_BOARD_ID = 'board-main';

export const INITIAL_MAIN_BOARD: CanvasBoard = {
  id: DEFAULT_BOARD_ID,
  title: 'Spatial Brainstorm',
  description: 'Infinite canvas workspace for connected thinking and spatial synthesis.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  transform: { panX: 80, panY: 80, zoom: 0.9 },
  backgroundStyle: 'dots',
  nodes: [
    {
      id: 'node-welcome',
      type: 'sticky',
      x: 100,
      y: 100,
      width: 260,
      height: 180,
      zIndex: 1,
      text: '🧠 **Spatial Canvas**\n\n- Non-linear visual thinking\n- Canonical note cards\n- Dynamic arrows & connectors\n- Grouping frames & freehand pen',
      color: '#fef08a', // light yellow
      fontSize: 'base',
      align: 'left',
    },
    {
      id: 'node-group-1',
      type: 'group',
      x: 420,
      y: 80,
      width: 320,
      height: 280,
      zIndex: 0,
      label: '🚀 Core Concepts',
      color: '#e0e7ff', // indigo tint
      containedNodeIds: ['node-sticky-idea'],
    },
    {
      id: 'node-sticky-idea',
      type: 'sticky',
      x: 450,
      y: 140,
      width: 260,
      height: 160,
      zIndex: 2,
      text: '💡 **Idea Hub**\n\nDrag canonical notes from your vault onto this infinite board. Links and notes stay in sync!',
      color: '#bae6fd', // light sky blue
      fontSize: 'base',
      align: 'left',
    },
  ],
  connectors: [
    {
      id: 'conn-1',
      fromNodeId: 'node-welcome',
      toNodeId: 'node-sticky-idea',
      fromSide: 'right',
      toSide: 'left',
      arrowDirection: 'forward',
      lineStyle: 'curved',
      color: '#6366f1',
      strokeWidth: 2,
      label: 'connects to',
    },
  ],
  strokes: [],
};

class CanvasStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryBoards: Map<string, CanvasBoard> = new Map();
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.memoryBoards.set(DEFAULT_BOARD_ID, { ...INITIAL_MAIN_BOARD });

    // Purge memory cache when vault is locked
    vaultEncryptionService.subscribeLockStateChange((status) => {
      if (status === 'locked') {
        this.memoryBoards.clear();
        for (const timeout of this.saveTimeouts.values()) {
          clearTimeout(timeout);
        }
        this.saveTimeouts.clear();
      }
    });
  }

  private async processBoardForSave(board: CanvasBoard): Promise<any> {
    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      return await vaultEncryptionService.encryptRecord(board.id, 'canvas', board);
    }
    return board;
  }

  /**
   * Sanitizes and migrates board nodes to ensure compliance with P27 canonical reference rules
   */
  public sanitizeAndMigrateBoard(board: CanvasBoard): CanvasBoard {
    if (!board || typeof board !== 'object') return INITIAL_MAIN_BOARD;

    const safeNodes: CanvasNode[] = (Array.isArray(board.nodes) ? board.nodes : []).map((rawNode: any) => {
      const id = rawNode.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const x = typeof rawNode.x === 'number' ? rawNode.x : 0;
      const y = typeof rawNode.y === 'number' ? rawNode.y : 0;
      const width = typeof rawNode.width === 'number' && rawNode.width > 20 ? rawNode.width : 280;
      const height = typeof rawNode.height === 'number' && rawNode.height > 20 ? rawNode.height : 180;
      const zIndex = typeof rawNode.zIndex === 'number' ? rawNode.zIndex : 1;
      const locked = Boolean(rawNode.locked);

      if (rawNode.type === 'note') {
        if (!rawNode.noteId) {
          // Orphan note node with content - safely preserve as text card
          return {
            id,
            type: 'sticky',
            x,
            y,
            width,
            height,
            zIndex,
            locked,
            text: rawNode.content || rawNode.text || 'Preserved Note Content',
            color: '#fef08a',
            fontSize: 'base',
            align: 'left',
          } as CanvasNode;
        }

        // P27 rule: Ensure no canonical markdown content copy is stored in Note node
        const { content, text, markdownContent, ...cleanNoteNode } = rawNode;
        return {
          ...cleanNoteNode,
          id,
          type: 'note',
          noteId: String(rawNode.noteId),
          x,
          y,
          width,
          height,
          zIndex,
          locked,
          showPreview: rawNode.showPreview !== false,
          collapsed: Boolean(rawNode.collapsed),
          previewLength: rawNode.previewLength || 'medium',
          hideProperties: Boolean(rawNode.hideProperties),
          showTasks: rawNode.showTasks !== false,
        } as CanvasNode;
      }

      if (rawNode.type === 'section') {
        const { content, text, markdownContent, ...cleanSectionNode } = rawNode;
        return {
          ...cleanSectionNode,
          id,
          type: 'section',
          noteId: String(rawNode.noteId || ''),
          heading: String(rawNode.heading || 'Section'),
          headingSlug: rawNode.headingSlug,
          x,
          y,
          width,
          height,
          zIndex,
          locked,
          collapsed: Boolean(rawNode.collapsed),
        } as CanvasNode;
      }

      if (rawNode.type === 'block') {
        const { content, text, markdownContent, ...cleanBlockNode } = rawNode;
        return {
          ...cleanBlockNode,
          id,
          type: 'block',
          noteId: String(rawNode.noteId || ''),
          blockId: String(rawNode.blockId || ''),
          x,
          y,
          width,
          height,
          zIndex,
          locked,
          collapsed: Boolean(rawNode.collapsed),
        } as CanvasNode;
      }

      if (rawNode.type === 'media') {
        return {
          ...rawNode,
          id,
          type: 'media',
          mediaType: rawNode.mediaType || 'image',
          x,
          y,
          width,
          height,
          zIndex,
          locked,
        } as CanvasNode;
      }

      if (rawNode.type === 'group') {
        return {
          id,
          type: 'group',
          label: String(rawNode.label || 'Group'),
          color: rawNode.color || '#e0e7ff',
          containedNodeIds: Array.isArray(rawNode.containedNodeIds) ? rawNode.containedNodeIds : [],
          x,
          y,
          width,
          height,
          zIndex: typeof rawNode.zIndex === 'number' ? rawNode.zIndex : 0,
          locked,
          collapsed: Boolean(rawNode.collapsed),
        } as CanvasNode;
      }

      // Default sticky/text card
      return {
        id,
        type: 'sticky',
        x,
        y,
        width,
        height,
        zIndex,
        locked,
        text: String(rawNode.text || rawNode.content || ''),
        color: rawNode.color || '#fef08a',
        fontSize: rawNode.fontSize || 'base',
        align: rawNode.align || 'left',
      } as CanvasNode;
    });

    return {
      ...board,
      nodes: safeNodes,
      connectors: Array.isArray(board.connectors) ? board.connectors : [],
      strokes: Array.isArray(board.strokes) ? board.strokes : [],
      transform: board.transform || { panX: 80, panY: 80, zoom: 0.9 },
      backgroundStyle: board.backgroundStyle || 'dots',
    };
  }

  private async processBoardFromLoad(record: any): Promise<CanvasBoard | null> {
    if (!record) return null;
    if (record.isEncrypted) {
      if (!vaultEncryptionService.isVaultUnlocked()) {
        return null;
      }
      try {
        const decrypted = await vaultEncryptionService.decryptRecord<CanvasBoard>(record);
        return decrypted ? this.sanitizeAndMigrateBoard(decrypted) : null;
      } catch (err) {
        console.error('Failed to decrypt canvas board record:', err);
        return null;
      }
    }
    return this.sanitizeAndMigrateBoard(record as CanvasBoard);
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(CANVAS_DB_NAME, CANVAS_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CANVAS_BOARDS)) {
          const store = db.createObjectStore(STORE_CANVAS_BOARDS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async getAllBoards(): Promise<CanvasBoard[]> {
    if (vaultEncryptionService.isVaultLocked()) {
      return [];
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CANVAS_BOARDS, 'readonly');
      const store = tx.objectStore(STORE_CANVAS_BOARDS);
      const req = store.getAll();

      const rawRecords: any[] = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const boards = (
        await Promise.all(rawRecords.map((r) => this.processBoardFromLoad(r)))
      ).filter((b): b is CanvasBoard => b !== null);

      if (boards.length === 0 && !vaultEncryptionService.isEncryptionEnabled()) {
        // Seed default board if unencrypted
        await this.saveBoardImmediate(INITIAL_MAIN_BOARD);
        return [INITIAL_MAIN_BOARD];
      }

      // Update memory cache
      boards.forEach((b) => this.memoryBoards.set(b.id, b));
      return boards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('CanvasStorage: IndexedDB unavailable, using memory store:', err);
      return Array.from(this.memoryBoards.values());
    }
  }

  async getBoard(id: string): Promise<CanvasBoard | null> {
    if (vaultEncryptionService.isVaultLocked()) {
      return null;
    }

    const mem = this.memoryBoards.get(id);
    if (mem) return mem;

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CANVAS_BOARDS, 'readonly');
      const store = tx.objectStore(STORE_CANVAS_BOARDS);
      const req = store.get(id);

      const raw: any = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (raw) {
        const board = await this.processBoardFromLoad(raw);
        if (board) {
          this.memoryBoards.set(id, board);
          return board;
        }
      }
      return null;
    } catch {
      return this.memoryBoards.get(id) || null;
    }
  }

  /**
   * Debounced save for high-frequency interactive canvas changes
   */
  saveBoardDebounced(board: CanvasBoard, delayMs = 400): void {
    const updated = {
      ...board,
      updatedAt: new Date().toISOString(),
    };
    this.memoryBoards.set(updated.id, updated);

    // Cancel pending timeout
    const existing = this.saveTimeouts.get(updated.id);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      this.saveBoardImmediate(updated).catch((err) =>
        console.error('Failed debounced save for board:', updated.id, err)
      );
      this.saveTimeouts.delete(updated.id);
    }, delayMs);

    this.saveTimeouts.set(updated.id, timeout);
  }

  async saveBoardImmediate(board: CanvasBoard): Promise<void> {
    const existing = this.saveTimeouts.get(board.id);
    if (existing) {
      clearTimeout(existing);
      this.saveTimeouts.delete(board.id);
    }

    const record: CanvasBoard = {
      ...board,
      updatedAt: new Date().toISOString(),
    };
    this.memoryBoards.set(record.id, record);

    const recordToSave = await this.processBoardForSave(record);

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CANVAS_BOARDS, 'readwrite');
      const store = tx.objectStore(STORE_CANVAS_BOARDS);
      store.put(recordToSave);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('CanvasStorage: Failed to persist to IndexedDB:', err);
    }
  }

  async deleteBoard(id: string): Promise<void> {
    this.memoryBoards.delete(id);
    const existing = this.saveTimeouts.get(id);
    if (existing) clearTimeout(existing);

    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CANVAS_BOARDS, 'readwrite');
      const store = tx.objectStore(STORE_CANVAS_BOARDS);
      store.delete(id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('CanvasStorage: Failed to delete board from DB:', err);
    }
  }

  exportBoardJSON(board: CanvasBoard): string {
    return JSON.stringify(board, null, 2);
  }

  importBoardJSON(jsonString: string): CanvasBoard | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.id || !Array.isArray(parsed.nodes)) {
        throw new Error('Invalid canvas board format');
      }
      const board: CanvasBoard = {
        ...parsed,
        id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return board;
    } catch (err) {
      console.error('Failed to import canvas JSON:', err);
      return null;
    }
  }
}

export const canvasStorageService = new CanvasStorageService();
