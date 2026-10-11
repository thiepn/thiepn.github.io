import { validAccountId } from '../hub-auth';
import { MAX_HOME_DOCUMENT_BYTES, parseStoredHomeDocument } from './home-store';
import type { HomeCasRequest, HomeCasResponse, HomeRemoteDocument, HomeSyncTransport } from './home-sync-engine';

// SOURCE-ONLY H22 client: no page, account runtime, or automatic sync imports this file.
// It is intentionally restricted to loopback or .invalid test origins.
// Real deployed-origin acceptance requires a separate explicit owner decision.
export interface H22AccountAuth {
  getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  getSession(): Promise<{ data: { session: {
    user: { id: string }; access_token: string;
  } | null }; error: unknown }>;
}
export interface H22SourceGate {
  sourceOnlyTestApproved: boolean;
  isolatedBackendOnly: boolean;
}
export interface H22ClientConfig {
  origin: string;
  fetcher: typeof fetch; // Mandatory injection: never fall through to a live fetch.
  gate: H22SourceGate;
  isCurrent?: () => boolean; // Owner/session lifecycle guard, not a release flag.
}
export interface H22HomeTransport extends HomeSyncTransport {
  readRecoveryRevision(ownerId: string, revision: string): Promise<HomeRemoteDocument | null>;
}
export class H22BackendUnverified extends Error {
  constructor() {
    super('H22 Cloudflare backend is not enabled or independently authorized.');
    this.name = 'H22BackendUnverified';
  }
}
const REV = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const BODY_LIMIT = MAX_HOME_DOCUMENT_BYTES + 8192;

