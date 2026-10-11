import { validAccountId } from '../hub-auth';
import { MAX_HOME_DOCUMENT_BYTES, parseStoredHomeDocument } from './home-store';

// H21 source-only contract: never imported or activated by Hub's production app.
// A deployed Worker would require separate owner approval and actual Account trust acceptance.
interface D1Statement {
  bind(...args: (string | null)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface H21D1 {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}
export interface H21Environment {
  DB: H21D1;
  H21_ACCOUNT_PUBLISHABLE_KEY?: string;
}
export type H21Verifier = (bearer: string) => Promise<string | null>;
const ACCOUNT_SUPABASE_AUTH = 'https://hycegznamzjhwinegaai.supabase.co/auth/v1';
const OWNER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGEST = /^[a-f0-9]{64}$/;
function json(value: unknown, status=200): Response {
  return new Response(JSON.stringify(value), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff' },
  });
}
function strictObject(value: unknown, fields: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === fields.sort().join('|');
}
function hex(bytes: Uint8Array): string {
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sha256(raw: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))));
}
function bearerToken(request: Request): string | null {
  const h = request.headers.get('authorization');
  if (!h || !/^Bearer [A-Za-z0-9_\-.]+$/.test(h) || h.length > 8192) return null;
  return h.slice(7);
}
function validDocument(raw: unknown): raw is string {
  return typeof raw === 'string' &&
    new TextEncoder().encode(raw).byteLength <= MAX_HOME_DOCUMENT_BYTES &&
    parseStoredHomeDocument(raw).document !== null;
}
interface DocumentRow { owner_id: string; revision: string; raw: string }
interface ReceiptRow { expected_revision: string|null; payload_hash: string; resulting_revision: string }
function remote(row: DocumentRow): {ownerId:string; revision:string; raw:string} {
  return {ownerId:row.owner_id,revision:row.revision,raw:row.raw};
}

