/**
 * Phase P32: Sync Manifest Engine & Symmetric Difference Calculation
 * Builds compact canonical resource manifests and computes precise delta sync plans.
 */

import { Note, Folder, SavedSearch } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAnnotation } from '../pdfTypes';
import {
  P2PSyncManifest,
  P2PManifestEntry,
  P2PTombstoneEntry,
  P2PDiffResult,
  P2PManifestConflict,
  P2P_PROTOCOL_VERSION,
} from './p2pTypes';
import { computeSHA256Hex } from './p2pCrypto';
import { canonicalizeJson } from '../portableVaultSerializer';

const TOMBSTONE_STORAGE_KEY = 'pkm_p2p_tombstones_v1';
const MAX_TOMBSTONE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_TOMBSTONES_COUNT = 500;

/**
 * Loads stored deletion tombstones from local storage
 */
export function getStoredTombstones(): P2PTombstoneEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as P2PTombstoneEntry[];
    const now = Date.now();
    // Filter out expired tombstones
    return list.filter((t) => now - new Date(t.deletedAt).getTime() < MAX_TOMBSTONE_AGE_MS);
  } catch {
    return [];
  }
}

/**
 * Records a deletion tombstone when a canonical resource is deleted
 */
export function recordTombstone(id: string, type: P2PTombstoneEntry['type'] = 'note', logicalVersion = 1) {
  try {
    if (typeof localStorage === 'undefined') return;
    const tombstones = getStoredTombstones().filter((t) => t.id !== id);
    tombstones.push({
      id,
      type,
      deletedAt: new Date().toISOString(),
      logicalVersion,
    });
    // Bound list size
    const pruned = tombstones.slice(-MAX_TOMBSTONES_COUNT);
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(pruned));
  } catch (e) {
    console.warn('Could not record P2P tombstone:', e);
  }
}

/**
 * Removes tombstone when a resource is recreated or restored
 */
export function clearTombstone(id: string) {
  try {
    const tombstones = getStoredTombstones().filter((t) => t.id !== id);
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(tombstones));
  } catch {}
}

/**
 * Computes canonical hash for a Note
 */
export async function computeNoteHash(note: Note): Promise<string> {
  const canonical = canonicalizeJson({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: [...(note.tags || [])].sort(),
    folderId: note.folderId ?? null,
    checklist: note.checklist || [],
    color: note.color || 'default',
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    trashed: Boolean(note.trashed),
  });
  return computeSHA256Hex(canonical);
}

/**
 * Computes canonical hash for a Folder
 */
export async function computeFolderHash(folder: Folder): Promise<string> {
  const canonical = canonicalizeJson({
    id: folder.id,
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    createdAt: folder.createdAt,
  });
  return computeSHA256Hex(canonical);
}

/**
 * Computes canonical hash for a CanvasBoard
 */
export async function computeCanvasHash(canvas: CanvasBoard): Promise<string> {
  const canonical = canonicalizeJson({
    id: canvas.id,
    title: canvas.title,
    nodes: canvas.nodes,
    connectors: canvas.connectors,
    strokes: canvas.strokes,
  });
  return computeSHA256Hex(canonical);
}

/**
 * Builds a full P2PSyncManifest from local vault state
 */
export async function buildSyncManifest(params: {
  vaultId: string;
  vaultName?: string;
  logicalRevision?: number;
  notes: Note[];
  folders: Folder[];
  canvases?: CanvasBoard[];
  pdfAnnotations?: PDFAnnotation[];
  savedSearches?: SavedSearch[];
}): Promise<P2PSyncManifest> {
  const entries: P2PManifestEntry[] = [];
  let approximateTotalBytes = 0;

  // Process Notes
  for (const note of params.notes) {
    if (note.trashed) continue; // Trashed notes handled or skipped
    const contentHash = await computeNoteHash(note);
    const size = note.content.length + JSON.stringify(note).length;
    approximateTotalBytes += size;
    entries.push({
      id: note.id,
      type: 'note',
      logicalVersion: 1, // Logical version can be bumped with revisions
      contentHash,
      updatedAt: note.updatedAt || note.createdAt,
      size,
      title: note.title,
    });
  }

  // Process Folders
  for (const folder of params.folders) {
    const contentHash = await computeFolderHash(folder);
    const size = JSON.stringify(folder).length;
    approximateTotalBytes += size;
    entries.push({
      id: folder.id,
      type: 'folder',
      logicalVersion: 1,
      contentHash,
      updatedAt: new Date().toISOString(),
      size,
      title: folder.name,
    });
  }

  // Process Canvases
  if (params.canvases) {
    for (const canvas of params.canvases) {
      const contentHash = await computeCanvasHash(canvas);
      const size = JSON.stringify(canvas).length;
      approximateTotalBytes += size;
      entries.push({
        id: canvas.id,
        type: 'canvas',
        logicalVersion: 1,
        contentHash,
        updatedAt: canvas.updatedAt || canvas.createdAt,
        size,
        title: canvas.title,
      });
    }
  }

  // Process Saved Searches
  if (params.savedSearches) {
    for (const s of params.savedSearches) {
      const canonical = canonicalizeJson(s);
      const contentHash = await computeSHA256Hex(canonical);
      const size = canonical.length;
      approximateTotalBytes += size;
      entries.push({
        id: s.id,
        type: 'savedSearch',
        logicalVersion: 1,
        contentHash,
        updatedAt: s.createdAt,
        size,
        title: s.name,
      });
    }
  }

  const tombstones = getStoredTombstones();

  return {
    protocolVersion: P2P_PROTOCOL_VERSION,
    vaultId: params.vaultId,
    vaultName: params.vaultName || 'Personal Vault',
    generatedAt: new Date().toISOString(),
    logicalRevision: params.logicalRevision || Date.now(),
    entries,
    tombstones,
    totalResourcesCount: entries.length,
    approximateTotalBytes,
  };
}