type VerifiedSession = { owner: string; token: string };
function exact(value: unknown, properties: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...properties].sort().join('|');
}
function validRaw(value: unknown): value is string {
  return typeof value === 'string' &&
    new TextEncoder().encode(value).byteLength <= MAX_HOME_DOCUMENT_BYTES &&
    parseStoredHomeDocument(value).document !== null;
}
function validRemote(value: unknown, owner: string): value is HomeRemoteDocument {
  if (!exact(value, ['ownerId', 'revision', 'raw'])) return false;
  return validAccountId(value.ownerId) && value.ownerId.toLowerCase() === owner &&
    typeof value.revision === 'string' && REV.test(value.revision) && validRaw(value.raw);
}
function validReceipt(value: unknown, owner: string, key: string): value is HomeCasResponse {
  if (!exact(value, ['outcome', 'ownerId', 'revision', 'idempotencyKey'])) return false;
  return validAccountId(value.ownerId) && value.ownerId.toLowerCase() === owner &&
    value.idempotencyKey === key &&
    (value.outcome === 'applied' || value.outcome === 'conflict') &&
    (value.revision === null || typeof value.revision === 'string' && REV.test(value.revision)) &&
    (value.outcome !== 'applied' || value.revision !== null);
}
function testOrigin(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new H22BackendUnverified(); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new H22BackendUnverified();
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const reserved = url.hostname === 'invalid' || url.hostname.endsWith('.invalid');
  if ((!local && !reserved) || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new H22BackendUnverified();
  }
  return url.origin;
}
async function parseReply(response: Response): Promise<unknown> {
  if (response.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    throw new Error('H22 unexpected response type');
  }
  if (Number(response.headers.get('content-length') ?? 0) > BODY_LIMIT) {
    throw new Error('H22 oversized response');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > BODY_LIMIT) throw new Error('H22 oversized response');
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('H22 invalid response'); }
}
export function createH22CloudflareHomeTransport(
  auth: H22AccountAuth, config: H22ClientConfig,
): H22HomeTransport {
  if (!config?.gate?.sourceOnlyTestApproved || !config.gate.isolatedBackendOnly ||
      typeof config.fetcher !== 'function' ||
      !auth || typeof auth.getUser !== 'function' || typeof auth.getSession !== 'function') {
    throw new H22BackendUnverified();
  }
  const origin = testOrigin(config.origin);
  const isCurrent = config.isCurrent ?? (() => true);
  const snapshot = async (): Promise<VerifiedSession | null> => {
    if (!isCurrent()) return null;
    try {
      // getUser() verifies Account Auth server-side; getSession() supplies only
      // the bearer token. Neither an unverified decoded JWT nor UI UUID can authorize.
      const first = await auth.getUser();
      if (first.error || !validAccountId(first.data?.user?.id) || !isCurrent()) return null;
      const session = await auth.getSession();
      if (session.error || !session.data?.session || !isCurrent()) return null;
      const { access_token: token, user } = session.data.session;
      if (!validAccountId(user?.id) ||
          user.id.toLowerCase() !== first.data.user.id.toLowerCase() ||
          typeof token !== 'string' || token.length > 8000 || !TOKEN.test(token)) return null;
      const final = await auth.getUser();
      if (final.error || !validAccountId(final.data?.user?.id) ||
          final.data.user.id.toLowerCase() !== user.id.toLowerCase() || !isCurrent()) return null;
      return { owner: user.id.toLowerCase(), token };
    } catch { return null; }
  };
  const checked = async (ownerId: string): Promise<VerifiedSession> => {
    if (!validAccountId(ownerId)) throw new Error('H22 invalid owner');
    const user = await snapshot();
    if (!user || user.owner !== ownerId.toLowerCase()) throw new Error('H22 owner unavailable');
    return user;
  };
  const requestJson = async (
    ownerId: string, path: string, method: 'GET' | 'POST', body?: unknown,
  ): Promise<{status: number; data: unknown}> => {
    const user = await checked(ownerId);
    let response: Response;
    try {
      response = await config.fetcher(origin + path, {
        method, headers: {
          authorization: 'Bearer ' + user.token,
          ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
        },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
        credentials: 'omit', cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
    } catch { throw new Error('H22 remote unavailable'); }
    // Session sign-out/replacement (including another token for the SAME UUID)
    // invalidates every in-flight read, write response and recovery candidate.
    const after = await checked(ownerId);
    if (after.owner !== user.owner || after.token !== user.token) {
      throw new Error('H22 session changed');
    }
    if (response.status === 404 && path.startsWith('/v1/home/recovery?')) {
      return {status:404,data:null};
    }
    if (response.status !== 200) throw new Error('H22 remote unavailable or unauthorized');
    return { status: 200, data: await parseReply(response) };
  };
  return {
    async verifiedOwner() { return (await snapshot())?.owner ?? null; },
    async read(ownerId) {
      const owner = ownerId.toLowerCase();
      if (!validAccountId(ownerId)) throw new Error('H22 invalid owner');
      const {data} = await requestJson(owner, '/v1/home?ownerId=' + encodeURIComponent(owner),'GET');
      if (data === null) return null;
      if (!validRemote(data,owner)) throw new Error('H22 invalid remote HomeDocument');
      return data;
    },
    async compareAndSwap(ownerId, payload: HomeCasRequest) {
      if (!validAccountId(ownerId) ||
          !exact(payload,['expectedRevision','idempotencyKey','raw']) ||
          !(payload.expectedRevision === null ||
            typeof payload.expectedRevision === 'string' && REV.test(payload.expectedRevision)) ||
          typeof payload.idempotencyKey !== 'string' || !REV.test(payload.idempotencyKey) ||
          !validRaw(payload.raw)) throw new Error('H22 invalid CAS request');
      const owner = ownerId.toLowerCase();
      const {data} = await requestJson(owner,'/v1/home/cas','POST',{
        ownerId: owner, expectedRevision:payload.expectedRevision,
        idempotencyKey:payload.idempotencyKey,raw:payload.raw,
      });
      if (!validReceipt(data,owner,payload.idempotencyKey)) throw new Error('H22 invalid CAS receipt');
      return data;
    },
    async readRecoveryRevision(ownerId,revision) {
      if (!validAccountId(ownerId) || !REV.test(revision)) throw new Error('H22 invalid recovery request');
      const owner=ownerId.toLowerCase();
      const {data,status}=await requestJson(owner,
        '/v1/home/recovery?ownerId='+encodeURIComponent(owner)+'&revision='+encodeURIComponent(revision),
        'GET');
      if (status === 404) return null;
      if (!validRemote(data,owner) || data.revision !== revision)
        throw new Error('H22 invalid recovery revision');
      return data;
    },
  };
}