// Supabase Auth verifies the JWT signature, expiry and session by making a
// server-to-server request. Decoding JWT claims in the browser is NOT verification.
// This is a fixed THIEPN Account project trust anchor, not an arbitrary env URL.
export async function verifyExistingThiepnAccount(
  token: string, env: H21Environment, fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!token || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) || token.length>8000 ||
      !env.H21_ACCOUNT_PUBLISHABLE_KEY ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.H21_ACCOUNT_PUBLISHABLE_KEY)) return null;
  try {
    const r = await fetcher(ACCOUNT_SUPABASE_AUTH+'/user', {
      headers: {
        'apikey': env.H21_ACCOUNT_PUBLISHABLE_KEY,
        'authorization': 'Bearer '+token,
      }, signal: AbortSignal.timeout(7000), redirect: 'error', cache: 'no-store',
    });
    if (!r.ok) return null;
    const u: unknown = await r.json();
    if (!u || typeof u!=='object' || Array.isArray(u)) return null;
    const user = u as Record<string,unknown>;
    // Reject service roles, missing identities and anonymous login credentials.
    if (!validAccountId(user.id) || user.is_anonymous === true ||
        user.role !== 'authenticated') return null;
    return user.id.toLowerCase();
  } catch {return null;}
}
async function readBody(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 140000) throw new Error('body too large');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > 140000) throw new Error('body too large');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function handleH21Request(
  request: Request, env: H21Environment, verify: H21Verifier,
): Promise<Response> {
  const path = new URL(request.url);
  if (path.pathname !== '/v1/home' && path.pathname !== '/v1/home/cas' &&
      path.pathname !== '/v1/home/recovery') return json({error:'not found'},404);
  if ((request.method !== 'GET' && request.method !== 'POST') ||
      (path.pathname === '/v1/home/cas') !== (request.method === 'POST')) {
    return json({error:'method denied'},405);
  }
  const bearer = bearerToken(request);
  if (!bearer) return json({error:'unauthorized'},401);
  let owner: string | null;
  try {owner = await verify(bearer);} catch { owner = null; }
  if (!owner || !OWNER.test(owner)) return json({error:'unauthorized'},401);
  const claimed = request.method === 'GET' ? path.searchParams.get('ownerId') : undefined;
  if (request.method === 'GET') {
    if (!claimed || !OWNER.test(claimed) || claimed.toLowerCase() !== owner)
      return json({error:'owner denied'},403);
    if (path.pathname === '/v1/home') {
      const row = await env.DB.prepare('SELECT owner_id,revision,raw FROM h21_home_documents WHERE owner_id=?')
        .bind(owner).first<DocumentRow>();
      return json(row ? remote(row) : null);
    }
    const revision=path.searchParams.get('revision');
    if (!revision || !DIGEST.test(revision)) return json({error:'bad revision'},400);
    const old=await env.DB.prepare('SELECT owner_id,revision,raw FROM h21_home_history WHERE owner_id=? AND revision=?')
      .bind(owner,revision).first<DocumentRow>();
    return old ? json(remote(old)) : json({error:'revision unavailable'},404);
  }
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    return json({error:'expected JSON'},415);
  let payload: unknown;
  try {payload=await readBody(request);} catch {return json({error:'invalid JSON'},400);}
  if (!strictObject(payload,['ownerId','expectedRevision','idempotencyKey','raw']))
    return json({error:'invalid CAS request'},400);
  if (!validAccountId(payload.ownerId) || payload.ownerId.toLowerCase()!==owner)
    return json({error:'owner denied'},403);
  const expected=payload.expectedRevision;
  const key=payload.idempotencyKey;
  const raw=payload.raw;
  if (!(expected===null || typeof expected==='string' && DIGEST.test(expected)) ||
      typeof key!=='string'||!DIGEST.test(key) || !validDocument(raw))
    return json({error:'invalid HomeDocumentV2 or revision'},400);
  const payloadHash=await sha256(raw);
  const receiptQuery='SELECT expected_revision,payload_hash,resulting_revision FROM h21_home_receipts WHERE owner_id=? AND request_key=?';
  const prior=await env.DB.prepare(receiptQuery).bind(owner,key).first<ReceiptRow>();
  if (prior) {
    if (prior.expected_revision!==expected || prior.payload_hash!==payloadHash)
      return json({error:'idempotency key reused'},409);
    return json({outcome:'applied',ownerId:owner,revision:prior.resulting_revision,idempotencyKey:key});
  }
  const revision=hex(crypto.getRandomValues(new Uint8Array(32)));
  // One D1 transaction with three sequential statements. Failed CAS cannot
  // create a success receipt. No read-then-unconditional-write race exists.
  // The old exact bytes are preserved BEFORE a successful replacement.
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO h21_home_history(owner_id,revision,raw)
      SELECT owner_id,revision,raw FROM h21_home_documents WHERE owner_id=? AND revision=?
        AND NOT EXISTS(SELECT 1 FROM h21_home_receipts WHERE owner_id=? AND request_key=?)`)
      .bind(owner,expected as string|null,owner,key),
    env.DB.prepare(`INSERT INTO h21_home_documents(owner_id,revision,raw)
      SELECT ?,?,? WHERE NOT EXISTS
        (SELECT 1 FROM h21_home_receipts WHERE owner_id=? AND request_key=?)
      ON CONFLICT(owner_id) DO UPDATE SET revision=excluded.revision,
        raw=excluded.raw,updated_at=CURRENT_TIMESTAMP
      WHERE h21_home_documents.revision = ?
      AND NOT EXISTS(SELECT 1 FROM h21_home_receipts WHERE owner_id=? AND request_key=?)`)
      .bind(owner,revision,raw,owner,key,expected as string|null,owner,key),
    env.DB.prepare(`INSERT INTO h21_home_receipts(owner_id,request_key,expected_revision,payload_hash,resulting_revision)
      SELECT ?,?,?,?,?
      WHERE EXISTS(SELECT 1 FROM h21_home_documents
        WHERE owner_id=? AND revision=? AND raw=?)
      ON CONFLICT(owner_id,request_key) DO NOTHING`)
      .bind(owner,key,expected as string|null,payloadHash,revision,owner,revision,raw),
  ]);
  const committed=await env.DB.prepare(receiptQuery).bind(owner,key).first<ReceiptRow>();
  if (committed) {
    if (committed.expected_revision!==expected ||committed.payload_hash!==payloadHash)
      return json({error:'idempotency key reused'},409);
    return json({outcome:'applied',ownerId:owner,revision:committed.resulting_revision,idempotencyKey:key});
  }
  const current=await env.DB.prepare('SELECT revision FROM h21_home_documents WHERE owner_id=?')
    .bind(owner).first<{revision:string}>();
  return json({outcome:'conflict',ownerId:owner,revision:current?.revision??null,idempotencyKey:key});
}
// No configured or deployed Worker exists. No Cloudflare resources are accessed.
export default {fetch(request:Request,env:H21Environment):Promise<Response> {
  return handleH21Request(request,env,token=>verifyExistingThiepnAccount(token,env));
}};
