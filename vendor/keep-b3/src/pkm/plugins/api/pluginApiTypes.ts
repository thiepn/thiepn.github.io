/**
 * Phase P41: PKM Plugin Developer API SDK Types
 * Importable declaration surface for plugin development.
 */

export interface NoteMetadata {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
  folderId: string | null;
}

export interface ActiveNoteView {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string | null;
  updatedAt: string;
  version: string;
}

export interface NoteMutationOperations {
  title?: string;
  content?: string;
  appendContent?: string;
  tags?: string[];
}

export interface MutationResult {
  success: boolean;
  noteId: string;
  updatedAt: string;
}

export interface NotesAPI {
  /**
   * Retrieves text currently highlighted by the user.
   * Requires permission: "notes.read:selected"
   */
  getSelectedText(): Promise<string>;

  /**
   * Replaces text currently highlighted by the user.
   * Requires permission: "notes.write:selected"
   */
  replaceSelectedText(newText: string): Promise<{ success: boolean }>;

  /**
   * Reads the active note currently open in the editor.
   * Requires permission: "notes.read:current"
   */
  getCurrentNote(): Promise<ActiveNoteView | null>;

  /**
   * Performs an optimistic concurrency mutation on the active note.
   * Requires permission: "notes.write:current"
   */
  mutateCurrentNote(expectedVersion: string, operations: NoteMutationOperations): Promise<MutationResult>;

  /**
   * Retrieves vault metadata index (titles, tags, timestamps).
   * Requires permission: "notes.read:metadata"
   */
  getMetadataIndex(filter?: { tag?: string; folderId?: string }): Promise<NoteMetadata[]>;
}

export interface SearchAPI {
  /**
   * Searches note titles and tags in the vault.
   * Requires permission: "search.metadata"
   */
  queryMetadata(query: string): Promise<NoteMetadata[]>;
}

export interface StorageAPI {
  /**
   * Reads a key from private plugin storage.
   * Requires permission: "storage.private"
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Saves a key to private plugin storage (max 5MB quota).
   * Requires permission: "storage.private"
   */
  set<T = any>(key: string, value: T): Promise<{ success: boolean }>;

  /**
   * Deletes a key from private plugin storage.
   * Requires permission: "storage.private"
   */
  delete(key: string): Promise<{ success: boolean }>;

  /**
   * Lists all stored keys for this plugin.
   * Requires permission: "storage.private"
   */
  listKeys(): Promise<string[]>;
}

export interface LogAPI {
  info(message: string, details?: any): void;
  warn(message: string, details?: any): void;
  error(message: string, details?: any): void;
}

export interface PKMPluginAPI {
  pluginId: string;
  hasPermission(permission: string): boolean;
  notes: NotesAPI;
  search: SearchAPI;
  storage: StorageAPI;
  log: LogAPI;
}
