import { validAccountId } from '../hub-auth';
import { MAX_HOME_DOCUMENT_BYTES, parseStoredHomeDocument } from './home-store';
import type { DurableHomePersistence, HomeSyncSnapshot } from './home-indexeddb';

// An injectable, authenticated service boundary. There is deliberately NO
// production Core RPC, URL, fetch, OAuth token or auto-sync invocation here.
// The remote implementation MUST check auth.uid() and RLS independently of Hub.
export interface HomeRemoteDocument {
  ownerId: string;
  revision: string; // opaque 64-character authenticated server revision
  raw: string;
}
export interface HomeCasRequest {
  expectedRevision: string | null;
  idempotencyKey: string;
  raw: string;
}
export interface HomeCasResponse {
  outcome: 'applied' | 'conflict';
  ownerId: string;
  revision: string | null;
  idempotencyKey: string;
}
export interface HomeSyncTransport {
  verifiedOwner(): Promise<string | null>;
  read(ownerId: string): Promise<HomeRemoteDocument | null>;
  compareAndSwap(ownerId: string, request: HomeCasRequest): Promise<HomeCasResponse>;
}
export type HomeSyncResult = 'idle' | 'offline' | 'unauthorized' | 'cancelled' |
  'conflict' | 'invalid-remote' | 'deferred' | 'synced';

const REVISION = /^[a-f0-9]{64}$/i;
function exactKeys(value: unknown, keys: string[]): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === keys.sort().join(',');
}
function validRemote(remote: unknown, owner: string): remote is HomeRemoteDocument {
  if (!exactKeys(remote, ['ownerId','revision','raw'])) return false;
  const item = remote as HomeRemoteDocument;
  return validAccountId(item.ownerId) && item.ownerId.toLowerCase() === owner.toLowerCase() &&
    typeof item.revision === 'string' && REVISION.test(item.revision) &&
    typeof item.raw === 'string' &&
    new TextEncoder().encode(item.raw).byteLength <= MAX_HOME_DOCUMENT_BYTES &&
    parseStoredHomeDocument(item.raw).document !== null;
}
function validResponse(response: unknown, owner: string, nonce: string): response is HomeCasResponse {
  if (!exactKeys(response, ['outcome','ownerId','revision','idempotencyKey'])) return false;
  const item = response as HomeCasResponse;
  return (item.outcome === 'applied' || item.outcome === 'conflict') &&
    validAccountId(item.ownerId) && item.ownerId.toLowerCase() === owner.toLowerCase() &&
    item.idempotencyKey === nonce &&
    (item.revision === null || (typeof item.revision === 'string' && REVISION.test(item.revision))) &&
    (item.outcome !== 'applied' || item.revision !== null);
}
async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,'0')).join('');
}

// Strictly one-shot, explicit and caller-authorized. No automatic network sync.
// Local revision journal can only be cleared by the IndexedDB transaction after
// an owner-verified authenticated server read-back of the exact committed bytes.
// Retrying with an identical already-present document is idempotent.
export async function synchronizeHomeOnce({
  ownerId, persistence, transport, isCurrent, online = () => true,
}: {
  ownerId: string;
  persistence: Pick<DurableHomePersistence,'key'|'getSyncSnapshot'|'acknowledgeSynced'>;
  transport: HomeSyncTransport;
  isCurrent: () => boolean;
  online?: () => boolean;
}): Promise<HomeSyncResult> {
  if (!validAccountId(ownerId) || persistence.key !==
    `thiepn:home-document:user:${ownerId.toLowerCase()}:v2`) return 'unauthorized';
  if (!isCurrent()) return 'cancelled';
  if (!online()) return 'offline';

  const authorized = async():Promise<boolean> => {
    if (!isCurrent() || !online()) return false;
    try {
      const id = await transport.verifiedOwner();
      return isCurrent() && online() && validAccountId(id) &&
        id.toLowerCase() === ownerId.toLowerCase();
    } catch { return false; }
  };
  if (!await authorized()) return 'unauthorized';
  let snapshot:HomeSyncSnapshot|null;
  try { snapshot = await persistence.getSyncSnapshot(); }
  catch { return 'deferred'; }
  if (!snapshot || !snapshot.pending.length) return 'idle';
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1 ||
    !Number.isSafeInteger(snapshot.syncedToRevision) ||
    snapshot.syncedToRevision >= snapshot.revision ||
    (snapshot.remoteRevision !== null && !REVISION.test(snapshot.remoteRevision)) ||
    !parseStoredHomeDocument(snapshot.raw).document) return 'deferred';
  if (!await authorized()) return 'cancelled';

  let remote:HomeRemoteDocument|null;
  try { remote = await transport.read(ownerId); }
  catch { return 'deferred'; }
  if (!await authorized()) return 'cancelled';
  if (remote !== null && !validRemote(remote,ownerId)) return 'invalid-remote';
  if (remote === null && snapshot.remoteRevision !== null) return 'conflict';

  const acknowledge = async (revision:string):Promise<HomeSyncResult> => {
    if (!await authorized()) return 'cancelled';
    try { return await persistence.acknowledgeSynced(snapshot!,revision) ? 'synced' : 'deferred'; }
    catch { return 'deferred'; }
  };
  // Lost CAS response / new browser may discover identical server contents.
  // Only a verified, full server read of the exact Home bytes can ack it.
  if (remote && remote.raw === snapshot.raw) return acknowledge(remote.revision);
  if (remote && remote.revision !== snapshot.remoteRevision) return 'conflict';
  if (!await authorized()) return 'cancelled';

  const nonce = await digest(JSON.stringify([ownerId.toLowerCase(),persistence.key,
    snapshot.revision,snapshot.raw]));
  let response:HomeCasResponse;
  try {
    response = await transport.compareAndSwap(ownerId,{
      expectedRevision:snapshot.remoteRevision,idempotencyKey:nonce,raw:snapshot.raw,
    });
  } catch { return 'deferred'; }
  if (!await authorized()) return 'cancelled';
  if (!validResponse(response,ownerId,nonce)) return 'invalid-remote';
  if (response.outcome === 'conflict') return 'conflict';
  // Commit success without authenticated read-back is NOT confirmation.
  let readBack:HomeRemoteDocument|null;
  try { readBack = await transport.read(ownerId); }
  catch { return 'deferred'; }
  if (!await authorized()) return 'cancelled';
  if (!validRemote(readBack,ownerId) || readBack.revision !== response.revision ||
    readBack.raw !== snapshot.raw) return 'invalid-remote';
  return acknowledge(readBack.revision);
}
