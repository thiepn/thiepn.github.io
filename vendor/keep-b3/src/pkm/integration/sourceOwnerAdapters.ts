/**
 * Executable, safe adapter boundary for B1b. The five external providers are
 * NOT connected by this release. Consumers cannot mistake an inert descriptor
 * or source landing page for permission, ownership proof or synchronization.
 */
import type { Note } from '../../types';
import { resolveOwnerResource, type ResolvedKeepResource } from './keepResourceSpine';
import { OWNER_SOURCES, SOURCE_ADAPTERS, sourceLanding, type OwnerResourceRef, type OwnerSource } from './ownerResourceRefs';

export type OwnerReadStatus = 'available-local' | 'unavailable-local' | 'not-connected';
export interface OwnerAdapterResolution {
  source: OwnerSource;
  uri: string;
  status: OwnerReadStatus;
  sourceHome: string | null;
  /** Null on unconnected providers, never a synthetic user record. */
  resource: ResolvedKeepResource | null;
  requiresConsent: boolean;
  canMutate: false;
  liveSync: false;
}

export interface SourceOwnerAdapter {
  readonly source: OwnerSource;
  readonly label: string;
  /** Current local v1 only; all external records require a future owner protocol. */
  resolve(ref: OwnerResourceRef, notes: readonly Note[]): OwnerAdapterResolution;
}

function makeAdapter(source: OwnerSource): SourceOwnerAdapter {
  return Object.freeze({
    source,
    label: SOURCE_ADAPTERS[source].label,
    resolve(ref: OwnerResourceRef, notes: readonly Note[]): OwnerAdapterResolution {
      if (ref.source !== source) throw new Error('Source owner mismatch');
      const actual = source === 'keep' ? resolveOwnerResource(ref, notes) : null;
      const localReady = actual?.status === 'available';
      return {
        source,
        uri: ref.uri,
        status: source === 'keep' ? (localReady ? 'available-local' : 'unavailable-local') : 'not-connected',
        sourceHome: sourceLanding(ref),
        resource: actual ? { ...actual, pinned: false } : null,
        requiresConsent: source !== 'keep',
        canMutate: false,
        liveSync: false,
      };
    },
  });
}

export const sourceOwnerAdapters: Readonly<Record<OwnerSource, SourceOwnerAdapter>> = Object.freeze(
  Object.fromEntries(OWNER_SOURCES.map(source => [source, makeAdapter(source)])) as Record<OwnerSource, SourceOwnerAdapter>
);

/**
 * A device-local KEEP summary can be prepared but never published implicitly.
 * App identity/grants, source encryption state and explicit consent remain hard
 * gates for an actual Hub transfer.
 */
export interface KeepHubSummaryDraft {
  source: 'keep';
  visibility: 'device-only-not-published';
  generatedAt: string;
  activeNoteCount: number;
  pinnedNoteCount: number;
  /** No content, titles, tags, note IDs, raw task text or private links. */
}
export function prepareKeepHubSummary(notes: readonly Note[], vaultUnlocked: boolean, now = new Date()): KeepHubSummaryDraft | null {
  if (!vaultUnlocked) return null;
  const active = notes.filter(n => !n.archived && !n.trashed && !n.isLocked);
  return {
    source: 'keep', visibility: 'device-only-not-published', generatedAt: now.toISOString(),
    activeNoteCount: active.length,
    pinnedNoteCount: active.filter(n => n.pinned).length,
  };
}
