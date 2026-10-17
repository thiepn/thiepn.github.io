import { Note, Folder, SavedSearch, AppSettings } from '../types';
import { vaultEncryptionService, EncryptedRecord } from '../pkm/encryption';

const DB_NAME = 'KeepNotesDB';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_FOLDERS = 'folders';
const STORE_SEARCHES = 'saved_searches';
const STORE_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  customThemes: [],
  accentColor: 'amber',
  canvasBackground: 'clean',
  defaultViewMode: 'masonry',
  gridColumns: 'auto',
  cardDensity: 'comfortable',
  compactMode: false,
  fontFamily: 'sans',
  fontSize: 'md',
  autoArchiveChecked: false,
  confirmDelete: true,
  defaultColor: 'default',
  defaultFolderId: null,
  showMonthDividers: true,
  enableWikiLinks: true,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  cardGlow: true,
  vibrantMode: false,
};

const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'folder-work',
    name: 'Work & Projects',
    icon: 'Briefcase',
    color: '#3b82f6',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'folder-personal',
    name: 'Personal & Life',
    icon: 'User',
    color: '#10b981',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'folder-ideas',
    name: 'Ideas & Brainstorms',
    icon: 'Lightbulb',
    color: '#f59e0b',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'folder-reading',
    name: 'Reading & References',
    icon: 'BookOpen',
    color: '#8b5cf6',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
];

