import { validAccountId } from '../hub-auth';
import { PROVIDER_BUDGETS } from './registry';
import type { ProviderContext, ProviderEnvelope, ProviderManifest, RequestContext } from './types';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const text = (value: unknown, max = 160): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const token = (value: unknown): value is string => text(value,128) && /^[a-zA-Z0-9:_-]+$/.test(value);
export const validProviderTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === (value.includes('.') ? value : value.replace('Z','.000Z'));
};
const number = (value: unknown, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
export function validProviderContext(value: unknown): value is ProviderContext {
  if (!object(value)) return false;
  if (value.scope === 'device') return keys(value,['scope','deviceId','consentRevision']) && token(value.deviceId) && token(value.consentRevision);
  return value.scope === 'account' && keys(value,['scope','accountId','workspaceId','grantRevision','translationId']) && validAccountId(value.accountId) && (value.workspaceId === null || token(value.workspaceId)) && token(value.grantRevision) && (value.translationId === null || (text(value.translationId,16) && /^[a-z][a-z0-9-]+$/.test(value.translationId)));
}
export function contextKey(context: ProviderContext): string {
  return context.scope === 'account' ? JSON.stringify(['account',context.accountId.toLowerCase(),context.workspaceId,context.grantRevision,context.translationId]) : JSON.stringify(['device',context.deviceId,context.consentRevision]);
}
export function requestKey(request: RequestContext): string { return JSON.stringify([1,request.providerId,request.operation,contextKey(request.context),request.operation === 'search' ? request.requestId : null]); }
export class ProviderContractError extends Error { constructor(public readonly code: 'size' | 'schema' | 'version' | 'scope' | 'freshness') { super(`Provider contract: ${code}`); } }
export function providerContextAllowed(value: unknown, manifest: ProviderManifest): value is ProviderContext {
  return validProviderContext(value) && value.scope === manifest.scope && !(value.scope === 'account' && value.workspaceId !== null)
    && !(manifest.id === 'tms60' && (value.scope !== 'account' || value.translationId === null))
    && !(manifest.id === 'notes' && value.scope === 'account' && value.translationId !== null);
}
export function validateProviderHeader(value: Record<string, unknown>, manifest: ProviderManifest, request: { providerId: string; operation: string; requestId: string; context: ProviderContext }, now: number): void {
  if (value.schemaVersion !== 1) throw new ProviderContractError('version');
  if (!keys(value,['schemaVersion','providerId','operation','requestId','context','status','privacy','coverage','observedAt','expiresAt','sourceUpdatedAt','data']) || value.providerId !== manifest.id || value.providerId !== request.providerId || value.operation !== request.operation || value.requestId !== request.requestId || !token(value.requestId) || value.privacy !== 'private' || value.coverage !== manifest.coverage || !['ready','empty','unconnected','unsupported','offline','stale','error'].includes(String(value.status))) throw new ProviderContractError('schema');
  if (!providerContextAllowed(value.context,manifest) || !validProviderContext(request.context) || contextKey(value.context) !== contextKey(request.context)) throw new ProviderContractError('scope');
  if (!validProviderTimestamp(value.observedAt) || !validProviderTimestamp(value.expiresAt) || (value.sourceUpdatedAt !== null && !validProviderTimestamp(value.sourceUpdatedAt))) throw new ProviderContractError('freshness');
  const observed = Date.parse(value.observedAt), expires = Date.parse(value.expiresAt);
  if (observed > now + 30000 || expires <= observed || expires - observed > 300000 || (value.sourceUpdatedAt !== null && Date.parse(value.sourceUpdatedAt as string) > observed + 30000)) throw new ProviderContractError('freshness');
}
export function validateProviderEnvelope(raw: string, manifest: ProviderManifest, request: RequestContext, now = Date.now()): ProviderEnvelope {
  const maxBytes = request.operation === 'search' ? PROVIDER_BUDGETS.searchBytes : PROVIDER_BUDGETS.summaryBytes;
  if (typeof raw !== 'string' || raw.length > maxBytes || new TextEncoder().encode(raw).byteLength > maxBytes) throw new ProviderContractError('size');
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new ProviderContractError('schema'); }
  if (!object(value)) throw new ProviderContractError('schema');
  validateProviderHeader(value,manifest,request,now);
  const expires = Date.parse(value.expiresAt as string), observed = Date.parse(value.observedAt as string);
  if (!['ready','empty'].includes(String(value.status))) { if (value.data !== null) throw new ProviderContractError('schema'); }
  else {
    if (!object(value.data) || !keys(value.data,manifest.id === 'tms60' && request.operation === 'summary' ? ['items','dueTaskCount','dueVerseCount','newVerseCount'] : ['items']) || !Array.isArray(value.data.items) || value.data.items.length > (request.operation === 'search' ? PROVIDER_BUDGETS.searchItems : PROVIDER_BUDGETS.summaryItems)) throw new ProviderContractError('schema');
    const ids = new Set<string>();
    for (const item of value.data.items) {
      const fields = ['resourceId','title','updatedAt',...(manifest.id === 'library' ? ['format','edition','releaseVersion','current','furthest'] : manifest.id === 'tms60' ? ['dimension'] : [])];
      if (!object(item) || !keys(item,fields) || !token(item.resourceId) || !text(item.title) || !validProviderTimestamp(item.updatedAt) || Date.parse(item.updatedAt) > observed + 30000 || ids.has(item.resourceId)) throw new ProviderContractError('schema');
      ids.add(item.resourceId);
      if (manifest.id === 'notes' && !validAccountId(item.resourceId)) throw new ProviderContractError('schema');
      if (manifest.id === 'library' && (!['epub','pdf','web'].includes(String(item.format)) || !number(item.edition,100000) || item.edition === 0 || !token(item.releaseVersion) || typeof item.current !== 'number' || typeof item.furthest !== 'number' || !Number.isFinite(item.current) || !Number.isFinite(item.furthest) || item.current < 0 || item.furthest < item.current || item.furthest > 1)) throw new ProviderContractError('schema');
      if (manifest.id === 'tms60') {
        const match = /^([a-z][a-z0-9-]+):([1-9]|[1-5][0-9]|60):(wording|reference|learning)$/.exec(item.resourceId);
        if (!match || request.context.scope !== 'account' || match[1] !== request.context.translationId || match[3] !== item.dimension) throw new ProviderContractError('schema');
      }
    }
    if (manifest.id === 'tms60' && request.operation === 'summary' && (!number(value.data.dueTaskCount,180) || !number(value.data.dueVerseCount,60) || !number(value.data.newVerseCount,60) || Number(value.data.dueVerseCount) > Number(value.data.dueTaskCount) || (value.data.dueTaskCount === 0 && value.data.dueVerseCount !== 0))) throw new ProviderContractError('schema');
    const hasData = value.data.items.length > 0 || (manifest.id === 'tms60' && request.operation === 'summary' && (Number(value.data.dueTaskCount) > 0 || Number(value.data.newVerseCount) > 0));
    if ((value.status === 'empty' && hasData) || (value.status === 'ready' && !hasData)) throw new ProviderContractError('schema');
  }
  const envelope = value as unknown as ProviderEnvelope;
  if (expires <= now && ['ready','empty'].includes(envelope.status)) return { ...envelope, status:'stale', data:null };
  return envelope;
}
