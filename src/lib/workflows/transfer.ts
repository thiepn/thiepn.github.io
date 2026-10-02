import { contextKey, validProviderContext, validProviderTimestamp } from '../providers/contract';
import type { ProviderContext } from '../providers/types';
import { WORKFLOW_APPS, type WorkflowOwner } from './catalogue';
// Unwired future protocol. Production policy denies every automated transfer.
export const AUTOMATED_TRANSFERS_ENABLED = false;
export interface ResourceReference { owner: WorkflowOwner; resourceId: string; revision: string; mime: string; bytes: number; sha256: string; context: ProviderContext; }
export interface TransferIntent { schemaVersion: 1; requestId: string; idempotencyKey: string; mode: 'copy' | 'reference'; source: ResourceReference; destination: WorkflowOwner; destinationContext: ProviderContext; expiresAt: string; }
export interface TransferGrant { owner: WorkflowOwner; context: ProviderContext; permissions: readonly string[]; expiresAt: number; }
export interface TransferPolicy { enabled: boolean; destination: WorkflowOwner; modes: readonly ('copy' | 'reference')[]; maxBytes: number; }
export const defaultTransferPolicy = (destination: WorkflowOwner): TransferPolicy => ({ enabled: AUTOMATED_TRANSFERS_ENABLED, destination, modes: [], maxBytes: 0 });
export interface TransferReceipt { schemaVersion: 1; requestId: string; idempotencyKey: string; status: 'committed'; source: ResourceReference; destination: WorkflowOwner; destinationContext: ProviderContext; mode: 'copy' | 'reference'; resourceId: string; revision: string; sha256: string; committedAt: string; }
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const exact = (x: Record<string, unknown>, keys: string[]) => keys.length === Object.keys(x).length && Object.keys(x).every(k => keys.includes(k));
const token = (x: unknown): x is string => typeof x === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(x);
const owner = (x: unknown): x is WorkflowOwner => typeof x === 'string' && Object.hasOwn(WORKFLOW_APPS, x);
const hash = (x: unknown): x is string => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
function contextAllowed(x: unknown, id: WorkflowOwner): x is ProviderContext {
  return validProviderContext(x) && x.scope === WORKFLOW_APPS[id].scope && (x.scope === 'device' || (x.workspaceId === null && x.translationId === null));
}
export function validResourceReference(x: unknown): x is ResourceReference {
  return obj(x) && exact(x, ['owner','resourceId','revision','mime','bytes','sha256','context']) && owner(x.owner) && token(x.resourceId) && token(x.revision) && hash(x.sha256)
    && typeof x.mime === 'string' && (WORKFLOW_APPS[x.owner].exports as readonly string[]).includes(x.mime)
    && typeof x.bytes === 'number' && Number.isSafeInteger(x.bytes) && x.bytes > 0 && contextAllowed(x.context, x.owner);
}
const sourceKey = (r: ResourceReference) => JSON.stringify([r.owner,r.resourceId,r.revision,r.mime,r.bytes,r.sha256,contextKey(r.context)]);
function permission(grant: TransferGrant, id: WorkflowOwner, context: ProviderContext, purpose: string, now: number) {
  return grant.owner === id && validProviderContext(grant.context) && contextKey(grant.context) === contextKey(context) && Number.isFinite(grant.expiresAt) && grant.expiresAt > now && grant.permissions.includes(`${id}.hub.transfer.${purpose}`);
}
export function validateTransferIntent(value: unknown, policy: TransferPolicy, sourceGrant: TransferGrant, destinationGrant: TransferGrant, now = Date.now()): TransferIntent {
  if (!obj(value) || !exact(value,['schemaVersion','requestId','idempotencyKey','mode','source','destination','destinationContext','expiresAt']) || value.schemaVersion !== 1 || !token(value.requestId) || !token(value.idempotencyKey) || !['copy','reference'].includes(String(value.mode)) || !validResourceReference(value.source) || !owner(value.destination) || !contextAllowed(value.destinationContext,value.destination) || !validProviderTimestamp(value.expiresAt)) throw new Error('Invalid transfer contract');
  const intent = value as unknown as TransferIntent;
  if (!policy.enabled || policy.destination !== intent.destination || !policy.modes.includes(intent.mode)) throw new Error('Transfer not certified');
  if (intent.source.owner === intent.destination || !(WORKFLOW_APPS[intent.destination].accepts as readonly string[]).includes(intent.source.mime) || !Number.isSafeInteger(policy.maxBytes) || policy.maxBytes <= 0 || intent.source.bytes > policy.maxBytes) throw new Error('Incompatible destination');
  if (Date.parse(intent.expiresAt) <= now || Date.parse(intent.expiresAt) > now + 300000) throw new Error('Expired transfer intent');
  if (!permission(sourceGrant,intent.source.owner,intent.source.context,'read',now) || !permission(destinationGrant,intent.destination,intent.destinationContext,'write',now)) throw new Error('Transfer permission required');
  // Device-private assets cannot cross a device bridge merely because MIME matches.
  if (intent.source.context.scope === 'device' && intent.destinationContext.scope === 'device' && intent.source.context.deviceId !== intent.destinationContext.deviceId) throw new Error('Device bridge not certified');
  return structuredClone(intent);
}
export function validateTransferReceipt(value: unknown, expected: TransferIntent, now = Date.now()): TransferReceipt {
  if (!obj(value) || !exact(value,['schemaVersion','requestId','idempotencyKey','status','source','destination','destinationContext','mode','resourceId','revision','sha256','committedAt']) || value.schemaVersion !== 1 || value.status !== 'committed' || !validResourceReference(value.source) || !validProviderContext(value.destinationContext) || !token(value.resourceId) || !token(value.revision) || !hash(value.sha256) || !validProviderTimestamp(value.committedAt)) throw new Error('Invalid transfer receipt');
  if (Date.parse(expected.expiresAt) <= now || value.requestId !== expected.requestId || value.idempotencyKey !== expected.idempotencyKey || value.destination !== expected.destination || value.mode !== expected.mode || contextKey(value.destinationContext) !== contextKey(expected.destinationContext) || sourceKey(value.source) !== sourceKey(expected.source) || value.sha256 !== expected.source.sha256 || Date.parse(value.committedAt) > now + 30000 || Date.parse(value.committedAt) > Date.parse(expected.expiresAt)) throw new Error('Unbound transfer receipt');
  return structuredClone(value as unknown as TransferReceipt);
}
export type TransferOutcome = 'idle' | 'pending' | 'committed' | 'needs-reconciliation';
// A redirect/share/timeout cannot prove a destination commit. No automatic retries.
export class TransferTracker {
  private intent: TransferIntent | null = null;
  private outcome: TransferOutcome = 'idle';
  private receipt: TransferReceipt | null = null;
  begin(intent: TransferIntent) { if (this.intent) throw new Error('Reconcile or clear the current transfer first'); this.intent = structuredClone(intent); this.outcome = 'pending'; }
  uncertain() { if (this.intent && this.outcome !== 'committed') this.outcome = 'needs-reconciliation'; }
  accept(value: unknown, now = Date.now()) {
    if (!this.intent) return false;
    try {
      const receipt = validateTransferReceipt(value,this.intent,now);
      if (this.receipt && JSON.stringify(this.receipt) !== JSON.stringify(receipt)) return false;
      this.receipt = receipt; this.outcome = 'committed'; return true;
    } catch { return false; }
  }
  snapshot() { return { outcome: this.outcome, receipt: this.receipt ? structuredClone(this.receipt) : null }; }
  clear() { this.intent = this.receipt = null; this.outcome = 'idle'; }
}