const INITIAL_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: 'search-urgent',
    name: '🔴 Urgent / High Priority',
    query: 'color:red OR #urgent',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'search-todos',
    name: '☑️ Open Action Items',
    query: 'type:checklist',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'search-reminders',
    name: '⏰ Upcoming Deadlines',
    query: 'has:reminder',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'search-ideas',
    name: '💡 Brainstorms & Links',
    query: 'tag:ideas OR has:links',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: '👋 Welcome to KeepNotes for Power Users',
    content: `This notes app is designed like Google Keep, but engineered to handle **thousands of notes** effortlessly:

- 🗂️ **Timeline & Month Markers**: Toggle month headers or jump directly to any month/year with the floating timeline scrubber.
- 🔗 **Inter-Note Linking**: Type \`[[\` in the editor to link to another note like [[Product Roadmap 2026]] or [[Personal Growth & Habits]].
- 🎯 **Power Search**: Filter with syntax like \`tag:ideas\`, \`color:yellow\`, \`in:Work\`, \`type:checklist\`, or \`has:reminder\`.
- 📅 **Calendar & View Modes**: Switch between Masonry Grid, Compact List, Stacked Feed, and Calendar view.
- 📥 **Import Google Takeout & Markdown**: Bring in your entire Keep export zip or folders of \`.md\` files!
- 🔄 **Markdown Sync**: Connect a local directory to keep your notes synced as Markdown files on your disk.`,
    type: 'text',
    checklist: [],
    color: 'yellow',
    tags: ['guide', 'features'],
    folderId: 'folder-ideas',
    pinned: true,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    reminderDate: null,
    images: [],
    linkedNoteIds: ['note-roadmap', 'note-habits'],
  },
  {
    id: 'note-roadmap',
    title: '🚀 Product Roadmap 2026',
    content: `Q3 & Q4 Milestone targets for the core application release:

1. Finalize offline database indexing
2. Two-way directory watcher with File System Access API
3. Backlink graphing and reference navigator
4. Multi-calendar export (.ics)

Referenced in [[Weekly Sprint Goals]] and [[Welcome to KeepNotes for Power Users]].`,
    type: 'text',
    checklist: [],
    color: 'teal',
    tags: ['work', 'roadmap', 'q3'],
    folderId: 'folder-work',
    pinned: true,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    reminderDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    images: [],
    linkedNoteIds: ['note-welcome', 'note-sprint'],
  },
  {
    id: 'note-sprint',
    title: '☑️ Weekly Sprint Goals',
    content: 'Prioritized deliverables for this sprint cycle:',
    type: 'checklist',
    checklist: [
      { id: 'c1', text: 'Review pull requests for search parser', completed: true },
      { id: 'c2', text: 'Add Takeout HTML and JSON parser tests', completed: true },
      { id: 'c3', text: 'Test calendar view with multi-day events', completed: false },
      { id: 'c4', text: 'Verify bidirectional Markdown sync', completed: false },
      { id: 'c5', text: 'Publish documentation update', completed: false },
    ],
    color: 'green',
    tags: ['sprint', 'dev', 'work'],
    folderId: 'folder-work',
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    reminderDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    images: [],
    linkedNoteIds: ['note-roadmap'],
  },
  {
    id: 'note-habits',
    title: '🌱 Personal Growth & Habits',
    content: `Daily routines to sustain focus and creative momentum:

- **Morning**: 20 min reading, hydrate with lemon water, 10 min stretching.
- **Deep Work**: 90-minute uninterrupted blocks.
- **Evening**: Digital sunset 1 hour before sleep.

Connected with [[Book Recommendations]] and [[Favorite Recipes & Cooking Notes]].`,
    type: 'text',
    checklist: [],
    color: 'purple',
    tags: ['habits', 'health', 'personal'],
    folderId: 'folder-personal',
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    reminderDate: null,
    images: [],
    linkedNoteIds: ['note-books', 'note-recipes'],
  },
  {
    id: 'note-books',
    title: '📚 Book Recommendations & Notes',
    content: `Curated reading list for engineering leadership & design systems:

1. **Designing Data-Intensive Applications** — Martin Kleppmann
2. **Refactoring UI** — Adam Wathan & Steve Schoger
3. **The Design of Everyday Things** — Don Norman
4. **Atomic Habits** — James Clear (applied in [[Personal Growth & Habits]])`,
    type: 'text',
    checklist: [],
    color: 'blue',
    tags: ['reading', 'books', 'ideas'],
    folderId: 'folder-reading',
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    reminderDate: null,
    images: [],
    linkedNoteIds: ['note-habits'],
  },
  {
    id: 'note-recipes',
    title: '🍳 Favorite Quick Recipes',
    content: `Weekend cooking recipes:
- **Rustic Sourdough**: 80% hydration, 20% levain, 4h bulk ferment.
- **Thai Basil Chicken (Pad Krapow)**: Garlic, bird's eye chili, holy basil, fish sauce, crispy fried egg on top.
- **Roasted Mediterranean Veggies**: Zucchini, cherry tomatoes, red onion, feta cheese, oregano and olive oil at 200°C for 25m.`,
    type: 'text',
    checklist: [],
    color: 'orange',
    tags: ['recipes', 'food', 'cooking'],
    folderId: 'folder-personal',
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 75 * 86400000).toISOString(),
    reminderDate: null,
    images: [],
    linkedNoteIds: ['note-habits'],
  },
  {
    id: 'note-groceries',
    title: '🛒 Weekly Farmer Market Shopping',
    content: 'Fresh ingredients for this week:',
    type: 'checklist',
    checklist: [
      { id: 'g1', text: 'Fresh sourdough loaf', completed: true },
      { id: 'g2', text: 'Free-range eggs (1 dozen)', completed: true },
      { id: 'g3', text: 'Organic holy basil & mint', completed: false },
      { id: 'g4', text: 'Cherry tomatoes on the vine', completed: false },
      { id: 'g5', text: 'Greek feta cheese', completed: false },
      { id: 'g6', text: 'Extra virgin olive oil', completed: false },
    ],
    color: 'pink',
    tags: ['shopping', 'market'],
    folderId: 'folder-personal',
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date(Date.now() - 110 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 105 * 86400000).toISOString(),
    reminderDate: null,
    images: [],
    linkedNoteIds: ['note-recipes'],
  },
];

/**
 * Explicit first-use native Hub enrollment, implemented by ORIGINAL KEEP storage.
 * Never touches an existing DB, never seeds examples or copies another origin.
 * The version-change transaction is atomic; concurrent initialization loses
 * without overwriting existing records.
 */
export async function createEmptyOriginalKeepHubDatabase(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new Error('KEEP owner session expired before enrollment.');
  if (typeof indexedDB.databases !== 'function')
    throw new Error('This browser cannot safely verify an empty KEEP origin.');
  const existing = await indexedDB.databases();
  if (signal.aborted) throw new Error('KEEP owner session expired before enrollment.');
  if (existing.some(db => db.name === DB_NAME))
    throw new Error('An original KEEP database already exists here. No records were changed.');

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let created = false;
    const onAbort = () => {
      // Abort the version-change transaction if it is still running.
      try { request.transaction?.abort(); } catch { /* Already committed or not started. */ }
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const finish = () => signal.removeEventListener('abort', onAbort);
    request.onblocked = () => { finish(); reject(new Error('KEEP database is locked in another tab.')); };
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion !== 0 || signal.aborted) {
        request.transaction?.abort();
        return;
      }
      created = true;
      const notes = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      notes.createIndex('updatedAt', 'updatedAt', { unique: false });
      notes.createIndex('createdAt', 'createdAt', { unique: false });
      notes.createIndex('folderId', 'folderId', { unique: false });
      notes.createIndex('color', 'color', { unique: false });
      db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      db.createObjectStore(STORE_SEARCHES, { keyPath: 'id' });
      db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
    };
    request.onerror = () => { finish(); reject(request.error ?? new Error('KEEP enrollment failed.')); };
    request.onsuccess = () => {
      const db = request.result;
      const complete = created && db.version === DB_VERSION &&
        [STORE_NOTES, STORE_FOLDERS, STORE_SEARCHES, STORE_SETTINGS]
          .every(name => db.objectStoreNames.contains(name));
      db.close();
      finish();
      if (!complete) {
        reject(new Error('KEEP database was created elsewhere or is incompatible. No records were changed.'));
      } else {
        resolve();
      }
    };
  });
}