/**
 * Compares local and remote manifests to compute symmetric differences and identify conflicts.
 */
export function compareSyncManifests(
  localManifest: P2PSyncManifest,
  remoteManifest: P2PSyncManifest
): P2PDiffResult {
  const localMap = new Map<string, P2PManifestEntry>(localManifest.entries.map((e) => [e.id, e]));
  const remoteMap = new Map<string, P2PManifestEntry>(remoteManifest.entries.map((e) => [e.id, e]));

  const localTombstones = new Map<string, P2PTombstoneEntry>(
    localManifest.tombstones.map((t) => [t.id, t])
  );
  const remoteTombstones = new Map<string, P2PTombstoneEntry>(
    remoteManifest.tombstones.map((t) => [t.id, t])
  );

  const toSend: P2PManifestEntry[] = [];
  const toReceive: P2PManifestEntry[] = [];
  const tombstonesToSend: P2PTombstoneEntry[] = [];
  const tombstonesToReceive: P2PTombstoneEntry[] = [];
  const conflicts: P2PManifestConflict[] = [];
  let identicalCount = 0;

  // 1. Evaluate all local resources against remote
  for (const [id, localEntry] of localMap.entries()) {
    const remoteEntry = remoteMap.get(id);
    const remoteTombstone = remoteTombstones.get(id);

    if (remoteTombstone) {
      // Remote deleted this resource.
      const localUpdatedMs = new Date(localEntry.updatedAt).getTime();
      const remoteDeletedMs = new Date(remoteTombstone.deletedAt).getTime();

      if (localUpdatedMs > remoteDeletedMs) {
        // Local was edited AFTER remote deleted it -> Delete vs Edit Conflict!
        conflicts.push({
          resourceId: id,
          type: localEntry.type,
          title: localEntry.title,
          localVersion: localEntry.logicalVersion,
          remoteVersion: remoteTombstone.logicalVersion,
          localHash: localEntry.contentHash,
          remoteHash: 'DELETED',
          localUpdatedAt: localEntry.updatedAt,
          remoteUpdatedAt: remoteTombstone.deletedAt,
          conflictType: 'delete_edit',
        });
      } else {
        // Safe deletion propagation to local
        tombstonesToReceive.push(remoteTombstone);
      }
      continue;
    }

    if (!remoteEntry) {
      // Remote doesn't have it and hasn't tombstoned it -> Send to remote
      toSend.push(localEntry);
      continue;
    }

    // Both have the resource -> Compare content hashes
    if (localEntry.contentHash === remoteEntry.contentHash) {
      identicalCount++;
      continue;
    }

    // Hashes differ! Check versions & timestamps
    const localTime = new Date(localEntry.updatedAt).getTime();
    const remoteTime = new Date(remoteEntry.updatedAt).getTime();

    // If both have different content and the timestamps are significantly different
    // (e.g. one side is strictly newer and clean delta), or if both edited:
    if (Math.abs(localTime - remoteTime) < 5000) {
      // Near-simultaneous or divergent edits -> Conflict!
      conflicts.push({
        resourceId: id,
        type: localEntry.type,
        title: localEntry.title || remoteEntry.title,
        localVersion: localEntry.logicalVersion,
        remoteVersion: remoteEntry.logicalVersion,
        localHash: localEntry.contentHash,
        remoteHash: remoteEntry.contentHash,
        localUpdatedAt: localEntry.updatedAt,
        remoteUpdatedAt: remoteEntry.updatedAt,
        conflictType: 'edit_edit',
      });
    } else if (localTime > remoteTime) {
      // Local has newer edit
      toSend.push(localEntry);
    } else {
      // Remote has newer edit
      toReceive.push(remoteEntry);
    }
  }

  // 2. Evaluate all remote resources missing on local
  for (const [id, remoteEntry] of remoteMap.entries()) {
    if (localMap.has(id)) continue; // already checked above

    const localTombstone = localTombstones.get(id);
    if (localTombstone) {
      // Local deleted this resource.
      const remoteUpdatedMs = new Date(remoteEntry.updatedAt).getTime();
      const localDeletedMs = new Date(localTombstone.deletedAt).getTime();

      if (remoteUpdatedMs > localDeletedMs) {
        // Remote was edited AFTER local deleted -> Delete vs Edit Conflict!
        conflicts.push({
          resourceId: id,
          type: remoteEntry.type,
          title: remoteEntry.title,
          localVersion: localTombstone.logicalVersion,
          remoteVersion: remoteEntry.logicalVersion,
          localHash: 'DELETED',
          remoteHash: remoteEntry.contentHash,
          localUpdatedAt: localTombstone.deletedAt,
          remoteUpdatedAt: remoteEntry.updatedAt,
          conflictType: 'edit_delete',
        });
      } else {
        // Send our local deletion tombstone to remote
        tombstonesToSend.push(localTombstone);
      }
      continue;
    }

    // Remote has new resource that local doesn't have -> Receive it
    toReceive.push(remoteEntry);
  }

  // 3. Propagate local tombstones for items remote doesn't know were deleted
  for (const [id, localTombstone] of localTombstones.entries()) {
    if (remoteMap.has(id) && !tombstonesToSend.some((t) => t.id === id)) {
      tombstonesToSend.push(localTombstone);
    }
  }

  return {
    toSend,
    toReceive,
    tombstonesToSend,
    tombstonesToReceive,
    conflicts,
    identicalCount,
    totalChangesToApplyLocally: toReceive.length + tombstonesToReceive.length,
    totalChangesToSendRemotely: toSend.length + tombstonesToSend.length,
  };
}

