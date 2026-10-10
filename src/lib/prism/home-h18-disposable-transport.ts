import { validAccountId } from '../hub-auth';
import { MAX_HOME_DOCUMENT_BYTES, parseStoredHomeDocument } from './home-store';
import type { HomeCasRequest, HomeCasResponse, HomeRemoteDocument, HomeSyncTransport } from './home-sync-engine';

// This adapter is NOT imported by any production page or runtime. A matching,
// authorized disposable project with the H18 private-schema RPCs must be
// independently provisioned, tested and explicitly enabled before use.
// The browser's claimed UUID does not authorize database access; Postgres must
// enforce auth.uid + RLS separately on every RPC.
export interface H18RpcClient {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, arguments_: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}
export class H18BackendUnverified extends Error {
  constructor() { super('H18 disposable Core backend is not authorized or verified.'); this.name='H18BackendUnverified'; }
}
export interface H18AdapterGate {
  // Explicit opt-in at a future controlled call site; NOT authorization proof.
  disposableOwnerApproved: boolean;
  backendRlsAcceptanceComplete: boolean;
}
const hash = /^[a-f0-9]{64}$/i;
const keys = (x:unknown, expected:readonly string[]) =>
  x!==null && typeof x==='object' && !Array.isArray(x) &&
  Object.keys(x).sort().join(',') === [...expected].sort().join(',');
function parseRead(result:unknown,owner:string):HomeRemoteDocument|null {
  if(result===null)return null;
  if(!keys(result,['ownerId','revision','raw']))throw new Error('H18 remote read failed validation');
  const v=result as HomeRemoteDocument;
  if(!validAccountId(v.ownerId)||v.ownerId.toLowerCase()!==owner.toLowerCase()||
    typeof v.revision!=='string'||!hash.test(v.revision)||
    typeof v.raw!=='string'||new TextEncoder().encode(v.raw).byteLength>MAX_HOME_DOCUMENT_BYTES||
    !parseStoredHomeDocument(v.raw).document)throw new Error('H18 remote owner or HomeDocument invalid');
  return v;
}
function parseReceipt(result:unknown,owner:string,key:string):HomeCasResponse {
  if(!keys(result,['outcome','ownerId','revision','idempotencyKey']))throw new Error('H18 receipt invalid');
  const v=result as HomeCasResponse;
  if(!validAccountId(v.ownerId)||v.ownerId.toLowerCase()!==owner.toLowerCase()||
    v.idempotencyKey!==key||!(v.outcome==='applied'||v.outcome==='conflict')||
    !(v.revision===null || typeof v.revision==='string'&&hash.test(v.revision))||
    (v.outcome==='applied'&&v.revision===null))throw new Error('H18 receipt owner or CAS mismatch');
  return v;
}
export function createH18DisposableHomeTransport(
  client:H18RpcClient, gate:H18AdapterGate,
):HomeSyncTransport {
  if(gate?.disposableOwnerApproved!==true||gate?.backendRlsAcceptanceComplete!==true)
    throw new H18BackendUnverified();
  const getVerified=async():Promise<string|null>=>{
    const r=await client.auth.getUser(); // server-checked identity, not getSession()
    if(r.error||!validAccountId(r.data?.user?.id))return null;
    return r.data.user.id.toLowerCase();
  };
  const checked=async(owner:string):Promise<void>=>{
    if(!validAccountId(owner)||await getVerified()!==owner.toLowerCase())
      throw new Error('H18 authenticated owner mismatch');
  };
  return {
    verifiedOwner:getVerified,
    async read(ownerId) {
      await checked(ownerId);
      const {data,error}=await client.rpc('h18_home_read',{p_owner:ownerId.toLowerCase()});
      if(error)throw new Error('H18 read unavailable or unauthorized');
      await checked(ownerId);
      return parseRead(data,ownerId);
    },
    async compareAndSwap(ownerId,request:HomeCasRequest) {
      await checked(ownerId);
      if(!keys(request,['expectedRevision','idempotencyKey','raw'])||
        !(request.expectedRevision===null ||
          typeof request.expectedRevision==='string'&&hash.test(request.expectedRevision))||
        typeof request.idempotencyKey!=='string'||!hash.test(request.idempotencyKey)||
        typeof request.raw!=='string'||new TextEncoder().encode(request.raw).byteLength>MAX_HOME_DOCUMENT_BYTES||
        !parseStoredHomeDocument(request.raw).document)
        throw new Error('H18 client CAS input invalid');
      const {data,error}=await client.rpc('h18_home_cas',{
        p_owner:ownerId.toLowerCase(),p_expected_revision:request.expectedRevision,
        p_idempotency_key:request.idempotencyKey,p_raw:request.raw,
      });
      if(error)throw new Error('H18 CAS unavailable or unauthorized');
      await checked(ownerId);
      return parseReceipt(data,ownerId,request.idempotencyKey);
    },
  };
}