const isEmbeddedHubKeep = () =>
  typeof document !== 'undefined' && document.querySelector('[data-keep-native-host]') !== null;

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private cachedSettings: AppSettings = DEFAULT_SETTINGS;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          const noteStore = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          noteStore.createIndex('createdAt', 'createdAt', { unique: false });
          noteStore.createIndex('folderId', 'folderId', { unique: false });
          noteStore.createIndex('color', 'color', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
          db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SEARCHES)) {
          db.createObjectStore(STORE_SEARCHES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Record Encryption / Decryption Helpers ---
  private async processRecordForSave<T>(
    id: string,
    type: 'note' | 'folder' | 'saved_search',
    item: T
  ): Promise<any> {
    if (vaultEncryptionService.isEncryptionEnabled() && vaultEncryptionService.isVaultUnlocked()) {
      return await vaultEncryptionService.encryptRecord(id, type, item);
    }
    return item;
  }

  private async processRecordFromLoad<T>(record: any): Promise<T | null> {
    if (!record) return null;
    if (record.isEncrypted) {
      if (!vaultEncryptionService.isVaultUnlocked()) {
        return null;
      }
      try {
        return await vaultEncryptionService.decryptRecord<T>(record);
      } catch (err) {
        console.error('Failed to decrypt record at rest:', err);
        return null;
      }
    }
    return record as T;
  }

  // --- Initializer & Seeding ---
  async initialize(): Promise<{
    notes: Note[];
    folders: Folder[];
    savedSearches: SavedSearch[];
    settings: AppSettings;
  }> {
    // If vault is encrypted and locked, do not leak or read plaintext
    if (vaultEncryptionService.isVaultLocked()) {
      return {
        notes: [],
        folders: [],
        savedSearches: [],
        settings: this.cachedSettings || DEFAULT_SETTINGS,
      };
    }

    try {
      const db = await this.getDB();

      // Read Stores
      const rawNotes = await this.getAllFromStore<any>(db, STORE_NOTES);
      const rawFolders = await this.getAllFromStore<any>(db, STORE_FOLDERS);
      const rawSavedSearches = await this.getAllFromStore<any>(db, STORE_SEARCHES);
      const rawSettings = await this.getByKeyFromStore<{ key: string; value: AppSettings }>(
        db,
        STORE_SETTINGS,
        'app_settings'
      );

      // Decrypt if encrypted
      const notes: Note[] = (
        await Promise.all(rawNotes.map((r) => this.processRecordFromLoad<Note>(r)))
      ).filter((n): n is Note => n !== null);

      const folders: Folder[] = (
        await Promise.all(rawFolders.map((r) => this.processRecordFromLoad<Folder>(r)))
      ).filter((f): f is Folder => f !== null);

      const savedSearches: SavedSearch[] = (
        await Promise.all(rawSavedSearches.map((r) => this.processRecordFromLoad<SavedSearch>(r)))
      ).filter((s): s is SavedSearch => s !== null);

      let finalNotes = notes;
      let finalFolders = folders;
      let finalSearches = savedSearches;
      let finalSettings = rawSettings ? { ...DEFAULT_SETTINGS, ...rawSettings.value } : DEFAULT_SETTINGS;

      // Merge with latest localStorage settings if present
      if (typeof localStorage !== 'undefined') {
        const localRaw = localStorage.getItem('keepnotes_settings');
        if (localRaw) {
          try {
            finalSettings = { ...finalSettings, ...JSON.parse(localRaw) };
          } catch {
            // ignore
          }
        }
      }

      // Seed if brand new (and not encrypted)
      if (
        !isEmbeddedHubKeep() &&
        !vaultEncryptionService.isEncryptionEnabled() &&
        notes.length === 0 &&
        folders.length === 0
      ) {
        finalNotes = INITIAL_NOTES;
        finalFolders = INITIAL_FOLDERS;
        finalSearches = INITIAL_SAVED_SEARCHES;

        await this.saveAllNotes(finalNotes);
        await this.saveAllFolders(finalFolders);
        await this.saveAllSavedSearches(finalSearches);
        await this.saveSettings(finalSettings);
      }

      this.cachedSettings = finalSettings;

      return {
        notes: finalNotes,
        folders: finalFolders,
        savedSearches: finalSearches,
        settings: finalSettings,
      };
    } catch (err) {
      // On Hub, falling back to plaintext localStorage would silently diverge
      // from the original IndexedDB source and potentially leak owner data.
      if (isEmbeddedHubKeep()) throw err;
      console.warn('IndexedDB initialization failed, using localStorage fallback:', err);
      return this.fallbackInitialize();
    }
  }

  // Fallback localStorage
  private fallbackInitialize() {
    const rawNotes = localStorage.getItem('keepnotes_notes');
    const rawFolders = localStorage.getItem('keepnotes_folders');
    const rawSearches = localStorage.getItem('keepnotes_searches');
    const rawSettings = localStorage.getItem('keepnotes_settings');

    const notes: Note[] = rawNotes ? JSON.parse(rawNotes) : INITIAL_NOTES;
    const folders: Folder[] = rawFolders ? JSON.parse(rawFolders) : INITIAL_FOLDERS;
    const savedSearches: SavedSearch[] = rawSearches
      ? JSON.parse(rawSearches)
      : INITIAL_SAVED_SEARCHES;
    const settings: AppSettings = rawSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }
      : DEFAULT_SETTINGS;

    this.cachedSettings = settings;

    return { notes, folders, savedSearches, settings };
  }

  // --- Convenience Getters ---
  async getAllNotes(): Promise<Note[]> {
    const data = await this.initialize();
    return data.notes;
  }

  async getAllFolders(): Promise<Folder[]> {
    const data = await this.initialize();
    return data.folders;
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    const data = await this.initialize();
    return data.savedSearches;
  }

  getSettings(): AppSettings {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('keepnotes_settings');
      if (raw) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch {
          // ignore
        }
      }
    }
    return this.cachedSettings || DEFAULT_SETTINGS;
  }

  // --- Note Operations ---
  async saveNote(note: Note): Promise<void> {
    const record = await this.processRecordForSave(note.id, 'note', note);
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).put(record);
      await this.txPromise(tx);
    } catch {
      this.fallbackSaveNote(record);
    }
  }

  async bulkSaveNotes(notesToSave: Note[]): Promise<void> {
    const records = await Promise.all(
      notesToSave.map((n) => this.processRecordForSave(n.id, 'note', n))
    );
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      const store = tx.objectStore(STORE_NOTES);
      for (const r of records) {
        store.put(r);
      }
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_notes');
      const currentList: any[] = raw ? JSON.parse(raw) : [];
      const map = new Map(currentList.map((n) => [n.id, n]));
      for (const r of records) {
        map.set(r.id, r);
      }
      localStorage.setItem('keepnotes_notes', JSON.stringify(Array.from(map.values())));
    }
  }

  async saveAllNotes(notes: Note[]): Promise<void> {
    const records = await Promise.all(
      notes.map((n) => this.processRecordForSave(n.id, 'note', n))
    );
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      const store = tx.objectStore(STORE_NOTES);
      store.clear();
      for (const r of records) {
        store.put(r);
      }
      await this.txPromise(tx);
    } catch {
      localStorage.setItem('keepnotes_notes', JSON.stringify(records));
    }
  }

  async deleteNotePermanently(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).delete(id);
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_notes');
      if (raw) {
        const list: any[] = JSON.parse(raw);
        localStorage.setItem('keepnotes_notes', JSON.stringify(list.filter((n) => n.id !== id)));
      }
    }
  }

  private fallbackSaveNote(record: any) {
    const raw = localStorage.getItem('keepnotes_notes');
    const list: any[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((n) => n.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem('keepnotes_notes', JSON.stringify(list));
  }

  // --- Folder Operations ---
  async saveFolder(folder: Folder): Promise<void> {
    const record = await this.processRecordForSave(folder.id, 'folder', folder);
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      tx.objectStore(STORE_FOLDERS).put(record);
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_folders');
      const list: any[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((f) => f.id === folder.id);
      if (idx >= 0) list[idx] = record;
      else list.push(record);
      localStorage.setItem('keepnotes_folders', JSON.stringify(list));
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      tx.objectStore(STORE_FOLDERS).delete(folderId);
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_folders');
      if (raw) {
        const list: any[] = JSON.parse(raw);
        localStorage.setItem('keepnotes_folders', JSON.stringify(list.filter((f) => f.id !== folderId)));
      }
    }
  }

  async saveAllFolders(folders: Folder[]): Promise<void> {
    const records = await Promise.all(
      folders.map((f) => this.processRecordForSave(f.id, 'folder', f))
    );
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      store.clear();
      for (const r of records) {
        store.put(r);
      }
      await this.txPromise(tx);
    } catch {
      localStorage.setItem('keepnotes_folders', JSON.stringify(records));
    }
  }

  // --- Saved Searches Operations ---
  async saveSearchPreset(preset: SavedSearch): Promise<void> {
    const record = await this.processRecordForSave(preset.id, 'saved_search', preset);
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SEARCHES, 'readwrite');
      tx.objectStore(STORE_SEARCHES).put(record);
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_searches');
      const list: any[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((s) => s.id === preset.id);
      if (idx >= 0) list[idx] = record;
      else list.push(record);
      localStorage.setItem('keepnotes_searches', JSON.stringify(list));
    }
  }

  async deleteSavedSearch(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SEARCHES, 'readwrite');
      tx.objectStore(STORE_SEARCHES).delete(id);
      await this.txPromise(tx);
    } catch {
      const raw = localStorage.getItem('keepnotes_searches');
      if (raw) {
        const list: any[] = JSON.parse(raw);
        localStorage.setItem('keepnotes_searches', JSON.stringify(list.filter((s) => s.id !== id)));
      }
    }
  }

  async saveAllSavedSearches(searches: SavedSearch[]): Promise<void> {
    const records = await Promise.all(
      searches.map((s) => this.processRecordForSave(s.id, 'saved_search', s))
    );
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SEARCHES, 'readwrite');
      const store = tx.objectStore(STORE_SEARCHES);
      store.clear();
      for (const r of records) {
        store.put(r);
      }
      await this.txPromise(tx);
    } catch {
      localStorage.setItem('keepnotes_searches', JSON.stringify(records));
    }
  }

  // --- Settings Operations ---
  async saveSettings(settings: AppSettings): Promise<void> {
    this.cachedSettings = settings;
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      tx.objectStore(STORE_SETTINGS).put({ key: 'app_settings', value: settings });
      await this.txPromise(tx);
    } catch {
      // ignore
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('keepnotes_settings', JSON.stringify(settings));
    }
  }

  // --- Clear All Data ---
  async clearAllData(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_NOTES, STORE_FOLDERS, STORE_SEARCHES], 'readwrite');
      tx.objectStore(STORE_NOTES).clear();
      tx.objectStore(STORE_FOLDERS).clear();
      tx.objectStore(STORE_SEARCHES).clear();
      await this.txPromise(tx);
    } catch {
      // ignore
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('keepnotes_notes');
      localStorage.removeItem('keepnotes_folders');
      localStorage.removeItem('keepnotes_searches');
    }
  }

  // --- Generic Helpers ---
  private getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private getByKeyFromStore<T>(
    db: IDBDatabase,
    storeName: string,
    key: string
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  private txPromise(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // --- Complete Export & Import Backup ---
  async exportFullBackup(): Promise<string> {
    const data = await this.initialize();
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        notes: data.notes,
        folders: data.folders,
        savedSearches: data.savedSearches,
        settings: data.settings,
      },
      null,
      2
    );
  }

  async restoreFullBackup(
    jsonString: string
  ): Promise<{ notes: Note[]; folders: Folder[]; savedSearches: SavedSearch[]; settings: AppSettings }> {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.notes)) {
      throw new Error('Invalid backup file: notes array missing');
    }

    const notes: Note[] = parsed.notes;
    const folders: Folder[] = Array.isArray(parsed.folders) ? parsed.folders : [];
    const savedSearches: SavedSearch[] = Array.isArray(parsed.savedSearches)
      ? parsed.savedSearches
      : [];
    const settings: AppSettings = parsed.settings
      ? { ...DEFAULT_SETTINGS, ...parsed.settings }
      : DEFAULT_SETTINGS;

    await this.saveAllNotes(notes);
    await this.saveAllFolders(folders);
    await this.saveAllSavedSearches(savedSearches);
    await this.saveSettings(settings);

    return { notes, folders, savedSearches, settings };
  }
}

export const storageService = new StorageService();
